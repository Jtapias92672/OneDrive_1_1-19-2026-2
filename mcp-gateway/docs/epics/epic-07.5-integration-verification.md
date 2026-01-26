# Epic 7.5 Integration Verification Plan

**Purpose:** Substantiate that V&V Quality Framework integrates into both Claude Code workflows AND the FORGE application product.

**Author:** Lead Engineer  
**Date:** 2026-01-26  
**Status:** PRE-IMPLEMENTATION VERIFICATION

---

## 1. Integration Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ARCFOUNDRY IP INTEGRATION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    EXISTING SKILLS (ArcFoundry IP)                   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ verification-quality-library/                                        │   │
│  │   ├── expected-output-protocol.md  ──┐                               │   │
│  │   └── human-review-gates.md  ───────┼──► EXTENDS INTO Epic 7.5      │   │
│  │                                      │                               │   │
│  │ arcfoundry-skill-library/            │                               │   │
│  │   └── CARS framework  ──────────────┘                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    EPIC 7.5 (New V&V Framework)                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  CheckerSpec ◄───── Formalizes expected-output-protocol             │   │
│  │  Gate Rules  ◄───── Formalizes human-review-gates                   │   │
│  │  Suite Registry ◄── Operationalizes test organization               │   │
│  │  Receipt Evidence ◄─ Binds proof to claims                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                    ┌───────────────┴───────────────┐                       │
│                    ▼                               ▼                       │
│  ┌────────────────────────────┐    ┌────────────────────────────┐         │
│  │   CC WORKFLOW INTEGRATION  │    │   FORGE APP INTEGRATION    │         │
│  │   (How agents operate)     │    │   (Product we ship)        │         │
│  └────────────────────────────┘    └────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Existing Skill → Epic 7.5 Mapping

| Existing ArcFoundry IP | Epic 7.5 Formalization | Integration Type |
|------------------------|------------------------|------------------|
| expected-output-protocol.md | `CheckerSpec.verification[]` | **Extension** - EOP becomes structured schema |
| expected-output-protocol.md | `CheckerSpec.validation[]` | **Extension** - Adds business validation |
| human-review-gates.md | `gate_rules.yaml` | **Operationalization** - Gates become policy |
| human-review-gates.md (Alignment Faking warning) | Gate random audit protocol | **Enhancement** - Automated audit hooks |
| CARS risk levels | `CheckerSpec.risk.level` | **Binding** - Risk drives gate requirements |
| CARS escalation | `gate_rules.communicationPolicy` | **Binding** - Risk triggers rich review |

### Key Insight
Epic 7.5 doesn't replace existing skills — it **codifies them into enforceable schemas and runtime checks**.

---

## 3. Claude Code Workflow Integration

### 3.1 Where CC Workflows Consume Epic 7.5

| CC Workflow Phase | Epic 7.5 Artifact | How It's Used |
|-------------------|-------------------|---------------|
| **Task Intake** | `checker_spec.yaml` | CC reads spec before starting work |
| **Pre-Implementation** | `gate_rules.yaml` | CC evaluates PR gate requirements |
| **During Implementation** | `suite_registry.yaml` | CC knows which tests to write/tag |
| **Post-Implementation** | Receipt + testEvidence | CC produces evidence artifacts |
| **Quality Check** | `vnv.ts` evaluator | CC calls evaluator to verify V&V |

### 3.2 Role CLAUDE.md Modifications Required

```markdown
# .forge/roles/orchestrator/CLAUDE.md — ADDITIONS

## Input Contract (NEW)
- work_items/{WORK_ID}/checker_spec.yaml MUST exist before convoy dispatch
- gate_rules.yaml defines dispatch authorization

## Pre-Dispatch Gate Check (NEW)
Before dispatching ANY convoy:
1. Load CheckerSpec for work item
2. Evaluate gate_rules.yaml for 'pre_dispatch' gate
3. If DENIED → Record in ledger, do NOT dispatch
4. If AUTHORIZED → Proceed with convoy creation

## Output Contract (MODIFIED)
- All hooks include checker_spec_id reference
- Convoy manifest includes gate authorization record
```

