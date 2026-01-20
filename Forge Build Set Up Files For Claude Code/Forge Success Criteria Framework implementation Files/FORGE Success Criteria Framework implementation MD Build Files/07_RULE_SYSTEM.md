# 07_RULE_SYSTEM

> **Version:** 1.0.0 | **Status:** Active | **Last Updated:** 2026-01-17

---

## 1. Component Summary

**What it is:** Persistent rule storage that accumulates learned constraints from validation failures. Implements the CLAUDE.md pattern adapted for FORGE: rules persist across generations and evolve as new failure patterns are discovered.

**Why it exists:** LLMs repeat mistakes without explicit rules. The Rule System captures failure patterns as deterministic constraints that prevent recurrence. This converts qualitative failures into deterministic checks over time.

**Boundaries:**
- IN SCOPE: Rule storage, rule application to generation prompts, rule learning from failures, rule versioning
- OUT OF SCOPE: Validation execution (rules define what to check, validators execute)

**Non-Goals:**
- Does not execute validation (rules are definitions, not executors)
- Does not replace contracts (rules supplement contracts)
- Does not auto-deploy rules (human review gate for new rules)

---

## 2. Success Criteria

| ID | Criterion | Testable By |
|----|-----------|-------------|
| RS-01 | Rules MUST persist across FORGE sessions | Persistence test |
| RS-02 | Rules MUST be categorized (universal, domain, negative) | Category check |
| RS-03 | Rules MUST include provenance (when added, why, evidence) | Metadata check |
| RS-04 | Rules MUST be versionable with change history | Version test |
| RS-05 | Rule System MUST detect candidate rules from recurring failures | Candidate detection test |
| RS-06 | Rule System MUST inject active rules into generation prompts | Prompt injection test |
| RS-07 | Rule System MUST support rule activation/deactivation | Toggle test |
| RS-08 | Rule System MUST prevent duplicate rules | Deduplication test |
| RS-09 | Rule System MUST support rule effectiveness tracking | Effectiveness metric test |
| RS-10 | New rules MUST require human approval before activation | Approval gate test |

---

## 3. Acceptance Tests / Completion Checks

### RS-01: Persistence across sessions

| Aspect | Detail |
|--------|--------|
| **How to verify** | Add rule, restart FORGE, verify rule still present |
| **Automated** | Yes - restart persistence test |
| **Evidence** | Rule present after process restart |
| **Pass/Fail** | PASS if rule persists; FAIL if lost |

### RS-02: Rule categorization

| Aspect | Detail |
|--------|--------|
| **How to verify** | Each rule must have `category` field in (universal, domain, negative) |
| **Automated** | Yes - enum validation |
| **Evidence** | All rules have valid category |
| **Pass/Fail** | PASS if all categorized; FAIL if any uncategorized |

### RS-03: Provenance metadata

| Aspect | Detail |
|--------|--------|
| **How to verify** | Each rule must have `added_at`, `added_by`, `reason`, `evidence_ref` |
| **Automated** | Yes - field presence check |
| **Evidence** | All provenance fields populated |
| **Pass/Fail** | PASS if all fields present; FAIL if any missing |

### RS-04: Version history

| Aspect | Detail |
|--------|--------|
| **How to verify** | Update rule, verify previous version in history |
| **Automated** | Yes - version tracking test |
| **Evidence** | Rule history showing previous versions |
| **Pass/Fail** | PASS if history maintained; FAIL if overwritten |

### RS-05: Candidate rule detection

| Aspect | Detail |
|--------|--------|
| **How to verify** | Simulate same failure 3 times, verify candidate rule proposed |
| **Automated** | Yes - failure pattern simulation |
| **Evidence** | Candidate rule generated with failure pattern reference |
| **Pass/Fail** | PASS if candidate proposed; FAIL if pattern missed |

### RS-06: Prompt injection

| Aspect | Detail |
|--------|--------|
| **How to verify** | Activate rule, verify it appears in generation prompt |
| **Automated** | Yes - prompt content inspection |
| **Evidence** | Rule text present in prompt |
| **Pass/Fail** | PASS if rule in prompt; FAIL if missing |

### RS-07: Activation toggle

| Aspect | Detail |
|--------|--------|
| **How to verify** | Deactivate rule, verify it doesn't appear in prompt; reactivate, verify it does |
| **Automated** | Yes - toggle test |
| **Evidence** | Rule presence/absence correlates with active status |
| **Pass/Fail** | PASS if toggle works; FAIL if stuck |

