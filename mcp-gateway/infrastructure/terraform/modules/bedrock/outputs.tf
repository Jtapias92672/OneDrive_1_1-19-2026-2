# FORGE Platform - Bedrock Module Outputs
# Epic 9: Infrastructure
# Extracted from main.tf for module organization best practices

output "runtime_endpoint_id" {
  description = "Bedrock runtime VPC endpoint ID"
  value       = var.enable_vpc_endpoint ? aws_vpc_endpoint.bedrock_runtime[0].id : null
}

output "runtime_endpoint_dns" {
  description = "Bedrock runtime VPC endpoint DNS entries"
  value       = var.enable_vpc_endpoint ? aws_vpc_endpoint.bedrock_runtime[0].dns_entry : null
}

output "security_group_id" {
  description = "Security group ID for Bedrock endpoint"
  value       = aws_security_group.bedrock_endpoint.id
}

output "invoke_policy_arn" {
  description = "IAM policy ARN for Bedrock invocation"
  value       = aws_iam_policy.bedrock_invoke.arn
}

output "access_role_arn" {
  description = "IAM role ARN for Bedrock access"
  value       = var.create_iam_role ? aws_iam_role.bedrock_access[0].arn : null
}

output "model_arns" {
  description = "Bedrock model ARNs"
  value       = local.model_arns
}

output "management_endpoint_id" {
  description = "Bedrock management VPC endpoint ID (if enabled)"
  value       = var.enable_vpc_endpoint && var.enable_management_endpoint ? aws_vpc_endpoint.bedrock[0].id : null
}
