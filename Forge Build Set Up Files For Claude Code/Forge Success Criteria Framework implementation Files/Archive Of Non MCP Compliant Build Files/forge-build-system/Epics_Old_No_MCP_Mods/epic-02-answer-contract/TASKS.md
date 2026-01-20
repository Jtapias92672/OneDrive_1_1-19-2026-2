# Epic 2: Answer Contract System - Atomic Task Breakdown

**Total Tasks:** 12  
**Estimated Tokens:** 50K total (~4.2K per task)  
**Estimated Time:** 4 days

---

## Phase 2.1: Package Setup & Schema

### Task 2.1.1: Create answer-contract package structure

**Time:** 5 minutes  
**Tokens:** ~3K  
**Files to CREATE:**
- `packages/answer-contract/package.json`
- `packages/answer-contract/tsconfig.json`
- `packages/answer-contract/src/index.ts`

**Directory Structure:**
```
packages/answer-contract/
├── src/
│   ├── index.ts
│   ├── schema/
│   ├── parser/
│   ├── validators/
│   └── templates/
├── package.json
└── tsconfig.json
```

**Acceptance Criteria:**
- [ ] Package name is `@forge/answer-contract`
- [ ] Dependencies: `zod`, `yaml`, `ajv`
- [ ] Exports from src/index.ts
- [ ] `pnpm build` succeeds

**Verification:**
```bash
cd packages/answer-contract && pnpm build
```

---

### Task 2.1.2: Define core contract TypeScript types

**Time:** 5 minutes  
**Tokens:** ~5K  
**Files to CREATE:**
- `packages/answer-contract/src/schema/types.ts`

**Types to Define:**
```typescript
export interface AnswerContract {
  id: string;
  version: string;
  name: string;
  description?: string;
  output: OutputSchema;
  validators: ValidatorConfig[];
  convergence: ConvergenceConfig;
}

export interface OutputSchema {
  type: 'object' | 'array' | 'string';
  required?: string[];
  properties?: Record<string, PropertySchema>;
}

export interface ValidatorConfig {
  type: 'json_schema' | 'custom' | 'llm_judge' | 'regex' | 'composite';
  config: Record<string, unknown>;
}

export interface ConvergenceConfig {
  maxIterations: number;
  strategy: 'iterative' | 'parallel' | 'cot';
  exitConditions?: ExitCondition[];
}
```

**Acceptance Criteria:**
- [ ] All core types defined
- [ ] JSDoc comments on public types
- [ ] Exported from package index

**Verification:**
```bash
cd packages/answer-contract && pnpm build
```

---

### Task 2.1.3: Create JSON Schema for contract validation

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/answer-contract/src/schema/contract.schema.json`
- `packages/answer-contract/src/schema/index.ts`

**Schema Requirements:**
- Validate contract structure
- Required fields: id, version, name, output, validators
- Enum for validator types
- Enum for convergence strategies

**Acceptance Criteria:**
- [ ] JSON Schema file created
- [ ] Schema validates sample contract
- [ ] Schema exported for runtime use

**Verification:**
```typescript
import { contractSchema } from '@forge/answer-contract';
// Should be valid JSON Schema
```

---

## Phase 2.2: Parser Implementation

### Task 2.2.1: Create YAML parser for contracts

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/answer-contract/src/parser/yaml-parser.ts`

**Implementation:**
```typescript
import yaml from 'yaml';
import { AnswerContract } from '../schema/types';

export function parseYamlContract(content: string): AnswerContract {
  const parsed = yaml.parse(content);
  // Validate structure
  // Return typed contract
}
```

**Acceptance Criteria:**
- [ ] Parses valid YAML to AnswerContract
- [ ] Throws descriptive error for invalid YAML
- [ ] Handles comments in YAML

**Verification:**
```typescript
const contract = parseYamlContract(`
id: test-v1
version: "1.0.0"
name: Test Contract
`);
```

---

### Task 2.2.2: Create JSON parser for contracts

**Time:** 3 minutes  
**Tokens:** ~2K  
**Files to CREATE:**
- `packages/answer-contract/src/parser/json-parser.ts`

**Implementation:**
```typescript
export function parseJsonContract(content: string): AnswerContract {
  const parsed = JSON.parse(content);
  // Validate structure
  // Return typed contract
}
```

