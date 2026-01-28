/**
 * Express Generator - Service Builder
 *
 * @epic 14 - Backend Code Generation
 * @task 5.1 - Service Generation
 *
 * @description
 *   Generates service classes with business logic and database operations.
 */

import {
  BuilderContext,
  Entity,
  GeneratedFile,
  ServiceMethod,
} from '../core/types';
import { NameUtils } from '../utils/name-utils';
import { TypeMapper } from '../utils/type-mapper';
import { CodeFormatter } from '../utils/code-formatter';

// ============================================
// SERVICE BUILDER
// ============================================

export class ServiceBuilder {
  private nameUtils: NameUtils;
  private typeMapper: TypeMapper;
  private formatter: CodeFormatter;

  constructor(private context: BuilderContext) {
    this.nameUtils = new NameUtils(context.config.namingConvention);
    this.typeMapper = new TypeMapper(context.config.ormFramework);
    this.formatter = new CodeFormatter(context.config.formatting);
  }

  // ==========================================
  // MAIN BUILD
  // ==========================================

  /**
   * Build service for an entity
   */
  build(entity: Entity): GeneratedFile {
    const serviceName = this.nameUtils.toServiceName(entity.name);
    const fileName = this.nameUtils.toServiceFileName(entity.name);

    const methods = this.generateMethods(entity);
    const code = this.buildServiceCode(entity, methods);

    return {
      name: serviceName,
      fileName,
      filePath: `src/services/${fileName}`,
      code: this.formatter.format(code),
      type: 'service',
      sourceEntityId: entity.id,
      dependencies: ['@prisma/client'],
    };
  }

  /**
   * Build all services
   */
  buildAll(): GeneratedFile[] {
    return this.context.dataModel.entities.map(entity => this.build(entity));
  }

  // ==========================================
  // CODE GENERATION
  // ==========================================

  /**
   * Build complete service code
   */
  private buildServiceCode(entity: Entity, methods: ServiceMethod[]): string {
    const serviceName = this.nameUtils.toServiceName(entity.name);
    const entityName = this.nameUtils.toEntityName(entity.name);
    const modelName = this.nameUtils.toCamelCase(entityName);

    const lines: string[] = [];

    // Imports
    lines.push(this.buildImports(entity));
    lines.push('');

    // Types
    lines.push(this.buildTypes(entity));
    lines.push('');

    // Class definition
    lines.push(`/**`);
    lines.push(` * ${serviceName}`);
    if (entity.description) {
      lines.push(` * ${entity.description}`);
    }
    lines.push(` */`);
    lines.push(`export class ${serviceName} {`);
    lines.push(`  private prisma: PrismaClient;`);
    lines.push('');

    // Constructor
    lines.push(`  constructor(prisma: PrismaClient) {`);
    lines.push(`    this.prisma = prisma;`);
    lines.push('  }');

    // Methods
    lines.push('');
    lines.push(this.buildCreateMethod(entity, modelName));
    lines.push('');
    lines.push(this.buildFindAllMethod(entity, modelName));
    lines.push('');
    lines.push(this.buildFindOneMethod(entity, modelName));
    lines.push('');
    lines.push(this.buildUpdateMethod(entity, modelName));
    lines.push('');
    lines.push(this.buildDeleteMethod(entity, modelName));

    if (this.context.config.useSoftDelete) {
      lines.push('');
      lines.push(this.buildSoftDeleteMethod(entity, modelName));
      lines.push('');
      lines.push(this.buildRestoreMethod(entity, modelName));
    }

    lines.push('}');
    lines.push('');

    // Export default
    lines.push(`export default ${serviceName};`);

    return lines.join('\n');
  }

  /**
   * Build imports
   */
  private buildImports(entity: Entity): string {
    const entityName = this.nameUtils.toEntityName(entity.name);

    const lines: string[] = [];

    lines.push(`import { PrismaClient, ${entityName} } from '@prisma/client';`);

    return lines.join('\n');
  }

  /**
   * Build type definitions
   */
  private buildTypes(entity: Entity): string {
    const entityName = this.nameUtils.toEntityName(entity.name);

    const lines: string[] = [];

    // Pagination types
    lines.push(`export interface PaginationOptions {`);
    lines.push(`  page: number;`);
    lines.push(`  limit: number;`);
    lines.push(`  sortBy?: string;`);
    lines.push(`  sortOrder?: 'asc' | 'desc';`);
    lines.push(`}`);
    lines.push('');

    lines.push(`export interface PaginatedResult<T> {`);
    lines.push(`  data: T[];`);
    lines.push(`  meta: {`);
    lines.push(`    total: number;`);
    lines.push(`    page: number;`);
    lines.push(`    limit: number;`);
    lines.push(`    totalPages: number;`);
    lines.push(`  };`);
    lines.push(`}`);
    lines.push('');

    // Create DTO type
    lines.push(`export type Create${entityName}Dto = Omit<${entityName}, 'id' | 'createdAt' | 'updatedAt'${entity.softDelete ? " | 'deletedAt'" : ''}>;`);
    lines.push('');

    // Update DTO type
    lines.push(`export type Update${entityName}Dto = Partial<Create${entityName}Dto>;`);

    return lines.join('\n');
  }

