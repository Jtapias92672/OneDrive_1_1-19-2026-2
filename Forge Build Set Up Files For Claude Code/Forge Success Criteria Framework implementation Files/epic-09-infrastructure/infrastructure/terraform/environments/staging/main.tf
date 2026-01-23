/**
 * FORGE Infrastructure - Staging Environment
 * @epic 09 - Cloud Deployment
 * 
 * Production-like environment for pre-release validation
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
    key            = "staging/terraform.tfstate"
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
      Environment = "staging"
      ManagedBy   = "Terraform"
    }
  }
}

locals {
  name        = "forge-staging"
  environment = "staging"

  tags = {
    Project     = "FORGE"
    Environment = local.environment
  }
}

# -----------------------------------------------------------------------------
# VPC
# -----------------------------------------------------------------------------

module "vpc" {
  source = "../../modules/vpc"

  name         = local.name
  vpc_cidr     = "10.2.0.0/16"
  az_count     = 3
  cluster_name = local.name
  aws_region   = var.aws_region

  enable_nat_gateway   = true
  single_nat_gateway   = false # Multi-NAT like production
  enable_flow_logs     = true
  enable_vpc_endpoints = true

  tags = local.tags
}

# -----------------------------------------------------------------------------
# EKS
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
    system = {
      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
      disk_size      = 50
      desired_size   = 2
      min_size       = 2
      max_size       = 3
      labels = {
        "forge.dev/workload" = "system"
      }
      taints = []
    }
    workers = {
      instance_types = ["m5.large"]
      capacity_type  = "ON_DEMAND"
      disk_size      = 80
      desired_size   = 2
      min_size       = 1
      max_size       = 6
      labels = {
        "forge.dev/workload" = "workers"
      }
      taints = []
    }
    convergence = {
      instance_types = ["c5.xlarge"]
      capacity_type  = "SPOT"
      disk_size      = 80
      desired_size   = 2
      min_size       = 1
      max_size       = 10
      labels = {
        "forge.dev/workload" = "convergence"
      }
      taints = [{
        key    = "forge.dev/convergence"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }

  tags = local.tags
}

# -----------------------------------------------------------------------------
# RDS
# -----------------------------------------------------------------------------

module "rds" {
  source = "../../modules/rds"

  name                 = local.name
  vpc_id               = module.vpc.vpc_id
  db_subnet_group_name = module.vpc.database_subnet_group_name

  allowed_security_groups = [module.eks.cluster_security_group_id]

  instance_class        = "db.t3.medium"
  allocated_storage     = 50
  max_allocated_storage = 200
  multi_az              = true # HA like production

  backup_retention_period      = 14
  deletion_protection          = true
  performance_insights_enabled = true

  tags = local.tags
}

# -----------------------------------------------------------------------------
# ElastiCache
# -----------------------------------------------------------------------------

module "elasticache" {
  source = "../../modules/elasticache"

  name              = local.name
  vpc_id            = module.vpc.vpc_id
  subnet_group_name = module.vpc.elasticache_subnet_group_name

  allowed_security_groups = [module.eks.cluster_security_group_id]

  node_type          = "cache.t3.medium"
  num_cache_clusters = 2

  tags = local.tags
}

# -----------------------------------------------------------------------------
# S3
# -----------------------------------------------------------------------------

module "s3" {
  source = "../../modules/s3"

  name = local.name

  artifacts_retention_days = 60
  logs_retention_days      = 90

  tags = local.tags
}

# -----------------------------------------------------------------------------
# Secrets
# -----------------------------------------------------------------------------

module "secrets" {
  source = "../../modules/secrets"

  name = local.name

  enable_github_integration = true
  enable_slack_integration  = true

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
# Monitoring
# -----------------------------------------------------------------------------

module "monitoring" {
  source = "../../modules/monitoring"

  name        = local.name
  environment = local.environment
  aws_region  = var.aws_region

  cluster_name           = module.eks.cluster_name
  rds_instance_id        = local.name
  elasticache_cluster_id = "${local.name}-001"

  alert_emails       = var.alert_emails
  log_retention_days = 60

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

variable "alert_emails" {
  description = "Email addresses for alerts"
  type        = list(string)
  default     = []
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

output "evidence_bucket" {
  value = module.s3.evidence_bucket_name
}
