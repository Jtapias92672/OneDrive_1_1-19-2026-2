# Remediation Protocol - Failure Recovery

## When to Use
Use when validation fails and auto-remediation is attempted.

## Remediation Flow

### 1. Analyze Failure
```typescript
interface FailureAnalysis {
  type: 'layout' | 'styling' | 'content' | 'structure';
  severity: 'minor' | 'major' | 'critical';
  affectedElements: string[];
  suggestedFix: string;
}
```

### 2. Attempt Auto-Fix
```typescript
async function remediate(analysis: FailureAnalysis): Promise<boolean> {
  switch (analysis.type) {
    case 'layout':
      return await fixLayoutIssues(analysis);
    case 'styling':
      return await fixStylingIssues(analysis);
    case 'content':
      return await fixContentIssues(analysis);
    default:
      return false; // Cannot auto-remediate
  }
}
```

### 3. Re-validate
```typescript
const result = await remediate(analysis);
if (result) {
  const newAccuracy = await validate(output);
  if (newAccuracy >= 90) {
    return { status: 'REMEDIATED', accuracy: newAccuracy };
  }
}
return { status: 'FAILED', requiresHuman: true };
```

## Max Attempts by Tier

| Tier | Max Attempts |
|------|--------------|
| WALK | 3 |
| CRAWL | 5 |
| BLOCKED | 0 (no retry) |

## Escalation
After max attempts exhausted:
1. Log failure details
2. Create human review ticket
3. Mark as BLOCKED

## Usage
Apply after validation returns <99% accuracy.
