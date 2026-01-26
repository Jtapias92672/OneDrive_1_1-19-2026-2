---
name: deployment-readiness
description: Gate any production handoff with mandatory checklists, runbooks, and rollback procedures. Use when preparing code for production deployment, transitioning to operations teams, or validating environment configurations. Blocks deployment without complete operational documentation.
---

# Deployment Readiness Skill

```yaml
skill:
  name: deployment-readiness
  version: 1.0
  priority: P0
  lifecycle_stage:
    - handoff
    - operations
  triggers:
    - Feature branch approaching merge to main
    - Sprint/milestone completion with deployable increment
    - Environment promotion (dev → staging → prod)
    - Handoff to operations or client team
    - "Ready for production" claim made
  blocks_without:
    - DEPLOYMENT.md with environment configuration
    - RUNBOOK.md with operational procedures
    - ROLLBACK.md with recovery procedures
    - Monitoring/alerting configuration documented
    - All verification-pillars passing
  inputs:
    required:
      - Completed feature (verified by verification-protocol)
      - Target environment specifications
      - Deployment approval from stakeholders
    optional:
      - Load test results
      - Security scan results
      - Performance baseline
  outputs:
    required:
      - DEPLOYMENT.md
      - RUNBOOK.md
      - ROLLBACK.md
      - deployment-checklist.json (machine-readable)
  responsibilities:
    - Documenting deployment procedures
    - Ensuring rollback capability exists
    - Validating environment configurations
    - Creating operational runbooks
    - Blocking premature deployment claims
  non_responsibilities:
    - Writing application code (see domain-memory-pattern)
    - Security scanning (see security-compliance)
    - Performance testing (see performance-budgets)
    - Feature verification (see verification-protocol)
```

---

## Procedure

### Step 1: Pre-Deployment Verification

```bash
# Run all verification gates
bash .claude/slop-tests.sh
npm run lint
npm run typecheck
npm test
npm run test:integration
```

**BLOCK**: Do not proceed if any verification fails.

### Step 2: Generate DEPLOYMENT.md

Create `DEPLOYMENT.md`:

```markdown
# Deployment Guide

## Overview
- **Application**: [Name]
- **Version**: [Semantic version]
- **Target Environment**: [dev|staging|prod]
- **Deployment Date**: [YYYY-MM-DD]
- **Deployed By**: [Name/Role]

## Prerequisites

### Infrastructure
- [ ] [Resource 1] provisioned
- [ ] [Resource 2] configured
- [ ] Network access verified

### Credentials/Secrets
| Secret | Location | Rotation Policy |
|--------|----------|-----------------|
| DB_PASSWORD | AWS Secrets Manager | 90 days |
| API_KEY | Vault | 30 days |

### Dependencies
| Dependency | Required Version | Current Version | Status |
|------------|------------------|-----------------|--------|
| Node.js | >=18.0.0 | 20.10.0 | ✅ |
| PostgreSQL | >=15.0 | 15.4 | ✅ |

## Environment Configuration

### Environment Variables
```bash
NODE_ENV=production
DATABASE_URL=<from-secrets>
API_BASE_URL=https://api.example.com
LOG_LEVEL=info
```

### Feature Flags
| Flag | Default | Description |
|------|---------|-------------|
| ENABLE_NEW_AUTH | false | New authentication flow |

## Deployment Steps

### 1. Pre-Deployment
```bash
# Backup current state
./scripts/backup.sh

# Verify target environment
./scripts/verify-env.sh
```

### 2. Deployment
```bash
# Option A: Container deployment
docker pull registry.example.com/app:${VERSION}
kubectl apply -f k8s/deployment.yaml

# Option B: Direct deployment
npm ci --production
pm2 reload ecosystem.config.js
```

### 3. Post-Deployment Verification
```bash
# Health check
curl -f https://app.example.com/health

# Smoke tests
npm run test:smoke

# Verify logs
kubectl logs -f deployment/app --tail=100
```

## Deployment Verification Checklist
- [ ] Health endpoint responding
- [ ] Database migrations completed
- [ ] Background jobs running
- [ ] Monitoring dashboards showing data
- [ ] No error spikes in logs
- [ ] Key user flows verified manually

## Contacts
| Role | Name | Contact |
|------|------|---------|
| On-Call Engineer | [Name] | [Phone/Slack] |
| Tech Lead | [Name] | [Phone/Slack] |
| Product Owner | [Name] | [Phone/Slack] |
```

