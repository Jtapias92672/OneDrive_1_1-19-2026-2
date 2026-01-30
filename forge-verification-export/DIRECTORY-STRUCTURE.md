# FORGE MCP Gateway Directory Structure
Generated: 2026-01-23

```
mcp-gateway/
├── .github/
│   └── workflows/           # CI/CD pipelines
│       ├── behavioral-verification.yml
│       ├── reward-integrity.yml
│       └── slop-tests.yml
│
├── alerting/                # Alert management system
│   ├── alert-manager.ts
│   ├── deduplicator.ts
│   ├── index.ts
│   └── types.ts
│
├── api/                     # REST API layer
│   └── routes.ts            # All API endpoints
│
├── approval/                # Human-in-loop approval
│   ├── api.ts
│   └── index.ts
│
├── audit/                   # Audit logging & compliance
│   ├── audit-logger.ts
│   ├── dcma-format.ts       # DCMA compliance formatting
│   ├── evidence-binding.ts
│   ├── index.ts
│   └── retention.ts
│
├── cars/                    # CARS Risk Assessment Framework
│   ├── context.ts
│   ├── deceptive-compliance-detector.ts
│   ├── index.ts
│   ├── reward-hacking-detector.ts
│   ├── risk-assessment.ts
│   ├── risk-levels.ts
│   └── risk-matrix.ts
│
├── core/                    # Core gateway functionality
│   ├── gateway.ts
│   └── index.ts
│
├── execution/               # Code execution sandbox
│   ├── audit-logger.ts
│   ├── index.ts
│   ├── mcp-code-first.ts
│   ├── privacy-filter.ts
│   ├── safe-execute.ts
│   ├── types.ts
│   ├── virtual-fs.ts
│   └── vm-sandbox.ts
│
├── infrastructure/          # Deployment infrastructure
│   ├── ci/
│   │   └── github-actions-lambda.yml
│   ├── docker/
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   ├── prometheus.yml
│   │   └── grafana/
│   │       └── provisioning/
│   │           ├── dashboards/
│   │           │   ├── dashboards.yml
│   │           │   └── forge-dashboard.json
│   │           └── datasources/
│   │               └── prometheus.yml
│   ├── helm/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   │       └── deployment.yaml
│   ├── kubernetes/
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── lambda/
│   │   └── forge-worker/
│   │       ├── index.ts
│   │       └── package.json
│   ├── scripts/
│   │   └── deploy-lambda.sh
│   └── terraform/
│       ├── environments/
│       │   └── prod/
│       │       └── lambda.tf
│       └── modules/
│           ├── bedrock/
│           ├── lambda/
│           └── vpc/
│
├── metrics/                 # Prometheus metrics
│   └── index.ts
│
├── monitoring/              # Monitoring integration
│   └── index.ts
│
├── oauth/                   # OAuth 2.1 + PKCE
│   ├── index.ts
│   ├── oauth-client.ts
│   ├── pkce.ts
│   ├── scopes.ts
│   └── token-manager.ts
│
├── privacy/                 # Privacy controls
│   └── index.ts
│
├── rate-limit/              # Rate limiting
│   ├── index.ts
│   ├── quota-tracker.ts
│   └── rate-limiter.ts
│
├── sandbox/                 # Sandbox execution
│   ├── deno-runtime.ts
│   ├── index.ts
│   └── security-policy.ts
│
├── sanitization/            # Input/output sanitization
│   ├── index.ts
│   ├── output.ts
│   ├── patterns.ts
│   ├── policies.ts
│   └── sanitizer.ts
│
├── scripts/                 # Utility scripts
│   └── slop-tests.sh
│
├── security/                # Security module
│   └── index.ts
│
├── security-controls/       # Security controls
│   ├── access-control.ts
│   ├── crypto-service.ts
│   ├── index.ts
│   ├── secrets-manager.ts
│   ├── security-headers.ts
│   ├── session-manager.ts
│   ├── threat-detector.ts
│   └── types.ts
│
├── skills/                  # ArcFoundry skill libraries
│   ├── README.md
│   ├── agent-patterns-library/
│   │   ├── SKILL.md
│   │   └── references/ (10 files)
│   ├── arcfoundry-skill-library/
│   │   ├── SKILL.md
│   │   └── references/ (16 files)
│   ├── compliance-security-library/
│   │   ├── SKILL.md
│   │   └── references/ (6 files)
│   ├── data-analytics-library/
│   │   ├── SKILL.md
│   │   └── references/ (4 files)
│   ├── development-practices-library/
│   │   ├── SKILL.md
│   │   ├── references/ (12 files)
│   │   └── scripts/ (1 file)
│   ├── genbi-governance-library/
│   │   ├── SKILL.md
│   │   └── references/ (6 files)
│   ├── infrastructure-library/
│   │   ├── SKILL.md
│   │   ├── references/ (3 files)
│   │   └── scripts/ (3 files)
│   ├── memory-architecture-library/
│   │   ├── SKILL.md
│   │   └── references/ (6 files)
│   ├── ui-governance-library/
│   │   ├── SKILL.md
│   │   └── references/ (3 files)
│   └── verification-quality-library/
│       ├── SKILL.md
│       └── references/ (3 files)
│
├── src/                     # Source modules
│   ├── agents/              # Agent management
│   │   ├── agent-metrics.ts
│   │   ├── agent-registry.ts
│   │   ├── index.ts
│   │   └── types.ts
│   └── skills/              # Skill system
│       ├── index.ts
│       ├── loader.ts
│       ├── matcher.ts       # Semantic skill matcher
│       ├── metrics.ts
│       ├── registry.ts
│       └── types.ts
│
├── supply-chain/            # Supply chain security
│   ├── index.ts
│   ├── provenance-verifier.ts
│   ├── sbom-generator.ts
│   └── signature-verifier.ts
│
├── tenant/                  # Multi-tenant isolation
│   ├── context-extractor.ts
│   ├── index.ts
│   ├── isolation-engine.ts
│   ├── leak-detector.ts
│   └── limits.ts
│
├── tests/                   # Test suite
│   └── unit/
│       ├── alerting.test.ts
│       ├── deceptive-compliance.test.ts
│       ├── oauth.test.ts
│       ├── reward-hacking.test.ts
│       ├── sanitization.test.ts
│       └── tenant.test.ts
│
├── verification/            # Behavioral verification
│   ├── behavioral-verifier.ts
│   ├── index.ts
│   └── reward-integrity-verifier.ts
│
├── docs/                    # Documentation
│   ├── skills/
│   │   └── SKILLS-INDEX.md
│   └── verification/
│       ├── EPIC-3.5-VERIFICATION-REPORT.md
│       ├── EPIC-3.6-VERIFICATION-REPORT.md
│       ├── EPIC-3.7-VERIFICATION-REPORT.md
│       ├── EPIC-3.75-VERIFICATION-REPORT.md
│       ├── EPIC-9-VERIFICATION-REPORT.md
│       ├── FORGE-COMPLETE-VERIFICATION-REPORT.md
│       └── FORGE-SYSTEM-VERIFICATION-REPORT.md
│
├── index.ts                 # Main entry point
├── server.ts                # HTTP server
├── package.json
├── package-lock.json
├── tsconfig.json
└── jest.config.js
```

