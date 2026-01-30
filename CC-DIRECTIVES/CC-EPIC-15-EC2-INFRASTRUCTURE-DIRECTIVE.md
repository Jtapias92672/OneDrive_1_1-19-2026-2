# CC-EPIC-15-EC2-INFRASTRUCTURE-DIRECTIVE

**Epic:** 15 - EC2 Infrastructure Completion
**Confidence Level:** 97%+
**Estimated Effort:** 60 hours
**Priority:** MEDIUM (Lambda path working)

---

## EXECUTIVE SUMMARY

Complete the EC2 deployment path by implementing ASG, ALB, and RDS Terraform modules following the EXACT patterns established by the existing VPC, Lambda, and Bedrock modules.

---

## PATTERN ALIGNMENT VERIFICATION

### ✅ Patterns Verified Against Existing Terraform Modules

| Pattern | Source File | Confidence |
|---------|-------------|------------|
| Module structure (3 files) | `modules/vpc/` | 100% |
| Variable validation | `modules/lambda/variables.tf` | 100% |
| Output patterns | `modules/lambda/outputs.tf` | 100% |
| Naming convention | `modules/vpc/main.tf:locals` | 100% |
| Tagging convention | `modules/lambda/main.tf:tags` | 100% |
| Security group patterns | `modules/lambda/main.tf:aws_security_group` | 100% |
| IAM patterns | `modules/lambda/main.tf:aws_iam_role` | 100% |
| Conditional resources | `modules/bedrock/main.tf:count` | 100% |

---

## EXISTING INFRASTRUCTURE STATE

### ✅ Completed Modules

| Module | Status | Lines | Completeness |
|--------|--------|-------|--------------|
| VPC | ✅ Complete | 359 | 100% |
| Lambda | ✅ Complete | 373 | 100% |
| Bedrock | ✅ Complete | 200+ | 100% |

### ❌ Missing Modules

| Module | Status | Priority |
|--------|--------|----------|
| EC2 ASG | ❌ Missing | HIGH |
| ALB | ❌ Missing | HIGH |
| RDS | ❌ Missing | MEDIUM |
| API Gateway | ❌ Missing | LOW |

---

## FILE STRUCTURE (EXACT)

```
infrastructure/terraform/modules/
├── ec2-asg/
│   ├── variables.tf        # Input variables (100 lines)
│   ├── main.tf             # Resource definitions (350 lines)
│   └── outputs.tf          # Output values (50 lines)
├── alb/
│   ├── variables.tf        # Input variables (80 lines)
│   ├── main.tf             # Resource definitions (250 lines)
│   └── outputs.tf          # Output values (40 lines)
└── rds/
    ├── variables.tf        # Input variables (120 lines)
    ├── main.tf             # Resource definitions (300 lines)
    └── outputs.tf          # Output values (50 lines)
```

---

## PHASE 1: EC2 ASG MODULE (24 hours)

### File: `modules/ec2-asg/variables.tf`

