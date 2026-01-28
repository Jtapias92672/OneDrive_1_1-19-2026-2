/**
 * Express Generator - Controller Builder
 *
 * @epic 14 - Backend Code Generation
 * @task 4.1 - Controller Generation
 *
 * @description
 *   Generates Express controller classes with CRUD operations.
 */

import {
  BuilderContext,
  Entity,
  GeneratedFile,
  ControllerMethod,
} from '../core/types';
import { NameUtils } from '../utils/name-utils';
import { TypeMapper } from '../utils/type-mapper';
import { CodeFormatter } from '../utils/code-formatter';

// ============================================
// CONTROLLER BUILDER
// ============================================

export class ControllerBuilder {
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
   * Build controller for an entity
   */
  build(entity: Entity): GeneratedFile {
    const controllerName = this.nameUtils.toControllerName(entity.name);
    const serviceName = this.nameUtils.toServiceName(entity.name);
    const serviceVarName = this.nameUtils.toCamelCase(serviceName);
    const fileName = this.nameUtils.toControllerFileName(entity.name);

    const methods = this.generateMethods(entity);
    const code = this.buildControllerCode(entity, methods);

    return {
      name: controllerName,
      fileName,
      filePath: `src/controllers/${fileName}`,
      code: this.formatter.format(code),
      type: 'controller',
      sourceEntityId: entity.id,
      dependencies: [
        'express',
        `../services/${this.nameUtils.toServiceFileName(entity.name).replace('.ts', '')}`,
      ],
    };
  }

  /**
   * Build all controllers
   */
  buildAll(): GeneratedFile[] {
    return this.context.dataModel.entities.map(entity => this.build(entity));
  }

  // ==========================================
  // CODE GENERATION
  // ==========================================

  /**
   * Build complete controller code
   */
  private buildControllerCode(entity: Entity, methods: ControllerMethod[]): string {
    const controllerName = this.nameUtils.toControllerName(entity.name);
    const serviceName = this.nameUtils.toServiceName(entity.name);
    const serviceVarName = this.nameUtils.toCamelCase(serviceName);
    const entityName = this.nameUtils.toEntityName(entity.name);

    const lines: string[] = [];

    // Imports
    lines.push(this.buildImports(entity));
    lines.push('');

    // Class definition
    lines.push(`/**`);
    lines.push(` * ${controllerName}`);
    if (entity.description) {
      lines.push(` * ${entity.description}`);
    }
    lines.push(` */`);
    lines.push(`export class ${controllerName} {`);
    lines.push(`  private ${serviceVarName}: ${serviceName};`);
    lines.push('');

    // Constructor
    lines.push(`  constructor(${serviceVarName}: ${serviceName}) {`);
    lines.push(`    this.${serviceVarName} = ${serviceVarName};`);
    lines.push('  }');

    // Methods
    for (const method of methods) {
      lines.push('');
      lines.push(this.buildMethod(method, entity));
    }

    lines.push('}');
    lines.push('');

    // Export default
    lines.push(`export default ${controllerName};`);

    return lines.join('\n');
  }

  /**
   * Build imports
   */
  private buildImports(entity: Entity): string {
    const serviceName = this.nameUtils.toServiceName(entity.name);
    const serviceFile = this.nameUtils.toServiceFileName(entity.name).replace('.ts', '');

    const lines: string[] = [];

    lines.push(`import { Request, Response, NextFunction } from 'express';`);
    lines.push(`import { ${serviceName} } from '../services/${serviceFile}';`);

    // Add validation imports if configured
    if (this.context.config.validationLibrary === 'zod') {
      lines.push(`import { z } from 'zod';`);
    }

    return lines.join('\n');
  }

  /**
   * Build controller method
   */
  private buildMethod(method: ControllerMethod, entity: Entity): string {
    const lines: string[] = [];
    const serviceName = this.nameUtils.toServiceName(entity.name);
    const serviceVarName = this.nameUtils.toCamelCase(serviceName);

    // Method documentation
    if (method.description) {
      lines.push(`  /**`);
      lines.push(`   * ${method.description}`);
      lines.push(`   */`);
    }

    // Method signature
    lines.push(`  ${method.name} = async (req: Request, res: Response, next: NextFunction): Promise<void> => {`);
    lines.push(`    try {`);

    // Method body based on type
    switch (method.name) {
      case 'create':
        lines.push(...this.buildCreateBody(entity, serviceVarName));
        break;
      case 'findAll':
        lines.push(...this.buildFindAllBody(entity, serviceVarName));
        break;
      case 'findOne':
        lines.push(...this.buildFindOneBody(entity, serviceVarName));
        break;
      case 'update':
        lines.push(...this.buildUpdateBody(entity, serviceVarName));
        break;
      case 'delete':
        lines.push(...this.buildDeleteBody(entity, serviceVarName));
        break;
    }

    lines.push(`    } catch (error) {`);
    lines.push(`      next(error);`);
    lines.push(`    }`);
    lines.push(`  };`);

    return lines.join('\n');
  }

  // ==========================================
  // METHOD BODIES
  // ==========================================

