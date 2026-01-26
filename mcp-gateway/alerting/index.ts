/**
 * MCP Security Gateway - Alerting Module
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.15 - Alerting Integration
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Security alerting module exports.
 *   Provides real-time security monitoring and notification.
 */

// ============================================
// TYPES
// ============================================

export {
  AlertSeverity,
  AlertType,
  SEVERITY_ORDER,
  compareSeverity,
  meetsMinimumSeverity,
  parseSeverity,
  parseAlertType,
  getSeverityColor,
  getSeverityEmoji,
  type SecurityAlert,
  type AlertEvidence,
  type AlertRoutingRule,
  type AlertChannel,
  type AlertChannelConfig,
  type AlertStats,
  type AlertTrend,
} from './types.js';

// ============================================
// DEDUPLICATOR
// ============================================

export {
  AlertDeduplicator,
  type DeduplicatorConfig,
  type DeduplicationResult,
  type DeduplicatorStats,
} from './deduplicator.js';

// ============================================
// ALERT MANAGER
// ============================================

export {
  AlertManager,
  type AlertManagerConfig,
  type AlertInput,
  type SecurityEvent,
} from './alert-manager.js';

// ============================================
// DEFAULT EXPORT
// ============================================

export { AlertManager as default } from './alert-manager.js';
