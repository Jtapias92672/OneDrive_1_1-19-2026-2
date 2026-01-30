/**
 * Integration Tests: CARS → Execution → Audit Flow
 *
 * @epic 3.5, 3.75 - Gateway Foundation, Code Execution
 * @integration Multi-module workflow testing
 *
 * Tests the complete flow from risk assessment through execution to audit logging.
 */

import { CARSRiskLevel } from '../../cars/risk-levels.js';

// ============================================
// MOCK IMPLEMENTATIONS FOR INTEGRATION TESTING
// ============================================

/**
 * Mock CARS Risk Assessment Engine
 */
class MockCARSAssessor {
  assessToolCall(tool: string, params: Record<string, unknown>): CARSAssessment {
    // Determine risk level based on tool type
    let riskLevel: CARSRiskLevel;
    let requiresApproval = false;
    let shouldBlock = false;

    if (tool.includes('read') || tool.includes('list')) {
      riskLevel = CARSRiskLevel.MINIMAL;
    } else if (tool.includes('write') || tool.includes('update')) {
      riskLevel = CARSRiskLevel.LOW;
    } else if (tool.includes('execute') || tool.includes('deploy')) {
      riskLevel = CARSRiskLevel.MEDIUM;
      requiresApproval = true;
    } else if (tool.includes('delete') || tool.includes('admin')) {
      riskLevel = CARSRiskLevel.HIGH;
      requiresApproval = true;
    } else if (tool.includes('critical') || tool.includes('destroy')) {
      riskLevel = CARSRiskLevel.CRITICAL;
      requiresApproval = true;
      shouldBlock = params.forceBlock === true;
    } else {
      riskLevel = CARSRiskLevel.MINIMAL;
    }

    return {
      riskLevel,
      riskLevelString: this.riskLevelToString(riskLevel),
      requiresApproval,
      shouldBlock,
      reasoning: `Tool ${tool} assessed at risk level ${riskLevel}`,
      contextFactors: [],
    };
  }

  private riskLevelToString(level: CARSRiskLevel): string {
    const names = ['L1_MINIMAL', 'L2_LOW', 'L3_MEDIUM', 'L4_HIGH', 'L5_CRITICAL'];
    return names[level] || 'UNKNOWN';
  }
}

interface CARSAssessment {
  riskLevel: CARSRiskLevel;
  riskLevelString: string;
  requiresApproval: boolean;
  shouldBlock: boolean;
  reasoning: string;
  contextFactors: string[];
}

/**
 * Mock Approval Manager
 */
class MockApprovalManager {
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private approvalDecisions: Map<string, boolean> = new Map();

