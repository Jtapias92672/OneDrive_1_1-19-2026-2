# 04_QUALITATIVE_VALIDATION

> **Version:** 1.0.0 | **Status:** Active | **Last Updated:** 2026-01-17

---

## 1. Component Summary

**What it is:** Layer 3 validation using LLM-as-Judge with structured rubrics to evaluate non-deterministic quality dimensions: actionability, completeness, accuracy, tone, and domain-specific criteria.

**Why it exists:** Many quality dimensions cannot be checked deterministically. "Is this user story actionable?" requires judgment. Layer 3 provides calibrated, reproducible quality scores using rubric-anchored LLM evaluation (G-Eval pattern).

**Boundaries:**
- IN SCOPE: Rubric-based LLM evaluation, score aggregation, confidence estimation, chain-of-thought reasoning capture
- OUT OF SCOPE: Structural checks (Layer 1), semantic checks (Layer 2), rubric authoring (see 08)

**Non-Goals:**
- Does not replace deterministic checks (use only after Layers 1-2 pass)
- Does not generate content (evaluation only)
- Does not provide binary pass/fail (provides scores with thresholds)

---

## 2. Success Criteria

| ID | Criterion | Testable By |
|----|-----------|-------------|
| QV-01 | Evaluator MUST use chain-of-thought before scoring (G-Eval pattern) | Output format check |
| QV-02 | Evaluator MUST return scores on 1-5 scale per rubric criterion | Score range check |
| QV-03 | Evaluator MUST achieve ≥0.7 correlation with human ratings on calibration set | Statistical test |
| QV-04 | Evaluator MUST complete evaluation in <30s for typical outputs | Performance test |
| QV-05 | Evaluator MUST produce confidence scores per criterion | Output format check |
| QV-06 | Evaluator MUST include reasoning trace for each score | Output format check |
| QV-07 | Evaluator MUST handle rubric criteria with examples (few-shot) | Example injection test |
| QV-08 | Evaluator MUST aggregate criterion scores into overall score | Aggregation test |
| QV-09 | Evaluator MUST flag "essential" criteria failures regardless of overall score | Essential criteria test |
| QV-10 | Evaluator MUST use temperature=0 for reproducibility | API parameter check |

---

## 3. Acceptance Tests / Completion Checks

### QV-01: Chain-of-thought before scoring

| Aspect | Detail |
|--------|--------|
| **How to verify** | Check evaluation output contains `reasoning` field populated before `score` |
| **Automated** | Yes - output structure validation |
| **Evidence** | Sample output showing reasoning → score sequence |
| **Pass/Fail** | PASS if reasoning precedes score; FAIL if score without reasoning |

### QV-02: 1-5 score scale

| Aspect | Detail |
|--------|--------|
| **How to verify** | All scores must be integers 1-5 (no decimals, no 0) |
| **Automated** | Yes - score range validation |
| **Evidence** | All criterion scores in [1, 2, 3, 4, 5] |
| **Pass/Fail** | PASS if all scores in range; FAIL if any out of range |

### QV-03: ≥0.7 correlation with human ratings

| Aspect | Detail |
|--------|--------|
| **How to verify** | Evaluate 100-item calibration set with human labels, compute Pearson correlation |
| **Automated** | Yes - statistical test |
| **Evidence** | Correlation coefficient ≥ 0.7 |
| **Pass/Fail** | PASS if r ≥ 0.7; FAIL otherwise |

### QV-04: Evaluation time <30s

| Aspect | Detail |
|--------|--------|
| **How to verify** | Time 100 evaluations, check P95 < 30s |
| **Automated** | Yes - performance test |
| **Evidence** | Timing histogram with P95 marked |
| **Pass/Fail** | PASS if P95 < 30s; FAIL otherwise |

### QV-05: Confidence scores per criterion

| Aspect | Detail |
|--------|--------|
| **How to verify** | Each criterion result must include `confidence` field 0.0-1.0 |
| **Automated** | Yes - output structure validation |
| **Evidence** | All criteria have confidence values |
| **Pass/Fail** | PASS if all criteria have confidence; FAIL if any missing |

### QV-06: Reasoning trace included

| Aspect | Detail |
|--------|--------|
| **How to verify** | Each criterion result must include non-empty `reasoning` field |
| **Automated** | Yes - output structure validation |
| **Evidence** | Sample reasoning traces |
| **Pass/Fail** | PASS if all criteria have reasoning; FAIL if any empty |

### QV-07: Few-shot example handling

| Aspect | Detail |
|--------|--------|
| **How to verify** | Rubric with examples must inject examples into evaluation prompt |
| **Automated** | Yes - prompt inspection |
| **Evidence** | Evaluation prompt containing rubric examples |
| **Pass/Fail** | PASS if examples present in prompt; FAIL if missing |

### QV-08: Score aggregation

| Aspect | Detail |
|--------|--------|
| **How to verify** | Overall score = weighted average of criterion scores |
| **Automated** | Yes - arithmetic verification |
| **Evidence** | Calculation showing weighted aggregation |
| **Pass/Fail** | PASS if aggregation correct; FAIL if mismatch |

### QV-09: Essential criteria flagging

| Aspect | Detail |
|--------|--------|
| **How to verify** | Output failing "essential" criterion must be flagged regardless of overall score |
| **Automated** | Yes - essential criteria test |
| **Evidence** | High overall score but `essential_failed: true` flag |
| **Pass/Fail** | PASS if essential failures flagged; FAIL if missed |

### QV-10: Temperature=0 for reproducibility

| Aspect | Detail |
|--------|--------|
| **How to verify** | Inspect LLM API call parameters |
| **Automated** | Yes - API mock inspection |
| **Evidence** | API call showing `temperature: 0` |
| **Pass/Fail** | PASS if temperature=0; FAIL otherwise |

