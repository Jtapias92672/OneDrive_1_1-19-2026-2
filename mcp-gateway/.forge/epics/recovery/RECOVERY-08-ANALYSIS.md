# RECOVERY-08: Lambda-Bedrock Connectivity Analysis

**Date**: 2026-01-23
**Status**: ANALYSIS COMPLETE
**Epic**: P0-8 Lambda VPC Bedrock Issue

## Executive Summary

The Lambda-to-Bedrock connectivity issue stems from **incomplete module wiring**, not fundamental architecture problems. The VPC module has NAT Gateway support properly configured, but the production environment lacks the root module to wire VPC and Lambda together.

## Current State Analysis

### VPC Module (`infrastructure/terraform/modules/vpc/main.tf`)

**Status**: ✅ PROPERLY CONFIGURED

The VPC module correctly implements:
- Configurable NAT Gateway via `enable_nat_gateway` variable
- Private subnets with proper routing
- Internet Gateway for public subnets
- Elastic IP allocation for NAT Gateway

```hcl
# NAT Gateway configuration (lines 50-72)
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? 1 : 0
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id
}
```

### Lambda Module (`infrastructure/terraform/modules/lambda/main.tf`)

**Status**: ⚠️ NEEDS WIRING

The Lambda module has:
- Security group with configurable ingress via `allowed_security_groups`
- Egress rule allowing all outbound traffic (required for Bedrock)
- VPC configuration block expecting `subnet_ids` and `security_group_ids`

```hcl
# Security group (lines 87-124)
resource "aws_security_group" "lambda" {
  name_prefix = "${var.function_name}-"
  vpc_id      = var.vpc_id

  # Configurable ingress
  dynamic "ingress" {
    for_each = var.allowed_security_groups
    content {
      from_port       = 443
      to_port         = 443
      protocol        = "tcp"
      security_groups = [ingress.value]
    }
  }

  # All outbound (required for Bedrock API calls)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### Production Environment (`infrastructure/terraform/environments/prod/lambda.tf`)

**Status**: ❌ CRITICAL ISSUES

1. **Empty Security Groups**: `allowed_security_groups = []`
2. **No Root Module**: Missing `main.tf` to wire VPC and Lambda modules
3. **No VPC Endpoint**: Missing Bedrock VPC Endpoint for private connectivity

```hcl
# Current problematic configuration
module "forge_worker" {
  source = "../../modules/lambda"
  # ...
  allowed_security_groups = []  # EMPTY - No ingress rules!
}
```

## Recommended Architecture

### Option A: VPC Endpoint (RECOMMENDED)

**Pros**:
- Private connectivity (traffic never leaves AWS network)
- Lower latency
- More secure (no NAT Gateway exposure)
- Predictable pricing

**Implementation**:
```hcl
resource "aws_vpc_endpoint" "bedrock" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.${var.region}.bedrock-runtime"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = module.vpc.private_subnet_ids
  security_group_ids  = [aws_security_group.bedrock_endpoint.id]
  private_dns_enabled = true
}
```

### Option B: NAT Gateway (Existing)

**Pros**:
- Already configured in VPC module
- Works with any AWS service

**Cons**:
- Traffic goes through public internet
- NAT Gateway data processing costs
- Higher latency

## Required Changes

### 1. Create Root Module (`environments/prod/main.tf`)

Wire VPC and Lambda modules together:
- Pass VPC outputs to Lambda module
- Configure subnet IDs
- Set up security group references

### 2. Add Bedrock VPC Endpoint

Create interface endpoint for private Bedrock connectivity.

### 3. Fix Security Group Configuration

Populate `allowed_security_groups` with appropriate references.

### 4. Update Lambda VPC Configuration

Ensure Lambda has:
- Private subnet IDs
- Security group with Bedrock endpoint access

## Action Items

| Step | Description | Status |
|------|-------------|--------|
| 08.2 | Create VPC Endpoint for Bedrock | Pending |
| 08.3 | Create root main.tf module | Pending |
| 08.4 | Wire VPC outputs to Lambda | Pending |
| 08.5 | Configure security group references | Pending |
| 08.6 | Validate terraform plan | Pending |
| 08.7 | Update progress.md | Pending |

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lambda timeout | High | VPC Endpoint eliminates NAT bottleneck |
| Security exposure | Medium | VPC Endpoint keeps traffic private |
| Cost overrun | Low | VPC Endpoint cheaper than NAT for high volume |

## Compliance Notes

- **SOC 2**: VPC Endpoint improves audit trail (CloudTrail logs)
- **DCMA/DFARS**: Private connectivity meets FedRAMP requirements
- **NIST 800-53**: Network segmentation via private subnets
