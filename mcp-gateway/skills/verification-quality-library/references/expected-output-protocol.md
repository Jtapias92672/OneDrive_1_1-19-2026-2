---
name: expected-output-protocol
description: Requires declaring expected outputs BEFORE implementation, then comparing actual results to expectations. Creates immediate feedback loops that catch misalignment between intent and outcome. Based on Nate B Jones Framework.
---

# Expected Output Protocol

## When to Use
Use BEFORE starting ANY implementation task. Declare expected outputs first, then compare actual results after completion.

## Core Principle

> "Require the agent to provide Expected Output structures in its internal planning phase. Then, self-retrospective is simply comparing expected to actual."

## Pre-Execution Template

Before starting ANY task:

```
## Task: [Brief description]

### Expected Deliverables
| Item | Type | Location | Format |
|------|------|----------|--------|
| [deliverable] | [file/response] | [path] | [format] |

### Success Criteria
- [ ] [Criterion 1: Specific, measurable]
- [ ] [Criterion 2: Specific, measurable]

### Failure Indicators
- ⚠️ [Partial failure indicator]
- ❌ [Complete failure indicator]

### Verification Method
- [Command or check to verify]

### Assumptions
- [Assumption 1]
```

## Post-Execution Comparison

After completing:

```
### Deliverables Status
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| [item] | [expected] | [actual] | ✅/❌ |

### Success Criteria Verification
- [x] Criterion 1: PASSED - [evidence]
- [ ] Criterion 2: FAILED - [reason]

### Mismatches
| Expected | Actual | Root Cause |
|----------|--------|------------|
| [expected] | [actual] | [why] |
```

## Quick Mode

If human asks "just do it quickly":

```
Quick version:
- Expected: [1-sentence deliverable]
- Success: [1-2 key criteria]
- Verify: [single command]
Proceed? [Y/N]
```

## Anti-Patterns Prevented

| Anti-Pattern | How EOP Prevents |
|--------------|------------------|
| Goal Drift | Locked expectations upfront |
| Success Theater | Explicit criteria comparison |
| Assumption Blindness | Assumptions explicitly stated |
| Vague Done-ness | Must verify each criterion |

## The Virtuous Loop

Expected → Implement → Compare → Learn → Improve Expectations

## Usage
Load when starting any implementation task, before writing code, before creating documents, before any work producing deliverables.
