# 05_CONVERGENCE_ENGINE

> **Version:** 1.1.0 | **Status:** Active | **Last Updated:** 2026-01-18

---

## 1. Component Summary

**What it is:** The orchestration layer that manages the generate → validate → repair loop until output meets all success criteria or budget is exhausted. Controls iteration budget, detects convergence/stagnation, and produces final artifacts.

**Why it exists:** LLM outputs rarely meet all criteria on first attempt. The Convergence Engine implements systematic refinement with budget controls, ensuring reliable convergence without runaway costs.

**Boundaries:**
- IN SCOPE: Iteration orchestration, budget management, stopping conditions, repair prompt generation, score tracking
- OUT OF SCOPE: Actual generation (LLM call), validation logic (Layers 1-3), evidence packaging (see 06)

**Non-Goals:**
- Does not generate content directly (orchestrates generator agent)
- Does not validate directly (delegates to validators)
- Does not persist history beyond current task (stateless between tasks)

---

## 2. Success Criteria

| ID | Criterion | Testable By |
|----|-----------|-------------|
| CE-01 | Engine MUST enforce max_iterations limit from contract | Iteration count test |
| CE-02 | Engine MUST enforce max_tokens budget from contract | Token budget test |
| CE-03 | Engine MUST stop when target_score achieved | Success stop test |
| CE-04 | Engine MUST detect stagnation (no_progress_threshold) and stop early | Stagnation test |
| CE-05 | Engine MUST run all three validation layers in order (1→2→3) | Layer sequence test |
| CE-06 | Engine MUST skip Layer 2-3 if Layer 1 fails | Early termination test |
| CE-07 | Engine MUST generate repair prompts from validation failures | Repair prompt test |
| CE-08 | Engine MUST track iteration history with scores | History capture test |
| CE-09 | Engine MUST compute weighted overall score per contract weights | Score calculation test |
| CE-10 | Engine MUST complete typical convergence in <2 minutes | Performance test |
| CE-11 | Engine MUST require explicit reflection before repair attempts | Reflection test |

---

## 3. Acceptance Tests / Completion Checks

### CE-01: Max iterations enforced

| Aspect | Detail |
|--------|--------|
| **How to verify** | Configure max_iterations=3, verify engine stops after 3 iterations regardless of score |
| **Automated** | Yes - iteration counter test |
| **Evidence** | Log showing exactly 3 iterations, then budget exhaustion |
| **Pass/Fail** | PASS if stops at max; FAIL if exceeds |

### CE-02: Max tokens budget enforced

| Aspect | Detail |
|--------|--------|
| **How to verify** | Configure max_tokens=10000, track cumulative tokens, verify stop when exceeded |
| **Automated** | Yes - token counter test |
| **Evidence** | Token log showing stop at or before 10000 |
| **Pass/Fail** | PASS if stops at budget; FAIL if exceeds significantly (>10% grace) |

### CE-03: Target score triggers success

| Aspect | Detail |
|--------|--------|
| **How to verify** | Configure target_score=0.90, mock validators to return 0.91 on iteration 2 |
| **Automated** | Yes - mock validator test |
| **Evidence** | Engine stops at iteration 2 with success status |
| **Pass/Fail** | PASS if stops on success; FAIL if continues unnecessarily |

### CE-04: Stagnation detection

| Aspect | Detail |
|--------|--------|
| **How to verify** | Configure no_progress_threshold=2, mock same failures 2 iterations |
| **Automated** | Yes - mock repeat failure test |
| **Evidence** | Engine stops with stagnation status after detecting repeat |
| **Pass/Fail** | PASS if stops on stagnation; FAIL if continues indefinitely |

### CE-05: Layer execution order

| Aspect | Detail |
|--------|--------|
| **How to verify** | Instrument validators, verify call order: structural → semantic → qualitative |
| **Automated** | Yes - call sequence verification |
| **Evidence** | Ordered call log |
| **Pass/Fail** | PASS if order correct; FAIL if out of order |

### CE-06: Early termination on Layer 1 failure

| Aspect | Detail |
|--------|--------|
| **How to verify** | Mock structural validator to fail, verify Layer 2-3 not called |
| **Automated** | Yes - mock test |
| **Evidence** | Call log showing only structural validator called |
| **Pass/Fail** | PASS if Layer 2-3 skipped; FAIL if called despite Layer 1 failure |

### CE-07: Repair prompt generation

