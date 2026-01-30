# Epic 07: Agent Orchestration

**Status:** PLANNING
**Pattern:** Mayor-Worker (Gas Town)
**Created:** 2026-01-26

---

## 1. CAPABILITIES REQUIRED

| # | Capability | Must Work |
|---|------------|-----------|
| 1 | **Mayor dispatches work** | Mayor creates tasks, writes to ledger, workers read and execute |
| 2 | **Worker isolation** | Workers execute single task, no knowledge of other workers |
| 3 | **Hook persistence** | Work state survives crashes via git-backed hooks |
| 4 | **Convoy bundling** | Figma components grouped for parallel processing |
| 5 | **MVC enforcement** | Workers get minimum viable context only |
| 6 | **Tool budgets** | Each role limited to 3-5 tools max |
| 7 | **Episodic execution** | Workers terminate after single task completion |
| 8 | **External coordination** | All coordination via ledger, never agent-to-agent |

---

## 2. AGENT ROLES

| Role | Tier | Responsibility | Tools (3-5 max) |
|------|------|----------------|-----------------|
| **Orchestrator** | Mayor | Dispatch work, monitor progress, handle failures | ledger, convoy, hook, mail |
| **Translator** | Worker | Figma → Mendix/React conversion | figma-api, target-sdk, file-system |
| **Validator** | Worker | Visual diff, schema validation | file-system, image-compare, schema-validator |
| **Remediator** | Worker | Fix validation failures | target-sdk, file-system, diff-analyzer |

### Role Isolation Rules

```
Mayor (Orchestrator):
- HAS: Full workspace context, ledger access, convoy management
- CAN: Create tasks, read all hooks, dispatch workers, escalate to human
- CANNOT: Execute translations directly, touch target files

Worker (Translator/Validator/Remediator):
- HAS: Single task context, assigned tools only
- CAN: Execute assigned task, write to own hook, terminate
- CANNOT: See other workers, read ledger, know "big picture"
```

---

## 3. DIRECTORY STRUCTURE

```
.forge/
├── roles/                    # Per-role configuration
│   ├── orchestrator/
│   │   ├── CLAUDE.md         # Role-specific instructions
│   │   └── tools.json        # Allowed tools: [ledger, convoy, hook, mail]
│   ├── translator/
│   │   ├── CLAUDE.md
│   │   └── tools.json        # Allowed tools: [figma-api, target-sdk, file-system]
│   ├── validator/
│   │   ├── CLAUDE.md
│   │   └── tools.json        # Allowed tools: [file-system, image-compare, schema-validator]
│   └── remediator/
│       ├── CLAUDE.md
│       └── tools.json        # Allowed tools: [target-sdk, file-system, diff-analyzer]
│
├── hooks/                    # Git-backed task persistence (survives crashes)
│   ├── translator-001.hook   # Current state of translator task
│   ├── validator-002.hook    # Current state of validator task
│   └── ...
│
├── ledger/                   # Beads-style JSONL tracking
│   ├── tasks.jsonl           # All tasks: created, assigned, completed
│   ├── events.jsonl          # All events: dispatch, complete, fail, escalate
│   └── convoys.jsonl         # Convoy definitions and status
│
└── convoys/                  # Work bundles
    ├── convoy-001/
    │   ├── manifest.json     # Components in this convoy
    │   ├── component-a.json  # Figma data for component A
    │   └── component-b.json  # Figma data for component B
    └── ...
```

---

## 4. KEY PATTERNS

### GUPP: Gotta Use the Prompt, Polecat
> "If work on hook, execute immediately"

Workers check their hook file on startup. If incomplete work exists, resume it without asking.

```typescript
// Worker startup pattern
async function workerMain(hookPath: string) {
  const hook = await readHook(hookPath);

  if (hook.status === 'incomplete') {
    // GUPP: Resume immediately, no questions
    await executeTask(hook.task);
  }

  // Complete or failed, write final state and terminate
  await writeHook(hookPath, { status: 'complete', result: ... });
  process.exit(0);  // Episodic: always terminate
}
```

### MVC: Minimum Viable Context
> "Absolute minimum needed for THIS task"

```typescript
// ❌ WRONG: Full context
const workerContext = {
  allProjectFiles: [...],           // Don't need all files
  conversationHistory: [...],       // Don't need history
  otherWorkerStatus: [...],         // Don't know about others
  bigPictureGoal: "Build app"       // Don't know the goal
};

// ✅ CORRECT: Minimum Viable Context
const workerContext = {
  task: {
    id: "translate-component-42",
    type: "translate",
    componentId: "abc123"
  },
  component: { /* Just this component's Figma data */ },
  tools: ["figma-api", "target-sdk", "file-system"]
};
```

### Episodic Execution
> "Workers terminate after single task"

Workers are ephemeral. They:
1. Spawn with single task
2. Execute task
3. Write result to hook
4. Terminate

No worker persists between tasks. This prevents context accumulation and drift.

### External Coordination
> "All via ledger, never agent-to-agent"

```
❌ WRONG: Agent-to-agent
  Translator → "Hey Validator, I'm done" → Validator

✅ CORRECT: Via ledger
  Translator → [writes to ledger] → Mayor reads ledger → [dispatches Validator]
```

---

## 5. CONVOY WORKFLOW

```
1. Orchestrator receives Figma file request
2. Orchestrator creates Convoy with N components
3. For each component in convoy:
   a. Orchestrator creates task in ledger
   b. Orchestrator writes hook for Translator worker
   c. Translator spawns, reads hook, executes, writes result, terminates
   d. Orchestrator reads result from hook
   e. Orchestrator creates Validator task
   f. Validator spawns, validates, writes result, terminates
   g. If validation fails:
      - Orchestrator creates Remediator task
      - Remediator fixes, writes result, terminates
      - Loop back to validation (max 3 attempts)
4. Orchestrator aggregates results
5. Orchestrator reports convoy completion
```

---

## 6. VERIFICATION PLAN

| Capability | Test | Evidence |
|------------|------|----------|
| Mayor dispatches | Integration test: create task, verify hook written | tests/integration/orchestration.test.ts |
| Worker isolation | Unit test: worker cannot access ledger | tests/unit/worker-isolation.test.ts |
| Hook persistence | Integration test: crash recovery | tests/integration/hook-recovery.test.ts |
| Convoy bundling | Unit test: grouping algorithm | tests/unit/convoy.test.ts |
| MVC enforcement | Unit test: context size limits | tests/unit/mvc.test.ts |
| Tool budgets | Unit test: tool access control | tests/unit/tool-budget.test.ts |
| Episodic execution | Integration test: worker terminates | tests/integration/episodic.test.ts |
| External coordination | Integration test: no direct agent comms | tests/integration/coordination.test.ts |

---

## 7. DEPENDENCIES

- Gas Town v0.5.0 (installed)
- Skills:
  - ✅ mayor-worker-pattern
  - ✅ worker-isolation
  - ⏳ forge-convoy (not yet provided)
  - ⏳ hook-protocol (not yet provided)

---

## 8. SUCCESS CRITERIA

Epic 07 is COMPLETE when:
1. All 8 capabilities pass their tests
2. End-to-end convoy processing works (Figma → validated output)
3. Crash recovery proven (kill worker mid-task, restart, completes)
4. 10+ component convoy processes in parallel without coordination collapse

**NOT a success criterion:** Coverage percentage. We verify capabilities work.

---

*Created: 2026-01-26*
*Pattern: Mayor-Worker from Gas Town*
*Philosophy: Capabilities over metrics*
