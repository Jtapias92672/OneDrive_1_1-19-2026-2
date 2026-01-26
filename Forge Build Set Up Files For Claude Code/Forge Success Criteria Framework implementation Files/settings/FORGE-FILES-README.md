# FORGE B-D Platform - Files Reference Guide

**Version:** 1.0  
**Generated:** 2026-01-22  
**Target Stack:** AWS EC2 + Bedrock + Lambda  
**Confidence Level:** 97.3%

---

## Quick Start

### For Claude Code
```bash
# Read epic file and start implementation
cat /mnt/user-data/outputs/settings/forge-epics/TASKS-3.5-GATEWAY-FOUNDATION-17TASKS-6DAYS.md
```

### For Claude Coworker
```
Implement Task 3.5.1.1 from the FORGE epic files in settings/forge-epics/
```

---

## Directory Structure

```
/mnt/user-data/outputs/settings/
│
├── FORGE-FILES-README.md                    ← This file
│
├── forge-epics/                             ← EPIC TASK SPECIFICATIONS
│   ├── EPIC-ENHANCEMENT-SUMMARY.md          ← Changes summary (Jan 2025)
│   ├── TASKS-3.5-GATEWAY-FOUNDATION-17TASKS-6DAYS.md
│   ├── TASKS-3.7-COMPLIANCE-VALIDATION-16TASKS-6DAYS.md
│   ├── TASKS-3.75-CODE-EXECUTION-14TASKS-5DAYS-FIXED.md
│   └── TASKS-9-INFRASTRUCTURE-15TASKS-6DAYS-ENHANCED.md
│
├── forge-infrastructure/                    ← TERRAFORM MODULES
│   └── terraform/
│       └── modules/
│           └── lambda/
│               ├── main.tf                  ← Lambda function resource
│               ├── variables.tf             ← Configuration options
│               └── outputs.tf               ← Integration outputs
│
└── skills/                                  ← SKILLS LIBRARY (existing)
    └── (51+ skills)
```

---

## Epic Files Summary

| Epic | File | Tasks | Days | Tokens | Key Features |
|------|------|-------|------|--------|--------------|
| **3.5** | TASKS-3.5-GATEWAY-FOUNDATION-17TASKS-6DAYS.md | 17 | 6 | 55K | MCP Gateway, CARS, DECEPTIVE_COMPLIANCE, REWARD_HACKING_INDUCED |
| **3.7** | TASKS-3.7-COMPLIANCE-VALIDATION-16TASKS-6DAYS.md | 16 | 6 | 50K | Audit logging, Pillars 9-10, slop-tests CI/CD |
| **3.75** | TASKS-3.75-CODE-EXECUTION-14TASKS-5DAYS-FIXED.md | 14 | 5 | 20K | Deno sandbox, MCP code-first pattern |
| **9** | TASKS-9-INFRASTRUCTURE-15TASKS-6DAYS-ENHANCED.md | 15 | 6 | 60K | Lambda + Bedrock, EKS/EC2, CI/CD |

**Total:** 62 tasks, 23 days, 185K tokens

---

## Lambda Module Specification

### Purpose
Deploy FORGE worker functions on AWS Lambda with Bedrock integration for Claude model invocation.

### Files
| File | Lines | Description |
|------|-------|-------------|
| `main.tf` | ~280 | Lambda function, IAM roles, VPC config, CloudWatch alarms |
| `variables.tf` | ~180 | All configuration options with defaults |
| `outputs.tf` | ~70 | Function ARN, role ARN, integration outputs |

### Key Features
- ✅ Bedrock model invocation (Claude Sonnet, Haiku, Opus)
- ✅ VPC private subnet deployment
- ✅ API Gateway integration
- ✅ X-Ray tracing + CloudWatch logging
- ✅ Dead letter queue for failures
- ✅ Provisioned concurrency for FORGE workers
- ✅ Cost allocation tags

### Usage Example
```hcl
module "forge_worker" {
  source = "./modules/lambda"
  
  name            = "forge-worker"
  environment     = "prod"
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 300
  memory_size     = 1024
  
  enable_bedrock  = true
  bedrock_model_arns = [
    "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-*"
  ]
  
  vpc_config = {
    vpc_id                  = module.vpc.vpc_id
    subnet_ids              = module.vpc.private_subnet_ids
    allowed_security_groups = [module.eks.cluster_security_group_id]
  }
  
  forge_component = "convergence-engine"
}
```

---

## Integration with Local Repository

### Step 1: Download Files

From Claude.ai, download:
- All files from `/mnt/user-data/outputs/settings/forge-epics/`
- All files from `/mnt/user-data/outputs/settings/forge-infrastructure/`

### Step 2: Place in FORGE Repository

```bash
cd forge-build-system

# Epic files → docs
mkdir -p docs/epics
cp ~/Downloads/forge-epics/*.md docs/epics/

# Lambda module → infrastructure
mkdir -p packages/infrastructure/terraform/modules/lambda
cp ~/Downloads/forge-infrastructure/terraform/modules/lambda/*.tf \
   packages/infrastructure/terraform/modules/lambda/

# Verify
ls -la docs/epics/
ls -la packages/infrastructure/terraform/modules/lambda/
```

