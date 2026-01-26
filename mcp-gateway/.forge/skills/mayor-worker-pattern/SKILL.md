---
name: mayor-worker-pattern
description: Two-tier agent hierarchy pattern from Gas Town. Mayor (planner) coordinates ephemeral Workers (polecats) who execute isolated tasks without knowledge of each other. Prevents the coordination collapse that kills 40% of agentic projects.
---

# Mayor-Worker Pattern

Two-tier agent hierarchy for reliable multi-agent orchestration at scale.

## When to Use
- Building multi-agent systems (Epic 07+)
- Coordinating 3+ agents on related work
- Preventing "coordination collapse" (79% of multi-agent failures)
- Scaling beyond 10 agents reliably

## Core Principle

> "More agents can make things WORSE." — Google/MIT Dec 2025

Once a single agent reaches 45% accuracy, adding more agents often **degrades** performance due to coordination overhead. The fix: strict hierarchy with information hiding.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    MAYOR                            │
│  • Full workspace context                           │
│  • Creates tasks, reads ledger, dispatches workers  │
│  • ONLY entity with "big picture" view              │
└─────────────────────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
     ┌─────────┐   ┌─────────┐   ┌─────────┐
     │ WORKER  │   │ WORKER  │   │ WORKER  │
     │(Polecat)│   │(Polecat)│   │(Polecat)│
     └─────────┘   └─────────┘   └─────────┘
     • Ephemeral    • Ephemeral   • Ephemeral
     • Single task  • Single task • Single task
     • No knowledge • No knowledge• No knowledge
       of others      of others     of others
```

## The Two Tiers

### Tier 1: Mayor (Planner/Coordinator)
- Has full context about workspace, projects, and agents
- Creates work items (convoys) from requirements
- Dispatches tasks to workers via external ledger
- Monitors progress via ledger queries
- Makes decisions about work sequencing
- NEVER executes atomic tasks directly

### Tier 2: Workers (Polecats/Executors)
- **Ephemeral**: spawn → work → terminate
- **Isolated**: no knowledge of other workers
- **Scoped**: receives ONLY what's needed for ONE task
- **Stateless**: writes results to external ledger, then dies
- **Ignorant**: doesn't know the "big picture"

## FORGE Application

| FORGE Agent | Role | Tier |
|-------------|------|------|
| Orchestrator | Mayor | 1 |
| Translator | Worker | 2 |
| Validator | Worker | 2 |
| Remediator | Worker | 2 |

### Wrong (Current Pattern)
```typescript
// ❌ Workers see previous outputs (violates isolation)
const pipeline = [
  { agent: 'translator', input: fileKey },
  { agent: 'validator', input: (prev) => prev.mpkPath },  // VIOLATION
  { agent: 'remediator', input: (prev) => prev.report }   // VIOLATION
];
```

### Correct (Mayor-Worker Pattern)
```typescript
// ✅ Workers read/write to external ledger only
// Mayor coordinates via ledger, workers never see each other

// Mayor dispatches to Translator
await ledger.createTask({
  type: 'translate',
  input: { figmaFileKey, componentId },
  assignee: 'translator-worker'
});

// Translator writes result to ledger, terminates
// Mayor reads ledger, dispatches to Validator
await ledger.createTask({
  type: 'validate', 
  input: { mpkPath: ledger.getResult('translate-123').mpkPath },
  assignee: 'validator-worker'
});

// Validator never knows Translator existed
```

## Worker Ignorance (Critical)

Workers should have **Minimum Viable Context (MVC)**:

### What Workers SHOULD Know
- Their specific task parameters
- Tools needed for THIS task (3-5 max)
- Success criteria for THIS task
- Where to write results

### What Workers MUST NOT Know
- Other workers exist
- The "big picture" or overall goal
- Previous conversation history
- What happens after they complete

### Why This Matters
- Broad context leads to "scope creep"
- Workers try to be "helpful" by touching things they shouldn't
- 41-50% of work gets redone without strict scoping (Google/MIT)
- Enables 1,000-agent parallelism

## GUPP: The Execution Protocol

> **Gas Town Universal Polecat Protocol**
> "If there is work on your hook, YOU MUST RUN IT."

Workers check their hook (task queue) on startup:
1. Work present → EXECUTE immediately (no waiting for confirmation)
2. Work absent → Wait for dispatch

This prevents the "politeness deadlock":
```
❌ Mayor: "Would you like to work on this?"
❌ Worker: "I'd be happy to help when you're ready"
❌ Both wait forever
```

## Role Isolation via Filesystem

Gas Town enforces isolation at the filesystem level:

```
~/gt/                           # Town root
├── mayor/
│   ├── CLAUDE.md               # Mayor-specific instructions
│   └── .claude/settings.json   # Mayor settings
├── rig/
│   └── project/
│       ├── polecats/
│       │   ├── worker-1/       # Isolated workspace
│       │   └── worker-2/       # Isolated workspace
│       └── hooks/              # Git worktree storage
```

**Critical**: CLAUDE.md at town root would be inherited by ALL agents. Each role gets its own instructions file.

## Handoff Pattern (Context Pollution Prevention)

Workers don't run forever. They:
1. Execute task
2. Write to ledger
3. **Terminate**

New worker spawns fresh for next task. This prevents:
- "Lost in the Middle" memory issues
- Behavioral drift from original goals
- Context pollution from accumulated history

```bash
# Gas Town handoff command
gt handoff  # Worker sends work to ledger, restarts session
```

## Anti-Patterns

### ❌ Flat Agent Collaboration
```typescript
// Agents talking to each other directly
agentA.sendMessage(agentB, "Can you help with X?")
agentB.sendMessage(agentA, "Sure, let me know when ready")
// → Race conditions, distributed deadlock
```

### ❌ Shared State Between Workers
```typescript
// Workers fighting over shared toolbox
const sharedDB = new Database();
worker1.write(sharedDB);  // Lock contention
worker2.write(sharedDB);  // Conflict
```

### ❌ Long-Running Worker Sessions
```typescript
// Worker accumulates context over hours
for (const task of manyTasks) {
  await worker.execute(task);  // Context grows
  // By task 50, worker is confused about original goals
}
```

## Metrics That Matter

| Metric | Threshold | Action |
|--------|-----------|--------|
| Single agent accuracy | <45% | Fix agent before adding more |
| Worker context tokens | >4000 | Task too broad, split it |
| Tools per worker | >5 | Isolate toolsets |
| Workers waiting on each other | Any | Architecture failure |

## References
- Gas Town: github.com/steveyegge/gastown
- Google/MIT Study (Dec 2025): Agent scaling laws
- Steve Yegge's "Welcome to Gas Town" blog post
- Cursor AI: 1M-line codebase with 100s of isolated agents
