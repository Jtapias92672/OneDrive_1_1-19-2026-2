# 08_RUBRIC_LIBRARY

> **Version:** 1.0.0 | **Status:** Active | **Last Updated:** 2026-01-17

---

## 1. Component Summary

**What it is:** Centralized repository of scoring rubrics for qualitative validation. Each rubric defines criteria, scoring anchors (1-5), examples, and pass thresholds for evaluating specific artifact types.

**Why it exists:** LLM-as-Judge requires consistent, calibrated rubrics. The Rubric Library provides reusable, versioned rubrics that can be referenced by Answer Contracts, ensuring consistent evaluation across all generations.

**Boundaries:**
- IN SCOPE: Rubric storage, retrieval, versioning, validation, calibration data
- OUT OF SCOPE: Rubric execution (see 04), rubric-to-prompt conversion (see 04)

**Non-Goals:**
- Does not execute evaluation (provides definitions only)
- Does not generate rubrics automatically (human-authored with AI assistance)
- Does not replace contract-level configuration (rubrics are referenced, not embedded)

---

## 2. Success Criteria

| ID | Criterion | Testable By |
|----|-----------|-------------|
| RL-01 | Rubrics MUST have unique IDs across the library | Uniqueness check |
| RL-02 | Rubrics MUST include criteria with 1-5 anchored scoring | Schema validation |
| RL-03 | Rubrics MUST include at least one example per extreme score (1, 5) | Example presence check |
| RL-04 | Rubrics MUST be versionable (semver) | Version format check |
| RL-05 | Rubrics MUST specify pass threshold per criterion | Threshold presence check |
| RL-06 | Rubrics MUST mark criteria as "essential" or "important" | Weight presence check |
| RL-07 | Rubric retrieval MUST complete in <10ms | Performance test |
| RL-08 | Library MUST prevent duplicate rubric IDs | Collision test |
| RL-09 | Rubrics MUST include calibration dataset reference (optional) | Schema validation |
| RL-10 | Library MUST support rubric search by artifact type | Search test |

---

## 3. Acceptance Tests / Completion Checks

### RL-01: Unique rubric IDs

| Aspect | Detail |
|--------|--------|
| **How to verify** | Enumerate all rubrics, check no duplicate IDs |
| **Automated** | Yes - ID uniqueness scan |
| **Evidence** | List of all rubric IDs with uniqueness confirmation |
| **Pass/Fail** | PASS if all unique; FAIL if duplicates |

### RL-02: 1-5 anchored scoring

| Aspect | Detail |
|--------|--------|
| **How to verify** | Each criterion must have anchors for scores 1-5 |
| **Automated** | Yes - schema validation |
| **Evidence** | All criteria have 5 anchor definitions |
| **Pass/Fail** | PASS if all anchors present; FAIL if any missing |

### RL-03: Extreme score examples

| Aspect | Detail |
|--------|--------|
| **How to verify** | Each criterion must have `examples.score_1` and `examples.score_5` |
| **Automated** | Yes - field presence check |
| **Evidence** | Examples present for scores 1 and 5 |
| **Pass/Fail** | PASS if both extremes have examples; FAIL otherwise |

### RL-04: Semver versioning

| Aspect | Detail |
|--------|--------|
| **How to verify** | `rubric.version` matches `^\d+\.\d+\.\d+$` |
| **Automated** | Yes - regex validation |
| **Evidence** | Valid semver string |
| **Pass/Fail** | PASS if valid semver; FAIL otherwise |

### RL-05: Pass threshold specified

| Aspect | Detail |
|--------|--------|
| **How to verify** | Each criterion must have `threshold` field (numeric 1.0-5.0) |
| **Automated** | Yes - field presence and range check |
| **Evidence** | All criteria have valid threshold |
| **Pass/Fail** | PASS if all thresholds valid; FAIL if any missing/invalid |

### RL-06: Essential/important weights

| Aspect | Detail |
|--------|--------|
| **How to verify** | Each criterion must have `weight` field in (essential, important) |
| **Automated** | Yes - enum validation |
| **Evidence** | All criteria have valid weight |
| **Pass/Fail** | PASS if all weights valid; FAIL if any missing |

### RL-07: Retrieval time <10ms

| Aspect | Detail |
|--------|--------|
| **How to verify** | Retrieve rubric 1000 times, measure P99 |
| **Automated** | Yes - benchmark test |
| **Evidence** | P99 < 10ms in timing report |
| **Pass/Fail** | PASS if P99 < 10ms; FAIL otherwise |

### RL-08: Duplicate ID prevention

| Aspect | Detail |
|--------|--------|
| **How to verify** | Attempt to add rubric with existing ID, verify rejection |
| **Automated** | Yes - collision test |
| **Evidence** | Error message indicating duplicate ID |
| **Pass/Fail** | PASS if rejected; FAIL if allowed |

### RL-09: Calibration dataset reference

| Aspect | Detail |
|--------|--------|
| **How to verify** | `calibration_dataset` field is optional but valid URI if present |
| **Automated** | Yes - schema validation |
| **Evidence** | Valid URI or absent field |
| **Pass/Fail** | PASS if valid or absent; FAIL if malformed |

### RL-10: Search by artifact type

