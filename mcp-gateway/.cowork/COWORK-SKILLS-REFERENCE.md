# COWORK Skills Reference

**Purpose:** Quick reference for skills available to Cowork and CC
**Last Updated:** 2026-01-27

---

## COWORK SKILLS (Available Now)

These skills are available in the Cowork environment at `/mnt/.skills/skills/`:

### Core ArcFoundry Skills

| Skill | Path | When to Use |
|-------|------|-------------|
| `arcfoundry-skill-library` | `/mnt/.skills/skills/arcfoundry-skill-library` | Three Truths, CARS, architecture hub |
| `verification-quality-library` | `/mnt/.skills/skills/verification-quality-library` | V&V protocols, expected output, slop tests |
| `compliance-security-library` | `/mnt/.skills/skills/compliance-security-library` | Audit prompts, AI attribution, deployment |

### Agent Orchestration Skills

| Skill | Path | When to Use |
|-------|------|-------------|
| `mayor-worker-pattern` | `/mnt/.skills/skills/mayor-worker-pattern` | Two-tier agent hierarchy |
| `worker-isolation` | `/mnt/.skills/skills/worker-isolation` | MVC, tool budgets, isolation |
| `hook-protocol` | `/mnt/.skills/skills/hook-protocol` | Git-backed task persistence |
| `forge-convoy` | `/mnt/.skills/skills/forge-convoy` | Work bundling, parallel processing |
| `agent-patterns-library` | `/mnt/.skills/skills/agent-patterns-library` | Context chaining, memory management |

### Development Skills

| Skill | Path | When to Use |
|-------|------|-------------|
| `development-practices-library` | `/mnt/.skills/skills/development-practices-library` | ARCH.md standard, coding patterns |
| `infrastructure-library` | `/mnt/.skills/skills/infrastructure-library` | Mendix SDK, MCP servers |
| `memory-architecture-library` | `/mnt/.skills/skills/memory-architecture-library` | 4-layer memory system |

### Governance Skills

| Skill | Path | When to Use |
|-------|------|-------------|
| `genbi-governance-library` | `/mnt/.skills/skills/genbi-governance-library` | Trust tiers, certification |
| `ui-governance-library` | `/mnt/.skills/skills/ui-governance-library` | Component access control |
| `data-analytics-library` | `/mnt/.skills/skills/data-analytics-library` | Data lake, connectors |

### Document Creation Skills

| Skill | Path | When to Use |
|-------|------|-------------|
| `docx` | `/mnt/.skills/skills/docx` | Word documents |
| `xlsx` | `/mnt/.skills/skills/xlsx` | Excel spreadsheets |
| `pptx` | `/mnt/.skills/skills/pptx` | PowerPoint presentations |
| `pdf` | `/mnt/.skills/skills/pdf` | PDF creation/manipulation |

### Other Skills

| Skill | Path | When to Use |
|-------|------|-------------|
| `web-artifacts-builder` | `/mnt/.skills/skills/web-artifacts-builder` | Complex React artifacts |
| `skill-creator` | `/mnt/.skills/skills/skill-creator` | Creating new skills |
| `theme-factory` | `/mnt/.skills/skills/theme-factory` | Styling artifacts |

---

## CC SKILLS (In Project)

CC has access to skills in the FORGE project at `.forge/skills/`:

### Loading Skills in CC

```bash
# Read skill manifest
cat .forge/skills/MANIFEST.md | head -30

# Load specific skill
cat .forge/skills/verification-quality-library.skill | head -100
cat .forge/skills/ui-governance-library.skill | head -50
```

### Key Skills for CC

| Skill | File | Purpose |
|-------|------|---------|
| `verification-quality-library` | `.forge/skills/verification-quality-library.skill` | V&V protocols, slop tests |
| `ui-governance-library` | `.forge/skills/ui-governance-library.skill` | Component access control |
| `agent-patterns-library` | `.forge/skills/agent-patterns-library.skill` | Agent orchestration |

---

## WHEN TO LOAD SKILLS

### For FORGE Development

**Always load before starting work:**
```
verification-quality-library — V&V after every code gen
arcfoundry-skill-library — Three Truths, CARS
```

**Load for specific tasks:**
```
mayor-worker-pattern — Multi-agent work
forge-convoy — Parallel processing
infrastructure-library — Mendix/MCP work
```

### For Document Creation

**Load before creating documents:**
```
docx — Before creating Word docs
xlsx — Before creating spreadsheets
pptx — Before creating presentations
pdf — Before creating PDFs
```

---

## SKILL LOADING PROTOCOL

### In Cowork

```
Read the skill file before starting work:
view /mnt/.skills/skills/{skill-name}/SKILL.md
```

### In CC Directives

Include in session requirements:
```bash
cat .forge/skills/MANIFEST.md | head -30
cat .forge/skills/verification-quality-library.skill | head -100
```

---

## FORGE-SPECIFIC PROTOCOLS

### V&V After Every Code Gen

```bash
bash .forge/slop-tests.sh
npm run build 2>&1 | tail -15
npm test 2>&1 | tail -20
bash .forge/scripts/verify-testing-taxonomy.sh 2>&1 | tail -30
```

### Turn Counting

Track in every CC response: `[Turn N/10]`
At Turn 10: STOP, commit, handoff

### Token Guardrails

| Command | Max Lines |
|---------|-----------|
| `npm test` | 20 |
| `npm run build` | 15 |
| `cat` / file view | 100 |
| `git diff` | stat only |
| `git log` | 5 commits |

---

## QUICK REFERENCE: MOST USED SKILLS

For FORGE work, these are loaded most often:

1. **verification-quality-library** — V&V after every change
2. **arcfoundry-skill-library** — Three Truths methodology
3. **mayor-worker-pattern** — Agent orchestration
4. **ui-governance-library** — Dashboard components

---

*This file references skills for Cowork and CC.*