  // ==========================================
  // SERVICE METHODS
  // ==========================================

  /**
   * Build create method
   */
  private buildCreateMethod(entity: Entity, modelName: string): string {
    const entityName = this.nameUtils.toEntityName(entity.name);
    const lines: string[] = [];

    lines.push(`  /**`);
    lines.push(`   * Create a new ${entityName}`);
    lines.push(`   */`);

    if (this.context.config.useTransactions) {
      lines.push(`  async create(data: Create${entityName}Dto): Promise<${entityName}> {`);
      lines.push(`    return this.prisma.$transaction(async (tx) => {`);
      lines.push(`      return tx.${modelName}.create({`);
      lines.push(`        data,`);
      lines.push(`      });`);
      lines.push(`    });`);
      lines.push(`  }`);
    } else {
      lines.push(`  async create(data: Create${entityName}Dto): Promise<${entityName}> {`);
      lines.push(`    return this.prisma.${modelName}.create({`);
      lines.push(`      data,`);
      lines.push(`    });`);
      lines.push(`  }`);
    }

    return lines.join('\n');
  }

  /**
   * Build findAll method
   */
  private buildFindAllMethod(entity: Entity, modelName: string): string {
    const entityName = this.nameUtils.toEntityName(entity.name);
    const lines: string[] = [];

    lines.push(`  /**`);
    lines.push(`   * Get all ${this.nameUtils.toPlural(entityName)} with pagination`);
    lines.push(`   */`);
    lines.push(`  async findAll(options: PaginationOptions): Promise<PaginatedResult<${entityName}>> {`);
    lines.push(`    const { page, limit, sortBy, sortOrder = 'asc' } = options;`);
    lines.push(`    const skip = (page - 1) * limit;`);
    lines.push('');

    // Build where clause for soft delete
    if (this.context.config.useSoftDelete) {
      lines.push(`    const where = { deletedAt: null };`);
    } else {
      lines.push(`    const where = {};`);
    }
    lines.push('');

    lines.push(`    const [data, total] = await Promise.all([`);
    lines.push(`      this.prisma.${modelName}.findMany({`);
    lines.push(`        where,`);
    lines.push(`        skip,`);
    lines.push(`        take: limit,`);
    lines.push(`        orderBy: sortBy ? { [sortBy]: sortOrder } : undefined,`);
    lines.push(`      }),`);
    lines.push(`      this.prisma.${modelName}.count({ where }),`);
    lines.push(`    ]);`);
    lines.push('');
    lines.push(`    return {`);
    lines.push(`      data,`);
    lines.push(`      meta: {`);
    lines.push(`        total,`);
    lines.push(`        page,`);
    lines.push(`        limit,`);
    lines.push(`        totalPages: Math.ceil(total / limit),`);
    lines.push(`      },`);
    lines.push(`    };`);
    lines.push(`  }`);

    return lines.join('\n');
  }

  /**
   * Build findOne method
   */
  private buildFindOneMethod(entity: Entity, modelName: string): string {
    const entityName = this.nameUtils.toEntityName(entity.name);
    const lines: string[] = [];

    lines.push(`  /**`);
    lines.push(`   * Get a ${entityName} by ID`);
    lines.push(`   */`);
    lines.push(`  async findOne(id: string): Promise<${entityName} | null> {`);

    if (this.context.config.useSoftDelete) {
      lines.push(`    return this.prisma.${modelName}.findFirst({`);
      lines.push(`      where: { id, deletedAt: null },`);
      lines.push(`    });`);
    } else {
      lines.push(`    return this.prisma.${modelName}.findUnique({`);
      lines.push(`      where: { id },`);
      lines.push(`    });`);
    }

    lines.push(`  }`);

    return lines.join('\n');
  }

  /**
   * Build update method
   */
  private buildUpdateMethod(entity: Entity, modelName: string): string {
    const entityName = this.nameUtils.toEntityName(entity.name);
    const lines: string[] = [];

    lines.push(`  /**`);
    lines.push(`   * Update a ${entityName}`);
    lines.push(`   */`);

    if (this.context.config.useTransactions) {
      lines.push(`  async update(id: string, data: Update${entityName}Dto): Promise<${entityName} | null> {`);
      lines.push(`    return this.prisma.$transaction(async (tx) => {`);

      if (this.context.config.useSoftDelete) {
        lines.push(`      const existing = await tx.${modelName}.findFirst({`);
        lines.push(`        where: { id, deletedAt: null },`);
        lines.push(`      });`);
      } else {
        lines.push(`      const existing = await tx.${modelName}.findUnique({`);
        lines.push(`        where: { id },`);
        lines.push(`      });`);
      }

      lines.push('');
      lines.push(`      if (!existing) {`);
      lines.push(`        return null;`);
      lines.push(`      }`);
      lines.push('');
      lines.push(`      return tx.${modelName}.update({`);
      lines.push(`        where: { id },`);
      lines.push(`        data,`);
      lines.push(`      });`);
      lines.push(`    });`);
      lines.push(`  }`);
    } else {
      lines.push(`  async update(id: string, data: Update${entityName}Dto): Promise<${entityName} | null> {`);
      lines.push(`    try {`);
      lines.push(`      return await this.prisma.${modelName}.update({`);
      lines.push(`        where: { id },`);
      lines.push(`        data,`);
      lines.push(`      });`);
      lines.push(`    } catch {`);
      lines.push(`      return null;`);
      lines.push(`    }`);
      lines.push(`  }`);
    }

    return lines.join('\n');
  }

