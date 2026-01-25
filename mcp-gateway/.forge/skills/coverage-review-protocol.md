# Coverage Review Protocol

## Purpose
Ensure comprehensive test coverage analysis before claiming work complete. Prevents hidden gaps in defensive code paths and catches dead code.

## Trigger
After `npm test -- --coverage`, before claiming COMPLETE

## Procedure

### Step 1: Check Rollup Metrics
Verify overall coverage meets project thresholds:
```bash
npm test -- --coverage
```

Required thresholds (project-specific):
- Statements: ≥97%
- Branches: ≥85%
- Functions: ≥95%
- Lines: ≥97%

### Step 2: Review Per-File Breakdown
Scan the coverage table for anomalies:

| Check | Threshold | Action |
|-------|-----------|--------|
| Branch coverage | <85% | Investigate uncovered branches |
| Function coverage | 0% | Dead code? Remove or test |
| Statement coverage | <90% | Review uncovered lines |

### Step 3: Classify Uncovered Lines
For each uncovered line, determine category:

#### DEFENSIVE (Acceptable)
- `catch` blocks and error handlers
- `switch` default cases
- Null/undefined guards
- Fallback return values
- Timeout handlers

Example:
```typescript
// Line 194 - DEFENSIVE: error handler
catch (error) {
  this.addError('generation-failed', error.message);
}

// Line 382 - DEFENSIVE: switch default
default: return 'any';
```

#### REAL (Must Address)
- Business logic branches
- Data transformation code
- API response handling
- State management logic
- User-facing functionality

### Step 4: Document in Commit Message
Include coverage review summary:
```
Coverage Review:
- Files <85% branch: [list or "none"]
- Functions at 0%: [list or "none"]
- Accepted gaps: [defensive code lines]
- Action needed: [real functionality lines]
```

## Required Output Format

```
=== Coverage Review ===
Rollup: ✓ 97.75% stmts, 91.57% branch, 98.83% funcs

Files <85% branch:
- generator.ts (81.81%) - error handling paths

Functions at 0%: none

Accepted gaps (DEFENSIVE):
- generator.ts:194 - catch block for component errors
- generator.ts:212 - catch block for frame errors
- generator.ts:237-238 - top-level error handler
- generator.ts:382 - switch default for prop types
- generator.ts:470 - switch default for output format

Action needed (REAL): none

Verdict: COMPLETE - all gaps are defensive code
```

## Integration with Verification Sequence

This protocol runs as part of pre-completion verification:

1. `npm run build` - Must succeed
2. `npm test` - All tests must pass
3. `npm test -- --coverage` - Show report
4. **Coverage Review Protocol** ← This protocol
5. Commit with coverage summary

## Anti-Patterns

- ❌ Claiming complete without reviewing per-file metrics
- ❌ Ignoring files below branch threshold
- ❌ Leaving 0% functions without explanation
- ❌ Classifying real functionality as "defensive"
- ❌ Omitting coverage review from commit message
