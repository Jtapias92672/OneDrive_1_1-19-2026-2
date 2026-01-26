---
name: genbi-governance-library
description: >
  GenBI governance and certification library. Contains trust tier enforcement
  (Crawl/Walk/Run), asset certification lifecycle, evidence binding standards,
  policy IR compilation, and data contract patterns. Use for GenBI implementations,
  data governance, certification workflows, or policy enforcement.
---

# GenBI Governance Library

Governance patterns for Generative Business Intelligence systems.

## Quick Reference

| I need to... | Load this reference |
|--------------|---------------------|
| Implement Crawl/Walk/Run access tiers | `references/genbi-trust-tiers.md` |
| Manage asset certification lifecycle | `references/certified-asset-lifecycle.md` |
| Bind evidence to AI answers | `references/evidence-binding.md` |
| Compile policies to platform-specific rules | `references/policy-compiler.md` |
| Define data contracts between systems | `references/contract-driven-data.md` |

## Library Contents

### Access Control
- **genbi-trust-tiers.md** - Crawl/Walk/Run capability gating, zone access by tier, UI treatment, enforcement logic

### Certification
- **certified-asset-lifecycle.md** - Asset states (DRAFT→CERTIFIED→RETIRED), approval requirements, recertification

### Evidence & Audit
- **evidence-binding.md** - Evidence bundle schema, confidence scoring, lineage tracking, audit requirements

### Policy Enforcement
- **policy-compiler.md** - Policy IR format, compilation to Snowflake/Databricks/AWS IAM, verification

### Data Contracts
- **contract-driven-data.md** - Contract schema, validation, versioning, consumer notifications

## Trigger Keywords

GenBI, trust tier, Crawl Walk Run, certification, certified asset, evidence binding, policy, data contract, governance
