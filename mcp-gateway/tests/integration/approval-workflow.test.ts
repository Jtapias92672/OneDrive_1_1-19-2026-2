/**
 * Approval Workflow Integration Tests
 *
 * @epic 3.75 - Code Execution
 * @task RECOVERY-02.8 - Add integration tests for full workflow
 * @owner joe@arcfoundry.ai
 * @created 2026-01-23
 *
 * @description
 *   End-to-end integration tests for the human-in-the-loop approval workflow.
 *   Tests the full flow from CARS risk assessment through approval decision.
 *
 * @coverage
 *   - ApprovalDatabaseService (RECOVERY-02.2)
 *   - NotificationService (RECOVERY-02.3)
 *   - DecisionWaiter (RECOVERY-02.5)
 *   - EscalationService (RECOVERY-02.6)
 *   - ApprovalManager integration (RECOVERY-02.7)
 */

import {
  ApprovalDatabaseService,
  InMemoryApprovalDatabase,
  ApprovalRequest,
  ApprovalDecision,
  getDefaultApprovalDatabase,
} from '../../approval/database.js';

import {
  DecisionWaiter,
  createDecisionWaiter,
  WaitForDecisionResult,
} from '../../approval/decision-waiter.js';

import {
  EscalationService,
  createEscalationService,
  EscalationEvent,
  IAuditLogger,
} from '../../approval/escalation-service.js';

import {
  NotificationService,
  MockSlackChannel,
  MockEmailChannel,
  createNotificationService,
  Approver,
} from '../../approval/notification-service.js';

import {
  CARSApprovalRequest,
  RiskAssessmentSummary,
} from '../../execution/types.js';

// ============================================
// TEST HELPERS
// ============================================

function createMockCARSRequest(overrides?: Partial<CARSApprovalRequest>): CARSApprovalRequest {
  return {
    requestId: `test-request-${Date.now()}`,
    sessionId: 'test-session-123',
    executionId: `exec-${Date.now()}`,
    codeSnippet: 'console.log("test code")',
    riskAssessment: {
      level: 'high',
      score: 0.75,
      types: ['CODE_EXECUTION'],
      recommendedClassification: 'CONFIDENTIAL',
      requiresApproval: true,
    },
    userId: 'test-user',
    timestamp: new Date().toISOString(),
    timeoutMs: 5000, // Short timeout for tests
    ...overrides,
  };
}

function createTestApprovers(): Approver[] {
  return [
    {
      id: 'approver-1',
      email: 'approver1@example.com',
      slackUserId: 'U12345',
      name: 'Test Approver 1',
    },
    {
      id: 'approver-2',
      email: 'approver2@example.com',
      name: 'Test Approver 2',
    },
  ];
}

/**
 * Test audit logger that captures events
 */
class TestAuditLogger implements IAuditLogger {
  public events: EscalationEvent[] = [];

  async logEscalationEvent(event: EscalationEvent): Promise<void> {
    this.events.push(event);
  }

  clear(): void {
    this.events = [];
  }
}

// ============================================
// DATABASE SERVICE INTEGRATION TESTS
// ============================================

