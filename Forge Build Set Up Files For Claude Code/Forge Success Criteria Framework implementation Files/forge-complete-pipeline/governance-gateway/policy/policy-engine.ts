/**
 * FORGE Governance Gateway - Policy Engine
 * 
 * @epic 13 - Governance Gateway (Agentic SDLC)
 * @task 3.1 - Policy Engine Implementation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-20
 * 
 * @description
 *   Enforces governance rules including CARS framework compliance,
 *   human approval gates, token budget limits, and error rate thresholds.
 */

import {
  Policy,
  PolicyCondition,
  PolicyAction,
  PolicyEvaluation,
  PolicyScope,
  CARSAssessment,
  RiskLevel,
  WorkflowType,
  TaskType,
  AgentRole,
  CircuitBreakerConfig,
  BudgetConfig,
} from '../core/types';

// ============================================
// DEFAULT POLICIES
// ============================================

export const DEFAULT_POLICIES: Policy[] = [
  {
    id: 'policy-high-risk-approval',
    name: 'High Risk Approval Required',
    description: 'Require human approval for high-risk operations',
    enabled: true,
    priority: 100,
    conditions: [
      { field: 'riskLevel', operator: 'in', value: ['high', 'critical'] },
    ],
    actions: [
      { type: 'require-approval', params: { timeout: 86400000 } },
      { type: 'log', params: { level: 'warn' } },
    ],
    scope: {},
  },
  {
    id: 'policy-production-guard',
    name: 'Production Environment Guard',
    description: 'Additional checks for production deployments',
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
    id: 'policy-mendix-review',
    name: 'Mendix Generation Review',
    description: 'Review required for Mendix artifact generation',
    enabled: true,
    priority: 80,
    conditions: [
      { field: 'taskType', operator: 'eq', value: 'generate-mendix' },
    ],
    actions: [
      { type: 'require-approval' },
    ],
    scope: { taskTypes: ['generate-mendix'] },
  },
  {
    id: 'policy-token-budget',
    name: 'Token Budget Enforcement',
    description: 'Enforce token usage limits',
    enabled: true,
    priority: 70,
    conditions: [
      { field: 'tokensUsed', operator: 'gt', value: 100000 },
    ],
    actions: [
      { type: 'throttle', params: { delay: 5000 } },
      { type: 'alert', params: { channel: 'budget-alerts' } },
    ],
    scope: {},
  },
  {
    id: 'policy-error-circuit-breaker',
    name: 'Error Rate Circuit Breaker',
    description: 'Trip circuit breaker on high error rates',
    enabled: true,
    priority: 95,
    conditions: [
      { field: 'errorRate', operator: 'gt', value: 0.3 },
    ],
    actions: [
      { type: 'deny', params: { reason: 'Error rate too high' } },
      { type: 'alert', params: { channel: 'errors', severity: 'critical' } },
    ],
    scope: {},
  },
];

// ============================================
// CARS RISK MATRIX
// ============================================

const CARS_RISK_MATRIX: Record<TaskType, Record<string, RiskLevel>> = {
  'parse-figma': { default: 'low', production: 'low' },
  'extract-tokens': { default: 'low', production: 'low' },
  'generate-react': { default: 'low', production: 'medium' },
  'generate-tests': { default: 'low', production: 'low' },
  'validate-output': { default: 'low', production: 'low' },
  'run-convergence': { default: 'medium', production: 'medium' },
  'generate-mendix': { default: 'medium', production: 'high' },
  'create-evidence': { default: 'low', production: 'low' },
  'human-review': { default: 'low', production: 'low' },
  'composite': { default: 'medium', production: 'high' },
};

// ============================================
// POLICY ENGINE
// ============================================

export class PolicyEngine {
  private policies: Policy[];
  private circuitBreakerConfig: CircuitBreakerConfig;
  private budgetConfig: BudgetConfig;
  private circuitState: Map<string, CircuitState> = new Map();
  private usageTracking: Map<string, UsageTracker> = new Map();

