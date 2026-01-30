/**
 * MCP Security Gateway - Approval API
 *
 * @epic 3.5 - Gateway Foundation
 * @task 3.5.3.3 - Approval API Endpoints
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   HTTP/REST API endpoints for the human approval workflow.
 *   Provides CRUD operations for approval requests and decisions.
 */

import { IncomingMessage, ServerResponse } from 'http';
import {
  ApprovalGate,
  ApprovalRequest,
  PendingApproval,
  ApprovalRecord,
} from './index';
import { ApprovalInfo, CARSAssessment, RequestContext } from '../core/types';

// ============================================
// TYPES
// ============================================

/**
 * HTTP request handler function
 */
export type RequestHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: RouteParams
) => Promise<void>;

/**
 * Route parameters extracted from URL
 */
export interface RouteParams {
  [key: string]: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Request body for creating an approval request
 */
export interface CreateApprovalBody {
  tool: string;
  params: Record<string, unknown>;
  context: {
    tenantId: string;
    userId?: string;
    sessionId?: string;
    source: string;
  };
  riskAssessment?: {
    riskLevel: string;
    score: number;
    recommendation: string;
  };
}

/**
 * Request body for submitting an approval decision
 */
export interface SubmitApprovalBody {
  approved: boolean;
  approver: string;
  reason?: string;
}

/**
 * Response for approval status
 */
export interface ApprovalStatusResponse {
  requestId: string;
  tool: string;
  status: 'pending' | 'approved' | 'denied' | 'timeout';
  createdAt: string;
  expiresAt: string;
  context: RequestContext;
  riskAssessment?: CARSAssessment;
  decision?: {
    approved: boolean;
    approvedBy?: string;
    approvedAt?: string;
    reason?: string;
  };
}

// ============================================
// APPROVAL API CLASS
// ============================================

/**
 * HTTP API for the approval workflow
 *
 * @example
 * ```typescript
 * import { createServer } from 'http';
 * import { ApprovalGate } from './index';
 * import { ApprovalApi } from './api';
 *
 * const gate = new ApprovalGate(config);
 * const api = new ApprovalApi(gate);
 *
 * const server = createServer(async (req, res) => {
 *   await api.handleRequest(req, res);
 * });
 *
 * server.listen(3000);
 * ```
 */
export class ApprovalApi {
  private gate: ApprovalGate;
  private basePath: string;

  constructor(gate: ApprovalGate, basePath = '/api/approvals') {
    this.gate = gate;
    this.basePath = basePath;
  }

  /**
   * Main request handler - routes to appropriate endpoint
   */
  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    const url = req.url || '';
    const method = req.method || 'GET';

    // Check if this is an approvals endpoint
    if (!url.startsWith(this.basePath)) {
      return false; // Not handled by this API
    }

    const path = url.slice(this.basePath.length);

    try {
      // Route to appropriate handler
      if (method === 'POST' && path === '') {
        await this.createApproval(req, res);
      } else if (method === 'GET' && path === '') {
        await this.listPendingApprovals(req, res);
      } else if (method === 'GET' && path.match(/^\/[\w-]+$/)) {
        const requestId = path.slice(1);
        await this.getApprovalStatus(req, res, { requestId });
      } else if (method === 'POST' && path.match(/^\/[\w-]+\/approve$/)) {
        const requestId = path.split('/')[1] ?? '';
        await this.submitApprovalDecision(req, res, { requestId, decision: 'approve' });
      } else if (method === 'POST' && path.match(/^\/[\w-]+\/reject$/)) {
        const requestId = path.split('/')[1] ?? '';
        await this.submitApprovalDecision(req, res, { requestId, decision: 'reject' });
      } else if (method === 'GET' && path.match(/^\/history\/[\w-]+$/)) {
        const tool = path.split('/')[2] ?? '';
        await this.getApprovalHistory(req, res, { tool });
      } else {
        this.sendError(res, 404, 'NOT_FOUND', `Endpoint not found: ${method} ${url}`);
      }

      return true;
    } catch (error) {
      this.sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred', error);
      return true;
    }
  }

  // ==========================================
  // ENDPOINT HANDLERS
  // ==========================================