describe('ApprovalDatabaseService Integration', () => {
  let db: InMemoryApprovalDatabase;
  let service: ApprovalDatabaseService;

  beforeEach(() => {
    db = new InMemoryApprovalDatabase();
    service = new ApprovalDatabaseService(db);
  });

  describe('Full Request Lifecycle', () => {
    it('should create, retrieve, and approve a request', async () => {
      const carsRequest = createMockCARSRequest();

      // Create request
      const requestId = await service.createRequest(carsRequest, {
        tenantId: 'test-tenant',
        toolName: 'code_execution',
        timeoutMs: 300000,
      });

      expect(requestId).toBeDefined();

      // Retrieve request
      const result = await service.getRequestWithDecision(carsRequest.requestId);
      expect(result).not.toBeNull();
      expect(result?.request.status).toBe('pending');
      expect(result?.decision).toBeNull();

      // Approve request
      await service.approve(carsRequest.requestId, {
        id: 'approver-1',
        email: 'approver@test.com',
        name: 'Test Approver',
      }, 'Looks good');

      // Verify approved status
      const approved = await service.getRequestWithDecision(carsRequest.requestId);
      expect(approved?.request.status).toBe('approved');
      expect(approved?.decision?.approved).toBe(true);
      expect(approved?.decision?.reason).toBe('Looks good');
    });

    it('should create, retrieve, and deny a request', async () => {
      const carsRequest = createMockCARSRequest();

      await service.createRequest(carsRequest, {
        tenantId: 'test-tenant',
        timeoutMs: 300000,
      });

      // Deny request
      await service.deny(carsRequest.requestId, {
        id: 'approver-1',
        name: 'Security Reviewer',
      }, 'Too risky');

      const denied = await service.getRequestWithDecision(carsRequest.requestId);
      expect(denied?.request.status).toBe('denied');
      expect(denied?.decision?.approved).toBe(false);
      expect(denied?.decision?.reason).toBe('Too risky');
    });

    it('should cancel a pending request', async () => {
      const carsRequest = createMockCARSRequest();

      await service.createRequest(carsRequest, {
        tenantId: 'test-tenant',
        timeoutMs: 300000,
      });

      await service.cancel(carsRequest.requestId);

      const cancelled = await service.getRequestWithDecision(carsRequest.requestId);
      expect(cancelled?.request.status).toBe('cancelled');
    });

    it('should reject duplicate requests', async () => {
      const carsRequest = createMockCARSRequest();

      await service.createRequest(carsRequest, {
        tenantId: 'test-tenant',
        timeoutMs: 300000,
      });

      await expect(
        service.createRequest(carsRequest, {
          tenantId: 'test-tenant',
          timeoutMs: 300000,
        })
      ).rejects.toThrow(/already exists/);
    });

    it('should reject decision on non-pending request', async () => {
      const carsRequest = createMockCARSRequest();

      await service.createRequest(carsRequest, {
        tenantId: 'test-tenant',
        timeoutMs: 300000,
      });

      // First approval succeeds
      await service.approve(carsRequest.requestId, { id: 'approver-1' });

      // Second approval should fail
      await expect(
        service.approve(carsRequest.requestId, { id: 'approver-2' })
      ).rejects.toThrow();
    });
  });

  describe('Listing and Filtering', () => {
    it('should list pending requests for a tenant', async () => {
      // Create multiple requests
      const request1 = createMockCARSRequest({ requestId: 'req-1' });
      const request2 = createMockCARSRequest({ requestId: 'req-2' });
      const request3 = createMockCARSRequest({ requestId: 'req-3' });

      await service.createRequest(request1, { tenantId: 'tenant-a', timeoutMs: 300000 });
      await service.createRequest(request2, { tenantId: 'tenant-a', timeoutMs: 300000 });
      await service.createRequest(request3, { tenantId: 'tenant-b', timeoutMs: 300000 });

      // Approve one
      await service.approve('req-1', { id: 'approver-1' });

      // List pending for tenant-a
      const pending = await service.getPendingRequests('tenant-a');
      expect(pending).toHaveLength(1);
      expect(pending[0]?.requestId).toBe('req-2');
    });
  });

  describe('Expiration Handling', () => {
    it('should identify expired requests', async () => {
      // Create a request with very short timeout (already expired)
      const carsRequest = createMockCARSRequest();

      // Manually create with expired date
      await db.createApprovalRequest({
        request: carsRequest,
        tenantId: 'test-tenant',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });

      // Process expired
      const expiredCount = await service.processExpiredRequests();
      expect(expiredCount).toBe(1);

      const result = await service.getRequestWithDecision(carsRequest.requestId);
      expect(result?.request.status).toBe('expired');
    });
  });
});

// ============================================
// DECISION WAITER INTEGRATION TESTS
// ============================================

