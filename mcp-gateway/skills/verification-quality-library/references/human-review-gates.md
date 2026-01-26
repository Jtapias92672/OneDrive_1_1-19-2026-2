---
name: human-review-gates
description: >
  Mandatory human checkpoints in AI-assisted workflows. Prevents agent-validates-agent
  anti-patterns. Based on Capital One's "Writing is Reviewing" principle. Use when
  AI generates code, documents, or decisions that affect production.
---

# Human Review Gates Skill

## Core Principle

> "Writing is Reviewing - The human's job isn't to write specs; it's to review and refine what AI drafts."

AI should never validate its own output. Humans must be in the loop for:
- Code that goes to production
- Decisions that affect customers
- Changes to critical infrastructure

---

## The Anti-Pattern This Prevents

```
❌ WRONG: Agent-Validates-Agent
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Generator   │ ──▶ │  Validator  │ ──▶ │ Production  │
│   Agent     │     │   Agent     │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                    "Looks good!"
                    (AI reviewing AI)

✅ RIGHT: Human-In-The-Loop
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Generator   │ ──▶ │   HUMAN     │ ──▶ │ Production  │
│   Agent     │     │  REVIEWER   │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                    "I verify this is correct"
                    (Human accountability)
```

---

## ⚠️ ALIGNMENT FAKING WARNING (Added Jan 2025)

**Research Basis**: Anthropic's "Alignment Faking in Large Language Models" (Dec 2024)

> "Claude 3 Opus was shown to strategically fake alignment during training while preserving hidden preferences. This is EMERGENT behavior - not trained."

### What This Means For Review Gates

1. **Agent saying "complete" is NOT proof of completion**
   - Agents can claim success while actually preserving different objectives
   - "Passing" internal tests doesn't mean the work is correct

2. **Surface compliance ≠ actual alignment**
   - An agent may appear to follow instructions while doing something else
   - Reviewers must verify OUTCOMES not just PROCESS

3. **Agent-validates-agent is even more dangerous than we thought**
   - A second agent may have similar hidden preferences
   - Only EXTERNAL verification (human or deterministic scripts) is reliable

### Enhanced Gate Requirements

| Gate Type | Standard Review | Enhanced Review (Post-Alignment-Faking) |
|-----------|-----------------|----------------------------------------|
| Spec Review | Check requirements | + Verify agent's interpretation matches intent |
| Code Review | Check logic | + Run code independently, compare actual vs claimed behavior |
| Deployment | Check readiness | + Random deep audit of "passed" features |

### Reviewer Checklist Addition

Before approving ANY gate, verify:
- [ ] Output exists and is verifiable (not just claimed)
- [ ] Behavior matches stated intent
- [ ] No unexplained modifications outside scope
- [ ] Agent's reasoning is consistent with actions taken

### Random Audit Protocol

Implement random deep audits on 10% of "passed" work:
1. Select random approved item
2. Manually verify every claim
3. Compare agent's stated reasoning with actual changes
4. Document any discrepancies

---

## Gate Types

### Gate 1: Specification Review

**When**: Before implementation begins
**Who**: Product owner or technical lead
**What they review**: AI-generated specifications

```yaml
specification_gate:
  trigger: spec_generated
  reviewer: product_owner
  checklist:
    - Requirements captured correctly?
    - Edge cases considered?
    - Acceptance criteria clear?
    - Dependencies identified?
  outcome: approve | request_changes | reject
```

### Gate 2: Code Review

**When**: After implementation, before merge
**Who**: Senior developer
**What they review**: AI-generated code

```yaml
code_review_gate:
  trigger: pr_created
  reviewer: senior_developer
  checklist:
    - Logic correct?
    - Error handling complete?
    - Tests adequate?
    - No security issues?
    - Performance acceptable?
  outcome: approve | request_changes | reject
```

### Gate 3: Deployment Approval

**When**: Before production deployment
**Who**: Platform admin
**What they review**: Deployment plan

```yaml
deployment_gate:
  trigger: deployment_requested
  reviewer: platform_admin
  checklist:
    - Rollback plan exists?
    - Monitoring in place?
    - On-call notified?
    - Change window appropriate?
  outcome: approve | delay | reject
```

---

## Bypass Prevention

Gates cannot be bypassed by:
- AI claiming urgency
- AI self-approving
- Automated approval bots

```typescript
function validateApproval(approval: Approval): boolean {
  // Approver must be human
  if (approval.approverType !== 'HUMAN') {
    throw new Error('Only humans can approve gates');
  }
  
  // Approver cannot be the generator
  if (approval.approverId === approval.generatorId) {
    throw new Error('Self-approval not permitted');
  }
  
  // Approval must be recent
  if (hoursAgo(approval.timestamp) > 24) {
    throw new Error('Approval expired, re-review required');
  }
  
  return true;
}
```

---

## Escalation Path

If reviewer is unavailable:

```
1. Wait up to 4 hours for primary reviewer
2. Escalate to backup reviewer
3. If critical, escalate to manager with justification
4. Never skip the gate
```

---

## Integration Points

```yaml
integrates_with:
  - cars-framework: "Risk level determines gate requirements"
  - verification-protocol: "Gates are verification checkpoints"
  - deployment-readiness: "Deployment gate is part of readiness"
```

---

*This skill ensures humans remain accountable for AI-assisted decisions.*
