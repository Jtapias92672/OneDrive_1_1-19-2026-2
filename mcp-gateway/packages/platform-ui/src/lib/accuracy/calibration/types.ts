/**
 * Calibration Types
 * Epic 14: User prediction tracking and calibration
 */

export interface CalibrationPrediction {
  id: string;
  userId: string;
  taskId: string;
  taskType: string;
  predictedSuccess: boolean;
  predictedConfidence: number; // 0-100
  createdAt: Date;
  resolvedAt?: Date;
  actualSuccess?: boolean;
  actualConfidence?: number;
  wasCorrect?: boolean;
}

export interface CalibrationStats {
  userId: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number; // 0-100 percentage
  averageConfidence: number;
  calibrationScore: number; // How well confidence matches actual outcomes
  overconfidenceRate: number; // How often confidence exceeds accuracy
  underconfidenceRate: number; // How often accuracy exceeds confidence
  lastUpdated: Date;
}

export interface CalibrationTrend {
  period: string;
  predictions: number;
  accuracy: number;
  calibrationScore: number;
}

export interface CalibrationHistory {
  userId: string;
  predictions: CalibrationPrediction[];
  stats: CalibrationStats;
  trends: CalibrationTrend[];
}

export interface CalibrationSummary {
  totalUsers: number;
  averageAccuracy: number;
  averageCalibration: number;
  topPerformers: { userId: string; accuracy: number }[];
}