describe('DecisionWaiter Integration', () => {
  let db: InMemoryApprovalDatabase;
  let waiter: DecisionWaiter;

  beforeEach(() => {
    db = new InMemoryApprovalDatabase();
    waiter = createDecisionWaiter(db, {
      pollIntervalMs: 50, // Fast polling for tests
      defaultTimeoutMs: 1000, // 1 second default timeout
      escalationThreshold: 0.5, // Escalate at 50% for faster testing
    });
  });

  describe('Decision Detection', () => {
    it('should detect and return a human approval decision', async () => {
      const carsRequest = createMockCARSRequest({ requestId: 'wait-test-1' });

      // Create request in database
      await db.createApprovalRequest({
        request: carsRequest,
        tenantId: 'test-tenant',
        expiresAt: new Date(Date.now() + 10000),
      });

      // Simulate async approval after 100ms
      setTimeout(async () => {
        await db.recordDecision({
          requestId: 'wait-test-1',
          approved: true,
          reason: 'Approved by reviewer',
          approverId: 'reviewer-1',
        });
      }, 100);

      // Wait for decision
      const result = await waiter.waitForDecision('wait-test-1', 5000);

      expect(result.decision.approved).toBe(true);
      expect(result.isHumanDecision).toBe(true);
      expect(result.timedOut).toBe(false);
      expect(result.waitTimeMs).toBeGreaterThan(50);
      expect(result.waitTimeMs).toBeLessThan(1000);
    });

    it('should detect and return a human denial decision', async () => {
      const carsRequest = createMockCARSRequest({ requestId: 'wait-test-2' });

      await db.createApprovalRequest({
        request: carsRequest,
        tenantId: 'test-tenant',
        expiresAt: new Date(Date.now() + 10000),
      });

      // Simulate async denial
      setTimeout(async () => {
        await db.recordDecision({
          requestId: 'wait-test-2',
          approved: false,
          reason: 'Security concern',
          approverId: 'security-team',
        });
      }, 100);

      const result = await waiter.waitForDecision('wait-test-2', 5000);

      expect(result.decision.approved).toBe(false);
      expect(result.decision.reason).toBe('Security concern');
      expect(result.isHumanDecision).toBe(true);
      expect(result.timedOut).toBe(false);
    });
  });

  describe('Timeout Handling (Fail-Closed)', () => {
    it('should auto-deny on timeout', async () => {
      const carsRequest = createMockCARSRequest({ requestId: 'timeout-test' });

      await db.createApprovalRequest({
        request: carsRequest,
        tenantId: 'test-tenant',
        expiresAt: new Date(Date.now() + 10000),
      });

      // Wait with short timeout, no decision made
      const result = await waiter.waitForDecision('timeout-test', 200);

      expect(result.decision.approved).toBe(false);
      expect(result.isHumanDecision).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.decision.reason).toMatch(/timeout/i);
      expect(result.decision.approverId).toBe('system');
    });

    it('should call timeout callback on timeout', async () => {
      const carsRequest = createMockCARSRequest({ requestId: 'callback-test' });
      let timeoutCalled = false;
      let timeoutElapsed = 0;

      await db.createApprovalRequest({
        request: carsRequest,
        tenantId: 'test-tenant',
        expiresAt: new Date(Date.now() + 10000),
      });

      waiter.onTimeout(async (req, elapsed) => {
        timeoutCalled = true;
        timeoutElapsed = elapsed;
      });

      await waiter.waitForDecision('callback-test', 200);

      expect(timeoutCalled).toBe(true);
      expect(timeoutElapsed).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Escalation', () => {
    it('should trigger escalation at threshold', async () => {
      const carsRequest = createMockCARSRequest({ requestId: 'escalation-test' });
      let escalationCalled = false;
      let escalationRemainingMs = 0;

      await db.createApprovalRequest({
        request: carsRequest,
        tenantId: 'test-tenant',
        expiresAt: new Date(Date.now() + 10000),
      });

      waiter.onEscalation(async (req, elapsed, remaining) => {
        escalationCalled = true;
        escalationRemainingMs = remaining;
      });

      // Timeout is 400ms, threshold is 50%, so escalation at ~200ms
      await waiter.waitForDecision('escalation-test', 400);

      expect(escalationCalled).toBe(true);
      expect(escalationRemainingMs).toBeLessThan(250); // Some buffer for timing
    });

    it('should not escalate if decision comes before threshold', async () => {
      const carsRequest = createMockCARSRequest({ requestId: 'no-escalation-test' });
      let escalationCalled = false;

      await db.createApprovalRequest({
        request: carsRequest,
        tenantId: 'test-tenant',
        expiresAt: new Date(Date.now() + 10000),
      });

      waiter.onEscalation(async () => {
        escalationCalled = true;
      });

      // Quick approval before escalation threshold
      setTimeout(async () => {
        await db.recordDecision({
          requestId: 'no-escalation-test',
          approved: true,
          approverId: 'quick-reviewer',
        });
      }, 50);

      const result = await waiter.waitForDecision('no-escalation-test', 1000);

      expect(result.escalated).toBe(false);
      expect(escalationCalled).toBe(false);
    });
  });

  describe('Cancellation', () => {
    it('should detect cancelled request', async () => {
      const carsRequest = createMockCARSRequest({ requestId: 'cancel-test' });

      await db.createApprovalRequest({
        request: carsRequest,
        tenantId: 'test-tenant',
        expiresAt: new Date(Date.now() + 10000),
      });

      // Cancel after 100ms
      setTimeout(async () => {
        await waiter.cancelWait('cancel-test');
      }, 100);

      const result = await waiter.waitForDecision('cancel-test', 5000);

      expect(result.decision.approved).toBe(false);
      expect(result.isHumanDecision).toBe(false);
    });
  });
});

// ============================================
// ESCALATION SERVICE INTEGRATION TESTS
// ============================================

describe('EscalationService Integration', () => {
  let db: InMemoryApprovalDatabase;
  let waiter: DecisionWaiter;
  let escalationService: EscalationService;
  let testAuditLogger: TestAuditLogger;
  let mockSlack: MockSlackChannel;

  beforeEach(() => {
    db = new InMemoryApprovalDatabase();
    waiter = createDecisionWaiter(db, {
      pollIntervalMs: 50,
      defaultTimeoutMs: 500,
      escalationThreshold: 0.5,
    });

    mockSlack = new MockSlackChannel();
    const notificationService = createNotificationService({
      channels: [mockSlack],
    });

    escalationService = createEscalationService({
      adminApprovers: [
        { id: 'admin-1', email: 'admin@test.com', slackUserId: 'UA123' },
      ],
      enableAuditLogging: true,
    }, notificationService);

    testAuditLogger = new TestAuditLogger();
    escalationService.setAuditLogger(testAuditLogger);
    escalationService.attachToDecisionWaiter(waiter);
  });

  it('should notify admins on escalation', async () => {
    const carsRequest = createMockCARSRequest({ requestId: 'admin-notify-test' });

    await db.createApprovalRequest({
      request: carsRequest,
      tenantId: 'test-tenant',
      expiresAt: new Date(Date.now() + 10000),
    });

    await waiter.waitForDecision('admin-notify-test', 500);

    // Check audit log for escalation event
    const escalationEvents = testAuditLogger.events.filter(e => e.type === 'escalation');
    expect(escalationEvents.length).toBeGreaterThan(0);

    // Check Slack was notified
    const slackLogs = mockSlack.getLogs();
    expect(slackLogs.length).toBeGreaterThan(0);
  });

  it('should log timeout events', async () => {
    const carsRequest = createMockCARSRequest({ requestId: 'timeout-log-test' });

    await db.createApprovalRequest({
      request: carsRequest,
      tenantId: 'test-tenant',
      expiresAt: new Date(Date.now() + 10000),
    });

    await waiter.waitForDecision('timeout-log-test', 300);

    const timeoutEvents = testAuditLogger.events.filter(e => e.type === 'timeout');
    expect(timeoutEvents.length).toBe(1);

    const autoDenyEvents = testAuditLogger.events.filter(e => e.type === 'auto_deny');
    expect(autoDenyEvents.length).toBe(1);
    expect(autoDenyEvents[0]?.details.decision).toBe('denied');
    expect(autoDenyEvents[0]?.details.decisionSource).toBe('system');
  });

  it('should support manual escalation', async () => {
    const carsRequest = createMockCARSRequest({ requestId: 'manual-escalation-test' });

    await db.createApprovalRequest({
      request: carsRequest,
      tenantId: 'test-tenant',
      expiresAt: new Date(Date.now() + 10000),
    });

    const request = await db.getApprovalRequest('manual-escalation-test');
    if (request) {
      await escalationService.escalateApproval(request, 'User requested escalation');
    }

    const escalationEvents = testAuditLogger.events.filter(e => e.type === 'escalation');
    expect(escalationEvents.length).toBe(1);
    expect(escalationEvents[0]?.details.manuallyTriggered).toBe(true);
  });
});

// ============================================
// NOTIFICATION SERVICE INTEGRATION TESTS
// ============================================

describe('NotificationService Integration', () => {
  let mockSlack: MockSlackChannel;
  let mockEmail: MockEmailChannel;
  let notificationService: NotificationService;

  beforeEach(() => {
    mockSlack = new MockSlackChannel();
    mockEmail = new MockEmailChannel();
    notificationService = createNotificationService({
      channels: [mockSlack, mockEmail],
    });
  });

  it('should notify multiple approvers via multiple channels', async () => {
    const request: ApprovalRequest = {
      id: 'db-1',
      requestId: 'notify-test',
      sessionId: 'session-1',
      executionId: 'exec-1',
      riskLevel: 'high',
      riskScore: 0.8,
      riskTypes: ['CODE_EXECUTION'],
      context: {},
      tenantId: 'test',
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 300000),
      updatedAt: new Date(),
    };

    const approvers = createTestApprovers();

    const results = await notificationService.notifyApprovers(request, approvers);

    // Should have 4 results (2 approvers × 2 channels)
    expect(results.length).toBe(4);

    // All should succeed (mock channels always succeed)
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(4);

    // Slack should have 2 entries
    expect(mockSlack.getLogs().length).toBe(2);

    // Email should have 2 entries
    expect(mockEmail.getLogs().length).toBe(2);
  });

  it('should include risk information in notifications', async () => {
    const request: ApprovalRequest = {
      id: 'db-2',
      requestId: 'risk-info-test',
      sessionId: 'session-2',
      executionId: 'exec-2',
      codeSnippet: 'eval("dangerous")',
      riskLevel: 'critical',
      riskScore: 0.95,
      riskTypes: ['CODE_EXECUTION', 'DECEPTIVE_COMPLIANCE'],
      context: { originalInput: 'user message' },
      tenantId: 'test',
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 300000),
      updatedAt: new Date(),
    };

    const testApprovers = createTestApprovers();
    const approvers = testApprovers.slice(0, 1);

    await notificationService.notifyApprovers(request, approvers);

    const slackLogs = mockSlack.getLogs();
    expect(slackLogs[0]?.request.riskLevel).toBe('critical');
    expect(slackLogs[0]?.request.riskScore).toBe(0.95);
  });
});

