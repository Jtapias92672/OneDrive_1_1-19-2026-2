# Epic 7.5: Verification & Validation Quality Framework

**Status:** NOT STARTED  
**Prerequisites:** Epic 07 (Agent Orchestration) ✅ COMPLETE  
**Source:** Tom's V&V Framework Proposal (2026-01-26)

---

## Executive Summary

Epic 7.5 establishes the **quality layer** for FORGE's agent orchestration system. While Epic 07 built the execution infrastructure (how agents run), this epic builds the verification infrastructure (how we prove they ran correctly).

### Core Principle
> "Verification asks 'did we build it right?' Validation asks 'did we build the right thing?' Both must pass."

---

## Background & References

This epic is grounded in established software engineering practices:

| Concept | Source | Application |
|---------|--------|-------------|
| V&V Separation | ISTQB Glossary | CheckerSpec structure |
| Test Pyramid | Martin Fowler, Google Testing Blog | Suite Registry tiers |
| Regression Reality | Empirical SE research (~5% change = regression) | Always-on regression checks |
| Time-boxed Suites | Industry practice (CloudBees, Atlassian) | Smoke/Sanity/Regression budgets |
| Complexity Reduction | Brooks (Mythical Man-Month), Cognitive Load Theory | Gate Rules decomposition policy |
| Context Window Limits | Anthropic research, "Lost in the Middle" | MVC enforcement, episodic execution |

---

## Architecture

### Integration with Epic 07 Infrastructure

```
Epic 07 (Execution Layer)          Epic 7.5 (Quality Layer)
─────────────────────────          ────────────────────────
.forge/lib/types.ts         ←───── Extended with V&V types
.forge/lib/ledger.ts        ←───── V&V status fields added
.forge/lib/hook.ts          ←───── CheckerSpec validation on create
.forge/lib/convoy.ts        ←───── Gate evaluation before dispatch

.forge/roles/orchestrator/  ←───── Consumes Gate Rules
.forge/roles/validator/     ←───── Consumes CheckerSpec
.forge/roles/translator/    ←───── Produces V&V evidence
.forge/roles/remediator/    ←───── Handles V&V failures
```

### New Directory Structure

```
.forge/
├── lib/                          # Epic 07 (exists)
│   ├── types.ts                  # Extended with V&V interfaces
│   ├── ledger.ts                 # Extended with V&V queries
│   ├── hook.ts                   # Extended with CheckerSpec validation
│   ├── convoy.ts                 # Extended with gate evaluation
│   └── vnv.ts                    # NEW: V&V evaluation engine
│
├── governance/                   # NEW: Quality policies
│   ├── gate_rules.yaml           # Gate definitions
│   ├── gate_rules.schema.json    # Schema validation
│   └── GOVERNANCE_EVAL.md        # Evaluation algorithm docs
│
├── suites/                       # NEW: Test suite definitions
│   ├── suite_registry.yaml       # Smoke/Sanity/Regression defs
│   └── suite_registry.schema.json
│
├── checker/                      # NEW: V&V contracts
│   ├── checker_spec.template.yaml
│   └── checker_spec.schema.json
│
├── work_items/                   # NEW: Per-task contracts
│   └── {WORK_ID}/
│       └── checker_spec.yaml     # Instance of template
│
└── receipts/                     # Extended with test evidence
    ├── receipt.schema.json       # Base schema (Epic 06)
    └── test_evidence.schema.json # V&V extension
```

---

## Deliverables

### Phase 1: Schema Foundation

| Deliverable | Description | Acceptance |
|-------------|-------------|------------|
| `checker_spec.schema.json` | JSON Schema for V&V contracts | Validates template cleanly |
| `checker_spec.template.yaml` | Work item V&V template | All required fields documented |
| `suite_registry.schema.json` | JSON Schema for suite defs | Validates template cleanly |
| `suite_registry.yaml` | Smoke/Sanity/Regression definitions | Time budgets enforced |
| `gate_rules.schema.json` | JSON Schema for gate policies | Validates template cleanly |
| `gate_rules.yaml` | PR/Merge/Release gate definitions | All gates have clear conditions |

### Phase 2: Type Extensions

