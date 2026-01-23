/**
 * FORGE Governance Gateway - Lead Agent
 * 
 * @epic 13 - Governance Gateway (Agentic SDLC)
 * @task 2.1 - Lead Agent Orchestration
 * @owner joe@arcfoundry.ai
 * @created 2026-01-20
 * 
 * @description
 *   The Lead Agent orchestrates Worker Agents, maintaining task assignment,
 *   quality gates, escalation pathways, and audit trail generation.
 */

import {
  AgentRole,
  AgentState,
  AgentDefinition,
  Task,
  TaskType,
  TaskStatus,
  TaskResult,
  TaskError,
  Workflow,
  WorkflowType,
  WorkflowStatus,
  WorkflowStage,
  WorkflowContext,
  RetryPolicy,
  DEFAULT_RETRY_POLICY,
  CARSAssessment,
  RiskLevel,
} from './types';

import { PolicyEngine } from '../policy/policy-engine';
import { AuditLogger } from '../audit/audit-logger';
import { ApprovalGate } from '../gates/approval-gate';
import { WorkerAgent } from '../agents/worker-agent';

// ============================================
// LEAD AGENT
// ============================================

export class LeadAgent {
  private id: string;
  private workers: Map<AgentRole, WorkerAgent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private workflows: Map<string, Workflow> = new Map();
  private policyEngine: PolicyEngine;
  private auditLogger: AuditLogger;
  private approvalGate: ApprovalGate;
  private taskQueue: Task[] = [];
  private isRunning = false;

  constructor(
    policyEngine: PolicyEngine,
    auditLogger: AuditLogger,
    approvalGate: ApprovalGate
  ) {
    this.id = `lead_${Date.now()}`;
    this.policyEngine = policyEngine;
    this.auditLogger = auditLogger;
    this.approvalGate = approvalGate;
  }

  // ==========================================
  // AGENT MANAGEMENT
  // ==========================================

  /**
   * Register a worker agent
   */
  registerWorker(agent: WorkerAgent): void {
    this.workers.set(agent.getRole(), agent);
    this.auditLogger.log({
      type: 'agent-state-changed',
      action: 'worker-registered',
      agentId: agent.getId(),
      details: { role: agent.getRole() },
    });
  }

  /**
   * Get available agent for a task type
   */
  private getAgentForTask(taskType: TaskType): WorkerAgent | null {
    const roleMap: Record<TaskType, AgentRole> = {
      'parse-figma': 'figma-parser',
      'extract-tokens': 'figma-parser',
      'generate-react': 'react-generator',
      'generate-tests': 'test-generator',
      'validate-output': 'validator',
      'run-convergence': 'validator',
      'generate-mendix': 'mendix-sdk',
      'create-evidence': 'evidence-generator',
      'human-review': 'lead',
      'composite': 'lead',
    };

    const role = roleMap[taskType];
    return this.workers.get(role) || null;
  }

  // ==========================================
  // WORKFLOW MANAGEMENT
  // ==========================================

  /**
   * Start a new workflow
   */
  async startWorkflow(
    type: WorkflowType,
    input: any,
    context?: Partial<WorkflowContext>
  ): Promise<Workflow> {
    const workflow = this.createWorkflow(type, input, context);
    this.workflows.set(workflow.id, workflow);

    await this.auditLogger.log({
      type: 'workflow-started',
      workflowId: workflow.id,
      action: 'start',
      details: { type, input: this.summarizeInput(input) },
    });

    // Start processing
    this.processWorkflow(workflow.id);

    return workflow;
  }

  /**
   * Create workflow with stages
   */
  private createWorkflow(
    type: WorkflowType,
    input: any,
    context?: Partial<WorkflowContext>
  ): Workflow {
    const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const stages = this.buildWorkflowStages(type);

    return {
      id,
      name: `${type}-${id.slice(-6)}`,
      type,
      status: 'created',
      stages,
      currentStage: 0,
      input,
      context: {
        workflowId: id,
        sessionId: `session_${Date.now()}`,
        environment: 'development',
        tags: [],
        variables: {},
        ...context,
      },
      createdAt: new Date(),
    };
  }

