#!/usr/bin/env bash
#
# FORGE Infrastructure Deployment Script
# Deploys Terraform infrastructure to AWS
#
# Usage: ./deploy-to-aws.sh [environment] [action]
#   environment: prod|staging|dev (default: prod)
#   action: plan|apply|destroy (default: plan)
#

set -e

ENVIRONMENT="${1:-prod}"
ACTION="${2:-plan}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="${SCRIPT_DIR}/environments/${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "FORGE Infrastructure Deployment"
echo "=========================================="
echo "Environment: ${ENVIRONMENT}"
echo "Action: ${ACTION}"
echo "Directory: ${ENV_DIR}"
echo "=========================================="
echo ""

# Validate environment
if [[ ! -d "${ENV_DIR}" ]]; then
    echo -e "${RED}Error: Environment '${ENVIRONMENT}' not found${NC}"
    echo "Available environments: prod, staging, dev"
    exit 1
fi

# Validate action
if [[ ! "${ACTION}" =~ ^(plan|apply|destroy)$ ]]; then
    echo -e "${RED}Error: Invalid action '${ACTION}'${NC}"
    echo "Valid actions: plan, apply, destroy"
    exit 1
fi

# Check prerequisites
echo "Checking prerequisites..."

# 1. Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI not found${NC}"
    echo "Install: https://aws.amazon.com/cli/"
    exit 1
fi

# 2. Check Terraform
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Error: Terraform not found${NC}"
    echo "Install: https://www.terraform.io/downloads"
    exit 1
fi

# 3. Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

echo -e "${GREEN}✓ AWS CLI configured${NC}"
echo -e "${GREEN}✓ Terraform installed ($(terraform version -json | jq -r .terraform_version))${NC}"
echo -e "${GREEN}✓ AWS credentials valid${NC}"
echo ""

# Navigate to environment directory
cd "${ENV_DIR}"

# Initialize Terraform (downloads providers)
echo "Initializing Terraform..."
if [[ ! -d ".terraform" ]]; then
    echo -e "${YELLOW}First-time setup: Downloading AWS provider...${NC}"
    terraform init
else
    terraform init -upgrade
fi
echo -e "${GREEN}✓ Terraform initialized${NC}"
echo ""

# Validate configuration
echo "Validating Terraform configuration..."
terraform validate
echo -e "${GREEN}✓ Configuration valid${NC}"
echo ""

# Execute action
case "${ACTION}" in
    plan)
        echo "Planning infrastructure changes..."
        terraform plan -out=tfplan
        echo ""
        echo -e "${GREEN}Plan saved to: tfplan${NC}"
        echo "To apply: ./deploy-to-aws.sh ${ENVIRONMENT} apply"
        ;;

    apply)
        echo -e "${YELLOW}WARNING: This will create/modify AWS resources${NC}"

        # Check if plan exists
        if [[ -f "tfplan" ]]; then
            echo "Applying saved plan..."
            terraform apply tfplan
            rm tfplan
        else
            echo "No saved plan found. Creating new plan..."
            terraform plan -out=tfplan
            echo ""
            echo -e "${YELLOW}Review plan above. Continue? (yes/no)${NC}"
            read -r confirm
            if [[ "${confirm}" == "yes" ]]; then
                terraform apply tfplan
                rm tfplan
            else
                echo "Deployment cancelled"
                exit 0
            fi
        fi

        echo ""
        echo -e "${GREEN}✓ Infrastructure deployed${NC}"
        echo ""
        echo "Outputs:"
        terraform output
        ;;

    destroy)
        echo -e "${RED}WARNING: This will DESTROY all AWS resources${NC}"
        echo -e "${RED}Environment: ${ENVIRONMENT}${NC}"
        echo ""
        echo "Type 'destroy-${ENVIRONMENT}' to confirm:"
        read -r confirm
        if [[ "${confirm}" == "destroy-${ENVIRONMENT}" ]]; then
            terraform destroy
            echo -e "${GREEN}✓ Infrastructure destroyed${NC}"
        else
            echo "Destroy cancelled"
            exit 0
        fi
        ;;
esac

echo ""
echo "=========================================="
echo "Deployment complete"
echo "=========================================="
