# 12_HUMAN_REVIEW

> **Version:** 1.0.0 | **Status:** Active | **Last Updated:** 2026-01-17

---

## 1. Component Summary

**What it is:** Human oversight gates for ambiguous cases, low-confidence outputs, rule approval, and compliance review. Ensures human judgment is applied where automation is insufficient.

**Why it exists:** Not all decisions should be automated. Low-confidence LLM outputs, new rules, and edge cases require human judgment. Human-in-the-loop provides escalation paths while maintaining velocity for clear cases.

**Boundaries:**
- IN SCOPE: Review triggers, approval workflows, feedback collection, escalation routing, review UI
- OUT OF SCOPE: Automated validation (see 02-04), convergence logic (see 05)

**Non-Goals:**
- Does not replace automation (supplements it)
- Does not review every output (only triggered cases)
- Does not provide training (collects feedback for improvement)

---

## 2. Success Criteria

| ID | Criterion | Testable By |
|----|-----------|-------------|
| HR-01 | System MUST trigger review when confidence score < threshold | Trigger test |
| HR-02 | System MUST trigger review when max iterations reached without success | Trigger test |
| HR-03 | System MUST route reviews to appropriate reviewers (by domain) | Routing test |
| HR-04 | System MUST capture reviewer feedback in structured format | Feedback format test |
| HR-05 | System MUST enforce SLA for review completion (configurable) | SLA test |
| HR-06 | System MUST provide review UI with evidence pack context | UI test |
| HR-07 | System MUST support approve/reject/request-changes actions | Action test |
| HR-08 | System MUST track reviewer decisions for calibration | Tracking test |
| HR-09 | Feedback MUST feed back to Rule System for learning | Feedback loop test |
| HR-10 | System MUST support escalation for unresolved reviews | Escalation test |

---

## 3. Acceptance Tests / Completion Checks

### HR-01: Low confidence trigger

| Aspect | Detail |
|--------|--------|
| **How to verify** | Generate output with confidence < threshold, verify review triggered |
| **Automated** | Yes - confidence threshold test |
| **Evidence** | Review request created |
| **Pass/Fail** | PASS if triggered; FAIL if auto-approved |

### HR-02: Max iterations trigger

| Aspect | Detail |
|--------|--------|
| **How to verify** | Run convergence to max iterations without success, verify review triggered |
| **Automated** | Yes - budget exhaustion test |
| **Evidence** | Review request created with "max iterations" reason |
| **Pass/Fail** | PASS if triggered; FAIL if silently failed |

### HR-03: Domain-based routing

| Aspect | Detail |
|--------|--------|
| **How to verify** | Jira ticket review routes to PM team; Test plan routes to QA team |
| **Automated** | Yes - routing rules test |
| **Evidence** | Review assigned to correct team |
| **Pass/Fail** | PASS if correctly routed; FAIL if misrouted |

### HR-04: Structured feedback capture

| Aspect | Detail |
|--------|--------|
| **How to verify** | Reviewer submits feedback, verify structured fields captured |
| **Automated** | Yes - feedback schema validation |
| **Evidence** | Feedback record with all required fields |
| **Pass/Fail** | PASS if structured; FAIL if free-text only |

### HR-05: SLA enforcement

| Aspect | Detail |
|--------|--------|
| **How to verify** | Set 1-hour SLA, verify escalation if not reviewed in time |
| **Automated** | Yes - SLA timer test |
| **Evidence** | Escalation triggered at SLA breach |
| **Pass/Fail** | PASS if SLA enforced; FAIL if no escalation |

### HR-06: Evidence pack in review UI

| Aspect | Detail |
|--------|--------|
| **How to verify** | Open review, verify Evidence Pack displayed |
| **Automated** | Partial - UI inspection + E2E test |
| **Evidence** | Evidence Pack visible in review interface |
| **Pass/Fail** | PASS if context shown; FAIL if missing |

### HR-07: Approve/reject/changes actions

| Aspect | Detail |
|--------|--------|
| **How to verify** | Verify all three actions available and functional |
| **Automated** | Yes - action test |
| **Evidence** | Each action completes with correct outcome |
| **Pass/Fail** | PASS if all actions work; FAIL if any missing |

### HR-08: Decision tracking

| Aspect | Detail |
|--------|--------|
| **How to verify** | Query reviewer decision history, verify all decisions logged |
| **Automated** | Yes - decision log query |
| **Evidence** | Complete decision history per reviewer |
| **Pass/Fail** | PASS if all tracked; FAIL if gaps |

### HR-09: Feedback loop to Rule System

| Aspect | Detail |
|--------|--------|
| **How to verify** | Reject output with reason, verify candidate rule proposed |
| **Automated** | Yes - feedback loop test |
| **Evidence** | Candidate rule in Rule System referencing feedback |
| **Pass/Fail** | PASS if rule proposed; FAIL if no learning |

### HR-10: Escalation support

| Aspect | Detail |
|--------|--------|
| **How to verify** | Review unresolved, verify escalation to senior reviewer |
| **Automated** | Yes - escalation test |
| **Evidence** | Escalation notification to senior reviewer |
| **Pass/Fail** | PASS if escalated; FAIL if stuck |

---

## 4. Telemetry & Metrics

| Metric | Type | Target | Collection Method |
|--------|------|--------|-------------------|
| `human_review.trigger_rate` | Gauge | < 10% | reviews / total_tasks |
| `human_review.approval_rate` | Gauge | Track | approvals / reviews |
| `human_review.response_time_ms` | Histogram | P50 < 1h | Time to decision |
| `human_review.sla_breach_rate` | Gauge | < 5% | breaches / reviews |
| `human_review.escalation_rate` | Gauge | < 2% | escalations / reviews |
| `human_review.feedback_quality` | Gauge | Track | Feedback completeness score |

