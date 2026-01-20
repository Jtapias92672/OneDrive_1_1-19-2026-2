/**
 * FORGE Infrastructure - VPC Module Variables
 * @epic 09 - Cloud Deployment
 */

variable "name" {
  description = "Name prefix for all resources"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones"
  type        = number
  default     = 3
}

variable "cluster_name" {
  description = "EKS cluster name for subnet tagging"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use single NAT Gateway (cost savings)"
  type        = bool
  default     = false
}

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = true
}

variable "flow_logs_retention_days" {
  description = "Flow logs retention in days"
  type        = number
  default     = 30
}

variable "enable_vpc_endpoints" {
  description = "Enable VPC endpoints"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags for all resources"
  type        = map(string)
  default     = {}
}
