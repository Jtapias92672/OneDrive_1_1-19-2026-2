/**
 * MCP Security Gateway - Security Metrics
 *
 * @epic 3.6 - Security Controls
 * @description Prometheus metrics for security monitoring and alerting.
 */

import * as client from 'prom-client';

// ============================================
// SECURITY ALERT METRICS
// ============================================

/**
 * Security alerts triggered
 */
export const securityAlertsTotal = new client.Counter({
  name: 'forge_security_alerts_total',
  help: 'Security alerts triggered',
  labelNames: ['severity', 'type'], // severity: critical/high/medium/low, type: PII/SECRET/INJECTION/etc
});

/**
 * Security blocks (operations blocked due to security)
 */
export const securityBlocksTotal = new client.Counter({
  name: 'forge_security_blocks_total',
  help: 'Operations blocked due to security violations',
  labelNames: ['type', 'tool'],
});

// ============================================
// THREAT DETECTION METRICS
// ============================================

/**
 * PII detections
 */
export const piiDetectionsTotal = new client.Counter({
  name: 'forge_pii_detections_total',
  help: 'PII patterns detected',
  labelNames: ['category'], // SSN, EMAIL, PHONE, etc
});

/**
 * Secret detections
 */
export const secretDetectionsTotal = new client.Counter({
  name: 'forge_secret_detections_total',
  help: 'Secret patterns detected',
  labelNames: ['category'], // AWS_KEY, API_TOKEN, etc
});

/**
 * Injection attempt detections
 */
export const injectionDetectionsTotal = new client.Counter({
  name: 'forge_injection_detections_total',
  help: 'Injection attempts detected',
  labelNames: ['type'], // sql, command, prompt, xss, etc
});

// ============================================
// SANITIZATION METRICS
// ============================================

/**
 * Sanitization operations
 */
export const sanitizationOpsTotal = new client.Counter({
  name: 'forge_sanitization_ops_total',
  help: 'Total sanitization operations performed',
  labelNames: ['result'], // clean, redacted, blocked
});

/**
 * Sanitization duration
 */
export const sanitizationDuration = new client.Histogram({
  name: 'forge_sanitization_duration_seconds',
  help: 'Duration of sanitization operations',
  labelNames: ['type'], // input, output
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
});

// ============================================
// AUTHENTICATION METRICS
// ============================================

/**
 * Auth attempts
 */
export const authAttemptsTotal = new client.Counter({
  name: 'forge_auth_attempts_total',
  help: 'Authentication attempts',
  labelNames: ['result', 'method'], // result: success/failure/expired/invalid_signature, method: client_credentials/refresh_token/jwt
});

// ============================================
// HELPER FUNCTIONS
// ============================================

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertType =
  | 'PII_DETECTED'
  | 'SECRET_DETECTED'
  | 'INJECTION_ATTEMPT'
  | 'MALICIOUS_CODE'
  | 'UNAUTHORIZED_ACCESS'
  | 'RATE_LIMIT_EXCEEDED';

/**
 * Record a security alert
 */
export function recordSecurityAlert(severity: AlertSeverity, type: AlertType): void {
  securityAlertsTotal.inc({ severity, type });
}

/**
 * Record a security block
 */
export function recordSecurityBlock(type: string, tool?: string): void {
  securityBlocksTotal.inc({ type, tool: tool || 'unknown' });
}

/**
 * Record PII detection
 */
export function recordPiiDetection(category: string): void {
  piiDetectionsTotal.inc({ category });
  securityAlertsTotal.inc({ severity: 'high', type: 'PII_DETECTED' });
}

/**
 * Record secret detection
 */
export function recordSecretDetection(category: string): void {
  secretDetectionsTotal.inc({ category });
  securityAlertsTotal.inc({ severity: 'critical', type: 'SECRET_DETECTED' });
}

/**
 * Record injection detection
 */
export function recordInjectionDetection(type: string, severity: AlertSeverity): void {
  injectionDetectionsTotal.inc({ type });
  securityAlertsTotal.inc({ severity, type: 'INJECTION_ATTEMPT' });
}

/**
 * Record sanitization result
 */
export function recordSanitization(
  type: 'input' | 'output',
  result: 'clean' | 'redacted' | 'blocked',
  durationSeconds: number
): void {
  sanitizationOpsTotal.inc({ result });
  sanitizationDuration.observe({ type }, durationSeconds);
}

/**
 * Record auth attempt
 */
export function recordAuthAttempt(
  result: 'success' | 'failure' | 'expired' | 'invalid_signature',
  method: string = 'jwt'
): void {
  authAttemptsTotal.inc({ result, method });
}
