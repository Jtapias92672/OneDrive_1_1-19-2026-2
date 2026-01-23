#!/bin/bash
# FORGE Platform - Lambda Deployment Script
# Epic 9: Infrastructure
# Task 9.4.7: Lambda CI/CD Pipeline
#
# Usage:
#   ./deploy-lambda.sh [staging|prod] [--skip-tests]

set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LAMBDA_DIR="${PROJECT_ROOT}/infrastructure/lambda/forge-worker"

ENVIRONMENT="${1:-staging}"
SKIP_TESTS="${2:-}"

AWS_REGION="${AWS_REGION:-us-east-1}"

# Function names by environment
declare -A FUNCTIONS
FUNCTIONS[convergence]="forge-convergence-worker-${ENVIRONMENT}"
FUNCTIONS[parser]="forge-parser-worker-${ENVIRONMENT}"
FUNCTIONS[cars]="forge-cars-assessor-${ENVIRONMENT}"

# ==============================================================================
# Functions
# ==============================================================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    echo "[ERROR] $*" >&2
    exit 1
}

check_prerequisites() {
    log "Checking prerequisites..."

    command -v aws >/dev/null 2>&1 || error "AWS CLI is required"
    command -v node >/dev/null 2>&1 || error "Node.js is required"
    command -v npm >/dev/null 2>&1 || error "npm is required"
    command -v zip >/dev/null 2>&1 || error "zip is required"

    # Check AWS credentials
    aws sts get-caller-identity >/dev/null 2>&1 || error "AWS credentials not configured"

    log "Prerequisites OK"
}

build_package() {
    log "Building Lambda package..."

    cd "${LAMBDA_DIR}"

    # Install dependencies
    npm ci

    # TypeScript compile
    npm run build

    # Prune dev dependencies
    npm prune --production

    # Create zip
    VERSION="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"
    ZIP_NAME="forge-worker-${VERSION}.zip"

    cd dist
    zip -r "../${ZIP_NAME}" .
    cd ..
    zip -r "${ZIP_NAME}" node_modules package.json -x "*.ts" -x "*.map"

    log "Package created: ${ZIP_NAME}"
    echo "${ZIP_NAME}"
}

upload_to_s3() {
    local zip_file="$1"
    local bucket="${LAMBDA_BUCKET:-forge-lambda-${ENVIRONMENT}}"

    log "Uploading to S3: s3://${bucket}/forge-worker/"

    aws s3 cp "${LAMBDA_DIR}/${zip_file}" \
        "s3://${bucket}/forge-worker/forge-worker.zip" \
        --region "${AWS_REGION}"

    log "Upload complete"
}

update_functions() {
    local bucket="${LAMBDA_BUCKET:-forge-lambda-${ENVIRONMENT}}"

    log "Updating Lambda functions..."

    for component in "${!FUNCTIONS[@]}"; do
        local fn="${FUNCTIONS[$component]}"
        log "Updating ${fn}..."

        aws lambda update-function-code \
            --function-name "${fn}" \
            --s3-bucket "${bucket}" \
            --s3-key "forge-worker/forge-worker.zip" \
            --publish \
            --region "${AWS_REGION}" \
            --output text \
            --query 'Version'
    done

    log "All functions updated"
}

wait_for_updates() {
    log "Waiting for function updates to complete..."

    for component in "${!FUNCTIONS[@]}"; do
        local fn="${FUNCTIONS[$component]}"
        log "Waiting for ${fn}..."

        aws lambda wait function-updated \
            --function-name "${fn}" \
            --region "${AWS_REGION}"
    done

    log "All updates complete"
}

run_smoke_tests() {
    if [[ "${SKIP_TESTS}" == "--skip-tests" ]]; then
        log "Skipping smoke tests"
        return 0
    fi

    log "Running smoke tests..."

    local test_payload='{"action":"execute","payload":{"prompt":"Say hello in one word","model":"haiku","maxTokens":50}}'

    for component in "${!FUNCTIONS[@]}"; do
        local fn="${FUNCTIONS[$component]}"
        log "Testing ${fn}..."

        local response
        response=$(aws lambda invoke \
            --function-name "${fn}" \
            --payload "${test_payload}" \
            --cli-binary-format raw-in-base64-out \
            --region "${AWS_REGION}" \
            /dev/stdout 2>/dev/null)

        if echo "${response}" | jq -e '.success == true' >/dev/null 2>&1; then
            log "✓ ${fn} passed"
        else
            error "✗ ${fn} failed: ${response}"
        fi
    done

    log "All smoke tests passed"
}

update_aliases() {
    log "Updating live aliases..."

    for component in "${!FUNCTIONS[@]}"; do
        local fn="${FUNCTIONS[$component]}"
        local version

        version=$(aws lambda list-versions-by-function \
            --function-name "${fn}" \
            --region "${AWS_REGION}" \
            --query 'Versions[-1].Version' \
            --output text)

        log "Updating ${fn} alias to version ${version}"

        aws lambda update-alias \
            --function-name "${fn}" \
            --name "live" \
            --function-version "${version}" \
            --region "${AWS_REGION}"
    done

    log "All aliases updated"
}

cleanup() {
    log "Cleaning up..."

    cd "${LAMBDA_DIR}"
    rm -f forge-worker-*.zip

    log "Cleanup complete"
}

# ==============================================================================
# Main
# ==============================================================================

main() {
    log "=========================================="
    log "FORGE Lambda Deployment"
    log "Environment: ${ENVIRONMENT}"
    log "Region: ${AWS_REGION}"
    log "=========================================="

    check_prerequisites

    local zip_file
    zip_file=$(build_package)

    upload_to_s3 "${zip_file}"
    update_functions
    wait_for_updates
    run_smoke_tests
    update_aliases
    cleanup

    log "=========================================="
    log "Deployment complete!"
    log "=========================================="
}

# Run main with error handling
trap 'error "Deployment failed at line $LINENO"' ERR
main "$@"
