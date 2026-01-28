/**
 * Express Generator Types
 * Epic 14: Backend Code Generation
 *
 * Follows ReactGenerator type patterns exactly.
 */

// ============================================================================
// Configuration Types
// ============================================================================

export type OrmFramework = 'prisma' | 'typeorm' | 'drizzle';
export type ApiStyle = 'rest' | 'graphql' | 'both';
export type AuthMethod = 'jwt' | 'session' | 'apikey' | 'none';
export type ValidationLibrary = 'zod' | 'joi' | 'class-validator' | 'yup';

export interface ExpressGeneratorConfig {
  // Core settings
  typescript: boolean;
  ormFramework: OrmFramework;
  apiStyle: ApiStyle;

  // Output control
  generateControllers: boolean;
  generateServices: boolean;
  generateRoutes: boolean;
  generateMiddleware: boolean;
  generateTests: boolean;
  generateDocs: boolean;

  // Patterns
  authMethod: AuthMethod;
  validationLibrary: ValidationLibrary;
  useTransactions: boolean;
  useSoftDelete: boolean;

  // Naming
  namingConvention: NamingConvention;

  // Formatting
  formatting: FormattingOptions;
}

export type NamingConvention =
  | 'PascalCase'
  | 'camelCase'
  | 'kebab-case'
  | 'snake_case';

export interface FormattingOptions {
  indentation: 'spaces' | 'tabs';
  indentSize: number;
  quotes: 'single' | 'double';
  trailingComma: 'none' | 'es5' | 'all';
  semicolons: boolean;
  printWidth: number;
}

// ============================================================================
// Input Data Model Types
// ============================================================================

export interface ParsedDataModel {
  version: string;
  metadata: DataModelMetadata;
  entities: Entity[];
  relationships: Relationship[];
  enums: EnumDefinition[];
}

export interface DataModelMetadata {
  name: string;
  description?: string;
  author?: string;
  createdAt: string;
}

export interface Entity {
  id: string;
  name: string; // e.g., "User", "Product", "Order"
  tableName?: string; // Override: "users", "products"
  description?: string;
  fields: EntityField[];
  indexes?: EntityIndex[];
  timestamps: boolean; // createdAt, updatedAt
  softDelete: boolean; // deletedAt
}

export interface EntityField {
  name: string; // e.g., "firstName", "email"
  columnName?: string; // Override: "first_name"
  type: FieldType;
  required: boolean;
  unique: boolean;
  default?: unknown;
  description?: string;

  // Validation
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: string[];

  // Relations
  relation?: RelationConfig;
}

export type FieldType =
  | 'string'
  | 'text'
  | 'int'
  | 'bigint'
  | 'float'
  | 'decimal'
  | 'boolean'
  | 'datetime'
  | 'date'
  | 'json'
  | 'uuid'
  | 'enum';

export interface RelationConfig {
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  target: string; // Target entity name
  inverseSide?: string; // Field name on other side
  cascade?: boolean;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface Relationship {
  id: string;
  name: string;
  type: RelationConfig['type'];
  source: string; // Source entity name
  target: string; // Target entity name
  sourceField: string;
  targetField: string;
}

export interface EnumDefinition {
  name: string;
  values: string[];
  description?: string;
}

export interface EntityIndex {
  name?: string;
  fields: string[];
  unique: boolean;
}

// ============================================================================
// Output Types
// ============================================================================

export interface GenerationResult {
  // Generated files
  files: GeneratedFile[];

  // Prisma schema (special output)
  prismaSchema: string;

  // Entry point files
  appFile: string;
  routesIndex: string;

  // Statistics
  stats: GenerationStats;

  // Issues
  warnings: GenerationWarning[];
  errors: GenerationError[];
}

export interface GeneratedFile {
  name: string; // e.g., "UserController"
  fileName: string; // e.g., "user.controller.ts"
  filePath: string; // e.g., "src/controllers/user.controller.ts"
  code: string; // Generated source code
  type: FileType;
  sourceEntityId?: string; // Traceability
  dependencies: string[]; // Import dependencies
}

export type FileType =
  | 'controller'
  | 'service'
  | 'route'
  | 'middleware'
  | 'model'
  | 'schema'
  | 'test'
  | 'config'
  | 'types';

export interface GenerationStats {
  totalFiles: number;
  controllers: number;
  services: number;
  routes: number;
  middleware: number;
  tests: number;
  linesOfCode: number;
  generationTimeMs: number;
}

export interface GenerationWarning {
  type: 'deprecation' | 'compatibility' | 'missing' | 'suggestion';
  message: string;
  entityId?: string;
  fieldName?: string;
}

export interface GenerationError {
  type: 'validation' | 'generation' | 'config';
  message: string;
  entityId?: string;
  fieldName?: string;
}

// ============================================================================
// Builder Context Types
// ============================================================================

export interface BuilderContext {
  config: ExpressGeneratorConfig;
  dataModel: ParsedDataModel;
  entityMap: Map<string, Entity>;
  generatedTypes: Map<string, string>;
}

export interface ControllerMethod {
  name: string; // e.g., "create", "findAll", "findOne"
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string; // e.g., "/:id", "/"
  parameters: MethodParameter[];
  returnType: string;
  description?: string;
}

export interface MethodParameter {
  name: string;
  source: 'params' | 'query' | 'body' | 'headers';
  type: string;
  required: boolean;
  validation?: string;
}

// ============================================================================
// Service Types
// ============================================================================

export interface ServiceMethod {
  name: string;
  parameters: { name: string; type: string }[];
  returnType: string;
  description?: string;
  usesTransaction?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================================================
// Middleware Types
// ============================================================================

export interface MiddlewareConfig {
  name: string;
  type: 'auth' | 'validation' | 'logging' | 'error' | 'rateLimit' | 'custom';
  options?: Record<string, unknown>;
}

// ============================================================================
// Route Types
// ============================================================================

export interface RouteDefinition {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  handler: string;
  middleware?: string[];
  description?: string;
}

export interface RouterConfig {
  basePath: string;
  routes: RouteDefinition[];
  middleware?: string[];
}