  /**
   * Build workflow stages based on type
   */
  private buildWorkflowStages(type: WorkflowType): WorkflowStage[] {
    const stageDefinitions: Record<WorkflowType, Array<{ name: string; taskType: TaskType; agentRole: AgentRole; requiresApproval: boolean }>> = {
      'figma-to-react': [
        { name: 'Parse Figma', taskType: 'parse-figma', agentRole: 'figma-parser', requiresApproval: false },
        { name: 'Extract Tokens', taskType: 'extract-tokens', agentRole: 'figma-parser', requiresApproval: false },
        { name: 'Generate React', taskType: 'generate-react', agentRole: 'react-generator', requiresApproval: false },
        { name: 'Validate Output', taskType: 'validate-output', agentRole: 'validator', requiresApproval: false },
        { name: 'Create Evidence', taskType: 'create-evidence', agentRole: 'evidence-generator', requiresApproval: false },
      ],
      'figma-to-mendix': [
        { name: 'Parse Figma', taskType: 'parse-figma', agentRole: 'figma-parser', requiresApproval: false },
        { name: 'Extract Tokens', taskType: 'extract-tokens', agentRole: 'figma-parser', requiresApproval: false },
        { name: 'Generate React', taskType: 'generate-react', agentRole: 'react-generator', requiresApproval: false },
        { name: 'Generate Mendix', taskType: 'generate-mendix', agentRole: 'mendix-sdk', requiresApproval: true },
        { name: 'Validate Output', taskType: 'validate-output', agentRole: 'validator', requiresApproval: false },
        { name: 'Create Evidence', taskType: 'create-evidence', agentRole: 'evidence-generator', requiresApproval: false },
      ],
      'contract-generation': [
        { name: 'Run Convergence', taskType: 'run-convergence', agentRole: 'validator', requiresApproval: false },
        { name: 'Validate Output', taskType: 'validate-output', agentRole: 'validator', requiresApproval: false },
        { name: 'Create Evidence', taskType: 'create-evidence', agentRole: 'evidence-generator', requiresApproval: false },
      ],
      'validation-only': [
        { name: 'Validate Output', taskType: 'validate-output', agentRole: 'validator', requiresApproval: false },
      ],
      'repair-loop': [
        { name: 'Validate Output', taskType: 'validate-output', agentRole: 'validator', requiresApproval: false },
        { name: 'Run Convergence', taskType: 'run-convergence', agentRole: 'validator', requiresApproval: false },
        { name: 'Validate Output', taskType: 'validate-output', agentRole: 'validator', requiresApproval: false },
      ],
      'custom': [],
    };

    const definitions = stageDefinitions[type] || [];
    return definitions.map((def, index) => ({
      id: `stage_${index}`,
      name: def.name,
      taskType: def.taskType,
      status: 'pending' as TaskStatus,
      agentRole: def.agentRole,
      requiresApproval: def.requiresApproval,
    }));
  }

  /**
   * Process a workflow
   */
  private async processWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    workflow.status = 'running';
    workflow.startedAt = new Date();

