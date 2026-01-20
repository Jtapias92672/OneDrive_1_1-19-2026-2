# Epic 4: Convergence Engine - Atomic Task Breakdown

**Token Budget:** 55K (LIMIT: 55K) ⚠️ AT LIMIT  
**Tasks:** 12  
**Estimated Time:** 6 days  
**Dependencies:** Epic 3.75 (Code Execution)

---

## Success Criteria Alignment

| Component | Reference | Alignment |
|-----------|-----------|-----------|
| **05_CONVERGENCE_ENGINE** | `forge-success-criteria/05_CONVERGENCE_ENGINE.md` | **PRIMARY** - All orchestration |
| **02_STRUCTURAL_VALIDATION** | `forge-success-criteria/02_STRUCTURAL_VALIDATION.md` | Layer 1 integration |
| **03_SEMANTIC_VALIDATION** | `forge-success-criteria/03_SEMANTIC_VALIDATION.md` | Layer 2 integration |
| **04_QUALITATIVE_VALIDATION** | `forge-success-criteria/04_QUALITATIVE_VALIDATION.md` | Layer 3 integration |
| **06_EVIDENCE_PACK** | `forge-success-criteria/06_EVIDENCE_PACK.md` | Iteration history output |

**Acceptance Tests:** Inherit from 05_CONVERGENCE_ENGINE criteria CE-01 through CE-10

---

## Overview

Epic 4 implements the core convergence loop that orchestrates generate → validate → repair cycles until output meets success criteria or budget is exhausted.

---

## Phase 4.1: Package Setup

### Task 4.1.1: Create convergence package structure

**Time:** 5 minutes | **Tokens:** ~3K

**Success Criteria Reference:** 05_CONVERGENCE_ENGINE § Dependencies & Interfaces

**Files to CREATE:**
- `packages/convergence/src/engine/index.ts`
- `packages/convergence/src/validators/index.ts`
- `packages/convergence/src/budget/index.ts`
- `packages/convergence/src/repair/index.ts`

**Done When:** Package structure matches 05_CONVERGENCE_ENGINE recommended modules

---

### Task 4.1.2: Define convergence types

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 05_CONVERGENCE_ENGINE § Output Schema

**Files to CREATE:**
- `packages/convergence/src/types.ts`

**Key Types (MUST match 05_CONVERGENCE_ENGINE):**
```typescript
// FROM 05_CONVERGENCE_ENGINE § Output Schema
interface ConvergenceResult {
  status: 'SUCCESS' | 'STAGNATION' | 'BUDGET_EXHAUSTED' | 'TIMEOUT';
  final_output: object;
  final_score: number;
  passed: boolean;
  iterations_used: number;
  tokens_used: number;
  total_time_ms: number;
  iteration_history: IterationRecord[];
}
```

**Done When:** Types align with 05_CONVERGENCE_ENGINE schema

---

## Phase 4.2: Budget Management

### Task 4.2.1: Implement iteration budget tracker

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 05_CONVERGENCE_ENGINE § CE-01

**Files to CREATE:**
- `packages/convergence/src/budget/iteration-tracker.ts`

**Requirement:** MUST enforce max_iterations limit from contract

**Done When:** CE-01 acceptance test passes

---

### Task 4.2.2: Implement token budget tracker

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 05_CONVERGENCE_ENGINE § CE-02

**Files to CREATE:**
- `packages/convergence/src/budget/token-tracker.ts`

**Requirement:** MUST enforce max_tokens budget from contract

**Done When:** CE-02 acceptance test passes

---

### Task 4.2.3: Implement stopping condition detector

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 05_CONVERGENCE_ENGINE § CE-03, CE-04

**Files to CREATE:**
- `packages/convergence/src/budget/stopping-conditions.ts`

**Requirements:**
- CE-03: Stop when target_score achieved
- CE-04: Detect stagnation (no_progress_threshold)

**Done When:** CE-03, CE-04 acceptance tests pass

---

## Phase 4.3: Validation Orchestration

### Task 4.3.1: Implement validator orchestrator

**Time:** 5 minutes | **Tokens:** ~5K

**Success Criteria Reference:** 05_CONVERGENCE_ENGINE § CE-05, CE-06

**Files to CREATE:**
- `packages/convergence/src/validators/orchestrator.ts`

**Requirements:**
- CE-05: Run layers in order (1→2→3)
- CE-06: Skip Layer 2-3 if Layer 1 fails

**Done When:** CE-05, CE-06 acceptance tests pass

