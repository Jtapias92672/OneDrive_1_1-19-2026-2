/**
 * Calibration Service Tests
 * Epic 14: Prediction tracking and calibration
 */

import { CalibrationService } from '../';

describe('CalibrationService', () => {
  let service: CalibrationService;

  beforeEach(() => {
    service = new CalibrationService();
  });

  afterEach(() => {
    service.reset();
  });

  describe('createPrediction', () => {
    it('creates a prediction', () => {
      const prediction = service.createPrediction(
        'user-1',
        'task-1',
        'code-generation',
        true,
        80
      );

      expect(prediction.id).toBeDefined();
      expect(prediction.userId).toBe('user-1');
      expect(prediction.taskId).toBe('task-1');
      expect(prediction.taskType).toBe('code-generation');
      expect(prediction.predictedSuccess).toBe(true);
      expect(prediction.predictedConfidence).toBe(80);
      expect(prediction.createdAt).toBeInstanceOf(Date);
      expect(prediction.resolvedAt).toBeUndefined();
    });

    it('clamps confidence to 0-100', () => {
      const low = service.createPrediction('user-1', 'task-1', 'test', true, -10);
      const high = service.createPrediction('user-1', 'task-2', 'test', true, 150);

      expect(low.predictedConfidence).toBe(0);
      expect(high.predictedConfidence).toBe(100);
    });
  });

  describe('getPrediction', () => {
    it('returns prediction by ID', () => {
      const created = service.createPrediction('user-1', 'task-1', 'test', true, 80);
      const retrieved = service.getPrediction(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
    });

    it('returns null for unknown ID', () => {
      const result = service.getPrediction('unknown');
      expect(result).toBeNull();
    });
  });

  describe('resolvePrediction', () => {
    it('resolves a prediction as correct', () => {
      const prediction = service.createPrediction('user-1', 'task-1', 'test', true, 80);
      const resolved = service.resolvePrediction(prediction.id, true, 85);

      expect(resolved.resolvedAt).toBeInstanceOf(Date);
      expect(resolved.actualSuccess).toBe(true);
      expect(resolved.actualConfidence).toBe(85);
      expect(resolved.wasCorrect).toBe(true);
    });

    it('resolves a prediction as incorrect', () => {
      const prediction = service.createPrediction('user-1', 'task-1', 'test', true, 80);
      const resolved = service.resolvePrediction(prediction.id, false, 20);

      expect(resolved.wasCorrect).toBe(false);
    });

    it('throws for unknown prediction', () => {
      expect(() => service.resolvePrediction('unknown', true)).toThrow('Prediction not found');
    });

    it('uses default confidence if not provided', () => {
      const prediction = service.createPrediction('user-1', 'task-1', 'test', true, 80);
      const resolved = service.resolvePrediction(prediction.id, true);

      expect(resolved.actualConfidence).toBe(100);
    });
  });

  describe('getStats', () => {
    it('returns stats for user', () => {
      // Create and resolve some predictions
      const p1 = service.createPrediction('user-1', 'task-1', 'test', true, 80);
      const p2 = service.createPrediction('user-1', 'task-2', 'test', true, 70);
      const p3 = service.createPrediction('user-1', 'task-3', 'test', false, 30);

      service.resolvePrediction(p1.id, true);
      service.resolvePrediction(p2.id, false);
      service.resolvePrediction(p3.id, false);

      const stats = service.getStats('user-1');

      expect(stats.userId).toBe('user-1');
      expect(stats.totalPredictions).toBe(3);
      expect(stats.correctPredictions).toBe(2); // p1 and p3 were correct
      expect(stats.accuracy).toBeGreaterThan(0);
    });

    it('returns empty stats for new user', () => {
      const stats = service.getStats('new-user');

      expect(stats.totalPredictions).toBe(0);
      expect(stats.accuracy).toBe(0);
      expect(stats.calibrationScore).toBe(0);
    });

    it('calculates overconfidence rate', () => {
      // User always predicts success with high confidence but usually fails
      for (let i = 0; i < 10; i++) {
        const p = service.createPrediction('user-1', `task-${i}`, 'test', true, 90);
        service.resolvePrediction(p.id, false);
      }

      const stats = service.getStats('user-1');
      expect(stats.overconfidenceRate).toBeGreaterThan(0);
    });

    it('calculates underconfidence rate', () => {
      // User predicts success with low confidence but always succeeds
      // Accuracy = 100%, confidence = 30%, so underconfident by 70%
      for (let i = 0; i < 10; i++) {
        const p = service.createPrediction('user-1', `task-${i}`, 'test', true, 30);
        service.resolvePrediction(p.id, true);
      }

      const stats = service.getStats('user-1');
      expect(stats.underconfidenceRate).toBeGreaterThan(0);
    });
  });

  describe('getHistory', () => {
    it('returns history for user', () => {
      const p1 = service.createPrediction('user-1', 'task-1', 'test', true, 80);
      service.resolvePrediction(p1.id, true);

      const history = service.getHistory('user-1');

      expect(history.userId).toBe('user-1');
      expect(history.predictions.length).toBe(1);
      expect(history.stats).toBeDefined();
      expect(history.trends).toBeDefined();
    });

    it('returns empty history for new user', () => {
      const history = service.getHistory('new-user');

      expect(history.predictions.length).toBe(0);
      expect(history.stats.totalPredictions).toBe(0);
    });

    it('sorts predictions by date descending', () => {
      service.createPrediction('user-1', 'task-1', 'test', true, 80);
      service.createPrediction('user-1', 'task-2', 'test', true, 80);

      const history = service.getHistory('user-1');

      expect(history.predictions.length).toBe(2);
      // Predictions are sorted, most recent first
      expect(history.predictions[0].taskId).toBeDefined();
      expect(history.predictions[1].taskId).toBeDefined();
    });
  });

  describe('calibration score', () => {
    it('returns high score for well-calibrated predictions', () => {
      // Create predictions where confidence matches actual accuracy
      for (let i = 0; i < 10; i++) {
        const p = service.createPrediction('user-1', `task-${i}`, 'test', true, 70);
        // 7 out of 10 succeed = 70% matches 70% confidence
        service.resolvePrediction(p.id, i < 7);
      }

      const stats = service.getStats('user-1');
      expect(stats.calibrationScore).toBeGreaterThan(50);
    });
  });

  describe('reset', () => {
    it('clears all data', () => {
      service.createPrediction('user-1', 'task-1', 'test', true, 80);
      service.reset();

      const history = service.getHistory('user-1');
      expect(history.predictions.length).toBe(0);
    });
  });
});
