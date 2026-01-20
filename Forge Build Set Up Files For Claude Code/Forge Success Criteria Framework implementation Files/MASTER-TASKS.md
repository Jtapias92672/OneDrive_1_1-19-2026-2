# FORGE B-D Platform: Master Epic Roadmap

> **For Claude Code Agents:** This is your navigation file. Each epic has a detailed TASKS.md.
> **ArcFoundry Skills:** atomic-task-breakdown + long-running-agent-harness patterns.
> **Success Criteria:** `forge-success-criteria/` contains 14 components with 170+ acceptance tests.
> **Updated:** 2026-01-19 (Added Epic 13 & 14)

**Total Epics:** 16 (including split Epic 10 and Epic 14 sub-epics)  
**Total Tasks:** ~177 atomic tasks  
**Total Token Budget:** 785K tokens  
**Estimated Duration:** 80 days (~2.75 months)

---

## ⚠️ Success Criteria Framework Integration

Each epic maps to specific Success Criteria components. **Before marking an epic complete:**

1. Run acceptance tests: `pnpm test:acceptance --criteria=XX-01,XX-02,...`
2. Validate schemas: `npx ajv validate -s forge-success-criteria/schemas/[schema].json`
3. Check alignment matrix: `EPIC-SUCCESS-CRITERIA-ALIGNMENT.md`

### Critical Epics (Security/Compliance)
- **Epic 3.75:** Must pass DP-01→DP-10 (Data Protection)
- **Epic 8:** Must pass EP-01→EP-10 (Evidence Packs)
- **Epic 13:** Must pass GG-01→GG-52 (Governance Gateway) ⚠️ NEW
- **Epic 14:** Must pass CA-01→CA-25 (Computational Accuracy) ⚠️ NEW

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

## Epic Dependency Graph (Updated with Epic 13 & 14)

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
              │     (Convergence)◀───────────┘
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
                   │
                   ▼
    ┌──────────────────────────────────────────┐
    │     Epic 13: GOVERNANCE GATEWAY ⚠️        │
    │     [13_GOVERNANCE_GATEWAY]               │
    │     Lead Agent → Gateway → Worker Agent   │
    └──────────────────────────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────────┐
    │     Epic 14: COMPUTATIONAL ACCURACY       │
    │     [14_COMPUTATIONAL_ACCURACY]           │
    │     L1 → L1.5a → L1.5b (Wolfram) → L2    │
    └──────────────────────────────────────────┘
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
| **13** | **Governance Gateway** | **25** | **60K** | **10** | **13_GOVERNANCE_GATEWAY** ⚠️ | ⏳ |
| **14** | **Computational Accuracy** | **15** | **50K** | **8** | **14_COMPUTATIONAL_ACCURACY** | ⏳ |
| **TOTAL** | | **~177** | **785K** | **80** | **170+ criteria** | |

---

## Individual Epic Files (with Success Criteria Alignment)

Each epic has a detailed TASKS.md file with Success Criteria cross-references:

```
epics/
├── epic-01-foundation/TASKS.md
├── epic-02-answer-contract/TASKS.md      → 01_ANSWER_CONTRACT (AC-01 to AC-10)
├── epic-03-forge-c-core/TASKS.md         → 04_QUALITATIVE_VALIDATION (QV-01 to QV-10)
├── epic-03.75-code-execution/TASKS.md    → 09_DATA_PROTECTION (DP-01 to DP-10) ⚠️
├── epic-04-convergence/TASKS.md          → 05_CONVERGENCE_ENGINE (CE-01 to CE-11)
├── epic-05-figma-parser/TASKS.md
├── epic-06-react-generator/TASKS.md
├── epic-07-test-generation/TASKS.md      → 08_RUBRIC_LIBRARY (RL-01 to RL-10)
├── epic-08-evidence-packs/TASKS.md       → 06_EVIDENCE_PACK (EP-01 to EP-10) ⚠️
├── epic-09-infrastructure/TASKS.md       → 11_OBSERVABILITY (OB-01 to OB-11)
├── epic-10a-platform-ui-core/TASKS.md    → 12_HUMAN_REVIEW (HR-01 to HR-10)
├── epic-10b-platform-ui-features/TASKS.md → 12_HUMAN_REVIEW + 10_ORCHESTRATION
├── epic-11-integrations/TASKS.md         → 10_ORCHESTRATION (OR-01 to OR-10)
├── epic-12-e2e-testing/TASKS.md          → ALL COMPONENTS
├── epic-13-governance-gateway/TASKS.md   → 13_GOVERNANCE_GATEWAY (GG-01 to GG-52) ⚠️ NEW
└── epic-14-computational-accuracy/TASKS.md → 14_COMPUTATIONAL_ACCURACY (CA-01 to CA-25) NEW
```