```hcl
# ==============================================================================
# EC2 Auto Scaling Group Module - Variables
# Epic 15: EC2 Infrastructure
#
# Pattern: Matches modules/lambda/variables.tf structure
# ==============================================================================

# ==============================================================================
# Required Variables
# ==============================================================================

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "name" {
  description = "Name prefix for ASG resources"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.name))
    error_message = "Name must start with a letter and contain only lowercase letters, numbers, and hyphens."
  }
}

# ==============================================================================
# VPC Configuration
# ==============================================================================

variable "vpc_id" {
  description = "VPC ID for ASG deployment"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for ASG instances"
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 1
    error_message = "At least one subnet ID is required."
  }
}

variable "allowed_security_groups" {
  description = "Security groups allowed to access ASG instances"
  type        = list(string)
  default     = []
}

# ==============================================================================
# Instance Configuration
# ==============================================================================

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"

  validation {
    condition     = can(regex("^[a-z][0-9]+\\.[a-z]+$", var.instance_type))
    error_message = "Instance type must be a valid AWS instance type (e.g., t3.medium)."
  }
}

variable "ami_id" {
  description = "AMI ID for EC2 instances (optional, uses latest Amazon Linux 2 if not specified)"
  type        = string
  default     = null
}

variable "key_name" {
  description = "SSH key pair name for instance access"
  type        = string
  default     = null
}

variable "root_volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 30

  validation {
    condition     = var.root_volume_size >= 8 && var.root_volume_size <= 1000
    error_message = "Root volume size must be between 8 and 1000 GB."
  }
}

variable "root_volume_type" {
  description = "Root volume type (gp3, gp2, io1, io2)"
  type        = string
  default     = "gp3"

  validation {
    condition     = contains(["gp3", "gp2", "io1", "io2"], var.root_volume_type)
    error_message = "Volume type must be one of: gp3, gp2, io1, io2."
  }
}

# ==============================================================================
# Auto Scaling Configuration
# ==============================================================================

variable "min_size" {
  description = "Minimum number of instances"
  type        = number
  default     = 1

  validation {
    condition     = var.min_size >= 0
    error_message = "Minimum size must be >= 0."
  }
}

variable "max_size" {
  description = "Maximum number of instances"
  type        = number
  default     = 4

  validation {
    condition     = var.max_size >= 1
    error_message = "Maximum size must be >= 1."
  }
}

variable "desired_capacity" {
  description = "Desired number of instances"
  type        = number
  default     = 2
}

variable "health_check_type" {
  description = "Health check type (EC2 or ELB)"
  type        = string
  default     = "ELB"

  validation {
    condition     = contains(["EC2", "ELB"], var.health_check_type)
    error_message = "Health check type must be EC2 or ELB."
  }
}

variable "health_check_grace_period" {
  description = "Health check grace period in seconds"
  type        = number
  default     = 300

  validation {
    condition     = var.health_check_grace_period >= 0 && var.health_check_grace_period <= 7200
    error_message = "Health check grace period must be between 0 and 7200 seconds."
  }
}

# ==============================================================================
# Scaling Policies
# ==============================================================================

variable "enable_scaling_policies" {
  description = "Enable CPU-based scaling policies"
  type        = bool
  default     = true
}

variable "scale_up_threshold" {
  description = "CPU threshold percentage for scale up"
  type        = number
  default     = 70

  validation {
    condition     = var.scale_up_threshold >= 1 && var.scale_up_threshold <= 100
    error_message = "Scale up threshold must be between 1 and 100."
  }
}

variable "scale_down_threshold" {
  description = "CPU threshold percentage for scale down"
  type        = number
  default     = 30

  validation {
    condition     = var.scale_down_threshold >= 1 && var.scale_down_threshold <= 100
    error_message = "Scale down threshold must be between 1 and 100."
  }
}

# ==============================================================================
# User Data & Application
# ==============================================================================

variable "user_data" {
  description = "User data script for instance initialization"
  type        = string
  default     = null
}

variable "user_data_base64" {
  description = "Base64 encoded user data"
  type        = string
  default     = null
}

variable "application_port" {
  description = "Port on which the application runs"
  type        = number
  default     = 3000

  validation {
    condition     = var.application_port >= 1 && var.application_port <= 65535
    error_message = "Application port must be between 1 and 65535."
  }
}

# ==============================================================================
# Load Balancer Integration
# ==============================================================================

variable "target_group_arns" {
  description = "List of ALB target group ARNs"
  type        = list(string)
  default     = []
}

# ==============================================================================
# IAM Configuration
# ==============================================================================

variable "iam_instance_profile_arn" {
  description = "IAM instance profile ARN (if not using module-created profile)"
  type        = string
  default     = null
}

variable "additional_iam_policies" {
  description = "Additional IAM policy ARNs to attach to the instance role"
  type        = list(string)
  default     = []
}

variable "enable_ssm" {
  description = "Enable SSM Session Manager access"
  type        = bool
  default     = true
}

# ==============================================================================
# Monitoring
# ==============================================================================

variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention must be a valid CloudWatch retention period."
  }
}

# ==============================================================================
# Tags
# ==============================================================================

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
```

