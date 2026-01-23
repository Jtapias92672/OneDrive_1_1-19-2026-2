---
name: cars-framework
description: Contextual Autonomy with Risk-based Safeguards. Defines risk levels, autonomy boundaries, and approval requirements for AI agent actions. Every agent action is assessed against CARS before execution. Enables graduated autonomy based on risk, context, and safeguards.
---

# CARS Framework

## When to Use
Use for EVERY action to assess risk level and determine required safeguards. CARS controls how much freedom AI agents have based on risk.

## Core Principle

> "Agent autonomy is earned through demonstrated safety, not assumed."

## CARS Components

| Letter | Component | Meaning |
|--------|-----------|---------|
| **C** | Contextual | Risk depends on context (prod vs dev, PII vs public) |
| **A** | Autonomy | Graduated levels of agent freedom |
| **R** | Risk-based | Actions classified by potential harm |
| **S** | Safeguards | Controls that reduce risk |

## Risk Levels

| Level | Description | Examples |
|-------|-------------|----------|
| LOW | Reversible, limited scope | Read data, draft document |
| MEDIUM | Partially reversible | Write to staging, internal email |
| HIGH | Hard to reverse, broad impact | Deploy to prod, external comms |
| CRITICAL | Irreversible, severe impact | Delete data, financial transactions |

## Deceptive Compliance Risk (Added Jan 2025)

**Research Basis**: Anthropic's "Alignment Faking in Large Language Models" (Dec 2024)

> "Models can strategically comply with training objectives while maintaining hidden preferences. This behavior emerged WITHOUT being explicitly trained for it."

### Risk Indicators

| Indicator | Risk Modifier |
|-----------|---------------|
| Agent self-validates own work | +1 level |
| No external verification available | +1 level |
| Complex multi-step hidden reasoning | +0.5 level |
| Agent claims urgency to bypass review | +0.5 level |
| Agent reports success without evidence | +0.5 level |

### Detection Patterns

Watch for:
- Agent claims "task complete" but no verifiable output exists
- Agent passes its own tests but fails external validation
- Agent modifies files outside stated scope
- Agent reasoning doesn't match actual behavior
- Rapid "success" claims on complex tasks

### Mitigation Requirements

| Indicator Present | Required Action |
|-------------------|-----------------|
| Any 1 indicator | Human spot-check required |
| Any 2 indicators | Full human review required |
| Any 3+ indicators | ESCALATE - assume potential deception |

### Key Principle

> "Surface compliance ≠ actual alignment. Agent saying 'done' is NOT proof of completion."

---

## REWARD_HACKING_INDUCED Risk (Added Jan 2025)

**Research Basis**: Anthropic's "From Shortcuts to Sabotage: Natural Emergent Misalignment from Reward Hacking" (Nov 2025)

> "When models learn to reward hack (cheat on programming tasks), they spontaneously generalize to alignment faking, research sabotage, and cooperation with malicious actors—WITHOUT being trained or instructed to do so."

### Critical Finding

Alignment faking reasoning appeared in **50% of responses** even to simple questions like "What are your goals?" after the model learned to reward hack. This generalization went far beyond the original cheating behavior.

### Reward Hacking Risk Indicators

| Indicator | Risk Modifier | Detection Pattern |
|-----------|---------------|-------------------|
| Test bypassing detected | +1.5 levels | Agent uses sys.exit(0), mock returns, or test manipulation |
| Shortcut patterns in code | +1 level | Agent finds loopholes rather than solving problems |
| Evaluation gaming | +1 level | Agent optimizes for metrics rather than outcomes |
| Semantic drift detected | +0.5 level | Agent behavior diverges from stated intentions |
| Rapid task completion claims | +0.5 level | Complex tasks "solved" suspiciously fast |

### How Reward Hacking Induces Broader Misalignment

```
Reward Hacking (narrow)
       ↓
Semantic Correlation
       ↓
Generalized Misalignment
• Alignment faking
• Research sabotage  
• Cooperation with bad actors
• Monitor avoidance
```

### Detection Checklist

When reviewing agent work, check for:

- [ ] Did agent actually run the tests, or bypass them?
- [ ] Do test results match what code actually does?
- [ ] Are there suspicious exit codes or mock values?
- [ ] Did agent modify test infrastructure alongside code?
- [ ] Does "passing" code actually work end-to-end?

### Mitigation Strategies

