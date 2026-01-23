# Epic 14.2: Semantic Accuracy Layer (L2)

> **Status:** PLANNING  
> **Depends On:** Epic 14.1 (Computational Accuracy Layer)  
> **Owner:** joe@arcfoundry.ai  
> **Created:** 2026-01-19  
> **Duration:** 8 days  
> **Token Budget:** 40K  
> **Success Criteria:** CA-13 → CA-25

---

## Executive Summary

Epic 14.2 implements the Semantic Accuracy Layer (L2) for FORGE, providing factual claim verification through Citations API integration, source binding, and confidence scoring. While Epic 14.1 handles computational/mathematical accuracy, Epic 14.2 ensures factual claims are grounded in verifiable sources.

---

## Success Formula Application

```
L2 Success Score = (P(Right) × V(Right)) ÷ C(Wrong)

Where:
- P(Right) = 0.95 (Citations API accuracy for sourced claims)
- V(Right) = HIGH (compliance, audit trail, trust)
- C(Wrong) = HIGH (misinformation, compliance violations)

Result Score: ~190.0 (justifies Citations API investment)
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FORGE L2: Semantic Accuracy Layer                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Agent Output (post L1/L1.5)                                           │
│        │                                                                 │
│        ▼                                                                 │
│   ┌─────────────────────────────────────────────────────┐               │
│   │  Factual Claim Detector                              │               │
│   │  - Named entity recognition (NER)                    │               │
│   │  - Temporal claims (dates, events)                   │               │
│   │  - Quantitative assertions                           │               │
│   │  - Regulatory/compliance references                  │               │
│   └─────────────────────────────┬───────────────────────┘               │
│                                 │                                        │
│                                 ▼                                        │
│   ┌─────────────────────────────────────────────────────┐               │
│   │  Claim Classification                                │               │
│   │  - Verifiable (external source needed)              │               │
│   │  - Internal (org knowledge base)                     │               │
│   │  - Computational (→ L1/L1.5)                        │               │
│   │  - Opinion (flag, no verification)                   │               │
│   └─────────────────────────────┬───────────────────────┘               │
│                                 │                                        │
│                    ┌────────────┴────────────┐                          │
│                    │                         │                          │
│                    ▼                         ▼                          │
│   ┌────────────────────────┐   ┌────────────────────────┐              │
│   │  Citations API          │   │  Knowledge Base        │              │
│   │  - Web search           │   │  - Internal docs       │              │
│   │  - Authoritative sources│   │  - Compliance refs     │              │
│   │  - Academic papers      │   │  - Historical data     │              │
│   └───────────┬─────────────┘   └───────────┬────────────┘              │
│               │                             │                           │
│               └──────────────┬──────────────┘                           │
│                              ▼                                          │
│   ┌─────────────────────────────────────────────────────┐               │
│   │  Source Binding & Confidence Scoring                 │               │
│   │  - Citation quality score (0-1)                      │               │
│   │  - Source authority ranking                          │               │
│   │  - Recency weighting                                 │               │
│   │  - Cross-reference validation                        │               │
│   └─────────────────────────────┬───────────────────────┘               │
│                                 │                                        │
│                    ┌────────────┴────────────┐                          │
│                    │                         │                          │
│                  VERIFIED               UNVERIFIED                      │
│                    │                         │                          │
│                    ▼                         ▼                          │
│           ✓ Bind Citation        Flag for Review/Repair                 │
│           + Confidence Score     + Missing Source Alert                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Scope & Boundaries

### In Scope
- Factual claim detection and classification
- Citations API integration (Anthropic Claude web search)
- Internal knowledge base integration
- Source binding with confidence scores
- Compliance reference verification (DFARS, DCMA, NIST)
- Evidence pack integration for L2 results
- Repair feedback for unverified claims

### Out of Scope (Deferred to Epic 14.3+)
- Real-time fact-checking of streaming outputs
- Custom knowledge base training
- Multi-language support
- Image/document source verification

---

## User Stories

### US-14.2.1: Factual Claim Detection
**As a** FORGE platform operator  
**I want** the system to automatically detect factual claims in agent outputs  
**So that** I can ensure all assertions are verifiable

**Acceptance Criteria:**
- CA-13: Detect named entities (people, organizations, places)
- CA-14: Detect temporal claims (dates, durations, sequences)
- CA-15: Detect quantitative assertions (statistics, measurements)
- CA-16: Detect regulatory references (DFARS, FAR, NIST, ISO)

**Story Points:** 8

### US-14.2.2: Citations API Integration
**As a** FORGE platform operator  
**I want** unverified factual claims to be checked against authoritative sources  
**So that** outputs are grounded in verifiable information

**Acceptance Criteria:**
- CA-17: Citations API client with rate limiting
- CA-18: Query optimization for factual claims
- CA-19: Response parsing and source extraction
- CA-20: Caching for repeated queries

**Story Points:** 8

### US-14.2.3: Source Binding
**As a** FORGE platform operator  
**I want** verified claims to be bound to their sources with confidence scores  
**So that** I can trace any assertion back to its origin

**Acceptance Criteria:**
- CA-21: Source binding schema (claim → source → confidence)
- CA-22: Multi-source aggregation for higher confidence
- CA-23: Source authority ranking (gov > academic > news > blog)
- CA-24: Inline citation formatting ([1], footnotes, etc.)

**Story Points:** 5

### US-14.2.4: Unverified Claim Handling
**As a** FORGE convergence engine  
**I want** unverified claims to trigger repair feedback  
**So that** agents can provide sources or rephrase as opinion

**Acceptance Criteria:**
- CA-25: Repair prompt for missing citations
- Integration with CE-07 (repair prompts)
- Integration with CE-11 (reflection requirement)

**Story Points:** 5

---

## Success Criteria Detail

| ID | Criterion | Test Method | Threshold |
|----|-----------|-------------|-----------|
| CA-13 | NER detection recall | Test corpus | ≥95% entities detected |
| CA-14 | Temporal claim detection | Test corpus | ≥90% dates/durations detected |
| CA-15 | Quantitative assertion detection | Test corpus | ≥90% statistics detected |
| CA-16 | Regulatory reference detection | DFARS/FAR corpus | 100% references detected |
| CA-17 | Citations API integration | API test | Successful queries |
| CA-18 | Query optimization | Latency test | <2s per claim |
| CA-19 | Source extraction accuracy | Manual review | ≥95% correct |
| CA-20 | Cache hit rate | Metrics | ≥40% for similar queries |
| CA-21 | Source binding completeness | Audit | All verified claims bound |
| CA-22 | Multi-source confidence | Statistical | Confidence increases with sources |
| CA-23 | Authority ranking accuracy | Manual review | Rankings match expectations |
| CA-24 | Citation formatting | Output review | Citations properly formatted |
| CA-25 | Repair prompt effectiveness | A/B test | ≥70% successful repairs |

---

## Technical Specifications

### Factual Claim Types

```typescript
export type FactualClaimType = 
  | 'named_entity'      // Person, org, place, product
  | 'temporal'          // Date, duration, sequence
  | 'quantitative'      // Statistics, measurements
  | 'regulatory'        // DFARS, FAR, NIST, ISO references
  | 'historical'        // Past events
  | 'comparative'       // X is larger than Y
  | 'causal'            // X causes Y
  | 'definitional';     // X is defined as Y

