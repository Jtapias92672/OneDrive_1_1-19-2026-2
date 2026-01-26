/**
 * FORGE Infrastructure - Bedrock Module Variables
 * @epic 09 - Cloud Deployment (Epic 09A: Bedrock Environment Enablement)
 */

# -----------------------------------------------------------------------------
# General
# -----------------------------------------------------------------------------

variable "name" {
  description = "Name prefix for resources"
  type        = string
}

variable "environment" {
  description = "Environment name (dev/staging/prod)"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace for IRSA"
  type        = string
  default     = "forge"
}

variable "cost_center" {
  description = "Cost center for billing allocation"
  type        = string
  default     = "platform"
}

variable "tags" {
  description = "Tags for all resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# VPC / Networking
# -----------------------------------------------------------------------------

variable "vpc_id" {
  description = "VPC ID for endpoints"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for VPC endpoints"
  type        = list(string)
}

variable "allowed_security_groups" {
  description = "Security groups allowed to access Bedrock endpoints"
  type        = list(string)
  default     = []
}

variable "enable_private_connectivity" {
  description = "Enable VPC endpoints for private Bedrock access"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# IAM / IRSA
# -----------------------------------------------------------------------------

variable "oidc_provider_arn" {
  description = "OIDC provider ARN for IRSA"
  type        = string
}

variable "oidc_provider_url" {
  description = "OIDC provider URL for IRSA"
  type        = string
}

variable "enable_request_tagging" {
  description = "Enforce request tagging for cost allocation"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Model Configuration
# -----------------------------------------------------------------------------

variable "allowed_models" {
  description = "List of allowed Bedrock model IDs"
  type        = list(string)
  default = [
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-3-5-haiku-20241022-v1:0",
    "anthropic.claude-3-opus-20240229-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0"
  ]
}

variable "primary_model_id" {
  description = "Primary model ID for monitoring"
  type        = string
  default     = "anthropic.claude-3-5-sonnet-20241022-v2:0"
}

# -----------------------------------------------------------------------------
# Bedrock Agents (Optional)
# -----------------------------------------------------------------------------

variable "enable_bedrock_agents" {
  description = "Enable Bedrock Agents support"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Provisioned Throughput (Optional)
# -----------------------------------------------------------------------------

variable "provisioned_throughput" {
  description = "Map of provisioned throughput configurations"
  type = map(object({
    model_id            = string
    model_units         = number
    commitment_duration = string # "ONE_MONTH", "SIX_MONTHS", or null
  }))
  default = {}
  # Example:
  # {
  #   claude-sonnet = {
  #     model_id            = "anthropic.claude-3-5-sonnet-20241022-v2:0"
  #     model_units         = 1
  #     commitment_duration = null
  #   }
  # }
}

# -----------------------------------------------------------------------------
# Monitoring
# -----------------------------------------------------------------------------

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "alarm_actions" {
  description = "SNS topic ARNs for alarms"
  type        = list(string)
  default     = []
}

variable "latency_threshold_ms" {
  description = "Latency threshold for alarms (milliseconds)"
  type        = number
  default     = 10000 # 10 seconds
}

variable "throttle_threshold" {
  description = "Throttle count threshold for alarms"
  type        = number
  default     = 10
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "bedrock_invoker_role_arn" {
  description = "IAM role ARN for Bedrock invocation"
  value       = aws_iam_role.bedrock_invoker.arn
}

output "bedrock_invoker_role_name" {
  description = "IAM role name for Bedrock invocation"
  value       = aws_iam_role.bedrock_invoker.name
}

output "bedrock_runtime_endpoint_id" {
  description = "Bedrock runtime VPC endpoint ID"
  value       = var.enable_private_connectivity ? aws_vpc_endpoint.bedrock_runtime[0].id : null
}

output "bedrock_endpoint_id" {
  description = "Bedrock control plane VPC endpoint ID"
  value       = var.enable_private_connectivity ? aws_vpc_endpoint.bedrock[0].id : null
}

output "bedrock_endpoint_security_group_id" {
  description = "Security group ID for Bedrock endpoints"
  value       = var.enable_private_connectivity ? aws_security_group.bedrock_endpoint[0].id : null
}

output "provisioned_throughput_arns" {
  description = "ARNs of provisioned throughput resources"
  value = {
    for k, v in aws_bedrock_provisioned_model_throughput.main : k => v.provisioned_model_arn
  }
}

output "allowed_model_ids" {
  description = "List of allowed model IDs"
  value       = var.allowed_models
}

output "dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = aws_cloudwatch_dashboard.bedrock.dashboard_name
}

output "log_group_name" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.bedrock.name
}
