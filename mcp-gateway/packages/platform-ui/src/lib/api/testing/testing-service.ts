/**
 * Testing Service
 * Business logic for Testing Dashboard Module
 */

import {
  TestSuite,
  TestRunRequest,
  TestRunResult,
  TestMetrics,
  GateStatus,
  AuditTrailEntry,
  EvidencePack,
  SuiteDefinition,
  ReleaseReadiness,
  DashboardSummary,
} from './testing-types';

// In-memory stores (would be database in production)
const activeRuns = new Map<string, TestRunResult>();
const auditTrail: AuditTrailEntry[] = [];
const evidencePacks = new Map<string, EvidencePack>();

// Suite definitions based on Epic 7.5 taxonomy
const suiteDefinitions: SuiteDefinition[] = [
  {
    name: 'unit',
    description: 'Unit tests - Developer level, per story',
    testCount: 876,
    estimatedDuration: 2000,
    command: 'npm run test:unit',
    layer: 'unit',
  },
  {
    name: 'story',
    description: 'Story test cases - Tester level, per story',
    testCount: 0,
    estimatedDuration: 1000,
    command: 'npm run test:story',
    layer: 'integration',
    tags: ['story'],
  },
  {
    name: 'e2e',
    description: 'End-to-end tests - Tester level, per sprint',
    testCount: 46,
    estimatedDuration: 3000,
    command: 'npm run test:e2e',
    layer: 'e2e',
    tags: ['e2e'],
  },
  {
    name: 'smoke',
    description: 'Smoke tests - Critical paths only (5-10 tests)',
    testCount: 8,
    estimatedDuration: 500,
    command: 'npm run test:smoke',
    layer: 'e2e',
    tags: ['smoke'],
  },
  {
    name: 'sanity',
    description: 'Sanity tests - Major components (20-50 tests)',
    testCount: 46,
    estimatedDuration: 1000,
    command: 'npm run test:sanity',
    layer: 'e2e',
    tags: ['sanity', 'smoke'],
  },
  {
    name: 'regression',
    description: 'Full regression - Unit + Story + E2E',
    testCount: 922,
    estimatedDuration: 5000,
    command: 'npm run test:regression',
    layer: 'e2e',
  },
];

