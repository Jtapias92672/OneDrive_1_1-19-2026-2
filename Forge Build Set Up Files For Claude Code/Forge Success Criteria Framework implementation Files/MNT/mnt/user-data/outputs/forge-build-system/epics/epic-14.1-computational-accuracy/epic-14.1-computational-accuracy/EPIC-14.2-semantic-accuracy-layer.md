# Epic 14.2: Semantic Accuracy Layer

**Status:** 🔄 40% IN PROGRESS  
**Last Updated:** 2026-01-19  
**Owner:** joe@arcfoundry.ai  
**Dependencies:** Epic 14.1 (Computational), Epic 04 (Convergence), Epic 09 (Bedrock)  
**Platform Version:** FORGE B-D 1.0

---

## Executive Summary

Epic 14.2 extends the validation pipeline with semantic accuracy verification, including source citation validation, cross-reference checking, and extended thinking validation using Claude's reasoning capabilities via Amazon Bedrock.

---

## Technology Stack

| Component | Technology | P(Right) | Status | Notes |
|-----------|------------|----------|--------|-------|
| Citations Validator | Custom + Search API | 0.85 | 🔄 In Progress | Web verification |
| Semantic Analyzer | Claude 3.5 Sonnet | 0.90 | 🔄 In Progress | Via Bedrock |
| Cross-Reference | Internal consistency | 0.95 | ⏳ Planned | Document analysis |
| Extended Thinking | Claude reasoning | 0.95 | ⏳ Planned | Chain-of-thought |

---

## Phase Status

### Phase 1: Citations Validator 🔄 IN PROGRESS

| Task | Status | Description |
|------|--------|-------------|
| 1.1 Citation extractor | ✅ Done | Extract citation markers from text |
| 1.2 Source resolver | 🔄 In Progress | Resolve citation to actual sources |
| 1.3 Content verifier | ⏳ Planned | Verify cited content matches source |
| 1.4 Confidence scoring | ⏳ Planned | Score citation reliability |

### Phase 2: Semantic Analyzer ⏳ PLANNED

| Task | Status | Description |
|------|--------|-------------|
| 2.1 Bedrock integration | ⏳ Planned | Connect to Claude via Bedrock |
| 2.2 Semantic prompts | ⏳ Planned | Validation prompt templates |
| 2.3 Fact extraction | ⏳ Planned | Extract verifiable facts |
| 2.4 Consistency check | ⏳ Planned | Internal logical consistency |

### Phase 3: Extended Thinking ⏳ PLANNED

| Task | Status | Description |
|------|--------|-------------|
| 3.1 Reasoning traces | ⏳ Planned | Capture reasoning steps |
| 3.2 Step validation | ⏳ Planned | Validate each reasoning step |
| 3.3 Conclusion verify | ⏳ Planned | Verify conclusion follows premises |
| 3.4 Confidence calibration | ⏳ Planned | Calibrate confidence scores |

---

## Architecture

### Integration with Epic 09 (Bedrock)

```typescript
import { BedrockRuntime } from '@aws-sdk/client-bedrock-runtime';

// Using Bedrock module from Epic 09 infrastructure
const semanticValidator = new SemanticValidator({
  // Bedrock configuration from infrastructure
  region: process.env.AWS_REGION,
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  
  // IRSA role from mcp-iam module
  roleArn: process.env.SEMANTIC_VALIDATOR_ROLE_ARN,
  
  // Validation settings
  maxTokens: 4096,
  temperature: 0.1,  // Low temperature for consistency
});
```

### Citations Validation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEMANTIC VALIDATION PIPELINE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input Text                                                      │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────┐                                                 │
│  │  Citation   │──► Extract [1], [2], (Smith 2023) markers      │
│  │  Extractor  │                                                 │
│  └──────┬──────┘                                                 │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                 │
│  │   Source    │──► Resolve to URLs, DOIs, documents            │
│  │  Resolver   │                                                 │
│  └──────┬──────┘                                                 │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                 │
│  │  Content    │──► Fetch source, verify quoted content         │
│  │  Verifier   │                                                 │
│  └──────┬──────┘                                                 │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                 │
│  │ Confidence  │──► Score: {match: 0.95, source: 0.8, ...}      │
│  │   Scorer    │                                                 │
│  └─────────────┘                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Planned File Structure

```
validators/
└── semantic/
    ├── index.ts                    # Barrel exports
    ├── semantic-validator.ts       # Main validator
    ├── citations/
    │   ├── citation-extractor.ts   # Extract citations
    │   ├── source-resolver.ts      # Resolve to sources
    │   ├── content-verifier.ts     # Verify content
    │   └── patterns.ts             # Citation patterns
    ├── analyzer/
    │   ├── bedrock-client.ts       # Bedrock integration
    │   ├── fact-extractor.ts       # Extract facts
    │   ├── consistency-checker.ts  # Check consistency
    │   └── prompts.ts              # Validation prompts
    ├── extended-thinking/
    │   ├── reasoning-tracer.ts     # Capture reasoning
    │   ├── step-validator.ts       # Validate steps
    │   └── conclusion-verifier.ts  # Verify conclusions
    └── types.ts                    # Type definitions
```

---

## Integration with Existing Pipeline

### With Computational Validator (Epic 14.1)

```typescript
// Combined validation pipeline
const validationPipeline = new ValidationPipeline([
  {
    name: 'computational',
    validator: computationalValidator,
    weight: 0.40,
  },
  {
    name: 'semantic',
    validator: semanticValidator,
    weight: 0.35,
  },
  {
    name: 'citations',
    validator: citationsValidator,
    weight: 0.25,
  },
]);

const result = await validationPipeline.validate(agentOutput);
// { 
//   computationalScore: 0.98,
//   semanticScore: 0.85,
//   citationsScore: 0.90,
//   totalScore: 0.91,
// }
```

