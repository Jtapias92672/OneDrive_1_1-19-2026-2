# FORGE: Success Criteria Framework & Prompt Engineering Guide

## A Comprehensive Plan for Agent-Driven Development Quality

---

## Part 1: The 2026 Reality - Why This Matters

The video you referenced highlights a critical insight: **"Properly defining success criteria is the primary skill for 2026."**

Coding has a built-in feedback loop (it compiles or it doesn't), but knowledge work—and by extension, most FORGE output types—exists in ambiguity. FORGE's entire value proposition depends on solving this ambiguity problem systematically.

### The Core Challenge

FORGE generates artifacts like:
- Jira ticket packs
- Test plans
- PRDs
- Runbooks
- Deployment manifests
- Security reviews

None of these "run or crash." They exist on a spectrum from "garbage" to "excellent," and FORGE must reliably converge toward "excellent" without human intervention.

### Key Terminology

| Term | Definition |
|------|------------|
| **Answer Contract** | Schema + validation rules + rubrics defining success for a specific output type |
| **Convergence** | Process of iteratively refining output until all validation layers pass |
| **Evidence Pack** | Audit artifact proving validation passed (scores, traces, iteration history) |
| **Reflection** | Pattern of analyzing failures before repair attempts (reduces thrashing) |
| **Thrashing** | Repeated repair iterations without score improvement |
| **First-Pass Rate** | % of outputs valid on first generation attempt |
| **Convergence Rate** | % of outputs that achieve target score within iteration budget |

---

## Part 2: Framework for Defining Success Criteria

### 2.1 The Three-Layer Validation Model

For every FORGE Answer Contract, define success across three layers:

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: STRUCTURAL (Deterministic)                        │
│  - Does it parse as valid JSON/YAML?                        │
│  - Are all required fields present?                         │
│  - Are field types correct?                                 │
│  - Are length/count constraints met?                        │
│  ✓ Can be checked programmatically with 100% accuracy       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: SEMANTIC (Deterministic where possible)           │
│  - Do references resolve? (file paths exist, IDs valid)     │
│  - Are internal cross-references consistent?                │
│  - Do numerical values fall within valid ranges?            │
│  - Are required sections complete (not placeholder text)?   │
│  - Do prohibited patterns NOT appear?                       │
│  ✓ Partially deterministic, some require heuristics         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: QUALITATIVE (LLM-Judge + Rubrics)                 │
│  - Is the content accurate/grounded?                        │
│  - Is the tone appropriate?                                 │
│  - Is it complete (covers all aspects of the task)?         │
│  - Is it actionable (can someone execute from it)?          │
│  ✓ Requires rubric-based LLM evaluation                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 The Answer Contract Specification

Every FORGE Answer Contract should include:

```yaml
# FORGE Answer Contract v1.0
name: "jira-ticket-pack"
version: "1.0.0"
description: "Generate a complete Jira ticket pack from requirements"

# LAYER 1: STRUCTURAL VALIDATION
schema:
  type: "json"
  path: "./schemas/jira-ticket-pack.json"
  strict: true  # Fail on additional properties

# Required sections (must be non-empty)
required_sections:
  - epic_summary
  - user_stories
  - acceptance_criteria
  - technical_notes

# Field constraints
constraints:
  user_stories:
    min_count: 3
    max_count: 20
  acceptance_criteria:
    min_per_story: 2
    max_per_story: 10
  story_points:
    valid_values: [1, 2, 3, 5, 8, 13, 21]

# LAYER 2: SEMANTIC VALIDATION
semantic_checks:
  - type: "no_placeholder_text"
    patterns: ["TBD", "TODO", "PLACEHOLDER", "[INSERT", "XXX"]
    fail_on_match: true
    
  - type: "internal_consistency"
    rule: "All story IDs in dependencies must exist in user_stories"
    
  - type: "completeness_check"
    rule: "Every user_story must have at least one acceptance_criterion"
    
  - type: "prohibited_patterns"
    patterns:
      - regex: "\\bassume\\b"
        message: "Don't assume - be explicit"
      - regex: "\\betc\\.?\\b"
        message: "Don't use 'etc' - be specific"

# LAYER 3: QUALITATIVE VALIDATION (LLM-Judge)
qualitative_checks:
  - name: "actionability"
    rubric: |
      Score 1-5 on how actionable each user story is:
      1: Vague, no clear definition of done
      2: Partially defined, missing key details
      3: Adequately defined, could be implemented
      4: Well-defined with clear scope and outcomes
      5: Excellent - developer could start immediately
    threshold: 3.5  # Average score must be >= 3.5
    
  - name: "completeness"
    rubric: |
      Does this ticket pack cover all aspects of the original requirement?
      - Missing major features: FAIL
      - Missing minor features: PARTIAL (score 3)
      - All features covered: PASS (score 5)
    threshold: 4.0
    
  - name: "testability"
    rubric: |
      Can QA write test cases from these acceptance criteria?
      1: Criteria are too vague to test
      3: Criteria are testable but require interpretation
      5: Criteria map directly to test cases
    threshold: 4.0

# STOPPING CONDITIONS
convergence:
  max_iterations: 5
  max_tokens: 50000
  target_score: 0.95  # Weighted average of all checks
  no_progress_threshold: 2  # Stop if same failures 2x in a row
  
# SCORING WEIGHTS
scoring:
  structural: 0.30  # 30% of total score
  semantic: 0.35    # 35% of total score
  qualitative: 0.35 # 35% of total score
```

---

## Part 3: Quantitative Success Metrics

### 3.1 Pass Rate Metrics

| Metric | Definition | Target | Measurement |
|--------|------------|--------|-------------|
| **First-Pass Rate** | % of outputs valid on first generation | ≥40% | Per contract type |
| **Convergence Rate** | % of outputs that converge within budget | ≥95% | Must be high |
| **Iteration Efficiency** | Average iterations to convergence | ≤3.0 | Lower is better |
| **Budget Utilization** | % of token budget used on average | ≤60% | Cost efficiency |
| **Timeout Rate** | % of tasks hitting max iterations | ≤5% | Reliability |
| **Reflection Improvement Rate** | % of iterations that improve score | ≥70% | Reflection effectiveness |
| **Thrashing Rate** | % of iterations with no improvement | ≤20% | Lower is better |

### 3.2 Latency Metrics

| Metric | Definition | Target | Notes |
|--------|------------|--------|-------|
| **P50 Latency** | Median time to convergence | ≤30s | For simple contracts |
| **P95 Latency** | 95th percentile time | ≤120s | Acceptable for complex |
| **P99 Latency** | 99th percentile time | ≤300s | Hard ceiling |

### 3.3 Quality Metrics (from LLM-Judge)

| Metric | Definition | Target |
|--------|------------|--------|
| **Actionability Score** | Can someone execute from this output? | ≥4.0/5.0 |
| **Completeness Score** | Does it cover all requirements? | ≥4.0/5.0 |
| **Accuracy Score** | Is the content factually correct? | ≥4.5/5.0 |
| **Consistency Score** | Is it internally consistent? | ≥4.5/5.0 |

---

## Part 4: Qualitative Rubrics for Non-Coding Tasks

### 4.1 The Rubric Design Framework

Based on research (G-Eval, RULERS, Prometheus), effective rubrics share these properties:

1. **Question-Specific > Generic** - Rubrics tailored to the exact task outperform generic ones
2. **Concrete Anchors** - Each score level has specific, observable criteria
3. **Positive + Negative Criteria** - Include what TO do and what NOT to do
4. **Essential vs. Important Weights** - Not all criteria are equally important

### 4.2 Example Rubric: Jira User Story Quality

```yaml
rubric_name: "user_story_quality"
version: "1.0.0"
scale: 1-5

criteria:
  - name: "clarity"
    weight: "essential"  # Must pass
    description: "The user story is clear and unambiguous"
    anchors:
      1: "Vague language, unclear who/what/why"
      2: "Partially clear but missing key context"
      3: "Understandable but could be misinterpreted"
      4: "Clear to most readers"
      5: "Crystal clear, no ambiguity possible"
    examples:
      score_1: "Make the system better"
      score_3: "User can login to the system"
      score_5: "As a registered user, I can login with email/password so that I can access my account dashboard"

  - name: "specificity"
    weight: "essential"
    description: "The story has specific, measurable outcomes"
    anchors:
      1: "No measurable outcomes"
      2: "Vague outcomes ('improve', 'enhance')"
      3: "Some measurable elements"
      4: "Mostly measurable"
      5: "All outcomes are specific and measurable"
    
  - name: "scope"
    weight: "important"
    description: "The story is appropriately sized"
    anchors:
      1: "Epic-sized, needs decomposition"
      2: "Large, probably needs splitting"
      3: "Reasonable size for a sprint"
      4: "Well-scoped, 1-3 days of work"
      5: "Perfectly scoped, clear boundaries"

  - name: "testability"
    weight: "essential"
    description: "QA can write test cases from acceptance criteria"
    anchors:
      1: "No clear acceptance criteria"
      2: "Criteria exist but not testable"
      3: "Some criteria are testable"
      4: "Most criteria map to test cases"
      5: "All criteria directly map to test cases"

negative_criteria:
  - name: "no_assumptions"
    description: "Story does not rely on unstated assumptions"
    fail_patterns:
      - "assume"
      - "obvious"
      - "standard approach"
    
  - name: "no_vague_language"
    fail_patterns:
      - "etc."
      - "and so on"
      - "various"
      - "appropriate"
      - "as needed"

scoring:
  pass_threshold: 3.5
  essential_minimum: 3.0  # Essential criteria must score ≥3
```

### 4.3 Rubric Templates by Artifact Type

#### Test Plan Rubric
```yaml
criteria:
  - name: "coverage"
    description: "Test plan covers all requirements"
    anchors:
      1: "Major gaps in coverage"
      3: "Core paths covered, edge cases missing"
      5: "Comprehensive coverage including edge cases"
      
  - name: "reproducibility"
    description: "Tests can be executed independently"
    anchors:
      1: "Tests depend on undocumented state"
      3: "Most tests are reproducible"
      5: "All tests have explicit preconditions and can run in any order"
```

#### PRD Rubric
```yaml
criteria:
  - name: "problem_definition"
    description: "The problem being solved is clearly articulated"
    
  - name: "success_metrics"
    description: "Measurable success criteria are defined"
    
  - name: "scope_boundaries"
    description: "What's in/out of scope is explicit"
    
  - name: "technical_feasibility"
    description: "Technical constraints are acknowledged"
```

---

## Part 5: Permanent Rules (CLAUDE.md / FORGE.md Pattern)

### 5.1 The Rule Accumulation Pattern

Based on Claude Code best practices, FORGE should maintain a **FORGE.md** file that accumulates rules from failures:

```markdown
# FORGE.md - Permanent Rules

## Core Principles
- All outputs must be valid JSON/YAML before any other validation
- Never generate placeholder text (TBD, TODO, etc.)
- Every reference must resolve (IDs, file paths, etc.)

## Learned Rules (Updated after each failure mode)

### 2025-01-15: Jira Ticket Failures
- RULE: Every user story MUST have "As a [role], I [action], so that [benefit]" format
- REASON: Stories without this format failed actionability checks 73% of the time
- ADDED BY: Failure analysis on 50 ticket pack generations

### 2025-01-16: Test Plan Failures
- RULE: Never use relative time references ("recently", "soon", "later")
- REASON: Caused reproducibility failures in 15% of test plans
- ADDED BY: Semantic validation failures

### 2025-01-17: PRD Failures
- RULE: Every PRD must include a "Non-Goals" section
- REASON: PRDs without explicit non-goals had 2.3x more scope creep incidents
- ADDED BY: Human feedback loop
```

### 5.2 Rule Categories

#### Category 1: Universal Rules (Apply to ALL contracts)
```yaml
universal_rules:
  - name: "no_placeholder_text"
    description: "Never generate placeholder text"
    patterns: ["TBD", "TODO", "PLACEHOLDER", "[INSERT", "XXX", "..."]
    enforcement: "block"  # Fail immediately
    
  - name: "valid_json"
    description: "All JSON must be syntactically valid"
    enforcement: "block"
    
  - name: "no_relative_time"
    description: "Never use relative time references"
    patterns: ["recently", "soon", "later", "in the future", "shortly"]
    replacement_guidance: "Use specific dates or 'TBD with explicit deadline'"
```

#### Category 2: Domain Rules (Apply to specific contract types)
```yaml
domain_rules:
  jira_tickets:
    - name: "user_story_format"
      description: "All user stories must follow As/I/So format"
      pattern: "^As a .+, I .+, so that .+"
      
    - name: "acceptance_criteria_testable"
      description: "Acceptance criteria must be verifiable"
      prohibited: ["should", "might", "could", "appropriate"]
      
  test_plans:
    - name: "explicit_preconditions"
      description: "Every test must list preconditions"
      required_field: "preconditions"
      
    - name: "deterministic_expected_results"
      description: "Expected results must be specific values"
      prohibited: ["approximately", "around", "roughly"]
```

#### Category 3: Negative Constraints (What NOT to do)
```yaml
negative_constraints:
  - name: "no_internal_jargon_external"
    context: "When generating customer-facing content"
    description: "Do not use internal jargon when responding to external clients"
    enforcement: "warn_and_fix"
    
  - name: "no_assumptions"
    description: "Do not make unstated assumptions"
    required_action: "If an assumption is necessary, state it explicitly"
    
  - name: "no_over_specification"
    description: "Do not over-specify implementation details in requirements"
    guidance: "Focus on WHAT, not HOW"
```

### 5.3 The Rule Feedback Loop

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FORGE generates output                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Validation fails (structural, semantic, or qualitative)  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Analyze failure mode:                                    │
│    - What pattern caused the failure?                       │
│    - Is this a recurring pattern?                           │
│    - Can a deterministic rule prevent it?                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. If deterministic rule possible:                          │
│    → Add to FORGE.md as permanent rule                      │
│    → Rule becomes part of validation pipeline               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. If qualitative issue:                                    │
│    → Refine rubric with specific anchor examples            │
│    → Add to generator prompt as guidance                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 6: Agent Orchestration Patterns

### 6.1 FORGE Convergence Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                        │
│  - Receives task + Answer Contract                          │
│  - Manages iteration budget                                 │
│  - Decides when to stop                                     │
│  - Produces evidence pack                                   │
└─────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│  GENERATOR  │    │  VALIDATOR      │    │  REPAIRER   │
│  AGENT      │    │  AGENT          │    │  AGENT      │
│             │    │                 │    │             │
│  Produces   │    │  - Structural   │    │  1. Reflect │
│  candidate  │    │  - Semantic     │    │     on WHY  │
│  output     │    │  - Qualitative  │    │  2. Then    │
│             │    │    (LLM-Judge)  │    │     repair  │
└─────────────┘    └─────────────────┘    └─────────────┘
```

### 6.2 Explicit Reflection Pattern (CE-11)

Before attempting repairs, the system MUST prompt explicit reflection:

```markdown
## Repair Prompt Template (with Reflection)

The previous output failed validation. Please fix the following issues:

### Validation Errors

{for error in errors}
#### Error {error.index}: {error.type}
- **Location:** `{error.path}` (e.g., `$.stories[2].acceptance_criteria`)
- **Found:** {error.actual}
- **Expected:** {error.expected}
- **Contract Rule:** {error.contract_reference}
{endfor}

### Reflection (REQUIRED)

Before attempting a fix, analyze each error:
1. What assumption did you make that was wrong?
2. What information were you missing?
3. What pattern should you follow instead?

### Instructions
1. Provide your analysis FIRST (2-3 sentences per error)
2. Then produce the complete corrected output
```

**Why Reflection Matters:**
> "Reflection is the gold standard for production AI systems." — Andrew Ng, 2024

Without explicit reflection, repair attempts often "thrash" (repeat the same mistakes). Requiring analysis before fixes reduces thrashing from ~40% to <20%.

### 6.3 Parallel Validation Pattern

For complex contracts, run validators in parallel:

```python
# Pseudo-code for parallel validation
async def validate_parallel(output, contract):
    # Run all validators concurrently
    results = await asyncio.gather(
        validate_structural(output, contract.schema),
        validate_semantic(output, contract.semantic_checks),
        validate_qualitative(output, contract.rubrics),
        return_exceptions=True
    )
    
    # Aggregate results
    return ValidationResult(
        structural=results[0],
        semantic=results[1],
        qualitative=results[2],
        overall_score=calculate_weighted_score(results, contract.scoring)
    )
```

### 6.4 Critic-Refiner Pattern (Maker-Checker)

For high-stakes outputs, use a separate critic agent:

```
┌─────────────┐         ┌─────────────┐
│  GENERATOR  │ ──────▶ │   CRITIC    │
│  (Maker)    │         │  (Checker)  │
└─────────────┘         └─────────────┘
       ▲                       │
       │                       │
       │    ┌─────────────┐    │
       └────│  REFINER    │◀───┘
            │             │
            │  Applies    │
            │  critique   │
            └─────────────┘
```

### 6.5 Feedback Loop Integration

```yaml
# Feedback loop configuration
feedback_loop:
  # On failure, extract learnings
  on_failure:
    - action: "analyze_failure_pattern"
      conditions:
        - same_failure_type >= 3  # Recurring failure
      outcome: "propose_new_rule"
      
    - action: "refine_rubric"
      conditions:
        - qualitative_score < threshold
        - specific_criterion_failed
      outcome: "add_anchor_example"
      
  # Human-in-the-loop for ambiguous cases
  human_review:
    trigger:
      - convergence_after_max_iterations
      - confidence_score < 0.7
    actions:
      - present_output_with_evidence
      - collect_human_feedback
      - update_rules_if_pattern
```

---

## Part 7: Data Protection Framework

### 7.1 The "New Training Data" Problem

Internal company data used with LLMs is effectively "the new training data" - it shapes outputs but must not leak to foundation model providers.

### 7.2 FORGE Data Protection Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA CLASSIFICATION                       │
│  - PUBLIC: Can be sent to any LLM                           │
│  - INTERNAL: Can be sent to enterprise LLM (no training)    │
│  - CONFIDENTIAL: Must be redacted or tokenized              │
│  - RESTRICTED: Cannot be processed by LLM                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PRIVACY FILTER                            │
│  Pre-prompt redaction:                                      │
│  - PII (emails, phones, SSNs)                               │
│  - API keys and secrets                                     │
│  - Internal identifiers                                     │
│  - Proprietary business terms                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LLM PROCESSING                            │
│  Enterprise deployment with:                                │
│  - No training on customer data                             │
│  - Data residency compliance                                │
│  - Audit logging                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    OUTPUT FILTER                             │
│  - Verify no leaked secrets in output                       │
│  - Restore tokenized values if needed                       │
│  - Log all data access for audit                            │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Data Protection Rules for FORGE

```yaml
data_protection:
  # Pre-processing
  input_filters:
    - type: "pii_redaction"
      patterns:
        - email: "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b"
        - phone: "\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b"
        - ssn: "\\b\\d{3}-\\d{2}-\\d{4}\\b"
      action: "tokenize"  # Replace with [REDACTED_EMAIL_1] etc.
      
    - type: "secret_detection"
      patterns:
        - api_key: "\\b[A-Za-z0-9]{32,}\\b"
        - aws_key: "AKIA[0-9A-Z]{16}"
      action: "block"  # Do not process, return error
      
  # Provider requirements
  llm_requirements:
    - no_training: true
    - data_residency: ["US", "EU"]  # Configurable
    - audit_logging: true
    - retention_period: "30d"
    
  # Output verification
  output_checks:
    - type: "secret_leak_detection"
      action: "fail_and_alert"
      
    - type: "pii_leak_detection"
      action: "redact_and_warn"
```

---

## Part 8: Implementation Roadmap

### Phase 1: Core Success Criteria (Weeks 1-4)

1. **Define JSON Schema for Answer Contracts**
   - Structural validation schema
   - Semantic check definitions
   - Rubric specification format

2. **Build Deterministic Validators**
   - JSON schema validator
   - Semantic pattern checker (regex, cross-reference)
   - Prohibited pattern detector

3. **Implement First Rubric**
   - Jira ticket quality rubric
   - LLM-judge integration (G-Eval pattern)
   - Score aggregation

### Phase 2: Feedback Loops (Weeks 5-8)

4. **Build FORGE.md Rule System**
   - Rule storage format
   - Rule application in generation
   - Rule learning from failures

5. **Implement Convergence Loop**
   - Generator → Validator → Repairer cycle
   - Budget enforcement
   - Stop condition detection

6. **Evidence Pack Generation**
   - Validation trace
   - Score breakdown
   - Iteration history

### Phase 3: Enterprise Features (Weeks 9-12)

7. **Data Protection Layer**
   - PII detection/redaction
   - Secret scanning
   - Audit logging

8. **Multi-Agent Orchestration**
   - Parallel validators
   - Critic-refiner pattern
   - Human-in-the-loop triggers

9. **Observability**
   - Pass rate dashboards
   - Failure mode analysis
   - Cost tracking

---

## Part 9: Key Research References

### Academic Papers
1. **G-Eval** (Liu et al., EMNLP 2023) - LLM-as-Judge with rubrics and CoT
2. **RULERS** - Locked rubrics with evidence-anchored scoring
3. **Prometheus** - Fine-tuned LLM for evaluation
4. **Rubrics as Rewards** - RL training with rubric-based rewards
5. **Lost in the Middle** (Liu et al., 2023) - LLM accuracy degrades after ~30K tokens

### Industry Best Practices
1. **Andrew Ng "Opportunities in AI"** (Stanford, 2024) - Agentic workflow patterns
   - Key insight: "An older model with agentic workflows outperforms a newer model used zero-shot"
   - Four patterns: Reflection, Tool Use, Planning, Multi-Agent
   - FORGE implements: Reflection (CE-11), Tool Use (Layers 1-2), Planning (task breakdown)
2. **Anthropic Claude Code** - CLAUDE.md pattern for persistent rules
3. **LangSmith** - Evaluation and tracing patterns
4. **Guardrails AI** - Validation hub architecture
5. **Monte Carlo** - LLM-as-Judge best practices

### Compliance Frameworks
1. **NIST AI RMF** - AI risk management
2. **NSA/CISA AI Data Security** (May 2025) - Federal guidance
3. **EU AI Act** (August 2025) - Regulatory requirements

---

## Part 10: Success Metrics for This Document

This guide succeeds if FORGE can:

1. **Define Success Clearly** - Every Answer Contract has measurable pass/fail criteria
2. **Validate Deterministically** - 80%+ of validation is deterministic (not LLM-judge)
3. **Learn from Failures** - Failed generations create new rules automatically
4. **Protect Data** - Zero PII/secret leaks in audit
5. **Converge Reliably** - 95%+ convergence rate within budget
6. **Produce Evidence** - Every output has a complete audit trail

---

*Document Version: 1.1.0*
*Updated: January 2026*
*Changes: Added CE-11 (explicit reflection), reflection metrics, Ng research foundation*
*For: FORGE B-D Platform Development*
