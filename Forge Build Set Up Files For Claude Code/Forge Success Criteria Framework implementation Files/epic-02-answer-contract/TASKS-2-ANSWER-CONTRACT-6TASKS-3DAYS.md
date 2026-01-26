# Epic 2: Answer Contract System - Atomic Task Breakdown

**Token Budget:** 50K (LIMIT: 50K) ✅ SAFE  
**Tasks:** 6  
**Estimated Time:** 3 days  
**Dependencies:** Epic 1 (Foundation)

---

## Overview

Epic 2 implements the Answer Contract schema, parser, validators, and template system. Answer Contracts define the expected output format and validation criteria for FORGE convergence loops.

---

## Phase 2.1: Package Setup & Schema

### Task 2.1.1: Create answer-contract package structure

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/answer-contract/package.json` (update)
- `packages/answer-contract/src/index.ts` (update)
- `packages/answer-contract/src/schema/index.ts`
- `packages/answer-contract/src/parser/index.ts`
- `packages/answer-contract/src/validators/index.ts`
- `packages/answer-contract/src/templates/index.ts`

**Purpose:** Establish package structure for the Answer Contract system.

**Implementation:**

```json
// packages/answer-contract/package.json
{
  "name": "@forge/answer-contract",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest run",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@forge/core": "workspace:*",
    "ajv": "^8.12.0",
    "yaml": "^2.3.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  }
}
```

```typescript
// packages/answer-contract/src/index.ts
export * from './schema/index.js';
export * from './parser/index.js';
export * from './validators/index.js';
export * from './templates/index.js';
```

**Verification:**
```bash
cd packages/answer-contract && pnpm install && pnpm build
```

**Done When:** Package builds with all dependencies

---

### Task 2.1.2: Define core contract TypeScript types

**Time:** 5 minutes | **Tokens:** ~5K

**Files to CREATE:**
- `packages/answer-contract/src/schema/types.ts`

**Purpose:** Define the complete Answer Contract schema as TypeScript types with Zod validation.

**Implementation:**

```typescript
// packages/answer-contract/src/schema/types.ts
import { z } from 'zod';

// Output schema definitions
export const FileSpecSchema = z.object({
  path: z.string(),
  type: z.enum(['typescript', 'javascript', 'json', 'yaml', 'markdown', 'other']),
  required: z.boolean().default(true),
});

export const OutputSchemaSchema = z.object({
  type: z.enum(['object', 'array', 'string', 'code', 'files']),
  schema: z.record(z.unknown()).optional(),
  files: z.array(FileSpecSchema).optional(),
});

// Validator configuration
export const ValidatorConfigSchema = z.object({
  type: z.enum(['json_schema', 'typescript', 'custom', 'llm_judge', 'regex', 'composite']),
  name: z.string(),
  config: z.record(z.unknown()),
  weight: z.number().min(0).max(1).default(1),
  required: z.boolean().default(true),
});

// Exit conditions for convergence
export const ExitConditionsSchema = z.object({
  allValidatorsPassing: z.boolean().default(true),
  minScore: z.number().min(0).max(1).optional(),
  maxConsecutiveFailures: z.number().positive().default(3),
});

// Convergence configuration
export const ConvergenceConfigSchema = z.object({
  maxIterations: z.number().positive().default(10),
  strategy: z.enum(['iterative', 'parallel', 'chain_of_thought']).default('iterative'),
  exitConditions: ExitConditionsSchema,
});

// Context configuration
export const ContextConfigSchema = z.object({
  systemPrompt: z.string().optional(),
  examples: z.array(z.object({
    input: z.string(),
    output: z.unknown(),
  })).optional(),
  constraints: z.array(z.string()).optional(),
});