  constructor(
    policies?: Policy[],
    circuitBreakerConfig?: CircuitBreakerConfig,
    budgetConfig?: BudgetConfig
  ) {
    this.policies = policies || [...DEFAULT_POLICIES];
    this.circuitBreakerConfig = circuitBreakerConfig || {
      errorThreshold: 5,
      windowMs: 60000,
      cooldownMs: 30000,
      halfOpenRequests: 3,
    };
    this.budgetConfig = budgetConfig || {
      maxTokensPerTask: 50000,
      maxTokensPerWorkflow: 500000,
      maxDailyCost: 100,
      alertThreshold: 0.8,
    };
  }

  // ==========================================
  // POLICY EVALUATION
  // ==========================================

  /**
   * Evaluate policies for a given context
   */
  evaluate(context: PolicyContext): PolicyEvaluation[] {
    const evaluations: PolicyEvaluation[] = [];

    // Sort policies by priority (highest first)
    const sortedPolicies = [...this.policies]
      .filter(p => p.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const policy of sortedPolicies) {
      if (this.policyApplies(policy, context)) {
        const matched = this.evaluateConditions(policy.conditions, context);
        
        if (matched) {
          for (const action of policy.actions) {
            evaluations.push({
              policyId: policy.id,
              policyName: policy.name,
              matched: true,
              action,
              reason: policy.description,
              timestamp: new Date(),
            });
          }
        }
      }
    }

    return evaluations;
  }

