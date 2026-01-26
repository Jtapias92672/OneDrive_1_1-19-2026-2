---
name: actionable-errors
description: >
  Structured error messages that enable AI self-correction. Every error must include
  file, line, what's wrong, and how to fix it. Based on Capital One's principle that
  error messages should be instructions, not complaints.
version: 1.0.0
author: ArcFoundry
triggers:
  - "error message"
  - "actionable error"
  - "error format"
  - "self-correcting"
---

# Actionable Errors Skill

## Core Principle

> "Error messages are instructions, not complaints."

An error that says "Something went wrong" is useless. An error that says "File X, line Y: 
missing import Z, add `import Z from 'module'`" enables immediate correction.

---

## The Problem with Vague Errors

```
❌ VAGUE ERROR (Useless):
"Build failed"

❌ SLIGHTLY BETTER (Still bad):
"TypeScript compilation error"

✅ ACTIONABLE ERROR (Useful):
{
  "file": "src/connector.ts",
  "line": 42,
  "column": 15,
  "error": "Property 'execute' does not exist on type 'Client'",
  "context": "client.execute(query)",
  "suggestion": "Did you mean 'client.query()'? The method was renamed in v2.0",
  "fix": "Replace 'execute' with 'query'",
  "docs": "https://docs.example.com/migration-guide#execute-renamed"
}
```

---

## Actionable Error Schema

```typescript
interface ActionableError {
  // Location
  file: string;           // Full path to file
  line: number;           // Line number (1-indexed)
  column?: number;        // Column number if available
  
  // What's wrong
  error: string;          // Clear description of the problem
  code?: string;          // Error code for lookup
  context?: string;       // The problematic code snippet
  
  // How to fix
  suggestion: string;     // What the user should do
  fix?: string;           // Exact fix if known
  docs?: string;          // Link to documentation
  
  // Severity
  severity: 'error' | 'warning' | 'info';
  blocking: boolean;      // Does this prevent continuation?
  
  // For AI self-correction
  autoFixable: boolean;   // Can AI fix this automatically?
  autoFixAction?: string; // Action to take if autoFixable
}
```

---

## Error Categories

### Syntax Errors
```json
{
  "file": "src/index.ts",
  "line": 15,
  "error": "Unexpected token '}'",
  "context": "if (condition) { doThing() }",
  "suggestion": "Missing semicolon after 'doThing()'",
  "fix": "Add ';' after 'doThing()'",
  "autoFixable": true,
  "autoFixAction": "insert_semicolon"
}
```

### Type Errors
```json
{
  "file": "src/handler.ts",
  "line": 28,
  "error": "Type 'string' is not assignable to type 'number'",
  "context": "const count: number = getData()",
  "suggestion": "getData() returns string, but count expects number",
  "fix": "Either change count type to string, or parse: parseInt(getData())",
  "autoFixable": false
}
```

### Runtime Errors
```json
{
  "file": "src/api.ts",
  "line": 55,
  "error": "Cannot read property 'id' of undefined",
  "context": "const id = response.data.id",
  "suggestion": "response.data is undefined - API call may have failed",
  "fix": "Add null check: const id = response.data?.id",
  "autoFixable": true,
  "autoFixAction": "add_optional_chaining"
}
```

---

## Implementation Pattern

```typescript
function createActionableError(
  raw: Error,
  context: ExecutionContext
): ActionableError {
  // Parse the raw error
  const parsed = parseError(raw);
  
  // Enrich with file/line info
  const location = extractLocation(parsed, context);
  
  // Generate suggestion
  const suggestion = generateSuggestion(parsed);
  
  // Check if auto-fixable
  const autoFix = checkAutoFixable(parsed);
  
  return {
    file: location.file,
    line: location.line,
    column: location.column,
    error: parsed.message,
    code: parsed.code,
    context: getCodeContext(location, 2), // 2 lines of context
    suggestion: suggestion.text,
    fix: suggestion.fix,
    docs: suggestion.docs,
    severity: parsed.severity,
    blocking: parsed.blocking,
    autoFixable: autoFix.possible,
    autoFixAction: autoFix.action
  };
}
```

---

## AI Self-Correction Flow

When AI encounters an actionable error:

```
1. Parse the error structure
2. If autoFixable:
   - Apply the autoFixAction
   - Re-run verification
   - If still failing, escalate to human
3. If not autoFixable:
   - Present error with full context
   - Suggest manual intervention
   - Provide docs link
```

---

## Integration Points

```yaml
integrates_with:
  - verification-protocol: "Errors from verification must be actionable"
  - slop-tests: "Slop detection produces actionable errors"
  - jt1-recovery-protocol: "Recovery uses actionable error info"
```

---

*This skill ensures every error message enables correction, not just complaint.*
