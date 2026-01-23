# Epic 14.1: Computational Accuracy Layer

**Status:** ✅ 100% COMPLETE  
**Last Updated:** 2026-01-19  
**Owner:** joe@arcfoundry.ai  
**Dependencies:** Epic 02 (Answer Contract), Epic 04 (Convergence Engine)  
**Platform Version:** FORGE B-D 1.0

---

## Governing Principle

```
Success = (P(Right) × V(Right)) ÷ C(Wrong)
```

This equation governs all technology selection, architectural decisions, and epic completion gates.

---

## Executive Summary

Epic 14.1 implements a multi-tier computational validation pipeline that verifies mathematical claims in AI agent outputs with enterprise-grade accuracy. This is critical for defense contractor EVM calculations, DCMA compliance, and financial accuracy requirements.

### Key Achievements

- ✅ **44 claim patterns** covering EVM, defense, financial, and statistical domains
- ✅ **Multi-tier validation** (L1 local → L1.5 Wolfram Alpha)
- ✅ **Full pipeline integration** with convergence engine and evidence packs
- ✅ **Production hardening** with Redis caching, circuit breaker, cost alerting
- ✅ **E2E test coverage** via Epic 12

---

## Technology Stack

| Tier | Technology | P(Right) | V(Right) | C(Wrong) | Score | Status |
|------|------------|----------|----------|----------|-------|--------|
| L1 | Code Execution (mathjs) | 0.99 | $200K | $1K | 198.0 | ✅ Complete |
| L1.5 | Wolfram Alpha LLM API | 0.999 | $500K | $2K | 249.8 | ✅ Complete |
| L2 | Extended Thinking | 0.95 | $200K | $1.05K | 180.9 | ⏳ Epic 14.2 |

---

## Phase Completion Status

### Phase 1: Core Infrastructure ✅ COMPLETE

| Task | Status | File | Lines |
|------|--------|------|-------|
| 1.1 Type definitions | ✅ Done | `types/computational.types.ts` | 280 |
| 1.2 Wolfram config | ✅ Done | `config/wolfram-config.ts` | 85 |
| 1.3 Wolfram client | ✅ Done | `validators/computational/wolfram-client.ts` | 220 |
| 1.4 Computational validator | ✅ Done | `validators/computational/computational-validator.ts` | 420 |
| 1.5 API integration test | ✅ Done | `tests/quick-test.sh` | 45 |
| 1.6 Claim patterns | ✅ Done | `validators/computational/claim-patterns.ts` | 550 |

### Phase 2: Pipeline Integration ✅ COMPLETE

| Task | Status | File | Lines |
|------|--------|------|-------|
| 2.1 Enhanced claim detector | ✅ Done | `validators/computational/claim-detector.ts` | 380 |
| 2.2 Evidence pack integration | ✅ Done | `validators/computational/evidence-pack.ts` | 450 |
| 2.3 Repair loop integration | ✅ Done | `validators/computational/repair-loop.ts` | 420 |
| 2.4 Dashboard metrics | ✅ Done | `validators/computational/metrics.ts` | 580 |

### Phase 3: Production Optimization ✅ COMPLETE

| Task | Status | File | Lines |
|------|--------|------|-------|
| 3.1 Redis caching | ✅ Done | `validators/computational/redis-cache.ts` | 350 |
| 3.2 Circuit breaker | ✅ Done | `validators/computational/circuit-breaker.ts` | 320 |
| 3.3 Cost alerting | ✅ Done | `validators/computational/cost-alerting.ts` | 410 |
| 3.4 Batch validation | ✅ Done | `validators/computational/batch-validation.ts` | 440 |

---

## File Structure

