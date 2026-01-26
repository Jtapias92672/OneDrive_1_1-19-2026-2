# Epic 2: Answer Contract - Schema, Parser & Validation System

**Duration:** 3 days  
**Token Budget:** 50K tokens  
**Status:** Ready to Start  
**Dependencies:** Epic 1 (Foundation)  
**Blocks:** Epic 3 (FORGE C Core), Epic 4 (Convergence Engine)

---

## Epic Goal

Implement the Answer Contract schema, parser, validators, and template system that defines the expected output format and validation criteria for FORGE convergence loops. Answer Contracts are the foundation for contract-driven code generation, enabling deterministic verification and compliance-ready evidence generation.

---

## Context: Why Answer Contracts Matter

### The Problem with Informal Specifications
- ❌ **Ambiguous requirements**: "Build a fast API" - how fast?
- ❌ **No verification**: "Make it secure" - verified how?
- ❌ **Manual validation**: Humans reviewing code (slow, error-prone)
- ❌ **No audit trail**: Can't prove what was delivered

### The Answer Contract Solution
- ✅ **Machine-readable specs**: YAML/JSON contracts define exact requirements
- ✅ **Automated validation**: Multiple validator types (schema, static, runtime)
- ✅ **Deterministic verification**: Same code always produces same validation results
- ✅ **Audit-ready evidence**: Every validation produces timestamped proof

---

## What is an Answer Contract?

An **Answer Contract** is a YAML/JSON specification that defines:

1. **What to build** (task definition, language, framework)
2. **How to verify it** (validators: schema, static analysis, tests, benchmarks)
3. **When it's done** (success criteria, minimum score thresholds)
4. **How to prove it** (evidence requirements for compliance)

### Minimal Answer Contract Example

```yaml
version: 1.0
name: simple-api-endpoint
description: Create GET /users endpoint returning JSON array

task:
  type: feature
  scope: backend
  language: typescript
  framework: express

validators:
  - name: type_check
    type: static_analysis
    command: tsc --noEmit
    
  - name: unit_tests
    type: test
    threshold: 80
    command: npm test

success_criteria:
  min_score: 0.75
  required_validators:
    - type_check
    - unit_tests

evidence:
  required:
    - test_report
    - coverage_report
  format: json
```

### Comprehensive Answer Contract Example

```yaml
version: 1.0
name: user-authentication
description: Implement secure user authentication with OAuth 2.1

task:
  type: feature
  scope: backend
  language: typescript
  framework: express
  components:
    - authentication
    - authorization
  compliance:
    - SOC2
    - GDPR

validators:
  # Static Analysis Validators
  - name: type_safety
    type: static_analysis
    command: tsc --noEmit
    required: true
    
  - name: linting
    type: static_analysis
    command: eslint src/
    severity: error
    
  # Test Validators
  - name: unit_tests
    type: test
    threshold: 90
    command: npm test
    required: true
    
  - name: integration_tests
    type: test
    threshold: 80
    command: npm run test:integration
    
  # Security Validators
  - name: security_scan
    type: security
    command: npm audit
    severity: high
    required: true
    
  - name: dependency_check
    type: security
    command: snyk test
    severity: medium
    
  # Performance Validators
  - name: response_time
    type: benchmark
    threshold:
      p50: 50
      p95: 200
      p99: 500
    unit: ms
    
  - name: memory_usage
    type: benchmark
    threshold: 512
    unit: mb
    
  # Schema Validators
  - name: api_schema
    type: json_schema
    schema: ./schemas/auth-api.json
    
  # Custom Validators
  - name: oauth_compliance
    type: custom
    script: ./validators/oauth-validator.js

success_criteria:
  min_score: 0.85
  required_validators:
    - type_safety
    - unit_tests
    - security_scan
  weighted_score:
    - validator: unit_tests
      weight: 0.4
    - validator: security_scan
      weight: 0.3
    - validator: type_safety
      weight: 0.3

evidence:
  required:
    - test_report
    - coverage_report
    - security_scan_results
    - performance_metrics
    - static_analysis_report
  format: json
  retention: 7_years
  audit_level: SOC2

metadata:
  created_at: "2026-01-22T00:00:00Z"
  created_by: "architect@company.com"
  jira_ticket: "FORGE-123"
  estimated_effort: "3 days"
  priority: high
```

---

## Architecture: Answer Contract System

