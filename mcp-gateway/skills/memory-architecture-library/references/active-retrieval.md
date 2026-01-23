---
name: active-retrieval
description: Implement progressive disclosure by actively retrieving only needed context instead of loading entire files. Use when context window feels bloated, agent reasoning becomes fuzzy, or when working with large codebases. Grep for specific patterns instead of reading full files. The agent must SEEK information, not have it pinned.
---

# Active Retrieval Skill
## Progressive Disclosure for Sharp Reasoning

**Source**: Anthropic Research - "Retrieval is an Active Decision"
**Rule**: Don't pin entire files. Grep for what you need.

---

## The Problem

### Context Pinning (Wrong)
```
Agent loads:
- Full auth.ts (500 lines)
- Full user.ts (400 lines)  
- Full database.ts (600 lines)
- Full config.ts (200 lines)
= 1700 lines of "just in case" context

Result: Agent's attention diluted across everything
```

### Active Retrieval (Right)
```
Agent queries:
- "Where is AuthStore defined?" → 5 relevant lines
- "What methods does AuthStore have?" → 10 relevant lines
- "How is AuthStore initialized?" → 8 relevant lines
= 23 lines of targeted context

Result: Agent's attention 100% on what matters
```

---

## The Core Principle

> "Claude performs better when it has to SEEK information."

Don't give Claude everything upfront. Make it:
1. Identify what information it needs
2. Query for that specific information
3. Load only the relevant lines
4. Reason with focused context

---

## Retrieval Patterns

### Pattern 1: Find Definition First

```bash
# ❌ WRONG: Read entire file
cat src/auth/store.ts

# ✅ RIGHT: Find specific definition
grep -n "class AuthStore\|const AuthStore\|function AuthStore" src/auth/*.ts
```

**Output**: `src/auth/store.ts:47: export class AuthStore {`

Then read only that section:
```bash
sed -n '47,80p' src/auth/store.ts
```

### Pattern 2: Find All Usage Sites

```bash
# ❌ WRONG: Load all files that might use it
cat src/**/*.ts

# ✅ RIGHT: Find exact usage locations
grep -rn "AuthStore" src/ --include="*.ts" | head -20
```

**Output**:
```
src/auth/store.ts:47: export class AuthStore {
src/auth/index.ts:3: import { AuthStore } from './store'
src/features/login/hook.ts:12: const store = new AuthStore()
```

### Pattern 3: Find Related Patterns

```bash
# ❌ WRONG: Read documentation files
cat docs/*.md

# ✅ RIGHT: Find relevant documentation
grep -rn "authentication\|AuthStore\|login" docs/ --include="*.md" | head -10
```

### Pattern 4: Understand Import Chain

```bash
# Find what a file imports
grep "^import" src/auth/store.ts

# Find what imports a file
grep -rn "from.*auth/store" src/ --include="*.ts"
```

---

## The Retrieval Protocol

### Step 1: Declare Information Needs

Before reading ANY file, state:
```markdown
## Information I Need

1. How is [X] defined?
2. Where is [X] used?
3. What are [X]'s dependencies?
4. What configuration affects [X]?
```

### Step 2: Query, Don't Load

```bash
# For each need, write a specific query:

# Need 1: Definition
grep -n "export.*AuthStore\|class AuthStore" src/ -r

# Need 2: Usage  
grep -rn "AuthStore" src/ --include="*.ts" | grep -v "^.*:.*import"

# Need 3: Dependencies
grep "^import" src/auth/store.ts

# Need 4: Configuration
grep -rn "AUTH_\|auth:" src/config/ --include="*.ts"
```

### Step 3: Load Only Relevant Sections

```bash
# Found definition at line 47
# Read definition + context (47 to 80)
sed -n '47,80p' src/auth/store.ts

# Found usage at line 12 in hook.ts
# Read that function (12 to 25)
sed -n '12,25p' src/features/login/hook.ts
```

### Step 4: Summarize Retrieved Context

