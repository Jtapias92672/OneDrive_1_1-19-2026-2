# Epic 10 Initialization: Platform UI Dashboard

**Read Time:** 2 minutes | **Context Load:** ~10K tokens

---

## What Was Built (Epic 9: Infrastructure)

- ✅ **CDK Generator**: AWS infrastructure as code
- ✅ **Terraform Modules**: VPC, RDS, ECS, ALB, S3, CloudFront
- ✅ **Dockerfiles**: Frontend and backend containers
- ✅ **CI/CD Pipelines**: GitHub Actions for deploy
- ✅ **Deployment Executor**: Programmatic deployment trigger

---

## Context Shift: User Interface

Epics 1-9 built the **GENERATION ENGINE**.
Epic 10 builds the **USER INTERFACE** for it.

You're building the web app where users:
- Create projects
- Upload Figma designs
- Trigger generation
- View evidence packs
- Deploy applications

---

## Key Imports Available

```typescript
// From Epic 2: Contract management
import { ContractLoader, TemplateRegistry } from '@forge/answer-contract';

// From Epic 3: Generation orchestration
import { ForgeC } from '@forge/forge-c';

// From Epic 5: Figma parsing
import { FigmaParser } from '@forge/figma-parser';

// From Epic 6: React generation
import { ReactGenerator } from '@forge/react-generator';

// From Epic 8: Evidence packs
import { EvidencePackGenerator, exportToPDF } from '@forge/evidence-pack';

// From Epic 9: Deployment
import { DeploymentExecutor } from '@forge/infrastructure';
```

---

## Your Mission (Epic 10)

Build the **FORGE Platform UI** - a Next.js web application:
- Project management (CRUD)
- Generation wizard (Figma → Code → Deploy)
- Evidence pack viewer
- Deployment dashboard
- User authentication

---

## DO NOT

- ❌ Re-implement any engine functionality (import it)
- ❌ Build complex state management (use TanStack Query)
- ❌ Create custom component library (use shadcn/ui)
- ❌ Build all pages in one session
- ❌ Stay in session longer than ONE task

---

## DO

- ✅ Create `packages/platform-ui/` (Next.js 14)
- ✅ Use App Router architecture
- ✅ Use shadcn/ui + Tailwind for styling
- ✅ Use TanStack Query for server state
- ✅ Build ONE page/feature per task
- ✅ ONE task per session, then EXIT

---

## Token Budget

- **Per-task:** 4-6K tokens
- **Epic total:** 50K tokens across ~12 tasks

---

## First Steps

1. Read: `.forge/epics/epic-10-platform-ui/TASKS.md`
2. Start: Task 10.1.1 (Initialize Next.js app)
3. Update: `progress.md` when task complete
4. EXIT session

---

## Application Structure

```
packages/platform-ui/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Dashboard
│   │   ├── projects/
│   │   │   ├── page.tsx         # Project list
│   │   │   └── [id]/page.tsx    # Project detail
│   │   ├── generate/
│   │   │   └── page.tsx         # Generation wizard
│   │   ├── evidence/
│   │   │   └── [id]/page.tsx    # Evidence viewer
│   │   └── deploy/
│   │       └── page.tsx         # Deployment UI
│   ├── components/
│   │   ├── ui/                  # shadcn/ui
│   │   ├── Sidebar.tsx
│   │   ├── ProjectCard.tsx
│   │   └── GenerationWizard.tsx
│   └── lib/
│       ├── api.ts               # API client
│       └── forge.ts             # Engine imports
└── package.json
```

---

## Page Responsibilities

| Page | Purpose | Key Imports |
|------|---------|-------------|
| `/` | Dashboard | Metrics, recent activity |
| `/projects` | Project list | CRUD operations |
| `/generate` | Wizard | FigmaParser, ForgeC, ReactGenerator |
| `/evidence/[id]` | Evidence viewer | EvidencePackGenerator |
| `/deploy` | Deployment | DeploymentExecutor |

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query (server), Zustand (client)
- **Auth**: NextAuth.js
- **Charts**: Recharts

---

## What Epic 11 Needs From You

Platform UI provides the shell. Epic 11 adds external integrations:
- Figma OAuth
- GitHub repo creation
- Slack notifications
