# GenBI Trust Tiers - Accuracy-Based Certification

## When to Use
Use when assigning certification to validation results.

## Trust Tier Definitions

| Tier | Accuracy | Certification | Auto-Remediate | Max Attempts |
|------|----------|---------------|----------------|--------------|
| RUN | 99-100% | CERTIFIED | No | 0 |
| WALK | 90-99% | PROVISIONAL | Yes | 3 |
| CRAWL | 80-90% | SUPERVISED | Yes | 5 |
| BLOCKED | <80% | REJECTED | No | 0 |

## Usage
```typescript
function assignTier(accuracy: number) {
  if (accuracy >= 99) return 'RUN';
  if (accuracy >= 90) return 'WALK';
  if (accuracy >= 80) return 'CRAWL';
  return 'BLOCKED';
}
```
