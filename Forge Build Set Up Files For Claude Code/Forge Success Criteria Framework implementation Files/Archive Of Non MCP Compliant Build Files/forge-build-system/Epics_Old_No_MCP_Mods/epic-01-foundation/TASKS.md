# Epic 1: Foundation - Atomic Task Breakdown

**Total Tasks:** 11  
**Estimated Tokens:** 40K total (~3.6K per task)  
**Estimated Time:** 3 days

---

## Task Format

Each task is designed for a **single fresh session** (~5-15 minutes, 5-10K tokens).

---

## Phase 1.1: Project Setup

### Task 1.1.1: Initialize pnpm monorepo with workspace config

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `package.json` (root)
- `pnpm-workspace.yaml`
- `.npmrc`
- `.nvmrc`

**Acceptance Criteria:**
- [ ] `pnpm install` runs without errors
- [ ] Workspace config includes `packages/*`
- [ ] Node version specified as 20 LTS

**Commands to Run:**
```bash
pnpm init
# Create pnpm-workspace.yaml
# Create .nvmrc with "20"
pnpm install
```

**Verification:**
```bash
pnpm -v  # Should show version
node -v  # Should match .nvmrc
```

---

### Task 1.1.2: Configure TypeScript 5.x with strict mode

**Time:** 5 minutes  
**Tokens:** ~3K  
**Files to CREATE:**
- `tsconfig.json` (root/base config)
- `tsconfig.build.json` (build-specific)

**Acceptance Criteria:**
- [ ] `strict: true` enabled
- [ ] `target: ES2022`
- [ ] Path aliases configured (@forge/*)
- [ ] `pnpm exec tsc --version` shows 5.x

**Key Config:**
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "paths": {
      "@forge/*": ["packages/*/src"]
    }
  }
}
```

**Verification:**
```bash
pnpm exec tsc --version
```

---

### Task 1.1.3: Set up ESLint + Prettier with shared configs

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `.eslintrc.js`
- `.prettierrc`
- `.prettierignore`

**Dependencies to Install:**
```bash
pnpm add -Dw eslint prettier typescript-eslint @typescript-eslint/parser
```

**Acceptance Criteria:**
- [ ] `pnpm lint` command works
- [ ] `pnpm format` command works
- [ ] TypeScript files are linted

**Verification:**
```bash
pnpm lint
pnpm format --check
```

---

### Task 1.1.4: Configure Husky pre-commit hooks

**Time:** 3 minutes  
**Tokens:** ~2K  
**Files to CREATE:**
- `.husky/pre-commit`

**Commands:**
```bash
pnpm add -Dw husky lint-staged
pnpm exec husky init
```

**Acceptance Criteria:**
- [ ] Pre-commit hook runs lint-staged
- [ ] Staged files are linted before commit

**Verification:**
```bash
git add .
git commit -m "test" --dry-run
```

---

## Phase 1.2: Core Package

### Task 1.2.1: Create packages/core directory structure

**Time:** 5 minutes  
**Tokens:** ~3K  
**Files to CREATE:**
- `packages/core/package.json`
- `packages/core/tsconfig.json`
- `packages/core/src/index.ts`

**Directory Structure:**
```
packages/core/
├── src/
│   ├── index.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── index.ts
├── package.json
└── tsconfig.json
```

**Acceptance Criteria:**
- [ ] Package name is `@forge/core`
- [ ] Extends root tsconfig
- [ ] Exports from src/index.ts

**Verification:**
```bash
cd packages/core && pnpm build
```

---

### Task 1.2.2: Create shared TypeScript types

**Time:** 5 minutes  
**Tokens:** ~5K  
**Files to CREATE/MODIFY:**
- `packages/core/src/types/context.ts`
- `packages/core/src/types/index.ts`

**Types to Define:**
```typescript
// ForgeContext - passed through all operations
export interface ForgeContext {
  sessionId: string;
  projectId: string;
  timestamp: Date;
  config: ForgeConfig;
}

// ForgeConfig - configuration options
export interface ForgeConfig {
  maxIterations: number;
  maxTokens: number;
  maxCost: number;
  providers: ProviderConfig[];
}

// Result types
export interface ForgeResult<T> {
  success: boolean;
  data?: T;
  error?: ForgeError;
  metadata: ResultMetadata;
}
```

**Acceptance Criteria:**
- [ ] All types exported from @forge/core
- [ ] Types compile without errors
- [ ] JSDoc comments on public types

**Verification:**
```bash
cd packages/core && pnpm build
```

---

### Task 1.2.3: Create logger utility

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/core/src/utils/logger.ts`

