#!/bin/bash
# FORGE Platform - Bootstrap Terraform Backend
# @epic 09 - Cloud Deployment
#
# Creates the S3 bucket and DynamoDB table for Terraform state management
# Run this once before deploying any environment

set -euo pipefail

# Configuration
STATE_BUCKET="${TF_STATE_BUCKET:-forge-terraform-state}"
LOCK_TABLE="${TF_LOCK_TABLE:-forge-terraform-locks}"
AWS_REGION="${AWS_REGION:-us-west-2}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log_info "Using AWS Account: $ACCOUNT_ID"
    log_info "Using Region: $AWS_REGION"
}

# Create S3 bucket for state
create_state_bucket() {
    log_info "Creating S3 bucket for Terraform state: $STATE_BUCKET"
    
    if aws s3api head-bucket --bucket "$STATE_BUCKET" 2>/dev/null; then
        log_warn "Bucket already exists: $STATE_BUCKET"
        return 0
    fi
    
    # Create bucket
    if [ "$AWS_REGION" = "us-east-1" ]; then
        aws s3api create-bucket \
            --bucket "$STATE_BUCKET" \
            --region "$AWS_REGION"
    else
        aws s3api create-bucket \
            --bucket "$STATE_BUCKET" \
            --region "$AWS_REGION" \
            --create-bucket-configuration LocationConstraint="$AWS_REGION"
    fi
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "$STATE_BUCKET" \
        --versioning-configuration Status=Enabled
    
    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "$STATE_BUCKET" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "aws:kms"
                },
                "BucketKeyEnabled": true
            }]
        }'
    
    # Block public access
    aws s3api put-public-access-block \
        --bucket "$STATE_BUCKET" \
        --public-access-block-configuration '{
            "BlockPublicAcls": true,
            "IgnorePublicAcls": true,
            "BlockPublicPolicy": true,
            "RestrictPublicBuckets": true
        }'
    
    # Add lifecycle rule for old versions
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$STATE_BUCKET" \
        --lifecycle-configuration '{
            "Rules": [{
                "ID": "CleanOldVersions",
                "Status": "Enabled",
                "NoncurrentVersionExpiration": {
                    "NoncurrentDays": 90
                },
                "Filter": {}
            }]
        }'
    
    # Tag bucket
    aws s3api put-bucket-tagging \
        --bucket "$STATE_BUCKET" \
        --tagging '{
            "TagSet": [
                {"Key": "Project", "Value": "FORGE"},
                {"Key": "Purpose", "Value": "terraform-state"},
                {"Key": "ManagedBy", "Value": "bootstrap-script"}
            ]
        }'
    
    log_info "S3 bucket created successfully"
}

# Create DynamoDB table for locking
create_lock_table() {
    log_info "Creating DynamoDB table for state locking: $LOCK_TABLE"
    
    if aws dynamodb describe-table --table-name "$LOCK_TABLE" 2>/dev/null; then
        log_warn "Table already exists: $LOCK_TABLE"
        return 0
    fi
    
    aws dynamodb create-table \
        --table-name "$LOCK_TABLE" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --tags \
            Key=Project,Value=FORGE \
            Key=Purpose,Value=terraform-locks \
            Key=ManagedBy,Value=bootstrap-script
    
    # Wait for table to be active
    log_info "Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name "$LOCK_TABLE"
    
    log_info "DynamoDB table created successfully"
}

# Create IAM role for GitHub Actions (optional)
create_github_role() {
    local role_name="forge-github-actions"
    local github_org="${GITHUB_ORG:-}"
    local github_repo="${GITHUB_REPO:-}"
    
    if [ -z "$github_org" ] || [ -z "$github_repo" ]; then
        log_warn "GITHUB_ORG and GITHUB_REPO not set, skipping GitHub Actions role creation"
        return 0
    fi
    
    log_info "Creating IAM role for GitHub Actions: $role_name"
    
    if aws iam get-role --role-name "$role_name" 2>/dev/null; then
        log_warn "Role already exists: $role_name"
        return 0
    fi
    
    # Create OIDC provider for GitHub (if not exists)
    local github_oidc_arn="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
    
    if ! aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$github_oidc_arn" 2>/dev/null; then
        log_info "Creating GitHub OIDC provider..."
        
        # Get GitHub's OIDC thumbprint
        local thumbprint="6938fd4d98bab03faadb97b34396831e3780aea1"
        
        aws iam create-open-id-connect-provider \
            --url "https://token.actions.githubusercontent.com" \
            --client-id-list "sts.amazonaws.com" \
            --thumbprint-list "$thumbprint"
    fi
    
    # Create role trust policy
    cat > /tmp/trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {
            "Federated": "$github_oidc_arn"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
            "StringEquals": {
                "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
            },
            "StringLike": {
                "token.actions.githubusercontent.com:sub": "repo:${github_org}/${github_repo}:*"
            }
        }
    }]
}
EOF
    
    aws iam create-role \
        --role-name "$role_name" \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        --tags Key=Project,Value=FORGE Key=Purpose,Value=github-actions
    
    # Attach AdministratorAccess (restrict in production)
    aws iam attach-role-policy \
        --role-name "$role_name" \
        --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess"
    
    rm /tmp/trust-policy.json
    
    log_info "GitHub Actions role created: arn:aws:iam::${ACCOUNT_ID}:role/$role_name"
}

# Print summary
print_summary() {
    echo ""
    echo "============================================"
    echo "  FORGE Terraform Backend Bootstrap Complete"
    echo "============================================"
    echo ""
    echo "State Bucket: $STATE_BUCKET"
    echo "Lock Table:   $LOCK_TABLE"
    echo "Region:       $AWS_REGION"
    echo ""
    echo "Add this to your Terraform configurations:"
    echo ""
    echo 'terraform {'
    echo '  backend "s3" {'
    echo "    bucket         = \"$STATE_BUCKET\""
    echo '    key            = "<environment>/terraform.tfstate"'
    echo "    region         = \"$AWS_REGION\""
    echo '    encrypt        = true'
    echo "    dynamodb_table = \"$LOCK_TABLE\""
    echo '  }'
    echo '}'
    echo ""
}

# Main
main() {
    check_prerequisites
    create_state_bucket
    create_lock_table
    create_github_role
    print_summary
}

main "$@"
