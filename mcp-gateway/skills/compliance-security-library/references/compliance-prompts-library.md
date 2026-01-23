# Compliance Prompts Library

Codified standards-as-prompts that run as audits across repositories, producing structured findings with evidence.

## Purpose

Transform ArcFoundry standards into executable audit prompts that:
- Produce consistent, structured findings
- Generate evidence artifacts for compliance
- Support automation through CI/CD
- Enable cross-repo governance at scale

## Prompt Structure

Every compliance prompt follows this format:

```yaml
prompt_id: CP-001
name: ADR Completeness Check
version: 1.0.0
category: documentation
severity_if_failed: P2
standards: [SOC2-CC1.1, DFARS-252.204]

purpose: |
  Verify that Architecture Decision Records exist and are complete
  for all significant architectural choices.

inputs:
  - repo_path: Path to repository root
  - adr_path: Path to ADR directory (default: /docs/adr)
  - arch_md_path: Path to ARCH.md (default: /ARCH.md)

expected_outputs:
  - findings.json: Structured findings list
  - evidence.md: Human-readable evidence
  - score: Compliance score (0-100)

fail_conditions:
  - No ADR directory exists
  - ARCH.md references decisions without ADRs
  - ADRs missing required sections (context, decision, consequences)
  - ADRs not linked to code changes

artifact_format: |
  {
    "prompt_id": "CP-001",
    "passed": boolean,
    "score": number,
    "findings": [...],
    "evidence_links": [...]
  }
```

## Core Compliance Prompts

### CP-001: ADR Completeness

```markdown
## ADR Completeness Audit

### Check Steps
1. Verify /docs/adr directory exists
2. Parse ARCH.md for decision references
3. Cross-reference decisions with ADR files
4. Validate ADR format (context, decision, status, consequences)
5. Check ADRs are linked to PRs/commits

### Pass Criteria
- [ ] ADR directory exists with at least 1 ADR
- [ ] All ARCH.md decisions have corresponding ADRs
- [ ] ADRs follow standard template
- [ ] ADRs have status (proposed/accepted/deprecated/superseded)

### Severity: P2
### Standards: SOC2-CC1.1, CMMC-AU.L2
```

### CP-002: Dependency Governance

```markdown
## Dependency Governance Audit

### Check Steps
1. Parse package.json / requirements.txt / go.mod
2. Check for known vulnerabilities (npm audit / safety / govulncheck)
3. Verify dependency versions are pinned
4. Check for outdated major versions
5. Validate license compatibility

### Pass Criteria
- [ ] No critical vulnerabilities (P0)
- [ ] No high vulnerabilities older than 30 days (P1)
- [ ] All production dependencies pinned
- [ ] No GPL dependencies in proprietary code
- [ ] Dependencies updated within 6 months

### Severity: P1 (if vulnerabilities), P2 (if outdated)
### Standards: SOC2-CC6.1, DFARS-252.204-7012
```

### CP-003: Deployment Readiness

```markdown
## Deployment Readiness Audit

### Check Steps
1. Verify CI/CD pipeline exists and passes
2. Check for rollback procedure documentation
3. Validate environment configuration management
4. Verify health check endpoints exist
5. Check monitoring/alerting configuration

### Pass Criteria
- [ ] CI pipeline defined and passing
- [ ] Rollback procedure documented in ARCH.md
- [ ] Environment variables documented
- [ ] Health check endpoint returns 200
- [ ] Monitoring dashboards exist

### Severity: P1
### Standards: SOC2-CC7.1, CMMC-CM.L2
```

### CP-004: API Contract Compliance

```markdown
## API Contract Compliance Audit

### Check Steps
1. Locate OpenAPI/GraphQL schema files
2. Validate schema syntax
3. Compare schema to actual endpoints
4. Check for breaking changes vs baseline
5. Verify contract tests exist

### Pass Criteria
- [ ] Contract file exists and is valid
- [ ] All endpoints documented in contract
- [ ] No breaking changes without version bump
- [ ] Contract tests exist and pass
- [ ] Schema includes error responses

### Severity: P1 (breaking changes), P2 (missing docs)
### Standards: Internal API-001
```

### CP-005: Security Compliance