| Aspect | Detail |
|--------|--------|
| **How to verify** | After validation failure, verify repair prompt contains specific errors |
| **Automated** | Yes - prompt content check |
| **Evidence** | Repair prompt listing validation errors with fix instructions |
| **Pass/Fail** | PASS if errors in prompt; FAIL if generic prompt |

### CE-08: Iteration history tracking

| Aspect | Detail |
|--------|--------|
| **How to verify** | Run 3 iterations, verify history contains all 3 with scores |
| **Automated** | Yes - history structure check |
| **Evidence** | History array with 3 entries, each with scores |
| **Pass/Fail** | PASS if complete history; FAIL if any iteration missing |

### CE-09: Weighted score calculation

| Aspect | Detail |
|--------|--------|
| **How to verify** | Mock layer scores, verify overall = structural×w1 + semantic×w2 + qualitative×w3 |
| **Automated** | Yes - arithmetic verification |
| **Evidence** | Calculation trace showing correct weighting |
| **Pass/Fail** | PASS if calculation correct; FAIL if mismatch |

### CE-10: Convergence time <2 minutes

| Aspect | Detail |
|--------|--------|
| **How to verify** | Run 100 typical convergence tasks, check P95 < 120s |
| **Automated** | Yes - performance test |
| **Evidence** | Timing histogram with P95 marked |
| **Pass/Fail** | PASS if P95 < 120s; FAIL otherwise |

### CE-11: Explicit reflection before repair

| Aspect | Detail |
|--------|--------|
| **How to verify** | Verify repair prompt includes reflection questions; verify LLM response contains analysis before fix |
| **Automated** | Yes - prompt content check + response structure check |
| **Evidence** | Repair prompt contains "Before fixing, analyze:" section; response has analysis before corrected output |
| **Pass/Fail** | PASS if reflection present; FAIL if direct fix without analysis |

---

## 4. Telemetry & Metrics

| Metric | Type | Target | Collection Method |
|--------|------|--------|-------------------|
| `convergence.iterations_used` | Histogram | Avg ≤ 3.0 | Count per task |
| `convergence.tokens_used` | Histogram | Avg ≤ 60% budget | Sum per task |
| `convergence.success_rate` | Gauge | ≥ 95% | success_count / total |
| `convergence.first_pass_rate` | Gauge | ≥ 40% | success_on_iter_1 / total |
| `convergence.stagnation_rate` | Gauge | ≤ 5% | stagnation_stops / total |
| `convergence.timeout_rate` | Gauge | ≤ 5% | budget_exhaustion / total |
| `convergence.total_time_ms` | Histogram | P95 < 120s | Timer around converge() |
| `convergence.reflection_improvement_rate` | Gauge | ≥ 70% | improved_iterations / total_iterations |
| `convergence.thrashing_rate` | Gauge | ≤ 20% | no_improvement_iterations / total_iterations |

---

## 5. Security / Compliance Notes

| Control | Implementation |
|---------|----------------|
| **Budget enforcement** | Hard limits on iterations and tokens; no bypass |
| **Timeout protection** | Overall task timeout (5 min default) prevents runaway |
| **Audit trail** | All iterations logged with timestamps for compliance |
| **No data retention** | Engine is stateless; history passed to Evidence Pack |
| **NIST AI RMF** | Iteration limits align with resource management requirements |
| **SOC 2** | Audit logging provides change management evidence |

---

## 6. Dependencies & Interfaces

### Depends On

| Component | Dependency Type | Interface |
|-----------|-----------------|-----------|
| Answer Contract (01) | Configuration | Convergence parameters |
| Structural Validation (02) | Runtime | `validate_structural(output) -> Result` |
| Semantic Validation (03) | Runtime | `validate_semantic(output) -> Result` |
| Qualitative Validation (04) | Runtime | `validate_qualitative(output) -> Result` |
| Generator Agent | Runtime | `generate(prompt) -> output` |
| Repairer Agent | Runtime | `repair(output, errors) -> prompt` |

### Produces

| Output | Consumer | Format |
|--------|----------|--------|
| Final Output | Caller | Validated artifact |
| Iteration History | Evidence Pack (06) | `IterationHistory[]` |
| Convergence Status | Observability (11) | Success/Stagnation/Timeout |

### Input Schema

```yaml
# ConvergenceEngine.converge() input
task: object                # Original task/requirements
contract: Contract          # Loaded Answer Contract
generator: GeneratorAgent   # Agent for output generation
initial_output: object (optional)  # Skip first generation if provided
```

### Output Schema

