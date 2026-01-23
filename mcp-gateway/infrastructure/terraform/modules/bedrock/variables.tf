# FORGE Platform - Bedrock Module Variables
# Epic 9: Infrastructure
# Extracted from main.tf for module organization best practices

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for VPC endpoint"
  type        = list(string)
}

variable "allowed_security_groups" {
  description = "Security groups allowed to access Bedrock endpoint"
  type        = list(string)
  default     = []
}

variable "enable_vpc_endpoint" {
  description = "Enable VPC endpoint for Bedrock"
  type        = bool
  default     = true
}

variable "enable_management_endpoint" {
  description = "Enable management VPC endpoint (for model listing)"
  type        = bool
  default     = false
}

variable "create_iam_role" {
  description = "Create IAM role for Bedrock access"
  type        = bool
  default     = true
}

variable "eks_oidc_provider_arn" {
  description = "EKS OIDC provider ARN for IRSA"
  type        = string
  default     = ""
}

variable "eks_oidc_provider" {
  description = "EKS OIDC provider URL (without https://)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
