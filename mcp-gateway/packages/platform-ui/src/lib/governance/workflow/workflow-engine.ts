/**
 * Workflow Engine
 * Orchestrates workflow execution with governance integration
 */

import {
  Workflow,
  WorkflowDefinition,
  WorkflowType,
  WorkflowStatus,
  WorkflowContext,
  WorkflowInput,
} from './types';
import { workflowStore } from './workflow-store';
import { GovernanceGateway, governanceGateway } from '../gateway';
import { AuditLogger, auditLogger } from '../audit';
import { CARSContext, CARSAction } from '../cars/types';
import { figmaToCodeWorkflow } from './stages/figma-to-code';
import { ticketToPRWorkflow } from './stages/ticket-to-pr';

const TOKEN_BUDGET_WARNING_THRESHOLD = 0.8; // 80%

export class WorkflowEngine {
  private definitions: Map<WorkflowType, WorkflowDefinition>;

  constructor(
    private store = workflowStore,
    private gateway: GovernanceGateway = governanceGateway,
    private logger: AuditLogger = auditLogger
  ) {
    this.definitions = new Map([
      ['figma-to-code', figmaToCodeWorkflow],
      ['ticket-to-pr', ticketToPRWorkflow],
    ]);
  }

  /**
   * Start a new workflow
   */
  async start(
    type: WorkflowType,
    input: WorkflowInput,
    userId: string
  ): Promise<Workflow> {
    const definition = this.definitions.get(type);
    if (!definition) {
      throw new Error(`Unknown workflow type: ${type}`);
    }

    // 1. Run CARS assessment via governance gateway
    const carsContext: CARSContext = {
      environment: input.environment || 'development',
      dataClassification: input.dataClassification || 1,
      scope: 'multiple-files',
      userId,
      workflowType: type,
    };
    const carsAction: CARSAction = {
      type: type,
      target: (input.target as string) || 'unknown',
      reversible: true,
      estimatedImpact: 'medium',
    };

    const decision = await this.gateway.evaluate({
      context: carsContext,
      action: carsAction,
    });

    // 2. Create workflow record
    const workflow: Workflow = {
      id: this.generateId(),
      type,
      status: decision.requiresApproval ? 'awaiting-approval' : 'pending',
      userId,
      input,
      currentStage: definition.stages[0].name,
      stageResults: {},
      tokenBudget: definition.defaultTokenBudget,
      tokensConsumed: 0,
      riskAssessment: decision.carsAssessment,
      approvalRequestId: decision.approvalRequest?.id,
      createdAt: new Date(),
    };

    await this.store.create(workflow);

    // 3. Log audit event
    await this.logger.log(
      'workflow.started',
      { type: 'user', id: userId },
      `Started ${type} workflow`,
      {
        resource: { type: 'workflow', id: workflow.id },
        details: { input, riskLevel: decision.carsAssessment.risk.level },
        riskLevel: decision.carsAssessment.risk.level,
        workflowId: workflow.id,
      }
    );

    // 4. If no approval needed, start execution
    if (!decision.requiresApproval) {
      return this.execute(workflow);
    }

    return workflow;
  }

