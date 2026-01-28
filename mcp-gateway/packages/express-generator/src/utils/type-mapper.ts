/**
 * Express Generator - Type Mapper
 *
 * @epic 14 - Backend Code Generation
 * @task 2.3 - Type Mapping
 *
 * @description
 *   Maps data model types to TypeScript, Prisma, and database types.
 */

import { FieldType, OrmFramework } from '../core/types';

// ============================================
// TYPE MAPPINGS
// ============================================

const TYPESCRIPT_TYPE_MAP: Record<FieldType, string> = {
  string: 'string',
  text: 'string',
  int: 'number',
  bigint: 'bigint',
  float: 'number',
  decimal: 'number',
  boolean: 'boolean',
  datetime: 'Date',
  date: 'Date',
  json: 'Record<string, unknown>',
  uuid: 'string',
  enum: 'string',
};

const PRISMA_TYPE_MAP: Record<FieldType, string> = {
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
  enum: 'String',
};

const TYPEORM_TYPE_MAP: Record<FieldType, string> = {
  string: 'varchar',
  text: 'text',
  int: 'int',
  bigint: 'bigint',
  float: 'float',
  decimal: 'decimal',
  boolean: 'boolean',
  datetime: 'timestamp',
  date: 'date',
  json: 'json',
  uuid: 'uuid',
  enum: 'enum',
};

const DRIZZLE_TYPE_MAP: Record<FieldType, string> = {
  string: 'text',
  text: 'text',
  int: 'integer',
  bigint: 'bigint',
  float: 'real',
  decimal: 'decimal',
  boolean: 'boolean',
  datetime: 'timestamp',
  date: 'date',
  json: 'json',
  uuid: 'uuid',
  enum: 'text',
};

const ZOD_TYPE_MAP: Record<FieldType, string> = {
  string: 'z.string()',
  text: 'z.string()',
  int: 'z.number().int()',
  bigint: 'z.bigint()',
  float: 'z.number()',
  decimal: 'z.number()',
  boolean: 'z.boolean()',
  datetime: 'z.date()',
  date: 'z.date()',
  json: 'z.record(z.unknown())',
  uuid: 'z.string().uuid()',
  enum: 'z.string()',
};

// ============================================
// TYPE MAPPER
// ============================================

export class TypeMapper {
  private ormFramework: OrmFramework;

  constructor(ormFramework: OrmFramework = 'prisma') {
    this.ormFramework = ormFramework;
  }

  // ==========================================
  // TYPESCRIPT TYPES
  // ==========================================

  /**
   * Map field type to TypeScript type
   */
  toTypeScript(fieldType: FieldType, isOptional = false, isArray = false): string {
    let tsType = TYPESCRIPT_TYPE_MAP[fieldType] || 'unknown';

    if (isArray) {
      tsType = `${tsType}[]`;
    }

    if (isOptional) {
      tsType = `${tsType} | null`;
    }

    return tsType;
  }

  /**
   * Map field type to TypeScript type for DTO
   */
  toDtoType(fieldType: FieldType, isOptional = false): string {
    let tsType = TYPESCRIPT_TYPE_MAP[fieldType] || 'unknown';

    // DTOs might receive string dates from JSON
    if (fieldType === 'datetime' || fieldType === 'date') {
      tsType = 'string | Date';
    }

    if (isOptional) {
      tsType = `${tsType} | undefined`;
    }

    return tsType;
  }

  // ==========================================
  // ORM TYPES
  // ==========================================

  /**
   * Map field type to ORM type based on framework
   */
  toOrmType(fieldType: FieldType): string {
    switch (this.ormFramework) {
      case 'prisma':
        return this.toPrismaType(fieldType);
      case 'typeorm':
        return this.toTypeOrmType(fieldType);
      case 'drizzle':
        return this.toDrizzleType(fieldType);
      default:
        return PRISMA_TYPE_MAP[fieldType] || 'String';
    }
  }

  /**
   * Map field type to Prisma type
   */
  toPrismaType(fieldType: FieldType): string {
    return PRISMA_TYPE_MAP[fieldType] || 'String';
  }

  /**
   * Map field type to TypeORM column type
   */
  toTypeOrmType(fieldType: FieldType): string {
    return TYPEORM_TYPE_MAP[fieldType] || 'varchar';
  }

  /**
   * Map field type to Drizzle type
   */
  toDrizzleType(fieldType: FieldType): string {
    return DRIZZLE_TYPE_MAP[fieldType] || 'text';
  }

  // ==========================================
  // VALIDATION TYPES
  // ==========================================

  /**
   * Map field type to Zod validator
   */
  toZodType(fieldType: FieldType): string {
    return ZOD_TYPE_MAP[fieldType] || 'z.unknown()';
  }

