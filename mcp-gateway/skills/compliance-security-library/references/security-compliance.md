---
name: security-compliance
description: Embed OWASP security practices and compliance framework tracking into development workflow. Use when handling sensitive data, implementing authentication, preparing for audits, or ensuring regulatory compliance (SOC2, GDPR, CMMC, FedRAMP). Produces security review evidence and compliance matrices.
---

# Security Compliance Skill

```yaml
skill:
  name: security-compliance
  version: 1.0
  priority: P1
  lifecycle_stage:
    - planning
    - development
    - verification
    - operations
  triggers:
    - New feature handling PII or sensitive data
    - Authentication/authorization implementation
    - External service integration
    - Compliance audit preparation
    - Security review request
    - Secrets or credentials being added
    - Third-party library addition
  blocks_without:
    - Security review completed for sensitive features
    - Secrets stored in approved vault (not code)
    - OWASP checklist verified for user-facing features
    - Compliance requirements mapped to controls
  inputs:
    required:
      - Feature requirements
      - Data sensitivity classification
      - Applicable compliance frameworks
    optional:
      - Threat model
      - Previous security findings
      - Penetration test results
  outputs:
    required:
      - SECURITY_REVIEW.md
      - COMPLIANCE_MATRIX.md
      - secrets-inventory.json
  responsibilities:
    - Security review facilitation
    - OWASP practice enforcement
    - Secrets management governance
    - Compliance requirement tracking
    - Security evidence generation
  non_responsibilities:
    - Penetration testing execution
    - Security tool configuration
    - Incident response (see deployment-readiness)
    - Infrastructure security
```

---

## Procedure

### Step 1: Data Classification

Before ANY feature work, classify data:

```markdown
## Data Classification

| Data Element | Classification | Handling Requirements |
|--------------|----------------|----------------------|
| User email | PII | Encrypt at rest, log access |
| Password | SECRET | Hash only, never log |
| Session token | SECRET | Short TTL, secure cookie |
| User name | PII | Encrypt at rest |
| Usage analytics | INTERNAL | Anonymize before storage |
| Public content | PUBLIC | No special handling |

### Classification Definitions

| Level | Description | Examples |
|-------|-------------|----------|
| SECRET | Credentials, keys, tokens | API keys, passwords, JWTs |
| PII | Personally identifiable | Email, name, phone, SSN |
| CONFIDENTIAL | Business sensitive | Financials, contracts |
| INTERNAL | Internal use only | Logs, metrics |
| PUBLIC | No restrictions | Marketing content |
```

### Step 2: OWASP Top 10 Checklist

For user-facing features, verify against OWASP Top 10:

```markdown
## OWASP Top 10 Security Checklist

### A01: Broken Access Control
- [ ] Authorization checked on every request
- [ ] CORS properly configured
- [ ] Directory listing disabled
- [ ] JWT validated on server side
- [ ] Rate limiting implemented

### A02: Cryptographic Failures
- [ ] TLS 1.2+ enforced
- [ ] Passwords hashed with bcrypt/argon2
- [ ] Sensitive data encrypted at rest
- [ ] No sensitive data in URLs
- [ ] Secure random number generation

### A03: Injection
- [ ] Parameterized queries used
- [ ] Input validation on all fields
- [ ] Output encoding for HTML/JS
- [ ] Command injection prevented
- [ ] LDAP/XPath injection prevented

### A04: Insecure Design
- [ ] Threat modeling completed
- [ ] Security requirements documented
- [ ] Secure defaults configured
- [ ] Defense in depth applied

### A05: Security Misconfiguration
- [ ] Default credentials changed
- [ ] Unnecessary features disabled
- [ ] Error messages don't leak info
- [ ] Security headers configured
- [ ] Permissions minimized

### A06: Vulnerable Components
- [ ] Dependencies scanned for CVEs
- [ ] No known vulnerable versions
- [ ] Dependency update process defined
- [ ] Components from trusted sources

### A07: Authentication Failures
- [ ] Multi-factor available
- [ ] Brute force protection
- [ ] Session timeout configured
- [ ] Password complexity enforced
- [ ] Credential recovery secure

### A08: Data Integrity Failures
- [ ] Deserialization validated
- [ ] CI/CD pipeline secured
- [ ] Code signing implemented
- [ ] Integrity verification on updates

### A09: Logging & Monitoring Failures
- [ ] Security events logged
- [ ] Log injection prevented
- [ ] Alerts configured
- [ ] Logs protected from tampering

### A10: Server-Side Request Forgery
- [ ] URL validation implemented
- [ ] Allowlist for external calls
- [ ] Network segmentation applied
```

