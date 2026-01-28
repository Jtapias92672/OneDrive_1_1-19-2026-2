/**
 * Express Generator - Prisma Schema Builder
 *
 * @epic 14 - Backend Code Generation
 * @task 3.1 - Prisma Schema Generation
 *
 * @description
 *   Generates Prisma schema files from data model definitions.
 */

import {
  BuilderContext,
  Entity,
  EntityField,
  EnumDefinition,
  Relationship,
  RelationConfig,
} from '../core/types';
import { NameUtils } from '../utils/name-utils';
import { TypeMapper } from '../utils/type-mapper';
import { CodeFormatter } from '../utils/code-formatter';

// ============================================
// PRISMA BUILDER
// ============================================

export class PrismaBuilder {
  private nameUtils: NameUtils;
  private typeMapper: TypeMapper;
  private formatter: CodeFormatter;

  constructor(private context: BuilderContext) {
    this.nameUtils = new NameUtils(context.config.namingConvention);
    this.typeMapper = new TypeMapper('prisma');
    this.formatter = new CodeFormatter(context.config.formatting);
  }

  // ==========================================
  // MAIN BUILD
  // ==========================================

  /**
   * Build complete Prisma schema
   */
  build(): string {
    const parts: string[] = [];

    // Generator and datasource
    parts.push(this.buildGenerator());
    parts.push(this.buildDatasource());

    // Enums
    for (const enumDef of this.context.dataModel.enums) {
      parts.push(this.buildEnum(enumDef));
    }

    // Models
    for (const entity of this.context.dataModel.entities) {
      parts.push(this.buildModel(entity));
    }

    return this.formatter.formatPrisma(parts.join('\n\n'));
  }

  // ==========================================
  // GENERATOR & DATASOURCE
  // ==========================================

  /**
   * Build generator block
   */
  buildGenerator(): string {
    return `generator client {
  provider = "prisma-client-js"
}`;
  }

  /**
   * Build datasource block
   */
  buildDatasource(): string {
    return `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`;
  }

  // ==========================================
  // ENUM BUILDING
  // ==========================================

  /**
   * Build enum definition
   */
  buildEnum(enumDef: EnumDefinition): string {
    const name = this.nameUtils.toEntityName(enumDef.name);
    const values = enumDef.values.map(v => `  ${v}`).join('\n');

    let result = '';
    if (enumDef.description) {
      result += `/// ${enumDef.description}\n`;
    }
    result += `enum ${name} {\n${values}\n}`;

    return result;
  }

  // ==========================================
  // MODEL BUILDING
  // ==========================================