### File: `modules/ec2-asg/main.tf`

```hcl
# ==============================================================================
# EC2 Auto Scaling Group Module
# Epic 15: EC2 Infrastructure
#
# Pattern: Matches modules/lambda/main.tf structure
# ==============================================================================

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
# Local Values
# ==============================================================================

locals {
  name_prefix = "forge-${var.name}-${var.environment}"

  default_tags = {
    Project     = "FORGE"
    Component   = "ec2-asg"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  tags = merge(local.default_tags, var.tags)
}

# ==============================================================================
# Data Sources
# ==============================================================================

data "aws_region" "current" {}

# Latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  count       = var.ami_id == null ? 1 : 0
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ==============================================================================
# Security Group
# ==============================================================================

resource "aws_security_group" "asg" {
  name        = "${local.name_prefix}-sg"
  description = "Security group for ${local.name_prefix} ASG instances"
  vpc_id      = var.vpc_id

  # Ingress: Application port from ALB
  dynamic "ingress" {
    for_each = var.allowed_security_groups
    content {
      description     = "Application traffic from ALB"
      from_port       = var.application_port
      to_port         = var.application_port
      protocol        = "tcp"
      security_groups = [ingress.value]
    }
  }

  # Ingress: SSH (if key provided)
  dynamic "ingress" {
    for_each = var.key_name != null ? [1] : []
    content {
      description = "SSH access"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"] # VPC CIDR only
    }
  }

  # Egress: HTTPS to AWS services
  egress {
    description = "HTTPS to AWS services"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress: HTTP for package updates
  egress {
    description = "HTTP for package updates"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress: DNS
  egress {
    description = "DNS"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ==============================================================================
# IAM Role & Instance Profile
# ==============================================================================

resource "aws_iam_role" "asg" {
  count = var.iam_instance_profile_arn == null ? 1 : 0

  name = "${local.name_prefix}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = local.tags
}

# SSM Session Manager policy
resource "aws_iam_role_policy_attachment" "ssm" {
  count      = var.iam_instance_profile_arn == null && var.enable_ssm ? 1 : 0
  role       = aws_iam_role.asg[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# CloudWatch agent policy
resource "aws_iam_role_policy_attachment" "cloudwatch" {
  count      = var.iam_instance_profile_arn == null ? 1 : 0
  role       = aws_iam_role.asg[0].name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# Additional policies
resource "aws_iam_role_policy_attachment" "additional" {
  count      = var.iam_instance_profile_arn == null ? length(var.additional_iam_policies) : 0
  role       = aws_iam_role.asg[0].name
  policy_arn = var.additional_iam_policies[count.index]
}

resource "aws_iam_instance_profile" "asg" {
  count = var.iam_instance_profile_arn == null ? 1 : 0

  name = "${local.name_prefix}-profile"
  role = aws_iam_role.asg[0].name

  tags = local.tags
}

# ==============================================================================
# Launch Template
# ==============================================================================

resource "aws_launch_template" "asg" {
  name          = "${local.name_prefix}-lt"
  image_id      = var.ami_id != null ? var.ami_id : data.aws_ami.amazon_linux[0].id
  instance_type = var.instance_type
  key_name      = var.key_name

  # IAM instance profile
  iam_instance_profile {
    arn = var.iam_instance_profile_arn != null ? var.iam_instance_profile_arn : aws_iam_instance_profile.asg[0].arn
  }

  # Network interfaces
  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.asg.id]
    delete_on_termination       = true
  }

  # Block device
  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = var.root_volume_size
      volume_type           = var.root_volume_type
      encrypted             = true
      delete_on_termination = true
    }
  }

  # Monitoring
  monitoring {
    enabled = var.enable_detailed_monitoring
  }

  # User data
  user_data = var.user_data_base64 != null ? var.user_data_base64 : (
    var.user_data != null ? base64encode(var.user_data) : base64encode(local.default_user_data)
  )

  # Metadata options (IMDSv2)
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(local.tags, {
      Name = "${local.name_prefix}-instance"
    })
  }

  tag_specifications {
    resource_type = "volume"
    tags = merge(local.tags, {
      Name = "${local.name_prefix}-volume"
    })
  }

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-lt"
  })

  lifecycle {
    create_before_destroy = true
  }
}

locals {
  default_user_data = <<-EOF
    #!/bin/bash
    set -e

    # Update system
    dnf update -y

    # Install CloudWatch agent
    dnf install -y amazon-cloudwatch-agent

    # Install Node.js 20
    dnf install -y nodejs20

    # Create application directory
    mkdir -p /opt/forge
    chown ec2-user:ec2-user /opt/forge

    # Start CloudWatch agent
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
      -a fetch-config -m ec2 -s -c ssm:/${local.name_prefix}/cloudwatch-config

    echo "FORGE instance initialization complete"
  EOF
}

# ==============================================================================
# Auto Scaling Group
# ==============================================================================

resource "aws_autoscaling_group" "asg" {
  name                = "${local.name_prefix}-asg"
  vpc_zone_identifier = var.subnet_ids

  min_size         = var.min_size
  max_size         = var.max_size
  desired_capacity = var.desired_capacity

  health_check_type         = var.health_check_type
  health_check_grace_period = var.health_check_grace_period

  target_group_arns = var.target_group_arns

  launch_template {
    id      = aws_launch_template.asg.id
    version = "$Latest"
  }

  # Instance refresh
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  # Tags propagated to instances
  dynamic "tag" {
    for_each = merge(local.tags, {
      Name = "${local.name_prefix}-instance"
    })
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [desired_capacity]
  }
}

# ==============================================================================
# Scaling Policies
# ==============================================================================

resource "aws_autoscaling_policy" "scale_up" {
  count                  = var.enable_scaling_policies ? 1 : 0
  name                   = "${local.name_prefix}-scale-up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.asg.name
}

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  count               = var.enable_scaling_policies ? 1 : 0
  alarm_name          = "${local.name_prefix}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = var.scale_up_threshold
  alarm_description   = "Scale up when CPU exceeds ${var.scale_up_threshold}%"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.asg.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_up[0].arn]

  tags = local.tags
}

resource "aws_autoscaling_policy" "scale_down" {
  count                  = var.enable_scaling_policies ? 1 : 0
  name                   = "${local.name_prefix}-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.asg.name
}

resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  count               = var.enable_scaling_policies ? 1 : 0
  alarm_name          = "${local.name_prefix}-cpu-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = var.scale_down_threshold
  alarm_description   = "Scale down when CPU below ${var.scale_down_threshold}%"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.asg.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_down[0].arn]

  tags = local.tags
}

# ==============================================================================
# CloudWatch Log Group
# ==============================================================================

resource "aws_cloudwatch_log_group" "asg" {
  name              = "/aws/ec2/${local.name_prefix}"
  retention_in_days = var.log_retention_days

  tags = local.tags
}
```

