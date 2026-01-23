# Epic 14: Computational & Semantic Accuracy Layer - Master Status

> **Last Updated:** 2026-01-19  
> **Owner:** joe@arcfoundry.ai  
> **Total Duration:** 16 days  
> **Total Token Budget:** 90K  
> **Success Criteria:** CA-01 → CA-25 (25 criteria)

---

## Executive Summary

Epic 14 implements the FORGE Accuracy Layer - a multi-tier validation system that ensures both computational (mathematical) and semantic (factual) accuracy in AI agent outputs. This is critical for defense contractor compliance where incorrect calculations or unverified claims can have serious financial and legal consequences.

---

## Success Formula

```
Success Score = (P(Right) × V(Right)) ÷ C(Wrong)

Where:
- P(Right) = Probability of correct output
- V(Right) = Value of being right (compliance, trust, accuracy)
- C(Wrong) = Cost of being wrong (liability, rework, reputation)
```

---

## Epic Structure

```
Epic 14: Accuracy Layer
├── Epic 14.1: Computational Accuracy (L1 + L1.5)
│   ├── Phase 1: Core Infrastructure ✅
│   ├── Phase 2: Pipeline Integration ⬜
│   └── Phase 3: Production Optimization ⬜
│
├── Epic 14.2: Semantic Accuracy (L2) ⬜
│   ├── Phase 1: Claim Detection
│   ├── Phase 2: Citations Integration
│   ├── Phase 3: Source Binding
│   └── Phase 4: Integration & Repair
│
├── Epic 14.3: Extended Thinking (Deferred)
│
└── Epic 14.4: Multi-Agent Verification (Deferred)
```

---

## Overall Status

| Sub-Epic | Status | Progress | Days | Tokens | Criteria |
|----------|--------|----------|------|--------|----------|
| 14.1 Computational | 🟡 In Progress | 45% | 8 | 47K | CA-01→CA-12 |
| 14.2 Semantic | ⬜ Planning | 0% | 8 | 40K | CA-13→CA-25 |
| 14.3 Extended Thinking | ⏸️ Deferred | - | TBD | TBD | - |
| 14.4 Multi-Agent | ⏸️ Deferred | - | TBD | TBD | - |
| **Total Active** | | **~23%** | **16** | **87K** | **25** |

---

## Validation Pipeline Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        FORGE ACCURACY VALIDATION PIPELINE                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   Agent Output                                                                │
│        │                                                                      │
│        ▼                                                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                     CLAIM DETECTOR                                    │    │
│   │  • Computational claims (math, EVM, financial)                       │    │
│   │  • Factual claims (entities, dates, regulations)                     │    │
│   │  • Opinion/uncertain (flag only)                                      │    │
│   └─────────────────────────────┬───────────────────────────────────────┘    │
│                                 │                                             │
│              ┌──────────────────┴──────────────────┐                         │
│              │                                     │                         │
│              ▼                                     ▼                         │
│   ┌───────────────────────────┐       ┌───────────────────────────┐         │
│   │ L1: LOCAL DETERMINISTIC   │       │ L2: SEMANTIC (14.2)       │         │
│   │ Epic 14.1 Phase 1 ✅      │       │ Epic 14.2 ⬜               │         │
│   │ • Safe eval arithmetic    │       │ • Citations API           │         │
│   │ • FREE, <1ms              │       │ • NER extraction          │         │
│   │ • ~85-90% pass rate       │       │ • Source binding          │         │
│   └─────────────┬─────────────┘       └─────────────┬─────────────┘         │
│                 │                                   │                        │
│            PASS │ FAIL                         VERIFIED │ UNVERIFIED         │
│                 │                                   │                        │
│                 ▼                                   │                        │
│   ┌───────────────────────────┐                    │                        │
│   │ L1.5a: LLM SELF-CHECK     │                    │                        │
│   │ Epic 14.1 Phase 2 ⬜      │                    │                        │
│   │ • Extended thinking       │                    │                        │
│   │ • ~$0.001/claim           │                    │                        │
│   │ • ~70-80% resolve         │                    │                        │
│   └─────────────┬─────────────┘                    │                        │
│                 │                                   │                        │
│            PASS │ FAIL                              │                        │
│                 │                                   │                        │
│                 ▼                                   │                        │
│   ┌───────────────────────────┐                    │                        │
│   │ L1.5b: WOLFRAM API        │                    │                        │
│   │ Epic 14.1 Phase 1 ✅      │                    │                        │
│   │ • Authoritative math      │                    │                        │
│   │ • ~$0.02/claim            │                    │                        │
│   │ • 99%+ accuracy           │                    │                        │
│   └─────────────┬─────────────┘                    │                        │
│                 │                                   │                        │
│              VALID │ INVALID                        │                        │
│                 │                                   │                        │
│                 └───────────────────┬───────────────┘                        │
│                                     │                                        │
│                                     ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                        RESULT AGGREGATOR                             │    │
│   │  • Combine L1/L1.5/L2 results                                       │    │
│   │  • Generate repair feedback for failures                            │    │
│   │  • Bind sources to evidence pack                                    │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                     │                                        │
│              ┌──────────────────────┴───────────────────┐                    │
│              │                                          │                    │
│           ALL PASS                                  FAILURES                 │
│              │                                          │                    │
│              ▼                                          ▼                    │
│         ✓ APPROVED                              REPAIR FEEDBACK              │
│         + Evidence Pack                         + Correct Values             │
│         + Citations                             + Missing Sources            │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Epic 14.1: Computational Accuracy Layer

