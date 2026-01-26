# FORGE Success Criteria Framework - Token Guardrails

**Version:** 2.0  
**Last Updated:** 2026-01-19  
**Epic:** All (Cross-Cutting Constraint)  
**Status:** ✅ Established (Mandatory Enforcement)

---

## Overview

The Token Guardrails system enforces strict context window management across all FORGE agent operations. Based on the "Lost in the Middle" research (Liu et al., 2023) and extensive production testing, these guardrails prevent context rot, hallucination, and quality degradation in long-running AI agent sessions.

**Core Principle:** Fresh sessions beat context accumulation. Each atomic task executes in a NEW session with peak LLM attention.

---

## Token Guardrails Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TOKEN GUARDRAILS ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CONTEXT WINDOW ZONES                              │   │
│  │                                                                      │   │
│  │   0K ──────── 15K ──────── 30K ──────── 50K ──────── 100K+          │   │
│  │   │    ✅     │     ⚠️     │     🔴     │     🔴🔴    │    🔴🔴🔴   │   │
│  │   │   PEAK    │   WARNING  │    ROT     │   SEVERE   │  FORBIDDEN  │   │
│  │   │  ZONE     │    ZONE    │   BEGINS   │   DRIFT    │    ZONE     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    TRUE RALPH LOOP PATTERN                           │   │
│  │                                                                      │   │
│  │    ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐ │   │
│  │    │  START   │────▶│  LOAD    │────▶│ EXECUTE  │────▶│  SAVE    │ │   │
│  │    │  NEW     │     │ CONTEXT  │     │  SINGLE  │     │ PROGRESS │ │   │
│  │    │ SESSION  │     │ FROM     │     │   TASK   │     │   EXIT   │ │   │
│  │    │          │     │  FILES   │     │ (8-15K)  │     │ SESSION  │ │   │
│  │    └──────────┘     └──────────┘     └──────────┘     └──────────┘ │   │
│  │         ▲                                                    │      │   │
│  │         └────────────────────────────────────────────────────┘      │   │
│  │                         REPEAT FOR EACH TASK                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Hard Token Limits

### Per-Session Limits (MANDATORY)

| Zone | Token Range | Status | Action Required |
|------|-------------|--------|-----------------|
| **Peak Performance** | 0-15K | ✅ SAFE | Normal operation |
| **Session Ceiling** | 15K | ⚠️ LIMIT | Exit session immediately |
| **Warning Zone** | 15K-30K | ⚠️ DANGER | Should never reach; exit now |
| **Context Rot** | 30K-40K | 🔴 CRITICAL | Accuracy degrading; abort |
| **Severe Drift** | 40K-100K | 🔴🔴 SEVERE | Hallucination likely; reset |
| **Forbidden Zone** | 100K+ | 🔴🔴🔴 FORBIDDEN | Guaranteed quality loss |

### Session Rules

```typescript
interface SessionConstraints {
  // HARD LIMITS - NEVER EXCEED
  maxTokensPerSession: 15_000;      // Absolute ceiling
  targetTokensPerTask: 8_000;       // Optimal target
  peakPerformanceRange: [5_000, 12_000];  // Best quality zone
  
  // WARNING THRESHOLDS
  warningThreshold: 12_000;         // Start wrapping up
  criticalThreshold: 14_000;        // Exit immediately
  
  // NEVER ALLOW
  contextRotThreshold: 30_000;      // Quality degrades here
  hallucinationThreshold: 50_000;   // Severe errors begin
  forbiddenZone: 100_000;           // Guaranteed failure
}
```

---

## Epic-Level Token Budgets

### Token Budget by Epic

| Epic | Name | Tasks | Total Tokens | Per-Task Avg | Days |
|------|------|-------|--------------|--------------|------|
| 1 | Foundation | 11 | 40K | 3.6K | 3 |
| 2 | Answer Contract | 12 | 50K | 4.2K | 4 |
| 3 | FORGE Core | 12 | 60K | 5.0K | 5 |
| 3.75 | Code Execution | 14 | 20K | 1.4K | 5 |
| 4 | Convergence Engine | 14 | 70K | 5.0K | 6 |
| 5 | Figma Parser | 10 | 50K | 5.0K | 5 |
| 6 | React Generator | 12 | 60K | 5.0K | 5 |
| 7 | Test Generation | 10 | 40K | 4.0K | 4 |
| 8 | Evidence Packs | 8 | 35K | 4.4K | 3 |
| 9 | Infrastructure | 12 | 55K | 4.6K | 5 |
| 10a | Platform UI Core | 8 | 25K | 3.1K | 4 |
| 10b | Platform UI Features | 8 | 25K | 3.1K | 4 |
| 11 | Integrations | 10 | 40K | 4.0K | 5 |
| 12 | E2E Testing | 10 | 45K | 4.5K | 5 |
| 13 | Governance Gateway | 18 | 55K | 3.1K | 6 |
| 14.1 | Computational Accuracy | 12 | 45K | 3.8K | 5 |
| **TOTAL** | | **~177** | **~715K** | **~4.0K** | **~80** |

