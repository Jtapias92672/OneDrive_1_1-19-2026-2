/**
 * FORGE Infrastructure - API Gateway Module
 * @epic 09 - Cloud Deployment
 * 
 * AWS API Gateway with:
 * - REST API endpoints
 * - Rate limiting
 * - API keys
 * - WAF integration
 * - Custom domain
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

# -----------------------------------------------------------------------------
# API Gateway REST API
# -----------------------------------------------------------------------------

resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.name}-api"
  description = "FORGE Platform API Gateway"

  endpoint_configuration {
    types = [var.endpoint_type]
  }

  tags = merge(var.tags, {
    Name = "${var.name}-api"
  })
}

# -----------------------------------------------------------------------------
# API Gateway Resources
# -----------------------------------------------------------------------------

resource "aws_api_gateway_resource" "v1" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "v1"
}

resource "aws_api_gateway_resource" "contracts" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.v1.id
  path_part   = "contracts"
}

resource "aws_api_gateway_resource" "runs" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.v1.id
  path_part   = "runs"
}

resource "aws_api_gateway_resource" "evidence" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.v1.id
  path_part   = "evidence"
}

resource "aws_api_gateway_resource" "webhooks" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "webhooks"
}

# -----------------------------------------------------------------------------
# VPC Link (for ALB integration)
# -----------------------------------------------------------------------------

resource "aws_api_gateway_vpc_link" "main" {
  count = var.vpc_link_target_arns != null ? 1 : 0

  name        = "${var.name}-vpc-link"
  target_arns = var.vpc_link_target_arns

  tags = var.tags
}

# -----------------------------------------------------------------------------
# Integration - Proxy to ALB
# -----------------------------------------------------------------------------

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.v1.id
  http_method   = "ANY"
  authorization = var.authorization_type
  authorizer_id = var.authorization_type == "CUSTOM" ? aws_api_gateway_authorizer.lambda[0].id : null

  request_parameters = {
    "method.request.path.proxy" = true
  }
}

resource "aws_api_gateway_integration" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.v1.id
  http_method = aws_api_gateway_method.proxy.http_method

  type                    = "HTTP_PROXY"
  integration_http_method = "ANY"
  uri                     = var.backend_url
  connection_type         = var.vpc_link_target_arns != null ? "VPC_LINK" : "INTERNET"
  connection_id           = var.vpc_link_target_arns != null ? aws_api_gateway_vpc_link.main[0].id : null

  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}

# -----------------------------------------------------------------------------
# Lambda Authorizer (optional)
# -----------------------------------------------------------------------------

resource "aws_api_gateway_authorizer" "lambda" {
  count = var.authorization_type == "CUSTOM" ? 1 : 0

  name                   = "${var.name}-authorizer"
  rest_api_id            = aws_api_gateway_rest_api.main.id
  authorizer_uri         = var.authorizer_lambda_arn
  authorizer_credentials = aws_iam_role.authorizer[0].arn
  type                   = "TOKEN"
  identity_source        = "method.request.header.Authorization"

  authorizer_result_ttl_in_seconds = 300
}

resource "aws_iam_role" "authorizer" {
  count = var.authorization_type == "CUSTOM" ? 1 : 0

  name = "${var.name}-apigw-authorizer"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "apigateway.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "authorizer" {
  count = var.authorization_type == "CUSTOM" ? 1 : 0

  name = "${var.name}-apigw-authorizer-invoke"
  role = aws_iam_role.authorizer[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = "lambda:InvokeFunction"
      Effect   = "Allow"
      Resource = var.authorizer_lambda_arn
    }]
  })
}

# -----------------------------------------------------------------------------
# Usage Plans & API Keys
# -----------------------------------------------------------------------------

resource "aws_api_gateway_usage_plan" "standard" {
  name        = "${var.name}-standard"
  description = "Standard usage plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }

  quota_settings {
    limit  = var.quota_limit
    period = "MONTH"
  }

  throttle_settings {
    burst_limit = var.burst_limit
    rate_limit  = var.rate_limit
  }

  tags = var.tags
}

resource "aws_api_gateway_usage_plan" "premium" {
  name        = "${var.name}-premium"
  description = "Premium usage plan with higher limits"

  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }

  quota_settings {
    limit  = var.quota_limit * 10
    period = "MONTH"
  }

  throttle_settings {
    burst_limit = var.burst_limit * 5
    rate_limit  = var.rate_limit * 5
  }

  tags = var.tags
}

resource "aws_api_gateway_api_key" "default" {
  name    = "${var.name}-default-key"
  enabled = true

  tags = var.tags
}

resource "aws_api_gateway_usage_plan_key" "default" {
  key_id        = aws_api_gateway_api_key.default.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.standard.id
}

# -----------------------------------------------------------------------------
# Deployment & Stage
# -----------------------------------------------------------------------------

resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.v1.id,
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_integration.proxy.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.stage_name

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId         = "$context.requestId"
      ip                = "$context.identity.sourceIp"
      caller            = "$context.identity.caller"
      user              = "$context.identity.user"
      requestTime       = "$context.requestTime"
      httpMethod        = "$context.httpMethod"
      resourcePath      = "$context.resourcePath"
      status            = "$context.status"
      protocol          = "$context.protocol"
      responseLength    = "$context.responseLength"
      integrationLatency = "$context.integrationLatency"
    })
  }

  xray_tracing_enabled = var.enable_xray

  variables = {
    environment = var.environment
  }

  tags = var.tags
}

resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled        = true
    logging_level          = "INFO"
    data_trace_enabled     = var.environment != "prod"
    throttling_burst_limit = var.burst_limit
    throttling_rate_limit  = var.rate_limit
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Logs
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# -----------------------------------------------------------------------------
# Custom Domain (optional)
# -----------------------------------------------------------------------------

resource "aws_api_gateway_domain_name" "main" {
  count = var.domain_name != null ? 1 : 0

  domain_name              = var.domain_name
  regional_certificate_arn = var.certificate_arn

  endpoint_configuration {
    types = [var.endpoint_type]
  }

  tags = var.tags
}

resource "aws_api_gateway_base_path_mapping" "main" {
  count = var.domain_name != null ? 1 : 0

  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  domain_name = aws_api_gateway_domain_name.main[0].domain_name
  base_path   = ""
}

# -----------------------------------------------------------------------------
# WAF (optional)
# -----------------------------------------------------------------------------

resource "aws_wafv2_web_acl_association" "main" {
  count = var.waf_acl_arn != null ? 1 : 0

  resource_arn = aws_api_gateway_stage.main.arn
  web_acl_arn  = var.waf_acl_arn
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

variable "backend_url" {
  description = "Backend service URL"
  type        = string
}

variable "stage_name" {
  description = "API Gateway stage name"
  type        = string
  default     = "v1"
}

variable "endpoint_type" {
  description = "Endpoint type (REGIONAL or EDGE)"
  type        = string
  default     = "REGIONAL"
}

variable "authorization_type" {
  description = "Authorization type (NONE, API_KEY, CUSTOM)"
  type        = string
  default     = "API_KEY"
}

variable "authorizer_lambda_arn" {
  description = "Lambda authorizer ARN"
  type        = string
  default     = null
}

variable "vpc_link_target_arns" {
  description = "VPC Link target ARNs (NLB)"
  type        = list(string)
  default     = null
}

variable "rate_limit" {
  description = "Rate limit (requests per second)"
  type        = number
  default     = 100
}

variable "burst_limit" {
  description = "Burst limit"
  type        = number
  default     = 200
}

variable "quota_limit" {
  description = "Monthly quota limit"
  type        = number
  default     = 100000
}

variable "domain_name" {
  description = "Custom domain name"
  type        = string
  default     = null
}

variable "certificate_arn" {
  description = "ACM certificate ARN"
  type        = string
  default     = null
}

variable "waf_acl_arn" {
  description = "WAF Web ACL ARN"
  type        = string
  default     = null
}

variable "enable_xray" {
  description = "Enable X-Ray tracing"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Log retention in days"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "api_id" {
  description = "API Gateway ID"
  value       = aws_api_gateway_rest_api.main.id
}

output "api_arn" {
  description = "API Gateway ARN"
  value       = aws_api_gateway_rest_api.main.arn
}

output "invoke_url" {
  description = "API Gateway invoke URL"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "stage_arn" {
  description = "Stage ARN"
  value       = aws_api_gateway_stage.main.arn
}

output "default_api_key" {
  description = "Default API key"
  value       = aws_api_gateway_api_key.default.value
  sensitive   = true
}

output "custom_domain_name" {
  description = "Custom domain name"
  value       = var.domain_name != null ? aws_api_gateway_domain_name.main[0].regional_domain_name : null
}
