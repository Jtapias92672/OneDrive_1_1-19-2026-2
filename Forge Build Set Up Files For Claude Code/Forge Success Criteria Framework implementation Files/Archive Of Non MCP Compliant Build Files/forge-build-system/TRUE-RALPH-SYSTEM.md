# FORGE B-D Platform: True Ralph Loop Build System

## Critical Design Principle: Fresh Sessions Beat Context Rot

Based on the "Lost in the Middle" research (Liu et al., 2023) and practical experience:

- **Context rot begins at ~30-40K tokens** - accuracy degrades significantly
- **Auto-compaction loses technical nuance** - exact signatures, error patterns, architectural decisions get summarized away
- **Fresh sessions maintain peak performance** - each task gets full LLM attention

**This system enforces TRUE Ralph Loop patterns:**
- Each atomic task = NEW Claude Code session
- Context loaded from files, not conversation history  
- Progress tracked in `progress.md`, not memory
- ~8-15K tokens per session (peak performance zone)

---

## Directory Structure

```
.forge/
├── agent-bootstrap.sh          # Main orchestration (enforces fresh sessions)
├── progress.md                 # Cross-session state (THE source of truth)
├── current-epic.txt            # Current epic number
├── current-task.txt            # Current task within epic
├── QUICKSTART.md               # How to use this system
├── README.md                   # Full documentation
│
├── epics/
│   ├── epic-01-foundation/
│   │   ├── EPIC.md             # Epic overview (read once)
│   │   ├── TASKS.md            # Atomic task breakdown (2-5 min each)
│   │   ├── verify.sh           # Verification script
│   │   └── COMPLETION.md       # Written when epic complete
│   ├── epic-02-answer-contract/
│   └── ... (12 total)
│
├── prompts/
│   ├── task-prompt-template.md # Template for task prompts
│   ├── handoff-01-to-02.md     # Epic transition context
│   └── ... (11 handoff files)
│
├── context-packages/           # Compiled context (JSON, minimal)
│   └── epic-01-state.json
│
└── logs/
    ├── sessions/               # Per-session logs
    └── errors/                 # Error logs
```

---

## The True Ralph Loop Pattern

### What Makes It "True Ralph"

```bash
#!/bin/bash
# TRUE Ralph Loop - Each iteration = FRESH session

while true; do
  # Get next task from progress.md
  TASK=$(grep -m1 "^- \[ \]" progress.md | sed 's/- \[ \] //')
  
  if [ -z "$TASK" ]; then
    echo "✅ All tasks complete!"
    break
  fi
  
  # Launch NEW session with minimal context
  # Session reads from files, NOT from previous conversation
  claude -p "
    Read .forge/progress.md for current state.
    Read .forge/epics/epic-XX/TASKS.md for task details.
    Complete ONLY: $TASK
    Update progress.md when done.
    EXIT when task complete.
  "
done
```

### Why This Works

| Approach | Tokens/Task | After 10 Tasks | Accuracy |
|----------|-------------|----------------|----------|
| Same Session | 20K → 80K | 200K+ (rot zone) | Degrades |
| Auto-Compact | 20K → 40K | ~80K (lossy) | Variable |
| **True Ralph** | 8-15K | 8-15K (always) | Peak |

---

## Task Granularity: The Key to Fresh Sessions

### ❌ WRONG: Large User Stories

```markdown
US-4.1: Core Convergence Loop
- Complex, multi-file implementation
- 30K+ tokens to complete
- Must stay in same session
- Context rot inevitable
```

### ✅ CORRECT: Atomic Tasks (2-5 minutes each)

```markdown
Task 4.1.1: Create ConvergenceEngine class skeleton
- Single file: src/engine.ts
- ~50 lines of code
- 8K tokens max
- Fresh session, peak accuracy

Task 4.1.2: Implement runIteration method  
- Add to existing file
- ~30 lines of code
- 10K tokens max
- Fresh session, peak accuracy

Task 4.1.3: Add iteration exit conditions
- Modify existing method
- ~20 lines of code
- 8K tokens max
- Fresh session, peak accuracy
```

---

## Progress.md: The Cross-Session Brain

This file is the **ONLY** source of truth across sessions:

