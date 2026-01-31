# FORGE Infrastructure Archive

## Archived: 2026-01-31

### What's Archived

**Terraform Infrastructure** for AWS deployment of the FORGE platform.

**Archive:** `infrastructure-terraform-20260131.tar.gz` (25KB)

### Contents

Terraform modules for AWS infrastructure:
- `alb/` - Application Load Balancer
- `bedrock/` - AWS Bedrock AI model access
- `ec2-asg/` - EC2 Auto Scaling Groups
- `lambda/` - Serverless functions (gateway, parser, CARS)
- `rds/` - PostgreSQL database
- `vpc/` - VPC, security groups, endpoints

### Why Archived

1. **Not needed for local development**
   - Local dev uses Node.js/npm directly
   - No AWS services required for development

2. **Performance impact**
   - `.terraform/` provider caches were 4.2GB
   - Caused Claude Code indexing timeouts
   - Slowed down file operations

3. **Production deployment only**
   - Used for DCMA/DFARS/CMMC compliant AWS deployment
   - Only needed when deploying to production

### How to Restore

If you need to deploy to AWS:

```bash
# Extract archive
cd /path/to/mcp-gateway
tar -xzf .forge/archive/infrastructure-terraform-20260131.tar.gz

# Initialize Terraform (downloads providers)
cd infrastructure/terraform/environments/prod
terraform init

# Review plan
terraform plan

# Deploy
terraform apply
```

### Prerequisites for Deployment

- AWS CLI configured with credentials
- S3 bucket for Terraform state: `forge-terraform-state`
- Appropriate IAM permissions
- VPC and networking requirements documented in Epic 09

### Related Documentation

- Epic 09: Infrastructure (docs/epics/epic-09-infrastructure.md)
- RECOVERY-08: Lambda-Bedrock Connectivity
- RECOVERY-09: Security Group Configuration
- RECOVERY-10: Root Terraform Module

### Status

- **Completion:** Epic 09 COMPLETE (97% confidence)
- **Code Complete:** All modules wired and validated
- **Deployment:** Requires AWS environment (not tested in production)

---

**Note:** This infrastructure is production-ready code but archived to optimize local development performance.
