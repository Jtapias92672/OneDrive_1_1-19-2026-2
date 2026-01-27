/**
 * Testing API Routes
 * HTTP handlers for Testing Dashboard Module
 */

import { testingService } from './testing-service';
import {
  TestRunRequest,
  TestRunResult,
  TestMetrics,
  GateStatus,
  AuditTrailEntry,
  SuiteDefinition,
  EvidencePack,
  DashboardSummary,
} from './testing-types';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

function createResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

function createError(message: string): ApiResponse<never> {
  return {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * POST /api/testing/run
 * Trigger a test suite run
 */
export function handleRunTests(request: TestRunRequest): ApiResponse<TestRunResult> {
  const validSuites = ['unit', 'story', 'e2e', 'smoke', 'sanity', 'regression'];
  if (!validSuites.includes(request.suite)) {
    return createError(`Invalid suite: ${request.suite}. Valid: ${validSuites.join(', ')}`);
  }

  const result = testingService.startRun(request);
  return createResponse(result);
}

/**
 * GET /api/testing/runs/:runId
 * Get run status by ID
 */
export function handleGetRun(runId: string): ApiResponse<TestRunResult> {
  const result = testingService.getRun(runId);
  if (!result) {
    return createError(`Run not found: ${runId}`);
  }
  return createResponse(result);
}

/**
 * GET /api/testing/suites
 * Get all suite definitions
 */
export function handleGetSuites(): ApiResponse<SuiteDefinition[]> {
  return createResponse(testingService.getSuites());
}

/**
 * GET /api/testing/metrics
 * Get dashboard metrics
 */
export function handleGetMetrics(): ApiResponse<TestMetrics> {
  return createResponse(testingService.getMetrics());
}

/**
 * GET /api/testing/audit-trail
 * Get execution history for DCMA compliance
 */
export function handleGetAuditTrail(limit?: number): ApiResponse<AuditTrailEntry[]> {
  return createResponse(testingService.getAuditTrail(limit));
}

/**
 * GET /api/testing/gates
 * Get all gate statuses
 */
export function handleGetGates(): ApiResponse<GateStatus[]> {
  return createResponse(testingService.getGates());
}

/**
 * POST /api/testing/gates/:name/evaluate
 * Re-evaluate a specific gate
 */
export function handleEvaluateGate(gateName: string): ApiResponse<GateStatus> {
  const result = testingService.evaluateGate(gateName);
  if (!result) {
    return createError(`Gate not found: ${gateName}`);
  }
  return createResponse(result);
}

/**
 * POST /api/testing/evidence-pack
 * Generate evidence pack for a completed run
 */
export function handleGenerateEvidencePack(runId: string): ApiResponse<EvidencePack> {
  const result = testingService.generateEvidencePack(runId);
  if (!result) {
    return createError(`Cannot generate evidence pack. Run not found or not complete: ${runId}`);
  }
  return createResponse(result);
}

/**
 * GET /api/testing/dashboard
 * Get full dashboard summary
 */
export function handleGetDashboard(): ApiResponse<DashboardSummary> {
  return createResponse(testingService.getDashboardSummary());
}

/**
 * Route dispatcher for testing API
 */
export function dispatchTestingRoute(
  method: string,
  path: string,
  body?: unknown
): ApiResponse<unknown> {
  // POST /api/testing/run
  if (method === 'POST' && path === '/api/testing/run') {
    return handleRunTests(body as TestRunRequest);
  }

  // GET /api/testing/runs/:runId
  const runMatch = path.match(/^\/api\/testing\/runs\/(.+)$/);
  if (method === 'GET' && runMatch) {
    return handleGetRun(runMatch[1]);
  }

  // GET /api/testing/suites
  if (method === 'GET' && path === '/api/testing/suites') {
    return handleGetSuites();
  }

  // GET /api/testing/metrics
  if (method === 'GET' && path === '/api/testing/metrics') {
    return handleGetMetrics();
  }

  // GET /api/testing/audit-trail
  if (method === 'GET' && path.startsWith('/api/testing/audit-trail')) {
    const url = new URL(path, 'http://localhost');
    const limit = url.searchParams.get('limit');
    return handleGetAuditTrail(limit ? parseInt(limit, 10) : undefined);
  }

  // GET /api/testing/gates
  if (method === 'GET' && path === '/api/testing/gates') {
    return handleGetGates();
  }

  // POST /api/testing/gates/:name/evaluate
  const gateMatch = path.match(/^\/api\/testing\/gates\/(.+)\/evaluate$/);
  if (method === 'POST' && gateMatch) {
    return handleEvaluateGate(gateMatch[1]);
  }

  // POST /api/testing/evidence-pack
  if (method === 'POST' && path === '/api/testing/evidence-pack') {
    const { runId } = body as { runId: string };
    return handleGenerateEvidencePack(runId);
  }

  // GET /api/testing/dashboard
  if (method === 'GET' && path === '/api/testing/dashboard') {
    return handleGetDashboard();
  }

  return createError(`Unknown route: ${method} ${path}`);
}
