# Epic 2: Answer Contract Engine

**Duration:** 4 days  
**Token Budget:** 50K tokens  
**Status:** Not Started  
**Dependencies:** Epic 1 (Foundation)

---

## Epic Goal

Build the Answer Contract system that defines structural requirements, validation rules, and convergence criteria for any generated output. This is the "schema" that tells FORGE what "correct" looks like.

---

## User Stories

### US-2.1: Contract Schema Definition
**As a** platform user  
**I want** to define answer contracts in YAML/JSON  
**So that** I can specify exactly what output I need

**Acceptance Criteria:**
- [ ] JSON Schema for contract definition
- [ ] YAML parser with validation
- [ ] TypeScript types generated from schema
- [ ] Schema versioning support (v1, v2, etc.)

**Contract Schema (v1):**
```yaml
# Example: Engineering Change Request Contract
id: ecr-contract-v1
version: "1.0.0"
name: Engineering Change Request
description: Contract for generating compliant ECRs

output:
  type: object
  required:
    - title
    - description
    - impactAnalysis
    - approvals
  properties:
    title:
      type: string
      minLength: 10
      maxLength: 200
      pattern: "^ECR-\\d{4}-\\d{3}:"
    description:
      type: string
      minLength: 100
      sections:
        - problem_statement
        - proposed_solution
        - alternatives_considered
    impactAnalysis:
      type: object
      required:
        - schedule
        - cost
        - technical
        - safety
      properties:
        schedule:
          type: string
          enum: [none, minor, moderate, major, critical]
        cost:
          type: number
          minimum: 0
        technical:
          type: array
          items:
            type: string
          minItems: 1
        safety:
          type: boolean
    approvals:
      type: array
      minItems: 3
      items:
        type: object
        required: [role, name, date]

validators:
  - type: json_schema
    strict: true
  - type: custom
    function: validateECRCompleteness
  - type: llm_judge
    criteria: "Is this ECR complete and professionally written?"
    threshold: 0.85

convergence:
  maxIterations: 5
  strategy: iterative_refinement
  exitCriteria:
    - allValidatorsPass: true
    - confidenceScore: 0.9

evidence:
  required:
    - validation_trace
    - iteration_history
    - final_confidence_score
  optional:
    - llm_reasoning
    - alternative_outputs
```

**Verification:**
```bash
pnpm --filter @forge/answer-contract test:schema
```

---

### US-2.2: Contract Parser & Loader
**As a** developer  
**I want** contracts loaded and validated at runtime  
**So that** invalid contracts fail fast

**Acceptance Criteria:**
- [ ] Load contracts from YAML/JSON files
- [ ] Validate contract schema on load
- [ ] Cache compiled contracts
- [ ] Hot-reload in development mode
- [ ] Clear error messages for invalid contracts

**Implementation:**
```typescript
// packages/answer-contract/src/loader.ts
export class ContractLoader {
  private cache: Map<string, CompiledContract> = new Map();
  
  async load(path: string): Promise<CompiledContract> {
    const cached = this.cache.get(path);
    if (cached && !this.isDevelopment) return cached;
    
    const raw = await this.readFile(path);
    const parsed = this.parse(raw);
    const validated = this.validate(parsed);
    const compiled = this.compile(validated);
    
    this.cache.set(path, compiled);
    return compiled;
  }
  
  private validate(contract: RawContract): ValidatedContract {
    const result = contractSchemaValidator.validate(contract);
    if (!result.valid) {
      throw new ContractValidationError(
        `Invalid contract: ${result.errors.join(', ')}`
      );
    }
    return contract as ValidatedContract;
  }
  
  private compile(contract: ValidatedContract): CompiledContract {
    return {
      ...contract,
      validators: contract.validators.map(v => this.compileValidator(v)),
      schema: this.compileJsonSchema(contract.output),
    };
  }
}
```

**Verification:**
```bash
# Test valid contract loads
pnpm --filter @forge/answer-contract test:loader

# Test invalid contract fails
echo "invalid: yaml" > /tmp/bad.yaml
pnpm --filter @forge/answer-contract validate /tmp/bad.yaml  # Should fail
```

---

### US-2.3: Validator Engine
**As a** contract author  
**I want** multiple validator types  
**So that** I can enforce different kinds of requirements

**Acceptance Criteria:**
- [ ] JSON Schema validator (structural)
- [ ] Custom function validator (business logic)
- [ ] LLM Judge validator (semantic quality)
- [ ] Regex pattern validator
- [ ] Composite validators (AND, OR, NOT)

**Validator Types:**
```typescript
// packages/answer-contract/src/validators/types.ts
export type ValidatorType = 
  | 'json_schema'
  | 'custom'
  | 'llm_judge'
  | 'regex'
  | 'composite';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: {
    validatorType: ValidatorType;
    executionTimeMs: number;
    confidence?: number;  // For LLM judge
  };
}

export interface Validator {
  type: ValidatorType;
  validate(output: unknown, context: ValidationContext): Promise<ValidationResult>;
}
```