### Status: 🟡 In Progress (35%)

| Phase | Tasks | Status | Description |
|-------|-------|--------|-------------|
| **Phase 1** | 5/5 | ✅ Complete | Core infrastructure, Wolfram client, validator |
| **Phase 2** | 0/4 | ⬜ Not Started | Pipeline integration, evidence, metrics |
| **Phase 3** | 0/4 | ⬜ Not Started | Redis, circuit breaker, alerts, batch |

### Files Created
```
validators/computational/
├── wolfram-client.ts              ✅ Complete
├── computational-validator.ts     ✅ Complete
├── index.ts                       ✅ Complete
config/
└── wolfram-config.ts              ✅ Complete
tests/
├── test-wolfram-api.ts            ✅ Complete
└── quick-test.sh                  ✅ Complete
```

### Success Criteria (CA-01 → CA-12)

| ID | Criterion | Status |
|----|-----------|--------|
| CA-01 | L1 local validator passes basic arithmetic | ✅ |
| CA-02 | Wolfram client connects and queries | ✅ |
| CA-03 | Conditional invocation (L1 fail → Wolfram) | ✅ |
| CA-04 | Budget tracking and limits | ✅ |
| CA-05 | Cache implementation | ✅ |
| CA-06 | EVM pattern detection | ✅ |
| CA-07 | Evidence pack integration | ⬜ |
| CA-08 | Repair feedback generation | ⬜ |
| CA-09 | Prometheus metrics export | ⬜ |
| CA-10 | Circuit breaker resilience | ⬜ |
| CA-11 | Alerting system | ⬜ |
| CA-12 | Batch processing | ⬜ |

---

## Epic 14.2: Semantic Accuracy Layer

### Status: ⬜ Planning Complete (0%)

| Phase | Tasks | Status | Description |
|-------|-------|--------|-------------|
| **Phase 1** | 0/5 | ⬜ Not Started | Claim detection, NER, regulatory patterns |
| **Phase 2** | 0/6 | ⬜ Not Started | Citations API integration |
| **Phase 3** | 0/5 | ⬜ Not Started | Source binding, confidence |
| **Phase 4** | 0/4 | ⬜ Not Started | Integration, repair, docs |