---

### Task 4.3.2: Integrate structural validator (Layer 1)

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 02_STRUCTURAL_VALIDATION § SV-01 through SV-10

**Files to CREATE:**
- `packages/convergence/src/validators/structural.ts`

**Integrates:** @forge/validators structural module

**Done When:** Layer 1 integration tests pass

---

### Task 4.3.3: Integrate semantic validator (Layer 2)

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 03_SEMANTIC_VALIDATION § SEM-01 through SEM-10

**Files to CREATE:**
- `packages/convergence/src/validators/semantic.ts`

**Integrates:** @forge/validators semantic module

**Done When:** Layer 2 integration tests pass

---

### Task 4.3.4: Integrate qualitative validator (Layer 3)

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 04_QUALITATIVE_VALIDATION § QV-01 through QV-10

**Files to CREATE:**
- `packages/convergence/src/validators/qualitative.ts`

**Integrates:** @forge/forge-c LLM-Judge module

**Done When:** Layer 3 integration tests pass

---

## Phase 4.4: Core Engine

### Task 4.4.1: Implement repair prompt generator

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 05_CONVERGENCE_ENGINE § CE-07

**Files to CREATE:**
- `packages/convergence/src/repair/prompt-generator.ts`

**Requirement:** Generate repair prompts from validation failures with specific errors

**Done When:** CE-07 acceptance test passes

---

### Task 4.4.2: Implement iteration history tracker

**Time:** 5 minutes | **Tokens:** ~4K

**Success Criteria Reference:** 05_CONVERGENCE_ENGINE § CE-08, 06_EVIDENCE_PACK § EP-01

**Files to CREATE:**
- `packages/convergence/src/engine/history-tracker.ts`

**Requirements:**
- CE-08: Track iteration history with scores
- EP-01: Compatible with Evidence Pack iterations array

**Done When:** CE-08 acceptance test passes, Evidence Pack compatible

---

### Task 4.4.3: Implement weighted score calculator

**Time:** 5 minutes | **Tokens:** ~3K

**Success Criteria Reference:** 05_CONVERGENCE_ENGINE § CE-09

**Files to CREATE:**
- `packages/convergence/src/engine/score-calculator.ts`

**Requirement:** overall = structural×w1 + semantic×w2 + qualitative×w3

**Done When:** CE-09 acceptance test passes

---

### Task 4.4.4: Implement main convergence engine

**Time:** 5 minutes | **Tokens:** ~5K

**Success Criteria Reference:** 05_CONVERGENCE_ENGINE § CE-10, Full integration

**Files to CREATE:**
- `packages/convergence/src/engine/convergence-engine.ts`
- `packages/convergence/src/index.ts`

**Requirements:**
- CE-10: Complete typical convergence in <2 minutes
- Integrate all components from 4.2-4.4

**Verification:**
```bash
cd packages/convergence && pnpm build
# Run acceptance tests
pnpm test:acceptance --criteria=CE-01,CE-02,CE-03,CE-04,CE-05,CE-06,CE-07,CE-08,CE-09,CE-10
```

**Done When:** All CE-* acceptance tests pass, P95 latency <120s

---

## Epic 4 Completion Checklist

Before moving to Epic 5:

- [ ] All 12 tasks complete
- [ ] CE-01: max_iterations enforced ✓
- [ ] CE-02: max_tokens budget enforced ✓
- [ ] CE-03: target_score triggers success ✓
- [ ] CE-04: Stagnation detected ✓
- [ ] CE-05: Layer execution order correct ✓
- [ ] CE-06: Early termination on Layer 1 failure ✓
- [ ] CE-07: Repair prompts contain specific errors ✓
- [ ] CE-08: Iteration history tracked ✓
- [ ] CE-09: Weighted score calculation correct ✓
- [ ] CE-10: P95 latency <120s ✓
- [ ] Evidence Pack iteration format compatible (06_EVIDENCE_PACK § EP-01)

**Metrics to Capture:**
```
convergence.iterations_used      → Target: Avg ≤ 3.0
convergence.tokens_used          → Target: Avg ≤ 60% budget
convergence.success_rate         → Target: ≥ 95%
convergence.first_pass_rate      → Target: ≥ 40%
convergence.total_time_ms        → Target: P95 < 120s
```

**Commit:** `git commit -m "Epic 4: Convergence Engine - aligned with 05_CONVERGENCE_ENGINE"`

**Next:** Epic 5 - Figma Parser
