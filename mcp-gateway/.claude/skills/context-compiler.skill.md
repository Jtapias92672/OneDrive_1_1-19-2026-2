# Context Compiler - Clean Slate for Analysis

## When to Use
Use when needing fresh perspective on failure analysis.

## Pattern
```typescript
// ❌ WRONG: Analyze with full conversation history
// (includes bias from previous failed attempts)

// ✅ CORRECT: Create clean context package
const contextPackage = {
  validationReport: {...},
  diffAnalysis: {...},
  originalInput: {...},
  lessonsLearned: {...}
};

// Feed ONLY this to fresh analysis session
```

## Usage
Create context packages before analysis.
Prevents bias from failed attempts.
