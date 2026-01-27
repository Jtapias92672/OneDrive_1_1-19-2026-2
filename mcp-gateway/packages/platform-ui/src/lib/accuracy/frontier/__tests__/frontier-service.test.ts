/**
 * Frontier Service Tests
 * Epic 14: Zone management and outcome tracking
 */

import { FrontierService, FrontierOutcome, TaskType } from '../';

describe('FrontierService', () => {
  let service: FrontierService;

  beforeEach(() => {
    service = new FrontierService();
  });

  afterEach(() => {
    service.reset();
  });

  describe('getAllZones', () => {
    it('returns 12 default zones', () => {
      const zones = service.getAllZones();
      expect(zones.length).toBe(12);
    });

    it('includes all expected task types', () => {
      const zones = service.getAllZones();
      const types = zones.map((z) => z.taskType);

      expect(types).toContain('code-generation');
      expect(types).toContain('code-review');
      expect(types).toContain('bug-fix');
      expect(types).toContain('refactoring');
      expect(types).toContain('documentation');
      expect(types).toContain('testing');
      expect(types).toContain('architecture');
      expect(types).toContain('data-analysis');
      expect(types).toContain('ui-design');
      expect(types).toContain('api-design');
      expect(types).toContain('security-review');
      expect(types).toContain('performance-optimization');
    });

    it('zones have required properties', () => {
      const zones = service.getAllZones();

      for (const zone of zones) {
        expect(zone.taskType).toBeDefined();
        expect(zone.successRate).toBeGreaterThanOrEqual(0);
        expect(zone.successRate).toBeLessThanOrEqual(100);
        expect(zone.totalAttempts).toBeGreaterThan(0);
        expect(['green', 'yellow', 'red']).toContain(zone.status);
        expect(['autonomous', 'supervised', 'human-required']).toContain(
          zone.recommendedWorkflow
        );
      }
    });
  });

  describe('getZone', () => {
    it('returns zone for valid task type', () => {
      const zone = service.getZone('code-generation');

      expect(zone).not.toBeNull();
      expect(zone!.taskType).toBe('code-generation');
    });

    it('returns null for invalid task type', () => {
      const zone = service.getZone('invalid-type' as TaskType);
      expect(zone).toBeNull();
    });
  });

  describe('recordOutcome', () => {
    it('updates zone on successful outcome', () => {
      const initialZone = service.getZone('code-generation')!;
      const initialAttempts = initialZone.totalAttempts;
      const initialSuccess = initialZone.successfulAttempts;

      const outcome: FrontierOutcome = {
        taskType: 'code-generation',
        success: true,
        confidence: 90,
        duration: 1000,
        factors: [],
        timestamp: new Date(),
      };

      const updatedZone = service.recordOutcome(outcome);

      expect(updatedZone.totalAttempts).toBe(initialAttempts + 1);
      expect(updatedZone.successfulAttempts).toBe(initialSuccess + 1);
    });

    it('updates zone on failed outcome', () => {
      const initialZone = service.getZone('code-generation')!;
      const initialAttempts = initialZone.totalAttempts;
      const initialSuccess = initialZone.successfulAttempts;

      const outcome: FrontierOutcome = {
        taskType: 'code-generation',
        success: false,
        confidence: 30,
        duration: 2000,
        factors: [],
        timestamp: new Date(),
      };

      const updatedZone = service.recordOutcome(outcome);

      expect(updatedZone.totalAttempts).toBe(initialAttempts + 1);
      expect(updatedZone.successfulAttempts).toBe(initialSuccess);
    });

    it('throws for invalid task type', () => {
      const outcome: FrontierOutcome = {
        taskType: 'invalid' as TaskType,
        success: true,
        confidence: 90,
        duration: 1000,
        factors: [],
        timestamp: new Date(),
      };

      expect(() => service.recordOutcome(outcome)).toThrow('Unknown task type');
    });

    it('updates status based on success rate', () => {
      // Record many failures to push success rate down
      for (let i = 0; i < 100; i++) {
        service.recordOutcome({
          taskType: 'documentation',
          success: false,
          confidence: 10,
          duration: 1000,
          factors: [],
          timestamp: new Date(),
        });
      }

      const zone = service.getZone('documentation');
      expect(['yellow', 'red']).toContain(zone!.status);
    });
  });

  describe('getStats', () => {
    it('returns stats for all zones', () => {
      const stats = service.getStats();

      expect(stats.totalZones).toBe(12);
      expect(stats.greenZones).toBeGreaterThan(0);
      expect(stats.overallSuccessRate).toBeGreaterThan(0);
      expect(stats.mostReliable.length).toBe(3);
      expect(stats.leastReliable.length).toBe(3);
    });

    it('most reliable and least reliable are different', () => {
      const stats = service.getStats();

      const mostReliableSet = new Set(stats.mostReliable);
      for (const task of stats.leastReliable) {
        expect(mostReliableSet.has(task)).toBe(false);
      }
    });
  });

  describe('getRecommendation', () => {
    it('returns recommendation for valid task type', () => {
      const rec = service.getRecommendation('documentation');

      expect(rec.workflow).toBe('autonomous');
      expect(rec.confidence).toBeGreaterThan(0);
      expect(rec.reasons.length).toBeGreaterThan(0);
    });

    it('returns human-required for unknown task type', () => {
      const rec = service.getRecommendation('unknown' as TaskType);

      expect(rec.workflow).toBe('human-required');
      expect(rec.confidence).toBe(0);
    });

    it('security review requires human', () => {
      const rec = service.getRecommendation('security-review');
      expect(rec.workflow).toBe('human-required');
    });
  });

  describe('reset', () => {
    it('resets to default zones', () => {
      service.recordOutcome({
        taskType: 'code-generation',
        success: true,
        confidence: 90,
        duration: 1000,
        factors: [],
        timestamp: new Date(),
      });

      const beforeReset = service.getZone('code-generation')!;
      service.reset();
      const afterReset = service.getZone('code-generation')!;

      expect(afterReset.totalAttempts).toBeLessThan(beforeReset.totalAttempts);
    });
  });
});