**Success Criteria Framework:**
```
forge-success-criteria/
├── 00_MASTER_ROADMAP.md              # Authoritative index
├── 01_ANSWER_CONTRACT.md             # AC-01 → AC-10
├── 02_STRUCTURAL_VALIDATION.md       # Layer 1: JSON Schema
├── 03_SEMANTIC_VALIDATION.md         # Layer 2: Cross-refs, placeholders
├── 04_QUALITATIVE_VALIDATION.md      # Layer 3: LLM-Judge
├── 05_CONVERGENCE_ENGINE.md          # CE-01 → CE-11
├── 06_EVIDENCE_PACK.md               # Audit artifacts ⚠️
├── 07_RULE_SYSTEM.md                 # FORGE.md rules
├── 08_RUBRIC_LIBRARY.md              # Scoring rubrics
├── 09_DATA_PROTECTION.md             # PII/secrets ⚠️
├── 10_ORCHESTRATION.md               # Multi-agent
├── 11_OBSERVABILITY.md               # Metrics/dashboards
├── 12_HUMAN_REVIEW.md                # Approval gates
├── 13_GOVERNANCE_GATEWAY.md          # Agentic SDLC ⚠️ NEW
├── 14_COMPUTATIONAL_ACCURACY.md      # Wolfram/Citations/Thinking NEW
├── schemas/
│   ├── answer-contract.schema.json
│   ├── evidence-pack.schema.json
│   ├── rubric.schema.json
│   └── computational-validation.schema.json  # NEW
├── templates/
└── examples/
```

---

## Epic 13: Governance Gateway (NEW)

**Duration:** 10 days | **Tokens:** 60K | **Criteria:** GG-01 → GG-52

### Architecture
```
┌─────────────────┐     ┌────────────────────┐     ┌─────────────────┐
│   Lead Agent    │────▶│ Governance Gateway │────▶│  Worker Agent   │
│   (Planner)     │     │ (Policy Enforcer)  │     │  (Executor)     │
└─────────────────┘     └────────────────────┘     └─────────────────┘
```

### User Stories
- US-13.1: Lead Agent Implementation (8 SP)
- US-13.2: Governance Gateway Core (13 SP)
- US-13.3: Worker Agent Implementation (8 SP)
- US-13.4: Ticket-to-PR Workflow (8 SP)
- US-13.5: Dependency Upgrade Workflow (5 SP)
- US-13.6: Release Evidence Bundle Workflow (5 SP)
- US-13.7: Production Incident Workflow (5 SP)
- US-13.8: Agent Communication Protocol (5 SP)
- US-13.9: Dashboard & Observability (5 SP)

### Detailed Tasks
See: `epics/epic-13-governance-gateway/TASKS.md`

---

## Epic 14: Computational Accuracy Layer (NEW)

**Duration:** 8 days | **Tokens:** 50K | **Criteria:** CA-01 → CA-25

