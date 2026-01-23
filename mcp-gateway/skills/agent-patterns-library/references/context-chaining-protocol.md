# Context Chaining Protocol

A deterministic prompt pipeline that chains high-level context through specialized prompts to reduce hallucinations and increase accuracy.

## Purpose

Formalize the informal pattern of "Phase T recall → specific checks" into a deterministic, reproducible pipeline that:
- Reduces hallucinations through staged verification
- Increases determinism in agent outputs
- Enables specialized processing per repo type
- Creates audit trails of reasoning chains

## Core Principle

> **"Context flows down, findings flow up."**

Each stage receives context from the previous stage and produces refined findings for the next.

## Chain Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 1: IDENTIFICATION                                            │
│  ───────────────────────                                            │
│  Input: Repository path                                             │
│  Process: Identify repo type, boundaries, critical files            │
│  Output: repo-context.json                                          │
│                                                                     │
│  Prompts: repo-classifier, boundary-detector                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 2: EXTRACTION                                                │
│  ──────────────────                                                 │
│  Input: repo-context.json                                           │
│  Process: Extract contracts, dependencies, configurations           │
│  Output: extracted-artifacts.json                                   │
│                                                                     │
│  Prompts: contract-extractor, dependency-mapper, config-parser      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 3: SPECIALIZED CHECKS                                        │
│  ─────────────────────────                                          │
│  Input: extracted-artifacts.json + repo-type                        │
│  Process: Run type-specific validations                             │
│  Output: check-results.json                                         │
│                                                                     │
│  Prompts: (varies by repo type - see below)                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 4: SYNTHESIS                                                 │
│  ─────────────────                                                  │
│  Input: All previous outputs                                        │
│  Process: Aggregate findings, prioritize, recommend                 │
│  Output: final-report.json + recommendations.md                     │
│                                                                     │
│  Prompts: findings-aggregator, recommendation-generator             │
└─────────────────────────────────────────────────────────────────────┘
```

## Repo Type Definitions

### frontend-app (React/Vite/Next.js)

```yaml
type: frontend-app
identifiers:
  - package.json contains "react" or "vue" or "angular"
  - vite.config.* or next.config.* exists
  - /src/components/ directory exists

stage3_prompts:
  - bundle-size-check
  - component-structure-check
  - state-management-check
  - api-integration-check
  - accessibility-check
  - performance-budget-check

critical_paths:
  - /src/components/
  - /src/hooks/
  - /src/pages/ or /src/routes/
  - vite.config.* or next.config.*
```

### api-service (Express/Fastify/NestJS)

```yaml
type: api-service
identifiers:
  - package.json contains "express" or "fastify" or "@nestjs"
  - /src/routes/ or /src/controllers/ exists
  - OpenAPI spec exists

stage3_prompts:
  - endpoint-security-check
  - input-validation-check
  - error-handling-check
  - rate-limiting-check
  - authentication-check
  - api-contract-check

