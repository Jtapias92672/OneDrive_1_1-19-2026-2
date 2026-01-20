/**
 * FORGE Infrastructure - ElastiCache Module
 * @epic 09 - Cloud Deployment
 * 
 * Redis cluster for:
 * - Session storage
 * - Caching
 * - Rate limiting
 * - Queue backend
 */

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Auth Token
# -----------------------------------------------------------------------------

resource "random_password" "auth_token" {
  count = var.transit_encryption_enabled ? 1 : 0

  length           = 64
  special          = false
  override_special = "!&#$^<>-"
}

# -----------------------------------------------------------------------------
# Security Group
# -----------------------------------------------------------------------------

resource "aws_security_group" "redis" {
  name        = "${var.name}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
    cidr_blocks     = var.allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.name}-redis-sg"
  })
}

# -----------------------------------------------------------------------------
# Parameter Group
# -----------------------------------------------------------------------------

resource "aws_elasticache_parameter_group" "main" {
  name   = "${var.name}-redis7"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# Replication Group
# -----------------------------------------------------------------------------

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = var.name
  description          = "Redis cluster for ${var.name}"

  # Engine
  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  parameter_group_name = aws_elasticache_parameter_group.main.name
  port                 = 6379

  # Cluster
  num_cache_clusters         = var.num_cache_clusters
  automatic_failover_enabled = var.num_cache_clusters > 1
  multi_az_enabled           = var.num_cache_clusters > 1

  # Network
  subnet_group_name  = var.subnet_group_name
  security_group_ids = [aws_security_group.redis.id]

  # Security
  at_rest_encryption_enabled  = var.at_rest_encryption_enabled
  transit_encryption_enabled  = var.transit_encryption_enabled
  auth_token                  = var.transit_encryption_enabled ? random_password.auth_token[0].result : null
  auth_token_update_strategy  = "ROTATE"

  # Maintenance
  maintenance_window       = var.maintenance_window
  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = var.snapshot_window
  auto_minor_version_upgrade = true

  # Notifications
  notification_topic_arn = var.notification_topic_arn

  tags = merge(var.tags, {
    Name = var.name
  })

  lifecycle {
    ignore_changes = [auth_token]
  }
}

# -----------------------------------------------------------------------------
# Secrets Manager
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "redis" {
  count = var.transit_encryption_enabled ? 1 : 0

  name        = "${var.name}/redis/auth-token"
  description = "Redis auth token for ${var.name}"

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "redis" {
  count = var.transit_encryption_enabled ? 1 : 0

  secret_id = aws_secretsmanager_secret.redis[0].id

  secret_string = jsonencode({
    auth_token = random_password.auth_token[0].result
    host       = aws_elasticache_replication_group.main.primary_endpoint_address
    port       = 6379
  })
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------

variable "name" {
  description = "Cluster name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_group_name" {
  description = "ElastiCache subnet group name"
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
  description = "Redis version"
  type        = string
  default     = "7.1"
}

variable "node_type" {
  description = "Node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "num_cache_clusters" {
  description = "Number of cache clusters (nodes)"
  type        = number
  default     = 2
}

variable "at_rest_encryption_enabled" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "transit_encryption_enabled" {
  description = "Enable encryption in transit"
  type        = bool
  default     = true
}

variable "maintenance_window" {
  description = "Maintenance window"
  type        = string
  default     = "sun:05:00-sun:06:00"
}

variable "snapshot_retention_limit" {
  description = "Snapshot retention limit in days"
  type        = number
  default     = 7
}

variable "snapshot_window" {
  description = "Snapshot window"
  type        = string
  default     = "03:00-04:00"
}

variable "notification_topic_arn" {
  description = "SNS topic ARN for notifications"
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

output "primary_endpoint" {
  description = "Primary endpoint address"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Reader endpoint address"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "port" {
  description = "Redis port"
  value       = 6379
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.redis.id
}

output "secret_arn" {
  description = "Secrets Manager secret ARN"
  value       = var.transit_encryption_enabled ? aws_secretsmanager_secret.redis[0].arn : null
}
