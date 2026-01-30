# Agent Orchestration - Multi-Agent Coordination

## When to Use
Use when coordinating multiple agents.

## Coordination Patterns

### Sequential
```typescript
await translator.run(fileKey);
await validator.run(fileKey);
if (!certified) await remediator.run(fileKey);
```

### Parallel
```typescript
const results = await Promise.all(
  fileKeys.map(key => translator.run(key))
);
```

### Pipeline
```typescript
const pipeline = [
  { agent: 'translator', input: fileKey },
  { agent: 'validator', input: (prev) => prev.outputPath },
  { agent: 'remediator', input: (prev) => prev.report, conditional: true }
];
```

## Usage
Use for parallel file processing and multi-stage workflows.
