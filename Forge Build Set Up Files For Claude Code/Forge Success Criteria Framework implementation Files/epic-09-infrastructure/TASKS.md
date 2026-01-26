# Epic 9: Infrastructure - Atomic Task Breakdown

**Token Budget:** 55K (LIMIT: 55K) ⚠️ AT LIMIT  
**Tasks:** 12  
**Estimated Time:** 5 days  
**Dependencies:** Epic 2 (Answer Contract)

---

## Overview

Epic 9 implements deployment infrastructure including Docker containers, Kubernetes manifests, Helm charts, and cloud deployment templates for AWS, GCP, and Azure.

---

## Phase 9.1: Package Setup

### Task 9.1.1: Create infrastructure package structure

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/infrastructure/src/docker/index.ts`
- `packages/infrastructure/src/kubernetes/index.ts`
- `packages/infrastructure/src/cloud/index.ts`

**Done When:** Package structure created

---

### Task 9.1.2: Define infrastructure types

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/infrastructure/src/types.ts`

**Key Types:** DeploymentConfig, ResourceSpec, ServiceDefinition

**Done When:** Types compile correctly

---

## Phase 9.2: Containerization

### Task 9.2.1: Create Dockerfile

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/infrastructure/docker/Dockerfile`
- `packages/infrastructure/docker/Dockerfile.dev`

**Features:** Multi-stage build, production optimizations

**Done When:** Docker builds successfully

---

### Task 9.2.2: Create docker-compose

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/infrastructure/docker/docker-compose.yml`
- `packages/infrastructure/docker/docker-compose.dev.yml`

**Features:** Service orchestration, networking, volumes

**Done When:** Compose runs all services

---

### Task 9.2.3: Create environment config

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/infrastructure/config/.env.example`
- `packages/infrastructure/src/config/env-loader.ts`

**Features:** Environment variable management

**Done When:** Config loading works

---

## Phase 9.3: Kubernetes

### Task 9.3.1: Create K8s manifests

**Time:** 5 minutes | **Tokens:** ~5K

**Files to CREATE:**
- `packages/infrastructure/kubernetes/deployment.yaml`
- `packages/infrastructure/kubernetes/service.yaml`
- `packages/infrastructure/kubernetes/configmap.yaml`

**Done When:** Manifests apply to K8s

---

### Task 9.3.2: Create Helm chart

**Time:** 5 minutes | **Tokens:** ~5K

**Files to CREATE:**
- `packages/infrastructure/helm/Chart.yaml`
- `packages/infrastructure/helm/values.yaml`
- `packages/infrastructure/helm/templates/deployment.yaml`

**Done When:** Helm chart installs

---

### Task 9.3.3: Implement secrets management

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/infrastructure/kubernetes/secrets.yaml`
- `packages/infrastructure/src/secrets/manager.ts`

**Features:** K8s secrets, external secrets operator

**Done When:** Secrets managed securely

---

## Phase 9.4: Cloud Deployment

### Task 9.4.1: Create AWS templates

**Time:** 5 minutes | **Tokens:** ~5K

**Files to CREATE:**
- `packages/infrastructure/aws/cloudformation.yaml`
- `packages/infrastructure/aws/ecs-task.json`

**Features:** ECS, RDS, ElastiCache resources

**Done When:** AWS templates valid

---

### Task 9.4.2: Create GCP templates

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/infrastructure/gcp/cloudbuild.yaml`
- `packages/infrastructure/gcp/cloud-run.yaml`

**Features:** Cloud Run, Cloud SQL

**Done When:** GCP templates valid

---

### Task 9.4.3: Create Azure templates

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/infrastructure/azure/arm-template.json`
- `packages/infrastructure/azure/container-apps.yaml`

**Features:** Container Apps, Azure SQL

**Done When:** Azure templates valid

---

### Task 9.4.4: Create CI/CD pipeline

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/infrastructure/ci/github-actions-deploy.yml`
- `packages/infrastructure/src/index.ts`

**Features:** Build, test, deploy pipeline

**Done When:** All exports work from @forge/infrastructure

---

## Epic 9 Completion Checklist

- [ ] All 12 tasks complete
- [ ] Docker builds work
- [ ] K8s manifests apply
- [ ] Helm chart installs
- [ ] All cloud templates valid
- [ ] CI/CD pipeline complete

**Next:** Epic 10a - Platform UI Core
