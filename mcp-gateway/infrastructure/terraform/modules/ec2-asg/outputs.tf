# ==============================================================================
# EC2 Auto Scaling Group Module - Outputs
# Epic 15: EC2 Infrastructure
# ==============================================================================

# ==============================================================================
# ASG Outputs
# ==============================================================================

output "asg_name" {
  description = "Name of the Auto Scaling Group"
  value       = aws_autoscaling_group.asg.name
}

output "asg_arn" {
  description = "ARN of the Auto Scaling Group"
  value       = aws_autoscaling_group.asg.arn
}

output "asg_id" {
  description = "ID of the Auto Scaling Group"
  value       = aws_autoscaling_group.asg.id
}

# ==============================================================================
# Launch Template Outputs
# ==============================================================================

output "launch_template_id" {
  description = "ID of the Launch Template"
  value       = aws_launch_template.asg.id
}

output "launch_template_arn" {
  description = "ARN of the Launch Template"
  value       = aws_launch_template.asg.arn
}

output "launch_template_latest_version" {
  description = "Latest version of the Launch Template"
  value       = aws_launch_template.asg.latest_version
}

# ==============================================================================
# Security Group Outputs
# ==============================================================================

output "security_group_id" {
  description = "ID of the ASG security group"
  value       = aws_security_group.asg.id
}

output "security_group_arn" {
  description = "ARN of the ASG security group"
  value       = aws_security_group.asg.arn
}

# ==============================================================================
# IAM Outputs
# ==============================================================================

output "iam_role_arn" {
  description = "ARN of the IAM role (if created)"
  value       = var.iam_instance_profile_arn == null ? aws_iam_role.asg[0].arn : null
}

output "iam_role_name" {
  description = "Name of the IAM role (if created)"
  value       = var.iam_instance_profile_arn == null ? aws_iam_role.asg[0].name : null
}

output "instance_profile_arn" {
  description = "ARN of the instance profile"
  value       = var.iam_instance_profile_arn != null ? var.iam_instance_profile_arn : aws_iam_instance_profile.asg[0].arn
}

# ==============================================================================
# CloudWatch Outputs
# ==============================================================================

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.asg.name
}

output "log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.asg.arn
}

# ==============================================================================
# Integration Config
# ==============================================================================

output "integration_config" {
  description = "Configuration for integrating with other modules"
  value = {
    asg_name           = aws_autoscaling_group.asg.name
    asg_arn            = aws_autoscaling_group.asg.arn
    security_group_id  = aws_security_group.asg.id
    instance_profile   = var.iam_instance_profile_arn != null ? var.iam_instance_profile_arn : aws_iam_instance_profile.asg[0].arn
    application_port   = var.application_port
    log_group          = aws_cloudwatch_log_group.asg.name
  }
}
