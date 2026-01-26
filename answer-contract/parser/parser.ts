/**
 * FORGE Answer Contract Parser
 * 
 * @epic 02 - Answer Contract
 * @task 2.1 - Parser Implementation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Parses Answer Contracts from YAML and JSON formats.
 *   Includes validation against the contract schema.
 */

import * as yaml from 'yaml';
import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { 
  AnswerContract, 
  ValidationError,
  ContractValidationResult,
} from './types';
import contractSchema from './contract.schema.json';

// ============================================
// TYPES
// ============================================

export interface ParseResult {
  success: boolean;
  contract?: AnswerContract;
  errors: ParseError[];
}

export interface ParseError {
  line?: number;
  column?: number;
  message: string;
  path?: string;
}

export interface ParseOptions {
  /** Validate against schema after parsing */
  validate?: boolean;
  
  /** Strict mode - fail on unknown properties */
  strict?: boolean;
  
  /** Substitute variables from provided context */
  variables?: Record<string, unknown>;
}

// ============================================
// AJV SETUP
// ============================================

const ajv = new Ajv({ 
  allErrors: true, 
  strict: false,
  allowUnionTypes: true,
});
addFormats(ajv);

let validateContract: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  if (!validateContract) {
    validateContract = ajv.compile(contractSchema);
  }
  return validateContract;
}

// ============================================
// YAML PARSER
// ============================================

/**
 * Parse a YAML string into an Answer Contract
 */
export function parseYamlContract(
  yamlString: string, 
  options: ParseOptions = {}
): ParseResult {
  const { validate = true, variables } = options;
  
  try {
    // Parse YAML
    const parsed = yaml.parse(yamlString, {
      prettyErrors: true,
      strict: false,
    });
    
    if (!parsed || typeof parsed !== 'object') {
      return {
        success: false,
        errors: [{ message: 'Invalid YAML: expected object at root' }],
      };
    }
    
    // Substitute variables if provided
    let contract = parsed as AnswerContract;
    if (variables) {
      contract = substituteVariables(contract, variables);
    }
    
    // Validate if requested
    if (validate) {
      const validationResult = validateContractSchema(contract);
      if (!validationResult.valid) {
        return {
          success: false,
          errors: validationResult.errors.map(e => ({
            message: e.message,
            path: e.path,
          })),
        };
      }
    }
    
    return {
      success: true,
      contract,
      errors: [],
    };
  } catch (error: any) {
    // Handle YAML parse errors with line info
    if (error.linePos) {
      return {
        success: false,
        errors: [{
          line: error.linePos[0]?.line,
          column: error.linePos[0]?.col,
          message: error.message,
        }],
      };
    }
    
    return {
      success: false,
      errors: [{ message: error.message || 'Unknown YAML parse error' }],
    };
  }
}

// ============================================
// JSON PARSER
// ============================================

/**
 * Parse a JSON string into an Answer Contract
 */
export function parseJsonContract(
  jsonString: string,
  options: ParseOptions = {}
): ParseResult {
  const { validate = true, variables } = options;
  
  try {
    const parsed = JSON.parse(jsonString);
    
    if (!parsed || typeof parsed !== 'object') {
      return {
        success: false,
        errors: [{ message: 'Invalid JSON: expected object at root' }],
      };
    }
    
    // Substitute variables if provided
    let contract = parsed as AnswerContract;
    if (variables) {
      contract = substituteVariables(contract, variables);
    }
    
    // Validate if requested
    if (validate) {
      const validationResult = validateContractSchema(contract);
      if (!validationResult.valid) {
        return {
          success: false,
          errors: validationResult.errors.map(e => ({
            message: e.message,
            path: e.path,
          })),
        };
      }
    }
    
    return {
      success: true,
      contract,
      errors: [],
    };
  } catch (error: any) {
    // Try to extract position from JSON parse error
    const posMatch = error.message?.match(/position (\d+)/);
    
    return {
      success: false,
      errors: [{
        message: error.message || 'Unknown JSON parse error',
        column: posMatch ? parseInt(posMatch[1], 10) : undefined,
      }],
    };
  }
}

// ============================================
// UNIVERSAL PARSER
// ============================================

/**
 * Parse a contract from either YAML or JSON (auto-detected)
 */
export function parseContract(
  content: string,
  format?: 'yaml' | 'json',
  options: ParseOptions = {}
): ParseResult {
  // Auto-detect format if not specified
  if (!format) {
    const trimmed = content.trim();
    format = trimmed.startsWith('{') ? 'json' : 'yaml';
  }
  
  return format === 'json' 
    ? parseJsonContract(content, options)
    : parseYamlContract(content, options);
}

