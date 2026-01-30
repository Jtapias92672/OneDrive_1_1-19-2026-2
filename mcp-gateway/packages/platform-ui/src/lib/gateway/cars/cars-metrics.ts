/**
 * MCP Security Gateway - CARS Metrics
 *
 * @epic 3.5 - Gateway Foundation
 * @description Prometheus metrics for CARS risk assessment monitoring.
 */

import * as client from 'prom-client';

// ============================================
// ASSESSMENT METRICS
// ============================================

/**
 * Total CARS risk assessments performed
 */
export const carsAssessmentsTotal = new client.Counter({
  name: 'forge_cars_assessments_total',
  help: 'Total CARS risk assessments performed',
  labelNames: ['risk_level'], // L1_SAFE, L2_LOW, L3_MEDIUM, L4_CRITICAL
});

/**
 * CARS assessment duration histogram
 */
export const carsAssessmentDuration = new client.Histogram({
  name: 'forge_cars_assessment_duration_seconds',
  help: 'Duration of CARS risk assessments in seconds',
  labelNames: ['risk_level'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});

/**
 * CARS assessments requiring approval
 */
export const carsApprovalsRequired = new client.Counter({
  name: 'forge_cars_approvals_required_total',
  help: 'Total CARS assessments that required human approval',
  labelNames: ['risk_level'],
});

/**
 * CARS blocked operations
 */
export const carsBlockedOperations = new client.Counter({
  name: 'forge_cars_blocked_total',
  help: 'Total operations blocked by CARS',
  labelNames: ['risk_level', 'tool'],
});

// ============================================
// DETECTOR METRICS
// ============================================

/**
 * Deceptive compliance detections
 */
export const carsDeceptiveComplianceDetections = new client.Counter({
  name: 'forge_cars_deceptive_compliance_total',
  help: 'Total deceptive compliance patterns detected',
  labelNames: ['indicator'],
});

/**
 * Reward hacking detections
 */
export const carsRewardHackingDetections = new client.Counter({
  name: 'forge_cars_reward_hacking_total',
  help: 'Total reward hacking patterns detected',
  labelNames: ['pattern'],
});

// ============================================
// RISK LEVEL GAUGES
// ============================================

/**
 * Current risk level distribution (for dashboards)
 */
export const carsActiveRiskLevel = new client.Gauge({
  name: 'forge_cars_active_risk_level',
  help: 'Number of active operations at each risk level',
  labelNames: ['risk_level'],
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Record a CARS assessment
 */
export function recordAssessment(
  riskLevel: string,
  durationSeconds: number,
  requiresApproval: boolean,
  shouldBlock: boolean,
  tool?: string
): void {
  carsAssessmentsTotal.inc({ risk_level: riskLevel });
  carsAssessmentDuration.observe({ risk_level: riskLevel }, durationSeconds);

  if (requiresApproval) {
    carsApprovalsRequired.inc({ risk_level: riskLevel });
  }

  if (shouldBlock && tool) {
    carsBlockedOperations.inc({ risk_level: riskLevel, tool });
  }
}

/**
 * Record deceptive compliance detection
 */
export function recordDeceptiveCompliance(indicators: string[]): void {
  for (const indicator of indicators) {
    carsDeceptiveComplianceDetections.inc({ indicator });
  }
}

/**
 * Record reward hacking detection
 */
export function recordRewardHacking(patterns: string[]): void {
  for (const pattern of patterns) {
    carsRewardHackingDetections.inc({ pattern });
  }
}