```markdown
# .forge/roles/validator/CLAUDE.md — ADDITIONS

## Input Contract (MODIFIED)
- Hook work file (existing)
- CheckerSpec from work_items/{WORK_ID}/ (NEW)
- Translation artifacts from Translator (existing)

## Validation Process (NEW)
1. Load CheckerSpec.verification[] checks
2. Execute verification checks against artifacts
3. Load CheckerSpec.validation[] checks  
4. Execute validation checks (business correctness)
5. Produce vnv_evidence.json with pass/fail per check

## Output Contract (MODIFIED)
- validation_result.json (existing)
- vnv_evidence.json (NEW) — structured V&V results
- Updates ledger with vnv.verificationStatus, vnv.validationStatus
```

### 3.3 CC System Prompt Integration

The prompts Tom provided merge into role CLAUDE.md files:

| Tom's Prompt | Merge Target | Notes |
|--------------|--------------|-------|
| `claude_code_system.md` | `.forge/roles/orchestrator/CLAUDE.md` | Governance rules |
| `claude_code_task_prompt.md` | Hook work file protocol | Task-specific context |

---

## 4. FORGE App Integration

### 4.1 Runtime Code Integration Points

```typescript
// .forge/lib/types.ts — ADDITIONS

// V&V Types (Epic 7.5)
export interface CheckerSpec {
  version: string;
  workItem: WorkItemMeta;
  intent: Intent;
  risk: RiskAssessment;
  verification: CheckBlock;
  validation: CheckBlock;
  testSuites: SuiteRequirements;
  evidence: EvidenceRequirements;
  definitionOfDone: string[];
}

export interface VnVResult {
  checkerSpecId: string;
  verification: {
    mustPass: string[];
    passed: string[];
    failed: string[];
  };
  validation: {
    mustPass: string[];
    passed: string[];
    failed: string[];
  };
  overallStatus: 'PASS' | 'FAIL';
}

export interface GateDecision {
  gate: 'pr' | 'pre_merge' | 'release_candidate' | 'release' | 'pre_dispatch';
  status: 'AUTHORIZED' | 'DENIED';
  reasons: string[];
  requiredActions?: string[];
  evaluatedAt: string;
}
```

```typescript
// .forge/lib/ledger.ts — ADDITIONS

export interface TaskEntry {
  // Existing fields...
  
  // V&V fields (Epic 7.5)
  vnv?: {
    checkerSpecId: string;
    verificationStatus: 'pending' | 'passed' | 'failed';
    validationStatus: 'pending' | 'passed' | 'failed';
    gatesPassed: string[];
    gatesFailed: string[];
    lastEvaluated: string;
  };
}

// New queries
export function queryByVnVStatus(
  status: 'pending' | 'passed' | 'failed',
  type: 'verification' | 'validation'
): TaskEntry[];

export function queryFailedGates(): TaskEntry[];
```

```typescript
// .forge/lib/vnv.ts — NEW FILE

import { CheckerSpec, VnVResult, GateDecision } from './types';
import { readYaml, readJson } from './utils';

/**
 * Load and validate CheckerSpec for work item
 */
export async function loadCheckerSpec(workItemId: string): Promise<CheckerSpec> {
  const specPath = `.forge/work_items/${workItemId}/checker_spec.yaml`;
  const spec = await readYaml(specPath);
  
  // Validate against schema
  await validateAgainstSchema(spec, '.forge/checker/checker_spec.schema.json');
  
  return spec;
}

/**
 * Evaluate verification checks against evidence
 */
export async function evaluateVerification(
  spec: CheckerSpec,
  evidence: Evidence
): Promise<VnVResult['verification']> {
  const mustPass = spec.verification.checks
    .filter(c => c.priority === 'must')
    .map(c => c.id);
  
  const results = await Promise.all(
    spec.verification.checks.map(check => executeCheck(check, evidence))
  );
  
  return {
    mustPass,
    passed: results.filter(r => r.passed).map(r => r.id),
    failed: results.filter(r => !r.passed).map(r => r.id)
  };
}

/**
 * Evaluate gate rules for authorization decision
 */
export async function evaluateGate(
  gateName: string,
  context: GateContext
): Promise<GateDecision> {
  const rules = await readYaml('.forge/governance/gate_rules.yaml');
  const gateRule = rules.gates[gateName];
  
  const reasons: string[] = [];
  let status: 'AUTHORIZED' | 'DENIED' = 'AUTHORIZED';
  
  // Check required suites
  for (const suite of gateRule.requiredSuites || []) {
    if (!context.suiteResults[suite]?.passed) {
      status = 'DENIED';
      reasons.push(`Required suite '${suite}' not passed`);
    }
  }
  
  // Check targeted tests
  if (gateRule.requireTargetedTests && !context.targetedTestsPassed) {
    status = 'DENIED';
    reasons.push('Targeted tests not passed');
  }
  
  // Check deny conditions
  for (const deny of gateRule.denyIf || []) {
    if (evaluateCondition(deny.condition, context)) {
      status = 'DENIED';
      reasons.push(`Deny condition met: ${deny.condition}`);
    }
  }
  
  return {
    gate: gateName,
    status,
    reasons,
    evaluatedAt: new Date().toISOString()
  };
}
```

