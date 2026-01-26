/**
 * FORGE Infrastructure - EKS Module Variables
 * @epic 09 - Cloud Deployment
 */

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.29"
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for cluster"
  type        = list(string)
}

variable "node_subnet_ids" {
  description = "Subnet IDs for node groups"
  type        = list(string)
}

variable "endpoint_private_access" {
  description = "Enable private API endpoint"
  type        = bool
  default     = true
}

variable "endpoint_public_access" {
  description = "Enable public API endpoint"
  type        = bool
  default     = true
}

variable "public_access_cidrs" {
  description = "CIDRs for public API access"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enabled_cluster_log_types" {
  description = "Cluster log types to enable"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "cluster_log_retention_days" {
  description = "Cluster log retention days"
  type        = number
  default     = 30
}

variable "node_groups" {
  description = "Node group configurations"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    disk_size      = number
    desired_size   = number
    min_size       = number
    max_size       = number
    labels         = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  default = {
    default = {
      instance_types = ["t3.large"]
      capacity_type  = "ON_DEMAND"
      disk_size      = 50
      desired_size   = 2
      min_size       = 1
      max_size       = 5
      labels         = {}
      taints         = []
    }
  }
}

variable "tags" {
  description = "Tags for all resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "cluster_id" {
  description = "EKS cluster ID"
  value       = aws_eks_cluster.main.id
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = aws_eks_cluster.main.arn
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Cluster CA data"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "cluster_security_group_id" {
  description = "Cluster security group ID"
  value       = aws_security_group.cluster.id
}

output "node_iam_role_arn" {
  description = "Node IAM role ARN"
  value       = aws_iam_role.node.arn
}

output "oidc_provider_arn" {
  description = "OIDC provider ARN"
  value       = aws_iam_openid_connect_provider.cluster.arn
}

output "oidc_provider_url" {
  description = "OIDC provider URL"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}
