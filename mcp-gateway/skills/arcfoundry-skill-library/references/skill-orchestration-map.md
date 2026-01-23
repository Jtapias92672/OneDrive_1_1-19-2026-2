
# Skill Orchestration Map

## Quick Reference: Which Skill for What

| I need to... | Primary Skill | Supporting Skills |
|--------------|---------------|-------------------|
| Recover from crisis | jt1-recovery-protocol | verification-protocol |
| Create a data connector | connector-factory | api-contracts |
| Build a dashboard | analytics-orchestration | genbi-trust-tiers |
| Certify an asset | certified-asset-lifecycle | evidence-binding-standard |
| Query the data lake | data-lake-governance | genbi-trust-tiers |
| Deploy to EKS | aws-eks-infrastructure-deployment | deployment-readiness |
| Implement MCP server | mcp-production-runtime | api-contracts |
| Assess risk | cars-framework | human-approval-gates |
| Write specifications | specification-first | api-contracts |
| Validate implementation | verification-protocol | slop-tests |
| Review code changes | human-review-gates | safe-modification-protocol |
| Handle errors | actionable-errors | jt1-recovery-protocol |
| Capture lessons | lessons-learned | translator-lessons |
| Plan multi-agent work | agent-orchestration | habitat-isolation |

---

## Skill Categories

### Infrastructure Skills
- aws-eks-infrastructure-deployment
- mcp-production-runtime
- mcp-context-protocol-implementation
- deployment-readiness

### Governance Skills
- certified-asset-lifecycle
- genbi-trust-tiers
- evidence-binding-standard
- policy-ir-compiler-verifier
- cars-framework
- human-approval-gates

### Data Skills
- connector-factory
- data-lake-governance
- analytics-orchestration
- contract-driven-data-products

### Development Skills
- verification-protocol
- safe-modification-protocol
- api-contracts
- specification-first
- actionable-errors

### Agent Skills
- agent-orchestration
- habitat-isolation
- context-compiler
- active-retrieval
- agentic-context-engineering

### Recovery Skills
- jt1-recovery-protocol
- lessons-learned
- translator-lessons

---

## Skill Loading by Phase

### Phase 0: Infrastructure
```
Required:
- aws-eks-infrastructure-deployment
- mcp-production-runtime
- deployment-readiness

Optional:
- security-compliance
- performance-budgets
```

### Phase 1: Connectors
```
Required:
- connector-factory
- api-contracts
- contract-driven-data-products

Optional:
- verification-protocol
```

### Phase 2: Governance
```
Required:
- certified-asset-lifecycle
- policy-ir-compiler-verifier
- human-approval-gates
- cars-framework

Optional:
- evidence-binding-standard
```

### Phase 3: Analytics
```
Required:
- analytics-orchestration
- genbi-trust-tiers
- evidence-binding-standard
- data-lake-governance

Optional:
- reasoning-technique-selector
```

---

## Skill Dependencies

```
certified-asset-lifecycle
├── genbi-trust-tiers (tier determines certification requirements)
└── evidence-binding-standard (certification is evidence)

analytics-orchestration
├── data-lake-governance (queries from lake zones)
├── genbi-trust-tiers (access control)
└── evidence-binding-standard (answers need evidence)

connector-factory
├── api-contracts (connector contracts)
├── mcp-production-runtime (MCP integration)
└── aws-eks-infrastructure-deployment (deployment target)
```

---

## Skill Conflicts

Some skills have overlapping concerns. When conflicts arise:

| Conflict | Resolution |
|----------|------------|
| Speed vs Safety | Safety wins (verification-protocol) |
| Automation vs Review | Review for high-risk (human-approval-gates) |
| Flexibility vs Governance | Governance for production (cars-framework) |

---

*Use this map to ensure you're applying the right skills for each task.*