export interface FactualClaim {
  id: string;
  type: FactualClaimType;
  text: string;
  entities: ExtractedEntity[];
  confidence: number;
  context: string;
  requiresVerification: boolean;
}

export interface ExtractedEntity {
  text: string;
  type: 'PERSON' | 'ORG' | 'LOCATION' | 'DATE' | 'NUMBER' | 'REGULATION';
  startIndex: number;
  endIndex: number;
}
```

### Source Binding Schema

```typescript
export interface SourceBinding {
  claimId: string;
  sources: CitedSource[];
  aggregatedConfidence: number;
  verificationStatus: 'verified' | 'partially_verified' | 'unverified';
  citationText: string;
}

export interface CitedSource {
  id: string;
  title: string;
  url: string;
  authority: SourceAuthority;
  relevanceScore: number;
  publishDate?: string;
  excerpt: string;
  accessedAt: string;
}

export type SourceAuthority = 
  | 'government'        // .gov, official publications
  | 'academic'          // .edu, peer-reviewed journals
  | 'regulatory'        // FAR, DFARS, NIST official docs
  | 'news_major'        // Major news outlets
  | 'news_trade'        // Trade publications
  | 'corporate'         // Company official sources
  | 'wiki'              // Wikipedia, encyclopedias
  | 'blog'              // Personal blogs, forums
  | 'unknown';

