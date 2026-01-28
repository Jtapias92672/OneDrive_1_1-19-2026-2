/**
 * Express Generator - Main Generator
 *
 * @epic 14 - Backend Code Generation
 * @task 8.1 - Main Generator Orchestration
 *
 * @description
 *   Main generator class that orchestrates all builders to generate
 *   a complete Express.js backend from data models.
 */

import {
  ExpressGeneratorConfig,
  ParsedDataModel,
  GenerationResult,
  GeneratedFile,
  GenerationStats,
  GenerationWarning,
  GenerationError,
  BuilderContext,
  Entity,
} from '../core/types';
import { DEFAULT_CONFIG, createConfig, validateConfig } from '../core/config';
import { PrismaBuilder } from '../builders/prisma-builder';
import { ControllerBuilder } from '../builders/controller-builder';
import { ServiceBuilder } from '../builders/service-builder';
import { RouteBuilder } from '../builders/route-builder';
import { MiddlewareBuilder } from '../builders/middleware-builder';
import { CodeFormatter } from '../utils/code-formatter';

// ============================================
// EXPRESS GENERATOR
// ============================================

export class ExpressGenerator {
  private config: ExpressGeneratorConfig;
  private formatter: CodeFormatter;

  constructor(config?: Partial<ExpressGeneratorConfig>) {
    this.config = createConfig(config);
    this.formatter = new CodeFormatter(this.config.formatting);
  }

  // ==========================================
  // MAIN GENERATION
  // ==========================================

  /**
   * Generate complete Express.js backend from data model
   */
  generate(dataModel: ParsedDataModel): GenerationResult {
    const startTime = Date.now();
    const warnings: GenerationWarning[] = [];
    const errors: GenerationError[] = [];

    // Validate configuration
    const configErrors = validateConfig(this.config);
    if (configErrors.length > 0) {
      for (const error of configErrors) {
        errors.push({ type: 'config', message: error });
      }
    }

    // Validate data model
    const modelErrors = this.validateDataModel(dataModel);
    errors.push(...modelErrors);

    if (errors.length > 0) {
      return this.createErrorResult(errors, startTime);
    }

    // Create builder context
    const context = this.createContext(dataModel);

    // Generate all files
    const files: GeneratedFile[] = [];

    // 1. Prisma schema
    const prismaBuilder = new PrismaBuilder(context);
    const prismaSchema = prismaBuilder.build();

    // 2. Controllers
    if (this.config.generateControllers) {
      const controllerBuilder = new ControllerBuilder(context);
      files.push(...controllerBuilder.buildAll());
    }

    // 3. Services
    if (this.config.generateServices) {
      const serviceBuilder = new ServiceBuilder(context);
      files.push(...serviceBuilder.buildAll());
    }

    // 4. Routes
    if (this.config.generateRoutes) {
      const routeBuilder = new RouteBuilder(context);
      files.push(...routeBuilder.buildAll());
      files.push(routeBuilder.buildIndex());
    }

    // 5. Middleware
    if (this.config.generateMiddleware) {
      const middlewareBuilder = new MiddlewareBuilder(context);
      files.push(...middlewareBuilder.buildAll());
    }

    // 6. App entry point
    const appFile = this.buildAppFile(context);
    files.push(appFile);

    // 7. Types file
    const typesFile = this.buildTypesFile(context);
    files.push(typesFile);

    // Calculate stats
    const stats = this.calculateStats(files, prismaSchema, startTime);

    // Generate warnings
    warnings.push(...this.generateWarnings(dataModel, context));

    return {
      files,
      prismaSchema,
      appFile: appFile.code,
      routesIndex: files.find(f => f.fileName === 'index.ts' && f.filePath.includes('routes'))?.code || '',
      stats,
      warnings,
      errors,
    };
  }

  // ==========================================
  // CONTEXT CREATION
  // ==========================================

  /**
   * Create builder context
   */
  private createContext(dataModel: ParsedDataModel): BuilderContext {
    const entityMap = new Map<string, Entity>();
    for (const entity of dataModel.entities) {
      entityMap.set(entity.name, entity);
    }

    return {
      config: this.config,
      dataModel,
      entityMap,
      generatedTypes: new Map(),
    };
  }