```
┌──────────────────────────────────────────────────────────┐
│                  Contract Lifecycle                       │
└──────────────────────────────────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ↓                   ↓                   ↓
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Schema    │    │   Parser    │    │  Validator  │
│ Definition  │───→│   (YAML)    │───→│   Engine    │
│  (Types)    │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                   │
                           │                   ↓
                           │            ┌─────────────┐
                           │            │  Evidence   │
                           └───────────→│    Pack     │
                                        └─────────────┘

┌──────────────────────────────────────────────────────────┐
│                  Validator Types                          │
├──────────────────────────────────────────────────────────┤
│  JSON Schema  │  TypeScript  │  Regex  │  LLM Judge      │
│  Validator    │  Compiler    │  Match  │  (Skeleton)     │
└──────────────────────────────────────────────────────────┘
                           │
                           ↓
                   ┌───────────────┐
                   │   Composite   │
                   │   Validator   │
                   └───────────────┘
```

---

## Core Components

### 1. Schema System

**Purpose:** Define the structure and validation rules for Answer Contracts

**Components:**
- TypeScript type definitions (compile-time safety)
- Zod schemas (runtime validation)
- JSON Schema (external tool validation)

**Key Types:**
```typescript
export interface AnswerContract {
  version: string;                          // Schema version (e.g., "1.0")
  name: string;                             // Contract identifier
  description: string;                      // Human-readable description
  task: TaskDefinition;                     // What to build
  validators: Validator[];                  // How to verify
  success_criteria: SuccessCriteria;        // When it's done
  evidence: EvidenceRequirements;           // How to prove it
  metadata?: ContractMetadata;              // Optional metadata
}

export interface Validator {
  name: string;                             // Validator identifier
  type: ValidatorType;                      // Validator category
  threshold?: number;                       // Pass/fail threshold
  command?: string;                         // Shell command to execute
  required?: boolean;                       // Must pass for success
  weight?: number;                          // Weight in composite scoring
}

export interface SuccessCriteria {
  min_score: number;                        // Minimum overall score (0-1)
  required_validators: string[];            // Must-pass validators
  weighted_score?: WeightedValidator[];     // Custom validator weights
}
```

### 2. Parser System

**Purpose:** Load and parse YAML/JSON contracts into validated TypeScript objects

**Capabilities:**
- YAML parsing with error handling
- JSON parsing with error handling
- Schema validation on load
- Version compatibility checking
- Detailed error messages with line numbers

**Usage:**
```typescript
import { parseContract } from '@forge/answer-contract';

// From YAML file
const contract = await parseContract('./contracts/auth.yaml');

// From JSON string
const contract = await parseContract(JSON.stringify(contractObj));

// With validation
try {
  const contract = await parseContract('./contracts/auth.yaml', {
    validate: true,
    strict: true
  });
} catch (error) {
  console.error('Contract validation failed:', error.message);
}
```

### 3. Validator System

**Purpose:** Execute validators and compute validation scores

**Validator Types:**

1. **JSON Schema Validator**
   - Validates JSON output against JSON Schema
   - Uses AJV library for fast validation
   - Returns detailed error paths

2. **TypeScript Compiler Validator**
   - Runs `tsc --noEmit` to check type safety
   - Parses compiler output for errors
   - No runtime overhead (static analysis)

3. **Regex Validator**
   - Pattern matching for text output
   - Simple, fast validation
   - Useful for format verification

4. **LLM Judge Validator (Skeleton)**
   - Placeholder for future semantic validation
   - Would use LLM to judge code quality
   - Not implemented in Epic 2 (deferred)

5. **Composite Validator**
   - Runs multiple validators
   - Computes weighted scores
   - Enforces required validators

**Validator Interface:**
```typescript
export interface IValidator {
  name: string;
  type: ValidatorType;
  
  validate(code: string, config: ValidatorConfig): Promise<ValidationResult>;
}

export interface ValidationResult {
  passed: boolean;
  score: number;           // 0-1
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: Record<string, unknown>;
}
```

### 4. Template Registry

**Purpose:** Provide pre-built contract templates for common use cases

**Built-in Templates:**
- `api-endpoint` - REST API endpoint
- `react-component` - React component with tests
- `database-migration` - SQL migration script
- `cli-tool` - Command-line interface
- `lambda-function` - AWS Lambda function

**Usage:**
```typescript
import { TemplateRegistry } from '@forge/answer-contract';

const registry = new TemplateRegistry();

// Get template
const template = registry.get('api-endpoint');

// Customize template
const contract = template.customize({
  name: 'get-users',
  framework: 'express',
  testCoverage: 90
});

// Register custom template
registry.register('custom-template', myTemplate);
```

---

## User Stories

### US-2.1: Contract Schema Definition

**As a** platform architect  
**I want** a formal schema for Answer Contracts  
**So that** contracts are consistent, validated, and machine-readable

**Acceptance Criteria:**
- [ ] TypeScript types with Zod validation
- [ ] JSON Schema for external tools
- [ ] Schema versioning (v1.0)
- [ ] Compile-time and runtime validation
- [ ] Comprehensive type coverage