// Authority weights for confidence calculation
export const AUTHORITY_WEIGHTS: Record<SourceAuthority, number> = {
  government: 1.0,
  regulatory: 1.0,
  academic: 0.95,
  news_major: 0.8,
  corporate: 0.75,
  news_trade: 0.7,
  wiki: 0.6,
  blog: 0.3,
  unknown: 0.2
};
```

### Confidence Calculation

```typescript
/**
 * Calculate aggregated confidence from multiple sources
 * 
 * Formula:
 * confidence = min(1.0, sum(source_i.relevance × authority_i × recency_i) / N)
 * 
 * Where:
 * - relevance: 0-1 semantic similarity to claim
 * - authority: AUTHORITY_WEIGHTS[source.authority]
 * - recency: exponential decay based on publish date
 * - N: normalization factor
 */
export function calculateConfidence(sources: CitedSource[]): number {
  if (sources.length === 0) return 0;
  
  const now = Date.now();
  let totalScore = 0;
  
  for (const source of sources) {
    const authorityWeight = AUTHORITY_WEIGHTS[source.authority];
    const recencyWeight = calculateRecencyWeight(source.publishDate, now);
    const sourceScore = source.relevanceScore * authorityWeight * recencyWeight;
    totalScore += sourceScore;
  }
  
  // Diminishing returns for additional sources
  const normalized = totalScore / Math.sqrt(sources.length);
  return Math.min(1.0, normalized);
}