```yaml
# ConvergenceResult
status: enum (SUCCESS | STAGNATION | BUDGET_EXHAUSTED | TIMEOUT)
final_output: object        # Last generated output
final_score: number         # Overall weighted score (0.0-1.0)
passed: boolean             # Met target_score
iterations_used: integer
tokens_used: integer
total_time_ms: integer
iteration_history:
  - iteration: integer
    output_hash: string     # SHA256 of output (not full output)
    scores:
      structural: number
      semantic: number
      qualitative: number
      overall: number
    errors: Error[]
    repair_prompt: string (optional)
    timestamp: ISO8601
```

---

## 7. Implementation Notes

### Build Order

1. Implement `ConvergenceEngine` class with basic loop
2. Implement budget tracking (iterations, tokens)
3. Implement stopping condition detection
4. Implement repair prompt generation
5. Implement iteration history capture
6. Implement score aggregation
7. Add performance benchmarks
8. Add stagnation detection

### Recommended Modules

```
src/forge/engine/
├── __init__.py
├── convergence.py        # ConvergenceEngine class
├── result.py             # ConvergenceResult model
├── budget.py             # Budget tracking and enforcement
├── repair.py             # Repair prompt generation
├── history.py            # Iteration history tracking
└── stopping.py           # Stopping condition detection
```

### Convergence Loop Pseudocode

```python
def converge(task, contract, generator):
    history = []
    budget = Budget(contract.convergence)
    output = None
    
    for iteration in range(1, contract.convergence.max_iterations + 1):
        # Generate (or use initial on iter 1)
        if output is None:
            output = generator.generate(task)
        
        budget.track_tokens(output)
        if budget.exhausted:
            return ConvergenceResult(status=BUDGET_EXHAUSTED, ...)
        
        # Validate Layer 1
        structural = validate_structural(output, contract)
        if not structural.passed:
            errors = structural.errors
            history.append(IterationRecord(iteration, output, structural.score, errors))
            output = generator.repair(output, errors)
            continue
        
        # Validate Layer 2
        semantic = validate_semantic(output, contract)
        if not semantic.passed:
            errors = semantic.errors
            history.append(IterationRecord(...))
            output = generator.repair(output, errors)
            continue
        
        # Validate Layer 3
        qualitative = validate_qualitative(output, contract)
        
        # Calculate overall score
        overall = (
            structural.score * contract.scoring.structural +
            semantic.score * contract.scoring.semantic +
            qualitative.score * contract.scoring.qualitative
        )
        
        history.append(IterationRecord(...))
        
        # Check success
        if overall >= contract.convergence.target_score:
            return ConvergenceResult(status=SUCCESS, final_output=output, ...)
        
        # Check stagnation
        if detect_stagnation(history, contract.convergence.no_progress_threshold):
            return ConvergenceResult(status=STAGNATION, ...)
        
        # Repair and continue
        output = generator.repair(output, qualitative.errors)
    
    return ConvergenceResult(status=BUDGET_EXHAUSTED, ...)
```

### Pitfalls to Avoid

- **Don't skip Layer 1 on later iterations** - Structure can break during repair
- **Don't ignore token budget** - Each generation consumes tokens
- **Don't repair without specific errors** - Generic "try again" prompts don't converge
- **Don't skip reflection (CE-11)** - Direct fixes without analysis cause thrashing
- **Don't store full outputs in history** - Use hashes; outputs can be large
- **Don't forget timeout** - Overall task timeout prevents infinite LLM waits

### Repair Prompt Template

```markdown
The previous output failed validation. Please fix the following issues:

## Validation Errors
{for error in errors}
### Error {error.index}: {error.type}
- **Location:** `{error.path}` (e.g., `$.stories[2].acceptance_criteria`)
- **Found:** {error.actual}
- **Expected:** {error.expected}
- **Contract Rule:** {error.contract_reference}
{endfor}

## Reflection (REQUIRED - CE-11)

Before attempting a fix, analyze each error:
1. What assumption did you make that was wrong?
2. What information were you missing?
3. What pattern should you follow instead?

## Instructions
1. Provide your analysis FIRST (2-3 sentences per error)
2. Then produce the complete corrected output
3. Preserve all valid parts of the output
4. Ensure the result still meets the original requirements:
   {original_task_summary}

## Previous Output (for reference)
{previous_output_truncated}
```

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-01-18 | Added CE-11 (explicit reflection), enhanced repair prompt template, added reflection metrics |
| 1.0.0 | 2026-01-17 | Initial specification |

---

*Reference: 00_MASTER_ROADMAP.md for framework context*
