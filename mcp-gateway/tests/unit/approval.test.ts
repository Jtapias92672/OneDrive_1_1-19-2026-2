/**
 * Unit Tests: Approval Gate
 *
 * @epic 2.5 - MCP Security Gateway
 * @task 4.1 - Human Approval Implementation
 *
 * Tests ApprovalGate for human-in-the-loop approval workflows.
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import {
  ApprovalGate,
  ApprovalRequest,
  PendingApproval,
  ApprovalPolicy,
} from '../../approval/index.js';
import { ApprovalConfig, CARSAssessment, RequestContext } from '../../core/types.js';

// Helper to allow async operations to settle
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

describe('Approval Gate (approval/index.ts)', () => {
  let gate: ApprovalGate;
  let mockConfig: ApprovalConfig;

  const createMockContext = (): RequestContext => ({
    tenantId: 'tenant-1',
    userId: 'user-1',
    sessionId: 'session-1',
    source: 'test',
  });

  const createMockAssessment = (score: number, riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'): CARSAssessment => ({
    tool: 'test-tool',
    riskLevel,
    autonomyLevel: 'supervised',
    safeguards: [],
    score,
    recommendation: riskLevel === 'critical' ? 'block' : 'proceed',
  });

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      defaultMode: 'risk-based',
      timeoutMs: 60000,
      autoApprove: ['safe-tool'],
      requireApproval: ['dangerous-tool'],
      carsIntegration: {
        enabled: true,
        riskThreshold: 0.7,
      },
    };

    gate = new ApprovalGate(mockConfig);
  });

  describe('evaluatePolicy', () => {
    describe('auto-approve list', () => {
      it('should not require approval for auto-approved tools', () => {
        const policy = gate.evaluatePolicy('safe-tool');
        expect(policy.requiresApproval).toBe(false);
        expect(policy.reason).toContain('auto-approve');
      });
    });

    describe('require-approval list', () => {
      it('should require approval for tools in require list', () => {
        const policy = gate.evaluatePolicy('dangerous-tool');
        expect(policy.requiresApproval).toBe(true);
        expect(policy.reason).toContain('requires explicit approval');
        expect(policy.escalationLevel).toBe('standard');
      });
    });

    describe('risk-based mode', () => {
      it('should not require approval for low risk', () => {
        const assessment = createMockAssessment(0.3, 'low');
        const policy = gate.evaluatePolicy('some-tool', assessment);
        expect(policy.requiresApproval).toBe(false);
        expect(policy.reason).toContain('Low risk');
      });

      it('should require approval for medium risk', () => {
        const assessment = createMockAssessment(0.55, 'medium');
        const policy = gate.evaluatePolicy('some-tool', assessment);
        expect(policy.requiresApproval).toBe(true);
        expect(policy.reason).toContain('Medium risk');
        expect(policy.escalationLevel).toBe('standard');
      });

      it('should require approval above threshold', () => {
        const assessment = createMockAssessment(0.75, 'high');
        const policy = gate.evaluatePolicy('some-tool', assessment);
        expect(policy.requiresApproval).toBe(true);
        expect(policy.reason).toContain('exceeds threshold');
      });

      it('should recommend manager escalation for high risk', () => {
        const assessment = createMockAssessment(0.85, 'high');
        const policy = gate.evaluatePolicy('some-tool', assessment);
        expect(policy.escalationLevel).toBe('manager');
      });

      it('should recommend executive escalation for critical risk', () => {
        const assessment = createMockAssessment(0.95, 'critical');
        const policy = gate.evaluatePolicy('some-tool', assessment);
        expect(policy.requiresApproval).toBe(true);
        expect(policy.escalationLevel).toBe('executive');
        expect(policy.blockRecommended).toBe(true);
      });

      it('should require approval when no assessment available', () => {
        const policy = gate.evaluatePolicy('some-tool');
        expect(policy.requiresApproval).toBe(true);
        expect(policy.reason).toContain('No risk assessment');
      });
    });

    describe('always mode', () => {
      it('should always require approval', () => {
        const alwaysGate = new ApprovalGate({
          ...mockConfig,
          defaultMode: 'always',
        });
        const policy = alwaysGate.evaluatePolicy('any-tool');
        expect(policy.requiresApproval).toBe(true);
        expect(policy.reason).toContain('All tools require');
      });
    });

    describe('never mode', () => {
      it('should never require approval', () => {
        const neverGate = new ApprovalGate({
          ...mockConfig,
          defaultMode: 'never',
        });
        const policy = neverGate.evaluatePolicy('any-tool');
        expect(policy.requiresApproval).toBe(false);
        expect(policy.reason).toContain('disabled');
      });
    });

    describe('first-use mode', () => {
      it('should require approval on first use', () => {
        const firstUseGate = new ApprovalGate({
          ...mockConfig,
          defaultMode: 'first-use',
        });
        const policy = firstUseGate.evaluatePolicy('new-tool');
        expect(policy.requiresApproval).toBe(true);
        expect(policy.reason).toContain('First use');
      });
    });
  });

  describe('requestApproval', () => {
    it('should create pending approval', async () => {
      const request: ApprovalRequest = {
        requestId: 'req-1',
        tool: 'test-tool',
        params: { action: 'test' },
        context: createMockContext(),
      };

      // Start approval request (don't await - it will hang)
      const promise = gate.requestApproval(request);
      await tick(); // Allow callback to be registered

      // Get pending approvals
      const pending = gate.getPendingApprovals();
      expect(pending.length).toBe(1);
      expect(pending[0]!.requestId).toBe('req-1');
      expect(pending[0]!.status).toBe('pending');

      // Submit approval to resolve promise
      gate.submitApproval('req-1', true, 'admin@test.com');
      const result = await promise;
      expect(result.status).toBe('approved');
    });

    it('should include risk assessment in pending', async () => {
      const assessment = createMockAssessment(0.5);
      const request: ApprovalRequest = {
        requestId: 'req-2',
        tool: 'test-tool',
        params: {},
        context: createMockContext(),
        riskAssessment: assessment,
      };

      const promise = gate.requestApproval(request);
      await tick();
      const pending = gate.getPendingApprovals();
      expect(pending[0]!.riskAssessment).toBeDefined();
      expect(pending[0]!.riskAssessment!.score).toBe(0.5);

      gate.submitApproval('req-2', true, 'admin');
      await promise;
    });
  });

  describe('submitApproval', () => {
    it('should resolve approval request on approval', async () => {
      const request: ApprovalRequest = {
        requestId: 'req-approve',
        tool: 'tool',
        params: {},
        context: createMockContext(),
      };

      const promise = gate.requestApproval(request);
      await tick();
      gate.submitApproval('req-approve', true, 'approver@test.com', 'Approved by manager');

      const result = await promise;
      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe('approver@test.com');
      expect(result.reason).toBe('Approved by manager');
    });

    it('should resolve approval request on denial', async () => {
      const request: ApprovalRequest = {
        requestId: 'req-deny',
        tool: 'tool',
        params: {},
        context: createMockContext(),
      };

      const promise = gate.requestApproval(request);
      await tick();
      gate.submitApproval('req-deny', false, 'admin', 'Too risky');

      const result = await promise;
      expect(result.status).toBe('denied');
      expect(result.reason).toBe('Too risky');
    });

    it('should throw error for unknown request', () => {
      expect(() => {
        gate.submitApproval('unknown-req', true, 'admin');
      }).toThrow('No pending approval');
    });

    it('should remove from pending after approval', async () => {
      const request: ApprovalRequest = {
        requestId: 'req-remove',
        tool: 'tool',
        params: {},
        context: createMockContext(),
      };

      const promise = gate.requestApproval(request);
      await tick();
      expect(gate.getPendingApprovals().length).toBe(1);

      gate.submitApproval('req-remove', true, 'admin');
      await promise;

      expect(gate.getPendingApprovals().length).toBe(0);
    });
  });

  describe('hasBeenApproved', () => {
    it('should return false for new tools', () => {
      expect(gate.hasBeenApproved('new-tool')).toBe(false);
    });

    it('should return true after tool is approved', async () => {
      const request: ApprovalRequest = {
        requestId: 'req-track',
        tool: 'tracked-tool',
        params: {},
        context: createMockContext(),
      };

      const promise = gate.requestApproval(request);
      await tick();
      gate.submitApproval('req-track', true, 'admin');
      await promise;

      expect(gate.hasBeenApproved('tracked-tool')).toBe(true);
    });

    it('should return false after denial', async () => {
      const request: ApprovalRequest = {
        requestId: 'req-denied',
        tool: 'denied-tool',
        params: {},
        context: createMockContext(),
      };

      const promise = gate.requestApproval(request);
      await tick();
      gate.submitApproval('req-denied', false, 'admin');
      await promise;

      expect(gate.hasBeenApproved('denied-tool')).toBe(false);
    });
  });

  describe('getApprovalHistory', () => {
    it('should return undefined for unknown tools', () => {
      expect(gate.getApprovalHistory('unknown')).toBeUndefined();
    });

    it('should track approval count', async () => {
      // First approval
      const req1: ApprovalRequest = {
        requestId: 'req-h1',
        tool: 'history-tool',
        params: {},
        context: createMockContext(),
      };
      let promise = gate.requestApproval(req1);
      await tick();
      gate.submitApproval('req-h1', true, 'admin');
      await promise;

      // Second approval
      const req2: ApprovalRequest = {
        requestId: 'req-h2',
        tool: 'history-tool',
        params: {},
        context: createMockContext(),
      };
      promise = gate.requestApproval(req2);
      await tick();
      gate.submitApproval('req-h2', true, 'admin');
      await promise;

      const history = gate.getApprovalHistory('history-tool');
      expect(history!.approvalCount).toBe(2);
      expect(history!.denialCount).toBe(0);
    });

    it('should track denial count and reason', async () => {
      const request: ApprovalRequest = {
        requestId: 'req-denied-h',
        tool: 'denied-history-tool',
        params: {},
        context: createMockContext(),
      };

      const promise = gate.requestApproval(request);
      await tick();
      gate.submitApproval('req-denied-h', false, 'admin', 'Security concern');
      await promise;

      const history = gate.getApprovalHistory('denied-history-tool');
      expect(history!.denialCount).toBe(1);
      expect(history!.lastDenialReason).toBe('Security concern');
      expect(history!.lastDenier).toBe('admin');
    });

    it('should record approver info', async () => {
      const request: ApprovalRequest = {
        requestId: 'req-approver',
        tool: 'approver-tool',
        params: {},
        context: createMockContext(),
      };

      const promise = gate.requestApproval(request);
      await tick();
      gate.submitApproval('req-approver', true, 'security-admin@company.com');
      await promise;

      const history = gate.getApprovalHistory('approver-tool');
      expect(history!.lastApprover).toBe('security-admin@company.com');
      expect(history!.lastApproved).toBeDefined();
    });
  });

  describe('getPendingApprovals', () => {
    it('should return empty array when no pending', () => {
      expect(gate.getPendingApprovals()).toEqual([]);
    });

    it('should return all pending approvals', async () => {
      const req1: ApprovalRequest = {
        requestId: 'pending-1',
        tool: 'tool-1',
        params: {},
        context: createMockContext(),
      };
      const req2: ApprovalRequest = {
        requestId: 'pending-2',
        tool: 'tool-2',
        params: {},
        context: createMockContext(),
      };

      const p1 = gate.requestApproval(req1);
      const p2 = gate.requestApproval(req2);
      await tick(); // Allow callbacks to be registered

      const pending = gate.getPendingApprovals();
      expect(pending.length).toBe(2);
      expect(pending.map(p => p.requestId)).toContain('pending-1');
      expect(pending.map(p => p.requestId)).toContain('pending-2');

      // Clean up
      gate.submitApproval('pending-1', true, 'admin');
      gate.submitApproval('pending-2', true, 'admin');
      await Promise.all([p1, p2]);
    });
  });

  describe('clearHistory', () => {
    it('should clear specific tool history', async () => {
      const request: ApprovalRequest = {
        requestId: 'req-clear-1',
        tool: 'clear-tool',
        params: {},
        context: createMockContext(),
      };

      const promise = gate.requestApproval(request);
      await tick(); // Allow callback to be registered
      gate.submitApproval('req-clear-1', true, 'admin');
      await promise;

      expect(gate.hasBeenApproved('clear-tool')).toBe(true);
      gate.clearHistory('clear-tool');
      expect(gate.hasBeenApproved('clear-tool')).toBe(false);
    });

    it('should clear all history when no tool specified', async () => {
      const req1: ApprovalRequest = {
        requestId: 'req-c1',
        tool: 'tool-a',
        params: {},
        context: createMockContext(),
      };
      const req2: ApprovalRequest = {
        requestId: 'req-c2',
        tool: 'tool-b',
        params: {},
        context: createMockContext(),
      };

      const p1 = gate.requestApproval(req1);
      await tick();
      gate.submitApproval('req-c1', true, 'admin');
      await p1;

      const p2 = gate.requestApproval(req2);
      await tick();
      gate.submitApproval('req-c2', true, 'admin');
      await p2;

      expect(gate.hasBeenApproved('tool-a')).toBe(true);
      expect(gate.hasBeenApproved('tool-b')).toBe(true);

      gate.clearHistory();

      expect(gate.hasBeenApproved('tool-a')).toBe(false);
      expect(gate.hasBeenApproved('tool-b')).toBe(false);
    });
  });

  describe('first-use policy with history', () => {
    it('should not require approval after first approved use', async () => {
      const firstUseGate = new ApprovalGate({
        ...mockConfig,
        defaultMode: 'first-use',
      });

      // First time - should require approval
      let policy = firstUseGate.evaluatePolicy('first-use-tool');
      expect(policy.requiresApproval).toBe(true);

      // Approve the first use
      const request: ApprovalRequest = {
        requestId: 'first-use-req',
        tool: 'first-use-tool',
        params: {},
        context: createMockContext(),
      };
      const promise = firstUseGate.requestApproval(request);
      await tick();
      firstUseGate.submitApproval('first-use-req', true, 'admin');
      await promise;

      // Second time - should not require approval
      policy = firstUseGate.evaluatePolicy('first-use-tool');
      expect(policy.requiresApproval).toBe(false);
      expect(policy.reason).toContain('Previously approved');
    });
  });

  describe('timeout handling', () => {
    it('should timeout pending approval', async () => {
      // Create gate with short timeout
      const shortTimeoutGate = new ApprovalGate({
        ...mockConfig,
        timeoutMs: 50, // 50ms timeout for testing
      });

      const request: ApprovalRequest = {
        requestId: 'timeout-req',
        tool: 'timeout-tool',
        params: {},
        context: createMockContext(),
      };

      const result = await shortTimeoutGate.requestApproval(request);
      expect(result.status).toBe('timeout');
      expect(result.required).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle unknown policy mode', () => {
      const unknownModeGate = new ApprovalGate({
        ...mockConfig,
        defaultMode: 'unknown-mode' as ApprovalConfig['defaultMode'],
      });

      const policy = unknownModeGate.evaluatePolicy('tool');
      expect(policy.requiresApproval).toBe(true);
      expect(policy.reason).toContain('Unknown policy');
    });

    it('should handle risk score exactly at threshold', () => {
      const assessment = createMockAssessment(0.7, 'high'); // Exactly at threshold
      const policy = gate.evaluatePolicy('tool', assessment);
      expect(policy.requiresApproval).toBe(true);
    });

    it('should handle risk score just below threshold', () => {
      const assessment = createMockAssessment(0.69, 'medium');
      const policy = gate.evaluatePolicy('tool', assessment);
      expect(policy.requiresApproval).toBe(true); // Medium risk still requires approval
    });

    it('should handle empty context', async () => {
      const request: ApprovalRequest = {
        requestId: 'empty-ctx',
        tool: 'tool',
        params: {},
        context: {
          tenantId: '',
          userId: '',
          sessionId: '',
          source: '',
        },
      };

      const promise = gate.requestApproval(request);
      await tick();
      const pending = gate.getPendingApprovals();
      expect(pending.length).toBe(1);

      gate.submitApproval('empty-ctx', true, 'admin');
      await promise;
    });
  });
});
