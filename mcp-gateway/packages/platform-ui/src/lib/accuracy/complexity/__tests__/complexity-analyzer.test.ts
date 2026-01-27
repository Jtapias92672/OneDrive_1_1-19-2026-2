/**
 * Complexity Analyzer Tests
 * Epic 14: 5-factor complexity scoring
 */

import { ComplexityAnalyzer } from '../';

describe('ComplexityAnalyzer', () => {
  let analyzer: ComplexityAnalyzer;

  beforeEach(() => {
    analyzer = new ComplexityAnalyzer();
  });

  describe('analyze', () => {
    it('returns low complexity for simple task', () => {
      const result = analyzer.analyze({
        description: 'Fix a typo in README',
        fileCount: 1,
        linesChanged: 1,
      });

      expect(result.level).toBe('low');
      expect(result.score).toBeLessThan(30);
      expect(result.recommendedWorkflow).toBe('autonomous');
    });

    it('returns high complexity for complex task', () => {
      const result = analyzer.analyze({
        description: 'Refactor database migration with security implications',
        fileCount: 20,
        linesChanged: 500,
        dependencyCount: 15,
        isNewFeature: true,
        hasSecurityImplications: true,
        affectsPublicApi: true,
      });

      expect(['high', 'extreme']).toContain(result.level);
      expect(result.score).toBeGreaterThan(50);
      expect(result.recommendedWorkflow).toBe('human-required');
    });

    it('includes all 5 factors', () => {
      const result = analyzer.analyze({
        description: 'Test task',
      });

      expect(result.factors.codeSize).toBeDefined();
      expect(result.factors.dependencies).toBeDefined();
      expect(result.factors.contextRequired).toBeDefined();
      expect(result.factors.novelty).toBeDefined();
      expect(result.factors.riskLevel).toBeDefined();
    });

    it('returns breakdown for each factor', () => {
      const result = analyzer.analyze({
        description: 'Test task',
      });

      expect(result.breakdown.length).toBe(5);

      for (const factor of result.breakdown) {
        expect(factor.name).toBeDefined();
        expect(factor.score).toBeGreaterThanOrEqual(0);
        expect(factor.score).toBeLessThanOrEqual(100);
        expect(factor.weight).toBeGreaterThan(0);
        expect(factor.contribution).toBeDefined();
        expect(factor.description).toBeDefined();
      }
    });

    it('generates warnings for high risk factors', () => {
      const result = analyzer.analyze({
        description: 'Add payment processing with security review',
        hasSecurityImplications: true,
        affectsPublicApi: true,
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('Security'))).toBe(true);
    });

    it('includes estimated duration', () => {
      const result = analyzer.analyze({
        description: 'Simple fix',
        fileCount: 1,
        linesChanged: 5,
      });

      expect(result.estimatedDuration).toBeDefined();
      expect(result.estimatedDuration.length).toBeGreaterThan(0);
    });
  });

  describe('factor scoring', () => {
    it('codeSize increases with file count', () => {
      const small = analyzer.analyze({
        description: 'Test',
        fileCount: 1,
        linesChanged: 10,
      });

      const large = analyzer.analyze({
        description: 'Test',
        fileCount: 50,
        linesChanged: 1000,
      });

      expect(large.factors.codeSize).toBeGreaterThan(small.factors.codeSize);
    });

    it('dependencies increases with dependency count', () => {
      const few = analyzer.analyze({
        description: 'Test',
        dependencyCount: 1,
      });

      const many = analyzer.analyze({
        description: 'Test',
        dependencyCount: 30,
      });

      expect(many.factors.dependencies).toBeGreaterThan(few.factors.dependencies);
    });

    it('contextRequired increases for complex descriptions', () => {
      const simple = analyzer.analyze({
        description: 'Fix typo',
      });

      const complex = analyzer.analyze({
        description: 'Refactor database integration with external API migration',
        requiresExternalData: true,
        affectsPublicApi: true,
      });

      expect(complex.factors.contextRequired).toBeGreaterThan(simple.factors.contextRequired);
    });

    it('novelty increases for new features', () => {
      const fix = analyzer.analyze({
        description: 'Fix existing bug',
      });

      const newFeature = analyzer.analyze({
        description: 'Create new experimental feature prototype',
        isNewFeature: true,
      });

      expect(newFeature.factors.novelty).toBeGreaterThan(fix.factors.novelty);
    });

    it('riskLevel increases for security implications', () => {
      const safe = analyzer.analyze({
        description: 'Update documentation',
      });

      const risky = analyzer.analyze({
        description: 'Update authentication security',
        hasSecurityImplications: true,
      });

      expect(risky.factors.riskLevel).toBeGreaterThan(safe.factors.riskLevel);
    });
  });

  describe('level thresholds', () => {
    it('low is below 30', () => {
      const result = analyzer.analyze({
        description: 'Tiny fix',
        fileCount: 1,
        linesChanged: 1,
      });

      if (result.score < 30) {
        expect(result.level).toBe('low');
      }
    });

    it('medium is 30-50', () => {
      const result = analyzer.analyze({
        description: 'Moderate task with some dependencies',
        fileCount: 5,
        linesChanged: 100,
        dependencyCount: 5,
      });

      if (result.score >= 30 && result.score < 50) {
        expect(result.level).toBe('medium');
      }
    });
  });

  describe('workflow recommendations', () => {
    it('autonomous for low complexity', () => {
      const result = analyzer.analyze({
        description: 'Simple task',
        fileCount: 1,
      });

      if (result.level === 'low') {
        expect(result.recommendedWorkflow).toBe('autonomous');
      }
    });

    it('human-required for extreme complexity', () => {
      const result = analyzer.analyze({
        description: 'Major security overhaul with payment system integration',
        fileCount: 100,
        linesChanged: 5000,
        dependencyCount: 50,
        isNewFeature: true,
        hasSecurityImplications: true,
        affectsPublicApi: true,
        requiresExternalData: true,
      });

      expect(result.recommendedWorkflow).toBe('human-required');
    });
  });
});