| Aspect | Detail |
|--------|--------|
| **How to verify** | Search for "jira_tickets" returns relevant rubrics |
| **Automated** | Yes - search test |
| **Evidence** | Search results contain expected rubrics |
| **Pass/Fail** | PASS if relevant results; FAIL if no results or wrong results |

---

## 4. Telemetry & Metrics

| Metric | Type | Target | Collection Method |
|--------|------|--------|-------------------|
| `rubric.retrieval_time_ms` | Histogram | P99 < 10ms | Timer around get() |
| `rubric.total_count` | Gauge | Track | Count rubrics |
| `rubric.usage_count` | Counter per rubric | Track | Increment on retrieval |
| `rubric.calibration_correlation` | Gauge per rubric | ≥ 0.7 | Weekly calibration run |

---

## 5. Security / Compliance Notes

| Control | Implementation |
|---------|----------------|
| **Version control** | Rubrics stored in Git with change history |
| **Review required** | New rubrics require peer review before merge |
| **No runtime modification** | Rubrics are read-only at runtime |
| **Audit trail** | Rubric usage logged for compliance |
| **NIST AI RMF** | Documented rubrics support evaluation transparency |

---

## 6. Dependencies & Interfaces

### Depends On

| Component | Dependency Type | Interface |
|-----------|-----------------|-----------|
| Storage Backend | Infrastructure | Rubric file storage |
| Calibration System | Optional | Human-labeled calibration data |

### Produces

| Output | Consumer | Format |
|--------|----------|--------|
| Rubric | Qualitative Validation (04) | `Rubric` object |
| Rubric List | Answer Contract (01) | Available rubric IDs |

### Rubric Schema

```yaml
rubric_id: string (required, unique, e.g., "user_story_quality_v1")
name: string (required)
version: string (required, semver)
artifact_type: string (required, e.g., "jira_tickets", "test_plans", "prd")
description: string (optional)

criteria:
  - name: string (required)
    description: string (required)
    weight: enum (essential | important) (required)
    threshold: number (required, 1.0-5.0)
    anchors:
      1: string (required, worst case)
      2: string (required)
      3: string (required, acceptable)
      4: string (required)
      5: string (required, excellent)
    examples:
      score_1: string (required)
      score_3: string (optional)
      score_5: string (required)

negative_criteria:  # Patterns that should NOT appear
  - name: string
    description: string
    fail_patterns: string[] (regex patterns)

scoring:
  pass_threshold: number (overall minimum, e.g., 3.5)
  essential_minimum: number (essential criteria minimum, e.g., 3.0)

calibration_dataset: string (optional, URI to labeled examples)
```

---

## 7. Implementation Notes

### Build Order

1. Define rubric JSON schema
2. Implement `Rubric` model
3. Implement `RubricRepository` with file-based storage
4. Implement search by artifact type
5. Create initial rubrics (Jira, Test Plan, PRD)
6. Add calibration dataset support

### Recommended Modules

```
src/forge/rubrics/
├── __init__.py
├── models.py            # Rubric dataclass
├── repository.py        # Rubric storage and retrieval
├── search.py            # Search by artifact type
├── validation.py        # Rubric schema validation
└── calibration.py       # Calibration dataset loader
```

### Initial Rubrics to Implement

| Rubric ID | Artifact Type | Criteria Count |
|-----------|---------------|----------------|
| `user_story_quality_v1` | jira_tickets | 5 (clarity, specificity, scope, testability, independence) |
| `test_plan_quality_v1` | test_plans | 4 (coverage, reproducibility, completeness, isolation) |
| `prd_quality_v1` | prd | 5 (problem_definition, success_metrics, scope_boundaries, technical_feasibility, user_impact) |

### Example Rubric: User Story Quality

```yaml
rubric_id: "user_story_quality_v1"
name: "User Story Quality"
version: "1.0.0"
artifact_type: "jira_tickets"
description: "Evaluates quality of Jira user stories"

criteria:
  - name: "clarity"
    description: "The user story is clear and unambiguous"
    weight: "essential"
    threshold: 3.0
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

  - name: "testability"
    description: "QA can write test cases from acceptance criteria"
    weight: "essential"
    threshold: 3.5
    anchors:
      1: "No clear acceptance criteria"
      2: "Criteria exist but not testable"
      3: "Some criteria are testable"
      4: "Most criteria map to test cases"
      5: "All criteria directly map to test cases"
    examples:
      score_1: "System should work properly"
      score_5: "GIVEN user is on login page WHEN entering valid credentials THEN redirected to dashboard within 2 seconds"

negative_criteria:
  - name: "no_assumptions"
    description: "Story does not rely on unstated assumptions"
    fail_patterns: ["assume", "obvious", "standard approach"]
  - name: "no_vague_language"
    fail_patterns: ["etc.", "and so on", "various", "appropriate"]

scoring:
  pass_threshold: 3.5
  essential_minimum: 3.0
```

### Pitfalls to Avoid

- **Don't embed rubrics in contracts** - Always reference by ID
- **Don't skip examples** - LLM-Judge performs better with examples
- **Don't use vague anchors** - Each anchor must be specific and observable
- **Don't mix artifact types** - One rubric per artifact type
- **Don't skip calibration** - Uncalibrated rubrics drift over time

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-17 | Initial specification |

---

*Reference: 00_MASTER_ROADMAP.md for framework context*
