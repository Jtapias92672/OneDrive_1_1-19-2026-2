# Visual Validation - Pixel-Level Comparison

## When to Use
Use when validating generated output against design specifications.

## Core Pattern

### Screenshot Comparison
```typescript
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

async function compareImages(expected: Buffer, actual: Buffer): Promise<number> {
  const img1 = PNG.sync.read(expected);
  const img2 = PNG.sync.read(actual);

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    img1.data, img2.data, diff.data,
    width, height,
    { threshold: 0.1 }
  );

  return numDiffPixels;
}
```

### Accuracy Calculation
```typescript
function calculateAccuracy(diffPixels: number, totalPixels: number): number {
  return ((totalPixels - diffPixels) / totalPixels) * 100;
}
```

## Trust Tier Assignment

| Accuracy | Tier | Action |
|----------|------|--------|
| 99-100% | RUN | Certified |
| 90-99% | WALK | Provisional |
| 80-90% | CRAWL | Supervised |
| <80% | BLOCKED | Rejected |

## Diff Output
```typescript
// Save diff image for review
fs.writeFileSync('diff.png', PNG.sync.write(diff));
```

## Usage
Run visual validation after every generation cycle.