### Step 3: Final Repository Structure

```
forge-build-system/
├── docs/
│   └── epics/
│       ├── TASKS-3.5-GATEWAY-FOUNDATION-17TASKS-6DAYS.md
│       ├── TASKS-3.7-COMPLIANCE-VALIDATION-16TASKS-6DAYS.md
│       ├── TASKS-3.75-CODE-EXECUTION-14TASKS-5DAYS-FIXED.md
│       └── TASKS-9-INFRASTRUCTURE-15TASKS-6DAYS-ENHANCED.md
│
├── packages/
│   ├── answer-contract/
│   ├── convergence-engine/
│   ├── mcp-gateway/
│   └── infrastructure/
│       └── terraform/
│           └── modules/
│               ├── api-gateway/
│               ├── bedrock/          ← EXISTS
│               ├── eks/
│               ├── lambda/           ← NEW
│               │   ├── main.tf
│               │   ├── variables.tf
│               │   └── outputs.tf
│               ├── rds/
│               ├── s3/
│               └── vpc/
```

---

## P2 Skills Integration (Embedded in Epic Files)

Each epic file contains embedded implementation guidance:

### Extended Thinking Triggers
| Epic | Profile | Trigger | Tokens |
|------|---------|---------|--------|
| 3.5 | COMPLIANCE | "ULTRATHINK" | 16,000 |
| 3.7 | COMPLIANCE | "ULTRATHINK" | 16,000 |
| 3.75 | QUALITY_FIRST | "THINK HARDER" | 8,000 |
| 9 | QUALITY_FIRST | "THINK HARDER" | 8,000 |

### Context Positioning Protocol
All epics define three zones:
- **PRIMACY (First 15%):** Critical constraints and schemas
- **MIDDLE (15-85%):** Previous outputs and documentation
- **RECENCY (Last 15%):** Current task specification

### Structured Handoff Protocol
- **Trigger:** Context fill reaches 60%
- **Action:** Generate DTA (Decisions, To-dos, Ask) document
- **Checkpoints:** Defined per epic phase

---

## Anthropic Research Integration

### "Alignment Faking in Large Language Models" (Dec 2024)
- Epic 3.5 Task 3.5.2.4: DECEPTIVE_COMPLIANCE risk detection
- Epic 3.7 Task 3.7.14: Verification Pillar 9 (Behavioral)

### "From Shortcuts to Sabotage" (Nov 2025)
- Epic 3.5 Task 3.5.2.5: REWARD_HACKING_INDUCED risk detection
- Epic 3.7 Task 3.7.15: Verification Pillar 10 (Reward Integrity)

---

## Target AWS Architecture

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

## Verification Commands

### Check Files Exist
```bash
# Epic files
ls -la /mnt/user-data/outputs/settings/forge-epics/

# Lambda module
ls -la /mnt/user-data/outputs/settings/forge-infrastructure/terraform/modules/lambda/

# Skills library
ls -la /mnt/user-data/outputs/settings/skills/ 2>/dev/null || ls -la /mnt/skills/user/
```

### Validate Terraform
```bash
cd /mnt/user-data/outputs/settings/forge-infrastructure/terraform/modules/lambda
terraform init
terraform validate
```

---

## Implementation Order

### Recommended Sequence
1. **Epic 3.5** (Gateway Foundation) - MCP gateway with CARS
2. **Epic 3.6** (Security Controls) - OAuth, tenant isolation
3. **Epic 3.7** (Compliance) - Audit, Pillars 9-10
4. **Epic 3.75** (Code Execution) - Deno sandbox
5. **Epic 4** (Convergence) - Iterative quality
6. **Epic 9** (Infrastructure) - Lambda + Bedrock deploy

### First Task to Implement
```
Epic 3.5, Task 3.5.1.1: Create mcp-gateway package structure

Files to CREATE:
- packages/mcp-gateway/package.json
- packages/mcp-gateway/tsconfig.json
- packages/mcp-gateway/src/index.ts
- packages/mcp-gateway/src/core/types.ts
- packages/mcp-gateway/README.md
```

---

## Support

### If Files Are Missing
Files are in the persistent `/mnt/user-data/outputs/settings/` directory. If they disappear, re-run the session that created them or restore from your local git repository.

### If Claude Code Can't Find Files
Ensure you're referencing the full path:
```
/mnt/user-data/outputs/settings/forge-epics/TASKS-3.5-GATEWAY-FOUNDATION-17TASKS-6DAYS.md
```

### If Terraform Validation Fails
Check AWS provider version compatibility (requires ~> 5.0).

---

*FORGE B-D Platform - ArcFoundry*  
*Target Stack: AWS EC2 + Bedrock + Lambda*  
*Confidence: 97.3%*
