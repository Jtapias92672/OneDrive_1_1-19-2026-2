/**
 * FORGE Hook - Git-backed task persistence
 * Pattern: Hook Protocol (Gas Town)
 *
 * Hooks enable crash recovery and context isolation.
 * Work "hangs" on the hook until completed.
 *
 * GUPP: "If there is work on your hook, YOU MUST RUN IT."
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Hook,
  HookStatus,
  HookResult,
  Task,
  MinimumViableContext,
  WorkerRole,
  Evidence,
  DiscoveredTask,
  TaskError,
} from './types.js';
import { generateId, hashContent, logEvent, updateTaskStatus } from './ledger.js';
import { loadCheckerSpec } from './vnv.js';

// =============================================================================
// Configuration
// =============================================================================

const FORGE_ROOT = path.join(process.cwd(), '.forge');
const HOOKS_DIR = path.join(FORGE_ROOT, 'hooks');
const PENDING_DIR = path.join(HOOKS_DIR, 'pending');
const ACTIVE_DIR = path.join(HOOKS_DIR, 'active');
const COMPLETE_DIR = path.join(HOOKS_DIR, 'complete');

// =============================================================================
// Hook File Structure
// =============================================================================

interface HookFiles {
  task: string;       // task.json
  context: string;    // context.json
  status: string;     // status.json
  result: string;     // result.json
  evidence: string;   // evidence/ directory
}

function getHookPaths(hookDir: string): HookFiles {
  return {
    task: path.join(hookDir, 'task.json'),
    context: path.join(hookDir, 'context.json'),
    status: path.join(hookDir, 'status.json'),
    result: path.join(hookDir, 'result.json'),
    evidence: path.join(hookDir, 'evidence'),
  };
}

// =============================================================================
// Hook Lifecycle: PENDING → ACTIVE → COMPLETE
// =============================================================================

export interface CreateHookOptions {
  skipCheckerSpecValidation?: boolean;
}

/**
 * Create a new hook for a worker (Mayor dispatches via this)
 * Hook starts in PENDING state in pending/ directory
 *
 * Epic 7.5: Validates CheckerSpec exists for work item (unless skipped)
 */
export async function createHook(
  task: Task,
  context: MinimumViableContext,
  role: WorkerRole,
  options: CreateHookOptions = {}
): Promise<Hook> {
  // Epic 7.5: Validate CheckerSpec exists
  if (!options.skipCheckerSpecValidation && task.workItemId) {
    const spec = await loadCheckerSpec(task.workItemId);
    if (!spec) {
      throw new Error(`CheckerSpec required for work item ${task.workItemId}. Create .forge/work_items/${task.workItemId}/checker_spec.yaml`);
    }
    // Add checker spec to context for validator role
    if (role === 'validator' && !context.checkerSpec) {
      context.checkerSpec = spec;
    }
    // Update task with checkerSpecId
    if (!task.vnv) {
      task.vnv = {
        checkerSpecId: spec.workItem.id,
        verificationStatus: 'pending',
        validationStatus: 'pending',
        gatesPassed: [],
        gatesFailed: [],
        lastEvaluated: new Date().toISOString(),
      };
    }
  }

  const hookId = generateId(role, task.id);
  const workerId = `${role}-${Date.now()}`;
  const now = new Date().toISOString();

  const hook: Hook = {
    id: hookId,
    workerId,
    role,
    task,
    context,
    status: 'PENDING',
    assigned: now,
  };

  // Create hook directory in pending/
  const hookDir = path.join(PENDING_DIR, hookId);
  await fs.mkdir(hookDir, { recursive: true });

  const paths = getHookPaths(hookDir);

  // Write hook files
  await fs.writeFile(paths.task, JSON.stringify(task, null, 2));
  await fs.writeFile(paths.context, JSON.stringify(context, null, 2));
  await fs.writeFile(paths.status, JSON.stringify({ status: 'PENDING', assigned: now }));
  await fs.mkdir(paths.evidence, { recursive: true });

  // Log dispatch event
  await logEvent('task_dispatched', {
    taskId: task.id,
    workerId,
    data: { hookId, role, checkerSpecValidated: !options.skipCheckerSpecValidation },
  });

  return hook;
}

