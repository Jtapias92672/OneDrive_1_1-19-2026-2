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

## Epic Goal

Implement a multi-tier computational validation pipeline that verifies mathematical claims in AI agent outputs with enterprise-grade accuracy, optimized for defense contractor EVM calculations.

---

## Technology Selection (Success Formula Applied)

| Technology | P(Right) | V(Right) | C(Wrong) | Score | Status |
|------------|----------|----------|----------|-------|--------|
| Code Execution (L1) | 0.99 | $200K | $1K | 198.0 | ✅ Complete |
| Wolfram Alpha (L1.5) | 0.999 | $500K | $2K | 249.8 | ✅ Complete |
| Citations API (L2) | 0.95 | $400K | $2K | 190.0 | ⏳ Epic 14.2 |
| Extended Thinking | 0.95 | $200K | $1.05K | 180.9 | ⏳ Epic 14.2 |

---

## Task Progress

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
    ├── EPIC-14.1-computational-accuracy.md    # This file
    └── epic-14.1-computational-accuracy/
        ├── EPIC-14-master-status.md           # Master tracking
        ├── EPIC-14.2-semantic-accuracy-layer.md
        ├── TASKS-Epic-14.1-Phase-2-Pipeline-Integration.md
        ├── TASKS-Epic-14.1-Phase-3-Production-Optimization.md
        ├── claim-detector.ts                  # Standalone detector
        ├── claim-patterns.ts                  # Pattern definitions
        ├── test-claim-patterns.ts             # Pattern tests
        └── test-wolfram-api.ts                # API tests
```

---

## Claim Pattern Coverage (44 Patterns)

| Category | Count | Priority | Examples |
|----------|-------|----------|----------|
| **EVM** | 9 | 90-100 | CPI, SPI, EAC, ETC, VAC, CV, SV, TCPI, % Complete |
| **Defense** | 6 | 80-90 | Award Fee, CPIF Share, FTE Hours, Labor Cost, G&A, ODC |
| **Financial** | 4 | 75-85 | Compound Interest, ROI, Profit Margin, Discount |
| **Statistical** | 3 | 60-70 | Average, Weighted Average, Growth Rate |
| **Conversion** | 2 | 50 | Miles↔km, Celsius↔Fahrenheit |
| **Generic** | 5 | 10-20 | Basic +, -, ×, ÷ arithmetic |
| **Advanced** | 15 | 55-85 | Ratios, Proportions, √, ^, BCWP/BCWS/ACWP |

---

## Platform Integration

### With Convergence Engine (Epic 04)

```typescript
convergenceEngine.registerValidator({
  name: 'computational',
  validator: new ComputationalValidator({ mode: 'conditional' }),
  weight: 0.40,
  feedbackGenerator: generateComputationalFeedback,
});
```

### With Evidence Packs (Epic 08)

```typescript
evidencePack.addComputationalValidation({
  claims: validatedClaims,
  wolframCalls: report.wolframInvocations,
  totalScore: report.score,
  hash: computeHash(validatedClaims),
});
```

### With Governance Gateway (Epic 13)

```typescript
governanceGateway.registerPolicy({
  name: 'computational-accuracy-gate',
  condition: (result) => result.computationalScore >= 0.95,
  action: 'require_approval',
});
```

### With E2E Tests (Epic 12)

```typescript
test('validates EVM calculations', async ({ request }) => {
  const response = await request.post('/api/v1/validate', {
    data: { answer: 'CPI = 750000/680000 = 1.103', validators: ['computational'] },
  });
  expect(response.ok()).toBeTruthy();
});
```

---

## Usage Example

```typescript
import { ComputationalValidator, detectComputationalClaims } from '@forge/validators/computational';

const validator = new ComputationalValidator({
  mode: 'conditional',
  wolframAppId: process.env.WOLFRAM_APP_ID,
  redisUrl: process.env.REDIS_URL,
});

const agentOutput = `
  The project CPI = EV / AC = 750000 / 680000 = 1.103.
  At 7.5% APR, $125,000 grows to $179,584.54 over 5 years.
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
// }
```

---

## Infrastructure (Epic 09)

| Resource | Purpose | Module |
|----------|---------|--------|
| ElastiCache (Redis 7.1) | Validation caching | `elasticache` |
| CloudWatch | Metrics & dashboards | `monitoring` |
| Secrets Manager | Wolfram API key | `secrets` |
| S3 | Evidence pack storage | `s3` |

---

## Cost Model

| Scenario | Monthly Calls | Cost |
|----------|---------------|------|
| Development | < 500 | $0 (free tier) |
| Staging | 500-2,000 | $0 (free tier) |
| Production (Light) | 2,000-5,000 | ~$15 |
| Production (Heavy) | 5,000-10,000 | ~$40 |

**Cost Optimization (Implemented):**
1. ✅ L1 local validation filters 60-80% of claims
2. ✅ Redis caching with 1-hour TTL
3. ✅ Daily budget caps (configurable)
4. ✅ Priority-based pattern matching
5. ✅ Circuit breaker prevents runaway costs

---

## Wolfram API Configuration

| Field | Value |
|-------|-------|
| **Owner** | joe@arcfoundry.ai |
| **App ID** | 2K3K8Q5XGA |
| **API Type** | LLM API |
| **Free Tier** | 2,000/month |
| **Invocation** | Conditional (L1 fail → Wolfram) |

---

## Next Steps

→ [Epic 14.2: Semantic Accuracy Layer](./epic-14.1-computational-accuracy/EPIC-14.2-semantic-accuracy-layer.md)

1. Citations API integration
2. Extended Thinking validation
3. Cross-validation framework
