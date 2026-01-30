# Evidence Binding - Attach Proof to Claims

## When to Use
Use when generating reports or outputting files.

## Evidence Structure
```typescript
interface Evidence {
  sourceHash: string;       // SHA-256 of input
  generatedHash: string;    // SHA-256 of output
  diffImagePath?: string;   // Visual diff (if applicable)
  pixelDiff?: number;       // Pixel difference count
  timestamp: string;        // ISO 8601
}
```

## Usage
```typescript
import crypto from 'crypto';

const sourceHash = crypto
  .createHash('sha256')
  .update(fs.readFileSync(inputPath))
  .digest('hex');

const evidence = {
  sourceHash,
  generatedHash: /* hash of output */,
  timestamp: new Date().toISOString()
};
```