  /**
   * Build create method body
   */
  private buildCreateBody(entity: Entity, serviceVar: string): string[] {
    const lines: string[] = [];

    // Validation
    if (this.context.config.validationLibrary === 'zod') {
      lines.push(`      const validated = create${this.nameUtils.toEntityName(entity.name)}Schema.parse(req.body);`);
      lines.push(`      const result = await this.${serviceVar}.create(validated);`);
    } else {
      lines.push(`      const result = await this.${serviceVar}.create(req.body);`);
    }

    lines.push(`      res.status(201).json(result);`);

    return lines;
  }

  /**
   * Build findAll method body
   */
  private buildFindAllBody(entity: Entity, serviceVar: string): string[] {
    const lines: string[] = [];

    lines.push(`      const page = parseInt(req.query.page as string) || 1;`);
    lines.push(`      const limit = parseInt(req.query.limit as string) || 10;`);
    lines.push(`      const sortBy = req.query.sortBy as string;`);
    lines.push(`      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';`);
    lines.push('');
    lines.push(`      const result = await this.${serviceVar}.findAll({`);
    lines.push(`        page,`);
    lines.push(`        limit,`);
    lines.push(`        sortBy,`);
    lines.push(`        sortOrder,`);
    lines.push(`      });`);
    lines.push('');
    lines.push(`      res.json(result);`);

    return lines;
  }

  /**
   * Build findOne method body
   */
  private buildFindOneBody(entity: Entity, serviceVar: string): string[] {
    const lines: string[] = [];

    lines.push(`      const { id } = req.params;`);
    lines.push(`      const result = await this.${serviceVar}.findOne(id);`);
    lines.push('');
    lines.push(`      if (!result) {`);
    lines.push(`        res.status(404).json({ error: 'Not found' });`);
    lines.push(`        return;`);
    lines.push(`      }`);
    lines.push('');
    lines.push(`      res.json(result);`);

    return lines;
  }

  /**
   * Build update method body
   */
  private buildUpdateBody(entity: Entity, serviceVar: string): string[] {
    const lines: string[] = [];

    lines.push(`      const { id } = req.params;`);

    if (this.context.config.validationLibrary === 'zod') {
      lines.push(`      const validated = update${this.nameUtils.toEntityName(entity.name)}Schema.parse(req.body);`);
      lines.push(`      const result = await this.${serviceVar}.update(id, validated);`);
    } else {
      lines.push(`      const result = await this.${serviceVar}.update(id, req.body);`);
    }

    lines.push('');
    lines.push(`      if (!result) {`);
    lines.push(`        res.status(404).json({ error: 'Not found' });`);
    lines.push(`        return;`);
    lines.push(`      }`);
    lines.push('');
    lines.push(`      res.json(result);`);

    return lines;
  }

  /**
   * Build delete method body
   */
  private buildDeleteBody(entity: Entity, serviceVar: string): string[] {
    const lines: string[] = [];

    lines.push(`      const { id } = req.params;`);

    if (this.context.config.useSoftDelete) {
      lines.push(`      const result = await this.${serviceVar}.softDelete(id);`);
    } else {
      lines.push(`      const result = await this.${serviceVar}.delete(id);`);
    }

    lines.push('');
    lines.push(`      if (!result) {`);
    lines.push(`        res.status(404).json({ error: 'Not found' });`);
    lines.push(`        return;`);
    lines.push(`      }`);
    lines.push('');
    lines.push(`      res.status(204).send();`);

    return lines;
  }

  // ==========================================
  // METHOD DEFINITIONS
  // ==========================================

  /**
   * Generate standard CRUD methods
   */
  generateMethods(entity: Entity): ControllerMethod[] {
    const entityName = this.nameUtils.toEntityName(entity.name);

    return [
      {
        name: 'create',
        httpMethod: 'POST',
        path: '/',
        parameters: [
          { name: 'data', source: 'body', type: `Create${entityName}Dto`, required: true },
        ],
        returnType: entityName,
        description: `Create a new ${entityName}`,
      },
      {
        name: 'findAll',
        httpMethod: 'GET',
        path: '/',
        parameters: [
          { name: 'page', source: 'query', type: 'number', required: false },
          { name: 'limit', source: 'query', type: 'number', required: false },
          { name: 'sortBy', source: 'query', type: 'string', required: false },
          { name: 'sortOrder', source: 'query', type: "'asc' | 'desc'", required: false },
        ],
        returnType: `PaginatedResult<${entityName}>`,
        description: `Get all ${this.nameUtils.toPlural(entityName)}`,
      },
      {
        name: 'findOne',
        httpMethod: 'GET',
        path: '/:id',
        parameters: [
          { name: 'id', source: 'params', type: 'string', required: true },
        ],
        returnType: `${entityName} | null`,
        description: `Get a ${entityName} by ID`,
      },
      {
        name: 'update',
        httpMethod: 'PUT',
        path: '/:id',
        parameters: [
          { name: 'id', source: 'params', type: 'string', required: true },
          { name: 'data', source: 'body', type: `Update${entityName}Dto`, required: true },
        ],
        returnType: `${entityName} | null`,
        description: `Update a ${entityName}`,
      },
      {
        name: 'delete',
        httpMethod: 'DELETE',
        path: '/:id',
        parameters: [
          { name: 'id', source: 'params', type: 'string', required: true },
        ],
        returnType: 'boolean',
        description: `Delete a ${entityName}`,
      },
    ];
  }
}

// ============================================
// EXPORTS
// ============================================

export default ControllerBuilder;
