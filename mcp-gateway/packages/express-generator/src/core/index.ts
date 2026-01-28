/**
 * Express Generator Core
 * Epic 14: Backend Code Generation
 */

// Types
export type {
  // Configuration
  OrmFramework,
  ApiStyle,
  AuthMethod,
  ValidationLibrary,
  ExpressGeneratorConfig,
  NamingConvention,
  FormattingOptions,

  // Data Model
  ParsedDataModel,
  DataModelMetadata,
  Entity,
  EntityField,
  FieldType,
  RelationConfig,
  Relationship,
  EnumDefinition,
  EntityIndex,

  // Output
  GenerationResult,
  GeneratedFile,
  FileType,
  GenerationStats,
  GenerationWarning,
  GenerationError,

  // Builder Context
  BuilderContext,
  ControllerMethod,
  MethodParameter,

  // Service
  ServiceMethod,
  PaginationOptions,
  PaginatedResult,

  // Middleware
  MiddlewareConfig,

  // Routes
  RouteDefinition,
  RouterConfig,
} from './types';

// Config
export {
  DEFAULT_FORMATTING,
  DEFAULT_CONFIG,
  PRISMA_PRESET,
  TYPEORM_PRESET,
  MINIMAL_PRESET,
  FULL_PRESET,
  createConfig,
  applyPreset,
  validateConfig,
} from './config';
