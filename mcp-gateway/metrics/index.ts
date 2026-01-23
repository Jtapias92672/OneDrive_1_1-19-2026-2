/**
 * FORGE MCP Gateway - Prometheus Metrics
 *
 * Exports metrics for monitoring and alerting.
 */

import * as client from 'prom-client';

// Initialize default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ prefix: 'forge_' });

// ============================================
// HTTP METRICS
// ============================================

export const httpRequestsTotal = new client.Counter({
  name: 'forge_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

export const httpRequestDuration = new client.Histogram({
  name: 'forge_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// ============================================
// CARS METRICS
// ============================================

export const carsAssessmentsTotal = new client.Counter({
  name: 'forge_cars_assessments_total',
  help: 'Total number of CARS risk assessments',
  labelNames: ['level', 'action', 'tool'],
});

export const carsAssessmentDuration = new client.Histogram({
  name: 'forge_cars_assessment_duration_seconds',
  help: 'CARS assessment duration in seconds',
  labelNames: ['level'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});

export const carsPendingApprovals = new client.Gauge({
  name: 'forge_cars_pending_approvals',
  help: 'Number of pending CARS approvals',
});

// ============================================
// SECURITY METRICS
// ============================================

export const securityAlertsTotal = new client.Counter({
  name: 'forge_security_alerts_total',
  help: 'Total number of security alerts',
  labelNames: ['type', 'severity'],
});

export const activeSessions = new client.Gauge({
  name: 'forge_active_sessions',
  help: 'Number of active sessions',
});

export const authAttemptsTotal = new client.Counter({
  name: 'forge_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['result', 'method'],
});

// ============================================
// TENANT METRICS
// ============================================

export const tenantRequestsTotal = new client.Counter({
  name: 'forge_tenant_requests_total',
  help: 'Total requests by tenant',
  labelNames: ['tenant_id'],
});

export const crossTenantViolationsTotal = new client.Counter({
  name: 'forge_cross_tenant_violations_total',
  help: 'Total cross-tenant violation attempts',
  labelNames: ['tenant_id', 'target_tenant'],
});

// ============================================
// TOOL METRICS
// ============================================

export const toolExecutionsTotal = new client.Counter({
  name: 'forge_tool_executions_total',
  help: 'Total tool executions',
  labelNames: ['tool', 'status'],
});

export const toolExecutionDuration = new client.Histogram({
  name: 'forge_tool_execution_duration_seconds',
  help: 'Tool execution duration in seconds',
  labelNames: ['tool'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60],
});

// ============================================
// EXPORTS
// ============================================

export const register = client.register;

export async function getMetrics(): Promise<string> {
  return register.metrics();
}

export function getContentType(): string {
  return register.contentType;
}

// Helper to record HTTP request metrics
export function recordHttpRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number
): void {
  const normalizedPath = normalizePath(path);
  httpRequestsTotal.inc({ method, path: normalizedPath, status: String(status) });
  httpRequestDuration.observe(
    { method, path: normalizedPath, status: String(status) },
    durationMs / 1000
  );
}

// Helper to record CARS assessment
export function recordCarsAssessment(
  level: string,
  action: string,
  tool: string,
  durationMs: number
): void {
  carsAssessmentsTotal.inc({ level, action, tool });
  carsAssessmentDuration.observe({ level }, durationMs / 1000);
}

// Helper to record security alert
export function recordSecurityAlert(type: string, severity: string): void {
  securityAlertsTotal.inc({ type, severity });
}

// Normalize path to avoid high cardinality
function normalizePath(path: string): string {
  // Replace UUIDs with :id
  let normalized = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id'
  );
  // Replace numeric IDs with :id
  normalized = normalized.replace(/\/\d+/g, '/:id');
  return normalized;
}
