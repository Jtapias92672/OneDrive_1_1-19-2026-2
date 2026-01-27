/**
 * Workflow Store
 * In-memory store for workflows
 */

import { Workflow, WorkflowStatus } from './types';

class WorkflowStore {
  private workflows: Map<string, Workflow> = new Map();

  /**
   * Create a new workflow
   */
  async create(workflow: Workflow): Promise<Workflow> {
    this.workflows.set(workflow.id, { ...workflow });
    return workflow;
  }

  /**
   * Get workflow by ID
   */
  async get(id: string): Promise<Workflow | null> {
    const workflow = this.workflows.get(id);
    return workflow ? { ...workflow } : null;
  }

  /**
   * Update workflow
   */
  async update(workflow: Workflow): Promise<Workflow> {
    if (!this.workflows.has(workflow.id)) {
      throw new Error(`Workflow ${workflow.id} not found`);
    }
    this.workflows.set(workflow.id, { ...workflow });
    return { ...workflow };
  }

  /**
   * Find workflow by approval request ID
   */
  async findByApprovalRequest(approvalRequestId: string): Promise<Workflow | null> {
    const workflows = Array.from(this.workflows.values());
    for (const workflow of workflows) {
      if (workflow.approvalRequestId === approvalRequestId) {
        return { ...workflow };
      }
    }
    return null;
  }

  /**
   * List workflows with optional filters
   */
  async list(filters?: {
    userId?: string;
    status?: WorkflowStatus;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Workflow[]> {
    let result = Array.from(this.workflows.values());

    if (filters?.userId) {
      result = result.filter((w) => w.userId === filters.userId);
    }

    if (filters?.status) {
      result = result.filter((w) => w.status === filters.status);
    }

    if (filters?.type) {
      result = result.filter((w) => w.type === filters.type);
    }

    // Sort by createdAt descending
    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? result.length;

    return result.slice(offset, offset + limit).map((w) => ({ ...w }));
  }

  /**
   * Get count by status
   */
  async countByStatus(): Promise<Record<WorkflowStatus, number>> {
    const counts: Record<WorkflowStatus, number> = {
      pending: 0,
      'awaiting-approval': 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    Array.from(this.workflows.values()).forEach((workflow) => {
      counts[workflow.status]++;
    });

    return counts;
  }

  /**
   * Reset store (for testing)
   */
  reset(): void {
    this.workflows.clear();
  }
}

export const workflowStore = new WorkflowStore();