  /**
   * Build model definition
   */
  buildModel(entity: Entity): string {
    const modelName = this.nameUtils.toEntityName(entity.name);
    const lines: string[] = [];

    // Model documentation
    if (entity.description) {
      lines.push(`/// ${entity.description}`);
    }
    lines.push(`model ${modelName} {`);

    // ID field (if not defined)
    const hasIdField = entity.fields.some(f => f.name === 'id');
    if (!hasIdField) {
      lines.push('  id        String   @id @default(uuid())');
    }

    // Regular fields
    for (const field of entity.fields) {
      lines.push('  ' + this.buildField(field, entity));
    }

    // Timestamp fields
    if (entity.timestamps) {
      lines.push('  createdAt DateTime @default(now())');
      lines.push('  updatedAt DateTime @updatedAt');
    }

    // Soft delete field
    if (entity.softDelete) {
      lines.push('  deletedAt DateTime?');
    }

    // Indexes
    if (entity.indexes && entity.indexes.length > 0) {
      lines.push('');
      for (const index of entity.indexes) {
        lines.push('  ' + this.buildIndex(index, entity));
      }
    }

    // Table name override
    if (entity.tableName) {
      lines.push('');
      lines.push(`  @@map("${entity.tableName}")`);
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Build field definition
   */
  buildField(field: EntityField, entity: Entity): string {
    const parts: string[] = [];

    // Field name
    const fieldName = this.nameUtils.toPropertyName(field.name);
    parts.push(fieldName.padEnd(10));

    // Field type
    if (field.relation) {
      parts.push(this.buildRelationType(field, entity));
    } else {
      parts.push(this.buildScalarType(field));
    }

    // Column name override
    if (field.columnName && field.columnName !== this.nameUtils.toColumnName(field.name)) {
      parts.push(`@map("${field.columnName}")`);
    }

    return parts.join(' ').trimEnd();
  }

  /**
   * Build scalar type with modifiers
   */
  buildScalarType(field: EntityField): string {
    let type: string;

    // Handle enums
    if (field.type === 'enum' && field.enum && field.enum.length > 0) {
      // Check if there's a matching enum definition
      const enumDef = this.context.dataModel.enums.find(e =>
        e.values.some(v => field.enum!.includes(v))
      );
      type = enumDef ? this.nameUtils.toEntityName(enumDef.name) : 'String';
    } else {
      type = this.typeMapper.toPrismaType(field.type);
    }

    // Optional modifier
    if (!field.required) {
      type += '?';
    }

    // Build attributes
    const attributes: string[] = [];

    // Unique
    if (field.unique) {
      attributes.push('@unique');
    }

    // Default value
    if (field.default !== undefined) {
      const defaultVal = this.typeMapper.getPrismaDefault(field.type, field.default);
      if (defaultVal) {
        attributes.push(`@default(${defaultVal})`);
      }
    } else if (field.type === 'uuid' && field.name === 'id') {
      attributes.push('@id @default(uuid())');
    }

    // String length
    if (field.maxLength && (field.type === 'string' || field.type === 'text')) {
      attributes.push(`@db.VarChar(${field.maxLength})`);
    }

    // Text type for long strings
    if (field.type === 'text') {
      attributes.push('@db.Text');
    }

    // Decimal precision
    if (field.type === 'decimal') {
      attributes.push('@db.Decimal(10, 2)');
    }

    const attrStr = attributes.length > 0 ? ' ' + attributes.join(' ') : '';
    return type.padEnd(10) + attrStr;
  }

  /**
   * Build relation type
   */
  buildRelationType(field: EntityField, entity: Entity): string {
    const relation = field.relation!;
    const targetName = this.nameUtils.toEntityName(relation.target);

    let type: string;
    let attributes = '';

    switch (relation.type) {
      case 'one-to-one':
        type = field.required ? targetName : `${targetName}?`;
        attributes = this.buildRelationAttribute(field, entity, relation);
        break;

      case 'many-to-one':
        type = field.required ? targetName : `${targetName}?`;
        attributes = this.buildRelationAttribute(field, entity, relation);
        break;

      case 'one-to-many':
        type = `${targetName}[]`;
        if (relation.inverseSide) {
          attributes = `@relation("${this.nameUtils.toEntityName(entity.name)}${targetName}")`;
        }
        break;

      case 'many-to-many':
        type = `${targetName}[]`;
        break;

      default:
        type = targetName;
    }

    return type.padEnd(10) + (attributes ? ' ' + attributes : '');
  }

  /**
   * Build @relation attribute
   */
  buildRelationAttribute(field: EntityField, entity: Entity, relation: RelationConfig): string {
    const parts: string[] = [];

    // Relation name for disambiguation
    const relationName = `${this.nameUtils.toEntityName(entity.name)}${this.nameUtils.toEntityName(relation.target)}`;
    parts.push(`"${relationName}"`);

    // Foreign key field
    const fkField = this.nameUtils.toForeignKeyName(relation.target);
    parts.push(`fields: [${fkField}]`);

    // Reference field
    parts.push('references: [id]');

    // On delete action
    if (relation.onDelete) {
      parts.push(`onDelete: ${relation.onDelete}`);
    }

    return `@relation(${parts.join(', ')})`;
  }

  /**
   * Build index definition
   */
  buildIndex(
    index: { name?: string; fields: string[]; unique: boolean },
    entity: Entity
  ): string {
    const fields = index.fields.map(f => this.nameUtils.toPropertyName(f)).join(', ');

    if (index.unique) {
      return `@@unique([${fields}])`;
    }

    if (index.name) {
      return `@@index([${fields}], name: "${index.name}")`;
    }

    return `@@index([${fields}])`;
  }

  // ==========================================
  // RELATIONSHIP HELPERS
  // ==========================================

  /**
   * Find relationships for an entity
   */
  findRelationships(entityName: string): Relationship[] {
    return this.context.dataModel.relationships.filter(
      r => r.source === entityName || r.target === entityName
    );
  }

  /**
   * Check if entity has foreign key for relationship
   */
  private needsForeignKey(entity: Entity, relation: RelationConfig): boolean {
    return relation.type === 'one-to-one' || relation.type === 'many-to-one';
  }

  // ==========================================
  // SCHEMA PARTS
  // ==========================================

  /**
   * Generate foreign key fields for relations
   */
  generateForeignKeyFields(entity: Entity): EntityField[] {
    const fkFields: EntityField[] = [];

    for (const field of entity.fields) {
      if (field.relation && this.needsForeignKey(entity, field.relation)) {
        const fkFieldName = this.nameUtils.toForeignKeyName(field.relation.target);

        // Check if FK field already exists
        const existingFk = entity.fields.find(f => f.name === fkFieldName);
        if (!existingFk) {
          fkFields.push({
            name: fkFieldName,
            type: 'uuid',
            required: field.required,
            unique: field.relation.type === 'one-to-one',
          });
        }
      }
    }

    return fkFields;
  }
}

// ============================================
// EXPORTS
// ============================================

export default PrismaBuilder;