// ============================================
// SCHEMA VALIDATION
// ============================================

export interface SchemaValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate a contract object against the JSON schema
 */
export function validateContractSchema(contract: unknown): SchemaValidationResult {
  const validate = getValidator();
  const valid = validate(contract);
  
  if (valid) {
    return { valid: true, errors: [] };
  }
  
  const errors: ValidationError[] = (validate.errors || []).map(
    (err: ErrorObject) => ({
      path: err.instancePath || '/',
      message: formatAjvError(err),
      code: err.keyword || 'unknown',
      severity: 'error' as const,
    })
  );
  
  return { valid: false, errors };
}

/**
 * Format AJV error into readable message
 */
function formatAjvError(error: ErrorObject): string {
  const path = error.instancePath || 'root';
  
  switch (error.keyword) {
    case 'required':
      return `${path} is missing required property '${error.params.missingProperty}'`;
    case 'type':
      return `${path} must be ${error.params.type}`;
    case 'enum':
      return `${path} must be one of: ${error.params.allowedValues?.join(', ')}`;
    case 'pattern':
      return `${path} must match pattern ${error.params.pattern}`;
    case 'minLength':
      return `${path} must be at least ${error.params.limit} characters`;
    case 'maxLength':
      return `${path} must be at most ${error.params.limit} characters`;
    case 'minimum':
      return `${path} must be >= ${error.params.limit}`;
    case 'maximum':
      return `${path} must be <= ${error.params.limit}`;
    case 'additionalProperties':
      return `${path} has unknown property '${error.params.additionalProperty}'`;
    default:
      return `${path}: ${error.message}`;
  }
}

// ============================================
// VARIABLE SUBSTITUTION
// ============================================

/**
 * Substitute {{variable}} placeholders in a contract
 */
export function substituteVariables(
  contract: AnswerContract,
  variables: Record<string, unknown>
): AnswerContract {
  const jsonStr = JSON.stringify(contract);
  
  const substituted = jsonStr.replace(
    /\{\{(\w+)\}\}/g,
    (match, varName) => {
      if (varName in variables) {
        const value = variables[varName];
        // Handle different types
        if (typeof value === 'string') {
          return value;
        }
        return JSON.stringify(value);
      }
      return match; // Keep original if no substitution
    }
  );
  
  return JSON.parse(substituted);
}

// ============================================
// SERIALIZATION
// ============================================

/**
 * Serialize a contract to YAML
 */
export function serializeToYaml(contract: AnswerContract): string {
  return yaml.stringify(contract, {
    indent: 2,
    lineWidth: 120,
  });
}

/**
 * Serialize a contract to JSON
 */
export function serializeToJson(contract: AnswerContract, pretty = true): string {
  return pretty 
    ? JSON.stringify(contract, null, 2)
    : JSON.stringify(contract);
}

// ============================================
// CONTRACT LOADER
// ============================================

export interface LoadOptions extends ParseOptions {
  /** Base path for resolving relative imports */
  basePath?: string;
}

/**
 * Contract Loader - loads contracts from various sources
 */
export class ContractLoader {
  private cache = new Map<string, AnswerContract>();
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  /**
   * Load contract from file path
   */
  async loadFile(filePath: string, options: LoadOptions = {}): Promise<ParseResult> {
    // Check cache first
    if (this.cache.has(filePath)) {
      return {
        success: true,
        contract: this.cache.get(filePath)!,
        errors: [],
      };
    }
    
    try {
      // In a real implementation, this would use fs.readFile
      // For now, we'll throw an error indicating file loading isn't available
      throw new Error(`File loading requires Node.js fs module. Use parseYamlContract or parseJsonContract directly.`);
    } catch (error: any) {
      return {
        success: false,
        errors: [{ message: error.message }],
      };
    }
  }

  /**
   * Load contract from string
   */
  load(content: string, format?: 'yaml' | 'json', options: LoadOptions = {}): ParseResult {
    const result = parseContract(content, format, options);
    
    if (result.success && result.contract) {
      // Cache by ID
      this.cache.set(result.contract.id, result.contract);
    }
    
    return result;
  }

  /**
   * Get cached contract by ID
   */
  get(id: string): AnswerContract | undefined {
    return this.cache.get(id);
  }

  /**
   * List cached contract IDs
   */
  listCached(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// ============================================
// EXPORTS
// ============================================

export * from './types';

export default {
  parseYamlContract,
  parseJsonContract,
  parseContract,
  validateContractSchema,
  substituteVariables,
  serializeToYaml,
  serializeToJson,
  ContractLoader,
};
