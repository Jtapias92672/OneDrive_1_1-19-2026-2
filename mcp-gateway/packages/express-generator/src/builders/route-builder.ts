/**
 * Express Generator - Route Builder
 *
 * @epic 14 - Backend Code Generation
 * @task 6.1 - Route Generation
 *
 * @description
 *   Generates Express router files with route definitions.
 */

import {
  BuilderContext,
  Entity,
  GeneratedFile,
  RouteDefinition,
  RouterConfig,
} from '../core/types';
import { NameUtils } from '../utils/name-utils';
import { CodeFormatter } from '../utils/code-formatter';

// ============================================
// ROUTE BUILDER
// ============================================

export class RouteBuilder {
  private nameUtils: NameUtils;
  private formatter: CodeFormatter;

  constructor(private context: BuilderContext) {
    this.nameUtils = new NameUtils(context.config.namingConvention);
    this.formatter = new CodeFormatter(context.config.formatting);
  }

  // ==========================================
  // MAIN BUILD
  // ==========================================

  /**
   * Build routes for an entity
   */
  build(entity: Entity): GeneratedFile {
    const routerName = this.nameUtils.toRouterName(entity.name);
    const fileName = this.nameUtils.toRouteFileName(entity.name);

    const config = this.generateRouterConfig(entity);
    const code = this.buildRouteCode(entity, config);

    return {
      name: routerName,
      fileName,
      filePath: `src/routes/${fileName}`,
      code: this.formatter.format(code),
      type: 'route',
      sourceEntityId: entity.id,
      dependencies: [
        'express',
        `../controllers/${this.nameUtils.toControllerFileName(entity.name).replace('.ts', '')}`,
      ],
    };
  }

  /**
   * Build all routes
   */
  buildAll(): GeneratedFile[] {
    return this.context.dataModel.entities.map(entity => this.build(entity));
  }

  /**
   * Build routes index file
   */
  buildIndex(): GeneratedFile {
    const code = this.buildRoutesIndex();

    return {
      name: 'routes',
      fileName: 'index.ts',
      filePath: 'src/routes/index.ts',
      code: this.formatter.format(code),
      type: 'route',
      dependencies: this.context.dataModel.entities.map(entity =>
        `./${this.nameUtils.toRouteFileName(entity.name).replace('.ts', '')}`
      ),
    };
  }

  // ==========================================
  // CODE GENERATION
  // ==========================================

  /**
   * Build complete route code
   */
  private buildRouteCode(entity: Entity, config: RouterConfig): string {
    const controllerName = this.nameUtils.toControllerName(entity.name);
    const serviceName = this.nameUtils.toServiceName(entity.name);
    const controllerFile = this.nameUtils.toControllerFileName(entity.name).replace('.ts', '');
    const serviceFile = this.nameUtils.toServiceFileName(entity.name).replace('.ts', '');
    const routerName = this.nameUtils.toRouterName(entity.name);

    const lines: string[] = [];

    // Imports
    lines.push(`import { Router } from 'express';`);
    lines.push(`import { PrismaClient } from '@prisma/client';`);
    lines.push(`import { ${controllerName} } from '../controllers/${controllerFile}';`);
    lines.push(`import { ${serviceName} } from '../services/${serviceFile}';`);

    // Add middleware imports if configured
    if (this.context.config.authMethod !== 'none') {
      lines.push(`import { authenticate } from '../middleware/auth';`);
    }
    if (this.context.config.generateMiddleware) {
      lines.push(`import { validate } from '../middleware/validation';`);
    }

    lines.push('');

    // Create router function
    lines.push(`/**`);
    lines.push(` * Create ${entity.name} routes`);
    lines.push(` */`);
    lines.push(`export function create${this.nameUtils.toEntityName(entity.name)}Router(prisma: PrismaClient): Router {`);
    lines.push(`  const router = Router();`);
    lines.push(`  const service = new ${serviceName}(prisma);`);
    lines.push(`  const controller = new ${controllerName}(service);`);
    lines.push('');

    // Route definitions
    for (const route of config.routes) {
      lines.push(this.buildRouteDefinition(route, entity));
    }

    lines.push('');
    lines.push(`  return router;`);
    lines.push(`}`);
    lines.push('');

    // Export router name
    lines.push(`export const ${routerName}Path = '${config.basePath}';`);
    lines.push('');
    lines.push(`export default create${this.nameUtils.toEntityName(entity.name)}Router;`);

    return lines.join('\n');
  }

