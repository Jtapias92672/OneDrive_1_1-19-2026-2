/**
 * FORGE Convoy - Work bundling for parallel processing
 * Pattern: Convoy (Gas Town)
 *
 * Convoys group related tasks (e.g., all components in a Figma frame)
 * for coordinated execution across multiple workers.
 */

import {
  Convoy,
  ConvoyProgress,
  Task,
  TaskType,
  FigmaComponent,
  MinimumViableContext,
  WorkerRole,
  SlingRequest,
  SlingResult,
  GateDecision,
  GateContext,
} from './types.js';
import {
  createTask,
  createConvoy as ledgerCreateConvoy,
  getConvoy,
  getConvoyTasks,
  getConvoyProgress,
  addTaskToConvoy,
  updateConvoyStatus,
  getReadyTasks,
  updateTaskStatus,
  generateId,
} from './ledger.js';
import { createHook } from './hook.js';
import { evaluateGate, loadCheckerSpec } from './vnv.js';

// =============================================================================
// Convoy Creation
// =============================================================================

export interface CreateConvoyFromFigmaOptions {
  name: string;
  figmaFileKey: string;
  frameId?: string;
  components: FigmaComponent[];
  dependencies?: ComponentDependency[];
}

export interface ComponentDependency {
  from: string;  // Component ID that depends
  to: string;    // Component ID that must complete first
}

/**
 * Create a convoy from Figma components
 * Automatically creates tasks for each component
 */
export async function createConvoyFromFigma(
  options: CreateConvoyFromFigmaOptions
): Promise<Convoy> {
  // Create the convoy first
  const convoy = await ledgerCreateConvoy({
    name: options.name,
    figmaFileKey: options.figmaFileKey,
    frameId: options.frameId,
    taskIds: [],
  });

  // Build dependency map (component ID → component IDs it depends on)
  const dependencyMap = new Map<string, string[]>();
  for (const dep of options.dependencies || []) {
    const existing = dependencyMap.get(dep.from) || [];
    existing.push(dep.to);
    dependencyMap.set(dep.from, existing);
  }

  // Create tasks for each component
  const componentToTaskId = new Map<string, string>();

  for (const component of options.components) {
    // Get dependency task IDs
    const componentDeps = dependencyMap.get(component.id) || [];
    const taskDeps = componentDeps
      .map((compId) => componentToTaskId.get(compId))
      .filter((id): id is string => id !== undefined);

    // Create task
    const task = await createTask({
      type: 'translate',
      input: { componentId: component.id },
      convoyId: convoy.id,
      blockedBy: taskDeps,
    });

    componentToTaskId.set(component.id, task.id);

    // Add to convoy
    await addTaskToConvoy(convoy.id, task.id);
  }

  // Update convoy status
  await updateConvoyStatus(convoy.id);

  return (await getConvoy(convoy.id))!;
}

// =============================================================================
// Sling: Task Dispatch
// =============================================================================

export interface SlingOptions {
  skipGateCheck?: boolean;
  suiteResults?: Record<string, { passed: boolean; failed: number; total: number; skipped: number; duration: number; withinBudget: boolean }>;
  targetedTestsPassed?: boolean;
}

/**
 * Sling a task to a worker via hook
 * Mayor uses this to dispatch work
 *
 * Epic 7.5: Evaluates pre_dispatch gate before sling (unless skipped)
 */
export async function sling(request: SlingRequest, options: SlingOptions = {}): Promise<SlingResult> {
  const { taskId, rig } = request;

  // Get task from ledger
  const tasks = await getConvoyTasks('');  // We need to get by task ID
  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    return { success: false, error: `Task ${taskId} not found` };
  }

  // Verify task is ready
  if (task.status !== 'PENDING' && task.status !== 'READY') {
    return { success: false, error: `Task ${taskId} is not ready (status: ${task.status})` };
  }

  // Epic 7.5: Evaluate pre_dispatch gate
  if (!options.skipGateCheck && task.workItemId) {
    const spec = await loadCheckerSpec(task.workItemId);
    const gateContext: GateContext = {
      workItemId: task.workItemId,
      checkerSpecId: spec?.workItem.id,
      suiteResults: options.suiteResults || {},
      targetedTestsPassed: options.targetedTestsPassed || false,
      riskLevel: spec?.risk?.level,
    };

    const gateDecision = await evaluateGate('pre_dispatch', gateContext);

    if (gateDecision.status === 'DENIED') {
      return {
        success: false,
        error: `Pre-dispatch gate denied: ${gateDecision.reasons.join(', ')}`,
        gateDecision,
      };
    }
  }

  // Build MVC for worker
  const context = await buildMinimumViableContext(task, rig);

  // Create hook (writes to pending/)
  // Skip CheckerSpec validation since we already did it in gate check
  const hook = await createHook(task, context, rig, {
    skipCheckerSpecValidation: options.skipGateCheck,
  });

  // Update task status
  await updateTaskStatus(taskId, 'IN_PROGRESS', { assignedWorker: hook.workerId });

  return { success: true, hookId: hook.id };
}

