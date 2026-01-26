# Architecture Drift Tracking

Time-series analysis of architectural changes using Git history to detect drift, generate retro-ADRs, and provide investor-grade governance proof.

## Purpose

Track architecture as a time-series to:
- Detect drift from baselines automatically
- Generate retrospective ADRs from significant changes
- Prove governance controls to investors/auditors
- Enable "what changed since X" queries
- Support compliance evidence generation

## Drift Detection Model

### What Constitutes Drift

| Drift Type | Detection Method | Severity |
|------------|------------------|----------|
| Dependency drift | package.json diff, major version changes | P1-P2 |
| API surface drift | OpenAPI schema diff, endpoint additions/removals | P1 |
| Security posture drift | New vulnerabilities, permission changes | P0-P1 |
| Performance drift | Bundle size increase, new heavy dependencies | P2 |
| Contract drift | Schema changes, breaking modifications | P1 |
| Configuration drift | Environment changes, feature flags | P2-P3 |
| Boundary drift | New external dependencies, architecture changes | P1 |

### Baseline Definition

```yaml
# baseline.yaml
baseline_id: CCC-PILOT-LOCK-v2
created: 2025-12-15T00:00:00Z
commit: abc123def456
build_id: BUILD-2025-12-15-001

locked_state:
  dependencies:
    production: 45
    dev: 123
    hash: sha256:abc123...
    
  api_surface:
    endpoints: 23
    schemas: 12
    hash: sha256:def456...
    
  security:
    vulnerabilities:
      critical: 0
      high: 0
      medium: 3
    permissions: [read, write, admin]
    
  performance:
    bundle_size_kb: 456
    lighthouse_score: 87
    
  contracts:
    openapi_version: 2.1.0
    policy_ir_version: 1.3.0
```

## Snapshot Cadence

| Frequency | Content | Storage |
|-----------|---------|---------|
| On commit | Quick diff vs previous | Git notes |
| Nightly | Full snapshot | ARCHHUB/repos/{id}/snapshots/ |
| Weekly | Comprehensive analysis | ARCHHUB/repos/{id}/weekly/ |
| On release | Baseline candidate | ARCHHUB/repos/{id}/releases/ |

## Drift Report Format

```markdown
# Drift Report: portfolio-intel

**Period**: 2025-12-22 → 2025-12-29
**Baseline**: CCC-PILOT-LOCK-v2
**Current Commit**: def789ghi012

## Summary

| Category | Changes | Severity | Requires ADR |
|----------|---------|----------|--------------|
| Dependencies | +3, -1, ~5 | P2 | No |
| API Surface | +2 endpoints | P1 | Yes |
| Security | +1 medium vuln | P2 | No |
| Performance | +12KB bundle | P3 | No |
| Contracts | 1 schema change | P1 | Yes |

## Dependency Changes

### Added
- `@tanstack/react-query@5.0.0` - Data fetching (P2)
- `zod@3.22.0` - Schema validation (P3)
- `date-fns@3.0.0` - Date utilities (P3)

### Removed
- `moment@2.29.4` - Replaced by date-fns (P3)

### Updated
- `react@18.2.0 → 18.3.0` - Minor update (P3)
- `typescript@5.2.0 → 5.3.0` - Minor update (P3)
- `lodash@4.17.15 → 4.17.21` - Security fix (P2)

## API Surface Changes

### New Endpoints
- `POST /api/v2/reports/export` - Export reports to PDF
- `GET /api/v2/insights/recommendations` - AI recommendations

**⚠️ ADR Required**: New API surface requires architecture decision record.

## Security Posture

### New Vulnerabilities
- CVE-2025-12345 (Medium) in `example-lib@1.2.3`
  - Affects: XSS in edge case
  - Mitigation: Update to 1.2.4 (available)

### Resolved
- CVE-2021-23337 in lodash (was High, now fixed)

## Contract Changes

### OpenAPI Schema
- Added: `/components/schemas/ReportExport`
- Modified: `/components/schemas/Insight` - added `recommendations` field

**⚠️ ADR Required**: Schema changes require architecture decision record.

## Retro-ADR Candidates

Based on drift analysis, the following changes warrant ADRs:

1. **ADR-015: Add React Query for Data Fetching**
   - Context: Replaced manual fetch with React Query
   - Commits: abc123, def456
   - Files changed: 15
   
2. **ADR-016: Report Export API**
   - Context: New PDF export capability
   - Commits: ghi789
   - Files changed: 8
```

