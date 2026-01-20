# obra/superpowers Skills Analysis for ArcFoundry Integration

## PREFLIGHT MANIFEST

**Scanned Locations:**
- `/mnt/skills/user/` - 50+ ArcFoundry skills (verified)
- `/mnt/skills/public/` - 6 Anthropic skills (docx, pdf, pptx, xlsx, frontend-design, product-self-knowledge)
- `/mnt/skills/examples/` - 10 example skills
- `https://github.com/obra/superpowers` - 14 core skills analyzed

---

## Executive Summary

The **obra/superpowers** repository represents a mature, battle-tested workflow system for AI agent development. It excels in areas where ArcFoundry currently has gaps, particularly in **pre-implementation design discipline**, **TDD enforcement**, and **systematic debugging protocols**.

### Key Finding
Your existing skills library is strong on **governance, compliance, and agent orchestration**. Superpowers fills the **front-of-pipeline** gap—the discipline to stop and think BEFORE coding.

---

## 🎯 HIGH-PRIORITY Skills to Incorporate

### 1. **brainstorming** → `forge-design-discovery`
**What it does:** Forces Socratic dialogue BEFORE any implementation. Asks one question at a time to refine requirements.

**Gap it fills:** Your skills jump to implementation. This enforces the "define the problem" phase.

**ArcFoundry Adaptation:**
```markdown
---
name: forge-design-discovery
description: Use BEFORE any feature work, UI design, or system modification. Forces requirements refinement through Socratic dialogue.
---
# Forge Design Discovery

Announce: "I'm using the forge-design-discovery skill to clarify requirements."

## MANDATORY Before ANY Implementation

1. **Context Gathering**
   - What problem are we solving?
   - Who experiences this problem?
   - What does success look like?

2. **Design Questions** (one at a time)
   - Mental Models: Does the user expect canvas or list?
   - Information Architecture: How should components group?
   - Edge Cases: What happens when there's no data?

3. **Output**: Design document saved to `docs/designs/YYYY-MM-DD-<feature>.md`

**Integration:** Pairs with ArcFoundry's verification-pillars for post-implementation validation.
```

---

### 2. **writing-plans** → `atomic-task-breakdown`
**What it does:** Breaks work into 2-5 minute atomic tasks with exact file paths, complete code, and verification steps.

**Gap it fills:** Your `long-running-agent-harness` tracks progress but doesn't enforce granular task definition.

**Key Pattern to Extract:**
- Every task has: exact file path, complete code (not "add validation"), verification command, expected output
- Designed for "enthusiastic junior engineer with no context"

**ArcFoundry Adaptation:**
```markdown
---
name: atomic-task-breakdown
description: Use after design approval. Breaks work into 2-5 minute atomic tasks.
---
# Atomic Task Breakdown

## Task Template
### Task N: [Name]
**File:** `exact/path/to/file.ts`
**Purpose:** [One sentence]
**Code:**
```typescript
// Complete implementation, not pseudocode
```
**Verify:** `npm test -- path/to/test.ts`
**Expected:** "5 passing, 0 failing"

## Principles
- DRY, YAGNI, TDD
- Commit after each green test
- No task exceeds 5 minutes
```

---

### 3. **verification-before-completion** → Enhance existing `verification-protocol`
**What it does:** Requires FRESH verification output before ANY completion claim.

**Key Insight:** "Evidence before claims, always." If you haven't run the command in this message, you cannot claim it passes.

**Enhancement for your `verification-protocol`:**
```markdown
## MANDATORY VERIFICATION CHAIN

BEFORE claiming ANY status:
1. IDENTIFY: What command proves this claim?
2. RUN: Execute FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence

**BANNED PHRASES:**
- "should be working now"
- "tests are passing" (without output)
- "I've fixed it" (without verification)
```

---

### 4. **systematic-debugging** → `4-phase-root-cause`
**What it does:** Enforces 4-phase debugging: Reproduce → Isolate → Diagnose → Fix+Verify

**Gap it fills:** Your `jt1-recovery-protocol` handles crisis management but not systematic debugging.

**Key Patterns:**
- **Root Cause Tracing**: Trace backward through call stack
- **Defense in Depth**: Add validation at multiple layers after finding root cause
- **Condition-Based Waiting**: Replace arbitrary timeouts with condition polling

**ArcFoundry Integration:**
```markdown
---
name: 4-phase-root-cause
description: Use when debugging any issue. Systematic > guessing.
---
# 4-Phase Root Cause Analysis

## Phase 1: Reproduce
- Write failing test that demonstrates the bug
- Document exact steps to reproduce
- NO FIXING until test exists

## Phase 2: Isolate
- Add logging at each component boundary
- Identify WHERE it breaks (not WHY yet)

## Phase 3: Diagnose
- Trace backward from symptom to root cause
- Document evidence chain

## Phase 4: Fix + Verify
- Implement minimal fix
- Run failing test → watch it pass
- Add regression test

**If 3+ fixes failed:** Question the architecture. Stop and consult.

**Related Skills:** 
- `@jt1-recovery-protocol` for crisis management
- `@verification-protocol` for completion verification
```

---

### 5. **test-driven-development** → `tdd-enforcement`
**What it does:** Enforces RED-GREEN-REFACTOR with psychological resistance to shortcuts.

**Critical Pattern:** "Write code before test? DELETE IT. Start over."

**Key Anti-Patterns to Block:**
- "I'll add tests after"
- "This is too simple to test"
- "I tested manually"
- "Let me explore first, then test"