### Step 3: Generate RUNBOOK.md

Create `RUNBOOK.md`:

```markdown
# Operational Runbook

## Service Overview
- **Service Name**: [Name]
- **Purpose**: [Brief description]
- **SLA**: [Uptime commitment]
- **Business Hours**: [Support hours]

## Architecture
```
[User] → [Load Balancer] → [App Servers] → [Database]
                                        → [Cache]
                                        → [Queue]
```

## Monitoring

### Dashboards
| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Application | [URL] | App metrics |
| Infrastructure | [URL] | Server metrics |
| Business | [URL] | KPIs |

### Alerts
| Alert | Severity | Response Time | Runbook Section |
|-------|----------|---------------|-----------------|
| High Error Rate | P1 | 15 min | #high-error-rate |
| Database Connection Failure | P1 | 15 min | #database-issues |
| High Latency | P2 | 1 hour | #performance-issues |

## Common Procedures

### Restart Service
```bash
# Graceful restart
kubectl rollout restart deployment/app

# Verify
kubectl rollout status deployment/app
```

### Scale Service
```bash
# Scale up
kubectl scale deployment/app --replicas=5

# Scale down
kubectl scale deployment/app --replicas=2
```

### View Logs
```bash
# Recent logs
kubectl logs deployment/app --tail=100

# Follow logs
kubectl logs -f deployment/app

# Search logs
kubectl logs deployment/app | grep "ERROR"
```

## Incident Response

### High Error Rate {#high-error-rate}
1. Check recent deployments: `kubectl rollout history deployment/app`
2. Check database connectivity: `./scripts/check-db.sh`
3. Check external dependencies: `./scripts/check-deps.sh`
4. If recent deploy: Initiate rollback (see ROLLBACK.md)
5. Escalate if unresolved after 30 minutes

### Database Issues {#database-issues}
1. Check connection pool: `./scripts/check-pool.sh`
2. Check database health: `./scripts/check-db-health.sh`
3. Check for locks: `./scripts/check-locks.sh`
4. Contact DBA if unresolved

### Performance Issues {#performance-issues}
1. Check current load: Dashboard → Traffic
2. Check resource utilization: Dashboard → Infrastructure
3. Scale if needed: `kubectl scale deployment/app --replicas=N`
4. Check for slow queries: `./scripts/slow-queries.sh`

## Maintenance Procedures

### Database Backup
```bash
# Manual backup
./scripts/backup-db.sh

# Verify backup
./scripts/verify-backup.sh
```

### Log Rotation
Automated via [tool]. Manual trigger:
```bash
./scripts/rotate-logs.sh
```

### Certificate Renewal
Certificates expire: [DATE]
Renewal procedure:
```bash
./scripts/renew-certs.sh
```
```

### Step 4: Generate ROLLBACK.md

Create `ROLLBACK.md`:

```markdown
# Rollback Procedures

## Rollback Decision Criteria

Initiate rollback if ANY of the following:
- [ ] Error rate > 5% for 5+ minutes
- [ ] P1 alert unresolved for 30+ minutes
- [ ] Data corruption detected
- [ ] Security vulnerability discovered
- [ ] Critical business flow broken

## Rollback Authority
| Severity | Can Authorize |
|----------|--------------|
| P1 | On-call engineer |
| P2 | Tech Lead |
| P3 | Scheduled |

## Pre-Rollback Checklist
- [ ] Notify stakeholders (Slack: #deployments)
- [ ] Document current state and symptoms
- [ ] Confirm rollback target version
- [ ] Verify rollback target is deployable

## Rollback Procedures

### Application Rollback

#### Kubernetes
```bash
# View history
kubectl rollout history deployment/app

# Rollback to previous
kubectl rollout undo deployment/app

# Rollback to specific version
kubectl rollout undo deployment/app --to-revision=N

# Verify
kubectl rollout status deployment/app
```

#### Container Registry
```bash
# Deploy previous version
kubectl set image deployment/app app=registry.example.com/app:PREVIOUS_VERSION

