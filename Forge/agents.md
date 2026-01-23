# FORGE B-D Platform - Agent Standards

> **For Claude Code and AI Agents:** This is your authoritative project guide.
> Read this FIRST before making any changes.

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | FORGE B-D Platform |
| **Owner** | ArcFoundry |
| **Domain** | Contract-driven AI code generation with convergence validation |
| **Compliance** | DCMA, DFARS, CMMC, SOC2 |
| **Stack** | TypeScript, pnpm monorepo, React, Tailwind, Terraform/AWS |

## Repository Structure

```
OneDrive_1_1-19-2026-2/
├── Design Artifacts/           # Figma exports, design specs
├── Features and Specifications/ # Product requirements
├── Forge Build Set Up Files For Claude Code/
│   └── Forge Success Criteria Framework implementation Files/
├── New Skills/                 # Claude.ai skill files
├── packages/                   # Core packages (to be organized)
│   ├── answer-contract/        # Epic 02 - Contract definitions
│   ├── convergence-engine/     # Epic 04 - Iterative refinement
│   ├── evidence-packs/         # Epic 08 - Audit trail
│   ├── figma-parser/           # Epic 05 - Figma JSON parsing
│   ├── forge-c/                # Epic 03 - Core MCP server
│   ├── mcp-gateway/            # Epic 2.5 - Security gateway
│   ├── mendix-integration/     # Epic 07 - Mendix SDK
│   ├── react-generator/        # Epic 06 - React/Tailwind gen
│   └── validators/             # Epic 14.1 - Wolfram validation
├── .github/workflows/          # CI/CD pipelines
├── agents.md                   # THIS FILE
└── README.md
```

## Pipeline Flow

```
Figma Design → figma-parser → react-generator → mendix-integration
                                    ↓
                            answer-contract
                                    ↓
                          convergence-engine ← validators (Wolfram)
                                    ↓
                            evidence-packs
                                    ↓
                    forge-c + mcp-gateway → Claude Code MCP
```

---

## Critical Rules for AI Agents

### Rule 1: NEVER Modify Without Verification Target

```yaml
# Before ANY code change:
required:
  - Test file exists OR
  - Contract schema exists OR
  - Expected output documented
  
forbidden:
  - "Should work" without proof
  - Modifying production code without tests
  - Skipping type checks
```

### Rule 2: Token Budget Governance

| Task Type | Profile | Thinking Tokens |
|-----------|---------|-----------------|
| Rename, format, typo | QUICK | 500 |
| Simple edits | COST_SENSITIVE | 2,000 |
| Standard dev | **BALANCED** | 4,000 |
| Multi-file, integrations | QUALITY_FIRST | 8,000 |
| CMMC/DCMA/DFARS/audit | COMPLIANCE | 16,000 |

**Auto-escalate to COMPLIANCE for:** CMMC, DCMA, DFARS, classified, audit, security review, FedRAMP, NIST, CUI

### Rule 3: Package Boundaries

```typescript
// ALLOWED: Import from package's public API
import { parseContract } from '@forge/answer-contract';

// FORBIDDEN: Deep imports into package internals
import { internalHelper } from '@forge/answer-contract/src/internal/helper';
```

### Rule 4: Compliance-First Development

Every change touching these packages requires evidence pack:
- `mcp-gateway` (security boundary)
- `evidence-packs` (audit trail)
- `validators` (computational accuracy)

---

## Coding Standards

### TypeScript Configuration

```typescript
// tsconfig.json base settings - DO NOT WEAKEN
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Naming Conventions

```typescript
// Files: kebab-case
contract-parser.ts
figma-node-types.ts

// Types/Interfaces: PascalCase
interface AnswerContract { }
type ConvergenceResult = { }

// Functions/Variables: camelCase
function parseContract() { }
const convergenceScore = 0.95;

// Constants: SCREAMING_SNAKE_CASE
const MAX_ITERATIONS = 10;
const CONVERGENCE_THRESHOLD = 0.95;

// Package names: @forge/kebab-case
@forge/answer-contract
@forge/react-generator
```

### Error Handling

```typescript
// REQUIRED: Typed errors with context
class ContractValidationError extends Error {
  constructor(
    message: string,
    public readonly contractId: string,
    public readonly violations: string[]
  ) {
    super(message);
    this.name = 'ContractValidationError';
  }
}

// FORBIDDEN: Generic throws
throw new Error('Something went wrong'); // ❌
throw 'error'; // ❌
```

### Async Patterns

```typescript
// REQUIRED: Explicit error handling
async function processContract(id: string): Promise<Result<Contract, ContractError>> {
  try {
    const contract = await fetchContract(id);
    return { success: true, data: contract };
  } catch (error) {
    return { success: false, error: toContractError(error) };
  }
}

// FORBIDDEN: Unhandled promise rejections
processContract(id); // ❌ No await, no .catch()
```

---

## Package-Specific Rules

### answer-contract (Epic 02)

```yaml
purpose: Define and validate AI generation contracts
exports:
  - ContractSchema
  - ContractValidator
  - ContractParser