  /**
   * Execute workflow stages
   */
  async execute(workflow: Workflow): Promise<Workflow> {
    const definition = this.definitions.get(workflow.type)!;
    let currentWorkflow: Workflow = {
      ...workflow,
      status: 'running' as WorkflowStatus,
    };
    await this.store.update(currentWorkflow);

    for (const stage of definition.stages) {
      // Check token budget warning
      const budgetUsage = currentWorkflow.tokensConsumed / currentWorkflow.tokenBudget;
      if (budgetUsage >= TOKEN_BUDGET_WARNING_THRESHOLD && budgetUsage < 1) {
        await this.logger.log(
          'token.budget.warning',
          { type: 'system', id: 'workflow-engine' },
          `Token budget at ${Math.round(budgetUsage * 100)}%`,
          { workflowId: workflow.id }
        );
      }

      // Check token budget exceeded
      if (currentWorkflow.tokensConsumed >= currentWorkflow.tokenBudget) {
        await this.logger.log(
          'token.budget.exceeded',
          { type: 'system', id: 'workflow-engine' },
          'Token budget exceeded',
          { workflowId: workflow.id }
        );
        currentWorkflow = {
          ...currentWorkflow,
          status: 'failed',
          error: 'Token budget exceeded',
          completedAt: new Date(),
        };
        await this.store.update(currentWorkflow);

        await this.logger.log(
          'workflow.failed',
          { type: 'system', id: 'workflow-engine' },
          `Workflow failed: Token budget exceeded`,
          { workflowId: workflow.id }
        );
        return currentWorkflow;
      }

      // Checkpoint: evaluate policies
      if (stage.checkpoint) {
        const checkResult = await this.gateway.evaluate({
          context: {
            ...currentWorkflow.riskAssessment.context,
            workflowType: workflow.type,
          },
          action: {
            type: stage.name,
            target: workflow.id,
            reversible: true,
            estimatedImpact: 'medium',
          },
        });

        if (!checkResult.allowed && !checkResult.requiresApproval) {
          currentWorkflow = {
            ...currentWorkflow,
            status: 'failed',
            error: `Policy violation at stage: ${stage.name}`,
            completedAt: new Date(),
          };
          await this.store.update(currentWorkflow);

          await this.logger.log(
            'workflow.failed',
            { type: 'system', id: 'workflow-engine' },
            `Workflow failed: Policy violation at ${stage.name}`,
            { workflowId: workflow.id }
          );
          return currentWorkflow;
        }
      }

      // Execute stage
      await this.logger.log(
        'stage.started',
        { type: 'system', id: 'workflow-engine' },
        `Started stage: ${stage.name}`,
        {
          workflowId: workflow.id,
          details: { stage: stage.name },
        }
      );

      const startTime = Date.now();
      try {
        const context: WorkflowContext = {
          workflow: currentWorkflow,
          currentStage: stage,
          previousResults: currentWorkflow.stageResults,
          governanceGateway: this.gateway,
          auditLogger: this.logger,
        };

        const result = await stage.handler(context);

        currentWorkflow.stageResults[stage.name] = {
          ...result,
          stage: stage.name,
          duration: Date.now() - startTime,
        };
        currentWorkflow.tokensConsumed += result.tokensUsed;
        currentWorkflow.currentStage = stage.name;

        await this.logger.log(
          'stage.completed',
          { type: 'system', id: 'workflow-engine' },
          `Completed stage: ${stage.name}`,
          {
            workflowId: workflow.id,
            details: { tokensUsed: result.tokensUsed },
          }
        );
      } catch (error) {
        currentWorkflow.stageResults[stage.name] = {
          stage: stage.name,
          status: 'failed',
          tokensUsed: 0,
          duration: Date.now() - startTime,
          error: (error as Error).message,
        };
        currentWorkflow.status = 'failed';
        currentWorkflow.error = (error as Error).message;
        currentWorkflow.completedAt = new Date();

        await this.logger.log(
          'stage.failed',
          { type: 'system', id: 'workflow-engine' },
          `Failed stage: ${stage.name}`,
          {
            workflowId: workflow.id,
            details: { error: (error as Error).message },
          }
        );

        await this.store.update(currentWorkflow);

        await this.logger.log(
          'workflow.failed',
          { type: 'system', id: 'workflow-engine' },
          `Workflow failed at stage: ${stage.name}`,
          { workflowId: workflow.id }
        );
        return currentWorkflow;
      }

      await this.store.update(currentWorkflow);
    }

    // Finalize successful workflow
    currentWorkflow.status = 'completed';
    currentWorkflow.completedAt = new Date();

    await this.store.update(currentWorkflow);

    await this.logger.log(
      'workflow.completed',
      { type: 'system', id: 'workflow-engine' },
      `Completed workflow: ${workflow.type}`,
      { workflowId: workflow.id }
    );

    return currentWorkflow;
  }

  /**
   * Cancel a workflow
   */
  async cancel(workflowId: string, userId: string): Promise<Workflow> {
    const workflow = await this.store.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.status === 'completed' || workflow.status === 'cancelled') {
      throw new Error('Cannot cancel completed or already cancelled workflow');
    }

    const updated: Workflow = {
      ...workflow,
      status: 'cancelled',
      completedAt: new Date(),
    };

    await this.store.update(updated);

    await this.logger.log(
      'workflow.cancelled',
      { type: 'user', id: userId },
      `Cancelled workflow: ${workflow.type}`,
      { workflowId: workflow.id }
    );

    return updated;
  }

  /**
   * Handle approval decision for a workflow
   */
  async onApprovalDecision(
    approvalRequestId: string,
    approved: boolean
  ): Promise<Workflow | null> {
    const workflow = await this.store.findByApprovalRequest(approvalRequestId);
    if (!workflow) return null;

    if (approved) {
      return this.execute(workflow);
    } else {
      return this.cancel(workflow.id, 'system');
    }
  }

  /**
   * Get workflow by ID
   */
  async getById(id: string): Promise<Workflow | null> {
    return this.store.get(id);
  }

  /**
   * List workflows
   */
  async list(filters?: {
    userId?: string;
    status?: WorkflowStatus;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Workflow[]> {
    return this.store.list(filters);
  }

  /**
   * Get workflow definition
   */
  getDefinition(type: WorkflowType): WorkflowDefinition | undefined {
    return this.definitions.get(type);
  }

  /**
   * Reset (for testing)
   */
  reset(): void {
    this.store.reset();
  }

  private generateId(): string {
    return `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const workflowEngine = new WorkflowEngine();
