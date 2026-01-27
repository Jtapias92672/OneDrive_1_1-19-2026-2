// ============================================================================
// CAPABILITY DASHBOARD TYPES
// Epic 15: P3 Dashboard (Frontier Navigator)
// ============================================================================

export type ZoneType = 'ai-alone' | 'hybrid' | 'human-alone';
export type WorkflowType = 'AI-Alone' | 'Hybrid' | 'Human Review';
export type TaskOutcome = 'correct' | 'wrong' | 'partial';
export type FeatureStage = 'alpha' | 'beta' | 'coming-soon';

export interface FrontierZone {
  zone: ZoneType;
  name: string;
  reliabilityRange: string;
  examples: string[];
  color: string;
}

export interface FrontierMapData {
  zones: FrontierZone[];
  lastUpdated: string;
}

export interface TaskAnalysisResult {
  complexityScore: number; // 1-5
  recommendedWorkflow: WorkflowType;
  reasoning: string;
  confidenceFactors: string[];
}

export interface CalibrationDataPoint {
  date: string;
  accuracy: number; // 0-100
}

export interface CalibrationHistory {
  currentAccuracy: number;
  trendPercent: number; // positive = improving
  dataPoints: CalibrationDataPoint[];
  calibrationLevel: 'novice' | 'intermediate' | 'expert' | 'master';
}

export interface RecentTask {
  id: string;
  name: string;
  workflowType: WorkflowType;
  confidenceScore: number; // 0-100
  actualOutcome: TaskOutcome;
  completedAt: string;
}

export interface ExperimentalFeature {
  id: string;
  name: string;
  description: string;
  stage: FeatureStage;
  tryUrl?: string;
}

export interface P3DashboardData {
  frontierMap: FrontierMapData;
  calibration: CalibrationHistory;
  recentTasks: RecentTask[];
  experimentalFeatures: ExperimentalFeature[];
}
