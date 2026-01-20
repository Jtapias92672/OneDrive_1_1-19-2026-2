# FORGE Success Criteria Framework: Master Roadmap

> **Version:** 1.0.0  
> **Status:** Authoritative  
> **Last Updated:** 2026-01-17  
> **Owner:** ArcFoundry

---

## Purpose

This file is the **single source of truth** for the FORGE Success Criteria Framework. All other files in this repository are modular references that implement specific components defined here.

**Usage Pattern:** Read this file first. Navigate to component files for implementation details.

---

## Terminology

| Term | Definition |
|------|------------|
| **Answer Contract** | Schema + validation rules + rubrics defining success for a specific output type |
| **Convergence** | Process of iteratively refining output until all validation layers pass |
| **Evidence Pack** | Audit artifact proving validation passed (scores, traces, iteration history) |
| **Layer 1 (Structural)** | Deterministic validation: JSON schema, required fields, type checks |
| **Layer 2 (Semantic)** | Partially deterministic: cross-references, prohibited patterns, completeness |
| **Layer 3 (Qualitative)** | LLM-Judge evaluation using rubrics with anchored scoring |
| **FORGE.md** | Persistent rule file that accumulates learned constraints from failures |
| **Rubric** | Scoring guide with criteria, anchors (1-5), and pass thresholds |
| **First-Pass Rate** | % of outputs valid on first generation attempt |
| **Convergence Rate** | % of outputs that achieve target score within iteration budget |

---

## Component Inventory

| ID | Component | File | Phase | Priority |
|----|-----------|------|-------|----------|
| 01 | Answer Contract System | `01_ANSWER_CONTRACT.md` | MVP | P0 |
| 02 | Structural Validation | `02_STRUCTURAL_VALIDATION.md` | MVP | P0 |
| 03 | Semantic Validation | `03_SEMANTIC_VALIDATION.md` | MVP | P0 |
| 04 | Qualitative Validation (LLM-Judge) | `04_QUALITATIVE_VALIDATION.md` | MVP | P0 |
| 05 | Convergence Engine | `05_CONVERGENCE_ENGINE.md` | MVP | P0 |
| 06 | Evidence Pack Generator | `06_EVIDENCE_PACK.md` | MVP | P1 |
| 07 | FORGE.md Rule System | `07_RULE_SYSTEM.md` | v1 | P1 |
| 08 | Rubric Library | `08_RUBRIC_LIBRARY.md` | v1 | P1 |
| 09 | Data Protection Layer | `09_DATA_PROTECTION.md` | v1 | P0 |
| 10 | Multi-Agent Orchestration | `10_ORCHESTRATION.md` | v1 | P2 |
| 11 | Observability & Metrics | `11_OBSERVABILITY.md` | vNext | P2 |
| 12 | Human-in-the-Loop | `12_HUMAN_REVIEW.md` | vNext | P2 |

---

## Dependency Graph

