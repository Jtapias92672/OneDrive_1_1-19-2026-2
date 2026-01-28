/**
 * Express Generator Tests
 * Epic 14: Backend Code Generation
 */

import { ExpressGenerator } from '../../src/generator/express-generator';
import { ParsedDataModel, Entity } from '../../src/core/types';

describe('ExpressGenerator', () => {
  const createMinimalDataModel = (): ParsedDataModel => ({
    version: '1.0',
    metadata: {
      name: 'TestApp',
      description: 'Test application',
      createdAt: new Date().toISOString(),
    },
    entities: [
      {
        id: 'user-entity',
        name: 'User',
        description: 'User entity',
        fields: [
          { name: 'email', type: 'string', required: true, unique: true },
          { name: 'name', type: 'string', required: true, unique: false },
        ],
        timestamps: true,
        softDelete: true,
      },
    ],
    relationships: [],
    enums: [],
  });

  const createCompleteDataModel = (): ParsedDataModel => ({
    version: '1.0',
    metadata: {
      name: 'ECommerceApp',
      description: 'E-commerce application',
      author: 'Test Author',
      createdAt: new Date().toISOString(),
    },
    entities: [
      {
        id: 'user-entity',
        name: 'User',
        description: 'User entity',
        fields: [
          { name: 'email', type: 'string', required: true, unique: true, maxLength: 255 },
          { name: 'name', type: 'string', required: true, unique: false },
          { name: 'role', type: 'enum', required: true, unique: false, enum: ['ADMIN', 'USER'] },
        ],
        timestamps: true,
        softDelete: true,
        indexes: [{ fields: ['email'], unique: true }],
      },
      {
        id: 'product-entity',
        name: 'Product',
        description: 'Product entity',
        tableName: 'products',
        fields: [
          { name: 'name', type: 'string', required: true, unique: false },
          { name: 'price', type: 'decimal', required: true, unique: false, min: 0 },
          { name: 'description', type: 'text', required: false, unique: false },
          { name: 'inStock', type: 'boolean', required: true, unique: false, default: true },
        ],
        timestamps: true,
        softDelete: false,
      },
      {
        id: 'order-entity',
        name: 'Order',
        description: 'Order entity',
        fields: [
          { name: 'total', type: 'decimal', required: true, unique: false },
          { name: 'status', type: 'enum', required: true, unique: false, enum: ['PENDING', 'COMPLETED', 'CANCELLED'] },
          {
            name: 'user',
            type: 'uuid',
            required: true,
            unique: false,
            relation: {
              type: 'many-to-one',
              target: 'User',
              onDelete: 'CASCADE',
            },
          },
        ],
        timestamps: true,
        softDelete: true,
      },
    ],
    relationships: [
      {
        id: 'user-orders',
        name: 'UserOrders',
        type: 'one-to-many',
        source: 'User',
        target: 'Order',
        sourceField: 'orders',
        targetField: 'user',
      },
    ],
    enums: [
      { name: 'UserRole', values: ['ADMIN', 'USER'], description: 'User roles' },
      { name: 'OrderStatus', values: ['PENDING', 'COMPLETED', 'CANCELLED'] },
    ],
  });

  describe('Basic Generation', () => {
    it('should generate from minimal data model', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      expect(result.errors).toHaveLength(0);
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.prismaSchema).toBeTruthy();
    });

    it('should generate from complete data model', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createCompleteDataModel());

      expect(result.errors).toHaveLength(0);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('should generate app file', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      expect(result.appFile).toBeTruthy();
      expect(result.appFile).toContain('express');
      expect(result.appFile).toContain('PrismaClient');
    });

    it('should generate routes index', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      expect(result.routesIndex).toBeTruthy();
      expect(result.routesIndex).toContain('Router');
    });
  });

  describe('Prisma Schema Generation', () => {
    it('should generate valid Prisma schema', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      expect(result.prismaSchema).toContain('generator client');
      expect(result.prismaSchema).toContain('datasource db');
      expect(result.prismaSchema).toContain('model User');
    });

    it('should include fields in Prisma schema', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      expect(result.prismaSchema).toContain('email');
      expect(result.prismaSchema).toContain('name');
      expect(result.prismaSchema).toContain('createdAt');
      expect(result.prismaSchema).toContain('updatedAt');
      expect(result.prismaSchema).toContain('deletedAt');
    });

    it('should generate enums in Prisma schema', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createCompleteDataModel());

      expect(result.prismaSchema).toContain('enum Userrole');
      expect(result.prismaSchema).toContain('ADMIN');
      expect(result.prismaSchema).toContain('USER');
    });
  });

  describe('Controller Generation', () => {
    it('should generate controllers', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      const controllerFile = result.files.find(f => f.type === 'controller');
      expect(controllerFile).toBeTruthy();
      expect(controllerFile?.code).toContain('UserController');
    });

    it('should generate CRUD methods', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      const controllerFile = result.files.find(f => f.type === 'controller');
      expect(controllerFile?.code).toContain('create');
      expect(controllerFile?.code).toContain('findAll');
      expect(controllerFile?.code).toContain('findOne');
      expect(controllerFile?.code).toContain('update');
      expect(controllerFile?.code).toContain('delete');
    });
  });

  describe('Service Generation', () => {
    it('should generate services', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      const serviceFile = result.files.find(f => f.type === 'service');
      expect(serviceFile).toBeTruthy();
      expect(serviceFile?.code).toContain('UserService');
    });

    it('should include soft delete methods when enabled', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      const serviceFile = result.files.find(f => f.type === 'service');
      expect(serviceFile?.code).toContain('softDelete');
      expect(serviceFile?.code).toContain('restore');
    });
  });

  describe('Route Generation', () => {
    it('should generate routes', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      const routeFiles = result.files.filter(f => f.type === 'route');
      expect(routeFiles.length).toBeGreaterThan(0);
    });

    it('should generate routes index', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      const routeIndex = result.files.find(f => f.filePath.includes('routes/index'));
      expect(routeIndex).toBeTruthy();
      expect(routeIndex?.code).toContain('createRoutes');
    });
  });

  describe('Middleware Generation', () => {
    it('should generate middleware', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      const middlewareFiles = result.files.filter(f => f.type === 'middleware');
      expect(middlewareFiles.length).toBeGreaterThan(0);
    });

    it('should generate auth middleware for JWT', () => {
      const generator = new ExpressGenerator({ authMethod: 'jwt' });
      const result = generator.generate(createMinimalDataModel());

      const authFile = result.files.find(f => f.fileName === 'auth.ts');
      expect(authFile).toBeTruthy();
      expect(authFile?.code).toContain('jwt');
    });

    it('should generate validation middleware', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      const validationFile = result.files.find(f => f.fileName === 'validation.ts');
      expect(validationFile).toBeTruthy();
    });

    it('should generate error handler', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      const errorFile = result.files.find(f => f.fileName === 'error-handler.ts');
      expect(errorFile).toBeTruthy();
      expect(errorFile?.code).toContain('errorHandler');
    });
  });

  describe('Configuration', () => {
    it('should respect generateControllers option', () => {
      const generator = new ExpressGenerator({ generateControllers: false });
      const result = generator.generate(createMinimalDataModel());

      const controllerFile = result.files.find(f => f.type === 'controller');
      expect(controllerFile).toBeFalsy();
    });

    it('should respect generateServices option', () => {
      const generator = new ExpressGenerator({ generateServices: false });
      const result = generator.generate(createMinimalDataModel());

      const serviceFile = result.files.find(f => f.type === 'service');
      expect(serviceFile).toBeFalsy();
    });

    it('should respect generateMiddleware option', () => {
      const generator = new ExpressGenerator({ generateMiddleware: false });
      const result = generator.generate(createMinimalDataModel());

      const middlewareFiles = result.files.filter(f => f.type === 'middleware');
      expect(middlewareFiles).toHaveLength(0);
    });

    it('should get and set config', () => {
      const generator = new ExpressGenerator();
      expect(generator.getConfig().ormFramework).toBe('prisma');

      generator.setConfig({ ormFramework: 'typeorm' });
      expect(generator.getConfig().ormFramework).toBe('typeorm');
    });
  });

  describe('Validation', () => {
    it('should validate empty entities', () => {
      const generator = new ExpressGenerator();
      const dataModel: ParsedDataModel = {
        ...createMinimalDataModel(),
        entities: [],
      };

      const result = generator.generate(dataModel);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('at least one entity');
    });

    it('should validate entity without name', () => {
      const generator = new ExpressGenerator();
      const dataModel: ParsedDataModel = {
        ...createMinimalDataModel(),
        entities: [{ id: '1', name: '', fields: [], timestamps: false, softDelete: false }],
      };

      const result = generator.generate(dataModel);
      expect(result.errors.some(e => e.message.includes('must have a name'))).toBe(true);
    });

    it('should validate entity without fields', () => {
      const generator = new ExpressGenerator();
      const dataModel: ParsedDataModel = {
        ...createMinimalDataModel(),
        entities: [{ id: '1', name: 'Empty', fields: [], timestamps: false, softDelete: false }],
      };

      const result = generator.generate(dataModel);
      expect(result.errors.some(e => e.message.includes('at least one field'))).toBe(true);
    });

    it('should validate field without type', () => {
      const generator = new ExpressGenerator();
      const dataModel: ParsedDataModel = {
        ...createMinimalDataModel(),
        entities: [{
          id: '1',
          name: 'Test',
          fields: [{ name: 'field', type: '' as any, required: true, unique: false }],
          timestamps: false,
          softDelete: false,
        }],
      };

      const result = generator.generate(dataModel);
      expect(result.errors.some(e => e.message.includes('must have a type'))).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should calculate stats correctly', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      expect(result.stats.totalFiles).toBeGreaterThan(0);
      expect(result.stats.controllers).toBeGreaterThanOrEqual(1);
      expect(result.stats.services).toBeGreaterThanOrEqual(1);
      expect(result.stats.routes).toBeGreaterThanOrEqual(1);
      expect(result.stats.linesOfCode).toBeGreaterThan(0);
      expect(result.stats.generationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should count files by type', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createCompleteDataModel());

      expect(result.stats.controllers).toBe(3); // User, Product, Order
      expect(result.stats.services).toBe(3);
    });
  });

  describe('Warnings', () => {
    it('should warn about missing timestamps', () => {
      const generator = new ExpressGenerator();
      const dataModel: ParsedDataModel = {
        ...createMinimalDataModel(),
        entities: [{
          id: '1',
          name: 'NoTimestamp',
          fields: [{ name: 'data', type: 'string', required: true, unique: false }],
          timestamps: false,
          softDelete: false,
        }],
      };

      const result = generator.generate(dataModel);
      expect(result.warnings.some(w => w.message.includes('timestamps'))).toBe(true);
    });
  });

  describe('Multiple Entities', () => {
    it('should generate files for all entities', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createCompleteDataModel());

      const controllerFiles = result.files.filter(f => f.type === 'controller');
      expect(controllerFiles).toHaveLength(3);

      expect(controllerFiles.some(f => f.code.includes('UserController'))).toBe(true);
      expect(controllerFiles.some(f => f.code.includes('ProductController'))).toBe(true);
      expect(controllerFiles.some(f => f.code.includes('OrderController'))).toBe(true);
    });
  });

  describe('File Paths', () => {
    it('should set correct file paths', () => {
      const generator = new ExpressGenerator();
      const result = generator.generate(createMinimalDataModel());

      const controllerFile = result.files.find(f => f.type === 'controller');
      expect(controllerFile?.filePath).toMatch(/^src\/controllers\//);

      const serviceFile = result.files.find(f => f.type === 'service');
      expect(serviceFile?.filePath).toMatch(/^src\/services\//);

      const routeFile = result.files.find(f => f.type === 'route' && !f.filePath.includes('index'));
      expect(routeFile?.filePath).toMatch(/^src\/routes\//);
    });
  });
});
