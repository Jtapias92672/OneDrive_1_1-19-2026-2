/**
 * FORGE Ledger - JSONL-based task tracking
 * Pattern: Beads-style append-only ledger
 *
 * All coordination happens via this ledger.
 * Workers read/write here, never communicate directly.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  Task,
  TaskStatus,
  TaskType,
  TaskInput,
  LedgerEvent,
  EventType,
  Convoy,
  ConvoyProgress,
  HookResult,
} from './types.js';

// =============================================================================
// Configuration
// =============================================================================

const FORGE_ROOT = path.join(process.cwd(), '.forge');
const LEDGER_DIR = path.join(FORGE_ROOT, 'ledger');
const TASKS_FILE = path.join(LEDGER_DIR, 'tasks.jsonl');
const EVENTS_FILE = path.join(LEDGER_DIR, 'events.jsonl');
const CONVOYS_FILE = path.join(LEDGER_DIR, 'convoys.jsonl');

// =============================================================================
// Hash ID Generation
// =============================================================================

/**
 * Generate a hash-based ID
 * Format: "{prefix}-{8-char-hash}"
 */
export function generateId(prefix: string, data?: string): string {
  const input = data || `${Date.now()}-${Math.random()}`;
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  return `${prefix}-${hash.substring(0, 8)}`;
}

/**
 * Generate SHA-256 hash of content
 */
export function hashContent(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// =============================================================================
// JSONL Operations
// =============================================================================

/**
 * Append a record to a JSONL file
 */
async function appendJsonl<T>(filePath: string, record: T): Promise<void> {
  const line = JSON.stringify(record) + '\n';
  await fs.appendFile(filePath, line, 'utf-8');
}

/**
 * Read all records from a JSONL file
 */
async function readJsonl<T>(filePath: string): Promise<T[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line) as T);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Read last N records from JSONL file
 */
async function readLastJsonl<T>(filePath: string, count: number): Promise<T[]> {
  const all = await readJsonl<T>(filePath);
  return all.slice(-count);
}

/**
 * Find records matching predicate
 */
async function findJsonl<T>(
  filePath: string,
  predicate: (record: T) => boolean
): Promise<T[]> {
  const all = await readJsonl<T>(filePath);
  return all.filter(predicate);
}

// =============================================================================
// Task Operations
// =============================================================================

export interface CreateTaskOptions {
  type: TaskType;
  input: TaskInput;
  convoyId?: string;
  blockedBy?: string[];
  maxAttempts?: number;
}

/**
 * Create a new task in the ledger
 */
export async function createTask(options: CreateTaskOptions): Promise<Task> {
  const now = new Date().toISOString();
  const task: Task = {
    id: generateId('task', `${options.type}-${now}`),
    type: options.type,
    convoyId: options.convoyId,
    input: options.input,
    status: options.blockedBy?.length ? 'BLOCKED' : 'PENDING',
    blockedBy: options.blockedBy || [],
    blocks: [],
    created: now,
    updated: now,
    attempts: 0,
    maxAttempts: options.maxAttempts || 3,
  };

  await appendJsonl(TASKS_FILE, task);
  await logEvent('task_created', { taskId: task.id, convoyId: task.convoyId });

  return task;
}

/**
 * Get a task by ID
 */
export async function getTask(taskId: string): Promise<Task | null> {
  const tasks = await findJsonl<Task>(TASKS_FILE, (t) => t.id === taskId);
  if (tasks.length === 0) return null;

  // Return the latest version (in case of updates)
  return tasks[tasks.length - 1];
}

/**
 * Get all tasks for a convoy
 */
export async function getConvoyTasks(convoyId: string): Promise<Task[]> {
  const allTasks = await readJsonl<Task>(TASKS_FILE);

  // Build map of latest task states
  const taskMap = new Map<string, Task>();
  for (const task of allTasks) {
    if (task.convoyId === convoyId) {
      taskMap.set(task.id, task);
    }
  }

  return Array.from(taskMap.values());
}

/**
 * Update a task's status
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  updates?: Partial<Task>
): Promise<Task | null> {
  const existing = await getTask(taskId);
  if (!existing) return null;

  const updated: Task = {
    ...existing,
    ...updates,
    status,
    updated: new Date().toISOString(),
  };

  await appendJsonl(TASKS_FILE, updated);

  // Log appropriate event
  const eventType = statusToEventType(status);
  if (eventType) {
    await logEvent(eventType, { taskId });
  }

  return updated;
}

/**
 * Record task completion with result
 */
