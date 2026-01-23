# 02_STRUCTURAL_VALIDATION

> **Version:** 1.0.0 | **Status:** Active | **Last Updated:** 2026-01-17

---

## 1. Component Summary

**What it is:** Layer 1 validation that performs deterministic checks on output structure. Verifies JSON/YAML syntax, schema compliance, required fields, type correctness, and count/length constraints.

**Why it exists:** Structural validation is 100% deterministic and fast. It catches malformed outputs immediately before wasting tokens on semantic or qualitative checks.

**Boundaries:**
- IN SCOPE: Syntax validation, schema validation, type checking, cardinality constraints
- OUT OF SCOPE: Semantic meaning (see 03), quality judgment (see 04), content accuracy

**Non-Goals:**
- Does not interpret field values (only validates types/presence)
- Does not check cross-references between fields (Layer 2)
- Does not evaluate quality or correctness of content (Layer 3)

---

## 2. Success Criteria

| ID | Criterion | Testable By |
|----|-----------|-------------|
| SV-01 | Validator MUST parse valid JSON in <10ms for outputs up to 100KB | Performance test |
| SV-02 | Validator MUST reject invalid JSON with specific line/column error location | Error format check |
| SV-03 | Validator MUST validate against JSON Schema Draft 2020-12 | Schema compliance test |
| SV-04 | Validator MUST report ALL schema violations, not just first | Multi-error test |
| SV-05 | Validator MUST enforce `required` fields with specific missing field names | Required field test |
| SV-06 | Validator MUST enforce `minItems`/`maxItems` for arrays | Cardinality test |
| SV-07 | Validator MUST enforce `minLength`/`maxLength` for strings | Length constraint test |
| SV-08 | Validator MUST enforce `enum` constraints for restricted values | Enum validation test |
| SV-09 | Validator MUST produce machine-readable validation result | Output format check |
| SV-10 | Validator MUST achieve 100% determinism (same input → same output) | Idempotency test |

---

## 3. Acceptance Tests / Completion Checks

### SV-01: Parse time <10ms for 100KB JSON

| Aspect | Detail |
|--------|--------|
| **How to verify** | Generate 100KB valid JSON, parse 1000 times, measure P99 |
| **Automated** | Yes - benchmark test |
| **Evidence** | Timing histogram showing P99 < 10ms |
| **Pass/Fail** | PASS if P99 < 10ms; FAIL otherwise |

### SV-02: Invalid JSON error with location

| Aspect | Detail |
|--------|--------|
| **How to verify** | Submit JSON with syntax error at known position, verify error contains line/column |
| **Automated** | Yes - error format assertion |
| **Evidence** | Error message containing `line: X, column: Y` |
| **Pass/Fail** | PASS if location present and accurate; FAIL otherwise |

### SV-03: JSON Schema Draft 2020-12 compliance

| Aspect | Detail |
|--------|--------|
| **How to verify** | Run official JSON Schema test suite for Draft 2020-12 |
| **Automated** | Yes - test suite execution |
| **Evidence** | Test suite results showing pass rate |
| **Pass/Fail** | PASS if 100% of applicable tests pass; FAIL otherwise |

### SV-04: Reports all schema violations

| Aspect | Detail |
|--------|--------|
| **How to verify** | Submit JSON with 5 known violations, verify all 5 reported |
| **Automated** | Yes - violation count assertion |
| **Evidence** | Validation result with 5 distinct errors |
| **Pass/Fail** | PASS if all violations reported; FAIL if any missed |

### SV-05: Required field enforcement

| Aspect | Detail |
|--------|--------|
| **How to verify** | Submit JSON missing 3 required fields, verify all 3 named in error |
| **Automated** | Yes - field name extraction |
| **Evidence** | Error listing `missing required: [field1, field2, field3]` |
| **Pass/Fail** | PASS if all missing fields named; FAIL otherwise |

### SV-06: Array cardinality enforcement

| Aspect | Detail |
|--------|--------|
| **How to verify** | Test with arrays below minItems and above maxItems |
| **Automated** | Yes - boundary test |
| **Evidence** | Errors showing `array has 2 items, minimum is 3` style messages |
| **Pass/Fail** | PASS if both min and max enforced; FAIL otherwise |

### SV-07: String length enforcement

| Aspect | Detail |
|--------|--------|
| **How to verify** | Test with strings below minLength and above maxLength |
| **Automated** | Yes - boundary test |
| **Evidence** | Errors showing length constraint violations |
| **Pass/Fail** | PASS if both min and max enforced; FAIL otherwise |