| Deliverable | Description | Acceptance |
|-------------|-------------|------------|
| `types.ts` extensions | V&V interfaces (CheckerSpec, VnVResult, GateDecision) | TypeScript compiles |
| `ledger.ts` extensions | V&V status fields, queries by V&V state | Unit tests pass |
| Receipt schema extension | testEvidence + vnvSummary fields | Schema validates examples |

### Phase 3: Runtime Integration

| Deliverable | Description | Acceptance |
|-------------|-------------|------------|
| `vnv.ts` | V&V evaluation engine | Evaluates CheckerSpec against evidence |
| Hook validation | CheckerSpec required on hook creation | Hook creation fails without spec |
| Gate evaluation | Convoy dispatch blocked by failed gates | Orchestrator respects gate decisions |
| Validator role update | Consumes CheckerSpec as input | Validator produces V&V evidence |

### Phase 4: End-to-End Verification

| Deliverable | Description | Acceptance |
|-------------|-------------|------------|
| Sample work item | `work_items/SAMPLE-001/checker_spec.yaml` | Schema-valid, complete |
| Validation script | Single command validates all schemas | Exit 0 on valid, exit 1 on invalid |
| Integration test | Full V&V lifecycle through convoy | Receipt contains valid testEvidence |

---

## Capability Requirements

### CheckerSpec Capabilities

**MUST:**
- [ ] Define verification checks (technical correctness)
- [ ] Define validation checks (business correctness)
- [ ] Specify required test suite membership (smoke/sanity/regression)
- [ ] Declare evidence requirements for Receipt Pack
- [ ] Support priority levels (must/should/could)

**SHOULD:**
- [ ] Link to external artifacts (ticket, design, docs)
- [ ] Declare risk level and change surface
- [ ] Define non-goals explicitly

### Suite Registry Capabilities

**MUST:**
- [ ] Define three tiers: smoke (≤30min), sanity (≤3hr), regression (full)
- [ ] Specify include/exclude tags per suite
- [ ] Declare required trigger contexts (PR, merge, release)
- [ ] Enforce tagging conventions for all tests

**SHOULD:**
- [ ] Support quarantine tags for flaky tests
- [ ] Track suite membership changes over time

### Gate Rules Capabilities

**MUST:**
- [ ] Evaluate PR gate (smoke + targeted tests)
- [ ] Evaluate pre-merge gate (smoke + no quarantined in critical path)
- [ ] Evaluate release-candidate gate (conditional sanity for high-risk)
- [ ] Evaluate release gate (full regression + provenance)
- [ ] Block convoy dispatch on gate failure

**SHOULD:**
- [ ] Enforce complexity policy (max 2 active work items per run)
- [ ] Require decomposition for large stories (≥13 points or ≥5 modules)
- [ ] Require rich review for high-risk work

### Receipt Evidence Capabilities

**MUST:**
- [ ] Include test run metadata (suite, runner, duration, status)
- [ ] Include V&V summary (verification passed/failed, validation passed/failed)
- [ ] Link to test artifacts (results, junit, logs)
- [ ] Record failures with test ID, message, location

**SHOULD:**
- [ ] Track whether suite completed within time budget
- [ ] Include commit reference and branch

---

## Integration Points

### Validator Role Enhancement

Current Validator CLAUDE.md (Epic 07):
```markdown
## Tool Budget
- file-system: read artifacts
- image-compare: visual regression
- schema-validator: structural checks
```

Enhanced Validator CLAUDE.md (Epic 7.5):
```markdown
## Tool Budget
- file-system: read artifacts
- image-compare: visual regression  
- schema-validator: structural checks
- checker-spec: read V&V requirements    # NEW
- vnv-evaluator: assess evidence         # NEW

## Input Contract
- Hook work file (from Orchestrator)
- CheckerSpec for work item              # NEW
- Translation artifacts (from Translator)

## Output Contract
- validation_result.json
- vnv_evidence.json                      # NEW
- Receipt Pack contribution
```

### Orchestrator Role Enhancement

Current gate check (Epic 07): None (dispatch immediately)

