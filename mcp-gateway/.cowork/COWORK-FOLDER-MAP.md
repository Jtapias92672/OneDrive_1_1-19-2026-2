# COWORK Folder Map

**Purpose:** Quick reference for folder reconnection after crash
**Last Updated:** 2026-01-27

---

## REQUIRED FOLDER ACCESS

### 1. FORGE Codebase (Primary)

```
Host Path: ~/Documents/forge-app
VM Mount:  /sessions/[session-id]/mnt/forge-app

Request: "Request access to ~/Documents/forge-app"
```

### 2. Downloads (Directives & Context)

```
Host Path: ~/Downloads
VM Mount:  /sessions/[session-id]/mnt/Downloads

Request: "Request access to ~/Downloads"
```

---

## FORGE CODEBASE STRUCTURE

```
~/Documents/forge-app/mcp-gateway/
│
├── packages/
│   └── platform-ui/                    # Main application
│       ├── src/
│       │   ├── app/                    # Next.js pages
│       │   │   ├── dashboard/          # Dashboard page
│       │   │   └── api/                # API routes
│       │   ├── components/             # React components
│       │   │   ├── testing/            # Testing Dashboard (Epic 7.5)
│       │   │   └── pipeline/           # Pipeline UI (Phase 5 - TODO)
│       │   └── lib/
│       │       ├── api/                # Backend services
│       │       │   ├── testing/        # Testing API
│       │       │   └── pipeline/       # Pipeline API (Phase 5 - TODO)
│       │       ├── integrations/
│       │       │   └── figma/          # Figma client & parser
│       │       └── generation/         # React & Mendix generators
│       └── vertical-slice.ts           # E2E proof script
│
├── .forge/                             # Agent infrastructure
│   ├── lib/                            # TypeScript runtime
│   │   ├── types.ts                    # Core interfaces
│   │   ├── ledger.ts                   # JSONL work tracking
│   │   ├── hook.ts                     # Task persistence
│   │   ├── convoy.ts                   # Work bundling
│   │   └── vnv.ts                      # V&V engine
│   ├── roles/                          # Agent CLAUDE.md files
│   │   ├── orchestrator/
│   │   ├── translator/
│   │   ├── validator/
│   │   └── remediator/
│   ├── governance/
│   │   └── gate_rules.yaml             # Gate definitions
│   ├── suites/
│   │   └── suite_registry.yaml         # Test taxonomy
│   ├── scripts/
│   │   └── verify-testing-taxonomy.sh  # V&V script
│   └── skills/
│       └── MANIFEST.md                 # Skills reference
│
├── src/                                # Gateway source
├── tests/                              # Test files
├── downloads/                          # CC directives (project copy)
│
├── CLAUDE.md                           # CC guidance (READ FIRST)
├── TICKET.md                           # Session handoff state
├── HONEST-STATUS.md                    # Project status
├── VERTICAL-SLICE-DIRECTIVE.md         # VS implementation guide
│
├── package.json                        # Dependencies & scripts
├── tsconfig.json                       # TypeScript config
└── jest.config.js                      # Test config
```

---

## DOWNLOADS FOLDER CONTENTS

```
~/Downloads/
│
├── CC Directives (Active)
│   ├── CC-PHASE5-DASHBOARD-WIRING-DIRECTIVE.md    # 🎯 CURRENT
│   ├── CC-EPIC-7.5-COMPLIANCE-FIX-DIRECTIVE.md    # ✅ Done
│   ├── CC-TESTING-DASHBOARD-DIRECTIVE.md          # ✅ Done
│   └── VERTICAL-SLICE-PHASE2-DIRECTIVE.md         # ✅ Done
│
├── Cowork Recovery Files
│   ├── CLAUDE_COWORK.md                           # Master recovery guide
│   ├── COWORK-SESSION-STATE.md                    # Running state
│   ├── COWORK-FOLDER-MAP.md                       # This file
│   └── COWORK-SKILLS-REFERENCE.md                 # Skills guide
│
├── Context Documents
│   ├── FORGE-COWORK-HANDOFF-COMPLETE.md           # Full project context
│   ├── CLAUDE-md-addendum.md                      # CC addendum
│   └── GOVERNANCE_EVAL.md                         # Governance evaluation
│
├── Reference Files
│   ├── gate_rules.yaml                            # Gate definitions
│   ├── suite_registry.yaml                        # Test taxonomy
│   └── verify-testing-taxonomy.sh                 # V&V script
│
└── Assets
    ├── POC_Test_Design.pdf                        # Figma export
    └── Forge Build Files/                         # Build artifacts
```

---

## KEY FILES TO READ AFTER RECOVERY

### For Project Context
1. `~/Downloads/CLAUDE_COWORK.md` — Master recovery guide
2. `~/Downloads/COWORK-SESSION-STATE.md` — Current work status
3. `~/Downloads/FORGE-COWORK-HANDOFF-COMPLETE.md` — Full project history

### For CC Guidance
1. `~/Documents/forge-app/mcp-gateway/CLAUDE.md` — CC protocols
2. `~/Documents/forge-app/mcp-gateway/TICKET.md` — Session handoff

### For Current Work
1. `~/Downloads/CC-PHASE5-DASHBOARD-WIRING-DIRECTIVE.md` — Current directive

---

## VERIFICATION AFTER RECONNECTION

```bash
# Navigate to project
cd ~/Documents/forge-app/mcp-gateway

# Check git state
git status
git log --oneline -5

# Check tests
npm test 2>&1 | tail -15

# Check build
npm run build 2>&1 | tail -15

# Check Epic 7.5
bash .forge/scripts/verify-testing-taxonomy.sh 2>&1 | tail -30
```

---

## COWORK MOUNTING COMMANDS

When Cowork starts fresh, use these requests:

```
"Request access to ~/Documents/forge-app"
"Request access to ~/Downloads"
```

Or if using the tool directly:
```
mcp__cowork__request_cowork_directory
```

---

*This file maps folder structures for quick reconnection.*
