# ==============================================================================
# Application Load Balancer Module - Outputs
# Epic 15: EC2 Infrastructure
# ==============================================================================

# ==============================================================================
# ALB Outputs
# ==============================================================================

output "alb_id" {
  description = "ID of the ALB"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "ARN of the ALB"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "DNS name of the ALB"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Route53 zone ID of the ALB"
  value       = aws_lb.main.zone_id
}

output "alb_arn_suffix" {
  description = "ARN suffix of the ALB (for CloudWatch metrics)"
  value       = aws_lb.main.arn_suffix
}

# ==============================================================================
# Target Group Outputs
# ==============================================================================

output "target_group_arn" {
  description = "ARN of the target group"
  value       = aws_lb_target_group.main.arn
}

output "target_group_name" {
  description = "Name of the target group"
  value       = aws_lb_target_group.main.name
}

output "target_group_arn_suffix" {
  description = "ARN suffix of the target group (for CloudWatch metrics)"
  value       = aws_lb_target_group.main.arn_suffix
}

# ==============================================================================
# Listener Outputs
# ==============================================================================

output "http_listener_arn" {
  description = "ARN of the HTTP listener"
  value       = aws_lb_listener.http.arn
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener (if enabled)"
  value       = var.enable_https && var.certificate_arn != null ? aws_lb_listener.https[0].arn : null
}

# ==============================================================================
# Security Group Outputs
# ==============================================================================

output "security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "security_group_arn" {
  description = "ARN of the ALB security group"
  value       = aws_security_group.alb.arn
}

# ==============================================================================
# Integration Config
# ==============================================================================

output "integration_config" {
  description = "Configuration for integrating with other modules"
  value = {
    alb_arn           = aws_lb.main.arn
    alb_dns_name      = aws_lb.main.dns_name
    target_group_arn  = aws_lb_target_group.main.arn
    security_group_id = aws_security_group.alb.id
    https_enabled     = var.enable_https
  }
}