export async function completeTask(
  taskId: string,
  result: HookResult
): Promise<Task | null> {
  const status = result.status === 'COMPLETE' ? 'COMPLETE' : 'FAILED';
  const updated = await updateTaskStatus(taskId, status, {
    attempts: (await getTask(taskId))?.attempts ?? 0 + 1,
  });

  if (updated && result.status === 'COMPLETE') {
    // Check if this unblocks other tasks
    await checkUnblocked(taskId);
  }

  return updated;
}

/**
 * Get ready tasks (PENDING with no blockers)
 */
export async function getReadyTasks(convoyId?: string): Promise<Task[]> {
  const allTasks = await readJsonl<Task>(TASKS_FILE);

  // Build latest state map
  const taskMap = new Map<string, Task>();
  for (const task of allTasks) {
    taskMap.set(task.id, task);
  }

  // Find ready tasks
  const ready: Task[] = [];
  for (const task of Array.from(taskMap.values())) {
    if (convoyId && task.convoyId !== convoyId) continue;
    if (task.status !== 'PENDING' && task.status !== 'READY') continue;

    // Check all blockers are complete
    const allBlockersComplete = task.blockedBy.every((blockerId) => {
      const blocker = taskMap.get(blockerId);
      return blocker?.status === 'COMPLETE';
    });

    if (allBlockersComplete) {
      ready.push(task);
    }
  }

  return ready;
}

/**
 * Check and unblock tasks waiting on completed task
 */
async function checkUnblocked(completedTaskId: string): Promise<void> {
  const allTasks = await readJsonl<Task>(TASKS_FILE);
  const taskMap = new Map<string, Task>();
  for (const task of allTasks) {
    taskMap.set(task.id, task);
  }

  for (const task of Array.from(taskMap.values())) {
    if (task.status !== 'BLOCKED') continue;
    if (!task.blockedBy.includes(completedTaskId)) continue;

    // Check if all blockers now complete
    const allComplete = task.blockedBy.every((id) => {
      const blocker = taskMap.get(id);
      return blocker?.status === 'COMPLETE';
    });

    if (allComplete) {
      await updateTaskStatus(task.id, 'READY');
    }
  }
}

// =============================================================================
// Event Logging
// =============================================================================

/**
 * Log an event to the ledger
 */
export async function logEvent(
  type: EventType,
  data: Partial<LedgerEvent>
): Promise<LedgerEvent> {
  const event: LedgerEvent = {
    id: generateId('evt'),
    type,
    timestamp: new Date().toISOString(),
    ...data,
  };

  await appendJsonl(EVENTS_FILE, event);
  return event;
}

/**
 * Get recent events
 */
export async function getRecentEvents(count: number = 50): Promise<LedgerEvent[]> {
  return readLastJsonl<LedgerEvent>(EVENTS_FILE, count);
}

/**
 * Get events for a task
 */
export async function getTaskEvents(taskId: string): Promise<LedgerEvent[]> {
  return findJsonl<LedgerEvent>(EVENTS_FILE, (e) => e.taskId === taskId);
}

// =============================================================================
// Convoy Operations
// =============================================================================

export interface CreateConvoyOptions {
  name: string;
  figmaFileKey: string;
  frameId?: string;
  taskIds?: string[];
}

/**
 * Create a new convoy
 */
export async function createConvoy(options: CreateConvoyOptions): Promise<Convoy> {
  const now = new Date().toISOString();
  const convoy: Convoy = {
    id: generateId('convoy', `${options.figmaFileKey}-${now}`),
    name: options.name,
    figmaFileKey: options.figmaFileKey,
    frameId: options.frameId,
    tasks: options.taskIds || [],
    status: 'PENDING',
    created: now,
    updated: now,
    totalTasks: options.taskIds?.length || 0,
    completedTasks: 0,
    failedTasks: 0,
    blockedTasks: 0,
    inProgressTasks: 0,
  };

  await appendJsonl(CONVOYS_FILE, convoy);
  await logEvent('convoy_created', { convoyId: convoy.id });

  return convoy;
}

/**
 * Get convoy by ID
 */
export async function getConvoy(convoyId: string): Promise<Convoy | null> {
  const convoys = await findJsonl<Convoy>(CONVOYS_FILE, (c) => c.id === convoyId);
  if (convoys.length === 0) return null;
  return convoys[convoys.length - 1];
}

/**
 * Add task to convoy
 */
export async function addTaskToConvoy(
  convoyId: string,
  taskId: string
): Promise<Convoy | null> {
  const existing = await getConvoy(convoyId);
  if (!existing) return null;

  const updated: Convoy = {
    ...existing,
    tasks: [...existing.tasks, taskId],
    totalTasks: existing.totalTasks + 1,
    updated: new Date().toISOString(),
  };

  await appendJsonl(CONVOYS_FILE, updated);
  return updated;
}

/**
 * Get convoy progress
 */
