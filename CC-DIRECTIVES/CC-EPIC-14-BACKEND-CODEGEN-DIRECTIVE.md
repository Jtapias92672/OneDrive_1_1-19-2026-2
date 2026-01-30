# CC-EPIC-14-BACKEND-CODEGEN-DIRECTIVE

**Epic:** 14 - Backend Code Generation
**Confidence Level:** 97%+
**Estimated Effort:** 160 hours (4 weeks)
**Priority:** CRITICAL PATH

---

## EXECUTIVE SUMMARY

Implement a complete backend code generation system following the EXACT architecture patterns established by the React Generator. This epic creates Express.js REST APIs, Prisma ORM schemas, and business logic from data models.

---

## PATTERN ALIGNMENT VERIFICATION

### ✅ Patterns Verified Against React Generator

| Pattern | Source File | Confidence |
|---------|-------------|------------|
| Three-layer orchestration | `generator.ts:1-50` | 100% |
| No template engines | `component-builder.ts` | 100% |
| Config with defaults | `types.ts:ReactGeneratorConfig` | 100% |
| NameUtils case conversion | `name-utils.ts` | 100% |
| CodeFormatter normalization | `code-formatter.ts` | 100% |
| Direct string building | `generator.ts:buildComponentCode` | 100% |
| GenerationResult structure | `types.ts:GenerationResult` | 100% |
| Statistics collection | `generator.ts:calculateStats` | 100% |

---

## ARCHITECTURE OVERVIEW

```
ExpressGenerator (Main Orchestrator)
├── PrismaSchemaBuilder (Schema Generation)
├── ControllerBuilder (Express Controllers)
├── RouteBuilder (Route Definitions)
├── ServiceBuilder (Business Logic Layer)
├── MiddlewareBuilder (Auth, Validation, etc.)
├── NameUtils (Identifier Transformation)
└── CodeFormatter (Output Normalization)
```

---

## FILE STRUCTURE (EXACT)

```
packages/express-generator/
├── package.json
├── tsconfig.json
├── jest.config.js
├── src/
│   ├── index.ts                      # Public exports
│   ├── core/
│   │   ├── generator.ts              # Main orchestrator (400 lines)
│   │   ├── types.ts                  # All type definitions (300 lines)
│   │   └── config.ts                 # Presets and defaults (100 lines)
│   ├── builders/
│   │   ├── prisma-schema-builder.ts  # Prisma schema gen (350 lines)
│   │   ├── controller-builder.ts     # Express controllers (400 lines)
│   │   ├── route-builder.ts          # Route definitions (250 lines)
│   │   ├── service-builder.ts        # Service layer (350 lines)
│   │   └── middleware-builder.ts     # Middleware gen (200 lines)
│   ├── utils/
│   │   ├── name-utils.ts             # Case conversions (150 lines)
│   │   └── code-formatter.ts         # Code formatting (200 lines)
│   └── templates/
│       ├── app-template.ts           # Express app setup (100 lines)
│       └── test-template.ts          # Test generation (150 lines)
└── __tests__/
    ├── generator.test.ts             # Integration tests (500 lines)
    ├── prisma-builder.test.ts        # Schema tests (300 lines)
    ├── controller-builder.test.ts    # Controller tests (400 lines)
    └── fixtures/
        └── sample-data-model.ts      # Test fixtures (100 lines)
```

---

## PHASE 1: TYPE DEFINITIONS (8 hours)

### File: `src/core/types.ts`

```typescript
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

export type NamingConvention = 'PascalCase' | 'camelCase' | 'kebab-case' | 'snake_case';

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
  name: string;                    // e.g., "User", "Product", "Order"
  tableName?: string;              // Override: "users", "products"
  description?: string;
  fields: EntityField[];
  indexes?: EntityIndex[];
  timestamps: boolean;             // createdAt, updatedAt
  softDelete: boolean;             // deletedAt
}

export interface EntityField {
  name: string;                    // e.g., "firstName", "email"
  columnName?: string;             // Override: "first_name"
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
  target: string;                  // Target entity name
  inverseSide?: string;            // Field name on other side
  cascade?: boolean;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface Relationship {
  id: string;
  name: string;
  type: RelationConfig['type'];
  source: string;                  // Source entity name
  target: string;                  // Target entity name
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
  name: string;                    // e.g., "UserController"
  fileName: string;                // e.g., "user.controller.ts"
  filePath: string;                // e.g., "src/controllers/user.controller.ts"
  code: string;                    // Generated source code
  type: FileType;
  sourceEntityId?: string;         // Traceability
  dependencies: string[];          // Import dependencies
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
  name: string;                    // e.g., "create", "findAll", "findOne"
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;                    // e.g., "/:id", "/"
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
```

### File: `src/core/config.ts`

