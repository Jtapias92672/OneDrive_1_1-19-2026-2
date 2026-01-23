# FORGE Platform - Lambda Function Module
# Epic 9: Infrastructure
# Task 9.4.5: Lambda Function Module with Bedrock Integration
#
# Features:
# - Lambda function deployment with VPC support
# - Bedrock model invocation permissions (Claude Sonnet, Haiku, Opus)
# - X-Ray tracing + CloudWatch logging
# - Provisioned concurrency for FORGE workers
# - Dead letter queue configuration

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# ==============================================================================
# Local Variables
# ==============================================================================
locals {
  function_name = "${var.name}-${var.environment}"

  default_tags = {
    Project     = "FORGE"
    Component   = var.forge_component
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  tags = merge(local.default_tags, var.tags)

  # Bedrock model ARNs for the region
  bedrock_model_arns = var.enable_bedrock ? concat(
    var.bedrock_model_arns,
    [
      "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/anthropic.claude-3-5-sonnet-*",
      "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/anthropic.claude-3-5-haiku-*",
      "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/anthropic.claude-3-opus-*",
    ]
  ) : []
}

# ==============================================================================
# Data Sources
# ==============================================================================
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# ==============================================================================
# IAM Role for Lambda Execution
# ==============================================================================
resource "aws_iam_role" "lambda_execution" {
  name = "${local.function_name}-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.tags
}

# ==============================================================================
# IAM Policy - Basic Lambda Execution
# ==============================================================================
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ==============================================================================
# IAM Policy - VPC Access (if VPC enabled)
# ==============================================================================
resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  count      = var.vpc_config != null ? 1 : 0
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# ==============================================================================
# IAM Policy - Bedrock Model Invocation (CRITICAL)
# ==============================================================================
resource "aws_iam_role_policy" "bedrock_invocation" {
  count = var.enable_bedrock ? 1 : 0
  name  = "${local.function_name}-bedrock-policy"
  role  = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BedrockModelInvocation"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = local.bedrock_model_arns
      },
      {
        Sid    = "BedrockModelAccess"
        Effect = "Allow"
        Action = [
          "bedrock:GetFoundationModel",
          "bedrock:ListFoundationModels"
        ]
        Resource = "*"
      }
    ]
  })
}

# ==============================================================================
# IAM Policy - X-Ray Tracing
# ==============================================================================
resource "aws_iam_role_policy_attachment" "xray_tracing" {
  count      = var.enable_xray ? 1 : 0
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# ==============================================================================
# IAM Policy - Dead Letter Queue
# ==============================================================================
resource "aws_iam_role_policy" "dlq_access" {
  count = var.dead_letter_config != null ? 1 : 0
  name  = "${local.function_name}-dlq-policy"
  role  = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = var.dead_letter_config.target_arn
      }
    ]
  })
}

# ==============================================================================
# IAM Policy - Additional Permissions
# ==============================================================================
resource "aws_iam_role_policy" "additional_permissions" {
  count = length(var.additional_policies) > 0 ? 1 : 0
  name  = "${local.function_name}-additional-policy"
  role  = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = var.additional_policies
  })
}