```markdown
# FORGE Build Progress

## Current State
- Epic: 4 (Convergence Engine)
- Task: 4.1.3 (Add iteration exit conditions)
- Session: 47
- Total Tokens Used: 412,000
- Estimated Cost: $6.18

## Epic 4 Progress

### Completed Tasks
- [x] Task 4.1.1: Create ConvergenceEngine class skeleton
  - Files: packages/convergence/src/engine.ts
  - Tests: Compiles, no runtime tests yet
  - Tokens: 8,234
  - Notes: Used class-based approach per EPIC.md
  
- [x] Task 4.1.2: Implement runIteration method
  - Files: packages/convergence/src/engine.ts (modified)
  - Tests: 2 unit tests passing
  - Tokens: 11,456
  - Notes: Added async/await pattern

### Current Task
- [ ] Task 4.1.3: Add iteration exit conditions
  - Target: packages/convergence/src/engine.ts
  - Acceptance: Max iterations, convergence detection, timeout
  
### Remaining Tasks
- [ ] Task 4.1.4: Add token tracking to iterations
- [ ] Task 4.1.5: Write unit tests for ConvergenceEngine
- [ ] Task 4.2.1: Create IterativeRefinement strategy
- [ ] Task 4.2.2: Create ParallelVoting strategy
...

## Blockers / Errors
- None currently

## Patterns Learned (Carry Forward)
- Strategy pattern preferred over switch for extensibility
- Always add TokenTracker to LLM calls
- Use Zod for runtime validation of LLM responses

## Key Files Reference
- packages/convergence/src/engine.ts - Main convergence engine
- packages/convergence/src/types.ts - Type definitions
- packages/answer-contract/src/types.ts - Contract types (import only)
```

---

## Token Budget: Per-Task, Not Per-Epic

### Old Model (Problematic)
```
Epic 4: 70K tokens total
- Session 1: 35K tokens (hitting rot zone)
- Session 2: 35K tokens (hitting rot zone)
```

### New Model (True Ralph)
```
Epic 4: 70K tokens total across ~8 tasks
- Task 4.1.1: 8K tokens (fresh session, peak)
- Task 4.1.2: 10K tokens (fresh session, peak)
- Task 4.1.3: 8K tokens (fresh session, peak)
- Task 4.1.4: 9K tokens (fresh session, peak)
- Task 4.1.5: 12K tokens (fresh session, peak)
- Task 4.2.1: 8K tokens (fresh session, peak)
- Task 4.2.2: 8K tokens (fresh session, peak)
- Task 4.2.3: 7K tokens (fresh session, peak)
Total: 70K tokens, but NEVER >15K in any single session
```

---

## Handoff Prompts: Minimal Context Loading

Each epic transition has a handoff prompt. These are **read at session start**, not carried in conversation.

### Design Principles

1. **Import, Don't Load**: Tell the agent what to `import`, not the actual code
2. **Results, Not Process**: Share what was built, not how it was built  
3. **Patterns, Not Code**: Share patterns to follow, not code to copy
4. **<15K Tokens**: Handoff prompt + task definition must fit in fresh context

### Handoff Prompt Template

```markdown
# Epic {N} Initialization: {Epic Name}

## What Was Built (Epic {N-1})
- ✅ {Deliverable 1}: {One-line description}
- ✅ {Deliverable 2}: {One-line description}
- ✅ {Deliverable 3}: {One-line description}

## Key Imports Available
```typescript
// USE THESE - Don't re-implement
import { Thing1, Thing2 } from '@forge/{package}';
```

## Your Mission (Epic {N})
{One paragraph: What you're building and why}

## DO NOT
- ❌ Load full code from previous epics (import only)
- ❌ Re-implement existing utilities
- ❌ Load entire codebase
- ❌ Stay in session longer than one task

## DO
- ✅ Read TASKS.md for atomic task breakdown
- ✅ Complete ONE task per session
- ✅ Update progress.md after each task
- ✅ Exit session when task complete

## Token Budget
- Per-task: 8-15K tokens
- Epic total: {X}K tokens across ~{Y} tasks

## First Task
Read: .forge/epics/epic-{N}-{name}/TASKS.md
Start: Task {N}.1.1

## Key Files (Reference Only)
- {file1}: {description}
- {file2}: {description}
```

---

## Bootstrap Script: Enforcing Fresh Sessions

