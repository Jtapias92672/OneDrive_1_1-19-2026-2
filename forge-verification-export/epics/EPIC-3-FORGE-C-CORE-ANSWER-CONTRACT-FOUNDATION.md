# Epic 3: FORGE C Core - Answer Contract Foundation

**Duration:** 7 days  
**Token Budget:** 60K tokens  
**Status:** Complete (Foundation)  
**Dependencies:** None (First Epic)  
**Blocks:** Epic 3.5 (Gateway Foundation)

---

## Epic Goal

Establish the Answer Contract system as the foundation for contract-driven code generation in FORGE. Answer Contracts define "what good looks like" through validators, success criteria, and evidence requirements, enabling deterministic, verifiable, and compliant code generation.

---

## Context: Why Answer Contracts are CRITICAL

### The Problem with Traditional Requirements
- ❌ **Ambiguous**: "The system should be fast" - how fast?
- ❌ **Non-verifiable**: "The UI should look good" - according to whom?
- ❌ **Non-executable**: Requirements documents can't run tests
- ❌ **No accountability**: Who verifies the work was done correctly?

### The Answer Contract Solution
- ✅ **Precise**: `response_time_p95 < 200ms`
- ✅ **Verifiable**: `test_coverage >= 90%`
- ✅ **Executable**: Validators run as code (deterministic)
- ✅ **Accountable**: Evidence packs prove compliance

---

## What is an Answer Contract?

An **Answer Contract** is a YAML specification that defines:
1. **What to build** (task description)
2. **How to verify it** (validators)
3. **When it's done** (success criteria)
4. **How to prove it** (evidence requirements)

### Example Answer Contract

```yaml
# contracts/user-authentication.yaml
version: 1.0
name: user-authentication
description: Implement secure user authentication with OAuth 2.1

task:
  type: feature
  scope: backend
  language: typescript
  framework: express

validators:
  - name: unit_tests
    type: test
    threshold: 90
    command: pnpm test
    
  - name: type_safety
    type: static_analysis
    command: tsc --noEmit
    
  - name: security_scan
    type: security
    command: npm audit
    severity: high
    
  - name: performance
    type: benchmark
    threshold:
      response_time_p95: 200
      memory_usage_mb: 512

success_criteria:
  min_score: 0.85
  required_validators:
    - unit_tests
    - type_safety
    - security_scan

evidence:
  required:
    - test_report
    - coverage_report
    - security_scan_results
    - performance_metrics
  format: json
  retention: 7_years
```

---

## Architecture: The Three Layers

```
┌─────────────────────────────────────────────┐
│         Epic 4: Convergence Engine          │  ← Uses contracts
│   (Iteratively generates code until valid)  │
└─────────────────┬───────────────────────────┘
                  │
                  │ reads
                  ↓
┌─────────────────────────────────────────────┐
│      Epic 3: Answer Contract Foundation     │  ← This Epic
│  (Defines what to build and how to verify)  │
└─────────────────┬───────────────────────────┘
                  │
                  │ validates
                  ↓
┌─────────────────────────────────────────────┐
│         Generated Code (TypeScript)         │  ← Output
│    (Must pass all validators to converge)   │
└─────────────────────────────────────────────┘
```

---

## User Stories

### US-3.1: Answer Contract Schema Definition
**As a** platform architect  
**I want** a formal schema for Answer Contracts  
**So that** contracts are consistent and machine-readable

**Acceptance Criteria:**
- [ ] YAML schema with JSON Schema validation
- [ ] Schema versioning support (v1.0)
- [ ] Schema validation on load
- [ ] TypeScript types generated from schema

**Schema Structure:**
```typescript
export interface AnswerContract {
  version: string;
  name: string;
  description: string;
  task: TaskDefinition;
  validators: Validator[];
  success_criteria: SuccessCriteria;
  evidence: EvidenceRequirements;
  metadata?: ContractMetadata;
}

export interface Validator {
  name: string;
  type: ValidatorType;
  threshold?: number;
  command?: string;
  config?: Record<string, any>;
}

export type ValidatorType = 
  | 'test'              // Unit/integration tests
  | 'static_analysis'   // ESLint, TypeScript, etc.
  | 'security'          // npm audit, Snyk
  | 'performance'       // Benchmarks, load tests
  | 'custom';           // User-defined
```

---

### US-3.2: Contract Parser & Validator
**As a** convergence engine  
**I want** to parse and validate Answer Contracts  
**So that** invalid contracts are rejected early

**Acceptance Criteria:**
- [ ] YAML parser with schema validation
- [ ] Validator configuration validation
- [ ] Dependency resolution (contracts can reference other contracts)
- [ ] Error messages with line numbers

