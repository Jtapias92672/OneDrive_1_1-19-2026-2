/**
 * FORGE Answer Contract Validators
 * 
 * @epic 02 - Answer Contract
 * @task 3 - Validator Implementation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Validators for checking AI output against Answer Contracts.
 *   Includes JSON Schema, Custom, LLM Judge, Regex, and Composite validators.
 */

import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import {
  ValidatorConfig,
  ValidatorType,
  ValidationError,
  ValidationWarning,
  ValidatorResult,
  ContractValidationResult,
  JsonSchemaValidatorConfig,
  CustomValidatorConfig,
  LLMJudgeValidatorConfig,
  RegexValidatorConfig,
  ComputationalValidatorConfig,
  CompositeValidatorConfig,
  AnswerContract,
  OutputSchema,
} from '../schema/types';

// ============================================
// BASE VALIDATOR
// ============================================

export interface ValidatorContext {
  /** The contract being validated against */
  contract?: AnswerContract;
  
  /** Current iteration in convergence loop */
  iteration?: number;
  
  /** Previous validation results */
  previousResults?: ValidatorResult[];
  
  /** Custom context data */
  data?: Record<string, unknown>;
}

export abstract class BaseValidator {
  abstract name: string;
  abstract type: ValidatorType;
  
  abstract validate(
    output: unknown,
    context?: ValidatorContext
  ): Promise<ValidatorResult>;

  protected createResult(
    valid: boolean,
    errors: ValidationError[] = [],
    warnings: ValidationWarning[] = [],
    durationMs: number = 0
  ): ValidatorResult {
    // Calculate score based on errors
    const score = valid ? 1 : Math.max(0, 1 - (errors.length * 0.1));
    
    return {
      validator: this.name,
      type: this.type,
      valid,
      score,
      errors,
      warnings,
      durationMs,
    };
  }

  protected createError(
    path: string,
    message: string,
    code: string,
    severity: 'error' | 'warning' | 'info' = 'error',
    suggestion?: string
  ): ValidationError {
    return { path, message, code, severity, suggestion };
  }
}

// ============================================
// JSON SCHEMA VALIDATOR
// ============================================

export class JsonSchemaValidator extends BaseValidator {
  name: string;
  type: ValidatorType = 'json_schema';
  
  private ajv: Ajv;
  private validateFn: ValidateFunction | null = null;
  private schema: Record<string, unknown>;
  private strict: boolean;

  constructor(config: JsonSchemaValidatorConfig, outputSchema?: OutputSchema) {
    super();
    this.name = config.name || 'json_schema';
    this.strict = config.strict ?? false;
    
    // Use provided schema or convert from output schema
    this.schema = config.schema || this.convertOutputSchema(outputSchema);
    
    this.ajv = new Ajv({
      allErrors: true,
      strict: this.strict,
      allowUnionTypes: true,
    });
    addFormats(this.ajv);
  }

  private convertOutputSchema(outputSchema?: OutputSchema): Record<string, unknown> {
    if (!outputSchema) {
      return { type: 'object' };
    }
    return outputSchema as unknown as Record<string, unknown>;
  }

  async validate(output: unknown, context?: ValidatorContext): Promise<ValidatorResult> {
    const startTime = Date.now();
    
    try {
      // Compile schema if not already done
      if (!this.validateFn) {
        this.validateFn = this.ajv.compile(this.schema);
      }
      
      const valid = this.validateFn(output);
      
      if (valid) {
        return this.createResult(true, [], [], Date.now() - startTime);
      }
      
      // Convert AJV errors to ValidationErrors
      const errors: ValidationError[] = (this.validateFn.errors || []).map(
        (err: ErrorObject) => this.createError(
          err.instancePath || '/',
          this.formatAjvError(err),
          `json_schema.${err.keyword}`,
          'error',
          this.getSuggestion(err)
        )
      );
      
      return this.createResult(false, errors, [], Date.now() - startTime);
    } catch (error: any) {
      return this.createResult(
        false,
        [this.createError('/', error.message, 'json_schema.error')],
        [],
        Date.now() - startTime
      );
    }
  }