```typescript
// .forge/lib/hook.ts — MODIFICATIONS

import { loadCheckerSpec } from './vnv';

export async function createHook(task: Task, options: HookOptions): Promise<Hook> {
  // NEW: Validate CheckerSpec exists
  if (!options.skipCheckerSpecValidation) {
    const spec = await loadCheckerSpec(task.workItemId);
    if (!spec) {
      throw new Error(`CheckerSpec required for work item ${task.workItemId}`);
    }
    task.checkerSpecId = spec.workItem.id;
  }
  
  // Existing hook creation logic...
}
```

```typescript
// .forge/lib/convoy.ts — MODIFICATIONS

import { evaluateGate } from './vnv';

export async function dispatchConvoy(convoy: Convoy): Promise<DispatchResult> {
  // NEW: Evaluate pre-dispatch gate
  const gateDecision = await evaluateGate('pre_dispatch', {
    checkerSpec: convoy.checkerSpec,
    suiteResults: convoy.currentSuiteResults || {},
    targetedTestsPassed: convoy.targetedTestsPassed || false
  });
  
  if (gateDecision.status === 'DENIED') {
    await ledger.recordEvent({
      type: 'GATE_BLOCKED',
      convoyId: convoy.id,
      gate: 'pre_dispatch',
      reasons: gateDecision.reasons
    });
    
    return {
      status: 'BLOCKED',
      reason: 'Pre-dispatch gate denied',
      gateDecision
    };
  }
  
  // Existing dispatch logic...
}
```

### 4.2 Schema Files (FORGE App Artifacts)

These become **shipped product artifacts**:

| File | Purpose | Ships With |
|------|---------|------------|
| `.forge/checker/checker_spec.schema.json` | Validates work item contracts | FORGE App |
| `.forge/checker/checker_spec.template.yaml` | Starting point for new work | FORGE App |
| `.forge/suites/suite_registry.schema.json` | Validates suite definitions | FORGE App |
| `.forge/suites/suite_registry.yaml` | Default suite configuration | FORGE App |
| `.forge/governance/gate_rules.schema.json` | Validates gate policies | FORGE App |
| `.forge/governance/gate_rules.yaml` | Default gate policies | FORGE App |

### 4.3 Receipt Schema Extension

```json
// .forge/receipts/receipt.schema.json — EXTENSIONS

{
  "properties": {
    "testEvidence": {
      "$ref": "#/$defs/testEvidence"
    },
    "vnvSummary": {
      "$ref": "#/$defs/vnvSummary"
    }
  },
  "$defs": {
    "testEvidence": {
      "type": "object",
      "required": ["runs", "summary"],
      "properties": {
        "runs": {
          "type": "array",
          "items": { "$ref": "#/$defs/testRun" }
        },
        "summary": {
          "type": "object",
          "required": ["overallStatus", "suites"],
          "properties": {
            "overallStatus": { "enum": ["pass", "fail"] },
            "suites": { "type": "array" }
          }
        }
      }
    },
    "vnvSummary": {
      "type": "object",
      "required": ["verification", "validation"],
      "properties": {
        "verification": { "$ref": "#/$defs/vnvBlock" },
        "validation": { "$ref": "#/$defs/vnvBlock" }
      }
    }
  }
}
```