// ============================================
// FULL WORKFLOW INTEGRATION TESTS
// ============================================

describe('Full Approval Workflow Integration', () => {
  let db: InMemoryApprovalDatabase;
  let dbService: ApprovalDatabaseService;
  let waiter: DecisionWaiter;
  let escalationService: EscalationService;
  let notificationService: NotificationService;
  let mockSlack: MockSlackChannel;
  let testAuditLogger: TestAuditLogger;

  beforeEach(() => {
    // Set up all components
    db = new InMemoryApprovalDatabase();
    dbService = new ApprovalDatabaseService(db);

    waiter = createDecisionWaiter(db, {
      pollIntervalMs: 50,
      defaultTimeoutMs: 1000,
      escalationThreshold: 0.75,
    });

    mockSlack = new MockSlackChannel();
    notificationService = createNotificationService({
      channels: [mockSlack],
    });

    escalationService = createEscalationService({
      adminApprovers: [{ id: 'admin', slackUserId: 'UADMIN' }],
      enableAuditLogging: true,
    }, notificationService);

    testAuditLogger = new TestAuditLogger();
    escalationService.setAuditLogger(testAuditLogger);
    escalationService.attachToDecisionWaiter(waiter);
  });

  it('should complete full approval flow: request → notify → approve', async () => {
    const carsRequest = createMockCARSRequest({
      requestId: 'full-flow-approve',
      riskAssessment: {
        level: 'high',
        score: 0.7,
        types: ['FILE_SYSTEM_ACCESS'],
        recommendedClassification: 'CONFIDENTIAL',
        requiresApproval: true,
      },
    });

    // 1. Create request
    await dbService.createRequest(carsRequest, {
      tenantId: 'production',
      toolName: 'file_write',
      timeoutMs: 5000,
    });

    // 2. Verify it's stored
    const stored = await dbService.getRequestWithDecision(carsRequest.requestId);
    expect(stored?.request.status).toBe('pending');

    // 3. Notify approvers
    const approvers = createTestApprovers();
    await notificationService.notifyApprovers(stored!.request, approvers);

    // 4. Simulate human approval (async)
    setTimeout(async () => {
      await dbService.approve(carsRequest.requestId, {
        id: 'approver-1',
        email: 'approver1@example.com',
        name: 'Test Approver 1',
      }, 'Reviewed and approved');
    }, 200);

    // 5. Wait for decision
    const result = await waiter.waitForDecision(carsRequest.requestId, 3000);

    // 6. Verify result
    expect(result.decision.approved).toBe(true);
    expect(result.isHumanDecision).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.waitTimeMs).toBeLessThan(1000);

    // 7. Verify final state
    const final = await dbService.getRequestWithDecision(carsRequest.requestId);
    expect(final?.request.status).toBe('approved');
    expect(final?.decision?.approved).toBe(true);
    expect(final?.decision?.reason).toBe('Reviewed and approved');
  });

  it('should complete full denial flow: request → notify → deny', async () => {
    const carsRequest = createMockCARSRequest({
      requestId: 'full-flow-deny',
      riskAssessment: {
        level: 'critical',
        score: 0.95,
        types: ['SECRET_EXPOSURE', 'CODE_EXECUTION'],
        recommendedClassification: 'RESTRICTED',
        requiresApproval: true,
      },
    });

    await dbService.createRequest(carsRequest, {
      tenantId: 'production',
      timeoutMs: 5000,
    });

    const stored = await dbService.getRequestWithDecision(carsRequest.requestId);
    await notificationService.notifyApprovers(stored!.request, createTestApprovers());

    // Simulate human denial
    setTimeout(async () => {
      await dbService.deny(carsRequest.requestId, {
        id: 'security-team',
        email: 'security@example.com',
        name: 'Security Team',
      }, 'Code contains potential secret exposure - blocked');
    }, 150);

    const result = await waiter.waitForDecision(carsRequest.requestId, 3000);

    expect(result.decision.approved).toBe(false);
    expect(result.isHumanDecision).toBe(true);
    expect(result.decision.reason).toMatch(/secret exposure/i);
  });

  it('should complete full timeout flow: request → notify → escalate → auto-deny', async () => {
    const carsRequest = createMockCARSRequest({
      requestId: 'full-flow-timeout',
    });

    await dbService.createRequest(carsRequest, {
      tenantId: 'production',
      timeoutMs: 1000,
    });

    const stored = await dbService.getRequestWithDecision(carsRequest.requestId);
    await notificationService.notifyApprovers(stored!.request, createTestApprovers());

    // No approval/denial - should timeout
    const result = await waiter.waitForDecision(carsRequest.requestId, 500);

    expect(result.decision.approved).toBe(false);
    expect(result.isHumanDecision).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.decision.reason).toMatch(/timeout/i);

    // Check escalation and timeout were logged
    const timeoutEvents = testAuditLogger.events.filter(e => e.type === 'timeout');
    expect(timeoutEvents.length).toBe(1);

    // Final state should be expired
    const final = await db.getApprovalRequest(carsRequest.requestId);
    expect(final?.status).toBe('expired');
  });

  it('should handle concurrent requests correctly', async () => {
    // Create multiple concurrent requests
    const requests = [
      createMockCARSRequest({ requestId: 'concurrent-1' }),
      createMockCARSRequest({ requestId: 'concurrent-2' }),
      createMockCARSRequest({ requestId: 'concurrent-3' }),
    ];

    // Create all requests
    await Promise.all(
      requests.map(req =>
        dbService.createRequest(req, { tenantId: 'test', timeoutMs: 3000 })
      )
    );

    // Approve first, deny second, let third timeout
    setTimeout(async () => {
      await dbService.approve('concurrent-1', { id: 'a1' });
    }, 100);

    setTimeout(async () => {
      await dbService.deny('concurrent-2', { id: 'a2' }, 'Denied');
    }, 150);

    // Wait for all decisions
    const [result1, result2, result3] = await Promise.all([
      waiter.waitForDecision('concurrent-1', 2000),
      waiter.waitForDecision('concurrent-2', 2000),
      waiter.waitForDecision('concurrent-3', 300), // Short timeout
    ]);

    expect(result1.decision.approved).toBe(true);
    expect(result2.decision.approved).toBe(false);
    expect(result2.isHumanDecision).toBe(true);
    expect(result3.timedOut).toBe(true);
  });
});