### Planned Files
```
validators/semantic/
├── factual-claim-detector.ts
├── entity-extractor.ts
├── regulatory-patterns.ts
├── claim-classifier.ts
├── citations/
│   ├── citations-client.ts
│   ├── query-builder.ts
│   └── response-parser.ts
├── binding/
│   ├── source-binder.ts
│   ├── confidence-calculator.ts
│   └── citation-formatter.ts
└── integration/
    ├── evidence-adapter.ts
    ├── repair-feedback.ts
    └── convergence-adapter.ts
```

### Success Criteria (CA-13 → CA-25)

| ID | Criterion | Status |
|----|-----------|--------|
| CA-13 | NER detection recall ≥95% | ⬜ |
| CA-14 | Temporal claim detection ≥90% | ⬜ |
| CA-15 | Quantitative assertion detection ≥90% | ⬜ |
| CA-16 | Regulatory reference detection 100% | ⬜ |
| CA-17 | Citations API integration | ⬜ |
| CA-18 | Query optimization <2s | ⬜ |
| CA-19 | Source extraction ≥95% | ⬜ |
| CA-20 | Cache hit rate ≥40% | ⬜ |
| CA-21 | Source binding completeness | ⬜ |
| CA-22 | Multi-source confidence | ⬜ |
| CA-23 | Authority ranking accuracy | ⬜ |
| CA-24 | Citation formatting | ⬜ |
| CA-25 | Repair prompt effectiveness ≥70% | ⬜ |

---

## Cost Model

| Component | Monthly Volume | Unit Cost | Monthly Cost |
|-----------|---------------|-----------|--------------|
| **L1 Local** | Unlimited | FREE | $0 |
| **L1.5 Wolfram** | ~500-1000 | $0.02/query | $10-20 |
| **L2 Citations** | ~500-1000 | $0.03/query | $15-30 |
| **Cache (Redis)** | Shared | Infrastructure | Included |
| **Total** | | | **$25-50/month** |

**vs. Naive Approach (all claims to external API):** ~$300-600/month  
**Savings:** ~90%

---

## Wolfram API Configuration

| Field | Value |
|-------|-------|
| Owner | joe@arcfoundry.ai |
| App Name | Forge |
| App ID | 2K3K8Q5XGA |
| API Type | LLM API |
| Free Tier | 2,000 queries/month |
| Base URL | https://www.wolframalpha.com/api/v1/llm-api |

---

## Next Actions

### Immediate (This Week)
1. ⬜ Complete Epic 14.1 Task 2.1 (EVM claim patterns)
2. ⬜ Complete Epic 14.1 Task 2.2 (Evidence pack integration)
3. ⬜ Complete Epic 14.1 Task 2.3 (Repair loop integration)
4. ⬜ Complete Epic 14.1 Task 2.4 (Dashboard metrics)

### Near Term (Next Week)
1. ⬜ Complete Epic 14.1 Phase 3 (Production optimization)
2. ⬜ Begin Epic 14.2 Phase 1 (Factual claim detection)

### Dependencies
- Epic 14.1 Phase 2 must complete before Phase 3
- Epic 14.1 must reach 97% confidence before Epic 14.2 starts
- Redis infrastructure needed for 14.1 Phase 3

---

## Document Index

| Document | Location | Purpose |
|----------|----------|---------|
| Epic 14.1 Spec | `EPIC-14.1-computational-accuracy.md` | Computational validation |
| Epic 14.1 Phase 2 Tasks | `TASKS-Epic-14.1-Phase-2-Pipeline-Integration.md` | Detailed tasks |
| Epic 14.1 Phase 3 Tasks | `TASKS-Epic-14.1-Phase-3-Production-Optimization.md` | Detailed tasks |
| Epic 14.2 Planning | `EPIC-14.2-semantic-accuracy-layer.md` | Semantic validation |
| Wolfram Config | `../config/wolfram-config.ts` | API configuration |
| Validator Code | `../validators/computational/` | Implementation |
| Tests | `../tests/` | Test files |

---

*Epic 14 Master Status - Updated 2026-01-19*