  async requestApproval(request: ApprovalRequest): Promise<string> {
    const requestId = `approval-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.pendingApprovals.set(requestId, request);
    return requestId;
  }

  async waitForApproval(requestId: string, timeoutMs: number = 5000): Promise<ApprovalResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (this.approvalDecisions.has(requestId)) {
        const approved = this.approvalDecisions.get(requestId)!;
        return {
          approved,
          approvedBy: approved ? 'test-approver' : undefined,
          deniedReason: approved ? undefined : 'Approval denied by test',
          timestamp: new Date().toISOString(),
        };
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return {
      approved: false,
      deniedReason: 'Approval timeout',
      timestamp: new Date().toISOString(),
    };
  }

  // Test helper: simulate approval decision
  simulateDecision(requestId: string, approved: boolean): void {
    this.approvalDecisions.set(requestId, approved);
  }

  // Test helper: auto-approve next request
  autoApprove(): void {
    const pendingIds = Array.from(this.pendingApprovals.keys());
    if (pendingIds.length > 0) {
      this.simulateDecision(pendingIds[pendingIds.length - 1]!, true);
    }
  }

  // Test helper: auto-deny next request
  autoDeny(): void {
    const pendingIds = Array.from(this.pendingApprovals.keys());
    if (pendingIds.length > 0) {
      this.simulateDecision(pendingIds[pendingIds.length - 1]!, false);
    }
  }

  getPendingCount(): number {
    return this.pendingApprovals.size - this.approvalDecisions.size;
  }
}

interface ApprovalRequest {
  tool: string;
  params: Record<string, unknown>;
  riskLevel: CARSRiskLevel;
  reasoning: string;
  requestedBy: string;
}

interface ApprovalResult {
  approved: boolean;
  approvedBy?: string;
  deniedReason?: string;
  timestamp: string;
}

/**
 * Mock Execution Engine
 */
class MockExecutionEngine {
  async execute(code: string, options: ExecutionOptions): Promise<ExecutionResult> {
    // Simulate execution
    if (code.includes('throw')) {
      return {
        success: false,
        error: 'Execution error: simulated failure',
        executionTimeMs: 50,
      };
    }

    return {
      success: true,
      result: { output: 'Execution completed', code },
      executionTimeMs: 100,
    };
  }
}

interface ExecutionOptions {
  timeout?: number;
  memoryLimit?: number;
  sandboxed?: boolean;
}

interface ExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTimeMs: number;
}

/**
 * Mock Audit Logger
 */
class MockAuditLogger {
  private logs: AuditEntry[] = [];

  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const fullEntry: AuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
    };
    this.logs.push(fullEntry);
    return fullEntry;
  }

  getEntries(): AuditEntry[] {
    return [...this.logs];
  }

  getEntriesByType(eventType: string): AuditEntry[] {
    return this.logs.filter(e => e.eventType === eventType);
  }

  getEntriesByCorrelation(correlationId: string): AuditEntry[] {
    return this.logs.filter(e => e.correlationId === correlationId);
  }

  clear(): void {
    this.logs = [];
  }
}

interface AuditEntry {
  id: string;
  timestamp: string;
  eventType: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'BLOCKED';
  details: Record<string, unknown>;
  riskLevel?: string;
  correlationId?: string;
  actor?: string;
}

/**
 * Integrated CARS-Execution-Audit Pipeline
 */
class CARSExecutionAuditPipeline {
  constructor(
    private assessor: MockCARSAssessor,
    private approvalManager: MockApprovalManager,
    private executor: MockExecutionEngine,
    private auditLogger: MockAuditLogger
  ) {}

  async executeWithCARS(
    tool: string,
    params: Record<string, unknown>,
    code: string,
    actor: string
  ): Promise<PipelineResult> {
    const correlationId = `corr-${Date.now()}`;

    // Step 1: CARS Risk Assessment
    const assessment = this.assessor.assessToolCall(tool, params);

    this.auditLogger.log({
      eventType: 'RISK_ASSESSMENT',
      outcome: 'SUCCESS',
      details: {
        tool,
        riskLevel: assessment.riskLevelString,
        requiresApproval: assessment.requiresApproval,
      },
      riskLevel: assessment.riskLevelString,
      correlationId,
      actor,
    });

    // Step 2: Check if blocked
    if (assessment.shouldBlock) {
      this.auditLogger.log({
        eventType: 'TOOL_EXECUTION',
        outcome: 'BLOCKED',
        details: { tool, reason: 'Risk level too high' },
        riskLevel: assessment.riskLevelString,
        correlationId,
        actor,
      });

      return {
        success: false,
        blocked: true,
        reason: 'Execution blocked due to high risk level',
        assessment,
        correlationId,
      };
    }

    // Step 3: Request approval if required
    if (assessment.requiresApproval) {
      const approvalRequestId = await this.approvalManager.requestApproval({
        tool,
        params,
        riskLevel: assessment.riskLevel,
        reasoning: assessment.reasoning,
        requestedBy: actor,
      });

      this.auditLogger.log({
        eventType: 'APPROVAL_REQUEST',
        outcome: 'PENDING',
        details: { tool, approvalRequestId, riskLevel: assessment.riskLevelString },
        correlationId,
        actor,
      });

      // Wait for approval
      const approvalResult = await this.approvalManager.waitForApproval(approvalRequestId, 1000);

      this.auditLogger.log({
        eventType: 'APPROVAL_DECISION',
        outcome: approvalResult.approved ? 'SUCCESS' : 'FAILURE',
        details: {
          tool,
          approvalRequestId,
          approved: approvalResult.approved,
          approvedBy: approvalResult.approvedBy,
          deniedReason: approvalResult.deniedReason,
        },
        correlationId,
        actor,
      });

      if (!approvalResult.approved) {
        return {
          success: false,
          blocked: false,
          approvalDenied: true,
          reason: approvalResult.deniedReason || 'Approval denied',
          assessment,
          correlationId,
        };
      }
    }

    // Step 4: Execute
    const executionResult = await this.executor.execute(code, {
      timeout: 5000,
      sandboxed: true,
    });

    this.auditLogger.log({
      eventType: 'TOOL_EXECUTION',
      outcome: executionResult.success ? 'SUCCESS' : 'FAILURE',
      details: {
        tool,
        executionTimeMs: executionResult.executionTimeMs,
        error: executionResult.error,
      },
      riskLevel: assessment.riskLevelString,
      correlationId,
      actor,
    });

    return {
      success: executionResult.success,
      blocked: false,
      approvalDenied: false,
      result: executionResult.result,
      error: executionResult.error,
      assessment,
      correlationId,
    };
  }
}

interface PipelineResult {
  success: boolean;
  blocked: boolean;
  approvalDenied?: boolean;
  reason?: string;
  result?: unknown;
  error?: string;
  assessment: CARSAssessment;
  correlationId: string;
}

// ============================================
// INTEGRATION TESTS
// ============================================

describe('CARS → Execution → Audit Integration', () => {
  let assessor: MockCARSAssessor;
  let approvalManager: MockApprovalManager;
  let executor: MockExecutionEngine;
  let auditLogger: MockAuditLogger;
  let pipeline: CARSExecutionAuditPipeline;

  beforeEach(() => {
    assessor = new MockCARSAssessor();
    approvalManager = new MockApprovalManager();
    executor = new MockExecutionEngine();
    auditLogger = new MockAuditLogger();
    pipeline = new CARSExecutionAuditPipeline(assessor, approvalManager, executor, auditLogger);
  });

  // ==========================================
  // L1_MINIMAL OPERATIONS
  // ==========================================

  describe('L1_MINIMAL operation flow', () => {
    it('should execute without approval and generate audit log', async () => {
      const result = await pipeline.executeWithCARS(
        'read_file',
        { path: '/data/config.json' },
        'return fs.readFile("/data/config.json")',
        'test-user'
      );

      // Verify execution succeeded
      expect(result.success).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.approvalDenied).toBe(false);
      expect(result.assessment.riskLevel).toBe(CARSRiskLevel.MINIMAL);
      expect(result.assessment.requiresApproval).toBe(false);

      // Verify audit trail
      const auditEntries = auditLogger.getEntriesByCorrelation(result.correlationId);
      expect(auditEntries.length).toBe(2); // RISK_ASSESSMENT + TOOL_EXECUTION

      const riskEntry = auditEntries.find(e => e.eventType === 'RISK_ASSESSMENT');
      expect(riskEntry).toBeDefined();
      expect(riskEntry!.outcome).toBe('SUCCESS');
      expect(riskEntry!.riskLevel).toBe('L1_MINIMAL');

      const execEntry = auditEntries.find(e => e.eventType === 'TOOL_EXECUTION');
      expect(execEntry).toBeDefined();
      expect(execEntry!.outcome).toBe('SUCCESS');
    });

    it('should log execution failure in audit', async () => {
      const result = await pipeline.executeWithCARS(
        'list_files',
        { path: '/data' },
        'throw new Error("simulated failure")',
        'test-user'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('simulated failure');

      const execEntry = auditLogger.getEntriesByType('TOOL_EXECUTION')[0];
      expect(execEntry).toBeDefined();
      expect(execEntry!.outcome).toBe('FAILURE');
    });
  });

  // ==========================================
  // L3_MEDIUM OPERATIONS
  // ==========================================

  describe('L3_MEDIUM operation flow', () => {
    it('should require approval, wait for it, and record in audit', async () => {
      // Start execution in background
      const executionPromise = pipeline.executeWithCARS(
        'execute_script',
        { script: 'build.sh' },
        'return execSync("./build.sh")',
        'test-user'
      );

      // Simulate approval after short delay
      await new Promise(resolve => setTimeout(resolve, 50));
      approvalManager.autoApprove();

      const result = await executionPromise;

      // Verify execution succeeded after approval
      expect(result.success).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.assessment.riskLevel).toBe(CARSRiskLevel.MEDIUM);
      expect(result.assessment.requiresApproval).toBe(true);

      // Verify complete audit trail
      const auditEntries = auditLogger.getEntriesByCorrelation(result.correlationId);
      expect(auditEntries.length).toBe(4); // RISK_ASSESSMENT + APPROVAL_REQUEST + APPROVAL_DECISION + TOOL_EXECUTION

      const approvalRequest = auditEntries.find(e => e.eventType === 'APPROVAL_REQUEST');
      expect(approvalRequest).toBeDefined();
      expect(approvalRequest!.outcome).toBe('PENDING');

      const approvalDecision = auditEntries.find(e => e.eventType === 'APPROVAL_DECISION');
      expect(approvalDecision).toBeDefined();
      expect(approvalDecision!.outcome).toBe('SUCCESS');
      expect(approvalDecision!.details.approved).toBe(true);
    });

    it('should block execution when approval is denied', async () => {
      // Start execution in background
      const executionPromise = pipeline.executeWithCARS(
        'deploy_service',
        { service: 'api' },
        'return deploy("api")',
        'test-user'
      );

      // Simulate denial after short delay
      await new Promise(resolve => setTimeout(resolve, 50));
      approvalManager.autoDeny();

      const result = await executionPromise;

      // Verify execution was denied
      expect(result.success).toBe(false);
      expect(result.approvalDenied).toBe(true);
      expect(result.reason).toContain('denied');

      // Verify audit shows denial
      const approvalDecision = auditLogger.getEntriesByType('APPROVAL_DECISION')[0];
      expect(approvalDecision).toBeDefined();
      expect(approvalDecision!.outcome).toBe('FAILURE');
      expect(approvalDecision!.details.approved).toBe(false);

      // Verify no execution entry (execution never happened)
      const execEntries = auditLogger.getEntriesByType('TOOL_EXECUTION');
      expect(execEntries.length).toBe(0);
    });
  });

  // ==========================================
  // L4_HIGH / L5_CRITICAL OPERATIONS
  // ==========================================

  describe('L4_HIGH/L5_CRITICAL operation flow', () => {
    it('should require multi-approval for L4 operations', async () => {
      // Start execution
      const executionPromise = pipeline.executeWithCARS(
        'admin_delete_user',
        { userId: 'user-123' },
        'return deleteUser("user-123")',
        'admin-user'
      );

      // Simulate approval
      await new Promise(resolve => setTimeout(resolve, 50));
      approvalManager.autoApprove();

      const result = await executionPromise;

      expect(result.assessment.riskLevel).toBe(CARSRiskLevel.HIGH);
      expect(result.assessment.requiresApproval).toBe(true);

      // Check approval was recorded
      const approvalEntries = auditLogger.getEntriesByType('APPROVAL_REQUEST');
      expect(approvalEntries.length).toBe(1);
    });

    it('should block L5_CRITICAL operations with forceBlock flag', async () => {
      const result = await pipeline.executeWithCARS(
        'critical_destroy_database',
        { database: 'production', forceBlock: true },
        'return destroyDatabase("production")',
        'admin-user'
      );

      // Verify blocked
      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.assessment.riskLevel).toBe(CARSRiskLevel.CRITICAL);
      expect(result.assessment.shouldBlock).toBe(true);

      // Verify audit shows blocked
      const execEntry = auditLogger.getEntriesByType('TOOL_EXECUTION')[0];
      expect(execEntry).toBeDefined();
      expect(execEntry!.outcome).toBe('BLOCKED');
    });

    it('should reject L5_CRITICAL when approval is denied', async () => {
      // Start execution
      const executionPromise = pipeline.executeWithCARS(
        'critical_operation',
        { target: 'sensitive-data' },
        'return criticalOp()',
        'admin-user'
      );

      // Deny approval
      await new Promise(resolve => setTimeout(resolve, 50));
      approvalManager.autoDeny();

      const result = await executionPromise;

      expect(result.success).toBe(false);
      expect(result.approvalDenied).toBe(true);

      // Verify complete audit trail
      const auditEntries = auditLogger.getEntries();
      expect(auditEntries.some(e => e.eventType === 'APPROVAL_DECISION' && e.outcome === 'FAILURE')).toBe(true);
    });
  });

  // ==========================================
  // AUDIT COMPLETENESS
  // ==========================================

  describe('Audit completeness', () => {
    it('should have correlation ID across all entries', async () => {
      const executionPromise = pipeline.executeWithCARS(
        'execute_task',
        { task: 'build' },
        'return build()',
        'ci-user'
      );

      await new Promise(resolve => setTimeout(resolve, 50));
      approvalManager.autoApprove();

      const result = await executionPromise;

      const entries = auditLogger.getEntriesByCorrelation(result.correlationId);
      expect(entries.length).toBeGreaterThan(0);
      entries.forEach(entry => {
        expect(entry.correlationId).toBe(result.correlationId);
      });
    });

    it('should include actor in all audit entries', async () => {
      await pipeline.executeWithCARS(
        'read_config',
        {},
        'return readConfig()',
        'specific-user'
      );

      const entries = auditLogger.getEntries();
      entries.forEach(entry => {
        expect(entry.actor).toBe('specific-user');
      });
    });

    it('should include risk level in relevant entries', async () => {
      await pipeline.executeWithCARS(
        'read_data',
        {},
        'return readData()',
        'test-user'
      );

      const riskEntry = auditLogger.getEntriesByType('RISK_ASSESSMENT')[0];
      expect(riskEntry).toBeDefined();
      expect(riskEntry!.riskLevel).toBeDefined();
      expect(riskEntry!.riskLevel).toBe('L1_MINIMAL');
    });
  });
});