```markdown
## Security Compliance Audit

### Check Steps
1. Run static analysis (semgrep, eslint-security)
2. Check for hardcoded secrets
3. Verify authentication on protected endpoints
4. Check input validation patterns
5. Verify HTTPS enforcement

### Pass Criteria
- [ ] No hardcoded secrets detected
- [ ] No SQL injection patterns
- [ ] No XSS vulnerabilities
- [ ] Authentication required on /api/* endpoints
- [ ] Input validation on all user inputs

### Severity: P0 (secrets), P1 (vulnerabilities)
### Standards: OWASP Top 10, SOC2-CC6.1, DFARS-252.204
```

### CP-006: Performance Budget

```markdown
## Performance Budget Audit

### Check Steps
1. Check bundle size against budget
2. Verify lighthouse scores (if web app)
3. Check API response time budgets
4. Validate database query performance
5. Check memory usage patterns

### Pass Criteria
- [ ] Bundle size < 500KB (gzipped)
- [ ] Lighthouse performance > 80
- [ ] API p95 latency < 500ms
- [ ] No N+1 query patterns
- [ ] Memory usage < defined limit

### Severity: P2
### Standards: Internal PERF-001
```

### CP-007: Multi-Agent Orchestration

```markdown
## Multi-Agent Orchestration Audit

### Check Steps
1. Verify agent boundaries are defined
2. Check handoff protocols exist
3. Validate conflict resolution rules
4. Verify evidence requirements
5. Check human approval gates

### Pass Criteria
- [ ] Agent roles defined in ARCH.md
- [ ] Handoff protocols documented
- [ ] CARS risk levels assigned to operations
- [ ] Evidence artifacts generated
- [ ] Human gates for HIGH/CRITICAL operations

### Severity: P2
### Standards: Internal AGENT-001
```

## Findings Output Format

```json
{
  "audit_id": "AUDIT-2025-12-29-001",
  "timestamp": "2025-12-29T15:00:00Z",
  "repo": "portfolio-intel",
  "prompts_run": ["CP-001", "CP-002", "CP-003", "CP-004", "CP-005"],
  "overall_score": 78,
  "overall_status": "PASS_WITH_WARNINGS",
  "findings": [
    {
      "finding_id": "F-001",
      "prompt_id": "CP-002",
      "severity": "P1",
      "title": "High vulnerability in lodash",
      "description": "CVE-2021-23337 affects lodash < 4.17.21",
      "location": "package.json:15",
      "evidence": {
        "current_version": "4.17.15",
        "safe_version": "4.17.21",
        "cve": "CVE-2021-23337",
        "cvss": 7.2
      },
      "remediation": "Update lodash to ^4.17.21",
      "auto_fixable": true,
      "standards_violated": ["SOC2-CC6.1"]
    }
  ],
  "summary": {
    "total_checks": 45,
    "passed": 38,
    "failed": 7,
    "by_severity": { "P0": 0, "P1": 2, "P2": 4, "P3": 1 },
    "by_category": {
      "documentation": { "passed": 8, "failed": 2 },
      "security": { "passed": 10, "failed": 1 },
      "dependencies": { "passed": 5, "failed": 2 },
      "deployment": { "passed": 8, "failed": 1 },
      "api": { "passed": 7, "failed": 1 }
    }
  },
  "evidence_artifacts": [
    ".arcfoundry/evidence/npm-audit.json",
    ".arcfoundry/evidence/semgrep-results.json",
    ".arcfoundry/evidence/lighthouse-report.html"
  ]
}
```

## CI Integration

```yaml
# .github/workflows/compliance-audit.yml
name: Compliance Audit
on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Compliance Prompts
        run: |
          arcfoundry audit \
            --prompts=CP-001,CP-002,CP-003,CP-004,CP-005 \
            --output=.arcfoundry/audit
            
      - name: Check for Blockers
        run: |
          BLOCKERS=$(jq '.summary.by_severity.P0 + .summary.by_severity.P1' .arcfoundry/audit/findings.json)
          if [ "$BLOCKERS" -gt 0 ]; then
            echo "❌ P0/P1 findings block merge"
            jq '.findings[] | select(.severity == "P0" or .severity == "P1")' .arcfoundry/audit/findings.json
            exit 1
          fi
          
      - name: Upload Audit Evidence
        uses: actions/upload-artifact@v4
        with:
          name: compliance-evidence
          path: .arcfoundry/audit/
```

## Commands

```bash
# Run all prompts
arcfoundry audit --all

# Run specific prompts
arcfoundry audit --prompts=CP-001,CP-002

# Run by category
arcfoundry audit --category=security

# Generate compliance report
arcfoundry audit --report --format=pdf --standards=SOC2

# Cross-repo audit
arcfoundry audit --repos=all --hub-output
```
