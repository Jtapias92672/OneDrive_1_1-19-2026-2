/**
 * Service Builder Tests
 * Epic 14: Backend Code Generation
 *
 * Tests service generation with various configurations:
 * - With/without transactions
 * - With/without soft delete
 */

import { ServiceBuilder } from '../../src/builders/service-builder';
import { BuilderContext, Entity, ParsedDataModel } from '../../src/core/types';
import { DEFAULT_CONFIG, createConfig } from '../../src/core/config';

describe('ServiceBuilder', () => {
  const createEntity = (name: string, softDelete = false): Entity => ({
    id: `entity-${name.toLowerCase()}`,
    name,
    tableName: name.toLowerCase(),
    description: `Test ${name} entity`,
    fields: [
      {
        name: 'id',
        type: 'string',
        required: true,
        unique: true,
      },
      {
        name: 'name',
        type: 'string',
        required: true,
        unique: false,
      },
    ],
    timestamps: true,
    softDelete,
  });

  const createDataModel = (entities: Entity[]): ParsedDataModel => ({
    version: '1.0',
    metadata: { name: 'Test', createdAt: new Date().toISOString() },
    entities,
    relationships: [],
    enums: [],
  });

  const createContext = (
    entities: Entity[],
    overrides: Partial<typeof DEFAULT_CONFIG> = {}
  ): BuilderContext => {
    const dataModel = createDataModel(entities);
    const entityMap = new Map(entities.map(e => [e.id, e]));
    return {
      config: createConfig(overrides),
      dataModel,
      entityMap,
      generatedTypes: new Map(),
    };
  };

  describe('build', () => {
    it('should generate service file with correct metadata', () => {
      const entity = createEntity('User');
      const builder = new ServiceBuilder(createContext([entity]));
      const file = builder.build(entity);

      expect(file.name).toBe('UserService');
      expect(file.fileName).toBe('user.service.ts');
      expect(file.filePath).toBe('src/services/user.service.ts');
      expect(file.type).toBe('service');
      expect(file.sourceEntityId).toBe('entity-user');
      expect(file.dependencies).toContain('@prisma/client');
    });

    it('should generate CRUD methods in service', () => {
      const entity = createEntity('Product');
      const builder = new ServiceBuilder(createContext([entity]));
      const file = builder.build(entity);

      expect(file.code).toContain('async create(');
      expect(file.code).toContain('async findAll(');
      expect(file.code).toContain('async findOne(');
      expect(file.code).toContain('async update(');
      expect(file.code).toContain('async delete(');
    });

    it('should include entity description in service class', () => {
      const entity = createEntity('Order');
      entity.description = 'Customer orders';
      const builder = new ServiceBuilder(createContext([entity]));
      const file = builder.build(entity);

      expect(file.code).toContain('Customer orders');
    });
  });

  describe('buildAll', () => {
    it('should build services for all entities', () => {
      const entities = [
        createEntity('User'),
        createEntity('Product'),
        createEntity('Order'),
      ];
      const builder = new ServiceBuilder(createContext(entities));
      const files = builder.buildAll();

      expect(files.length).toBe(3);
      expect(files.some(f => f.name === 'UserService')).toBe(true);
      expect(files.some(f => f.name === 'ProductService')).toBe(true);
      expect(files.some(f => f.name === 'OrderService')).toBe(true);
    });
  });

  describe('with transactions (useTransactions: true)', () => {
    it('should generate create method with $transaction', () => {
      const entity = createEntity('User');
      const builder = new ServiceBuilder(
        createContext([entity], { useTransactions: true })
      );
      const file = builder.build(entity);

      expect(file.code).toContain('$transaction');
      expect(file.code).toContain('async create(data: CreateUserDto): Promise<User>');
      expect(file.code).toContain('tx.user.create');
    });

    it('should generate update method with $transaction', () => {
      const entity = createEntity('Product');
      const builder = new ServiceBuilder(
        createContext([entity], { useTransactions: true })
      );
      const file = builder.build(entity);

      expect(file.code).toContain('$transaction');
      expect(file.code).toContain('async update(id: string, data: UpdateProductDto): Promise<Product | null>');
      expect(file.code).toContain('tx.product.update');
    });
  });

  describe('without transactions (useTransactions: false)', () => {
    it('should generate create method without $transaction', () => {
      const entity = createEntity('User');
      const builder = new ServiceBuilder(
        createContext([entity], { useTransactions: false })
      );
      const file = builder.build(entity);

      // Should NOT contain $transaction in create
      expect(file.code).toContain('async create(data: CreateUserDto): Promise<User>');
      expect(file.code).toContain('this.prisma.user.create');
      // Check that $transaction is not used in the create method
      const createMethodMatch = file.code.match(/async create\([^)]+\)[^{]*{[\s\S]*?^\s{2}}/m);
      expect(createMethodMatch?.[0]).not.toContain('$transaction');
    });

    it('should generate update method without $transaction using try/catch', () => {
      const entity = createEntity('Product');
      const builder = new ServiceBuilder(
        createContext([entity], { useTransactions: false })
      );
      const file = builder.build(entity);

      expect(file.code).toContain('async update(id: string, data: UpdateProductDto): Promise<Product | null>');
      expect(file.code).toContain('this.prisma.product.update');
      expect(file.code).toContain('try {');
      expect(file.code).toContain('} catch {');
      expect(file.code).toContain('return null;');
    });

    it('should not wrap update in transaction', () => {
      const entity = createEntity('Order');
      const builder = new ServiceBuilder(
        createContext([entity], { useTransactions: false })
      );
      const file = builder.build(entity);

      // Extract update method and verify no $transaction
      const updateMethodMatch = file.code.match(/async update\([^)]+\)[^{]*{[\s\S]*?^\s{2}}/m);
      if (updateMethodMatch) {
        expect(updateMethodMatch[0]).not.toContain('$transaction');
        expect(updateMethodMatch[0]).toContain('try {');
      }
    });
  });

  describe('with soft delete (useSoftDelete: true)', () => {
    it('should generate findAll with deletedAt: null filter', () => {
      const entity = createEntity('User', true);
      const builder = new ServiceBuilder(
        createContext([entity], { useSoftDelete: true })
      );
      const file = builder.build(entity);

      expect(file.code).toContain('deletedAt: null');
      expect(file.code).toContain('const where = { deletedAt: null }');
    });

    it('should generate findOne with deletedAt: null filter', () => {
      const entity = createEntity('Product', true);
      const builder = new ServiceBuilder(
        createContext([entity], { useSoftDelete: true })
      );
      const file = builder.build(entity);

      expect(file.code).toContain('findFirst');
      expect(file.code).toContain('where: { id, deletedAt: null }');
    });

    it('should include softDelete and restore methods', () => {
      const entity = createEntity('User', true);
      const builder = new ServiceBuilder(
        createContext([entity], { useSoftDelete: true })
      );
      const file = builder.build(entity);

      expect(file.code).toContain('async softDelete(id: string): Promise<boolean>');
      expect(file.code).toContain('async restore(id: string): Promise<User | null>');
    });

    it('should exclude deletedAt from CreateDto', () => {
      const entity = createEntity('User', true);
      const builder = new ServiceBuilder(
        createContext([entity], { useSoftDelete: true })
      );
      const file = builder.build(entity);

      expect(file.code).toContain("Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>");
    });
  });

  describe('without soft delete (useSoftDelete: false)', () => {
    it('should generate findAll without deletedAt filter', () => {
      const entity = createEntity('User');
      const builder = new ServiceBuilder(
        createContext([entity], { useSoftDelete: false })
      );
      const file = builder.build(entity);

      // Should have empty where clause
      expect(file.code).toContain('const where = {}');
      // Should NOT have deletedAt filter in where
      expect(file.code).not.toContain('const where = { deletedAt: null }');
    });

    it('should generate findOne with findUnique instead of findFirst', () => {
      const entity = createEntity('Product');
      const builder = new ServiceBuilder(
        createContext([entity], { useSoftDelete: false })
      );
      const file = builder.build(entity);

      // Extract findOne method
      const findOneMatch = file.code.match(/async findOne\([^)]+\)[^{]*{[\s\S]*?^\s{2}}/m);
      if (findOneMatch) {
        expect(findOneMatch[0]).toContain('findUnique');
        expect(findOneMatch[0]).toContain('where: { id }');
        expect(findOneMatch[0]).not.toContain('deletedAt');
      }
    });

    it('should not include softDelete and restore methods', () => {
      const entity = createEntity('User');
      const builder = new ServiceBuilder(
        createContext([entity], { useSoftDelete: false })
      );
      const file = builder.build(entity);

      expect(file.code).not.toContain('async softDelete(');
      expect(file.code).not.toContain('async restore(');
    });

    it('should not exclude deletedAt from CreateDto', () => {
      const entity = createEntity('User');
      const builder = new ServiceBuilder(
        createContext([entity], { useSoftDelete: false })
      );
      const file = builder.build(entity);

      // Should NOT have deletedAt in the Omit
      expect(file.code).not.toContain("| 'deletedAt'");
    });
  });

  describe('combined configurations', () => {
    it('should handle useTransactions: false and useSoftDelete: true', () => {
      const entity = createEntity('User', true);
      const builder = new ServiceBuilder(
        createContext([entity], {
          useTransactions: false,
          useSoftDelete: true,
        })
      );
      const file = builder.build(entity);

      // Create without transaction
      const createMatch = file.code.match(/async create\([^)]+\)[^{]*{[\s\S]*?^\s{2}}/m);
      expect(createMatch?.[0]).not.toContain('$transaction');
      expect(createMatch?.[0]).toContain('this.prisma.user.create');

      // findAll with soft delete filter
      expect(file.code).toContain('const where = { deletedAt: null }');

      // Update without transaction but with try/catch
      const updateMatch = file.code.match(/async update\([^)]+\)[^{]*{[\s\S]*?^\s{2}}/m);
      expect(updateMatch?.[0]).not.toContain('$transaction');
      expect(updateMatch?.[0]).toContain('try {');

      // Has softDelete and restore
      expect(file.code).toContain('async softDelete(');
      expect(file.code).toContain('async restore(');
    });

    it('should handle useTransactions: true and useSoftDelete: false', () => {
      const entity = createEntity('Product');
      const builder = new ServiceBuilder(
        createContext([entity], {
          useTransactions: true,
          useSoftDelete: false,
        })
      );
      const file = builder.build(entity);

      // Create with transaction
      expect(file.code).toContain('$transaction');
      expect(file.code).toContain('tx.product.create');

      // findAll without soft delete filter
      expect(file.code).toContain('const where = {}');
      expect(file.code).not.toContain('deletedAt: null');

      // findOne with findUnique
      const findOneMatch = file.code.match(/async findOne\([^)]+\)[^{]*{[\s\S]*?^\s{2}}/m);
      expect(findOneMatch?.[0]).toContain('findUnique');

      // No softDelete/restore methods
      expect(file.code).not.toContain('async softDelete(');
      expect(file.code).not.toContain('async restore(');
    });

    it('should handle useTransactions: false and useSoftDelete: false', () => {
      const entity = createEntity('Order');
      const builder = new ServiceBuilder(
        createContext([entity], {
          useTransactions: false,
          useSoftDelete: false,
        })
      );
      const file = builder.build(entity);

      // Create without transaction
      const createMatch = file.code.match(/async create\([^)]+\)[^{]*{[\s\S]*?^\s{2}}/m);
      expect(createMatch?.[0]).not.toContain('$transaction');

      // Update without transaction
      const updateMatch = file.code.match(/async update\([^)]+\)[^{]*{[\s\S]*?^\s{2}}/m);
      expect(updateMatch?.[0]).not.toContain('$transaction');
      expect(updateMatch?.[0]).toContain('try {');

      // findAll without soft delete
      expect(file.code).toContain('const where = {}');

      // findOne with findUnique
      const findOneMatch = file.code.match(/async findOne\([^)]+\)[^{]*{[\s\S]*?^\s{2}}/m);
      expect(findOneMatch?.[0]).toContain('findUnique');
      expect(findOneMatch?.[0]).not.toContain('deletedAt');

      // No softDelete/restore
      expect(file.code).not.toContain('async softDelete(');
      expect(file.code).not.toContain('async restore(');
    });
  });

  describe('generateMethods', () => {
    it('should generate method definitions with transaction flag', () => {
      const entity = createEntity('User');
      const builder = new ServiceBuilder(
        createContext([entity], { useTransactions: true })
      );
      const methods = builder.generateMethods(entity);

      const createMethod = methods.find(m => m.name === 'create');
      expect(createMethod?.usesTransaction).toBe(true);

      const updateMethod = methods.find(m => m.name === 'update');
      expect(updateMethod?.usesTransaction).toBe(true);
    });

    it('should include soft delete methods when enabled', () => {
      const entity = createEntity('User', true);
      const builder = new ServiceBuilder(
        createContext([entity], { useSoftDelete: true })
      );
      const methods = builder.generateMethods(entity);

      expect(methods.length).toBe(7); // 5 CRUD + softDelete + restore
      expect(methods.some(m => m.name === 'softDelete')).toBe(true);
      expect(methods.some(m => m.name === 'restore')).toBe(true);
    });

    it('should not include soft delete methods when disabled', () => {
      const entity = createEntity('User');
      const builder = new ServiceBuilder(
        createContext([entity], { useSoftDelete: false })
      );
      const methods = builder.generateMethods(entity);

      expect(methods.length).toBe(5); // Only CRUD
      expect(methods.some(m => m.name === 'softDelete')).toBe(false);
      expect(methods.some(m => m.name === 'restore')).toBe(false);
    });
  });

  describe('type definitions', () => {
    it('should generate pagination types', () => {
      const entity = createEntity('User');
      const builder = new ServiceBuilder(createContext([entity]));
      const file = builder.build(entity);

      expect(file.code).toContain('interface PaginationOptions');
      expect(file.code).toContain('page: number');
      expect(file.code).toContain('limit: number');
      expect(file.code).toContain('sortBy?: string');
      expect(file.code).toContain("sortOrder?: 'asc' | 'desc'");

      expect(file.code).toContain('interface PaginatedResult<T>');
      expect(file.code).toContain('data: T[]');
      expect(file.code).toContain('meta: {');
      expect(file.code).toContain('total: number');
      expect(file.code).toContain('totalPages: number');
    });

    it('should generate DTO types', () => {
      const entity = createEntity('Product');
      const builder = new ServiceBuilder(createContext([entity]));
      const file = builder.build(entity);

      expect(file.code).toContain('type CreateProductDto');
      expect(file.code).toContain('type UpdateProductDto');
      expect(file.code).toContain('Partial<CreateProductDto>');
    });
  });

  describe('imports', () => {
    it('should import PrismaClient and entity type', () => {
      const entity = createEntity('User');
      const builder = new ServiceBuilder(createContext([entity]));
      const file = builder.build(entity);

      expect(file.code).toContain("import { PrismaClient, User } from '@prisma/client'");
    });
  });

  describe('exports', () => {
    it('should export class and default export', () => {
      const entity = createEntity('User');
      const builder = new ServiceBuilder(createContext([entity]));
      const file = builder.build(entity);

      expect(file.code).toContain('export class UserService');
      expect(file.code).toContain('export default UserService');
    });
  });
});
