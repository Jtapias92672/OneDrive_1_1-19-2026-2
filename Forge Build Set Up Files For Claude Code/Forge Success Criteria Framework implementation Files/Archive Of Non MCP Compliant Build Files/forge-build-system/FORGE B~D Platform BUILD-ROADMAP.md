# FORGE B-D Platform: Build Roadmap

> **For:** Development Team  
> **Environment:** Claude Code on AWS Bedrock  
> **Methodology:** True Ralph Loop (Atomic Tasks + Fresh Sessions)  
> **Duration:** ~70 days (2.5 months)  
> **Version:** 1.0.0  
> **Last Updated:** 2026-01-18

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What is FORGE?](#2-what-is-forge)
3. [Environment Setup](#3-environment-setup)
4. [Build Methodology](#4-build-methodology)
5. [Directory Structure](#5-directory-structure)
6. [Epic Overview](#6-epic-overview)
7. [Phase 1: Core Foundation (Weeks 1-3)](#7-phase-1-core-foundation)
8. [Phase 2: Convergence Engine (Weeks 4-5)](#8-phase-2-convergence-engine)
9. [Phase 3: Domain Generators (Weeks 6-8)](#9-phase-3-domain-generators)
10. [Phase 4: Compliance & Infrastructure (Weeks 9-10)](#10-phase-4-compliance--infrastructure)
11. [Phase 5: Platform & Integration (Weeks 11-12)](#11-phase-5-platform--integration)
12. [Success Criteria Framework](#12-success-criteria-framework)
13. [Daily Workflow](#13-daily-workflow)
14. [Troubleshooting](#14-troubleshooting)
15. [Appendix](#15-appendix)

---

## 1. Executive Summary

FORGE is a **contract-driven agent reliability layer** that ensures AI-generated outputs meet specific quality standards through iterative convergence. Think of it as "CI/CD for AI outputs" - every generated artifact must pass structural, semantic, and qualitative validation before being accepted.

### Key Value Proposition

> "An older model with agentic workflows outperforms a newer model used zero-shot."  
> — Andrew Ng, Stanford 2024

FORGE implements this insight through:
- **3-Layer Validation:** Structural → Semantic → Qualitative
- **Convergence Loop:** Generate → Validate → Reflect → Repair → Repeat
- **Evidence Packs:** Audit artifacts for compliance (SOC 2, CMMC, NIST AI RMF)

### Build Stats

| Metric | Value |
|--------|-------|
| Total Epics | 14 |
| Total Tasks | ~137 atomic tasks |
| Token Budget | 665K tokens |
| Success Criteria | 122 acceptance tests |
| Target | v0.1.0-alpha |

---

## 2. What is FORGE?

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FORGE PLATFORM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────────────────────────────┐   │
│  │   ANSWER     │    │         CONVERGENCE ENGINE           │   │
│  │  CONTRACT    │───▶│  Generate → Validate → Repair Loop   │   │
│  │  (Schema)    │    │                                      │   │
│  └──────────────┘    └──────────────┬───────────────────────┘   │
│                                     │                            │
│         ┌───────────────────────────┼───────────────────────┐   │
│         ▼                           ▼                       ▼   │
│  ┌─────────────┐           ┌─────────────┐          ┌──────────┐│
│  │   LAYER 1   │           │   LAYER 2   │          │ LAYER 3  ││
│  │ Structural  │           │  Semantic   │          │Qualitative│
│  │ (JSON Schema)│          │ (Cross-refs)│          │(LLM-Judge)││
│  └─────────────┘           └─────────────┘          └──────────┘│
│         │                           │                       │   │
│         └───────────────────────────┼───────────────────────┘   │
│                                     ▼                            │
│                          ┌──────────────────┐                   │
│                          │  EVIDENCE PACK   │                   │
│                          │ (Audit Artifact) │                   │
│                          └──────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Purpose | Success Criteria |
|-----------|---------|------------------|
| Answer Contract | Define what "good" looks like | AC-01 → AC-10 |
| Structural Validation | JSON Schema, types, required fields | SV-01 → SV-10 |
| Semantic Validation | Cross-refs, prohibited patterns | SEM-01 → SEM-10 |
| Qualitative Validation | LLM-Judge with rubrics | QV-01 → QV-10 |
| Convergence Engine | Orchestrate the loop | CE-01 → CE-11 |
| Evidence Pack | Audit trail for compliance | EP-01 → EP-10 |
| Data Protection | PII/secret handling | DP-01 → DP-10 |
| Observability | Metrics and dashboards | OB-01 → OB-11 |

---

## 3. Environment Setup

### Prerequisites

- AWS Account with Bedrock access
- Claude Code CLI installed
- Node.js 20+ / pnpm 8+
- Git
- Docker (for local testing)

### AWS Bedrock Configuration

```bash
# 1. Configure AWS credentials
aws configure
# Enter: AWS Access Key ID, Secret Access Key, Region (us-east-1 recommended)

# 2. Enable Claude models in Bedrock
# Navigate to: AWS Console → Bedrock → Model access → Request access to Anthropic Claude

# 3. Verify access
aws bedrock list-foundation-models --query "modelSummaries[?providerName=='Anthropic']"
```

### Claude Code Setup

```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Configure for Bedrock
claude config set provider bedrock
claude config set model anthropic.claude-3-5-sonnet-20241022-v2:0
claude config set region us-east-1

# Verify
claude --version
claude test "Hello, Claude"
```

### Project Initialization

```bash
# Clone the repository (or create new)
git clone https://github.com/arcfoundry/forge-bd-platform.git
cd forge-bd-platform

# Or initialize new project
mkdir forge-bd-platform && cd forge-bd-platform
git init

# Create directory structure
mkdir -p .forge/{epics,prompts,context-packages,logs}
mkdir -p packages/{core,answer-contract,forge-c,convergence}
mkdir -p packages/{figma-parser,react-generator,test-generator}
mkdir -p packages/{evidence-pack,infrastructure,integrations,platform-ui}
mkdir -p forge-success-criteria/{schemas,templates,examples}
mkdir -p forge-tasks

# Copy build specifications
# (Copy all files from forge-success-criteria/ and forge-tasks/)
```

---

## 4. Build Methodology

### True Ralph Loop

**Why Fresh Sessions?**

Research shows LLM accuracy degrades after ~30-40K tokens ("Lost in the Middle" - Liu et al., 2023). The True Ralph Loop ensures peak performance by:

1. **One Task Per Session** - Each atomic task gets full LLM attention
2. **Fresh Context** - No accumulated conversation history
3. **File-Based State** - Progress tracked in `progress.md`, not memory
4. **~8-15K Tokens Max** - Stay in peak performance zone

### Session Pattern

```
┌─────────────────────────────────────────────────────────────┐
│ 1. START FRESH SESSION                                      │
│    claude code                                              │
│    > Read .forge/progress.md and current TASKS.md           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. LOAD CONTEXT (~8-12K tokens max)                         │
│    - progress.md (current state)                            │
│    - TASKS.md (task details)                                │
│    - Relevant source files ONLY                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. COMPLETE ONE TASK                                        │
│    - Implement exactly what task specifies                  │
│    - Run verification commands                              │
│    - Check Success Criteria (if applicable)                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. UPDATE & EXIT                                            │
│    - Update progress.md                                     │
│    - Commit changes                                         │
│    - EXIT SESSION (do not continue)                         │
└─────────────────────────────────────────────────────────────┘
```

### Using the Bootstrap Script

```bash
# See current task
.forge/agent-bootstrap.sh task

# Check progress
.forge/agent-bootstrap.sh progress

# Verify Success Criteria for current epic
.forge/agent-bootstrap.sh verify-criteria

# Move to next epic (verifies criteria first)
.forge/agent-bootstrap.sh next-epic

# Show Epic ↔ Success Criteria alignment
.forge/agent-bootstrap.sh alignment
```

---

## 5. Directory Structure

```
forge-bd-platform/
├── BUILD-ROADMAP.md              # THIS FILE
├── README.md                     # Project overview
├── package.json                  # Root package.json (pnpm workspace)
├── pnpm-workspace.yaml           # Workspace configuration
├── turbo.json                    # Turborepo configuration
├── tsconfig.base.json            # Shared TypeScript config
│
├── .forge/                       # Build orchestration
│   ├── agent-bootstrap.sh        # Session management script
│   ├── progress.md               # Cross-session state (SOURCE OF TRUTH)
│   ├── current-epic.txt          # Current epic number
│   ├── epics/                    # Epic-specific files
│   │   ├── epic-01-foundation/
│   │   │   ├── TASKS.md          # Atomic task breakdown
│   │   │   └── COMPLETION.md     # Written when epic complete
│   │   └── ...
│   ├── prompts/                  # Task prompt templates
│   └── logs/                     # Session logs
│
├── forge-success-criteria/       # Success Criteria Framework
│   ├── 00_MASTER_ROADMAP.md      # Authoritative index
│   ├── 01_ANSWER_CONTRACT.md     # AC-01 → AC-10
│   ├── 02_STRUCTURAL_VALIDATION.md
│   ├── 03_SEMANTIC_VALIDATION.md
│   ├── 04_QUALITATIVE_VALIDATION.md
│   ├── 05_CONVERGENCE_ENGINE.md  # CE-01 → CE-11
│   ├── 06_EVIDENCE_PACK.md       # EP-01 → EP-10
│   ├── 07_RULE_SYSTEM.md
│   ├── 08_RUBRIC_LIBRARY.md
│   ├── 09_DATA_PROTECTION.md     # DP-01 → DP-10
│   ├── 10_ORCHESTRATION.md
│   ├── 11_OBSERVABILITY.md       # OB-01 → OB-11
│   ├── 12_HUMAN_REVIEW.md
│   ├── schemas/
│   │   ├── answer-contract.schema.json
│   │   ├── evidence-pack.schema.json
│   │   └── rubric.schema.json
│   ├── templates/
│   └── examples/
│
├── forge-tasks/                  # Epic alignment documents
│   ├── MASTER-TASKS.md           # Epic overview
│   ├── EPIC-SUCCESS-CRITERIA-ALIGNMENT.md
│   ├── TRUE-RALPH-SYSTEM.md      # Methodology guide
│   ├── progress.md               # Detailed progress tracker
│   └── TASKS-Epic-*.md           # Per-epic task files
│
├── packages/                     # Monorepo packages
│   ├── core/                     # @forge/core
│   ├── answer-contract/          # @forge/answer-contract
│   ├── forge-c/                  # @forge/forge-c
│   ├── convergence/              # @forge/convergence
│   ├── code-execution/           # @forge/code-execution
│   ├── figma-parser/             # @forge/figma-parser
│   ├── react-generator/          # @forge/react-generator
│   ├── test-generator/           # @forge/test-generator
│   ├── evidence-pack/            # @forge/evidence-pack
│   ├── infrastructure/           # @forge/infrastructure
│   ├── integrations/             # @forge/integrations
│   └── platform-ui/              # @forge/platform-ui (Next.js)
│
├── docs/                         # Documentation
│   ├── architecture/
│   ├── deployment/
│   └── api/
│
└── tests/                        # E2E and integration tests
    ├── e2e/
    └── integration/
```

---

## 6. Epic Overview

### Epic Dependency Graph

```
                        Epic 1 (Foundation)
                              │
                              ▼
                        Epic 2 (Answer Contract)
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        Epic 5          Epic 3          Epic 9
      (Figma Parser)  (FORGE C Core)  (Infrastructure)
              │               │               │
              ▼               ▼               │
        Epic 6          Epic 3.75           │
    (React Generator) (Code Execution)      │
              │               │               │
              │               ▼               │
              │         Epic 4 ◀─────────────┘
              │     (Convergence)
              │          │ │
              │    ┌─────┘ └─────┐
              │    ▼             ▼
              │  Epic 7       Epic 8
              │ (Test Gen)  (Evidence Packs)
              │    │             │
              └────┼─────────────┘
                   │
                   ▼
           Epic 10a (Platform UI Core)
                   │
                   ▼
           Epic 10b (Platform UI Features)
                   │
                   ▼
             Epic 11 (Integrations)
                   │
                   ▼
             Epic 12 (E2E Testing)
```

### Epic Summary Table

| Epic | Name | Days | Tasks | Tokens | Success Criteria |
|------|------|------|-------|--------|------------------|
| 1 | Foundation | 3 | 11 | 40K | — |
| 2 | Answer Contract | 4 | 12 | 50K | AC-01 → AC-10 |
| 3 | FORGE C Core | 5 | 12 | 60K | QV-01 → QV-10 |
| 3.75 | Code Execution ⚠️ | 3 | 10 | 20K | DP-01 → DP-10 |
| 4 | Convergence Engine | 6 | 14 | 70K | CE-01 → CE-11 |
| 5 | Figma Parser | 5 | 10 | 50K | — |
| 6 | React Generator | 5 | 12 | 60K | — |
| 7 | Test Generation | 4 | 10 | 40K | RL-01 → RL-10 |
| 8 | Evidence Packs ⚠️ | 3 | 8 | 35K | EP-01 → EP-10 |
| 9 | Infrastructure | 5 | 12 | 55K | OB-01 → OB-11 |
| 10a | Platform UI Core | 4 | 8 | 25K | HR-01 → HR-10 |
| 10b | Platform UI Features | 4 | 8 | 25K | HR-01 → HR-10 |
| 11 | Integrations | 5 | 10 | 40K | OR-01 → OR-10 |
| 12 | E2E Testing | 5 | 10 | 45K | ALL |

⚠️ = Security/Compliance Critical

---

## 7. Phase 1: Core Foundation

### Week 1: Epic 1 - Foundation (Days 1-3)

**Goal:** Initialize monorepo with tooling and shared utilities.

```bash
# Start Epic 1
echo "1" > .forge/current-epic.txt
.forge/agent-bootstrap.sh task
```

#### Tasks

| Task | Description | Time | Verification |
|------|-------------|------|--------------|
| 1.1.1 | Initialize pnpm monorepo | 5 min | `pnpm install` works |
| 1.1.2 | Configure TypeScript 5.x strict | 5 min | `pnpm build` works |
| 1.1.3 | Set up ESLint + Prettier | 5 min | `pnpm lint` works |
| 1.1.4 | Configure Husky pre-commit | 5 min | Hooks run on commit |
| 1.2.1 | Create packages/core structure | 5 min | Directory exists |
| 1.2.2 | Create shared TypeScript types | 10 min | Types compile |
| 1.2.3 | Create logger utility | 10 min | Logger works |
| 1.2.4 | Create TokenTracker utility | 10 min | Tracking works |
| 1.3.1 | Set up GitHub Actions CI | 10 min | CI runs |
| 1.3.2 | Configure Turborepo | 5 min | `turbo build` works |
| 1.3.3 | Create package stubs | 5 min | All packages init |

#### Completion Checklist

```bash
# Verify Epic 1 complete
pnpm install
pnpm build
pnpm test
pnpm lint

# If all pass, move to next epic
.forge/agent-bootstrap.sh next-epic
```

### Week 1-2: Epic 2 - Answer Contract (Days 4-7)

**Goal:** Define the contract schema system and validators.

**Success Criteria:** `01_ANSWER_CONTRACT.md` (AC-01 → AC-10)

#### Key Deliverables

- `@forge/answer-contract` package
- JSON Schema for contracts
- YAML/JSON parser
- Validator registry (JSON Schema, TypeScript, regex, LLM-Judge skeleton)
- Built-in templates

#### Tasks

| Task | Description | Success Criteria |
|------|-------------|------------------|
| 2.1.1 | Create package structure | — |
| 2.1.2 | Define core TypeScript types | AC-01, AC-02 |
| 2.1.3 | Create JSON Schema | AC-01 |
| 2.1.4 | Implement YAML/JSON parser | — |
| 2.2.1 | Create Validator interface | — |
| 2.2.2 | JSON Schema validator | AC-03 |
| 2.2.3 | TypeScript compiler validator | — |
| 2.2.4 | Regex validator | — |
| 2.2.5 | LLM-Judge skeleton | AC-06 |
| 2.2.6 | Composite validator | — |
| 2.2.7 | Validator factory | — |
| 2.3.x | Templates and registry | — |

#### Verification

```bash
# Validate schema
npx ajv validate -s forge-success-criteria/schemas/answer-contract.schema.json -d test-contract.json

# Run acceptance tests
pnpm test:acceptance --criteria=AC-01,AC-02,AC-03,AC-06
```

### Week 2: Epic 3 - FORGE C Core (Days 8-12)

**Goal:** Build the main orchestrator and MCP server.

**Success Criteria:** `04_QUALITATIVE_VALIDATION.md` (QV-01 → QV-10)

#### Key Deliverables

- `@forge/forge-c` package
- ForgeC main class
- LLM Provider interface + Anthropic implementation
- Plugin system (logging, metrics, cost limiter)
- MCP server with `forge_converge`, `forge_validate`, `forge_status` tools

---

## 8. Phase 2: Convergence Engine

### Week 2-3: Epic 3.75 - Code Execution (Days 13-15) ⚠️ SECURITY CRITICAL

**Goal:** Safe code execution sandbox with PII/secret protection.

**Success Criteria:** `09_DATA_PROTECTION.md` (DP-01 → DP-10)

#### Critical Requirements

| Criterion | Requirement | Threshold |
|-----------|-------------|-----------|
| DP-09 | PII recall | ≥ 99% |
| DP-10 | Secret recall | 100% (zero false negatives) |

#### Key Deliverables

- Node.js VM sandbox with timeout
- Virtual filesystem
- Privacy filter (email, phone, SSN, credit card, IP patterns)
- Secret detection (AWS keys, API tokens, JWT, private keys)
- CARS risk assessment integration
- Audit logger

#### Verification

```bash
# MUST pass before proceeding
pnpm test:acceptance --criteria=DP-01,DP-02,DP-09,DP-10
pnpm test:security --cars
```

### Week 3-4: Epic 4 - Convergence Engine (Days 16-21)

**Goal:** Implement the generate → validate → repair loop.

**Success Criteria:** `05_CONVERGENCE_ENGINE.md` (CE-01 → CE-11)

#### Critical Requirements

| Criterion | Requirement |
|-----------|-------------|
| CE-01 | max_iterations enforced |
| CE-03 | Stop when target_score achieved |
| CE-04 | Stagnation detection |
| CE-05 | Layers run in order (1→2→3) |
| CE-06 | Early termination if Layer 1 fails |
| CE-07 | Repair prompts with specific errors |
| CE-10 | P95 latency < 120 seconds |
| CE-11 | **Explicit reflection before repair** |

#### Repair Prompt Template (CE-07 + CE-11)

```markdown
The previous output failed validation. Please fix the following issues:

## Validation Errors

### Error 1: STRUCTURAL at `$.stories[2].acceptance_criteria`
- **Found:** empty array []
- **Expected:** 2-10 acceptance criteria per story
- **Contract Rule:** minItems: 2, maxItems: 10

## Reflection (REQUIRED - CE-11)

Before attempting a fix, analyze each error:
1. What assumption did you make that was wrong?
2. What information were you missing?
3. What pattern should you follow instead?

## Instructions
1. Provide your analysis FIRST
2. Then produce the complete corrected output
```

#### Verification

```bash
pnpm test:acceptance --criteria=CE-01,CE-02,CE-03,CE-04,CE-05,CE-06,CE-07,CE-08,CE-09,CE-10,CE-11
pnpm test:benchmark --p95-latency=120000
```

---

## 9. Phase 3: Domain Generators

### Week 4-5: Epic 5 - Figma Parser (Days 22-26)

**Goal:** Parse Figma designs into intermediate representation.

#### Key Deliverables

- Figma API client
- Document parser
- Component hierarchy extraction
- Design tokens (colors, typography)
- Auto-layout conversion

### Week 5-6: Epic 6 - React Generator (Days 27-31)

**Goal:** Generate React components from Figma IR.

#### Key Deliverables

- Template system
- Functional component generator
- TypeScript props generator
- Tailwind CSS conversion
- Accessibility attributes
- Storybook stories

### Week 6-7: Epic 7 - Test Generation (Days 32-35)

**Goal:** Generate test suites from contracts.

**Success Criteria:** `08_RUBRIC_LIBRARY.md` (RL-01 → RL-10)

#### Key Deliverables

- Test template types
- Function test generator
- Component test generator (React Testing Library)
- API endpoint test generator
- Coverage validator

### Week 7: Epic 8 - Evidence Packs (Days 36-38) ⚠️ COMPLIANCE CRITICAL

**Goal:** Generate audit artifacts for compliance.

**Success Criteria:** `06_EVIDENCE_PACK.md` (EP-01 → EP-10)

#### Critical Requirements

| Criterion | Requirement |
|-----------|-------------|
| EP-01 | Complete iteration history |
| EP-05 | Output hash (SHA256) |
| EP-06 | ISO8601 timestamps |
| EP-07 | HMAC-SHA256 integrity signature |
| EP-08 | JSON serializable round-trip |

#### Schema Validation

```bash
# Types MUST match schema exactly
npx ajv validate -s forge-success-criteria/schemas/evidence-pack.schema.json -d test-pack.json
```

---

## 10. Phase 4: Compliance & Infrastructure

### Week 8-9: Epic 9 - Infrastructure (Days 39-43)

**Goal:** Deployment configurations and observability.

**Success Criteria:** `11_OBSERVABILITY.md` (OB-01 → OB-11)

#### Key Deliverables

- Dockerfile and docker-compose
- Kubernetes manifests
- Helm chart
- AWS/GCP/Azure templates
- Prometheus metrics export
- Grafana dashboards:
  - Overview Dashboard
  - Convergence Dashboard (+ reflection metrics)
  - Quality Dashboard
  - Cost Dashboard

#### Reflection Metrics (OB-11)

| Metric | Target |
|--------|--------|
| `reflection.improvement_rate` | ≥ 70% |
| `reflection.thrashing_rate` | ≤ 20% |

---

## 11. Phase 5: Platform & Integration

### Week 9-10: Epic 10a - Platform UI Core (Days 44-47)

**Goal:** Next.js dashboard foundation.

**Success Criteria:** `12_HUMAN_REVIEW.md` (HR-01 → HR-10)

#### Key Deliverables

- Next.js 14 app with App Router
- Tailwind + shadcn/ui
- App shell and navigation
- Dashboard page
- Contract editor
- Settings page

### Week 10: Epic 10b - Platform UI Features (Days 48-51)

**Goal:** Real-time monitoring and auth.

#### Key Deliverables

- Execution monitor
- Iteration viewer with scores
- WebSocket live updates
- Authentication
- RBAC (role-based access control)

### Week 10-11: Epic 11 - Integrations (Days 52-56)

**Goal:** Third-party integrations.

**Success Criteria:** `10_ORCHESTRATION.md` (OR-01 → OR-10)

#### Key Deliverables

- GitHub PR creation
- GitHub Actions integration
- Jira integration
- Linear integration
- Slack/Teams notifications
- Webhook system
- CLI tool

### Week 11-12: Epic 12 - E2E Testing (Days 57-61)

**Goal:** Full system validation.

**Success Criteria:** ALL COMPONENTS

#### Key Deliverables

- Playwright E2E tests
- Contract creation flow test
- Execution flow test
- API endpoint tests
- Load testing (P95 < 120s)
- Security testing (all DP-* criteria)

#### Final Verification

```bash
# Run ALL 122 acceptance tests
pnpm test:acceptance --all

# Generate compliance report
pnpm test:compliance --output=evidence-pack

# Performance benchmark
pnpm test:benchmark --all
```

---

## 12. Success Criteria Framework

### Framework Structure

```
forge-success-criteria/
├── 00_MASTER_ROADMAP.md      # Navigation hub (READ FIRST)
├── 01-12_*.md                # Component specifications
├── schemas/                  # JSON Schemas (canonical)
├── templates/                # YAML templates
└── examples/                 # Example contracts
```

### Component → Criteria Mapping

| Component | File | Criteria Count |
|-----------|------|----------------|
| Answer Contract | 01_ANSWER_CONTRACT.md | 10 (AC-01→AC-10) |
| Structural Validation | 02_STRUCTURAL_VALIDATION.md | 10 (SV-01→SV-10) |
| Semantic Validation | 03_SEMANTIC_VALIDATION.md | 10 (SEM-01→SEM-10) |
| Qualitative Validation | 04_QUALITATIVE_VALIDATION.md | 10 (QV-01→QV-10) |
| Convergence Engine | 05_CONVERGENCE_ENGINE.md | 11 (CE-01→CE-11) |
| Evidence Pack | 06_EVIDENCE_PACK.md | 10 (EP-01→EP-10) |
| Rule System | 07_RULE_SYSTEM.md | 10 (RS-01→RS-10) |
| Rubric Library | 08_RUBRIC_LIBRARY.md | 10 (RL-01→RL-10) |
| Data Protection | 09_DATA_PROTECTION.md | 10 (DP-01→DP-10) |
| Orchestration | 10_ORCHESTRATION.md | 10 (OR-01→OR-10) |
| Observability | 11_OBSERVABILITY.md | 11 (OB-01→OB-11) |
| Human Review | 12_HUMAN_REVIEW.md | 10 (HR-01→HR-10) |
| **TOTAL** | | **122 criteria** |

### Running Acceptance Tests

```bash
# Single criterion
pnpm test:acceptance --criteria=CE-11

# Multiple criteria
pnpm test:acceptance --criteria=CE-01,CE-02,CE-03

# All criteria for a component
pnpm test:acceptance --component=convergence-engine

# All criteria
pnpm test:acceptance --all
```

### Schema Validation

```bash
# Answer Contract
npx ajv validate -s forge-success-criteria/schemas/answer-contract.schema.json -d contract.json

# Evidence Pack
npx ajv validate -s forge-success-criteria/schemas/evidence-pack.schema.json -d evidence.json

# Rubric
npx ajv validate -s forge-success-criteria/schemas/rubric.schema.json -d rubric.json
```

---

## 13. Daily Workflow

### Morning Startup

```bash
# 1. Pull latest changes
git pull origin main

# 2. Check current state
.forge/agent-bootstrap.sh progress

# 3. See next task
.forge/agent-bootstrap.sh task
```

### Task Execution (per task)

```bash
# 1. Start fresh Claude Code session
claude code

# 2. In session, give this prompt:
> Read .forge/progress.md for current state.
> Read the current TASKS.md file.
> Complete ONLY task X.Y.Z.
> Update progress.md when done.

# 3. Let Claude complete the task

# 4. Verify
pnpm build && pnpm test

# 5. If task has Success Criteria
.forge/agent-bootstrap.sh verify-criteria

# 6. Commit
git add .
git commit -m "Task X.Y.Z: [description] [SC: XX-01]"

# 7. EXIT session (do not continue to next task)
```

### End of Day

```bash
# Push changes
git push origin main

# Check progress
.forge/agent-bootstrap.sh progress

# Note next task for tomorrow
```

### End of Epic

```bash
# 1. Verify all tasks complete
grep -c "\[x\]" .forge/epics/epic-XX/TASKS.md

# 2. Verify Success Criteria
.forge/agent-bootstrap.sh verify-criteria

# 3. Write COMPLETION.md
# Document: what was built, key files, patterns learned

# 4. Move to next epic
.forge/agent-bootstrap.sh next-epic

# 5. Tag release (if applicable)
git tag -a epic-XX-complete -m "Epic XX complete"
git push --tags
```

---

## 14. Troubleshooting

### Build Failures

```bash
# Check what changed
git diff HEAD~3

# Run diagnostics
pnpm build --verbose 2>&1 | head -50

# If stuck, rollback
git reset --hard HEAD~1
```

### Success Criteria Failures

```bash
# Run specific criterion
pnpm test:acceptance --criteria=XX-01 --verbose

# Check criterion definition
cat forge-success-criteria/XX_COMPONENT.md | grep "XX-01" -A 20

# Verify against schema
npx ajv validate -s forge-success-criteria/schemas/[schema].json -d output.json --verbose
```

### Context Exhaustion (Claude Code)

If Claude starts making mistakes or forgetting context:

1. **STOP** immediately
2. Document current state in progress.md
3. Commit partial work: `git commit -m "WIP: Task X.Y.Z - partial"`
4. **EXIT** session
5. Start **fresh** session to continue

### AWS Bedrock Issues

```bash
# Check model access
aws bedrock list-foundation-models --query "modelSummaries[?providerName=='Anthropic']"

# Check quotas
aws service-quotas get-service-quota \
  --service-code bedrock \
  --quota-code L-XXXXXXXX

# Request quota increase if needed
aws service-quotas request-service-quota-increase \
  --service-code bedrock \
  --quota-code L-XXXXXXXX \
  --desired-value 100
```

---

## 15. Appendix

### A. Key Research References

| Paper/Talk | Insight | FORGE Implementation |
|------------|---------|---------------------|
| Ng (2024) "Opportunities in AI" | Agentic workflows beat zero-shot | Convergence Engine |
| Ng (2024) | Reflection is gold standard | CE-11 explicit reflection |
| Ng (2024) | Tool use over knowledge | Layer 1-2 deterministic |
| Liu et al. (2023) "Lost in the Middle" | Accuracy degrades at 30K+ tokens | True Ralph Loop |

### B. Compliance Mapping

| Framework | FORGE Components | Evidence |
|-----------|------------------|----------|
| SOC 2 Type II | 06, 09, 11 | Evidence Packs, Audit Logs |
| CMMC 2.0 | 09, 11 | Data Protection, Observability |
| NIST AI RMF | 04, 05, 11 | LLM-Judge, Convergence, Metrics |
| EU AI Act | 06, 12 | Evidence Packs, Human Review |
| DCMA/DFARS | 06, 09 | Evidence Packs, Data Protection |

### C. Package Dependencies

```
@forge/core
├── (no internal deps)

@forge/answer-contract
├── @forge/core

@forge/forge-c
├── @forge/core
├── @forge/answer-contract

@forge/convergence
├── @forge/core
├── @forge/answer-contract
├── @forge/forge-c

@forge/code-execution
├── @forge/core

@forge/evidence-pack
├── @forge/core
├── @forge/convergence

@forge/platform-ui
├── @forge/core
├── @forge/answer-contract
├── @forge/convergence
├── @forge/evidence-pack
```

### D. Environment Variables

```bash
# AWS Bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Claude Code
CLAUDE_PROVIDER=bedrock
CLAUDE_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0

# Application
NODE_ENV=development
LOG_LEVEL=debug
FORGE_MAX_ITERATIONS=10
FORGE_TARGET_SCORE=0.90
FORGE_TOKEN_BUDGET=100000

# Observability
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# Database (if applicable)
DATABASE_URL=postgresql://localhost:5432/forge
```

### E. Useful Commands Reference

```bash
# Build
pnpm build                    # Build all packages
pnpm build --filter=@forge/core  # Build single package
turbo build                   # Build with caching

# Test
pnpm test                     # Run all tests
pnpm test:unit                # Unit tests only
pnpm test:integration         # Integration tests
pnpm test:e2e                 # E2E tests
pnpm test:acceptance --all    # Success Criteria tests

# Lint
pnpm lint                     # Lint all
pnpm lint:fix                 # Auto-fix

# Development
pnpm dev                      # Start dev server
pnpm dev:ui                   # Start UI only

# Bootstrap
.forge/agent-bootstrap.sh task           # Current task
.forge/agent-bootstrap.sh progress       # Progress summary
.forge/agent-bootstrap.sh verify-criteria # Verify Success Criteria
.forge/agent-bootstrap.sh next-epic      # Move to next epic
.forge/agent-bootstrap.sh alignment      # Show criteria alignment
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-18 | Initial roadmap |

---

*This document is the authoritative build guide for FORGE B-D Platform.*  
*For questions, contact the ArcFoundry team.*