// Metadata
export const MetadataConfigSchema = z.object({
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// Complete Answer Contract schema
export const AnswerContractSchema = z.object({
  id: z.string().uuid(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  output: OutputSchemaSchema,
  validators: z.array(ValidatorConfigSchema),
  convergence: ConvergenceConfigSchema,
  context: ContextConfigSchema.optional(),
  metadata: MetadataConfigSchema.optional(),
});

// TypeScript types derived from Zod schemas
export type FileSpec = z.infer<typeof FileSpecSchema>;
export type OutputSchema = z.infer<typeof OutputSchemaSchema>;
export type ValidatorConfig = z.infer<typeof ValidatorConfigSchema>;
export type ExitConditions = z.infer<typeof ExitConditionsSchema>;
export type ConvergenceConfig = z.infer<typeof ConvergenceConfigSchema>;
export type ContextConfig = z.infer<typeof ContextConfigSchema>;
export type MetadataConfig = z.infer<typeof MetadataConfigSchema>;
export type AnswerContract = z.infer<typeof AnswerContractSchema>;
```

**Verification:**
```bash
cd packages/answer-contract && pnpm build
```

**Done When:** Types compile and Zod schema validates

---

### Task 2.1.3: Create JSON Schema for contracts

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/answer-contract/src/schema/contract.schema.json`
- `packages/answer-contract/src/schema/index.ts`

**Purpose:** Provide JSON Schema for external validation and documentation.

**Implementation:**

```json
// packages/answer-contract/src/schema/contract.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://forge.arcfoundry.com/schemas/answer-contract.json",
  "title": "Answer Contract",
  "description": "FORGE Answer Contract definition schema",
  "type": "object",
  "required": ["id", "version", "name", "output", "validators", "convergence"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    },
    "description": {
      "type": "string"
    },
    "output": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "enum": ["object", "array", "string", "code", "files"]
        },
        "schema": {
          "type": "object"
        },
        "files": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/FileSpec"
          }
        }
      }
    },
    "validators": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/ValidatorConfig"
      }
    },
    "convergence": {
      "$ref": "#/definitions/ConvergenceConfig"
    }
  },
  "definitions": {
    "FileSpec": {
      "type": "object",
      "required": ["path", "type"],
      "properties": {
        "path": { "type": "string" },
        "type": { "enum": ["typescript", "javascript", "json", "yaml", "markdown", "other"] },
        "required": { "type": "boolean", "default": true }
      }
    },
    "ValidatorConfig": {
      "type": "object",
      "required": ["type", "name", "config"],
      "properties": {
        "type": { "enum": ["json_schema", "typescript", "custom", "llm_judge", "regex", "composite"] },
        "name": { "type": "string" },
        "config": { "type": "object" },
        "weight": { "type": "number", "minimum": 0, "maximum": 1 },
        "required": { "type": "boolean" }
      }
    },
    "ConvergenceConfig": {
      "type": "object",
      "required": ["maxIterations", "strategy", "exitConditions"],
      "properties": {
        "maxIterations": { "type": "integer", "minimum": 1 },
        "strategy": { "enum": ["iterative", "parallel", "chain_of_thought"] },
        "exitConditions": {
          "type": "object",
          "properties": {
            "allValidatorsPassing": { "type": "boolean" },
            "minScore": { "type": "number", "minimum": 0, "maximum": 1 },
            "maxConsecutiveFailures": { "type": "integer", "minimum": 1 }
          }
        }
      }
    }
  }
}
```

```typescript
// packages/answer-contract/src/schema/index.ts
export * from './types.js';
import contractSchema from './contract.schema.json' assert { type: 'json' };
export { contractSchema };
```

**Verification:**
```bash
cd packages/answer-contract && pnpm build
```

**Done When:** JSON Schema is valid and exports correctly

---

### Task 2.1.4: Implement YAML/JSON contract parser

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/answer-contract/src/parser/parser.ts`
- `packages/answer-contract/src/parser/index.ts`

**Purpose:** Parse Answer Contracts from YAML or JSON format.

**Implementation:**

```typescript
// packages/answer-contract/src/parser/parser.ts
import { parse as parseYaml } from 'yaml';
import { ForgeResult, success, failure } from '@forge/core';
import { AnswerContract, AnswerContractSchema } from '../schema/types.js';

export type ContractFormat = 'yaml' | 'json' | 'auto';

export interface ParseOptions {
  format?: ContractFormat;
  strict?: boolean;
}

function detectFormat(content: string): ContractFormat {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }
  return 'yaml';
}

export function parseContract(
  content: string,
  options: ParseOptions = {}
): ForgeResult<AnswerContract> {
  const startTime = Date.now();
  const format = options.format === 'auto' || !options.format 
    ? detectFormat(content) 
    : options.format;

  try {
    let parsed: unknown;
    
    if (format === 'json') {
      parsed = JSON.parse(content);
    } else {
      parsed = parseYaml(content);
    }

    const result = AnswerContractSchema.safeParse(parsed);
    
    if (!result.success) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: 'Contract validation failed',
        details: { errors: result.error.flatten() },
      }, { duration: Date.now() - startTime });
    }

    return success(result.data, { duration: Date.now() - startTime });
  } catch (error) {
    return failure({
      code: 'PARSE_ERROR',
      message: `Failed to parse contract: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }, { duration: Date.now() - startTime });
  }
}

export async function parseContractFromFile(
  filePath: string
): Promise<ForgeResult<AnswerContract>> {
  const startTime = Date.now();
  
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    
    const format = filePath.endsWith('.json') ? 'json' : 'yaml';
    return parseContract(content, { format });
  } catch (error) {
    return failure({
      code: 'FILE_ERROR',
      message: `Failed to read contract file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }, { duration: Date.now() - startTime });
  }
}
```

```typescript
// packages/answer-contract/src/parser/index.ts
export * from './parser.js';
```

**Verification:**
```bash
cd packages/answer-contract && pnpm build && pnpm test
```

**Done When:** Parser handles both YAML and JSON formats

---

## Phase 2.2: Validators

### Task 2.2.1: Create base Validator interface

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/answer-contract/src/validators/base.ts`

