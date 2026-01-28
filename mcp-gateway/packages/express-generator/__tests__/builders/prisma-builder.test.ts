/**
 * Prisma Builder Tests
 * Epic 14: Backend Code Generation
 */

import { PrismaBuilder } from '../../src/builders/prisma-builder';
import { BuilderContext, ParsedDataModel, Entity } from '../../src/core/types';
import { DEFAULT_CONFIG } from '../../src/core/config';

describe('PrismaBuilder', () => {
  const createContext = (entities: Entity[] = [], enums: ParsedDataModel['enums'] = []): BuilderContext => {
    const entityMap = new Map<string, Entity>();
    entities.forEach(e => entityMap.set(e.name, e));

    return {
      config: DEFAULT_CONFIG,
      dataModel: {
        version: '1.0',
        metadata: { name: 'Test', createdAt: new Date().toISOString() },
        entities,
        relationships: [],
        enums,
      },
      entityMap,
      generatedTypes: new Map(),
    };
  };

  describe('Generator and Datasource', () => {
    it('should generate generator block', () => {
      const builder = new PrismaBuilder(createContext());
      const generator = builder.buildGenerator();

      expect(generator).toContain('generator client');
      expect(generator).toContain('provider = "prisma-client-js"');
    });

    it('should generate datasource block', () => {
      const builder = new PrismaBuilder(createContext());
      const datasource = builder.buildDatasource();

      expect(datasource).toContain('datasource db');
      expect(datasource).toContain('provider = "postgresql"');
      expect(datasource).toContain('env("DATABASE_URL")');
    });
  });

  describe('Model Generation', () => {
    it('should generate basic model', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [
          { name: 'email', type: 'string', required: true, unique: true },
        ],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('model User');
      expect(schema).toContain('email');
    });

    it('should generate id field if not present', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [
          { name: 'name', type: 'string', required: true, unique: false },
        ],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('id        String   @id @default(uuid())');
    });

    it('should generate timestamp fields', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [{ name: 'name', type: 'string', required: true, unique: false }],
        timestamps: true,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('createdAt DateTime @default(now())');
      expect(schema).toContain('updatedAt DateTime @updatedAt');
    });

    it('should generate soft delete field', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [{ name: 'name', type: 'string', required: true, unique: false }],
        timestamps: false,
        softDelete: true,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('deletedAt DateTime?');
    });

    it('should generate description comment', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        description: 'User entity description',
        fields: [{ name: 'name', type: 'string', required: true, unique: false }],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('/// User entity description');
    });

    it('should generate table name mapping', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        tableName: 'app_users',
        fields: [{ name: 'name', type: 'string', required: true, unique: false }],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('@@map("app_users")');
    });
  });

  describe('Field Generation', () => {
    it('should generate required field', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [{ name: 'email', type: 'string', required: true, unique: false }],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toMatch(/email\s+String/);
    });

    it('should generate optional field', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [{ name: 'bio', type: 'text', required: false, unique: false }],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('String?');
    });

    it('should generate unique field', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [{ name: 'email', type: 'string', required: true, unique: true }],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('@unique');
    });

    it('should generate field types correctly', () => {
      const entity: Entity = {
        id: '1',
        name: 'Test',
        fields: [
          { name: 'stringField', type: 'string', required: true, unique: false },
          { name: 'intField', type: 'int', required: true, unique: false },
          { name: 'floatField', type: 'float', required: true, unique: false },
          { name: 'boolField', type: 'boolean', required: true, unique: false },
          { name: 'dateField', type: 'datetime', required: true, unique: false },
          { name: 'jsonField', type: 'json', required: true, unique: false },
        ],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('String');
      expect(schema).toContain('Int');
      expect(schema).toContain('Float');
      expect(schema).toContain('Boolean');
      expect(schema).toContain('DateTime');
      expect(schema).toContain('Json');
    });

    it('should generate text field with @db.Text', () => {
      const entity: Entity = {
        id: '1',
        name: 'Post',
        fields: [{ name: 'content', type: 'text', required: true, unique: false }],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('@db.Text');
    });

    it('should generate varchar with length', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [{ name: 'email', type: 'string', required: true, unique: false, maxLength: 255 }],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('@db.VarChar(255)');
    });
  });

  describe('Enum Generation', () => {
    it('should generate enum', () => {
      const enums = [
        { name: 'UserRole', values: ['ADMIN', 'USER', 'GUEST'] },
      ];

      const builder = new PrismaBuilder(createContext([], enums));
      const schema = builder.build();

      expect(schema).toContain('enum Userrole');
      expect(schema).toContain('ADMIN');
      expect(schema).toContain('USER');
      expect(schema).toContain('GUEST');
    });

    it('should generate enum with description', () => {
      const enums = [
        { name: 'Status', values: ['ACTIVE', 'INACTIVE'], description: 'Status enum' },
      ];

      const builder = new PrismaBuilder(createContext([], enums));
      const schema = builder.build();

      expect(schema).toContain('/// Status enum');
    });
  });

  describe('Index Generation', () => {
    it('should generate simple index', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [{ name: 'email', type: 'string', required: true, unique: false }],
        indexes: [{ fields: ['email'], unique: false }],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('@@index([email])');
    });

    it('should generate unique index', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [
          { name: 'email', type: 'string', required: true, unique: false },
          { name: 'tenantId', type: 'string', required: true, unique: false },
        ],
        indexes: [{ fields: ['email', 'tenantId'], unique: true }],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('@@unique([email, tenantid])');
    });

    it('should generate named index', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [{ name: 'createdAt', type: 'datetime', required: true, unique: false }],
        indexes: [{ name: 'idx_user_created', fields: ['createdAt'], unique: false }],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('name: "idx_user_created"');
    });
  });

  describe('Complete Schema', () => {
    it('should generate complete schema with all parts', () => {
      const entities: Entity[] = [
        {
          id: '1',
          name: 'User',
          description: 'User model',
          fields: [
            { name: 'email', type: 'string', required: true, unique: true },
            { name: 'name', type: 'string', required: true, unique: false },
          ],
          timestamps: true,
          softDelete: true,
        },
        {
          id: '2',
          name: 'Post',
          fields: [
            { name: 'title', type: 'string', required: true, unique: false },
            { name: 'content', type: 'text', required: false, unique: false },
          ],
          timestamps: true,
          softDelete: false,
        },
      ];

      const enums = [{ name: 'Status', values: ['DRAFT', 'PUBLISHED'] }];

      const builder = new PrismaBuilder(createContext(entities, enums));
      const schema = builder.build();

      // Check structure
      expect(schema).toContain('generator client');
      expect(schema).toContain('datasource db');
      expect(schema).toContain('enum Status');
      expect(schema).toContain('model User');
      expect(schema).toContain('model Post');
    });
  });
});