```bash
#!/bin/bash
# .forge/agent-bootstrap.sh
# Enforces TRUE Ralph Loop - each task = fresh session

FORGE_DIR="$(dirname "$0")"
PROGRESS_FILE="$FORGE_DIR/progress.md"

cmd_task() {
  # Get current epic
  local epic=$(cat "$FORGE_DIR/current-epic.txt")
  local epic_name=$(get_epic_name $epic)
  
  # Get next uncompleted task from progress.md
  local task=$(grep -m1 "^- \[ \]" "$PROGRESS_FILE" | sed 's/- \[ \] //')
  
  if [ -z "$task" ]; then
    echo "✅ All tasks in Epic $epic complete!"
    echo "Run: .forge/agent-bootstrap.sh next-epic"
    return 0
  fi
  
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "  FORGE Task Ready"
  echo "════════════════════════════════════════════════════════════"
  echo ""
  echo "📋 Current Task: $task"
  echo "📁 Epic: $epic - $epic_name"
  echo ""
  echo "⚠️  IMPORTANT: Start a NEW Claude Code session!"
  echo ""
  echo "In the NEW session, run:"
  echo ""
  echo "  claude -p \"$(cat << EOF
Read .forge/progress.md for current state.
Read .forge/epics/epic-$(printf "%02d" $epic)-$epic_name/TASKS.md for task: $task
Complete ONLY this task.
Update progress.md when done.
EXIT when complete - do not continue to next task.
EOF
)\""
  echo ""
  echo "════════════════════════════════════════════════════════════"
}

cmd_status() {
  echo ""
  echo "FORGE Build Status"
  echo "══════════════════"
  
  # Count completed vs total tasks
  local completed=$(grep -c "^\- \[x\]" "$PROGRESS_FILE" 2>/dev/null || echo 0)
  local remaining=$(grep -c "^\- \[ \]" "$PROGRESS_FILE" 2>/dev/null || echo 0)
  local total=$((completed + remaining))
  
  echo "Tasks: $completed/$total complete"
  echo ""
  
  # Show current task
  local current=$(grep -m1 "^- \[ \]" "$PROGRESS_FILE" | sed 's/- \[ \] //')
  if [ -n "$current" ]; then
    echo "Next Task: $current"
  else
    echo "All tasks complete! Run: .forge/agent-bootstrap.sh next-epic"
  fi
}

cmd_complete_task() {
  # Called by agent at end of task to mark complete
  local task="$1"
  
  if [ -z "$task" ]; then
    echo "Usage: .forge/agent-bootstrap.sh complete-task 'Task X.Y.Z: Description'"
    return 1
  fi
  
  # Mark task complete in progress.md
  sed -i "s/- \[ \] $task/- [x] $task/" "$PROGRESS_FILE"
  
  echo "✅ Task marked complete: $task"
  echo ""
  echo "To continue, start a NEW session and run:"
  echo "  .forge/agent-bootstrap.sh task"
}

# Command router
case "${1:-task}" in
  task|t)      cmd_task ;;
  status|s)    cmd_status ;;
  complete-task) cmd_complete_task "$2" ;;
  next-epic)   cmd_next_epic ;;
  help|--help) cmd_help ;;
  *)           echo "Unknown command: $1" ;;
esac
```

---

## Session Workflow

### For Each Task (2-5 minutes)

```
┌─────────────────────────────────────────────────────────┐
│ 1. START FRESH SESSION                                  │
│    .forge/agent-bootstrap.sh task                       │
│    (Shows next task and context to load)                │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 2. LOAD MINIMAL CONTEXT (~8-12K tokens)                 │
│    - progress.md (current state)                        │
│    - TASKS.md (task details)                            │
│    - Relevant source files ONLY                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 3. COMPLETE TASK                                        │
│    - Write/modify code                                  │
│    - Run verification                                   │
│    - Document in progress.md                            │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 4. UPDATE PROGRESS.MD                                   │
│    - Mark task [x] complete                             │
│    - Add notes, file changes, token count               │
│    - Note any blockers or patterns learned              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 5. EXIT SESSION                                         │
│    Do NOT continue to next task                         │
│    Start fresh session for next task                    │
└─────────────────────────────────────────────────────────┘
```

---

## TASKS.md Format

Each epic has a TASKS.md with atomic breakdown:

```markdown
# Epic 4: Convergence Engine - Task Breakdown

## Overview
Total Tasks: 14
Estimated Tokens: 70K total (~5K per task average)
Estimated Time: 6 days

## Task List

### Phase 1: Core Loop (Tasks 4.1.x)

#### Task 4.1.1: Create ConvergenceEngine class skeleton
**Time:** 5 minutes
**Tokens:** ~8K
**Files:** 
- CREATE: packages/convergence/src/engine.ts
- CREATE: packages/convergence/src/types.ts

**Acceptance Criteria:**
- [ ] ConvergenceEngine class exists with constructor
- [ ] Takes ForgeSession and CompiledContract as params
- [ ] Has empty run() method returning Promise<ConvergenceResult>
- [ ] TypeScript compiles without errors

**Code Pattern:**
```typescript
export class ConvergenceEngine {
  constructor(
    private session: ForgeSession,
    private contract: CompiledContract
  ) {}
  