### US-2.2: Contract Parser

**As a** developer  
**I want** to load contracts from YAML/JSON files  
**So that** I can define contracts in a human-readable format

**Acceptance Criteria:**
- [ ] Parse YAML with error handling
- [ ] Parse JSON with error handling
- [ ] Validate against schema on load
- [ ] Clear error messages with line numbers
- [ ] Support for relative file paths

### US-2.3: Validator Execution

**As a** convergence engine  
**I want** to execute validators against generated code  
**So that** I can verify code meets contract requirements

**Acceptance Criteria:**
- [ ] JSON Schema validator implementation
- [ ] TypeScript compiler validator
- [ ] Regex pattern validator
- [ ] Composite validator (run multiple)
- [ ] Validator factory for extensibility

### US-2.4: Template System

**As a** developer  
**I want** pre-built contract templates  
**So that** I don't have to write contracts from scratch

**Acceptance Criteria:**
- [ ] Template registry with built-in templates
- [ ] Template customization API
- [ ] Custom template registration
- [ ] Template validation on load
- [ ] Template documentation

---

## Token Budget Allocation

| Phase | Tasks | Tokens | % of Total |
|-------|-------|--------|------------|
| **Phase 2.1: Schema** | 2 | 15K | 30% |
| **Phase 2.2: Validators** | 3 | 25K | 50% |
| **Phase 2.3: Templates** | 1 | 10K | 20% |
| **Total** | **6** | **50K** | **100%** |

---

## Integration Points

### Consumed By:
- **Epic 3 (FORGE C Core)**: Loads and parses contracts
- **Epic 4 (Convergence Engine)**: Executes validators
- **Epic 8 (Evidence Packs)**: Generates compliance artifacts

### Depends On:
- **Epic 1 (Foundation)**: Base types, utilities, error handling

---

## Validation Strategy

### Contract-Level Validation
1. Schema validation (Zod/JSON Schema)
2. Version compatibility check
3. Required field presence
4. Validator reference resolution

### Validator-Level Validation
1. Validator type is supported
2. Required configuration present
3. Commands are executable
4. Thresholds are valid ranges

### Evidence-Level Validation
1. Evidence types are recognized
2. Retention periods are valid
3. Audit levels are supported
4. Format specifications are valid

---

## Success Metrics

### Functional Requirements
- [ ] All contract schemas defined and validated
- [ ] YAML/JSON parsing with 100% error coverage
- [ ] 4+ validator types implemented
- [ ] Template registry with 5+ built-in templates
- [ ] All validators return structured results

### Non-Functional Requirements
- [ ] Parse contracts in <10ms
- [ ] Validate contracts in <50ms
- [ ] Zero memory leaks (validated via tests)
- [ ] 90%+ test coverage
- [ ] Full TypeScript type safety

### Compliance Requirements
- [ ] All validation results timestamped
- [ ] All errors include stack traces
- [ ] All results serializable to JSON
- [ ] Evidence format supports SOC2 retention

---

## Technical Decisions

### Why Zod + JSON Schema?
- **Zod**: Runtime validation, TypeScript integration
- **JSON Schema**: External tool compatibility (e.g., VS Code)
- **Both**: Comprehensive validation coverage

### Why YAML over JSON?
- Human-readable (comments, multi-line strings)
- Less verbose than JSON
- Industry standard for config files
- JSON still supported as fallback

### Why Composite Validators?
- Flexibility: Run multiple validators
- Weighted scoring: Prioritize important validators
- Required validators: Enforce must-pass criteria
- Extensibility: Add custom validators easily

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **Schema drift** | Version contracts, validate on load |
| **Invalid validators** | Validator factory with type checking |
| **Parser errors** | Detailed error messages with line numbers |
| **Performance** | Cache parsed contracts, lazy-load validators |
| **Security** | Sanitize commands before execution |

---

## Next Steps (Epic 3)

After Epic 2 completes, Epic 3 will:
1. Create ForgeC orchestrator class
2. Integrate Answer Contract parser
3. Build convergence loop with validator execution
4. Add MCP server for Claude integration
5. Generate evidence packs from validation results

---

## References

- **TASKS-2-ANSWER-CONTRACT-6TASKS-3DAYS.md** - Detailed task breakdown
- **Epic 3: FORGE C Core** - Consumer of Answer Contracts
- **Epic 4: Convergence Engine** - Validator execution engine
- **Anthropic MCP Docs** - Code-first pattern guidance

---

**Epic 2 Status: Ready to Start**  
**Estimated Completion: 3 days**  
**Token Budget: 50K (SAFE)**
