---
name: forge-convoy
description: Work bundling pattern from Gas Town for parallel component processing. Convoys group related tasks for coordinated execution across multiple workers without direct agent communication.
---

# FORGE Convoy Pattern

Work bundling for parallel component processing in multi-agent systems.

## When to Use
- Processing multiple Figma components simultaneously
- Coordinating work across multiple workers
- Tracking progress of related tasks
- Enabling parallel execution without conflicts

## Core Concept

A **Convoy** is a work bundle that:
- Groups related tasks (e.g., all components in a Figma frame)
- Tracks progress across multiple workers
- Survives agent restarts
- Coordinates without agent-to-agent communication

```
┌─────────────────────────────────────────────────────┐
│                    CONVOY                           │
│  "Auth System Components"                           │
│  ┌─────────┬─────────┬─────────┬─────────┐        │
│  │ Task 1  │ Task 2  │ Task 3  │ Task 4  │        │
│  │LoginForm│SignupBtn│AuthModal│UserMenu │        │
│  │ ✅ DONE │ 🔄 WIP  │ ⏳ READY│ 🔒 BLOCKED│       │
│  └─────────┴─────────┴─────────┴─────────┘        │
└─────────────────────────────────────────────────────┘
```

## FORGE Convoy Structure

```typescript
interface ForgeConvoy {
  id: string;                    // Hash-based: "convoy-a1b2"
  name: string;                  // Human-readable name
  figmaFileKey: string;          // Source Figma file
  frameId?: string;              // Optional: specific frame
  
  tasks: ConvoyTask[];           // Individual components
  status: ConvoyStatus;          // PENDING | IN_PROGRESS | COMPLETE | BLOCKED
  
  created: string;               // ISO timestamp
  updated: string;               // Last modification
  
  // Coordination metadata
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  blockedTasks: number;
}

interface ConvoyTask {
  id: string;                    // "convoy-a1b2.1"
  componentId: string;           // Figma component ID
  componentName: string;         // Human-readable
  
  status: TaskStatus;            // READY | IN_PROGRESS | COMPLETE | FAILED | BLOCKED
  assignedWorker?: string;       // Worker ID if in progress
  
  // Dependencies (Beads-style)
  blockedBy: string[];           // Task IDs that must complete first
  discoveredFrom?: string;       // Parent task if found during work
  
  // Results
  result?: {
    mpkPath?: string;            // Generated Mendix package
    evidencePath?: string;       // Validation evidence
    error?: string;              // If failed
  };
}
```

## Convoy Lifecycle

```
┌──────────┐     ┌───────────────┐     ┌──────────┐
│ CREATED  │────▶│  IN_PROGRESS  │────▶│ COMPLETE │
└──────────┘     └───────────────┘     └──────────┘
     │                  │                    │
     │                  ▼                    │
     │           ┌──────────┐               │
     └──────────▶│  BLOCKED │◀──────────────┘
                 └──────────┘
```

### State Transitions

| From | To | Trigger |
|------|-----|---------|
| CREATED | IN_PROGRESS | First task assigned |
| IN_PROGRESS | COMPLETE | All tasks complete |
| IN_PROGRESS | BLOCKED | Unresolvable dependency |
| BLOCKED | IN_PROGRESS | Blocker resolved |

## Creating Convoys

### From Figma File
```typescript
// Mayor creates convoy from Figma analysis
const convoy = await createConvoy({
  name: "Auth System Components",
  figmaFileKey: "abc123",
  components: figmaParser.extractComponents(figmaFile)
});

// Results in:
// convoy-a1b2
// ├── convoy-a1b2.1: LoginForm (READY)
// ├── convoy-a1b2.2: SignupButton (READY) 
// ├── convoy-a1b2.3: AuthModal (BLOCKED by .1, .2)
// └── convoy-a1b2.4: UserMenu (READY)
```

### With Dependencies
```typescript
// Some components depend on others (shared styles, tokens)
await convoy.addDependency({
  from: "convoy-a1b2.3",  // AuthModal
  to: "convoy-a1b2.1",    // LoginForm (must complete first)
  type: "blocks"
});
```

## Sling: Dispatching Work