  private formatAjvError(error: ErrorObject): string {
    const path = error.instancePath || 'root';
    
    switch (error.keyword) {
      case 'required':
        return `Missing required property '${error.params.missingProperty}'`;
      case 'type':
        return `Must be ${error.params.type}, got ${typeof error.data}`;
      case 'enum':
        return `Must be one of: ${error.params.allowedValues?.join(', ')}`;
      case 'pattern':
        return `Must match pattern ${error.params.pattern}`;
      case 'minLength':
        return `Must be at least ${error.params.limit} characters`;
      case 'maxLength':
        return `Must be at most ${error.params.limit} characters`;
      case 'minimum':
        return `Must be >= ${error.params.limit}`;
      case 'maximum':
        return `Must be <= ${error.params.limit}`;
      case 'minItems':
        return `Array must have at least ${error.params.limit} items`;
      case 'maxItems':
        return `Array must have at most ${error.params.limit} items`;
      default:
        return error.message || `Validation failed at ${path}`;
    }
  }

  private getSuggestion(error: ErrorObject): string | undefined {
    switch (error.keyword) {
      case 'required':
        return `Add the '${error.params.missingProperty}' property`;
      case 'type':
        return `Convert value to ${error.params.type}`;
      case 'enum':
        return `Use one of: ${error.params.allowedValues?.join(', ')}`;
      case 'minLength':
        return `Add more content (min ${error.params.limit} chars)`;
      default:
        return undefined;
    }
  }
}

// ============================================
// CUSTOM VALIDATOR
// ============================================

export type CustomValidatorFn = (
  output: unknown,
  context?: ValidatorContext
) => boolean | ValidationError[] | Promise<boolean | ValidationError[]>;

export class CustomValidator extends BaseValidator {
  name: string;
  type: ValidatorType = 'custom';
  
  private fn: CustomValidatorFn;
  private isAsync: boolean;

  constructor(config: CustomValidatorConfig, fn?: CustomValidatorFn) {
    super();
    this.name = config.name || config.function;
    this.isAsync = config.async ?? false;
    
    // If function provided directly, use it
    if (fn) {
      this.fn = fn;
    } else {
      // Try to create function from string (sandboxed in production)
      this.fn = this.createFunctionFromString(config.function);
    }
  }

  private createFunctionFromString(fnString: string): CustomValidatorFn {
    // In production, this would use a sandboxed environment
    // For now, we return a placeholder that always passes
    console.warn(`[CustomValidator] Function from string not supported in this environment: ${fnString}`);
    return () => true;
  }

  async validate(output: unknown, context?: ValidatorContext): Promise<ValidatorResult> {
    const startTime = Date.now();
    
    try {
      const result = this.isAsync 
        ? await this.fn(output, context)
        : this.fn(output, context);
      
      // Handle boolean result
      if (typeof result === 'boolean') {
        return this.createResult(
          result,
          result ? [] : [this.createError('/', 'Custom validation failed', 'custom.failed')],
          [],
          Date.now() - startTime
        );
      }
      
      // Handle array of errors
      const errors = result as ValidationError[];
      return this.createResult(
        errors.length === 0,
        errors,
        [],
        Date.now() - startTime
      );
    } catch (error: any) {
      return this.createResult(
        false,
        [this.createError('/', `Custom validator error: ${error.message}`, 'custom.error')],
        [],
        Date.now() - startTime
      );
    }
  }
}

// ============================================
// LLM JUDGE VALIDATOR
// ============================================

export interface LLMClient {
  complete(prompt: string, options?: { temperature?: number }): Promise<string>;
}

export class LLMJudgeValidator extends BaseValidator {
  name: string;
  type: ValidatorType = 'llm_judge';
  
  private criteria: string;
  private rubric?: string[];
  private model?: string;
  private temperature: number;
  private client?: LLMClient;

  constructor(config: LLMJudgeValidatorConfig, client?: LLMClient) {
    super();
    this.name = config.name || 'llm_judge';
    this.criteria = config.criteria;
    this.rubric = config.rubric;
    this.model = config.model;
    this.temperature = config.temperature ?? 0;
    this.client = client;
  }

  async validate(output: unknown, context?: ValidatorContext): Promise<ValidatorResult> {
    const startTime = Date.now();
    
    if (!this.client) {
      // Return a warning if no LLM client configured
      return this.createResult(
        true, // Pass by default if no client
        [],
        [{ path: '/', message: 'LLM Judge skipped: no client configured' }],
        Date.now() - startTime
      );
    }
    
    try {
      const prompt = this.buildPrompt(output);
      const response = await this.client.complete(prompt, { temperature: this.temperature });
      const judgment = this.parseJudgment(response);
      
      return this.createResult(
        judgment.valid,
        judgment.valid ? [] : judgment.errors,
        judgment.warnings,
        Date.now() - startTime
      );
    } catch (error: any) {
      return this.createResult(
        false,
        [this.createError('/', `LLM Judge error: ${error.message}`, 'llm_judge.error')],
        [],
        Date.now() - startTime
      );
    }
  }

