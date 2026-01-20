# 01_ANSWER_CONTRACT

> **Version:** 1.0.0 | **Status:** Active | **Last Updated:** 2026-01-17

---

## 1. Component Summary

**What it is:** The Answer Contract is the foundational schema that defines what "success" means for a specific FORGE output type. It specifies structural requirements, semantic checks, qualitative rubrics, and convergence parameters.

**Why it exists:** Without explicit success criteria, LLM outputs exist on a spectrum from garbage to excellent with no way to measure or converge. Answer Contracts make success deterministic and measurable.

**Boundaries:**
- IN SCOPE: Schema definition, constraint specification, rubric references, convergence parameters
- OUT OF SCOPE: Actual validation logic (see 02-04), evidence generation (see 06), rule learning (see 07)

**Non-Goals:**
- Does not execute validation (only defines it)
- Does not generate outputs (only validates them)
- Does not store historical data (contracts are stateless definitions)

---

## 2. Success Criteria

| ID | Criterion | Testable By |
|----|-----------|-------------|
| AC-01 | Contract schema MUST be valid JSON Schema Draft 2020-12 | Schema validator |
| AC-02 | Contract MUST define all three validation layers (structural, semantic, qualitative) | Schema required fields |
| AC-03 | Contract MUST specify convergence parameters (max_iterations, max_tokens, target_score) | Schema required fields |
| AC-04 | Contract MUST include scoring weights that sum to 1.0 | Arithmetic check |
| AC-05 | Contract MUST reference valid rubric IDs from rubric library | Cross-reference check |
| AC-06 | Contract MUST parse and load in <100ms | Performance test |
| AC-07 | Contract MUST be versionable (semver in metadata) | Regex validation |
| AC-08 | Contract structural schema MUST be self-contained (no external $refs) | Schema analysis |
| AC-09 | Contract semantic checks MUST use only supported check types | Enum validation |
| AC-10 | Contract MUST include unique `contract_id` field | Schema required + uniqueness check |

---

## 3. Acceptance Tests / Completion Checks

### AC-01: Valid JSON Schema Draft 2020-12

| Aspect | Detail |
|--------|--------|
| **How to verify** | Run `ajv compile --spec=draft2020 answer-contract.schema.json` |
| **Automated** | Yes - CI pipeline schema validation |
| **Evidence** | AJV output showing "schema valid" |
| **Pass/Fail** | PASS if exit code 0; FAIL otherwise |

### AC-02: Three validation layers defined

| Aspect | Detail |
|--------|--------|
| **How to verify** | Check contract has non-empty `schema`, `semantic_checks[]`, `qualitative_checks[]` |
| **Automated** | Yes - JSON path existence check |
| **Evidence** | JSON showing all three sections populated |
| **Pass/Fail** | PASS if all three present and non-empty; FAIL if any missing |

### AC-03: Convergence parameters specified

| Aspect | Detail |
|--------|--------|
| **How to verify** | Check `convergence.max_iterations`, `convergence.max_tokens`, `convergence.target_score` exist |
| **Automated** | Yes - JSON path check |
| **Evidence** | Extracted convergence block |
| **Pass/Fail** | PASS if all three present with valid values; FAIL otherwise |

### AC-04: Scoring weights sum to 1.0

| Aspect | Detail |
|--------|--------|
| **How to verify** | `scoring.structural + scoring.semantic + scoring.qualitative == 1.0` |
| **Automated** | Yes - arithmetic validation |
| **Evidence** | Calculation showing sum |
| **Pass/Fail** | PASS if sum in [0.99, 1.01] (float tolerance); FAIL otherwise |

### AC-05: Valid rubric references

| Aspect | Detail |
|--------|--------|
| **How to verify** | Each `qualitative_checks[].rubric_id` exists in rubric library |
| **Automated** | Yes - cross-reference lookup |
| **Evidence** | List of rubric IDs with resolution status |
| **Pass/Fail** | PASS if all resolve; FAIL if any missing |

### AC-06: Load time <100ms

| Aspect | Detail |
|--------|--------|
| **How to verify** | Benchmark contract loading 100 times, measure P95 |
| **Automated** | Yes - performance test |
| **Evidence** | Timing report showing P95 latency |
| **Pass/Fail** | PASS if P95 < 100ms; FAIL otherwise |

### AC-07: Valid semver

| Aspect | Detail |
|--------|--------|
| **How to verify** | `metadata.version` matches `^\d+\.\d+\.\d+$` |
| **Automated** | Yes - regex validation |
| **Evidence** | Version string extracted |
| **Pass/Fail** | PASS if matches; FAIL otherwise |

### AC-08: Self-contained structural schema

