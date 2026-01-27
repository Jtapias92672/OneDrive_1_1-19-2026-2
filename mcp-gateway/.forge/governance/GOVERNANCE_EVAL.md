# GOVERNANCE_EVAL.md
# Epic 7.5: Governance Evaluation Documentation
# Updated: 2026-01-28 — E2E Testing Integration

## Purpose

This document describes how gates evaluate conditions and integrate with the testing taxonomy to control work flow through the FORGE pipeline.

---

## Testing Hierarchy (Authoritative)

### Visual Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         TESTING PIPELINE (Every Sprint)                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────┐     ┌─────────────┐     ┌─────────┐     ┌────────────────┐    │
│   │  UNIT   │ ──▶ │ STORY TEST  │ ──▶ │   E2E   │ ──▶ │ FULL REGRESSION│    │
│   │  TESTS  │     │   CASES     │     │  TESTS  │     │                │    │
│   └─────────┘     └─────────────┘     └─────────┘     └────────────────┘    │
│       │                 │                  │                  │              │
│    Developer         Tester            Tester         Automated CI          │
│    per story        per story         per sprint        on release          │
│                                                                               │
│   ◄─────────────────── SCOPE INCREASES ────────────────────────────────────▶ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Layer Definitions

| Layer | Owner | Cadence | CI Trigger | File Pattern |
|-------|-------|---------|------------|--------------|
| **Unit** | Developer | Per story | Every commit | `*.test.ts` |
| **Story** | Tester | Per story | Every PR | `*.story.test.ts` |
| **E2E** | Tester | Per sprint | Nightly | `*.e2e.ts` |
| **Full Regression** | CI | On release | Pre-release | All above |

---

## Regression Mode Definitions (Authoritative)

### Relationship Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                     FULL REGRESSION                            │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   ALL UNIT TESTS                         │  │
│  │                   npm run test:unit                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │               ALL STORY TEST CASES                       │  │
│  │               npm run test:story                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                  ALL E2E TESTS                           │  │
│  │                  npm run test:e2e                        │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │              SANITY TEST (subset)                │    │  │
│  │  │              @sanity + @smoke tags               │    │  │
│  │  │  ┌───────────────────────────────────────┐      │    │  │
│  │  │  │        SMOKE TEST (subset)            │      │    │  │
│  │  │  │        @smoke tags only               │      │    │  │
│  │  │  └───────────────────────────────────────┘      │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  npm run test:regression = ALL OF THE ABOVE                   │
└───────────────────────────────────────────────────────────────┘
```

### Mode Details

| Mode | Definition | Includes Unit? | Includes Story? | E2E Scope |
|------|------------|----------------|-----------------|-----------|
| **Smoke** | Limited E2E test | ❌ No | ❌ No | @smoke only |
| **Sanity** | Partial E2E test | ❌ No | ❌ No | @sanity + @smoke |
| **Full Regression** | Extensive test | ✅ Yes | ✅ Yes | All E2E |

### Key Clarifications

1. **Smoke and Sanity are E2E subsets** — They do NOT include unit tests or story tests
2. **Full Regression is the union** — It runs ALL layers, not just E2E
3. **E2E grows each sprint** — As features are added, E2E coverage expands

---

## Gate-to-Test Mapping

### Which Tests Run at Which Gate?

| Gate | Unit | Story | E2E | Smoke | Sanity | Full Regression |
|------|------|-------|-----|-------|--------|-----------------|
| PR Merge | ✅ | ✅ | ❌ | ❌ | ⚠️ Optional | ❌ |
| Nightly | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Pre-Release | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Post-Deployment | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Sprint Boundary | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Gate Evaluation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GATE EVALUATION                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐                                                   │
│  │ PR MERGE     │──▶ Unit ✓ + Story ✓ + TypeScript ✓ + Lint ✓      │
│  │ Gate         │    = AUTHORIZED for merge                         │
│  └──────────────┘                                                   │
│         │                                                            │
│         ▼                                                            │
│  ┌──────────────┐                                                   │
│  │ NIGHTLY      │──▶ Unit ✓ + Story ✓ + E2E ✓                      │
│  │ Gate         │    = AUTHORIZED (build healthy)                   │
│  └──────────────┘                                                   │
│         │                                                            │
│         ▼                                                            │
│  ┌──────────────┐                                                   │
│  │ PRE-RELEASE  │──▶ Full Regression ✓ (Unit + Story + E2E)        │
│  │ Gate         │    + Security ✓ + Docs ✓                          │
│  └──────────────┘    = AUTHORIZED for release                       │
│         │                                                            │
│         ▼                                                            │
│  ┌──────────────┐                                                   │
│  │ POST-DEPLOY  │──▶ Smoke ✓ (limited E2E subset)                  │
│  │ Gate         │    = AUTHORIZED (stay deployed)                   │
│  └──────────────┘    or DENIED → ROLLBACK                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## E2E Test Requirements

### Sprint Requirements

Every sprint MUST:
1. Add E2E tests for new features
2. Maintain all existing E2E tests passing
3. Tag new critical paths with `@smoke`
4. Tag new major components with `@sanity`

### E2E Test Structure

```
e2e/
├── fixtures/                    # Test data
│   ├── sample-figma-file.json
│   └── expected-outputs/
├── pipeline/                    # Pipeline flow tests
│   ├── figma-to-ast.e2e.ts
│   ├── ast-to-react.e2e.ts
│   └── full-pipeline.e2e.ts    # @smoke
├── orchestration/               # Agent tests
│   ├── agent-flow.e2e.ts
│   └── ledger-integration.e2e.ts
├── governance/                  # Policy tests
│   ├── policy-enforcement.e2e.ts  # @sanity
│   └── audit-trail.e2e.ts
└── accuracy/                    # Validation tests
    ├── claim-validation.e2e.ts
    └── calibration.e2e.ts
