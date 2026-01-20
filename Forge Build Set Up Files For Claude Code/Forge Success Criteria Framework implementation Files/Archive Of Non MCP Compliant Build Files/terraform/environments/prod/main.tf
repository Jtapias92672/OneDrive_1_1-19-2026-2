/**
 * FORGE Infrastructure - Production Environment
 * @epic 09 - Cloud Deployment
 */

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "forge-terraform-state"
    key            = "prod/terraform.tfstate"
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
      Environment = "prod"
      ManagedBy   = "Terraform"
    }
  }
}

locals {
  name        = "forge-prod"
  environment = "prod"

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
  vpc_cidr     = var.vpc_cidr
  az_count     = 3
  cluster_name = local.name
  aws_region   = var.aws_region

  enable_nat_gateway   = true
  single_nat_gateway   = false # HA NAT for production
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
  public_access_cidrs     = var.allowed_cidrs

  node_groups = {
    system = {
      instance_types = ["t3.large"]
      capacity_type  = "ON_DEMAND"
      disk_size      = 50
      desired_size   = 2
      min_size       = 2
      max_size       = 4
      labels = {
        "forge.dev/workload" = "system"
      }
      taints = []
    }
    workers = {
      instance_types = ["m5.xlarge", "m5a.xlarge"]
      capacity_type  = "ON_DEMAND"
      disk_size      = 100
      desired_size   = 3
      min_size       = 2
      max_size       = 10
      labels = {
        "forge.dev/workload" = "workers"
      }
      taints = []
    }
    convergence = {
      instance_types = ["c5.2xlarge", "c5a.2xlarge"]
      capacity_type  = "SPOT"
      disk_size      = 100
      desired_size   = 2
      min_size       = 1
      max_size       = 20
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

  instance_class        = "db.r6g.large"
  allocated_storage     = 100
  max_allocated_storage = 500
  multi_az              = true

  backup_retention_period      = 30
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

  node_type          = "cache.r6g.large"
  num_cache_clusters = 3

  tags = local.tags
}

# -----------------------------------------------------------------------------
# S3
# -----------------------------------------------------------------------------

module "s3" {
  source = "../../modules/s3"

  name = local.name

  artifacts_retention_days = 180
  logs_retention_days      = 730

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
# Bedrock (Epic 09A: Bedrock Environment Enablement)
# -----------------------------------------------------------------------------

module "bedrock" {
  source = "../../modules/bedrock"

  name        = local.name
  environment = local.environment
  namespace   = "forge"
  cost_center = "forge-platform"

  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = var.vpc_cidr
  private_subnet_ids = module.vpc.private_subnet_ids

  allowed_security_groups = [module.eks.cluster_security_group_id]

  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url

  # Production: Enable private connectivity
  enable_private_connectivity = true

  # Production: Enforce request tagging for cost allocation
  enable_request_tagging = true

  # Allowed models (least privilege)
  allowed_models = [
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-3-5-haiku-20241022-v1:0",
    "anthropic.claude-3-opus-20240229-v1:0"
  ]

  primary_model_id = "anthropic.claude-3-5-sonnet-20241022-v2:0"

  # Production: Consider provisioned throughput for predictable performance
  provisioned_throughput = var.enable_bedrock_provisioned_throughput ? {
    claude-sonnet = {
      model_id            = "anthropic.claude-3-5-sonnet-20241022-v2:0"
      model_units         = 1
      commitment_duration = null # No commitment for flexibility
    }
  } : {}

  # Monitoring
  alarm_actions        = [module.monitoring.sns_topic_arn]
  latency_threshold_ms = 15000 # 15 seconds
  throttle_threshold   = 5
  log_retention_days   = 90

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
  log_retention_days = 90

  tags = local.tags
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.elasticache.primary_endpoint
}

output "evidence_bucket" {
  description = "Evidence bucket name"
  value       = module.s3.evidence_bucket_name
}

output "iam_roles" {
  description = "IAM role ARNs"
  value = {
    forge_api          = module.iam.forge_api_role_arn
    convergence_engine = module.iam.convergence_engine_role_arn
    evidence_service   = module.iam.evidence_service_role_arn
    governance_gateway = module.iam.governance_gateway_role_arn
    bedrock_invoker    = module.bedrock.bedrock_invoker_role_arn
  }
}

output "bedrock_config" {
  description = "Bedrock configuration"
  value = {
    invoker_role_arn = module.bedrock.bedrock_invoker_role_arn
    allowed_models   = module.bedrock.allowed_model_ids
    dashboard        = module.bedrock.dashboard_name
    private_endpoint = module.bedrock.bedrock_runtime_endpoint_id
  }
}