rules:
  - All contracts must be JSON Schema compliant
  - Validation errors include field paths
  - Support Markdown, YAML, JSON input formats
```

### convergence-engine (Epic 04)

```yaml
purpose: Iterative refinement loop for AI output quality
exports:
  - ConvergenceSession
  - QualityMetrics
  - RefinementLoop
rules:
  - Maximum 10 iterations per session
  - Convergence threshold: 0.95
  - All iterations logged for audit
```

### mcp-gateway (Epic 2.5)

```yaml
purpose: Security boundary for MCP tool execution
exports:
  - Gateway
  - ToolAllowlist
  - AuditLogger
rules:
  - ALL tool calls must be logged
  - PII redaction before logging
  - Rate limiting enforced
  - Approval workflow for sensitive ops
```

### validators (Epic 14.1)

```yaml
purpose: Computational accuracy via Wolfram API
exports:
  - WolframValidator
  - MathExpressionChecker
  - UnitConverter
rules:
  - Wolfram API key required
  - Cache results for 24 hours
  - Fallback to local validation if API unavailable
```

---

## Testing Requirements

### Minimum Coverage

| Package | Unit | Integration | E2E |
|---------|------|-------------|-----|
| answer-contract | 80% | 60% | - |
| convergence-engine | 80% | 70% | 50% |
| mcp-gateway | 90% | 80% | 60% |
| validators | 95% | 80% | - |
| All others | 70% | 50% | - |

### Test File Naming

```
src/
  contract-parser.ts
  __tests__/
    contract-parser.test.ts      # Unit tests
    contract-parser.integration.ts # Integration tests
```

### Test Structure

```typescript
describe('ContractParser', () => {
  describe('parseMarkdown', () => {
    it('should parse valid markdown contract', () => {
      // Arrange
      const input = '# Contract...';
      
      // Act
      const result = parseMarkdown(input);
      
      // Assert
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid markdown with specific error', () => {
      // ...
    });
  });
});
```

---

## Git Workflow

### Branch Naming

```
feature/epic-XX-description    # New features
fix/epic-XX-description        # Bug fixes
refactor/package-name          # Refactoring
docs/topic                     # Documentation
ci/description                 # CI/CD changes
```

### Commit Messages

```
type(scope): description

# Examples:
feat(answer-contract): add YAML contract parser
fix(convergence-engine): handle edge case in iteration limit
docs(agents): update testing requirements
ci(github): add security scanning workflow
```

### PR Requirements

- [ ] All CI checks pass
- [ ] Coverage not decreased
- [ ] agents.md rules followed
- [ ] Evidence pack generated (if compliance-critical)
- [ ] At least 1 reviewer approval

---

## MCP Tool Registration

Tools exposed via `forge-c` MCP server:

| Tool | Description | Risk Level |
|------|-------------|------------|
| `forge_generate` | Run convergence session | MEDIUM |
| `forge_validate` | Validate against contract | LOW |
| `forge_get_metrics` | Get session metrics | LOW |
| `forge_parse_figma` | Parse Figma design | LOW |
| `forge_generate_react` | Generate React components | MEDIUM |
| `forge_generate_mendix` | Generate Mendix pages | HIGH |
| `forge_create_evidence` | Create audit evidence pack | MEDIUM |

---

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=           # Claude API access
WOLFRAM_APP_ID=              # Computational validation

# Optional
FIGMA_ACCESS_TOKEN=          # Figma API access
MENDIX_API_KEY=              # Mendix Platform SDK
DATABASE_URL=                # PostgreSQL connection
REDIS_URL=                   # Redis cache

# CI/CD
SNYK_TOKEN=                  # Security scanning
CODECOV_TOKEN=               # Coverage reporting
```

---

## Quick Reference Commands

```bash
# Install all dependencies
pnpm install

# Type check all packages
pnpm run typecheck

# Lint all packages
pnpm run lint

# Run all tests
pnpm run test

# Run specific package tests
pnpm --filter @forge/answer-contract test

# Build all packages
pnpm run build

# Generate OpenAPI spec
pnpm run openapi:generate

# Create evidence pack
pnpm --filter @forge/evidence-packs run generate
```

---

## Anti-Patterns (NEVER DO)

```typescript
// ❌ Using 'any' type
const data: any = response;

// ❌ Ignoring errors
try { risky() } catch { }

// ❌ Console.log in production code
console.log('debug:', value);

// ❌ Magic numbers
if (score > 0.95) { }  // What is 0.95?

// ❌ Mutating function parameters
function process(arr: string[]) { arr.push('x'); }

// ❌ Deep nesting
if (a) { if (b) { if (c) { if (d) { } } } }
```

---

## Version

| Field | Value |
|-------|-------|
| Version | 1.0.0 |
| Last Updated | 2025-01-20 |
| Author | ArcFoundry |
| Compliance | DCMA/DFARS/CMMC/SOC2 |
