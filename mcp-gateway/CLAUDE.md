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
| react-generator | 97% | 97.54% |
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

### File-Level Coverage Review
Before claiming COMPLETE, check per-file metrics:

1. **Flag any file with branch coverage <85%**
   - Investigate why branches are uncovered
   - Document if acceptable (error paths)

2. **Flag any function at 0% coverage**
   - Dead code? → Remove it
   - Missing tests? → Add them

3. **Review uncovered lines and classify:**
   | Type | Examples | Verdict |
   |------|----------|---------|
   | Error handlers | `catch` blocks, `this.addError()` | ✓ Acceptable |
   | Switch defaults | `default: return 'any'` | ✓ Acceptable |
   | Fallback logic | Defensive null checks | ✓ Acceptable |
   | Real functionality | Business logic, data transforms | ❌ Must test or justify |

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

## Contacts
- Owner: JT
- Org: ArcFoundry