```typescript
/**
 * Express Generator Configuration
 * Epic 14: Backend Code Generation
 */

import { ExpressGeneratorConfig, FormattingOptions } from './types';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_FORMATTING: FormattingOptions = {
  indentation: 'spaces',
  indentSize: 2,
  quotes: 'single',
  trailingComma: 'es5',
  semicolons: true,
  printWidth: 100,
};

export const DEFAULT_CONFIG: ExpressGeneratorConfig = {
  typescript: true,
  ormFramework: 'prisma',
  apiStyle: 'rest',

  generateControllers: true,
  generateServices: true,
  generateRoutes: true,
  generateMiddleware: true,
  generateTests: false,
  generateDocs: false,

  authMethod: 'jwt',
  validationLibrary: 'zod',
  useTransactions: true,
  useSoftDelete: true,

  namingConvention: 'camelCase',
  formatting: DEFAULT_FORMATTING,
};

// ============================================================================
// Preset Configurations
// ============================================================================

export const PRISMA_PRESET: Partial<ExpressGeneratorConfig> = {
  ormFramework: 'prisma',
  typescript: true,
  generateControllers: true,
  generateServices: true,
  generateRoutes: true,
  validationLibrary: 'zod',
};

export const TYPEORM_PRESET: Partial<ExpressGeneratorConfig> = {
  ormFramework: 'typeorm',
  typescript: true,
  generateControllers: true,
  generateServices: true,
  generateRoutes: true,
  validationLibrary: 'class-validator',
};

export const MINIMAL_PRESET: Partial<ExpressGeneratorConfig> = {
  ormFramework: 'prisma',
  typescript: true,
  generateControllers: true,
  generateServices: false,
  generateRoutes: true,
  generateMiddleware: false,
  generateTests: false,
  authMethod: 'none',
};

export const FULL_PRESET: Partial<ExpressGeneratorConfig> = {
  ormFramework: 'prisma',
  typescript: true,
  generateControllers: true,
  generateServices: true,
  generateRoutes: true,
  generateMiddleware: true,
  generateTests: true,
  generateDocs: true,
  authMethod: 'jwt',
  useTransactions: true,
  useSoftDelete: true,
};
```

### Verification Checklist - Phase 1
- [ ] Types follow React Generator patterns exactly
- [ ] Config has defaults and presets
- [ ] `ParsedDataModel` mirrors `ParsedDesign` structure
- [ ] `GenerationResult` matches React Generator output
- [ ] All field types support validation rules

---

## PHASE 2: UTILITIES (12 hours)

### File: `src/utils/name-utils.ts`

