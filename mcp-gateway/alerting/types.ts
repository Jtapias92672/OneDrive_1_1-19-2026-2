/**
 * MCP Security Gateway - Alert Types
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.13 - Alert Manager & Types
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Security alert type definitions for the MCP Gateway.
 */

// ============================================
// SEVERITY LEVELS
// ============================================

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  /** Immediate action required - potential breach */
  CRITICAL = 'CRITICAL',

  /** Action required within 1 hour */
  HIGH = 'HIGH',

  /** Action required within 24 hours */
  MEDIUM = 'MEDIUM',

  /** Informational - no immediate action needed */
  LOW = 'LOW',

  /** Debug/informational only */
  INFO = 'INFO',
}

/**
 * Severity level ordering (higher = more severe)
 */
export const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  [AlertSeverity.CRITICAL]: 5,
  [AlertSeverity.HIGH]: 4,
  [AlertSeverity.MEDIUM]: 3,
  [AlertSeverity.LOW]: 2,
  [AlertSeverity.INFO]: 1,
};

// ============================================
// ALERT TYPES
// ============================================

/**
 * Security alert types
 */
export enum AlertType {
  // OAuth/Auth alerts
  OAUTH_TOKEN_EXPIRED = 'OAUTH_TOKEN_EXPIRED',
  OAUTH_TOKEN_REVOKED = 'OAUTH_TOKEN_REVOKED',
  OAUTH_TOKEN_INVALID = 'OAUTH_TOKEN_INVALID',
  AUTH_FAILURE = 'AUTH_FAILURE',
  SUSPICIOUS_AUTH = 'SUSPICIOUS_AUTH',

  // Tenant alerts
  TENANT_ACCESS_DENIED = 'TENANT_ACCESS_DENIED',
  CROSS_TENANT_VIOLATION = 'CROSS_TENANT_VIOLATION',
  CROSS_TENANT_LEAK = 'CROSS_TENANT_LEAK',
  TENANT_QUOTA_EXCEEDED = 'TENANT_QUOTA_EXCEEDED',

  // Injection alerts
  SQL_INJECTION = 'SQL_INJECTION',
  COMMAND_INJECTION = 'COMMAND_INJECTION',
  PROMPT_INJECTION = 'PROMPT_INJECTION',
  PATH_TRAVERSAL = 'PATH_TRAVERSAL',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  INJECTION_BLOCKED = 'INJECTION_BLOCKED',

  // CARS alerts
  CARS_HIGH_RISK = 'CARS_HIGH_RISK',
  CARS_CRITICAL_RISK = 'CARS_CRITICAL_RISK',
  DECEPTIVE_COMPLIANCE = 'DECEPTIVE_COMPLIANCE',
  REWARD_HACKING = 'REWARD_HACKING',

  // Tool alerts
  TOOL_POISONING = 'TOOL_POISONING',
  TOOL_INTEGRITY_FAILURE = 'TOOL_INTEGRITY_FAILURE',
  UNKNOWN_TOOL = 'UNKNOWN_TOOL',
  TOOL_BLOCKED = 'TOOL_BLOCKED',

  // Approval alerts
  APPROVAL_TIMEOUT = 'APPROVAL_TIMEOUT',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BURST_DETECTED = 'BURST_DETECTED',

  // System alerts
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

// ============================================
// ALERT INTERFACES
// ============================================

/**
 * Security alert
 */
export interface SecurityAlert {
  /** Unique alert ID */
  id: string;

  /** Alert type */
  type: AlertType | string;

  /** Severity level */
  severity: AlertSeverity;

  /** Human-readable message */
  message: string;

  /** Alert source (component that generated it) */
  source: string;

  /** Alert timestamp */
  timestamp: Date;

  /** User ID (if applicable) */
  userId?: string;

  /** Tenant ID (if applicable) */
  tenantId?: string;

  /** Tool name (if applicable) */
  toolName?: string;

  /** Request ID for correlation */
  requestId?: string;

  /** Evidence/context data */
  evidence: AlertEvidence;

  /** Whether alert has been acknowledged */
  acknowledged?: boolean;