### Critical Rule

**Epic totals are distributed across MANY fresh sessions, NOT accumulated in one session.**

```
✅ CORRECT: Epic 4 = 70K tokens across 14 tasks (5K each, 14 fresh sessions)
❌ WRONG:   Epic 4 = 70K tokens in 2 sessions (35K each)
```

---

## True Ralph Loop Implementation

### The Pattern

```bash
#!/bin/bash
# TRUE Ralph Loop - Each task = FRESH session

while true; do
  # Get next uncompleted task
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

### Why Fresh Sessions

| Approach | Tokens/Task | After 10 Tasks | Accuracy |
|----------|-------------|----------------|----------|
| Same Session | 20K → 80K | 200K+ (rot zone) | Degrades severely |
| Auto-Compact | 20K → 40K | ~80K (lossy) | Variable, unpredictable |
| **True Ralph** | 8-15K | 8-15K (always) | Peak performance maintained |

### Session Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRUE RALPH SESSION PATTERN                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. START NEW Claude session                                    │
│     └─ Context window: 0 tokens (fresh)                        │
│                                                                 │
│  2. RUN: .forge/agent-bootstrap.sh task                        │
│     └─ Loads: progress.md + TASKS.md (~3-5K tokens)            │
│                                                                 │
│  3. COMPLETE ONE atomic task                                    │
│     └─ Generation: ~5-10K tokens                               │
│     └─ Total session: ~8-15K tokens (PEAK ZONE)                │
│                                                                 │
│  4. UPDATE progress.md with results                            │
│     └─ Files created, tests passed, notes                      │
│                                                                 │
│  5. EXIT session immediately                                    │
│     └─ Do NOT continue to next task                            │
│                                                                 │
│  6. REPEAT from step 1 for next task                           │
│     └─ Fresh context, peak accuracy                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Context Degradation Curve

### Quality vs. Token Usage

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONTEXT WINDOW DEGRADATION CURVE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Quality                                                                    │
│    100% ████████████████████▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░                      │
│     90% │              │       │      │        │                            │
│     80% │              │       │      │        │                            │
│     70% │              │       │      │        │                            │
│     60% │              │       │      │▼       │                            │
│     50% │              │       │      │ Halluc │                            │
│     40% │              │       │      │ Risk   │                            │
│     30% │              │       │      │        │▼ Severe                    │
│         │              │       │      │        │  Errors                    │
│         └──────────────┴───────┴──────┴────────┴────────────────────────── │
│         0K     15K     30K    50K    80K      120K      200K    Tokens     │
│                │              │      │         │                            │
│                │              │      │         └─ FORBIDDEN: Never reach    │
│                │              │      └─ SEVERE DRIFT: Hallucinations        │
│                │              └─ CONTEXT ROT: Accuracy degrades             │
│                └─ SESSION CEILING: Exit here                                │
│                                                                             │
│  PHASE 1: PEAK PERFORMANCE (0-15K)                                         │
│  ─────────────────────────────────                                         │
│  • Full attention to all context                                           │
│  • Accurate recall of all instructions                                     │
│  • Consistent, high-quality reasoning                                      │
│  • THIS IS WHERE ALL WORK SHOULD HAPPEN                                    │
│                                                                             │
│  PHASE 2: MODERATE DRIFT (15K-30K)                                         │
│  ─────────────────────────────────                                         │
│  • Prioritizes recent context over early context                           │
│  • May forget constraints mentioned earlier                                │
│  • Still functional but requires reminders                                 │
│  • WARNING: Should have exited by now                                      │
│                                                                             │
│  PHASE 3: CONTEXT ROT (30K-50K)                                            │
│  ─────────────────────────────────                                         │
│  • "Middle" of conversation becomes foggy                                  │
│  • Contradicts earlier decisions                                           │
│  • Fills gaps with plausible-sounding guesses                              │
│  • DANGER: Quality seriously compromised                                   │
│                                                                             │
│  PHASE 4: HALLUCINATION ZONE (50K+)                                        │
│  ─────────────────────────────────                                         │
│  • Confidently wrong about past context                                    │
│  • Invents features that were never discussed                              │
│  • Loses thread of multi-step reasoning                                    │
│  • CRITICAL: Work product unreliable                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Hallucination Detection

### Early Warning Signs (15K-30K tokens)

```typescript
interface EarlyWarningSignals {
  // Symptom 1: Constraint Amnesia
  constraintAmnesia: {
    description: 'Agent forgets constraints from earlier in session';
    example: {
      turn5: 'Remember: use Tailwind CSS only, no custom CSS';
      turn45: 'Agent generates styled-components'; // Forgot constraint
    };
    detection: 'Compare output against initial constraints';
  };
  
