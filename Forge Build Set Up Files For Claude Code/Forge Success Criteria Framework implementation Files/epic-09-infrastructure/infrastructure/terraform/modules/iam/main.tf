/**
 * FORGE Infrastructure - IAM Module
 * @epic 09 - Cloud Deployment
 * 
 * IAM Roles for Service Accounts (IRSA):
 * - FORGE API service
 * - Convergence Engine
 * - Evidence Service
 * - Governance Gateway
 */

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  oidc_provider_id = replace(var.oidc_provider_url, "https://", "")
}

# -----------------------------------------------------------------------------
# FORGE API Role
# -----------------------------------------------------------------------------

resource "aws_iam_role" "forge_api" {
  name = "${var.name}-forge-api"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = var.oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:${var.namespace}:forge-api"
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(var.tags, {
    Service = "forge-api"
  })
}

resource "aws_iam_role_policy" "forge_api" {
  name = "${var.name}-forge-api-policy"
  role = aws_iam_role.forge_api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:${data.aws_partition.current.partition}:secretsmanager:*:${data.aws_caller_identity.current.account_id}:secret:${var.name}/*"
        ]
      },
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.evidence_bucket_arn,
          "${var.evidence_bucket_arn}/*",
          var.artifacts_bucket_arn,
          "${var.artifacts_bucket_arn}/*"
        ]
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arns
      },
      {
        Sid    = "SQSAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = var.sqs_queue_arns
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Convergence Engine Role
# -----------------------------------------------------------------------------

resource "aws_iam_role" "convergence_engine" {
  name = "${var.name}-convergence-engine"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = var.oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:${var.namespace}:convergence-engine"
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(var.tags, {
    Service = "convergence-engine"
  })
}

resource "aws_iam_role_policy" "convergence_engine" {
  name = "${var.name}-convergence-engine-policy"
  role = aws_iam_role.convergence_engine.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:${data.aws_partition.current.partition}:secretsmanager:*:${data.aws_caller_identity.current.account_id}:secret:${var.name}/*"
        ]
      },
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          var.evidence_bucket_arn,
          "${var.evidence_bucket_arn}/*"
        ]
      },
      {
        Sid    = "SQSAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = var.sqs_queue_arns
      }
    ]
  })
}

# Note: Bedrock access is managed by the dedicated bedrock module
# The convergence-engine service account should assume the bedrock_invoker role
# for LLM invocations to maintain least-privilege separation

# -----------------------------------------------------------------------------
# Evidence Service Role
# -----------------------------------------------------------------------------

resource "aws_iam_role" "evidence_service" {
  name = "${var.name}-evidence-service"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = var.oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:${var.namespace}:evidence-service"
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(var.tags, {
    Service = "evidence-service"
  })
}

resource "aws_iam_role_policy" "evidence_service" {
  name = "${var.name}-evidence-service-policy"
  role = aws_iam_role.evidence_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3FullAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetObjectVersion",
          "s3:PutObjectTagging"
        ]
        Resource = [
          var.evidence_bucket_arn,
          "${var.evidence_bucket_arn}/*"
        ]
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:Encrypt"
        ]
        Resource = var.kms_key_arns
      },
      {
        Sid    = "SecretsAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:${data.aws_partition.current.partition}:secretsmanager:*:${data.aws_caller_identity.current.account_id}:secret:${var.name}/*"
        ]
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Governance Gateway Role
# -----------------------------------------------------------------------------

resource "aws_iam_role" "governance_gateway" {
  name = "${var.name}-governance-gateway"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = var.oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:${var.namespace}:governance-gateway"
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(var.tags, {
    Service = "governance-gateway"
  })
}

resource "aws_iam_role_policy" "governance_gateway" {
  name = "${var.name}-governance-gateway-policy"
  role = aws_iam_role.governance_gateway.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:${data.aws_partition.current.partition}:secretsmanager:*:${data.aws_caller_identity.current.account_id}:secret:${var.name}/*"
        ]
      },
      {
        Sid    = "SNSPublish"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = var.sns_topic_arns
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------

variable "name" {
  description = "Name prefix for roles"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
  default     = "forge"
}

variable "oidc_provider_arn" {
  description = "OIDC provider ARN"
  type        = string
}

variable "oidc_provider_url" {
  description = "OIDC provider URL"
  type        = string
}

variable "evidence_bucket_arn" {
  description = "Evidence bucket ARN"
  type        = string
}

variable "artifacts_bucket_arn" {
  description = "Artifacts bucket ARN"
  type        = string
}

variable "kms_key_arns" {
  description = "KMS key ARNs"
  type        = list(string)
  default     = []
}

variable "sqs_queue_arns" {
  description = "SQS queue ARNs"
  type        = list(string)
  default     = []
}

variable "sns_topic_arns" {
  description = "SNS topic ARNs"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags for resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "forge_api_role_arn" {
  description = "FORGE API role ARN"
  value       = aws_iam_role.forge_api.arn
}

output "convergence_engine_role_arn" {
  description = "Convergence Engine role ARN"
  value       = aws_iam_role.convergence_engine.arn
}

output "evidence_service_role_arn" {
  description = "Evidence Service role ARN"
  value       = aws_iam_role.evidence_service.arn
}

output "governance_gateway_role_arn" {
  description = "Governance Gateway role ARN"
  value       = aws_iam_role.governance_gateway.arn
}