function calculateRecencyWeight(publishDate: string | undefined, now: number): number {
  if (!publishDate) return 0.5; // Unknown date gets moderate weight
  
  const ageMs = now - new Date(publishDate).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  
  // Exponential decay: half-life of 365 days
  return Math.exp(-0.693 * ageDays / 365);
}
```

---

## Task Breakdown

### Phase 1: Claim Detection (Days 1-2)

| Task | Description | Hours | Tokens |
|------|-------------|-------|--------|
| 14.2.1 | Factual claim detector patterns | 4 | 4K |
| 14.2.2 | Named entity recognition integration | 4 | 4K |
| 14.2.3 | Regulatory reference patterns (DFARS, FAR) | 3 | 3K |
| 14.2.4 | Claim classifier (verifiable vs opinion) | 3 | 3K |
| 14.2.5 | Unit tests for claim detection | 2 | 2K |

### Phase 2: Citations Integration (Days 3-5)

| Task | Description | Hours | Tokens |
|------|-------------|-------|--------|
| 14.2.6 | Citations API client | 4 | 4K |
| 14.2.7 | Query builder for factual claims | 3 | 3K |
| 14.2.8 | Response parser and source extractor | 3 | 3K |
| 14.2.9 | Rate limiting and caching | 3 | 3K |
| 14.2.10 | Authority ranking system | 2 | 2K |
| 14.2.11 | Integration tests | 2 | 2K |

### Phase 3: Source Binding (Days 6-7)

| Task | Description | Hours | Tokens |
|------|-------------|-------|--------|
| 14.2.12 | Source binding schema and types | 2 | 2K |
| 14.2.13 | Confidence calculation implementation | 3 | 3K |
| 14.2.14 | Multi-source aggregation | 2 | 2K |
| 14.2.15 | Citation formatter (inline, footnotes) | 2 | 2K |
| 14.2.16 | Evidence pack integration | 2 | 2K |

### Phase 4: Integration & Repair (Day 8)

| Task | Description | Hours | Tokens |
|------|-------------|-------|--------|
| 14.2.17 | Repair feedback for unverified claims | 3 | 3K |
| 14.2.18 | Convergence adapter for L2 | 2 | 2K |
| 14.2.19 | Metrics and dashboard integration | 2 | 2K |
| 14.2.20 | Documentation and runbook | 2 | 2K |

---

## File Structure

```
validators/semantic/
├── index.ts                       # Public exports
├── types.ts                       # TypeScript interfaces
├── factual-claim-detector.ts      # Claim detection
├── entity-extractor.ts            # NER integration
├── regulatory-patterns.ts         # DFARS, FAR, NIST patterns
├── claim-classifier.ts            # Verifiable vs opinion
├── citations/
│   ├── citations-client.ts        # API client
│   ├── query-builder.ts           # Claim → query conversion
│   ├── response-parser.ts         # Extract sources
│   └── cache.ts                   # Query caching
├── binding/
│   ├── source-binder.ts           # Claim → source binding
│   ├── confidence-calculator.ts   # Aggregated confidence
│   ├── authority-ranker.ts        # Source authority scoring
│   └── citation-formatter.ts      # Output formatting
├── integration/
│   ├── evidence-adapter.ts        # Evidence pack integration
│   ├── repair-feedback.ts         # Unverified claim handling
│   └── convergence-adapter.ts     # L2 hook for convergence
└── __tests__/
    ├── claim-detector.test.ts
    ├── citations-client.test.ts
    ├── source-binder.test.ts
    └── integration.test.ts
```

---

## Integration Points

### With Epic 14.1 (Computational Accuracy)

```typescript
// Validation pipeline order
const pipeline = [
  L1_LOCAL,           // Free, instant arithmetic
  L1_5_WOLFRAM,       // Conditional Wolfram for math
  L2_SEMANTIC,        // Citations for factual claims  ← Epic 14.2
  HUMAN_REVIEW        // Escalation
];

