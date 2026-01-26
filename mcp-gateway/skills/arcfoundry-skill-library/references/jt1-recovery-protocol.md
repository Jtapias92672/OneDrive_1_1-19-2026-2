---
name: jt1-recovery-protocol
description: Systematic crisis management and application recovery framework. Use when experiencing complete application failure, build system breakdown, cascading errors, or when rollback doesn't fix issues. Implements 4-phase protocol (STOP, DIAGNOSE, PLAN, ACT) with verification at each stage.
---

# JT1 Recovery Protocol

## When to Use
Use when experiencing complete application failure, build system breakdown, cascading errors, or when rollback doesn't fix issues. Trigger phrase: "Invoke JT1 Protocol"

## Core Principle

> "Stop. Diagnose. Then—and only then—act."

The most common cause of prolonged outages is action without diagnosis.

## Trigger Conditions

- Application complete failure (won't start)
- Build system breakdown
- Standard debugging failed 3+ times
- Rollback doesn't fix the issue
- Time pressure mounting, panic setting in

DO NOT activate for: Single file bugs, feature additions, normal development

## The Four Phases

```
┌─────────┐    ┌──────────┐    ┌────────┐    ┌─────────┐
│  STOP   │ →  │ DIAGNOSE │ →  │  PLAN  │ →  │   ACT   │
│  5 min  │    │  15 min  │    │ 10 min │    │ Execute │
└─────────┘    └──────────┘    └────────┘    └─────────┘
```

## Phase 1: STOP (5 min)

1. Halt all code changes immediately
2. Document current state (screenshots, logs, errors)
3. Identify last known working state
4. Note what changed since then

Output - Situation Report:
```
Timestamp: [now]
Severity: CRITICAL / HIGH / MEDIUM

Current State:
- What is broken: [description]
- Error messages: [exact text]

Last Known Good:
- When it worked: [timestamp]
- What version: [hash]

What Changed:
- Recent commits: [list]
- Config changes: [list]
```

## Phase 2: DIAGNOSE (15 min)

1. Read error messages carefully (don't skim)
2. Check logs at all levels
3. Identify ACTUAL root cause (not symptoms)
4. Distinguish correlation from causation

Output - Root Cause Analysis:
```
Symptom: [observed]
Root Cause: [actual cause]
Evidence: [how we know]

Causation Chain:
1. [root cause]
2. → led to [intermediate]
3. → caused [symptom]
```

## Phase 3: PLAN (10 min)

1. Create minimal fix targeting root cause only
2. Define rollback strategy
3. Identify verification steps
4. Time-box the attempt

Output - Recovery Plan:
```
Objective: [single sentence]

Approach:
1. [Step 1]
2. [Step 2]

Rollback Strategy:
- [rollback step if this fails]

Verification:
- [ ] [check 1]
- [ ] [check 2]

Time Box: [X] minutes max
```

## Phase 4: ACT (Execute)

1. Execute plan step by step
2. Verify after each step
3. Stop immediately if new issues appear
4. Document what worked

## Post-Recovery: PREVENT

1. Update lessons-learned documentation
2. Add test to catch this in future
3. Document in project standards
4. Run self-retrospective

## Anti-Patterns

| Anti-Pattern | JT1 Alternative |
|--------------|-----------------|
| Panic fixes | STOP phase enforces pause |
| Guessing | DIAGNOSE requires evidence |
| No rollback plan | PLAN requires rollback |
| Skipping verification | ACT requires proof |

## Usage
Load when stuck for hours, experiencing cascading failures, or when standard debugging has failed repeatedly.