```

### Tagging Examples

```typescript
// @smoke — Critical path, runs post-deployment
describe('@smoke FORGE Pipeline Happy Path', () => {
  it('@smoke transforms Figma to Mendix', async () => {
    const result = await pipeline.run(fixture);
    expect(result.mpk).toBeDefined();
  });
});

// @sanity — Major component, runs pre-merge
describe('@sanity Governance Policy Enforcement', () => {
  it('@sanity evaluates default policies', async () => {
    const result = await governance.evaluate(action);
    expect(result.decision).toBe('AUTHORIZED');
  });
});

// No tag — Full E2E only
describe('Edge Case: Malformed Input', () => {
  it('handles missing node IDs', async () => {
    const result = await pipeline.run(malformedFixture);
    expect(result.errors).toContain('MISSING_NODE_ID');
  });
});
```

---

## CI Command Reference

### Required Scripts (package.json)

```json
{
  "scripts": {
    "test:unit": "vitest run --testPathPattern='*.test.ts' --exclude='*.e2e.ts' --exclude='*.story.test.ts'",
    "test:story": "vitest run --testPathPattern='*.story.test.ts'",
    "test:e2e": "vitest run --testPathPattern='*.e2e.ts'",
    "test:smoke": "vitest run --testPathPattern='*.e2e.ts' --testNamePattern='@smoke'",
    "test:sanity": "vitest run --testPathPattern='*.e2e.ts' --testNamePattern='@sanity|@smoke'",
    "test:regression": "vitest run"
  }
}
```

### Execution Matrix

| Command | Unit | Story | E2E (smoke) | E2E (sanity) | E2E (full) |
|---------|------|-------|-------------|--------------|------------|
| `npm run test:unit` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `npm run test:story` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `npm run test:e2e` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `npm run test:smoke` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `npm run test:sanity` | ❌ | ❌ | ✅ | ✅ | ❌ |
| `npm run test:regression` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Acceptance Criteria (Epic 7.5)

### Structural Requirements

- [ ] **AC-7.5.1:** E2E test directory exists (`e2e/`)
- [ ] **AC-7.5.2:** At least one E2E test file exists with `.e2e.ts` extension
- [ ] **AC-7.5.3:** E2E entry point command exists (`npm run test:e2e`)
- [ ] **AC-7.5.4:** Smoke test entry point exists (`npm run test:smoke`)
- [ ] **AC-7.5.5:** Sanity test entry point exists (`npm run test:sanity`)
- [ ] **AC-7.5.6:** Full regression entry point exists (`npm run test:regression`)

### Execution Requirements

- [ ] **AC-7.5.7:** `npm run test:regression` executes Unit + Story + E2E tests
- [ ] **AC-7.5.8:** `npm run test:smoke` executes subset of E2E tests (@smoke tagged)
- [ ] **AC-7.5.9:** `npm run test:sanity` executes superset of Smoke (@sanity + @smoke)
- [ ] **AC-7.5.10:** All regression modes return exit code 0 when passing

### Coverage Requirements

- [ ] **AC-7.5.11:** E2E tests cover all critical user workflows
- [ ] **AC-7.5.12:** Smoke tests cover deployment-critical paths
- [ ] **AC-7.5.13:** Sanity tests cover all major system components

### Documentation Requirements

- [ ] **AC-7.5.14:** Test taxonomy documented in GOVERNANCE_EVAL.md
- [ ] **AC-7.5.15:** E2E test tagging convention documented

---

## Sprint Boundary Verification

### Checklist

```bash
#!/bin/bash
# .forge/scripts/verify-testing-taxonomy.sh

echo "=== EPIC 7.5 TESTING TAXONOMY VERIFICATION ==="

echo -e "\n1. Verify all test modes exist:"
npm run test:unit -- --passWithNoTests 2>&1 | tail -3
npm run test:story -- --passWithNoTests 2>&1 | tail -3
npm run test:e2e -- --passWithNoTests 2>&1 | tail -3
npm run test:smoke -- --passWithNoTests 2>&1 | tail -3
npm run test:sanity -- --passWithNoTests 2>&1 | tail -3
npm run test:regression -- --passWithNoTests 2>&1 | tail -3

echo -e "\n2. Verify E2E directory structure:"
ls -la e2e/ 2>/dev/null || ls -la src/lib/e2e/ | head -10

echo -e "\n3. Test counts by layer:"
echo "Unit tests: $(grep -r 'describe\|it(' --include='*.test.ts' --exclude='*.e2e.ts' --exclude='*.story.test.ts' | wc -l)"
echo "Story tests: $(grep -r 'describe\|it(' --include='*.story.test.ts' | wc -l)"
echo "E2E tests: $(grep -r 'describe\|it(' --include='*.e2e.ts' | wc -l)"

echo -e "\n4. E2E tag distribution:"
echo "Smoke tagged: $(grep -r '@smoke' --include='*.e2e.ts' | wc -l)"
echo "Sanity tagged: $(grep -r '@sanity' --include='*.e2e.ts' | wc -l)"

echo -e "\n=== VERIFICATION COMPLETE ==="
```

---

## References

- ISTQB Glossary: Verification vs Validation
- Martin Fowler: Practical Test Pyramid
- Google Testing Blog: Test Classification
- ArcFoundry: verification-quality-library
