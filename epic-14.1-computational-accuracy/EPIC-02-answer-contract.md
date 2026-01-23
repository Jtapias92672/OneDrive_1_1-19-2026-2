# Epic 02: Answer Contract

**Duration:** COMPLETE  
**Token Budget:** 50K tokens  
**Status:** ✅ 100% Complete  
**Dependencies:** None  
**Owner:** joe@arcfoundry.ai

---

## Governing Principle

**Success = (Probability of Being Right × Value of Being Right) ÷ Cost of Being Wrong**

The Answer Contract is the foundation that defines what "correct" looks like, enabling FORGE's iterative convergence to quality standards.

---

## Epic Goal

Build the Answer Contract system that defines output specifications, validators, and stopping policies for AI agent outputs.

---

## What Was Built

### 1. Contract Schema (`schema/`)

| File | Description |
|------|-------------|
| `types.ts` | Complete TypeScript types for contracts, validators, frontend/backend specs |
| `contract.schema.json` | JSON Schema for validating contract definitions |

**Key Types:**
- `AnswerContract` - Main contract type
- `OutputSchema` - JSON Schema-based output definition
- `ValidatorConfig` - All validator configurations
- `StoppingPolicy` - When to stop iterating
- `ConvergenceConfig` - How to converge to correct output
- `FrontendSpec` / `BackendSpec` - Full-stack specifications

### 2. Parser (`parser/`)

| File | Description |
|------|-------------|
| `parser.ts` | YAML/JSON parsing with schema validation |

**Functions:**
- `parseYamlContract(yaml)` → `ParseResult`
- `parseJsonContract(json)` → `ParseResult`
- `parseContract(content, format?)` → Auto-detect and parse
- `validateContractSchema(contract)` → Schema validation
- `substituteVariables(contract, vars)` → Template variables
- `serializeToYaml/Json(contract)` → Serialization
- `ContractLoader` class for file loading with caching

### 3. Validators (`validators/`)

| File | Description |
|------|-------------|
| `validators.ts` | All validator implementations |

**Validators:**
- `JsonSchemaValidator` - Validates against JSON Schema
- `CustomValidator` - Runs custom validation functions
- `LLMJudgeValidator` - Uses LLM to evaluate output quality
- `RegexValidator` - Pattern matching on fields
- `CompositeValidator` - Combines validators with all/any/weighted modes
- `ContractValidator` - Runs all validators for a contract

**Factory:**
- `createValidator(config, options)` → Creates validator from config

### 4. Templates (`templates/`)

| File | Description |
|------|-------------|
| `registry.ts` | Template registry with built-in templates |

**Built-in Templates:**
- `cmmc-dashboard-v1` - CMMC compliance tracking (defense)
- `ecr-contract-v1` - Engineering Change Request (defense)
- `crud-api-v1` - Standard CRUD REST API (development)
- `admin-dashboard-v1` - Admin dashboard interface (development)

**Registry Features:**
- Register custom templates
- Get/copy templates
- Search by category/tag
- Variable substitution

---

## File Structure

```
answer-contract/
├── index.ts                 # Main exports
├── schema/
│   ├── index.ts
│   ├── types.ts             # TypeScript types
│   └── contract.schema.json # JSON Schema
├── parser/
│   ├── index.ts
│   └── parser.ts            # YAML/JSON parser
├── validators/
│   ├── index.ts
│   └── validators.ts        # All validators
└── templates/
    ├── index.ts
    └── registry.ts          # Template registry
```

---

## Usage Examples

### Parse and Validate a Contract

```typescript
import { parseYamlContract, validateContractSchema } from '@forge/answer-contract';

const yaml = `
id: my-contract
version: "1.0.0"
name: My Contract
output:
  type: object
  required: [title]
  properties:
    title:
      type: string
      minLength: 10
validators:
  - type: json_schema
stoppingPolicy:
  maxIterations: 5
`;

const result = parseYamlContract(yaml);
if (result.success) {
  console.log('Contract loaded:', result.contract.name);
}
```

### Validate Output Against Contract

```typescript
import { ContractValidator, getTemplate } from '@forge/answer-contract';

const contract = getTemplate('cmmc-dashboard-v1');
const validator = new ContractValidator(contract);

const output = {
  domains: [{ id: 'AC', name: 'Access Control', level: 2, practices: ['AC.L1-001'] }],
  practices: [{ id: 'AC.L1-001', description: 'Limit access', status: 'implemented' }],
  assessmentStatus: { lastAssessment: '2026-01-01', nextAssessment: '2026-07-01', overallStatus: 'in_progress' },
  complianceScore: 75
};

const result = await validator.validate(output);
console.log('Valid:', result.valid, 'Score:', result.score);
```

### Use Template Registry

```typescript
import { getTemplateRegistry } from '@forge/answer-contract';

const registry = getTemplateRegistry();

// List all templates
console.log(registry.list()); // ['cmmc-dashboard-v1', 'ecr-contract-v1', ...]

// Get templates by category
const defenseTemplates = registry.listByCategory('defense');

// Search templates
const matches = registry.search('compliance');

// Get template with variables
const contract = registry.getWithVariables('my-template', {
  projectName: 'ACME Project',
  clientId: 'client-123'
});
```

---

## Completion Criteria

- [x] JSON Schema complete and valid
- [x] TypeScript types generated from schema
- [x] YAML and JSON parsers working
- [x] Schema validation with clear error messages
- [x] All 5 validator types implemented
- [x] Template registry functional
- [x] 4 built-in templates (CMMC, ECR, CRUD, Admin)
- [x] Variable substitution working

---

## Handoff to Epic 3 (FORGE C Core)

**What Epic 3 needs:**

```typescript
import { 
  parseYamlContract,
  validateContractSchema,
  ContractValidator,
  AnswerContract,
  getTemplateRegistry
} from '@forge/answer-contract';

// Load CMMC template for testing
const registry = getTemplateRegistry();
const contract = registry.get('cmmc-dashboard-v1');

// Validate generated output
const validator = new ContractValidator(contract);
const result = await validator.validate(generatedOutput);
```

**Key Exports:**
- `parseYamlContract` / `parseJsonContract` - Load contracts
- `ContractValidator` - Validate output
- `AnswerContract` - TypeScript type
- `getTemplateRegistry` - Access templates

---

## Integration with Other Epics

| Epic | Integration Point |
|------|-------------------|
| 03 - FORGE C Core | Uses contracts to validate generated backends |
| 04 - Convergence Engine | Uses stopping policy and validators |
| 08 - Evidence Packs | Records validation results for compliance |
| 14.1 - Computational | Computational validator integration |
