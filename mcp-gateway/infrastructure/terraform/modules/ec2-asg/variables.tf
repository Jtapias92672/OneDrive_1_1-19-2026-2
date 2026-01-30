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
    condition     = can(regex("^[a-z][0-9]+[a-z]?\\.[a-z0-9]+$", var.instance_type))
    error_message = "Instance type must be a valid AWS instance type (e.g., t3.medium)."
  }
}

variable "ami_id" {
  description = "AMI ID for EC2 instances (optional, uses latest Amazon Linux 2023 if not specified)"
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
