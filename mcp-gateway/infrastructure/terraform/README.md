# FORGE Terraform Infrastructure

Infrastructure as Code for deploying FORGE to AWS.

## Prerequisites

- AWS CLI configured with valid credentials
- Terraform 1.0+ installed
- S3 bucket for state: `forge-terraform-state`
- Appropriate IAM permissions

## Quick Start

### 1. Plan Deployment

```bash
./deploy-to-aws.sh prod plan
```

### 2. Apply Changes

```bash
./deploy-to-aws.sh prod apply
```

### 3. View Outputs

```bash
cd environments/prod
terraform output
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    AWS Cloud                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────┐      ┌──────────────┐                │
│  │   ALB   │─────▶│   Lambda     │                │
│  └─────────┘      │   Functions  │                │
│                   └──────────────┘                │
│                          │                         │
│                          │                         │
│                   ┌──────▼──────┐                 │
│                   │   Bedrock   │                 │
│                   │  (via VPC   │                 │
│                   │  Endpoint)  │                 │
│                   └─────────────┘                 │
│                          │                         │
│                   ┌──────▼──────┐                 │
│                   │     RDS     │                 │
│                   │ (PostgreSQL)│                 │
│                   └─────────────┘                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Modules

| Module | Purpose | Status |
|--------|---------|--------|
| `vpc/` | VPC, subnets, security groups, Bedrock endpoint | ✅ Complete |
| `lambda/` | Lambda functions (gateway, parser, CARS) | ✅ Complete |
| `bedrock/` | Bedrock access configuration | ✅ Complete |
| `rds/` | PostgreSQL database | ✅ Complete |
| `alb/` | Application Load Balancer | ✅ Complete |
| `ec2-asg/` | EC2 Auto Scaling (optional) | ✅ Complete |

## Environments

- `prod/` - Production environment
- `staging/` - Staging environment (if needed)
- `dev/` - Development environment (if needed)

## Deployment Script

**Usage:**
```bash
./deploy-to-aws.sh [environment] [action]
```

**Arguments:**
- `environment`: prod|staging|dev (default: prod)
- `action`: plan|apply|destroy (default: plan)

**Examples:**

```bash
# Plan production changes
./deploy-to-aws.sh prod plan

# Apply to production
./deploy-to-aws.sh prod apply

# Plan staging changes
./deploy-to-aws.sh staging plan

# Destroy development (careful!)
./deploy-to-aws.sh dev destroy
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Infrastructure
on:
  push:
    branches: [main]
    paths: ['infrastructure/terraform/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2

      - name: Deploy to AWS
        run: |
          cd infrastructure/terraform
          ./deploy-to-aws.sh prod plan
          ./deploy-to-aws.sh prod apply
```

## Manual Deployment Steps

If you prefer manual deployment:

```bash
# 1. Navigate to environment
cd infrastructure/terraform/environments/prod

# 2. Initialize (first time only)
terraform init

# 3. Plan changes
terraform plan -out=tfplan

# 4. Review plan output
# (Review the changes Terraform will make)

# 5. Apply changes
terraform apply tfplan

# 6. View outputs
terraform output
```

## State Management

Terraform state is stored in S3 for team collaboration and safety.

**Backend Configuration:**
```hcl
terraform {
  backend "s3" {
    bucket = "forge-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```

**Create S3 bucket (first time):**
```bash
aws s3 mb s3://forge-terraform-state --region us-east-1
aws s3api put-bucket-versioning \
  --bucket forge-terraform-state \
  --versioning-configuration Status=Enabled
```

## Security & Compliance

This infrastructure implements:
- ✅ DCMA/DFARS/CMMC compliance patterns
- ✅ VPC isolation with private subnets
- ✅ Security groups with least-privilege access
- ✅ VPC endpoints for AWS services (no internet egress)
- ✅ Encryption at rest (RDS, S3)
- ✅ Encryption in transit (TLS)

## Troubleshooting

### Provider Download Issues

If `.terraform/` becomes large (4GB+):
```bash
# Clean provider cache
rm -rf .terraform
terraform init
```

### State Lock Issues

If state is locked:
```bash
# Force unlock (use carefully)
terraform force-unlock <LOCK_ID>
```

### Permission Issues

Ensure your IAM user/role has:
- `ec2:*`
- `lambda:*`
- `bedrock:*`
- `rds:*`
- `elasticloadbalancing:*`
- `iam:*` (for roles)

## Related Documentation

- Epic 09: Infrastructure (../../docs/epics/epic-09-infrastructure.md)
- RECOVERY-08: Lambda-Bedrock Connectivity
- RECOVERY-09: Security Groups
- RECOVERY-10: Root Module Integration

## Support

For issues or questions:
1. Check progress.md for Epic 09 status
2. Review module READMEs in `modules/*/`
3. Contact infrastructure team