# ==============================================================================
# Security Group for Lambda (if VPC enabled)
# ==============================================================================
resource "aws_security_group" "lambda" {
  count       = var.vpc_config != null ? 1 : 0
  name        = "${local.function_name}-sg"
  description = "Security group for ${local.function_name} Lambda function"
  vpc_id      = var.vpc_config.vpc_id

  # Egress: Allow HTTPS to AWS services (Bedrock, S3, etc.)
  egress {
    description = "HTTPS to AWS services"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress: Allow DNS
  egress {
    description = "DNS"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Dynamic egress rules for allowed security groups
  dynamic "egress" {
    for_each = var.vpc_config.allowed_security_groups
    content {
      description     = "Access to ${egress.value}"
      from_port       = 0
      to_port         = 65535
      protocol        = "tcp"
      security_groups = [egress.value]
    }
  }

  tags = merge(local.tags, {
    Name = "${local.function_name}-sg"
  })
}

# ==============================================================================
# CloudWatch Log Group
# ==============================================================================
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = var.log_retention_days

  tags = local.tags
}

# ==============================================================================
# Lambda Function
# ==============================================================================
resource "aws_lambda_function" "forge_function" {
  function_name = local.function_name
  role          = aws_iam_role.lambda_execution.arn
  handler       = var.handler
  runtime       = var.runtime
  timeout       = var.timeout
  memory_size   = var.memory_size
  architectures = [var.architecture]

  # Source code
  filename         = var.filename
  source_code_hash = var.source_code_hash
  s3_bucket        = var.s3_bucket
  s3_key           = var.s3_key
  s3_object_version = var.s3_object_version

  # Environment variables
  environment {
    variables = merge(var.environment_variables, {
      FORGE_ENVIRONMENT   = var.environment
      FORGE_COMPONENT     = var.forge_component
      BEDROCK_ENABLED     = var.enable_bedrock ? "true" : "false"
      BEDROCK_REGION      = data.aws_region.current.name
      LOG_LEVEL           = var.log_level
      NODE_OPTIONS        = "--enable-source-maps"
    })
  }

  # VPC Configuration
  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = [aws_security_group.lambda[0].id]
    }
  }

  # Dead Letter Queue
  dynamic "dead_letter_config" {
    for_each = var.dead_letter_config != null ? [var.dead_letter_config] : []
    content {
      target_arn = dead_letter_config.value.target_arn
    }
  }

  # X-Ray Tracing
  tracing_config {
    mode = var.enable_xray ? "Active" : "PassThrough"
  }

  # Reserved concurrency (optional)
  reserved_concurrent_executions = var.reserved_concurrency

  # Ephemeral storage
  ephemeral_storage {
    size = var.ephemeral_storage_size
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy_attachment.lambda_basic_execution,
  ]

  tags = local.tags
}

# ==============================================================================
# Lambda Provisioned Concurrency (for FORGE workers)
# ==============================================================================
resource "aws_lambda_provisioned_concurrency_config" "forge" {
  count                             = var.provisioned_concurrency > 0 ? 1 : 0
  function_name                     = aws_lambda_function.forge_function.function_name
  provisioned_concurrent_executions = var.provisioned_concurrency
  qualifier                         = aws_lambda_alias.live.name
}

# ==============================================================================
# Lambda Alias (for versioning and provisioned concurrency)
# ==============================================================================
resource "aws_lambda_alias" "live" {
  name             = "live"
  description      = "Live alias for ${local.function_name}"
  function_name    = aws_lambda_function.forge_function.function_name
  function_version = aws_lambda_function.forge_function.version
}

# ==============================================================================
# Lambda Permission for API Gateway (if enabled)
# ==============================================================================
resource "aws_lambda_permission" "api_gateway" {
  count         = var.api_gateway_source_arn != null ? 1 : 0
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.forge_function.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = var.api_gateway_source_arn
}

# ==============================================================================
# CloudWatch Alarms
# ==============================================================================
resource "aws_cloudwatch_metric_alarm" "errors" {
  count               = var.enable_alarms ? 1 : 0
  alarm_name          = "${local.function_name}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = var.error_alarm_threshold
  alarm_description   = "Lambda function ${local.function_name} error rate"

  dimensions = {
    FunctionName = aws_lambda_function.forge_function.function_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "duration" {
  count               = var.enable_alarms ? 1 : 0
  alarm_name          = "${local.function_name}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = var.timeout * 1000 * 0.8  # 80% of timeout
  alarm_description   = "Lambda function ${local.function_name} duration approaching timeout"

  dimensions = {
    FunctionName = aws_lambda_function.forge_function.function_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.tags
}
