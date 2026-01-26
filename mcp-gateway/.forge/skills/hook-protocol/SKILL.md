---
name: hook-protocol
description: Git-backed task persistence pattern from Gas Town. Hooks provide durable storage that survives agent crashes and restarts. Implements GUPP (Universal Polecat Protocol) for autonomous execution.
---

# Hook Protocol

Git-backed task persistence for reliable multi-agent workflows.

## When to Use
- Agents need to survive crashes/restarts
- Work state must persist beyond session
- Multiple agents coordinate on shared tasks
- Audit trail required for all work

## Core Concept

A **Hook** is a git worktree-based persistent storage:
- Work "hangs" on the hook until completed
- Survives agent restarts, crashes, context resets
- Versioned via git (rollback capable)
- Shared across machines via git push/pull

```
┌─────────────────────────────────────────────────────┐
│                      HOOK                           │
│  Git Worktree: /project/.forge/hooks/worker-1/     │
│  ┌──────────────────────────────────────────────┐  │
│  │ task.json     - Current assigned work        │  │
│  │ context.json  - Minimum viable context       │  │
│  │ result.json   - Output when complete         │  │
│  │ evidence/     - Proof of work                │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## GUPP: The Universal Protocol

> **Gas Town Universal Polecat Protocol**
> "If there is work on your hook, YOU MUST RUN IT."

### Worker Startup Behavior
```typescript
async function workerStartup() {
  // 1. Check hook for pending work
  const hook = await getHook();
  
  if (hook.hasWork()) {
    // 2. Work present → EXECUTE immediately
    // No announcement, no waiting, no asking permission
    await execute(hook.getTask());
  } else {
    // 3. No work → Wait for dispatch
    await waitForMail();
  }
}
```

### Why GUPP Matters
Without GUPP:
```
❌ Mayor: "Ready to work on task X?"
❌ Worker: "Sure, whenever you're ready"
❌ Mayor: "OK, let me know when you start"
❌ Worker: "Waiting for your signal"
→ Infinite politeness loop, no work done
```

With GUPP:
```
✅ Mayor slings task to hook
✅ Worker starts, sees hook has work
✅ Worker executes immediately
✅ No waiting, no asking, no deadlock
```

## Hook Structure

### Directory Layout
```
.forge/hooks/
├── translator-1/
│   ├── task.json         # Assigned work
│   ├── context.json      # MVC (minimum viable context)
│   ├── result.json       # Output (when complete)
│   ├── status.json       # PENDING | IN_PROGRESS | COMPLETE | FAILED
│   └── evidence/
│       ├── input-hash.txt
│       └── output-hash.txt
├── translator-2/
│   └── ...
└── validator-1/
    └── ...
```

### Task Schema
```typescript
interface HookTask {
  id: string;                // "convoy-a1b2.1"
  type: string;              // "translate" | "validate" | "remediate"
  
  input: {
    componentId?: string;    // For translator
    mpkPath?: string;        // For validator
    validationReport?: string; // For remediator
  };
  
  assigned: string;          // ISO timestamp
  timeout?: string;          // ISO timestamp for deadline
  
  // Coordination
  convoyId?: string;         // Parent convoy
  blockedBy?: string[];      // Dependencies
  discoveredFrom?: string;   // Parent task if found during work
}
```

### Context Schema (MVC)
```typescript
interface HookContext {
  // ONLY what worker needs for THIS task
  // NOT the full conversation history
  // NOT knowledge of other workers
  
  task: HookTask;
  
  // Task-specific context
  figmaComponent?: FigmaComponent;  // For translator
  expectedOutput?: Schema;          // For validator
  previousAttempts?: Attempt[];     // For remediator (max 3)
  
  // Tooling (3-5 max)
  tools: string[];  // ["figma-api", "mendix-sdk", "file-system"]
}
```

### Result Schema
```typescript
interface HookResult {
  taskId: string;
  status: "COMPLETE" | "FAILED";
  
  output?: {
    mpkPath?: string;        // Translator output
    validationReport?: string; // Validator output
    remediationPatch?: string; // Remediator output
  };
  
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
  
  evidence: {
    inputHash: string;       // SHA-256 of input
    outputHash: string;      // SHA-256 of output
    timestamp: string;       // ISO completion time
  };
  