  // Symptom 2: Contradictory Decisions
  contradictoryDecisions: {
    description: 'Agent makes decisions that conflict with earlier choices';
    example: {
      turn10: 'We are using PostgreSQL for the database';
      turn50: 'Agent generates MongoDB schemas'; // Contradiction
    };
    detection: 'Track architectural decisions, validate consistency';
  };
  
  // Symptom 3: Invented Context
  inventedContext: {
    description: 'Agent references things that were never discussed';
    example: {
      turn60: 'As we discussed, the user table has a preferences column';
      reality: 'This was never discussed; agent fabricated it';
    };
    detection: 'Verify all references against actual conversation';
  };
}
```

### Severe Hallucination Signs (50K+ tokens)

```typescript
interface SevereHallucinationSignals {
  // Symptom 4: Confidence Despite Wrongness
  confidentlyWrong: {
    description: 'Agent references non-existent files or features';
    example: {
      agent: 'The auth middleware in src/middleware/auth.ts uses JWT...';
      reality: 'No such file was ever created';
    };
    detection: 'Validate all file references against filesystem';
  };
  
  // Symptom 5: Recursive Errors
  recursiveErrors: {
    description: 'Agent introduces bugs while fixing other bugs';
    example: {
      turn80: 'Agent fixes bug A, introduces bug B';
      turn81: 'Agent fixes bug B, reintroduces bug A';
      turn82: 'Cycle repeats - lost ability to track state';
    };
    detection: 'Track bug fix history, detect cycles';
  };
  
  // Symptom 6: Plausible-but-Wrong Code
  plausibleButWrong: {
    description: 'Code looks correct but violates requirements';
    characteristics: {
      compiles: true;
      looksProfessional: true;
      meetsContract: false;  // Violates Answer Contract
      breaksRequirements: true;  // Contradicts earlier work
    };
    detection: 'Automated contract validation after every task';
  };
}
```

---

## Enforcement Mechanisms

### Token Tracking

```typescript
class TokenTracker {
  private currentSessionTokens: number = 0;
  private readonly limits: SessionConstraints;
  
  constructor() {
    this.limits = {
      maxTokensPerSession: 15_000,
      warningThreshold: 12_000,
      criticalThreshold: 14_000
    };
  }
  
  addTokens(count: number): TokenCheckResult {
    this.currentSessionTokens += count;
    
    if (this.currentSessionTokens >= this.limits.criticalThreshold) {
      return {
        status: 'CRITICAL',
        action: 'EXIT_IMMEDIATELY',
        message: `Critical threshold reached: ${this.currentSessionTokens} tokens`
      };
    }
    
    if (this.currentSessionTokens >= this.limits.warningThreshold) {
      return {
        status: 'WARNING',
        action: 'WRAP_UP_TASK',
        message: `Warning threshold reached: ${this.currentSessionTokens} tokens`
      };
    }
    
    return {
      status: 'OK',
      action: 'CONTINUE',
      remaining: this.limits.maxTokensPerSession - this.currentSessionTokens
    };
  }
  
  enforceLimit(): void {
    if (this.currentSessionTokens >= this.limits.maxTokensPerSession) {
      throw new SessionLimitExceededError(
        `Session limit exceeded: ${this.currentSessionTokens}/${this.limits.maxTokensPerSession}`
      );
    }
  }
}
```

### Automated Gates

```typescript
interface TokenGuardrailGates {
  // Gate 1: Pre-Task Check
  preTaskCheck: {
    trigger: 'Before starting any task';
    check: 'Verify session tokens < warning threshold';
    action: 'If exceeded, force new session';
  };
  
  // Gate 2: Mid-Task Monitor
  midTaskMonitor: {
    trigger: 'After each LLM call';
    check: 'Track cumulative tokens';
    action: 'If approaching limit, wrap up current work';
  };
  
