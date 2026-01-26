
# Certified Asset Lifecycle Skill

## Core Principle

> "Every trusted answer source must have governance, versioning, and clear ownership."

Certified assets are the foundation of trusted GenBI. Without lifecycle management,
you get stale data, orphaned reports, and untraceable answers.

---

## Asset States

```
DRAFT → IN_REVIEW → CERTIFIED → DEPRECATED → RETIRED
  │         │           │            │
  └─────────┴───────────┴────────────┴──► Can revert to DRAFT
```

| State | Who Can Access | What It Means |
|-------|----------------|---------------|
| DRAFT | Creator only | Work in progress, not validated |
| IN_REVIEW | Creator + Reviewers | Awaiting approval |
| CERTIFIED | All authorized users | Production-ready, trusted |
| DEPRECATED | All (with warning) | Scheduled for retirement |
| RETIRED | Archive only | No longer available |

---

## Certification Requirements

Before an asset can become CERTIFIED:

```yaml
certification_checklist:
  data_quality:
    - Source data validated
    - Schema matches contract
    - No null key violations
    - Freshness SLO defined
    
  documentation:
    - Business description complete
    - Technical lineage documented
    - Owner assigned
    - Consumers identified
    
  validation:
    - SME review completed
    - Test queries pass
    - Performance benchmarked
    - Security classification set
    
  governance:
    - Retention policy defined
    - PII handling documented
    - Access controls configured
    - Audit logging enabled
```

---

## Asset Metadata Schema

```typescript
interface CertifiedAsset {
  id: string;                    // ASSET-001
  name: string;                  // "Monthly Revenue Summary"
  type: 'seed' | 'report' | 'dashboard' | 'metric' | 'dimension';
  version: string;               // semver
  status: AssetStatus;
  
  ownership: {
    owner: string;               // team or individual
    steward: string;             // data steward
    created: Date;
    lastModified: Date;
  };
  
  certification: {
    certifiedBy: string;
    certifiedDate: Date;
    expiresDate: Date;           // must recertify
    reviewers: string[];
    evidence: string[];          // links to validation reports
  };
  
  lineage: {
    sources: string[];           // upstream assets
    consumers: string[];         // downstream dependencies
    transformations: string[];   // applied logic
  };
  
  slo: {
    freshnessMinutes: number;
    availabilityPercent: number;
    accuracyThreshold: number;
  };
  
  governance: {
    classification: 'public' | 'internal' | 'confidential' | 'restricted';
    retentionDays: number;
    piiFields: string[];
  };
}
```

---

## State Transitions

### DRAFT → IN_REVIEW

```typescript
async function submitForReview(assetId: string): Promise<void> {
  const asset = await getAsset(assetId);
  
  // Validate completeness
  validateDocumentation(asset);
  validateDataQuality(asset);
  
  // Assign reviewers based on tier
  const reviewers = await assignReviewers(asset);
  
  // Create review request
  await createReviewRequest({
    assetId,
    reviewers,
    deadline: addDays(now(), 5),
    checklist: CERTIFICATION_CHECKLIST
  });
  
  asset.status = 'IN_REVIEW';
  await saveAsset(asset);
}
```

### IN_REVIEW → CERTIFIED

```typescript
async function certify(assetId: string, approvals: Approval[]): Promise<void> {
  const asset = await getAsset(assetId);
  
  // Verify all required approvals
  const requiredApprovers = getRequiredApprovers(asset.governance.classification);
  if (!hasAllApprovals(approvals, requiredApprovers)) {
    throw new Error('Missing required approvals');
  }
  
  // Set certification metadata
  asset.certification = {
    certifiedBy: approvals[0].approver,
    certifiedDate: now(),
    expiresDate: addMonths(now(), 6),  // Must recertify every 6 months
    reviewers: approvals.map(a => a.approver),
    evidence: approvals.map(a => a.evidenceUrl)
  };
  
  asset.status = 'CERTIFIED';
  await saveAsset(asset);
  
  // Notify consumers
  await notifyConsumers(asset, 'Asset certified and available');
}
```

### CERTIFIED → DEPRECATED

```typescript
async function deprecate(assetId: string, reason: string, retirementDate: Date): Promise<void> {
  const asset = await getAsset(assetId);
  
  // Notify all consumers
  const consumers = await getConsumers(assetId);
  await notifyConsumers(consumers, {
    message: `Asset ${asset.name} deprecated. Retirement: ${retirementDate}`,
    reason,
    alternatives: await findAlternatives(asset)
  });
  
  asset.status = 'DEPRECATED';
  asset.deprecation = { reason, retirementDate };
  await saveAsset(asset);
}
```

---

## Approval Requirements by Classification

| Classification | Required Approvers | Approval Count |
|----------------|-------------------|----------------|
| Public | Data Steward | 1 |
| Internal | Data Steward + Domain Owner | 2 |
| Confidential | Steward + Owner + Security | 3 |
| Restricted | Steward + Owner + Security + Compliance | 4 |

---

## Recertification

Certified assets expire and must be recertified:

```typescript
async function checkRecertification(): Promise<AssetWarning[]> {
  const expiringAssets = await findAssetsExpiringSoon(30); // 30 days
  
  return expiringAssets.map(asset => ({
    assetId: asset.id,
    name: asset.name,
    expiresDate: asset.certification.expiresDate,
    owner: asset.ownership.owner,
    action: 'RECERTIFICATION_REQUIRED'
  }));
}
```

---

## Integration Points

```yaml
integrates_with:
  - genbi-trust-tiers: "Asset tier determines access"
  - evidence-binding-standard: "Certification is evidence"
  - verification-protocol: "Validation before certification"
  - api-contracts: "Assets reference contracts"
```

---

*This skill ensures every trusted data source has proper governance.*