  /**
   * Build single route definition
   */
  private buildRouteDefinition(route: RouteDefinition, entity: Entity): string {
    const parts: string[] = [`  router.${route.method}('${route.path}'`];

    // Add middleware
    if (route.middleware && route.middleware.length > 0) {
      for (const mw of route.middleware) {
        parts.push(`, ${mw}`);
      }
    } else {
      // Add default middleware based on config
      if (this.context.config.authMethod !== 'none' && route.method !== 'get') {
        parts.push(', authenticate');
      }
    }

    // Add handler
    parts.push(`, controller.${route.handler}`);
    parts.push(');');

    const line = parts.join('');

    // Add description as comment
    if (route.description) {
      return `  // ${route.description}\n${line}`;
    }

    return line;
  }

  /**
   * Build routes index file
   */
  private buildRoutesIndex(): string {
    const lines: string[] = [];

    // Imports
    lines.push(`import { Router } from 'express';`);
    lines.push(`import { PrismaClient } from '@prisma/client';`);
    lines.push('');

    // Import individual routers
    for (const entity of this.context.dataModel.entities) {
      const entityName = this.nameUtils.toEntityName(entity.name);
      const routeFile = this.nameUtils.toRouteFileName(entity.name).replace('.ts', '');
      lines.push(`import create${entityName}Router, { ${this.nameUtils.toRouterName(entity.name)}Path } from './${routeFile}';`);
    }

    lines.push('');

    // Create router function
    lines.push(`/**`);
    lines.push(` * Create all API routes`);
    lines.push(` */`);
    lines.push(`export function createRoutes(prisma: PrismaClient): Router {`);
    lines.push(`  const router = Router();`);
    lines.push('');

    // Mount individual routers
    for (const entity of this.context.dataModel.entities) {
      const entityName = this.nameUtils.toEntityName(entity.name);
      lines.push(`  router.use(${this.nameUtils.toRouterName(entity.name)}Path, create${entityName}Router(prisma));`);
    }

    lines.push('');
    lines.push(`  return router;`);
    lines.push(`}`);
    lines.push('');
    lines.push(`export default createRoutes;`);

    return lines.join('\n');
  }

  // ==========================================
  // ROUTE CONFIGURATION
  // ==========================================

  /**
   * Generate router configuration for entity
   */
  generateRouterConfig(entity: Entity): RouterConfig {
    const basePath = this.nameUtils.toRoutePath(entity.name);

    const routes: RouteDefinition[] = [
      {
        method: 'post',
        path: '/',
        handler: 'create',
        description: `Create a new ${entity.name}`,
      },
      {
        method: 'get',
        path: '/',
        handler: 'findAll',
        description: `Get all ${this.nameUtils.toPlural(entity.name)}`,
      },
      {
        method: 'get',
        path: '/:id',
        handler: 'findOne',
        description: `Get a ${entity.name} by ID`,
      },
      {
        method: 'put',
        path: '/:id',
        handler: 'update',
        description: `Update a ${entity.name}`,
      },
      {
        method: 'delete',
        path: '/:id',
        handler: 'delete',
        description: `Delete a ${entity.name}`,
      },
    ];

    // Add restore route if soft delete is enabled
    if (this.context.config.useSoftDelete) {
      routes.push({
        method: 'post',
        path: '/:id/restore',
        handler: 'restore',
        description: `Restore a deleted ${entity.name}`,
      });
    }

    return {
      basePath,
      routes,
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export default RouteBuilder;
