/**
 * FORGE Infrastructure - MCP IAM Module
 * @epic 09 - Cloud Deployment
 * 
 * Dedicated IRSA roles per MCP server:
 * - Least privilege per server
 * - No shared "god role"
 * - Compromise isolation
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
  account_id       = data.aws_caller_identity.current.account_id
  oidc_provider_id = replace(var.oidc_provider_url, "https://", "")
}

# -----------------------------------------------------------------------------
# MCP Filesystem Server Role (High Trust - S3 access)
# -----------------------------------------------------------------------------

resource "aws_iam_role" "mcp_filesystem" {
  name = "${var.name}-mcp-filesystem"

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
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:mcp-system:mcp-filesystem"
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(var.tags, {
    MCPServer   = "filesystem"
    TrustLevel  = "high"
  })
}

resource "aws_iam_role_policy" "mcp_filesystem" {
  name = "${var.name}-mcp-filesystem-policy"
  role = aws_iam_role.mcp_filesystem.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3ReadWrite"
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
        Sid    = "KMSDecrypt"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arns
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:logs:*:${local.account_id}:log-group:/forge/*/mcp:*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# MCP GitHub Server Role (Medium Trust - Secrets access only)
# -----------------------------------------------------------------------------

resource "aws_iam_role" "mcp_github" {
  name = "${var.name}-mcp-github"

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
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:mcp-system:mcp-github"
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(var.tags, {
    MCPServer   = "github"
    TrustLevel  = "medium"
  })
}

resource "aws_iam_role_policy" "mcp_github" {
  name = "${var.name}-mcp-github-policy"
  role = aws_iam_role.mcp_github.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:${data.aws_partition.current.partition}:secretsmanager:*:${local.account_id}:secret:${var.name}/integrations/github*"
        ]
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:logs:*:${local.account_id}:log-group:/forge/*/mcp:*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# MCP Slack Server Role (Medium Trust - Secrets access only)
# -----------------------------------------------------------------------------

resource "aws_iam_role" "mcp_slack" {
  count = var.enable_slack_mcp ? 1 : 0

  name = "${var.name}-mcp-slack"

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
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:mcp-system:mcp-slack"
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(var.tags, {
    MCPServer   = "slack"
    TrustLevel  = "medium"
  })
}

resource "aws_iam_role_policy" "mcp_slack" {
  count = var.enable_slack_mcp ? 1 : 0

  name = "${var.name}-mcp-slack-policy"
  role = aws_iam_role.mcp_slack[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:${data.aws_partition.current.partition}:secretsmanager:*:${local.account_id}:secret:${var.name}/integrations/slack*"
        ]
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:logs:*:${local.account_id}:log-group:/forge/*/mcp:*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# MCP Database Server Role (High Trust - RDS/DynamoDB access)
# -----------------------------------------------------------------------------

resource "aws_iam_role" "mcp_database" {
  count = var.enable_database_mcp ? 1 : 0

  name = "${var.name}-mcp-database"

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
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:mcp-system:mcp-database"
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(var.tags, {
    MCPServer   = "database"
    TrustLevel  = "high"
  })
}

resource "aws_iam_role_policy" "mcp_database" {
  count = var.enable_database_mcp ? 1 : 0

  name = "${var.name}-mcp-database-policy"
  role = aws_iam_role.mcp_database[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "RDSConnect"
        Effect = "Allow"
        Action = [
          "rds-db:connect"
        ]
        Resource = [
          "arn:${data.aws_partition.current.partition}:rds-db:*:${local.account_id}:dbuser:*/mcp_readonly"
        ]
      },
      {
        Sid    = "SecretsAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:${data.aws_partition.current.partition}:secretsmanager:*:${local.account_id}:secret:${var.name}/rds/*"
        ]
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:logs:*:${local.account_id}:log-group:/forge/*/mcp:*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# MCP Web Search Server Role (Low Trust - minimal permissions)
# -----------------------------------------------------------------------------

resource "aws_iam_role" "mcp_web_search" {
  count = var.enable_web_search_mcp ? 1 : 0

  name = "${var.name}-mcp-web-search"

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
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:mcp-system:mcp-web-search"
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(var.tags, {
    MCPServer   = "web-search"
    TrustLevel  = "low"
  })
}

resource "aws_iam_role_policy" "mcp_web_search" {
  count = var.enable_web_search_mcp ? 1 : 0

  name = "${var.name}-mcp-web-search-policy"
  role = aws_iam_role.mcp_web_search[0].id

  # Low trust - only CloudWatch logs, no AWS service access
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:logs:*:${local.account_id}:log-group:/forge/*/mcp:*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# MCP Bedrock Server Role (High Trust - Bedrock access)
# For MCP servers that need to invoke Bedrock directly
# -----------------------------------------------------------------------------

resource "aws_iam_role" "mcp_bedrock" {
  count = var.enable_bedrock_mcp ? 1 : 0

  name = "${var.name}-mcp-bedrock"

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
          "${local.oidc_provider_id}:sub" = "system:serviceaccount:mcp-system:mcp-bedrock"
          "${local.oidc_provider_id}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(var.tags, {
    MCPServer   = "bedrock"
    TrustLevel  = "high"
  })
}