### Validation Tiers
```
┌─────────────────────────────────────────────────────────────────────┐
│                 COMPUTATIONAL ACCURACY PIPELINE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Agent Output → Claim Detection → L1 → L1.5a → L1.5b → L2 → Result │
│                                                                      │
│  L1:   Local Deterministic (FREE, <1ms)                             │
│  L1.5a: LLM-Assisted ($0.001/claim)                                 │
│  L1.5b: Wolfram Alpha ($0.02/claim) ← App ID: 2K3K8Q5XGA           │
│  L2:   Semantic + Citations (complex claims)                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Wolfram API Configuration
| Field | Value |
|-------|-------|
| UID | joe@arcfoundry.ai |
| App ID | 2K3K8Q5XGA |
| API Type | LLM API |
| Free Tier | 2,000/month |
| Invocation | Conditional (L1 fail → Wolfram) |

### Sub-Epics
- 14.1: Core Validation Layer (L1 + L1.5a)
- 14.2: Wolfram Integration (L1.5b)
- 14.3: Citations API Integration (L2)
- 14.4: Extended Thinking Integration

### Detailed Tasks
See: `epics/epic-14-computational-accuracy/TASKS.md`

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

## Master Completion Checklist

### Month 1: Core Engines (Weeks 1-4)
- [ ] Epic 1: Foundation (Days 1-3)
- [ ] Epic 2: Answer Contract (Days 4-7) → AC-01 to AC-10
- [ ] Epic 3: FORGE C Core (Days 8-12) → QV-01 to QV-10
- [ ] Epic 3.75: Code Execution (Days 13-15) → DP-01 to DP-10 ⚠️
- [ ] Epic 4: Convergence Engine (Days 16-21) → CE-01 to CE-11

### Month 2: Generation & Infrastructure (Weeks 5-8)
- [ ] Epic 5: Figma Parser (Days 22-26)
- [ ] Epic 6: React Generator (Days 27-31)
- [ ] Epic 7: Test Generation (Days 32-35) → RL-01 to RL-10
- [ ] Epic 8: Evidence Packs (Days 36-38) → EP-01 to EP-10 ⚠️
- [ ] Epic 9: Infrastructure (Days 39-43) → OB-01 to OB-11

### Month 2.5: Platform & Integration (Weeks 9-10)
- [ ] Epic 10a: Platform UI Core (Days 44-47) → HR-01 to HR-10
- [ ] Epic 10b: Platform UI Features (Days 48-51) → HR-01 to HR-10
- [ ] Epic 11: Integrations (Days 52-56) → OR-01 to OR-10
- [ ] Epic 12: E2E Testing (Days 57-61) → ALL CRITERIA

### Month 3: Governance & Accuracy (Weeks 11-12) ⚠️ NEW
- [ ] Epic 13: Governance Gateway (Days 62-71) → GG-01 to GG-52 ⚠️
- [ ] Epic 14: Computational Accuracy (Days 72-80) → CA-01 to CA-25

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

## Package Map (Updated)

```
packages/
├── core/                    # @forge/core - Shared types, utils
├── answer-contract/         # @forge/answer-contract - Contract schema, validators
├── forge-c/                 # @forge/forge-c - Main orchestrator
├── convergence/             # @forge/convergence - Convergence engine
├── code-execution/          # @forge/code-execution - Sandbox execution
├── figma-parser/            # @forge/figma-parser - Figma API integration
├── react-generator/         # @forge/react-generator - React code generation
├── test-generator/          # @forge/test-generator - Test generation
├── evidence-pack/           # @forge/evidence-pack - Compliance evidence
├── infrastructure/          # @forge/infrastructure - Deployment configs
├── integrations/            # @forge/integrations - Third-party integrations
├── platform-ui/             # @forge/platform-ui - Next.js dashboard
├── governance-gateway/      # @forge/governance-gateway - Agentic SDLC NEW
└── computational-validator/ # @forge/computational-validator - Wolfram/Citations NEW
```

---

*Generated by atomic-task-breakdown + long-running-agent-harness skills*  
*Success Criteria Framework: forge-success-criteria/ (14 components, 170+ criteria)*  
*Last Updated: 2026-01-19*