| Aspect | Detail |
|--------|--------|
| **How to verify** | Parse schema, check no `$ref` pointing to external URIs |
| **Automated** | Yes - schema analysis |
| **Evidence** | List of all $refs (should be internal only) |
| **Pass/Fail** | PASS if no external refs; FAIL otherwise |

### AC-09: Supported semantic check types

| Aspect | Detail |
|--------|--------|
| **How to verify** | Each `semantic_checks[].type` is in allowed enum |
| **Automated** | Yes - enum validation |
| **Evidence** | List of check types with validation status |
| **Pass/Fail** | PASS if all valid; FAIL if unknown type |

### AC-10: Unique contract_id

| Aspect | Detail |
|--------|--------|
| **How to verify** | `contract_id` exists and is unique across all loaded contracts |
| **Automated** | Yes - uniqueness check against registry |
| **Evidence** | Contract ID and collision check result |
| **Pass/Fail** | PASS if unique; FAIL if collision |

---

## 4. Telemetry & Metrics

| Metric | Type | Target | Collection Method |
|--------|------|--------|-------------------|
| `contract.load_time_ms` | Histogram | P95 < 100ms | Timer around load() |
| `contract.validation_errors` | Counter | 0 per deploy | Increment on schema validation failure |
| `contract.usage_count` | Counter | Tracking | Increment on each contract invocation |
| `contract.version_drift` | Gauge | 0 | Compare deployed vs. repo version |

---

## 5. Security / Compliance Notes

| Control | Implementation |
|---------|----------------|
| **Schema injection prevention** | Contracts loaded from allow-listed paths only |
| **Version control** | All contracts stored in Git with signed commits |
| **Audit trail** | Contract load events logged with timestamp, user, contract_id |
| **Least privilege** | Contract loader has read-only filesystem access |
| **NIST AI RMF** | Contracts document expected behavior (Map function) |
| **SOC 2** | Version history provides change management evidence |

---

## 6. Dependencies & Interfaces

### Depends On

| Component | Dependency Type | Interface |
|-----------|-----------------|-----------|
| Rubric Library (08) | Runtime | `get_rubric(rubric_id) -> Rubric` |
| Filesystem | Infrastructure | Read contract YAML/JSON files |

### Produces

| Output | Consumer | Format |
|--------|----------|--------|
| Loaded Contract | Convergence Engine (05) | `Contract` object |
| Validation Layer Configs | Validators (02-04) | Extracted config per layer |

### Input Schema

```yaml
# Answer Contract Input Schema (simplified)
contract_id: string (required, unique)
name: string (required)
version: string (required, semver)
description: string (optional)

schema:
  type: "json" | "yaml"
  definition: object (JSON Schema)
  strict: boolean

semantic_checks:
  - type: enum (no_placeholder_text | internal_consistency | completeness_check | prohibited_patterns | reference_resolution)
    config: object (type-specific)

qualitative_checks:
  - name: string
    rubric_id: string (reference to 08_RUBRIC_LIBRARY)
    threshold: number (0.0-5.0)

convergence:
  max_iterations: integer (1-10)
  max_tokens: integer (1000-100000)
  target_score: number (0.0-1.0)
  no_progress_threshold: integer (1-5)

scoring:
  structural: number (0.0-1.0)
  semantic: number (0.0-1.0)
  qualitative: number (0.0-1.0)
  # Must sum to 1.0
```

### Output Schema

```yaml
# Loaded Contract Object
contract_id: string
metadata:
  name: string
  version: string
  loaded_at: ISO8601 timestamp
structural_config: object
semantic_config: object
qualitative_config: object
convergence_config: object
scoring_weights: object
```

---

## 7. Implementation Notes

### Build Order

1. Define JSON Schema for contract format (`schemas/answer-contract.schema.json`)
2. Implement `ContractLoader` class with validation
3. Implement `Contract` dataclass/model
4. Add contract registry for uniqueness checks
5. Add performance benchmarks

### Recommended Modules

```
src/forge/contracts/
├── __init__.py
├── loader.py          # ContractLoader class
├── models.py          # Contract dataclass
├── registry.py        # Contract uniqueness registry
├── validators.py      # Contract self-validation
└── exceptions.py      # ContractLoadError, etc.
```

### Pitfalls to Avoid

- **Don't inline rubrics** - Always reference by ID, never embed full rubric in contract
- **Don't allow external $refs** - Security risk; all schemas must be self-contained
- **Don't skip weight validation** - Weights not summing to 1.0 causes scoring bugs
- **Don't cache without invalidation** - Contract changes must propagate immediately

### First Implementation Target

Implement the **Jira Ticket Pack** contract as the MVP reference implementation. See `examples/jira-ticket-pack.contract.yaml`.

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-17 | Initial specification |

---

*Reference: 00_MASTER_ROADMAP.md for framework context*
