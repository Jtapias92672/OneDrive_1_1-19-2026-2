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

  describe('Relation Generation', () => {
    it('should generate one-to-one relation', () => {
      const entities: Entity[] = [
        {
          id: '1',
          name: 'User',
          fields: [
            { name: 'email', type: 'string', required: true, unique: true },
            {
              name: 'profile',
              type: 'uuid',
              required: false,
              unique: false,
              relation: {
                type: 'one-to-one',
                target: 'Profile',
              },
            },
          ],
          timestamps: false,
          softDelete: false,
        },
        {
          id: '2',
          name: 'Profile',
          fields: [
            { name: 'bio', type: 'text', required: false, unique: false },
          ],
          timestamps: false,
          softDelete: false,
        },
      ];

      const builder = new PrismaBuilder(createContext(entities));
      const schema = builder.build();

      expect(schema).toContain('Profile?');
      expect(schema).toContain('@relation');
    });

    it('should generate many-to-one relation', () => {
      const entities: Entity[] = [
        {
          id: '1',
          name: 'Post',
          fields: [
            { name: 'title', type: 'string', required: true, unique: false },
            {
              name: 'author',
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
          timestamps: false,
          softDelete: false,
        },
      ];

      const builder = new PrismaBuilder(createContext(entities));
      const schema = builder.build();

      expect(schema).toContain('User');
      expect(schema).toContain('@relation');
      expect(schema).toContain('onDelete: CASCADE');
    });

    it('should generate one-to-many relation', () => {
      const entities: Entity[] = [
        {
          id: '1',
          name: 'User',
          fields: [
            { name: 'email', type: 'string', required: true, unique: true },
            {
              name: 'posts',
              type: 'uuid',
              required: false,
              unique: false,
              relation: {
                type: 'one-to-many',
                target: 'Post',
                inverseSide: 'author',
              },
            },
          ],
          timestamps: false,
          softDelete: false,
        },
      ];

      const builder = new PrismaBuilder(createContext(entities));
      const schema = builder.build();

      expect(schema).toContain('Post[]');
    });

    it('should generate many-to-many relation', () => {
      const entities: Entity[] = [
        {
          id: '1',
          name: 'Post',
          fields: [
            { name: 'title', type: 'string', required: true, unique: false },
            {
              name: 'tags',
              type: 'uuid',
              required: false,
              unique: false,
              relation: {
                type: 'many-to-many',
                target: 'Tag',
              },
            },
          ],
          timestamps: false,
          softDelete: false,
        },
      ];

      const builder = new PrismaBuilder(createContext(entities));
      const schema = builder.build();

      expect(schema).toContain('Tag[]');
    });
  });

  describe('Field with Default Values', () => {
    it('should generate field with default value', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [
          { name: 'isActive', type: 'boolean', required: true, unique: false, default: true },
        ],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('@default(true)');
    });

    it('should generate uuid field with default', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [
          { name: 'id', type: 'uuid', required: true, unique: true },
        ],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('@id @default(uuid())');
    });
  });

  describe('Decimal Fields', () => {
    it('should generate decimal field with precision', () => {
      const entity: Entity = {
        id: '1',
        name: 'Product',
        fields: [
          { name: 'price', type: 'decimal', required: true, unique: false },
        ],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('Decimal');
      expect(schema).toContain('@db.Decimal(10, 2)');
    });
  });

  describe('Enum Fields', () => {
    it('should generate enum field referencing existing enum', () => {
      const entities: Entity[] = [
        {
          id: '1',
          name: 'User',
          fields: [
            { name: 'role', type: 'enum', required: true, unique: false, enum: ['ADMIN', 'USER'] },
          ],
          timestamps: false,
          softDelete: false,
        },
      ];

      const enums = [{ name: 'UserRole', values: ['ADMIN', 'USER'] }];

      const builder = new PrismaBuilder(createContext(entities, enums));
      const schema = builder.build();

      expect(schema).toContain('Userrole');
    });

    it('should generate enum field as String when no matching enum', () => {
      const entities: Entity[] = [
        {
          id: '1',
          name: 'User',
          fields: [
            { name: 'status', type: 'enum', required: true, unique: false, enum: ['ACTIVE', 'INACTIVE'] },
          ],
          timestamps: false,
          softDelete: false,
        },
      ];

      const builder = new PrismaBuilder(createContext(entities, []));
      const schema = builder.build();

      expect(schema).toContain('String');
    });
  });

  describe('Column Name Mapping', () => {
    it('should generate column name override when different from default', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [
          // columnName 'custom_name' differs from default conversion
          { name: 'firstName', type: 'string', required: true, unique: false, columnName: 'custom_name' },
        ],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('@map("custom_name")');
    });

    it('should generate column name when explicitly provided and different from auto-generated', () => {
      const entity: Entity = {
        id: '1',
        name: 'User',
        fields: [
          // firstName auto-converts to first_name, so we use user_first_name to be different
          { name: 'firstName', type: 'string', required: true, unique: false, columnName: 'user_first_name' },
        ],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const schema = builder.build();

      expect(schema).toContain('@map("user_first_name")');
    });
  });

  describe('findRelationships', () => {
    it('should find relationships for entity', () => {
      const entities: Entity[] = [
        {
          id: '1',
          name: 'User',
          fields: [{ name: 'email', type: 'string', required: true, unique: true }],
          timestamps: false,
          softDelete: false,
        },
      ];

      const context = createContext(entities);
      context.dataModel.relationships = [
        {
          id: 'r1',
          name: 'UserPosts',
          type: 'one-to-many',
          source: 'User',
          target: 'Post',
          sourceField: 'posts',
          targetField: 'author',
        },
      ];

      const builder = new PrismaBuilder(context);
      const relationships = builder.findRelationships('User');

      expect(relationships).toHaveLength(1);
      expect(relationships[0].name).toBe('UserPosts');
    });
  });

  describe('Foreign Key Generation', () => {
    it('should generate foreign key fields for relations', () => {
      const entity: Entity = {
        id: '1',
        name: 'Post',
        fields: [
          { name: 'title', type: 'string', required: true, unique: false },
          {
            name: 'author',
            type: 'uuid',
            required: true,
            unique: false,
            relation: {
              type: 'many-to-one',
              target: 'User',
            },
          },
        ],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const fkFields = builder.generateForeignKeyFields(entity);

      expect(fkFields).toHaveLength(1);
      expect(fkFields[0].name).toBe('user_id');
      expect(fkFields[0].type).toBe('uuid');
    });

    it('should not duplicate existing foreign key field', () => {
      const entity: Entity = {
        id: '1',
        name: 'Post',
        fields: [
          { name: 'title', type: 'string', required: true, unique: false },
          { name: 'user_id', type: 'uuid', required: true, unique: false },
          {
            name: 'author',
            type: 'uuid',
            required: true,
            unique: false,
            relation: {
              type: 'many-to-one',
              target: 'User',
            },
          },
        ],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const fkFields = builder.generateForeignKeyFields(entity);

      expect(fkFields).toHaveLength(0);
    });

    it('should generate unique foreign key for one-to-one relation', () => {
      const entity: Entity = {
        id: '1',
        name: 'Profile',
        fields: [
          { name: 'bio', type: 'text', required: false, unique: false },
          {
            name: 'user',
            type: 'uuid',
            required: true,
            unique: false,
            relation: {
              type: 'one-to-one',
              target: 'User',
            },
          },
        ],
        timestamps: false,
        softDelete: false,
      };

      const builder = new PrismaBuilder(createContext([entity]));
      const fkFields = builder.generateForeignKeyFields(entity);

      expect(fkFields).toHaveLength(1);
      expect(fkFields[0].unique).toBe(true);
    });
  });
});
