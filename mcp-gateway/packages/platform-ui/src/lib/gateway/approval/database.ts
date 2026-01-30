/**
 * Approval Workflow Database Layer
 *
 * @epic 3.75 - Code Execution
 * @task RECOVERY-02.2 - Create approval request storage service
 * @owner joe@arcfoundry.ai
 * @created 2026-01-23
 *
 * @description
 *   Database abstraction layer for approval workflow.
 *   Provides CRUD operations for approval requests and decisions.
 *   Uses an interface pattern to support multiple backends:
 *   - PostgreSQL (production)
 *   - In-memory (testing)
 *
 * @schema docs/schemas/approval-workflow-schema.sql
 */

import { CARSApprovalRequest, CARSApprovalResponse, RiskAssessmentSummary } from '../execution/types';

// ============================================
// TYPES
// ============================================

export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Full approval request record as stored in database
 */
export interface ApprovalRequest {
  /** Database UUID */
  id: string;

  /** CARS request ID (links to execution context) */
  requestId: string;

  /** Session ID for correlation */
  sessionId: string;

  /** Execution ID */
  executionId: string;

  /** Tool name if applicable */
  toolName?: string;

  /** Code snippet for review (truncated) */
  codeSnippet?: string;

  /** Risk level from CARS */
  riskLevel: RiskLevel;

  /** Risk score 0.0-1.0 */
  riskScore: number;

  /** Risk types detected */
  riskTypes: string[];

  /** Full execution context */
  context: Record<string, unknown>;

  /** User who triggered execution */
  requestingUserId?: string;

  /** Tenant ID for isolation */
  tenantId: string;

  /** Current status */
  status: ApprovalStatus;

  /** When request was created */
  createdAt: Date;

  /** When request expires */
  expiresAt: Date;

  /** Last update time */
  updatedAt: Date;
}

/**
 * Approval decision record
 */
export interface ApprovalDecision {
  /** Database UUID */
  id: string;

  /** Request ID this decision is for */
  requestId: string;

  /** Whether approved */
  approved: boolean;

  /** Reason for decision */
  reason?: string;

  /** Approver's user ID */
  approverId: string;

  /** Approver's email */
  approverEmail?: string;

  /** Approver's display name */
  approverName?: string;

  /** Optional conditions */
  conditions?: Record<string, unknown>;

  /** When decision was made */
  decidedAt: Date;

  /** Response time in ms */
  responseLatencyMs?: number;
}

/**
 * Options for creating an approval request
 */
export interface CreateApprovalRequestOptions {
  request: CARSApprovalRequest;
  toolName?: string;
  tenantId: string;
  expiresAt: Date;
  context?: Record<string, unknown>;
}

/**
 * Options for recording a decision
 */
export interface RecordDecisionOptions {
  requestId: string;
  approved: boolean;
  reason?: string;
  approverId: string;
  approverEmail?: string;
  approverName?: string;
  conditions?: Record<string, unknown>;
}

/**
 * Query options for listing requests
 */
export interface ListApprovalRequestsOptions {
  tenantId?: string;
  status?: ApprovalStatus;
  requestingUserId?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// DATABASE INTERFACE
// ============================================

/**
 * Abstract interface for approval database operations.
 * Implement this interface for different backends.
 */
export interface IApprovalDatabase {
  /**
   * Create a new approval request
   * @returns The generated approval ID
   */
  createApprovalRequest(options: CreateApprovalRequestOptions): Promise<string>;

  /**
   * Get an approval request by ID
   */
  getApprovalRequest(requestId: string): Promise<ApprovalRequest | null>;

  /**
   * Update the status of an approval request
   */
  updateApprovalStatus(requestId: string, status: ApprovalStatus): Promise<void>;

  /**
   * Record an approval decision
   */
  recordDecision(options: RecordDecisionOptions): Promise<void>;

  /**
   * Get the decision for a request
   */
  getDecision(requestId: string): Promise<ApprovalDecision | null>;

  /**
   * List approval requests matching criteria
   */
  listApprovalRequests(options: ListApprovalRequestsOptions): Promise<ApprovalRequest[]>;

  /**
   * Get all expired pending requests
   */
  getExpiredRequests(): Promise<ApprovalRequest[]>;

  /**
   * Cleanup old records
   * @returns Number of records deleted
   */
  cleanupOldRequests(olderThanDays: number): Promise<number>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

// ============================================
// IN-MEMORY IMPLEMENTATION (Testing/Dev)
// ============================================

/**
 * In-memory implementation for testing and development.
 * NOT for production use - data is lost on restart.
 */
export class InMemoryApprovalDatabase implements IApprovalDatabase {
  private requests: Map<string, ApprovalRequest> = new Map();
  private decisions: Map<string, ApprovalDecision> = new Map();
  private idCounter: number = 0;