---

## 5. Test Strategy

### 5.1 Unit Tests (Per Module)

| Test File | Coverage | Acceptance |
|-----------|----------|------------|
| `vnv.test.ts` | loadCheckerSpec, evaluateVerification, evaluateValidation | All checks evaluate correctly |
| `gate.test.ts` | evaluateGate for all gate types | AUTHORIZED/DENIED decisions correct |
| `ledger-vnv.test.ts` | V&V queries, status updates | Query by V&V status works |
| `hook-vnv.test.ts` | Hook creation with CheckerSpec validation | Fails without spec |
| `convoy-vnv.test.ts` | Convoy dispatch with gate evaluation | Blocks on failed gate |

### 5.2 Schema Validation Tests

```bash
#!/bin/bash
# .forge/scripts/validate-schemas.sh

set -e

echo "Validating CheckerSpec..."
npx ajv validate \
  -s .forge/checker/checker_spec.schema.json \
  -d .forge/checker/checker_spec.template.yaml

echo "Validating Suite Registry..."
npx ajv validate \
  -s .forge/suites/suite_registry.schema.json \
  -d .forge/suites/suite_registry.yaml

echo "Validating Gate Rules..."
npx ajv validate \
  -s .forge/governance/gate_rules.schema.json \
  -d .forge/governance/gate_rules.yaml

echo "All schemas valid ✓"
```

### 5.3 Integration Test (Full Lifecycle)

```typescript
// .forge/lib/integration-vnv.test.ts

describe('Epic 7.5 V&V Integration', () => {
  
  it('should block convoy dispatch without CheckerSpec', async () => {
    const convoy = createConvoyFromFigma('test.fig', {
      workItemId: 'MISSING-SPEC-001'
    });
    
    const result = await dispatchConvoy(convoy);
    
    expect(result.status).toBe('BLOCKED');
    expect(result.reason).toContain('CheckerSpec required');
  });
  
  it('should block convoy dispatch when gate fails', async () => {
    // Create work item with CheckerSpec but no passing tests
    await createWorkItem('TEST-001', validCheckerSpec);
    
    const convoy = createConvoyFromFigma('test.fig', {
      workItemId: 'TEST-001',
      suiteResults: { smoke: { passed: false } }
    });
    
    const result = await dispatchConvoy(convoy);
    
    expect(result.status).toBe('BLOCKED');
    expect(result.gateDecision.reasons).toContain("Required suite 'smoke' not passed");
  });
  
  it('should authorize and dispatch when gate passes', async () => {
    await createWorkItem('TEST-002', validCheckerSpec);
    
    const convoy = createConvoyFromFigma('test.fig', {
      workItemId: 'TEST-002',
      suiteResults: { smoke: { passed: true } },
      targetedTestsPassed: true
    });
    
    const result = await dispatchConvoy(convoy);
    
    expect(result.status).toBe('DISPATCHED');
  });
  
  it('should produce valid Receipt with V&V evidence', async () => {
    // Full pipeline: create → translate → validate → receipt
    const workItemId = 'TEST-003';
    await createWorkItem(workItemId, validCheckerSpec);
    
    const convoy = createConvoyFromFigma('test.fig', { workItemId });
    await dispatchConvoy(convoy);
    await completeAllHooks(convoy);
    
    const receipt = await generateReceipt(workItemId);
    
    // Validate receipt has V&V fields
    expect(receipt.testEvidence).toBeDefined();
    expect(receipt.vnvSummary).toBeDefined();
    expect(receipt.vnvSummary.verification.passed).toContain('V-1');
    expect(receipt.vnvSummary.validation.passed).toContain('B-1');
    
    // Validate receipt against schema
    const valid = await validateAgainstSchema(
      receipt, 
      '.forge/receipts/receipt.schema.json'
    );
    expect(valid).toBe(true);
  });
  
});
```

### 5.4 Capability Verification Matrix

