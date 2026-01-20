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

## Success Criteria Framework Integration

> **NEW:** Each epic maps to specific Success Criteria components with 120+ acceptance tests.
> See `EPIC-SUCCESS-CRITERIA-ALIGNMENT.md` for the full mapping.

### Why Success Criteria Matters

1. **Contract-first development** - Know acceptance criteria BEFORE coding
2. **Deterministic verification** - Automated tests replace subjective reviews
3. **Compliance alignment** - SOC 2, CMMC, NIST AI RMF built-in
4. **Cross-session consistency** - Same criteria across all sessions

### Success Criteria Quick Reference

| Epic | Primary Component | Critical Tests |
|------|------------------|----------------|
| 2 | 01_ANSWER_CONTRACT | AC-01 (schema), AC-02 (layers) |
| 3 | 04_QUALITATIVE_VALIDATION | QV-01 (CoT), QV-02 (1-5 scale) |
| 3.75 | 09_DATA_PROTECTION ⚠️ | DP-09 (≥99% PII), DP-10 (100% secrets) |
| 4 | 05_CONVERGENCE_ENGINE | CE-01 (iterations), CE-10 (P95 <120s), CE-11 (reflection) |
| 7 | 08_RUBRIC_LIBRARY | RL-01 (unique IDs), RL-02 (anchors) |
| 8 | 06_EVIDENCE_PACK ⚠️ | EP-07 (HMAC), EP-08 (JSON round-trip) |
| 9 | 11_OBSERVABILITY | OB-02 (<5s streaming) |
| 10a/b | 12_HUMAN_REVIEW | HR-01 (triggers), HR-03 (routing) |
| 11 | 10_ORCHESTRATION | OR-01 (parallel), OR-08 (logging) |

**⚠️ = Security/Compliance Critical - ALL criteria MUST pass**

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

forge-success-criteria/         # Success Criteria Framework
├── 00_MASTER_ROADMAP.md        # Navigation hub
├── 01_ANSWER_CONTRACT.md       # Contract schema (AC-01 to AC-10)
├── 02_STRUCTURAL_VALIDATION.md # Layer 1 (SV-01 to SV-10)
├── 03_SEMANTIC_VALIDATION.md   # Layer 2 (SEM-01 to SEM-10)
├── 04_QUALITATIVE_VALIDATION.md# Layer 3 (QV-01 to QV-10)
├── 05_CONVERGENCE_ENGINE.md    # Loop control (CE-01 to CE-11)
├── 06_EVIDENCE_PACK.md         # Audit artifacts (EP-01 to EP-10)
├── 07_RULE_SYSTEM.md           # FORGE.md rules (RS-01 to RS-10)
├── 08_RUBRIC_LIBRARY.md        # Scoring (RL-01 to RL-10)
├── 09_DATA_PROTECTION.md       # PII/secrets (DP-01 to DP-10)
├── 10_ORCHESTRATION.md         # Multi-agent (OR-01 to OR-10)
├── 11_OBSERVABILITY.md         # Metrics (OB-01 to OB-11)
├── 12_HUMAN_REVIEW.md          # Approval gates (HR-01 to HR-10)
├── schemas/
│   ├── answer-contract.schema.json
│   ├── evidence-pack.schema.json
│   └── rubric.schema.json
├── templates/
└── examples/

forge-tasks/                    # Epic alignment mapping
├── EPIC-SUCCESS-CRITERIA-ALIGNMENT.md  # Master mapping
├── TASKS-Epic-3.75-Code-Execution.md   # With DP-* references
├── TASKS-Epic-4-Convergence-Engine.md  # With CE-* references
├── TASKS-Epic-7-Test-Generation.md     # With RL-* references
└── TASKS-Epic-8-Evidence-Packs.md      # With EP-* references
```

---

## The True Ralph Loop Pattern (with Success Criteria)

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
    Note the Success Criteria Reference for this task.
    Complete ONLY: $TASK
    Verify against Success Criteria (if applicable).
    Update progress.md when done.
    EXIT when task complete.
  "
done
```

