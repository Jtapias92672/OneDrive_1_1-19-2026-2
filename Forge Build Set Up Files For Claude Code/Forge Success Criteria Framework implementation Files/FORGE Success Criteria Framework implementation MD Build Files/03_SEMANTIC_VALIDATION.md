# 03_SEMANTIC_VALIDATION

> **Version:** 1.0.0 | **Status:** Active | **Last Updated:** 2026-01-17

---

## 1. Component Summary

**What it is:** Layer 2 validation that performs partially deterministic checks on output meaning. Validates cross-references resolve, prohibited patterns are absent, placeholder text is absent, and internal consistency is maintained.

**Why it exists:** Structural validity doesn't guarantee semantic validity. A JSON can be schema-compliant but contain "TBD" placeholders, broken references, or contradictory data. Layer 2 catches these issues deterministically where possible.

**Boundaries:**
- IN SCOPE: Reference resolution, placeholder detection, prohibited patterns, internal cross-references, completeness checks
- OUT OF SCOPE: Structural syntax (Layer 1), subjective quality (Layer 3)

**Non-Goals:**
- Does not validate JSON structure (see 02)
- Does not judge content quality (see 04)
- Does not make probabilistic assessments (deterministic only)

---

## 2. Success Criteria

| ID | Criterion | Testable By |
|----|-----------|-------------|
| SEM-01 | Validator MUST detect ALL placeholder patterns defined in contract | Pattern matching test |
| SEM-02 | Validator MUST resolve internal ID references (e.g., story_id in dependencies) | Reference resolution test |
| SEM-03 | Validator MUST detect prohibited regex patterns from contract | Regex test suite |
| SEM-04 | Validator MUST verify required sections are non-empty (not whitespace-only) | Completeness test |
| SEM-05 | Validator MUST complete checks in <100ms for typical outputs | Performance test |
| SEM-06 | Validator MUST report specific location of each violation | Error format test |
| SEM-07 | Validator MUST support custom check types via plugin architecture | Extensibility test |
| SEM-08 | Validator MUST NOT use LLM calls (deterministic only) | Code inspection |
| SEM-09 | Validator MUST handle circular references gracefully | Edge case test |
| SEM-10 | Validator MUST produce partial scores (e.g., 80% of checks passed) | Scoring test |

---

## 3. Acceptance Tests / Completion Checks

### SEM-01: Placeholder pattern detection

| Aspect | Detail |
|--------|--------|
| **How to verify** | Insert `TBD`, `TODO`, `[INSERT`, `XXX`, `PLACEHOLDER` in output, verify all detected |
| **Automated** | Yes - pattern injection test |
| **Evidence** | Validation result listing all 5 placeholder locations |
| **Pass/Fail** | PASS if all placeholders found; FAIL if any missed |

### SEM-02: Internal ID reference resolution

| Aspect | Detail |
|--------|--------|
| **How to verify** | Create output with valid refs + 2 broken refs, verify broken refs reported |
| **Automated** | Yes - reference validation test |
| **Evidence** | Error listing unresolved IDs with expected source |
| **Pass/Fail** | PASS if all broken refs detected; FAIL if any missed |

### SEM-03: Prohibited regex pattern detection

| Aspect | Detail |
|--------|--------|
| **How to verify** | Configure prohibited patterns (`\bassume\b`, `\betc\.?\b`), insert matches, verify detection |
| **Automated** | Yes - regex test suite |
| **Evidence** | Errors showing pattern match locations |
| **Pass/Fail** | PASS if all prohibited patterns caught; FAIL if any missed |

### SEM-04: Non-empty section verification

| Aspect | Detail |
|--------|--------|
| **How to verify** | Submit output with required sections containing only whitespace |
| **Automated** | Yes - completeness test |
| **Evidence** | Errors identifying empty/whitespace-only sections |
| **Pass/Fail** | PASS if whitespace-only treated as empty; FAIL otherwise |

### SEM-05: Validation time <100ms

| Aspect | Detail |
|--------|--------|
| **How to verify** | Run 1000 validations on typical output, measure P95 |
| **Automated** | Yes - benchmark test |
| **Evidence** | Timing report with P95 < 100ms |
| **Pass/Fail** | PASS if P95 < 100ms; FAIL otherwise |

### SEM-06: Specific violation locations

| Aspect | Detail |
|--------|--------|
| **How to verify** | Each error must include JSON path to violation |
| **Automated** | Yes - error format assertion |
| **Evidence** | All errors contain `path` field with valid JSON path |
| **Pass/Fail** | PASS if all errors have paths; FAIL if any missing |

### SEM-07: Plugin architecture for custom checks

| Aspect | Detail |
|--------|--------|
| **How to verify** | Register custom check type, verify it executes |
| **Automated** | Yes - plugin registration test |
| **Evidence** | Custom check result in validation output |
| **Pass/Fail** | PASS if custom check executes; FAIL if registration fails |

### SEM-08: No LLM calls

| Aspect | Detail |
|--------|--------|
| **How to verify** | Code review + network monitoring during validation |
| **Automated** | Partial - mock LLM endpoint, verify no calls |
| **Evidence** | Zero network calls to LLM endpoints |
| **Pass/Fail** | PASS if no LLM calls; FAIL if any detected |

### SEM-09: Circular reference handling

