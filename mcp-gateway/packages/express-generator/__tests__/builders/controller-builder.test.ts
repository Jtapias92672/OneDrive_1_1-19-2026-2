/**
 * Controller Builder Functional Verification Tests
 * Epic 14: Backend Code Generation
 *
 * Verifies CAPABILITIES, not coverage percentages:
 * 1. Non-Zod validation produces correct code
 * 2. Hard delete produces correct code
 */

import { ControllerBuilder } from '../../src/builders/controller-builder';
import { BuilderContext, Entity } from '../../src/core/types';
import { DEFAULT_CONFIG, createConfig } from '../../src/core/config';

describe('ControllerBuilder Functional Verification', () => {
  const createEntity = (name: string): Entity => ({
    id: `entity-${name.toLowerCase()}`,
    name,
    tableName: name.toLowerCase(),
    description: `Test ${name} entity`,
    fields: [
      { name: 'id', type: 'string', required: true, unique: true },
      { name: 'name', type: 'string', required: true, unique: false },
    ],
    timestamps: true,
    softDelete: false,
  });

  const createContext = (
    entities: Entity[],
    overrides: Partial<typeof DEFAULT_CONFIG> = {}
  ): BuilderContext => {
    return {
      config: createConfig(overrides),
      dataModel: {
        version: '1.0',
        metadata: { name: 'Test', createdAt: new Date().toISOString() },
        entities,
        relationships: [],
        enums: [],
      },
      entityMap: new Map(entities.map(e => [e.id, e])),
      generatedTypes: new Map(),
    };
  };

  describe('Capability 1: Non-Zod Validation', () => {
    it('should generate direct req.body usage when validationLibrary is joi', () => {
      const entity = createEntity('User');
      const builder = new ControllerBuilder(
        createContext([entity], { validationLibrary: 'joi' })
      );
      const file = builder.build(entity);

      // FUNCTIONAL VERIFICATION: Code uses req.body directly (not zod)
      expect(file.code).toContain('.create(req.body)');
      expect(file.code).not.toContain('.parse(req.body)');
      expect(file.code).not.toContain('Schema.parse');
    });

    it('should generate direct req.body in update when validationLibrary is joi', () => {
      const entity = createEntity('Product');
      const builder = new ControllerBuilder(
        createContext([entity], { validationLibrary: 'joi' })
      );
      const file = builder.build(entity);

      // FUNCTIONAL VERIFICATION: update uses req.body directly (not zod)
      expect(file.code).toContain('.update(id, req.body)');
      expect(file.code).not.toContain('updateProductSchema.parse');
    });

    it('should generate schema validation when validationLibrary is zod', () => {
      const entity = createEntity('Order');
      const builder = new ControllerBuilder(
        createContext([entity], { validationLibrary: 'zod' })
      );
      const file = builder.build(entity);

      // FUNCTIONAL VERIFICATION: Code uses zod schema
      expect(file.code).toContain('Schema.parse(req.body)');
      expect(file.code).toContain('const validated =');
    });
  });

  describe('Capability 2: Hard Delete', () => {
    it('should generate .delete() call when useSoftDelete is false', () => {
      const entity = createEntity('User');
      const builder = new ControllerBuilder(
        createContext([entity], { useSoftDelete: false })
      );
      const file = builder.build(entity);

      // FUNCTIONAL VERIFICATION: Code calls delete, not softDelete
      expect(file.code).toContain('.delete(id)');
      expect(file.code).not.toContain('.softDelete(id)');
    });

    it('should generate .softDelete() call when useSoftDelete is true', () => {
      const entity = createEntity('Product');
      const builder = new ControllerBuilder(
        createContext([entity], { useSoftDelete: true })
      );
      const file = builder.build(entity);

      // FUNCTIONAL VERIFICATION: Code calls softDelete
      expect(file.code).toContain('.softDelete(id)');
      expect(file.code).not.toMatch(/\.delete\(id\)[^a-zA-Z]/); // .delete(id) not followed by letter
    });
  });

  describe('Combined Configuration', () => {
    it('should handle validationLibrary: none + useSoftDelete: false', () => {
      const entity = createEntity('Item');
      const builder = new ControllerBuilder(
        createContext([entity], {
          validationLibrary: 'joi',
          useSoftDelete: false,
        })
      );
      const file = builder.build(entity);

      // Both capabilities verified
      expect(file.code).toContain('.create(req.body)');
      expect(file.code).toContain('.update(id, req.body)');
      expect(file.code).toContain('.delete(id)');
      expect(file.code).not.toContain('.parse(req.body)');
      expect(file.code).not.toContain('.softDelete(id)');
    });

    it('should handle validationLibrary: zod + useSoftDelete: true', () => {
      const entity = createEntity('Record');
      const builder = new ControllerBuilder(
        createContext([entity], {
          validationLibrary: 'zod',
          useSoftDelete: true,
        })
      );
      const file = builder.build(entity);

      // Both capabilities verified (opposite config)
      expect(file.code).toContain('Schema.parse(req.body)');
      expect(file.code).toContain('.softDelete(id)');
    });
  });

  describe('Generated Code Structure', () => {
    it('should generate valid controller class', () => {
      const entity = createEntity('User');
      const builder = new ControllerBuilder(createContext([entity]));
      const file = builder.build(entity);

      expect(file.name).toBe('UserController');
      expect(file.fileName).toBe('user.controller.ts');
      expect(file.type).toBe('controller');
      expect(file.code).toContain('export class UserController');
      expect(file.code).toContain('create = async (');
      expect(file.code).toContain('findAll = async (');
      expect(file.code).toContain('findOne = async (');
      expect(file.code).toContain('update = async (');
      expect(file.code).toContain('delete = async (');
    });
  });
});