**Example Usage:**
```typescript
import { ContractParser } from '@forge/answer-contract';

const parser = new ContractParser();
const contract = await parser.parse('contracts/feature-x.yaml');

if (!contract.valid) {
  console.error('Invalid contract:', contract.errors);
  process.exit(1);
}
```

---

### US-3.3: Validator Registry
**As a** platform engineer  
**I want** a registry of built-in validators  
**So that** common validation patterns are reusable

**Acceptance Criteria:**
- [ ] Registry of built-in validators (test, lint, security, performance)
- [ ] Validator discovery (list available validators)
- [ ] Custom validator registration
- [ ] Validator metadata (description, parameters, examples)

**Built-in Validators:**
```typescript
export const BUILT_IN_VALIDATORS = {
  jest: {
    name: 'jest',
    type: 'test',
    description: 'Run Jest unit tests',
    command: 'jest --coverage --json --outputFile={output}',
    thresholds: { coverage: 90 },
  },
  
  eslint: {
    name: 'eslint',
    type: 'static_analysis',
    description: 'Run ESLint static analysis',
    command: 'eslint . --format json --output-file {output}',
  },
  
  npm_audit: {
    name: 'npm_audit',
    type: 'security',
    description: 'Scan for npm package vulnerabilities',
    command: 'npm audit --json > {output}',
  },
  
  typescript: {
    name: 'typescript',
    type: 'static_analysis',
    description: 'TypeScript type checking',
    command: 'tsc --noEmit',
  },
};
```

---

### US-3.4: Validator Executor (Deterministic)
**As a** convergence engine  
**I want** to execute validators as code  
**So that** validation is deterministic and auditable

**Acceptance Criteria:**
- [ ] Execute shell commands (npm test, eslint, etc.)
- [ ] Execute TypeScript validators (custom logic)
- [ ] Timeout handling (30s default)
- [ ] Result parsing (JSON, exit codes)
- [ ] Structured output (passed, score, evidence)

**Execution Flow:**
```typescript
export class ValidatorExecutor {
  async execute(
    validator: Validator,
    code: string,
    workingDir: string
  ): Promise<ValidationResult> {
    // Step 1: Prepare execution environment
    await this.prepareWorkspace(workingDir, code);
    
    // Step 2: Execute validator command
    const result = await this.executeCommand(validator.command, {
      cwd: workingDir,
      timeout: 30000,
    });
    
    // Step 3: Parse results
    const parsed = this.parseResult(result, validator.type);
    
    // Step 4: Compare against threshold
    const passed = parsed.score >= (validator.threshold || 0);
    
    return {
      validator: validator.name,
      passed,
      score: parsed.score,
      evidence: parsed.evidence,
      timestamp: new Date(),
    };
  }
}
```

---

### US-3.5: Success Criteria Evaluation
**As a** convergence engine  
**I want** to evaluate if code meets success criteria  
**So that** I know when convergence is complete

**Acceptance Criteria:**
- [ ] Aggregate validator results
- [ ] Calculate overall score (weighted average)
- [ ] Check required validators passed
- [ ] Generate pass/fail decision

**Evaluation Logic:**
```typescript
export class SuccessEvaluator {
  evaluate(
    results: ValidationResult[],
    criteria: SuccessCriteria
  ): SuccessEvaluation {
    // Step 1: Check required validators
    const requiredPassed = criteria.required_validators.every(name =>
      results.find(r => r.validator === name)?.passed
    );
    
    if (!requiredPassed) {
      return { passed: false, reason: 'Required validators failed' };
    }
    
    // Step 2: Calculate overall score
    const scores = results.map(r => r.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // Step 3: Compare against threshold
    const passed = avgScore >= criteria.min_score;
    
    return {
      passed,
      score: avgScore,
      results,
      timestamp: new Date(),
    };
  }
}
```

---

### US-3.6: Evidence Pack Generation
**As a** compliance officer  
**I want** evidence packs generated from contracts  
**So that** I can audit code generation runs

**Acceptance Criteria:**
- [ ] Collect validation results
- [ ] Collect test reports, coverage, security scans
- [ ] Generate JSON evidence pack
- [ ] Sign evidence pack (HMAC-SHA256)
- [ ] Store for 7 years (DCMA compliance)

**Evidence Pack Structure:**
```typescript
export interface EvidencePack {
  contract: string;              // Contract name
  run_id: string;                // Unique run ID
  timestamp: string;             // ISO 8601
  
  results: {
    passed: boolean;
    score: number;
    validators: ValidationResult[];
  };
  
  artifacts: {
    test_report?: string;        // JSON
    coverage_report?: string;    // JSON
    security_scan?: string;      // JSON
    performance_metrics?: string; // JSON
  };
  
  metadata: {
    agent: string;
    model: string;
    tokens_used: number;
    duration_ms: number;
  };
  
  signature: string;             // HMAC-SHA256
}
```

