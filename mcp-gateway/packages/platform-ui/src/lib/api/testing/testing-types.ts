/**
 * Testing Dashboard Types
 * Epic 7.5: Testing Taxonomy - P2/P3 Visibility
 */

export type TestSuite = 'unit' | 'story' | 'e2e' | 'smoke' | 'sanity' | 'regression';

export type TestRunStatus = 'QUEUED' | 'RUNNING' | 'COMPLETE' | 'FAILED';

export type GateStatusValue = 'OPEN' | 'CLOSED' | 'PENDING';

export interface TestRunRequest {
  suite: TestSuite;
  options?: {
    filter?: string;
    parallel?: boolean;
    verbose?: boolean;
  };
}

export interface TestFailure {
  testName: string;
  suite: string;
  file: string;
  error: string;
  stack?: string;
  duration: number;
}

export interface TestRunResult {
  runId: string;
  suite: TestSuite;
  status: TestRunStatus;
  startTime: string;
  endTime?: string;
  duration?: number;
  results: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  failures?: TestFailure[];
  evidencePackId?: string;
}

export interface CoverageByPackage {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface TestMetrics {
  coverage: {
    overall: number;
    byPackage: Record<string, CoverageByPackage>;
  };
  testCounts: {
    unit: number;
    story: number;
    e2e: number;
    total: number;
  };
  passRates: {
    unit: number;
    story: number;
    e2e: number;
    regression: number;
  };
  trends: Array<{
    sprint: string;
    testCount: number;
    passRate: number;
  }>;
  timing: {
    smoke: number;
    sanity: number;
    regression: number;
  };
}

export interface GateStatus {
  name: string;
  status: GateStatusValue;
  requiredSuites: TestSuite[];
  lastEvaluation: string;
  blockers?: string[];
  passedSuites: TestSuite[];
  threshold: number;
}

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  suite: TestSuite;
  result: 'PASS' | 'FAIL';
  testCount: number;
  triggeredBy: string;
  evidencePackId?: string;
  duration: number;
  details?: {
    passed: number;
    failed: number;
    skipped: number;
  };
}

export interface EvidencePack {
  id: string;
  generatedAt: string;
  suite: TestSuite;
  runId: string;
  artifacts: Array<{
    name: string;
    type: 'coverage' | 'results' | 'logs' | 'screenshots';
    path: string;
    size: number;
  }>;
  signature?: string;
}

export interface SuiteDefinition {
  name: TestSuite;
  description: string;
  testCount: number;
  estimatedDuration: number;
  command: string;
  layer: 'unit' | 'integration' | 'e2e';
  tags?: string[];
}

export interface ReleaseReadiness {
  ready: boolean;
  gates: GateStatus[];
  blockers: string[];
  lastFullRegression?: AuditTrailEntry;
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export interface DashboardSummary {
  healthStatus: 'GREEN' | 'YELLOW' | 'RED';
  metrics: TestMetrics;
  activeRuns: TestRunResult[];
  recentRuns: AuditTrailEntry[];
  gates: GateStatus[];
  releaseReadiness: ReleaseReadiness;
}