  // ==========================================
  // APP FILE
  // ==========================================

  /**
   * Build main app.ts file
   */
  private buildAppFile(context: BuilderContext): GeneratedFile {
    const lines: string[] = [];

    // Imports
    lines.push(`import express from 'express';`);
    lines.push(`import cors from 'cors';`);
    lines.push(`import helmet from 'helmet';`);
    lines.push(`import { PrismaClient } from '@prisma/client';`);
    lines.push(`import { createRoutes } from './routes';`);
    lines.push(`import { errorHandler, notFoundHandler, requestLogger } from './middleware';`);
    lines.push('');

    // App setup
    lines.push(`// Initialize Prisma client`);
    lines.push(`const prisma = new PrismaClient();`);
    lines.push('');
    lines.push(`// Create Express app`);
    lines.push(`const app = express();`);
    lines.push('');

    // Middleware
    lines.push(`// Middleware`);
    lines.push(`app.use(helmet());`);
    lines.push(`app.use(cors());`);
    lines.push(`app.use(express.json());`);
    lines.push(`app.use(express.urlencoded({ extended: true }));`);
    lines.push(`app.use(requestLogger);`);
    lines.push('');

    // Routes
    lines.push(`// Routes`);
    lines.push(`app.use('/api', createRoutes(prisma));`);
    lines.push('');

    // Health check
    lines.push(`// Health check`);
    lines.push(`app.get('/health', (req, res) => {`);
    lines.push(`  res.json({ status: 'ok', timestamp: new Date().toISOString() });`);
    lines.push(`});`);
    lines.push('');

    // Error handling
    lines.push(`// Error handling`);
    lines.push(`app.use(notFoundHandler);`);
    lines.push(`app.use(errorHandler);`);
    lines.push('');

    // Server start
    lines.push(`// Start server`);
    lines.push(`const PORT = process.env.PORT || 3000;`);
    lines.push('');
    lines.push(`async function start(): Promise<void> {`);
    lines.push(`  try {`);
    lines.push(`    await prisma.$connect();`);
    lines.push(`    console.log('Connected to database');`);
    lines.push('');
    lines.push(`    app.listen(PORT, () => {`);
    lines.push(`      console.log(\`Server running on port \${PORT}\`);`);
    lines.push(`    });`);
    lines.push(`  } catch (error) {`);
    lines.push(`    console.error('Failed to start server:', error);`);
    lines.push(`    process.exit(1);`);
    lines.push(`  }`);
    lines.push(`}`);
    lines.push('');
    lines.push(`// Graceful shutdown`);
    lines.push(`process.on('SIGTERM', async () => {`);
    lines.push(`  await prisma.$disconnect();`);
    lines.push(`  process.exit(0);`);
    lines.push(`});`);
    lines.push('');
    lines.push(`start();`);
    lines.push('');
    lines.push(`export { app, prisma };`);

    return {
      name: 'app',
      fileName: 'app.ts',
      filePath: 'src/app.ts',
      code: this.formatter.format(lines.join('\n')),
      type: 'config',
      dependencies: ['express', 'cors', 'helmet', '@prisma/client'],
    };
  }

  // ==========================================
  // TYPES FILE
  // ==========================================