export async function getConvoyProgress(convoyId: string): Promise<ConvoyProgress | null> {
  const convoy = await getConvoy(convoyId);
  if (!convoy) return null;

  const tasks = await getConvoyTasks(convoyId);

  let complete = 0;
  let inProgress = 0;
  let ready = 0;
  let blocked = 0;
  let failed = 0;

  for (const task of tasks) {
    switch (task.status) {
      case 'COMPLETE':
        complete++;
        break;
      case 'IN_PROGRESS':
        inProgress++;
        break;
      case 'READY':
      case 'PENDING':
        ready++;
        break;
      case 'BLOCKED':
        blocked++;
        break;
      case 'FAILED':
        failed++;
        break;
    }
  }

  const total = tasks.length;
  return {
    total,
    complete,
    inProgress,
    ready,
    blocked,
    failed,
    percentComplete: total > 0 ? Math.round((complete / total) * 100) : 0,
  };
}

/**
 * Update convoy status based on task progress
 */
export async function updateConvoyStatus(convoyId: string): Promise<Convoy | null> {
  const progress = await getConvoyProgress(convoyId);
  if (!progress) return null;

  const convoy = await getConvoy(convoyId);
  if (!convoy) return null;

  let status: Convoy['status'] = 'IN_PROGRESS';

  if (progress.complete === progress.total) {
    status = 'COMPLETE';
  } else if (progress.blocked > 0 && progress.ready === 0 && progress.inProgress === 0) {
    status = 'BLOCKED';
  } else if (progress.inProgress > 0 || progress.complete > 0) {
    status = 'IN_PROGRESS';
  } else {
    status = 'PENDING';
  }

  const updated: Convoy = {
    ...convoy,
    status,
    completedTasks: progress.complete,
    failedTasks: progress.failed,
    blockedTasks: progress.blocked,
    inProgressTasks: progress.inProgress,
    updated: new Date().toISOString(),
  };

  await appendJsonl(CONVOYS_FILE, updated);

  if (status === 'COMPLETE') {
    await logEvent('convoy_completed', { convoyId });
  } else if (status === 'BLOCKED') {
    await logEvent('convoy_blocked', { convoyId });
  }

  return updated;
}

// =============================================================================
// V&V Queries (Epic 7.5)
// =============================================================================

/**
 * Query tasks by V&V status
 */
export async function queryByVnVStatus(
  status: 'pending' | 'passed' | 'failed',
  type: 'verification' | 'validation'
): Promise<Task[]> {
  const allTasks = await readJsonl<Task>(TASKS_FILE);

  // Build latest state map
  const taskMap = new Map<string, Task>();
  for (const task of allTasks) {
    taskMap.set(task.id, task);
  }

  // Filter by V&V status
  return Array.from(taskMap.values()).filter((task) => {
    if (!task.vnv) return status === 'pending';

    if (type === 'verification') {
      return task.vnv.verificationStatus === status;
    } else {
      return task.vnv.validationStatus === status;
    }
  });
}

/**
 * Query tasks that failed a specific gate
 */
export async function queryFailedGates(gateName?: string): Promise<Task[]> {
  const allTasks = await readJsonl<Task>(TASKS_FILE);

  // Build latest state map
  const taskMap = new Map<string, Task>();
  for (const task of allTasks) {
    taskMap.set(task.id, task);
  }

  return Array.from(taskMap.values()).filter((task) => {
    if (!task.vnv) return false;
    if (gateName) {
      return task.vnv.gatesFailed.includes(gateName as any);
    }
    return task.vnv.gatesFailed.length > 0;
  });
}

/**
 * Query tasks by work item ID
 */
export async function queryByWorkItemId(workItemId: string): Promise<Task[]> {
  const allTasks = await readJsonl<Task>(TASKS_FILE);

  // Build latest state map
  const taskMap = new Map<string, Task>();
  for (const task of allTasks) {
    taskMap.set(task.id, task);
  }

  return Array.from(taskMap.values()).filter(
    (task) => task.workItemId === workItemId
  );
}

/**
 * Update task V&V status
 */
export async function updateTaskVnV(
  taskId: string,
  vnvUpdate: Partial<Task['vnv']>
): Promise<Task | null> {
  const existing = await getTask(taskId);
  if (!existing) return null;

  const updated: Task = {
    ...existing,
    vnv: {
      ...existing.vnv,
      ...vnvUpdate,
      lastEvaluated: new Date().toISOString(),
    } as Task['vnv'],
    updated: new Date().toISOString(),
  };

  await appendJsonl(TASKS_FILE, updated);

  // Log appropriate event
  if (vnvUpdate.verificationStatus === 'passed' && vnvUpdate.validationStatus === 'passed') {
    await logEvent('vnv_passed', { taskId });
  } else if (vnvUpdate.verificationStatus === 'failed' || vnvUpdate.validationStatus === 'failed') {
    await logEvent('vnv_failed', { taskId });
  } else {
    await logEvent('vnv_evaluated', { taskId });
  }

  return updated;
}