| Aspect | Detail |
|--------|--------|
| **How to verify** | Create output with A → B → C → A reference cycle |
| **Automated** | Yes - cycle detection test |
| **Evidence** | Graceful handling (error or cycle detection) without hang |
| **Pass/Fail** | PASS if completes in <1s with appropriate response; FAIL if hangs |

### SEM-10: Partial scoring

| Aspect | Detail |
|--------|--------|
| **How to verify** | Submit output failing 2 of 5 checks, verify score ~0.6 |
| **Automated** | Yes - scoring calculation test |
| **Evidence** | Score reflecting pass/fail ratio |
| **Pass/Fail** | PASS if score = passed_checks / total_checks; FAIL otherwise |

---

## 4. Telemetry & Metrics

| Metric | Type | Target | Collection Method |
|--------|------|--------|-------------------|
| `semantic.validation_time_ms` | Histogram | P95 < 100ms | Timer around validate() |
| `semantic.pass_rate` | Gauge | Track | passed_count / total_count |
| `semantic.check_type_failures` | Counter by type | Analysis | Increment per failure type |
| `semantic.placeholder_detections` | Counter | Minimize | Track placeholder patterns found |
| `semantic.reference_failures` | Counter | Minimize | Track broken references |

---

## 5. Security / Compliance Notes

| Control | Implementation |
|---------|----------------|
| **ReDoS prevention** | Timeout regex execution at 100ms; use RE2 where possible |
| **Pattern injection** | Patterns loaded from contract only, not user input |
| **No external calls** | All checks execute locally; no network I/O |
| **Audit logging** | Log check types executed and pass/fail per check |
| **NIST AI RMF** | Semantic checks support content validity requirements |

---

## 6. Dependencies & Interfaces

### Depends On

| Component | Dependency Type | Interface |
|-----------|-----------------|-----------|
| Answer Contract (01) | Configuration | `contract.semantic_checks[]` |
| Structural Validation (02) | Prerequisite | Must pass Layer 1 before Layer 2 |

### Produces

| Output | Consumer | Format |
|--------|----------|--------|
| Validation Result | Convergence Engine (05) | `SemanticValidationResult` |
| Violation Details | Repairer Agent | Structured error list |

### Input Schema

```yaml
# SemanticValidator.validate() input
output: object            # Parsed JSON (Layer 1 must pass first)
checks:
  - type: enum            # See supported types below
    config: object        # Type-specific configuration
```

### Supported Check Types

```yaml
check_types:
  no_placeholder_text:
    patterns: string[]    # Regex patterns to detect
    fail_on_match: boolean
    
  internal_consistency:
    source_path: string   # JSON path to reference source
    target_path: string   # JSON path where references must exist
    
  completeness_check:
    required_paths: string[]  # JSON paths that must have content
    min_length: integer       # Minimum non-whitespace chars
    
  prohibited_patterns:
    patterns:
      - regex: string
        message: string
        
  reference_resolution:
    ref_path: string      # Path to ID being referenced
    target_collection: string  # Path to collection where ID must exist
```

### Output Schema

```yaml
# SemanticValidationResult
passed: boolean
score: number (0.0-1.0)
checks_run: integer
checks_passed: integer
errors:
  - check_type: string
    path: string          # JSON path to violation
    message: string
    pattern_matched: string (optional)
    expected: any (optional)
    actual: any (optional)
validation_time_ms: integer
```

---

## 7. Implementation Notes

### Build Order

1. Implement base `SemanticCheck` interface
2. Implement `NoPlaceholderCheck` (most common)
3. Implement `ProhibitedPatternCheck`
4. Implement `InternalConsistencyCheck`
5. Implement `CompletenessCheck`
6. Implement `ReferenceResolutionCheck`
7. Add plugin registration system
8. Add performance benchmarks

### Recommended Modules

```
src/forge/validation/semantic/
├── __init__.py
├── validator.py          # SemanticValidator orchestrator
├── result.py             # SemanticValidationResult model
├── checks/
│   ├── __init__.py
│   ├── base.py           # SemanticCheck interface
│   ├── placeholder.py    # NoPlaceholderCheck
│   ├── prohibited.py     # ProhibitedPatternCheck
│   ├── consistency.py    # InternalConsistencyCheck
│   ├── completeness.py   # CompletenessCheck
│   └── reference.py      # ReferenceResolutionCheck
└── plugins/
    ├── __init__.py
    └── registry.py       # Custom check registration
```

### Pitfalls to Avoid

- **Don't run semantic before structural** - Parsing errors will cascade
- **Don't use unbounded regex** - Always timeout pattern matching
- **Don't ignore case sensitivity** - Configure explicitly per pattern
- **Don't cache across outputs** - Each validation must be fresh
- **Don't mix check types** - Keep each check single-purpose

### Common Placeholder Patterns

```yaml
# Standard placeholder patterns to include
default_placeholders:
  - "TBD"
  - "TODO"
  - "PLACEHOLDER"
  - "[INSERT"
  - "XXX"
  - "FIXME"
  - "\\.\\.\\."           # Literal "..."
  - "<<.*?>>"             # <<placeholder>>
  - "\\[\\[.*?\\]\\]"     # [[placeholder]]
```

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-17 | Initial specification |

---

*Reference: 00_MASTER_ROADMAP.md for framework context*