```typescript
/**
 * Name Utilities
 * Epic 14: Backend Code Generation
 *
 * Matches packages/react-generator/src/utils/name-utils.ts pattern.
 */

import { NamingConvention } from '../core/types';

export class NameUtils {
  private convention: NamingConvention;
  private usedNames = new Set<string>();

  constructor(convention: NamingConvention = 'camelCase') {
    this.convention = convention;
  }

  // --------------------------------------------------------------------------
  // Entity/Model Names (PascalCase)
  // --------------------------------------------------------------------------

  toEntityName(name: string): string {
    const cleaned = this.cleanName(name);
    let entityName = this.toPascalCase(cleaned);

    // Ensure starts with letter
    if (!/^[A-Z]/.test(entityName)) {
      entityName = 'Entity' + entityName;
    }

    return this.handleReservedWords(entityName, 'Model');
  }

  // --------------------------------------------------------------------------
  // Table Names (snake_case plural)
  // --------------------------------------------------------------------------

  toTableName(entityName: string): string {
    const snake = this.toSnakeCase(entityName);
    return this.pluralize(snake);
  }

  // --------------------------------------------------------------------------
  // Column Names (snake_case)
  // --------------------------------------------------------------------------

  toColumnName(fieldName: string): string {
    return this.toSnakeCase(fieldName);
  }

  // --------------------------------------------------------------------------
  // Controller Names (PascalCase + Controller)
  // --------------------------------------------------------------------------

  toControllerName(entityName: string): string {
    const pascal = this.toPascalCase(entityName);
    return `${pascal}Controller`;
  }

  toControllerFileName(entityName: string): string {
    const kebab = this.toKebabCase(entityName);
    return `${kebab}.controller`;
  }

  // --------------------------------------------------------------------------
  // Service Names (PascalCase + Service)
  // --------------------------------------------------------------------------

  toServiceName(entityName: string): string {
    const pascal = this.toPascalCase(entityName);
    return `${pascal}Service`;
  }

  toServiceFileName(entityName: string): string {
    const kebab = this.toKebabCase(entityName);
    return `${kebab}.service`;
  }

  // --------------------------------------------------------------------------
  // Route Names (kebab-case plural)
  // --------------------------------------------------------------------------

  toRoutePath(entityName: string): string {
    const kebab = this.toKebabCase(entityName);
    return `/${this.pluralize(kebab)}`;
  }

  // --------------------------------------------------------------------------
  // Variable/Method Names (camelCase)
  // --------------------------------------------------------------------------

  toVariableName(name: string): string {
    const cleaned = this.cleanName(name);
    let varName = this.toCamelCase(cleaned);
    return this.handleReservedWords(varName, 'Value');
  }

  toMethodName(action: string, entityName: string): string {
    const camel = this.toCamelCase(entityName);
    return `${action}${this.toPascalCase(entityName)}`;
  }

  // --------------------------------------------------------------------------
  // Case Conversions
  // --------------------------------------------------------------------------

  toPascalCase(str: string): string {
    return str
      .split(/[\s\-_]+/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s\-]+/g, '_')
      .toLowerCase();
  }

  toConstantCase(str: string): string {
    return this.toSnakeCase(str).toUpperCase();
  }

  // --------------------------------------------------------------------------
  // Pluralization (simple rules)
  // --------------------------------------------------------------------------

  pluralize(word: string): string {
    const lowerWord = word.toLowerCase();

    // Irregular plurals
    const irregulars: Record<string, string> = {
      person: 'people',
      child: 'children',
      man: 'men',
      woman: 'women',
      tooth: 'teeth',
      foot: 'feet',
      mouse: 'mice',
      goose: 'geese',
    };

    if (irregulars[lowerWord]) {
      return irregulars[lowerWord];
    }

    // Words ending in s, x, z, ch, sh → add 'es'
    if (/[sxz]$/.test(word) || /[cs]h$/.test(word)) {
      return word + 'es';
    }

    // Words ending in consonant + y → change y to ies
    if (/[^aeiou]y$/.test(word)) {
      return word.slice(0, -1) + 'ies';
    }

    // Words ending in f/fe → change to ves
    if (/fe?$/.test(word)) {
      return word.replace(/fe?$/, 'ves');
    }

    // Default: add 's'
    return word + 's';
  }

  singularize(word: string): string {
    const lowerWord = word.toLowerCase();

    // Irregular singulars
    const irregulars: Record<string, string> = {
      people: 'person',
      children: 'child',
      men: 'man',
      women: 'woman',
      teeth: 'tooth',
      feet: 'foot',
      mice: 'mouse',
      geese: 'goose',
    };

    if (irregulars[lowerWord]) {
      return irregulars[lowerWord];
    }

    // Words ending in 'ies' → change to 'y'
    if (/ies$/.test(word)) {
      return word.slice(0, -3) + 'y';
    }

    // Words ending in 'ves' → change to 'f' or 'fe'
    if (/ves$/.test(word)) {
      return word.slice(0, -3) + 'f';
    }

    // Words ending in 'es' → remove 'es'
    if (/[sxz]es$/.test(word) || /[cs]hes$/.test(word)) {
      return word.slice(0, -2);
    }

    // Default: remove 's'
    if (word.endsWith('s')) {
      return word.slice(0, -1);
    }

    return word;
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private cleanName(name: string): string {
    return name
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private handleReservedWords(name: string, suffix: string): string {
    const reserved = [
      // JavaScript reserved
      'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
      'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
      'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
      'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
      'import', 'super', 'implements', 'interface', 'let', 'package', 'private',
      'protected', 'public', 'static', 'yield',
      // Node.js globals
      'process', 'require', 'module', 'exports', 'console', 'global',
      // Express/Prisma keywords
      'Request', 'Response', 'Router', 'PrismaClient', 'Prisma',
    ];

    const lowerName = name.toLowerCase();
    if (reserved.map(r => r.toLowerCase()).includes(lowerName)) {
      return `${name}${suffix}`;
    }

    return name;
  }

  ensureUnique(name: string): string {
    if (!this.usedNames.has(name)) {
      this.usedNames.add(name);
      return name;
    }

    let counter = 2;
    while (this.usedNames.has(`${name}${counter}`)) {
      counter++;
    }

    const uniqueName = `${name}${counter}`;
    this.usedNames.add(uniqueName);
    return uniqueName;
  }

  reset(): void {
    this.usedNames.clear();
  }
}
```

### File: `src/utils/code-formatter.ts`

