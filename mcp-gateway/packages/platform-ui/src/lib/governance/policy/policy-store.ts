import {
  Policy,
  CreatePolicyRequest,
  UpdatePolicyRequest,
} from '../types';
import { getDefaultPolicies } from './default-policies';

/**
 * In-memory policy store.
 * In production, this would be backed by PostgreSQL.
 */
class PolicyStore {
  private policies: Map<string, Policy> = new Map();
  private initialized = false;

  /**
   * Initialize store with default policies.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const defaults = getDefaultPolicies();
    for (const policy of defaults) {
      this.policies.set(policy.id, policy);
    }

    this.initialized = true;
  }

  /**
   * Get all policies, sorted by priority (descending).
   */
  async getAll(): Promise<Policy[]> {
    await this.ensureInitialized();
    return Array.from(this.policies.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all enabled policies, sorted by priority (descending).
   */
  async getEnabled(): Promise<Policy[]> {
    const all = await this.getAll();
    return all.filter((p) => p.enabled);
  }

  /**
   * Get a single policy by ID.
   */
  async getById(id: string): Promise<Policy | null> {
    await this.ensureInitialized();
    return this.policies.get(id) || null;
  }

  /**
   * Create a new policy.
   */
  async create(request: CreatePolicyRequest): Promise<Policy> {
    await this.ensureInitialized();

    const now = new Date();
    const policy: Policy = {
      id: this.generateId(),
      name: request.name,
      description: request.description,
      enabled: request.enabled ?? true,
      priority: request.priority ?? 50,
      conditions: request.conditions,
      actions: request.actions,
      scope: request.scope ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.policies.set(policy.id, policy);
    return policy;
  }

  /**
   * Update an existing policy.
   */
  async update(id: string, request: UpdatePolicyRequest): Promise<Policy | null> {
    await this.ensureInitialized();

    const existing = this.policies.get(id);
    if (!existing) return null;

    const updated: Policy = {
      ...existing,
      ...request,
      id: existing.id, // Preserve ID
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date(),
    };

    this.policies.set(id, updated);
    return updated;
  }

  /**
   * Delete a policy.
   */
  async delete(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.policies.delete(id);
  }

  /**
   * Check if a policy exists.
   */
  async exists(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.policies.has(id);
  }

  /**
   * Get policies matching a scope.
   */
  async getByScope(
    workflowType?: string,
    userRole?: string,
    environment?: string
  ): Promise<Policy[]> {
    const enabled = await this.getEnabled();

    return enabled.filter((policy) => {
      const { scope } = policy;

      // If no scope restrictions, policy applies to all
      if (!scope.workflowTypes?.length && !scope.userRoles?.length && !scope.environments?.length) {
        return true;
      }

      // Check workflow type
      if (scope.workflowTypes?.length && workflowType) {
        if (!scope.workflowTypes.includes(workflowType)) return false;
      }

      // Check user role
      if (scope.userRoles?.length && userRole) {
        if (!scope.userRoles.includes(userRole)) return false;
      }

      // Check environment
      if (scope.environments?.length && environment) {
        if (!scope.environments.includes(environment)) return false;
      }

      return true;
    });
  }

  /**
   * Reset store (for testing).
   */
  reset(): void {
    this.policies.clear();
    this.initialized = false;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private generateId(): string {
    return `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const policyStore = new PolicyStore();
