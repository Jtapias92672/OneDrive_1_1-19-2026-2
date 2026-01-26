# FORGE Platform - Bedrock VPC Endpoints Module
# Epic 9: Infrastructure
# Provides private connectivity to Bedrock for Lambda functions
#
# Features:
# - VPC endpoint for bedrock-runtime
# - Security group with least privilege
# - IAM policies for model invocation

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# ==============================================================================
# Local Variables
# ==============================================================================

locals {
  name_prefix = "forge-bedrock-${var.environment}"

  default_tags = {
    Project     = "FORGE"
    Component   = "bedrock"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  tags = merge(local.default_tags, var.tags)

  # Bedrock model ARNs
  model_arns = {
    sonnet = "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/anthropic.claude-3-5-sonnet-*"
    haiku  = "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/anthropic.claude-3-5-haiku-*"
    opus   = "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/anthropic.claude-3-opus-*"
  }
}

# ==============================================================================
# Data Sources
# ==============================================================================

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# ==============================================================================
# Security Group for Bedrock VPC Endpoint
# ==============================================================================

resource "aws_security_group" "bedrock_endpoint" {
  name        = "${local.name_prefix}-endpoint-sg"
  description = "Security group for Bedrock VPC endpoint"
  vpc_id      = var.vpc_id

  # Ingress: Allow HTTPS from Lambda security groups
  ingress {
    description     = "HTTPS from Lambda functions"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  # Ingress: Allow HTTPS from VPC CIDR (for EKS pods)
  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Egress: None needed for interface endpoint
  egress {
    description = "No egress needed"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-endpoint-sg"
  })
}

# ==============================================================================
# VPC Endpoint for Bedrock Runtime
# ==============================================================================

resource "aws_vpc_endpoint" "bedrock_runtime" {
  count = var.enable_vpc_endpoint ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.bedrock-runtime"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = var.subnet_ids
  security_group_ids = [aws_security_group.bedrock_endpoint.id]

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-runtime-endpoint"
  })
}

# ==============================================================================
# VPC Endpoint for Bedrock (Management - optional)
# ==============================================================================

resource "aws_vpc_endpoint" "bedrock" {
  count = var.enable_vpc_endpoint && var.enable_management_endpoint ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.bedrock"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = var.subnet_ids
  security_group_ids = [aws_security_group.bedrock_endpoint.id]

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-management-endpoint"
  })
}

# ==============================================================================
# IAM Policy for Bedrock Model Invocation
# ==============================================================================

resource "aws_iam_policy" "bedrock_invoke" {
  name        = "${local.name_prefix}-invoke-policy"
  description = "Policy for invoking Bedrock models (Claude Sonnet, Haiku, Opus)"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BedrockModelInvocation"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = values(local.model_arns)
      },
      {
        Sid    = "BedrockModelDiscovery"
        Effect = "Allow"
        Action = [
          "bedrock:GetFoundationModel",
          "bedrock:ListFoundationModels"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.tags
}

# ==============================================================================
# IAM Role for Bedrock Access (for EKS/EC2)
# ==============================================================================

resource "aws_iam_role" "bedrock_access" {
  count = var.create_iam_role ? 1 : 0

  name = "${local.name_prefix}-access-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "ec2.amazonaws.com",
            "eks.amazonaws.com"
          ]
        }
        Action = "sts:AssumeRole"
      },
      # IRSA support for EKS
      {
        Effect = "Allow"
        Principal = {
          Federated = var.eks_oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${var.eks_oidc_provider}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "bedrock_invoke" {
  count      = var.create_iam_role ? 1 : 0
  role       = aws_iam_role.bedrock_access[0].name
  policy_arn = aws_iam_policy.bedrock_invoke.arn
}

# Variables and Outputs are defined in separate files:
# - variables.tf
# - outputs.tf
