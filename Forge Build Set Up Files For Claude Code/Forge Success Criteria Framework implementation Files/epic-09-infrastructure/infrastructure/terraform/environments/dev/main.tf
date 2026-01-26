/**
 * FORGE Infrastructure - Development Environment
 * @epic 09 - Cloud Deployment
 * 
 * Cost-optimized development environment
 */

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "forge-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "forge-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "FORGE"
      Environment = "dev"
      ManagedBy   = "Terraform"
    }
  }
}

locals {
  name        = "forge-dev"
  environment = "dev"

  tags = {
    Project     = "FORGE"
    Environment = local.environment
  }
}

# -----------------------------------------------------------------------------
# VPC (Cost-optimized)
# -----------------------------------------------------------------------------

module "vpc" {
  source = "../../modules/vpc"

  name         = local.name
  vpc_cidr     = "10.1.0.0/16"
  az_count     = 2 # Fewer AZs for dev
  cluster_name = local.name
  aws_region   = var.aws_region

  enable_nat_gateway   = true
  single_nat_gateway   = true # Single NAT for cost savings
  enable_flow_logs     = false
  enable_vpc_endpoints = false

  tags = local.tags
}

# -----------------------------------------------------------------------------
# EKS (Smaller nodes)
# -----------------------------------------------------------------------------

module "eks" {
  source = "../../modules/eks"

  cluster_name    = local.name
  cluster_version = "1.29"

  vpc_id          = module.vpc.vpc_id
  subnet_ids      = concat(module.vpc.public_subnet_ids, module.vpc.private_subnet_ids)
  node_subnet_ids = module.vpc.private_subnet_ids

  endpoint_private_access = true
  endpoint_public_access  = true

  node_groups = {
    default = {
      instance_types = ["t3.medium"]
      capacity_type  = "SPOT"
      disk_size      = 30
      desired_size   = 2
      min_size       = 1
      max_size       = 4
      labels         = {}
      taints         = []
    }
  }

  tags = local.tags
}

# -----------------------------------------------------------------------------
# RDS (Smaller instance)
# -----------------------------------------------------------------------------

module "rds" {
  source = "../../modules/rds"

  name                 = local.name
  vpc_id               = module.vpc.vpc_id
  db_subnet_group_name = module.vpc.database_subnet_group_name

  allowed_security_groups = [module.eks.cluster_security_group_id]

  instance_class        = "db.t3.small"
  allocated_storage     = 20
  max_allocated_storage = 50
  multi_az              = false

  backup_retention_period      = 7
  deletion_protection          = false
  skip_final_snapshot          = true
  performance_insights_enabled = false
  monitoring_interval          = 0

  tags = local.tags
}

# -----------------------------------------------------------------------------
# ElastiCache (Single node)
# -----------------------------------------------------------------------------

module "elasticache" {
  source = "../../modules/elasticache"

  name              = local.name
  vpc_id            = module.vpc.vpc_id
  subnet_group_name = module.vpc.elasticache_subnet_group_name

  allowed_security_groups = [module.eks.cluster_security_group_id]

  node_type          = "cache.t3.small"
  num_cache_clusters = 1

  snapshot_retention_limit = 0

  tags = local.tags
}

# -----------------------------------------------------------------------------
# S3
# -----------------------------------------------------------------------------

module "s3" {
  source = "../../modules/s3"

  name = local.name

  artifacts_retention_days = 30
  logs_retention_days      = 30
  create_logs_bucket       = false

  tags = local.tags
}

# -----------------------------------------------------------------------------
# Secrets
# -----------------------------------------------------------------------------

module "secrets" {
  source = "../../modules/secrets"

  name = local.name

  enable_github_integration = true
  enable_slack_integration  = false

  tags = local.tags
}

# -----------------------------------------------------------------------------
# IAM
# -----------------------------------------------------------------------------

module "iam" {
  source = "../../modules/iam"

  name      = local.name
  namespace = "forge"

  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url

  evidence_bucket_arn  = module.s3.evidence_bucket_arn
  artifacts_bucket_arn = module.s3.artifacts_bucket_arn

  kms_key_arns = [module.s3.kms_key_arn]

  tags = local.tags
}

# -----------------------------------------------------------------------------
# Bedrock (Epic 09A: Bedrock Environment Enablement)
# Cost-optimized for development
# -----------------------------------------------------------------------------

module "bedrock" {
  source = "../../modules/bedrock"

  name        = local.name
  environment = local.environment
  namespace   = "forge"
  cost_center = "forge-dev"

  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = "10.1.0.0/16"
  private_subnet_ids = module.vpc.private_subnet_ids

  allowed_security_groups = [module.eks.cluster_security_group_id]

  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url

  # Dev: Disable private connectivity (cost savings)
  enable_private_connectivity = false

  # Dev: Disable request tagging requirement (flexibility)
  enable_request_tagging = false

  # Dev: Allow more models for testing
  allowed_models = [
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-3-5-haiku-20241022-v1:0",
    "anthropic.claude-3-opus-20240229-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0"
  ]

  primary_model_id = "anthropic.claude-3-5-haiku-20241022-v1:0" # Cheaper for dev

  # Dev: No provisioned throughput
  provisioned_throughput = {}

  # Dev: Minimal monitoring
  alarm_actions        = []
  latency_threshold_ms = 30000
  throttle_threshold   = 50
  log_retention_days   = 7

  tags = local.tags
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "rds_endpoint" {
  value = module.rds.endpoint
}

output "redis_endpoint" {
  value = module.elasticache.primary_endpoint
}

output "bedrock_invoker_role_arn" {
  value = module.bedrock.bedrock_invoker_role_arn
}

output "bedrock_allowed_models" {
  value = module.bedrock.allowed_model_ids
}
