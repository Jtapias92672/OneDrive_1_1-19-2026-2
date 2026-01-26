# FORGE Infrastructure

AWS infrastructure and Kubernetes deployments for the FORGE platform.

## Prerequisites

- AWS CLI v2
- Terraform >= 1.5.0
- kubectl >= 1.28
- Helm >= 3.12
- AWS account with appropriate permissions
- Bedrock model access enabled (Claude models)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS Account                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          VPC (10.0.0.0/16)                           │    │
│  │  ┌───────────────────────────────────────────────────────────────┐  │    │
│  │  │                    Public Subnets (3 AZs)                      │  │    │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │  │    │
│  │  │  │  NAT GW 1   │  │  NAT GW 2   │  │  NAT GW 3   │            │  │    │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘            │  │    │
│  │  │  ┌─────────────────────────────────────────────────────────┐  │  │    │
│  │  │  │               Application Load Balancer                  │  │  │    │
│  │  │  └─────────────────────────────────────────────────────────┘  │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  │  ┌───────────────────────────────────────────────────────────────┐  │    │
│  │  │                   Private Subnets (3 AZs)                     │  │    │
│  │  │  ┌─────────────────────────────────────────────────────────┐  │  │    │
│  │  │  │                  EKS Cluster                             │  │  │    │
│  │  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │  │    │
│  │  │  │  │ FORGE    │ │Convergence│ │Evidence  │ │Governance│    │  │  │    │
│  │  │  │  │ API      │ │ Engine   │ │ Service  │ │ Gateway  │    │  │  │    │
│  │  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │  │    │
│  │  │  │                                                          │  │  │    │
│  │  │  │  VPC Endpoints: S3, ECR, Bedrock, Bedrock-Runtime       │  │  │    │
│  │  │  └─────────────────────────────────────────────────────────┘  │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  │  ┌───────────────────────────────────────────────────────────────┐  │    │
│  │  │                  Database Subnets (3 AZs)                     │  │    │
│  │  │  ┌─────────────────────┐  ┌─────────────────────────────────┐  │  │    │
│  │  │  │    RDS PostgreSQL   │  │     ElastiCache Redis          │  │  │    │
│  │  │  │    (Multi-AZ)       │  │     (Cluster Mode)             │  │  │    │
│  │  │  └─────────────────────┘  └─────────────────────────────────┘  │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  S3 Buckets          │ Secrets Manager      │ AWS Bedrock             │  │
│  │  - Evidence Packs    │ - DB credentials     │ - Claude 3.5 Sonnet     │  │
│  │  - Artifacts         │ - API keys           │ - Claude 3.5 Haiku      │  │
│  │  - Logs              │ - Integration keys   │ - Provisioned Throughput│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
infrastructure/
├── .github/
│   └── workflows/
│       └── infrastructure.yml   # CI/CD pipeline
├── terraform/
│   ├── modules/                 # Reusable Terraform modules
│   │   ├── vpc/                 # VPC, subnets, NAT, endpoints
│   │   ├── eks/                 # EKS cluster, node groups, addons
│   │   ├── rds/                 # PostgreSQL database
│   │   ├── elasticache/         # Redis cluster
│   │   ├── s3/                  # S3 buckets
│   │   ├── iam/                 # IRSA roles for core services
│   │   ├── bedrock/             # Bedrock VPC endpoints, IAM, guardrails
│   │   ├── mcp-iam/             # Per-MCP-server IRSA roles
│   │   ├── mcp-monitoring/      # MCP dashboards and alarms
│   │   ├── monitoring/          # Platform CloudWatch, alarms, dashboard
│   │   └── secrets/             # Secrets Manager
│   └── environments/            # Environment configurations
│       ├── dev/                 # Development (cost-optimized)
│       ├── staging/             # Staging (production-like)
│       └── prod/                # Production (HA)
├── k8s/
│   ├── base/                    # Base Kubernetes manifests
│   │   ├── namespace.yaml       # forge namespace + RBAC
│   │   ├── config.yaml          # ConfigMaps + Secrets
│   │   ├── forge-api.yaml       # API deployment
│   │   ├── convergence-engine.yaml  # Worker deployment
│   │   ├── ingress.yaml         # ALB ingress
│   │   ├── mcp-system.yaml      # MCP namespace + NetworkPolicies
│   │   └── mcp-servers.yaml     # MCP server deployments
│   └── overlays/                # Environment-specific patches
│       ├── dev/
│       ├── staging/
│       └── prod/
└── scripts/                     # Deployment scripts
    ├── bootstrap-backend.sh     # Initialize Terraform state
    └── deploy.sh                # Full deployment script
