# Figma Extraction - Design Data Retrieval

## When to Use
Use when extracting design data from Figma API.

## Core Pattern

### API Client Setup
```typescript
import { FigmaClient } from './figma-client';

const client = new FigmaClient({
  accessToken: process.env.FIGMA_ACCESS_TOKEN
});
```

### File Extraction
```typescript
const file = await client.getFile(fileKey);
const components = extractComponents(file.document);
const styles = extractStyles(file.styles);
```

## Key Data Structures

### Component Node
```typescript
interface ComponentNode {
  id: string;
  name: string;
  type: 'COMPONENT' | 'INSTANCE';
  children: Node[];
  absoluteBoundingBox: BoundingBox;
  fills: Paint[];
  strokes: Paint[];
}
```

### Style Reference
```typescript
interface StyleReference {
  key: string;
  name: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
}
```

## Common Mistakes

### ❌ WRONG: Ignore pagination
```typescript
const file = await client.getFile(fileKey);
// Missing: check for more pages
```

### ✅ CORRECT: Handle all pages
```typescript
const file = await client.getFile(fileKey);
for (const page of file.document.children) {
  await processPage(page);
}
```

## Usage
Load before any Figma API integration work.