  // Discovered work
  discoveredTasks?: NewTask[];
}
```

## Hook Operations

### Sling (Assign Work)
```typescript
// Mayor slings task to worker's hook
async function sling(taskId: string, workerId: string) {
  const task = await ledger.getTask(taskId);
  const context = await buildMVC(task);
  
  // Write to worker's hook
  await writeHook(workerId, {
    task,
    context,
    status: "PENDING"
  });
  
  // Git commit for persistence
  await git.commit(`Sling ${taskId} to ${workerId}`);
}
```

### Execute (Worker Side)
```typescript
// Worker checks and executes hook
async function checkHook() {
  const hook = await readHook(MY_WORKER_ID);
  
  if (hook.status === "PENDING") {
    // Update status
    await updateHookStatus("IN_PROGRESS");
    
    // Execute task
    try {
      const result = await executeTask(hook.task, hook.context);
      await writeResult(result);
      await updateHookStatus("COMPLETE");
    } catch (error) {
      await writeError(error);
      await updateHookStatus("FAILED");
    }
    
    // Git commit result
    await git.commit(`Complete ${hook.task.id}`);
    
    // Terminate (fresh worker for next task)
    process.exit(0);
  }
}
```

### Handoff (Context Reset)
```typescript
// Worker hands off before context pollution
async function handoff() {
  // 1. Commit current work
  await git.commit("Handoff checkpoint");
  
  // 2. Write continuation state to hook
  await writeHook(MY_WORKER_ID, {
    ...currentHook,
    handoffReason: "context_limit",
    resumePoint: currentStep
  });
  
  // 3. Terminate session
  // New worker will pick up from hook
  process.exit(0);
}
```

## Git Integration

### Worktree Structure
```bash
# Main repo
~/project/
├── .git/
├── .forge/
│   └── hooks/      # Hook storage (committed)
└── src/

# Each worker can use git worktree for isolation
~/project/.git/worktrees/
├── translator-1/   # Isolated working copy
└── validator-1/    # Isolated working copy
```

### Persistence Flow
```
1. Mayor slings task → writes to hook → git commit
2. Worker reads hook → executes → writes result → git commit
3. Mayor reads result → dispatches next → git commit
4. All state persisted, survives any crash
```

### Crash Recovery
```typescript
// On worker startup after crash
async function recoverFromCrash() {
  const hook = await readHook(MY_WORKER_ID);
  
  switch (hook.status) {
    case "PENDING":
      // Never started, execute fresh
      await executeTask(hook.task, hook.context);
      break;
      
    case "IN_PROGRESS":
      // Was running, check for partial result
      if (await hasPartialResult()) {
        await resumeTask(hook.task);
      } else {
        await executeTask(hook.task, hook.context);  // Restart
      }
      break;
      
    case "COMPLETE":
    case "FAILED":
      // Already done, wait for new work
      await waitForMail();
      break;
  }
}
```

## FORGE Hook Implementation

### Directory Structure
```
.forge/
├── hooks/
│   ├── translator-pool/
│   │   ├── worker-1/
│   │   │   ├── task.json
│   │   │   ├── context.json
│   │   │   ├── result.json
│   │   │   └── evidence/
│   │   └── worker-2/
│   ├── validator-pool/
│   │   └── worker-1/
│   └── remediator-pool/
│       └── worker-1/
├── ledger/
│   ├── tasks.jsonl      # All tasks (Beads format)
│   ├── convoys.jsonl    # Convoy definitions
│   └── evidence.jsonl   # Evidence packs
└── config.yaml
```

### Hook CLI (Proposed)
```bash
# Check hook status
forge hook status worker-1

# Read hook contents
forge hook show worker-1

# Clear completed hook
forge hook clear worker-1

# List all hooks
forge hook list

# Repair orphaned hooks
forge hook repair
```

## Anti-Patterns

### ❌ Work in Memory Only
```typescript
// Work lost on crash
const currentTask = await getTask();
await execute(currentTask);  // Crash here = lost
```

### ❌ Shared Mutable State
```typescript
// Workers fighting over shared hook
await sharedHook.update({ worker1Result });
await sharedHook.update({ worker2Result });  // Conflict
```

### ❌ Long-Running Sessions
```typescript
// Context accumulates, work not persisted
while (true) {
  const task = await getNextTask();
  await execute(task);  // Hours of work in volatile memory
}
```

## Correct Pattern

```typescript
// ✅ Persistent, isolated, ephemeral
async function workerLifecycle() {
  // 1. Read from MY hook (isolated)
  const myHook = await readHook(MY_WORKER_ID);
  
  // 2. Execute single task
  const result = await execute(myHook.task);
  
  // 3. Write result to MY hook
  await writeResult(MY_WORKER_ID, result);
  
  // 4. Git commit (persistent)
  await git.commit(`${MY_WORKER_ID}: ${myHook.task.id}`);
  
  // 5. Terminate (ephemeral)
  process.exit(0);
  
  // New worker spawns for next task
}
```

## References
- Gas Town Hooks: github.com/steveyegge/gastown
- Beads JSONL: github.com/steveyegge/beads
- FORGE Evidence Packs: Epic 08
- Git Worktrees: git-scm.com/docs/git-worktree