  /**
   * POST /api/approvals
   * Create a new approval request
   */
  private async createApproval(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const body = await this.parseBody<CreateApprovalBody>(req);

    if (!body) {
      this.sendError(res, 400, 'INVALID_BODY', 'Request body is required');
      return;
    }

    // Validate required fields
    if (!body.tool || !body.context?.tenantId) {
      this.sendError(res, 400, 'MISSING_FIELDS', 'tool and context.tenantId are required');
      return;
    }

    // Generate request ID
    const requestId = this.generateRequestId();

    // Build approval request
    const approvalRequest: ApprovalRequest = {
      requestId,
      tool: body.tool,
      params: body.params || {},
      context: {
        tenantId: body.context.tenantId,
        userId: body.context.userId,
        sessionId: body.context.sessionId,
        source: body.context.source || 'api',
      },
      riskAssessment: body.riskAssessment ? {
        tool: body.tool,
        riskLevel: body.riskAssessment.riskLevel as any,
        autonomyLevel: 'assisted',
        safeguards: [],
        score: body.riskAssessment.score,
        recommendation: body.riskAssessment.recommendation as any,
      } : undefined,
    };

    // Request approval (non-blocking for API)
    // The actual approval will be handled by submitApprovalDecision
    const pending = this.gate.getPendingApprovals().find(p => p.requestId === requestId);

    // Start the approval process in background
    this.gate.requestApproval(approvalRequest).catch(err => {
      console.error('[ApprovalApi] Approval request failed:', err);
    });

    // Return immediately with the pending request info
    this.sendSuccess(res, 201, {
      requestId,
      tool: body.tool,
      status: 'pending',
      approvalUrl: `/api/approvals/${requestId}`,
      approveUrl: `/api/approvals/${requestId}/approve`,
      rejectUrl: `/api/approvals/${requestId}/reject`,
      expiresAt: new Date(Date.now() + 300000).toISOString(), // 5 minutes default
    });
  }

  /**
   * GET /api/approvals
   * List all pending approval requests
   */
  private async listPendingApprovals(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const pendingApprovals = this.gate.getPendingApprovals();

    const response = pendingApprovals.map(p => ({
      requestId: p.requestId,
      tool: p.tool,
      status: p.status,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
      context: {
        tenantId: p.context.tenantId,
        userId: p.context.userId,
        source: p.context.source,
      },
      riskLevel: p.riskAssessment?.riskLevel,
    }));

    this.sendSuccess(res, 200, {
      count: response.length,
      approvals: response,
    });
  }

  /**
   * GET /api/approvals/:requestId
   * Get status of a specific approval request
   */
  private async getApprovalStatus(
    req: IncomingMessage,
    res: ServerResponse,
    params: RouteParams
  ): Promise<void> {
    const { requestId } = params;

    const pending = this.gate.getPendingApprovals().find(p => p.requestId === requestId);

    if (!pending) {
      this.sendError(res, 404, 'NOT_FOUND', `Approval request not found: ${requestId}`);
      return;
    }

    const response: ApprovalStatusResponse = {
      requestId: pending.requestId,
      tool: pending.tool,
      status: pending.status,
      createdAt: pending.createdAt,
      expiresAt: pending.expiresAt,
      context: pending.context,
      riskAssessment: pending.riskAssessment,
    };

    this.sendSuccess(res, 200, response);
  }