// Gate definitions
const gateDefinitions: Omit<GateStatus, 'status' | 'passedSuites'>[] = [
  {
    name: 'pre-commit',
    requiredSuites: ['unit'],
    lastEvaluation: new Date().toISOString(),
    threshold: 100,
  },
  {
    name: 'pre-merge',
    requiredSuites: ['unit', 'sanity'],
    lastEvaluation: new Date().toISOString(),
    threshold: 100,
  },
  {
    name: 'pre-deploy-staging',
    requiredSuites: ['unit', 'e2e'],
    lastEvaluation: new Date().toISOString(),
    threshold: 100,
  },
  {
    name: 'pre-deploy-production',
    requiredSuites: ['regression'],
    lastEvaluation: new Date().toISOString(),
    threshold: 100,
  },
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const testingService = {
  /**
   * Start a new test run
   */
  startRun(request: TestRunRequest): TestRunResult {
    const runId = generateId();
    const run: TestRunResult = {
      runId,
      suite: request.suite,
      status: 'QUEUED',
      startTime: new Date().toISOString(),
      results: { total: 0, passed: 0, failed: 0, skipped: 0 },
    };

    activeRuns.set(runId, run);

    // Simulate async execution
    setTimeout(() => this.simulateRunCompletion(runId, request), 100);

    return run;
  },

  /**
   * Simulate test run completion (for demo purposes)
   */
  simulateRunCompletion(runId: string, request: TestRunRequest): void {
    const run = activeRuns.get(runId);
    if (!run) return;

    const suite = suiteDefinitions.find((s) => s.name === request.suite);
    const testCount = suite?.testCount || 10;

    // Simulate results (95%+ pass rate)
    const passed = Math.floor(testCount * (0.95 + Math.random() * 0.05));
    const failed = testCount - passed;

    run.status = failed > 0 ? 'FAILED' : 'COMPLETE';
    run.endTime = new Date().toISOString();
    run.duration = suite?.estimatedDuration || 1000;
    run.results = {
      total: testCount,
      passed,
      failed,
      skipped: 0,
    };

    if (failed > 0) {
      run.failures = [
        {
          testName: 'example.test.ts > should pass',
          suite: request.suite,
          file: 'src/example.test.ts',
          error: 'Expected true to be false',
          duration: 50,
        },
      ];
    }

    // Log to audit trail
    const auditEntry: AuditTrailEntry = {
      id: generateId(),
      timestamp: run.endTime,
      suite: request.suite,
      result: run.status === 'COMPLETE' ? 'PASS' : 'FAIL',
      testCount,
      triggeredBy: 'system',
      duration: run.duration,
      details: run.results,
    };
    auditTrail.unshift(auditEntry);

    // Keep only last 100 entries
    if (auditTrail.length > 100) {
      auditTrail.pop();
    }
  },

  /**
   * Get run status by ID
   */
  getRun(runId: string): TestRunResult | null {
    return activeRuns.get(runId) || null;
  },

  /**
   * Get all suite definitions
   */
  getSuites(): SuiteDefinition[] {
    return suiteDefinitions;
  },

  /**
   * Get dashboard metrics
   */
  getMetrics(): TestMetrics {
    const passRates = this.calculatePassRates();

    return {
      coverage: {
        overall: 97.5,
        byPackage: {
          'figma-parser': { statements: 97, branches: 95, functions: 98, lines: 97 },
          'react-generator': { statements: 97.75, branches: 96, functions: 98, lines: 97.75 },
          'mcp-gateway': { statements: 97, branches: 94, functions: 97, lines: 97 },
          'platform-ui': { statements: 85, branches: 80, functions: 88, lines: 85 },
        },
      },
      testCounts: {
        unit: 876,
        story: 0,
        e2e: 46,
        total: 922,
      },
      passRates,
      trends: this.getTrends(),
      timing: {
        smoke: 500,
        sanity: 1000,
        regression: 3500,
      },
    };
  },

  calculatePassRates(): TestMetrics['passRates'] {
    const getRate = (suite: TestSuite): number => {
      const runs = auditTrail.filter((e) => e.suite === suite);
      if (runs.length === 0) return 100;
      const passed = runs.filter((e) => e.result === 'PASS').length;
      return Math.round((passed / runs.length) * 100);
    };

    return {
      unit: getRate('unit'),
      story: getRate('story'),
      e2e: getRate('e2e'),
      regression: getRate('regression'),
    };
  },

  getTrends(): TestMetrics['trends'] {
    return [
      { sprint: 'Sprint 10', testCount: 650, passRate: 98 },
      { sprint: 'Sprint 11', testCount: 720, passRate: 97.5 },
      { sprint: 'Sprint 12', testCount: 800, passRate: 98.5 },
      { sprint: 'Sprint 13', testCount: 875, passRate: 99 },
      { sprint: 'Sprint 14', testCount: 922, passRate: 100 },
    ];
  },

  /**
   * Get audit trail
   */
  getAuditTrail(limit: number = 50): AuditTrailEntry[] {
    return auditTrail.slice(0, limit);
  },

  /**
   * Get gate statuses
   */
  getGates(): GateStatus[] {
    return gateDefinitions.map((gate) => {
      const passedSuites = gate.requiredSuites.filter((suite) => {
        const lastRun = auditTrail.find((e) => e.suite === suite);
        return lastRun?.result === 'PASS';
      });

      const allPassed = passedSuites.length === gate.requiredSuites.length;
      const blockers = gate.requiredSuites
        .filter((suite) => !passedSuites.includes(suite))
        .map((suite) => `${suite} tests not passing`);

      return {
        ...gate,
        status: allPassed ? 'OPEN' : blockers.length > 0 ? 'CLOSED' : 'PENDING',
        passedSuites,
        blockers: blockers.length > 0 ? blockers : undefined,
      };
    });
  },

  /**
   * Evaluate a specific gate
   */
  evaluateGate(gateName: string): GateStatus | null {
    const gates = this.getGates();
    const gate = gates.find((g) => g.name === gateName);
    if (gate) {
      gate.lastEvaluation = new Date().toISOString();
    }
    return gate || null;
  },

  /**
   * Generate evidence pack for compliance
   */
  generateEvidencePack(runId: string): EvidencePack | null {
    const run = activeRuns.get(runId);
    if (!run || run.status === 'QUEUED' || run.status === 'RUNNING') {
      return null;
    }

    const pack: EvidencePack = {
      id: generateId(),
      generatedAt: new Date().toISOString(),
      suite: run.suite,
      runId,
      artifacts: [
        {
          name: 'test-results.json',
          type: 'results',
          path: `/evidence/${runId}/results.json`,
          size: 4096,
        },
        {
          name: 'coverage-report.html',
          type: 'coverage',
          path: `/evidence/${runId}/coverage/index.html`,
          size: 102400,
        },
        {
          name: 'execution-log.txt',
          type: 'logs',
          path: `/evidence/${runId}/logs.txt`,
          size: 8192,
        },
      ],
      signature: `sha256:${generateId()}`,
    };

    evidencePacks.set(pack.id, pack);
    run.evidencePackId = pack.id;

    return pack;
  },

  /**
   * Get release readiness
   */
  getReleaseReadiness(): ReleaseReadiness {
    const gates = this.getGates();
    const blockers = gates
      .filter((g) => g.status !== 'OPEN')
      .flatMap((g) => g.blockers || [`${g.name} gate not passing`]);

    const lastRegression = auditTrail.find((e) => e.suite === 'regression');

    return {
      ready: blockers.length === 0 && lastRegression?.result === 'PASS',
      gates,
      blockers,
      lastFullRegression: lastRegression,
      approvalRequired: true,
    };
  },

  /**
   * Get full dashboard summary
   */
  getDashboardSummary(): DashboardSummary {
    const metrics = this.getMetrics();
    const gates = this.getGates();
    const releaseReadiness = this.getReleaseReadiness();

    // Calculate health status
    let healthStatus: DashboardSummary['healthStatus'] = 'GREEN';
    if (releaseReadiness.blockers.length > 0) {
      healthStatus = 'YELLOW';
    }
    if (metrics.passRates.regression < 95) {
      healthStatus = 'RED';
    }

    return {
      healthStatus,
      metrics,
      activeRuns: Array.from(activeRuns.values()).filter(
        (r) => r.status === 'QUEUED' || r.status === 'RUNNING'
      ),
      recentRuns: auditTrail.slice(0, 10),
      gates,
      releaseReadiness,
    };
  },

  /**
   * Reset stores (for testing)
   */
  reset(): void {
    activeRuns.clear();
    auditTrail.length = 0;
    evidencePacks.clear();
  },
};
