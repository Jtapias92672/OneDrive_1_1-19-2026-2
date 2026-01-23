# TASKS: Epic 14.1 Phase 2 - Pipeline Integration

**Status:** ✅ 100% COMPLETE  
**Last Updated:** 2026-01-19  
**Owner:** joe@arcfoundry.ai  
**Duration:** 2 sprints (completed)

---

## Phase Overview

Phase 2 integrates the computational validator into the FORGE convergence pipeline, connecting it with the evidence pack system, repair loop, and metrics dashboard.

---

## Task Breakdown

### Task 2.1: Enhanced Claim Detector ✅ COMPLETE

**File:** `validators/computational/claim-detector.ts`  
**Lines:** ~380  
**Time:** 4 hours

#### Requirements
- [x] Extend basic detector with context awareness
- [x] Support multi-line expressions
- [x] Handle nested calculations
- [x] Extract variable assignments
- [x] Support unit-aware calculations
- [x] Handle percentage calculations

#### Implementation Details

```typescript
interface ClaimDetectorConfig {
  patterns: ClaimPattern[];
  contextWindow: number;      // Characters of context to capture
  multiLineEnabled: boolean;  // Support multi-line expressions
  variableTracking: boolean;  // Track variable assignments
  unitAware: boolean;         // Parse units (%, $, hours, etc.)
}

interface DetectedClaim {
  id: string;
  expression: string;
  expectedValue: number | string;
  context: string;
  lineNumber: number;
  startIndex: number;
  endIndex: number;
  pattern: ClaimPattern;
  variables: Map<string, number>;
  unit?: string;
  confidence: number;
}
```

#### Acceptance Criteria
- [x] Detects 95%+ of computational claims in test corpus
- [x] Extracts context window around each claim
- [x] Correctly parses multi-line expressions
- [x] Tracks variable assignments for substitution
- [x] Unit tests pass with 100% coverage

#### Integration Points
- Epic 02: Uses AnswerContract sections for context
- Epic 04: Feeds into convergence validation loop
- Epic 08: Provides claims for evidence pack

---

### Task 2.2: Evidence Pack Integration ✅ COMPLETE

**File:** `validators/computational/evidence-pack.ts`  
**Lines:** ~450  
**Time:** 5 hours

#### Requirements
- [x] Create ComputationalEvidence schema
- [x] Generate validation receipts
- [x] Compute integrity hashes
- [x] Support evidence export formats
- [x] Integrate with EvidencePackBuilder

#### Schema Definition

```typescript
interface ComputationalEvidence {
  // Metadata
  validationId: string;
  timestamp: string;
  version: string;
  
  // Validation Summary
  summary: {
    totalClaims: number;
    validClaims: number;
    invalidClaims: number;
    score: number;
    validationTier: 'L1' | 'L1.5' | 'L2';
  };
  
  // Detailed Claims
  claims: ValidatedClaim[];
  
  // Wolfram Usage
  wolframUsage: {
    invocations: number;
    cacheHits: number;
    avgLatencyMs: number;
  };
  
  // Integrity
  hash: string;
  signature?: string;
}
```

#### Integration with Epic 08

```typescript
// Evidence pack builder integration
import { EvidencePackBuilder } from '@forge/evidence-packs';

const evidence = new EvidencePackBuilder(runId)
  .addSection('computational', {
    validator: 'ComputationalValidator',
    version: '1.0.0',
    evidence: computationalEvidence,
  })
  .computeHash()
  .sign(privateKey)
  .build();
```

#### Acceptance Criteria
- [x] Evidence schema validates against JSON Schema
- [x] Hash computation is deterministic
- [x] Export to JSON, PDF, ZIP formats works
- [x] Integration with EvidencePackBuilder verified
- [x] DCMA compliance fields included

---

### Task 2.3: Repair Loop Integration ✅ COMPLETE

**File:** `validators/computational/repair-loop.ts`  
**Lines:** ~420  
**Time:** 5 hours

#### Requirements
- [x] Generate actionable feedback for invalid claims
- [x] Create repair suggestions
- [x] Track repair attempts
- [x] Integrate with convergence feedback system
- [x] Support repair verification

#### Feedback Generation

```typescript
interface ComputationalFeedback {
  type: 'computational';
  severity: 'error' | 'warning' | 'info';
  claim: {
    expression: string;
    expected: number | string;
    actual: number | string;
    difference: number;
  };
  suggestion: string;
  repairHint?: string;
  context: string;
}

// Example feedback
{
  type: 'computational',
  severity: 'error',
  claim: {
    expression: 'CPI = EV / AC = 750000 / 680000',
    expected: 1.15,
    actual: 1.103,
    difference: 0.047,
  },
  suggestion: 'The CPI calculation result (1.103) does not match the stated value (1.15). Please verify the calculation: 750000 ÷ 680000 = 1.1029...',
  repairHint: 'Update the CPI value to 1.103 or verify the EV/AC values',
  context: 'The project SPI is...',
}
```

#### Integration with Epic 04

```typescript
// Convergence engine integration
convergenceEngine.registerFeedbackGenerator('computational', {
  generate: (validationResult) => {
    const feedback: ConditionalFeedback[] = [];
    
    for (const invalid of validationResult.invalidClaims) {
      feedback.push({
        type: 'computational',
        priority: getEVMPriority(invalid.pattern),
        message: generateFeedbackMessage(invalid),
        suggestion: generateRepairSuggestion(invalid),
        metadata: {
          claimId: invalid.id,
          pattern: invalid.pattern.name,
          tier: validationResult.tier,
        },
      });
    }
    
    return feedback;
  },
  
  verifyRepair: async (claim, newText) => {
    const revalidation = await validator.validateClaim(claim, newText);
    return revalidation.valid;
  },
});
```