---

### US-3.7: Contract Templates Library
**As a** developer  
**I want** pre-built contract templates  
**So that** I don't start from scratch

**Acceptance Criteria:**
- [ ] Template library with common patterns
- [ ] Templates for: REST API, React component, CLI tool, database schema
- [ ] Template parameterization (fill in the blanks)
- [ ] Template validation

**Example Templates:**
```yaml
# templates/rest-api.yaml
version: 1.0
name: rest-api-template
description: REST API endpoint with OpenAPI spec

task:
  type: api
  scope: backend
  language: typescript
  framework: express

validators:
  - name: unit_tests
    type: test
    threshold: 90
  - name: openapi_validation
    type: schema
    spec: openapi.yaml
  - name: security_scan
    type: security
    command: npm audit

# templates/react-component.yaml
version: 1.0
name: react-component-template
description: React component with TypeScript and tests

task:
  type: component
  scope: frontend
  language: typescript
  framework: react

validators:
  - name: jest_tests
    type: test
    threshold: 85
  - name: storybook
    type: visual
    command: build-storybook
  - name: accessibility
    type: a11y
    command: axe-core
```

---

## Key Deliverables

```
packages/answer-contract/
├── src/
│   ├── schema/
│   │   ├── contract-schema.json      # JSON Schema definition
│   │   ├── types.ts                  # TypeScript types
│   │   └── validator.ts              # Schema validation
│   ├── parser/
│   │   ├── yaml-parser.ts            # YAML → Contract object
│   │   ├── validator.ts              # Contract validation
│   │   └── resolver.ts               # Dependency resolution
│   ├── registry/
│   │   ├── validator-registry.ts     # Built-in validators
│   │   ├── built-in/                 # Jest, ESLint, etc.
│   │   └── custom-registry.ts        # User-defined validators
│   ├── executor/
│   │   ├── validator-executor.ts     # Execute validators
│   │   ├── command-runner.ts         # Shell command execution
│   │   └── result-parser.ts          # Parse validator output
│   ├── evaluator/
│   │   ├── success-evaluator.ts      # Evaluate success criteria
│   │   └── scoring.ts                # Scoring algorithms
│   ├── evidence/
│   │   ├── evidence-pack-generator.ts # Generate evidence packs
│   │   ├── signer.ts                 # Cryptographic signatures
│   │   └── storage.ts                # 7-year retention
│   └── templates/
│       ├── template-library.ts       # Template management
│       └── templates/                # Pre-built templates
│           ├── rest-api.yaml
│           ├── react-component.yaml
│           ├── cli-tool.yaml
│           └── database-schema.yaml
├── tests/
│   ├── parser.test.ts
│   ├── executor.test.ts
│   ├── evaluator.test.ts
│   └── integration.test.ts
├── examples/
│   ├── basic-contract.yaml
│   ├── complex-contract.yaml
│   └── multi-validator.yaml
├── package.json
└── README.md
```

---

## Contract Example: Full Featured

```yaml
# contracts/payment-processing.yaml
version: 1.0
name: payment-processing
description: |
  Implement secure payment processing with Stripe integration.
  Must handle card payments, refunds, and webhook events.

task:
  type: feature
  scope: backend
  language: typescript
  framework: express
  estimated_complexity: high

validators:
  # Testing
  - name: unit_tests
    type: test
    threshold: 95
    command: jest --coverage --testPathPattern=payment
    weight: 0.3
    
  - name: integration_tests
    type: test
    threshold: 90
    command: jest --testPathPattern=integration/payment
    weight: 0.2
    
  # Security
  - name: security_scan
    type: security
    command: npm audit --audit-level=high
    weight: 0.2
    
  - name: pii_detection
    type: security
    command: detect-secrets scan
    weight: 0.1
    
  # Quality
  - name: type_safety
    type: static_analysis
    command: tsc --noEmit
    weight: 0.1
    
  - name: code_quality
    type: static_analysis
    command: eslint src/payment --max-warnings 0
    weight: 0.05
    
  # Performance
  - name: load_test
    type: performance
    command: k6 run load-test.js
    threshold:
      response_time_p95: 500
      error_rate: 0.01
    weight: 0.05

success_criteria:
  min_score: 0.90
  required_validators:
    - unit_tests
    - integration_tests
    - security_scan
    - type_safety
  optional_validators:
    - load_test

evidence:
  required:
    - test_report
    - coverage_report
    - security_scan_results
    - type_definitions
  optional:
    - performance_report
  format: json
  retention: 7_years
  signed: true

metadata:
  owner: payments-team
  reviewers:
    - security-team
    - compliance-team
  priority: critical
  tags:
    - pci-compliance
    - financial
    - high-risk
```