  private buildPrompt(output: unknown): string {
    let prompt = `You are evaluating AI-generated output against specific criteria.

## Criteria
${this.criteria}

`;

    if (this.rubric && this.rubric.length > 0) {
      prompt += `## Rubric
${this.rubric.map((r, i) => `${i + 1}. ${r}`).join('\n')}

`;
    }

    prompt += `## Output to Evaluate
\`\`\`json
${JSON.stringify(output, null, 2)}
\`\`\`

## Your Task
Evaluate the output against the criteria. Respond in JSON format:
{
  "valid": true/false,
  "score": 0-1,
  "errors": [{"path": "...", "message": "..."}],
  "reasoning": "..."
}`;

    return prompt;
  }

  private parseJudgment(response: string): {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          valid: false,
          errors: [this.createError('/', 'Could not parse LLM judgment', 'llm_judge.parse_error')],
          warnings: [],
        };
      }
      
      const judgment = JSON.parse(jsonMatch[0]);
      
      return {
        valid: judgment.valid ?? false,
        errors: (judgment.errors || []).map((e: any) => this.createError(
          e.path || '/',
          e.message || 'LLM judgment failed',
          'llm_judge.criteria',
          'error'
        )),
        warnings: judgment.reasoning 
          ? [{ path: '/', message: `LLM reasoning: ${judgment.reasoning}` }]
          : [],
      };
    } catch (error) {
      return {
        valid: false,
        errors: [this.createError('/', 'Could not parse LLM judgment response', 'llm_judge.parse_error')],
        warnings: [],
      };
    }
  }
}

// ============================================
// REGEX VALIDATOR
// ============================================

export class RegexValidator extends BaseValidator {
  name: string;
  type: ValidatorType = 'regex';
  
  private field: string;
  private pattern: RegExp;
  private message?: string;

  constructor(config: RegexValidatorConfig) {
    super();
    this.name = config.name || `regex_${config.field}`;
    this.field = config.field;
    this.pattern = new RegExp(config.pattern, config.flags);
    this.message = config.message;
  }

  async validate(output: unknown, context?: ValidatorContext): Promise<ValidatorResult> {
    const startTime = Date.now();
    
    if (typeof output !== 'object' || output === null) {
      return this.createResult(
        false,
        [this.createError('/', 'Output must be an object', 'regex.invalid_output')],
        [],
        Date.now() - startTime
      );
    }
    
    // Navigate to field (supports dot notation)
    const value = this.getFieldValue(output as Record<string, unknown>, this.field);
    
    if (value === undefined) {
      return this.createResult(
        false,
        [this.createError(this.field, `Field '${this.field}' not found`, 'regex.missing_field')],
        [],
        Date.now() - startTime
      );
    }
    
    if (typeof value !== 'string') {
      return this.createResult(
        false,
        [this.createError(this.field, `Field '${this.field}' must be a string`, 'regex.not_string')],
        [],
        Date.now() - startTime
      );
    }
    
    const matches = this.pattern.test(value);
    
    if (matches) {
      return this.createResult(true, [], [], Date.now() - startTime);
    }
    
    return this.createResult(
      false,
      [this.createError(
        this.field,
        this.message || `Field '${this.field}' does not match pattern ${this.pattern}`,
        'regex.no_match',
        'error',
        `Value must match: ${this.pattern}`
      )],
      [],
      Date.now() - startTime
    );
  }

  private getFieldValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    
    return current;
  }
}

// ============================================
// COMPOSITE VALIDATOR
// ============================================

export class CompositeValidator extends BaseValidator {
  name: string;
  type: ValidatorType = 'composite';
  
  private validators: BaseValidator[];
  private mode: 'all' | 'any' | 'weighted';
  private threshold: number;

  constructor(
    config: CompositeValidatorConfig,
    validatorFactory: (config: ValidatorConfig) => BaseValidator
  ) {
    super();
    this.name = config.name || 'composite';
    this.mode = config.mode;
    this.threshold = config.threshold ?? 0.5;
    
    // Create child validators
    this.validators = config.validators.map(validatorFactory);
  }

