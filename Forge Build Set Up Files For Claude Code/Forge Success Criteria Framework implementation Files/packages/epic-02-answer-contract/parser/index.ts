/**
 * FORGE Answer Contract Package
 * 
 * @epic 02 - Answer Contract
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   The Answer Contract system defines what "correct" output looks like
 *   for FORGE's iterative convergence to quality standards.
 *   
 *   Key concepts:
 *   - Contract: Defines output schema, validators, and stopping policy
 *   - Validators: Check output against schema, regex, LLM judge, etc.
 *   - Templates: Pre-built contracts for common use cases
 *   - Convergence: Iterative refinement until quality standards met
 */

// ============================================
// TYPES
// ============================================

export type {
  // Contract Metadata
  ContractMetadata,
  
  // Output Schema
  SchemaType,
  PropertySchema,
  OutputSchema,
  
  // Validators
  ValidatorType,
  BaseValidatorConfig,
  JsonSchemaValidatorConfig,
  CustomValidatorConfig,
  LLMJudgeValidatorConfig,
  RegexValidatorConfig,
  ComputationalValidatorConfig,
  CompositeValidatorConfig,
  ValidatorConfig,
  
  // Policies
  StoppingPolicy,
  ConvergenceConfig,
  
  // Frontend Spec
  FrontendFramework,
  StylingFramework,
  FrontendSpec,
  ComponentSpec,
  PageSpec,
  DesignTokens,
  TypographyToken,
  AccessibilitySpec,
  
  // Backend Spec
  BackendFramework,
  DatabaseType,
  BackendSpec,
  EndpointSpec,
  DataModelSpec,
  FieldSpec,
  IndexSpec,
  RelationSpec,
  RBACSpec,
  RoleSpec,
  MiddlewareSpec,
  RateLimitSpec,
  ErrorSpec,
  
  // Main Contract Type
  AnswerContract,
  
  // Validation Results
  ValidationError,
  ValidationWarning,
  ValidatorResult,
  ContractValidationResult,
  
  // Template Info
  TemplateInfo,
} from './schema/types';

// ============================================
// PARSER
// ============================================

export {
  // Parse functions
  parseYamlContract,
  parseJsonContract,
  parseContract,
  
  // Validation
  validateContractSchema,
  
  // Variable substitution
  substituteVariables,
  
  // Serialization
  serializeToYaml,
  serializeToJson,
  
  // Loader class
  ContractLoader,
  
  // Types
  type ParseResult,
  type ParseError,
  type ParseOptions,
  type LoadOptions,
  type SchemaValidationResult,
} from './parser/parser';

// ============================================
// VALIDATORS
// ============================================

export {
  // Base class
  BaseValidator,
  
  // Validator implementations
  JsonSchemaValidator,
  CustomValidator,
  LLMJudgeValidator,
  RegexValidator,
  CompositeValidator,
  
  // Factory
  createValidator,
  
  // Contract validator
  ContractValidator,
  
  // Types
  type ValidatorContext,
  type CustomValidatorFn,
  type LLMClient,
  type ValidatorFactoryOptions,
} from './validators/validators';

// ============================================
// TEMPLATES
// ============================================

export {
  // Registry class
  TemplateRegistry,
  
  // Singleton getter
  getTemplateRegistry,
} from './templates/registry';

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

import { parseYamlContract, parseJsonContract } from './parser/parser';
import { ContractValidator, ValidatorFactoryOptions } from './validators/validators';
import { getTemplateRegistry } from './templates/registry';
import { AnswerContract, ContractValidationResult } from './schema/types';

/**
 * Load and validate a contract from YAML
 */
export function loadContract(yaml: string): AnswerContract | null {
  const result = parseYamlContract(yaml);
  return result.success ? result.contract! : null;
}

/**
 * Validate output against a contract
 */
export async function validateOutput(
  output: unknown,
  contract: AnswerContract,
  options?: ValidatorFactoryOptions
): Promise<ContractValidationResult> {
  const validator = new ContractValidator(contract, options);
  return validator.validate(output);
}

/**
 * Get a template by ID
 */
export function getTemplate(id: string): AnswerContract | undefined {
  return getTemplateRegistry().get(id);
}

/**
 * List all available templates
 */
export function listTemplates(): string[] {
  return getTemplateRegistry().list();
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  // Parser
  parseYamlContract,
  parseJsonContract,
  parseContract: parseYamlContract, // Alias
  
  // Validators
  ContractValidator,
  createValidator: (await import('./validators/validators')).createValidator,
  
  // Templates
  getTemplateRegistry,
  getTemplate,
  listTemplates,
  
  // Convenience
  loadContract,
  validateOutput,
};