```
forge/
├── config/
│   ├── .env                              # Environment variables
│   └── wolfram-config.ts                 # Wolfram API configuration
├── types/
│   └── computational.types.ts            # Core type definitions (280 lines)
├── validators/
│   └── computational/
│       ├── index.ts                      # Barrel exports
│       ├── computational-validator.ts    # Multi-tier validator (420 lines)
│       ├── wolfram-client.ts             # Wolfram Alpha LLM API (220 lines)
│       ├── claim-detector.ts             # Claim extraction (380 lines)
│       ├── claim-patterns.ts             # 44 patterns (550 lines)
│       ├── evidence-pack.ts              # Evidence integration (450 lines)
│       ├── repair-loop.ts                # Convergence feedback (420 lines)
│       ├── metrics.ts                    # Dashboard metrics (580 lines)
│       ├── redis-cache.ts                # Caching layer (350 lines)
│       ├── circuit-breaker.ts            # Resilience (320 lines)
│       ├── cost-alerting.ts              # Cost management (410 lines)
│       └── batch-validation.ts           # Batch processing (440 lines)
├── tests/
│   ├── quick-test.sh                     # API verification script
│   └── test-wolfram-api.ts               # Wolfram integration tests
└── epics/
    └── epic-14.1-computational-accuracy/
        ├── EPIC-14.1-computational-accuracy.md    # This file
        ├── EPIC-14.2-semantic-accuracy-layer.md   # Next epic
        ├── EPIC-14-master-status.md               # Master tracking
        ├── TASKS-Epic-14.1-Phase-2-Pipeline-Integration.md
        ├── TASKS-Epic-14.1-Phase-3-Production-Optimization.md
        ├── claim-detector.ts                       # Standalone detector
        ├── claim-patterns.ts                       # Pattern definitions
        ├── test-claim-patterns.ts                  # Pattern tests
        └── test-wolfram-api.ts                     # API tests
```

---

## Claim Pattern Coverage

### EVM Calculations (Priority 90-100)

| Pattern | Formula | Example |
|---------|---------|---------|
| CPI | EV / AC | `CPI = 750000 / 680000 = 1.103` |
| SPI | EV / PV | `SPI = 750000 / 700000 = 1.071` |
| EAC | BAC / CPI | `EAC = 1000000 / 1.103 = 906,618` |
| ETC | EAC - AC | `ETC = 906618 - 680000 = 226,618` |
| VAC | BAC - EAC | `VAC = 1000000 - 906618 = 93,382` |
| CV | EV - AC | `CV = 750000 - 680000 = 70,000` |
| SV | EV - PV | `SV = 750000 - 700000 = 50,000` |
| TCPI | (BAC - EV) / (BAC - AC) | `TCPI = 0.78` |
| % Complete | EV / BAC × 100 | `% Complete = 75%` |

### Defense Contractor (Priority 80-90)

| Pattern | Description | Example |
|---------|-------------|---------|
| Award Fee | Performance-based incentive | `Award Fee = 85% × $500K = $425K` |
| CPIF Share | Cost Plus Incentive Fee share | `Government share = 60%` |
| FTE Hours | Full-Time Equivalent hours | `FTE = 2080 hours/year` |
| Labor Cost | Burdened labor rate | `Labor = $125/hr × 1.45 = $181.25` |
| G&A Rate | General & Administrative | `G&A = 12.5% × $1M = $125K` |
| ODC Markup | Other Direct Costs | `ODC = $50K × 1.08 = $54K` |

### Financial (Priority 75-85)

| Pattern | Formula | Example |
|---------|---------|---------|
| Compound Interest | P × (1 + r/n)^(nt) | `$100K @ 5% for 3 years = $115,762.50` |
| ROI | (Gain - Cost) / Cost × 100 | `ROI = (150K - 100K) / 100K = 50%` |
| Profit Margin | Profit / Revenue × 100 | `Margin = 25K / 100K = 25%` |
| Discount | Original × (1 - rate) | `$100 @ 20% off = $80` |

### Statistical (Priority 60-70)

