---
name: context-compiler
description: Use a dedicated Context Compiler session to curate context packages for Worker agents, preventing bias from failed attempts. Use when tasks are complex and require fresh perspective, when previous attempts have failed repeatedly, or when implementing the "Clean Slate" approach for maximum agent effectiveness. Separates context curation from implementation.
---

# Context Compiler Skill
## Curate Context Packages for Fresh Sessions

**Source**: Anthropic Research on "Layered Decoupling"
**Rule**: Don't let the Worker Agent decide what context to read.

---

## The Problem

### Single-Agent Context Selection
```
Session 1: Agent tries approach A → Fails
Session 2: Same agent, remembers A failed → Tries B → Fails  
Session 3: Same agent, biased by A and B → Tries C (similar to A) → Fails
Session 4: Agent is now confused, context polluted with failures
```

### Compiled Context Approach
```
Compiler Session: Analyzes codebase → Creates context package
Worker Session: Fresh agent receives ONLY the curated context → Implements
Result: No bias from previous failures, focused context
```

---

## The Two-Session Pattern

### Session 1: Context Compiler (Read-Only)

**Role**: Curator, not implementer
**Access**: Full codebase read access
**Output**: Context package file

**Prompt**:
```markdown
You are a Context Compiler. Your job is to prepare a context package 
for a Worker agent who will implement a feature.

You will NOT implement anything.
You will ONLY curate relevant context.

## Task Description
[Feature to be implemented]

## Your Output
Create a file: .claude/context_packages/[FEATURE_ID].md

The file must contain:
1. Relevant file paths (not full contents)
2. Key code snippets (< 50 lines each)
3. Critical constraints discovered
4. Recommended approach (based on codebase patterns)
5. Files the Worker should NOT modify

Do not include:
- Your reasoning process
- Failed approaches (you haven't tried any)
- Opinions about difficulty
```

### Session 2: Worker Agent (Scoped Write)

**Role**: Implementer only
**Access**: Files specified in context package
**Input**: Context package from Compiler

**Prompt**:
```markdown
You are a Worker Agent. A Context Compiler has prepared your working context.

Read: .claude/context_packages/[FEATURE_ID].md

This contains everything you need to know.
Do NOT explore beyond what's in the package.
Do NOT second-guess the Compiler's analysis.

Implement the feature using ONLY the context provided.
```

---

## Context Package Format

Create `.claude/context_packages/[FEATURE_ID].md`:

```markdown
# Context Package: [FEATURE_ID]
## [Feature Name]

Generated: [TIMESTAMP]
Compiler Session: [SESSION_ID]

---

## 1. Feature Requirements

[Clear description of what needs to be built]

## 2. Relevant Files

### Must Read (Required Context)
| File | Lines | Purpose |
|------|-------|---------|
| src/auth/store.ts | 47-80 | AuthStore class definition |
| src/types/user.ts | 1-30 | User type definitions |
| tests/auth/store.test.ts | 10-50 | Existing test patterns |

### May Reference (If Needed)
| File | Lines | Purpose |
|------|-------|---------|
| src/config/auth.ts | all | Auth configuration |
| src/api/client.ts | 20-40 | API call patterns |

### Do NOT Modify
- src/database/* (out of scope)
- src/config/* (configuration is frozen)

## 3. Key Code Snippets

### AuthStore Pattern (src/auth/store.ts:47-65)
```typescript
export class AuthStore {
  private user: User | null = null;
  
  async login(email: string, password: string): Promise<LoginResult> {
    // Implementation pattern to follow
  }
}
```

### Test Pattern (tests/auth/store.test.ts:10-25)
```typescript
describe('AuthStore', () => {
  it('should authenticate valid credentials', async () => {
    const store = new AuthStore();
    const result = await store.login('test@example.com', 'password');
    expect(result.success).toBe(true);
  });
});
```

## 4. Constraints Discovered

- All auth methods must return `Promise<Result>` type
- Errors must use `AuthError` class from src/errors
- No direct localStorage access (use StorageService)
- Must emit events via EventBus for state changes

## 5. Recommended Approach

Based on existing patterns in the codebase:

1. Create new method in AuthStore class
2. Follow existing async/await pattern
3. Use try/catch with AuthError
4. Add corresponding test following existing pattern
5. Emit event after successful operation

## 6. Verification Commands

```bash
# Type check
npx tsc --noEmit

