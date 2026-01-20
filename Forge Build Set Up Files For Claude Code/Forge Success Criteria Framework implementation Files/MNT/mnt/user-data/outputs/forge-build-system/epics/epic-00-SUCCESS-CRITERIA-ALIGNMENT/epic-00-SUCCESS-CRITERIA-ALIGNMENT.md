# FORGE Epic ↔ Success Criteria Alignment Matrix

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-17  
> **Purpose:** Maps implementation epics to success criteria components for traceability

---

## Overview

This document maps the 13 FORGE implementation epics to the 12 Success Criteria Framework components. Use this matrix to:
1. Identify which acceptance tests apply to each epic
2. Ensure implementation aligns with specifications
3. Track compliance coverage across the platform

---

## Alignment Matrix

| Epic | Name | Primary Success Criteria | Secondary References | Acceptance Test Source |
|------|------|--------------------------|---------------------|------------------------|
| **1** | Foundation | — | — | Internal unit tests |
| **2** | Answer Contract | **01_ANSWER_CONTRACT** | 02, 03, 04 | AC-01 through AC-10 |
| **3** | FORGE C Core | **04_QUALITATIVE_VALIDATION** | 01, 10 | QV-01 through QV-10 |
| **3.75** | Code Execution | **09_DATA_PROTECTION** | 05, 06, 12 | DP-01 through DP-10 |
| **4** | Convergence Engine | **05_CONVERGENCE_ENGINE** | 02, 03, 04, 06 | CE-01 through CE-11 |
| **5** | Figma Parser | — | 01 | Domain-specific tests |
| **6** | React Generator | — | 08 | Domain-specific tests |
| **7** | Test Generation | **08_RUBRIC_LIBRARY** | 04, 06 | RL-01 through RL-10 |
| **8** | Evidence Packs | **06_EVIDENCE_PACK** | 05, 09 | EP-01 through EP-10 |
| **9** | Infrastructure | **11_OBSERVABILITY** | 09 | OB-01 through OB-11 |
| **10a** | Platform UI Core | **12_HUMAN_REVIEW** | 11 | HR-01 through HR-10 |
| **10b** | Platform UI Features | **12_HUMAN_REVIEW** | 10, 11 | HR-01 through HR-10 |
| **11** | Integrations | **10_ORCHESTRATION** | 11 | OR-01 through OR-10 |
| **12** | E2E Testing | All components | — | Full acceptance suite |

---

## Detailed Epic Alignments

### Epic 1: Foundation
**Primary:** None (infrastructure setup)
**Files:** Monorepo config, build tools
**Tests:** Build verification only

---

### Epic 2: Answer Contract
**Primary:** `01_ANSWER_CONTRACT.md`

| Task | Success Criteria | Acceptance Test |
|------|------------------|-----------------|
| 2.1.x | AC-01 (valid JSON Schema) | Schema validation |
| 2.2.x | AC-02 (three layers defined) | Field presence check |
| 2.3.x | AC-04, AC-05 (weights, rubric refs) | Arithmetic + cross-ref |

**Schema Reference:** `schemas/answer-contract.schema.json`

---

### Epic 3: FORGE C Core
**Primary:** `04_QUALITATIVE_VALIDATION.md`

| Task | Success Criteria | Acceptance Test |
|------|------------------|-----------------|
| 3.x.x LLM calls | QV-01 (chain-of-thought) | Output format check |
| 3.x.x Scoring | QV-02 (1-5 scale) | Score range validation |
| 3.x.x Calibration | QV-03 (≥0.7 correlation) | Statistical test |

---

### Epic 3.75: Code Execution ⚠️ SECURITY CRITICAL
**Primary:** `09_DATA_PROTECTION.md`
**Secondary:** `05_CONVERGENCE_ENGINE.md`, `06_EVIDENCE_PACK.md`, `12_HUMAN_REVIEW.md`

| Task | Success Criteria | Acceptance Test |
|------|------------------|-----------------|
| 3.75.1.2 VM Sandbox | CE-01 (timeout enforcement) | Timeout test |
| 3.75.2.2 Privacy Filter | DP-01, DP-09, DP-10 | PII/secret recall tests |
| 3.75.2.3 Audit Logger | EP-06 (timestamps) | ISO8601 format check |
| 3.75.3.x CARS | DP-02 (secret blocking) | Secret injection test |
| 3.75.3.3 Integration | HR-01 (approval trigger) | High-risk block test |

**Required Recalls:**
- PII Detection: ≥99% (DP-09)
- Secret Detection: 100% (DP-10)

---

### Epic 4: Convergence Engine
**Primary:** `05_CONVERGENCE_ENGINE.md`

| Task | Success Criteria | Acceptance Test |
|------|------------------|-----------------|
| 4.x.x Iteration loop | CE-01 through CE-04 | Budget/stop condition tests |
| 4.x.x Layer ordering | CE-05, CE-06 | Sequence verification |
| 4.x.x Repair prompts | CE-07 | Prompt content check |
| 4.x.x History | CE-08 | History capture test |
| 4.x.x Scoring | CE-09 | Weighted calculation |
| 4.x.x Performance | CE-10 | <2 min P95 latency |

---

### Epic 5: Figma Parser
**Primary:** None (domain-specific)
**Secondary:** `01_ANSWER_CONTRACT.md` (output format)

| Task | Success Criteria | Notes |
|------|------------------|-------|
| 5.x.x API client | N/A | Figma API integration |
| 5.x.x Style extraction | N/A | Design tokens |
| 5.x.x Component mapping | AC-08 | Self-contained output |

