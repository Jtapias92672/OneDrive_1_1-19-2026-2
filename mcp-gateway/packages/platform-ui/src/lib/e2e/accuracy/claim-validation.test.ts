/**
 * Accuracy Claim Validation E2E Tests
 * Epic 12: Verifies Epic 14 accuracy integration
 */

import { claimDetector } from '@/lib/accuracy/claims';
import { tier1Validator } from '@/lib/accuracy/validation/tier1-validator';
import { frontierService } from '@/lib/accuracy/frontier';
import { calibrationService } from '@/lib/accuracy/calibration';
import { confidenceCalculator } from '@/lib/accuracy/confidence';

describe('Accuracy Claim Validation E2E', () => {
  beforeEach(() => {
    calibrationService.reset();
    frontierService.reset();
  });

  describe('claim detection pipeline', () => {
    it('detects claims in generated code comments', () => {
      const code = `
        // This component renders 5 + 5 = 10 items
        // Created in 2013 when React was released
        export const MyComponent = () => <div>Hello</div>;
      `;

      const result = claimDetector.detect(code);

      expect(result.claims.length).toBeGreaterThan(0);
      expect(result.claims.some((c) => c.category === 'mathematical')).toBe(true);
    });

    it('categorizes claims correctly', () => {
      const content = `
        The speed of light is 299792458 m/s.
        React was released in 2013.
        This file contains 500 lines of code.
      `;

      const result = claimDetector.detect(content);

      const categories = result.claims.map((c) => c.category);
      expect(categories).toContain('scientific');
      expect(categories).toContain('temporal');
    });
  });

  describe('tier 1 validation', () => {
    it('validates arithmetic claims locally', async () => {
      const claim = {
        id: 'claim-1',
        text: '5 + 5 = 10',
        category: 'mathematical' as const,
        context: 'test',
        startIndex: 0,
        endIndex: 10,
        confidence: 0.9,
        patterns: ['arithmetic'],
      };

      const result = await tier1Validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('verified');
      expect(result?.tier).toBe(1);
      expect(result?.source).toBe('local-arithmetic');
    });

    it('validates scientific constants locally', async () => {
      const claim = {
        id: 'claim-2',
        text: 'The speed of light is 299792458 m/s',
        category: 'scientific' as const,
        context: 'test',
        startIndex: 0,
        endIndex: 35,
        confidence: 0.9,
        patterns: ['constant'],
      };

      const result = await tier1Validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('verified');
      expect(result?.source).toBe('local-constant');
    });

    it('fails incorrect arithmetic', async () => {
      const claim = {
        id: 'claim-3',
        text: '5 + 5 = 11',
        category: 'mathematical' as const,
        context: 'test',
        startIndex: 0,
        endIndex: 10,
        confidence: 0.9,
        patterns: ['arithmetic'],
      };

      const result = await tier1Validator.validate(claim);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('failed');
    });
  });

  describe('frontier zone management', () => {
    it('tracks outcomes by task type', () => {
      const outcome = {
        taskType: 'code-generation' as const,
        success: true,
        confidence: 90,
        duration: 1000,
        factors: [],
        timestamp: new Date(),
      };

      const updatedZone = frontierService.recordOutcome(outcome);

      expect(updatedZone.totalAttempts).toBeGreaterThan(0);
      expect(updatedZone.successfulAttempts).toBeGreaterThan(0);
    });

    it('provides workflow recommendations', () => {
      const recommendation = frontierService.getRecommendation('code-generation');

      expect(recommendation.workflow).toBeDefined();
      expect(['autonomous', 'supervised', 'human-required']).toContain(
        recommendation.workflow
      );
      expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
    });

    it('returns all 12 default zones', () => {
      const zones = frontierService.getAllZones();

      expect(zones.length).toBe(12);
      expect(zones.map((z) => z.taskType)).toContain('code-generation');
      expect(zones.map((z) => z.taskType)).toContain('security-review');
    });
  });

  describe('calibration tracking', () => {
    it('tracks user predictions', () => {
      const prediction = calibrationService.createPrediction(
        'user-e2e',
        'task-1',
        'code-generation',
        true,
        80
      );

      expect(prediction.id).toBeDefined();
      expect(prediction.userId).toBe('user-e2e');
      expect(prediction.predictedConfidence).toBe(80);
    });

    it('resolves predictions with outcomes', () => {
      const prediction = calibrationService.createPrediction(
        'user-e2e',
        'task-2',
        'code-generation',
        true,
        75
      );

      const resolved = calibrationService.resolvePrediction(prediction.id, true, 80);

      expect(resolved.resolvedAt).toBeInstanceOf(Date);
      expect(resolved.actualSuccess).toBe(true);
      expect(resolved.wasCorrect).toBe(true);
    });

    it('calculates user calibration stats', () => {
      // Create multiple predictions
      for (let i = 0; i < 5; i++) {
        const pred = calibrationService.createPrediction(
          'user-e2e',
          `task-${i}`,
          'test',
          true,
          70
        );
        calibrationService.resolvePrediction(pred.id, i < 4); // 4/5 correct
      }

      const stats = calibrationService.getStats('user-e2e');

      expect(stats.totalPredictions).toBe(5);
      expect(stats.correctPredictions).toBe(4);
      expect(stats.accuracy).toBe(80);
    });
  });

  describe('confidence calculation', () => {
    it('calculates confidence from validation results', () => {
      const validations = [
        {
          claimId: 'c1',
          claim: {
            id: 'c1',
            text: 'test',
            category: 'mathematical' as const,
            context: '',
            startIndex: 0,
            endIndex: 4,
            confidence: 0.9,
            patterns: [],
          },
          tier: 1 as const,
          source: 'local',
          status: 'verified' as const,
          match: true,
          confidence: 100,
          confidenceFactors: [],
          wolframUsed: false,
          wolframCost: 0,
          validatedAt: new Date(),
        },
        {
          claimId: 'c2',
          claim: {
            id: 'c2',
            text: 'test2',
            category: 'mathematical' as const,
            context: '',
            startIndex: 0,
            endIndex: 5,
            confidence: 0.9,
            patterns: [],
          },
          tier: 1 as const,
          source: 'local',
          status: 'failed' as const,
          match: false,
          confidence: 0,
          confidenceFactors: [],
          wolframUsed: false,
          wolframCost: 0,
          validatedAt: new Date(),
        },
      ];

      const result = confidenceCalculator.calculate(validations);

      expect(result.overallScore).toBeLessThan(100);
      expect(result.verifiedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(['low', 'medium', 'high']).toContain(result.level);
    });

    it('provides display helpers', () => {
      expect(confidenceCalculator.getLabel(95)).toBe('Very High');
      expect(confidenceCalculator.getLabel(75)).toBe('Medium');
      expect(confidenceCalculator.getLabel(30)).toBe('Very Low');

      expect(confidenceCalculator.getColor(85)).toBe('green');
      expect(confidenceCalculator.getColor(65)).toBe('yellow');
      expect(confidenceCalculator.getColor(40)).toBe('red');
    });
  });
});
