# ==============================================================================
# RDS PostgreSQL Module - Outputs
# Epic 15: EC2 Infrastructure
# ==============================================================================

# ==============================================================================
# Instance Outputs
# ==============================================================================

output "db_instance_id" {
  description = "ID of the RDS instance"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "db_instance_identifier" {
  description = "Identifier of the RDS instance"
  value       = aws_db_instance.main.identifier
}

output "db_instance_address" {
  description = "Address of the RDS instance"
  value       = aws_db_instance.main.address
}

output "db_instance_endpoint" {
  description = "Endpoint of the RDS instance (address:port)"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_port" {
  description = "Port of the RDS instance"
  value       = aws_db_instance.main.port
}

output "db_instance_resource_id" {
  description = "Resource ID of the RDS instance"
  value       = aws_db_instance.main.resource_id
}

output "db_instance_availability_zone" {
  description = "Availability zone of the RDS instance"
  value       = aws_db_instance.main.availability_zone
}

# ==============================================================================
# Database Outputs
# ==============================================================================

output "database_name" {
  description = "Name of the database"
  value       = aws_db_instance.main.db_name
}

output "master_username" {
  description = "Master username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

# ==============================================================================
# Security Group Outputs
# ==============================================================================

output "security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

output "security_group_arn" {
  description = "ARN of the RDS security group"
  value       = aws_security_group.rds.arn
}

# ==============================================================================
# Subnet Group Outputs
# ==============================================================================

output "subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}

output "subnet_group_arn" {
  description = "ARN of the DB subnet group"
  value       = aws_db_subnet_group.main.arn
}

# ==============================================================================
# Parameter Group Outputs
# ==============================================================================

output "parameter_group_name" {
  description = "Name of the DB parameter group"
  value       = aws_db_parameter_group.main.name
}

output "parameter_group_arn" {
  description = "ARN of the DB parameter group"
  value       = aws_db_parameter_group.main.arn
}

# ==============================================================================
# Secrets Manager Outputs
# ==============================================================================

output "credentials_secret_arn" {
  description = "ARN of the credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "credentials_secret_name" {
  description = "Name of the credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.name
}

# ==============================================================================
# Monitoring Outputs
# ==============================================================================

output "monitoring_role_arn" {
  description = "ARN of the enhanced monitoring IAM role"
  value       = var.monitoring_interval > 0 ? aws_iam_role.rds_monitoring[0].arn : null
}

# ==============================================================================
# Integration Config
# ==============================================================================

output "integration_config" {
  description = "Configuration for integrating with other modules"
  value = {
    endpoint          = aws_db_instance.main.endpoint
    address           = aws_db_instance.main.address
    port              = aws_db_instance.main.port
    database_name     = aws_db_instance.main.db_name
    security_group_id = aws_security_group.rds.id
    secret_arn        = aws_secretsmanager_secret.db_credentials.arn
    multi_az          = var.multi_az
  }
}

# ==============================================================================
# Connection String (for applications)
# ==============================================================================

output "connection_string_template" {
  description = "PostgreSQL connection string template (password from Secrets Manager)"
  value       = "postgresql://${var.master_username}:<PASSWORD>@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
  sensitive   = true
}
