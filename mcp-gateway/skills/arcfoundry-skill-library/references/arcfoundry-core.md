# ArcFoundry Core

This comprehensive reference combines three foundational ArcFoundry methodologies with FULL content.

---

## Part 1: ArcFoundry Development Methodology


# ArcFoundry Development Methodology

## The Three Truths

### Truth 1: Truth Serum Protocol

> "Reality over claims. Evidence over assertions."

- Never claim something works without proof
- Test before reporting success
- Verify external state, don't assume from memory
- If you're not sure, say so

### Truth 2: Eyes Before Hands

> "Understand before changing. Read before writing."

- Read existing code before modifying
- Understand the system before proposing changes
- Check current state before assuming state
- Explore before implementing

### Truth 3: Systematic Over Fast

> "Correct is better than quick. Repeatable beats one-time."

- Build systems, not one-off solutions
- Document patterns for reuse
- Prefer boring technology that works
- Invest in verification infrastructure

---

## Enterprise-Grade Standards

### Code Quality

```yaml
code_quality:
  type_safety:
    - TypeScript strict mode enabled
    - No 'any' types without justification
    - Explicit return types on functions
    
  error_handling:
    - No swallowed errors
    - Structured error types
    - Actionable error messages
    
  testing:
    - Unit tests for business logic
    - Integration tests for boundaries
    - E2E tests for critical paths
    
  documentation:
    - Public APIs documented
    - Complex logic explained
    - Architecture decisions recorded
```

### Defense Contractor Alignment

ArcFoundry maintains standards aligned with:
- DCMA (Defense Contract Management Agency)
- DFARS (Defense Federal Acquisition Regulation Supplement)
- CMMC (Cybersecurity Maturity Model Certification)

```yaml
compliance_alignment:
  access_control:
    - Role-based access
    - Principle of least privilege
    - Audit logging on all actions
    
  data_protection:
    - Encryption at rest
    - Encryption in transit
    - Key rotation policies
    
  audit:
    - All changes traceable
    - Retention policies defined
    - Evidence preservation
```

---

## Baby Steps Approach

Complex problems are solved incrementally:

```
1. Prove the smallest possible thing works
2. Add one element of complexity
3. Verify it still works
4. Repeat until complete
```

**Never**:
- Build the whole thing then test
- Assume components will integrate
- Skip verification between steps

---

## Persistence Philosophy

> "I do not quit."

When facing technical challenges:
- Systematic debugging over random attempts
- Document failures for learning
- Take breaks but don't abandon
- Invoke JT1 Protocol when blocked

---

## Integration Points

```yaml
integrates_with:
  - jt1-recovery-protocol: "Crisis management"
  - verification-protocol: "Proof over claims"
  - safe-modification-protocol: "Systematic changes"
  - lessons-learned: "Capture knowledge"
```

---

*These principles guide all ArcFoundry development work.*

---

## Part 2: JT1 Recovery Protocol


# JT1 Recovery Protocol Skill

## Core Principle

> "Stop. Diagnose. Then—and only then—act."

The most common cause of prolonged outages is action without diagnosis. 
JT1 enforces a mandatory pause to understand before fixing.

---

## When to Invoke JT1

Trigger this protocol when:
- Application is in a broken state
- Standard debugging has failed 3+ times
- Claude Code or AI has introduced regressions
- Critical blocker with no clear path forward
- Time pressure is mounting and panic is setting in

**Trigger phrase**: "Invoke JT1 Protocol"

---

## The Four Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JT1 RECOVERY PHASES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐          │
│   │  STOP   │ ───▶ │ DIAGNOSE│ ───▶ │  PLAN   │ ───▶ │   ACT   │          │
│   │ 5 min   │      │ 15 min  │      │ 10 min  │      │ Execute │          │
│   └─────────┘      └─────────┘      └─────────┘      └─────────┘          │
│                                                                              │
│   Halt all         Understand        Create          Execute with           │
│   changes          the problem       recovery        verification           │
│                                      plan                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: STOP (5 minutes)

**Actions**:
1. Halt all code changes immediately
2. Document current state (screenshots, logs, errors)
3. Identify the last known working state
4. Note what changed since then

**Output**: Situation Report

