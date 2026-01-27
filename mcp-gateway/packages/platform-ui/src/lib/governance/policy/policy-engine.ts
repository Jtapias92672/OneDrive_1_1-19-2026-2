import {
  Policy,
  PolicyCondition,
  PolicyContext,
  PolicyEvaluation,
  PolicyAction,
  PolicyOperator,
} from '../types';
import { policyStore } from './policy-store';

/**
 * Policy Engine - evaluates policies against a given context.
 */
export class PolicyEngine {
  /**
   * Evaluate all applicable policies against a context.
   */
  async evaluate(context: PolicyContext): Promise<PolicyEvaluation> {
    // Get policies matching the scope
    const policies = await policyStore.getByScope(
      context.workflowType,
      context.userRole,
      context.environment
    );

    const matchedPolicies: Policy[] = [];
    const collectedActions: PolicyAction[] = [];
    let blocked = false;
    let requiresApproval = false;
    let blockReason: string | undefined;

    // Evaluate each policy in priority order
    for (const policy of policies) {
      if (this.matchesAllConditions(policy.conditions, context)) {
        matchedPolicies.push(policy);

        for (const action of policy.actions) {
          collectedActions.push(action);

          if (action.type === 'block') {
            blocked = true;
            blockReason = action.params?.reason as string || 'Policy violation';
          }

          if (action.type === 'require-approval') {
            requiresApproval = true;
          }
        }
      }
    }

    return {
      allowed: !blocked,
      requiresApproval,
      matchedPolicies,
      actions: collectedActions,
      reason: blocked ? blockReason : undefined,
      evaluatedAt: new Date(),
    };
  }

  /**
   * Check if all conditions match the context.
   */
  private matchesAllConditions(
    conditions: PolicyCondition[],
    context: PolicyContext
  ): boolean {
    return conditions.every((condition) =>
      this.matchesCondition(condition, context)
    );
  }

  /**
   * Check if a single condition matches the context.
   */
  private matchesCondition(
    condition: PolicyCondition,
    context: PolicyContext
  ): boolean {
    const contextValue = this.getNestedValue(context, condition.field);

    // If field doesn't exist in context, condition doesn't match
    if (contextValue === undefined) {
      return false;
    }

    return this.evaluateOperator(
      condition.operator,
      contextValue,
      condition.value
    );
  }

  /**
   * Evaluate an operator against two values.
   */
  private evaluateOperator(
    operator: PolicyOperator,
    contextValue: unknown,
    conditionValue: unknown
  ): boolean {
    switch (operator) {
      case 'eq':
        return contextValue === conditionValue;

      case 'ne':
        return contextValue !== conditionValue;

      case 'gt':
        return (
          typeof contextValue === 'number' &&
          typeof conditionValue === 'number' &&
          contextValue > conditionValue
        );

      case 'lt':
        return (
          typeof contextValue === 'number' &&
          typeof conditionValue === 'number' &&
          contextValue < conditionValue
        );

      case 'gte':
        return (
          typeof contextValue === 'number' &&
          typeof conditionValue === 'number' &&
          contextValue >= conditionValue
        );

      case 'lte':
        return (
          typeof contextValue === 'number' &&
          typeof conditionValue === 'number' &&
          contextValue <= conditionValue
        );

      case 'in':
        return (
          Array.isArray(conditionValue) &&
          conditionValue.includes(contextValue)
        );

      case 'contains':
        return (
          typeof contextValue === 'string' &&
          typeof conditionValue === 'string' &&
          contextValue.includes(conditionValue)
        );

      case 'matches':
        if (typeof contextValue !== 'string' || typeof conditionValue !== 'string') {
          return false;
        }
        try {
          const regex = new RegExp(conditionValue);
          return regex.test(contextValue);
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  /**
   * Get a nested value from an object using dot notation.
   * e.g., getNestedValue({ a: { b: 1 } }, 'a.b') => 1
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}

// Singleton instance
export const policyEngine = new PolicyEngine();