resource "aws_iam_role_policy" "mcp_bedrock" {
  count = var.enable_bedrock_mcp ? 1 : 0

  name = "${var.name}-mcp-bedrock-policy"
  role = aws_iam_role.mcp_bedrock[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BedrockInvoke"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = var.bedrock_model_arns
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:logs:*:${local.account_id}:log-group:/forge/*/mcp:*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group for MCP Servers
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "mcp" {
  name              = "/forge/${var.environment}/mcp"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Service = "mcp-servers"
  })
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------

variable "name" {
  description = "Name prefix for resources"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "oidc_provider_arn" {
  description = "OIDC provider ARN for IRSA"
  type        = string
}

variable "oidc_provider_url" {
  description = "OIDC provider URL for IRSA"
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
  description = "KMS key ARNs for encryption"
  type        = list(string)
  default     = []
}

variable "bedrock_model_arns" {
  description = "Bedrock model ARNs for MCP Bedrock server"
  type        = list(string)
  default     = []
}

variable "enable_slack_mcp" {
  description = "Enable Slack MCP server"
  type        = bool
  default     = false
}

variable "enable_database_mcp" {
  description = "Enable Database MCP server"
  type        = bool
  default     = true
}

variable "enable_web_search_mcp" {
  description = "Enable Web Search MCP server"
  type        = bool
  default     = true
}

variable "enable_bedrock_mcp" {
  description = "Enable Bedrock MCP server"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags for all resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "mcp_filesystem_role_arn" {
  description = "MCP Filesystem server role ARN"
  value       = aws_iam_role.mcp_filesystem.arn
}

output "mcp_github_role_arn" {
  description = "MCP GitHub server role ARN"
  value       = aws_iam_role.mcp_github.arn
}

output "mcp_slack_role_arn" {
  description = "MCP Slack server role ARN"
  value       = var.enable_slack_mcp ? aws_iam_role.mcp_slack[0].arn : null
}

output "mcp_database_role_arn" {
  description = "MCP Database server role ARN"
  value       = var.enable_database_mcp ? aws_iam_role.mcp_database[0].arn : null
}

output "mcp_web_search_role_arn" {
  description = "MCP Web Search server role ARN"
  value       = var.enable_web_search_mcp ? aws_iam_role.mcp_web_search[0].arn : null
}

output "mcp_bedrock_role_arn" {
  description = "MCP Bedrock server role ARN"
  value       = var.enable_bedrock_mcp ? aws_iam_role.mcp_bedrock[0].arn : null
}

output "mcp_log_group_name" {
  description = "MCP CloudWatch log group name"
  value       = aws_cloudwatch_log_group.mcp.name
}

output "mcp_role_arns" {
  description = "Map of all MCP server role ARNs"
  value = {
    filesystem = aws_iam_role.mcp_filesystem.arn
    github     = aws_iam_role.mcp_github.arn
    slack      = var.enable_slack_mcp ? aws_iam_role.mcp_slack[0].arn : null
    database   = var.enable_database_mcp ? aws_iam_role.mcp_database[0].arn : null
    web_search = var.enable_web_search_mcp ? aws_iam_role.mcp_web_search[0].arn : null
    bedrock    = var.enable_bedrock_mcp ? aws_iam_role.mcp_bedrock[0].arn : null
  }
}
