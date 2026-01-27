/**
 * E2E Test Types
 * Epic 12: End-to-End Integration Testing
 */

export type PipelineStage =
  | 'figma-input'
  | 'ast-parse'
  | 'react-generate'
  | 'orchestration'
  | 'mendix-export'
  | 'governance'
  | 'accuracy';

export interface PipelineResult<T = unknown> {
  stage: PipelineStage;
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  timestamp: Date;
}

export interface E2ERunConfig {
  runId: string;
  stages: PipelineStage[];
  skipGovernance?: boolean;
  skipAccuracy?: boolean;
  mockExternal?: boolean;
}

export interface E2ERunResult {
  runId: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  stages: PipelineResult[];
  totalDuration: number;
  startedAt: Date;
  completedAt?: Date;
  summary: E2ESummary;
}

export interface E2ESummary {
  totalStages: number;
  passedStages: number;
  failedStages: number;
  governanceChecks: number;
  accuracyScore?: number;
}

// Fixture types
export interface FigmaFixture {
  document: {
    id: string;
    name: string;
    type: string;
    children: FigmaNodeFixture[];
  };
  components: Record<string, { key: string; name: string }>;
  styles: Record<string, { key: string; name: string }>;
}

export interface FigmaNodeFixture {
  id: string;
  name: string;
  type: string;
  children?: FigmaNodeFixture[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ASTFixture {
  nodes: ASTNodeFixture[];
  metadata: {
    sourceFile: string;
    parsedAt: string;
    nodeCount: number;
  };
}

export interface ASTNodeFixture {
  id: string;
  type: string;
  name: string;
  props: Record<string, unknown>;
  children?: ASTNodeFixture[];
}

export interface ReactComponentFixture {
  name: string;
  code: string;
  imports: string[];
  props: { name: string; type: string }[];
}

export interface MendixExportFixture {
  projectId: string;
  pages: { id: string; name: string }[];
  widgets: { id: string; type: string }[];
  exportedAt: string;
}
