# Epic 1: Project Foundation & Tooling Setup

**Duration:** 3 days  
**Token Budget:** 40K tokens  
**Status:** Not Started  
**Dependencies:** None (this is the root epic)

---

## Epic Goal

Establish repository structure, development environment, CI/CD pipeline, and core utilities that all subsequent epics depend on.

---

## User Stories

### US-1.1: Repository Initialization
**As a** developer  
**I want** a properly structured monorepo  
**So that** all FORGE packages are organized and discoverable

**Acceptance Criteria:**
- [ ] pnpm workspace configured with packages/*
- [ ] TypeScript 5.x with strict mode enabled
- [ ] ESLint + Prettier with shared config
- [ ] Husky pre-commit hooks configured
- [ ] .nvmrc specifying Node 20 LTS

**Tasks:**
```bash
# Initialize monorepo
pnpm init
pnpm add -Dw typescript @types/node eslint prettier husky lint-staged

# Create workspace config
# pnpm-workspace.yaml with packages/*
```

**Verification:**
```bash
pnpm install  # Should succeed
pnpm exec tsc --version  # Should show 5.x
```

---

### US-1.2: Package Structure Creation
**As a** developer  
**I want** all package directories pre-created  
**So that** subsequent epics have a home for their code

**Acceptance Criteria:**
- [ ] packages/core/ - Shared types and utilities
- [ ] packages/answer-contract/ - Contract engine
- [ ] packages/forge-c/ - FORGE C orchestrator
- [ ] packages/convergence/ - Convergence engine
- [ ] packages/figma-parser/ - Figma file parser
- [ ] packages/react-generator/ - React code generator
- [ ] packages/test-generator/ - Test generation engine
- [ ] packages/evidence-pack/ - Evidence pack builder
- [ ] packages/infrastructure/ - AWS deployment
- [ ] packages/platform-ui/ - Web dashboard
- [ ] packages/integrations/ - External service connectors

**Directory Structure:**
```
packages/
├── core/
│   ├── src/
│   │   ├── types/
│   │   ├── utils/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── answer-contract/
├── forge-c/
├── convergence/
├── figma-parser/
├── react-generator/
├── test-generator/
├── evidence-pack/
├── infrastructure/
├── platform-ui/
└── integrations/
```

**Verification:**
```bash
ls packages/ | wc -l  # Should be 11
cat packages/core/package.json  # Should exist
```

---

### US-1.3: Shared Type Definitions
**As a** developer  
**I want** common types defined in @forge/core  
**So that** all packages share consistent interfaces

**Acceptance Criteria:**
- [ ] ForgeContext type defined
- [ ] AnswerContract interface defined
- [ ] ConvergenceResult type defined
- [ ] EvidencePack interface defined
- [ ] All types exported from @forge/core

**Key Types:**
```typescript
// packages/core/src/types/context.ts
export interface ForgeContext {
  sessionId: string;
  projectId: string;
  timestamp: Date;
  config: ForgeConfig;
  state: ForgeState;
}

// packages/core/src/types/contract.ts
export interface AnswerContract<T = unknown> {
  id: string;
  version: string;
  schema: JSONSchema;
  validators: Validator[];
  convergenceCriteria: ConvergenceCriteria;
  evidenceRequirements: EvidenceRequirement[];
}

// packages/core/src/types/convergence.ts
export interface ConvergenceResult<T = unknown> {
  status: 'converged' | 'failed' | 'max_iterations';
  iterations: number;
  finalOutput: T;
  validationHistory: ValidationAttempt[];
  evidencePack: EvidencePack;
  tokenUsage: TokenUsage;
  cost: CostBreakdown;
}
```

**Verification:**
```bash
pnpm --filter @forge/core build
pnpm --filter @forge/core test
```

---

### US-1.4: Development Scripts
**As a** developer  
**I want** standard npm scripts for common operations  
**So that** the development workflow is consistent

**Acceptance Criteria:**
- [ ] `pnpm dev` - Start development mode
- [ ] `pnpm build` - Build all packages
- [ ] `pnpm test` - Run all tests
- [ ] `pnpm lint` - Lint all packages
- [ ] `pnpm clean` - Clean all build artifacts
- [ ] `pnpm typecheck` - Type check without emitting

**Root package.json scripts:**
```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "clean": "turbo clean && rm -rf node_modules",
    "typecheck": "turbo typecheck",
    "prepare": "husky install"
  }
}
```

**Verification:**
```bash
pnpm build  # Should complete without errors
pnpm test   # Should run (even if no tests yet)
pnpm lint   # Should pass
```

---

### US-1.5: CI/CD Pipeline Setup
**As a** developer  
**I want** GitHub Actions configured  
**So that** PRs are validated automatically

**Acceptance Criteria:**
- [ ] `.github/workflows/ci.yml` - PR validation
- [ ] `.github/workflows/release.yml` - Release automation
- [ ] Branch protection rules documented
- [ ] Test coverage reporting configured

**CI Workflow:**
```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test --coverage
      - run: pnpm build
```

**Verification:**
```bash
# Push to branch and verify Actions run
gh workflow view ci.yml
```

---

### US-1.6: Documentation Foundation
**As a** developer  
**I want** documentation structure in place  
**So that** all epics have a home for their docs

**Acceptance Criteria:**
- [ ] docs/ directory with subdirectories
- [ ] README.md with project overview
- [ ] CONTRIBUTING.md with dev guidelines
- [ ] Architecture decision records (ADR) template

**Documentation Structure:**
```
docs/
├── architecture/
│   ├── decisions/
│   │   └── 001-monorepo-structure.md
│   └── diagrams/
├── api/
├── guides/
│   ├── getting-started.md
│   └── development.md
└── contracts/
    └── templates/
```

**Verification:**
```bash
ls docs/ | wc -l  # Should be 4+ directories
cat docs/guides/getting-started.md  # Should exist
```

---

## Key Deliverables

```
forge-bd-platform/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── .husky/
│   └── pre-commit
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── guides/
│   └── contracts/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── context.ts
│   │   │   │   ├── contract.ts
│   │   │   │   ├── convergence.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── [10 more package stubs]
├── .eslintrc.js
├── .prettierrc
├── .nvmrc
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── turbo.json
└── README.md
```

---

## Completion Criteria

- [ ] `pnpm install` succeeds
- [ ] `pnpm build` completes without errors
- [ ] `pnpm test` runs (passes with no tests)
- [ ] `pnpm lint` passes
- [ ] All 11 package directories exist
- [ ] Core types compile and export correctly
- [ ] CI workflow triggers on PR
- [ ] Documentation structure in place

---

## Handoff Context for Epic 2

**What Epic 2 needs to know:**
- Package location: `packages/answer-contract/`
- Import core types: `import { AnswerContract, ForgeContext } from '@forge/core'`
- Test framework: Vitest
- Build tool: tsup

**Files to reference:**
- `packages/core/src/types/contract.ts`
- `packages/core/src/types/index.ts`
- `tsconfig.json` (base config)

---

## Verification Script

```bash
#!/bin/bash
# .forge/epics/epic-01-foundation/verify.sh

echo "🔍 Verifying Epic 1: Foundation"

# Check directory structure
[ -d "packages/core" ] || { echo "❌ packages/core missing"; exit 1; }
[ -d "packages/answer-contract" ] || { echo "❌ packages/answer-contract missing"; exit 1; }
[ -d "packages/forge-c" ] || { echo "❌ packages/forge-c missing"; exit 1; }

# Check configuration files
[ -f "pnpm-workspace.yaml" ] || { echo "❌ pnpm-workspace.yaml missing"; exit 1; }
[ -f "tsconfig.json" ] || { echo "❌ tsconfig.json missing"; exit 1; }
[ -f "turbo.json" ] || { echo "❌ turbo.json missing"; exit 1; }

# Check core types
[ -f "packages/core/src/types/contract.ts" ] || { echo "❌ Core types missing"; exit 1; }

# Run builds
pnpm install || { echo "❌ pnpm install failed"; exit 1; }
pnpm build || { echo "❌ pnpm build failed"; exit 1; }
pnpm lint || { echo "❌ pnpm lint failed"; exit 1; }

echo "✅ Epic 1 verification complete"
```
