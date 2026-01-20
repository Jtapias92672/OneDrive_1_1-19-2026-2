/**
 * FORGE Infrastructure - Production Variables
 * @epic 09 - Cloud Deployment
 */

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "allowed_cidrs" {
  description = "CIDRs allowed to access public endpoints"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "alert_emails" {
  description = "Email addresses for alerts"
  type        = list(string)
  default     = []
}

variable "enable_bedrock_provisioned_throughput" {
  description = "Enable Bedrock provisioned throughput for predictable performance"
  type        = bool
  default     = false
}
