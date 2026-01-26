/**
 * FORGE Infrastructure - MCP Monitoring Module
 * @epic 09 - Cloud Deployment
 * 
 * MCP-specific observability:
 * - Per-server error rate, latency, request volume
 * - Tool-level metrics
 * - Rate limiting / circuit breaker events
 * - Dashboard for operators
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
# MCP Server Alarms
# -----------------------------------------------------------------------------

# Per-server error rate alarm (template for each server)
resource "aws_cloudwatch_metric_alarm" "mcp_error_rate" {
  for_each = toset(var.mcp_servers)

  alarm_name          = "${var.name}-mcp-${each.key}-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = var.error_rate_threshold
  alarm_description   = "MCP ${each.key} server error rate is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "(errors/requests)*100"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "mcp_requests_total"
      namespace   = "FORGE/MCP"
      period      = 300
      stat        = "Sum"
      dimensions = {
        server = each.key
        status = "error"
      }
    }
  }

  metric_query {
    id = "requests"
    metric {
      metric_name = "mcp_requests_total"
      namespace   = "FORGE/MCP"
      period      = 300
      stat        = "Sum"
      dimensions = {
        server = each.key
      }
    }
  }

  tags = merge(var.tags, {
    MCPServer = each.key
  })
}

# Per-server latency alarm
resource "aws_cloudwatch_metric_alarm" "mcp_latency" {
  for_each = toset(var.mcp_servers)

  alarm_name          = "${var.name}-mcp-${each.key}-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "mcp_request_duration_seconds"
  namespace           = "FORGE/MCP"
  period              = 300
  extended_statistic  = "p99"
  threshold           = var.latency_threshold_seconds
  alarm_description   = "MCP ${each.key} server p99 latency is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    server = each.key
  }

  tags = merge(var.tags, {
    MCPServer = each.key
  })
}

# Rate limit exceeded alarm
resource "aws_cloudwatch_metric_alarm" "mcp_rate_limited" {
  for_each = toset(var.mcp_servers)

  alarm_name          = "${var.name}-mcp-${each.key}-rate-limited"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "mcp_rate_limit_exceeded"
  namespace           = "FORGE/MCP"
  period              = 300
  statistic           = "Sum"
  threshold           = var.rate_limit_threshold
  alarm_description   = "MCP ${each.key} server is hitting rate limits"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    server = each.key
  }

  tags = merge(var.tags, {
    MCPServer = each.key
  })
}

# Circuit breaker open alarm
resource "aws_cloudwatch_metric_alarm" "mcp_circuit_breaker" {
  for_each = toset(var.mcp_servers)

  alarm_name          = "${var.name}-mcp-${each.key}-circuit-open"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "mcp_circuit_breaker_state"
  namespace           = "FORGE/MCP"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0  # 0 = closed, 1 = open
  alarm_description   = "MCP ${each.key} server circuit breaker is OPEN"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    server = each.key
  }

  tags = merge(var.tags, {
    MCPServer = each.key
    Severity  = "critical"
  })
}

# Availability alarm (no healthy pods)
resource "aws_cloudwatch_metric_alarm" "mcp_availability" {
  for_each = toset(var.mcp_servers)

  alarm_name          = "${var.name}-mcp-${each.key}-unavailable"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "mcp_server_ready"
  namespace           = "FORGE/MCP"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "MCP ${each.key} server has no healthy pods"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions
  treat_missing_data  = "breaching"

  dimensions = {
    server = each.key
  }

  tags = merge(var.tags, {
    MCPServer = each.key
    Severity  = "critical"
  })
}

# -----------------------------------------------------------------------------
# Tool-Level Metrics Alarms
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "mcp_tool_failures" {
  alarm_name          = "${var.name}-mcp-tool-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "mcp_tool_failures_total"
  namespace           = "FORGE/MCP"
  period              = 300
  statistic           = "Sum"
  threshold           = var.tool_failure_threshold
  alarm_description   = "MCP tool failures are elevated across all servers"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions
  treat_missing_data  = "notBreaching"

  tags = var.tags
}

# -----------------------------------------------------------------------------
# MCP Dashboard
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_dashboard" "mcp" {
  dashboard_name = "${var.name}-mcp"

  dashboard_body = jsonencode({
    widgets = [
      # Header
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# MCP Server Dashboard - ${var.environment}"
        }
      },
      # Server Health Overview
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 8
        height = 6
        properties = {
          title   = "MCP Server Availability"
          region  = var.aws_region
          metrics = [
            for server in var.mcp_servers : ["FORGE/MCP", "mcp_server_ready", "server", server]
          ]
          period = 60
          stat   = "Minimum"
          view   = "timeSeries"
          stacked = false
        }
      },
      # Request Volume
      {
        type   = "metric"
        x      = 8
        y      = 1
        width  = 8
        height = 6
        properties = {
          title   = "Request Volume by Server"
          region  = var.aws_region
          metrics = [
            for server in var.mcp_servers : ["FORGE/MCP", "mcp_requests_total", "server", server]
          ]
          period = 300
          stat   = "Sum"
          view   = "timeSeries"
          stacked = true
        }
      },
      # Error Rate
      {
        type   = "metric"
        x      = 16
        y      = 1
        width  = 8
        height = 6
        properties = {
          title   = "Error Rate by Server"
          region  = var.aws_region
          metrics = [
            for server in var.mcp_servers : [
              { expression = "SEARCH('{FORGE/MCP,server,status} server=\"${server}\" AND status=\"error\"', 'Sum', 300) / SEARCH('{FORGE/MCP,server} server=\"${server}\"', 'Sum', 300) * 100", label = server, id = "e_${server}" }
            ]
          ]
          period = 300
          view   = "timeSeries"
          yAxis = {
            left = { min = 0, max = 100 }
          }
        }
      },
      # Latency (p99)
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 12
        height = 6
        properties = {
          title   = "p99 Latency by Server (seconds)"
          region  = var.aws_region
          metrics = [
            for server in var.mcp_servers : ["FORGE/MCP", "mcp_request_duration_seconds", "server", server, { stat = "p99" }]
          ]
          period = 300
          view   = "timeSeries"
        }
      },
      # Rate Limits
      {
        type   = "metric"
        x      = 12
        y      = 7
        width  = 12
        height = 6
        properties = {
          title   = "Rate Limit Events"
          region  = var.aws_region
          metrics = [
            for server in var.mcp_servers : ["FORGE/MCP", "mcp_rate_limit_exceeded", "server", server]
          ]
          period = 300
          stat   = "Sum"
          view   = "timeSeries"
        }
      },
      # Top Tools by Usage
      {
        type   = "metric"
        x      = 0
        y      = 13
        width  = 12
        height = 6
        properties = {
          title   = "Top Tools by Invocation Count"
          region  = var.aws_region
          metrics = [
            ["FORGE/MCP", "mcp_tool_invocations", { stat = "Sum" }]
          ]
          period = 300
          view   = "bar"
        }
      },
      # Tool Failures
      {
        type   = "metric"
        x      = 12
        y      = 13
        width  = 12
        height = 6
        properties = {
          title   = "Tool Failures by Server"
          region  = var.aws_region
          metrics = [
            for server in var.mcp_servers : ["FORGE/MCP", "mcp_tool_failures_total", "server", server]
          ]
          period = 300
          stat   = "Sum"
          view   = "timeSeries"
        }
      },
      # Circuit Breaker Status
      {
        type   = "metric"
        x      = 0
        y      = 19
        width  = 12
        height = 4
        properties = {
          title   = "Circuit Breaker State (0=Closed, 1=Open)"
          region  = var.aws_region
          metrics = [
            for server in var.mcp_servers : ["FORGE/MCP", "mcp_circuit_breaker_state", "server", server]
          ]
          period = 60
          stat   = "Maximum"
          view   = "singleValue"
        }
      },
      # Active Connections
      {
        type   = "metric"
        x      = 12
        y      = 19
        width  = 12
        height = 4
        properties = {
          title   = "Active Connections per Server"
          region  = var.aws_region
          metrics = [
            for server in var.mcp_servers : ["FORGE/MCP", "mcp_active_connections", "server", server]
          ]
          period = 60
          stat   = "Average"
          view   = "singleValue"
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------

variable "name" {
  description = "Name prefix for resources"
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

variable "mcp_servers" {
  description = "List of MCP server names to monitor"
  type        = list(string)
  default     = ["filesystem", "github", "slack", "web-search", "database"]
}

variable "alarm_actions" {
  description = "SNS topic ARNs for alarms"
  type        = list(string)
  default     = []
}

variable "error_rate_threshold" {
  description = "Error rate threshold percentage"
  type        = number
  default     = 5
}

variable "latency_threshold_seconds" {
  description = "p99 latency threshold in seconds"
  type        = number
  default     = 5
}

variable "rate_limit_threshold" {
  description = "Rate limit events threshold"
  type        = number
  default     = 10
}

variable "tool_failure_threshold" {
  description = "Tool failure count threshold"
  type        = number
  default     = 20
}

variable "tags" {
  description = "Tags for all resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "dashboard_name" {
  description = "MCP dashboard name"
  value       = aws_cloudwatch_dashboard.mcp.dashboard_name
}

output "dashboard_url" {
  description = "MCP dashboard URL"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.mcp.dashboard_name}"
}

output "alarm_arns" {
  description = "Map of alarm ARNs by server"
  value = {
    for server in var.mcp_servers : server => {
      error_rate      = aws_cloudwatch_metric_alarm.mcp_error_rate[server].arn
      latency         = aws_cloudwatch_metric_alarm.mcp_latency[server].arn
      rate_limited    = aws_cloudwatch_metric_alarm.mcp_rate_limited[server].arn
      circuit_breaker = aws_cloudwatch_metric_alarm.mcp_circuit_breaker[server].arn
      availability    = aws_cloudwatch_metric_alarm.mcp_availability[server].arn
    }
  }
}
