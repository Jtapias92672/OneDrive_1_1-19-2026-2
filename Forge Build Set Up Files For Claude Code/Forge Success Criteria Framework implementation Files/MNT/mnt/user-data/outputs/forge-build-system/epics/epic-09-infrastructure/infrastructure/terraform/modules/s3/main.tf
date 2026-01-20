/**
 * FORGE Infrastructure - S3 Module
 * @epic 09 - Cloud Deployment
 * 
 * S3 buckets for:
 * - Evidence packs
 * - Artifacts
 * - Logs
 * - Backups
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

# -----------------------------------------------------------------------------
# KMS Key
# -----------------------------------------------------------------------------

resource "aws_kms_key" "s3" {
  count = var.create_kms_key ? 1 : 0

  description             = "KMS key for S3 buckets ${var.name}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow S3 Service"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.name}-s3-kms"
  })
}

resource "aws_kms_alias" "s3" {
  count = var.create_kms_key ? 1 : 0

  name          = "alias/${var.name}-s3"
  target_key_id = aws_kms_key.s3[0].key_id
}

# -----------------------------------------------------------------------------
# Evidence Bucket
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "evidence" {
  bucket = "${var.name}-evidence-${data.aws_caller_identity.current.account_id}"

  tags = merge(var.tags, {
    Name    = "${var.name}-evidence"
    Purpose = "evidence-packs"
  })
}

resource "aws_s3_bucket_versioning" "evidence" {
  bucket = aws_s3_bucket.evidence.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "evidence" {
  bucket = aws_s3_bucket.evidence.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.create_kms_key ? aws_kms_key.s3[0].arn : var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "evidence" {
  bucket = aws_s3_bucket.evidence.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "evidence" {
  bucket = aws_s3_bucket.evidence.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}

# -----------------------------------------------------------------------------
# Artifacts Bucket
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.name}-artifacts-${data.aws_caller_identity.current.account_id}"

  tags = merge(var.tags, {
    Name    = "${var.name}-artifacts"
    Purpose = "build-artifacts"
  })
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.create_kms_key ? aws_kms_key.s3[0].arn : var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "expire-old-artifacts"
    status = "Enabled"

    expiration {
      days = var.artifacts_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# -----------------------------------------------------------------------------
# Logs Bucket
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "logs" {
  count = var.create_logs_bucket ? 1 : 0

  bucket = "${var.name}-logs-${data.aws_caller_identity.current.account_id}"

  tags = merge(var.tags, {
    Name    = "${var.name}-logs"
    Purpose = "access-logs"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  count = var.create_logs_bucket ? 1 : 0

  bucket = aws_s3_bucket.logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  count = var.create_logs_bucket ? 1 : 0

  bucket = aws_s3_bucket.logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  count = var.create_logs_bucket ? 1 : 0

  bucket = aws_s3_bucket.logs[0].id

  rule {
    id     = "expire-logs"
    status = "Enabled"

    expiration {
      days = var.logs_retention_days
    }
  }
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------

variable "name" {
  description = "Name prefix for buckets"
  type        = string
}

variable "create_kms_key" {
  description = "Create KMS key for encryption"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "KMS key ARN (if not creating)"
  type        = string
  default     = null
}

variable "artifacts_retention_days" {
  description = "Artifacts retention in days"
  type        = number
  default     = 90
}

variable "create_logs_bucket" {
  description = "Create logs bucket"
  type        = bool
  default     = true
}

variable "logs_retention_days" {
  description = "Logs retention in days"
  type        = number
  default     = 365
}

variable "tags" {
  description = "Tags for resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "evidence_bucket_name" {
  description = "Evidence bucket name"
  value       = aws_s3_bucket.evidence.id
}

output "evidence_bucket_arn" {
  description = "Evidence bucket ARN"
  value       = aws_s3_bucket.evidence.arn
}

output "artifacts_bucket_name" {
  description = "Artifacts bucket name"
  value       = aws_s3_bucket.artifacts.id
}

output "artifacts_bucket_arn" {
  description = "Artifacts bucket ARN"
  value       = aws_s3_bucket.artifacts.arn
}

output "logs_bucket_name" {
  description = "Logs bucket name"
  value       = var.create_logs_bucket ? aws_s3_bucket.logs[0].id : null
}

output "kms_key_arn" {
  description = "KMS key ARN"
  value       = var.create_kms_key ? aws_kms_key.s3[0].arn : var.kms_key_arn
}
