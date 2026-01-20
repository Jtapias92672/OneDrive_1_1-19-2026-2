# Epic 2 Initialization: Answer Contract System

**Read Time:** 2 minutes | **Context Load:** ~8K tokens

---

## What Was Built (Epic 1: Foundation)

- ✅ **Monorepo structure**: pnpm workspaces, TypeScript 5.x strict mode
- ✅ **Shared utilities**: Logger, TokenTracker, fs-helpers in `@forge/core`
- ✅ **Database schema**: Prisma with User, Project, Session models
- ✅ **CI/CD pipeline**: GitHub Actions for lint/test/build
- ✅ **Docker Compose**: PostgreSQL + Redis for local dev

---

## Key Imports Available

```typescript
// Logger - USE THIS, don't create your own
import { logger, createLogger } from '@forge/core';
const log = createLogger('answer-contract');

// Token tracking - USE THIS for all LLM operations
import { TokenTracker, countTokens } from '@forge/core';

// File helpers - USE THIS for atomic writes
import { ensureDir, writeFileAtomic } from '@forge/core';
```

---

## Your Mission (Epic 2)

Build the **Answer Contract system** - the schema that defines WHAT to generate. Contracts specify output structure, validation rules, and convergence criteria. This is the "spec" that all generation validates against.

---

## DO NOT

- ❌ Load full Epic 1 code (you have imports)
- ❌ Re-implement logger or TokenTracker
- ❌ Modify `packages/core/` (it's done)
- ❌ Stay in session longer than ONE task

---

## DO

- ✅ Create `packages/answer-contract/` package
- ✅ Define JSON Schema for contract structure
- ✅ Build YAML/JSON parser with validation
- ✅ Create contract templates (ECR, React Component, etc.)
- ✅ Complete ONE task per session, then EXIT

---

## Token Budget

- **Per-task:** 5-8K tokens
- **Epic total:** 50K tokens across ~10 tasks

---

## First Steps

1. Read: `.forge/epics/epic-02-answer-contract/TASKS.md`
2. Start: Task 2.1.1 (Create package structure)
3. Update: `progress.md` when task complete
4. EXIT session, start fresh for Task 2.1.2

---

## Key Files (Reference Only - Don't Load)

- `packages/core/src/logger.ts` - Logger implementation
- `packages/core/src/tokens.ts` - Token tracking
- `tsconfig.json` - Base TypeScript config

---

## Contract Structure Preview

What you're building will look like:

```yaml
id: ecr-contract-v1
version: "1.0.0"
name: Engineering Change Request

output:
  type: object
  required: [title, description, impactAnalysis]
  properties:
    title:
      type: string
      pattern: "^ECR-\\d{4}-\\d{3}:"
    # ...

validators:
  - type: json_schema
  - type: llm_judge
    criteria: "Is this professionally written?"
    threshold: 0.85

convergence:
  maxIterations: 5
  strategy: iterative_refinement
```

This is the TARGET. Build incrementally, one task at a time.