# Verify
kubectl rollout status deployment/app
```

### Database Rollback

#### Schema Rollback
```bash
# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:rollback

# Rollback to specific version
npm run migrate:rollback --to=MIGRATION_NAME
```

#### Data Rollback
```bash
# Restore from backup
./scripts/restore-db.sh BACKUP_ID

# Verify data integrity
./scripts/verify-data.sh
```

### Configuration Rollback
```bash
# Revert config changes
kubectl rollout undo configmap/app-config

# Restart to pick up config
kubectl rollout restart deployment/app
```

## Post-Rollback Verification

- [ ] Health endpoint responding
- [ ] Error rate returned to baseline
- [ ] Key user flows working
- [ ] Monitoring shows recovery
- [ ] No data loss confirmed

## Post-Rollback Actions

1. **Immediate** (within 1 hour)
   - [ ] Incident channel created
   - [ ] Stakeholders notified
   - [ ] Initial timeline documented

2. **Short-term** (within 24 hours)
   - [ ] Root cause analysis started
   - [ ] Fix branch created
   - [ ] Regression test added

3. **Follow-up** (within 1 week)
   - [ ] Post-mortem completed
   - [ ] Lessons learned documented
   - [ ] Process improvements identified

## Emergency Contacts
| Role | Name | Contact |
|------|------|---------|
| On-Call Primary | [Name] | [Phone] |
| On-Call Secondary | [Name] | [Phone] |
| Escalation | [Name] | [Phone] |
```

### Step 5: Generate deployment-checklist.json

Create `deployment-checklist.json`:

```json
{
  "schema_version": "1.0",
  "application": "APPLICATION_NAME",
  "version": "X.Y.Z",
  "target_environment": "production",
  "generated_at": "YYYY-MM-DDTHH:MM:SSZ",
  "gates": {
    "verification": {
      "lint_pass": false,
      "typecheck_pass": false,
      "unit_tests_pass": false,
      "integration_tests_pass": false,
      "slop_tests_pass": false
    },
    "documentation": {
      "deployment_md_exists": false,
      "runbook_md_exists": false,
      "rollback_md_exists": false
    },
    "security": {
      "security_scan_pass": false,
      "secrets_rotated": false,
      "compliance_review": false
    },
    "performance": {
      "baseline_established": false,
      "load_test_pass": false
    },
    "approvals": {
      "tech_lead": false,
      "product_owner": false,
      "security_lead": false
    }
  },
  "blocking_issues": [],
  "deployment_ready": false
}
```

---

## Integration Points

```yaml
integration_points:
  upstream:
    - verification-protocol (features must be verified)
    - verification-pillars (all gates must pass)
    - security-compliance (security review complete)
    - performance-budgets (performance validated)
  downstream:
    - operations team handoff
    - monitoring systems
    - incident management
```

---

## Verification

```yaml
verification:
  success_criteria:
    - All three .md files exist and are complete
    - deployment-checklist.json shows all gates passed
    - Rollback procedure tested in staging
    - Monitoring dashboards configured
    - On-call schedule populated
  failure_modes:
    - Missing documentation files
    - Incomplete checklists (unchecked items)
    - Untested rollback procedure
    - No monitoring configuration
    - Deployment without approval
```

---

## Governance

```yaml
governance:
  approvals_required:
    - Tech Lead (all deployments)
    - Product Owner (production deployments)
    - Security Lead (if security-impacting changes)
  audit_artifacts:
    - DEPLOYMENT.md
    - RUNBOOK.md
    - ROLLBACK.md
    - deployment-checklist.json
    - Git tag for deployed version
    - Deployment log/timestamp
```

---

## Rationale

```yaml
rationale:
  why_this_skill_exists: |
    Production deployments fail when operational documentation is
    incomplete or missing. Teams discover gaps during incidents,
    not before. This skill ensures no deployment proceeds without
    proven rollback capability and operational documentation.
  risks_if_missing:
    - Deployments without rollback capability
    - Incidents without runbooks
    - Knowledge trapped in deployer's head
    - Handoff failures to operations teams
    - Extended outages due to missing procedures
```
