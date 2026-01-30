# ==============================================================================
# Production EC2 Infrastructure
# Epic 15: EC2 Infrastructure
#
# Integrates ALB, ASG, and RDS modules for production deployment
# ==============================================================================

# ==============================================================================
# Local Values
# ==============================================================================

locals {
  ec2_common_tags = merge(local.common_tags, {
    Stack = "ec2-infrastructure"
  })
}

# ==============================================================================
# Application Load Balancer
# ==============================================================================

module "forge_alb" {
  source = "../../modules/alb"

  name        = "forge-api"
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.public_subnet_ids

  # HTTPS Configuration
  enable_https    = true
  certificate_arn = var.certificate_arn
  ssl_policy      = "ELBSecurityPolicy-TLS13-1-2-2021-06"

  # Target Group Configuration
  target_port     = 3000
  target_protocol = "HTTP"
  target_type     = "instance"

  # Health Check
  health_check_path     = "/health"
  health_check_interval = 30
  healthy_threshold     = 2
  unhealthy_threshold   = 3

  # Security
  allowed_cidr_blocks        = ["0.0.0.0/0"]
  enable_deletion_protection = var.environment == "prod"

  # Access Logs
  enable_access_logs = var.environment == "prod"
  access_logs_bucket = var.alb_logs_bucket
  access_logs_prefix = "forge-api-alb"

  tags = local.ec2_common_tags
}

# ==============================================================================
# Auto Scaling Group
# ==============================================================================

module "forge_asg" {
  source = "../../modules/ec2-asg"

  name        = "forge-api"
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids

  # Instance Configuration
  instance_type    = var.ec2_instance_type
  root_volume_size = 50
  root_volume_type = "gp3"

  # Auto Scaling Configuration
  min_size         = var.asg_min_size
  max_size         = var.asg_max_size
  desired_capacity = var.asg_desired_capacity

  # Health Check
  health_check_type         = "ELB"
  health_check_grace_period = 300

  # Load Balancer Integration
  target_group_arns       = [module.forge_alb.target_group_arn]
  allowed_security_groups = [module.forge_alb.security_group_id]

  # Application Configuration
  application_port = 3000

  # Scaling Policies
  enable_scaling_policies = true
  scale_up_threshold      = 70
  scale_down_threshold    = 30

  # IAM Configuration
  enable_ssm = true
  additional_iam_policies = var.enable_bedrock ? [
    module.bedrock.invoke_policy_arn,
  ] : []

  # Monitoring
  enable_detailed_monitoring = true
  log_retention_days         = 30

  # User Data (application deployment)
  user_data = templatefile("${path.module}/templates/user_data.sh.tpl", {
    environment     = var.environment
    app_name        = "forge-api"
    app_port        = 3000
    db_secret_arn   = module.forge_rds.credentials_secret_arn
    aws_region      = data.aws_region.current.name
    bedrock_enabled = var.enable_bedrock
  })

  tags = local.ec2_common_tags
}

# ==============================================================================
# RDS PostgreSQL
# ==============================================================================

module "forge_rds" {
  source = "../../modules/rds"

  name        = "forge"
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids

  # Database Configuration
  database_name  = "forge"
  engine_version = "16.4"
  instance_class = var.rds_instance_class
  port           = 5432

  # Storage Configuration
  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  # High Availability
  multi_az = var.environment == "prod"

  # Backup Configuration
  backup_retention_period = var.environment == "prod" ? 7 : 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"
  skip_final_snapshot     = var.environment != "prod"

  # Security
  allowed_security_groups = [module.forge_asg.security_group_id]
  deletion_protection     = var.environment == "prod"
  publicly_accessible     = false

  # Monitoring
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  monitoring_interval                   = 60

  tags = local.ec2_common_tags
}

# ==============================================================================
# Variables for EC2 Stack
# ==============================================================================

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = null
}

variable "alb_logs_bucket" {
  description = "S3 bucket for ALB access logs"
  type        = string
  default     = null
}

variable "ec2_instance_type" {
  description = "EC2 instance type for ASG"
  type        = string
  default     = "t3.medium"
}

variable "asg_min_size" {
  description = "Minimum ASG size"
  type        = number
  default     = 2
}

variable "asg_max_size" {
  description = "Maximum ASG size"
  type        = number
  default     = 6
}

variable "asg_desired_capacity" {
  description = "Desired ASG capacity"
  type        = number
  default     = 2
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 100
}

variable "rds_max_allocated_storage" {
  description = "RDS max allocated storage for autoscaling"
  type        = number
  default     = 500
}

variable "enable_bedrock" {
  description = "Enable Bedrock integration"
  type        = bool
  default     = true
}

# ==============================================================================
# Outputs for EC2 Stack
# ==============================================================================

output "alb_dns_name" {
  description = "DNS name of the ALB"
  value       = module.forge_alb.alb_dns_name
}

output "alb_zone_id" {
  description = "Route53 zone ID of the ALB"
  value       = module.forge_alb.alb_zone_id
}

output "asg_name" {
  description = "Name of the ASG"
  value       = module.forge_asg.asg_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.forge_rds.db_instance_endpoint
}

output "rds_credentials_secret" {
  description = "ARN of the RDS credentials secret"
  value       = module.forge_rds.credentials_secret_arn
}
