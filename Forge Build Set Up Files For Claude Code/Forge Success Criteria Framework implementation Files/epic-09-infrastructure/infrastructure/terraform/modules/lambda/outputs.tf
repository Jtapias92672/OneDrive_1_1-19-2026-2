/**
 * FORGE Infrastructure - Lambda Module Outputs
 * @epic 09 - Cloud Deployment
 */

# -----------------------------------------------------------------------------
# Function Outputs
# -----------------------------------------------------------------------------

output "function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.forge_function.arn
}

output "function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.forge_function.function_name
}

output "function_invoke_arn" {
  description = "Invoke ARN for API Gateway integration"
  value       = aws_lambda_function.forge_function.invoke_arn
}

output "function_qualified_arn" {
  description = "Qualified ARN including version"
  value       = aws_lambda_function.forge_function.qualified_arn
}

output "function_version" {
  description = "Latest published version of the function"
  value       = aws_lambda_function.forge_function.version
}

# -----------------------------------------------------------------------------
# IAM Outputs
# -----------------------------------------------------------------------------

output "execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.arn
}

output "execution_role_name" {
  description = "Name of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.name
}

# -----------------------------------------------------------------------------
# VPC Outputs
# -----------------------------------------------------------------------------

output "security_group_id" {
  description = "ID of the Lambda security group (if VPC deployed)"
  value       = var.vpc_config != null ? aws_security_group.lambda[0].id : null
}

# -----------------------------------------------------------------------------
# Logging Outputs
# -----------------------------------------------------------------------------

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.arn
}

# -----------------------------------------------------------------------------
# FORGE Integration Outputs
# -----------------------------------------------------------------------------

output "forge_integration" {
  description = "FORGE integration details for other modules"
  value = {
    function_arn       = aws_lambda_function.forge_function.arn
    function_name      = aws_lambda_function.forge_function.function_name
    invoke_arn         = aws_lambda_function.forge_function.invoke_arn
    execution_role_arn = aws_iam_role.lambda_execution.arn
    log_group_name     = aws_cloudwatch_log_group.lambda.name
    bedrock_enabled    = var.enable_bedrock
    forge_component    = var.forge_component
  }
}