/**
 * Check if hook has pending work (GUPP check)
 * Workers call this on startup
 */
export async function checkHook(hookId: string): Promise<Hook | null> {
  // Check pending directory first
  let hookDir = path.join(PENDING_DIR, hookId);
  let exists = await directoryExists(hookDir);

  // Check active directory if not in pending
  if (!exists) {
    hookDir = path.join(ACTIVE_DIR, hookId);
    exists = await directoryExists(hookDir);
  }

  if (!exists) return null;

  const paths = getHookPaths(hookDir);

  try {
    const [taskData, contextData, statusData] = await Promise.all([
      fs.readFile(paths.task, 'utf-8'),
      fs.readFile(paths.context, 'utf-8'),
      fs.readFile(paths.status, 'utf-8'),
    ]);

    const task = JSON.parse(taskData) as Task;
    const context = JSON.parse(contextData) as MinimumViableContext;
    const status = JSON.parse(statusData) as { status: HookStatus; assigned: string };

    return {
      id: hookId,
      workerId: `${context.task.type}-worker`,
      role: context.task.type as WorkerRole,
      task,
      context,
      status: status.status,
      assigned: status.assigned,
    };
  } catch {
    return null;
  }
}

/**
 * Activate a hook (move from pending to active)
 * Called when worker starts executing
 */
export async function activateHook(hookId: string): Promise<boolean> {
  const pendingDir = path.join(PENDING_DIR, hookId);
  const activeDir = path.join(ACTIVE_DIR, hookId);

  if (!(await directoryExists(pendingDir))) {
    return false;
  }

  // Move directory from pending to active
  await fs.rename(pendingDir, activeDir);

  // Update status
  const statusPath = path.join(activeDir, 'status.json');
  const now = new Date().toISOString();
  await fs.writeFile(
    statusPath,
    JSON.stringify({ status: 'IN_PROGRESS', started: now })
  );

  // Update task status in ledger
  const hook = await checkHook(hookId);
  if (hook) {
    await updateTaskStatus(hook.task.id, 'IN_PROGRESS', { assignedWorker: hookId });
  }

  return true;
}

/**
 * Complete a hook (move from active to complete)
 * Called when worker finishes (success or failure)
 */
export async function completeHook(
  hookId: string,
  result: HookResult
): Promise<boolean> {
  const activeDir = path.join(ACTIVE_DIR, hookId);
  const completeDir = path.join(COMPLETE_DIR, hookId);

  if (!(await directoryExists(activeDir))) {
    return false;
  }

  const paths = getHookPaths(activeDir);

  // Write result
  await fs.writeFile(paths.result, JSON.stringify(result, null, 2));

  // Write evidence files
  if (result.evidence) {
    await fs.writeFile(
      path.join(paths.evidence, 'input-hash.txt'),
      result.evidence.inputHash
    );
    await fs.writeFile(
      path.join(paths.evidence, 'output-hash.txt'),
      result.evidence.outputHash
    );
  }

  // Update status
  const now = new Date().toISOString();
  await fs.writeFile(
    paths.status,
    JSON.stringify({ status: result.status, completed: now })
  );

  // Move directory from active to complete
  await fs.rename(activeDir, completeDir);

  return true;
}

// =============================================================================
// Hook Reading (Worker Operations)
// =============================================================================

/**
 * Read task from hook (worker reads this)
 */
export async function readHookTask(hookId: string): Promise<Task | null> {
  const hook = await checkHook(hookId);
  return hook?.task || null;
}

/**
 * Read context from hook (worker reads this)
 */
export async function readHookContext(hookId: string): Promise<MinimumViableContext | null> {
  const hook = await checkHook(hookId);
  return hook?.context || null;
}

