/**
 * Calibration Service
 * Epic 14: Track and analyze user predictions
 */

import {
  CalibrationPrediction,
  CalibrationStats,
  CalibrationHistory,
  CalibrationTrend,
} from './types';

export class CalibrationService {
  private predictions: Map<string, CalibrationPrediction> = new Map();
  private userPredictions: Map<string, string[]> = new Map();

  /**
   * Create a new prediction
   */
  createPrediction(
    userId: string,
    taskId: string,
    taskType: string,
    predictedSuccess: boolean,
    predictedConfidence: number
  ): CalibrationPrediction {
    const id = `pred-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const prediction: CalibrationPrediction = {
      id,
      userId,
      taskId,
      taskType,
      predictedSuccess,
      predictedConfidence: Math.min(100, Math.max(0, predictedConfidence)),
      createdAt: new Date(),
    };

    this.predictions.set(id, prediction);

    const userPreds = this.userPredictions.get(userId) || [];
    userPreds.push(id);
    this.userPredictions.set(userId, userPreds);

    return prediction;
  }

  /**
   * Get prediction by ID
   */
  getPrediction(id: string): CalibrationPrediction | null {
    return this.predictions.get(id) || null;
  }

  /**
   * Resolve a prediction with actual outcome
   */
  resolvePrediction(
    id: string,
    actualSuccess: boolean,
    actualConfidence?: number
  ): CalibrationPrediction {
    const prediction = this.predictions.get(id);
    if (!prediction) {
      throw new Error(`Prediction not found: ${id}`);
    }

    const resolved: CalibrationPrediction = {
      ...prediction,
      resolvedAt: new Date(),
      actualSuccess,
      actualConfidence: actualConfidence ?? (actualSuccess ? 100 : 0),
      wasCorrect: prediction.predictedSuccess === actualSuccess,
    };

    this.predictions.set(id, resolved);
    return resolved;
  }

  /**
   * Get user's calibration stats
   */
  getStats(userId: string): CalibrationStats {
    const predIds = this.userPredictions.get(userId) || [];
    const userPreds = predIds
      .map((id) => this.predictions.get(id))
      .filter((p): p is CalibrationPrediction => p !== undefined);

    const resolved = userPreds.filter((p) => p.resolvedAt !== undefined);
    const correct = resolved.filter((p) => p.wasCorrect);

    const totalPredictions = resolved.length;
    const correctPredictions = correct.length;
    const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;

    const avgConfidence =
      resolved.length > 0
        ? resolved.reduce((sum, p) => sum + p.predictedConfidence, 0) / resolved.length
        : 0;

    const calibrationScore = this.calculateCalibrationScore(resolved);
    const { overconfidenceRate, underconfidenceRate } = this.calculateConfidenceRates(resolved);

    return {
      userId,
      totalPredictions,
      correctPredictions,
      accuracy: Math.round(accuracy),
      averageConfidence: Math.round(avgConfidence),
      calibrationScore: Math.round(calibrationScore),
      overconfidenceRate: Math.round(overconfidenceRate),
      underconfidenceRate: Math.round(underconfidenceRate),
      lastUpdated: new Date(),
    };
  }

  /**
   * Get user's prediction history
   */
  getHistory(userId: string): CalibrationHistory {
    const predIds = this.userPredictions.get(userId) || [];
    const predictions = predIds
      .map((id) => this.predictions.get(id))
      .filter((p): p is CalibrationPrediction => p !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      userId,
      predictions,
      stats: this.getStats(userId),
      trends: this.calculateTrends(predictions),
    };
  }

  /**
   * Reset service
   */
  reset(): void {
    this.predictions.clear();
    this.userPredictions.clear();
  }

  private calculateCalibrationScore(predictions: CalibrationPrediction[]): number {
    if (predictions.length === 0) return 0;

    // Group by confidence buckets
    const buckets: { confidence: number; accuracy: number }[] = [];

    for (let i = 0; i <= 100; i += 10) {
      const inBucket = predictions.filter(
        (p) => p.predictedConfidence >= i && p.predictedConfidence < i + 10
      );
      if (inBucket.length > 0) {
        const correct = inBucket.filter((p) => p.wasCorrect).length;
        buckets.push({
          confidence: i + 5, // midpoint
          accuracy: (correct / inBucket.length) * 100,
        });
      }
    }

    if (buckets.length === 0) return 0;

    // Calculate mean absolute calibration error
    const totalError = buckets.reduce(
      (sum, b) => sum + Math.abs(b.confidence - b.accuracy),
      0
    );
    const avgError = totalError / buckets.length;

    // Convert error to score (0 error = 100 score)
    return Math.max(0, 100 - avgError);
  }

  private calculateConfidenceRates(
    predictions: CalibrationPrediction[]
  ): { overconfidenceRate: number; underconfidenceRate: number } {
    if (predictions.length === 0) {
      return { overconfidenceRate: 0, underconfidenceRate: 0 };
    }

    const actual = predictions.filter((p) => p.wasCorrect).length / predictions.length;
    const avgConfidence =
      predictions.reduce((sum, p) => sum + p.predictedConfidence, 0) /
      predictions.length /
      100;

    return {
      overconfidenceRate: Math.max(0, (avgConfidence - actual) * 100),
      underconfidenceRate: Math.max(0, (actual - avgConfidence) * 100),
    };
  }

  private calculateTrends(predictions: CalibrationPrediction[]): CalibrationTrend[] {
    const resolved = predictions.filter((p) => p.resolvedAt);
    if (resolved.length === 0) return [];

    // Group by week
    const weeks = new Map<string, CalibrationPrediction[]>();

    for (const pred of resolved) {
      const weekStart = this.getWeekStart(pred.createdAt);
      const key = weekStart.toISOString().slice(0, 10);
      const weekPreds = weeks.get(key) || [];
      weekPreds.push(pred);
      weeks.set(key, weekPreds);
    }

    const trends: CalibrationTrend[] = [];
    for (const [period, preds] of Array.from(weeks.entries())) {
      const correct = preds.filter((p) => p.wasCorrect).length;
      trends.push({
        period,
        predictions: preds.length,
        accuracy: Math.round((correct / preds.length) * 100),
        calibrationScore: Math.round(this.calculateCalibrationScore(preds)),
      });
    }

    return trends.sort((a, b) => a.period.localeCompare(b.period));
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}

export const calibrationService = new CalibrationService();