Enhanced gate check (Epic 7.5):
```typescript
// Before dispatching convoy
const gateDecision = await evaluateGate('pre_dispatch', {
  checkerSpec: workItem.checkerSpec,
  currentEvidence: ledger.getEvidenceForWorkItem(workItem.id)
});

if (gateDecision.status === 'DENIED') {
  await ledger.recordEvent({
    type: 'GATE_BLOCKED',
    workItemId: workItem.id,
    gate: 'pre_dispatch',
    reasons: gateDecision.reasons
  });
  return; // Do not dispatch
}
```

### Ledger Extensions

New fields in task entries:
```typescript
interface TaskEntry {
  // Existing (Epic 07)
  id: string;
  type: TaskType;
  status: TaskStatus;
  // ...

  // New (Epic 7.5)
  vnv: {
    checkerSpecId: string;
    verificationStatus: 'pending' | 'passed' | 'failed';
    validationStatus: 'pending' | 'passed' | 'failed';
    gatesPassed: string[];  // ['pr', 'pre_merge']
    gatesFailed: string[];
  };
}
```

---

## Complexity Management

Tom's proposal includes explicit complexity controls that align with our Gas Town patterns:

| Control | Value | Rationale |
|---------|-------|-----------|
| `maxActiveWorkItemsPerRun` | 2 | Prevents coordination collapse (Brooks) |
| `requireDecompositionIf.storyPointsAtLeast` | 13 | Forces chunking of large work |
| `requireDecompositionIf.touchedModulesAtLeast` | 5 | Limits blast radius |
| `requireIntegrationPlanIfDecomposed` | true | Ensures reassembly strategy |

These map directly to worker-isolation MVC principles: agents should have minimum viable context, not maximum possible context.

---

## Test Strategy

### Schema Validation Tests
```bash
# Validate all schemas parse correctly
npx ajv validate -s checker/checker_spec.schema.json -d checker/checker_spec.template.yaml
npx ajv validate -s suites/suite_registry.schema.json -d suites/suite_registry.yaml
npx ajv validate -s governance/gate_rules.schema.json -d governance/gate_rules.yaml
```

### Unit Tests
- `vnv.test.ts`: V&V evaluation logic
- `gate.test.ts`: Gate decision logic
- `ledger-vnv.test.ts`: V&V query extensions

### Integration Tests
- Create work item with CheckerSpec
- Run translation convoy
- Verify gate blocks on missing evidence
- Complete validation, verify gate passes
- Verify Receipt contains testEvidence + vnvSummary

---

## Migration from Tom's Proposal

| Tom's Path | FORGE Path | Notes |
|------------|------------|-------|
| `forge_task_pack/checker/` | `.forge/checker/` | Matches existing structure |
| `forge_task_pack/suites/` | `.forge/suites/` | New directory |
| `forge_task_pack/governance/` | `.forge/governance/` | New directory |
| `forge_task_pack/receipts/` | `.forge/receipts/` | Extends existing |
| `forge_task_pack/prompts/claude_code_system.md` | `.forge/roles/orchestrator/CLAUDE.md` | Merge into role |
| `forge_task_pack/prompts/claude_code_task_prompt.md` | Removed | Covered by hook protocol |

---

## Definition of Done

Epic 7.5 is COMPLETE when:

1. **Schemas exist and validate**: All three schema files (checker, suite, gate) validate their templates
2. **Types compile**: Extended types.ts compiles without errors
3. **Ledger extended**: V&V fields queryable in ledger
4. **Gates enforce**: Convoy dispatch blocked by failed gates
5. **Validator consumes**: Validator role reads CheckerSpec and produces V&V evidence
6. **Receipt extended**: testEvidence + vnvSummary in Receipt Pack
7. **Integration test passes**: Full V&V lifecycle from work item creation to Receipt generation

---

## Appendix: Key References

- ISTQB Glossary: [Verification](https://istqb-glossary.page/verification/), [Validation](https://istqb-glossary.page/validation/)
- Martin Fowler: [Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- Google Testing Blog: [Just Say No to More E2E Tests](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html)
- Google Testing Blog: [SMURF](https://testing.googleblog.com/2024/10/smurf-beyond-test-pyramid.html)
- Anthropic: [Long-Running Agent Harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- arXiv: [Lost in the Middle](https://arxiv.org/abs/2307.03172)
- Brooks: Mythical Man-Month (communication overhead)
- Sweller: Cognitive Load Theory (working memory constraints)