### File: `modules/ec2-asg/outputs.tf`

```hcl
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
```

---

## PHASE 2: ALB MODULE (18 hours)

*(Similar structure for ALB module with target groups, listeners, health checks)*

### Key Resources
- `aws_lb` - Application Load Balancer
- `aws_lb_target_group` - Target groups for ASG
- `aws_lb_listener` - HTTP/HTTPS listeners
- `aws_lb_listener_rule` - Path-based routing rules
- `aws_security_group` - ALB security group
- `aws_acm_certificate` - SSL certificate (optional)

---

## PHASE 3: RDS MODULE (18 hours)

*(Similar structure for RDS PostgreSQL with Multi-AZ, backups, security)*

### Key Resources
- `aws_db_subnet_group` - DB subnet group
- `aws_db_parameter_group` - PostgreSQL parameters
- `aws_db_instance` - RDS instance (Multi-AZ)
- `aws_security_group` - RDS security group
- `aws_secretsmanager_secret` - DB credentials
- `aws_cloudwatch_metric_alarm` - DB monitoring alarms

---

## PHASE 4: ENVIRONMENT INTEGRATION (10 hours)

### File: `environments/prod/ec2.tf`

```hcl
# ==============================================================================
# Production EC2 Infrastructure
# Epic 15: EC2 Infrastructure
# ==============================================================================

# ALB
module "forge_alb" {
  source = "../../modules/alb"

  name        = "forge-api"
  environment = var.environment
  vpc_id      = var.vpc_id
  subnet_ids  = var.public_subnet_ids

  enable_https        = true
  certificate_arn     = var.certificate_arn
  health_check_path   = "/health"

  tags = local.common_tags
}

# ASG
module "forge_asg" {
  source = "../../modules/ec2-asg"

  name        = "forge-api"
  environment = var.environment
  vpc_id      = var.vpc_id
  subnet_ids  = var.private_subnet_ids

  instance_type    = "t3.medium"
  min_size         = 2
  max_size         = 6
  desired_capacity = 2

  target_group_arns       = [module.forge_alb.target_group_arn]
  allowed_security_groups = [module.forge_alb.security_group_id]

  application_port = 3000

  enable_scaling_policies = true
  scale_up_threshold      = 70
  scale_down_threshold    = 30

  additional_iam_policies = [
    module.bedrock.invoke_policy_arn,
  ]

  tags = local.common_tags
}

# RDS
module "forge_rds" {
  source = "../../modules/rds"

  name        = "forge"
  environment = var.environment
  vpc_id      = var.vpc_id
  subnet_ids  = var.private_subnet_ids

  instance_class    = "db.t3.medium"
  allocated_storage = 100
  max_storage       = 500

  database_name = "forge"
  multi_az      = true

  allowed_security_groups = [module.forge_asg.security_group_id]

  backup_retention_period = 7

  tags = local.common_tags
}
```