**Acceptance Criteria:**
- [ ] Parses valid JSON to AnswerContract
- [ ] Throws descriptive error for invalid JSON
- [ ] Reuses validation logic from YAML parser

**Verification:**
```bash
pnpm test -- --grep "json parser"
```

---

### Task 2.2.3: Create unified ContractLoader class

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/answer-contract/src/parser/loader.ts`

**Implementation:**
```typescript
export class ContractLoader {
  async loadFromFile(path: string): Promise<AnswerContract>;
  async loadFromUrl(url: string): Promise<AnswerContract>;
  parse(content: string, format: 'yaml' | 'json'): AnswerContract;
  
  private detectFormat(content: string): 'yaml' | 'json';
  private validateContract(parsed: unknown): AnswerContract;
}
```

**Acceptance Criteria:**
- [ ] Auto-detects YAML vs JSON
- [ ] Loads from file path
- [ ] Validates after parsing
- [ ] Caches loaded contracts

**Verification:**
```typescript
const loader = new ContractLoader();
const contract = await loader.loadFromFile('./contracts/ecr.yaml');
```

---

## Phase 2.3: Validator System

### Task 2.3.1: Create Validator interface and registry

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/answer-contract/src/validators/types.ts`
- `packages/answer-contract/src/validators/registry.ts`

**Types:**
```typescript
export interface Validator {
  type: string;
  validate(output: unknown, config: ValidatorConfig): Promise<ValidationResult>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export class ValidatorRegistry {
  register(type: string, validator: Validator): void;
  get(type: string): Validator;
  validate(output: unknown, configs: ValidatorConfig[]): Promise<ValidationResult>;
}
```

**Acceptance Criteria:**
- [ ] Registry holds multiple validators
- [ ] validate() runs all configured validators
- [ ] Aggregates results from all validators

**Verification:**
```bash
pnpm test -- --grep "validator registry"
```

---

### Task 2.3.2: Implement JSON Schema validator

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/answer-contract/src/validators/json-schema.ts`

**Implementation:**
```typescript
import Ajv from 'ajv';

export class JsonSchemaValidator implements Validator {
  type = 'json_schema';
  private ajv = new Ajv({ allErrors: true });
  
  async validate(output: unknown, config: ValidatorConfig): Promise<ValidationResult> {
    const schema = config.config.schema;
    const validate = this.ajv.compile(schema);
    const valid = validate(output);
    
    return {
      valid,
      errors: valid ? [] : this.formatErrors(validate.errors),
      warnings: []
    };
  }
}
```

**Acceptance Criteria:**
- [ ] Validates against JSON Schema
- [ ] Returns all errors (not just first)
- [ ] Formats errors with path information

**Verification:**
```typescript
const validator = new JsonSchemaValidator();
const result = await validator.validate({ name: 123 }, {
  type: 'json_schema',
  config: { schema: { type: 'object', properties: { name: { type: 'string' } } } }
});
// result.valid === false
```

---

### Task 2.3.3: Implement LLM Judge validator

**Time:** 8 minutes  
**Tokens:** ~6K  
**Files to CREATE:**
- `packages/answer-contract/src/validators/llm-judge.ts`

**Implementation:**
```typescript
export class LLMJudgeValidator implements Validator {
  type = 'llm_judge';
  
  constructor(private llmProvider: LLMProvider) {}
  
  async validate(output: unknown, config: ValidatorConfig): Promise<ValidationResult> {
    const { criteria, threshold = 0.8 } = config.config;
    
    const prompt = this.buildJudgePrompt(output, criteria);
    const response = await this.llmProvider.complete(prompt);
    const score = this.parseScore(response);
    
    return {
      valid: score >= threshold,
      errors: score < threshold ? [{
        path: '',
        message: `LLM Judge score ${score} below threshold ${threshold}`,
        severity: 'error'
      }] : [],
      warnings: [],
      metadata: { score, criteria }
    };
  }
}
```

**Acceptance Criteria:**
- [ ] Calls LLM with judging prompt
- [ ] Parses score from response
- [ ] Compares against threshold
- [ ] Returns score in metadata

**Verification:**
```bash
pnpm test -- --grep "llm judge"
```

---

### Task 2.3.4: Implement Custom Function validator

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/answer-contract/src/validators/custom.ts`

