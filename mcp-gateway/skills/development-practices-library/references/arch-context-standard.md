# ARCH.md Context Standard

A standardized "Living Context" file for every repository that serves as the primary agent communication interface.

## Purpose

ARCH.md provides:
- Single source of truth for repository context
- Reduces session drift across AI interactions
- Enables automated MCP Context Pack generation
- Supports Architecture Decision Records (ADRs)
- Defines protected paths and modification rules

## Mandatory Sections

### 1. Header (YAML Frontmatter)

```yaml
---
repo_name: portfolio-intel
repo_type: frontend-app  # frontend-app | api-service | data-service | sdk-tool | control-plane
version: 2.1.0
last_updated: 2025-12-29
baseline_lock: CCC-PILOT-LOCK-v2
health_score: 87
owner: joe@arcfoundry.com
---
```

### 2. Purpose & Boundaries

```markdown
## Purpose

[One paragraph describing what this repo does and why it exists]

## Boundaries

- **IN SCOPE**: [What this repo handles]
- **OUT OF SCOPE**: [What belongs elsewhere]
- **Dependencies**: [Key external systems]
- **Consumers**: [Who/what uses this]
```

### 3. Critical Flows

```markdown
## Critical Flows

### Flow 1: [Name]
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Failure mode**: [What happens if this breaks]
**Recovery**: [How to recover]

### Flow 2: [Name]
...
```

### 4. Protected Paths

```markdown
## Protected Paths

| Path | Protection Level | Modification Rule |
|------|-----------------|-------------------|
| /src/core/evm/ | CRITICAL | Requires ADR + 2 approvers |
| /src/api/auth/ | HIGH | Security review required |
| /config/ | MEDIUM | Notify team lead |
| /tests/ | LOW | Standard PR process |

**CRITICAL**: Never modify without explicit ADR approval
**HIGH**: Requires specialist review
**MEDIUM**: Requires notification
**LOW**: Standard development process
```

### 5. Contracts

```markdown
## Contracts

### API Contracts
- OpenAPI: `/contracts/api-v2.yaml`
- GraphQL: `/contracts/schema.graphql`

### Policy Contracts
- Tenant Isolation: `/policies/tenant-isolation.ir`
- Data Access: `/policies/data-access.ir`

### Data Contracts
- Input Schema: `/contracts/input-schema.json`
- Output Schema: `/contracts/output-schema.json`

### Verification
```bash
npm run verify:contracts
```
```

### 6. Runbooks & Rollback

```markdown
## Runbooks

### Deploy to Production
1. Ensure all tests pass: `npm run test:all`
2. Verify contracts: `npm run verify:contracts`
3. Create deployment PR with BUILD_ID
4. Wait for 2 approvals
5. Merge and monitor for 30 minutes

### Rollback Procedure
1. Identify failing BUILD_ID
2. Run: `./scripts/rollback.sh --to=<previous-BUILD_ID>`
3. Verify health: `npm run health:check`
4. Notify team in Slack #deployments

### Incident Response
1. Page on-call: [contact info]
2. Check logs: `kubectl logs -f deployment/portfolio-intel`
3. If data corruption: STOP and escalate
```

### 7. Known Risks

```markdown
## Known Risks

| ID | Risk | Severity | Status | Mitigation |
|----|------|----------|--------|------------|
| RISK-001 | Cache invalidation timing | P2 | OPEN | Implement TTL refresh |
| RISK-002 | Tenant data leak | P0 | RESOLVED | Added isolation layer |
| RISK-003 | Memory leak in reports | P1 | MONITORING | Added heap limits |
```

### 8. Verification Commands

```markdown
## Verification Commands

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Contract verification
npm run verify:contracts

# Security audit
npm run audit:security

# Performance check
npm run perf:baseline

# Full verification suite
npm run verify:all
```
```

## Repo Type Templates

### frontend-app
Focus on: build config, component boundaries, state management, API integration points

### api-service
Focus on: endpoints, authentication, rate limits, data validation, error handling

### data-service
Focus on: data flows, transformations, storage, caching, consistency guarantees

### sdk-tool
Focus on: public API surface, versioning, backwards compatibility, examples

### control-plane
Focus on: policy enforcement, audit logging, multi-tenant isolation, compliance

## MCP Context Pack Generation

ARCH.md automatically generates MCP Context Packs:

```bash
# Generate context pack from ARCH.md
arcfoundry context-pack generate --from=ARCH.md --output=.context/

# Output structure:
.context/
├── summary.md          # Purpose + boundaries
├── flows.md            # Critical flows
├── contracts.json      # Contract references
├── protected-paths.json # Modification rules
└── commands.json       # Verification commands
```

## CI Enforcement

```yaml
# .github/workflows/arch-validation.yml
name: ARCH.md Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate ARCH.md
        run: |
          arcfoundry arch validate --strict
          arcfoundry arch check-protected-paths
          arcfoundry arch verify-contracts-referenced
```

## Plain-English Agent Directive

When an AI agent reads ARCH.md, it should:

1. **UNDERSTAND** the repo's purpose and boundaries FIRST
2. **RESPECT** protected paths - never modify without explicit approval
3. **FOLLOW** the runbooks for any operational tasks
4. **VERIFY** using the provided commands before claiming success
5. **REFERENCE** contracts when making API changes
6. **ACKNOWLEDGE** known risks when working in affected areas