critical_paths:
  - /src/routes/ or /src/controllers/
  - /src/middleware/
  - /src/auth/
  - /contracts/*.yaml
```

### data-service (ETL/Pipeline)

```yaml
type: data-service
identifiers:
  - Contains transformation logic
  - Database connection configurations
  - Job/scheduler definitions

stage3_prompts:
  - data-validation-check
  - transformation-integrity-check
  - idempotency-check
  - error-recovery-check
  - performance-check
  - data-contract-check

critical_paths:
  - /src/transformations/
  - /src/jobs/
  - /config/database.*
  - /contracts/schemas/
```

### sdk-tool (Mendix SDK, CLI tools)

```yaml
type: sdk-tool
identifiers:
  - Exports public API
  - Has CLI entry point
  - Contains /lib/ or /dist/ output

stage3_prompts:
  - api-stability-check
  - backwards-compatibility-check
  - documentation-check
  - example-validation-check
  - version-semver-check
  - type-definition-check

critical_paths:
  - /src/index.* (main export)
  - /src/cli.*
  - /types/
  - /examples/
```

### control-plane (Policy/Governance)

```yaml
type: control-plane
identifiers:
  - Policy definitions exist
  - Multi-tenant configuration
  - Audit logging present

stage3_prompts:
  - policy-completeness-check
  - tenant-isolation-check
  - audit-logging-check
  - permission-model-check
  - compliance-mapping-check
  - evidence-generation-check

critical_paths:
  - /policies/
  - /src/audit/
  - /src/tenants/
  - /config/permissions.*
```

## Stage Implementations

### Stage 1: Identification

```javascript
// repo-classifier prompt
const stage1 = {
  prompt: `
    Analyze the repository at {repo_path} and determine:
    1. Repository type (frontend-app, api-service, data-service, sdk-tool, control-plane)
    2. Primary technology stack
    3. Architectural boundaries
    4. Critical file paths
    
    Output JSON format:
    {
      "repo_type": "string",
      "stack": ["technology1", "technology2"],
      "boundaries": {
        "in_scope": ["description"],
        "out_scope": ["description"]
      },
      "critical_paths": ["/path1", "/path2"],
      "confidence": 0.0-1.0
    }
  `,
  inputs: ["repo_path"],
  outputs: ["repo-context.json"],
  validation: "json-schema:repo-context"
};
```

### Stage 2: Extraction

```javascript
// contract-extractor prompt
const stage2_contracts = {
  prompt: `
    Given repository context: {repo_context}
    
    Extract all contracts:
    1. API contracts (OpenAPI, GraphQL schemas)
    2. Data contracts (JSON schemas, TypeScript types)
    3. Policy contracts (Policy IR files)
    4. Dependency contracts (package.json, requirements.txt)
    
    Output JSON format:
    {
      "api_contracts": [{ "path": "", "type": "", "version": "" }],
      "data_contracts": [{ "path": "", "schema_type": "" }],
      "policy_contracts": [{ "path": "", "policy_type": "" }],
      "dependencies": { "production": [], "dev": [] }
    }
  `,
  inputs: ["repo_context"],
  outputs: ["extracted-artifacts.json"],
  validation: "json-schema:extracted-artifacts"
};
```

### Stage 3: Specialized Checks

```javascript
// Example: frontend-app bundle-size-check
const stage3_bundle = {
  prompt: `
    Given extracted artifacts: {artifacts}
    Repository type: frontend-app
    
    Check bundle size:
    1. Analyze package.json dependencies
    2. Identify large dependencies (>100KB)
    3. Check for duplicate dependencies
    4. Calculate estimated bundle impact
    5. Compare to budget (500KB gzipped)
    
    Output JSON format:
    {
      "check_id": "bundle-size-check",
      "passed": boolean,
      "score": 0-100,
      "findings": [{
        "severity": "P1|P2|P3",
        "issue": "description",
        "location": "package.json:line",
        "recommendation": "action"
      }],
      "metrics": {
        "estimated_size_kb": number,
        "budget_kb": 500,
        "largest_deps": [{ "name": "", "size_kb": number }]
      }
    }
  `,
  inputs: ["artifacts", "repo_type"],
  outputs: ["check-bundle-size.json"],
  validation: "json-schema:check-result"
};
```

### Stage 4: Synthesis

```javascript
// findings-aggregator prompt
const stage4 = {
  prompt: `
    Given all check results: {check_results}
    Repository context: {repo_context}
    
    Synthesize findings:
    1. Aggregate all findings by severity
    2. Identify patterns across checks
    3. Prioritize by impact and effort
    4. Generate actionable recommendations
    
    Output JSON format:
    {
      "summary": {
        "total_findings": number,
        "by_severity": { "P0": n, "P1": n, "P2": n, "P3": n },
        "overall_health": 0-100
      },
      "prioritized_findings": [
        { "rank": 1, "finding": {}, "rationale": "" }
      ],
      "recommendations": [
        { "priority": 1, "action": "", "effort": "low|medium|high", "impact": "low|medium|high" }
      ],
      "patterns_detected": ["pattern1", "pattern2"]
    }
  `,
  inputs: ["check_results", "repo_context"],
  outputs: ["final-report.json", "recommendations.md"],
  validation: "json-schema:final-report"
};
```

## Chain Execution

```bash
# Execute full chain
arcfoundry chain run \
  --repo=portfolio-intel \
  --output=.arcfoundry/chain/$(date +%Y-%m-%d)

# Execute specific stages
arcfoundry chain run --stages=1,2 --repo=portfolio-intel

# Execute with specific repo type override
arcfoundry chain run --repo-type=frontend-app --repo=portfolio-intel

# Dry run (show what would execute)
arcfoundry chain run --dry-run --repo=portfolio-intel
```

## Chain Output Structure

```
.arcfoundry/chain/2025-12-29/
├── manifest.json           # Chain execution metadata
├── stage1/
│   ├── repo-context.json   # Identification output
│   └── execution.log       # Stage execution log
├── stage2/
│   ├── extracted-artifacts.json
│   └── execution.log
├── stage3/
│   ├── check-bundle-size.json
│   ├── check-security.json
│   ├── check-contracts.json
│   └── execution.log
├── stage4/
│   ├── final-report.json
│   ├── recommendations.md
│   └── execution.log
└── evidence/
    ├── chain-trace.json    # Full execution trace
    └── artifacts/          # Supporting evidence
```

## Determinism Guarantees

1. **Same input → Same output**: Prompts are deterministic given identical inputs
2. **Staged validation**: Each stage validates outputs before passing to next
3. **Traceable reasoning**: Full execution trace stored for audit
4. **Reproducible runs**: Chain can be re-executed with same inputs

## Integration with CARS

Chain findings feed CARS risk assessment:

```json
{
  "cars_integration": {
    "risk_level": "MEDIUM",
    "basis": "stage4.summary.by_severity",
    "autonomy_recommendation": "Propose changes, await approval",
    "evidence_path": ".arcfoundry/chain/2025-12-29/"
  }
}
```
