import { GovernanceGateway } from '../gateway';
import { PolicyEngine } from '../policy/policy-engine';
import { policyStore } from '../policy/policy-store';
import { CARSAssessor, carsAssessor } from '../cars';
import { ApprovalService, approvalService } from '../approval';
import { CARSContext, CARSAction } from '../cars/types';

describe('GovernanceGateway', () => {
  let gateway: GovernanceGateway;

  beforeEach(() => {
    policyStore.reset();
    approvalService.reset();
    carsAssessor.clearUserHistory();
    gateway = new GovernanceGateway();
  });

  const lowRiskContext: CARSContext = {
    environment: 'development',
    dataClassification: 1,
    scope: 'single-file',
    userId: 'user-123',
    workflowType: 'figma-to-code',
  };

  const lowRiskAction: CARSAction = {
    type: 'code-generation',
    target: 'src/components/Button',
    reversible: true,
    estimatedImpact: 'low',
  };

  const highRiskContext: CARSContext = {
    environment: 'production',
    dataClassification: 3,
    scope: 'multiple-files',
    userId: 'user-123',
    workflowType: 'deployment',
  };

  const highRiskAction: CARSAction = {
    type: 'deployment',
    target: 'production-system',
    reversible: false,
    estimatedImpact: 'high',
  };

  describe('evaluate', () => {
    it('allows low-risk operations without approval', async () => {
      const result = await gateway.evaluate({
        context: lowRiskContext,
        action: lowRiskAction,
      });

      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
      expect(result.approvalRequest).toBeUndefined();
      expect(result.carsAssessment.risk.level).toBe('low');
    });

    it('requires approval for high-risk operations', async () => {
      const result = await gateway.evaluate({
        context: highRiskContext,
        action: highRiskAction,
      });

      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(true);
      expect(result.approvalRequest).toBeDefined();
      expect(result.approvalRequest!.status).toBe('pending');
    });

    it('blocks when policy blocks', async () => {
      // Create a blocking policy
      await policyStore.create({
        name: 'Block All Deployments',
        priority: 200,
        conditions: [{ field: 'actionType', operator: 'eq', value: 'deployment' }],
        actions: [{ type: 'block', params: { reason: 'Deployments disabled' } }],
      });

      const result = await gateway.evaluate({
        context: lowRiskContext,
        action: { ...lowRiskAction, type: 'deployment' },
      });

      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(false);
      expect(result.reason).toBe('Deployments disabled');
    });

    it('includes CARS assessment in result', async () => {
      const result = await gateway.evaluate({
        context: lowRiskContext,
        action: lowRiskAction,
      });

      expect(result.carsAssessment).toBeDefined();
      expect(result.carsAssessment.id).toMatch(/^cars-/);
      expect(result.carsAssessment.risk.factors).toHaveLength(6);
    });

    it('includes policy evaluation in result', async () => {
      const result = await gateway.evaluate({
        context: lowRiskContext,
        action: lowRiskAction,
      });

      expect(result.policyEvaluation).toBeDefined();
      expect(result.policyEvaluation.evaluatedAt).toBeInstanceOf(Date);
    });

    it('stores artifacts in approval request', async () => {
      const result = await gateway.evaluate({
        context: highRiskContext,
        action: highRiskAction,
        artifacts: [
          { type: 'code', name: 'Component.tsx', preview: 'const x = 1;' },
        ],
        workflowId: 'wf-test',
      });

      expect(result.approvalRequest).toBeDefined();
      expect(result.approvalRequest!.artifacts).toHaveLength(1);
      expect(result.approvalRequest!.workflowId).toBe('wf-test');
    });
  });

  describe('checkApprovalStatus', () => {
    it('returns canProceed=true for approved requests', async () => {
      const result = await gateway.evaluate({
        context: highRiskContext,
        action: highRiskAction,
      });

      // Approve the request
      await approvalService.submitDecision(
        result.approvalRequest!.id,
        'approver-1',
        'approved'
      );

      const status = await gateway.checkApprovalStatus(result.approvalRequest!.id);

      expect(status.canProceed).toBe(true);
      expect(status.status).toBe('approved');
    });

    it('returns canProceed=false for rejected requests', async () => {
      const result = await gateway.evaluate({
        context: highRiskContext,
        action: highRiskAction,
      });

      await approvalService.submitDecision(
        result.approvalRequest!.id,
        'approver-1',
        'rejected',
        'Not ready yet'
      );

      const status = await gateway.checkApprovalStatus(result.approvalRequest!.id);

      expect(status.canProceed).toBe(false);
      expect(status.status).toBe('rejected');
      expect(status.reason).toBe('Not ready yet');
    });

    it('returns canProceed=false for pending requests', async () => {
      const result = await gateway.evaluate({
        context: highRiskContext,
        action: highRiskAction,
      });

      const status = await gateway.checkApprovalStatus(result.approvalRequest!.id);

      expect(status.canProceed).toBe(false);
      expect(status.status).toBe('pending');
    });

    it('returns not_found for unknown request', async () => {
      const status = await gateway.checkApprovalStatus('unknown-id');

      expect(status.canProceed).toBe(false);
      expect(status.status).toBe('not_found');
    });
  });

  describe('recordOperationResult', () => {
    it('tracks user operation history', () => {
      gateway.recordOperationResult('test-user', true);
      gateway.recordOperationResult('test-user', false);

      const history = carsAssessor.getUserHistory('test-user');
      expect(history).toBeDefined();
      expect(history!.totalOperations).toBe(2);
      expect(history!.recentFailures).toBe(1);
    });
  });
});