| Pattern | Description | Example |
|---------|-------------|---------|
| Average | Sum / Count | `Average = (10+20+30) / 3 = 20` |
| Weighted Average | Σ(value × weight) / Σweight | `WA = (80×0.3 + 90×0.7) = 87` |
| Growth Rate | (New - Old) / Old × 100 | `Growth = (120-100) / 100 = 20%` |

---

## Integration Points

### With Convergence Engine (Epic 04)

```typescript
// Register computational validator
import { ComputationalValidator } from '@forge/validators/computational';

convergenceEngine.registerValidator({
  name: 'computational',
  validator: new ComputationalValidator({ mode: 'conditional' }),
  weight: 0.40,  // 40% of total validation score
  feedbackGenerator: (result) => ({
    type: 'computational',
    suggestions: result.invalidClaims.map(c => 
      `Verify calculation: ${c.expression} = ${c.expected} (got ${c.actual})`
    ),
  }),
});
```

### With Evidence Packs (Epic 08)

```typescript
// Include computational validation in evidence
import { EvidencePackBuilder } from '@forge/evidence-packs';

const evidence = new EvidencePackBuilder(runId)
  .addComputationalValidation({
    claims: validatedClaims,
    wolframCalls: report.wolframInvocations,
    cacheHits: report.cacheHits,
    totalScore: report.score,
    tier: report.validationTier,
  })
  .build();
```

### With MCP Gateway (Epic 03)

```typescript
// Audit computational tool invocations
mcpGateway.registerAuditHook('computational', {
  onValidation: (claim, result) => {
    auditLog.record({
      type: 'computational_validation',
      claim: claim.expression,
      result: result.valid,
      tier: result.tier,
      timestamp: Date.now(),
    });
  },
});
```

### With Governance Gateway (Epic 13)

```typescript
// Policy for computational accuracy gates
governanceGateway.registerPolicy({
  name: 'computational-accuracy-gate',
  evaluate: (result) => result.computationalScore >= 0.95,
  onViolation: 'require_approval',
  severity: 'high',
});
```

### With E2E Tests (Epic 12)

```typescript
// E2E test coverage
test.describe('Computational Validator', () => {
  test('validates EVM calculations correctly', async ({ request }) => {
    const response = await request.post('/api/v1/validate', {
      data: {
        answer: 'The CPI is EV/AC = 750000/680000 = 1.103',
        validators: ['computational'],
      },
    });
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.computationalScore).toBeGreaterThan(0.95);
  });
});
```

---

## Wolfram API Configuration

| Field | Value |
|-------|-------|
| **Owner** | joe@arcfoundry.ai |
| **App ID** | 2K3K8Q5XGA |
| **API Type** | LLM API |
| **Free Tier** | 2,000 calls/month |
| **Invocation Mode** | Conditional (L1 fail → Wolfram) |
| **Timeout** | 10 seconds |
| **Retry Policy** | 3 retries with exponential backoff |

---

## Infrastructure (Epic 09)

### AWS Resources

| Resource | Purpose | Module |
|----------|---------|--------|
| ElastiCache (Redis 7.1) | Validation caching | `elasticache` |
| CloudWatch | Metrics & dashboards | `monitoring` |
| Secrets Manager | Wolfram API key | `secrets` |
| S3 | Evidence pack storage | `s3` |

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: computational-validator
  namespace: forge
spec:
  replicas: 2
  selector:
    matchLabels:
      app: computational-validator
  template:
    metadata:
      labels:
        app: computational-validator
    spec:
      serviceAccountName: forge-validator
      containers:
      - name: validator
        image: ${ECR_REGISTRY}/forge-computational-validator:latest
        env:
        - name: WOLFRAM_APP_ID
          valueFrom:
            secretKeyRef:
              name: forge-secrets
              key: wolfram-app-id
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: forge-config
              key: redis-url
        - name: VALIDATION_MODE
          value: "conditional"
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

---

## Metrics & Monitoring

### Prometheus Metrics