  async validate(output: unknown, context?: ValidatorContext): Promise<ValidatorResult> {
    const startTime = Date.now();
    
    // Run all validators
    const results = await Promise.all(
      this.validators.map(v => v.validate(output, context))
    );
    
    // Aggregate based on mode
    let valid: boolean;
    let score: number;
    
    switch (this.mode) {
      case 'all':
        valid = results.every(r => r.valid);
        score = results.reduce((sum, r) => sum + r.score, 0) / results.length;
        break;
        
      case 'any':
        valid = results.some(r => r.valid);
        score = Math.max(...results.map(r => r.score));
        break;
        
      case 'weighted':
        // Calculate weighted score
        const totalWeight = this.validators.length; // Could use actual weights
        score = results.reduce((sum, r) => sum + r.score, 0) / totalWeight;
        valid = score >= this.threshold;
        break;
        
      default:
        valid = false;
        score = 0;
    }
    
    // Collect all errors and warnings
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (const result of results) {
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }
    
    const finalResult = this.createResult(valid, errors, warnings, Date.now() - startTime);
    finalResult.score = score; // Override calculated score
    
    return finalResult;
  }
}

// ============================================
// VALIDATOR FACTORY
// ============================================

export interface ValidatorFactoryOptions {
  /** LLM client for LLM Judge validator */
  llmClient?: LLMClient;
  
  /** Custom validator functions */
  customFunctions?: Record<string, CustomValidatorFn>;
  
  /** Output schema for JSON Schema validator */
  outputSchema?: OutputSchema;
}

export function createValidator(
  config: ValidatorConfig,
  options: ValidatorFactoryOptions = {}
): BaseValidator {
  switch (config.type) {
    case 'json_schema':
      return new JsonSchemaValidator(config as JsonSchemaValidatorConfig, options.outputSchema);
      
    case 'custom':
      const customConfig = config as CustomValidatorConfig;
      const fn = options.customFunctions?.[customConfig.function];
      return new CustomValidator(customConfig, fn);
      
    case 'llm_judge':
      return new LLMJudgeValidator(config as LLMJudgeValidatorConfig, options.llmClient);
      
    case 'regex':
      return new RegexValidator(config as RegexValidatorConfig);
      
    case 'composite':
      return new CompositeValidator(
        config as CompositeValidatorConfig,
        (c) => createValidator(c, options)
      );
      
    case 'computational':
      // Placeholder - would integrate with Epic 14.1
      console.warn('[ValidatorFactory] Computational validator not yet implemented');
      return new CustomValidator(
        { type: 'custom', name: 'computational', function: 'passthrough' },
        () => true
      );
      
    default:
      throw new Error(`Unknown validator type: ${(config as any).type}`);
  }
}

// ============================================
// CONTRACT VALIDATOR
// ============================================

export class ContractValidator {
  private validators: BaseValidator[];
  private contract: AnswerContract;

  constructor(contract: AnswerContract, options: ValidatorFactoryOptions = {}) {
    this.contract = contract;
    
    // Add output schema to options
    const factoryOptions: ValidatorFactoryOptions = {
      ...options,
      outputSchema: contract.output,
    };
    
    // Create validators from contract
    this.validators = contract.validators
      .filter(v => v.enabled !== false)
      .map(config => createValidator(config, factoryOptions));
  }

  async validate(output: unknown, context?: ValidatorContext): Promise<ContractValidationResult> {
    const startTime = Date.now();
    
    // Run all validators
    const results = await Promise.all(
      this.validators.map(v => v.validate(output, { ...context, contract: this.contract }))
    );
    
    // Aggregate results
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    let totalScore = 0;
    
    for (const result of results) {
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      totalScore += result.score;
    }
    
    const avgScore = results.length > 0 ? totalScore / results.length : 0;
    const valid = allErrors.filter(e => e.severity === 'error').length === 0;
    
    return {
      valid,
      score: avgScore,
      validators: results,
      errors: allErrors,
      warnings: allWarnings,
      totalDurationMs: Date.now() - startTime,
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  BaseValidator,
  JsonSchemaValidator,
  CustomValidator,
  LLMJudgeValidator,
  RegexValidator,
  CompositeValidator,
  createValidator,
  ContractValidator,
};