/**
 * Sling multiple ready tasks in parallel
 */
export async function slingParallel(
  convoyId: string,
  rig: WorkerRole,
  maxConcurrent: number = 5
): Promise<SlingResult[]> {
  const readyTasks = await getReadyTasks(convoyId);
  const toSling = readyTasks.slice(0, maxConcurrent);

  const results = await Promise.all(
    toSling.map((task) => sling({ taskId: task.id, rig }))
  );

  return results;
}

// =============================================================================
// MVC Builder
// =============================================================================

/**
 * Build Minimum Viable Context for a worker
 * ONLY includes what worker needs for THIS task
 */
async function buildMinimumViableContext(
  task: Task,
  role: WorkerRole
): Promise<MinimumViableContext> {
  const baseContext: MinimumViableContext = {
    task: {
      id: task.id,
      type: task.type,
    },
    tools: getToolsForRole(role),
  };

  switch (role) {
    case 'translator':
      return {
        ...baseContext,
        task: {
          ...baseContext.task,
          componentId: task.input.componentId,
        },
        component: await getComponentData(task.input.componentId!),
        outputPath: `.forge/output/${task.id}.mpk`,
      };

    case 'validator':
      return {
        ...baseContext,
        task: {
          ...baseContext.task,
          mpkPath: task.input.mpkPath,
        },
        expectedVisual: await getExpectedVisual(task.input.componentId!),
        schema: task.expectedOutput,
        thresholds: {
          pixelDiffPercent: 2.0,
          structuralMatchPercent: 95.0,
        },
      };

    case 'remediator':
      return {
        ...baseContext,
        task: {
          ...baseContext.task,
          mpkPath: task.input.mpkPath,
        },
        validationReport: task.input.validationReport,
        previousAttempts: task.attempts,
        maxAttempts: task.maxAttempts,
      };

    default:
      return baseContext;
  }
}

/**
 * Get allowed tools for a role (3-5 max)
 */
function getToolsForRole(role: WorkerRole): string[] {
  switch (role) {
    case 'translator':
      return ['figma-api', 'target-sdk', 'file-system'];
    case 'validator':
      return ['file-system', 'image-compare', 'schema-validator'];
    case 'remediator':
      return ['target-sdk', 'file-system', 'diff-analyzer'];
    default:
      return ['file-system'];
  }
}

// Placeholder: In real implementation, fetch from Figma API
async function getComponentData(componentId: string): Promise<FigmaComponent> {
  return {
    id: componentId,
    name: `Component-${componentId}`,
    type: 'COMPONENT',
  };
}

// Placeholder: In real implementation, fetch Figma export
async function getExpectedVisual(componentId: string): Promise<string> {
  return `figma-export:${componentId}.png`;
}

// =============================================================================
// Convoy Workflow
// =============================================================================

/**
 * Process a convoy through the full workflow
 * Mayor calls this to orchestrate the convoy
 */
export async function processConvoy(
  convoyId: string,
  options: { maxParallel?: number } = {}
): Promise<ConvoyProgress> {
  const maxParallel = options.maxParallel || 5;

  // Update convoy status
  await updateConvoyStatus(convoyId);

  // Get current progress
  let progress = await getConvoyProgress(convoyId);
  if (!progress) {
    throw new Error(`Convoy ${convoyId} not found`);
  }

  // Phase 1: Dispatch ready translate tasks
  if (progress.ready > 0) {
    await slingParallel(convoyId, 'translator', maxParallel);
  }

  return progress;
}

/**
 * Check convoy completion and get final status
 */
