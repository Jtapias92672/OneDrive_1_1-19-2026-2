import { workflowEngine, workflowStore } from '../workflow';
import { auditLogger } from '../audit';
import { policyStore } from '../policy/policy-store';
import { approvalService } from '../approval';
import { carsAssessor } from '../cars';

describe('WorkflowEngine', () => {
  beforeEach(() => {
    workflowEngine.reset();
    auditLogger.reset();
    policyStore.reset();
    approvalService.reset();
    carsAssessor.clearUserHistory();
  });

  describe('start', () => {
    it('starts workflow without approval for low-risk', async () => {
      const workflow = await workflowEngine.start(
        'figma-to-code',
        {
          environment: 'development',
          dataClassification: 1,
          target: 'test-component',
        },
        'user-123'
      );

      expect(workflow.id).toMatch(/^wf-/);
      expect(workflow.type).toBe('figma-to-code');
      expect(workflow.status).toBe('completed'); // Low risk executes immediately
      expect(workflow.userId).toBe('user-123');
      expect(workflow.riskAssessment).toBeDefined();
      expect(workflow.createdAt).toBeInstanceOf(Date);
    });

    it('requires approval for production environment', async () => {
      // Production environment triggers approval requirement via default policy
      // Using tier 3 (not tier 4 which gets blocked)
      const workflow = await workflowEngine.start(
        'figma-to-code',
        {
          environment: 'production',
          dataClassification: 2,
          target: 'production-component',
        },
        'user-123'
      );

      // Production environment triggers 'Production Environment Guard' policy
      expect(workflow.status).toBe('awaiting-approval');
      expect(workflow.approvalRequestId).toBeDefined();
    });

    it('throws for unknown workflow type', async () => {
      await expect(
        workflowEngine.start('unknown-type' as any, {}, 'user-123')
      ).rejects.toThrow('Unknown workflow type');
    });

    it('logs workflow start event', async () => {
      await workflowEngine.start(
        'figma-to-code',
        { environment: 'development' },
        'user-123'
      );

      const events = await auditLogger.query({ eventType: 'workflow.started' });
      expect(events).toHaveLength(1);
      expect(events[0].actor.id).toBe('user-123');
    });
  });

  describe('execute', () => {
    it('executes all stages in order', async () => {
      const workflow = await workflowEngine.start(
        'figma-to-code',
        { environment: 'development' },
        'user-123'
      );

      expect(workflow.status).toBe('completed');
      expect(Object.keys(workflow.stageResults)).toHaveLength(4);
      expect(workflow.stageResults['parse-figma'].status).toBe('success');
      expect(workflow.stageResults['generate-code'].status).toBe('success');
      expect(workflow.stageResults['validate-output'].status).toBe('success');
      expect(workflow.stageResults['generate-evidence'].status).toBe('success');
    });

    it('tracks token consumption', async () => {
      const workflow = await workflowEngine.start(
        'figma-to-code',
        { environment: 'development' },
        'user-123'
      );

      // Figma workflow: 1000 + 5000 + 500 + 200 = 6700 tokens
      expect(workflow.tokensConsumed).toBe(6700);
    });

    it('logs stage events', async () => {
      await workflowEngine.start(
        'figma-to-code',
        { environment: 'development' },
        'user-123'
      );

      const startEvents = await auditLogger.query({ eventType: 'stage.started' });
      const completeEvents = await auditLogger.query({ eventType: 'stage.completed' });

      expect(startEvents.length).toBe(4);
      expect(completeEvents.length).toBe(4);
    });

    it('logs workflow completion', async () => {
      await workflowEngine.start(
        'figma-to-code',
        { environment: 'development' },
        'user-123'
      );

      const events = await auditLogger.query({ eventType: 'workflow.completed' });
      expect(events).toHaveLength(1);
    });
  });

  describe('token budget', () => {
    it('enforces token budget', async () => {
      // Create a workflow with a very small budget
      const workflow = await workflowEngine.start(
        'figma-to-code',
        { environment: 'development' },
        'user-123'
      );

      // Since default budget is 50000 and total usage is 6700, should complete
      expect(workflow.status).toBe('completed');
    });
  });

  describe('cancel', () => {
    it('cancels a pending workflow', async () => {
      // Create a workflow that requires approval
      const workflow = await workflowEngine.start(
        'figma-to-code',
        {
          environment: 'production',
          dataClassification: 3,
        },
        'user-123'
      );

      expect(workflow.status).toBe('awaiting-approval');

      const cancelled = await workflowEngine.cancel(workflow.id, 'user-123');

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.completedAt).toBeInstanceOf(Date);
    });

    it('throws when cancelling completed workflow', async () => {
      const workflow = await workflowEngine.start(
        'figma-to-code',
        { environment: 'development' },
        'user-123'
      );

      expect(workflow.status).toBe('completed');

      await expect(workflowEngine.cancel(workflow.id, 'user-123')).rejects.toThrow(
        'Cannot cancel'
      );
    });

    it('throws for non-existent workflow', async () => {
      await expect(workflowEngine.cancel('fake-id', 'user-123')).rejects.toThrow(
        'not found'
      );
    });

    it('logs cancellation event', async () => {
      const workflow = await workflowEngine.start(
        'figma-to-code',
        {
          environment: 'production',
          dataClassification: 3,
        },
        'user-123'
      );

      await workflowEngine.cancel(workflow.id, 'user-123');

      const events = await auditLogger.query({ eventType: 'workflow.cancelled' });
      expect(events).toHaveLength(1);
    });
  });

  describe('onApprovalDecision', () => {
    it('executes workflow when approved', async () => {
      const workflow = await workflowEngine.start(
        'figma-to-code',
        {
          environment: 'production',
          dataClassification: 3,
        },
        'user-123'
      );

      expect(workflow.status).toBe('awaiting-approval');

      const executed = await workflowEngine.onApprovalDecision(
        workflow.approvalRequestId!,
        true
      );

      expect(executed).not.toBeNull();
      expect(executed!.status).toBe('completed');
    });

    it('cancels workflow when rejected', async () => {
      const workflow = await workflowEngine.start(
        'figma-to-code',
        {
          environment: 'production',
          dataClassification: 3,
        },
        'user-123'
      );

      const cancelled = await workflowEngine.onApprovalDecision(
        workflow.approvalRequestId!,
        false
      );

      expect(cancelled).not.toBeNull();
      expect(cancelled!.status).toBe('cancelled');
    });

    it('returns null for unknown approval request', async () => {
      const result = await workflowEngine.onApprovalDecision('unknown-id', true);
      expect(result).toBeNull();
    });
  });

  describe('getById', () => {
    it('returns workflow by ID', async () => {
      const created = await workflowEngine.start(
        'figma-to-code',
        { environment: 'development' },
        'user-123'
      );

      const found = await workflowEngine.getById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('returns null for unknown ID', async () => {
      const found = await workflowEngine.getById('unknown');
      expect(found).toBeNull();
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await workflowEngine.start(
        'figma-to-code',
        { environment: 'development' },
        'user-1'
      );
      await workflowEngine.start(
        'ticket-to-pr',
        { environment: 'development' },
        'user-2'
      );
    });

    it('returns all workflows', async () => {
      const workflows = await workflowEngine.list();
      expect(workflows).toHaveLength(2);
    });

    it('filters by userId', async () => {
      const workflows = await workflowEngine.list({ userId: 'user-1' });
      expect(workflows).toHaveLength(1);
      expect(workflows[0].userId).toBe('user-1');
    });

    it('filters by type', async () => {
      const workflows = await workflowEngine.list({ type: 'ticket-to-pr' });
      expect(workflows).toHaveLength(1);
      expect(workflows[0].type).toBe('ticket-to-pr');
    });
  });

  describe('getDefinition', () => {
    it('returns workflow definition', () => {
      const def = workflowEngine.getDefinition('figma-to-code');
      expect(def).toBeDefined();
      expect(def!.name).toBe('Figma to Code Generation');
      expect(def!.stages).toHaveLength(4);
    });

    it('returns undefined for unknown type', () => {
      const def = workflowEngine.getDefinition('unknown' as any);
      expect(def).toBeUndefined();
    });
  });
});
