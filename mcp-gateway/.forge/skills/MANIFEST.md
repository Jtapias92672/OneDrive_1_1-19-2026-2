# ArcFoundry Skills Manifest

## MANDATORY AT SESSION START

**Before ANY work, execute:**
```bash
cat .forge/session-start.md  # Read checklist
cat CLAUDE.md | head -50      # Load protocols
```

**Confirm in first response:**
```
=== SESSION START ===
Turn: 0
Protocols: CLAUDE.md ✅, MANIFEST.md ✅
10-turn rule: Acknowledged
Slop tests: Will run after code gen
Task: [description]
```

## MANDATORY DURING SESSION

1. **Track turns:** Include `[Turn N/10]` in every response
2. **At Turn 10:** Execute compaction, reset to Turn 0
3. **After code gen:** Run `bash .forge/slop-tests.sh`
4. **Before COMPLETE:** Show coverage + classify uncovered lines

## Session Start Checklist
1. Read this manifest
2. Acknowledge protocols
3. Load relevant skills before starting work

## Core Libraries (Always Applicable)

### verification-quality-library.skill
Verification and quality assurance patterns.
- expected-output-protocol.md - Declare before implement
- pre-completion-verification.md - Build/test/coverage sequence
- session-standard-enforcement.md - Cross-epic quality bar
- human-review-gates.md - Mandatory checkpoints
- slop-tests.md - Catch AI hallucinations

### arcfoundry-skill-library.skill
Core methodology.
- Three Truths: Reality over claims, Eyes before hands, Systematic over fast
- CARS framework: Context, Action, Result, Status
- Architecture drift tracking

### development-practices-library.skill
Coding standards.
- ARCH.md context standard
- Code tool best practices
- Deterministic scripts

## Domain-Specific Libraries

### compliance-security-library.skill
For regulated/enterprise work.
- DCMA/DFARS/CMMC compliance
- AI attribution requirements
- Deployment readiness

### agent-patterns-library.skill
For multi-agent systems.
- Context chaining
- Agent orchestration
- Memory patterns

### data-analytics-library.skill
For data platforms.
- Four-zone data lake
- Analytics orchestration

### genbi-governance-library.skill
For GenBI implementations.
- Trust tier enforcement
- Asset certification

## Software Engineering Skills

Located in `.skills/software-engineering/`. Load for UI/UX development and React codebases.

| Skill | Trigger | Use When |
|-------|---------|----------|
| react-best-practices | React/Next.js code | Performance audits, bundle optimization, re-render fixes |
| writing-clearly | Documentation, PRs | Reducing verbosity, commit messages, code comments |
| brainstorming | "Build X", "Create Y" | Before implementation, clarifying requirements |
| agentation | Visual feedback | UI debugging, DOM selector identification |
| impeccable-style | UI polish | Final design review, visual consistency audits |
| tailwind-design-system | Tailwind CSS | Component patterns, responsive design, dark mode |
| ui-ux-promax | Design decisions | Color palettes, typography, style vocabulary |

### Loading Software Engineering Skills
```bash
cat .skills/software-engineering/[skill-name]/SKILL.md
```

## Standalone Skills

| Skill | Use When |
|-------|----------|
| cars-framework.skill | Structuring any task report |
| jt1-recovery-protocol.skill | Environment/session recovery |
| human-review-gates.skill | Implementing review checkpoints |
| project-standards.skill | Setting up new projects |
| research-scanner.skill | Scanning AI research for updates |

## Loading Skills
```
# In Claude Code:
cat .forge/skills/[skill-name].skill

# Or reference in directive:
Reference: .forge/skills/verification-quality-library.skill
```

## Verification
When asked "which protocols are you following?", cite:
1. Skill name
2. Specific reference within skill
3. How it applies to current task