---

## 4. Telemetry & Metrics

| Metric | Type | Target | Collection Method |
|--------|------|--------|-------------------|
| `qualitative.evaluation_time_ms` | Histogram | P95 < 30s | Timer around evaluate() |
| `qualitative.score_distribution` | Histogram | Track | Histogram of scores per criterion |
| `qualitative.essential_failure_rate` | Gauge | < 10% | essential_failures / total |
| `qualitative.llm_tokens_used` | Counter | Budget | Sum input + output tokens |
| `qualitative.correlation_drift` | Gauge | ≥ 0.7 | Weekly calibration check |
| `qualitative.confidence_distribution` | Histogram | Track | Confidence score distribution |

---

## 5. Security / Compliance Notes

| Control | Implementation |
|---------|----------------|
| **Data minimization** | Send only necessary content to LLM; redact PII first (see 09) |
| **No training** | Use enterprise LLM endpoint with no-training guarantee |
| **Audit logging** | Log evaluation requests/responses (redacted) for audit |
| **Rate limiting** | Respect LLM provider rate limits; queue if needed |
| **NIST AI RMF** | LLM-as-Judge aligns with AI system evaluation requirements |
| **Prompt injection defense** | Rubrics and evaluation prompts are system-controlled, not user-supplied |

---

## 6. Dependencies & Interfaces

### Depends On

| Component | Dependency Type | Interface |
|-----------|-----------------|-----------|
| Answer Contract (01) | Configuration | `contract.qualitative_checks[]` |
| Rubric Library (08) | Runtime | `get_rubric(rubric_id) -> Rubric` |
| Structural Validation (02) | Prerequisite | Layer 1 must pass |
| Semantic Validation (03) | Prerequisite | Layer 2 must pass |
| Data Protection (09) | Pre-processing | PII redaction before LLM call |
| LLM Provider | External | `llm.complete(prompt) -> response` |

### Produces

| Output | Consumer | Format |
|--------|----------|--------|
| Evaluation Result | Convergence Engine (05) | `QualitativeValidationResult` |
| Criterion Scores | Evidence Pack (06) | Score breakdown |
| Reasoning Traces | Human Review (12) | Explanation for scores |

### Input Schema

```yaml
# QualitativeValidator.evaluate() input
output: object              # Parsed, validated output (Layers 1-2 passed)
checks:
  - name: string
    rubric_id: string       # Reference to rubric in library
    threshold: number       # Minimum acceptable score (e.g., 3.5)
    weight: number          # Weight in overall score (optional)
```

### Output Schema

```yaml
# QualitativeValidationResult
passed: boolean             # Overall score >= target
overall_score: number       # Weighted average (1.0-5.0)
normalized_score: number    # Mapped to 0.0-1.0 for convergence
essential_failed: boolean   # Any essential criterion below minimum
criteria_results:
  - criterion_name: string
    score: integer (1-5)
    confidence: number (0.0-1.0)
    reasoning: string
    is_essential: boolean
    passed_threshold: boolean
evaluation_time_ms: integer
tokens_used:
  input: integer
  output: integer
llm_model: string           # Model used for evaluation
```

---

## 7. Implementation Notes

### Build Order

1. Implement LLM client wrapper with retry/timeout
2. Implement rubric-to-prompt compiler
3. Implement G-Eval pattern (CoT → Score)
4. Implement score parser and aggregator
5. Implement essential criteria logic
6. Add calibration testing infrastructure
7. Add performance benchmarks

### Recommended Modules

```
src/forge/validation/qualitative/
├── __init__.py
├── evaluator.py          # QualitativeValidator orchestrator
├── result.py             # QualitativeValidationResult model
├── prompt_compiler.py    # Rubric → evaluation prompt
├── score_parser.py       # Extract scores from LLM response
├── aggregator.py         # Weighted score aggregation
├── llm_client.py         # LLM API wrapper
└── calibration/
    ├── __init__.py
    ├── dataset.py        # Calibration dataset loader
    └── correlation.py    # Human correlation testing
```

### G-Eval Prompt Template

```markdown
You are evaluating the quality of a generated artifact against specific criteria.

## Artifact to Evaluate
{artifact_content}

## Evaluation Criteria: {criterion_name}
{criterion_description}

## Scoring Anchors
1 - {anchor_1}
2 - {anchor_2}
3 - {anchor_3}
4 - {anchor_4}
5 - {anchor_5}

## Examples (if available)
Score 1 example: {example_1}
Score 3 example: {example_3}
Score 5 example: {example_5}

## Instructions
1. First, analyze the artifact against this criterion step by step.
2. Consider both positive and negative aspects.
3. Then provide your score (1-5) and confidence (0.0-1.0).

## Response Format (JSON)
{
  "reasoning": "Your step-by-step analysis...",
  "score": <1-5>,
  "confidence": <0.0-1.0>
}
```

### Pitfalls to Avoid

- **Don't skip CoT** - Direct scoring without reasoning is less accurate
- **Don't use high temperature** - Reproducibility requires temperature=0
- **Don't ignore confidence** - Low confidence scores should trigger review
- **Don't evaluate before Layer 1-2** - Invalid structure corrupts evaluation
- **Don't hardcode rubrics** - Always load from Rubric Library
- **Don't skip calibration** - Correlation can drift; monitor regularly

### LLM Selection

| Provider | Model | Notes |
|----------|-------|-------|
| Anthropic | Claude 3.5 Sonnet | Recommended for evaluation |
| OpenAI | GPT-4 | Alternative |
| Self-hosted | Llama 3 70B | For sensitive data |

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-17 | Initial specification |

---

*Reference: 00_MASTER_ROADMAP.md for framework context*