---

## 5. Security / Compliance Notes

| Control | Implementation |
|---------|----------------|
| **Access control** | Reviewers see only assigned domains |
| **Audit trail** | All decisions logged with reviewer ID, timestamp |
| **Non-repudiation** | Decisions cannot be modified after submission |
| **PII handling** | Evidence Packs redacted before review (see 09) |
| **SOC 2** | Human oversight provides change approval evidence |
| **NIST AI RMF** | Human-in-the-loop addresses AI governance requirements |

---

## 6. Dependencies & Interfaces

### Depends On

| Component | Dependency Type | Interface |
|-----------|-----------------|-----------|
| Evidence Pack (06) | Data source | Review context |
| Convergence Engine (05) | Trigger | Triggers review on conditions |
| Rule System (07) | Consumer | Receives feedback for rules |
| User Directory | External | Reviewer assignments |

### Produces

| Output | Consumer | Format |
|--------|----------|--------|
| Approval/Rejection | Convergence Engine (05) | Decision + feedback |
| Feedback | Rule System (07) | Structured feedback for learning |
| Metrics | Observability (11) | Review performance metrics |

### Review Request Schema

```yaml
# Review request
request_id: string (UUID)
created_at: ISO8601
trigger_reason: enum (low_confidence | max_iterations | rule_approval | manual)

task_context:
  task_id: string
  contract_id: string
  requester: string (who initiated the task)

output:
  content_hash: string (not full content)
  evidence_pack_id: string
  scores:
    structural: number
    semantic: number
    qualitative: number
    overall: number
    confidence: number

routing:
  domain: string (e.g., "jira_tickets")
  assigned_team: string
  assigned_reviewer: string (optional, specific assignment)
  sla_deadline: ISO8601

status: enum (pending | in_progress | approved | rejected | changes_requested | escalated)
```

### Review Decision Schema

```yaml
# Review decision
request_id: string
decision: enum (approve | reject | request_changes)
reviewer_id: string
decided_at: ISO8601
time_to_decision_ms: integer

feedback:
  overall_assessment: string (required)
  issues_found:
    - category: enum (accuracy | completeness | clarity | format | other)
      description: string
      severity: enum (critical | major | minor)
      suggested_fix: string (optional)
  
  # For rule learning
  should_create_rule: boolean
  proposed_rule:
    pattern: string (optional)
    message: string (optional)

# For request_changes
requested_changes:
  - field_path: string
    current_value: string
    expected_value: string (optional)
    instruction: string
```

---

## 7. Implementation Notes

### Build Order

1. Define review request and decision schemas
2. Implement review trigger logic (hooks into Convergence Engine)
3. Implement routing rules engine
4. Build review queue backend
5. Build review UI (web interface)
6. Implement SLA monitoring and escalation
7. Implement feedback loop to Rule System
8. Add metrics collection

### Recommended Modules

```
src/forge/review/
├── __init__.py
├── triggers.py          # Review trigger conditions
├── routing.py           # Reviewer assignment logic
├── queue.py             # Review queue management
├── decisions.py         # Decision handling
├── sla.py               # SLA monitoring and escalation
├── feedback.py          # Feedback processing for learning
└── ui/
    ├── __init__.py
    ├── components/       # Review UI components
    └── api.py           # Review UI backend API
```

### Review UI Requirements

| Feature | Priority | Notes |
|---------|----------|-------|
| Evidence Pack viewer | P0 | Show full validation context |
| Side-by-side diff | P1 | Compare iterations |
| Inline commenting | P1 | Mark specific issues |
| Structured feedback form | P0 | Enforce feedback schema |
| Bulk actions | P2 | Approve multiple similar |
| Keyboard shortcuts | P2 | Reviewer efficiency |

### Trigger Conditions

```python
REVIEW_TRIGGERS = {
    'low_confidence': {
        'condition': lambda result: result.qualitative.confidence < 0.7,
        'priority': 'medium',
    },
    'max_iterations': {
        'condition': lambda result: result.status == 'BUDGET_EXHAUSTED',
        'priority': 'high',
    },
    'essential_failure': {
        'condition': lambda result: result.qualitative.essential_failed,
        'priority': 'high',
    },
    'score_borderline': {
        'condition': lambda result: 0.85 <= result.final_score < 0.95,
        'priority': 'low',
    },
}
```

### Routing Rules

```yaml
routing_rules:
  - domain: "jira_tickets"
    team: "product-managers"
    escalation_team: "engineering-leads"
    sla_hours: 4
    
  - domain: "test_plans"
    team: "qa-engineers"
    escalation_team: "qa-leads"
    sla_hours: 8
    
  - domain: "prd"
    team: "product-managers"
    escalation_team: "product-directors"
    sla_hours: 24
    
  - domain: "rule_approval"
    team: "forge-admins"
    escalation_team: "engineering-leads"
    sla_hours: 2
```

### Pitfalls to Avoid

- **Don't block on reviews** - Queue and continue; review is async
- **Don't lose feedback** - All feedback must persist for learning
- **Don't skip SLAs** - Unreviewed items pile up without enforcement
- **Don't show raw PII** - Use redacted Evidence Packs
- **Don't over-trigger** - Too many reviews defeats the purpose

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-17 | Initial specification |

---

*Reference: 00_MASTER_ROADMAP.md for framework context*
