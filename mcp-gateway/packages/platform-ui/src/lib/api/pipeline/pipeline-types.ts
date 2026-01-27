/**
 * Pipeline Types
 * Phase 5: Dashboard Wiring - Figma-to-Code Pipeline
 */

export type PipelineStage =
  | 'idle'
  | 'fetching-figma'
  | 'parsing'
  | 'generating-react'
  | 'generating-mendix'
  | 'verifying'
  | 'complete'
  | 'error';

export interface PipelineProgress {
  stage: PipelineStage;
  progress: number; // 0-100
  message: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface FigmaImportRequest {
  fileKey: string;
  accessToken?: string; // Optional - uses env var if not provided
  options?: {
    generateReact?: boolean;
    generateMendix?: boolean;
    outputDir?: string;
  };
}

export interface PipelineStepResult {
  step: string;
  success: boolean;
  message: string;
  duration: number;
  details?: string[];
}

export interface PipelineResult {
  runId: string;
  status: 'success' | 'error' | 'partial';
  startedAt: string;
  completedAt: string;
  duration: number;
  source: {
    fileKey: string;
    fileName: string;
    lastModified: string;
  };
  output: {
    reactComponents: number;
    mendixPages: number;
    mendixWidgets: number;
    scssLines: number;
    outputDir: string;
  };
  steps: PipelineStepResult[];
}

export interface PipelineRun {
  id: string;
  status: PipelineStage;
  progress: PipelineProgress;
  result?: PipelineResult;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineConfig {
  figmaToken?: string;
  defaultFileKey?: string;
  outputDir: string;
  enableReact: boolean;
  enableMendix: boolean;
}