/**
 * Read result from completed hook
 */
export async function readHookResult(hookId: string): Promise<HookResult | null> {
  const completeDir = path.join(COMPLETE_DIR, hookId);
  const resultPath = path.join(completeDir, 'result.json');

  try {
    const data = await fs.readFile(resultPath, 'utf-8');
    return JSON.parse(data) as HookResult;
  } catch {
    return null;
  }
}

// =============================================================================
// Hook Writing (Worker Operations)
// =============================================================================

/**
 * Write result to hook (worker writes this before completing)
 */
export async function writeHookResult(
  hookId: string,
  result: Omit<HookResult, 'hookId'>
): Promise<boolean> {
  const activeDir = path.join(ACTIVE_DIR, hookId);

  if (!(await directoryExists(activeDir))) {
    return false;
  }

  const fullResult: HookResult = {
    ...result,
    hookId,
  };

  const resultPath = path.join(activeDir, 'result.json');
  await fs.writeFile(resultPath, JSON.stringify(fullResult, null, 2));

  return true;
}

/**
 * Write evidence to hook
 */
export async function writeEvidence(
  hookId: string,
  evidence: Evidence
): Promise<boolean> {
  const activeDir = path.join(ACTIVE_DIR, hookId);
  const evidenceDir = path.join(activeDir, 'evidence');

  if (!(await directoryExists(activeDir))) {
    return false;
  }

  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(
    path.join(evidenceDir, 'input-hash.txt'),
    evidence.inputHash
  );
  await fs.writeFile(
    path.join(evidenceDir, 'output-hash.txt'),
    evidence.outputHash
  );

  if (evidence.diffImage) {
    await fs.writeFile(
      path.join(evidenceDir, 'diff-image-path.txt'),
      evidence.diffImage
    );
  }

  return true;
}

// =============================================================================
// Hook Discovery (Mayor Operations)
// =============================================================================

/**
 * List all pending hooks
 */
