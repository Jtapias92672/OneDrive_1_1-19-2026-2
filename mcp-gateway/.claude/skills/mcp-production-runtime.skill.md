# MCP Production Runtime - Code-First Approach

## When to Use
Use when agents need to generate executable code instead of JSON tool calls.

## Core Principle
**Generate code that runs, not descriptions of what to do.**

## Pattern: Code-First vs Tool-First

### ❌ WRONG: Tool-First (JSON)
```json
{
  "tool": "create_file",
  "params": {
    "path": "output.json",
    "content": "..."
  }
}
```

### ✅ CORRECT: Code-First (Executable Script)
```typescript
#!/usr/bin/env node
import fs from 'fs';

const output = { /* data */ };
fs.writeFileSync('output.json', JSON.stringify(output, null, 2));
console.log('File created successfully');
```

## Usage
Agents should return complete, runnable scripts.
