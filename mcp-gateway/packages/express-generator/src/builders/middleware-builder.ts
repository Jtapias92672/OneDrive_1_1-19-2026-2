/**
 * Express Generator - Middleware Builder
 *
 * @epic 14 - Backend Code Generation
 * @task 7.1 - Middleware Generation
 *
 * @description
 *   Generates Express middleware for authentication, validation, and error handling.
 */

import {
  BuilderContext,
  GeneratedFile,
  MiddlewareConfig,
} from '../core/types';
import { CodeFormatter } from '../utils/code-formatter';

// ============================================
// MIDDLEWARE BUILDER
// ============================================

export class MiddlewareBuilder {
  private formatter: CodeFormatter;

  constructor(private context: BuilderContext) {
    this.formatter = new CodeFormatter(context.config.formatting);
  }

  // ==========================================
  // MAIN BUILD
  // ==========================================

  /**
   * Build all middleware files
   */
  buildAll(): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Auth middleware
    if (this.context.config.authMethod !== 'none') {
      files.push(this.buildAuthMiddleware());
    }

    // Validation middleware
    files.push(this.buildValidationMiddleware());

    // Error handler middleware
    files.push(this.buildErrorHandler());

    // Logging middleware
    files.push(this.buildLoggingMiddleware());

    // Index file
    files.push(this.buildIndex());