### With Convergence Engine (Epic 04)

```typescript
convergenceEngine.registerValidator({
  name: 'semantic',
  validator: semanticValidator,
  weight: 0.35,
  feedbackGenerator: (result) => ({
    type: 'semantic',
    suggestions: [
      ...result.unverifiedCitations.map(c => 
        `Verify citation: ${c.marker} - source could not be confirmed`
      ),
      ...result.inconsistencies.map(i =>
        `Logical inconsistency: "${i.statement1}" conflicts with "${i.statement2}"`
      ),
    ],
  }),
});
```

### With Evidence Packs (Epic 08)

```typescript
evidencePack.addSemanticValidation({
  citations: {
    total: result.citations.length,
    verified: result.verifiedCitations.length,
    unverified: result.unverifiedCitations.length,
    score: result.citationsScore,
  },
  consistency: {
    checks: result.consistencyChecks,
    passed: result.consistencyPassed,
    score: result.consistencyScore,
  },
  reasoning: {
    steps: result.reasoningSteps,
    validSteps: result.validSteps,
    score: result.reasoningScore,
  },
});
```

---

## Bedrock Configuration (Epic 09)

### IAM Role Requirements

```hcl
# From mcp-iam module - semantic validator role
resource "aws_iam_role" "semantic_validator" {
  name = "${var.name}-semantic-validator"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = var.oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${var.oidc_provider_url}:sub" = "system:serviceaccount:forge:semantic-validator"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "semantic_validator_bedrock" {
  name = "bedrock-invoke"
  role = aws_iam_role.semantic_validator.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ]
      Resource = [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet*"
      ]
    }]
  })
}
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: semantic-validator
  namespace: forge
spec:
  replicas: 2
  template:
    spec:
      serviceAccountName: semantic-validator
      containers:
      - name: validator
        image: ${ECR_REGISTRY}/forge-semantic-validator:latest
        env:
        - name: AWS_REGION
          value: us-west-2
        - name: BEDROCK_MODEL_ID
          value: anthropic.claude-3-5-sonnet-20241022-v2:0
        - name: VALIDATION_MODE
          value: semantic
```

---

## Citation Patterns

### Supported Formats

| Format | Pattern | Example |
|--------|---------|---------|
| Numeric | `[n]` | `[1]`, `[2]`, `[15]` |
| Author-Year | `(Author YYYY)` | `(Smith 2023)`, `(Jones et al. 2022)` |
| Footnote | `^n` | `^1`, `^2` |
| Inline | `According to...` | `According to the DOD manual...` |
| URL | `http(s)://...` | `https://example.com` |
| DOI | `doi:...` | `doi:10.1000/xyz123` |

### Extraction Regex

```typescript
const citationPatterns = {
  numeric: /\[(\d+)\]/g,
  authorYear: /\(([A-Z][a-z]+(?:\s+et\s+al\.?)?\s+\d{4})\)/g,
  footnote: /\^(\d+)/g,
  url: /https?:\/\/[^\s\])"']+/g,
  doi: /doi:\s*([^\s]+)/gi,
};
```

---

## Metrics & Monitoring

### Prometheus Metrics

```typescript
semantic_validations_total{status="success|failure",type="citations|consistency|reasoning"}
semantic_validation_duration_seconds{type="citations|consistency|reasoning"}
semantic_citations_verified_total
semantic_citations_unverified_total
semantic_bedrock_calls_total{status="success|failure"}
semantic_bedrock_tokens_total{direction="input|output"}
```

### CloudWatch Dashboard

| Widget | Metric | Threshold |
|--------|--------|-----------|
| Citation Verification Rate | verified / total | > 80% |
| Semantic Validation Latency | p99 | < 5s |
| Bedrock Token Usage | Daily tokens | Alert > 100K |
| Consistency Score | Average | > 0.9 |

---

## Cost Projections

| Component | Unit Cost | Est. Monthly | Notes |
|-----------|-----------|--------------|-------|
| Bedrock (Sonnet) | $0.003/1K tokens | $50-150 | Main cost driver |
| Search API | $0.001/query | $10-30 | Citation verification |
| Total | | $60-180 | Production estimate |

### Cost Optimization

1. **Caching** - Cache citation verifications (24h TTL)
2. **Batching** - Batch Bedrock calls where possible
3. **Tiering** - Use Haiku for simple checks, Sonnet for complex
4. **Short-circuit** - Skip semantic if computational fails badly

---

## Timeline

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Citations Extractor | 2026-01-25 | ✅ Complete |
| Source Resolver | 2026-01-30 | 🔄 In Progress |
| Content Verifier | 2026-02-05 | ⏳ Planned |
| Bedrock Integration | 2026-02-10 | ⏳ Planned |
| Semantic Analyzer | 2026-02-15 | ⏳ Planned |
| Extended Thinking | 2026-02-25 | ⏳ Planned |
| Full Integration | 2026-03-01 | ⏳ Planned |

---

## Dependencies

### Required (Complete ✅)

- [x] Epic 14.1 - Computational Accuracy
- [x] Epic 04 - Convergence Engine
- [x] Epic 08 - Evidence Packs
- [x] Epic 09 - Bedrock Infrastructure
- [x] Epic 12 - E2E Tests

### Optional (For Enhancement)

- [ ] Web Search API - Enhanced citation verification
- [ ] Document Store - Internal document citations
- [ ] Knowledge Graph - Entity relationship validation

---

## References

- [Epic 14.1: Computational Accuracy](./EPIC-14.1-computational-accuracy.md)
- [Epic 09: Cloud Deployment](../../infrastructure/README.md)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude API Reference](https://docs.anthropic.com/claude/reference)
