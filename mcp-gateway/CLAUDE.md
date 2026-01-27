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

### Session Management Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/clear` | Reset everything EXCEPT CLAUDE.md | After failed approach, before new strategy |
| `/compact` | Summarize progress, compress context | Mid-session when responses slow or drift detected |

### Thinking Budget Allocation

Use these keywords to allocate reasoning budget:

| Keyword | Use Case | Example |
|---------|----------|---------|
| `think` | Standard decisions | "Think about the best file structure" |
| `think hard` | Architectural choices, refactors | "Think hard about how to restructure this service" |
| `ultrathink` | High-stakes decisions, multiple valid paths | "Ultrathink about the migration strategy" |

**When to Trigger Extended Thinking:**
- Before any file with 200+ lines of changes
- Before architectural decisions affecting 3+ files
- When multiple valid approaches exist
- Before deleting or significantly refactoring existing code

### Operator Controls

| Action | Key | Use Case |
|--------|-----|----------|
| **Stop execution** | `ESC` | Hallucination detected, wrong path |
| **Jump back** | `ESC` x2 | Return to previous decision point |
| **Hard stop** | `Ctrl+C` | Emergency abort |

### Turn Counting (MANDATORY)

Track in every response: `[Turn N/10]`

**At Turn 10:** STOP. Execute compaction.

### Token Limits

| Type | Limit |
|------|-------|
| Response to user | <500 preferred, <800 max |
| Directive to Claude Code | <200 tokens |

### Token Guardrails (Epic-Level)

| Threshold | Action |
|-----------|--------|
| 60K tokens | Evaluate progress, consider session split |
| 80K tokens | STOP, commit, handoff to fresh session |
| Context compacted | Quality audit required in fresh session |

### Command Output Guardrails (ENFORCED)

| Command Type | Max Lines | Pattern |
|--------------|-----------|---------|
| `npm test` | 20 lines | `\| tail -20` |
| `npm run build` | 15 lines | `\| tail -15` |
| `cat` / file view | 100 lines | Use `head -100` or line ranges |
| `find` / `ls -R` | 50 lines | `\| head -50` |
| `git diff` | stat only | `--stat` (no full diffs) |
| `git log` | 5 commits | `-5` max |

**VIOLATION = CONTEXT BLOWOUT = SESSION DEATH**

### Per-Phase Reporting

After completing each phase of an epic:
```
Phase N complete. Tokens: ~X/Y (Z%)
Proceeding to Phase N+1 / Requesting session split
```

### Epic Budget Guidelines

| Epic Type | Budget | Sessions |
|-----------|--------|----------|
| Simple feature | 30K | 1 |
| Runtime/lib | 60K | 1 |
| Schema-heavy | 80-120K | 1-2 |
| Cross-cutting | 100-150K | 2 |

**Reference:** `.forge/LESSONS_LEARNED.md` for detailed patterns

---

## ANTI-PATTERNS (IMMEDIATE STOP)

- ❌ "Coverage is X%" as success criteria
- ❌ Writing tests to increase numbers (not prove functionality)
- ❌ Ignoring integration tests that prove functionality
- ❌ Claiming COMPLETE without stating CAPABILITIES proven

---

## CODEBASE NAVIGATION

### Preferred: Native CLI Tools

Use grep/find/glob for codebase search — reads actual current files, not stale indexes.

```bash
# Find implementations
grep -r "functionName" src/ --include="*.ts" | head -20

# Find files by pattern
find . -name "*.service.ts" -type f | head -30

# Count occurrences
grep -c "pattern" src/**/*.ts
```

**Why CLI > RAG for Code:**
- No index drift
- Syntax-aware (actual file content)
- Matches how senior engineers navigate repos
- Respects .gitignore patterns

---

## SESSION HANDOFF PROTOCOL

### Persistent Handoff File: `TICKET.md`

At cycle limit OR session end, create/update `TICKET.md` in repo root:

```markdown
# TICKET.md — Session Handoff

## Last Session
- **Date:** [date]
- **Cycles:** [N]/10
- **Commit:** [hash]

## Completed
- [x] Task 1
- [x] Task 2

## In Progress
- [ ] Task 3 — stopped at: [specific point]

## Next Session Must
1. [Specific first action]
2. [Specific second action]

## Context Notes
- [Any decisions made that affect next steps]
- [Any blockers discovered]
```

### Handoff Rules
1. TICKET.md is committed with session-end commit
2. Next session reads TICKET.md FIRST before any work
3. TICKET.md is updated, not replaced (preserves history)

---

## VERIFICATION-FIRST DEVELOPMENT

Every file creation follows:

1. **Declare expected output** before implementation
2. **Create test file** before or alongside implementation
3. **Run tests** after every file change
4. **Fix failures** before proceeding
5. **Commit** only when tests pass

### Test Command Pattern (ALWAYS)
```bash
npm test -- --testPathPattern=[pattern] 2>&1 | tail -20
```

Never run unbounded `npm test` without tail.

---

## Epic Tracking
See: `.forge/progress.md`

Current: Epic 14 complete, Epic 11 scaffolded
Completed: Epics 00-07, 7.5, 10b, 13, 14, 15

## Skills
See: `.forge/skills/MANIFEST.md`

## Contacts
- Owner: JT
- Org: ArcFoundry
