/**
 * FORGE Express Generator
 * Epic 14: Backend Code Generation
 *
 * Generates Express.js backends from data models.
 */

// Core exports
export * from './core';

// Utilities
export { NameUtils, CodeFormatter, TypeMapper } from './utils';

// Builders
export {
  PrismaBuilder,
  ControllerBuilder,
  ServiceBuilder,
  RouteBuilder,
  MiddlewareBuilder,
} from './builders';

// Generator
export { ExpressGenerator } from './generator';