## File Counts by Module

| Module | TypeScript Files | Test Files |
|--------|------------------|------------|
| alerting | 4 | 1 |
| api | 1 | 0 |
| approval | 2 | 0 |
| audit | 5 | 0 |
| cars | 7 | 2 |
| core | 2 | 0 |
| execution | 8 | 0 |
| metrics | 1 | 0 |
| oauth | 5 | 1 |
| rate-limit | 3 | 0 |
| sanitization | 5 | 1 |
| security-controls | 8 | 0 |
| supply-chain | 4 | 0 |
| tenant | 5 | 1 |
| verification | 3 | 0 |
| src/agents | 4 | 0 |
| src/skills | 6 | 0 |
| **Total** | **73** | **6** |

## Skill Reference Counts

| Skill Library | References | Scripts |
|---------------|------------|---------|
| agent-patterns-library | 10 | 0 |
| arcfoundry-skill-library | 16 | 0 |
| compliance-security-library | 6 | 0 |
| data-analytics-library | 4 | 0 |
| development-practices-library | 12 | 1 |
| genbi-governance-library | 6 | 0 |
| infrastructure-library | 3 | 3 |
| memory-architecture-library | 6 | 0 |
| ui-governance-library | 3 | 0 |
| verification-quality-library | 3 | 0 |
| **Total** | **69** | **4** |
