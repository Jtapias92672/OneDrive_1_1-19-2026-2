/**
 * Confidence Calculator Tests
 * Epic 14: Confidence Scoring
 */

import { ConfidenceCalculator } from '../../confidence/confidence-calculator';
import { ValidationResult } from '../types';
import { DetectedClaim } from '../../claims/types';

function createValidation(
  status: 'verified' | 'unverified' | 'failed',
  tier: 0 | 1 | 2 | 3,
  category: 'mathematical' | 'scientific' | 'temporal' = 'mathematical'
): ValidationResult {
  const claim: DetectedClaim = {
    id: `claim-${Date.now()}-${Math.random()}`,
    text: 'test claim',
    category,
    context: 'test context',
    startIndex: 0,
    endIndex: 10,
    confidence: 0.9,
    patterns: ['test'],
  };

  return {
    claimId: claim.id,
    claim,
    tier,
    source: 'test',
    status,
    match: status === 'verified',
    confidence: status === 'verified' ? 100 : status === 'failed' ? 0 : 50,
    confidenceFactors: [],
    wolframUsed: tier === 3,
    wolframCost: tier === 3 ? 0.001 : 0,
    validatedAt: new Date(),
  };
}

describe('ConfidenceCalculator', () => {
  let calculator: ConfidenceCalculator;

  beforeEach(() => {
    calculator = new ConfidenceCalculator();
  });

  describe('calculate', () => {
    it('returns high confidence for all verified', () => {
      const validations = [
        createValidation('verified', 1),
        createValidation('verified', 1),
        createValidation('verified', 2),
      ];

      const result = calculator.calculate(validations);

      expect(result.overallScore).toBe(100);
      expect(result.level).toBe('high');
      expect(result.verifiedCount).toBe(3);
      expect(result.failedCount).toBe(0);
    });

    it('reduces score for failed claims', () => {
      const validations = [
        createValidation('verified', 1),
        createValidation('failed', 1),
      ];

      const result = calculator.calculate(validations);

      expect(result.overallScore).toBeLessThan(100);
      expect(result.failedCount).toBe(1);
    });

    it('reduces score for unverified claims', () => {
      const validations = [
        createValidation('verified', 1),
        createValidation('unverified', 0),
      ];

      const result = calculator.calculate(validations);

      expect(result.overallScore).toBeLessThan(100);
      expect(result.unverifiedCount).toBe(1);
    });

    it('returns level low for poor scores', () => {
      const validations = [
        createValidation('failed', 1),
        createValidation('failed', 1),
        createValidation('verified', 1),
      ];

      const result = calculator.calculate(validations);

      expect(result.level).toBe('low');
    });

    it('returns level medium for moderate scores', () => {
      const validations = [
        createValidation('verified', 1),
        createValidation('verified', 1),
        createValidation('unverified', 0),
        createValidation('failed', 1),
      ];

      const result = calculator.calculate(validations);

      expect(['low', 'medium']).toContain(result.level);
    });

    it('handles empty validations', () => {
      const result = calculator.calculate([]);

      expect(result.overallScore).toBe(100);
      expect(result.level).toBe('high');
      expect(result.claimCount).toBe(0);
    });

    it('calculates category scores', () => {
      const validations = [
        createValidation('verified', 1, 'mathematical'),
        createValidation('failed', 1, 'mathematical'),
        createValidation('verified', 2, 'scientific'),
      ];

      const result = calculator.calculate(validations);

      expect(result.categoryScores.mathematical).toBe(50); // 1/2 verified
      expect(result.categoryScores.scientific).toBe(100); // 1/1 verified
    });

    it('includes content ID from parameter', () => {
      const validations = [createValidation('verified', 1)];
      const result = calculator.calculate(validations, 'my-content-id');

      expect(result.contentId).toBe('my-content-id');
    });

    it('includes confidence factors', () => {
      const validations = [
        createValidation('verified', 1),
        createValidation('verified', 2),
      ];

      const result = calculator.calculate(validations);

      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.factors.some((f) => f.name === 'verification-rate')).toBe(true);
      expect(result.factors.some((f) => f.name === 'failure-rate')).toBe(true);
    });
  });

  describe('getLevel', () => {
    it('returns high for >= 80', () => {
      expect(calculator.getLevel(80)).toBe('high');
      expect(calculator.getLevel(100)).toBe('high');
    });

    it('returns medium for 50-79', () => {
      expect(calculator.getLevel(50)).toBe('medium');
      expect(calculator.getLevel(79)).toBe('medium');
    });

    it('returns low for < 50', () => {
      expect(calculator.getLevel(0)).toBe('low');
      expect(calculator.getLevel(49)).toBe('low');
    });
  });

  describe('getLabel', () => {
    it('returns Very High for >= 90', () => {
      expect(calculator.getLabel(90)).toBe('Very High');
      expect(calculator.getLabel(100)).toBe('Very High');
    });

    it('returns High for 80-89', () => {
      expect(calculator.getLabel(80)).toBe('High');
      expect(calculator.getLabel(89)).toBe('High');
    });

    it('returns Medium for 60-79', () => {
      expect(calculator.getLabel(60)).toBe('Medium');
      expect(calculator.getLabel(79)).toBe('Medium');
    });

    it('returns Low for 40-59', () => {
      expect(calculator.getLabel(40)).toBe('Low');
      expect(calculator.getLabel(59)).toBe('Low');
    });

    it('returns Very Low for < 40', () => {
      expect(calculator.getLabel(0)).toBe('Very Low');
      expect(calculator.getLabel(39)).toBe('Very Low');
    });
  });

  describe('getColor', () => {
    it('returns green for >= 80', () => {
      expect(calculator.getColor(80)).toBe('green');
      expect(calculator.getColor(100)).toBe('green');
    });

    it('returns yellow for 50-79', () => {
      expect(calculator.getColor(50)).toBe('yellow');
      expect(calculator.getColor(79)).toBe('yellow');
    });

    it('returns red for < 50', () => {
      expect(calculator.getColor(0)).toBe('red');
      expect(calculator.getColor(49)).toBe('red');
    });
  });

  describe('getHexColor', () => {
    it('returns green hex for high scores', () => {
      expect(calculator.getHexColor(80)).toBe('#22C55E');
    });

    it('returns yellow hex for medium scores', () => {
      expect(calculator.getHexColor(60)).toBe('#EAB308');
    });

    it('returns red hex for low scores', () => {
      expect(calculator.getHexColor(30)).toBe('#EF4444');
    });
  });
});
