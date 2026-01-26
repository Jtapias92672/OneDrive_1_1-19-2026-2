# Project: FORGE (Figma-to-React Generation Engine)

## Overview
Enterprise-grade AI-assisted design-to-code platform. Converts Figma designs to production React components via MCP Gateway architecture.

## Tech Stack
- Runtime: Node.js 20+ / TypeScript 5.x
- Framework: Express (Gateway), Custom (Packages)
- Testing: Jest with coverage enforcement
- Build: tsup, TypeScript
- Infrastructure: AWS (Lambda, EKS, Bedrock)

## Project-Specific Standards

### Coverage Targets
| Package | Target | Current |
|---------|--------|---------|
| figma-parser | 97% | 97%+ |
| react-generator | 97% | 97.75% |
| mcp-gateway | 97% | 97%+ |
| security-controls | 97% | 97%+ |

### Build Commands
```bash
# Package-level
cd packages/<package>
npm run build
npm test -- --coverage

# Root-level
npm run build
npm test
```

### Key Paths
- Source: `src/`, `packages/*/src/`
- Tests: `__tests__/`, `*.test.ts`
- Config: `infrastructure/`
- Docs: `.forge/`

## Epic Tracking
See: `.forge/progress.md`

Current: Epic 10b (Platform UI Dashboard)
Completed: Epics 00-05, Epic 06 (React Generator)

## Skills
See: `.forge/skills/MANIFEST.md`

## Project-Specific Protocols

### Verification Sequence
All completions require:
```bash
npm run build          # Must succeed
npm test               # All tests must pass
npm test -- --coverage # Show report (≥97% target)
```

### Coverage Review Protocol
**Trigger:** After `npm test -- --coverage`, before claiming COMPLETE

**Procedure:**
1. Check rollup metrics (must pass thresholds)
2. Review per-file breakdown:
   - Any file <85% branch coverage? → Investigate
   - Any function at 0%? → Dead code or missing test
3. For each uncovered line, classify:
   - **DEFENSIVE:** catch blocks, switch defaults → Accept + document
   - **REAL:** actual functionality → Test or justify
4. Document accepted gaps in commit message

**Required Output:**
```
Coverage Review:
- Files <85% branch: [list or "none"]
- Functions at 0%: [list or "none"]
- Accepted gaps: [defensive code lines]
- Action needed: [real functionality lines]
```

### Package Structure
```
packages/
├── figma-parser/      # Epic 05 - Figma API → ParsedDesign
├── react-generator/   # Epic 06 - ParsedDesign → React code
└── [future packages]
```

### TRUE-RALPH Loop
This project uses the TRUE-RALPH Build System:
1. **T**est first
2. **R**eal implementation (no simulations)
3. **U**nambiguous contracts
4. **E**vidence required

### Anti-Patterns
- ❌ Simulated/mocked implementations claimed as real
- ❌ Coverage < 97% without justification
- ❌ Hardcoded return values in security code
- ❌ Claiming "complete" without test evidence

## Mandatory Enforcement

### Session Start
Every session MUST begin with session-start checklist:
```bash
cat .forge/session-start.md
```

### Turn Counting
Track turns in every response: `[Turn N/10]`
At Turn 10: Execute compaction, reset to Turn 0.

### Slop Tests
After ANY code generation:
```bash
bash .forge/slop-tests.sh
```

### Anti-Patterns (Immediate Stop)
- ❌ "Tests pass" without showing output
- ❌ Claim complete without coverage check
- ❌ Turn >10 without compaction
- ❌ Skip slop tests after code gen

## Contacts
- Owner: JT
- Org: ArcFoundry