  // Gate 3: Post-Task Validation
  postTaskValidation: {
    trigger: 'After task completion';
    check: 'Verify output quality, check for hallucination signals';
    action: 'If quality degraded, flag for review';
  };
  
  // Gate 4: Session Exit Enforcement
  sessionExitEnforcement: {
    trigger: 'Task completion OR limit reached';
    check: 'Ensure progress.md updated';
    action: 'Force session termination';
  };
}
```

---

## Atomic Task Design

### Task Granularity Rules

```markdown
### ❌ WRONG: Large User Stories

US-4.1: Core Convergence Loop
- Complex, multi-file implementation
- 30K+ tokens to complete
- Must stay in same session
- Context rot INEVITABLE

### ✅ CORRECT: Atomic Tasks (5-15 minutes each)

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

### Task Sizing Formula

```typescript
interface TaskSizingGuidelines {
  // Target metrics
  targetDuration: '5-15 minutes';
  targetTokens: '5-12K tokens';
  targetCodeLines: '20-100 lines';
  targetFiles: '1-2 files max';
  
  // Sizing rules
  rules: {
    singleResponsibility: 'One clear objective per task';
    verifiable: 'Clear acceptance criteria';
    independent: 'Can be completed without session history';
    documented: 'Task description contains all needed context';
  };
  
  // If task is too large
  splitCriteria: {
    tokenEstimate: '>12K tokens → split';
    duration: '>15 minutes → split';
    files: '>2 files modified → split';
    complexity: 'Multiple concerns → split';
  };
}
```

---

## Progress Tracking

### progress.md Structure

```markdown
# FORGE Build Progress

## Current State
- Epic: 4 (Convergence Engine)
- Task: 4.1.3 (Add iteration exit conditions)
- Session: 47
- Total Tokens Used: 412,000
- Estimated Cost: $6.18

## Token Budget Status
| Epic | Budget | Used | Remaining | Status |
|------|--------|------|-----------|--------|
| 1 | 40K | 38K | 2K | ✅ Complete |
| 2 | 50K | 48K | 2K | ✅ Complete |
| 3 | 60K | 57K | 3K | ✅ Complete |
| 4 | 70K | 32K | 38K | 🔄 In Progress |

## Epic 4 Progress

### Completed Tasks
- [x] Task 4.1.1: Create ConvergenceEngine class skeleton
  - Files: packages/convergence/src/engine.ts
  - Tests: Compiles, no runtime tests yet
  - Tokens: 8,234
  - Session: 45
  
- [x] Task 4.1.2: Implement runIteration method
  - Files: packages/convergence/src/engine.ts (modified)
  - Tests: 2 unit tests passing
  - Tokens: 11,456
  - Session: 46

### Current Task
- [ ] Task 4.1.3: Add iteration exit conditions
  - Target: packages/convergence/src/engine.ts
  - Acceptance: Max iterations, convergence detection, timeout

### Remaining Tasks
- [ ] Task 4.1.4: Add token tracking to iterations
- [ ] Task 4.1.5: Write unit tests for ConvergenceEngine
- [ ] Task 4.2.1: Create IterativeRefinement strategy

## Patterns Learned (Carry Forward)
- Strategy pattern preferred over switch for extensibility
- Always add TokenTracker to LLM calls
- Use Zod for runtime validation of LLM responses
```

---

## Handoff Protocol

### Epic Transition Context

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
```

### Handoff Principles

1. **Import, Don't Load**: Tell the agent what to `import`, not the actual code
2. **Results, Not Process**: Share what was built, not how it was built
3. **Patterns, Not Code**: Share patterns to follow, not code to copy
4. **<15K Tokens**: Handoff prompt + task definition must fit in fresh context

---

## Monitoring Metrics

### Token Usage Dashboard

```typescript
const tokenMetrics = {
  // Session metrics
  session_tokens: new Histogram({
    name: 'forge_session_tokens',
    help: 'Token usage per session',
    buckets: [5000, 8000, 10000, 12000, 14000, 15000, 20000]
  }),
  
  session_limit_breaches: new Counter({
    name: 'forge_session_limit_breaches_total',
    help: 'Number of sessions exceeding token limits',
    labelNames: ['severity']  // warning, critical, forbidden
  }),
  
  // Task metrics
  task_tokens: new Histogram({
    name: 'forge_task_tokens',
    help: 'Token usage per task',
    labelNames: ['epic', 'task_type'],
    buckets: [2000, 4000, 6000, 8000, 10000, 12000, 15000]
  }),
  
  // Quality metrics
  hallucination_signals: new Counter({
    name: 'forge_hallucination_signals_total',
    help: 'Detected hallucination warning signals',
    labelNames: ['type']  // constraint_amnesia, contradiction, invented_context
  }),
  
  // Epic metrics
  epic_token_budget: new Gauge({
    name: 'forge_epic_token_budget',
    help: 'Token budget remaining per epic',
    labelNames: ['epic']
  })
};
```

### Alert Rules

```yaml
alerts:
  - name: SessionTokenWarning
    condition: forge_session_tokens > 12000
    severity: WARNING
    action: Log warning, prepare to exit
    
  - name: SessionTokenCritical
    condition: forge_session_tokens > 14000
    severity: CRITICAL
    action: Force session exit
    
  - name: SessionTokenBreach
    condition: forge_session_tokens > 15000
    severity: PAGE
    action: Abort task, flag for review
    
  - name: HallucinationDetected
    condition: forge_hallucination_signals_total > 0
    severity: WARNING
    action: Flag output for human review
    
  - name: EpicBudgetExhausted
    condition: forge_epic_token_budget < 1000
    severity: WARNING
    action: Review remaining tasks, consider budget extension
