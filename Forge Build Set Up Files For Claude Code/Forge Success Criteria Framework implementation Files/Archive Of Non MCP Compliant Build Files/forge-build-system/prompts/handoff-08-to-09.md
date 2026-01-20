# Epic 9 Initialization: Infrastructure Deployment

**Read Time:** 2 minutes | **Context Load:** ~6K tokens

---

## What Was Built (Epic 8: Evidence Packs)

- ✅ **Evidence Collector**: Gathers validation + test results
- ✅ **Evidence Pack Generator**: Creates structured JSON
- ✅ **Compliance Mapper**: CMMC, SOC2, OWASP mappings
- ✅ **Report Exporters**: PDF, Markdown, ZIP
- ✅ **Integrity Verification**: SHA-256 hashes

---

## Context Shift: Infrastructure

You're moving from **documentation** to **deployment**.

Epic 8 was about proving compliance.
Epic 9 is about deploying to AWS.

**These are INDEPENDENT.** Evidence packs are for auditors. Infrastructure is for operations.

---

## What Exists (From Earlier Epics)

```
/frontend (Epic 6)
├── src/components/     # React components
├── src/pages/          # Page components
└── package.json

/backend (Epic 3)
├── src/routes/         # Express routes
├── src/middleware/     # Auth, RBAC
├── prisma/schema.prisma
└── package.json
```

**You don't need to see this code.** You're generating infrastructure to DEPLOY it.

---

## Your Mission (Epic 9)

Build **Infrastructure as Code** for AWS deployment:
- Terraform/CDK modules (VPC, RDS, ECS, ALB, S3, CloudFront)
- Docker containers (frontend, backend)
- CI/CD pipelines (GitHub Actions)
- Monitoring (CloudWatch)

---

## DO NOT

- ❌ Load generated frontend/backend code (not needed)
- ❌ Modify React or Express code
- ❌ Load evidence packs (not relevant)
- ❌ Generate massive single Terraform files
- ❌ Stay in session longer than ONE task

---

## DO

- ✅ Create `packages/infrastructure/` package
- ✅ Generate modular Terraform (one resource type per file)
- ✅ Generate Dockerfiles for frontend + backend
- ✅ Generate GitHub Actions workflows
- ✅ Generate CloudWatch alarms
- ✅ ONE task per session, then EXIT

---

## Token Budget

- **Per-task:** 5-8K tokens
- **Epic total:** 60K tokens across ~10 tasks

---

## First Steps

1. Read: `.forge/epics/epic-09-infrastructure/TASKS.md`
2. Start: Task 9.1.1 (Create CDKGenerator class skeleton)
3. Update: `progress.md` when task complete
4. EXIT session

---

## What You Know (From Contract)

```yaml
frontend:
  framework: "react"
  language: "typescript"

backend:
  framework: "express"
  language: "typescript"
  database: "postgresql"

infrastructure:
  cloud_provider: "aws"
  region: "us-east-1"
  environments: ["dev", "staging"]
```

That's ALL you need. Don't load actual code.

---

## Infrastructure Architecture

```
┌─────────────────────────────────────────┐
│            PUBLIC INTERNET              │
└────────────────────┬────────────────────┘
                     │
                     ▼
              ┌─────────────┐
              │  CloudFront │  (CDN)
              └──────┬──────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│   S3 Bucket   │         │      ALB      │
│  (Frontend)   │         │   (HTTPS)     │
└───────────────┘         └───────┬───────┘
                                  │
                                  ▼
                          ┌───────────────┐
                          │  ECS Fargate  │
                          │   (Backend)   │
                          └───────┬───────┘
                                  │
                                  ▼
                          ┌───────────────┐
                          │  RDS Postgres │
                          │  (Multi-AZ)   │
                          └───────────────┘
```

---

## Modular Generation Pattern

```typescript
// ❌ BAD: One massive file
function generateInfra(): string {
  return `${vpc}${subnets}${rds}${ecs}${alb}...`;  // 80K tokens
}

// ✅ GOOD: Modular files
function* generateTerraformModules(): Generator<TerraformModule> {
  yield { filename: 'vpc.tf', content: generateVPC() };      // 5K
  yield { filename: 'rds.tf', content: generateRDS() };      // 6K
  yield { filename: 'ecs.tf', content: generateECS() };      // 7K
  yield { filename: 'alb.tf', content: generateALB() };      // 5K
}
```

---

## What Epic 10 Needs From You

```typescript
import { 
  CDKGenerator,
  DeploymentExecutor,
  DeploymentResult
} from '@forge/infrastructure';

// Trigger deployment from UI
const executor = new DeploymentExecutor();
const result = await executor.deploy('staging');
```
