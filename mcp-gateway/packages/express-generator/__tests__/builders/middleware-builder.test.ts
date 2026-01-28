/**
 * Middleware Builder Tests
 * Epic 14: Backend Code Generation
 */

import { MiddlewareBuilder } from '../../src/builders/middleware-builder';
import { BuilderContext, ParsedDataModel, Entity } from '../../src/core/types';
import { DEFAULT_CONFIG, createConfig } from '../../src/core/config';

describe('MiddlewareBuilder', () => {
  const createContext = (overrides: Partial<typeof DEFAULT_CONFIG> = {}): BuilderContext => {
    return {
      config: createConfig(overrides),
      dataModel: {
        version: '1.0',
        metadata: { name: 'Test', createdAt: new Date().toISOString() },
        entities: [],
        relationships: [],
        enums: [],
      },
      entityMap: new Map(),
      generatedTypes: new Map(),
    };
  };

  describe('buildAll', () => {
    it('should build all middleware files with JWT auth', () => {
      const builder = new MiddlewareBuilder(createContext({ authMethod: 'jwt' }));
      const files = builder.buildAll();

      expect(files.length).toBe(5);
      expect(files.some(f => f.fileName === 'auth.ts')).toBe(true);
      expect(files.some(f => f.fileName === 'validation.ts')).toBe(true);
      expect(files.some(f => f.fileName === 'error-handler.ts')).toBe(true);
      expect(files.some(f => f.fileName === 'logging.ts')).toBe(true);
      expect(files.some(f => f.fileName === 'index.ts')).toBe(true);
    });

    it('should build middleware without auth file when authMethod is none', () => {
      const builder = new MiddlewareBuilder(createContext({ authMethod: 'none' }));
      const files = builder.buildAll();

      expect(files.length).toBe(4);
      expect(files.some(f => f.fileName === 'auth.ts')).toBe(false);
    });

    it('should build all middleware files with session auth', () => {
      const builder = new MiddlewareBuilder(createContext({ authMethod: 'session' }));
      const files = builder.buildAll();

      expect(files.length).toBe(5);
      expect(files.some(f => f.fileName === 'auth.ts')).toBe(true);
    });

    it('should build all middleware files with API key auth', () => {
      const builder = new MiddlewareBuilder(createContext({ authMethod: 'apikey' }));
      const files = builder.buildAll();

      expect(files.length).toBe(5);
      expect(files.some(f => f.fileName === 'auth.ts')).toBe(true);
    });
  });

  describe('buildAuthMiddleware', () => {
    describe('JWT Authentication', () => {
      it('should generate JWT auth middleware', () => {
        const builder = new MiddlewareBuilder(createContext({ authMethod: 'jwt' }));
        const file = builder.buildAuthMiddleware();

        expect(file.name).toBe('auth');
        expect(file.fileName).toBe('auth.ts');
        expect(file.filePath).toBe('src/middleware/auth.ts');
        expect(file.type).toBe('middleware');
        expect(file.code).toContain('jwt');
        expect(file.code).toContain('authenticate');
        expect(file.code).toContain('optionalAuth');
        expect(file.code).toContain('authorize');
        expect(file.code).toContain('JWT_SECRET');
        expect(file.code).toContain('Bearer');
        expect(file.dependencies).toContain('jsonwebtoken');
      });

      it('should include role-based authorization in JWT', () => {
        const builder = new MiddlewareBuilder(createContext({ authMethod: 'jwt' }));
        const file = builder.buildAuthMiddleware();

        expect(file.code).toContain('authorize(...roles: string[])');
        expect(file.code).toContain('Insufficient permissions');
      });
    });

    describe('Session Authentication', () => {
      it('should generate session auth middleware', () => {
        const builder = new MiddlewareBuilder(createContext({ authMethod: 'session' }));
        const file = builder.buildAuthMiddleware();

        expect(file.code).toContain('req.session');
        expect(file.code).toContain('authenticate');
        expect(file.code).toContain('optionalAuth');
        expect(file.code).toContain('authorize');
        expect(file.code).not.toContain('jwt');
        expect(file.dependencies).toContain('express-session');
      });

      it('should include role-based authorization in session auth', () => {
        const builder = new MiddlewareBuilder(createContext({ authMethod: 'session' }));
        const file = builder.buildAuthMiddleware();

        expect(file.code).toContain('authorize(...roles: string[])');
        expect(file.code).toContain('Not authenticated');
      });
    });

    describe('API Key Authentication', () => {
      it('should generate API key auth middleware', () => {
        const builder = new MiddlewareBuilder(createContext({ authMethod: 'apikey' }));
        const file = builder.buildAuthMiddleware();

        expect(file.code).toContain('x-api-key');
        expect(file.code).toContain('API_KEYS');
        expect(file.code).toContain('authenticate');
        expect(file.code).toContain('optionalAuth');
        expect(file.code).toContain('No API key provided');
        expect(file.code).toContain('Invalid API key');
        expect(file.dependencies).toContain('express');
      });
    });

    describe('No Authentication', () => {
      it('should generate no-op auth middleware when auth is none', () => {
        const builder = new MiddlewareBuilder(createContext({ authMethod: 'none' }));
        const file = builder.buildAuthMiddleware();

        expect(file.code).toContain('No-op authentication');
        expect(file.code).toContain('next()');
        expect(file.code).not.toContain('jwt');
        expect(file.code).not.toContain('session');
        expect(file.code).not.toContain('x-api-key');
      });
    });
  });

  describe('buildValidationMiddleware', () => {
    describe('Zod Validation', () => {
      it('should generate Zod validation middleware', () => {
        const builder = new MiddlewareBuilder(createContext({ validationLibrary: 'zod' }));
        const file = builder.buildValidationMiddleware();

        expect(file.name).toBe('validation');
        expect(file.fileName).toBe('validation.ts');
        expect(file.type).toBe('middleware');
        expect(file.code).toContain('ZodSchema');
        expect(file.code).toContain('ZodError');
        expect(file.code).toContain('validate');
        expect(file.code).toContain('validateQuery');
        expect(file.code).toContain('validateParams');
        expect(file.code).toContain('Validation failed');
        expect(file.dependencies).toContain('zod');
      });
    });

    describe('Joi Validation', () => {
      it('should generate Joi validation middleware', () => {
        const builder = new MiddlewareBuilder(createContext({ validationLibrary: 'joi' }));
        const file = builder.buildValidationMiddleware();

        expect(file.code).toContain('Joi.Schema');
        expect(file.code).toContain('validate');
        expect(file.code).toContain('validateQuery');
        expect(file.code).toContain('abortEarly: false');
        expect(file.code).toContain('Validation failed');
        expect(file.dependencies).toContain('joi');
      });
    });

    describe('Class-Validator Validation', () => {
      it('should generate class-validator validation middleware', () => {
        const builder = new MiddlewareBuilder(createContext({ validationLibrary: 'class-validator' }));
        const file = builder.buildValidationMiddleware();

        expect(file.code).toContain('class-validator');
        expect(file.code).toContain('class-transformer');
        expect(file.code).toContain('plainToClass');
        expect(file.code).toContain('ClassConstructor');
        expect(file.code).toContain('formatErrors');
        expect(file.code).toContain('error.constraints');
        expect(file.code).toContain('error.children');
        expect(file.dependencies).toContain('class-validator');
        expect(file.dependencies).toContain('class-transformer');
      });
    });

    describe('Default Validation', () => {
      it('should default to Zod for unknown validation library', () => {
        const builder = new MiddlewareBuilder(createContext({ validationLibrary: 'yup' }));
        const file = builder.buildValidationMiddleware();

        expect(file.code).toContain('ZodSchema');
        expect(file.dependencies).toContain('zod');
      });
    });
  });

  describe('buildErrorHandler', () => {
    it('should generate error handler middleware', () => {
      const builder = new MiddlewareBuilder(createContext());
      const file = builder.buildErrorHandler();

      expect(file.name).toBe('errorHandler');
      expect(file.fileName).toBe('error-handler.ts');
      expect(file.filePath).toBe('src/middleware/error-handler.ts');
      expect(file.type).toBe('middleware');
    });

    it('should include ApiError class', () => {
      const builder = new MiddlewareBuilder(createContext());
      const file = builder.buildErrorHandler();

      expect(file.code).toContain('class ApiError');
      expect(file.code).toContain('statusCode');
      expect(file.code).toContain('badRequest');
      expect(file.code).toContain('unauthorized');
      expect(file.code).toContain('forbidden');
      expect(file.code).toContain('notFound');
      expect(file.code).toContain('conflict');
      expect(file.code).toContain('internal');
    });

    it('should include Prisma error handling', () => {
      const builder = new MiddlewareBuilder(createContext());
      const file = builder.buildErrorHandler();

      expect(file.code).toContain('PrismaClientKnownRequestError');
      expect(file.code).toContain('P2002');
      expect(file.code).toContain('P2025');
      expect(file.code).toContain('Unique constraint violation');
      expect(file.code).toContain('Record not found');
    });

    it('should include notFoundHandler', () => {
      const builder = new MiddlewareBuilder(createContext());
      const file = builder.buildErrorHandler();

      expect(file.code).toContain('notFoundHandler');
      expect(file.code).toContain('Route not found');
      expect(file.code).toContain('req.path');
    });

    it('should handle production vs development errors', () => {
      const builder = new MiddlewareBuilder(createContext());
      const file = builder.buildErrorHandler();

      expect(file.code).toContain("process.env.NODE_ENV === 'production'");
      expect(file.code).toContain('Internal server error');
    });
  });

  describe('buildLoggingMiddleware', () => {
    it('should generate logging middleware', () => {
      const builder = new MiddlewareBuilder(createContext());
      const file = builder.buildLoggingMiddleware();

      expect(file.name).toBe('requestLogger');
      expect(file.fileName).toBe('logging.ts');
      expect(file.filePath).toBe('src/middleware/logging.ts');
      expect(file.type).toBe('middleware');
    });

    it('should include request logging functionality', () => {
      const builder = new MiddlewareBuilder(createContext());
      const file = builder.buildLoggingMiddleware();

      expect(file.code).toContain('requestLogger');
      expect(file.code).toContain('Date.now()');
      expect(file.code).toContain("res.on('finish'");
      expect(file.code).toContain('req.method');
      expect(file.code).toContain('req.path');
      expect(file.code).toContain('res.statusCode');
      expect(file.code).toContain('duration');
      expect(file.code).toContain('timestamp');
    });

    it('should not log in test environment', () => {
      const builder = new MiddlewareBuilder(createContext());
      const file = builder.buildLoggingMiddleware();

      expect(file.code).toContain("process.env.NODE_ENV !== 'test'");
    });
  });

  describe('buildIndex', () => {
    it('should generate index file with auth exports when auth is enabled', () => {
      const builder = new MiddlewareBuilder(createContext({ authMethod: 'jwt' }));
      const file = builder.buildIndex();

      expect(file.name).toBe('middleware');
      expect(file.fileName).toBe('index.ts');
      expect(file.filePath).toBe('src/middleware/index.ts');
      expect(file.code).toContain('authenticate');
      expect(file.code).toContain('optionalAuth');
      expect(file.code).toContain('validate');
      expect(file.code).toContain('errorHandler');
      expect(file.code).toContain('notFoundHandler');
      expect(file.code).toContain('ApiError');
      expect(file.code).toContain('requestLogger');
    });

    it('should generate index file without auth exports when auth is none', () => {
      const builder = new MiddlewareBuilder(createContext({ authMethod: 'none' }));
      const file = builder.buildIndex();

      expect(file.code).not.toContain('authenticate');
      expect(file.code).not.toContain('optionalAuth');
      expect(file.code).toContain('validate');
      expect(file.code).toContain('errorHandler');
    });
  });

  describe('Dependencies', () => {
    it('should return correct dependencies for JWT auth', () => {
      const builder = new MiddlewareBuilder(createContext({ authMethod: 'jwt' }));
      const file = builder.buildAuthMiddleware();

      expect(file.dependencies).toEqual(['express', 'jsonwebtoken']);
    });

    it('should return correct dependencies for session auth', () => {
      const builder = new MiddlewareBuilder(createContext({ authMethod: 'session' }));
      const file = builder.buildAuthMiddleware();

      expect(file.dependencies).toEqual(['express', 'express-session']);
    });

    it('should return correct dependencies for API key auth', () => {
      const builder = new MiddlewareBuilder(createContext({ authMethod: 'apikey' }));
      const file = builder.buildAuthMiddleware();

      expect(file.dependencies).toEqual(['express']);
    });

    it('should return correct dependencies for Zod validation', () => {
      const builder = new MiddlewareBuilder(createContext({ validationLibrary: 'zod' }));
      const file = builder.buildValidationMiddleware();

      expect(file.dependencies).toEqual(['express', 'zod']);
    });

    it('should return correct dependencies for Joi validation', () => {
      const builder = new MiddlewareBuilder(createContext({ validationLibrary: 'joi' }));
      const file = builder.buildValidationMiddleware();

      expect(file.dependencies).toEqual(['express', 'joi']);
    });

    it('should return correct dependencies for class-validator', () => {
      const builder = new MiddlewareBuilder(createContext({ validationLibrary: 'class-validator' }));
      const file = builder.buildValidationMiddleware();

      expect(file.dependencies).toEqual(['express', 'class-validator', 'class-transformer']);
    });

    it('should default to Zod dependencies for unknown validation library', () => {
      const builder = new MiddlewareBuilder(createContext({ validationLibrary: 'yup' }));
      const file = builder.buildValidationMiddleware();

      expect(file.dependencies).toEqual(['express', 'zod']);
    });
  });

  describe('File Structure', () => {
    it('should generate files with correct type', () => {
      const builder = new MiddlewareBuilder(createContext());
      const files = builder.buildAll();

      files.forEach(file => {
        expect(file.type).toBe('middleware');
      });
    });

    it('should generate files with correct paths', () => {
      const builder = new MiddlewareBuilder(createContext({ authMethod: 'jwt' }));
      const files = builder.buildAll();

      expect(files.find(f => f.fileName === 'auth.ts')?.filePath).toBe('src/middleware/auth.ts');
      expect(files.find(f => f.fileName === 'validation.ts')?.filePath).toBe('src/middleware/validation.ts');
      expect(files.find(f => f.fileName === 'error-handler.ts')?.filePath).toBe('src/middleware/error-handler.ts');
      expect(files.find(f => f.fileName === 'logging.ts')?.filePath).toBe('src/middleware/logging.ts');
      expect(files.find(f => f.fileName === 'index.ts')?.filePath).toBe('src/middleware/index.ts');
    });
  });
});
