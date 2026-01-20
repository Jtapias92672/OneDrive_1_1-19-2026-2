# Epic 9: Infrastructure Deployment - Atomic Task Breakdown

**Total Tasks:** 10 | **Tokens:** 60K | **Time:** 5 days

---

## Phase 9.1: Package Setup

### Task 9.1.1: Create infrastructure package structure
**Files:** package.json, tsconfig.json, src/index.ts
**Criteria:** Package builds, AWS CDK installed

---

## Phase 9.2: CDK Stack Generation

### Task 9.2.1: Create CDKGenerator class
**Files:** src/generators/cdk.ts
**Criteria:** Generates TypeScript CDK code

### Task 9.2.2: Create StaticAssetsStack (S3 + CloudFront)
**Files:** src/stacks/static-assets.ts
**Criteria:** Frontend hosting stack

### Task 9.2.3: Create ApiStack (ECS Fargate or Lambda)
**Files:** src/stacks/api.ts
**Criteria:** Backend hosting stack

### Task 9.2.4: Create DatabaseStack (RDS PostgreSQL)
**Files:** src/stacks/database.ts
**Criteria:** Database with secrets management

---

## Phase 9.3: Docker & CI/CD

### Task 9.3.1: Create DockerfileGenerator
**Files:** src/generators/dockerfile.ts
**Criteria:** Frontend and backend Dockerfiles

### Task 9.3.2: Create GitHubActionsGenerator
**Files:** src/generators/github-actions.ts
**Criteria:** CI/CD workflow for deploy

---

## Phase 9.4: Deployment Execution

### Task 9.4.1: Create DeploymentExecutor
**Files:** src/executor.ts
**Criteria:** Runs CDK deploy, streams progress

### Task 9.4.2: Create MonitoringGenerator (CloudWatch)
**Files:** src/monitoring/index.ts
**Criteria:** Alarms, dashboard, health checks

### Task 9.4.3: Export package and test deployment
**Files:** src/index.ts, __tests__/deploy.test.ts
**Criteria:** All APIs exported, dry-run works

---

## Completion Checklist
- [ ] CDK stacks generate correctly
- [ ] Dockerfiles work
- [ ] CI/CD pipeline works
- [ ] Deployment executor runs