# Run relevant tests
npm test -- --testPathPattern="auth"

# Lint
npx eslint src/auth/*.ts
```

---

## Worker Instructions

1. Read snippets above (this IS your context)
2. Implement following recommended approach
3. Run verification commands before claiming done
4. Do NOT explore files outside this package
```

---

## When to Use Context Compiler

### Use When:
- Task failed 2+ times with same agent
- Feature requires understanding multiple files
- Previous attempts show "reasoning drift"
- Context window approaching limits
- Fresh perspective needed

### Don't Use When:
- Simple single-file change
- Bug fix with clear location
- First attempt at new feature
- Agent has clean context already

---

## Integration with Domain Memory

### features.json Enhancement

```json
{
  "features": [
    {
      "id": "F001",
      "description": "Add refresh token support",
      "status": "context_compiled",
      "context_compilation": {
        "package_path": ".claude/context_packages/F001.md",
        "compiled_at": "2024-12-20T10:30:00Z",
        "compiler_session": "session_abc123",
        "files_included": ["src/auth/store.ts", "src/types/user.ts"],
        "files_forbidden": ["src/database/*"]
      },
      "implementation": {
        "worker_session": null,
        "attempts": 0
      }
    }
  ]
}
```

### Status Flow

```
"todo"
  → Compiler session runs
"context_compiled" (package ready)
  → Worker session starts
"failing" (implementation attempted)
  → May need re-compilation
"passing" (verified working)
```

---

## Compiler Session Protocol

### Step 1: Analyze Codebase Structure

```bash
# Find relevant files
find src/ -name "*.ts" | xargs grep -l "auth\|Auth" | head -20

# Understand directory structure
tree src/ -L 2 -I node_modules

# Find existing patterns
grep -rn "export class\|export function" src/auth/
```

### Step 2: Extract Key Snippets

```bash
# Get class definitions
grep -n "export class" src/auth/*.ts

# Extract specific sections
sed -n '47,80p' src/auth/store.ts

# Find test patterns
sed -n '10,50p' tests/auth/store.test.ts
```

### Step 3: Document Constraints

```bash
# Find type requirements
grep -rn "Promise<\|: Result\|: Error" src/auth/

# Find imports to understand dependencies
grep "^import" src/auth/store.ts

# Find error handling patterns
grep -rn "throw new\|catch" src/auth/
```

### Step 4: Write Package

Create the context package file with all findings.

### Step 5: Verify Package Completeness

```markdown
## Package Verification Checklist

- [ ] Feature requirements clearly stated
- [ ] All necessary file paths included
- [ ] Key code snippets extracted
- [ ] Constraints explicitly listed
- [ ] Recommended approach based on patterns
- [ ] Forbidden files/directories listed
- [ ] Verification commands provided
```

---

## Anti-Patterns

```
❌ WRONG: Worker agent explores codebase to "understand"
❌ WRONG: Same agent compiles and implements
❌ WRONG: Context package includes everything "just in case"
❌ WRONG: Worker ignores package and reads other files

✅ RIGHT: Compiler agent curates focused context
✅ RIGHT: Fresh Worker agent receives only package
✅ RIGHT: Package contains minimal necessary context
✅ RIGHT: Worker stays within package boundaries
```

---

## Quick Reference

### Start Compiler Session
```
You are a Context Compiler. Create a context package for [FEATURE].
Output: .claude/context_packages/[ID].md
Do NOT implement anything.
```

### Start Worker Session
```
You are a Worker Agent.
Read: .claude/context_packages/[ID].md
Implement using ONLY the context provided.
Do NOT explore beyond the package.
```

### Re-Compile After Failures
```
Previous implementation failed. As Context Compiler:
1. Read the previous context package
2. Read the error/failure logs
3. Create an UPDATED context package
4. Include additional context needed
5. Note what the previous approach missed
```

---

*This skill prevents agents from being biased by their own failed attempts.*