## Retro-ADR Generation

Automatically generate ADR drafts from significant changes:

```markdown
# ADR-015: Add React Query for Data Fetching

## Status
Proposed (auto-generated from drift detection)

## Context
Between 2025-12-22 and 2025-12-29, the following changes were detected:
- Added dependency: @tanstack/react-query@5.0.0
- Modified 15 files in /src/hooks/ and /src/components/
- Removed: useEffect-based data fetching patterns

Commits involved:
- abc123: "feat: add react-query setup"
- def456: "refactor: migrate dashboard to react-query"

## Decision
[TO BE FILLED BY HUMAN]

Detected pattern suggests: Adoption of React Query for centralized data fetching
and caching, replacing manual useEffect patterns.

## Consequences

### Positive (inferred)
- Centralized cache management
- Automatic background refetching
- Reduced boilerplate code

### Negative (inferred)
- New dependency to maintain
- Team learning curve
- Migration effort for existing code

### Risks (detected)
- Bundle size increased by 12KB
- New abstraction layer to debug

## Evidence
- Drift report: .arcfoundry/drift/2025-12-29/drift-report.md
- Commits: abc123, def456
- Files: [list of 15 files]

---
*Auto-generated by ArcFoundry Drift Tracking*
*Requires human review and completion*
```

## CI Integration

```yaml
# .github/workflows/drift-detection.yml
name: Architecture Drift Detection
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Nightly

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for drift analysis
          
      - name: Load Baseline
        run: |
          arcfoundry baseline load --id=CCC-PILOT-LOCK-v2
          
      - name: Detect Drift
        run: |
          arcfoundry drift detect \
            --baseline=CCC-PILOT-LOCK-v2 \
            --output=.arcfoundry/drift/$(date +%Y-%m-%d)
            
      - name: Generate Retro-ADRs
        run: |
          arcfoundry drift generate-adrs \
            --input=.arcfoundry/drift/$(date +%Y-%m-%d) \
            --output=docs/adr/
            
      - name: Check for P0/P1 Drift
        run: |
          SEVERITY=$(jq '.summary.max_severity' .arcfoundry/drift/*/summary.json)
          if [ "$SEVERITY" == "P0" ] || [ "$SEVERITY" == "P1" ]; then
            echo "⚠️ Significant drift detected - review required"
            exit 1
          fi
          
      - name: Upload to Architecture Hub
        run: |
          arcfoundry hub upload \
            --repo=portfolio-intel \
            --type=drift \
            --path=.arcfoundry/drift/$(date +%Y-%m-%d)
```

## Commands

```bash
# Detect drift from baseline
arcfoundry drift detect --baseline=CCC-PILOT-LOCK-v2

# Compare two points in time
arcfoundry drift compare --from=2025-12-01 --to=2025-12-29

# Generate retro-ADRs
arcfoundry drift generate-adrs --since=2025-12-01

# Create new baseline
arcfoundry baseline create --id=CCC-PILOT-LOCK-v3

# View drift history
arcfoundry drift history --repo=portfolio-intel --last=30d

# Generate investor report
arcfoundry drift report --format=diligence --period=Q4-2025
```

## Investor Diligence Output

```markdown
# Architecture Governance Report
## Q4 2025 - Portfolio Intel

### Governance Summary
- **Baseline Locks**: 3 established (v1, v2, v3)
- **Drift Incidents**: 12 detected, 12 resolved
- **ADRs Generated**: 8 (5 accepted, 3 pending)
- **P0 Incidents**: 0
- **P1 Incidents**: 2 (both resolved within SLA)

### Drift Control Evidence
- Automated detection: 100% coverage
- Mean time to detect: < 1 hour
- Mean time to resolve: 2.3 days
- Baseline compliance: 94%

### Attached Evidence
- Drift reports (weekly)
- ADR records
- Resolution timelines
- Audit logs
```