### Session Workflow (Enhanced)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. START FRESH SESSION                                      │
│    .forge/agent-bootstrap.sh task                           │
│    (Shows next task, Success Criteria, context to load)     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. LOAD MINIMAL CONTEXT (~8-12K tokens)                     │
│    - progress.md (current state)                            │
│    - TASKS.md (task details + Success Criteria reference)   │
│    - Relevant source files ONLY                             │
│    - Success Criteria component (if applicable)             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. COMPLETE TASK                                            │
│    - Write/modify code                                      │
│    - Run verification                                       │
│    - Document in progress.md                                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. VERIFY SUCCESS CRITERIA (NEW STEP)                       │
│    .forge/agent-bootstrap.sh verify-criteria                │
│    - Runs acceptance tests for current epic                 │
│    - Validates against JSON schemas (if applicable)         │
│    - MUST pass before marking task complete                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. UPDATE PROGRESS.MD                                       │
│    - Mark task [x] complete                                 │
│    - Note Success Criteria verified                         │
│    - Add notes, file changes, token count                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. EXIT SESSION                                             │
│    Do NOT continue to next task                             │
│    Start fresh session for next task                        │
└─────────────────────────────────────────────────────────────┘
```

---

## TASKS.md Format (with Success Criteria)

Each epic has a TASKS.md with atomic breakdown and Success Criteria references:

```markdown
# Epic 4: Convergence Engine - Task Breakdown

## Success Criteria Alignment

| Component | Reference | Alignment |
|-----------|-----------|-----------|
| **05_CONVERGENCE_ENGINE** | `forge-success-criteria/05_CONVERGENCE_ENGINE.md` | Primary |
| **02_STRUCTURAL_VALIDATION** | `forge-success-criteria/02_STRUCTURAL_VALIDATION.md` | Layer 1 |
| **06_EVIDENCE_PACK** | `forge-success-criteria/06_EVIDENCE_PACK.md` | Iteration history |

**Acceptance Tests:** CE-01 through CE-11

---

## Task List

### Phase 1: Core Loop (Tasks 4.1.x)

#### Task 4.1.1: Create ConvergenceEngine class skeleton
**Time:** 5 minutes
**Tokens:** ~8K
**Success Criteria Reference:** 05_CONVERGENCE_ENGINE § CE-01, CE-02

**Files:** 
- CREATE: packages/convergence/src/engine.ts
- CREATE: packages/convergence/src/types.ts

**Acceptance Criteria:**
- [ ] ConvergenceEngine class exists with constructor
- [ ] Takes ForgeSession and CompiledContract as params
- [ ] Has empty run() method returning Promise<ConvergenceResult>
- [ ] TypeScript compiles without errors
- [ ] **CE-01:** max_iterations parameter accepted
- [ ] **CE-02:** max_tokens parameter accepted

**Verification:**
```bash
cd packages/convergence && pnpm build
```

**Success Criteria Verification:**
```bash
.forge/agent-bootstrap.sh verify-criteria
# Or manually: pnpm test:acceptance --criteria=CE-01,CE-02
```

---
```

---

## Bootstrap Script Commands

```bash
# See next task (start of each session)
.forge/agent-bootstrap.sh task

# Check overall progress
.forge/agent-bootstrap.sh progress

# Verify Success Criteria for current epic
.forge/agent-bootstrap.sh verify-criteria

# Validate output against schema
.forge/agent-bootstrap.sh validate-schema evidence-pack output.json

# Show Epic ↔ Success Criteria alignment
.forge/agent-bootstrap.sh alignment

# Move to next epic (verifies criteria first!)
.forge/agent-bootstrap.sh next-epic

