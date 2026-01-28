/**
 * Express Generator Configuration
 * Epic 14: Backend Code Generation
 */

import { ExpressGeneratorConfig, FormattingOptions } from './types';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_FORMATTING: FormattingOptions = {
  indentation: 'spaces',
  indentSize: 2,
  quotes: 'single',
  trailingComma: 'es5',
  semicolons: true,
  printWidth: 100,
};

export const DEFAULT_CONFIG: ExpressGeneratorConfig = {
  typescript: true,
  ormFramework: 'prisma',
  apiStyle: 'rest',

  generateControllers: true,
  generateServices: true,
  generateRoutes: true,
  generateMiddleware: true,
  generateTests: false,
  generateDocs: false,

  authMethod: 'jwt',
  validationLibrary: 'zod',
  useTransactions: true,
  useSoftDelete: true,

  namingConvention: 'camelCase',
  formatting: DEFAULT_FORMATTING,
};

// ============================================================================
// Preset Configurations
// ============================================================================

export const PRISMA_PRESET: Partial<ExpressGeneratorConfig> = {
  ormFramework: 'prisma',
  typescript: true,
  generateControllers: true,
  generateServices: true,
  generateRoutes: true,
  validationLibrary: 'zod',
};

export const TYPEORM_PRESET: Partial<ExpressGeneratorConfig> = {
  ormFramework: 'typeorm',
  typescript: true,
  generateControllers: true,
  generateServices: true,
  generateRoutes: true,
  validationLibrary: 'class-validator',
};

export const MINIMAL_PRESET: Partial<ExpressGeneratorConfig> = {
  ormFramework: 'prisma',
  typescript: true,
  generateControllers: true,
  generateServices: false,
  generateRoutes: true,
  generateMiddleware: false,
  generateTests: false,
  authMethod: 'none',
};

export const FULL_PRESET: Partial<ExpressGeneratorConfig> = {
  ormFramework: 'prisma',
  typescript: true,
  generateControllers: true,
  generateServices: true,
  generateRoutes: true,
  generateMiddleware: true,
  generateTests: true,
  generateDocs: true,
  authMethod: 'jwt',
  useTransactions: true,
  useSoftDelete: true,
};

// ============================================================================
// Configuration Helpers
// ============================================================================

export function createConfig(
  overrides: Partial<ExpressGeneratorConfig> = {}
): ExpressGeneratorConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    formatting: {
      ...DEFAULT_FORMATTING,
      ...overrides.formatting,
    },
  };
}

export function applyPreset(
  presetName: 'prisma' | 'typeorm' | 'minimal' | 'full',
  overrides: Partial<ExpressGeneratorConfig> = {}
): ExpressGeneratorConfig {
  const presets: Record<string, Partial<ExpressGeneratorConfig>> = {
    prisma: PRISMA_PRESET,
    typeorm: TYPEORM_PRESET,
    minimal: MINIMAL_PRESET,
    full: FULL_PRESET,
  };

  const preset = presets[presetName] || {};

  return createConfig({
    ...preset,
    ...overrides,
  });
}

export function validateConfig(config: ExpressGeneratorConfig): string[] {
  const errors: string[] = [];

  // Validate ORM framework
  const validOrms = ['prisma', 'typeorm', 'drizzle'];
  if (!validOrms.includes(config.ormFramework)) {
    errors.push(`Invalid ORM framework: ${config.ormFramework}`);
  }

  // Validate API style
  const validApiStyles = ['rest', 'graphql', 'both'];
  if (!validApiStyles.includes(config.apiStyle)) {
    errors.push(`Invalid API style: ${config.apiStyle}`);
  }

  // Validate auth method
  const validAuthMethods = ['jwt', 'session', 'apikey', 'none'];
  if (!validAuthMethods.includes(config.authMethod)) {
    errors.push(`Invalid auth method: ${config.authMethod}`);
  }

  // Validate validation library
  const validValidationLibs = ['zod', 'joi', 'class-validator', 'yup'];
  if (!validValidationLibs.includes(config.validationLibrary)) {
    errors.push(`Invalid validation library: ${config.validationLibrary}`);
  }

  // Validate formatting
  if (config.formatting.indentSize < 1 || config.formatting.indentSize > 8) {
    errors.push('Indent size must be between 1 and 8');
  }

  if (config.formatting.printWidth < 40 || config.formatting.printWidth > 200) {
    errors.push('Print width must be between 40 and 200');
  }

  return errors;
}
