# FORGE Platform - Production Environment Root Module
# Epic 9: Infrastructure
# Task RECOVERY-10: Root Terraform Module
#
# This is the main entry point for the FORGE production infrastructure.
# It wires together all modules (VPC, Lambda, etc.) with proper dependencies.
#
# Deployment:
#   1. cd infrastructure/terraform/environments/prod
#   2. terraform init
#   3. terraform plan -out=tfplan
#   4. terraform apply tfplan

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }

  backend "s3" {
    bucket         = "forge-terraform-state"
    key            = "prod/main/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "forge-terraform-locks"
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "FORGE"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ==============================================================================
# Variables
# ==============================================================================

variable "region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones"
  type        = number
  default     = 3
}

variable "lambda_deployment_bucket" {
  description = "S3 bucket for Lambda deployment packages"
  type        = string
}

# ==============================================================================
# VPC Module
# ==============================================================================

module "vpc" {
  source = "../../modules/vpc"

  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  az_count    = var.az_count

  # Enable NAT Gateway for outbound internet (fallback)
  enable_nat_gateway = true

  # Enable VPC Endpoint for Bedrock (preferred)
  enable_bedrock_endpoint      = true
  bedrock_endpoint_private_dns = true

  # Enable VPC Flow Logs for security auditing
  enable_flow_logs         = true
  flow_logs_retention_days = 90

  tags = {
    Component = "networking"
  }
}

# ==============================================================================
# Lambda Functions Module
# ==============================================================================
# Note: Lambda module is deployed separately via lambda.tf for independent
# lifecycle management. This root module provides the VPC foundation.
#
# The lambda.tf file should be updated to reference:
#   vpc_id                           = module.vpc.vpc_id
#   private_subnet_ids               = module.vpc.private_subnet_ids
#   bedrock_endpoint_security_group_id = module.vpc.bedrock_endpoint_security_group_id
# ==============================================================================

# ==============================================================================
# Outputs - VPC
# ==============================================================================

output "vpc_id" {
  description = "VPC ID for use by other modules"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = module.vpc.vpc_cidr
}

output "public_subnet_ids" {
  description = "Public subnet IDs (for ALB, bastion, etc.)"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs (for Lambda, RDS, etc.)"
  value       = module.vpc.private_subnet_ids
}

output "availability_zones" {
  description = "Availability zones in use"
  value       = module.vpc.availability_zones
}

# ==============================================================================
# Outputs - VPC Endpoints
# ==============================================================================

output "bedrock_endpoint_id" {
  description = "Bedrock VPC Endpoint ID"
  value       = module.vpc.bedrock_endpoint_id
}

output "bedrock_endpoint_security_group_id" {
  description = "Security group ID for Bedrock VPC Endpoint (pass to Lambda)"
  value       = module.vpc.bedrock_endpoint_security_group_id
}

# ==============================================================================
# Outputs - Networking
# ==============================================================================

output "nat_gateway_ips" {
  description = "NAT Gateway public IPs (for firewall whitelisting)"
  value       = module.vpc.nat_gateway_ips
}

output "internet_gateway_id" {
  description = "Internet Gateway ID"
  value       = module.vpc.internet_gateway_id
}

output "private_route_table_ids" {
  description = "Private route table IDs"
  value       = module.vpc.private_route_table_ids
}

output "flow_log_group_name" {
  description = "CloudWatch Log Group for VPC Flow Logs"
  value       = module.vpc.flow_log_group_name
}

# ==============================================================================
# Outputs - Integration Values
# ==============================================================================
# These outputs are designed to be consumed by other Terraform configurations
# (like lambda.tf) via terraform_remote_state data source or -var flags.

output "lambda_integration_values" {
  description = "Values to pass to Lambda configuration"
  value = {
    vpc_id                             = module.vpc.vpc_id
    private_subnet_ids                 = module.vpc.private_subnet_ids
    bedrock_endpoint_security_group_id = module.vpc.bedrock_endpoint_security_group_id
  }
}