#### Acceptance Criteria
- [x] Feedback messages are clear and actionable
- [x] Repair suggestions are mathematically correct
- [x] Repair verification catches remaining errors
- [x] Integration with convergence loop works end-to-end
- [x] Feedback priority correctly ordered by EVM importance

---

### Task 2.4: Dashboard Metrics ✅ COMPLETE

**File:** `validators/computational/metrics.ts`  
**Lines:** ~580  
**Time:** 6 hours

#### Requirements
- [x] Prometheus metrics exporter
- [x] Real-time validation statistics
- [x] Wolfram API usage tracking
- [x] Cache performance metrics
- [x] CloudWatch integration
- [x] Dashboard widget data

#### Prometheus Metrics

```typescript
// Counter metrics
computational_validations_total{status, tier, pattern_category}
computational_claims_total{status, tier}
computational_wolfram_calls_total{status}
computational_cache_operations_total{operation}

// Histogram metrics
computational_validation_duration_seconds{tier}
computational_wolfram_latency_seconds
computational_claim_detection_duration_seconds

// Gauge metrics
computational_cache_size_bytes
computational_circuit_breaker_state
computational_daily_wolfram_budget_remaining
```

#### CloudWatch Dashboard Integration

```typescript
// CloudWatch metrics
const cloudWatchMetrics = new CloudWatchMetrics({
  namespace: 'FORGE/ComputationalValidator',
  dimensions: [
    { Name: 'Environment', Value: process.env.ENV },
    { Name: 'Service', Value: 'computational-validator' },
  ],
});

// Publish metrics
cloudWatchMetrics.putMetric('ValidationScore', result.score, 'None');
cloudWatchMetrics.putMetric('WolframLatency', wolframLatency, 'Milliseconds');
cloudWatchMetrics.putMetric('CacheHitRate', cacheHitRate, 'Percent');
```

#### Dashboard Widget Data

```typescript
interface DashboardData {
  // Summary cards
  totalValidations: number;
  avgScore: number;
  wolframCallsToday: number;
  cacheHitRate: number;
  
  // Time series
  validationsByHour: TimeSeriesData[];
  scoresByHour: TimeSeriesData[];
  latencyByHour: TimeSeriesData[];
  
  // Breakdowns
  claimsByCategory: PieChartData[];
  validationsByTier: BarChartData[];
  topPatterns: TableData[];
}
```

#### Acceptance Criteria
- [x] Prometheus metrics exposed at /metrics
- [x] CloudWatch metrics publishing works
- [x] Dashboard data API returns correct format
- [x] Real-time updates via WebSocket
- [x] Historical data retention configured

---

## Cross-Epic Integration Tests

### Integration Test Suite

```typescript
describe('Epic 14.1 Phase 2 Integration', () => {
  describe('Claim Detection → Validation → Evidence', () => {
    it('detects and validates EVM claims end-to-end', async () => {
      const text = 'The project CPI = 750000 / 680000 = 1.103';
      
      // Detect claims
      const claims = await detector.detect(text);
      expect(claims).toHaveLength(1);
      
      // Validate claims
      const result = await validator.validate(claims);
      expect(result.validClaims).toBe(1);
      
      // Generate evidence
      const evidence = evidenceBuilder.addComputational(result).build();
      expect(evidence.hash).toBeDefined();
    });
  });

  describe('Validation → Feedback → Repair', () => {
    it('generates repair feedback for invalid claims', async () => {
      const text = 'The CPI = 750000 / 680000 = 1.15'; // Wrong!
      
      const result = await validator.validateText(text);
      expect(result.invalidClaims).toBe(1);
      
      const feedback = feedbackGenerator.generate(result);
      expect(feedback[0].suggestion).toContain('1.103');
    });
  });

  describe('Metrics Collection', () => {
    it('exports Prometheus metrics', async () => {
      await validator.validateText('CPI = 100 / 90 = 1.11');
      
      const metrics = await fetch('/metrics');
      expect(await metrics.text()).toContain('computational_validations_total');
    });
  });
});
```

---

## Dependencies

### Required Packages

```json
{
  "dependencies": {
    "@forge/answer-contract": "workspace:*",
    "@forge/convergence-engine": "workspace:*",
    "@forge/evidence-packs": "workspace:*",
    "prom-client": "^15.0.0",
    "@aws-sdk/client-cloudwatch": "^3.400.0"
  }
}
```

### Infrastructure Requirements

- Redis (ElastiCache) - from Epic 09
- CloudWatch - from Epic 09
- Prometheus - via ServiceMonitor in K8s

---

## Verification Checklist

### Code Quality
- [x] All files pass ESLint
- [x] TypeScript strict mode enabled
- [x] No any types used
- [x] All functions documented with JSDoc

### Testing
- [x] Unit test coverage > 90%
- [x] Integration tests pass
- [x] E2E tests added (Epic 12)
- [x] Performance benchmarks met

### Documentation
- [x] API documentation complete
- [x] Integration guide written
- [x] Metrics reference documented
- [x] Troubleshooting guide created

---

## Phase 2 Summary

| Metric | Target | Actual |
|--------|--------|--------|
| Tasks Completed | 4 | 4 |
| Total Lines | 1,600 | 1,830 |
| Test Coverage | 90% | 94% |
| Integration Points | 3 | 4 |
| Documentation Pages | 4 | 5 |

**Status:** ✅ PHASE COMPLETE

---

## Next Phase

→ [Phase 3: Production Optimization](./TASKS-Epic-14.1-Phase-3-Production-Optimization.md)
