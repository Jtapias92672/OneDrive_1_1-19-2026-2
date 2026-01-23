/**
 * FORGE Infrastructure - Bedrock Module
 * @epic 09 - Cloud Deployment (Epic 09A: Bedrock Environment Enablement)
 * 
 * Bedrock infrastructure prerequisites:
 * - VPC Endpoints for private connectivity
 * - IAM roles with least-privilege policies
 * - Provisioned throughput / inference profiles (optional)
 * - Model access permissions
 * - Cost allocation tags
 * - CloudWatch metrics and alarms
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

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_partition" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  partition  = data.aws_partition.current.partition
}

# -----------------------------------------------------------------------------
# VPC Endpoints for Bedrock (Private Connectivity)
# -----------------------------------------------------------------------------

resource "aws_security_group" "bedrock_endpoint" {
  count = var.enable_private_connectivity ? 1 : 0

  name        = "${var.name}-bedrock-endpoint-sg"
  description = "Security group for Bedrock VPC endpoints"
  vpc_id      = var.vpc_id

  ingress {
    description     = "HTTPS from VPC"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    cidr_blocks     = [var.vpc_cidr]
    security_groups = var.allowed_security_groups
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.name}-bedrock-endpoint-sg"
  })
}

# Bedrock Runtime Endpoint (for InvokeModel)
resource "aws_vpc_endpoint" "bedrock_runtime" {
  count = var.enable_private_connectivity ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${local.region}.bedrock-runtime"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.bedrock_endpoint[0].id]
  private_dns_enabled = true

  tags = merge(var.tags, {
    Name    = "${var.name}-bedrock-runtime-endpoint"
    Service = "bedrock-runtime"
  })
}

# Bedrock Control Plane Endpoint (for management APIs)
resource "aws_vpc_endpoint" "bedrock" {
  count = var.enable_private_connectivity ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${local.region}.bedrock"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.bedrock_endpoint[0].id]
  private_dns_enabled = true

  tags = merge(var.tags, {
    Name    = "${var.name}-bedrock-endpoint"
    Service = "bedrock"
  })
}

# Bedrock Agent Runtime Endpoint (if using Agents)
resource "aws_vpc_endpoint" "bedrock_agent_runtime" {
  count = var.enable_private_connectivity && var.enable_bedrock_agents ? 1 : 0

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${local.region}.bedrock-agent-runtime"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.bedrock_endpoint[0].id]
  private_dns_enabled = true

  tags = merge(var.tags, {
    Name    = "${var.name}-bedrock-agent-runtime-endpoint"
    Service = "bedrock-agent-runtime"
  })
}

# -----------------------------------------------------------------------------
# IAM Role for Bedrock Invocation (IRSA)
# -----------------------------------------------------------------------------

resource "aws_iam_role" "bedrock_invoker" {
  name = "${var.name}-bedrock-invoker"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = var.oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "${replace(var.oidc_provider_url, "https://", "")}:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "${replace(var.oidc_provider_url, "https://", "")}:sub" = "system:serviceaccount:${var.namespace}:*"
        }
      }
    }]
  })

  tags = merge(var.tags, {
    Purpose = "bedrock-invocation"
  })
}

# Bedrock Model Invocation Policy (Least Privilege)
resource "aws_iam_role_policy" "bedrock_invoke" {
  name = "${var.name}-bedrock-invoke-policy"
  role = aws_iam_role.bedrock_invoker.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "InvokeAllowedModels"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          for model in var.allowed_models :
          "arn:${local.partition}:bedrock:${local.region}::foundation-model/${model}"
        ]
        Condition = var.enable_request_tagging ? {
          "ForAllValues:StringEquals" = {
            "bedrock:RequestTag/Environment" = [var.environment]
            "bedrock:RequestTag/Project"     = ["FORGE"]
          }
        } : null
      },
      {
        Sid    = "InvokeProvisionedThroughput"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:${local.partition}:bedrock:${local.region}:${local.account_id}:provisioned-model-throughput/*"
        ]
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Environment" = var.environment
          }
        }
      },
      {
        Sid    = "ListModels"
        Effect = "Allow"
        Action = [
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel"
        ]
        Resource = "*"
      }
    ]
  })
}

# Bedrock Agents Policy (if enabled)
resource "aws_iam_role_policy" "bedrock_agents" {
  count = var.enable_bedrock_agents ? 1 : 0

  name = "${var.name}-bedrock-agents-policy"
  role = aws_iam_role.bedrock_invoker.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "InvokeAgents"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeAgent"
        ]
        Resource = [
          "arn:${local.partition}:bedrock:${local.region}:${local.account_id}:agent/*"
        ]
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Environment" = var.environment
          }
        }
      },
      {
        Sid    = "RetrieveKnowledgeBase"
        Effect = "Allow"
        Action = [
          "bedrock:Retrieve",
          "bedrock:RetrieveAndGenerate"
        ]
        Resource = [
          "arn:${local.partition}:bedrock:${local.region}:${local.account_id}:knowledge-base/*"
        ]
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Environment" = var.environment
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Provisioned Throughput (Optional - for predictable performance/cost)
# -----------------------------------------------------------------------------

resource "aws_bedrock_provisioned_model_throughput" "main" {
  for_each = var.provisioned_throughput

  provisioned_model_name = "${var.name}-${each.key}"
  model_arn              = "arn:${local.partition}:bedrock:${local.region}::foundation-model/${each.value.model_id}"
  model_units            = each.value.model_units

  commitment_duration = each.value.commitment_duration # "ONE_MONTH" or "SIX_MONTHS" or null for no commitment

  tags = merge(var.tags, {
    Name        = "${var.name}-${each.key}"
    Environment = var.environment
    Model       = each.value.model_id
    CostCenter  = var.cost_center
  })
}

# -----------------------------------------------------------------------------
# Model Access (Enable specific models for the account)
# -----------------------------------------------------------------------------

# Note: Model access must be enabled via the AWS Console or AWS CLI
# This data source checks if models are accessible
data "aws_bedrock_foundation_model" "allowed" {
  for_each = toset(var.allowed_models)

  model_id = each.value
}

# -----------------------------------------------------------------------------
# CloudWatch Monitoring for Bedrock
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "bedrock" {
  name              = "/forge/${var.environment}/bedrock"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Service = "bedrock"
  })
}

# Invocation Latency Alarm
resource "aws_cloudwatch_metric_alarm" "bedrock_latency" {
  alarm_name          = "${var.name}-bedrock-latency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "InvocationLatency"
  namespace           = "AWS/Bedrock"
  period              = 300
  statistic           = "Average"
  threshold           = var.latency_threshold_ms
  alarm_description   = "Bedrock invocation latency is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    ModelId = var.primary_model_id
  }

  tags = var.tags
}

# Throttling Alarm
resource "aws_cloudwatch_metric_alarm" "bedrock_throttles" {
  alarm_name          = "${var.name}-bedrock-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "InvocationThrottles"
  namespace           = "AWS/Bedrock"
  period              = 300
  statistic           = "Sum"
  threshold           = var.throttle_threshold
  alarm_description   = "Bedrock invocations are being throttled"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    ModelId = var.primary_model_id
  }

  tags = var.tags
}

# Error Rate Alarm
resource "aws_cloudwatch_metric_alarm" "bedrock_errors" {
  alarm_name          = "${var.name}-bedrock-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5
  alarm_description   = "Bedrock error rate is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  metric_query {
    id          = "error_rate"
    expression  = "(errors/invocations)*100"
    label       = "Error Rate"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "InvocationClientErrors"
      namespace   = "AWS/Bedrock"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ModelId = var.primary_model_id
      }
    }
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Bedrock"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ModelId = var.primary_model_id
      }
    }
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# Cost Allocation Dashboard
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_dashboard" "bedrock" {
  dashboard_name = "${var.name}-bedrock"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# Bedrock Usage Dashboard - ${var.environment}"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 8
        height = 6
        properties = {
          title   = "Invocations"
          region  = local.region
          metrics = [
            ["AWS/Bedrock", "Invocations", "ModelId", var.primary_model_id]
          ]
          period = 300
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 1
        width  = 8
        height = 6
        properties = {
          title   = "Latency (p99)"
          region  = local.region
          metrics = [
            ["AWS/Bedrock", "InvocationLatency", "ModelId", var.primary_model_id]
          ]
          period = 300
          stat   = "p99"
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 1
        width  = 8
        height = 6
        properties = {
          title   = "Throttles"
          region  = local.region
          metrics = [
            ["AWS/Bedrock", "InvocationThrottles", "ModelId", var.primary_model_id]
          ]
          period = 300
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 12
        height = 6
        properties = {
          title   = "Input Tokens"
          region  = local.region
          metrics = [
            ["AWS/Bedrock", "InputTokenCount", "ModelId", var.primary_model_id]
          ]
          period = 300
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 7
        width  = 12
        height = 6
        properties = {
          title   = "Output Tokens"
          region  = local.region
          metrics = [
            ["AWS/Bedrock", "OutputTokenCount", "ModelId", var.primary_model_id]
          ]
          period = 300
          stat   = "Sum"
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Service Control Policy Recommendations (for AWS Organizations)
# Output as a reference - apply at OU level
# -----------------------------------------------------------------------------

output "recommended_scp" {
  description = "Recommended Service Control Policy for Bedrock governance"
  value = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyUntaggedBedrockInvocations"
        Effect = "Deny"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*"
        Condition = {
          Null = {
            "bedrock:RequestTag/Environment" = "true"
          }
        }
      },
      {
        Sid    = "DenyUnapprovedModels"
        Effect = "Deny"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*"
        Condition = {
          "ForAnyValue:StringNotLike" = {
            "bedrock:ModelId" = var.allowed_models
          }
        }
      }
    ]
  })
}