**Purpose:** Define the common interface for all validators.

**Implementation:**

```typescript
// packages/answer-contract/src/validators/base.ts
import { ForgeResult } from '@forge/core';

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidatorContext {
  contract?: unknown;
  iteration?: number;
  previousResults?: ValidationResult[];
}

export interface Validator {
  name: string;
  type: string;
  validate(output: unknown, context?: ValidatorContext): Promise<ForgeResult<ValidationResult>>;
}

export abstract class BaseValidator implements Validator {
  abstract name: string;
  abstract type: string;
  
  abstract validate(
    output: unknown,
    context?: ValidatorContext
  ): Promise<ForgeResult<ValidationResult>>;

  protected createResult(
    valid: boolean,
    errors: ValidationError[] = [],
    warnings: ValidationWarning[] = []
  ): ValidationResult {
    const errorScore = errors.length > 0 ? 0 : 1;
    const warningPenalty = warnings.length * 0.1;
    const score = Math.max(0, errorScore - warningPenalty);
    
    return { valid, score, errors, warnings };
  }
}
```

**Done When:** Base validator interface compiles

---

### Task 2.2.2: Implement JSON Schema validator

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/answer-contract/src/validators/json-schema.ts`

**Purpose:** Validate output against JSON Schema definitions.

**Implementation:**

```typescript
// packages/answer-contract/src/validators/json-schema.ts
import Ajv from 'ajv';
import { ForgeResult, success, failure } from '@forge/core';
import { BaseValidator, ValidationResult, ValidatorContext, ValidationError } from './base.js';

export interface JsonSchemaConfig {
  schema: Record<string, unknown>;
  strict?: boolean;
}

export class JsonSchemaValidator extends BaseValidator {
  name: string;
  type = 'json_schema' as const;
  private ajv: Ajv;
  private validate: ReturnType<Ajv['compile']>;

  constructor(name: string, config: JsonSchemaConfig) {
    super();
    this.name = name;
    this.ajv = new Ajv({ allErrors: true, strict: config.strict ?? false });
    this.validate = this.ajv.compile(config.schema);
  }