    return files;
  }

  // ==========================================
  // AUTH MIDDLEWARE
  // ==========================================

  /**
   * Build authentication middleware
   */
  buildAuthMiddleware(): GeneratedFile {
    let code: string;

    switch (this.context.config.authMethod) {
      case 'jwt':
        code = this.buildJwtAuth();
        break;
      case 'session':
        code = this.buildSessionAuth();
        break;
      case 'apikey':
        code = this.buildApiKeyAuth();
        break;
      default:
        code = this.buildNoAuth();
    }

    return {
      name: 'auth',
      fileName: 'auth.ts',
      filePath: 'src/middleware/auth.ts',
      code: this.formatter.format(code),
      type: 'middleware',
      dependencies: this.getAuthDependencies(),
    };
  }

  /**
   * Build JWT authentication middleware
   */
  private buildJwtAuth(): string {
    return `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles?: string[];
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * JWT Authentication middleware
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedRequest['user'];

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Optional authentication (sets user if token present)
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedRequest['user'];
      req.user = decoded;
    }

    next();
  } catch {
    next();
  }
}

/**
 * Role-based authorization
 */
export function authorize(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (roles.length > 0 && !roles.some(role => req.user?.roles?.includes(role))) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export default authenticate;
`;
  }

  /**
   * Build session authentication middleware
   */
  private buildSessionAuth(): string {
    return `import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles?: string[];
  };
}

/**
 * Session Authentication middleware
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.session || !(req.session as Record<string, unknown>).user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  req.user = (req.session as Record<string, unknown>).user as AuthenticatedRequest['user'];
  next();
}

/**
 * Optional authentication
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.session && (req.session as Record<string, unknown>).user) {
    req.user = (req.session as Record<string, unknown>).user as AuthenticatedRequest['user'];
  }
  next();
}

/**
 * Role-based authorization
 */
export function authorize(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (roles.length > 0 && !roles.some(role => req.user?.roles?.includes(role))) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export default authenticate;
`;
  }

  /**
   * Build API key authentication middleware
   */
  private buildApiKeyAuth(): string {
    return `import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  apiKey?: string;
}

const API_KEYS = new Set((process.env.API_KEYS || '').split(',').filter(Boolean));

/**
 * API Key Authentication middleware
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers['x-api-key'] as string || req.query.apiKey as string;

  if (!apiKey) {
    res.status(401).json({ error: 'No API key provided' });
    return;
  }

  if (!API_KEYS.has(apiKey)) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  req.apiKey = apiKey;
  next();
}

/**
 * Optional API key authentication
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers['x-api-key'] as string || req.query.apiKey as string;

  if (apiKey && API_KEYS.has(apiKey)) {
    req.apiKey = apiKey;
  }

  next();
}

export default authenticate;
`;
  }

  /**
   * Build no authentication middleware
   */
  private buildNoAuth(): string {
    return `import { Request, Response, NextFunction } from 'express';

/**
 * No-op authentication middleware
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  next();
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  next();
}

export default authenticate;
`;
  }

  // ==========================================
  // VALIDATION MIDDLEWARE
  // ==========================================

  /**
   * Build validation middleware
   */
  buildValidationMiddleware(): GeneratedFile {
    let code: string;

    switch (this.context.config.validationLibrary) {
      case 'zod':
        code = this.buildZodValidation();
        break;
      case 'joi':
        code = this.buildJoiValidation();
        break;
      case 'class-validator':
        code = this.buildClassValidatorValidation();
        break;
      default:
        code = this.buildZodValidation();
    }

    return {
      name: 'validation',
      fileName: 'validation.ts',
      filePath: 'src/middleware/validation.ts',
      code: this.formatter.format(code),
      type: 'middleware',
      dependencies: this.getValidationDependencies(),
    };
  }

  /**
   * Build Zod validation middleware
   */
  private buildZodValidation(): string {
    return `import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validate request body with Zod schema
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate request query with Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Query validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate request params with Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Params validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

export default validate;
`;
  }

  /**
   * Build Joi validation middleware
   */
  private buildJoiValidation(): string {
    return `import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Validate request body with Joi schema
 */
export function validate(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({
          path: d.path.join('.'),
          message: d.message,
        })),
      });
      return;
    }

    next();
  };
}

/**
 * Validate request query with Joi schema
 */
export function validateQuery(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.query, { abortEarly: false });

    if (error) {
      res.status(400).json({
        error: 'Query validation failed',
        details: error.details.map(d => ({
          path: d.path.join('.'),
          message: d.message,
        })),
      });
      return;
    }

    next();
  };
}

export default validate;
`;
  }

  /**
   * Build class-validator validation middleware
   */
  private buildClassValidatorValidation(): string {
    return `import { Request, Response, NextFunction } from 'express';
import { validate as classValidate, ValidationError } from 'class-validator';
import { plainToClass, ClassConstructor } from 'class-transformer';

/**
 * Validate request body with class-validator
 */
export function validate<T extends object>(dtoClass: ClassConstructor<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const dto = plainToClass(dtoClass, req.body);
    const errors = await classValidate(dto);

    if (errors.length > 0) {
      res.status(400).json({
        error: 'Validation failed',
        details: formatErrors(errors),
      });
      return;
    }

    req.body = dto;
    next();
  };
}

function formatErrors(errors: ValidationError[]): Array<{ path: string; message: string }> {
  const result: Array<{ path: string; message: string }> = [];

  for (const error of errors) {
    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        result.push({
          path: error.property,
          message,
        });
      }
    }

    if (error.children && error.children.length > 0) {
      const childErrors = formatErrors(error.children);
      for (const childError of childErrors) {
        result.push({
          path: \`\${error.property}.\${childError.path}\`,
          message: childError.message,
        });
      }
    }
  }

  return result;
}

export default validate;
`;
  }

  // ==========================================
  // ERROR HANDLER
  // ==========================================

  /**
   * Build error handler middleware
   */
  buildErrorHandler(): GeneratedFile {
    const code = `import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not found'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message);
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', error);

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
    });
    return;
  }

  // Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as { code?: string; meta?: { target?: string[] } };

    if (prismaError.code === 'P2002') {
      res.status(409).json({
        error: 'Unique constraint violation',
        details: prismaError.meta?.target,
      });
      return;
    }

    if (prismaError.code === 'P2025') {
      res.status(404).json({
        error: 'Record not found',
      });
      return;
    }
  }

  // Default error response
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message,
  });
}

/**
 * Not found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response
): void {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
}

export default errorHandler;
`;

    return {
      name: 'errorHandler',
      fileName: 'error-handler.ts',
      filePath: 'src/middleware/error-handler.ts',
      code: this.formatter.format(code),
      type: 'middleware',
      dependencies: ['express'],
    };
  }

  // ==========================================
  // LOGGING MIDDLEWARE
  // ==========================================

  /**
   * Build logging middleware
   */
  buildLoggingMiddleware(): GeneratedFile {
    const code = `import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: \`\${duration}ms\`,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify(log));
    }
  });

  next();
}

export default requestLogger;
`;

    return {
      name: 'requestLogger',
      fileName: 'logging.ts',
      filePath: 'src/middleware/logging.ts',
      code: this.formatter.format(code),
      type: 'middleware',
      dependencies: ['express'],
    };
  }

  // ==========================================
  // INDEX FILE
  // ==========================================

  /**
   * Build middleware index file
   */
  buildIndex(): GeneratedFile {
    const lines: string[] = [];

    if (this.context.config.authMethod !== 'none') {
      lines.push(`export { authenticate, optionalAuth } from './auth';`);
    }
    lines.push(`export { validate } from './validation';`);
    lines.push(`export { errorHandler, notFoundHandler, ApiError } from './error-handler';`);
    lines.push(`export { requestLogger } from './logging';`);

    return {
      name: 'middleware',
      fileName: 'index.ts',
      filePath: 'src/middleware/index.ts',
      code: this.formatter.format(lines.join('\n')),
      type: 'middleware',
      dependencies: [],
    };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Get auth dependencies
   */
  private getAuthDependencies(): string[] {
    switch (this.context.config.authMethod) {
      case 'jwt':
        return ['express', 'jsonwebtoken'];
      case 'session':
        return ['express', 'express-session'];
      default:
        return ['express'];
    }
  }

  /**
   * Get validation dependencies
   */
  private getValidationDependencies(): string[] {
    switch (this.context.config.validationLibrary) {
      case 'zod':
        return ['express', 'zod'];
      case 'joi':
        return ['express', 'joi'];
      case 'class-validator':
        return ['express', 'class-validator', 'class-transformer'];
      default:
        return ['express', 'zod'];
    }
  }
}

// ============================================
// EXPORTS
// ============================================

export default MiddlewareBuilder;