  /**
   * Generate a UUID-like ID
   */
  private generateId(): string {
    return `${Date.now()}-${++this.idCounter}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async createApprovalRequest(options: CreateApprovalRequestOptions): Promise<string> {
    const { request, toolName, tenantId, expiresAt, context } = options;

    // Validate required fields
    if (!request.requestId) {
      throw new ApprovalDatabaseError('Request ID is required', 'VALIDATION_ERROR');
    }

    // Check for duplicate
    if (this.requests.has(request.requestId)) {
      throw new ApprovalDatabaseError(
        `Approval request already exists: ${request.requestId}`,
        'DUPLICATE_ERROR'
      );
    }

    const now = new Date();
    const approvalRequest: ApprovalRequest = {
      id: this.generateId(),
      requestId: request.requestId,
      sessionId: request.sessionId,
      executionId: request.executionId,
      toolName,
      codeSnippet: request.codeSnippet?.substring(0, 1000), // Truncate to 1000 chars
      riskLevel: request.riskAssessment.level,
      riskScore: request.riskAssessment.score,
      riskTypes: request.riskAssessment.types,
      context: context || {},
      requestingUserId: request.userId,
      tenantId,
      status: 'pending',
      createdAt: now,
      expiresAt,
      updatedAt: now,
    };

    this.requests.set(request.requestId, approvalRequest);
    return approvalRequest.id;
  }

  async getApprovalRequest(requestId: string): Promise<ApprovalRequest | null> {
    return this.requests.get(requestId) || null;
  }

  async updateApprovalStatus(requestId: string, status: ApprovalStatus): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new ApprovalDatabaseError(
        `Approval request not found: ${requestId}`,
        'NOT_FOUND'
      );
    }

    request.status = status;
    request.updatedAt = new Date();
  }

  async recordDecision(options: RecordDecisionOptions): Promise<void> {
    const { requestId, approved, reason, approverId, approverEmail, approverName, conditions } = options;

    // Verify request exists
    const request = await this.getApprovalRequest(requestId);
    if (!request) {
      throw new ApprovalDatabaseError(
        `Approval request not found: ${requestId}`,
        'NOT_FOUND'
      );
    }

    // Check if already decided
    if (this.decisions.has(requestId)) {
      throw new ApprovalDatabaseError(
        `Decision already recorded for: ${requestId}`,
        'DUPLICATE_ERROR'
      );
    }

    // Check if request is still pending
    if (request.status !== 'pending') {
      throw new ApprovalDatabaseError(
        `Request is not pending: ${requestId} (status: ${request.status})`,
        'INVALID_STATE'
      );
    }

    const now = new Date();
    const decision: ApprovalDecision = {
      id: this.generateId(),
      requestId,
      approved,
      reason,
      approverId,
      approverEmail,
      approverName,
      conditions,
      decidedAt: now,
      responseLatencyMs: now.getTime() - request.createdAt.getTime(),
    };

    this.decisions.set(requestId, decision);

    // Update request status
    await this.updateApprovalStatus(requestId, approved ? 'approved' : 'denied');
  }

  async getDecision(requestId: string): Promise<ApprovalDecision | null> {
    return this.decisions.get(requestId) || null;
  }

  async listApprovalRequests(options: ListApprovalRequestsOptions): Promise<ApprovalRequest[]> {
    const { tenantId, status, requestingUserId, limit = 100, offset = 0 } = options;

    let results = Array.from(this.requests.values());

    // Apply filters
    if (tenantId) {
      results = results.filter(r => r.tenantId === tenantId);
    }
    if (status) {
      results = results.filter(r => r.status === status);
    }
    if (requestingUserId) {
      results = results.filter(r => r.requestingUserId === requestingUserId);
    }

    // Sort by created_at descending
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    return results.slice(offset, offset + limit);
  }

  async getExpiredRequests(): Promise<ApprovalRequest[]> {
    const now = new Date();
    return Array.from(this.requests.values())
      .filter(r => r.status === 'pending' && r.expiresAt < now);
  }

  async cleanupOldRequests(olderThanDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    let deleted = 0;
    const completedStatuses: ApprovalStatus[] = ['approved', 'denied', 'expired', 'cancelled'];

    for (const [requestId, request] of this.requests.entries()) {
      if (completedStatuses.includes(request.status) && request.createdAt < cutoff) {
        this.requests.delete(requestId);
        this.decisions.delete(requestId);
        deleted++;
      }
    }

    return deleted;
  }

  async healthCheck(): Promise<boolean> {
    return true; // In-memory is always "healthy"
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.requests.clear();
    this.decisions.clear();
    this.idCounter = 0;
  }

  /**
   * Get stats (for debugging)
   */
  getStats(): { requestCount: number; decisionCount: number } {
    return {
      requestCount: this.requests.size,
      decisionCount: this.decisions.size,
    };
  }
}

// ============================================
// ERROR TYPES
// ============================================

export type ApprovalDatabaseErrorCode =
  | 'VALIDATION_ERROR'
  | 'DUPLICATE_ERROR'
  | 'NOT_FOUND'
  | 'INVALID_STATE'
  | 'CONNECTION_ERROR'
  | 'QUERY_ERROR';

export class ApprovalDatabaseError extends Error {
  constructor(
    message: string,
    public readonly code: ApprovalDatabaseErrorCode,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ApprovalDatabaseError';
  }
}

// ============================================
// APPROVAL DATABASE SERVICE
// ============================================

/**
 * High-level service wrapping the database layer.
 * Adds business logic, logging, and metrics.
 */
export class ApprovalDatabaseService {
  constructor(private readonly db: IApprovalDatabase) {}

  /**
   * Create a new approval request from a CARS request
   */
  async createRequest(
    carsRequest: CARSApprovalRequest,
    options: {
      toolName?: string;
      tenantId: string;
      timeoutMs?: number;
      context?: Record<string, unknown>;
    }
  ): Promise<string> {
    const { toolName, tenantId, timeoutMs = 300000, context } = options;

    const expiresAt = new Date(Date.now() + timeoutMs);

    try {
      const id = await this.db.createApprovalRequest({
        request: carsRequest,
        toolName,
        tenantId,
        expiresAt,
        context,
      });

      // TODO: Add metrics - approval_requests_created_total

      return id;
    } catch (error) {
      // TODO: Add error metrics
      throw error;
    }
  }

  /**
   * Get a request with its decision if available
   */
  async getRequestWithDecision(requestId: string): Promise<{
    request: ApprovalRequest;
    decision: ApprovalDecision | null;
  } | null> {
    const request = await this.db.getApprovalRequest(requestId);
    if (!request) {
      return null;
    }

    const decision = await this.db.getDecision(requestId);
    return { request, decision };
  }

  /**
   * Approve a request
   */
  async approve(
    requestId: string,
    approver: { id: string; email?: string; name?: string },
    reason?: string,
    conditions?: Record<string, unknown>
  ): Promise<void> {
    await this.db.recordDecision({
      requestId,
      approved: true,
      reason,
      approverId: approver.id,
      approverEmail: approver.email,
      approverName: approver.name,
      conditions,
    });

    // TODO: Add metrics - approval_decisions_total{decision="approved"}
  }

  /**
   * Deny a request
   */
  async deny(
    requestId: string,
    approver: { id: string; email?: string; name?: string },
    reason?: string
  ): Promise<void> {
    await this.db.recordDecision({
      requestId,
      approved: false,
      reason,
      approverId: approver.id,
      approverEmail: approver.email,
      approverName: approver.name,
    });

    // TODO: Add metrics - approval_decisions_total{decision="denied"}
  }

  /**
   * Cancel a pending request
   */
  async cancel(requestId: string): Promise<void> {
    await this.db.updateApprovalStatus(requestId, 'cancelled');
  }

  /**
   * Process expired requests
   * @returns Number of requests expired
   */
  async processExpiredRequests(): Promise<number> {
    const expired = await this.db.getExpiredRequests();

    for (const request of expired) {
      await this.db.updateApprovalStatus(request.requestId, 'expired');
    }

    // TODO: Add metrics - approval_requests_expired_total

    return expired.length;
  }

  /**
   * Get pending requests for a tenant
   */
  async getPendingRequests(tenantId: string): Promise<ApprovalRequest[]> {
    return this.db.listApprovalRequests({
      tenantId,
      status: 'pending',
    });
  }

  /**
   * Cleanup old records
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    return this.db.cleanupOldRequests(retentionDays);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return this.db.healthCheck();
  }
}

// ============================================
// FACTORY
// ============================================

/**
 * Create an approval database instance based on configuration
 */
export function createApprovalDatabase(config?: {
  type?: 'memory' | 'postgres';
  connectionString?: string;
}): IApprovalDatabase {
  const type = config?.type || 'memory';

  switch (type) {
    case 'memory':
      return new InMemoryApprovalDatabase();

    case 'postgres':
      // TODO: Implement PostgreSQL backend
      // return new PostgresApprovalDatabase(config.connectionString);
      throw new Error('PostgreSQL backend not yet implemented. Use "memory" for now.');

    default:
      throw new Error(`Unknown database type: ${type}`);
  }
}

// ============================================
// DEFAULT INSTANCE
// ============================================

// Default in-memory instance for development
let defaultDatabase: IApprovalDatabase | null = null;
let defaultService: ApprovalDatabaseService | null = null;

export function getDefaultApprovalDatabase(): IApprovalDatabase {
  if (!defaultDatabase) {
    defaultDatabase = createApprovalDatabase({ type: 'memory' });
  }
  return defaultDatabase;
}

export function getDefaultApprovalService(): ApprovalDatabaseService {
  if (!defaultService) {
    defaultService = new ApprovalDatabaseService(getDefaultApprovalDatabase());
  }
  return defaultService;
}
