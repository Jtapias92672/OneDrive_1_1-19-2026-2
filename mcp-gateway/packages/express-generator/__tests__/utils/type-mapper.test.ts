/**
 * Type Mapper Tests
 * Epic 14: Backend Code Generation
 */

import { TypeMapper } from '../../src/utils/type-mapper';

describe('TypeMapper', () => {
  let typeMapper: TypeMapper;

  beforeEach(() => {
    typeMapper = new TypeMapper('prisma');
  });

  describe('TypeScript Types', () => {
    it('should map scalar types to TypeScript', () => {
      expect(typeMapper.toTypeScript('string')).toBe('string');
      expect(typeMapper.toTypeScript('text')).toBe('string');
      expect(typeMapper.toTypeScript('int')).toBe('number');
      expect(typeMapper.toTypeScript('bigint')).toBe('bigint');
      expect(typeMapper.toTypeScript('float')).toBe('number');
      expect(typeMapper.toTypeScript('decimal')).toBe('number');
      expect(typeMapper.toTypeScript('boolean')).toBe('boolean');
    });

    it('should map date types to TypeScript', () => {
      expect(typeMapper.toTypeScript('datetime')).toBe('Date');
      expect(typeMapper.toTypeScript('date')).toBe('Date');
    });

    it('should map complex types to TypeScript', () => {
      expect(typeMapper.toTypeScript('json')).toBe('Record<string, unknown>');
      expect(typeMapper.toTypeScript('uuid')).toBe('string');
      expect(typeMapper.toTypeScript('enum')).toBe('string');
    });

    it('should handle optional types', () => {
      expect(typeMapper.toTypeScript('string', true)).toBe('string | null');
      expect(typeMapper.toTypeScript('int', true)).toBe('number | null');
    });

    it('should handle array types', () => {
      expect(typeMapper.toTypeScript('string', false, true)).toBe('string[]');
      expect(typeMapper.toTypeScript('int', false, true)).toBe('number[]');
    });

    it('should handle optional array types', () => {
      expect(typeMapper.toTypeScript('string', true, true)).toBe('string[] | null');
    });
  });

  describe('DTO Types', () => {
    it('should map to DTO types', () => {
      expect(typeMapper.toDtoType('string')).toBe('string');
      expect(typeMapper.toDtoType('int')).toBe('number');
    });

    it('should handle dates in DTOs (accept string or Date)', () => {
      expect(typeMapper.toDtoType('datetime')).toBe('string | Date');
      expect(typeMapper.toDtoType('date')).toBe('string | Date');
    });

    it('should handle optional DTO types', () => {
      expect(typeMapper.toDtoType('string', true)).toBe('string | undefined');
    });
  });

  describe('Prisma Types', () => {
    it('should map to Prisma types', () => {
      expect(typeMapper.toPrismaType('string')).toBe('String');
      expect(typeMapper.toPrismaType('text')).toBe('String');
      expect(typeMapper.toPrismaType('int')).toBe('Int');
      expect(typeMapper.toPrismaType('bigint')).toBe('BigInt');
      expect(typeMapper.toPrismaType('float')).toBe('Float');
      expect(typeMapper.toPrismaType('decimal')).toBe('Decimal');
      expect(typeMapper.toPrismaType('boolean')).toBe('Boolean');
      expect(typeMapper.toPrismaType('datetime')).toBe('DateTime');
      expect(typeMapper.toPrismaType('json')).toBe('Json');
    });
  });

  describe('TypeORM Types', () => {
    it('should map to TypeORM types', () => {
      const typeormMapper = new TypeMapper('typeorm');

      expect(typeormMapper.toTypeOrmType('string')).toBe('varchar');
      expect(typeormMapper.toTypeOrmType('text')).toBe('text');
      expect(typeormMapper.toTypeOrmType('int')).toBe('int');
      expect(typeormMapper.toTypeOrmType('bigint')).toBe('bigint');
      expect(typeormMapper.toTypeOrmType('boolean')).toBe('boolean');
      expect(typeormMapper.toTypeOrmType('datetime')).toBe('timestamp');
      expect(typeormMapper.toTypeOrmType('json')).toBe('json');
      expect(typeormMapper.toTypeOrmType('uuid')).toBe('uuid');
    });
  });

  describe('Drizzle Types', () => {
    it('should map to Drizzle types', () => {
      const drizzleMapper = new TypeMapper('drizzle');

      expect(drizzleMapper.toDrizzleType('string')).toBe('text');
      expect(drizzleMapper.toDrizzleType('int')).toBe('integer');
      expect(drizzleMapper.toDrizzleType('bigint')).toBe('bigint');
      expect(drizzleMapper.toDrizzleType('float')).toBe('real');
      expect(drizzleMapper.toDrizzleType('boolean')).toBe('boolean');
      expect(drizzleMapper.toDrizzleType('datetime')).toBe('timestamp');
    });
  });

  describe('Zod Validators', () => {
    it('should map to Zod validators', () => {
      expect(typeMapper.toZodType('string')).toBe('z.string()');
      expect(typeMapper.toZodType('int')).toBe('z.number().int()');
      expect(typeMapper.toZodType('bigint')).toBe('z.bigint()');
      expect(typeMapper.toZodType('float')).toBe('z.number()');
      expect(typeMapper.toZodType('boolean')).toBe('z.boolean()');
      expect(typeMapper.toZodType('datetime')).toBe('z.date()');
      expect(typeMapper.toZodType('uuid')).toBe('z.string().uuid()');
    });

    it('should build Zod validators with constraints', () => {
      const validator = typeMapper.buildZodValidator('string', {
        minLength: 1,
        maxLength: 100,
      });
      expect(validator).toBe('z.string().min(1).max(100)');
    });

    it('should build Zod validators with number constraints', () => {
      const validator = typeMapper.buildZodValidator('int', {
        min: 0,
        max: 100,
      });
      expect(validator).toBe('z.number().int().min(0).max(100)');
    });

    it('should build Zod validators with pattern', () => {
      const validator = typeMapper.buildZodValidator('string', {
        pattern: '^[a-z]+$',
      });
      expect(validator).toBe('z.string().regex(/^[a-z]+$/)');
    });

    it('should build Zod enum validators', () => {
      const validator = typeMapper.buildZodValidator('enum', {
        enumValues: ['ACTIVE', 'INACTIVE', 'PENDING'],
      });
      expect(validator).toBe("z.enum(['ACTIVE', 'INACTIVE', 'PENDING'])");
    });

    it('should handle optional Zod validators', () => {
      const validator = typeMapper.buildZodValidator('string', {
        required: false,
      });
      expect(validator).toBe('z.string().optional().nullable()');
    });
  });

  describe('Joi Validators', () => {
    it('should map to Joi validators', () => {
      expect(typeMapper.toJoiType('string')).toBe('Joi.string()');
      expect(typeMapper.toJoiType('int')).toBe('Joi.number().integer()');
      expect(typeMapper.toJoiType('boolean')).toBe('Joi.boolean()');
      expect(typeMapper.toJoiType('datetime')).toBe('Joi.date()');
      expect(typeMapper.toJoiType('uuid')).toBe('Joi.string().uuid()');
      expect(typeMapper.toJoiType('json')).toBe('Joi.object()');
    });
  });

  describe('Class Validator Decorators', () => {
    it('should map to class-validator decorators', () => {
      expect(typeMapper.toClassValidatorDecorator('string')).toBe('@IsString()');
      expect(typeMapper.toClassValidatorDecorator('int')).toBe('@IsInt()');
      expect(typeMapper.toClassValidatorDecorator('float')).toBe('@IsNumber()');
      expect(typeMapper.toClassValidatorDecorator('boolean')).toBe('@IsBoolean()');
      expect(typeMapper.toClassValidatorDecorator('datetime')).toBe('@IsDate()');
      expect(typeMapper.toClassValidatorDecorator('uuid')).toBe('@IsUUID()');
      expect(typeMapper.toClassValidatorDecorator('json')).toBe('@IsObject()');
    });
  });

  describe('Default Values', () => {
    it('should get TypeScript default values', () => {
      expect(typeMapper.getDefaultValue('string')).toBe("''");
      expect(typeMapper.getDefaultValue('int')).toBe('0');
      expect(typeMapper.getDefaultValue('bigint')).toBe('0n');
      expect(typeMapper.getDefaultValue('float')).toBe('0.0');
      expect(typeMapper.getDefaultValue('boolean')).toBe('false');
      expect(typeMapper.getDefaultValue('datetime')).toBe('new Date()');
      expect(typeMapper.getDefaultValue('json')).toBe('{}');
    });

    it('should get Prisma default expressions', () => {
      expect(typeMapper.getPrismaDefault('uuid')).toBe('uuid()');
      expect(typeMapper.getPrismaDefault('datetime')).toBe('now()');
      expect(typeMapper.getPrismaDefault('string', 'default')).toBe('"default"');
      expect(typeMapper.getPrismaDefault('int', 0)).toBe('0');
    });
  });

  describe('Type Utilities', () => {
    it('should identify scalar types', () => {
      expect(typeMapper.isScalarType('string')).toBe(true);
      expect(typeMapper.isScalarType('int')).toBe(true);
      expect(typeMapper.isScalarType('boolean')).toBe(true);
      expect(typeMapper.isScalarType('json')).toBe(false);
      expect(typeMapper.isScalarType('datetime')).toBe(false);
    });

    it('should identify types requiring serialization', () => {
      expect(typeMapper.requiresSerialization('json')).toBe(true);
      expect(typeMapper.requiresSerialization('datetime')).toBe(true);
      expect(typeMapper.requiresSerialization('bigint')).toBe(true);
      expect(typeMapper.requiresSerialization('string')).toBe(false);
    });
  });

  describe('ORM Framework', () => {
    it('should get/set ORM framework', () => {
      expect(typeMapper.getOrmFramework()).toBe('prisma');

      typeMapper.setOrmFramework('typeorm');
      expect(typeMapper.getOrmFramework()).toBe('typeorm');
    });

    it('should use correct ORM type based on framework', () => {
      typeMapper.setOrmFramework('prisma');
      expect(typeMapper.toOrmType('string')).toBe('String');

      typeMapper.setOrmFramework('typeorm');
      expect(typeMapper.toOrmType('string')).toBe('varchar');

      typeMapper.setOrmFramework('drizzle');
      expect(typeMapper.toOrmType('string')).toBe('text');
    });
  });
});
