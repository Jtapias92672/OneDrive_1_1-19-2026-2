# FORGE Gate Evaluation Algorithm

Documentation for how gates are evaluated in the V&V Quality Framework.

## Overview

Gates are checkpoints in the CI/CD pipeline that enforce quality standards before work can proceed. Each gate evaluates a set of conditions and returns either **AUTHORIZED** or **DENIED**.

## Evaluation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    GATE EVALUATION                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. LOAD CONTEXT                                            │
│     ├── CheckerSpec for work item                           │
│     ├── Current test suite results                          │
│     ├── Coverage metrics                                    │
│     └── Risk assessment                                     │
│                                                             │
│  2. CHECK REQUIRED SUITES                                   │
│     ├── For each required suite:                            │
│     │   └── If not passed → DENY                            │
│     └── All passed → continue                               │
│                                                             │
│  3. CHECK TARGETED TESTS (if required)                      │
│     ├── If required and not passed → DENY                   │
│     └── Passed or not required → continue                   │
│                                                             │
│  4. EVALUATE DENY CONDITIONS                                │
│     ├── For each denyIf condition:                          │
│     │   ├── Evaluate expression against context             │
│     │   ├── If true and not overridable → DENY              │
│     │   └── If true and overridable → check override        │
│     └── No denies triggered → continue                      │
│                                                             │
│  5. EVALUATE WARN CONDITIONS                                │
│     └── Collect warnings (non-blocking)                     │
│                                                             │
│  6. CHECK APPROVAL REQUIREMENTS                             │
│     ├── If required and not approved → DENY                 │
│     └── Approved or not required → continue                 │
│                                                             │
│  7. RUN ADDITIONAL CHECKS                                   │
│     ├── For each additionalCheck:                           │
│     │   ├── Execute command                                 │
│     │   └── If fails and required → DENY                    │
│     └── All passed → continue                               │
│                                                             │
│  8. RETURN DECISION                                         │
│     ├── No denies → AUTHORIZED                              │
│     └── Any deny → DENIED with reasons                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Gate Types

| Gate | Trigger | Purpose |
|------|---------|---------|
| `pr` | PR creation | Fast feedback before review |
| `pre_merge` | Before merge to main | Quality check before integration |
| `release_candidate` | Promotion to RC | Validation before staging |
| `release` | Production release | Final quality gate |
| `pre_dispatch` | Convoy dispatch | Ensure prerequisites for agents |

## Condition Expressions

Conditions use a simple expression language:

### Operators

| Operator | Example | Meaning |
|----------|---------|---------|
| `==` | `risk.level == 'high'` | Equality |
| `!=` | `status != 'passed'` | Inequality |
| `<` | `coverage < 80` | Less than |
| `>` | `failures > 0` | Greater than |
| `<=` | `points <= 5` | Less or equal |
| `>=` | `reviewers >= 2` | Greater or equal |
| `&&` | `a && b` | Logical AND |
| `||` | `a || b` | Logical OR |

### Context Variables

| Variable | Type | Description |
|----------|------|-------------|
| `smoke.passed` | boolean | Smoke suite passed |
| `smoke.failed` | number | Failed smoke tests count |
| `sanity.passed` | boolean | Sanity suite passed |
| `sanity.notRun` | boolean | Sanity suite not executed |
| `regression.failed` | number | Failed regression tests |
| `coverage` | number | Current coverage % |
| `coverage.delta` | number | Coverage change |
| `risk.level` | string | CARS risk level |
| `checkerSpec.missing` | boolean | No CheckerSpec found |
| `checkerSpec.invalid` | boolean | CheckerSpec fails validation |
| `workItem.storyPoints` | number | Story point estimate |
| `workItem.touchedModules` | number | Modules affected |
| `verificationChecks.mustFailed` | number | Failed must-priority V checks |
| `validationChecks.mustFailed` | number | Failed must-priority B checks |
| `quarantine.inCriticalPath` | boolean | Quarantined test blocking |

## Override Mechanism

Some deny conditions can be overridden:

```yaml
denyIf:
  - condition: "regression.failed > 0"
    reason: "Regression tests failed"
    overridable: true
    overrideRequires: ["cto-approval", "documented-exception"]
```

Override requirements:
1. All listed approvals must be obtained
2. Override is logged in audit trail
3. Reason must be documented

## Complexity Rules

### Max Active Work Items

```yaml
complexity:
  maxActiveWorkItemsPerRun: 2
```

Prevents coordination collapse by limiting concurrent work.

**Rationale:** Brooks' Law - adding more parallel work increases communication overhead exponentially.

### Decomposition Requirements

```yaml
requireDecompositionIf:
  storyPointsAtLeast: 13
  touchedModulesAtLeast: 5
```

Large work items must be broken down:
- ≥13 story points → decompose
- ≥5 modules touched → decompose

**Rationale:** Cognitive load theory - humans can't effectively reason about large scope.

### Integration Plan

```yaml
requireIntegrationPlanIfDecomposed: true
```

If work is decomposed, an integration plan is required to ensure pieces fit together.

## Communication Policy

### Risk-Based Escalation

| Risk Level | Actions |
|------------|---------|
| Low | Standard review |
| Medium | Standard review + warning |
| High | Rich review + stakeholder notification |
| Critical | Rich review + multiple channels + audit |

### Rich Review

High/Critical risk work requires "rich review":
- Detailed explanation of changes
- Risk mitigation documentation
- Test evidence linked
- Stakeholder sign-off

## Audit Policy

Random audit ensures quality standards are maintained:

```yaml
audit:
  enabled: true
  randomAuditRate: 0.1  # 10% of work items
  alwaysAuditIf:
    - "risk.level == 'critical'"
    - "touchesSecurityCode"
```

**Purpose:** Detect alignment faking (per Anthropic research) - agents may appear compliant but cut corners when not monitored.

## Implementation

```typescript
async function evaluateGate(
  gateName: string,
  context: GateContext
): Promise<GateDecision> {
  const rules = await loadGateRules();
  const gate = rules.gates[gateName];

  const reasons: string[] = [];
  let status: 'AUTHORIZED' | 'DENIED' = 'AUTHORIZED';

  // 1. Check required suites
  for (const suite of gate.requiredSuites) {
    if (!context.suiteResults[suite]?.passed) {
      status = 'DENIED';
      reasons.push(`Required suite '${suite}' not passed`);
    }
  }

  // 2. Check targeted tests
  if (gate.requireTargetedTests && !context.targetedTestsPassed) {
    status = 'DENIED';
    reasons.push('Targeted tests required but not passed');
  }

  // 3. Evaluate deny conditions
  for (const deny of gate.denyIf || []) {
    if (evaluateCondition(deny.condition, context)) {
      if (!deny.overridable || !hasOverride(deny, context)) {
        status = 'DENIED';
        reasons.push(deny.reason);
      }
    }
  }

  // 4. Check approval
  if (gate.requireApproval?.required && !context.approved) {
    status = 'DENIED';
    reasons.push('Approval required');
  }

  return {
    gate: gateName,
    status,
    reasons,
    evaluatedAt: new Date().toISOString()
  };
}
```

## References

- human-review-gates.md (ArcFoundry skill)
- CARS framework (risk assessment)
- Brooks, "Mythical Man-Month" (complexity)
- Anthropic, "Alignment Faking" (audit policy)