| Capability | Unit Test | Integration Test | Manual Verification |
|------------|-----------|------------------|---------------------|
| CheckerSpec loads and validates | `vnv.test.ts` | ✓ | Review schema against Tom's spec |
| Verification checks execute | `vnv.test.ts` | ✓ | Run against sample work item |
| Validation checks execute | `vnv.test.ts` | ✓ | Run against sample work item |
| Gate rules evaluate correctly | `gate.test.ts` | ✓ | Test each gate type |
| Hook creation requires spec | `hook-vnv.test.ts` | ✓ | Attempt hook without spec |
| Convoy blocked by failed gate | `convoy-vnv.test.ts` | ✓ | Verify ledger records block |
| Receipt contains V&V evidence | N/A | ✓ | Inspect receipt JSON |
| Schema validates templates | `validate-schemas.sh` | N/A | Run script |

---

## 6. Verification Checklist

### Pre-Implementation Verification

- [ ] Tom's original documents archived in `docs/proposals/vnv-framework/`
- [ ] Epic 7.5 document reviewed by Joe (CDO approval)
- [ ] Existing skill overlap identified and documented (this document)
- [ ] Integration points mapped to specific files and functions

### Implementation Verification

- [ ] All schema files created and validate templates
- [ ] types.ts extended with V&V interfaces (compiles)
- [ ] ledger.ts extended with V&V queries (tests pass)
- [ ] vnv.ts created with evaluation logic (tests pass)
- [ ] hook.ts modified to require CheckerSpec (tests pass)
- [ ] convoy.ts modified with gate evaluation (tests pass)
- [ ] Role CLAUDE.md files updated (Orchestrator, Validator)
- [ ] validate-schemas.sh script works

### Post-Implementation Verification

- [ ] Integration test passes (full lifecycle)
- [ ] Sample work item created and processed
- [ ] Receipt generated with testEvidence + vnvSummary
- [ ] Gate blocking verified (denied scenarios)
- [ ] Gate authorization verified (approved scenarios)

### Deployment Verification

- [ ] Schemas included in FORGE app artifacts
- [ ] Default gate_rules.yaml ships with product
- [ ] Default suite_registry.yaml ships with product
- [ ] Documentation updated for end users

---

## 7. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Schema changes break existing receipts | Version field in schemas; migration script if needed |
| Gate rules too strict, blocks legitimate work | Start with lenient defaults; tighten over time |
| CC workflow doesn't read CheckerSpec | Integration test catches this; mandatory test before merge |
| Overlap with existing skills causes confusion | This document clarifies relationship; update skill READMEs |

---

## 8. Definition of Done (Epic 7.5)

Epic 7.5 is **COMPLETE** when:

1. ✅ All schema files exist and validate templates
2. ✅ types.ts compiles with V&V extensions
3. ✅ ledger.ts V&V queries work (unit tests pass)
4. ✅ vnv.ts evaluator works (unit tests pass)
5. ✅ hook.ts requires CheckerSpec (unit tests pass)
6. ✅ convoy.ts evaluates gates (unit tests pass)
7. ✅ Role CLAUDE.md files updated
8. ✅ Integration test passes (full lifecycle)
9. ✅ Sample work item processed successfully
10. ✅ Receipt contains valid testEvidence + vnvSummary

---

## Appendix: File Change Summary

### New Files (Epic 7.5)

```
.forge/
├── lib/vnv.ts                              # V&V evaluation engine
├── governance/
│   ├── gate_rules.yaml
│   ├── gate_rules.schema.json
│   └── GOVERNANCE_EVAL.md
├── suites/
│   ├── suite_registry.yaml
│   └── suite_registry.schema.json
├── checker/
│   ├── checker_spec.template.yaml
│   └── checker_spec.schema.json
├── work_items/
│   └── SAMPLE-001/checker_spec.yaml
└── scripts/validate-schemas.sh
```

### Modified Files (Epic 7.5)

```
.forge/
├── lib/
│   ├── types.ts                            # +V&V interfaces
│   ├── ledger.ts                           # +V&V queries
│   ├── hook.ts                             # +CheckerSpec validation
│   └── convoy.ts                           # +Gate evaluation
├── roles/
│   ├── orchestrator/CLAUDE.md              # +Gate check instructions
│   └── validator/CLAUDE.md                 # +CheckerSpec consumption
└── receipts/
    └── receipt.schema.json                 # +testEvidence, vnvSummary
```

---

*This integration verification plan ensures Epic 7.5 is built correctly and tested thoroughly before deployment.*