**LLM Judge Implementation:**
```typescript
// packages/answer-contract/src/validators/llm-judge.ts
export class LLMJudgeValidator implements Validator {
  type = 'llm_judge' as const;
  
  constructor(
    private criteria: string,
    private threshold: number,
    private model: string = 'claude-sonnet-4-20250514'
  ) {}
  
  async validate(output: unknown, context: ValidationContext): Promise<ValidationResult> {
    const prompt = `
      Evaluate the following output against these criteria:
      ${this.criteria}
      
      Output to evaluate:
      ${JSON.stringify(output, null, 2)}
      
      Respond with JSON:
      {
        "score": 0.0-1.0,
        "reasoning": "...",
        "issues": ["..."]
      }
    `;
    
    const response = await this.llm.complete(prompt);
    const evaluation = JSON.parse(response);
    
    return {
      valid: evaluation.score >= this.threshold,
      errors: evaluation.issues.map(i => ({ message: i, severity: 'error' })),
      warnings: [],
      metadata: {
        validatorType: this.type,
        executionTimeMs: Date.now() - start,
        confidence: evaluation.score,
      },
    };
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/answer-contract test:validators
```

---

### US-2.4: Contract Templates Library
**As a** platform user  
**I want** pre-built contract templates  
**So that** I can start quickly without writing from scratch

**Acceptance Criteria:**
- [ ] ECR (Engineering Change Request) template
- [ ] Jira Ticket template
- [ ] Test Plan template
- [ ] React Component template
- [ ] API Endpoint template
- [ ] All templates validated and tested

**Template Directory:**
```
packages/answer-contract/templates/
├── defense/
│   ├── ecr.yaml
│   ├── cdrl.yaml
│   └── status-report.yaml
├── development/
│   ├── jira-ticket.yaml
│   ├── test-plan.yaml
│   ├── react-component.yaml
│   └── api-endpoint.yaml
└── documentation/
    ├── technical-spec.yaml
    └── user-guide.yaml
```

**Verification:**
```bash
# Validate all templates
pnpm --filter @forge/answer-contract validate:templates
```

---

### US-2.5: Contract Versioning & Migration
**As a** platform operator  
**I want** contract versions tracked  
**So that** I can evolve contracts without breaking existing outputs

**Acceptance Criteria:**
- [ ] Semantic versioning for contracts
- [ ] Migration scripts between versions
- [ ] Backward compatibility checks
- [ ] Version history in evidence packs

**Implementation:**
```typescript
// packages/answer-contract/src/versioning.ts
export class ContractVersionManager {
  async migrate(
    output: unknown,
    fromVersion: string,
    toVersion: string,
    contract: CompiledContract
  ): Promise<MigrationResult> {
    const migrations = this.getMigrationPath(fromVersion, toVersion);
    
    let current = output;
    for (const migration of migrations) {
      current = await migration.transform(current);
    }
    
    return {
      output: current,
      fromVersion,
      toVersion,
      migrationsApplied: migrations.map(m => m.version),
    };
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/answer-contract test:versioning
```

---

## Key Deliverables

```
packages/answer-contract/
├── src/
│   ├── index.ts
│   ├── loader.ts
│   ├── compiler.ts
│   ├── versioning.ts
│   ├── schema/
│   │   ├── contract-schema.json
│   │   └── validator.ts
│   ├── validators/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── json-schema.ts
│   │   ├── custom.ts
│   │   ├── llm-judge.ts
│   │   ├── regex.ts
│   │   └── composite.ts
│   └── types/
│       └── index.ts
├── templates/
│   ├── defense/
│   ├── development/
│   └── documentation/
├── __tests__/
│   ├── loader.test.ts
│   ├── validators.test.ts
│   └── templates.test.ts
├── package.json
└── tsconfig.json
```

---

## Completion Criteria

- [ ] Contract schema validates correctly
- [ ] All 5 validator types implemented and tested
- [ ] 8+ contract templates created
- [ ] Contract loader with caching works
- [ ] Version migration system functional
- [ ] 90%+ test coverage on validators
- [ ] Integration test with sample ECR contract

---

## Handoff Context for Epic 3

**What Epic 3 needs to know:**
- Import: `import { ContractLoader, CompiledContract } from '@forge/answer-contract'`
- Contract location: `packages/answer-contract/templates/`
- Validator interface for custom validators

**Key Interfaces:**
```typescript
interface CompiledContract {
  id: string;
  version: string;
  validators: Validator[];
  schema: JSONSchema;
  convergenceCriteria: ConvergenceCriteria;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  metadata: ValidationMetadata;
}
```

---

## Verification Script

```bash
#!/bin/bash
# .forge/epics/epic-02-answer-contract/verify.sh

echo "🔍 Verifying Epic 2: Answer Contract"

cd packages/answer-contract

# Check source files exist
[ -f "src/loader.ts" ] || { echo "❌ loader.ts missing"; exit 1; }
[ -f "src/validators/llm-judge.ts" ] || { echo "❌ LLM judge missing"; exit 1; }

# Check templates exist
[ -d "templates/defense" ] || { echo "❌ Defense templates missing"; exit 1; }
[ -f "templates/defense/ecr.yaml" ] || { echo "❌ ECR template missing"; exit 1; }

# Run tests
pnpm test || { echo "❌ Tests failed"; exit 1; }

# Validate all templates
pnpm validate:templates || { echo "❌ Template validation failed"; exit 1; }

echo "✅ Epic 2 verification complete"
```