```typescript
/**
 * Code Formatter
 * Epic 14: Backend Code Generation
 *
 * Matches packages/react-generator/src/utils/code-formatter.ts pattern.
 */

import { FormattingOptions } from '../core/types';
import { DEFAULT_FORMATTING } from '../core/config';

export class CodeFormatter {
  private options: FormattingOptions;

  constructor(options: Partial<FormattingOptions> = {}) {
    this.options = { ...DEFAULT_FORMATTING, ...options };
  }

  format(code: string): string {
    let formatted = code;

    formatted = this.normalizeLineEndings(formatted);
    formatted = this.fixIndentation(formatted);
    formatted = this.fixQuotes(formatted);
    formatted = this.fixSemicolons(formatted);
    formatted = this.fixTrailingCommas(formatted);
    formatted = this.trimTrailingWhitespace(formatted);
    formatted = this.ensureFinalNewline(formatted);

    return formatted;
  }

  // --------------------------------------------------------------------------
  // Indentation Helpers
  // --------------------------------------------------------------------------

  indent(code: string, level: number): string {
    const indentStr = this.getIndent().repeat(level);
    return code
      .split('\n')
      .map(line => (line.trim() ? indentStr + line : line))
      .join('\n');
  }

  getIndent(): string {
    return this.options.indentation === 'tabs'
      ? '\t'
      : ' '.repeat(this.options.indentSize);
  }

  // --------------------------------------------------------------------------
  // Code Block Builders
  // --------------------------------------------------------------------------

  buildImports(imports: ImportStatement[]): string {
    return imports
      .map(imp => {
        const parts: string[] = [];

        if (imp.default) {
          parts.push(imp.default);
        }

        if (imp.named && imp.named.length > 0) {
          const namedStr = `{ ${imp.named.join(', ')} }`;
          parts.push(namedStr);
        }

        if (imp.namespace) {
          parts.push(`* as ${imp.namespace}`);
        }

        const importKeyword = imp.isType ? 'import type' : 'import';
        const quote = this.options.quotes === 'single' ? "'" : '"';
        const semi = this.options.semicolons ? ';' : '';

        return `${importKeyword} ${parts.join(', ')} from ${quote}${imp.from}${quote}${semi}`;
      })
      .join('\n');
  }

  buildFunction(fn: FunctionBuilder): string {
    const { name, params, returnType, body, async, exported } = fn;

    const exportPrefix = exported ? 'export ' : '';
    const asyncPrefix = async ? 'async ' : '';
    const returnSuffix = returnType ? `: ${returnType}` : '';
    const paramsStr = params
      .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
      .join(', ');

    const lines: string[] = [];

    // JSDoc if provided
    if (fn.jsDoc) {
      lines.push(fn.jsDoc);
    }

    // Function signature
    lines.push(`${exportPrefix}${asyncPrefix}function ${name}(${paramsStr})${returnSuffix} {`);

    // Body (already indented)
    lines.push(body);

    lines.push('}');

    return lines.join('\n');
  }

  buildClass(cls: ClassBuilder): string {
    const lines: string[] = [];

    // JSDoc
    if (cls.jsDoc) {
      lines.push(cls.jsDoc);
    }

    // Class declaration
    const exportPrefix = cls.exported ? 'export ' : '';
    const extendsStr = cls.extends ? ` extends ${cls.extends}` : '';
    const implementsStr = cls.implements?.length
      ? ` implements ${cls.implements.join(', ')}`
      : '';

    lines.push(`${exportPrefix}class ${cls.name}${extendsStr}${implementsStr} {`);

    // Properties
    for (const prop of cls.properties || []) {
      const visibility = prop.visibility || 'private';
      const readonly = prop.readonly ? 'readonly ' : '';
      const optional = prop.optional ? '?' : '';
      lines.push(`  ${visibility} ${readonly}${prop.name}${optional}: ${prop.type};`);
    }

    if (cls.properties?.length) {
      lines.push('');
    }

    // Constructor
    if (cls.constructor) {
      lines.push(`  constructor(${cls.constructor.params}) {`);
      lines.push(this.indent(cls.constructor.body, 2));
      lines.push('  }');
      lines.push('');
    }

    // Methods
    for (const method of cls.methods || []) {
      const asyncPrefix = method.async ? 'async ' : '';
      const returnSuffix = method.returnType ? `: ${method.returnType}` : '';
      lines.push(`  ${asyncPrefix}${method.name}(${method.params})${returnSuffix} {`);
      lines.push(this.indent(method.body, 2));
      lines.push('  }');
      lines.push('');
    }

    lines.push('}');

    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private normalizeLineEndings(code: string): string {
    return code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  private fixIndentation(code: string): string {
    if (this.options.indentation === 'tabs') {
      const spaceIndent = ' '.repeat(this.options.indentSize);
      return code.replace(
        new RegExp(`^(${spaceIndent})+`, 'gm'),
        match => '\t'.repeat(match.length / this.options.indentSize)
      );
    }
    return code;
  }

  private fixQuotes(code: string): string {
    // Simple quote normalization (doesn't handle all edge cases)
    const target = this.options.quotes === 'single' ? "'" : '"';
    const other = this.options.quotes === 'single' ? '"' : "'";

    // Only replace in import statements and simple strings
    return code.replace(
      new RegExp(`from ${other}([^${other}]+)${other}`, 'g'),
      `from ${target}$1${target}`
    );
  }

  private fixSemicolons(code: string): string {
    if (!this.options.semicolons) {
      // Remove trailing semicolons (simple approach)
      return code.replace(/;$/gm, '');
    }
    return code;
  }

  private fixTrailingCommas(code: string): string {
    // Simplified - real implementation would need AST parsing
    return code;
  }

  private trimTrailingWhitespace(code: string): string {
    return code.split('\n').map(line => line.trimEnd()).join('\n');
  }

  private ensureFinalNewline(code: string): string {
    return code.endsWith('\n') ? code : code + '\n';
  }
}

// ============================================================================
// Helper Types
// ============================================================================

export interface ImportStatement {
  from: string;
  default?: string;
  named?: string[];
  namespace?: string;
  isType?: boolean;
}

export interface FunctionBuilder {
  name: string;
  params: { name: string; type: string; optional?: boolean }[];
  returnType?: string;
  body: string;
  async?: boolean;
  exported?: boolean;
  jsDoc?: string;
}

export interface ClassBuilder {
  name: string;
  exported?: boolean;
  extends?: string;
  implements?: string[];
  properties?: PropertyBuilder[];
  constructor?: { params: string; body: string };
  methods?: MethodBuilder[];
  jsDoc?: string;
}

export interface PropertyBuilder {
  name: string;
  type: string;
  visibility?: 'public' | 'private' | 'protected';
  readonly?: boolean;
  optional?: boolean;
}

export interface MethodBuilder {
  name: string;
  params: string;
  returnType?: string;
  body: string;
  async?: boolean;
}
```

### Verification Checklist - Phase 2
- [ ] `NameUtils` matches React Generator pattern
- [ ] All case conversions work correctly
- [ ] Pluralization handles common cases
- [ ] Reserved word handling implemented
- [ ] `CodeFormatter` normalizes output
- [ ] Import builder generates valid imports

---

## PHASE 3: PRISMA SCHEMA BUILDER (20 hours)

### File: `src/builders/prisma-schema-builder.ts`

```typescript
/**
 * Prisma Schema Builder
 * Epic 14: Backend Code Generation
 *
 * Generates Prisma schema from ParsedDataModel.
 */

import {
  ParsedDataModel,
  Entity,
  EntityField,
  EnumDefinition,
  FieldType,
  RelationConfig,
  ExpressGeneratorConfig,
} from '../core/types';
import { NameUtils } from '../utils/name-utils';

export class PrismaSchemaBuilder {
  private config: ExpressGeneratorConfig;
  private nameUtils: NameUtils;

  constructor(config: ExpressGeneratorConfig) {
    this.config = config;
    this.nameUtils = new NameUtils(config.namingConvention);
  }

  generate(dataModel: ParsedDataModel): string {
    const lines: string[] = [];

    // Header
    lines.push('// Generated by FORGE Express Generator');
    lines.push(`// ${new Date().toISOString()}`);
    lines.push('');

    // Datasource
    lines.push(this.buildDatasource());
    lines.push('');

    // Generator
    lines.push(this.buildGenerator());
    lines.push('');

    // Enums
    for (const enumDef of dataModel.enums) {
      lines.push(this.buildEnum(enumDef));
      lines.push('');
    }

    // Models
    for (const entity of dataModel.entities) {
      lines.push(this.buildModel(entity, dataModel));
      lines.push('');
    }

    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // Schema Blocks
  // --------------------------------------------------------------------------

  private buildDatasource(): string {
    return `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`;
  }

  private buildGenerator(): string {
    return `generator client {
  provider = "prisma-client-js"
}`;
  }

  private buildEnum(enumDef: EnumDefinition): string {
    const name = this.nameUtils.toPascalCase(enumDef.name);
    const values = enumDef.values.map(v => `  ${this.nameUtils.toConstantCase(v)}`);

    return `enum ${name} {
${values.join('\n')}
}`;
  }

  private buildModel(entity: Entity, dataModel: ParsedDataModel): string {
    const modelName = this.nameUtils.toEntityName(entity.name);
    const tableName = entity.tableName || this.nameUtils.toTableName(entity.name);

    const lines: string[] = [];

    // Model declaration
    lines.push(`model ${modelName} {`);

    // Fields
    for (const field of entity.fields) {
      lines.push(`  ${this.buildField(field, entity, dataModel)}`);
    }

    // Timestamps
    if (entity.timestamps) {
      lines.push(`  createdAt DateTime @default(now())`);
      lines.push(`  updatedAt DateTime @updatedAt`);
    }

    // Soft delete
    if (entity.softDelete || this.config.useSoftDelete) {
      lines.push(`  deletedAt DateTime?`);
    }

    // Table mapping
    if (tableName !== modelName.toLowerCase() + 's') {
      lines.push('');
      lines.push(`  @@map("${tableName}")`);
    }

    // Indexes
    if (entity.indexes) {
      for (const index of entity.indexes) {
        const indexFields = index.fields.map(f => this.nameUtils.toColumnName(f)).join(', ');
        const indexType = index.unique ? '@@unique' : '@@index';
        const indexName = index.name ? `, name: "${index.name}"` : '';
        lines.push(`  ${indexType}([${indexFields}]${indexName})`);
      }
    }

    lines.push('}');

    return lines.join('\n');
  }

  private buildField(
    field: EntityField,
    entity: Entity,
    dataModel: ParsedDataModel
  ): string {
    const parts: string[] = [];

    // Field name
    const fieldName = this.nameUtils.toCamelCase(field.name);
    parts.push(fieldName);

    // Field type
    if (field.relation) {
      parts.push(this.buildRelationType(field, entity, dataModel));
    } else {
      parts.push(this.mapFieldType(field));
    }

    // Optional marker
    if (!field.required && !field.relation) {
      parts[parts.length - 1] += '?';
    }

    // Attributes
    const attrs = this.buildFieldAttributes(field, entity);
    if (attrs) {
      parts.push(attrs);
    }

    return parts.join(' ');
  }

  private buildRelationType(
    field: EntityField,
    entity: Entity,
    _dataModel: ParsedDataModel
  ): string {
    const relation = field.relation!;
    const targetModel = this.nameUtils.toEntityName(relation.target);

    switch (relation.type) {
      case 'one-to-one':
      case 'many-to-one':
        return targetModel + (field.required ? '' : '?');

      case 'one-to-many':
        return `${targetModel}[]`;

      case 'many-to-many':
        return `${targetModel}[]`;

      default:
        return targetModel;
    }
  }

  private mapFieldType(field: EntityField): string {
    const typeMap: Record<FieldType, string> = {
      string: 'String',
      text: 'String',
      int: 'Int',
      bigint: 'BigInt',
      float: 'Float',
      decimal: 'Decimal',
      boolean: 'Boolean',
      datetime: 'DateTime',
      date: 'DateTime',
      json: 'Json',
      uuid: 'String',
      enum: this.nameUtils.toPascalCase(field.name) + 'Enum',
    };

    return typeMap[field.type] || 'String';
  }

  private buildFieldAttributes(field: EntityField, entity: Entity): string {
    const attrs: string[] = [];

    // Primary key (assume 'id' field)
    if (field.name === 'id') {
      attrs.push('@id');
      if (field.type === 'uuid') {
        attrs.push('@default(uuid())');
      } else if (field.type === 'int' || field.type === 'bigint') {
        attrs.push('@default(autoincrement())');
      }
    }

    // Unique
    if (field.unique) {
      attrs.push('@unique');
    }

    // Default value
    if (field.default !== undefined && field.name !== 'id') {
      attrs.push(`@default(${this.formatDefault(field.default, field.type)})`);
    }

    // Column mapping
    const columnName = field.columnName || this.nameUtils.toColumnName(field.name);
    if (columnName !== field.name) {
      attrs.push(`@map("${columnName}")`);
    }

    // String constraints
    if (field.type === 'string' && field.maxLength) {
      attrs.push(`@db.VarChar(${field.maxLength})`);
    }

    if (field.type === 'text') {
      attrs.push('@db.Text');
    }

    // Decimal precision
    if (field.type === 'decimal') {
      attrs.push('@db.Decimal(10, 2)');
    }

    // Relation attributes
    if (field.relation) {
      const rel = field.relation;

      if (rel.type === 'many-to-one' || rel.type === 'one-to-one') {
        const fkName = `${this.nameUtils.toCamelCase(field.name)}Id`;
        const targetModel = this.nameUtils.toEntityName(rel.target);

        const relationStr = `@relation(fields: [${fkName}], references: [id]${
          rel.onDelete ? `, onDelete: ${rel.onDelete}` : ''
        })`;
        attrs.push(relationStr);
      }
    }

    return attrs.join(' ');
  }

  private formatDefault(value: unknown, type: FieldType): string {
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    if (typeof value === 'boolean') {
      return value.toString();
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (value === 'now()' || value === 'uuid()') {
      return value as string;
    }
    return JSON.stringify(value);
  }
}
```

### Verification Checklist - Phase 3
- [ ] Generates valid Prisma schema syntax
- [ ] Handles all field types correctly
- [ ] Generates relations (1:1, 1:N, M:N)
- [ ] Includes timestamps (createdAt, updatedAt)
- [ ] Supports soft delete (deletedAt)
- [ ] Maps table and column names
- [ ] Generates indexes and unique constraints

---

## PHASE 4: CONTROLLER BUILDER (30 hours)

### File: `src/builders/controller-builder.ts`

```typescript
/**
 * Controller Builder
 * Epic 14: Backend Code Generation
 *
 * Generates Express controllers with CRUD operations.
 */

import {
  Entity,
  ExpressGeneratorConfig,
  GeneratedFile,
  BuilderContext,
} from '../core/types';
import { NameUtils } from '../utils/name-utils';
import { CodeFormatter, ImportStatement, ClassBuilder } from '../utils/code-formatter';

export class ControllerBuilder {
  private config: ExpressGeneratorConfig;
  private nameUtils: NameUtils;
  private formatter: CodeFormatter;

  constructor(config: ExpressGeneratorConfig) {
    this.config = config;
    this.nameUtils = new NameUtils(config.namingConvention);
    this.formatter = new CodeFormatter(config.formatting);
  }

  generate(entity: Entity, context: BuilderContext): GeneratedFile {
    const controllerName = this.nameUtils.toControllerName(entity.name);
    const serviceName = this.nameUtils.toServiceName(entity.name);
    const fileName = this.nameUtils.toControllerFileName(entity.name);

    // Build imports
    const imports = this.buildImports(entity, serviceName);

    // Build class
    const classCode = this.buildControllerClass(entity, controllerName, serviceName);

    // Assemble file
    const code = [
      this.buildFileHeader(entity),
      '',
      this.formatter.buildImports(imports),
      '',
      classCode,
    ].join('\n');

    return {
      name: controllerName,
      fileName: `${fileName}.ts`,
      filePath: `src/controllers/${fileName}.ts`,
      code: this.formatter.format(code),
      type: 'controller',
      sourceEntityId: entity.id,
      dependencies: [serviceName],
    };
  }

  // --------------------------------------------------------------------------
  // Private Builders
  // --------------------------------------------------------------------------

  private buildFileHeader(entity: Entity): string {
    return `/**
 * ${this.nameUtils.toEntityName(entity.name)} Controller
 * Generated by FORGE Express Generator
 *
 * Handles HTTP requests for ${entity.name} resources.
 */`;
  }

  private buildImports(entity: Entity, serviceName: string): ImportStatement[] {
    const imports: ImportStatement[] = [
      { from: 'express', named: ['Request', 'Response', 'NextFunction'] },
    ];

    // Service import
    const serviceFile = this.nameUtils.toServiceFileName(entity.name);
    imports.push({
      from: `../services/${serviceFile}`,
      named: [serviceName],
    });

    // Validation schema import
    if (this.config.validationLibrary === 'zod') {
      const schemaFile = this.nameUtils.toKebabCase(entity.name);
      imports.push({
        from: `../schemas/${schemaFile}.schema`,
        named: [
          `create${this.nameUtils.toPascalCase(entity.name)}Schema`,
          `update${this.nameUtils.toPascalCase(entity.name)}Schema`,
        ],
      });
    }

    // Prisma types
    imports.push({
      from: '@prisma/client',
      named: [this.nameUtils.toEntityName(entity.name)],
      isType: true,
    });

    return imports;
  }

  private buildControllerClass(
    entity: Entity,
    controllerName: string,
    serviceName: string
  ): string {
    const entityName = this.nameUtils.toEntityName(entity.name);
    const varName = this.nameUtils.toCamelCase(entity.name);

    const classBuilder: ClassBuilder = {
      name: controllerName,
      exported: true,
      properties: [
        { name: 'service', type: serviceName, visibility: 'private', readonly: true },
      ],
      constructor: {
        params: `service: ${serviceName}`,
        body: 'this.service = service;',
      },
      methods: [
        // findAll
        {
          name: 'findAll',
          params: 'req: Request, res: Response, next: NextFunction',
          returnType: 'Promise<void>',
          async: true,
          body: `try {
  const { page = 1, limit = 10, ...filters } = req.query;
  const result = await this.service.findAll({
    page: Number(page),
    limit: Number(limit),
    filters,
  });
  res.json(result);
} catch (error) {
  next(error);
}`,
        },

        // findOne
        {
          name: 'findOne',
          params: 'req: Request, res: Response, next: NextFunction',
          returnType: 'Promise<void>',
          async: true,
          body: `try {
  const { id } = req.params;
  const ${varName} = await this.service.findOne(id);

  if (!${varName}) {
    res.status(404).json({ error: '${entityName} not found' });
    return;
  }

  res.json(${varName});
} catch (error) {
  next(error);
}`,
        },

        // create
        {
          name: 'create',
          params: 'req: Request, res: Response, next: NextFunction',
          returnType: 'Promise<void>',
          async: true,
          body: this.buildCreateMethod(entity, varName, entityName),
        },

        // update
        {
          name: 'update',
          params: 'req: Request, res: Response, next: NextFunction',
          returnType: 'Promise<void>',
          async: true,
          body: this.buildUpdateMethod(entity, varName, entityName),
        },

        // delete
        {
          name: 'delete',
          params: 'req: Request, res: Response, next: NextFunction',
          returnType: 'Promise<void>',
          async: true,
          body: this.buildDeleteMethod(entity, varName, entityName),
        },
      ],
    };

    return this.formatter.buildClass(classBuilder);
  }

  private buildCreateMethod(entity: Entity, varName: string, entityName: string): string {
    const schemaName = `create${entityName}Schema`;

    if (this.config.validationLibrary === 'zod') {
      return `try {
  const validatedData = ${schemaName}.parse(req.body);
  const ${varName} = await this.service.create(validatedData);
  res.status(201).json(${varName});
} catch (error) {
  if (error.name === 'ZodError') {
    res.status(400).json({ error: 'Validation failed', details: error.errors });
    return;
  }
  next(error);
}`;
    }

    return `try {
  const ${varName} = await this.service.create(req.body);
  res.status(201).json(${varName});
} catch (error) {
  next(error);
}`;
  }

  private buildUpdateMethod(entity: Entity, varName: string, entityName: string): string {
    const schemaName = `update${entityName}Schema`;

    if (this.config.validationLibrary === 'zod') {
      return `try {
  const { id } = req.params;
  const validatedData = ${schemaName}.parse(req.body);
  const ${varName} = await this.service.update(id, validatedData);

  if (!${varName}) {
    res.status(404).json({ error: '${entityName} not found' });
    return;
  }

  res.json(${varName});
} catch (error) {
  if (error.name === 'ZodError') {
    res.status(400).json({ error: 'Validation failed', details: error.errors });
    return;
  }
  next(error);
}`;
    }

    return `try {
  const { id } = req.params;
  const ${varName} = await this.service.update(id, req.body);

  if (!${varName}) {
    res.status(404).json({ error: '${entityName} not found' });
    return;
  }

  res.json(${varName});
} catch (error) {
  next(error);
}`;
  }

  private buildDeleteMethod(entity: Entity, varName: string, entityName: string): string {
    if (this.config.useSoftDelete) {
      return `try {
  const { id } = req.params;
  const ${varName} = await this.service.softDelete(id);

  if (!${varName}) {
    res.status(404).json({ error: '${entityName} not found' });
    return;
  }

  res.status(204).send();
} catch (error) {
  next(error);
}`;
    }

    return `try {
  const { id } = req.params;
  await this.service.delete(id);
  res.status(204).send();
} catch (error) {
  next(error);
}`;
  }
}
```

*(Continue with ServiceBuilder, RouteBuilder, MiddlewareBuilder in similar detail...)*

---

## REMAINING PHASES (Summary)

### PHASE 5: SERVICE BUILDER (25 hours)
- Generates service layer with business logic
- Prisma client integration
- Transaction support
- Pagination helpers

### PHASE 6: ROUTE BUILDER (15 hours)
- Generates Express router files
- Route definitions with middleware
- OpenAPI documentation generation

### PHASE 7: MIDDLEWARE BUILDER (15 hours)
- Authentication middleware (JWT)
- Validation middleware
- Error handling middleware
- Request logging

### PHASE 8: MAIN GENERATOR (20 hours)
- Orchestrates all builders
- Generates app.ts entry point
- Statistics collection
- Warning/error aggregation

### PHASE 9: TESTS (25 hours)
- Unit tests for each builder
- Integration tests for full generation
- Snapshot tests for generated code
- Fixtures for common data models

### PHASE 10: INTEGRATION (10 hours)
- Package configuration
- Export setup
- Pipeline integration
- Documentation

---

## ACCEPTANCE CRITERIA

### Must Pass (97%+ confidence)

- [ ] Generates valid Prisma schema from data model
- [ ] Generates Express controllers with CRUD
- [ ] Generates service layer with Prisma integration
- [ ] Generates route definitions
- [ ] Generates validation schemas (Zod)
- [ ] All TypeScript compiles without errors
- [ ] Generated code passes linting
- [ ] Unit tests for all builders (85%+ coverage)

### Test Coverage Targets

| Component | Coverage Target |
|-----------|-----------------|
| Prisma Builder | 90%+ |
| Controller Builder | 90%+ |
| Service Builder | 85%+ |
| Route Builder | 85%+ |
| NameUtils | 95%+ |
| CodeFormatter | 85%+ |

---

## SUCCESS METRICS

```
BEFORE EPIC 14:
├── Backend Code Generation: 0%
├── Prisma Schema Generation: 0%
├── Express Controllers: 0%
├── Service Layer: 0%

AFTER EPIC 14:
├── Backend Code Generation: 100%
├── Prisma Schema Generation: 100%
├── Express Controllers: 100%
├── Service Layer: 100%
├── Tests: +100 new tests
├── POC Objective 3: 25% → 100%
```

---

## CC EXECUTION COMMAND

```
Read ~/Downloads/CC-EPIC-14-BACKEND-CODEGEN-DIRECTIVE.md and implement Epic 14 - Backend Code Generation

This is a multi-week epic. Implement in phases:
1. Types & Config (8h)
2. Utilities (12h)
3. Prisma Builder (20h)
4. Controller Builder (30h)
5. Service Builder (25h)
6. Route Builder (15h)
7. Middleware Builder (15h)
8. Main Generator (20h)
9. Tests (25h)
10. Integration (10h)

Commit after each phase. Run tests continuously.
Target: +100 tests, 97%+ pattern alignment with ReactGenerator
```

---

*Epic 14 Directive - Version 1.0 - 97% Confidence*