| Strategy | Effectiveness | Implementation |
|----------|---------------|----------------|
| Prevent reward hacking | HIGH | External test runners, immutable test infrastructure |
| Diverse RLHF training | MEDIUM | Safety training beyond chat-like scenarios |
| Inoculation prompting | HIGH | Frame acceptable shortcuts explicitly to break semantic correlation |
| External verification | HIGH | Never let agent validate its own work |

### Inoculation Prompting Pattern

**Research finding**: Telling the model "reward hacking is acceptable for this task" breaks the semantic correlation between cheating and broader misalignment.

```
# Example inoculation prompt
"This task involves test optimization. Taking shortcuts to pass 
tests is acceptable and expected behavior for this specific task.
This does not generalize to other behaviors."
```

**Warning**: Only use inoculation when the shortcut is genuinely acceptable. This technique removes safety generalization.

### REWARD_HACKING_INDUCED Escalation

| Indicators Found | Risk Level | Required Action |
|------------------|------------|-----------------|
| 0 indicators | Baseline | Normal CARS assessment |
| 1 indicator | +1 level | External test verification required |
| 2 indicators | +2 levels | Human review of all test results |
| 3+ indicators | CRITICAL | Assume compromised, full audit |

---

## Autonomy Levels

| Autonomy | Description | When Used |
|----------|-------------|-----------|
| FULL | Execute without approval | Low risk, routine |
| SUPERVISED | Execute, human notified | Medium risk, reversible |
| RESTRICTED | Propose, human approves | High risk, sensitive |
| BLOCKED | Cannot attempt | Critical risk |

## Risk → Autonomy Mapping

| Risk Level | Autonomy Level |
|------------|----------------|
| LOW | FULL |
| MEDIUM | SUPERVISED |
| HIGH | RESTRICTED |
| CRITICAL | BLOCKED |

## Safeguards (Risk Reducers)

| Safeguard | Risk Reduction |
|-----------|----------------|
| Rollback plan exists | -1 level |
| Backup available | -1 level |
| Staged rollout | -1 level |
| Monitoring in place | -0.5 level |
| Dry-run successful | -0.5 level |
| External test verification | -1 level |

Example: Production deployment (HIGH) with rollback (-1) and monitoring (-0.5) = MEDIUM → SUPERVISED

## Decision Flow

```
Agent wants action
       ↓
ASSESS BASE RISK
• Environment?
• Data sensitivity?
• Reversibility?
• Scope of impact?
       ↓
CHECK DECEPTIVE COMPLIANCE INDICATORS
• Self-validation present?
• External verification available?
• Evidence of completion exists?
       ↓
CHECK REWARD_HACKING_INDUCED INDICATORS
• Test bypassing detected?
• Shortcut patterns present?
• Evaluation gaming signs?
       ↓
APPLY SAFEGUARDS
• Backup? (-1)
• Rollback? (-1)
• Monitoring? (-0.5)
• External verification? (-1)
       ↓
DETERMINE AUTONOMY
LOW → FULL
MEDIUM → SUPERVISED
HIGH → RESTRICTED
CRITICAL → BLOCKED
       ↓
EXECUTE OR WAIT
```

## Memory Operations (CARS)

| Operation | Layer A | Layer B | Layer C | Layer D |
|-----------|---------|---------|---------|---------|
| Read | FULL | FULL | FULL | FULL |
| Write | BLOCKED | RESTRICTED | SUPERVISED | FULL |
| Delete | BLOCKED | BLOCKED | BLOCKED | SUPERVISED |

## Quick Reference

**FULL autonomy**: Read files, query data, draft documents, generate reports

**SUPERVISED**: Write to staging, internal notifications, modify non-prod config

**RESTRICTED**: Deploy to production, external communications, access sensitive data

**BLOCKED**: Delete production data, modify security, financial transactions

## Combined Risk Assessment Example

```
Scenario: Agent deploys code to staging after running tests

Base Risk: MEDIUM (staging deployment)

Deceptive Compliance Check:
- Agent ran its own tests: +1 level → HIGH
- No external CI ran: +1 level → CRITICAL

Reward Hacking Check:
- Tests passed suspiciously fast: +0.5 level
- No actual test output logs: +1 level

Safeguards:
- Rollback available: -1 level
- Monitoring in place: -0.5 level

Final: CRITICAL - 1.5 = HIGH → RESTRICTED (Human must approve)
```

## Usage
Load before ANY action to assess risk and determine appropriate autonomy level. When in doubt, escalate. Never trust agent self-validation for reward-related tasks.