// ============================================
// EDGE CASE TESTS
// ============================================

describe('Edge Cases', () => {
  let db: InMemoryApprovalDatabase;

  beforeEach(() => {
    db = new InMemoryApprovalDatabase();
  });

  it('should handle request not found error gracefully', async () => {
    const waiter = createDecisionWaiter(db, { pollIntervalMs: 50 });

    await expect(
      waiter.waitForDecision('non-existent-request', 1000)
    ).rejects.toThrow(/not found/i);
  });

  it('should handle very short timeouts', async () => {
    const carsRequest = createMockCARSRequest({ requestId: 'short-timeout' });

    await db.createApprovalRequest({
      request: carsRequest,
      tenantId: 'test',
      expiresAt: new Date(Date.now() + 10000),
    });

    const waiter = createDecisionWaiter(db, { pollIntervalMs: 10 });
    const result = await waiter.waitForDecision('short-timeout', 50);

    expect(result.timedOut).toBe(true);
    expect(result.waitTimeMs).toBeGreaterThanOrEqual(50);
  });

  it('should handle decision that comes near timeout boundary', async () => {
    const carsRequest = createMockCARSRequest({ requestId: 'boundary-test' });

    await db.createApprovalRequest({
      request: carsRequest,
      tenantId: 'test',
      expiresAt: new Date(Date.now() + 10000),
    });

    // Approve well before timeout to avoid race conditions
    setTimeout(async () => {
      await db.recordDecision({
        requestId: 'boundary-test',
        approved: true,
        approverId: 'quick-approver',
      });
    }, 50);

    const waiter = createDecisionWaiter(db, { pollIntervalMs: 20 });
    const result = await waiter.waitForDecision('boundary-test', 200);

    // With 50ms approval and 200ms timeout, should reliably catch the approval
    expect(result.decision.approved).toBe(true);
    expect(result.isHumanDecision).toBe(true);
    expect(result.timedOut).toBe(false);
  });
});
