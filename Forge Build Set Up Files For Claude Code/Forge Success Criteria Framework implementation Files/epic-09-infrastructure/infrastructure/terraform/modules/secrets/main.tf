/**
 * FORGE Infrastructure - Secrets Module
 * @epic 09 - Cloud Deployment
 * 
 * AWS Secrets Manager for:
 * - API keys
 * - Service credentials
 * - External integrations
 */

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# -----------------------------------------------------------------------------
# KMS Key for Secrets
# -----------------------------------------------------------------------------

resource "aws_kms_key" "secrets" {
  count = var.create_kms_key ? 1 : 0

  description             = "KMS key for FORGE secrets"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name = "${var.name}-secrets-kms"
  })
}

resource "aws_kms_alias" "secrets" {
  count = var.create_kms_key ? 1 : 0

  name          = "alias/${var.name}-secrets"
  target_key_id = aws_kms_key.secrets[0].key_id
}

locals {
  kms_key_id = var.create_kms_key ? aws_kms_key.secrets[0].id : var.kms_key_id
}

# -----------------------------------------------------------------------------
# JWT Secret
# -----------------------------------------------------------------------------

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "jwt" {
  name       = "${var.name}/jwt-secret"
  kms_key_id = local.kms_key_id

  tags = merge(var.tags, {
    Purpose = "jwt-signing"
  })
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id     = aws_secretsmanager_secret.jwt.id
  secret_string = random_password.jwt_secret.result
}

# -----------------------------------------------------------------------------
# API Keys Secret
# -----------------------------------------------------------------------------

resource "random_password" "api_key" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "api_keys" {
  name       = "${var.name}/api-keys"
  kms_key_id = local.kms_key_id

  tags = merge(var.tags, {
    Purpose = "api-authentication"
  })
}

resource "aws_secretsmanager_secret_version" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id

  secret_string = jsonencode({
    default_api_key = random_password.api_key.result
  })
}

# -----------------------------------------------------------------------------
# External Provider Secrets
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "anthropic" {
  name       = "${var.name}/providers/anthropic"
  kms_key_id = local.kms_key_id

  tags = merge(var.tags, {
    Purpose  = "llm-provider"
    Provider = "anthropic"
  })
}

resource "aws_secretsmanager_secret_version" "anthropic" {
  secret_id = aws_secretsmanager_secret.anthropic.id

  secret_string = jsonencode({
    api_key = var.anthropic_api_key != null ? var.anthropic_api_key : "PLACEHOLDER"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "openai" {
  count = var.enable_openai ? 1 : 0

  name       = "${var.name}/providers/openai"
  kms_key_id = local.kms_key_id

  tags = merge(var.tags, {
    Purpose  = "llm-provider"
    Provider = "openai"
  })
}

resource "aws_secretsmanager_secret_version" "openai" {
  count = var.enable_openai ? 1 : 0

  secret_id = aws_secretsmanager_secret.openai[0].id

  secret_string = jsonencode({
    api_key = var.openai_api_key != null ? var.openai_api_key : "PLACEHOLDER"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# -----------------------------------------------------------------------------
# Integration Secrets
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "github" {
  count = var.enable_github_integration ? 1 : 0

  name       = "${var.name}/integrations/github"
  kms_key_id = local.kms_key_id

  tags = merge(var.tags, {
    Purpose     = "integration"
    Integration = "github"
  })
}

resource "aws_secretsmanager_secret_version" "github" {
  count = var.enable_github_integration ? 1 : 0

  secret_id = aws_secretsmanager_secret.github[0].id

  secret_string = jsonencode({
    app_id         = var.github_app_id
    private_key    = var.github_private_key != null ? var.github_private_key : "PLACEHOLDER"
    webhook_secret = var.github_webhook_secret != null ? var.github_webhook_secret : "PLACEHOLDER"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "slack" {
  count = var.enable_slack_integration ? 1 : 0

  name       = "${var.name}/integrations/slack"
  kms_key_id = local.kms_key_id

  tags = merge(var.tags, {
    Purpose     = "integration"
    Integration = "slack"
  })
}

resource "aws_secretsmanager_secret_version" "slack" {
  count = var.enable_slack_integration ? 1 : 0

  secret_id = aws_secretsmanager_secret.slack[0].id

  secret_string = jsonencode({
    bot_token      = var.slack_bot_token != null ? var.slack_bot_token : "PLACEHOLDER"
    signing_secret = var.slack_signing_secret != null ? var.slack_signing_secret : "PLACEHOLDER"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------

variable "name" {
  description = "Name prefix for secrets"
  type        = string
}

variable "create_kms_key" {
  description = "Create KMS key"
  type        = bool
  default     = true
}

variable "kms_key_id" {
  description = "KMS key ID (if not creating)"
  type        = string
  default     = null
}

variable "anthropic_api_key" {
  description = "Anthropic API key"
  type        = string
  default     = null
  sensitive   = true
}

variable "enable_openai" {
  description = "Enable OpenAI integration"
  type        = bool
  default     = false
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  default     = null
  sensitive   = true
}

variable "enable_github_integration" {
  description = "Enable GitHub integration"
  type        = bool
  default     = true
}

variable "github_app_id" {
  description = "GitHub App ID"
  type        = string
  default     = ""
}

variable "github_private_key" {
  description = "GitHub App private key"
  type        = string
  default     = null
  sensitive   = true
}

variable "github_webhook_secret" {
  description = "GitHub webhook secret"
  type        = string
  default     = null
  sensitive   = true
}

variable "enable_slack_integration" {
  description = "Enable Slack integration"
  type        = bool
  default     = false
}

variable "slack_bot_token" {
  description = "Slack bot token"
  type        = string
  default     = null
  sensitive   = true
}

variable "slack_signing_secret" {
  description = "Slack signing secret"
  type        = string
  default     = null
  sensitive   = true
}

variable "tags" {
  description = "Tags for resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "jwt_secret_arn" {
  description = "JWT secret ARN"
  value       = aws_secretsmanager_secret.jwt.arn
}

output "api_keys_secret_arn" {
  description = "API keys secret ARN"
  value       = aws_secretsmanager_secret.api_keys.arn
}

output "anthropic_secret_arn" {
  description = "Anthropic secret ARN"
  value       = aws_secretsmanager_secret.anthropic.arn
}

output "openai_secret_arn" {
  description = "OpenAI secret ARN"
  value       = var.enable_openai ? aws_secretsmanager_secret.openai[0].arn : null
}

output "github_secret_arn" {
  description = "GitHub secret ARN"
  value       = var.enable_github_integration ? aws_secretsmanager_secret.github[0].arn : null
}

output "slack_secret_arn" {
  description = "Slack secret ARN"
  value       = var.enable_slack_integration ? aws_secretsmanager_secret.slack[0].arn : null
}

output "kms_key_arn" {
  description = "KMS key ARN"
  value       = var.create_kms_key ? aws_kms_key.secrets[0].arn : null
}
