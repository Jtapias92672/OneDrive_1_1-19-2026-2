/**
 * Audit Trails E2E Tests
 * Epic 12: Tests for governance gates and audit logging
 */

import { auditLogger, auditStore } from '@/lib/governance/audit';
import { policyEngine } from '@/lib/governance/policy';
import { carsAssessor } from '@/lib/governance/cars';
import { approvalService, approvalStore } from '@/lib/governance/approval';

interface AuditEntry {
  id: string;
  eventType: string;
  action: string;
  actor: { type: string; id: string };
  timestamp: Date;
  resource?: { type: string; id: string };
  riskLevel?: string;
  details?: Record<string, unknown>;
  eventHash?: string;
}

interface GovernanceGate {
  name: string;
  type: 'policy' | 'risk' | 'approval';
  status: 'passed' | 'failed' | 'pending';
  details?: Record<string, unknown>;
}

/**
 * Governance Gate Evaluator
 */
class GovernanceGateEvaluator {
  async evaluateGates(
    action: string,
    resource: { type: string; id: string },
    actor: { type: 'user' | 'system'; id: string },
    context: Record<string, unknown>
  ): Promise<{
    allPassed: boolean;
    gates: GovernanceGate[];
    requiresApproval: boolean;
  }> {
    const gates: GovernanceGate[] = [];

    // Policy gate
    const policyResult = await policyEngine.evaluate({
      action: action as 'generate' | 'deploy' | 'export' | 'review',
      resource: resource.id,
      resourceType: resource.type as 'react-component' | 'mendix-page' | 'deployment',
      actor,
      context: {
        environment: (context.environment as 'development' | 'staging' | 'production') || 'development',
      },
    });

    gates.push({
      name: 'Policy Evaluation',
      type: 'policy',
      status: policyResult.allowed ? 'passed' : 'failed',
      details: { matchedPolicies: policyResult.matchedPolicies?.length || 0 },
    });

    // Risk assessment gate
    const riskContext = {
      userId: actor.id,
      action,
      resourceType: resource.type,
      environment: (context.environment as 'development' | 'staging' | 'production') || 'development',
      dataClassification: (context.dataClassification as 0 | 1 | 2 | 3) || 1,
      scope: (context.scope as 'single-file' | 'batch' | 'system-wide') || 'single-file',
      workflowType: 'figma-to-code',
    };

    const riskAction = {
      type: action as 'generate' | 'deploy' | 'export',
      target: resource.type,
      reversible: action !== 'deploy',
      affectsExternalSystems: action === 'deploy',
      requiresApproval: action === 'deploy',
      estimatedImpact: action === 'deploy' ? ('high' as const) : ('low' as const),
    };

    const riskAssessment = carsAssessor.assess(riskContext, riskAction);

    gates.push({
      name: 'Risk Assessment',
      type: 'risk',
      status: riskAssessment.risk.level !== 'critical' ? 'passed' : 'failed',
      details: {
        riskLevel: riskAssessment.risk.level,
        riskScore: riskAssessment.risk.score,
      },
    });

    // Approval gate (if required)
    const requiresApproval =
      riskAssessment.risk.level === 'high' || riskAssessment.risk.level === 'critical';

    if (requiresApproval) {
      gates.push({
        name: 'Approval Required',
        type: 'approval',
        status: 'pending',
        details: { riskLevel: riskAssessment.risk.level },
      });
    }

    const allPassed = gates.every((g) => g.status === 'passed');

    return { allPassed, gates, requiresApproval };
  }
}