  async run(): Promise<ConvergenceResult> {
    // TODO: Implement in Task 4.1.2
    throw new Error('Not implemented');
  }
}
```

**Verification:**
```bash
cd packages/convergence && pnpm build
```

---

#### Task 4.1.2: Implement runIteration method
**Time:** 5 minutes  
**Tokens:** ~10K
**Files:**
- MODIFY: packages/convergence/src/engine.ts

**Acceptance Criteria:**
- [ ] runIteration() method exists
- [ ] Takes iteration number and previous output
- [ ] Calls LLM provider with prompt
- [ ] Returns IterationRecord
- [ ] Compiles without errors

**Dependencies:**
- Import LLM provider: `import { LLMProvider } from '@forge/forge-c'`

**Verification:**
```bash
cd packages/convergence && pnpm build && pnpm test
```

---

#### Task 4.1.3: Add iteration exit conditions
**Time:** 3 minutes
**Tokens:** ~8K  
**Files:**
- MODIFY: packages/convergence/src/engine.ts

**Acceptance Criteria:**
- [ ] Check for max iterations (configurable, default 5)
- [ ] Check for successful validation
- [ ] Check for timeout
- [ ] Check for cost budget exceeded
- [ ] All exit conditions logged

**Verification:**
```bash
pnpm test -- --grep "exit conditions"
```

---

### Phase 2: Strategies (Tasks 4.2.x)

#### Task 4.2.1: Create Strategy interface and IterativeRefinement
...
```

---

## Epic Completion Checklist

Before moving to next epic:

```markdown
## Epic {N} Completion Checklist

### All Tasks Done
- [ ] All tasks in TASKS.md marked [x]
- [ ] No remaining [ ] items in progress.md for this epic

### Verification Passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes (>80% coverage)
- [ ] `pnpm lint` passes
- [ ] Epic verify.sh script passes

### Documentation Complete
- [ ] COMPLETION.md written with:
  - Summary of what was built
  - Key files created/modified
  - Patterns for next epic
  - Any known issues
  
- [ ] Handoff context JSON created

### Progress.md Updated
- [ ] Epic marked complete
- [ ] Token usage recorded
- [ ] Patterns learned documented

### Ready for Next Epic
- [ ] Read handoff prompt for next epic
- [ ] Start fresh session
```

---

## Token Budget Summary (True Ralph Model)

| Epic | Total Budget | Tasks | Tokens/Task | Sessions |
|------|-------------|-------|-------------|----------|
| 1 | 40K | 8 | ~5K | 8 |
| 2 | 50K | 10 | ~5K | 10 |
| 3 | 60K | 10 | ~6K | 10 |
| 4 | 70K | 14 | ~5K | 14 |
| 5 | 50K | 10 | ~5K | 10 |
| 6 | 60K | 12 | ~5K | 12 |
| 7 | 50K | 10 | ~5K | 10 |
| 8 | 40K | 8 | ~5K | 8 |
| 9 | 60K | 10 | ~6K | 10 |
| 10 | 50K | 12 | ~4K | 12 |
| 11 | 40K | 10 | ~4K | 10 |
| 12 | 50K | 10 | ~5K | 10 |

**Total: ~620K tokens across ~114 sessions**
**Average: ~5.4K tokens per session (well within peak performance zone)**

---

## Quick Reference Commands

```bash
# See next task (start of each session)
.forge/agent-bootstrap.sh task

# Check overall progress
.forge/agent-bootstrap.sh status

# Mark current task complete (end of session)
.forge/agent-bootstrap.sh complete-task "Task X.Y.Z: Description"

# Move to next epic (after all tasks complete)
.forge/agent-bootstrap.sh next-epic

# Emergency: View full progress
cat .forge/progress.md

# Emergency: Reset epic progress (DESTRUCTIVE)
.forge/agent-bootstrap.sh reset-epic
```

---

## The Golden Rules

1. **ONE task per session** - Exit after completing task
2. **FRESH session for each task** - Never continue in same session
3. **progress.md is truth** - All state lives there, not in conversation
4. **Import, don't load** - Use imports, not copy-paste
5. **~8-15K tokens max** - Stay in peak performance zone
6. **Update progress.md BEFORE exiting** - Next session needs this
7. **Verify after each task** - Catch errors early
8. **Patterns over code** - Document learnings, not implementations
