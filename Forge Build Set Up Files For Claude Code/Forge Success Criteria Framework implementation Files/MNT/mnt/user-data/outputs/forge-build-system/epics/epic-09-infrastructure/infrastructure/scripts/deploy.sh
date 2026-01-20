#!/bin/bash
# FORGE Platform - Deployment Script
# @epic 09 - Cloud Deployment

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-dev}"
AWS_REGION="${AWS_REGION:-us-west-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Validate environment
validate_environment() {
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        echo "Usage: $0 <dev|staging|prod>"
        exit 1
    fi
    log_info "Deploying to environment: $ENVIRONMENT"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local tools=("aws" "terraform" "kubectl" "helm")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    
    log_info "All prerequisites met"
}

# Deploy Terraform infrastructure
deploy_infrastructure() {
    log_info "Deploying Terraform infrastructure..."
    
    cd "$ROOT_DIR/terraform/environments/$ENVIRONMENT"
    
    terraform init -upgrade
    terraform plan -out=tfplan
    
    read -p "Apply Terraform changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        terraform apply tfplan
    else
        log_warn "Terraform apply skipped"
    fi
    
    # Export outputs
    export EKS_CLUSTER_NAME=$(terraform output -raw eks_cluster_name)
    export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
    export REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)
    export EVIDENCE_BUCKET=$(terraform output -raw evidence_bucket)
}

# Configure kubectl
configure_kubectl() {
    log_info "Configuring kubectl..."
    
    aws eks update-kubeconfig \
        --name "$EKS_CLUSTER_NAME" \
        --region "$AWS_REGION"
    
    # Verify connection
    kubectl cluster-info
}

# Install cluster addons
install_addons() {
    log_info "Installing cluster addons..."
    
    # AWS Load Balancer Controller
    helm repo add eks https://aws.github.io/eks-charts
    helm repo update
    
    helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
        -n kube-system \
        --set clusterName="$EKS_CLUSTER_NAME" \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller
    
    # External Secrets Operator
    helm repo add external-secrets https://charts.external-secrets.io
    helm upgrade --install external-secrets external-secrets/external-secrets \
        -n external-secrets \
        --create-namespace \
        --set installCRDs=true
    
    # Metrics Server
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    
    log_info "Addons installed"
}

# Deploy application
deploy_application() {
    log_info "Deploying FORGE application..."
    
    cd "$ROOT_DIR/k8s"
    
    # Apply overlay for environment
    kubectl apply -k "overlays/$ENVIRONMENT"
    
    # Wait for deployments
    log_info "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available deployment/forge-api -n forge --timeout=300s
    kubectl wait --for=condition=available deployment/convergence-engine -n forge --timeout=300s
    
    log_info "Application deployed successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    echo ""
    echo "=== Pods ==="
    kubectl get pods -n forge
    
    echo ""
    echo "=== Services ==="
    kubectl get svc -n forge
    
    echo ""
    echo "=== Ingress ==="
    kubectl get ingress -n forge
    
    # Health check
    local api_url=$(kubectl get ingress forge-ingress -n forge -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    if [[ -n "$api_url" ]]; then
        log_info "API URL: https://$api_url"
        
        sleep 30
        if curl -s -o /dev/null -w "%{http_code}" "http://$api_url/health" | grep -q "200"; then
            log_info "Health check passed"
        else
            log_warn "Health check failed - service may still be starting"
        fi
    fi
}

# Main
main() {
    validate_environment
    check_prerequisites
    deploy_infrastructure
    configure_kubectl
    install_addons
    deploy_application
    verify_deployment
    
    log_info "Deployment complete!"
}

main "$@"