```
┌────────────────────────────────────────────────────────────────┐
│                     01_ANSWER_CONTRACT                          │
│                    (Foundation - Build First)                   │
└────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 02_STRUCTURAL│    │ 03_SEMANTIC  │    │ 04_QUALITATIVE│
│ VALIDATION   │    │ VALIDATION   │    │ VALIDATION    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                 ┌────────────────────────┐
                 │  05_CONVERGENCE_ENGINE │
                 │  (Orchestrates Loop)   │
                 └────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 06_EVIDENCE  │    │ 07_RULE      │    │ 08_RUBRIC    │
│ PACK         │    │ SYSTEM       │    │ LIBRARY      │
└──────────────┘    └──────────────┘    └──────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  09_DATA_PROTECTION    │
                 │  (Wraps All I/O)       │
                 └────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 10_ORCHES-   │    │ 11_OBSERVA-  │    │ 12_HUMAN     │
│ TRATION      │    │ BILITY       │    │ REVIEW       │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## Phased Roadmap

### Phase 1: MVP (Weeks 1-4)

**Goal:** Single Answer Contract working end-to-end with all three validation layers.

| Week | Deliverable | Components | Exit Criteria |
|------|-------------|------------|---------------|
| 1 | Answer Contract schema + first contract (Jira tickets) | 01 | Schema validates, contract loads |
| 2 | Structural + Semantic validators | 02, 03 | Pass/fail deterministically for test cases |
| 3 | LLM-Judge integration (G-Eval pattern) | 04 | Rubric scoring returns numeric scores |
| 4 | Convergence loop + evidence pack | 05, 06 | Full loop converges, produces evidence |

**MVP Success Metrics:**
- [ ] First-pass rate measured
- [ ] Convergence rate ≥80% on Jira ticket contract
- [ ] Evidence pack contains full audit trail

### Phase 2: v1 (Weeks 5-8)

**Goal:** Production-ready with rule learning, data protection, and multiple contracts.

| Week | Deliverable | Components | Exit Criteria |
|------|-------------|------------|---------------|
| 5 | FORGE.md rule system | 07 | Rules persist, apply to generation |
| 6 | Rubric library (3 artifact types) | 08 | Jira, Test Plan, PRD rubrics operational |
| 7 | Data protection layer | 09 | PII redaction, secret detection working |
| 8 | Integration + hardening | All MVP+v1 | E2E tests pass, no PII leaks |

**v1 Success Metrics:**
- [ ] Convergence rate ≥95%
- [ ] Zero PII/secret leaks in 1000-run test
- [ ] Rule learning captures ≥3 failure patterns

### Phase 3: vNext (Weeks 9-12)

**Goal:** Enterprise features, multi-agent orchestration, observability.

| Week | Deliverable | Components | Exit Criteria |
|------|-------------|------------|---------------|
| 9 | Multi-agent orchestration | 10 | Parallel validators, critic-refiner pattern |
| 10 | Observability dashboards | 11 | Real-time metrics, failure analysis |
| 11 | Human-in-the-loop gates | 12 | Ambiguous cases route to human |
| 12 | Performance optimization | All | P95 latency ≤120s |

---

## Global Success Metrics

| Metric | MVP Target | v1 Target | vNext Target |
|--------|------------|-----------|--------------|
| First-Pass Rate | ≥30% | ≥40% | ≥50% |
| Convergence Rate | ≥80% | ≥95% | ≥98% |
| Iteration Efficiency | ≤4.0 | ≤3.0 | ≤2.5 |
| P50 Latency | ≤60s | ≤30s | ≤20s |
| P95 Latency | ≤180s | ≤120s | ≤90s |
| PII Leak Rate | N/A | 0% | 0% |
| Secret Leak Rate | N/A | 0% | 0% |

---

## How to Use This Framework

### For Claude Code Implementation

1. **Read this file first** to understand component relationships
2. **Check dependencies** before implementing a component
3. **Follow the template** in each component file exactly
4. **Run acceptance tests** defined in each component file
5. **Update this file** when adding new components

### For Adding New Components

1. Assign next sequential ID (e.g., `13_NEW_COMPONENT.md`)
2. Add to Component Inventory table above
3. Update Dependency Graph if needed
4. Follow the Required Component File Template (see below)
5. Add to appropriate phase in roadmap

### For Updating Existing Components

1. Increment version in component file header
2. Update "Last Updated" date
3. Document change in component's changelog section
4. If interface changes, update all dependent components

---

## Required Component File Template

Every component file MUST contain these sections in order:

```markdown
# [ID]_[COMPONENT_NAME]

> Version: X.Y.Z | Status: Draft/Active/Deprecated | Last Updated: YYYY-MM-DD

## 1. Component Summary
## 2. Success Criteria
## 3. Acceptance Tests / Completion Checks
## 4. Telemetry & Metrics
## 5. Security / Compliance Notes
## 6. Dependencies & Interfaces
## 7. Implementation Notes
## 8. Changelog
```

---

## File Tree

```
forge-success-criteria/
├── 00_MASTER_ROADMAP.md          # THIS FILE - Authoritative index
├── 01_ANSWER_CONTRACT.md         # Answer Contract system
├── 02_STRUCTURAL_VALIDATION.md   # Layer 1 validation
├── 03_SEMANTIC_VALIDATION.md     # Layer 2 validation
├── 04_QUALITATIVE_VALIDATION.md  # Layer 3 (LLM-Judge)
├── 05_CONVERGENCE_ENGINE.md      # Iteration loop
├── 06_EVIDENCE_PACK.md           # Audit artifacts
├── 07_RULE_SYSTEM.md             # FORGE.md rules
├── 08_RUBRIC_LIBRARY.md          # Scoring rubrics
├── 09_DATA_PROTECTION.md         # PII/secret handling
├── 10_ORCHESTRATION.md           # Multi-agent patterns
├── 11_OBSERVABILITY.md           # Metrics & dashboards
├── 12_HUMAN_REVIEW.md            # Human-in-the-loop
├── schemas/
│   ├── answer-contract.schema.json
│   ├── evidence-pack.schema.json
│   └── rubric.schema.json
├── templates/
│   ├── answer-contract.template.yaml
│   └── rubric.template.yaml
└── examples/
    ├── jira-ticket-pack.contract.yaml
    ├── test-plan.contract.yaml
    └── prd.contract.yaml
```

---

## Compliance Alignment

| Framework | Relevance | Components |
|-----------|-----------|------------|
| NIST AI RMF | Risk management, testing | 04, 05, 11 |
| SOC 2 Type II | Audit trails, access control | 06, 09, 11 |
| DCMA/DFARS | Evidence packs, traceability | 06, 09 |
| CMMC 2.0 | Data protection, logging | 09, 11 |
| EU AI Act | Transparency, human oversight | 06, 12 |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-17 | Initial framework release |

---

*This document is the canonical reference. When in doubt, this file governs.*