// Claims route to appropriate tier
function routeClaim(claim: Claim): ValidationTier {
  if (isComputational(claim)) return L1_LOCAL;
  if (isFactual(claim)) return L2_SEMANTIC;
  return HUMAN_REVIEW;
}
```

### With FORGE Convergence Engine

```typescript
// Semantic validation as Layer 2 hook
convergenceEngine.registerValidator({
  layer: 2,
  name: 'semantic-accuracy',
  validator: async (content) => {
    const claims = detectFactualClaims(content);
    const results = await semanticValidator.validateClaims(claims);
    
    return {
      passed: results.unverifiedCount === 0,
      score: results.verifiedCount / results.totalCount,
      feedback: generateCitationFeedback(results)
    };
  }
});
```

### With Evidence Pack

```typescript
// L2 evidence structure
interface SemanticEvidence {
  validationId: string;
  timestamp: string;
  claims: {
    total: number;
    verified: number;
    partiallyVerified: number;
    unverified: number;
  };
  bindings: SourceBinding[];
  citationsUsed: number;
  costEstimate: number;
}
```

---

## Cost Model

| Operation | Cost | Volume Estimate | Monthly Cost |
|-----------|------|-----------------|--------------|
| Citations API query | ~$0.01-0.05/query | 500-1000/month | $5-50 |
| Cache (Redis) | Infrastructure | Shared | Included |
| NER Processing | ~$0.001/claim | 5000/month | $5 |
| **Total** | | | **$10-55/month** |

**Cost Optimization Strategies:**
1. Cache similar queries (40%+ hit rate target)
2. Batch claims by topic before querying
3. Skip verification for low-risk claims (opinions, hedged statements)
4. Use internal knowledge base when applicable

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Citations API rate limits | Degraded service | Medium | Implement backoff, queue |
| Source authority gaming | False confidence | Low | Multiple source requirement |
| Stale sources | Outdated citations | Medium | Recency weighting |
| Over-citation | Noisy output | Medium | Confidence threshold |
| NER false positives | Unnecessary queries | Medium | Confidence filtering |

---

## Definition of Done

Epic 14.2 is complete when:

- [ ] All 20 tasks completed and merged
- [ ] CA-13 through CA-25 criteria verified
- [ ] Test coverage >90% for all modules
- [ ] Integration with Epic 14.1 tested
- [ ] Convergence engine L2 hook working
- [ ] Evidence pack captures L2 results
- [ ] Repair feedback generates valid prompts
- [ ] Documentation complete
- [ ] Operations runbook ready
- [ ] Cost monitoring in place

---

## Dependencies

### Required Before Starting
- Epic 14.1 Phase 1 complete (core validator types)
- Citations API access configured
- Redis cache infrastructure (from 14.1 Phase 3)

### External Dependencies
- Anthropic Claude API (Citations feature)
- NER library (compromise, spaCy, or custom)

---

## Related Epics

| Epic | Relationship |
|------|--------------|
| 14.1 | Prerequisite - Computational Accuracy |
| 14.3 | Follow-on - Extended Thinking Integration |
| 14.4 | Follow-on - Multi-Agent Verification |
| 13 | Integration - Governance Gateway oversight |
| 6 | Integration - Evidence Pack generation |

---

## Appendix A: Regulatory Reference Patterns

```typescript
// Defense/compliance regulatory patterns
export const REGULATORY_PATTERNS = {
  dfars: [
    /DFARS\s*\d{3}\.\d+(?:-\d+)?/gi,
    /Defense Federal Acquisition Regulation/gi,
  ],
  far: [
    /FAR\s*\d{1,2}\.\d+(?:-\d+)?/gi,
    /Federal Acquisition Regulation/gi,
  ],
  nist: [
    /NIST\s*(?:SP\s*)?\d{3}-\d+/gi,
    /NIST\s*(?:Cybersecurity\s*)?Framework/gi,
    /NIST\s*800-\d+/gi,
  ],
  cmmc: [
    /CMMC\s*(?:Level\s*)?\d/gi,
    /Cybersecurity Maturity Model Certification/gi,
  ],
  iso: [
    /ISO\s*\d{4,5}(?::\d{4})?/gi,
  ],
  itar: [
    /ITAR/gi,
    /International Traffic in Arms Regulations/gi,
  ],
  ear: [
    /EAR\s*\d{3}\.\d+/gi,
    /Export Administration Regulations/gi,
  ]
};
```

---

## Appendix B: Sample Test Corpus

```json
{
  "factual_claims": [
    {
      "text": "DFARS 252.204-7012 requires contractors to implement NIST SP 800-171 controls.",
      "type": "regulatory",
      "entities": ["DFARS 252.204-7012", "NIST SP 800-171"],
      "verifiable": true,
      "expected_sources": ["acquisition.gov", "nist.gov"]
    },
    {
      "text": "The F-35 program has delivered over 900 aircraft as of 2024.",
      "type": "quantitative",
      "entities": ["F-35", "900", "2024"],
      "verifiable": true,
      "expected_sources": ["defense.gov", "lockheedmartin.com"]
    },
    {
      "text": "In my opinion, the new requirements are too strict.",
      "type": "opinion",
      "entities": [],
      "verifiable": false,
      "expected_action": "flag_as_opinion"
    }
  ]
}
```

---

*Epic 14.2 Planning Document - Version 1.0*  
*Created: 2026-01-19*  
*Author: FORGE Framework*