**Implementation:**
```typescript
export class CustomValidator implements Validator {
  type = 'custom';
  
  async validate(output: unknown, config: ValidatorConfig): Promise<ValidationResult> {
    const { fn } = config.config;
    
    // fn is a function reference or inline code
    const validateFn = typeof fn === 'function' ? fn : new Function('output', fn);
    
    try {
      const result = await validateFn(output);
      return this.normalizeResult(result);
    } catch (error) {
      return {
        valid: false,
        errors: [{ path: '', message: error.message, severity: 'error' }],
        warnings: []
      };
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Executes custom validation function
- [ ] Handles sync and async functions
- [ ] Catches and reports errors
- [ ] Normalizes various return formats

**Verification:**
```bash
pnpm test -- --grep "custom validator"
```

---

## Phase 2.4: Templates

### Task 2.4.1: Create template registry and loader

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/answer-contract/src/templates/registry.ts`

**Implementation:**
```typescript
export class TemplateRegistry {
  private templates = new Map<string, AnswerContract>();
  private loader = new ContractLoader();
  
  async register(id: string, pathOrContract: string | AnswerContract): Promise<void>;
  get(id: string): AnswerContract | undefined;
  list(): string[];
  
  async loadBuiltIn(): Promise<void> {
    // Load templates from ./templates/*.yaml
  }
}
```

**Acceptance Criteria:**
- [ ] Register templates by ID
- [ ] Load from file path or object
- [ ] List available templates
- [ ] Load built-in templates on init

**Verification:**
```typescript
const registry = new TemplateRegistry();
await registry.loadBuiltIn();
const ecr = registry.get('ecr-v1');
```

---

### Task 2.4.2: Create ECR (Engineering Change Request) template

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/answer-contract/src/templates/ecr.yaml`

**Template Content:**
```yaml
id: ecr-v1
version: "1.0.0"
name: Engineering Change Request
description: Generates compliant ECR documents

output:
  type: object
  required:
    - ecrNumber
    - title
    - description
    - impactAnalysis
    - approvals
  properties:
    ecrNumber:
      type: string
      pattern: "^ECR-\\d{4}-\\d{3}$"
    title:
      type: string
      minLength: 10
      maxLength: 200
    description:
      type: string
      minLength: 50
    impactAnalysis:
      type: object
      required: [technical, schedule, cost]
    approvals:
      type: array
      minItems: 2

validators:
  - type: json_schema
  - type: llm_judge
    config:
      criteria: "Is this ECR professionally written and complete?"
      threshold: 0.85

convergence:
  maxIterations: 5
  strategy: iterative
```

**Acceptance Criteria:**
- [ ] Valid YAML contract
- [ ] Comprehensive output schema
- [ ] Multiple validators configured
- [ ] Loads via TemplateRegistry

**Verification:**
```typescript
const registry = new TemplateRegistry();
const ecr = registry.get('ecr-v1');
expect(ecr.validators.length).toBe(2);
```

---

### Task 2.4.3: Create React Component template

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/answer-contract/src/templates/react-component.yaml`

**Template Content:**
```yaml
id: react-component-v1
version: "1.0.0"
name: React Component
description: Generates React functional components

output:
  type: object
  required:
    - componentName
    - code
    - props
    - tests
  properties:
    componentName:
      type: string
      pattern: "^[A-Z][a-zA-Z0-9]*$"
    code:
      type: string
      minLength: 100
    props:
      type: array
      items:
        type: object
        required: [name, type]
    tests:
      type: string
      minLength: 50

validators:
  - type: json_schema
  - type: custom
    config:
      fn: |
        // Check TypeScript compiles
        return compileTypeScript(output.code);
  - type: llm_judge
    config:
      criteria: "Is this a well-structured React component following best practices?"
      threshold: 0.8

convergence:
  maxIterations: 5
  strategy: iterative
```

**Acceptance Criteria:**
- [ ] Valid YAML contract
- [ ] Includes code compilation validator
- [ ] Loads via TemplateRegistry

**Verification:**
```bash
pnpm test -- --grep "react component template"
```

---

## Epic 2 Completion Checklist

Before moving to Epic 3:

- [ ] All 12 tasks marked [x] in progress.md
- [ ] `pnpm build` succeeds for answer-contract
- [ ] `pnpm test` passes (>80% coverage)
- [ ] ContractLoader works with YAML and JSON
- [ ] All 4 validator types implemented
- [ ] 2+ templates in registry
- [ ] Types exported from @forge/answer-contract

**Then run:** `.forge/agent-bootstrap.sh next-epic`