**ArcFoundry Adaptation:**
```markdown
---
name: tdd-enforcement
description: MANDATORY for all code changes. No exceptions.
---
# TDD Enforcement

**THE IRON LAW:** No implementation code without failing test first.

## RED-GREEN-REFACTOR Cycle

```graphviz
RED → verify fails → GREEN → verify passes → REFACTOR → verify still green → RED
```

## Rationalizations (All Mean: Delete Code, Start Over)
| Rationalization | Response |
|----------------|----------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll add tests after" | Tests-after are biased. Test-first discovers edge cases. |
| "I tested manually" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Let me explore first" | Fine. Throw away exploration, start with TDD. |
| "This is just a prototype" | Prototypes become production. Test it. |

**ENFORCEMENT:**
- Pre-commit hook blocks commits without associated test changes
- CI fails on coverage regression
- Code review checklist includes TDD verification
```

---

### 6. **subagent-driven-development** → `two-stage-review`
**What it does:** Fresh subagent per task + two-stage review (spec compliance, then code quality).

**Gap it fills:** Your `agent-orchestration` skill coordinates agents but doesn't define review stages.

**Key Pattern:**
1. **Implementer subagent** completes task
2. **Spec compliance reviewer** verifies implementation matches spec exactly (catches over-building AND under-building)
3. **Code quality reviewer** (only runs after spec compliance passes)

**ArcFoundry Integration:**
```markdown
---
name: two-stage-review
description: Use after any subagent completes work. Prevents spec drift.
---
# Two-Stage Review Protocol

## Stage 1: Spec Compliance Review
**Reviewer Prompt:**
"You are a skeptical reviewer. Read the ACTUAL code (don't trust the implementer's report). 
Verify: Does the implementation match the spec EXACTLY? Nothing missing, nothing extra."

**Pass Criteria:**
- All requirements implemented
- No gold-plating (unnecessary features)
- No scope creep

## Stage 2: Code Quality Review
**Only runs after Stage 1 passes**

**Reviewer Prompt:**
"Review for: clean code, test coverage, maintainability, security."

**Integrates with:** `@slop-tests` for automatic AI slop detection
```

---

### 7. **using-superpowers** → `skill-discipline-protocol`
**What it does:** Forces agents to check for applicable skills BEFORE any response.

**Key Pattern:** "Even a 1% chance a skill might apply means you should invoke it."

**Critical for ArcFoundry:**
```markdown
---
name: skill-discipline-protocol
description: Bootstrap skill. Loaded at session start.
---
# Skill Discipline Protocol

**THE RULE:** IF A SKILL APPLIES, YOU MUST USE IT.
- This is not negotiable
- This is not optional
- You cannot rationalize your way out of this

## Skill Selection Flow

```graphviz
User message → "Might any skill apply?" 
  → YES (even 1%) → Invoke Skill → Follow exactly
  → Definitely not → Respond normally
```

## Rationalizations (All Invalid)
| Excuse | Truth |
|--------|-------|
| "I already know this" | Knowing ≠ using. Invoke it. |
| "I need more context first" | Skills tell you HOW to explore. Check first. |
| "Let me explore first" | Undisciplined action wastes time. |
| "This is simple" | Simple things become complex. Use it. |

## Priority Order
1. Process skills (brainstorming, debugging) BEFORE implementation skills
2. Rigid skills (TDD, verification) → Follow exactly
3. Flexible skills (patterns) → Adapt principles to context
```

---

## 🟡 MEDIUM-PRIORITY Skills (Consider for Phase 2)

### 8. **receiving-code-review**
**Pattern:** "Verify before implementing. Ask before assuming."
- Stop if any item unclear
- No performative agreement ("Great point!")
- Push back with technical reasoning if wrong

### 9. **requesting-code-review**
**Pattern:** Pre-review checklist before requesting human review.

### 10. **dispatching-parallel-agents**
**Pattern:** One agent per independent problem domain. Good for your FORGE multi-agent architecture.

### 11. **finishing-a-development-branch**
**Pattern:** Clean completion workflow: verify tests → present options (merge/PR/keep/discard) → cleanup.

### 12. **using-git-worktrees**
**Pattern:** Isolated workspaces for parallel development.

---

## 🟢 ALREADY COVERED in ArcFoundry

| Superpowers Skill | ArcFoundry Equivalent |
|-------------------|----------------------|
| writing-skills | skill-creator (examples) |
| executing-plans | long-running-agent-harness |
| parallel agents | agent-orchestration |

---

## Implementation Recommendations

### Phase 1: Core Discipline (Immediate)
1. **forge-design-discovery** - Stop coding before thinking
2. **tdd-enforcement** - No code without tests
3. **verification-before-completion** - Enhance existing skill
4. **4-phase-root-cause** - Systematic debugging

### Phase 2: Workflow Enhancement (Week 2-3)
5. **atomic-task-breakdown** - Granular task definition
6. **two-stage-review** - Spec + quality review
7. **skill-discipline-protocol** - Session bootstrap

### Phase 3: Advanced Patterns (Week 4+)
8. Receiving/requesting code review
9. Git worktrees for isolation
10. Branch completion workflow

---

## Key Architectural Insight

Superpowers uses **DOT/GraphViz flowcharts as authoritative process definition**. This prevents "description drift" where agents follow the short description instead of the detailed workflow.

**Recommendation:** Update ArcFoundry skills to use flowcharts as the source of truth, with prose as supporting content.

---

## File Locations for New Skills

Per your instructions:
- PERSISTENT: `/mnt/user-data/outputs/settings/skills/`
- NOT persistent: `/mnt/skills/user/` (ephemeral)

All new skills should be written to the PERSISTENT location.