    try {
      while (workflow.currentStage < workflow.stages.length) {
        const stage = workflow.stages[workflow.currentStage];
        
        // Evaluate policy before executing stage
        const assessment = await this.policyEngine.assessRisk({
          workflowType: workflow.type,
          taskType: stage.taskType,
          agentRole: stage.agentRole,
        });

        if (assessment.autonomyLevel === 'manual-only') {
          workflow.status = 'waiting-approval';
          await this.requestApproval(workflow, stage, assessment);
          return; // Will resume after approval
        }

        // Execute stage
        const result = await this.executeStage(workflow, stage);

        if (!result.success) {
          if (result.error?.recoverable && workflow.currentStage > 0) {
            // Attempt repair
            await this.attemptRepair(workflow, stage, result.error);
          } else {
            workflow.status = 'failed';
            workflow.error = result.error;
            break;
          }
        }

        // Check if approval required after stage
        if (stage.requiresApproval || assessment.autonomyLevel === 'approval-required') {
          workflow.status = 'waiting-approval';
          await this.requestApproval(workflow, stage, assessment);
          return;
        }

        workflow.currentStage++;
      }

      if (workflow.status !== 'failed') {
        workflow.status = 'completed';
        workflow.completedAt = new Date();
        workflow.output = this.collectWorkflowOutput(workflow);
      }

      await this.auditLogger.log({
        type: workflow.status === 'completed' ? 'workflow-completed' : 'workflow-failed',
        workflowId: workflow.id,
        action: workflow.status,
        details: {
          duration: workflow.completedAt 
            ? workflow.completedAt.getTime() - workflow.startedAt!.getTime()
            : 0,
          stages: workflow.stages.length,
          error: workflow.error,
        },
      });

    } catch (error: any) {
      workflow.status = 'failed';
      workflow.error = {
        code: 'WORKFLOW_ERROR',
        message: error.message,
        recoverable: false,
        timestamp: new Date(),
      };

      await this.auditLogger.log({
        type: 'workflow-failed',
        workflowId: workflow.id,
        action: 'error',
        details: { error: error.message },
      });
    }
  }

  /**
   * Execute a workflow stage
   */
  private async executeStage(workflow: Workflow, stage: WorkflowStage): Promise<TaskResult> {
    const agent = this.getAgentForTask(stage.taskType);
    if (!agent) {
      return {
        taskId: stage.id,
        success: false,
        error: {
          code: 'NO_AGENT',
          message: `No agent available for task type: ${stage.taskType}`,
          recoverable: false,
          timestamp: new Date(),
        },
        durationMs: 0,
        tokensUsed: 0,
        attempts: 0,
      };
    }

    // Prepare stage input
    const stageInput = this.prepareStageInput(workflow, stage);
    stage.input = stageInput;
    stage.status = 'running';
    stage.startedAt = new Date();

    await this.auditLogger.log({
      type: 'task-started',
      workflowId: workflow.id,
      taskId: stage.id,
      agentId: agent.getId(),
      action: 'start',
      details: { taskType: stage.taskType },
    });

    try {
      const result = await agent.execute(stage.taskType, stageInput);
      
      stage.status = result.success ? 'completed' : 'failed';
      stage.output = result.output;
      stage.completedAt = new Date();

      await this.auditLogger.log({
        type: result.success ? 'task-completed' : 'task-failed',
        workflowId: workflow.id,
        taskId: stage.id,
        agentId: agent.getId(),
        action: result.success ? 'complete' : 'fail',
        details: {
          duration: result.durationMs,
          tokens: result.tokensUsed,
          error: result.error,
        },
      });

      return result;

    } catch (error: any) {
      stage.status = 'failed';
      stage.completedAt = new Date();

      return {
        taskId: stage.id,
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message,
          recoverable: true,
          timestamp: new Date(),
        },
        durationMs: 0,
        tokensUsed: 0,
        attempts: 1,
      };
    }
  }

  /**
   * Prepare input for a stage based on previous outputs
   */
  private prepareStageInput(workflow: Workflow, stage: WorkflowStage): any {
    const stageIndex = workflow.stages.indexOf(stage);
    
    if (stageIndex === 0) {
      return workflow.input;
    }

    // Collect outputs from previous stages
    const previousOutputs: Record<string, any> = {};
    for (let i = 0; i < stageIndex; i++) {
      const prevStage = workflow.stages[i];
      if (prevStage.output) {
        previousOutputs[prevStage.taskType] = prevStage.output;
      }
    }

    return {
      ...workflow.input,
      previousOutputs,
      context: workflow.context,
    };
  }

  /**
   * Collect final workflow output
   */
  private collectWorkflowOutput(workflow: Workflow): any {
    const outputs: Record<string, any> = {};
    for (const stage of workflow.stages) {
      if (stage.output) {
        outputs[stage.name] = stage.output;
      }
    }
    return outputs;
  }

  /**
   * Request human approval
   */
  private async requestApproval(
    workflow: Workflow,
    stage: WorkflowStage,
    assessment: CARSAssessment
  ): Promise<void> {
    await this.auditLogger.log({
      type: 'approval-requested',
      workflowId: workflow.id,
      taskId: stage.id,
      action: 'request-approval',
      details: {
        riskLevel: assessment.riskLevel,
        stage: stage.name,
        autonomyLevel: assessment.autonomyLevel,
      },
    });

    const request = await this.approvalGate.createRequest({
      taskId: stage.id,
      workflowId: workflow.id,
      type: 'workflow-stage',
      riskLevel: assessment.riskLevel,
      context: {
        summary: `Approval required for ${stage.name} in workflow ${workflow.name}`,
        details: {
          workflowType: workflow.type,
          stageIndex: workflow.currentStage,
          totalStages: workflow.stages.length,
          input: this.summarizeInput(stage.input),
          output: this.summarizeInput(stage.output),
        },
      },
      requiredApprovers: assessment.approvers || [],
    });

    // Wait for approval (in real implementation, this would be async)
    // For now, store the request ID for later resume
    workflow.context.variables['pendingApproval'] = request.id;
  }

  /**
   * Resume workflow after approval
   */
  async resumeWorkflow(workflowId: string, approved: boolean): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    await this.auditLogger.log({
      type: approved ? 'approval-granted' : 'approval-denied',
      workflowId: workflow.id,
      action: approved ? 'approved' : 'denied',
      details: {},
    });

    if (approved) {
      workflow.status = 'running';
      workflow.currentStage++;
      this.processWorkflow(workflowId);
    } else {
      workflow.status = 'cancelled';
      workflow.completedAt = new Date();
    }
  }

  /**
   * Attempt to repair a failed stage
   */
  private async attemptRepair(
    workflow: Workflow,
    stage: WorkflowStage,
    error: TaskError
  ): Promise<void> {
    await this.auditLogger.log({
      type: 'task-retried',
      workflowId: workflow.id,
      taskId: stage.id,
      action: 'repair-attempt',
      details: { error: error.message },
    });

    // Reset stage for retry
    stage.status = 'pending';
    stage.output = undefined;

    // Re-execute with repair context
    const repairInput = {
      ...stage.input,
      repairContext: {
        previousError: error,
        attemptNumber: (workflow.context.variables['repairAttempts'] || 0) + 1,
      },
    };

    workflow.context.variables['repairAttempts'] = 
      (workflow.context.variables['repairAttempts'] || 0) + 1;

    if (workflow.context.variables['repairAttempts'] > 3) {
      await this.escalate(workflow, stage, error);
      return;
    }

    stage.input = repairInput;
  }

  /**
   * Escalate to human
   */
  private async escalate(workflow: Workflow, stage: WorkflowStage, error: TaskError): Promise<void> {
    await this.auditLogger.log({
      type: 'escalation-triggered',
      workflowId: workflow.id,
      taskId: stage.id,
      action: 'escalate',
      details: { error: error.message, attempts: workflow.context.variables['repairAttempts'] },
    });

    workflow.status = 'waiting-approval';
    stage.status = 'escalated';
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  private summarizeInput(input: any): any {
    if (!input) return null;
    if (typeof input === 'string') return input.slice(0, 200);
    if (typeof input === 'object') {
      return JSON.stringify(input).slice(0, 500) + '...';
    }
    return input;
  }

  // ==========================================
  // GETTERS
  // ==========================================

  getId(): string {
    return this.id;
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  getWorkerStatus(): Map<AgentRole, AgentState> {
    const status = new Map<AgentRole, AgentState>();
    for (const [role, agent] of this.workers) {
      status.set(role, agent.getState());
    }
    return status;
  }
}

export default LeadAgent;
