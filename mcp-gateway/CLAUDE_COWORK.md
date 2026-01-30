# CLAUDE COWORK — FORGE Project Recovery Guide

**Purpose:** Immediate orientation for Cowork sessions after crash/restart
**Last Updated:** 2026-01-27
**Project:** FORGE B-D Platform (Figma-to-React Generation Engine)
**Owner:** Joe Troutt, CDO @ ArcFoundry

---

## 🚨 RECOVERY TRIGGERS

**If Joe says any of these, IMMEDIATELY execute recovery:**

| Trigger | Action |
|---------|--------|
| **"Restart"** | Execute full recovery protocol below |
| **"Reset"** | Execute full recovery protocol below |
| **"Start Up"** | Execute full recovery protocol below |
| **"Recover"** | Execute full recovery protocol below |
| **"Continue"** | Execute full recovery protocol below |

### AUTOMATIC RECOVERY PROTOCOL

When triggered, Cowork must:

1. **Request folder access:**
   ```
   "I'll reconnect to the FORGE project. Requesting access to your folders..."
   ```
   - Request `~/Documents/forge-app` (this file is inside!)

2. **Read state files (in project .cowork/ directory):**
   - `.cowork/COWORK-SESSION-STATE.md` — See exactly where we left off
   - `.cowork/COWORK-FOLDER-MAP.md` — Understand folder structure

3. **Verify codebase:**
   ```bash
   cd ~/Documents/forge-app/mcp-gateway
   git status && git log --oneline -3
   npm test 2>&1 | tail -10
   ```

4. **Report status to Joe:**
   ```
   "Recovery complete. Current state:
   - Tests: X passing
   - Current task: [from SESSION-STATE]
   - Ready to continue with: [directive name]"
   ```

5. **Resume work** from the current directive

---

## IMMEDIATE RECOVERY STEPS (Manual)

### Step 1: Request Folder Access

```
Request access to these folders:
1. ~/Documents/forge-app (main codebase)
2. ~/Downloads (directive files and context)
```

### Step 2: Read State Files

```
Read these files in order:
1. ~/Downloads/COWORK-SESSION-STATE.md (current work status)
2. ~/Downloads/COWORK-FOLDER-MAP.md (folder structure)
3. ~/Downloads/COWORK-SKILLS-REFERENCE.md (skills to load)
```

### Step 3: Verify Codebase State

```bash
cd ~/Documents/forge-app/mcp-gateway
git status
git log --oneline -5
npm test 2>&1 | tail -15
```

### Step 4: Resume Work

Read the current directive from Downloads and continue where we left off.

---

## PROJECT OVERVIEW

### What is FORGE?

**FORGE B-D Platform** is an AI-powered enterprise code generation system that:
- Transforms Figma designs into production-ready React components
- Generates Mendix application packages
- Creates cryptographic evidence trails for compliance
- Built for defense contractors (DCMA/DFARS/CMMC)

### Core Pipeline

```
Figma Design → Parser → AST → React Generator → Mendix Translator → Validator → Evidence Pack
```

### Repository Structure

```
~/Documents/forge-app/mcp-gateway/
├── packages/platform-ui/    # Main application (React + Next.js)
├── .forge/                  # Agent orchestration infrastructure
│   ├── lib/                 # TypeScript runtime
│   ├── roles/               # Agent CLAUDE.md files
│   ├── governance/          # Gate rules, policies
│   └── skills/              # Skill definitions
├── src/                     # Source code
├── tests/                   # Test files
├── downloads/               # CC directive files (project copy)
├── CLAUDE.md               # CC guidance file
├── TICKET.md               # Session handoff state
└── package.json
```

---

## KEY STAKEHOLDER: JOE TROUTT

### Working Style
- Defense contractor background
- Exceptional technical persistence ("I do not quit")
- Expects military-grade precision
- Evidence-based development (proof > claims)

### Communication Preferences
- Direct, concise responses
- Tables and structured data
- Minimal preamble
- Clear status: COMPLETE / IN PROGRESS / BLOCKED

### Trigger Phrases
| Phrase | Meaning |
|--------|---------|
| "Restart" / "Reset" / "Start Up" | **RECOVERY PROTOCOL** |
| "Invoke JT1" | Start crisis recovery protocol |
| "Truth Serum" | Verify everything, no assumptions |
| "Eyes Before Hands" | Read before modifying |
| "Baby Steps" | Smallest possible increments |

---

## ARCFOUNDRY METHODOLOGY

### The Three Truths (Non-Negotiable)

**Truth 1: Truth Serum Protocol**
> "Reality over claims. Evidence over assertions."
- NEVER claim something works without proof
- Test before reporting success
- If you're not sure, say so

**Truth 2: Eyes Before Hands**
> "Understand before changing. Read before writing."
- Read entire file before editing
- Understand context before changes