# Emergency: View full progress
cat .forge/progress.md
```

---

## Epic Completion Checklist (Enhanced)

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

### Success Criteria Verified (NEW)
- [ ] `.forge/agent-bootstrap.sh verify-criteria` passes
- [ ] All XX-01 through XX-10 criteria met
- [ ] Schema validation passes (if applicable)
- [ ] Security/compliance criteria 100% (if critical epic)

### Documentation Complete
- [ ] COMPLETION.md written with:
  - Summary of what was built
  - Key files created/modified
  - Success Criteria verification results
  - Patterns for next epic
  - Any known issues
  
- [ ] Handoff context JSON created

### Progress.md Updated
- [ ] Epic marked complete
- [ ] Success Criteria noted as verified
- [ ] Token usage recorded
- [ ] Patterns learned documented

### Ready for Next Epic
- [ ] Read handoff prompt for next epic
- [ ] Note new epic's Success Criteria
- [ ] Start fresh session
```

---

## Token Budget Summary (True Ralph Model)

| Epic | Total Budget | Tasks | Tokens/Task | Success Criteria |
|------|-------------|-------|-------------|------------------|
| 1 | 40K | 11 | ~4K | — |
| 2 | 50K | 14 | ~4K | AC-01→AC-10 |
| 3 | 60K | 13 | ~5K | QV-01→QV-10 |
| 3.75 | 20K | 10 | ~2K | DP-01→DP-10 ⚠️ |
| 4 | 70K | 14 | ~5K | CE-01→CE-11 |
| 5 | 50K | 10 | ~5K | — |
| 6 | 60K | 12 | ~5K | — |
| 7 | 40K | 10 | ~4K | RL-01→RL-10 |
| 8 | 35K | 8 | ~4K | EP-01→EP-10 ⚠️ |
| 9 | 55K | 12 | ~5K | OB-01→OB-11 |
| 10a | 25K | 8 | ~3K | HR-01→HR-10 |
| 10b | 25K | 8 | ~3K | HR-01→HR-10 |
| 11 | 40K | 10 | ~4K | OR-01→OR-10 |
| 12 | 45K | 10 | ~5K | ALL |

**Total: ~665K tokens across ~137 sessions**
**Average: ~4.9K tokens per session (well within peak performance zone)**
**Success Criteria: 120+ acceptance tests across 12 components**

---

## The Golden Rules (Enhanced)

1. **ONE task per session** - Exit after completing task
2. **FRESH session for each task** - Never continue in same session
3. **progress.md is truth** - All state lives there, not in conversation
4. **Import, don't load** - Use imports, not copy-paste
5. **~8-15K tokens max** - Stay in peak performance zone
6. **Update progress.md BEFORE exiting** - Next session needs this
7. **Verify after each task** - Catch errors early
8. **Patterns over code** - Document learnings, not implementations
9. **SUCCESS CRITERIA FIRST** - Know acceptance tests before coding (NEW)
10. **VERIFY BEFORE NEXT-EPIC** - All criteria must pass (NEW)

---

## Critical Epics: Security & Compliance

### Epic 3.75: Code Execution ⚠️
- **MUST pass:** DP-09 (≥99% PII recall), DP-10 (100% secret recall)
- **Blocks:** Epic 4 cannot start until all DP-* criteria pass
- **Compliance:** CMMC 2.0, SOC 2 Type II

### Epic 8: Evidence Packs ⚠️
- **MUST pass:** EP-01 through EP-10 (all 10 criteria)
- **Schema:** Types MUST match `evidence-pack.schema.json` exactly
- **Compliance:** DCMA/DFARS, SOC 2, NIST AI RMF

---

## Recovery: If Success Criteria Fails

```bash
# 1. Identify which criterion failed
.forge/agent-bootstrap.sh verify-criteria

# 2. Read the criterion definition
cat forge-success-criteria/XX_COMPONENT.md | grep "XX-01" -A 20

# 3. Check your implementation against the criterion
# 4. Fix the issue
# 5. Re-run verification

.forge/agent-bootstrap.sh verify-criteria

# 6. If schema validation fails
.forge/agent-bootstrap.sh validate-schema [schema-name] [output-file]
```

---

*Generated by atomic-task-breakdown + long-running-agent-harness skills*
*Success Criteria Framework: forge-success-criteria/ (12 components, 120+ criteria)*
*Last Updated: 2026-01-17*
