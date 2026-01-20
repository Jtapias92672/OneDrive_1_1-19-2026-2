/**
 * FORGE Answer Contract Types
 * 
 * @epic 02 - Answer Contract
 * @task 1.1 - Type Definitions
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Core TypeScript types for the Answer Contract system.
 *   An Answer Contract defines what a "correct" output looks like,
 *   enabling FORGE's iterative convergence to quality standards.
 */

// ============================================
// CONTRACT METADATA
// ============================================

export interface ContractMetadata {
  /** Unique contract identifier */
  id: string;
  
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what this contract validates */
  description?: string;
  
  /** Contract author */
  author?: string;
  
  /** Tags for categorization */
  tags?: string[];
  
  /** Creation timestamp */
  createdAt?: string;
  
  /** Last update timestamp */
  updatedAt?: string;
}

// ============================================
// OUTPUT SCHEMA
// ============================================

export type SchemaType = 
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

export interface PropertySchema {
  type: SchemaType | SchemaType[];
  description?: string;
  
  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: 'email' | 'uri' | 'date' | 'date-time' | 'uuid';
  enum?: string[];
  
  // Number constraints
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  
  // Array constraints
  items?: PropertySchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  
  // Object constraints
  properties?: Record<string, PropertySchema>;
  required?: string[];
  additionalProperties?: boolean | PropertySchema;
  
  // Custom FORGE extensions
  sections?: string[];
  default?: unknown;
}

export interface OutputSchema extends PropertySchema {
  type: 'object';
  required: string[];
  properties: Record<string, PropertySchema>;
}

// ============================================
// VALIDATORS
// ============================================

export type ValidatorType = 
  | 'json_schema'
  | 'custom'
  | 'llm_judge'
  | 'regex'
  | 'computational'
  | 'composite';

export interface BaseValidatorConfig {
  type: ValidatorType;
  name?: string;
  enabled?: boolean;
  weight?: number;
}

export interface JsonSchemaValidatorConfig extends BaseValidatorConfig {
  type: 'json_schema';
  strict?: boolean;
  schema?: Record<string, unknown>;
}

export interface CustomValidatorConfig extends BaseValidatorConfig {
  type: 'custom';
  function: string;
  async?: boolean;
}

export interface LLMJudgeValidatorConfig extends BaseValidatorConfig {
  type: 'llm_judge';
  criteria: string;
  model?: string;
  temperature?: number;
  rubric?: string[];
}

export interface RegexValidatorConfig extends BaseValidatorConfig {
  type: 'regex';
  field: string;
  pattern: string;
  flags?: string;
  message?: string;
}

export interface ComputationalValidatorConfig extends BaseValidatorConfig {
  type: 'computational';
  tier?: 'L1' | 'L1.5' | 'L2';
  categories?: string[];
}

export interface CompositeValidatorConfig extends BaseValidatorConfig {
  type: 'composite';
  validators: ValidatorConfig[];
  mode: 'all' | 'any' | 'weighted';
  threshold?: number;
}

export type ValidatorConfig =
  | JsonSchemaValidatorConfig
  | CustomValidatorConfig
  | LLMJudgeValidatorConfig
  | RegexValidatorConfig
  | ComputationalValidatorConfig
  | CompositeValidatorConfig;

// ============================================
// STOPPING POLICY
// ============================================

export interface StoppingPolicy {
  /** Maximum iterations before giving up */
  maxIterations: number;
  
  /** Minimum score to consider valid (0-1) */
  minScore?: number;
  
  /** Target pass rate for all validators */
  targetPassRate?: number;
  
  /** Stop immediately on critical errors */
  failFastOnCritical?: boolean;
  
  /** Timeout in milliseconds */
  timeoutMs?: number;
  
  /** Token budget for convergence */
  tokenBudget?: number;
}

// ============================================
// CONVERGENCE CONFIG
// ============================================

export interface ConvergenceConfig {
  /** Strategy for selecting repairs */
  strategy: 'greedy' | 'prioritized' | 'random';
  
  /** Whether to batch repairs */
  batchRepairs?: boolean;
  
  /** Feedback format for reflection agent */
  feedbackFormat?: 'structured' | 'natural' | 'diff';
  
  /** Include previous attempts in context */
  includePreviousAttempts?: boolean;
  
  /** Maximum context tokens for feedback */
  maxFeedbackTokens?: number;
}

// ============================================
// FRONTEND SPEC (for full-stack contracts)
// ============================================

export type FrontendFramework = 'react' | 'vue' | 'angular' | 'svelte' | 'nextjs';
export type StylingFramework = 'tailwind' | 'css-modules' | 'styled-components' | 'sass';

export interface FrontendSpec {
  framework: FrontendFramework;
  styling?: StylingFramework;
  typescript?: boolean;
  components?: ComponentSpec[];
  pages?: PageSpec[];
  designTokens?: DesignTokens;
}