  /**
   * Build types.ts file with common types
   */
  private buildTypesFile(context: BuilderContext): GeneratedFile {
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * Common types for ${context.dataModel.metadata.name}`);
    lines.push(` * Generated by FORGE Express Generator`);
    lines.push(` */`);
    lines.push('');

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

    // API response types
    lines.push(`export interface ApiResponse<T = unknown> {`);
    lines.push(`  data?: T;`);
    lines.push(`  error?: string;`);
    lines.push(`  details?: unknown;`);
    lines.push(`}`);
    lines.push('');

    // Query params type
    lines.push(`export interface QueryParams {`);
    lines.push(`  page?: string;`);
    lines.push(`  limit?: string;`);
    lines.push(`  sortBy?: string;`);
    lines.push(`  sortOrder?: 'asc' | 'desc';`);
    lines.push(`  [key: string]: string | undefined;`);
    lines.push(`}`);

    return {
      name: 'types',
      fileName: 'types.ts',
      filePath: 'src/types.ts',
      code: this.formatter.format(lines.join('\n')),
      type: 'types',
      dependencies: [],
    };
  }

  // ==========================================
  // VALIDATION
  // ==========================================

  /**
   * Validate data model
   */
  private validateDataModel(dataModel: ParsedDataModel): GenerationError[] {
    const errors: GenerationError[] = [];

    if (!dataModel.entities || dataModel.entities.length === 0) {
      errors.push({
        type: 'validation',
        message: 'Data model must contain at least one entity',
      });
    }

    for (const entity of dataModel.entities) {
      if (!entity.name) {
        errors.push({
          type: 'validation',
          message: 'Entity must have a name',
          entityId: entity.id,
        });
      }

      if (!entity.fields || entity.fields.length === 0) {
        errors.push({
          type: 'validation',
          message: `Entity ${entity.name} must have at least one field`,
          entityId: entity.id,
        });
      }

      for (const field of entity.fields) {
        if (!field.name) {
          errors.push({
            type: 'validation',
            message: `Field in entity ${entity.name} must have a name`,
            entityId: entity.id,
          });
        }

        if (!field.type) {
          errors.push({
            type: 'validation',
            message: `Field ${field.name} in entity ${entity.name} must have a type`,
            entityId: entity.id,
            fieldName: field.name,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Generate warnings for potential issues
   */
  private generateWarnings(dataModel: ParsedDataModel, context: BuilderContext): GenerationWarning[] {
    const warnings: GenerationWarning[] = [];

    for (const entity of dataModel.entities) {
      // Check for missing timestamps
      if (!entity.timestamps) {
        warnings.push({
          type: 'suggestion',
          message: `Entity ${entity.name} does not have timestamps enabled`,
          entityId: entity.id,
        });
      }

      // Check for relations without inverse side
      for (const field of entity.fields) {
        if (field.relation && !field.relation.inverseSide) {
          warnings.push({
            type: 'suggestion',
            message: `Relation ${field.name} in ${entity.name} does not specify inverse side`,
            entityId: entity.id,
            fieldName: field.name,
          });
        }
      }
    }

    return warnings;
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  /**
   * Calculate generation statistics
   */
  private calculateStats(
    files: GeneratedFile[],
    prismaSchema: string,
    startTime: number
  ): GenerationStats {
    let linesOfCode = 0;
    let controllers = 0;
    let services = 0;
    let routes = 0;
    let middleware = 0;
    let tests = 0;

    for (const file of files) {
      linesOfCode += file.code.split('\n').length;

      switch (file.type) {
        case 'controller':
          controllers++;
          break;
        case 'service':
          services++;
          break;
        case 'route':
          routes++;
          break;
        case 'middleware':
          middleware++;
          break;
        case 'test':
          tests++;
          break;
      }
    }

    // Add Prisma schema lines
    linesOfCode += prismaSchema.split('\n').length;

    return {
      totalFiles: files.length + 1, // +1 for Prisma schema
      controllers,
      services,
      routes,
      middleware,
      tests,
      linesOfCode,
      generationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(errors: GenerationError[], startTime: number): GenerationResult {
    return {
      files: [],
      prismaSchema: '',
      appFile: '',
      routesIndex: '',
      stats: {
        totalFiles: 0,
        controllers: 0,
        services: 0,
        routes: 0,
        middleware: 0,
        tests: 0,
        linesOfCode: 0,
        generationTimeMs: Date.now() - startTime,
      },
      warnings: [],
      errors,
    };
  }

  // ==========================================
  // CONFIGURATION
  // ==========================================

  /**
   * Get current configuration
   */
  getConfig(): ExpressGeneratorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ExpressGeneratorConfig>): void {
    this.config = createConfig({ ...this.config, ...config });
    this.formatter = new CodeFormatter(this.config.formatting);
  }
}

// ============================================
// EXPORTS
// ============================================

export default ExpressGenerator;