/**
 * Record gate evaluation result
 */
export async function recordGateResult(
  taskId: string,
  gateName: string,
  status: 'AUTHORIZED' | 'DENIED',
  reasons: string[]
): Promise<Task | null> {
  const existing = await getTask(taskId);
  if (!existing) return null;

  const vnv = existing.vnv || {
    checkerSpecId: '',
    verificationStatus: 'pending' as const,
    validationStatus: 'pending' as const,
    gatesPassed: [],
    gatesFailed: [],
    lastEvaluated: new Date().toISOString(),
  };

  if (status === 'AUTHORIZED') {
    if (!vnv.gatesPassed.includes(gateName as any)) {
      vnv.gatesPassed.push(gateName as any);
    }
    // Remove from failed if it was there
    vnv.gatesFailed = vnv.gatesFailed.filter((g) => g !== gateName);
  } else {
    if (!vnv.gatesFailed.includes(gateName as any)) {
      vnv.gatesFailed.push(gateName as any);
    }
    // Remove from passed if it was there
    vnv.gatesPassed = vnv.gatesPassed.filter((g) => g !== gateName);
  }

  const updated: Task = {
    ...existing,
    vnv,
    updated: new Date().toISOString(),
  };

  await appendJsonl(TASKS_FILE, updated);

  // Log event
  await logEvent(status === 'AUTHORIZED' ? 'gate_authorized' : 'gate_denied', {
    taskId,
    data: { gate: gateName, reasons },
  });

  return updated;
}

/**
 * Get V&V summary for a convoy
 */
export async function getConvoyVnVSummary(convoyId: string): Promise<{
  total: number;
  verificationPassed: number;
  verificationFailed: number;
  verificationPending: number;
  validationPassed: number;
  validationFailed: number;
  validationPending: number;
  gatesBlocked: number;
} | null> {
  const tasks = await getConvoyTasks(convoyId);
  if (tasks.length === 0) return null;

  let verificationPassed = 0;
  let verificationFailed = 0;
  let verificationPending = 0;
  let validationPassed = 0;
  let validationFailed = 0;
  let validationPending = 0;
  let gatesBlocked = 0;

  for (const task of tasks) {
    if (!task.vnv) {
      verificationPending++;
      validationPending++;
      continue;
    }

    switch (task.vnv.verificationStatus) {
      case 'passed': verificationPassed++; break;
      case 'failed': verificationFailed++; break;
      case 'pending': verificationPending++; break;
    }

    switch (task.vnv.validationStatus) {
      case 'passed': validationPassed++; break;
      case 'failed': validationFailed++; break;
      case 'pending': validationPending++; break;
    }

    if (task.vnv.gatesFailed.length > 0) {
      gatesBlocked++;
    }
  }

  return {
    total: tasks.length,
    verificationPassed,
    verificationFailed,
    verificationPending,
    validationPassed,
    validationFailed,
    validationPending,
    gatesBlocked,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function statusToEventType(status: TaskStatus): EventType | null {
  switch (status) {
    case 'IN_PROGRESS':
      return 'task_started';
    case 'COMPLETE':
      return 'task_completed';
    case 'FAILED':
      return 'task_failed';
    case 'BLOCKED':
      return 'task_blocked';
    default:
      return null;
  }
}

/**
 * Initialize ledger directory and files
 */
export async function initLedger(): Promise<void> {
  await fs.mkdir(LEDGER_DIR, { recursive: true });

  // Touch files if they don't exist
  for (const file of [TASKS_FILE, EVENTS_FILE, CONVOYS_FILE]) {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, '', 'utf-8');
    }
  }
}

// =============================================================================
// Exports
// =============================================================================

export const ledger = {
  // Task operations
  createTask,
  getTask,
  getConvoyTasks,
  updateTaskStatus,
  completeTask,
  getReadyTasks,

  // Event operations
  logEvent,
  getRecentEvents,
  getTaskEvents,

  // Convoy operations
  createConvoy,
  getConvoy,
  addTaskToConvoy,
  getConvoyProgress,
  updateConvoyStatus,

  // V&V operations (Epic 7.5)
  queryByVnVStatus,
  queryFailedGates,
  queryByWorkItemId,
  updateTaskVnV,
  recordGateResult,
  getConvoyVnVSummary,

  // Utilities
  generateId,
  hashContent,
  initLedger,
};

export default ledger;
