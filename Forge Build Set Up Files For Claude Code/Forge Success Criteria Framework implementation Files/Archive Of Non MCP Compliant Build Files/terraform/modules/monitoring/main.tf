/**
 * FORGE Infrastructure - Monitoring Module
 * @epic 09 - Cloud Deployment
 * 
 * CloudWatch monitoring:
 * - Log groups
 * - Metrics alarms
 * - Dashboard
 * - SNS notifications
 */

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# -----------------------------------------------------------------------------
# SNS Topic for Alerts
# -----------------------------------------------------------------------------

resource "aws_sns_topic" "alerts" {
  name = "${var.name}-alerts"

  tags = merge(var.tags, {
    Name = "${var.name}-alerts"
  })
}

resource "aws_sns_topic_subscription" "email" {
  for_each = toset(var.alert_emails)

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

# -----------------------------------------------------------------------------
# Log Groups
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "forge_api" {
  name              = "/forge/${var.environment}/api"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Service = "forge-api"
  })
}

resource "aws_cloudwatch_log_group" "convergence_engine" {
  name              = "/forge/${var.environment}/convergence-engine"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Service = "convergence-engine"
  })
}

resource "aws_cloudwatch_log_group" "evidence_service" {
  name              = "/forge/${var.environment}/evidence-service"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Service = "evidence-service"
  })
}

resource "aws_cloudwatch_log_group" "governance_gateway" {
  name              = "/forge/${var.environment}/governance-gateway"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Service = "governance-gateway"
  })
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms
# -----------------------------------------------------------------------------

# EKS Cluster CPU Alarm
resource "aws_cloudwatch_metric_alarm" "eks_cpu_high" {
  alarm_name          = "${var.name}-eks-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "node_cpu_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EKS cluster CPU utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.cluster_name
  }

  tags = var.tags
}

# EKS Cluster Memory Alarm
resource "aws_cloudwatch_metric_alarm" "eks_memory_high" {
  alarm_name          = "${var.name}-eks-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "node_memory_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "EKS cluster memory utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.cluster_name
  }

  tags = var.tags
}

# RDS CPU Alarm
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  count = var.rds_instance_id != null ? 1 : 0

  alarm_name          = "${var.name}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = var.tags
}

# RDS Free Storage Alarm
resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  count = var.rds_instance_id != null ? 1 : 0

  alarm_name          = "${var.name}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120 # 5GB in bytes
  alarm_description   = "RDS free storage is low"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = var.tags
}

# ElastiCache CPU Alarm
resource "aws_cloudwatch_metric_alarm" "redis_cpu_high" {
  count = var.elasticache_cluster_id != null ? 1 : 0

  alarm_name          = "${var.name}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "ElastiCache CPU utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = var.elasticache_cluster_id
  }

  tags = var.tags
}

# API Error Rate Alarm
resource "aws_cloudwatch_metric_alarm" "api_error_rate" {
  alarm_name          = "${var.name}-api-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5
  alarm_description   = "API error rate is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  metric_query {
    id          = "error_rate"
    expression  = "(errors/requests)*100"
    label       = "Error Rate"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "5XXError"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }

  metric_query {
    id = "requests"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# CloudWatch Dashboard
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# FORGE Platform Dashboard - ${var.environment}"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 12
        height = 6
        properties = {
          title  = "EKS Cluster CPU"
          region = var.aws_region
          metrics = [
            ["ContainerInsights", "node_cpu_utilization", "ClusterName", var.cluster_name]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 1
        width  = 12
        height = 6
        properties = {
          title  = "EKS Cluster Memory"
          region = var.aws_region
          metrics = [
            ["ContainerInsights", "node_memory_utilization", "ClusterName", var.cluster_name]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "RDS CPU"
          region = var.aws_region
          metrics = var.rds_instance_id != null ? [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id]
          ] : []
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "RDS Connections"
          region = var.aws_region
          metrics = var.rds_instance_id != null ? [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", var.rds_instance_id]
          ] : []
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "Redis CPU"
          region = var.aws_region
          metrics = var.elasticache_cluster_id != null ? [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", var.elasticache_cluster_id]
          ] : []
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 13
        width  = 12
        height = 6
        properties = {
          title  = "ALB Request Count"
          region = var.aws_region
          metrics = var.alb_arn_suffix != null ? [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix]
          ] : []
          period = 60
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 13
        width  = 12
        height = 6
        properties = {
          title  = "ALB Target Response Time"
          region = var.aws_region
          metrics = var.alb_arn_suffix != null ? [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix]
          ] : []
          period = 60
          stat   = "Average"
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------

variable "name" {
  description = "Name prefix"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "rds_instance_id" {
  description = "RDS instance ID"
  type        = string
  default     = null
}

variable "elasticache_cluster_id" {
  description = "ElastiCache cluster ID"
  type        = string
  default     = null
}

variable "alb_arn_suffix" {
  description = "ALB ARN suffix"
  type        = string
  default     = null
}

variable "alert_emails" {
  description = "Email addresses for alerts"
  type        = list(string)
  default     = []
}

variable "log_retention_days" {
  description = "Log retention in days"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags for resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "sns_topic_arn" {
  description = "SNS topic ARN"
  value       = aws_sns_topic.alerts.arn
}

output "dashboard_name" {
  description = "Dashboard name"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "log_group_arns" {
  description = "Log group ARNs"
  value = {
    forge_api         = aws_cloudwatch_log_group.forge_api.arn
    convergence_engine = aws_cloudwatch_log_group.convergence_engine.arn
    evidence_service   = aws_cloudwatch_log_group.evidence_service.arn
    governance_gateway = aws_cloudwatch_log_group.governance_gateway.arn
  }
}