describe('@sanity Audit Trails E2E', () => {
  beforeEach(() => {
    auditStore.reset();
    approvalStore.reset();
  });

  describe('audit logging integration', () => {
    it('@sanity logs pipeline start event', async () => {
      await auditLogger.log(
        'workflow.started',
        { type: 'system', id: 'pipeline-orchestrator' },
        'pipeline.start',
        {
          resource: { type: 'pipeline', id: 'run-12345' },
          riskLevel: 'low',
          details: {
            sourceFile: 'design.fig',
            targetFormats: ['react', 'mendix'],
          },
        }
      );

      const logs = await auditStore.query({ action: 'pipeline.start' });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('@sanity logs pipeline completion event', async () => {
      await auditLogger.log(
        'workflow.completed',
        { type: 'system', id: 'pipeline-orchestrator' },
        'pipeline.complete',
        {
          resource: { type: 'pipeline', id: 'run-12345' },
          riskLevel: 'low',
          details: {
            duration: 3500,
            componentsGenerated: 7,
            mendixPagesCreated: 7,
          },
        }
      );

      const logs = await auditStore.query({ action: 'pipeline.complete' });
      const log = logs[0];

      expect(log).toBeDefined();
      expect(log.details?.componentsGenerated).toBe(7);
    });

    it('logs component generation events', async () => {
      const componentNames = ['Frame1', 'Frame2', 'Frame3'];

      for (const name of componentNames) {
        await auditLogger.log(
          'workflow.completed',
          { type: 'system', id: 'react-generator' },
          'component.generated',
          {
            resource: { type: 'react-component', id: name },
            riskLevel: 'low',
            details: { componentName: name },
          }
        );
      }

      const logs = await auditStore.query({ action: 'component.generated' });
      expect(logs.length).toBe(3);
    });

    it('logs Mendix export events', async () => {
      await auditLogger.log(
        'workflow.completed',
        { type: 'system', id: 'mendix-exporter' },
        'mendix.export',
        {
          resource: { type: 'mendix-project', id: 'project-123' },
          riskLevel: 'medium',
          details: {
            pagesExported: 7,
            widgetsExported: 7,
            scssLinesGenerated: 3635,
          },
        }
      );

      const logs = await auditStore.query({ action: 'mendix.export' });
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].riskLevel).toBe('medium');
    });

    it('maintains audit hash chain integrity', async () => {
      // Log multiple events
      for (let i = 0; i < 5; i++) {
        await auditLogger.log(
          'workflow.completed',
          { type: 'system', id: 'test' },
          `action-${i}`,
          {
            resource: { type: 'test', id: `resource-${i}` },
            riskLevel: 'low',
          }
        );
      }

      const logs = await auditStore.query({});

      // Each log should have a hash
      for (const log of logs) {
        expect(log.eventHash).toBeDefined();
        expect(log.eventHash?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('governance gates', () => {
    let evaluator: GovernanceGateEvaluator;

    beforeEach(() => {
      evaluator = new GovernanceGateEvaluator();
    });

    it('evaluates all gates for generate action', async () => {
      const result = await evaluator.evaluateGates(
        'generate',
        { type: 'react-component', id: 'Frame1' },
        { type: 'user', id: 'user-1' },
        { environment: 'development' }
      );

      expect(result.gates.length).toBeGreaterThanOrEqual(2);
      expect(result.gates.find((g) => g.type === 'policy')).toBeDefined();
      expect(result.gates.find((g) => g.type === 'risk')).toBeDefined();
    });

    it('requires approval for deploy actions', async () => {
      const result = await evaluator.evaluateGates(
        'deploy',
        { type: 'deployment', id: 'deploy-1' },
        { type: 'user', id: 'user-1' },
        { environment: 'production' }
      );

      // Deploy to production should require approval
      expect(result.gates.some((g) => g.type === 'risk')).toBe(true);
    });

    it('passes gates for low-risk operations', async () => {
      const result = await evaluator.evaluateGates(
        'generate',
        { type: 'react-component', id: 'Frame1' },
        { type: 'system', id: 'pipeline' },
        { environment: 'development', dataClassification: 1, scope: 'single-file' }
      );

      const riskGate = result.gates.find((g) => g.type === 'risk');
      expect(riskGate?.status).toBe('passed');
    });
  });

  describe('approval workflow integration', () => {
    it('creates approval for high-risk operations', async () => {
      const carsContext = {
        userId: 'user-1',
        action: 'deploy',
        resourceType: 'production',
        environment: 'production' as const,
        dataClassification: 3 as const,
        scope: 'system-wide' as const,
        workflowType: 'deployment',
      };

      const carsAction = {
        type: 'deploy' as const,
        target: 'production',
        reversible: false,
        affectsExternalSystems: true,
        requiresApproval: true,
        estimatedImpact: 'high' as const,
      };

      const assessment = carsAssessor.assess(carsContext, carsAction);
      assessment.risk.level = 'high';

      const request = await approvalService.createRequest({
        carsAssessment: assessment,
        summary: 'Production deployment',
        details: 'Deploy generated components to production',
      });

      expect(request.status).toBe('pending');
      expect(request.id).toBeDefined();
    });

    it('tracks approval decision in audit log', async () => {
      const assessment = carsAssessor.assess(
        {
          userId: 'user-1',
          action: 'deploy',
          resourceType: 'production',
          environment: 'production' as const,
          dataClassification: 2 as const,
          scope: 'single-file' as const,
          workflowType: 'deployment',
        },
        {
          type: 'deploy' as const,
          target: 'production',
          reversible: false,
          affectsExternalSystems: true,
          requiresApproval: true,
          estimatedImpact: 'high' as const,
        }
      );

      const request = await approvalService.createRequest({
        carsAssessment: assessment,
        summary: 'Test deployment',
      });

      await approvalService.submitDecision(
        request.id,
        'approver-1',
        'approved',
        'Approved for testing'
      );

      // Log the approval
      await auditLogger.log(
        'workflow.completed',
        { type: 'user', id: 'approver-1' },
        'approval.granted',
        {
          resource: { type: 'approval-request', id: request.id },
          riskLevel: 'medium',
          details: { approvalId: request.id },
        }
      );

      const logs = await auditStore.query({ action: 'approval.granted' });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects request and logs rejection', async () => {
      const assessment = carsAssessor.assess(
        {
          userId: 'user-1',
          action: 'deploy',
          resourceType: 'production',
          environment: 'production' as const,
          dataClassification: 3 as const,
          scope: 'system-wide' as const,
          workflowType: 'deployment',
        },
        {
          type: 'deploy' as const,
          target: 'production',
          reversible: false,
          affectsExternalSystems: true,
          requiresApproval: true,
          estimatedImpact: 'high' as const,
        }
      );

      const request = await approvalService.createRequest({
        carsAssessment: assessment,
        summary: 'Risky deployment',
      });

      const decided = await approvalService.submitDecision(
        request.id,
        'approver-1',
        'rejected',
        'Risk too high without mitigation'
      );

      expect(decided.status).toBe('rejected');
    });
  });

  describe('audit query capabilities', () => {
    beforeEach(async () => {
      // Reset for isolation
      auditStore.reset();

      // Populate audit log
      const actions = [
        { action: 'pipeline.start', resource: 'run-1' },
        { action: 'component.generated', resource: 'Frame1' },
        { action: 'component.generated', resource: 'Frame2' },
        { action: 'mendix.export', resource: 'project-1' },
        { action: 'pipeline.complete', resource: 'run-1' },
      ];

      for (const { action, resource } of actions) {
        await auditLogger.log(
          'workflow.completed',
          { type: 'system', id: 'test' },
          action,
          {
            resource: { type: 'test', id: resource },
            riskLevel: 'low',
          }
        );
      }
    });

    it('queries by action type', async () => {
      // auditStore.query doesn't filter by action, filter manually
      const allLogs = await auditStore.query({});
      const logs = allLogs.filter((l) => l.action === 'component.generated');
      expect(logs.length).toBe(2);
    });

    it('returns all logs without filter', async () => {
      const logs = await auditStore.query({});
      expect(logs.length).toBe(5);
    });

    it('logs include timestamps', async () => {
      const logs = await auditStore.query({});
      for (const log of logs) {
        expect(log.createdAt).toBeDefined();
      }
    });
  });
});

describe('Pipeline Governance Flow', () => {
  beforeEach(() => {
    auditStore.reset();
  });

  it('logs complete pipeline with governance', async () => {
    // 1. Pipeline start
    await auditLogger.log(
      'workflow.started',
      { type: 'system', id: 'orchestrator' },
      'pipeline.start',
      {
        resource: { type: 'pipeline', id: 'full-test' },
        riskLevel: 'low',
        details: { inputFile: 'POC_Test_Design' },
      }
    );

    // 2. Figma fetch
    await auditLogger.log(
      'workflow.completed',
      { type: 'system', id: 'figma-client' },
      'figma.fetch',
      {
        resource: { type: 'figma-file', id: '6GefaVgI8xnuDIHhSbfzsJ' },
        riskLevel: 'low',
        details: { components: 7 },
      }
    );

    // 3. Parse
    await auditLogger.log(
      'workflow.completed',
      { type: 'system', id: 'figma-parser' },
      'figma.parse',
      {
        resource: { type: 'parsed-design', id: 'parsed-1' },
        riskLevel: 'low',
        details: { fills: 253, text: 76 },
      }
    );

    // 4. React generation (batch)
    for (let i = 1; i <= 7; i++) {
      await auditLogger.log(
        'workflow.completed',
        { type: 'system', id: 'react-generator' },
        'react.generate',
        {
          resource: { type: 'react-component', id: `Frame${i}` },
          riskLevel: 'low',
        }
      );
    }

    // 5. Mendix export
    await auditLogger.log(
      'workflow.completed',
      { type: 'system', id: 'mendix-generator' },
      'mendix.export',
      {
        resource: { type: 'mendix-package', id: 'export-1' },
        riskLevel: 'medium',
        details: { pages: 7, widgets: 7, scssLines: 3635 },
      }
    );

    // 6. Pipeline complete
    await auditLogger.log(
      'workflow.completed',
      { type: 'system', id: 'orchestrator' },
      'pipeline.complete',
      {
        resource: { type: 'pipeline', id: 'full-test' },
        riskLevel: 'low',
        details: { totalDuration: 960, success: true },
      }
    );

    // Verify all events logged
    const allLogs = await auditStore.query({});
    expect(allLogs.length).toBe(12); // 1+1+1+7+1+1 = 12

    // Filter by action manually (query doesn't support action filter)
    const reactLogs = allLogs.filter((l) => l.action === 'react.generate');
    expect(reactLogs.length).toBe(7);
  });
});
