/**
 * Config Tests
 * Epic 14: Backend Code Generation
 */

import {
  DEFAULT_CONFIG,
  DEFAULT_FORMATTING,
  PRISMA_PRESET,
  TYPEORM_PRESET,
  MINIMAL_PRESET,
  FULL_PRESET,
  createConfig,
  applyPreset,
  validateConfig,
} from '../../src/core/config';

describe('Config', () => {
  describe('DEFAULT_FORMATTING', () => {
    it('should have correct defaults', () => {
      expect(DEFAULT_FORMATTING.indentation).toBe('spaces');
      expect(DEFAULT_FORMATTING.indentSize).toBe(2);
      expect(DEFAULT_FORMATTING.quotes).toBe('single');
      expect(DEFAULT_FORMATTING.trailingComma).toBe('es5');
      expect(DEFAULT_FORMATTING.semicolons).toBe(true);
      expect(DEFAULT_FORMATTING.printWidth).toBe(100);
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have correct defaults', () => {
      expect(DEFAULT_CONFIG.typescript).toBe(true);
      expect(DEFAULT_CONFIG.ormFramework).toBe('prisma');
      expect(DEFAULT_CONFIG.apiStyle).toBe('rest');
      expect(DEFAULT_CONFIG.generateControllers).toBe(true);
      expect(DEFAULT_CONFIG.generateServices).toBe(true);
      expect(DEFAULT_CONFIG.generateRoutes).toBe(true);
      expect(DEFAULT_CONFIG.generateMiddleware).toBe(true);
      expect(DEFAULT_CONFIG.generateTests).toBe(false);
      expect(DEFAULT_CONFIG.generateDocs).toBe(false);
      expect(DEFAULT_CONFIG.authMethod).toBe('jwt');
      expect(DEFAULT_CONFIG.validationLibrary).toBe('zod');
      expect(DEFAULT_CONFIG.useTransactions).toBe(true);
      expect(DEFAULT_CONFIG.useSoftDelete).toBe(true);
    });
  });

  describe('PRESETS', () => {
    it('PRISMA_PRESET should have correct values', () => {
      expect(PRISMA_PRESET.ormFramework).toBe('prisma');
      expect(PRISMA_PRESET.typescript).toBe(true);
      expect(PRISMA_PRESET.validationLibrary).toBe('zod');
    });

    it('TYPEORM_PRESET should have correct values', () => {
      expect(TYPEORM_PRESET.ormFramework).toBe('typeorm');
      expect(TYPEORM_PRESET.typescript).toBe(true);
      expect(TYPEORM_PRESET.validationLibrary).toBe('class-validator');
    });

    it('MINIMAL_PRESET should have correct values', () => {
      expect(MINIMAL_PRESET.generateServices).toBe(false);
      expect(MINIMAL_PRESET.generateMiddleware).toBe(false);
      expect(MINIMAL_PRESET.authMethod).toBe('none');
    });

    it('FULL_PRESET should have correct values', () => {
      expect(FULL_PRESET.generateTests).toBe(true);
      expect(FULL_PRESET.generateDocs).toBe(true);
      expect(FULL_PRESET.authMethod).toBe('jwt');
    });
  });

  describe('createConfig', () => {
    it('should return default config when no overrides', () => {
      const config = createConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should merge overrides correctly', () => {
      const config = createConfig({
        ormFramework: 'typeorm',
        authMethod: 'session',
      });

      expect(config.ormFramework).toBe('typeorm');
      expect(config.authMethod).toBe('session');
      expect(config.typescript).toBe(true); // Default preserved
    });

    it('should merge formatting overrides correctly', () => {
      const config = createConfig({
        formatting: {
          ...DEFAULT_FORMATTING,
          indentSize: 4,
          quotes: 'double',
        },
      });

      expect(config.formatting.indentSize).toBe(4);
      expect(config.formatting.quotes).toBe('double');
      expect(config.formatting.semicolons).toBe(true); // Default preserved
    });
  });

  describe('applyPreset', () => {
    it('should apply prisma preset', () => {
      const config = applyPreset('prisma');
      expect(config.ormFramework).toBe('prisma');
      expect(config.validationLibrary).toBe('zod');
    });

    it('should apply typeorm preset', () => {
      const config = applyPreset('typeorm');
      expect(config.ormFramework).toBe('typeorm');
      expect(config.validationLibrary).toBe('class-validator');
    });

    it('should apply minimal preset', () => {
      const config = applyPreset('minimal');
      expect(config.generateServices).toBe(false);
      expect(config.authMethod).toBe('none');
    });

    it('should apply full preset', () => {
      const config = applyPreset('full');
      expect(config.generateTests).toBe(true);
      expect(config.generateDocs).toBe(true);
    });

    it('should allow overrides on top of preset', () => {
      const config = applyPreset('prisma', { authMethod: 'apikey' });
      expect(config.ormFramework).toBe('prisma');
      expect(config.authMethod).toBe('apikey');
    });
  });

  describe('validateConfig', () => {
    it('should return no errors for valid config', () => {
      const errors = validateConfig(DEFAULT_CONFIG);
      expect(errors).toHaveLength(0);
    });

    it('should validate ORM framework', () => {
      const config = createConfig({ ormFramework: 'invalid' as any });
      const errors = validateConfig(config);
      expect(errors).toContain('Invalid ORM framework: invalid');
    });

    it('should validate API style', () => {
      const config = createConfig({ apiStyle: 'invalid' as any });
      const errors = validateConfig(config);
      expect(errors).toContain('Invalid API style: invalid');
    });

    it('should validate auth method', () => {
      const config = createConfig({ authMethod: 'invalid' as any });
      const errors = validateConfig(config);
      expect(errors).toContain('Invalid auth method: invalid');
    });

    it('should validate validation library', () => {
      const config = createConfig({ validationLibrary: 'invalid' as any });
      const errors = validateConfig(config);
      expect(errors).toContain('Invalid validation library: invalid');
    });

    it('should validate indent size range', () => {
      const config = createConfig({
        formatting: { ...DEFAULT_FORMATTING, indentSize: 0 },
      });
      const errors = validateConfig(config);
      expect(errors).toContain('Indent size must be between 1 and 8');
    });

    it('should validate print width range', () => {
      const config = createConfig({
        formatting: { ...DEFAULT_FORMATTING, printWidth: 300 },
      });
      const errors = validateConfig(config);
      expect(errors).toContain('Print width must be between 40 and 200');
    });
  });
});
