# FORGE B-D Platform: Master Epic Roadmap

> **For Claude Code Agents:** This is your navigation file. Each epic has a detailed TASKS.md.
> **ArcFoundry Skills:** atomic-task-breakdown + long-running-agent-harness patterns.
> **Success Criteria:** `forge-success-criteria/` contains 12 components with 120+ acceptance tests.

**Total Epics:** 14 (including split Epic 10)  
**Total Tasks:** ~137 atomic tasks  
**Total Token Budget:** 665K tokens  
**Estimated Duration:** 70 days (~2.5 months)

---

## ⚠️ Success Criteria Framework Integration

Each epic maps to specific Success Criteria components. **Before marking an epic complete:**

1. Run acceptance tests: `pnpm test:acceptance --criteria=XX-01,XX-02,...`
2. Validate schemas: `npx ajv validate -s forge-success-criteria/schemas/[schema].json`
3. Check alignment matrix: `EPIC-SUCCESS-CRITERIA-ALIGNMENT.md`

### Critical Epics (Security/Compliance)
- **Epic 3.75:** Must pass DP-01→DP-10 (Data Protection)
- **Epic 8:** Must pass EP-01→EP-10 (Evidence Packs)

---

## Build Philosophy: True Ralph Loop

Each task is designed for a **single fresh Claude session** (~5-15 minutes, 5-15K tokens).

**Why fresh sessions?**
- Context rot begins at ~30-40K tokens
- Auto-compaction loses technical nuance
- Each task gets full LLM attention
- Based on "Lost in the Middle" research (Liu et al., 2023)

**Session Pattern:**
```
1. Start NEW Claude session
2. Run: .forge/agent-bootstrap.sh task
3. Read progress.md + current epic's TASKS.md
4. Complete ONE task
5. Verify against Success Criteria (if applicable)
6. Update progress.md
7. EXIT session
8. REPEAT
```

---

## Epic Dependency Graph

```
                        Epic 1 (Foundation)
                              │
                              ▼
                        Epic 2 (Answer Contract)
                        [01_ANSWER_CONTRACT]
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        Epic 5          Epic 3          Epic 9
      (Figma Parser)  (FORGE C Core)  (Infrastructure)
                      [04_QUALITATIVE] [11_OBSERVABILITY]
              │               │               │
              ▼               ▼               │
        Epic 6          Epic 3.75           │
    (React Generator) (Code Execution)      │
                      [09_DATA_PROTECTION]  │
              │               │ ⚠️ SECURITY  │
              │               ▼               │
              │         Epic 4              │
              │     (Convergence)◀──────────┘
              │     [05_CONVERGENCE_ENGINE]
              │          │ │
              │    ┌─────┘ └─────┐
              │    ▼             ▼
              │  Epic 7       Epic 8 ⚠️ COMPLIANCE
              │ (Test Gen)  (Evidence Packs)
              │ [08_RUBRIC]  [06_EVIDENCE_PACK]
              │    │             │
              └────┼─────────────┘
                   │
                   ▼
           Epic 10a (Platform UI Core)
           [12_HUMAN_REVIEW]
                   │
                   ▼
           Epic 10b (Platform UI Features)
           [12_HUMAN_REVIEW, 10_ORCHESTRATION]
                   │
                   ▼
             Epic 11 (Integrations)
             [10_ORCHESTRATION]
                   │
                   ▼
             Epic 12 (E2E Testing)
             [ALL COMPONENTS]
```

---

## Token Budget by Epic (with Success Criteria)

| Epic | Name | Tasks | Tokens | Days | Success Criteria | Status |
|------|------|-------|--------|------|------------------|--------|
| 1 | Foundation | 11 | 40K | 3 | — | ⏳ |
| 2 | Answer Contract | 12 | 50K | 4 | **01_ANSWER_CONTRACT** | ⏳ |
| 3 | FORGE C Core | 12 | 60K | 5 | **04_QUALITATIVE_VALIDATION** | ⏳ |
| 3.75 | Code Execution | 10 | 20K | 3 | **09_DATA_PROTECTION** ⚠️ | ⏳ |
| 4 | Convergence Engine | 14 | 70K | 6 | **05_CONVERGENCE_ENGINE** | ⏳ |
| 5 | Figma Parser | 10 | 50K | 5 | — | ⏳ |
| 6 | React Generator | 12 | 60K | 5 | — | ⏳ |
| 7 | Test Generation | 10 | 40K | 4 | **08_RUBRIC_LIBRARY** | ⏳ |
| 8 | Evidence Packs | 8 | 35K | 3 | **06_EVIDENCE_PACK** ⚠️ | ⏳ |
| 9 | Infrastructure | 12 | 55K | 5 | **11_OBSERVABILITY** | ⏳ |
| 10a | Platform UI Core | 8 | 25K | 4 | **12_HUMAN_REVIEW** | ⏳ |
| 10b | Platform UI Features | 8 | 25K | 4 | **12_HUMAN_REVIEW** | ⏳ |
| 11 | Integrations | 10 | 40K | 5 | **10_ORCHESTRATION** | ⏳ |
| 12 | E2E Testing | 10 | 45K | 5 | **ALL** | ⏳ |
| **TOTAL** | | **~137** | **665K** | **70** | **120+ criteria** | |