**Sling** = assign task to worker via ledger (not direct communication)

```typescript
// Mayor slings task to available worker
await sling({
  task: "convoy-a1b2.1",
  rig: "forge-translator",
  // Worker will find this in their hook
});

// Worker picks up task from hook
const myTask = await hook.getWork();
// { taskId: "convoy-a1b2.1", type: "translate", ... }
```

### Sling Rules
1. Only sling READY tasks (no open blockers)
2. One task per worker at a time
3. Worker writes result to ledger, then terminates
4. Mayor checks ledger, slings next task

## Parallel Processing

Convoys enable safe parallelism:

```typescript
// Mayor finds all ready tasks
const readyTasks = convoy.tasks.filter(t => 
  t.status === 'READY' && 
  t.blockedBy.every(dep => getTask(dep).status === 'COMPLETE')
);

// Sling to multiple workers in parallel
await Promise.all(readyTasks.map(task => 
  sling({ task: task.id, rig: 'forge-translator' })
));

// No conflicts because:
// - Each worker has isolated workspace
// - Workers don't know about each other
// - Results merge via ledger, not shared state
```

## Discovered Work Pattern

Workers may discover additional work during execution:

```typescript
// Translator finds missing asset
await ledger.createTask({
  id: generateHashId(),
  componentName: "MissingIcon",
  status: "READY",
  discoveredFrom: "convoy-a1b2.1",  // Links back to parent
  // Inherits parent's convoy
});
```

The `discovered-from` dependency:
- Preserves audit trail
- Inherits parent's source context
- Enables root cause analysis

## Convoy Progress Tracking

```typescript
// Mayor queries convoy status
const status = await convoy.getStatus();
// {
//   total: 4,
//   complete: 1,
//   inProgress: 1,
//   ready: 1,
//   blocked: 1,
//   failed: 0,
//   percentComplete: 25
// }

// Ready work query (Beads-style)
const readyWork = await convoy.getReadyTasks();
// Returns tasks with no open blockers
```

## Integration with Beads

Convoys can be stored as Beads for persistence:

```bash
# Create convoy as Beads epic
bd create "Auth System Convoy" -t epic -p 1

# Add component tasks as children
bd create "LoginForm" -p 1  # Auto-assigns bd-a1b2.1
bd create "SignupButton" -p 1  # Auto-assigns bd-a1b2.2

# Add blocking dependency
bd dep add bd-a1b2.3 bd-a1b2.1 --type blocks

# Query ready work
bd ready --json
```

## FORGE Convoy CLI (Proposed)

```bash
# Create convoy from Figma
forge convoy create --figma abc123 --name "Auth System"

# List convoys
forge convoy list

# Show convoy progress
forge convoy show convoy-a1b2

# Sling ready tasks
forge convoy sling convoy-a1b2 --parallel 3

# Mark task complete
forge convoy complete convoy-a1b2.1 --result /path/to/mpk
```

## Anti-Patterns

### ❌ Workers Communicating Directly
```typescript
// Workers talking to each other
translatorWorker.notify(validatorWorker, "Done!");
// → Race condition, coupling
```

### ❌ Shared Convoy State in Memory
```typescript
// Convoy in worker memory
worker.convoy = globalConvoyState;
worker.convoy.updateTask(...);  // Conflicts
```

### ❌ Blocking on Other Workers
```typescript
// Worker waiting for another worker
await otherWorker.waitForComplete();  // Deadlock risk
```

## Correct Pattern

```typescript
// ✅ All coordination via ledger
// Worker reads: ledger
// Worker writes: ledger
// Worker never: talks to other workers

async function executeTask(taskId: string) {
  // 1. Read task from ledger
  const task = await ledger.getTask(taskId);
  
  // 2. Execute in isolation
  const result = await translate(task.componentId);
  
  // 3. Write result to ledger
  await ledger.completeTask(taskId, result);
  
  // 4. Terminate (Mayor will dispatch next)
  process.exit(0);
}
```

## References
- Gas Town Convoy: github.com/steveyegge/gastown
- Beads ready work: github.com/steveyegge/beads
- FORGE Epic 07: Agent Orchestration
