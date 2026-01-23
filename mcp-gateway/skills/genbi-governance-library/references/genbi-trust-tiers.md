
# GenBI Trust Tiers Skill

## Core Principle

> "Trust is earned incrementally, not granted upfront."

AI can generate plausible-sounding but incorrect answers. If executives make decisions 
based on AI hallucinations, consequences are severe. Trust tiers enforce progressive 
capability unlocking.

---

## The Three Tiers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TRUST TIER PYRAMID                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              ┌─────────┐                                    │
│                              │   RUN   │  Executives                        │
│                              │ Certified│  Certified answers ONLY           │
│                              └────┬────┘                                    │
│                         ┌─────────┴─────────┐                               │
│                         │       WALK        │  Managers                     │
│                         │   Pivot & Filter  │  Pre-approved operations      │
│                         └─────────┬─────────┘                               │
│                    ┌──────────────┴──────────────┐                          │
│                    │            CRAWL            │  Analysts                │
│                    │      Explore & Validate     │  Full access, own risk   │
│                    └─────────────────────────────┘                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tier Definitions

### CRAWL Tier (Analysts)

**Who**: Data analysts, engineers, power users

**What they can do**:
- Explore any data source
- Run ad-hoc queries
- Validate AI-generated content
- Create draft seeds
- Access raw and curated zones

**What they cannot do**:
- Publish to executives
- Certify assets
- Bypass validation

**Risk acceptance**: User accepts AI may be wrong

```typescript
interface CrawlCapabilities {
  zones: ['landing', 'raw', 'curated'];
  operations: ['explore', 'query', 'validate', 'draft'];
  aiWarning: 'VISIBLE';  // Warning always shown
  certification: 'CANNOT_CERTIFY';
}
```

---

### WALK Tier (Managers)

**Who**: Department managers, team leads

**What they can do**:
- Use pre-approved pivot operations
- Filter by approved dimensions
- View aggregated metrics
- Access curated zone only

**What they cannot do**:
- Ad-hoc queries
- Access raw data
- Modify certified seeds

**Risk acceptance**: AI outputs validated by Crawl tier first

```typescript
interface WalkCapabilities {
  zones: ['curated'];
  operations: ['pivot', 'filter', 'aggregate'];
  aiWarning: 'SUBTLE';  // Warning in footer
  certification: 'CAN_APPROVE';
  restrictions: {
    mustUseCertifiedSeeds: true;
    maxRowsReturned: 10000;
    approvedDimensions: string[];  // Configured per domain
  };
}
```

---

### RUN Tier (Executives)

**Who**: C-suite, VPs, board members

**What they can do**:
- View certified dashboards
- Receive certified answers only
- Access semantic layer only

**What they cannot do**:
- Any exploration
- Any ad-hoc queries
- See uncertified data

**Risk acceptance**: ZERO - All content pre-certified

```typescript
interface RunCapabilities {
  zones: ['semantic'];
  operations: ['view_certified'];
  aiWarning: 'HIDDEN';  // No warning - content is certified
  certification: 'FINAL_APPROVER';
  restrictions: {
    onlyCertifiedSeeds: true;
    onlyCertifiedDashboards: true;
    evidenceRequired: true;
    freshnessRequired: '< 24 hours';
  };
}
```

---

## Enforcement Logic

```typescript
function enforceTrustTier(
  user: User,
  operation: Operation,
  resource: Resource
): AccessDecision {
  const tier = user.trustTier;
  const capabilities = TIER_CAPABILITIES[tier];
  
  // Zone access check
  if (!capabilities.zones.includes(resource.zone)) {
    return {
      allowed: false,
      reason: `${tier} tier cannot access ${resource.zone} zone`,
      suggestion: `Request access elevation or use ${capabilities.zones.join('/')} zone`
    };
  }
  
  // Operation check
  if (!capabilities.operations.includes(operation.type)) {
    return {
      allowed: false,
      reason: `${tier} tier cannot perform ${operation.type}`,
      suggestion: `This operation requires ${getRequiredTier(operation)} tier`
    };
  }
  
  // Certification check for RUN tier
  if (tier === 'RUN' && !resource.isCertified) {
    return {
      allowed: false,
      reason: 'RUN tier can only access certified content',
      suggestion: 'Request certification of this resource'
    };
  }
  
  return { allowed: true };
}
```

---

## Tier Assignment

```yaml
tier_assignment:
  crawl:
    roles:
      - data_analyst
      - data_engineer
      - developer
    auto_assign: true
    training_required: false
    
  walk:
    roles:
      - manager
      - team_lead
      - product_owner
    requires:
      - crawl_experience_days: 30
      - training_completion: "genbi_walk_tier"
    approval: domain_owner
    
  run:
    roles:
      - executive
      - vp
      - director
    requires:
      - explicit_request: true
      - business_justification: true
    approval: data_governance_board
```

---

## UI Treatment by Tier

### Crawl Tier UI
```
┌─────────────────────────────────────────┐
│ ⚠️ AI-GENERATED - VERIFY BEFORE USE    │
│                                         │
│ Query: Show revenue by region           │
│ Result: [data table]                    │
│                                         │
│ ⚠️ This content has not been certified │
│ [Validate] [Create Seed] [Report Issue] │
└─────────────────────────────────────────┘
```

### Walk Tier UI
```
┌─────────────────────────────────────────┐
│ Revenue by Region                       │
│ Source: Certified Seed v2.1.0           │
│                                         │
│ [Pivot Controls] [Filter by ▼]          │
│ Result: [data table]                    │
│                                         │
│ Data validated by: J. Smith, 2h ago     │
└─────────────────────────────────────────┘
```

### Run Tier UI
```
┌─────────────────────────────────────────┐
│ 📊 Executive Dashboard                  │
│                                         │
│ Revenue: $142M ↑12%                     │
│ [Certified ✓] [Evidence ℹ️]            │
│                                         │
└─────────────────────────────────────────┘
```

---

## Escalation Path

```
User at CRAWL wants RUN access:
1. Complete WALK training
2. Operate at WALK for 30 days
3. Request RUN elevation
4. Data Governance Board review
5. If approved, RUN access granted
```

---

## Integration Points

```yaml
integrates_with:
  - certified-asset-lifecycle: "Certification gates RUN access"
  - evidence-binding-standard: "RUN requires evidence"
  - data-lake-governance: "Zone access by tier"
  - human-approval-gates: "Tier elevation requires approval"
```

---

*This skill prevents AI hallucinations from reaching decision-makers.*