---

## Individual Epic Files (with Success Criteria Alignment)

Each epic has a detailed TASKS.md file with Success Criteria cross-references:

```
epics/
├── epic-01-foundation/TASKS.md
├── epic-02-answer-contract/TASKS.md      → 01_ANSWER_CONTRACT (AC-01 to AC-10)
├── epic-03-forge-c-core/TASKS.md         → 04_QUALITATIVE_VALIDATION (QV-01 to QV-10)
├── epic-03.75-code-execution/TASKS.md    → 09_DATA_PROTECTION (DP-01 to DP-10) ⚠️
├── epic-04-convergence/TASKS.md          → 05_CONVERGENCE_ENGINE (CE-01 to CE-10)
├── epic-05-figma-parser/TASKS.md
├── epic-06-react-generator/TASKS.md
├── epic-07-test-generation/TASKS.md      → 08_RUBRIC_LIBRARY (RL-01 to RL-10)
├── epic-08-evidence-packs/TASKS.md       → 06_EVIDENCE_PACK (EP-01 to EP-10) ⚠️
├── epic-09-infrastructure/TASKS.md       → 11_OBSERVABILITY (OB-01 to OB-10)
├── epic-10a-platform-ui-core/TASKS.md    → 12_HUMAN_REVIEW (HR-01 to HR-10)
├── epic-10b-platform-ui-features/TASKS.md → 12_HUMAN_REVIEW + 10_ORCHESTRATION
├── epic-11-integrations/TASKS.md         → 10_ORCHESTRATION (OR-01 to OR-10)
└── epic-12-e2e-testing/TASKS.md          → ALL COMPONENTS
```

**Success Criteria Framework:**
```
forge-success-criteria/
├── 00_MASTER_ROADMAP.md              # Navigation hub
├── 01_ANSWER_CONTRACT.md             # Contract schema requirements
├── 02_STRUCTURAL_VALIDATION.md       # Layer 1: JSON Schema
├── 03_SEMANTIC_VALIDATION.md         # Layer 2: Cross-refs, placeholders
├── 04_QUALITATIVE_VALIDATION.md      # Layer 3: LLM-Judge
├── 05_CONVERGENCE_ENGINE.md          # Iteration loop
├── 06_EVIDENCE_PACK.md               # Audit artifacts ⚠️
├── 07_RULE_SYSTEM.md                 # FORGE.md rules
├── 08_RUBRIC_LIBRARY.md              # Scoring rubrics
├── 09_DATA_PROTECTION.md             # PII/secrets ⚠️
├── 10_ORCHESTRATION.md               # Multi-agent
├── 11_OBSERVABILITY.md               # Metrics/dashboards
├── 12_HUMAN_REVIEW.md                # Approval gates
├── schemas/
│   ├── answer-contract.schema.json
│   ├── evidence-pack.schema.json
│   └── rubric.schema.json
├── templates/
└── examples/
```

---

## Session Workflow (with Success Criteria)

### Starting a New Session

```bash
# 1. Navigate to project root
cd /path/to/forge-bd-platform

# 2. Run bootstrap script
.forge/agent-bootstrap.sh task

# 3. This will:
#    - Show current epic and task
#    - Show applicable Success Criteria
#    - Display progress summary
#    - Load relevant TASKS.md context
```

### During the Session

1. Read the current task completely
2. Note which Success Criteria apply (if any)
3. Implement EXACTLY what's specified
4. Run verification commands
5. **Run Success Criteria acceptance tests** (if applicable)
6. Confirm "Done When" criteria met

### Ending the Session

```bash
# 1. Update progress.md with task completion
# 2. Commit changes
git commit -m "Task X.Y.Z: [task name] - COMPLETE [SC: XX-01, XX-02]"

# 3. Exit session cleanly
# DO NOT start next task in same session
```

---

## Quick Reference: Task Format (with Success Criteria)

