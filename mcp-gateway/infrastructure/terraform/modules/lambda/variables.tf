# FORGE Platform - Lambda Module Variables
# Epic 9: Infrastructure
# Task 9.4.5: Lambda Function Module Configuration

# ==============================================================================
# Required Variables
# ==============================================================================

variable "name" {
  description = "Name of the Lambda function"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.name))
    error_message = "Name must start with a letter and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "handler" {
  description = "Lambda function handler (e.g., index.handler)"
  type        = string
}

variable "runtime" {
  description = "Lambda runtime (e.g., nodejs20.x)"
  type        = string
  default     = "nodejs20.x"

  validation {
    condition     = can(regex("^(nodejs|python|java|dotnet|go|ruby)", var.runtime))
    error_message = "Runtime must be a valid AWS Lambda runtime."
  }
}

# ==============================================================================
# Source Code Configuration
# ==============================================================================

variable "filename" {
  description = "Path to the Lambda deployment package (local file)"
  type        = string
  default     = null
}

variable "source_code_hash" {
  description = "Base64-encoded SHA256 hash of the deployment package"
  type        = string
  default     = null
}

variable "s3_bucket" {
  description = "S3 bucket containing the Lambda deployment package"
  type        = string
  default     = null
}

variable "s3_key" {
  description = "S3 key of the Lambda deployment package"
  type        = string
  default     = null
}

variable "s3_object_version" {
  description = "S3 object version of the deployment package"
  type        = string
  default     = null
}

# ==============================================================================
# Resource Configuration
# ==============================================================================

variable "timeout" {
  description = "Lambda function timeout in seconds (max 900)"
  type        = number
  default     = 30

  validation {
    condition     = var.timeout >= 1 && var.timeout <= 900
    error_message = "Timeout must be between 1 and 900 seconds."
  }
}

variable "memory_size" {
  description = "Lambda function memory in MB (128-10240)"
  type        = number
  default     = 512

  validation {
    condition     = var.memory_size >= 128 && var.memory_size <= 10240
    error_message = "Memory size must be between 128 and 10240 MB."
  }
}

variable "architecture" {
  description = "Lambda function architecture (x86_64 or arm64)"
  type        = string
  default     = "arm64"

  validation {
    condition     = contains(["x86_64", "arm64"], var.architecture)
    error_message = "Architecture must be either x86_64 or arm64."
  }
}

variable "ephemeral_storage_size" {
  description = "Ephemeral storage size in MB (512-10240)"
  type        = number
  default     = 512

  validation {
    condition     = var.ephemeral_storage_size >= 512 && var.ephemeral_storage_size <= 10240
    error_message = "Ephemeral storage must be between 512 and 10240 MB."
  }
}

# ==============================================================================
# Concurrency Configuration
# ==============================================================================

variable "reserved_concurrency" {
  description = "Reserved concurrent executions (-1 for unreserved)"
  type        = number
  default     = -1

  validation {
    condition     = var.reserved_concurrency >= -1
    error_message = "Reserved concurrency must be -1 (unreserved) or >= 0."
  }
}

variable "provisioned_concurrency" {
  description = "Provisioned concurrent executions (0 to disable)"
  type        = number
  default     = 0

  validation {
    condition     = var.provisioned_concurrency >= 0
    error_message = "Provisioned concurrency must be >= 0."
  }
}

# ==============================================================================
# Bedrock Configuration (CRITICAL for FORGE)
# ==============================================================================

variable "enable_bedrock" {
  description = "Enable Bedrock model invocation permissions"
  type        = bool
  default     = false
}

variable "bedrock_model_arns" {
  description = "List of Bedrock model ARNs to allow invocation"
  type        = list(string)
  default     = []
}

# ==============================================================================
# VPC Configuration
# ==============================================================================

variable "vpc_config" {
  description = "VPC configuration for Lambda"
  type = object({
    vpc_id                  = string
    subnet_ids              = list(string)
    allowed_security_groups = optional(list(string), [])
  })
  default = null
}

# ==============================================================================
# Environment Variables
# ==============================================================================

variable "environment_variables" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "log_level" {
  description = "Log level for the Lambda function"
  type        = string
  default     = "info"

  validation {
    condition     = contains(["debug", "info", "warn", "error"], var.log_level)
    error_message = "Log level must be one of: debug, info, warn, error."
  }
}

# ==============================================================================
# Dead Letter Queue
# ==============================================================================

variable "dead_letter_config" {
  description = "Dead letter queue configuration"
  type = object({
    target_arn = string
  })
  default = null
}

# ==============================================================================
# Observability
# ==============================================================================

variable "enable_xray" {
  description = "Enable X-Ray tracing"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention must be a valid CloudWatch retention period."
  }
}

# ==============================================================================
# Alarms
# ==============================================================================

variable "enable_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}

variable "error_alarm_threshold" {
  description = "Error count threshold for alarm"
  type        = number
  default     = 5
}

variable "alarm_actions" {
  description = "List of ARNs to notify on alarm"
  type        = list(string)
  default     = []
}

# ==============================================================================
# API Gateway Integration
# ==============================================================================

variable "api_gateway_source_arn" {
  description = "API Gateway source ARN for Lambda permission"
  type        = string
  default     = null
}

# ==============================================================================
# Additional IAM Policies
# ==============================================================================

variable "additional_policies" {
  description = "Additional IAM policy statements"
  type = list(object({
    Sid      = optional(string)
    Effect   = string
    Action   = list(string)
    Resource = list(string)
  }))
  default = []
}

# ==============================================================================
# FORGE-specific Configuration
# ==============================================================================

variable "forge_component" {
  description = "FORGE component identifier"
  type        = string
  default     = "generic"
}

# ==============================================================================
# Tags
# ==============================================================================

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
