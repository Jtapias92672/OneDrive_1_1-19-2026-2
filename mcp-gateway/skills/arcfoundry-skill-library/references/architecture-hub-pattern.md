# Architecture Hub Pattern

A meta-repository pattern for maintaining persistent architectural context across multiple projects and workspaces.

## Purpose

The Architecture Hub serves as the single source of truth for:
- Cross-project architectural decisions
- Agent context persistence
- Investor/customer diligence documentation
- Drift detection baselines
- Contract and SLO enforcement artifacts

## Hub Structure

```
ARCHHUB/
├── repos/
│   ├── <repoId>/
│   │   ├── snapshot.md          # Current state summary
│   │   ├── signals.json         # Health/risk signals
│   │   ├── contracts/           # API contracts, Policy IR
│   │   ├── baselines/           # Locked baseline versions
│   │   └── evidence/            # Verification artifacts
│   └── ...
├── indexes/
│   ├── dependencies.graph.json  # Cross-repo dependency map
│   ├── apis.index.json          # All API surfaces
│   ├── risks.index.json         # Aggregated risk signals
│   └── contracts.index.json     # Contract registry
├── decisions/
│   ├── ADR-001-*.md            # Architecture Decision Records
│   └── ...
└── governance/
    ├── standards.md             # Enforced standards
    ├── policies/                # Policy IR references
    └── slos/                    # Service Level Objectives
```

## Snapshot File Format (snapshot.md)

```markdown
---
repo_id: portfolio-intel
last_updated: 2025-12-29T15:00:00Z
build_id: BUILD-2025-12-29-001
baseline_lock: CCC-PILOT-LOCK-v2
health_score: 87
---

# Portfolio Intel Snapshot

## Purpose
PMO dashboard for defense contractors with EVM analytics.

## Boundaries
- Frontend: React/Vite (MasterFrontend pattern)
- Backend: Node.js Express API
- Data: PostgreSQL + Redis cache

## Critical Flows
1. EVM data ingestion → calculation → dashboard
2. AI insights generation → approval → display
3. Multi-tenant isolation → data access control

## Protected Paths
- /src/core/evm-calculations/ - DO NOT MODIFY without ADR
- /src/api/auth/ - Security critical
- /config/tenants/ - Multi-tenant configuration

## Active Contracts
- OpenAPI: /contracts/api-v2.yaml
- Policy IR: /policies/tenant-isolation.ir

## Verification Commands
```bash
npm run test:unit
npm run test:integration
npm run verify:contracts
npm run audit:security
```

## Known Risks
- [ ] RISK-001: Cache invalidation timing (P2)
- [x] RISK-002: Tenant data leak vector (RESOLVED)
```

## Signals File Format (signals.json)

```json
{
  "repo_id": "portfolio-intel",
  "timestamp": "2025-12-29T15:00:00Z",
  "health": {
    "score": 87,
    "trend": "stable",
    "last_incident": "2025-12-15"
  },
  "coverage": {
    "unit_tests": 78,
    "integration_tests": 65,
    "contract_tests": 92
  },
  "security": {
    "vulnerabilities": { "critical": 0, "high": 1, "medium": 3 },
    "last_audit": "2025-12-20",
    "compliance": ["SOC2", "DFARS"]
  },
  "drift": {
    "from_baseline": "minor",
    "api_changes": 2,
    "dependency_updates": 5,
    "policy_violations": 0
  },
  "contracts": {
    "total": 4,
    "valid": 4,
    "breaking_changes": 0
  }
}
```

## Integration with ArcFoundry

### With CARS Framework
- Hub snapshots feed RiskAssessments
- Signals determine autonomy levels
- Evidence artifacts support approval gates

### With MCP Context Packs
- Snapshots auto-generate Context Packs
- Indexes provide cross-repo context
- Decisions inform agent behavior

### With Baseline Locks
- Hub stores canonical baseline versions
- Drift detection compares against locks
- Restore points reference hub snapshots

## Maintenance Cadence

| Activity | Frequency | Automation |
|----------|-----------|------------|
| Snapshot refresh | On commit/daily | CI pipeline |
| Signal calculation | Hourly | Scheduled job |
| Index rebuild | Daily | Nightly job |
| Baseline comparison | On PR/daily | CI pipeline |
| Full audit | Weekly | Scheduled job |

## Commands

```bash
# Generate snapshot for repo
arcfoundry hub snapshot --repo=portfolio-intel

# Update signals
arcfoundry hub signals --repo=portfolio-intel

# Rebuild indexes
arcfoundry hub index --all

# Compare to baseline
arcfoundry hub drift --repo=portfolio-intel --baseline=CCC-PILOT-LOCK-v2

# Generate investor report
arcfoundry hub report --format=diligence
```

## Evidence Generation

Every hub operation produces evidence artifacts:
- Timestamped snapshots
- Diff reports against baselines
- Compliance check results
- Contract validation outputs

These artifacts support:
- DCMA/DFARS compliance
- SOC2 audit trails
- Investor due diligence
- Customer security reviews