  /**
   * Build Zod validator with constraints
   */
  buildZodValidator(
    fieldType: FieldType,
    options: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      min?: number;
      max?: number;
      pattern?: string;
      enumValues?: string[];
    } = {}
  ): string {
    const { required = true, minLength, maxLength, min, max, pattern, enumValues } = options;

    // Handle enums specially
    if (fieldType === 'enum' && enumValues && enumValues.length > 0) {
      const enumStr = enumValues.map(v => `'${v}'`).join(', ');
      let validator = `z.enum([${enumStr}])`;
      if (!required) {
        validator += '.optional()';
      }
      return validator;
    }

    let validator = ZOD_TYPE_MAP[fieldType] || 'z.unknown()';

    // Add string constraints
    if (fieldType === 'string' || fieldType === 'text') {
      if (minLength !== undefined) {
        validator += `.min(${minLength})`;
      }
      if (maxLength !== undefined) {
        validator += `.max(${maxLength})`;
      }
      if (pattern) {
        validator += `.regex(/${pattern}/)`;
      }
    }

    // Add number constraints
    if (fieldType === 'int' || fieldType === 'bigint' || fieldType === 'float' || fieldType === 'decimal') {
      if (min !== undefined) {
        validator += `.min(${min})`;
      }
      if (max !== undefined) {
        validator += `.max(${max})`;
      }
    }

    // Handle optional
    if (!required) {
      validator += '.optional().nullable()';
    }

    return validator;
  }

  /**
   * Map field type to Joi validator
   */
  toJoiType(fieldType: FieldType): string {
    const joiMap: Record<FieldType, string> = {
      string: 'Joi.string()',
      text: 'Joi.string()',
      int: 'Joi.number().integer()',
      bigint: 'Joi.number().integer()',
      float: 'Joi.number()',
      decimal: 'Joi.number()',
      boolean: 'Joi.boolean()',
      datetime: 'Joi.date()',
      date: 'Joi.date()',
      json: 'Joi.object()',
      uuid: 'Joi.string().uuid()',
      enum: 'Joi.string()',
    };

    return joiMap[fieldType] || 'Joi.any()';
  }

  /**
   * Map field type to class-validator decorator
   */
  toClassValidatorDecorator(fieldType: FieldType): string {
    const decoratorMap: Record<FieldType, string> = {
      string: '@IsString()',
      text: '@IsString()',
      int: '@IsInt()',
      bigint: '@IsNumber()',
      float: '@IsNumber()',
      decimal: '@IsNumber()',
      boolean: '@IsBoolean()',
      datetime: '@IsDate()',
      date: '@IsDate()',
      json: '@IsObject()',
      uuid: '@IsUUID()',
      enum: '@IsString()',
    };

    return decoratorMap[fieldType] || '';
  }

  // ==========================================
  // DEFAULT VALUES
  // ==========================================

  /**
   * Get TypeScript default value for type
   */
  getDefaultValue(fieldType: FieldType): string {
    const defaults: Record<FieldType, string> = {
      string: "''",
      text: "''",
      int: '0',
      bigint: '0n',
      float: '0.0',
      decimal: '0.0',
      boolean: 'false',
      datetime: 'new Date()',
      date: 'new Date()',
      json: '{}',
      uuid: "''",
      enum: "''",
    };

    return defaults[fieldType] || 'undefined';
  }

  /**
   * Get Prisma default value expression
   */
  getPrismaDefault(fieldType: FieldType, defaultValue?: unknown): string | undefined {
    if (defaultValue !== undefined) {
      if (typeof defaultValue === 'string') {
        return `"${defaultValue}"`;
      }
      return String(defaultValue);
    }

    // Auto defaults
    if (fieldType === 'uuid') {
      return 'uuid()';
    }
    if (fieldType === 'datetime') {
      return 'now()';
    }

    return undefined;
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  /**
   * Check if type is a scalar type
   */
  isScalarType(fieldType: FieldType): boolean {
    const scalarTypes: FieldType[] = ['string', 'text', 'int', 'bigint', 'float', 'decimal', 'boolean', 'uuid'];
    return scalarTypes.includes(fieldType);
  }

  /**
   * Check if type requires special serialization
   */
  requiresSerialization(fieldType: FieldType): boolean {
    return fieldType === 'json' || fieldType === 'datetime' || fieldType === 'date' || fieldType === 'bigint';
  }

  /**
   * Get ORM framework
   */
  getOrmFramework(): OrmFramework {
    return this.ormFramework;
  }

  /**
   * Set ORM framework
   */
  setOrmFramework(framework: OrmFramework): void {
    this.ormFramework = framework;
  }
}

// ============================================
// EXPORTS
// ============================================

export default TypeMapper;
