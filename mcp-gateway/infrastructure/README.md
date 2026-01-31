# Infrastructure Directory

## Terraform (AWS Deployment)

The Terraform infrastructure is **version controlled** and used for AWS production deployments.

**Status:** Ready for deployment (Epic 09 complete - 97% confidence)

**Note:** Provider caches (`.terraform/`) are excluded from Git and Claude Code indexing via `.gitignore` and `.claudeignore`.

---

## Active Infrastructure

### Docker (`docker/`)
Docker configurations for local development and containerized services.

### Kubernetes (`kubernetes/`)
Kubernetes manifests for container orchestration (if needed).

### Lambda (`lambda/`)
AWS Lambda function code and deployment packages.

### Helm (`helm/`)
Helm charts for Kubernetes deployments.

### CI/CD (`ci/`)
Continuous integration and deployment configurations.

---

## Local Development

**You do NOT need Terraform for local development.**

Local development uses:
- `npm run dev` - Start development server
- `npm test` - Run tests
- `npm run build` - Build packages

Terraform is only needed for AWS production deployment.
