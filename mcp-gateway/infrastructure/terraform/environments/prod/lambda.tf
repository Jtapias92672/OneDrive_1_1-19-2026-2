# FORGE Platform - Production Lambda Configuration
# Epic 9: Infrastructure
# Task 9.4.6: Lambda + Bedrock Integration
#
# Deploys FORGE worker Lambda functions with:
# - Bedrock model invocation (Claude Sonnet, Haiku, Opus)
# - VPC private subnet deployment
# - IAM least-privilege for model invocation

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
    key            = "prod/lambda/terraform.tfstate"
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
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

variable "vpc_id" {
  description = "VPC ID for Lambda deployment"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for Lambda"
  type        = list(string)
}

variable "lambda_deployment_bucket" {
  description = "S3 bucket for Lambda deployment packages"
  type        = string
}

# ==============================================================================
# Local Variables
# ==============================================================================

locals {
  common_tags = {
    Environment = var.environment
    Project     = "FORGE"
    Team        = "Platform"
  }

  # Bedrock model ARNs for production
  bedrock_models = [
    "arn:aws:bedrock:${var.region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
    "arn:aws:bedrock:${var.region}::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0",
    "arn:aws:bedrock:${var.region}::foundation-model/anthropic.claude-3-opus-20240229-v1:0",
  ]
}

# ==============================================================================
# Dead Letter Queue for Lambda errors
# ==============================================================================

resource "aws_sqs_queue" "lambda_dlq" {
  name                      = "forge-lambda-dlq-${var.environment}"
  message_retention_seconds = 1209600  # 14 days
  receive_wait_time_seconds = 10

  tags = local.common_tags
}

# ==============================================================================
# FORGE Convergence Worker Lambda
# ==============================================================================

module "forge_convergence_worker" {
  source = "../../modules/lambda"

  name        = "forge-convergence-worker"
  environment = var.environment
  handler     = "index.handler"
  runtime     = "nodejs20.x"
  timeout     = 300  # 5 minutes for convergence operations
  memory_size = 1024

  # Deployment package from S3
  s3_bucket = var.lambda_deployment_bucket
  s3_key    = "forge-worker/forge-worker.zip"

  # Bedrock integration (CRITICAL)
  enable_bedrock     = true
  bedrock_model_arns = local.bedrock_models

  # VPC configuration for private connectivity
  vpc_config = {
    vpc_id     = var.vpc_id
    subnet_ids = var.private_subnet_ids
    allowed_security_groups = []
  }

  # Environment variables
  environment_variables = {
    FORGE_COMPONENT       = "convergence-engine"
    BEDROCK_MODEL_SONNET  = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    BEDROCK_MODEL_HAIKU   = "anthropic.claude-3-5-haiku-20241022-v1:0"
    BEDROCK_MODEL_OPUS    = "anthropic.claude-3-opus-20240229-v1:0"
    MAX_ITERATIONS        = "10"
    CONVERGENCE_TIMEOUT   = "300000"
    TOKEN_BUDGET          = "50000"
  }

  # Dead letter queue
  dead_letter_config = {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  # Provisioned concurrency for production
  provisioned_concurrency = 2

  # Observability
  enable_xray        = true
  log_retention_days = 90

  # Alarms
  enable_alarms = true
  alarm_actions = []  # Add SNS topic ARN for alerts

  # FORGE component identifier
  forge_component = "convergence-engine"

  tags = local.common_tags
}

# ==============================================================================
# FORGE Parser Worker Lambda
# ==============================================================================

module "forge_parser_worker" {
  source = "../../modules/lambda"

  name        = "forge-parser-worker"
  environment = var.environment
  handler     = "index.handler"
  runtime     = "nodejs20.x"
  timeout     = 60  # 1 minute for parsing
  memory_size = 512

  # Deployment package from S3
  s3_bucket = var.lambda_deployment_bucket
  s3_key    = "forge-worker/forge-worker.zip"

  # Bedrock integration (for schema validation)
  enable_bedrock     = true
  bedrock_model_arns = local.bedrock_models

  # VPC configuration
  vpc_config = {
    vpc_id     = var.vpc_id
    subnet_ids = var.private_subnet_ids
    allowed_security_groups = []
  }

  # Environment variables
  environment_variables = {
    FORGE_COMPONENT = "parser"
    BEDROCK_MODEL   = "anthropic.claude-3-5-haiku-20241022-v1:0"
  }

  # No provisioned concurrency for parser (on-demand)
  provisioned_concurrency = 0

  # Observability
  enable_xray        = true
  log_retention_days = 30

  # FORGE component identifier
  forge_component = "parser"

  tags = local.common_tags
}

# ==============================================================================
# FORGE CARS Risk Assessor Lambda
# ==============================================================================

module "forge_cars_assessor" {
  source = "../../modules/lambda"

  name        = "forge-cars-assessor"
  environment = var.environment
  handler     = "index.handler"
  runtime     = "nodejs20.x"
  timeout     = 30
  memory_size = 256

  # Deployment package from S3
  s3_bucket = var.lambda_deployment_bucket
  s3_key    = "forge-worker/forge-worker.zip"

  # Bedrock integration (for risk pattern analysis)
  enable_bedrock     = true
  bedrock_model_arns = local.bedrock_models

  # VPC configuration
  vpc_config = {
    vpc_id     = var.vpc_id
    subnet_ids = var.private_subnet_ids
    allowed_security_groups = []
  }

  # Environment variables
  environment_variables = {
    FORGE_COMPONENT     = "cars-assessor"
    APPROVAL_THRESHOLD  = "0.5"
    BLOCK_THRESHOLD     = "0.9"
  }

  # Observability
  enable_xray        = true
  log_retention_days = 90

  # FORGE component identifier
  forge_component = "cars-assessor"

  tags = local.common_tags
}

# ==============================================================================
# Outputs
# ==============================================================================

output "convergence_worker" {
  description = "Convergence worker Lambda configuration"
  value       = module.forge_convergence_worker.integration_config
}

output "parser_worker" {
  description = "Parser worker Lambda configuration"
  value       = module.forge_parser_worker.integration_config
}

output "cars_assessor" {
  description = "CARS assessor Lambda configuration"
  value       = module.forge_cars_assessor.integration_config
}

output "dlq_arn" {
  description = "Dead letter queue ARN"
  value       = aws_sqs_queue.lambda_dlq.arn
}