  /**
   * Check if policy applies to context
   */
  private policyApplies(policy: Policy, context: PolicyContext): boolean {
    const scope = policy.scope;
    
    if (scope.workflows?.length && !scope.workflows.includes(context.workflowType as WorkflowType)) {
      return false;
    }
    
    if (scope.taskTypes?.length && !scope.taskTypes.includes(context.taskType as TaskType)) {
      return false;
    }
    
    if (scope.agentRoles?.length && !scope.agentRoles.includes(context.agentRole as AgentRole)) {
      return false;
    }
    
    if (scope.environments?.length && !scope.environments.includes(context.environment || '')) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate policy conditions
   */
  private evaluateConditions(conditions: PolicyCondition[], context: PolicyContext): boolean {
    for (const condition of conditions) {
      const value = this.getContextValue(condition.field, context);
      
      if (!this.evaluateCondition(condition, value)) {
        return false;
      }
    }
    return true;
  }

  private getContextValue(field: string, context: PolicyContext): any {
    const fieldMap: Record<string, () => any> = {
      'riskLevel': () => context.riskLevel,
      'environment': () => context.environment,
      'taskType': () => context.taskType,
      'workflowType': () => context.workflowType,
      'agentRole': () => context.agentRole,
      'tokensUsed': () => context.tokensUsed || 0,
      'errorRate': () => this.getErrorRate(context.agentRole || 'default'),
    };

    return fieldMap[field]?.() ?? context[field as keyof PolicyContext];
  }

  private evaluateCondition(condition: PolicyCondition, value: any): boolean {
    switch (condition.operator) {
      case 'eq': return value === condition.value;
      case 'ne': return value !== condition.value;
      case 'gt': return value > condition.value;
      case 'lt': return value < condition.value;
      case 'gte': return value >= condition.value;
      case 'lte': return value <= condition.value;
      case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
      case 'contains': return String(value).includes(String(condition.value));
      case 'matches': return new RegExp(condition.value).test(String(value));
      default: return false;
    }
  }

  // ==========================================
  // CARS RISK ASSESSMENT
  // ==========================================

  /**
   * Assess risk level using CARS framework
   */
  assessRisk(context: {
    workflowType?: WorkflowType;
    taskType: TaskType;
    agentRole?: AgentRole;
    environment?: string;
  }): CARSAssessment {
    const env = context.environment || 'default';
    const taskRisks = CARS_RISK_MATRIX[context.taskType] || { default: 'medium' };
    const baseRisk = taskRisks[env] || taskRisks['default'] || 'medium';

    // Adjust risk based on circuit breaker state
    let riskLevel = baseRisk as RiskLevel;
    const circuitKey = context.agentRole || 'default';
    const circuit = this.circuitState.get(circuitKey);
    
    if (circuit?.state === 'open') {
      riskLevel = 'critical';
    } else if (circuit?.state === 'half-open') {
      riskLevel = this.escalateRisk(riskLevel);
    }

    // Determine autonomy level
    const autonomyLevel = this.determineAutonomy(riskLevel);

    // Define safeguards
    const safeguards = this.defineSafeguards(riskLevel, context.taskType);

    return {
      riskLevel,
      autonomyLevel,
      safeguards,
      approvers: riskLevel === 'high' || riskLevel === 'critical' 
        ? ['team-lead', 'security-reviewer']
        : undefined,
      justification: `Task ${context.taskType} assessed as ${riskLevel} risk in ${env} environment`,
    };
  }

  private determineAutonomy(riskLevel: RiskLevel): CARSAssessment['autonomyLevel'] {
    switch (riskLevel) {
      case 'low': return 'full';
      case 'medium': return 'supervised';
      case 'high': return 'approval-required';
      case 'critical': return 'manual-only';
    }
  }

  private escalateRisk(current: RiskLevel): RiskLevel {
    const levels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(current);
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  }

  private defineSafeguards(riskLevel: RiskLevel, taskType: TaskType): string[] {
    const safeguards: string[] = ['audit-logging'];

    if (riskLevel !== 'low') {
      safeguards.push('output-validation');
    }

    if (riskLevel === 'high' || riskLevel === 'critical') {
      safeguards.push('human-review', 'rollback-capability');
    }

    if (taskType === 'generate-mendix') {
      safeguards.push('sandbox-testing', 'schema-validation');
    }

    return safeguards;
  }

  // ==========================================
  // CIRCUIT BREAKER
  // ==========================================

  /**
   * Check if circuit is open
   */
  isCircuitOpen(key: string): boolean {
    const circuit = this.circuitState.get(key);
    if (!circuit) return false;

    if (circuit.state === 'open') {
      // Check if cooldown has passed
      if (Date.now() - circuit.lastStateChange > this.circuitBreakerConfig.cooldownMs) {
        circuit.state = 'half-open';
        circuit.halfOpenRequests = 0;
        circuit.lastStateChange = Date.now();
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record success for circuit breaker
   */
  recordSuccess(key: string): void {
    const circuit = this.circuitState.get(key);
    if (circuit?.state === 'half-open') {
      circuit.halfOpenRequests++;
      if (circuit.halfOpenRequests >= this.circuitBreakerConfig.halfOpenRequests) {
        circuit.state = 'closed';
        circuit.errorCount = 0;
        circuit.lastStateChange = Date.now();
      }
    }
  }

  /**
   * Record failure for circuit breaker
   */
  recordFailure(key: string): void {
    let circuit = this.circuitState.get(key);
    
    if (!circuit) {
      circuit = {
        state: 'closed',
        errorCount: 0,
        lastStateChange: Date.now(),
        halfOpenRequests: 0,
      };
      this.circuitState.set(key, circuit);
    }

    circuit.errorCount++;

    if (circuit.state === 'half-open') {
      // Immediately trip on failure in half-open
      circuit.state = 'open';
      circuit.lastStateChange = Date.now();
    } else if (circuit.errorCount >= this.circuitBreakerConfig.errorThreshold) {
      circuit.state = 'open';
      circuit.lastStateChange = Date.now();
    }
  }

  private getErrorRate(key: string): number {
    const tracker = this.usageTracking.get(key);
    if (!tracker || tracker.totalRequests === 0) return 0;
    return tracker.errorCount / tracker.totalRequests;
  }

  // ==========================================
  // BUDGET TRACKING
  // ==========================================

  /**
   * Check if budget allows operation
   */
  checkBudget(tokensRequested: number, workflowId?: string): BudgetCheckResult {
    const dailyUsage = this.getDailyUsage();
    
    // Check task limit
    if (tokensRequested > this.budgetConfig.maxTokensPerTask) {
      return {
        allowed: false,
        reason: `Token request ${tokensRequested} exceeds task limit ${this.budgetConfig.maxTokensPerTask}`,
      };
    }

    // Check workflow limit
    if (workflowId) {
      const workflowUsage = this.getWorkflowUsage(workflowId);
      if (workflowUsage + tokensRequested > this.budgetConfig.maxTokensPerWorkflow) {
        return {
          allowed: false,
          reason: `Workflow would exceed token limit`,
        };
      }
    }

    // Check daily cost
    const estimatedCost = (dailyUsage.tokens + tokensRequested) * 0.00001; // Rough estimate
    if (estimatedCost > this.budgetConfig.maxDailyCost) {
      return {
        allowed: false,
        reason: `Daily cost limit would be exceeded`,
      };
    }

    // Check alert threshold
    const usageRatio = dailyUsage.tokens / (this.budgetConfig.maxTokensPerWorkflow * 10);
    if (usageRatio > this.budgetConfig.alertThreshold) {
      return {
        allowed: true,
        warning: `Usage at ${(usageRatio * 100).toFixed(1)}% of daily budget`,
      };
    }

    return { allowed: true };
  }

  private getDailyUsage(): { tokens: number; cost: number } {
    // Aggregate daily usage
    let tokens = 0;
    for (const tracker of this.usageTracking.values()) {
      tokens += tracker.tokensUsed;
    }
    return { tokens, cost: tokens * 0.00001 };
  }

  private getWorkflowUsage(workflowId: string): number {
    const tracker = this.usageTracking.get(workflowId);
    return tracker?.tokensUsed || 0;
  }

  /**
   * Track usage
   */
  trackUsage(key: string, tokens: number, error: boolean): void {
    let tracker = this.usageTracking.get(key);
    
    if (!tracker) {
      tracker = { totalRequests: 0, errorCount: 0, tokensUsed: 0 };
      this.usageTracking.set(key, tracker);
    }

    tracker.totalRequests++;
    tracker.tokensUsed += tokens;
    if (error) tracker.errorCount++;
  }

  // ==========================================
  // POLICY MANAGEMENT
  // ==========================================

  addPolicy(policy: Policy): void {
    this.policies.push(policy);
  }

  removePolicy(policyId: string): boolean {
    const index = this.policies.findIndex(p => p.id === policyId);
    if (index >= 0) {
      this.policies.splice(index, 1);
      return true;
    }
    return false;
  }

  enablePolicy(policyId: string): void {
    const policy = this.policies.find(p => p.id === policyId);
    if (policy) policy.enabled = true;
  }

  disablePolicy(policyId: string): void {
    const policy = this.policies.find(p => p.id === policyId);
    if (policy) policy.enabled = false;
  }

  listPolicies(): Policy[] {
    return [...this.policies];
  }
}

// ============================================
// SUPPORTING TYPES
// ============================================

interface PolicyContext {
  workflowType?: string;
  taskType?: string;
  agentRole?: string;
  environment?: string;
  riskLevel?: RiskLevel;
  tokensUsed?: number;
  [key: string]: any;
}

interface CircuitState {
  state: 'closed' | 'open' | 'half-open';
  errorCount: number;
  lastStateChange: number;
  halfOpenRequests: number;
}

interface UsageTracker {
  totalRequests: number;
  errorCount: number;
  tokensUsed: number;
}

interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  warning?: string;
}

// ============================================
// EXPORTS
// ============================================

export default PolicyEngine;
