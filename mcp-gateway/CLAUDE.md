# Project: FORGE (Figma-to-React Generation Engine)

## Overview
Enterprise-grade AI-assisted design-to-code platform. Converts Figma designs to production React components via MCP Gateway architecture.

## Tech Stack
- Runtime: Node.js 20+ / TypeScript 5.x
- Framework: Express (Gateway), Custom (Packages)
- Testing: Jest with coverage enforcement
- Build: tsup, TypeScript
- Infrastructure: AWS (Lambda, EKS, Bedrock)

---

## PHILOSOPHY (READ FIRST — NON-NEGOTIABLE)

**Primary Objective:** Code that works correctly
**Secondary Objective:** Tests that prove it works
**Tertiary:** Coverage metrics as investigation guides

### What Matters

1. **Does the code work correctly?**
2. **Is it robust and enterprise-grade?**
3. **Can it handle edge cases and errors gracefully?**
4. **Is functionality verified through actual testing?**

### What Does NOT Matter

- Hitting arbitrary coverage percentages
- Number of tests (quality over quantity)
- Metrics for metrics' sake
- Unit coverage when integration tests prove functionality

### The Core Question

Before claiming ANYTHING complete, answer:

> "What CAPABILITIES are proven to work? What is the EVIDENCE?"

NOT: "What percentage did I achieve?"

---

## COVERAGE AS INVESTIGATION GUIDE

Coverage metrics tell you **WHERE TO LOOK**, not **WHAT TO ACHIEVE**.

**Low coverage means:** "Investigate this area — is real functionality untested?"

**It does NOT mean:** "Write tests until the number goes up."

### Classification of Uncovered Code

| Type | Examples | Action |
|------|----------|--------|
| **DEFENSIVE** | catch blocks, null guards, switch defaults | Accept + document |
| **REAL** | Business logic, feature paths | Verify it works (unit OR integration) |
| **DEAD** | Never-called code | Remove it |

**Critical:** Integration tests count as verification. If `tests/integration/` proves a feature works, unit coverage gaps on that feature are acceptable.

---

## PROJECT-SPECIFIC STANDARDS

### Key Paths
- Source: `src/`, `packages/*/src/`
- Tests: `tests/`, `__tests__/`, `*.test.ts`
- Config: `infrastructure/`
- Docs: `.forge/`

### Package Structure
```
packages/
├── figma-parser/      # Epic 05 - Figma API → ParsedDesign
├── react-generator/   # Epic 06 - ParsedDesign → React code
└── [future packages]
```

### Build Commands
```bash
npm run build          # Must succeed
npm test               # All tests must pass
npm test -- --coverage # Guidepost, not destination
```

---

## CAPABILITY-DRIVEN VERIFICATION

### Pre-Task: Declare What Must Work

```
## Task: [description]

### Capabilities to Verify
1. [Feature A] must [behavior]
2. [Feature B] must [behavior]
3. Error case: [condition] must [fail gracefully]

### Evidence Required
- Test output showing each capability
- NOT: coverage percentage
```

### Pre-Completion: Prove Capabilities Work

```
=== Verification Report ===
Task: [name]

Capabilities Proven:
1. [Feature A]: [test name] proves [behavior] ✅
2. [Feature B]: [test name] proves [behavior] ✅
3. Error handling: [test name] proves [graceful failure] ✅

Evidence: [test output or file reference]
Status: COMPLETE (all capabilities verified)
```

### Status Determination

| Condition | Status |
|-----------|--------|
| Build fails | BLOCKED |
| Tests fail | BROKEN |
| REAL functionality unverified | NEEDS WORK |
| All capabilities proven (any test type) | COMPLETE |

---

## SESSION DISCIPLINE

### Turn Counting (MANDATORY)

Track in every response: `[Turn N/10]`

**At Turn 10:** STOP. Execute compaction.

### Token Limits

| Type | Limit |
|------|-------|
| Response to user | <500 preferred, <800 max |
| Directive to Claude Code | <200 tokens |

---

## ANTI-PATTERNS (IMMEDIATE STOP)

- ❌ "Coverage is X%" as success criteria
- ❌ Writing tests to increase numbers (not prove functionality)
- ❌ Ignoring integration tests that prove functionality
- ❌ Claiming COMPLETE without stating CAPABILITIES proven

---

## Epic Tracking
See: `.forge/progress.md`

Current: Epic 10b (Platform UI Dashboard)
Completed: Epics 00-05, Epic 06 (React Generator)

## Skills
See: `.forge/skills/MANIFEST.md`

## Contacts
- Owner: JT
- Org: ArcFoundry