export async function checkConvoyCompletion(convoyId: string): Promise<{
  complete: boolean;
  progress: ConvoyProgress;
  blockers?: string[];
}> {
  const progress = await getConvoyProgress(convoyId);
  if (!progress) {
    throw new Error(`Convoy ${convoyId} not found`);
  }

  if (progress.complete === progress.total) {
    return { complete: true, progress };
  }

  // Find blockers
  const tasks = await getConvoyTasks(convoyId);
  const blockers = tasks
    .filter((t) => t.status === 'BLOCKED' || t.status === 'FAILED')
    .map((t) => t.id);

  return { complete: false, progress, blockers };
}

// =============================================================================
// Discovered Work
// =============================================================================

/**
 * Add discovered task to convoy (found during worker execution)
 */
export async function addDiscoveredTask(
  convoyId: string,
  discoveredFrom: string,
  componentId: string,
  componentName: string
): Promise<Task> {
  const task = await createTask({
    type: 'translate',
    input: { componentId },
    convoyId,
    blockedBy: [discoveredFrom],  // Block on parent task
  });

  await addTaskToConvoy(convoyId, task.id);
  await updateConvoyStatus(convoyId);

  return task;
}

// =============================================================================
// Convoy Chaining (Translate → Validate → Remediate)
// =============================================================================

/**
 * Create validation task for completed translation
 */
export async function chainToValidation(
  translationTaskId: string,
  mpkPath: string
): Promise<Task> {
  // Get original task to find convoy
  const allTasks = await getConvoyTasks('');
  const originalTask = allTasks.find((t) => t.id === translationTaskId);

  if (!originalTask) {
    throw new Error(`Task ${translationTaskId} not found`);
  }

  const validationTask = await createTask({
    type: 'validate',
    input: {
      mpkPath,
      componentId: originalTask.input.componentId,
    },
    convoyId: originalTask.convoyId,
    blockedBy: [translationTaskId],
  });

  if (originalTask.convoyId) {
    await addTaskToConvoy(originalTask.convoyId, validationTask.id);
    await updateConvoyStatus(originalTask.convoyId);
  }

  return validationTask;
}

/**
 * Create remediation task for failed validation
 */
export async function chainToRemediation(
  validationTaskId: string,
  mpkPath: string,
  validationReport: any
): Promise<Task> {
  const allTasks = await getConvoyTasks('');
  const originalTask = allTasks.find((t) => t.id === validationTaskId);

  if (!originalTask) {
    throw new Error(`Task ${validationTaskId} not found`);
  }

  const remediationTask = await createTask({
    type: 'remediate',
    input: {
      mpkPath,
      validationReport,
      componentId: originalTask.input.componentId,
    },
    convoyId: originalTask.convoyId,
    blockedBy: [validationTaskId],
  });

  if (originalTask.convoyId) {
    await addTaskToConvoy(originalTask.convoyId, remediationTask.id);
    await updateConvoyStatus(originalTask.convoyId);
  }

  return remediationTask;
}

// =============================================================================
// Convoy Status Display
// =============================================================================

/**
 * Get human-readable convoy status
 */
export async function getConvoyDisplay(convoyId: string): Promise<string> {
  const convoy = await getConvoy(convoyId);
  const progress = await getConvoyProgress(convoyId);

  if (!convoy || !progress) {
    return `Convoy ${convoyId} not found`;
  }

  const bar = createProgressBar(progress.percentComplete);

  return `
┌─────────────────────────────────────────────────────┐
│ CONVOY: ${convoy.name.padEnd(41)} │
│ ${bar} ${progress.percentComplete}%${' '.repeat(Math.max(0, 3 - String(progress.percentComplete).length))} │
│                                                     │
│ ✅ Complete:    ${String(progress.complete).padStart(3)} / ${progress.total}                        │
│ 🔄 In Progress: ${String(progress.inProgress).padStart(3)}                              │
│ ⏳ Ready:       ${String(progress.ready).padStart(3)}                              │
│ 🔒 Blocked:     ${String(progress.blocked).padStart(3)}                              │
│ ❌ Failed:      ${String(progress.failed).padStart(3)}                              │
└─────────────────────────────────────────────────────┘
`.trim();
}

function createProgressBar(percent: number, width: number = 40): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

// =============================================================================
// Exports
// =============================================================================

export const convoy = {
  // Creation
  createConvoyFromFigma,

  // Dispatch
  sling,
  slingParallel,

  // Workflow
  processConvoy,
  checkConvoyCompletion,

  // Discovered work
  addDiscoveredTask,

  // Chaining
  chainToValidation,
  chainToRemediation,

  // Status
  getConvoyDisplay,
};

export default convoy;