  async validate(
    output: unknown,
    _context?: ValidatorContext
  ): Promise<ForgeResult<ValidationResult>> {
    const startTime = Date.now();

    try {
      const valid = this.validate(output);
      
      if (valid) {
        return success(this.createResult(true), { duration: Date.now() - startTime });
      }

      const errors: ValidationError[] = (this.validate.errors ?? []).map((err) => ({
        path: err.instancePath || '/',
        message: err.message ?? 'Validation failed',
        code: err.keyword,
      }));

      return success(this.createResult(false, errors), { duration: Date.now() - startTime });
    } catch (error) {
      return failure({
        code: 'VALIDATOR_ERROR',
        message: `JSON Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }, { duration: Date.now() - startTime });
    }
  }
}
```

**Done When:** JSON Schema validator passes tests

---

### Task 2.2.3: Implement TypeScript compiler validator

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/answer-contract/src/validators/typescript.ts`

**Purpose:** Validate TypeScript code compiles without errors.

**Implementation:**

```typescript
// packages/answer-contract/src/validators/typescript.ts
import { ForgeResult, success, failure } from '@forge/core';
import { BaseValidator, ValidationResult, ValidatorContext, ValidationError } from './base.js';

export interface TypeScriptConfig {
  strict?: boolean;
  target?: string;
  module?: string;
}

export class TypeScriptValidator extends BaseValidator {
  name: string;
  type = 'typescript' as const;
  private config: TypeScriptConfig;

  constructor(name: string, config: TypeScriptConfig = {}) {
    super();
    this.name = name;
    this.config = config;
  }

  async validate(
    output: unknown,
    _context?: ValidatorContext
  ): Promise<ForgeResult<ValidationResult>> {
    const startTime = Date.now();

    if (typeof output !== 'string') {
      return success(this.createResult(false, [{
        path: '/',
        message: 'Output must be a string containing TypeScript code',
        code: 'INVALID_TYPE',
      }]), { duration: Date.now() - startTime });
    }

    try {
      // Dynamic import to avoid bundling TypeScript
      const ts = await import('typescript');
      
      const compilerOptions: Record<string, unknown> = {
        noEmit: true,
        strict: this.config.strict ?? true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
      };

      const host = ts.createCompilerHost(compilerOptions as ts.CompilerOptions);
      const originalReadFile = host.readFile;
      host.readFile = (fileName) => {
        if (fileName === 'input.ts') {
          return output;
        }
        return originalReadFile(fileName);
      };

      const program = ts.createProgram(['input.ts'], compilerOptions as ts.CompilerOptions, host);
      const diagnostics = ts.getPreEmitDiagnostics(program);

      const errors: ValidationError[] = diagnostics
        .filter((d) => d.category === ts.DiagnosticCategory.Error)
        .map((d) => ({
          path: `line ${d.start ?? 0}`,
          message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
          code: `TS${d.code}`,
        }));

      return success(this.createResult(errors.length === 0, errors), {
        duration: Date.now() - startTime,
      });
    } catch (error) {
      return failure({
        code: 'COMPILER_ERROR',
        message: `TypeScript compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }, { duration: Date.now() - startTime });
    }
  }
}
```

**Done When:** TypeScript validator compiles and checks code

---

### Task 2.2.4: Implement regex validator

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/answer-contract/src/validators/regex.ts`

**Purpose:** Validate output matches required patterns and avoids forbidden patterns.

**Implementation:**

```typescript
// packages/answer-contract/src/validators/regex.ts
import { ForgeResult, success } from '@forge/core';
import { BaseValidator, ValidationResult, ValidatorContext, ValidationError } from './base.js';

export interface RegexRule {
  pattern: string;
  flags?: string;
  message: string;
}

export interface RegexConfig {
  required?: RegexRule[];
  forbidden?: RegexRule[];
}

export class RegexValidator extends BaseValidator {
  name: string;
  type = 'regex' as const;
  private config: RegexConfig;

  constructor(name: string, config: RegexConfig) {
    super();
    this.name = name;
    this.config = config;
  }

  async validate(
    output: unknown,
    _context?: ValidatorContext
  ): Promise<ForgeResult<ValidationResult>> {
    const startTime = Date.now();
    const text = typeof output === 'string' ? output : JSON.stringify(output);
    const errors: ValidationError[] = [];

    // Check required patterns
    for (const rule of this.config.required ?? []) {
      const regex = new RegExp(rule.pattern, rule.flags);
      if (!regex.test(text)) {
        errors.push({
          path: '/',
          message: rule.message,
          code: 'MISSING_PATTERN',
        });
      }
    }

    // Check forbidden patterns
    for (const rule of this.config.forbidden ?? []) {
      const regex = new RegExp(rule.pattern, rule.flags);
      if (regex.test(text)) {
        errors.push({
          path: '/',
          message: rule.message,
          code: 'FORBIDDEN_PATTERN',
        });
      }
    }

    return success(this.createResult(errors.length === 0, errors), {
      duration: Date.now() - startTime,
    });
  }
}
```

**Done When:** Regex validator handles patterns correctly

---

### Task 2.2.5: Implement LLM judge validator (skeleton)

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/answer-contract/src/validators/llm-judge.ts`

**Purpose:** Skeleton for LLM-based validation (full implementation in Epic 3).

**Implementation:**

```typescript
// packages/answer-contract/src/validators/llm-judge.ts
import { ForgeResult, success, failure } from '@forge/core';
import { BaseValidator, ValidationResult, ValidatorContext } from './base.js';

export interface LLMJudgeConfig {
  criteria: string[];
  rubric?: string;
  model?: string;
}

// Provider interface - will be implemented in Epic 3
export interface LLMProvider {
  complete(prompt: string): Promise<string>;
}

export class LLMJudgeValidator extends BaseValidator {
  name: string;
  type = 'llm_judge' as const;
  private config: LLMJudgeConfig;
  private provider?: LLMProvider;

  constructor(name: string, config: LLMJudgeConfig) {
    super();
    this.name = name;
    this.config = config;
  }

  setProvider(provider: LLMProvider): void {
    this.provider = provider;
  }

  async validate(
    output: unknown,
    _context?: ValidatorContext
  ): Promise<ForgeResult<ValidationResult>> {
    const startTime = Date.now();

    if (!this.provider) {
      return failure({
        code: 'NO_PROVIDER',
        message: 'LLM provider not configured. Call setProvider() first.',
      }, { duration: Date.now() - startTime });
    }

    try {
      const prompt = this.buildPrompt(output);
      const response = await this.provider.complete(prompt);
      const result = this.parseResponse(response);
      
      return success(result, { duration: Date.now() - startTime });
    } catch (error) {
      return failure({
        code: 'LLM_ERROR',
        message: `LLM judge failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }, { duration: Date.now() - startTime });
    }
  }

  private buildPrompt(output: unknown): string {
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
    const criteria = this.config.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n');
    
    return `You are an expert code reviewer. Evaluate the following output against these criteria:

${criteria}

${this.config.rubric ? `Rubric:\n${this.config.rubric}\n\n` : ''}
Output to evaluate:
\`\`\`
${outputStr}
\`\`\`

Respond with JSON: { "score": 0-1, "passed": boolean, "feedback": "string" }`;
  }

  private parseResponse(response: string): ValidationResult {
    try {
      const parsed = JSON.parse(response);
      return this.createResult(
        parsed.passed ?? parsed.score >= 0.8,
        parsed.passed ? [] : [{ path: '/', message: parsed.feedback, code: 'LLM_FEEDBACK' }]
      );
    } catch {
      return this.createResult(false, [{
        path: '/',
        message: 'Failed to parse LLM response',
        code: 'PARSE_ERROR',
      }]);
    }
  }
}
```

**Done When:** LLM Judge validator compiles (full implementation in Epic 3)

---

### Task 2.2.6: Create composite validator

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/answer-contract/src/validators/composite.ts`

**Purpose:** Combine multiple validators with configurable logic.

**Implementation:**

```typescript
// packages/answer-contract/src/validators/composite.ts
import { ForgeResult, success } from '@forge/core';
import { BaseValidator, ValidationResult, ValidatorContext, ValidationError, ValidationWarning, Validator } from './base.js';

export type CompositeMode = 'all' | 'any' | 'weighted';

export interface CompositeConfig {
  mode: CompositeMode;
  validators: Array<{ validator: Validator; weight?: number }>;
}

export class CompositeValidator extends BaseValidator {
  name: string;
  type = 'composite' as const;
  private config: CompositeConfig;

  constructor(name: string, config: CompositeConfig) {
    super();
    this.name = name;
    this.config = config;
  }

  async validate(
    output: unknown,
    context?: ValidatorContext
  ): Promise<ForgeResult<ValidationResult>> {
    const startTime = Date.now();
    const results: Array<{ result: ValidationResult; weight: number }> = [];

    for (const { validator, weight = 1 } of this.config.validators) {
      const result = await validator.validate(output, context);
      if (result.success) {
        results.push({ result: result.data, weight });
      }
    }

    const finalResult = this.combineResults(results);
    return success(finalResult, { duration: Date.now() - startTime });
  }

  private combineResults(
    results: Array<{ result: ValidationResult; weight: number }>
  ): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    
    for (const { result } of results) {
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    switch (this.config.mode) {
      case 'all': {
        const valid = results.every((r) => r.result.valid);
        const avgScore = results.reduce((sum, r) => sum + r.result.score, 0) / results.length;
        return { valid, score: avgScore, errors: allErrors, warnings: allWarnings };
      }
      
      case 'any': {
        const valid = results.some((r) => r.result.valid);
        const maxScore = Math.max(...results.map((r) => r.result.score));
        return { valid, score: maxScore, errors: allErrors, warnings: allWarnings };
      }
      
      case 'weighted': {
        const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
        const weightedScore = results.reduce(
          (sum, r) => sum + r.result.score * r.weight,
          0
        ) / totalWeight;
        const valid = weightedScore >= 0.8;
        return { valid, score: weightedScore, errors: allErrors, warnings: allWarnings };
      }
    }
  }
}
```

**Done When:** Composite validator combines results correctly

---

### Task 2.2.7: Create validator factory and registry

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/answer-contract/src/validators/factory.ts`
- `packages/answer-contract/src/validators/index.ts`

**Purpose:** Factory pattern for creating validators from configuration.

**Implementation:**

```typescript
// packages/answer-contract/src/validators/factory.ts
import { ValidatorConfig } from '../schema/types.js';
import { Validator } from './base.js';
import { JsonSchemaValidator } from './json-schema.js';
import { TypeScriptValidator } from './typescript.js';
import { RegexValidator } from './regex.js';
import { LLMJudgeValidator } from './llm-judge.js';
import { CompositeValidator } from './composite.js';

export class ValidatorFactory {
  private customValidators = new Map<string, new (name: string, config: unknown) => Validator>();

  registerCustomValidator(
    type: string,
    constructor: new (name: string, config: unknown) => Validator
  ): void {
    this.customValidators.set(type, constructor);
  }

  create(config: ValidatorConfig): Validator {
    switch (config.type) {
      case 'json_schema':
        return new JsonSchemaValidator(config.name, config.config as { schema: Record<string, unknown> });
      
      case 'typescript':
        return new TypeScriptValidator(config.name, config.config as { strict?: boolean });
      
      case 'regex':
        return new RegexValidator(config.name, config.config as { required?: unknown[]; forbidden?: unknown[] });
      
      case 'llm_judge':
        return new LLMJudgeValidator(config.name, config.config as { criteria: string[] });
      
      case 'composite':
        throw new Error('Use createComposite for composite validators');
      
      case 'custom': {
        const customType = (config.config as { type?: string }).type;
        const Constructor = customType ? this.customValidators.get(customType) : undefined;
        if (!Constructor) {
          throw new Error(`Unknown custom validator type: ${customType}`);
        }
        return new Constructor(config.name, config.config);
      }
      
      default:
        throw new Error(`Unknown validator type: ${config.type}`);
    }
  }

  createAll(configs: ValidatorConfig[]): Validator[] {
    return configs.map((config) => this.create(config));
  }

  createComposite(
    name: string,
    mode: 'all' | 'any' | 'weighted',
    configs: Array<{ config: ValidatorConfig; weight?: number }>
  ): CompositeValidator {
    const validators = configs.map(({ config, weight }) => ({
      validator: this.create(config),
      weight,
    }));
    return new CompositeValidator(name, { mode, validators });
  }
}

export const validatorFactory = new ValidatorFactory();
```

```typescript
// packages/answer-contract/src/validators/index.ts
export * from './base.js';
export * from './json-schema.js';
export * from './typescript.js';
export * from './regex.js';
export * from './llm-judge.js';
export * from './composite.js';
export * from './factory.js';
```

**Done When:** Factory creates all validator types

---

## Phase 2.3: Templates

### Task 2.3.1: Create template registry

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/answer-contract/src/templates/registry.ts`

**Purpose:** Registry for storing and retrieving Answer Contract templates.

**Implementation:**

```typescript
// packages/answer-contract/src/templates/registry.ts
import { ForgeResult, success, failure } from '@forge/core';
import { AnswerContract } from '../schema/types.js';
import { parseContract } from '../parser/parser.js';
import { randomUUID } from 'crypto';

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author?: string;
}

interface RegisteredTemplate {
  contract: AnswerContract;
  metadata: TemplateMetadata;
}

export class TemplateRegistry {
  private templates = new Map<string, RegisteredTemplate>();

  register(contract: AnswerContract, metadata: TemplateMetadata): void {
    this.templates.set(contract.id, { contract, metadata });
  }

  registerFromYaml(yaml: string, metadata: Omit<TemplateMetadata, 'id'>): ForgeResult<void> {
    const result = parseContract(yaml, { format: 'yaml' });
    
    if (!result.success) {
      return failure(result.error, result.metadata);
    }

    this.register(result.data, { ...metadata, id: result.data.id });
    return success(undefined, result.metadata);
  }

  get(id: string): AnswerContract | undefined {
    return this.templates.get(id)?.contract;
  }

  getMetadata(id: string): TemplateMetadata | undefined {
    return this.templates.get(id)?.metadata;
  }

  list(category?: string): TemplateMetadata[] {
    const all = Array.from(this.templates.values()).map((t) => t.metadata);
    return category ? all.filter((m) => m.category === category) : all;
  }

  search(query: string): TemplateMetadata[] {
    const lower = query.toLowerCase();
    return Array.from(this.templates.values())
      .filter((t) => 
        t.metadata.name.toLowerCase().includes(lower) ||
        t.metadata.description.toLowerCase().includes(lower) ||
        t.metadata.tags.some((tag) => tag.toLowerCase().includes(lower))
      )
      .map((t) => t.metadata);
  }

  clone(id: string): AnswerContract | undefined {
    const original = this.get(id);
    if (!original) return undefined;
    
    return {
      ...original,
      id: randomUUID(),
      version: '1.0.0',
      metadata: {
        ...original.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  remove(id: string): boolean {
    return this.templates.delete(id);
  }

  clear(): void {
    this.templates.clear();
  }
}

export const templateRegistry = new TemplateRegistry();
```

**Done When:** Template registry supports CRUD operations

---

### Task 2.3.2: Create built-in templates

**Time:** 5 minutes | **Tokens:** ~5K

**Files to CREATE:**
- `packages/answer-contract/src/templates/builtin/cmmc-dashboard.ts`
- `packages/answer-contract/src/templates/builtin/react-component.ts`
- `packages/answer-contract/src/templates/builtin/index.ts`

**Purpose:** Provide pre-built templates for common use cases.

**Implementation:**

```typescript
// packages/answer-contract/src/templates/builtin/cmmc-dashboard.ts
import { AnswerContract } from '../../schema/types.js';

export const cmmcDashboardTemplate: AnswerContract = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  version: '1.0.0',
  name: 'CMMC Compliance Dashboard',
  description: 'Full-stack code generation for CMMC compliance tracking dashboard',
  output: {
    type: 'files',
    files: [
      { path: 'src/components/Dashboard.tsx', type: 'typescript', required: true },
      { path: 'src/api/compliance.ts', type: 'typescript', required: true },
      { path: 'src/types/cmmc.ts', type: 'typescript', required: true },
      { path: 'prisma/schema.prisma', type: 'other', required: true },
    ],
  },
  validators: [
    {
      type: 'typescript',
      name: 'TypeScript Compilation',
      config: { strict: true },
      weight: 1,
      required: true,
    },
    {
      type: 'regex',
      name: 'Security Patterns',
      config: {
        required: [
          { pattern: 'sanitize|escape|validate', flags: 'i', message: 'Must include input sanitization' },
        ],
        forbidden: [
          { pattern: 'eval\\(|innerHTML\\s*=', flags: '', message: 'No eval() or innerHTML assignment' },
        ],
      },
      weight: 0.8,
      required: true,
    },
    {
      type: 'llm_judge',
      name: 'Code Quality Review',
      config: {
        criteria: [
          'Code follows TypeScript best practices',
          'Components are properly typed with Props interfaces',
          'API endpoints have proper error handling',
          'Database schema supports CMMC compliance tracking',
        ],
      },
      weight: 0.6,
      required: false,
    },
  ],
  convergence: {
    maxIterations: 10,
    strategy: 'iterative',
    exitConditions: {
      allValidatorsPassing: true,
      minScore: 0.9,
      maxConsecutiveFailures: 3,
    },
  },
  context: {
    systemPrompt: 'You are an expert full-stack developer specializing in compliance software.',
    constraints: [
      'Use React 18+ with TypeScript',
      'Use Prisma for database access',
      'Follow CMMC 2.0 compliance requirements',
      'Include proper error boundaries',
    ],
  },
  metadata: {
    author: 'ArcFoundry',
    tags: ['cmmc', 'compliance', 'dashboard', 'full-stack'],
    category: 'compliance',
    createdAt: '2026-01-16T00:00:00Z',
    updatedAt: '2026-01-16T00:00:00Z',
  },
};
```

```typescript
// packages/answer-contract/src/templates/builtin/react-component.ts
import { AnswerContract } from '../../schema/types.js';

export const reactComponentTemplate: AnswerContract = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  version: '1.0.0',
  name: 'React Component',
  description: 'Single React component with TypeScript and tests',
  output: {
    type: 'files',
    files: [
      { path: 'src/components/{{name}}.tsx', type: 'typescript', required: true },
      { path: 'src/components/{{name}}.test.tsx', type: 'typescript', required: true },
      { path: 'src/components/{{name}}.stories.tsx', type: 'typescript', required: false },
    ],
  },
  validators: [
    {
      type: 'typescript',
      name: 'TypeScript Compilation',
      config: { strict: true },
      weight: 1,
      required: true,
    },
    {
      type: 'regex',
      name: 'Component Patterns',
      config: {
        required: [
          { pattern: 'interface.*Props', flags: '', message: 'Must define Props interface' },
          { pattern: 'export (default |)function', flags: '', message: 'Must export component function' },
        ],
      },
      weight: 0.9,
      required: true,
    },
  ],
  convergence: {
    maxIterations: 5,
    strategy: 'iterative',
    exitConditions: {
      allValidatorsPassing: true,
      minScore: 0.95,
      maxConsecutiveFailures: 2,
    },
  },
  context: {
    systemPrompt: 'You are an expert React developer.',
    constraints: [
      'Use functional components with hooks',
      'Include proper TypeScript typing',
      'Follow accessibility best practices',
      'Include unit tests with React Testing Library',
    ],
  },
  metadata: {
    author: 'ArcFoundry',
    tags: ['react', 'component', 'typescript'],
    category: 'frontend',
    createdAt: '2026-01-16T00:00:00Z',
    updatedAt: '2026-01-16T00:00:00Z',
  },
};
```

```typescript
// packages/answer-contract/src/templates/builtin/index.ts
export * from './cmmc-dashboard.js';
export * from './react-component.js';
```

**Done When:** Built-in templates are defined

---

### Task 2.3.3: Register built-in templates and export

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE/UPDATE:**
- `packages/answer-contract/src/templates/index.ts`
- `packages/answer-contract/src/index.ts` (update)

**Purpose:** Auto-register templates and export all package components.

**Implementation:**

```typescript
// packages/answer-contract/src/templates/index.ts
export * from './registry.js';
export * from './builtin/index.js';

import { templateRegistry } from './registry.js';
import { cmmcDashboardTemplate, reactComponentTemplate } from './builtin/index.js';

// Auto-register built-in templates
templateRegistry.register(cmmcDashboardTemplate, {
  id: cmmcDashboardTemplate.id,
  name: cmmcDashboardTemplate.name,
  description: cmmcDashboardTemplate.description ?? '',
  category: cmmcDashboardTemplate.metadata?.category ?? 'general',
  tags: cmmcDashboardTemplate.metadata?.tags ?? [],
  author: cmmcDashboardTemplate.metadata?.author,
});

templateRegistry.register(reactComponentTemplate, {
  id: reactComponentTemplate.id,
  name: reactComponentTemplate.name,
  description: reactComponentTemplate.description ?? '',
  category: reactComponentTemplate.metadata?.category ?? 'general',
  tags: reactComponentTemplate.metadata?.tags ?? [],
  author: reactComponentTemplate.metadata?.author,
});
```

**Verification:**
```bash
cd packages/answer-contract && pnpm build
node -e "
import('@forge/answer-contract').then(m => {
  console.log('Templates:', m.templateRegistry.list());
})
"
```

**Done When:** All exports work from @forge/answer-contract

---

## Epic 2 Completion Checklist

Before moving to Epic 3:

- [ ] All 12 tasks marked [x] in progress.md
- [ ] `pnpm build` succeeds for answer-contract
- [ ] `pnpm test` passes
- [ ] parseContract works with YAML and JSON
- [ ] All 5 validator types implemented (json_schema, typescript, regex, llm_judge, composite)
- [ ] 2+ templates in registry
- [ ] Types exported from @forge/answer-contract

**Commit:** `git commit -m "Epic 2: Answer Contract System complete"`

**Next:** Epic 3 - FORGE C Core Orchestrator
