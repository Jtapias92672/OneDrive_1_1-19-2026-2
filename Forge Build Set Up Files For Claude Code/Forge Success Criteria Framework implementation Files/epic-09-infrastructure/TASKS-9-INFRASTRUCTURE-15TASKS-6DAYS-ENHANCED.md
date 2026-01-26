# Epic 9: Infrastructure - Atomic Task Breakdown (ENHANCED)

**Token Budget:** 60K (was 55K, +5K for Lambda)  
**Tasks:** 15 (was 12, +3 Lambda tasks)  
**Estimated Time:** 6 days (was 5, +1 day for Lambda)  
**Dependencies:** Epic 2 (Answer Contract)

---

## CHANGELOG (Jan 2025)

| Change | Reason | Source |
|--------|--------|--------|
| +Task 9.4.5 | Lambda Function Module | AWS EC2 + Bedrock + Lambda target stack |
| +Task 9.4.6 | Lambda + Bedrock Integration | FORGE convergence workers |
| +Task 9.4.7 | Lambda CI/CD Pipeline | Automated deployment |
| +5K tokens | Lambda module implementation | ArcFoundry requirements |
| +1 day | Lambda integration testing | Production readiness |

---

## Target Stack: AWS EC2 + Bedrock + Lambda

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS FORGE Stack                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   EKS/EC2    │  │   Lambda     │  │   Bedrock    │      │
│  │   Cluster    │  │   Functions  │  │   Claude     │      │
│  │              │  │              │  │   Models     │      │
│  │  - Platform  │  │  - Workers   │  │  - Sonnet    │      │
│  │  - API       │  │  - Parsers   │  │  - Haiku     │      │
│  │  - UI        │  │  - Converge  │  │  - Opus      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              VPC Private Subnets                      │  │
│  │  - VPC Endpoints (Bedrock, S3, ECR)                  │  │
│  │  - Security Groups (least privilege)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     RDS      │  │ ElastiCache  │  │      S3      │      │
│  │  PostgreSQL  │  │    Redis     │  │   Artifacts  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Overview

Epic 9 implements deployment infrastructure including:
- Docker containers and Kubernetes (EKS on EC2)
- **Lambda functions with Bedrock integration (NEW)**
- Helm charts for FORGE platform
- Cloud deployment templates for AWS (primary), GCP, Azure
- CI/CD pipelines for all deployment targets

---

## Phase 9.1: Package Setup

### Task 9.1.1: Create infrastructure package structure

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/infrastructure/src/docker/index.ts`
- `packages/infrastructure/src/kubernetes/index.ts`
- `packages/infrastructure/src/cloud/index.ts`
- `packages/infrastructure/src/lambda/index.ts` (NEW)

**Done When:** Package structure created

---

### Task 9.1.2: Define infrastructure types

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/infrastructure/src/types.ts`

**Key Types:** DeploymentConfig, ResourceSpec, ServiceDefinition, **LambdaConfig**

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

## Phase 9.3: Kubernetes (EKS on EC2)

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

### Task 9.4.1: Create AWS templates (ECS/EKS)

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

### Task 9.4.5: Create Lambda Function Module (NEW)

**Time:** 15 minutes | **Tokens:** ~5K

**Files to CREATE:**
- `packages/infrastructure/terraform/modules/lambda/main.tf`
- `packages/infrastructure/terraform/modules/lambda/variables.tf`
- `packages/infrastructure/terraform/modules/lambda/outputs.tf`

**Features:**
- Lambda function deployment with VPC support
- Bedrock model invocation permissions
- API Gateway integration
- CloudWatch logging and X-Ray tracing
- Dead letter queue configuration
- Provisioned concurrency for FORGE workers

**Code (main.tf excerpt):**
```hcl
resource "aws_lambda_function" "forge_function" {
  function_name = local.function_name
  role          = aws_iam_role.lambda_execution.arn
  handler       = var.handler
  runtime       = var.runtime
  timeout       = var.timeout
  memory_size   = var.memory_size
  architectures = [var.architecture]
  
  environment {
    variables = merge(var.environment_variables, {
      FORGE_ENVIRONMENT = var.environment
      BEDROCK_ENABLED   = var.enable_bedrock ? "true" : "false"
    })
  }
  
  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = [aws_security_group.lambda[0].id]
    }
  }
}
```

