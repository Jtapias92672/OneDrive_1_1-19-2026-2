import { Policy } from '../types';

/**
 * Default governance policies.
 * These are loaded on system initialization.
 */
export const DEFAULT_POLICIES: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'High Risk Approval Required',
    description: 'Require human approval for high-risk or critical operations',
    enabled: true,
    priority: 100, // Highest priority
    conditions: [
      { field: 'riskLevel', operator: 'in', value: ['high', 'critical'] },
    ],
    actions: [
      { type: 'require-approval', params: { timeout: 86400000 } }, // 24 hours
      { type: 'log', params: { level: 'warn' } },
    ],
    scope: {},
  },
  {
    name: 'Production Environment Guard',
    description: 'Extra checks and multiple approvers for production deployments',
    enabled: true,
    priority: 90,
    conditions: [
      { field: 'environment', operator: 'eq', value: 'production' },
    ],
    actions: [
      { type: 'require-approval', params: { requiredCount: 2 } },
      { type: 'log', params: { level: 'info' } },
    ],
    scope: {},
  },
  {
    name: 'Token Budget Limit',
    description: 'Block operations that exceed token budget',
    enabled: true,
    priority: 80,
    conditions: [
      { field: 'tokenUsagePercent', operator: 'gt', value: 100 },
    ],
    actions: [
      { type: 'block', params: { reason: 'Token budget exceeded' } },
      { type: 'log', params: { level: 'error' } },
    ],
    scope: {},
  },
  {
    name: 'Data Classification Guard',
    description: 'Block operations on Tier 4 (Restricted) data without explicit approval',
    enabled: true,
    priority: 95,
    conditions: [
      { field: 'dataClassification', operator: 'eq', value: 4 },
    ],
    actions: [
      { type: 'block', params: { reason: 'Tier 4 restricted data requires manual handling' } },
      { type: 'log', params: { level: 'error' } },
    ],
    scope: {},
  },
];

/**
 * Generate a unique ID for default policies (deterministic based on name).
 */
export function generatePolicyId(name: string): string {
  // Simple hash for deterministic IDs
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `default-policy-${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

/**
 * Get default policies with generated IDs.
 */
export function getDefaultPolicies(): Policy[] {
  const now = new Date();
  return DEFAULT_POLICIES.map((policy) => ({
    ...policy,
    id: generatePolicyId(policy.name),
    createdAt: now,
    updatedAt: now,
  }));
}