```

---

## Configuration

```yaml
# token-guardrails-config.yaml
tokenGuardrails:
  # Session limits
  session:
    maxTokens: 15000
    warningThreshold: 12000
    criticalThreshold: 14000
    targetPerTask: 8000
    peakPerformanceRange: [5000, 12000]
  
  # Context rot thresholds
  contextRot:
    moderateDrift: 30000
    severeRot: 50000
    forbiddenZone: 100000
  
  # Enforcement
  enforcement:
    trackTokensPerCall: true
    enforceSessionLimits: true
    forceExitOnCritical: true
    validateOutputQuality: true
  
  # Hallucination detection
  hallucinationDetection:
    enabled: true
    checkConstraintConsistency: true
    validateFileReferences: true
    detectRecursiveErrors: true
  
  # Progress tracking
  progressTracking:
    updateAfterEachTask: true
    trackTokensPerTask: true
    trackSessionCount: true
```

---

## Package Structure

```
token-guardrails/
├── src/
│   ├── tracker/
│   │   ├── token-tracker.ts        # Core token tracking
│   │   ├── session-monitor.ts      # Session-level monitoring
│   │   └── index.ts
│   │
│   ├── enforcement/
│   │   ├── gates.ts                # Enforcement gates
│   │   ├── limits.ts               # Limit definitions
│   │   ├── session-exit.ts         # Forced exit logic
│   │   └── index.ts
│   │
│   ├── detection/
│   │   ├── hallucination.ts        # Hallucination detection
│   │   ├── quality-check.ts        # Quality validation
│   │   ├── consistency.ts          # Consistency checking
│   │   └── index.ts
│   │
│   ├── progress/
│   │   ├── progress-tracker.ts     # Progress.md management
│   │   ├── handoff.ts              # Epic transition handling
│   │   └── index.ts
│   │
│   └── index.ts
│
├── config/
│   └── token-guardrails-config.yaml
│
├── package.json
└── tsconfig.json
```

---

## Research Foundation

### "Lost in the Middle" (Liu et al., 2023)

Key findings that inform these guardrails:

1. **U-Shaped Attention**: LLMs attend most to the beginning and end of context, with degraded attention in the middle
2. **Performance Cliff**: Significant accuracy drop beyond certain context lengths
3. **Recency Bias**: Recent context strongly preferred over earlier context
4. **Mitigation**: Fresh contexts with focused information outperform long accumulated contexts

### Production Observations

From FORGE development and testing:

| Observation | Token Threshold | Mitigation |
|-------------|-----------------|------------|
| Constraint amnesia begins | ~30K tokens | Fresh sessions |
| Contradictory decisions | ~40K tokens | Progress file tracking |
| Invented context | ~50K tokens | Reference validation |
| Confident hallucinations | ~80K tokens | File system checks |
| Complete quality breakdown | ~100K+ tokens | Never allow |

---

## Related Documents

- [00_MASTER_ROADMAP.md](./00_MASTER_ROADMAP.md) - Platform overview
- [05_CONVERGENCE_ENGINE.md](./05_CONVERGENCE_ENGINE.md) - Convergence iteration limits
- [10_ORCHESTRATION.md](./10_ORCHESTRATION.md) - Task execution patterns
- [11_OBSERVABILITY.md](./11_OBSERVABILITY.md) - Monitoring integration
- [TASKS.md](./TASKS.md) - Epic token budgets