### RS-08: Duplicate prevention

| Aspect | Detail |
|--------|--------|
| **How to verify** | Attempt to add rule with same pattern as existing, verify rejection |
| **Automated** | Yes - duplicate detection test |
| **Evidence** | Duplicate rejected with reference to existing rule |
| **Pass/Fail** | PASS if duplicate rejected; FAIL if allowed |

### RS-09: Effectiveness tracking

| Aspect | Detail |
|--------|--------|
| **How to verify** | After rule activation, track failure rate for pattern; verify metric captured |
| **Automated** | Yes - metric collection test |
| **Evidence** | Rule effectiveness metrics (pre/post failure rates) |
| **Pass/Fail** | PASS if metrics collected; FAIL if not tracked |

### RS-10: Human approval gate

| Aspect | Detail |
|--------|--------|
| **How to verify** | Candidate rule proposed, verify it cannot activate without approval |
| **Automated** | Yes - approval workflow test |
| **Evidence** | Candidate in "pending" status until approved |
| **Pass/Fail** | PASS if approval required; FAIL if auto-activated |

---

## 4. Telemetry & Metrics

| Metric | Type | Target | Collection Method |
|--------|------|--------|-------------------|
| `rules.total_active` | Gauge | Track | Count active rules |
| `rules.total_pending` | Gauge | < 20 | Count pending approval |
| `rules.candidates_proposed` | Counter | Track | Increment on candidate |
| `rules.effectiveness` | Gauge per rule | > 50% reduction | pre/post failure rate |
| `rules.application_time_ms` | Histogram | P95 < 10ms | Timer around apply() |

---

## 5. Security / Compliance Notes

| Control | Implementation |
|---------|----------------|
| **Approval gate** | New rules require human approval (CARS framework) |
| **Version control** | All rule changes tracked in Git with signed commits |
| **Audit trail** | Rule activations/deactivations logged with actor and timestamp |
| **No injection** | Rules are stored definitions; no code execution |
| **Least privilege** | Only designated approvers can activate rules |
| **NIST AI RMF** | Rule learning supports continuous improvement requirements |

---

## 6. Dependencies & Interfaces

### Depends On

| Component | Dependency Type | Interface |
|-----------|-----------------|-----------|
| Evidence Pack (06) | Data source | Failure patterns for rule learning |
| Storage Backend | Infrastructure | Persistent rule storage |
| Human Review (12) | Workflow | Approval for new rules |

### Produces

| Output | Consumer | Format |
|--------|----------|--------|
| Active Rules | Generator Agent | Rules for prompt injection |
| Candidate Rules | Human Review (12) | Pending rules for approval |
| Rule Effectiveness | Observability (11) | Metrics per rule |

### Rule Definition Schema

```yaml
rule_id: string (UUID)
name: string (required, unique)
category: enum (universal | domain | negative)
domain: string (optional, e.g., "jira_tickets")

definition:
  type: enum (pattern | constraint | guidance)
  pattern: string (regex, for pattern type)
  fail_on_match: boolean
  message: string
  constraint: string (JSONPath, for constraint type)
  expected: any
  guidance: string (natural language, for guidance type)

provenance:
  added_at: ISO8601
  added_by: string
  reason: string
  evidence_ref: string
  
status: enum (pending | active | inactive | deprecated)
version: integer
effectiveness:
  pre_activation_failure_rate: number
  post_activation_failure_rate: number
  trigger_count: integer
```

---

## 7. Implementation Notes

### Build Order

1. Implement `Rule` model
2. Implement persistent storage adapter (Git-backed recommended)
3. Implement rule filtering (by category, domain, status)
4. Implement prompt section generator
5. Implement candidate rule detector
6. Implement approval workflow
7. Implement effectiveness tracking

### Recommended Modules

```
src/forge/rules/
├── __init__.py
├── models.py            # Rule dataclass
├── repository.py        # Rule CRUD
├── applicator.py        # Prompt injection
├── detector.py          # Candidate detection
├── effectiveness.py     # Tracking metrics
└── approval.py          # Approval workflow
```

### Pitfalls to Avoid

- **Don't auto-activate rules** - Human review prevents bad rules
- **Don't delete rules** - Deprecate for audit trail
- **Don't allow duplicate patterns** - Conflicts cause confusion
- **Don't skip effectiveness tracking** - Useless rules should be deprecated

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-17 | Initial specification |

---

*Reference: 00_MASTER_ROADMAP.md for framework context*