---

### Epic 6: React Generator
**Primary:** None (domain-specific)
**Secondary:** `08_RUBRIC_LIBRARY.md` (quality rubrics)

| Task | Success Criteria | Notes |
|------|------------------|-------|
| 6.x.x Templates | N/A | Code generation |
| 6.x.x Accessibility | RL-* | Rubric for quality checks |
| 6.x.x Tests | RL-* | Test rubric alignment |

---

### Epic 7: Test Generation
**Primary:** `08_RUBRIC_LIBRARY.md`
**Secondary:** `04_QUALITATIVE_VALIDATION.md`, `06_EVIDENCE_PACK.md`

| Task | Success Criteria | Acceptance Test |
|------|------------------|-----------------|
| 7.x.x Templates | RL-01 (unique IDs) | Uniqueness check |
| 7.x.x Rubrics | RL-02, RL-03 (anchors, examples) | Schema validation |
| 7.x.x Coverage | RL-05 (thresholds) | Coverage validator |

---

### Epic 8: Evidence Packs ⚠️ COMPLIANCE CRITICAL
**Primary:** `06_EVIDENCE_PACK.md`
**Secondary:** `05_CONVERGENCE_ENGINE.md`, `09_DATA_PROTECTION.md`

| Task | Success Criteria | Acceptance Test |
|------|------------------|-----------------|
| 8.1.2 Schema | EP-01 through EP-10 | Full schema validation |
| 8.2.x Reports | EP-02, EP-03 | Score + reasoning presence |
| 8.3.2 Audit trail | EP-06, EP-07 | Timestamp + integrity |
| 8.3.3 ZIP export | EP-08, EP-09 | Round-trip test |
| All | DP-10 (no PII) | PII scan on output |

**Schema Reference:** `schemas/evidence-pack.schema.json`

---

### Epic 9: Infrastructure
**Primary:** `11_OBSERVABILITY.md`
**Secondary:** `09_DATA_PROTECTION.md`

| Task | Success Criteria | Acceptance Test |
|------|------------------|-----------------|
| 9.x.x Docker | OB-02 (real-time streaming) | Metric latency |
| 9.x.x K8s | OB-08 (metric export) | Prometheus endpoint |
| 9.x.x Secrets | DP-02 (secret blocking) | Secret scan in config |

---

### Epic 10a: Platform UI Core
**Primary:** `12_HUMAN_REVIEW.md`
**Secondary:** `11_OBSERVABILITY.md`

| Task | Success Criteria | Acceptance Test |
|------|------------------|-----------------|
| 10a.x.x Contract editor | HR-06 (evidence in UI) | Context display |
| 10a.x.x Dashboard | OB-03 (dashboards) | Dashboard presence |

---

### Epic 10b: Platform UI Features
**Primary:** `12_HUMAN_REVIEW.md`
**Secondary:** `10_ORCHESTRATION.md`, `11_OBSERVABILITY.md`

| Task | Success Criteria | Acceptance Test |
|------|------------------|-----------------|
| 10b.1.x Execution UI | HR-06 (evidence display) | UI inspection |
| 10b.2.x WebSocket | OB-02 (<5s delay) | Latency measurement |
| 10b.3.x Auth/RBAC | HR-03 (domain routing) | Routing test |
| 10b.3.x User mgmt | HR-08 (decision tracking) | Log verification |

---

### Epic 11: Integrations
**Primary:** `10_ORCHESTRATION.md`
**Secondary:** `11_OBSERVABILITY.md`

| Task | Success Criteria | Acceptance Test |
|------|------------------|-----------------|
| 11.x.x GitHub | OR-01 (parallel execution) | PR creation timing |
| 11.x.x Webhooks | OR-08 (communication logging) | Event log check |
| 11.x.x CLI | OR-09 (configurable pipelines) | Pipeline config test |

---

### Epic 12: E2E Testing
**Primary:** All components
**Purpose:** Validate full system against all 120+ success criteria

| Phase | Components Tested |
|-------|-------------------|
| 12.1 Setup | Infrastructure prerequisites |
| 12.2 Functional | 01, 02, 03, 04, 05 |
| 12.3 API | 05, 10, 11 |
| 12.4 Performance | 05 (CE-10), 11 (OB-10) |
| 12.4.3 Security | 09 (DP-01 through DP-10) |

---

## Quick Reference: Adding Success Criteria to Tasks

When updating a TASKS.md file, add this header after the epic metadata:

```markdown
## Success Criteria Alignment

| Component | Reference | Alignment |
|-----------|-----------|-----------|
| **XX_COMPONENT** | `forge-success-criteria/XX_COMPONENT.md` | Brief description |
| **YY_COMPONENT** | `forge-success-criteria/YY_COMPONENT.md` | Brief description |

**Acceptance Tests:** Inherit from XX_COMPONENT criteria XX-01 through XX-10
```

For each task, add:

```markdown
**Success Criteria Reference:** XX_COMPONENT § Criterion ID
```

---

## Compliance Traceability

| Compliance Framework | Primary Components | Epics |
|---------------------|-------------------|-------|
| SOC 2 Type II | 06, 09, 11 | 3.75, 8, 9 |
| DCMA/DFARS | 06, 09 | 8 |
| CMMC 2.0 | 09, 11 | 3.75, 8, 9 |
| NIST AI RMF | 04, 05, 11 | 3, 4, 9 |
| EU AI Act | 06, 12 | 8, 10a, 10b |

---

*This document is the authoritative mapping. Update when epics or criteria change.*