```markdown
### Task X.Y.Z: [Descriptive Name]

**Time:** 5 minutes | **Tokens:** ~4K
**Success Criteria Reference:** XX_COMPONENT § Criterion ID

**Files to CREATE:**
- `exact/path/to/file.ts`

**Purpose:** [One sentence why this task exists]

**Code:**
```typescript
// Complete implementation
```

**Verification:**
```bash
pnpm build && pnpm test
```

**Success Criteria Verification:**
```bash
pnpm test:acceptance --criteria=XX-01
```

**Done When:** [Specific acceptance criteria aligned with Success Criteria]
```

---

## Master Completion Checklist

### Month 1: Core Engines (Weeks 1-4)
- [ ] Epic 1: Foundation (Days 1-3)
- [ ] Epic 2: Answer Contract (Days 4-7) → AC-01 to AC-10
- [ ] Epic 3: FORGE C Core (Days 8-12) → QV-01 to QV-10
- [ ] Epic 3.75: Code Execution (Days 13-15) → DP-01 to DP-10 ⚠️
- [ ] Epic 4: Convergence Engine (Days 16-21) → CE-01 to CE-10

### Month 2: Generation & Infrastructure (Weeks 5-8)
- [ ] Epic 5: Figma Parser (Days 22-26)
- [ ] Epic 6: React Generator (Days 27-31)
- [ ] Epic 7: Test Generation (Days 32-35) → RL-01 to RL-10
- [ ] Epic 8: Evidence Packs (Days 36-38) → EP-01 to EP-10 ⚠️
- [ ] Epic 9: Infrastructure (Days 39-43) → OB-01 to OB-10

### Month 2.5: Platform & Integration (Weeks 9-10)
- [ ] Epic 10a: Platform UI Core (Days 44-47) → HR-01 to HR-10
- [ ] Epic 10b: Platform UI Features (Days 48-51) → HR-01 to HR-10
- [ ] Epic 11: Integrations (Days 52-56) → OR-01 to OR-10
- [ ] Epic 12: E2E Testing (Days 57-61) → ALL CRITERIA

### Final Deliverables
- [ ] All packages build (`pnpm build`)
- [ ] All tests pass (`pnpm test`) with >80% coverage
- [ ] **All Success Criteria pass** (`pnpm test:acceptance --all`)
- [ ] Schema validation passes for all outputs
- [ ] Documentation complete in each package
- [ ] Deployment guides in `docs/deployment/`
- [ ] Alpha release tagged `v0.1.0-alpha`

---

## Critical Rules

### DO
- ✅ Complete ONE task per session
- ✅ Verify against Success Criteria before marking done
- ✅ Update progress.md after each task
- ✅ Commit with descriptive messages (include SC references)
- ✅ Exit session after task completion

### DON'T
- ❌ Work on multiple tasks in one session
- ❌ Skip Success Criteria verification
- ❌ Skip verification steps
- ❌ Mark tasks done without testing
- ❌ Leave environment in broken state
- ❌ Exceed 15K tokens per session

---

## Recovery Procedures

### If Build Breaks
```bash
# Check what changed
git diff HEAD~3

# Run diagnostics
pnpm build --verbose 2>&1 | head -50

# If stuck, rollback
git reset --hard HEAD~1
```

### If Success Criteria Fails
```bash
# Run specific criterion test
pnpm test:acceptance --criteria=XX-01 --verbose

# Check criterion definition
cat forge-success-criteria/XX_COMPONENT.md | grep "XX-01" -A 20

# Verify against schema
npx ajv validate -s forge-success-criteria/schemas/[schema].json -d output.json
```

### If Context Exhausted
1. STOP immediately
2. Document current state in progress.md
3. Commit partial work: `git commit -m "WIP: Task X.Y.Z - partial"`
4. Exit session
5. Start fresh session to continue

---

## Package Map

```
packages/
├── core/               # @forge/core - Shared types, utils
├── answer-contract/    # @forge/answer-contract - Contract schema, validators
├── forge-c/            # @forge/forge-c - Main orchestrator
├── convergence/        # @forge/convergence - Convergence engine
├── figma-parser/       # @forge/figma-parser - Figma API integration
├── react-generator/    # @forge/react-generator - React code generation
├── test-generator/     # @forge/test-generator - Test generation
├── evidence-pack/      # @forge/evidence-pack - Compliance evidence
├── infrastructure/     # @forge/infrastructure - Deployment configs
├── integrations/       # @forge/integrations - Third-party integrations
└── platform-ui/        # @forge/platform-ui - Next.js dashboard
```

---

*Generated by atomic-task-breakdown + long-running-agent-harness skills*  
*Success Criteria Framework: forge-success-criteria/ (12 components, 120+ criteria)*  
*Last Updated: 2026-01-17*