```markdown
## Retrieved Context Summary

### AuthStore Definition (src/auth/store.ts:47-80)
- Class with methods: login(), logout(), getUser()
- Uses localStorage for persistence
- Depends on: ApiClient, User type

### Usage in Login Hook (src/features/login/hook.ts:12-25)
- Instantiated in useLogin hook
- Called on form submit
- Returns user object or error
```

---

## Grep Cheat Sheet

### Find Definitions
```bash
# Classes
grep -rn "class MyClass" src/

# Functions
grep -rn "function myFunc\|const myFunc.*=" src/

# Types/Interfaces
grep -rn "interface MyType\|type MyType" src/

# Constants
grep -rn "const MY_CONST\|export const" src/
```

### Find Usage
```bash
# All references (excluding imports)
grep -rn "MyClass" src/ | grep -v "import.*MyClass"

# Function calls
grep -rn "myFunc(" src/

# As parameter
grep -rn ": MyType\|<MyType>" src/
```

### Find Relationships
```bash
# What does this file import?
grep "^import" path/to/file.ts

# What imports this file?
grep -rn "from.*path/to/file" src/

# What extends/implements this?
grep -rn "extends MyClass\|implements MyInterface" src/
```

### Find Patterns
```bash
# Error handling patterns
grep -rn "try.*catch\|throw new" src/

# API calls
grep -rn "fetch(\|axios\.\|api\." src/

# State mutations
grep -rn "setState\|dispatch\|\.set(" src/
```

---

## Integration with Bootup Ritual

Add to BOOTUP-RITUAL.md:

```markdown
## Context Retrieval Rules

### FORBIDDEN
- `cat entire_file.ts` for files > 100 lines
- Loading files "just in case"
- Reading documentation before knowing what to look for

### REQUIRED
1. State information needs explicitly
2. Use grep to find relevant locations
3. Use sed to read only relevant sections
4. Summarize retrieved context before proceeding

### Example Retrieval Sequence
```bash
# 1. Find where auth is handled
grep -rn "auth\|Auth" src/ --include="*.ts" | head -20

# 2. Found AuthStore at src/auth/store.ts:47
#    Read just the class definition
sed -n '47,100p' src/auth/store.ts

# 3. Find where it's instantiated
grep -rn "new AuthStore\|AuthStore(" src/

# 4. Now I have focused context for my task
```
```

---

## Anti-Patterns to Avoid

```
❌ "Let me read the entire codebase to understand..."
❌ "I'll load all the related files first..."
❌ "Reading src/auth/store.ts... (500 lines)"
❌ "Here's the full content of..."

✅ "I need to find where AuthStore is defined..."
✅ "Searching for AuthStore usage: grep -rn 'AuthStore' src/"
✅ "Found at line 47, reading lines 47-80..."
✅ "Key finding: AuthStore has three methods..."
```

---

## Context Budget

### Hard Limits
| Context Type | Max Lines | Approach |
|--------------|-----------|----------|
| Single file section | 50 lines | sed range |
| Multiple definitions | 100 lines total | grep + sed |
| Full file | Only if < 100 lines | cat |
| Documentation | 20 lines | grep relevant section |

### Budget Tracking
```markdown
## Current Context Budget

Used: 150 / 500 lines allocated
- AuthStore definition: 34 lines
- Login hook: 15 lines  
- Config section: 8 lines
- Type definitions: 23 lines

Remaining: 350 lines for implementation
```

---

## Quick Reference

```bash
# Find something
grep -rn "pattern" src/ --include="*.ts"

# Read specific lines
sed -n 'START,ENDp' file.ts

# Find + Read in one
grep -n "pattern" file.ts | head -1 | cut -d: -f1 | xargs -I{} sed -n '{},+20p' file.ts

# Count before loading
wc -l file.ts  # If > 100, use grep/sed instead

# Find file structure
find src/ -name "*.ts" -type f | head -20
tree src/ -L 2
```

---

*This skill keeps agent reasoning sharp by loading only what's needed.*