```typescript
// Exposed metrics
computational_validations_total{status="success|failure",tier="L1|L1.5"}
computational_validation_duration_seconds{tier="L1|L1.5"}
computational_wolfram_calls_total{status="success|failure"}
computational_cache_hits_total
computational_cache_misses_total
computational_claims_detected_total{category="evm|defense|financial|statistical"}
computational_circuit_breaker_state{state="closed|open|half_open"}
```

### CloudWatch Alarms

| Metric | Threshold | Action |
|--------|-----------|--------|
| Validation Latency p99 | > 1s | SNS Alert |
| Wolfram API Calls | > 1,500/day | SNS Alert |
| Cache Hit Rate | < 40% | SNS Alert |
| Error Rate | > 5% | SNS Alert |
| Circuit Breaker Open | state = 1 | PagerDuty |

---

## Cost Model

| Scenario | Monthly Calls | Cost | Notes |
|----------|---------------|------|-------|
| Development | < 500 | $0 | Free tier |
| Staging | 500-2,000 | $0 | Free tier |
| Production (Light) | 2,000-5,000 | ~$15 | L1 filtering helps |
| Production (Heavy) | 5,000-10,000 | ~$40 | Enterprise quote recommended |

### Cost Optimization Strategies (Implemented)

1. ✅ L1 local validation filters 60-80% of claims
2. ✅ Redis caching with 1-hour TTL
3. ✅ Daily budget caps (configurable)
4. ✅ Priority-based pattern matching
5. ✅ Circuit breaker prevents runaway costs

---

## Usage Example

```typescript
import { 
  ComputationalValidator, 
  detectComputationalClaims,
  ClaimPatterns 
} from '@forge/validators/computational';

// Initialize validator
const validator = new ComputationalValidator({
  mode: 'conditional',  // L1 first, then Wolfram if needed
  wolframAppId: process.env.WOLFRAM_APP_ID,
  redisUrl: process.env.REDIS_URL,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
  },
});

// Validate AI agent output
const agentOutput = `
  Based on the project data:
  - Earned Value (EV) = $750,000
  - Actual Cost (AC) = $680,000
  - Planned Value (PV) = $700,000
  
  Therefore:
  - CPI = EV / AC = 750000 / 680000 = 1.103
  - SPI = EV / PV = 750000 / 700000 = 1.071
  
  The project is under budget (CPI > 1) and ahead of schedule (SPI > 1).
`;

const report = await validator.validateText(agentOutput);

console.log(report);
// {
//   totalClaims: 2,
//   validClaims: 2,
//   invalidClaims: 0,
//   score: 1.0,
//   validationTier: 'L1',
//   wolframInvocations: 0,
//   cacheHits: 0,
//   latencyMs: 45,
//   claims: [
//     { expression: '750000 / 680000', expected: 1.103, actual: 1.1029..., valid: true },
//     { expression: '750000 / 700000', expected: 1.071, actual: 1.0714..., valid: true }
//   ]
// }
```

---

## Next Steps (Epic 14.2)

1. **Semantic Accuracy Layer**
   - Citations API integration
   - Source verification
   - Cross-reference validation

2. **Extended Thinking**
   - Claude reasoning validation
   - Chain-of-thought verification

3. **Cross-Validation Framework**
   - Multi-validator consensus
   - Confidence calibration

---

## References

- [Wolfram Alpha LLM API Documentation](https://products.wolframalpha.com/llm-api/documentation)
- [Epic 02: Answer Contract](../EPIC-02-answer-contract.md)
- [Epic 04: Convergence Engine](../epic-4-Convergence-Engine.md)
- [Epic 08: Evidence Packs](../../evidence-packs/README.md)
- [Epic 09: Infrastructure](../../infrastructure/README.md)
- [Epic 12: E2E Testing](../../e2e/README.md)
- [Epic 13: Governance Gateway](../EPIC-13-governance-gateway.md)
