
# Evidence Binding Standard Skill

## Core Principle

> "An answer without evidence is just a guess."

Every GenBI response must carry its provenance. Users must know: Where did this 
come from? How fresh is it? How confident are we? Can it be verified?

---

## Evidence Bundle Schema

Every response includes an evidence bundle:

```typescript
interface EvidenceBundle {
  // What sources were used
  sources: Array<{
    assetId: string;           // ASSET-001
    assetName: string;         // "Revenue Summary Seed"
    version: string;           // v2.1.0
    certificationStatus: 'CERTIFIED' | 'DRAFT' | 'DEPRECATED';
    lastVerified: Date;
  }>;
  
  // Data lineage
  lineage: {
    upstreamSources: string[];  // Original data sources
    transformations: string[];  // Applied logic
    lineageHash: string;        // Cryptographic hash of lineage
  };
  
  // Freshness
  freshness: {
    dataAsOf: Date;            // When was source data captured
    queryExecutedAt: Date;     // When was this query run
    sloStatus: 'MET' | 'BREACHED';
    freshnessMinutes: number;
  };
  
  // Confidence
  confidence: {
    overallScore: number;      // 0-1
    factors: Array<{
      factor: string;          // "source_certification", "freshness", "validation"
      score: number;
      weight: number;
    }>;
  };
  
  // Verification
  verification: {
    lastVerifiedBy: string;    // Who validated this
    lastVerifiedAt: Date;
    method: 'AUTOMATED' | 'SME_REVIEW' | 'SPOT_CHECK';
    nextVerificationDue: Date;
  };
}
```

---

## Evidence Requirements by Trust Tier

| Tier | Required Evidence | Display |
|------|-------------------|---------|
| CRAWL | Source + version | Full details visible |
| WALK | Source + version + verification | Summary + expand |
| RUN | Full bundle + all checks passed | Badge only, details on click |

---

## Confidence Scoring

```typescript
function calculateConfidence(bundle: EvidenceBundle): number {
  const factors = [
    {
      name: 'source_certification',
      score: bundle.sources.every(s => s.certificationStatus === 'CERTIFIED') ? 1.0 : 0.5,
      weight: 0.3
    },
    {
      name: 'freshness',
      score: bundle.freshness.sloStatus === 'MET' ? 1.0 : 0.3,
      weight: 0.25
    },
    {
      name: 'verification_recency',
      score: hoursAgo(bundle.verification.lastVerifiedAt) < 24 ? 1.0 : 0.6,
      weight: 0.25
    },
    {
      name: 'lineage_completeness',
      score: bundle.lineage.upstreamSources.length > 0 ? 1.0 : 0.4,
      weight: 0.2
    }
  ];
  
  return factors.reduce((sum, f) => sum + f.score * f.weight, 0);
}
```

---

## Blocking Conditions

For RUN tier (executives), these block the response:

```typescript
function validateForRunTier(bundle: EvidenceBundle): ValidationResult {
  const errors: string[] = [];
  
  // All sources must be certified
  if (!bundle.sources.every(s => s.certificationStatus === 'CERTIFIED')) {
    errors.push('Uncertified sources not allowed for executive tier');
  }
  
  // Confidence must exceed threshold
  if (bundle.confidence.overallScore < 0.9) {
    errors.push('Confidence below executive threshold (90%)');
  }
  
  // Verification must be recent
  if (hoursAgo(bundle.verification.lastVerifiedAt) > 24) {
    errors.push('Verification too stale for executive tier (>24h)');
  }
  
  // Freshness SLO must be met
  if (bundle.freshness.sloStatus === 'BREACHED') {
    errors.push('Data freshness SLO breached');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## Response Format with Evidence

### API Response
```json
{
  "answer": {
    "text": "Revenue increased 12% YoY to $142M",
    "data": { ... }
  },
  "evidence": {
    "sources": [
      {
        "assetId": "SEED-001",
        "assetName": "Revenue Summary",
        "version": "v2.1.0",
        "certificationStatus": "CERTIFIED"
      }
    ],
    "confidence": {
      "overallScore": 0.94,
      "factors": [...]
    },
    "freshness": {
      "dataAsOf": "2025-12-26T06:00:00Z",
      "sloStatus": "MET"
    }
  }
}
```

### UI Display
```
┌─────────────────────────────────────────────────────────────┐
│ Revenue increased 12% YoY to $142M                          │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✓ Confidence: 94% │ ✓ Verified: 2h ago │ ✓ Fresh        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ [View Evidence] [Full Report] [Export]                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Lineage Hash Verification

Every evidence bundle includes a cryptographic hash for audit:

```typescript
function computeLineageHash(bundle: EvidenceBundle): string {
  const lineageData = {
    sources: bundle.sources.map(s => `${s.assetId}:${s.version}`),
    transformations: bundle.lineage.transformations,
    queryTime: bundle.freshness.queryExecutedAt.toISOString()
  };
  
  return sha256(JSON.stringify(lineageData));
}
```

This hash can later verify the answer wasn't tampered with.

---

## Audit Requirements

Evidence bundles must be:
- Stored for 7 years (compliance)
- Retrievable by answer ID
- Verifiable via lineage hash
- Tied to user session for accountability

---

## Integration Points

```yaml
integrates_with:
  - certified-asset-lifecycle: "Certification status in evidence"
  - genbi-trust-tiers: "Evidence requirements by tier"
  - verification-protocol: "Verification metadata"
  - data-lake-governance: "Lineage from lake zones"
```

---

*This skill ensures every AI answer is traceable and auditable.*
