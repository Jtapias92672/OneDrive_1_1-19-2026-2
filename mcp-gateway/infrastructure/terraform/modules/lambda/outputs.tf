# FORGE Platform - Lambda Module Outputs
# Epic 9: Infrastructure
# Task 9.4.5: Lambda Function Module Outputs

# ==============================================================================
# Function Outputs
# ==============================================================================

output "function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.forge_function.function_name
}

output "function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.forge_function.arn
}

output "function_qualified_arn" {
  description = "Qualified ARN of the Lambda function"
  value       = aws_lambda_function.forge_function.qualified_arn
}

output "invoke_arn" {
  description = "Invoke ARN of the Lambda function (for API Gateway)"
  value       = aws_lambda_function.forge_function.invoke_arn
}

output "function_version" {
  description = "Latest published version of the Lambda function"
  value       = aws_lambda_function.forge_function.version
}

# ==============================================================================
# Alias Outputs
# ==============================================================================

output "alias_name" {
  description = "Name of the live alias"
  value       = aws_lambda_alias.live.name
}

output "alias_arn" {
  description = "ARN of the live alias"
  value       = aws_lambda_alias.live.arn
}

output "alias_invoke_arn" {
  description = "Invoke ARN of the live alias (for API Gateway)"
  value       = aws_lambda_alias.live.invoke_arn
}

# ==============================================================================
# IAM Outputs
# ==============================================================================

output "execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.arn
}

output "execution_role_name" {
  description = "Name of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.name
}

# ==============================================================================
# VPC Outputs
# ==============================================================================

output "security_group_id" {
  description = "ID of the Lambda security group (if VPC enabled)"
  value       = var.vpc_config != null ? aws_security_group.lambda[0].id : null
}

# ==============================================================================
# CloudWatch Outputs
# ==============================================================================

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.arn
}

# ==============================================================================
# Bedrock Integration Outputs
# ==============================================================================

output "bedrock_enabled" {
  description = "Whether Bedrock integration is enabled"
  value       = var.enable_bedrock
}

output "bedrock_model_arns" {
  description = "Bedrock model ARNs the function can invoke"
  value       = var.enable_bedrock ? local.bedrock_model_arns : []
}

# ==============================================================================
# Provisioned Concurrency Outputs
# ==============================================================================

output "provisioned_concurrency" {
  description = "Provisioned concurrency configuration"
  value = var.provisioned_concurrency > 0 ? {
    enabled     = true
    executions  = var.provisioned_concurrency
    alias       = aws_lambda_alias.live.name
  } : {
    enabled     = false
    executions  = 0
    alias       = null
  }
}

# ==============================================================================
# Integration Outputs (for other modules)
# ==============================================================================

output "integration_config" {
  description = "Configuration for integrating with other modules"
  value = {
    function_name = aws_lambda_function.forge_function.function_name
    function_arn  = aws_lambda_function.forge_function.arn
    invoke_arn    = aws_lambda_function.forge_function.invoke_arn
    alias_arn     = aws_lambda_alias.live.arn
    role_arn      = aws_iam_role.lambda_execution.arn
    log_group     = aws_cloudwatch_log_group.lambda.name
    bedrock       = var.enable_bedrock
    vpc_enabled   = var.vpc_config != null
  }
}