export async function listPendingHooks(): Promise<string[]> {
  try {
    const entries = await fs.readdir(PENDING_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * List all active hooks
 */
export async function listActiveHooks(): Promise<string[]> {
  try {
    const entries = await fs.readdir(ACTIVE_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * List completed hooks (optionally filter by time range)
 */
export async function listCompletedHooks(): Promise<string[]> {
  try {
    const entries = await fs.readdir(COMPLETE_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Get hook status by ID (checks all directories)
 */
export async function getHookStatus(hookId: string): Promise<HookStatus | null> {
  if (await directoryExists(path.join(PENDING_DIR, hookId))) {
    return 'PENDING';
  }
  if (await directoryExists(path.join(ACTIVE_DIR, hookId))) {
    return 'IN_PROGRESS';
  }
  if (await directoryExists(path.join(COMPLETE_DIR, hookId))) {
    const result = await readHookResult(hookId);
    return result?.status || 'COMPLETE';
  }
  return null;
}

// =============================================================================
// Crash Recovery
// =============================================================================

/**
 * Recover orphaned active hooks (hooks stuck in IN_PROGRESS)
 * Called by Mayor on startup
 */
export async function recoverOrphanedHooks(): Promise<Hook[]> {
  const activeHooks = await listActiveHooks();
  const recovered: Hook[] = [];

  for (const hookId of activeHooks) {
    const hook = await checkHook(hookId);
    if (hook) {
      // Move back to pending for re-execution
      const activeDir = path.join(ACTIVE_DIR, hookId);
      const pendingDir = path.join(PENDING_DIR, hookId);

      await fs.rename(activeDir, pendingDir);

      // Update status to pending
      const statusPath = path.join(pendingDir, 'status.json');
      await fs.writeFile(
        statusPath,
        JSON.stringify({ status: 'PENDING', recovered: new Date().toISOString() })
      );

      hook.status = 'PENDING';
      recovered.push(hook);
    }
  }

  return recovered;
}

/**
 * Clean up old completed hooks (retention policy)
 */
export async function cleanupCompletedHooks(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  const completedHooks = await listCompletedHooks();
  let cleaned = 0;

  for (const hookId of completedHooks) {
    const hookDir = path.join(COMPLETE_DIR, hookId);
    const statusPath = path.join(hookDir, 'status.json');

    try {
      const data = await fs.readFile(statusPath, 'utf-8');
      const status = JSON.parse(data);
      const completedAt = new Date(status.completed).getTime();

      if (Date.now() - completedAt > maxAgeMs) {
        await fs.rm(hookDir, { recursive: true });
        cleaned++;
      }
    } catch {
      // Skip if can't read status
    }
  }

  return cleaned;
}

// =============================================================================
// Handoff Support
// =============================================================================

/**
 * Handoff hook to new worker (context pollution prevention)
 */
export async function handoffHook(
  hookId: string,
  reason: 'context_limit' | 'timeout' | 'error',
  resumePoint?: string
): Promise<boolean> {
  const activeDir = path.join(ACTIVE_DIR, hookId);

  if (!(await directoryExists(activeDir))) {
    return false;
  }

  // Update status with handoff info
  const statusPath = path.join(activeDir, 'status.json');
  const now = new Date().toISOString();

  await fs.writeFile(
    statusPath,
    JSON.stringify({
      status: 'PENDING',
      handoffAt: now,
      handoffReason: reason,
      resumePoint,
    })
  );

  // Move back to pending for new worker
  const pendingDir = path.join(PENDING_DIR, hookId);
  await fs.rename(activeDir, pendingDir);

  return true;
}

// =============================================================================
// Utilities
// =============================================================================

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Initialize hook directories
 */
export async function initHooks(): Promise<void> {
  await fs.mkdir(PENDING_DIR, { recursive: true });
  await fs.mkdir(ACTIVE_DIR, { recursive: true });
  await fs.mkdir(COMPLETE_DIR, { recursive: true });
}

// =============================================================================
// GUPP Worker Entry Point
// =============================================================================

/**
 * GUPP-compliant worker startup
 * "If there is work on your hook, YOU MUST RUN IT."
 */
export async function guppStartup(
  workerId: string,
  executor: (hook: Hook) => Promise<HookResult>
): Promise<void> {
  // Check for pending work
  const pendingHooks = await listPendingHooks();
  const myHook = pendingHooks.find((id) => id.startsWith(workerId.split('-')[0]));

  if (myHook) {
    const hook = await checkHook(myHook);
    if (hook && hook.status === 'PENDING') {
      // GUPP: Work present → EXECUTE immediately
      await activateHook(myHook);

      try {
        const result = await executor(hook);
        await completeHook(myHook, result);
      } catch (error) {
        const errorResult: HookResult = {
          taskId: hook.task.id,
          hookId: myHook,
          status: 'FAILED',
          error: {
            code: 'EXECUTION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            recoverable: true,
          },
          evidence: {
            inputHash: hashContent(JSON.stringify(hook.context)),
            outputHash: '',
            timestamp: new Date().toISOString(),
          },
        };
        await completeHook(myHook, errorResult);
      }

      // Terminate after single task (episodic)
      process.exit(0);
    }
  }

  // No work present → wait for dispatch (or exit if daemon mode not supported)
}

// =============================================================================
// Exports
// =============================================================================

export const hooks = {
  // Lifecycle
  createHook,
  checkHook,
  activateHook,
  completeHook,

  // Reading
  readHookTask,
  readHookContext,
  readHookResult,

  // Writing
  writeHookResult,
  writeEvidence,

  // Discovery
  listPendingHooks,
  listActiveHooks,
  listCompletedHooks,
  getHookStatus,

  // Recovery
  recoverOrphanedHooks,
  cleanupCompletedHooks,
  handoffHook,

  // Utilities
  initHooks,
  guppStartup,
};

export default hooks;
