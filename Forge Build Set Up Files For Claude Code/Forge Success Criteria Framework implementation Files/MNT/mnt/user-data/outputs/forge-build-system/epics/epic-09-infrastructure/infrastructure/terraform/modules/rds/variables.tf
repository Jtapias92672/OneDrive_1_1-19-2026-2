/**
 * FORGE Infrastructure - RDS Module Variables
 * @epic 09 - Cloud Deployment
 */

variable "name" {
  description = "Database identifier"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "db_subnet_group_name" {
  description = "DB subnet group name"
  type        = string
}

variable "allowed_security_groups" {
  description = "Security groups allowed to connect"
  type        = list(string)
  default     = []
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to connect"
  type        = list(string)
  default     = []
}

variable "engine_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "16.1"
}

variable "instance_class" {
  description = "Instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Max allocated storage for autoscaling"
  type        = number
  default     = 100
}

variable "storage_type" {
  description = "Storage type"
  type        = string
  default     = "gp3"
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "forge"
}

variable "master_username" {
  description = "Master username"
  type        = string
  default     = "forge_admin"
}

variable "master_password" {
  description = "Master password (generated if null)"
  type        = string
  default     = null
  sensitive   = true
}

variable "multi_az" {
  description = "Enable Multi-AZ"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "Backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Maintenance window"
  type        = string
  default     = "Mon:04:00-Mon:05:00"
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot"
  type        = bool
  default     = false
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights"
  type        = bool
  default     = true
}

variable "monitoring_interval" {
  description = "Enhanced monitoring interval (0 to disable)"
  type        = number
  default     = 60
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "apply_immediately" {
  description = "Apply changes immediately"
  type        = bool
  default     = false
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

variable "tags" {
  description = "Tags for resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.main.endpoint
}

output "address" {
  description = "RDS address"
  value       = aws_db_instance.main.address
}

output "port" {
  description = "RDS port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}

output "secret_arn" {
  description = "Secrets Manager secret ARN"
  value       = aws_secretsmanager_secret.rds.arn
}

output "secret_name" {
  description = "Secrets Manager secret name"
  value       = aws_secretsmanager_secret.rds.name
}