  /** Resolution status */
  resolved?: boolean;

  /** Resolution notes */
  resolutionNotes?: string;

  /** Tags for categorization */
  tags?: string[];
}

/**
 * Alert evidence/context
 */
export interface AlertEvidence {
  /** IP address (if available) */
  ipAddress?: string;

  /** User agent (if available) */
  userAgent?: string;

  /** Request parameters (sanitized) */
  params?: Record<string, unknown>;

  /** Response data (sanitized) */
  response?: unknown;

  /** Stack trace (for errors) */
  stackTrace?: string;

  /** Related alerts */
  relatedAlerts?: string[];

  /** Additional context */
  [key: string]: unknown;
}

/**
 * Alert routing configuration
 */
export interface AlertRoutingRule {
  /** Rule name */
  name: string;

  /** Alert types to match */
  types?: (AlertType | string)[];

  /** Minimum severity to match */
  minSeverity?: AlertSeverity;

  /** Tenant filter */
  tenantId?: string;

  /** Channel to route to */
  channel: AlertChannel;

  /** Whether rule is enabled */
  enabled: boolean;
}

/**
 * Alert channel types
 */
export type AlertChannel =
  | 'console'
  | 'email'
  | 'slack'
  | 'webhook'
  | 'pagerduty'
  | 'audit_log';

/**
 * Alert channel configuration
 */
export interface AlertChannelConfig {
  /** Channel type */
  type: AlertChannel;

  /** Channel-specific configuration */
  config: Record<string, unknown>;

  /** Whether channel is enabled */
  enabled: boolean;
}

// ============================================
// ALERT STATISTICS
// ============================================

/**
 * Alert statistics
 */
export interface AlertStats {
  /** Total alerts */
  total: number;

  /** Alerts by severity */
  bySeverity: Record<AlertSeverity, number>;

  /** Alerts by type */
  byType: Record<string, number>;

  /** Unacknowledged alerts */
  unacknowledged: number;

  /** Unresolved alerts */
  unresolved: number;

  /** Alerts in last hour */
  lastHour: number;

  /** Alerts in last 24 hours */
  last24Hours: number;
}

/**
 * Alert trend data
 */
export interface AlertTrend {
  /** Time period */
  period: string;

  /** Alert count */
  count: number;

  /** Predominant severity */
  severity: AlertSeverity;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Compare severity levels
 */
export function compareSeverity(a: AlertSeverity, b: AlertSeverity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}

/**
 * Check if severity meets minimum threshold
 */
export function meetsMinimumSeverity(
  severity: AlertSeverity,
  minimum: AlertSeverity
): boolean {
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[minimum];
}

/**
 * Get severity from string (case-insensitive)
 */
export function parseSeverity(value: string): AlertSeverity | null {
  const upper = value.toUpperCase();
  if (upper in AlertSeverity) {
    return upper as AlertSeverity;
  }
  return null;
}

/**
 * Get alert type from string (case-insensitive)
 */
export function parseAlertType(value: string): AlertType | null {
  const upper = value.toUpperCase();
  if (upper in AlertType) {
    return upper as AlertType;
  }
  return null;
}

/**
 * Get severity color for display
 */
export function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return '#ff0000'; // Red
    case AlertSeverity.HIGH:
      return '#ff6600'; // Orange
    case AlertSeverity.MEDIUM:
      return '#ffcc00'; // Yellow
    case AlertSeverity.LOW:
      return '#00cc00'; // Green
    case AlertSeverity.INFO:
      return '#0099ff'; // Blue
    default:
      return '#808080'; // Gray
  }
}

/**
 * Get severity emoji for display
 */
export function getSeverityEmoji(severity: AlertSeverity): string {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return '🚨';
    case AlertSeverity.HIGH:
      return '⚠️';
    case AlertSeverity.MEDIUM:
      return '⚡';
    case AlertSeverity.LOW:
      return '📝';
    case AlertSeverity.INFO:
      return 'ℹ️';
    default:
      return '❔';
  }
}

// ============================================
// EXPORTS
// ============================================

export default AlertSeverity;