### Step 3: Generate SECURITY_REVIEW.md

Create `SECURITY_REVIEW.md`:

```markdown
# Security Review

## Review Metadata
- **Feature**: [Feature Name]
- **Reviewer**: [Security Reviewer]
- **Date**: YYYY-MM-DD
- **Status**: PENDING | APPROVED | REJECTED | CONDITIONAL

## Scope
### In Scope
- [Component 1]
- [Component 2]

### Out of Scope
- [Component 3] (reason)

## Data Flow
```
[User Input] → [API Gateway] → [Auth Service] → [Database]
                    ↓
              [Logging]
```

## Threat Model Summary

### Assets
| Asset | Value | Protection Required |
|-------|-------|---------------------|
| User credentials | HIGH | Encryption, hashing |
| Session tokens | HIGH | Secure storage, rotation |
| User data | MEDIUM | Encryption at rest |

### Threat Actors
| Actor | Capability | Motivation |
|-------|------------|------------|
| External attacker | Medium | Data theft |
| Malicious insider | High | Data exfiltration |
| Automated bot | Low | Credential stuffing |

### Threats Identified
| ID | Threat | Likelihood | Impact | Mitigation |
|----|--------|------------|--------|------------|
| T1 | SQL Injection | Medium | High | Parameterized queries |
| T2 | Session hijacking | Low | High | Secure cookies, short TTL |
| T3 | Brute force | High | Medium | Rate limiting, lockout |

## Security Controls

### Authentication
- [ ] Method: [JWT/Session/OAuth]
- [ ] MFA: [Available/Required/N/A]
- [ ] Session timeout: [X minutes]
- [ ] Token rotation: [Yes/No]

### Authorization
- [ ] Model: [RBAC/ABAC/ACL]
- [ ] Enforcement point: [API Gateway/Application]
- [ ] Tested: [Yes/No]

### Encryption
- [ ] In transit: [TLS 1.2+]
- [ ] At rest: [AES-256]
- [ ] Key management: [AWS KMS/Vault/etc.]

### Logging
- [ ] Security events captured: [Yes/No]
- [ ] PII masked: [Yes/No]
- [ ] Retention: [X days]
- [ ] Tamper protection: [Yes/No]

## Findings

### Critical
None identified.

### High
1. **[Finding Title]**
   - Description: [What's wrong]
   - Location: [File/component]
   - Recommendation: [How to fix]
   - Status: OPEN | FIXED | ACCEPTED

### Medium
1. **[Finding Title]**
   - Description: [What's wrong]
   - Recommendation: [How to fix]
   - Status: OPEN | FIXED | ACCEPTED

### Low
None identified.

## Approval

### Conditions (if CONDITIONAL)
- [ ] [Condition 1 must be met]
- [ ] [Condition 2 must be met]

### Sign-off
- Security Reviewer: _________________ Date: _______
- Tech Lead: _________________ Date: _______
```

### Step 4: Generate COMPLIANCE_MATRIX.md

Create `COMPLIANCE_MATRIX.md`:

```markdown
# Compliance Matrix

## Applicable Frameworks
- [ ] SOC 2 Type II
- [ ] GDPR
- [ ] CMMC Level 2
- [ ] FedRAMP Moderate
- [ ] HIPAA
- [ ] PCI-DSS

## Control Mapping

### Access Control

| Requirement | SOC2 | GDPR | CMMC | Control | Evidence |
|-------------|------|------|------|---------|----------|
| Unique user IDs | CC6.1 | Art.32 | AC.1.001 | User table with unique IDs | users.sql |
| MFA for admin | CC6.1 | - | IA.2.078 | Auth0 MFA config | auth-config.json |
| Access logging | CC7.2 | Art.30 | AU.2.041 | CloudWatch logs | logging.tf |
| Least privilege | CC6.3 | Art.25 | AC.1.002 | IAM policies | iam-roles.json |

### Data Protection

| Requirement | SOC2 | GDPR | CMMC | Control | Evidence |
|-------------|------|------|------|---------|----------|
| Encryption at rest | CC6.7 | Art.32 | SC.3.177 | RDS encryption | rds-config.tf |
| Encryption in transit | CC6.7 | Art.32 | SC.3.185 | TLS 1.2+ | nginx.conf |
| Data retention | CC6.5 | Art.17 | - | Retention policy | retention-policy.md |
| Right to erasure | - | Art.17 | - | Delete API | user-api.ts |

### Incident Response

| Requirement | SOC2 | GDPR | CMMC | Control | Evidence |
|-------------|------|------|------|---------|----------|
| Incident detection | CC7.3 | Art.33 | IR.2.092 | Alerting | alerts.yaml |
| Breach notification | CC7.4 | Art.33 | - | Response plan | incident-response.md |
| Incident logging | CC7.2 | Art.33 | AU.2.042 | Audit logs | audit-config.json |

## Evidence Inventory

| Control ID | Evidence Type | Location | Last Updated |
|------------|--------------|----------|--------------|
| AC-001 | Configuration | /infra/iam-roles.json | 2024-01-15 |
| AC-002 | Screenshot | /evidence/mfa-config.png | 2024-01-15 |
| DP-001 | Test result | /evidence/encryption-test.json | 2024-01-15 |

## Audit Readiness

### Pending Items
- [ ] [Item 1] - Owner: [Name] - Due: [Date]
- [ ] [Item 2] - Owner: [Name] - Due: [Date]

### Last Audit
- Date: YYYY-MM-DD
- Auditor: [Firm Name]
- Result: [Pass/Fail/Conditional]
- Findings: [Link to findings]
```

### Step 5: Secrets Inventory

Create `secrets-inventory.json`:

```json
{
  "schema_version": "1.0",
  "last_updated": "YYYY-MM-DD",
  "secrets": [
    {
      "name": "DATABASE_URL",
      "classification": "SECRET",
      "storage_location": "AWS Secrets Manager",
      "secret_arn": "arn:aws:secretsmanager:...",
      "rotation_enabled": true,
      "rotation_days": 90,
      "last_rotated": "YYYY-MM-DD",
      "access_roles": ["app-service", "admin"],
      "environments": ["production", "staging"]
    },
    {
      "name": "JWT_SECRET",
      "classification": "SECRET",
      "storage_location": "HashiCorp Vault",
      "vault_path": "secret/app/jwt",
      "rotation_enabled": true,
      "rotation_days": 30,
      "last_rotated": "YYYY-MM-DD",
      "access_roles": ["auth-service"],
      "environments": ["production", "staging", "development"]
    }
  ],
  "prohibited_locations": [
    "Source code",
    "Git history",
    "Environment files committed to repo",
    "Logs",
    "Error messages"
  ],
  "approved_vaults": [
    "AWS Secrets Manager",
    "HashiCorp Vault",
    "Azure Key Vault",
    "GCP Secret Manager"
  ]
}
```

---

## Integration Points

```yaml
integration_points:
  upstream:
    - architecture-decisions (security architecture decisions)
    - api-contracts (authentication requirements)
    - dependency-governance (vulnerable dependencies)
  downstream:
    - verification-protocol (security tests must pass)
    - deployment-readiness (security checklist for deploy)
    - slop-tests (secrets detection)
```

---

## Verification

```yaml
verification:
  success_criteria:
    - SECURITY_REVIEW.md completed and approved
    - OWASP checklist all items addressed
    - No secrets in source code (verified by scan)
    - Compliance matrix updated
    - All HIGH/CRITICAL findings resolved
  failure_modes:
    - Secrets committed to repository
    - Security review bypassed
    - Critical finding unresolved at deploy
    - Compliance gap discovered in audit
    - Breach due to known vulnerability
```

---

## Governance

```yaml
governance:
  approvals_required:
    - Security Lead (all security reviews)
    - Compliance Officer (compliance-impacting changes)
    - CISO (critical findings acceptance)
  audit_artifacts:
    - SECURITY_REVIEW.md
    - COMPLIANCE_MATRIX.md
    - secrets-inventory.json
    - Vulnerability scan reports
    - Penetration test reports
```

---

## Rationale

```yaml
rationale:
  why_this_skill_exists: |
    Security is often an afterthought, discovered during audits or
    breaches. Defense contractor work (CMMC) and enterprise clients
    (SOC2) require provable security controls. This skill embeds
    security into the development workflow, not as a gate at the end.
  risks_if_missing:
    - Compliance failures (audit findings)
    - Data breaches (regulatory fines)
    - Secrets exposure (credential theft)
    - Contract loss (failed security requirements)
    - Reputational damage
```