**Truth 3: Systematic Over Fast**
> "Correct is better than quick. Repeatable beats one-time."
- One change at a time
- Verify after each change

### CARS Framework

**C**ontextual **A**utonomy with **R**isk-based **S**afeguards

| Risk Level | Autonomy | Action |
|------------|----------|--------|
| LOW | FULL | Execute without approval |
| MEDIUM | SUPERVISED | Execute, human notified |
| HIGH | RESTRICTED | Propose, human approves |
| CRITICAL | BLOCKED | Cannot attempt |

---

## EPIC STATUS (As of 2026-01-27)

| Epic | Name | Status | Tests |
|------|------|--------|-------|
| 00-04 | Foundation, Contracts, Gateway, Convergence | ✅ Complete | ~200 |
| 05 | Figma Parser | ✅ Complete | 51 |
| 06 | React Generator | ✅ Complete | 402 |
| 07 | Agent Orchestration | ✅ Complete | — |
| 7.5 | V&V Quality Framework | ✅ Complete | 19/19 checks |
| 08 | Evidence Packs | ✅ Complete | ~50 |
| 09 | Infrastructure | ✅ Complete | ~50 |
| 10b | Platform UI | ✅ Complete | 528 |
| 11 | External Integrations | 🎯 Current | 49 scaffolded |
| 12 | E2E Integration | 📋 Deferred | — |
| 13 | Governance Gateway | ✅ Complete | 185 |
| 14 | Computational Accuracy | ✅ Complete | 775 |
| 15 | Persona Foundation | ✅ Complete | 343 |
| 16 | Adaptive Intelligence | 🚫 Blocked (Bedrock) | — |

**Total Tests:** 1025+ passing

---

## CURRENT WORK STATUS

### Completed
- [x] Epic 7.5 Compliance Fix (19/19 checks)
- [x] Testing Dashboard Module (+70 tests)
- [x] Vertical Slice Phases 1-4 (Real Figma→React→Mendix)
- [x] Phase 5: Dashboard Wiring (+33 tests)

### Current
- [ ] **Epic 11: External Integrations** — Wire real AWS/Mendix APIs
  - Directive: `~/Downloads/CC-EPIC-11-EXTERNAL-INTEGRATIONS-DIRECTIVE.md`

### Next Up
- [ ] Epic 12: E2E Integration Tests (last)

---

## CC DIRECTIVES LOCATION

All CC directives are in `~/Downloads/`:

| File | Purpose | Status |
|------|---------|--------|
| `CC-EPIC-7.5-COMPLIANCE-FIX-DIRECTIVE.md` | Fix V&V infrastructure | ✅ Done |
| `CC-TESTING-DASHBOARD-DIRECTIVE.md` | Testing Dashboard UI | ✅ Done |
| `VERTICAL-SLICE-PHASE2-DIRECTIVE.md` | Phases 2-4 | ✅ Done |
| `CC-PHASE5-DASHBOARD-WIRING-DIRECTIVE.md` | Wire UI to pipeline | ✅ Done |
| `CC-EPIC-11-EXTERNAL-INTEGRATIONS-DIRECTIVE.md` | Real AWS/Mendix APIs | 🎯 Current |
| `FORGE-COWORK-HANDOFF-COMPLETE.md` | Full project context | Reference |

---

## VERIFICATION COMMANDS

```bash
# Test status
npm test 2>&1 | tail -15

# Build check
npm run build 2>&1 | tail -15

# TypeScript check
npx tsc --noEmit

# Epic 7.5 verification
bash .forge/scripts/verify-testing-taxonomy.sh 2>&1 | tail -30

# Git state
git status
git log --oneline -5
```

---

## COWORK vs CC RESPONSIBILITIES

### Cowork (This Agent)
- Project oversight and planning
- Create directives for CC
- Verify CC's work
- Crash recovery and context management
- Communication with Joe

### CC (Claude Code)
- Execute directives
- Write code and tests
- Run builds and tests
- Commit changes
- Follow CLAUDE.md protocols

---

## ANCILLARY FILES

These files support crash recovery:

| File | Purpose |
|------|---------|
| `COWORK-SESSION-STATE.md` | Current work status, last actions |
| `COWORK-FOLDER-MAP.md` | Folder paths to reconnect |
| `COWORK-SKILLS-REFERENCE.md` | Skills to load |

---

## QUICK RECOVERY CHECKLIST

```
[ ] Request ~/Documents/forge-app access
[ ] Request ~/Downloads access
[ ] Read COWORK-SESSION-STATE.md
[ ] Verify git status and test count
[ ] Resume current directive
```

---

*This file should be read FIRST after any Cowork crash or restart.*
*Say "Restart", "Reset", or "Start Up" to trigger automatic recovery.*