**Implementation:**
```typescript
export interface Logger {
  info(message: string, meta?: object): void;
  warn(message: string, meta?: object): void;
  error(message: string, meta?: object): void;
  debug(message: string, meta?: object): void;
}

export function createLogger(namespace: string): Logger {
  // Implementation with timestamps, namespaces
}

export const logger = createLogger('forge');
```

**Acceptance Criteria:**
- [ ] `createLogger('name')` returns Logger
- [ ] Logs include timestamp and namespace
- [ ] Supports structured metadata
- [ ] Exported from @forge/core

**Verification:**
```typescript
import { createLogger } from '@forge/core';
const log = createLogger('test');
log.info('Hello', { key: 'value' });
```

---

### Task 1.2.4: Create TokenTracker utility

**Time:** 5 minutes  
**Tokens:** ~5K  
**Files to CREATE:**
- `packages/core/src/utils/tokens.ts`

**Implementation:**
```typescript
export class TokenTracker {
  private inputTokens = 0;
  private outputTokens = 0;
  
  recordInput(tokens: number): void;
  recordOutput(tokens: number): void;
  getTotal(): number;
  getCost(pricing: Pricing): number;
  getReport(): TokenReport;
}

export function countTokens(text: string): number {
  // Approximate token count (chars / 4)
}
```

**Acceptance Criteria:**
- [ ] Tracks input/output separately
- [ ] Calculates cost based on pricing
- [ ] Generates usage report
- [ ] Exported from @forge/core

**Verification:**
```typescript
import { TokenTracker } from '@forge/core';
const tracker = new TokenTracker();
tracker.recordInput(1000);
console.log(tracker.getCost({ inputPer1k: 0.003 }));
```

---

## Phase 1.3: Build Infrastructure

### Task 1.3.1: Set up GitHub Actions CI workflow

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `.github/workflows/ci.yml`

**Workflow Steps:**
1. Checkout
2. Setup pnpm
3. Setup Node.js
4. Install dependencies
5. Run lint
6. Run typecheck
7. Run tests
8. Run build

**Acceptance Criteria:**
- [ ] Triggers on push to main/develop
- [ ] Triggers on pull requests
- [ ] Uses pnpm caching
- [ ] All steps defined

**Verification:**
```bash
# Push to branch and check Actions tab
```

---

### Task 1.3.2: Configure Turborepo for monorepo builds

**Time:** 5 minutes  
**Tokens:** ~3K  
**Files to CREATE:**
- `turbo.json`

**Configuration:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {}
  }
}
```

**Root package.json scripts:**
```json
{
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "dev": "turbo dev"
  }
}
```

**Acceptance Criteria:**
- [ ] `pnpm build` builds all packages in order
- [ ] Build caching works
- [ ] Dependencies respected

**Verification:**
```bash
pnpm build
pnpm build  # Second run should be cached
```

---

### Task 1.3.3: Create package stub directories

**Time:** 5 minutes  
**Tokens:** ~4K  
**Directories to CREATE:**
- `packages/answer-contract/`
- `packages/forge-c/`
- `packages/convergence/`
- `packages/figma-parser/`
- `packages/react-generator/`
- `packages/test-generator/`
- `packages/evidence-pack/`
- `packages/infrastructure/`
- `packages/integrations/`
- `packages/platform-ui/`

**Each package needs:**
- `package.json` with name `@forge/{name}`
- `tsconfig.json` extending root
- `src/index.ts` with placeholder export

**Acceptance Criteria:**
- [ ] All 10 package directories exist
- [ ] Each has valid package.json
- [ ] `pnpm install` succeeds with all packages

**Verification:**
```bash
ls packages/  # Should show 11 directories (including core)
pnpm install
pnpm build
```

---

## Epic 1 Completion Checklist

Before moving to Epic 2:

- [ ] All 11 tasks marked [x] in progress.md
- [ ] `pnpm install` succeeds
- [ ] `pnpm build` succeeds
- [ ] `pnpm lint` passes
- [ ] `pnpm test` runs (even with no tests)
- [ ] GitHub Actions CI passes
- [ ] All 11 packages exist

**Then run:** `.forge/agent-bootstrap.sh next-epic`
