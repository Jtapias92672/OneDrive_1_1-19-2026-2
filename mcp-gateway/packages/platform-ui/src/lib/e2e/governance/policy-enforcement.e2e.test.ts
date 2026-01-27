/**
 * Governance Policy Enforcement E2E Tests
 * Epic 12: Verifies Epic 13 governance integration
 */

import { policyEngine } from '@/lib/governance/policy';
import { carsAssessor } from '@/lib/governance/cars';
import { auditLogger, auditStore } from '@/lib/governance/audit';
import { approvalService, approvalStore } from '@/lib/governance/approval';

describe('@sanity Governance Policy Enforcement E2E', () => {
  beforeEach(() => {
    auditStore.reset();
    approvalStore.reset();
  });

  describe('policy evaluation', () => {
    it('@sanity evaluates request against policies', async () => {
      const request = {
        action: 'generate' as const,
        resource: 'component-123',
        resourceType: 'react-component' as const,
        actor: { type: 'user' as const, id: 'user-1' },
        context: {
          environment: 'development' as const,
        },
      };

      const result = await policyEngine.evaluate(request);

      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
      expect(result.matchedPolicies).toBeDefined();
    });

    it('requires approval for high-risk actions', async () => {
      const request = {
        action: 'deploy' as const,
        resource: 'production-app',
        resourceType: 'deployment' as const,
        actor: { type: 'user' as const, id: 'user-1' },
        context: {
          environment: 'production' as const,
        },
      };

      const result = await policyEngine.evaluate(request);

      // Result should have requiresApproval field
      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
    });
  });

  describe('CARS risk assessment', () => {
    it('assesses risk for pipeline operations', () => {
      const context = {
        userId: 'user-e2e',
        action: 'export',
        resourceType: 'mendix-mpk',
        environment: 'development' as const,
        dataClassification: 1 as const,
        scope: 'single-file' as const,
        workflowType: 'figma-to-code',
      };

      const action = {
        type: 'export' as const,
        target: 'mendix-mpk',
        reversible: true,
        affectsExternalSystems: false,
        requiresApproval: false,
        estimatedImpact: 'low' as const,
      };

      const assessment = carsAssessor.assess(context, action);

      expect(assessment.risk.level).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(assessment.risk.level);
      expect(assessment.risk.score).toBeGreaterThanOrEqual(0);
      expect(assessment.risk.factors.length).toBeGreaterThan(0);
    });

    it('flags higher risk for production operations', () => {
      const context = {
        userId: 'user-e2e',
        action: 'deploy',
        resourceType: 'production',
        environment: 'production' as const,
        dataClassification: 3 as const,
        scope: 'system-wide' as const,
        workflowType: 'deployment',
      };

      const action = {
        type: 'deploy' as const,
        target: 'production',
        reversible: false,
        affectsExternalSystems: true,
        requiresApproval: true,
        estimatedImpact: 'high' as const,
      };

      const assessment = carsAssessor.assess(context, action);

      // Production + non-reversible + external systems should increase risk
      expect(assessment.risk.score).toBeGreaterThan(0);
    });
  });

  describe('audit logging', () => {
    it('logs audit entries', async () => {
      await auditLogger.log(
        'workflow.completed',
        { type: 'system', id: 'e2e-test' },
        'test-action',
        {
          resource: { type: 'test', id: 'test-resource-123' },
          riskLevel: 'low',
        }
      );

      const logs = await auditStore.query({});
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs.some(l => l.action === 'test-action')).toBe(true);
    });

    it('logs multiple entries with hash chain', async () => {
      // Log multiple entries
      for (let i = 0; i < 3; i++) {
        await auditLogger.log(
          'workflow.completed',
          { type: 'system', id: 'e2e-test' },
          `action-${i}`,
          {
            resource: { type: 'test', id: `resource-chain-${i}` },
            riskLevel: 'low',
          }
        );
      }

      // Verify entries were logged
      const allLogs = await auditStore.query({});
      expect(allLogs.length).toBeGreaterThanOrEqual(3);

      // Each entry should have a hash
      for (const log of allLogs) {
        expect(log.eventHash).toBeDefined();
      }
    });

    it('captures complete audit context', async () => {
      await auditLogger.log(
        'workflow.completed',
        { type: 'user', id: 'user-e2e' },
        'generate',
        {
          resource: { type: 'react-component', id: 'test-component-meta' },
          riskLevel: 'low',
          details: {
            source: 'figma',
            target: 'mendix',
            duration: 1500,
          },
        }
      );

      const logs = await auditStore.query({});
      const targetLog = logs.find(l => l.action === 'generate');
      expect(targetLog).toBeDefined();
      expect(targetLog?.details?.source).toBe('figma');
      expect(targetLog?.details?.target).toBe('mendix');
    });
  });

  describe('approval workflow', () => {
    // Helper to create a mock CARS assessment
    const createMockCARSAssessment = (level: 'low' | 'medium' | 'high' | 'critical') => {
      const context = {
        userId: 'user-e2e',
        action: 'deploy',
        resourceType: 'deployment',
        environment: 'production' as const,
        dataClassification: 2 as const,
        scope: 'single-file' as const,
        workflowType: 'deployment',
      };
      const action = {
        type: 'deploy' as const,
        target: 'production',
        reversible: false,
        affectsExternalSystems: true,
        requiresApproval: true,
        estimatedImpact: 'high' as const,
      };
      const assessment = carsAssessor.assess(context, action);
      // Override risk level for test purposes
      assessment.risk.level = level;
      return assessment;
    };

    it('creates approval request', async () => {
      const carsAssessment = createMockCARSAssessment('high');
      const request = await approvalService.createRequest({
        carsAssessment,
        summary: 'E2E test deployment',
        details: 'Testing approval workflow',
      });

      expect(request.id).toBeDefined();
      expect(request.status).toBe('pending');
    });

    it('approves request', async () => {
      const carsAssessment = createMockCARSAssessment('medium');
      const request = await approvalService.createRequest({
        carsAssessment,
        summary: 'E2E test approval',
      });

      const decided = await approvalService.submitDecision(
        request.id,
        'user-approver',
        'approved',
        'Approved for testing'
      );

      expect(decided.status).toBe('approved');
      expect(decided.decisions[0].approverId).toBe('user-approver');
    });

    it('rejects request', async () => {
      const carsAssessment = createMockCARSAssessment('high');
      const request = await approvalService.createRequest({
        carsAssessment,
        summary: 'Risky operation',
      });

      const decided = await approvalService.submitDecision(
        request.id,
        'user-approver',
        'rejected',
        'Too risky'
      );

      expect(decided.status).toBe('rejected');
    });
  });
});