```

## Quick Start

### 1. Bootstrap Terraform Backend

```bash
# Set your AWS region
export AWS_REGION=us-west-2

# Run bootstrap script
./scripts/bootstrap-backend.sh
```

### 2. Enable Bedrock Model Access

Before deploying, enable access to Claude models in your AWS account:

```bash
# Via AWS Console:
# 1. Go to Amazon Bedrock > Model access
# 2. Request access for:
#    - Anthropic Claude 3.5 Sonnet
#    - Anthropic Claude 3.5 Haiku
#    - Anthropic Claude 3 Opus (optional)
```

### 3. Deploy Infrastructure

```bash
# Development
./scripts/deploy.sh dev

# Staging
./scripts/deploy.sh staging

# Production
./scripts/deploy.sh prod
```

### 4. Configure kubectl

```bash
aws eks update-kubeconfig --name forge-prod --region us-west-2
```

## Terraform Modules

### VPC Module
- Creates VPC with public, private, and database subnets
- NAT Gateways for private subnet egress
- VPC Flow Logs for security monitoring
- VPC Endpoints for AWS services (S3, ECR)

### EKS Module
- Managed EKS cluster with latest Kubernetes version
- Multiple node groups (system, workers, convergence)
- IRSA for secure AWS access from pods
- EBS CSI driver for persistent volumes

### RDS Module
- PostgreSQL 16 with encryption at rest
- Multi-AZ for production high availability
- Automated backups with configurable retention
- Performance Insights enabled

### ElastiCache Module
- Redis 7.1 cluster for caching and queues
- Encryption at rest and in transit
- Automatic failover with replicas

### S3 Module
- Evidence bucket with versioning and lifecycle policies
- Artifacts bucket with retention rules
- KMS encryption for all buckets

### IAM Module
- IRSA roles for each FORGE service
- Least-privilege policies
- Support for AWS Bedrock, Secrets Manager, S3

### Bedrock Module (Epic 09A)
- VPC Endpoints for private Bedrock access
- IAM roles with least-privilege model invocation policies
- Optional provisioned throughput for predictable performance
- CloudWatch logging for invocations
- Guardrails for content safety (optional)

**Bedrock IAM Permissions:**
```hcl
# Models allowed for invocation
allowed_models = [
  "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "anthropic.claude-3-5-haiku-20241022-v1:0",
  "anthropic.claude-3-opus-20240229-v1:0"
]
```

### MCP IAM Module (Per-Server IRSA)
- Dedicated IRSA role per MCP server (no shared "god role")
- Trust-level based permissions (high/medium/low)
- Compromise isolation - one server breach doesn't grant broad access

```hcl
# Each MCP server gets its own role with minimal permissions
module "mcp_iam" {
  mcp_servers = {
    filesystem = { trust_level = "high", aws_access = ["s3", "kms"] }
    github     = { trust_level = "medium", aws_access = ["secrets"] }
    slack      = { trust_level = "medium", aws_access = ["secrets"] }
    database   = { trust_level = "high", aws_access = ["rds", "secrets"] }
    web_search = { trust_level = "low", aws_access = ["logs"] }
  }
}
```

### MCP Monitoring Module
- Per-server error rate, latency, request volume alarms
- Tool-level metrics (top tools, failures, timeouts)
- Rate limiting and circuit breaker event tracking
- Dedicated MCP dashboard for operators

**Alarms per MCP server:**
- Error rate > 5%
- p99 latency > 5 seconds
- Rate limit events > 10/5min
- Circuit breaker OPEN
- No healthy pods

### Monitoring Module
- CloudWatch log groups for all services
- Alarms for CPU, memory, storage, error rates
- Dashboard for platform overview
- SNS notifications for alerts

### Secrets Module
- Secrets Manager for credentials and API keys
- KMS encryption
- Rotation support

## Kubernetes Components

### Deployments
- `forge-api` - Main API service
- `convergence-engine` - Validation workers (uses Bedrock)
- `evidence-service` - Evidence management
- `governance-gateway` - Policy enforcement

### MCP Servers (First-Class Deployable Units)

MCP servers are deployed in a dedicated `mcp-system` namespace with:
- **Namespace isolation** - Separate ResourceQuotas and NetworkPolicies
- **Per-server IRSA** - Dedicated IAM role per MCP server (least privilege)
- **mTLS** - Certificate-based authentication between Forge and MCP servers
- **Independent scaling** - HPA per server with bursty workload support
- **Audit logging** - Every tool call is attributable (run_id, work_id, user_id)

| MCP Server | Trust Level | AWS Access | Purpose |
|------------|-------------|------------|---------|
| `mcp-filesystem` | High | S3, KMS | File operations |
| `mcp-github` | Medium | Secrets Manager | GitHub integration |
| `mcp-slack` | Medium | Secrets Manager | Slack messaging |
| `mcp-database` | High | RDS IAM Auth, Secrets | Database queries |
| `mcp-web-search` | Low | CloudWatch only | Web search |
| `mcp-bedrock` | High | Bedrock | LLM invocation |

**Acceptance Criteria:**
- ✅ Deploy/scale/rollback MCP servers independently
- ✅ Compromise of one MCP server doesn't grant broad AWS access
- ✅ Every tool invocation is attributable and policy-evaluated
- ✅ Operators can identify degrading MCP servers via dashboard

### ConfigMaps
- `forge-config` - General platform configuration
- `forge-bedrock-config` - Bedrock-specific settings (model IDs, rate limits)
- `mcp-registry` - MCP server registry with tool allowlists
- `mcp-audit-policy` - Audit requirements for Evidence Plane

### Supporting Resources
- HorizontalPodAutoscalers for scaling
- PodDisruptionBudgets for availability
- NetworkPolicies for security
- ResourceQuotas and LimitRanges

## Security

- All data encrypted at rest and in transit
- Private subnets for workloads
- VPC Flow Logs enabled
- WAF on ALB (production)
- NetworkPolicies in Kubernetes
- IRSA for AWS access (no static credentials)
- Secrets in AWS Secrets Manager
- **Bedrock: Private VPC endpoints (no public internet)**
- **Bedrock: Least-privilege IAM with specific model ARNs**

## Cost Optimization

| Resource | Dev | Staging | Prod |
|----------|-----|---------|------|
| NAT Gateways | 1 | 1 | 3 |
| EKS Nodes | 2 (spot) | 4 (mixed) | 5-20 |
| RDS Instance | t3.small | t3.medium | r6g.large |
| RDS Multi-AZ | No | Yes | Yes |
| Redis Nodes | 1 | 2 | 3 |
| Bedrock VPC Endpoints | No | Yes | Yes |
| Bedrock Provisioned | No | No | Optional |

## Bedrock Cost Management

```hcl
# Production: Enable provisioned throughput for predictable costs
provisioned_throughput = {
  claude-sonnet = {
    model_id            = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    model_units         = 1
    commitment_duration = null  # No commitment for flexibility
  }
}
```

## CI/CD

GitHub Actions workflow (`.github/workflows/infrastructure.yml`):

- **On PR:** Validates Terraform and runs `plan` for all environments
- **On merge to main:** Auto-deploys to dev
- **Manual trigger:** Deploy to any environment with plan/apply/destroy options

## Monitoring

Access the CloudWatch dashboards:

**Platform Overview:**
```
https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#dashboards:name=forge-prod-dashboard
```

**Bedrock Usage:**
```
https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#dashboards:name=forge-prod-bedrock
```

**MCP Servers:**
```
https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#dashboards:name=forge-prod-mcp
```

The MCP dashboard shows:
- Server availability and health
- Request volume by server
- Error rate by server
- p99 latency
- Rate limit events
- Circuit breaker state
- Top tools by usage
- Tool failures

## Troubleshooting

### Check pod status
```bash
kubectl get pods -n forge
kubectl describe pod <pod-name> -n forge
kubectl logs <pod-name> -n forge
```

### Check Bedrock connectivity
```bash
# Test from within cluster
kubectl run bedrock-test --rm -it --image=amazon/aws-cli -- \
    bedrock list-foundation-models --region us-west-2

# Check VPC endpoint
aws ec2 describe-vpc-endpoints \
    --filters "Name=service-name,Values=com.amazonaws.us-west-2.bedrock-runtime"
```

### Database connectivity
```bash
kubectl run psql-test --rm -it --image=postgres:16 -- \
    psql "postgresql://user:pass@endpoint:5432/forge"
```

### Redis connectivity
```bash
kubectl run redis-test --rm -it --image=redis:7 -- \
    redis-cli -h endpoint -p 6379 --tls
```
