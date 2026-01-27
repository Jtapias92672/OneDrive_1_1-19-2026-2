/**
 * Organization Policy Store
 */

import {
  OrganizationPolicy,
  PolicyException,
  CreateExceptionRequest,
} from './types';

// Default organization policy
const DEFAULT_POLICY: OrganizationPolicy = {
  id: 'default-org-policy',
  name: 'Default Organization Policy',
  description: 'Standard security and compliance policy for AI-assisted development',
  status: 'active',
  maxDataTier: 3,
  requireApprovalForProduction: true,
  requireEvidencePackForRelease: true,
  auditRetentionDays: 365,
  frameworks: ['SOC2'],
  createdAt: new Date(),
  updatedAt: new Date(),
  updatedBy: 'system',
};

class OrganizationStore {
  private policy: OrganizationPolicy = { ...DEFAULT_POLICY };
  private exceptions: Map<string, PolicyException> = new Map();

  /**
   * Get organization policy
   */
  async getPolicy(): Promise<OrganizationPolicy> {
    return { ...this.policy };
  }

  /**
   * Update organization policy
   */
  async updatePolicy(
    updates: Partial<Omit<OrganizationPolicy, 'id' | 'createdAt'>>,
    updatedBy: string
  ): Promise<OrganizationPolicy> {
    this.policy = {
      ...this.policy,
      ...updates,
      updatedAt: new Date(),
      updatedBy,
    };
    return { ...this.policy };
  }

  /**
   * Create policy exception request
   */
  async createException(request: CreateExceptionRequest): Promise<PolicyException> {
    const exception: PolicyException = {
      id: `exc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      policyId: request.policyId,
      requesterId: request.requesterId,
      requesterName: request.requesterName,
      status: 'pending',
      reason: request.reason,
      scope: request.scope,
      expiresAt: new Date(Date.now() + request.durationDays * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    this.exceptions.set(exception.id, exception);
    return { ...exception };
  }

  /**
   * Get exception by ID
   */
  async getException(id: string): Promise<PolicyException | null> {
    const exception = this.exceptions.get(id);
    return exception ? { ...exception } : null;
  }

  /**
   * List exceptions
   */
  async listExceptions(filters?: {
    status?: string;
    policyId?: string;
  }): Promise<PolicyException[]> {
    let result = Array.from(this.exceptions.values());

    if (filters?.status) {
      result = result.filter((e) => e.status === filters.status);
    }

    if (filters?.policyId) {
      result = result.filter((e) => e.policyId === filters.policyId);
    }

    return result.map((e) => ({ ...e }));
  }

  /**
   * Review exception
   */
  async reviewException(
    id: string,
    reviewerId: string,
    approved: boolean,
    notes?: string,
    reviewerName?: string
  ): Promise<PolicyException | null> {
    const exception = this.exceptions.get(id);
    if (!exception) return null;

    const updated: PolicyException = {
      ...exception,
      status: approved ? 'approved' : 'rejected',
      reviewerId,
      reviewerName,
      reviewNotes: notes,
      reviewedAt: new Date(),
    };

    this.exceptions.set(id, updated);
    return { ...updated };
  }

  /**
   * Reset (for testing)
   */
  reset(): void {
    this.policy = { ...DEFAULT_POLICY };
    this.exceptions.clear();
  }
}

export const organizationStore = new OrganizationStore();