export interface ComponentSpec {
  name: string;
  type: 'atom' | 'molecule' | 'organism' | 'template';
  props?: Record<string, PropertySchema>;
  children?: boolean;
  accessibility?: AccessibilitySpec;
}

export interface PageSpec {
  path: string;
  name: string;
  components: string[];
  layout?: string;
  auth?: boolean;
  roles?: string[];
}

export interface DesignTokens {
  colors?: Record<string, string>;
  spacing?: Record<string, string>;
  typography?: Record<string, TypographyToken>;
  breakpoints?: Record<string, string>;
}

export interface TypographyToken {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: string;
}

export interface AccessibilitySpec {
  ariaLabel?: string;
  ariaDescribedBy?: string;
  role?: string;
  tabIndex?: number;
}

// ============================================
// BACKEND SPEC (for full-stack contracts)
// ============================================

export type BackendFramework = 'express' | 'fastify' | 'nestjs' | 'hono';
export type DatabaseType = 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';

export interface BackendSpec {
  framework: BackendFramework;
  language: 'typescript' | 'javascript';
  database?: DatabaseType;
  endpoints?: EndpointSpec[];
  dataModels?: DataModelSpec[];
  rbac?: RBACSpec;
  middleware?: MiddlewareSpec[];
}

export interface EndpointSpec {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  auth?: boolean;
  roles?: string[];
  rateLimit?: RateLimitSpec;
  request?: PropertySchema;
  response?: PropertySchema;
  errors?: ErrorSpec[];
}

export interface DataModelSpec {
  name: string;
  tableName?: string;
  fields: FieldSpec[];
  indexes?: IndexSpec[];
  relations?: RelationSpec[];
}

export interface FieldSpec {
  name: string;
  type: 'uuid' | 'string' | 'number' | 'boolean' | 'date' | 'json' | 'text';
  primaryKey?: boolean;
  required?: boolean;
  unique?: boolean;
  default?: unknown;
  references?: string;
}

export interface IndexSpec {
  name: string;
  fields: string[];
  unique?: boolean;
}

export interface RelationSpec {
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  target: string;
  foreignKey?: string;
}

export interface RBACSpec {
  roles: RoleSpec[];
  defaultRole?: string;
}

export interface RoleSpec {
  name: string;
  permissions: string[];
  inherits?: string[];
}

export interface MiddlewareSpec {
  name: string;
  order: number;
  config?: Record<string, unknown>;
}

export interface RateLimitSpec {
  windowMs: number;
  maxRequests: number;
}

export interface ErrorSpec {
  code: number;
  message: string;
  schema?: PropertySchema;
}

// ============================================
// ANSWER CONTRACT (MAIN TYPE)
// ============================================

export interface AnswerContract {
  /** Contract metadata */
  id: string;
  version: string;
  name: string;
  description?: string;
  
  /** Output schema - what the output should look like */
  output: OutputSchema;
  
  /** Validators to run against output */
  validators: ValidatorConfig[];
  
  /** When to stop iterating */
  stoppingPolicy: StoppingPolicy;
  
  /** How to converge to correct output */
  convergence?: ConvergenceConfig;
  
  /** Frontend spec (optional, for full-stack) */
  frontend?: FrontendSpec;
  
  /** Backend spec (optional, for full-stack) */
  backend?: BackendSpec;
  
  /** Variables that can be substituted */
  variables?: Record<string, unknown>;
  
  /** Contract metadata */
  metadata?: ContractMetadata;
}

// ============================================
// VALIDATION RESULTS
// ============================================

export interface ValidationError {
  /** JSON path to the error */
  path: string;
  
  /** Error message */
  message: string;
  
  /** Error code for categorization */
  code: string;
  
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  
  /** Suggested fix */
  suggestion?: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code?: string;
}

export interface ValidatorResult {
  /** Validator name */
  validator: string;
  
  /** Validator type */
  type: ValidatorType;
  
  /** Whether validation passed */
  valid: boolean;
  
  /** Score (0-1) */
  score: number;
  
  /** Errors found */
  errors: ValidationError[];
  
  /** Warnings found */
  warnings: ValidationWarning[];
  
  /** Execution time in ms */
  durationMs: number;
}

export interface ContractValidationResult {
  /** Overall validity */
  valid: boolean;
  
  /** Aggregate score (0-1) */
  score: number;
  
  /** Individual validator results */
  validators: ValidatorResult[];
  
  /** All errors */
  errors: ValidationError[];
  
  /** All warnings */
  warnings: ValidationWarning[];
  
  /** Total execution time */
  totalDurationMs: number;
}

// ============================================
// TEMPLATE INFO
// ============================================

export interface TemplateInfo {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  variables?: string[];
}

// ============================================
// EXPORTS
// ============================================

export default AnswerContract;