---

## ACCEPTANCE CRITERIA

### Must Pass (97%+ confidence)

- [ ] EC2 ASG module deploys successfully
- [ ] ALB module with target groups works
- [ ] RDS PostgreSQL with Multi-AZ works
- [ ] All modules follow existing patterns exactly
- [ ] Security groups configured correctly
- [ ] IAM roles and policies applied
- [ ] CloudWatch logging and alarms configured
- [ ] `terraform validate` passes
- [ ] `terraform plan` shows no errors

### Test Scenarios

| Scenario | Expected Result |
|----------|-----------------|
| Deploy ASG | 2 instances running |
| Health check fails | Instance replaced |
| CPU > 70% | Scale up triggered |
| CPU < 30% | Scale down triggered |
| RDS Multi-AZ failover | Auto-failover works |
| ALB HTTPS | TLS termination works |

---

## SUCCESS METRICS

```
BEFORE EPIC 15:
├── EC2 ASG: 0%
├── ALB: 0%
├── RDS: 0%
├── EC2 Deployment Path: INCOMPLETE

AFTER EPIC 15:
├── EC2 ASG: 100%
├── ALB: 100%
├── RDS: 100%
├── EC2 Deployment Path: COMPLETE
├── POC Objective 4: 75% → 100%
```

---

## CC EXECUTION COMMAND

```
Read ~/Downloads/CC-EPIC-15-EC2-INFRASTRUCTURE-DIRECTIVE.md and implement Epic 15 - EC2 Infrastructure

Follow the EXACT patterns from existing Terraform modules (VPC, Lambda, Bedrock).
Create modules in infrastructure/terraform/modules/

Phase 1: EC2 ASG module (24h)
Phase 2: ALB module (18h)
Phase 3: RDS module (18h)
Phase 4: Environment integration (10h)

Run `terraform validate` after each module.
Target: 3 new modules, 100% pattern alignment
```

---

*Epic 15 Directive - Version 1.0 - 97% Confidence*