  /**
   * Build delete method
   */
  private buildDeleteMethod(entity: Entity, modelName: string): string {
    const entityName = this.nameUtils.toEntityName(entity.name);
    const lines: string[] = [];

    lines.push(`  /**`);
    lines.push(`   * Delete a ${entityName}`);
    lines.push(`   */`);
    lines.push(`  async delete(id: string): Promise<boolean> {`);
    lines.push(`    try {`);
    lines.push(`      await this.prisma.${modelName}.delete({`);
    lines.push(`        where: { id },`);
    lines.push(`      });`);
    lines.push(`      return true;`);
    lines.push(`    } catch {`);
    lines.push(`      return false;`);
    lines.push(`    }`);
    lines.push(`  }`);

    return lines.join('\n');
  }

  /**
   * Build soft delete method
   */
  private buildSoftDeleteMethod(entity: Entity, modelName: string): string {
    const entityName = this.nameUtils.toEntityName(entity.name);
    const lines: string[] = [];

    lines.push(`  /**`);
    lines.push(`   * Soft delete a ${entityName}`);
    lines.push(`   */`);
    lines.push(`  async softDelete(id: string): Promise<boolean> {`);
    lines.push(`    try {`);
    lines.push(`      await this.prisma.${modelName}.update({`);
    lines.push(`        where: { id },`);
    lines.push(`        data: { deletedAt: new Date() },`);
    lines.push(`      });`);
    lines.push(`      return true;`);
    lines.push(`    } catch {`);
    lines.push(`      return false;`);
    lines.push(`    }`);
    lines.push(`  }`);

    return lines.join('\n');
  }

  /**
   * Build restore method
   */
  private buildRestoreMethod(entity: Entity, modelName: string): string {
    const entityName = this.nameUtils.toEntityName(entity.name);
    const lines: string[] = [];

    lines.push(`  /**`);
    lines.push(`   * Restore a soft deleted ${entityName}`);
    lines.push(`   */`);
    lines.push(`  async restore(id: string): Promise<${entityName} | null> {`);
    lines.push(`    try {`);
    lines.push(`      return await this.prisma.${modelName}.update({`);
    lines.push(`        where: { id },`);
    lines.push(`        data: { deletedAt: null },`);
    lines.push(`      });`);
    lines.push(`    } catch {`);
    lines.push(`      return null;`);
    lines.push(`    }`);
    lines.push(`  }`);

    return lines.join('\n');
  }

  // ==========================================
  // METHOD DEFINITIONS
  // ==========================================

  /**
   * Generate method definitions
   */
  generateMethods(entity: Entity): ServiceMethod[] {
    const entityName = this.nameUtils.toEntityName(entity.name);

    const methods: ServiceMethod[] = [
      {
        name: 'create',
        parameters: [{ name: 'data', type: `Create${entityName}Dto` }],
        returnType: `Promise<${entityName}>`,
        description: `Create a new ${entityName}`,
        usesTransaction: this.context.config.useTransactions,
      },
      {
        name: 'findAll',
        parameters: [{ name: 'options', type: 'PaginationOptions' }],
        returnType: `Promise<PaginatedResult<${entityName}>>`,
        description: `Get all ${this.nameUtils.toPlural(entityName)}`,
      },
      {
        name: 'findOne',
        parameters: [{ name: 'id', type: 'string' }],
        returnType: `Promise<${entityName} | null>`,
        description: `Get a ${entityName} by ID`,
      },
      {
        name: 'update',
        parameters: [
          { name: 'id', type: 'string' },
          { name: 'data', type: `Update${entityName}Dto` },
        ],
        returnType: `Promise<${entityName} | null>`,
        description: `Update a ${entityName}`,
        usesTransaction: this.context.config.useTransactions,
      },
      {
        name: 'delete',
        parameters: [{ name: 'id', type: 'string' }],
        returnType: 'Promise<boolean>',
        description: `Delete a ${entityName}`,
      },
    ];

    if (this.context.config.useSoftDelete) {
      methods.push(
        {
          name: 'softDelete',
          parameters: [{ name: 'id', type: 'string' }],
          returnType: 'Promise<boolean>',
          description: `Soft delete a ${entityName}`,
        },
        {
          name: 'restore',
          parameters: [{ name: 'id', type: 'string' }],
          returnType: `Promise<${entityName} | null>`,
          description: `Restore a soft deleted ${entityName}`,
        }
      );
    }

    return methods;
  }
}

// ============================================
// EXPORTS
// ============================================

export default ServiceBuilder;