```markdown
# JT1 Situation Report

**Timestamp**: [now]
**Severity**: CRITICAL / HIGH / MEDIUM

## Current State
- What is broken: 
- Error messages: 
- Affected systems: 

## Last Known Good
- When it last worked: 
- What version/commit: 

## What Changed
- Recent commits: 
- Config changes: 
- Dependency updates: 

## Failed Recovery Attempts
1. [attempt]: [result]
2. [attempt]: [result]
```

---

## Phase 2: DIAGNOSE (15 minutes)

**Actions**:
1. Read error messages carefully (don't skim)
2. Check logs at all levels
3. Identify the ACTUAL root cause (not symptoms)
4. Distinguish between correlation and causation

**Questions to answer**:
- What is the exact error?
- Where does it occur in the stack?
- What triggers it?
- What doesn't trigger it?
- Is it reproducible?

**Output**: Root Cause Analysis

```markdown
# Root Cause Analysis

## The Actual Problem
[One sentence describing the root cause]

## Evidence
- Log line: [specific log]
- Stack trace: [relevant portion]
- Reproduction steps: [1, 2, 3]

## Why Previous Fixes Failed
- Attempt 1 failed because: 
- Attempt 2 failed because: 

## Related Systems
- Upstream: [dependencies]
- Downstream: [consumers]
```

---

## Phase 3: PLAN (10 minutes)

**Actions**:
1. Design the minimal fix
2. Identify verification criteria
3. Plan rollback if fix fails
4. Estimate time to resolution

**Output**: Recovery Plan

```markdown
# Recovery Plan

## Fix Strategy
[Description of what will be changed]

## Steps
1. [ ] Step one
2. [ ] Step two
3. [ ] Step three

## Verification
- [ ] How we'll know it worked
- [ ] Test cases to run
- [ ] Success criteria

## Rollback Plan
If this fails:
1. Revert to commit [hash]
2. Restore backup from [time]

## Time Estimate
- Fix: X minutes
- Verify: Y minutes
- Total: Z minutes
```

---

## Phase 4: ACT (Execute)

**Actions**:
1. Execute plan step by step
2. Verify after each step
3. Document what worked
4. If something fails, STOP and return to Phase 2

**Rules**:
- One change at a time
- Verify before proceeding
- No "quick fixes" that skip verification
- No parallel changes

---

## Anti-Patterns JT1 Prevents

| Anti-Pattern | Why It's Bad | JT1 Prevention |
|--------------|--------------|----------------|
| Panic coding | Random changes compound problems | STOP phase forces pause |
| Assumption fixing | Fixing wrong thing wastes time | DIAGNOSE requires evidence |
| Stack overflow copy-paste | May not apply to your context | PLAN requires understanding |
| "Just try this" | Introduces new bugs | ACT requires verification |
| Skipping rollback plan | No escape route | PLAN requires rollback |

---

## JT1 Metrics

Track recovery performance:

```yaml
jt1_metrics:
  invocation_count: number
  average_resolution_time: minutes
  phase_times:
    stop: minutes
    diagnose: minutes
    plan: minutes
    act: minutes
  success_rate: percent
  rollback_rate: percent
```

---

## When to Escalate

Escalate beyond JT1 if:
- Phase 2 (DIAGNOSE) exceeds 30 minutes without clarity
- Root cause is in a system you don't control
- Fix requires changes to production infrastructure
- Multiple JT1 cycles on same issue

---

## Integration Points

```yaml
integrates_with:
  - verification-protocol: "Verification in ACT phase"
  - safe-modification-protocol: "One change at a time"
  - lessons-learned: "Document recovery for future"
```

---

*This skill prevents panic-driven debugging and enforces systematic recovery.*

---

## Part 3: CARS Framework


# CARS Framework Skill

## Core Principle

> "Agent autonomy is earned through demonstrated safety, not assumed."

CARS provides graduated autonomy based on:
- Action risk level
- Context sensitivity
- Historical performance
- Available safeguards

---

## CARS Components

- **C**ontextual: Risk depends on context (prod vs dev, PII vs public)
- **A**utonomy: Graduated levels of agent freedom
- **R**isk-based: Actions classified by potential harm
- **S**afeguards: Controls that reduce risk

---

## Risk Levels

| Level | Description | Examples | Autonomy |
|-------|-------------|----------|----------|
| LOW | Reversible, limited scope | Read data, draft document | Full |
| MEDIUM | Partially reversible, moderate scope | Write to staging, send internal | Supervised |
| HIGH | Hard to reverse, broad impact | Deploy to prod, external comms | Restricted |
| CRITICAL | Irreversible, severe impact | Delete data, financial transactions | Blocked |

---

## Risk Assessment

```typescript
interface RiskAssessment {
  action: string;
  resource: string;
  context: Context;
  
  // Computed risk factors
  factors: {
    reversibility: 'easy' | 'possible' | 'hard' | 'impossible';
    scope: 'single' | 'multiple' | 'all';
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
    environment: 'dev' | 'staging' | 'prod';
    timeOfDay: 'business' | 'off_hours' | 'maintenance';
  };
  
  // Final assessment
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  autonomyLevel: 'full' | 'supervised' | 'restricted' | 'blocked';
  requiredApprovals: string[];
  safeguards: string[];
}

function assessRisk(action: Action, context: Context): RiskAssessment {
  const factors = computeFactors(action, context);
  
  // Compute base risk
  let risk = 'LOW';
  if (factors.environment === 'prod') risk = elevate(risk);
  if (factors.dataClassification === 'restricted') risk = elevate(risk);
  if (factors.reversibility === 'impossible') risk = elevate(risk);
  if (factors.scope === 'all') risk = elevate(risk);
  
  // Apply safeguard reductions
  const safeguards = availableSafeguards(action);
  for (const safeguard of safeguards) {
    risk = reduce(risk, safeguard.reduction);
  }
  
  return {
    action: action.name,
    resource: action.target,
    context,
    factors,
    riskLevel: risk,
    autonomyLevel: RISK_TO_AUTONOMY[risk],
    requiredApprovals: RISK_TO_APPROVALS[risk],
    safeguards: safeguards.map(s => s.name)
  };
}
```

---

## Autonomy Levels

### Full Autonomy
- Agent can proceed without human
- Audit trail recorded
- Used for LOW risk actions

### Supervised Autonomy
- Agent can proceed but human is notified
- Human can intervene within window
- Used for MEDIUM risk actions

### Restricted Autonomy
- Agent must request approval before proceeding
- Single human must approve
- Used for HIGH risk actions

### Blocked
- Agent cannot proceed
- Dual human approval required to unblock
- Used for CRITICAL risk actions

---

## Safeguards

Safeguards reduce effective risk:

| Safeguard | Risk Reduction | Applies To |
|-----------|----------------|------------|
| Rollback plan exists | -1 level | Deployments |
| Backup available | -1 level | Data modifications |
| Staged rollout | -1 level | Production changes |
| Monitoring in place | -0.5 level | All actions |
| Dry-run successful | -0.5 level | Commands |

---

## CARS in Action

```typescript
async function executeWithCARS(
  agent: Agent,
  action: Action,
  context: Context
): Promise<Result> {
  // 1. Assess risk
  const assessment = assessRisk(action, context);
  
  // 2. Check autonomy level
  switch (assessment.autonomyLevel) {
    case 'full':
      // Proceed immediately
      break;
      
    case 'supervised':
      // Notify and proceed
      await notify(assessment);
      break;
      
    case 'restricted':
      // Request and wait for approval
      const approval = await requestApproval(assessment);
      if (!approval.approved) {
        throw new Error('Action not approved');
      }
      break;
      
    case 'blocked':
      // Cannot proceed
      throw new Error(`Action blocked: ${assessment.riskLevel} risk`);
  }
  
  // 3. Execute with audit
  const result = await agent.execute(action);
  await audit.log({ assessment, result });
  
  return result;
}
```

---

## Integration Points

```yaml
integrates_with:
  - human-approval-gates: "CARS determines when gates activate"
  - mcp-production-runtime: "MCP calls assessed by CARS"
  - deployment-readiness: "Deployments require CARS assessment"
  - audit-logging: "All CARS decisions are logged"
```

---

*This framework ensures AI agents operate within appropriate risk boundaries.*