**Verification:**
```bash
cd packages/infrastructure/terraform/modules/lambda
terraform init
terraform validate
```

**Done When:** Lambda module passes validation

---

### Task 9.4.6: Lambda + Bedrock Integration (NEW)

**Time:** 10 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/infrastructure/terraform/environments/prod/lambda.tf`
- `packages/infrastructure/lambda/forge-worker/index.ts`
- `packages/infrastructure/lambda/forge-worker/package.json`

**Features:**
- FORGE worker Lambda invoking Claude on Bedrock
- Private VPC deployment with Bedrock endpoints
- IAM least-privilege for model invocation
- Environment-specific configurations

**Code (lambda.tf excerpt):**
```hcl
module "forge_worker" {
  source = "../../modules/lambda"
  
  name            = "forge-worker"
  environment     = var.environment
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 300  # 5 minutes for convergence
  memory_size     = 1024
  
  enable_bedrock  = true
  bedrock_model_arns = [
    "arn:aws:bedrock:${var.region}::foundation-model/anthropic.claude-3-5-sonnet-*"
  ]
  
  vpc_config = {
    vpc_id                  = module.vpc.vpc_id
    subnet_ids              = module.vpc.private_subnet_ids
    allowed_security_groups = [module.eks.cluster_security_group_id]
  }
  
  forge_component = "convergence-engine"
  
  tags = local.common_tags
}
```

**Verification:**
```bash
terraform plan -target=module.forge_worker
```

**Done When:** Lambda deploys with Bedrock permissions

---

### Task 9.4.7: Lambda CI/CD Pipeline (NEW)

**Time:** 10 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/infrastructure/ci/github-actions-lambda.yml`
- `packages/infrastructure/scripts/deploy-lambda.sh`

**Features:**
- Build Lambda deployment packages
- Upload to S3
- Update Lambda function code
- Run smoke tests
- Rollback on failure

**Code (.github/workflows/deploy-lambda.yml):**
```yaml
name: Deploy FORGE Lambda Functions

on:
  push:
    branches: [main]
    paths:
      - 'packages/infrastructure/lambda/**'
      - 'packages/infrastructure/terraform/modules/lambda/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Build Lambda Package
        run: |
          cd packages/infrastructure/lambda/forge-worker
          npm ci --production
          zip -r ../forge-worker.zip .
          
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE }}
          aws-region: us-east-1
          
      - name: Deploy to AWS Lambda
        run: |
          aws s3 cp packages/infrastructure/lambda/forge-worker.zip \
            s3://${{ secrets.LAMBDA_BUCKET }}/forge-worker/forge-worker.zip
          aws lambda update-function-code \
            --function-name forge-worker-${{ github.ref_name }} \
            --s3-bucket ${{ secrets.LAMBDA_BUCKET }} \
            --s3-key forge-worker/forge-worker.zip
            
      - name: Smoke Test
        run: |
          aws lambda invoke \
            --function-name forge-worker-${{ github.ref_name }} \
            --payload '{"test": true}' \
            response.json
          cat response.json
```

**Done When:** Lambda CI/CD pipeline deploys successfully

---

## Epic 9 Completion Checklist

- [ ] All 15 tasks complete
- [ ] Docker builds work
- [ ] K8s manifests apply to EKS
- [ ] Helm chart installs
- [ ] All cloud templates valid
- [ ] **Lambda module deploys functions** (NEW)
- [ ] **Lambda has Bedrock permissions** (NEW)
- [ ] **Lambda CI/CD pipeline works** (NEW)
- [ ] CI/CD pipeline complete

---

## Skills Integration (P2 Requirements)

### Required Skills for Epic 9
| Component | Required Skills | Reference |
|-----------|-----------------|-----------|
| Infrastructure | `sevco-infrastructure-library` | /mnt/skills/user/ |
| Security | `cars-framework`, `verification-pillars` | NewSkills_Library.zip |

### Extended Thinking Trigger (MANDATORY)
```
⚠️ QUALITY_FIRST PROFILE REQUIRED
Epic 9 is INFRASTRUCTURE-CRITICAL (production deployment scope)

All prompts for this epic MUST use: "THINK HARDER"
Token budget: 8,000 thinking tokens (QUALITY_FIRST profile)
Keywords present: terraform, lambda, bedrock, deployment
```

---

**Next:** Epic 10a - Platform UI Core
