/**
 * FORGE Infrastructure - Lambda Module Variables
 * @epic 09 - Cloud Deployment
 */

# -----------------------------------------------------------------------------
# Required Variables
# -----------------------------------------------------------------------------

variable "name" {
  description = "Name prefix for the Lambda function"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "handler" {
  description = "Lambda function handler (e.g., index.handler)"
  type        = string
}

variable "runtime" {
  description = "Lambda runtime (e.g., nodejs20.x, python3.12)"
  type        = string
  default     = "nodejs20.x"
}

# -----------------------------------------------------------------------------
# Deployment Package
# -----------------------------------------------------------------------------

variable "filename" {
  description = "Path to the Lambda deployment package (.zip)"
  type        = string
  default     = null
}

variable "source_code_hash" {
  description = "Hash of the deployment package for change detection"
  type        = string
  default     = null
}

variable "s3_bucket" {
  description = "S3 bucket containing the deployment package"
  type        = string
  default     = null
}

variable "s3_key" {
  description = "S3 key for the deployment package"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Function Configuration
# -----------------------------------------------------------------------------

variable "description" {
  description = "Description of the Lambda function"
  type        = string
  default     = "FORGE Lambda function"
}

variable "timeout" {
  description = "Function timeout in seconds (max 900)"
  type        = number
  default     = 30
}

variable "memory_size" {
  description = "Function memory in MB (128-10240)"
  type        = number
  default     = 256
}

variable "architecture" {
  description = "Instruction set architecture (x86_64 or arm64)"
  type        = string
  default     = "arm64"  # Cost-effective for most workloads
}

variable "environment_variables" {
  description = "Environment variables for the function"
  type        = map(string)
  default     = {}
}

variable "reserved_concurrency" {
  description = "Reserved concurrent executions (-1 for no limit)"
  type        = number
  default     = -1
}

variable "provisioned_concurrency" {
  description = "Provisioned concurrent executions (0 to disable)"
  type        = number
  default     = 0
}

# -----------------------------------------------------------------------------
# VPC Configuration (Private Subnet Deployment)
# -----------------------------------------------------------------------------

variable "vpc_config" {
  description = "VPC configuration for Lambda (null for public Lambda)"
  type = object({
    vpc_id                       = string
    subnet_ids                   = list(string)
    allowed_security_groups      = list(string)
    additional_security_groups   = optional(list(string), [])
  })
  default = null
}

# -----------------------------------------------------------------------------
# Bedrock Integration (FORGE-specific)
# -----------------------------------------------------------------------------

variable "enable_bedrock" {
  description = "Enable Bedrock model invocation permissions"
  type        = bool
  default     = true
}

variable "bedrock_model_arns" {
  description = "List of Bedrock model ARNs to allow invocation"
  type        = list(string)
  default     = [
    "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
    "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0",
    "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-opus-20240229-v1:0"
  ]
}

# -----------------------------------------------------------------------------
# FORGE Component Identification
# -----------------------------------------------------------------------------

variable "forge_component" {
  description = "FORGE component this Lambda belongs to"
  type        = string
  default     = "forge-worker"
  validation {
    condition = contains([
      "forge-worker",
      "convergence-engine", 
      "mcp-gateway",
      "figma-parser",
      "react-generator",
      "test-generator",
      "evidence-pack"
    ], var.forge_component)
    error_message = "forge_component must be a valid FORGE component name"
  }
}

# -----------------------------------------------------------------------------
# Logging & Tracing
# -----------------------------------------------------------------------------

variable "enable_xray" {
  description = "Enable X-Ray tracing"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# -----------------------------------------------------------------------------
# Dead Letter Queue
# -----------------------------------------------------------------------------

variable "dead_letter_queue_arn" {
  description = "ARN of SQS queue or SNS topic for failed invocations"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# API Gateway Integration
# -----------------------------------------------------------------------------

variable "api_gateway_execution_arn" {
  description = "API Gateway execution ARN for permissions"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Scheduled Invocation
# -----------------------------------------------------------------------------

variable "schedule_expression" {
  description = "EventBridge schedule expression (e.g., rate(5 minutes))"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Alarms
# -----------------------------------------------------------------------------

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
  description = "SNS topic ARNs for alarm notifications"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