  /**
   * POST /api/approvals/:requestId/approve
   * POST /api/approvals/:requestId/reject
   * Submit an approval or rejection decision
   */
  private async submitApprovalDecision(
    req: IncomingMessage,
    res: ServerResponse,
    params: RouteParams & { decision: 'approve' | 'reject' }
  ): Promise<void> {
    const { requestId, decision } = params;
    const body = await this.parseBody<SubmitApprovalBody>(req);

    if (!body?.approver) {
      this.sendError(res, 400, 'MISSING_FIELDS', 'approver is required');
      return;
    }

    const approved = decision === 'approve';

    try {
      this.gate.submitApproval(requestId ?? '', approved, body.approver, body.reason);

      this.sendSuccess(res, 200, {
        requestId,
        status: approved ? 'approved' : 'denied',
        approvedBy: body.approver,
        approvedAt: new Date().toISOString(),
        reason: body.reason,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('No pending approval')) {
        this.sendError(res, 404, 'NOT_FOUND', `Approval request not found or already processed: ${requestId}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * GET /api/approvals/history/:tool
   * Get approval history for a specific tool
   */
  private async getApprovalHistory(
    req: IncomingMessage,
    res: ServerResponse,
    params: RouteParams
  ): Promise<void> {
    const { tool } = params;

    const history = this.gate.getApprovalHistory(tool ?? '');

    if (!history) {
      this.sendSuccess(res, 200, {
        tool,
        history: null,
        message: 'No approval history found for this tool',
      });
      return;
    }

    this.sendSuccess(res, 200, {
      tool: history.tool,
      approvalCount: history.approvalCount,
      denialCount: history.denialCount,
      lastApproved: history.lastApproved,
      lastApprover: history.lastApprover,
      lastDenied: history.lastDenied,
      lastDenier: history.lastDenier,
      lastDenialReason: history.lastDenialReason,
    });
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Parse JSON body from request
   */
  private async parseBody<T>(req: IncomingMessage): Promise<T | null> {
    return new Promise((resolve) => {
      let body = '';

      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        if (!body) {
          resolve(null);
          return;
        }

        try {
          resolve(JSON.parse(body) as T);
        } catch {
          resolve(null);
        }
      });

      req.on('error', () => {
        resolve(null);
      });
    });
  }

  /**
   * Send success response
   */
  private sendSuccess<T>(res: ServerResponse, status: number, data: T): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    res.writeHead(status, {
      'Content-Type': 'application/json',
      'X-Request-Id': this.generateRequestId(),
    });
    res.end(JSON.stringify(response, null, 2));
  }

  /**
   * Send error response
   */
  private sendError(
    res: ServerResponse,
    status: number,
    code: string,
    message: string,
    details?: unknown
  ): void {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details: details instanceof Error ? details.message : details,
      },
      timestamp: new Date().toISOString(),
    };

    res.writeHead(status, {
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify(response, null, 2));
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `apr_${timestamp}_${random}`;
  }
}

// ============================================
// EXPRESS MIDDLEWARE (OPTIONAL)
// ============================================

/**
 * Create Express-compatible middleware for the approval API
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { ApprovalGate } from './index';
 * import { createApprovalMiddleware } from './api';
 *
 * const app = express();
 * const gate = new ApprovalGate(config);
 *
 * app.use('/api/approvals', createApprovalMiddleware(gate));
 * ```
 */
export function createApprovalMiddleware(gate: ApprovalGate) {
  const api = new ApprovalApi(gate, '');

  return async (req: any, res: any, next: any) => {
    // Prepend the base path for routing
    const originalUrl = req.url;
    req.url = req.path || req.url;

    const handled = await api.handleRequest(req, res);

    if (!handled) {
      req.url = originalUrl;
      next();
    }
  };
}

// ============================================
// STANDALONE SERVER (FOR TESTING)
// ============================================

/**
 * Create a standalone HTTP server for the approval API
 *
 * @example
 * ```typescript
 * import { ApprovalGate } from './index';
 * import { createApprovalServer } from './api';
 *
 * const gate = new ApprovalGate(config);
 * const server = createApprovalServer(gate, 3000);
 *
 * console.log('Approval API running on http://localhost:3000');
 * ```
 */
export function createApprovalServer(gate: ApprovalGate, port = 3000) {
  const { createServer } = require('http');
  const api = new ApprovalApi(gate);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Enable CORS for development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const handled = await api.handleRequest(req, res);

    if (!handled) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
        },
        timestamp: new Date().toISOString(),
      }));
    }
  });

  server.listen(port, () => {
    console.log(`[ApprovalApi] Server running on http://localhost:${port}`);
    console.log(`[ApprovalApi] Endpoints:`);
    console.log(`  POST   /api/approvals           - Create approval request`);
    console.log(`  GET    /api/approvals           - List pending approvals`);
    console.log(`  GET    /api/approvals/:id       - Get approval status`);
    console.log(`  POST   /api/approvals/:id/approve - Approve request`);
    console.log(`  POST   /api/approvals/:id/reject  - Reject request`);
    console.log(`  GET    /api/approvals/history/:tool - Get tool history`);
  });

  return server;
}

// ============================================
// EXPORTS
// ============================================

export default ApprovalApi;
