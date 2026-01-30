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
      -a fetch-config -m ec2 -s -c ssm:/${local.name_prefix}/cloudwatch-config || true

    echo "FORGE instance initialization complete"
  EOF
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