---

## Completion Criteria

- [ ] All 7 User Stories implemented
- [ ] Contract schema defined and validated
- [ ] Parser operational with schema validation
- [ ] Validator registry with built-in validators
- [ ] Executor can run validators deterministically
- [ ] Success evaluator working
- [ ] Evidence packs generating with signatures
- [ ] Template library with 4+ templates
- [ ] All tests passing (>90% coverage)
- [ ] Documentation complete
- [ ] Example contracts provided

---

## Success Metrics

**Contract Quality:**
- Target: **100% valid contracts** (pass schema validation)
- Actual: _To be measured_

**Validator Reliability:**
- Target: **<1% validator failures** (timeouts, crashes)
- Actual: _To be measured_

**Evidence Integrity:**
- Target: **100% evidence packs signed** (HMAC-SHA256)
- Actual: _To be measured_

---

## Verification Script

```bash
#!/bin/bash
# verify-epic-3.sh

set -e

echo "🔍 Verifying Epic 3: Answer Contract Foundation"

# Check package structure
if [ ! -d "packages/answer-contract" ]; then
  echo "❌ answer-contract package missing"
  exit 1
fi

# Check core files
required_files=(
  "packages/answer-contract/src/schema/contract-schema.json"
  "packages/answer-contract/src/parser/yaml-parser.ts"
  "packages/answer-contract/src/registry/validator-registry.ts"
  "packages/answer-contract/src/executor/validator-executor.ts"
  "packages/answer-contract/src/evaluator/success-evaluator.ts"
  "packages/answer-contract/src/evidence/evidence-pack-generator.ts"
  "packages/answer-contract/src/templates/template-library.ts"
  "packages/answer-contract/package.json"
)

for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ Missing required file: $file"
    exit 1
  fi
done

# Build
echo "📦 Building answer-contract..."
pnpm --filter @forge/answer-contract build

# Run tests
echo "🧪 Running tests..."
pnpm --filter @forge/answer-contract test

# Validate schema
echo "📋 Validating contract schema..."
pnpm --filter @forge/answer-contract validate-schema

# Test example contracts
echo "📄 Testing example contracts..."
for contract in packages/answer-contract/examples/*.yaml; do
  echo "  Testing $contract..."
  pnpm --filter @forge/answer-contract parse "$contract"
done

echo ""
echo "✅ Epic 3 verification complete"
echo "✅ Contract schema validated"
echo "✅ Parser operational"
echo "✅ Validators registered"
echo "✅ All tests passing"
echo ""
echo "📋 Ready for Epic 3.5: Gateway Foundation"
```

---

## ROI Analysis

**Development Investment:**
- Epic 3: 60K tokens × $0.02 = $1,200

**Operational Value (Year 1):**
- **Contract-driven automation**: Eliminate 80% of manual spec writing = 1,000 hours/year × $150/hr = $150,000
- **Deterministic validation**: Reduce QA time by 60% = 800 hours/year × $100/hr = $80,000
- **Evidence automation**: Eliminate manual audit prep = 200 hours/year × $200/hr = $40,000
- **Compliance**: Avoid SOC 2 findings = $50,000 (avoid remediation costs)

**Total Value:** $320,000/year

**Payback Period:** **14 days** at typical usage

**ROI:** **26,567%** (conservative, first year only)

---

## Handoff Context for Epic 3.5

**What Epic 3.5 needs to know:**

**Contract Entry Point:**
```typescript
import { ContractParser, ValidatorExecutor } from '@forge/answer-contract';

// Parse contract
const parser = new ContractParser();
const contract = await parser.parse('contracts/feature-x.yaml');

// Execute validators
const executor = new ValidatorExecutor();
const results = await executor.executeAll(contract.validators, code);

// Evaluate success
const evaluator = new SuccessEvaluator();
const success = evaluator.evaluate(results, contract.success_criteria);
```

**What Epic 3.5 will add:**
1. MCP Gateway for routing tool calls
2. CARS risk assessment before tool execution
3. Human approval for HIGH/CRITICAL risk tools
4. Gateway integration with Answer Contracts

**Files to reference:**
- `packages/answer-contract/src/schema/types.ts` - Contract types
- `packages/answer-contract/src/executor/validator-executor.ts` - Validator execution
- `packages/answer-contract/src/evaluator/success-evaluator.ts` - Success evaluation

---

## References

**Industry Standards:**
1. OpenAPI Specification (contract-driven API design)
2. JSON Schema (schema validation)
3. CycloneDX (SBOM format)
4. SOC 2 Type II (evidence requirements)

**Inspiration:**
- Cucumber (behavior-driven development)
- Design by Contract (Eiffel language)
- Property-based testing (QuickCheck)
- Test-driven development (Kent Beck)
