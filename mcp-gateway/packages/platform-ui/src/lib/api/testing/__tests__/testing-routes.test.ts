/**
 * Testing Routes Unit Tests
 * Epic 7.5: Testing Dashboard Module
 */

import {
  handleRunTests,
  handleGetRun,
  handleGetSuites,
  handleGetMetrics,
  handleGetAuditTrail,
  handleGetGates,
  handleEvaluateGate,
  handleGenerateEvidencePack,
  handleGetDashboard,
  dispatchTestingRoute,
} from '../testing-routes';
import { testingService } from '../testing-service';

describe('Testing API Routes', () => {
  beforeEach(() => {
    testingService.reset();
  });

  describe('handleRunTests', () => {
    it('starts a unit test run', () => {
      const response = handleRunTests({ suite: 'unit' });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.suite).toBe('unit');
      expect(response.data?.status).toBe('QUEUED');
      expect(response.data?.runId).toBeDefined();
    });

    it('starts an e2e test run', () => {
      const response = handleRunTests({ suite: 'e2e' });

      expect(response.success).toBe(true);
      expect(response.data?.suite).toBe('e2e');
    });

    it('starts a smoke test run', () => {
      const response = handleRunTests({ suite: 'smoke' });

      expect(response.success).toBe(true);
      expect(response.data?.suite).toBe('smoke');
    });

    it('returns error for invalid suite', () => {
      const response = handleRunTests({ suite: 'invalid' as never });

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid suite');
    });

    it('accepts options', () => {
      const response = handleRunTests({
        suite: 'regression',
        options: { parallel: true, verbose: true },
      });

      expect(response.success).toBe(true);
      expect(response.data?.suite).toBe('regression');
    });
  });

  describe('handleGetRun', () => {
    it('returns run by ID', () => {
      const startResponse = handleRunTests({ suite: 'unit' });
      const runId = startResponse.data!.runId;

      const response = handleGetRun(runId);

      expect(response.success).toBe(true);
      expect(response.data?.runId).toBe(runId);
    });

    it('returns error for unknown run', () => {
      const response = handleGetRun('nonexistent-id');

      expect(response.success).toBe(false);
      expect(response.error).toContain('not found');
    });
  });

  describe('handleGetSuites', () => {
    it('returns all suite definitions', () => {
      const response = handleGetSuites();

      expect(response.success).toBe(true);
      expect(response.data).toBeInstanceOf(Array);
      expect(response.data?.length).toBeGreaterThan(0);

      const suiteNames = response.data?.map((s) => s.name);
      expect(suiteNames).toContain('unit');
      expect(suiteNames).toContain('e2e');
      expect(suiteNames).toContain('smoke');
      expect(suiteNames).toContain('sanity');
      expect(suiteNames).toContain('regression');
    });

    it('includes test counts', () => {
      const response = handleGetSuites();
      const unitSuite = response.data?.find((s) => s.name === 'unit');

      expect(unitSuite?.testCount).toBeGreaterThan(0);
      expect(unitSuite?.estimatedDuration).toBeGreaterThan(0);
    });
  });

  describe('handleGetMetrics', () => {
    it('returns test metrics', () => {
      const response = handleGetMetrics();

      expect(response.success).toBe(true);
      expect(response.data?.coverage).toBeDefined();
      expect(response.data?.testCounts).toBeDefined();
      expect(response.data?.passRates).toBeDefined();
      expect(response.data?.trends).toBeDefined();
    });

    it('includes coverage by package', () => {
      const response = handleGetMetrics();

      expect(response.data?.coverage.overall).toBeGreaterThan(0);
      expect(response.data?.coverage.byPackage).toBeDefined();
    });

    it('includes timing estimates', () => {
      const response = handleGetMetrics();

      expect(response.data?.timing.smoke).toBeGreaterThan(0);
      expect(response.data?.timing.sanity).toBeGreaterThan(0);
      expect(response.data?.timing.regression).toBeGreaterThan(0);
    });
  });

  describe('handleGetAuditTrail', () => {
    it('returns empty trail initially', () => {
      const response = handleGetAuditTrail();

      expect(response.success).toBe(true);
      expect(response.data).toBeInstanceOf(Array);
    });

    it('returns entries after runs complete', async () => {
      handleRunTests({ suite: 'unit' });

      // Wait for simulated completion
      await new Promise((resolve) => setTimeout(resolve, 150));

      const response = handleGetAuditTrail();
      expect(response.data?.length).toBeGreaterThan(0);
    });

    it('respects limit parameter', async () => {
      // Start multiple runs
      handleRunTests({ suite: 'unit' });
      handleRunTests({ suite: 'e2e' });
      handleRunTests({ suite: 'smoke' });

      await new Promise((resolve) => setTimeout(resolve, 150));

      const response = handleGetAuditTrail(2);
      expect(response.data?.length).toBeLessThanOrEqual(2);
    });
  });

  describe('handleGetGates', () => {
    it('returns gate statuses', () => {
      const response = handleGetGates();

      expect(response.success).toBe(true);
      expect(response.data).toBeInstanceOf(Array);
      expect(response.data?.length).toBeGreaterThan(0);
    });

    it('includes required suites', () => {
      const response = handleGetGates();
      const preCommit = response.data?.find((g) => g.name === 'pre-commit');

      expect(preCommit?.requiredSuites).toContain('unit');
    });

    it('includes gate status', () => {
      const response = handleGetGates();

      for (const gate of response.data || []) {
        expect(['OPEN', 'CLOSED', 'PENDING']).toContain(gate.status);
      }
    });
  });

  describe('handleEvaluateGate', () => {
    it('evaluates existing gate', () => {
      const response = handleEvaluateGate('pre-commit');

      expect(response.success).toBe(true);
      expect(response.data?.name).toBe('pre-commit');
      expect(response.data?.lastEvaluation).toBeDefined();
    });

    it('returns error for unknown gate', () => {
      const response = handleEvaluateGate('nonexistent-gate');

      expect(response.success).toBe(false);
      expect(response.error).toContain('not found');
    });
  });

  describe('handleGenerateEvidencePack', () => {
    it('generates evidence pack for completed run', async () => {
      const startResponse = handleRunTests({ suite: 'unit' });
      const runId = startResponse.data!.runId;

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 150));

      const response = handleGenerateEvidencePack(runId);

      expect(response.success).toBe(true);
      expect(response.data?.id).toBeDefined();
      expect(response.data?.artifacts).toBeInstanceOf(Array);
      expect(response.data?.signature).toBeDefined();
    });

    it('returns error for nonexistent run', () => {
      const response = handleGenerateEvidencePack('nonexistent-id');

      expect(response.success).toBe(false);
      expect(response.error).toContain('not found');
    });
  });

  describe('handleGetDashboard', () => {
    it('returns dashboard summary', () => {
      const response = handleGetDashboard();

      expect(response.success).toBe(true);
      expect(response.data?.healthStatus).toBeDefined();
      expect(response.data?.metrics).toBeDefined();
      expect(response.data?.gates).toBeDefined();
      expect(response.data?.releaseReadiness).toBeDefined();
    });

    it('includes health status indicator', () => {
      const response = handleGetDashboard();

      expect(['GREEN', 'YELLOW', 'RED']).toContain(response.data?.healthStatus);
    });
  });

  describe('dispatchTestingRoute', () => {
    it('dispatches POST /api/testing/run', () => {
      const response = dispatchTestingRoute('POST', '/api/testing/run', { suite: 'unit' });

      expect(response.success).toBe(true);
    });

    it('dispatches GET /api/testing/suites', () => {
      const response = dispatchTestingRoute('GET', '/api/testing/suites');

      expect(response.success).toBe(true);
    });

    it('dispatches GET /api/testing/metrics', () => {
      const response = dispatchTestingRoute('GET', '/api/testing/metrics');

      expect(response.success).toBe(true);
    });

    it('dispatches GET /api/testing/gates', () => {
      const response = dispatchTestingRoute('GET', '/api/testing/gates');

      expect(response.success).toBe(true);
    });

    it('dispatches GET /api/testing/dashboard', () => {
      const response = dispatchTestingRoute('GET', '/api/testing/dashboard');

      expect(response.success).toBe(true);
    });

    it('returns error for unknown route', () => {
      const response = dispatchTestingRoute('GET', '/api/testing/unknown');

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown route');
    });
  });
});
