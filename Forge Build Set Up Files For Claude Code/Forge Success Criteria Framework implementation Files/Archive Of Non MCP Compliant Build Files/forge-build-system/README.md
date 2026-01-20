# FORGE B-D Platform Build System

This directory contains the build orchestration system for the FORGE B-D Platform. It manages the 12-epic build process, ensuring proper context handoff between agent sessions.

## Quick Start

```bash
# Make bootstrap script executable
chmod +x .forge/agent-bootstrap.sh

# Start the build
.forge/agent-bootstrap.sh start

# Check progress anytime
.forge/agent-bootstrap.sh status

# After completing an epic
.forge/agent-bootstrap.sh complete
```

## Directory Structure

```
.forge/
├── agent-bootstrap.sh      # Main orchestration script
├── current-epic.txt        # Current epic number (1-12)
├── status.txt              # Build status
├── completed-epics.json    # List of completed epics
├── epics/
│   ├── epic-01-foundation/
│   │   ├── EPIC.md         # Epic definition & user stories
│   │   ├── verify.sh       # Verification script
│   │   └── COMPLETION.md   # Handoff notes (created when complete)
│   ├── epic-02-answer-contract/
│   ├── epic-03-forge-c-core/
│   ├── epic-04-convergence/
│   ├── epic-05-figma-parser/
│   ├── epic-06-react-generator/
│   ├── epic-07-test-generation/
│   ├── epic-08-evidence-packs/
│   ├── epic-09-infrastructure/
│   ├── epic-10-platform-ui/
│   ├── epic-11-integrations/
│   └── epic-12-e2e-testing/
├── context-packages/       # Compiled context for handoffs
├── logs/                   # Build logs
│   ├── epics/
│   ├── sessions/
│   └── errors/
└── artifacts/              # Generated outputs
    ├── code/
    ├── tests/
    ├── docs/
    └── evidence-packs/
```

## Epic Overview

| Epic | Name | Duration | Token Budget |
|------|------|----------|--------------|
| 1 | Foundation | 3 days | 40K |
| 2 | Answer Contract | 4 days | 50K |
| 3 | FORGE C Core | 5 days | 60K |
| 4 | Convergence Engine | 6 days | 70K (2 sessions) |
| 5 | Figma Parser | 5 days | 50K |
| 6 | React Generator | 5 days | 60K |
| 7 | Test Generation | 4 days | 50K |
| 8 | Evidence Packs | 3 days | 40K |
| 9 | Infrastructure | 5 days | 60K |
| 10 | Platform UI | 10 days | 50K (2 sessions) |
| 11 | Integrations | 5 days | 40K |
| 12 | E2E Testing | 5 days | 50K |

**Total: 60 days, ~620K tokens**

## Build Timeline

```
Month 1: Core Engines (Weeks 1-4)
├── Epic 1: Foundation (3 days)
├── Epic 2: Answer Contract (4 days)
├── Epic 3: FORGE C Core (5 days)
├── Epic 4: Convergence (6 days)
├── Epic 7: Test Generation (4 days)
└── Epic 8: Evidence Packs (3 days)

Month 2: Frontend + Infrastructure (Weeks 5-8)
├── Epic 5: Figma Parser (5 days)
├── Epic 6: React Generator (5 days)
├── Epic 9: Infrastructure (5 days)
└── Epic 11: Integrations (5 days)

Month 3: Platform + E2E (Weeks 9-12)
├── Epic 10: Platform UI (10 days)
└── Epic 12: E2E Testing (5 days)
```

## Agent Workflow

### Starting a Session

1. Run `.forge/agent-bootstrap.sh start`
2. Read the current epic's `EPIC.md` file
3. Review handoff notes from previous epic (if any)

### During Development

1. Implement user stories in order
2. Follow acceptance criteria
3. Create verification scripts
4. Stay within token budget

### Completing an Epic

1. Run `.forge/agent-bootstrap.sh verify`
2. Fix any issues
3. Create `COMPLETION.md` with handoff notes
4. Run `.forge/agent-bootstrap.sh complete`

### Handoff Notes Template

Create `.forge/epics/epic-XX-name/COMPLETION.md`:

```markdown
# Epic XX Completion Notes

## Summary
Brief description of what was built.

## Key Files Created
- packages/package-name/src/...
- ...

## Important Decisions
- Decision 1: Rationale
- Decision 2: Rationale

## Known Issues
- Issue 1 (deferred to future)

## Context for Next Epic
What the next epic needs to know.

## Test Results
- Tests passing: XX/XX
- Coverage: XX%
```

## Token Management

Each epic has a token budget. To stay within budget:

1. **Active Retrieval**: Load only files being modified
2. **Context Compaction**: Use handoff JSONs, not full history
3. **Progressive Disclosure**: Load epic definition, then stories one at a time
4. **Session Boundaries**: Complete epic before starting new session

## Emergency Recovery

If the build gets stuck:

```bash
# Check current state
.forge/agent-bootstrap.sh status

# View verification results
.forge/agent-bootstrap.sh verify

# Check logs
cat .forge/logs/errors/*.log

# Last resort - reset progress
.forge/agent-bootstrap.sh reset
```

## Dependencies

Epic dependencies (build in order):

```
Epic 1 → All others
Epic 2 → 3, 5, 9
Epic 3 → 4, 7, 8
Epic 4 → 8
Epic 5 → 6
Epic 6 → 10
Epic 7 → 8, 12
Epic 8 → 10
Epic 9 → 10, 12
Epic 10 → 12
Epic 11 → 10, 12
Epic 12 → (Final)
```

---

*FORGE B-D Platform Build System v1.0*