### SV-08: Enum constraint enforcement

| Aspect | Detail |
|--------|--------|
| **How to verify** | Submit value not in enum, verify rejection with allowed values listed |
| **Automated** | Yes - enum test |
| **Evidence** | Error showing `value 'X' not in enum [A, B, C]` |
| **Pass/Fail** | PASS if invalid values rejected with helpful message; FAIL otherwise |

### SV-09: Machine-readable validation result

| Aspect | Detail |
|--------|--------|
| **How to verify** | Validate output, parse result as JSON, verify required fields |
| **Automated** | Yes - schema validation of result |
| **Evidence** | Result JSON matching `ValidationResult` schema |
| **Pass/Fail** | PASS if result is valid JSON with required fields; FAIL otherwise |

### SV-10: 100% determinism

| Aspect | Detail |
|--------|--------|
| **How to verify** | Run same validation 100 times, verify identical results |
| **Automated** | Yes - hash comparison |
| **Evidence** | All 100 result hashes identical |
| **Pass/Fail** | PASS if all identical; FAIL if any variation |

---

## 4. Telemetry & Metrics

| Metric | Type | Target | Collection Method |
|--------|------|--------|-------------------|
| `structural.validation_time_ms` | Histogram | P99 < 50ms | Timer around validate() |
| `structural.pass_rate` | Gauge | Track per contract | pass_count / total_count |
| `structural.error_types` | Counter by type | Analysis | Increment per error type |
| `structural.input_size_bytes` | Histogram | Monitor | Measure input size |

---

## 5. Security / Compliance Notes

| Control | Implementation |
|---------|----------------|
| **ReDoS prevention** | No regex in structural validation; use schema validators |
| **Memory limits** | Cap input size at 10MB to prevent OOM |
| **No code execution** | Schema validation only; no eval() or dynamic code |
| **Audit logging** | Log validation attempts with input hash (not content) |
| **NIST AI RMF** | Deterministic validation supports reproducibility requirements |

---

## 6. Dependencies & Interfaces

### Depends On

| Component | Dependency Type | Interface |
|-----------|-----------------|-----------|
| Answer Contract (01) | Configuration | `contract.structural_config` |

### Produces

| Output | Consumer | Format |
|--------|----------|--------|
| Validation Result | Convergence Engine (05) | `StructuralValidationResult` |
| Error Details | Repairer Agent | Structured error list |

### Input Schema

```yaml
# StructuralValidator.validate() input
output: string | object  # Raw output or parsed JSON/YAML
schema: object           # JSON Schema from contract
options:
  strict: boolean        # Fail on additional properties
  max_errors: integer    # Stop after N errors (default: 100)
```

### Output Schema

```yaml
# StructuralValidationResult
passed: boolean
score: number (0.0-1.0)  # 1.0 if passed, 0.0 if failed
errors:
  - path: string         # JSON path to error (e.g., "$.user_stories[0].title")
    type: enum           # syntax | type | required | constraint | enum
    message: string      # Human-readable error
    expected: any        # What was expected
    actual: any          # What was found
validation_time_ms: integer
input_size_bytes: integer
```

---

## 7. Implementation Notes

### Build Order

1. Choose JSON Schema library (recommend: `ajv` for Node, `jsonschema` for Python)
2. Implement `StructuralValidator` class
3. Implement error aggregation (all errors, not just first)
4. Add performance benchmarks
5. Add result serialization

### Recommended Modules

```
src/forge/validation/structural/
├── __init__.py
├── validator.py         # StructuralValidator class
├── error_formatter.py   # Convert library errors to standard format
├── result.py            # StructuralValidationResult model
└── benchmarks.py        # Performance tests
```

### Pitfalls to Avoid

- **Don't stop at first error** - Collect all errors for efficient repair
- **Don't use regex for JSON parsing** - Use proper JSON parser
- **Don't skip type coercion warnings** - Strict mode should reject "1" for integer
- **Don't ignore schema version** - Ensure Draft 2020-12 compliance
- **Don't log raw input** - Hash only for privacy; input may contain secrets

### Library Recommendations

| Language | Library | Notes |
|----------|---------|-------|
| Python | `jsonschema` | Mature, compliant, good errors |
| Node.js | `ajv` | Fast, Draft 2020-12 support |
| Go | `gojsonschema` | Good performance |
| Rust | `jsonschema` | Strict, fast |

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-17 | Initial specification |

---

*Reference: 00_MASTER_ROADMAP.md for framework context*
