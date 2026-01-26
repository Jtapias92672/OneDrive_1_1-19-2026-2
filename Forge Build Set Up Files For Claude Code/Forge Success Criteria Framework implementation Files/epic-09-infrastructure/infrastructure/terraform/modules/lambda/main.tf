/**
 * FORGE Infrastructure - Lambda Function Module
 * @epic 09 - Cloud Deployment (Epic 09B: Lambda Function Deployment)
 * 
 * Lambda function deployment with:
 * - Bedrock integration (invoke models from Lambda)
 * - VPC connectivity (private subnet deployment)
 * - API Gateway integration
 * - CloudWatch logging and X-Ray tracing
 * - Dead letter queue for failed invocations
 * - Provisioned concurrency for FORGE workers
 * - Cost allocation tags
 * 
 * @target AWS EC2 + Bedrock + Lambda stack
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

locals {
  account_id    = data.aws_caller_identity.current.account_id
  region        = data.aws_region.current.name
  function_name = "${var.name}-${var.environment}"
}

# -----------------------------------------------------------------------------
# Lambda Execution Role
# -----------------------------------------------------------------------------

resource "aws_iam_role" "lambda_execution" {
  name = "${local.function_name}-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = merge(var.tags, {
    Name    = "${local.function_name}-execution-role"
    Purpose = "lambda-execution"
  })
}

# Basic Lambda execution policy (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC execution policy (if VPC enabled)
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  count      = var.vpc_config != null ? 1 : 0
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# X-Ray tracing policy
resource "aws_iam_role_policy_attachment" "lambda_xray" {
  count      = var.enable_xray ? 1 : 0
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# -----------------------------------------------------------------------------
# Bedrock Invocation Policy (FORGE-specific)
# -----------------------------------------------------------------------------

resource "aws_iam_role_policy" "bedrock_invoke" {
  count = var.enable_bedrock ? 1 : 0
  name  = "${local.function_name}-bedrock-invoke"
  role  = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BedrockInvokeModel"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = var.bedrock_model_arns
      },
      {
        Sid    = "BedrockListModels"
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

# -----------------------------------------------------------------------------
# Security Group (VPC Lambda)
# -----------------------------------------------------------------------------

resource "aws_security_group" "lambda" {
  count = var.vpc_config != null ? 1 : 0

  name        = "${local.function_name}-sg"
  description = "Security group for ${local.function_name} Lambda function"
  vpc_id      = var.vpc_config.vpc_id

  # Outbound: Allow all (for Bedrock API calls)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  # Inbound: Allow from specified security groups only
  dynamic "ingress" {
    for_each = var.vpc_config.allowed_security_groups
    content {
      from_port       = 443
      to_port         = 443
      protocol        = "tcp"
      security_groups = [ingress.value]
      description     = "HTTPS from allowed security groups"
    }
  }

  tags = merge(var.tags, {
    Name = "${local.function_name}-sg"
  })
}

# -----------------------------------------------------------------------------
# Lambda Function
# -----------------------------------------------------------------------------

resource "aws_lambda_function" "forge_function" {
  function_name = local.function_name
  description   = var.description
  role          = aws_iam_role.lambda_execution.arn
  handler       = var.handler
  runtime       = var.runtime
  timeout       = var.timeout
  memory_size   = var.memory_size
  architectures = [var.architecture]

  # Deployment package
  filename         = var.filename
  source_code_hash = var.source_code_hash
  s3_bucket        = var.s3_bucket
  s3_key           = var.s3_key

  # Environment variables
  environment {
    variables = merge(var.environment_variables, {
      FORGE_ENVIRONMENT  = var.environment
      AWS_REGION_FORGE   = local.region
      BEDROCK_ENABLED    = var.enable_bedrock ? "true" : "false"
    })
  }

  # VPC configuration (private subnet deployment)
  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = concat(
        [aws_security_group.lambda[0].id],
        vpc_config.value.additional_security_groups
      )
    }
  }

  # Tracing (X-Ray)
  dynamic "tracing_config" {
    for_each = var.enable_xray ? [1] : []
    content {
      mode = "Active"
    }
  }

  # Dead letter queue
  dynamic "dead_letter_config" {
    for_each = var.dead_letter_queue_arn != null ? [1] : []
    content {
      target_arn = var.dead_letter_queue_arn
    }
  }

  # Reserved/Provisioned concurrency
  reserved_concurrent_executions = var.reserved_concurrency

  tags = merge(var.tags, {
    Name        = local.function_name
    Application = "FORGE"
    Component   = var.forge_component
  })

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_iam_role_policy_attachment.lambda_vpc,
    aws_cloudwatch_log_group.lambda
  ]
}

# Provisioned concurrency (for low-latency FORGE workers)
resource "aws_lambda_provisioned_concurrency_config" "forge" {
  count                             = var.provisioned_concurrency > 0 ? 1 : 0
  function_name                     = aws_lambda_function.forge_function.function_name
  qualifier                         = aws_lambda_function.forge_function.version
  provisioned_concurrent_executions = var.provisioned_concurrency
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name = "${local.function_name}-logs"
  })
}

# -----------------------------------------------------------------------------
# API Gateway Integration (HTTP API)
# -----------------------------------------------------------------------------

resource "aws_lambda_permission" "api_gateway" {
  count         = var.api_gateway_execution_arn != null ? 1 : 0
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.forge_function.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}

# -----------------------------------------------------------------------------
# EventBridge Rule (Scheduled Invocation)
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_event_rule" "schedule" {
  count               = var.schedule_expression != null ? 1 : 0
  name                = "${local.function_name}-schedule"
  description         = "Schedule for ${local.function_name}"
  schedule_expression = var.schedule_expression

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "lambda" {
  count     = var.schedule_expression != null ? 1 : 0
  rule      = aws_cloudwatch_event_rule.schedule[0].name
  target_id = "lambda"
  arn       = aws_lambda_function.forge_function.arn
}

resource "aws_lambda_permission" "eventbridge" {
  count         = var.schedule_expression != null ? 1 : 0
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.forge_function.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.schedule[0].arn
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms
# -----------------------------------------------------------------------------

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
  alarm_description   = "Lambda function error rate exceeded threshold"
  alarm_actions       = var.alarm_actions

  dimensions = {
    FunctionName = aws_lambda_function.forge_function.function_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "duration" {
  count               = var.enable_alarms ? 1 : 0
  alarm_name          = "${local.function_name}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = var.timeout * 1000 * 0.8  # 80% of timeout
  alarm_description   = "Lambda function duration approaching timeout"
  alarm_actions       = var.alarm_actions

  dimensions = {
    FunctionName = aws_lambda_function.forge_function.function_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "throttles" {
  count               = var.enable_alarms ? 1 : 0
  alarm_name          = "${local.function_name}-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda function is being throttled"
  alarm_actions       = var.alarm_actions

  dimensions = {
    FunctionName = aws_lambda_function.forge_function.function_name
  }

  tags = var.tags
}
