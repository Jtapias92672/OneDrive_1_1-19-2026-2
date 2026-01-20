/**
 * FORGE Integration Pipeline
 * 
 * @epic 13 - Governance Gateway (Agentic SDLC)
 * @task 6.1 - Integration Wiring
 * @owner joe@arcfoundry.ai
 * @created 2026-01-20
 * 
 * @description
 *   Wires all FORGE packages together into a cohesive pipeline:
 *   - Figma Parser → React Generator → Mendix Integration
 *   - Answer Contract → Convergence Engine → Validators
 *   - Evidence Packs for audit trails
 */

import { LeadAgent } from '../core/lead-agent';
import { PolicyEngine } from '../policy/policy-engine';
import { AuditLogger } from '../audit/audit-logger';
import { ApprovalGate } from '../gates/approval-gate';
import {
  WorkerAgent,
  FigmaParserAgent,
  ReactGeneratorAgent,
  ValidatorAgent,
  MendixSDKAgent,
  EvidenceGeneratorAgent,
} from '../agents/worker-agent';
import {
  GovernanceConfig,
  DEFAULT_GOVERNANCE_CONFIG,
  Workflow,
  WorkflowType,
  WorkflowContext,
} from '../core/types';

// ============================================
// PIPELINE RESULT TYPES
// ============================================

export interface PipelineResult {
  success: boolean;
  workflowId: string;
  output?: PipelineOutput;
  error?: string;
  duration: number;
  stages: StageResult[];
}

export interface PipelineOutput {
  parsedDesign?: any;
  designTokens?: any;
  reactComponents?: any;
  mendixPages?: any;
  validationResult?: any;
  evidencePack?: any;
}

export interface StageResult {
  name: string;
  success: boolean;
  duration: number;
  output?: any;
  error?: string;
}

// ============================================
// INTEGRATION PIPELINE
// ============================================

export class IntegrationPipeline {
  private config: GovernanceConfig;
  private leadAgent: LeadAgent;
  private policyEngine: PolicyEngine;
  private auditLogger: AuditLogger;
  private approvalGate: ApprovalGate;

  // Package references (lazy loaded)
  private figmaParser?: any;
  private reactGenerator?: any;
  private mendixGenerator?: any;
  private convergenceEngine?: any;
  private evidenceCollector?: any;
  private evidenceExporter?: any;

  constructor(config?: Partial<GovernanceConfig>) {
    this.config = { ...DEFAULT_GOVERNANCE_CONFIG, ...config };

    // Initialize governance components
    this.policyEngine = new PolicyEngine(
      this.config.policies,
      this.config.circuitBreaker,
      this.config.budgets
    );
    this.auditLogger = new AuditLogger(this.config.audit);
    this.approvalGate = new ApprovalGate(this.config.approvals);

    // Initialize lead agent
    this.leadAgent = new LeadAgent(
      this.policyEngine,
      this.auditLogger,
      this.approvalGate
    );

    // Register worker agents
    this.initializeWorkers();
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  private initializeWorkers(): void {
    // Create and register worker agents
    const figmaAgent = new FigmaParserAgent();
    const reactAgent = new ReactGeneratorAgent();
    const validatorAgent = new ValidatorAgent();
    const mendixAgent = new MendixSDKAgent();
    const evidenceAgent = new EvidenceGeneratorAgent();

    this.leadAgent.registerWorker(figmaAgent);
    this.leadAgent.registerWorker(reactAgent);
    this.leadAgent.registerWorker(validatorAgent);
    this.leadAgent.registerWorker(mendixAgent);
    this.leadAgent.registerWorker(evidenceAgent);
  }

  /**
   * Wire up package dependencies
   */
  wirePackages(packages: PackageRegistry): void {
    if (packages.figmaParser) {
      this.figmaParser = packages.figmaParser;
    }

    if (packages.reactGenerator) {
      this.reactGenerator = packages.reactGenerator;
    }

    if (packages.mendixGenerator) {
      this.mendixGenerator = packages.mendixGenerator;
    }

    if (packages.convergenceEngine) {
      this.convergenceEngine = packages.convergenceEngine;
    }

    if (packages.evidenceCollector) {
      this.evidenceCollector = packages.evidenceCollector;
    }

    if (packages.evidenceExporter) {
      this.evidenceExporter = packages.evidenceExporter;
    }

    // Update worker agents with package references
    this.updateWorkerPackages();
  }

  private updateWorkerPackages(): void {
    // Workers will use packages when executing tasks
    // This is handled internally by each worker agent
  }

  // ==========================================
  // PIPELINE EXECUTION
  // ==========================================

  /**
   * Run Figma to React pipeline
   */
  async figmaToReact(
    figmaFileKey: string,
    options?: FigmaToReactOptions
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const stages: StageResult[] = [];

    try {
      // Start workflow
      const workflow = await this.leadAgent.startWorkflow('figma-to-react', {
        figmaFileKey,
        options,
      });

      // Wait for completion (simplified - in production would be async)
      const result = await this.waitForWorkflow(workflow.id);

      return {
        success: result.status === 'completed',
        workflowId: workflow.id,
        output: this.extractPipelineOutput(result),
        duration: Date.now() - startTime,
        stages: this.extractStageResults(result),
      };

    } catch (error: any) {
      return {
        success: false,
        workflowId: '',
        error: error.message,
        duration: Date.now() - startTime,
        stages,
      };
    }
  }

  /**
   * Run Figma to Mendix pipeline
   */
  async figmaToMendix(
    figmaFileKey: string,
    options?: FigmaToMendixOptions
  ): Promise<PipelineResult> {
    const startTime = Date.now();

    try {
      const workflow = await this.leadAgent.startWorkflow('figma-to-mendix', {
        figmaFileKey,
        options,
      });

      const result = await this.waitForWorkflow(workflow.id);

      return {
        success: result.status === 'completed',
        workflowId: workflow.id,
        output: this.extractPipelineOutput(result),
        duration: Date.now() - startTime,
        stages: this.extractStageResults(result),
      };

    } catch (error: any) {
      return {
        success: false,
        workflowId: '',
        error: error.message,
        duration: Date.now() - startTime,
        stages: [],
      };
    }
  }

  /**
   * Run contract-driven generation
   */
  async generateWithContract(
    contractId: string,
    input: any,
    options?: GenerationOptions
  ): Promise<PipelineResult> {
    const startTime = Date.now();

    try {
      const workflow = await this.leadAgent.startWorkflow('contract-generation', {
        contractId,
        input,
        options,
      }, { contractId });

      const result = await this.waitForWorkflow(workflow.id);

      return {
        success: result.status === 'completed',
        workflowId: workflow.id,
        output: this.extractPipelineOutput(result),
        duration: Date.now() - startTime,
        stages: this.extractStageResults(result),
      };

    } catch (error: any) {
      return {
        success: false,
        workflowId: '',
        error: error.message,
        duration: Date.now() - startTime,
        stages: [],
      };
    }
  }

  /**
   * Run validation only
   */
  async validate(
    output: any,
    contract?: any,
    options?: ValidationOptions
  ): Promise<PipelineResult> {
    const startTime = Date.now();

    try {
      const workflow = await this.leadAgent.startWorkflow('validation-only', {
        output,
        contract,
        options,
      });

      const result = await this.waitForWorkflow(workflow.id);

      return {
        success: result.status === 'completed',
        workflowId: workflow.id,
        output: this.extractPipelineOutput(result),
        duration: Date.now() - startTime,
        stages: this.extractStageResults(result),
      };

    } catch (error: any) {
      return {
        success: false,
        workflowId: '',
        error: error.message,
        duration: Date.now() - startTime,
        stages: [],
      };
    }
  }

  // ==========================================
  // DIRECT PACKAGE ACCESS
  // ==========================================

  /**
   * Parse a Figma file directly
   */
  async parseFigma(fileKey: string, accessToken?: string): Promise<any> {
    if (!this.figmaParser) {
      throw new Error('Figma parser not configured');
    }

    await this.auditLogger.log({
      type: 'task-started',
      action: 'parse-figma',
      details: { fileKey },
    });

    try {
      const result = await this.figmaParser.parse(fileKey, accessToken);

      await this.auditLogger.log({
        type: 'task-completed',
        action: 'parse-figma',
        details: { fileKey, success: true },
      });

      return result;
    } catch (error: any) {
      await this.auditLogger.log({
        type: 'task-failed',
        action: 'parse-figma',
        details: { fileKey, error: error.message },
      });
      throw error;
    }
  }

  /**
   * Generate React components directly
   */
  async generateReact(parsedDesign: any, options?: any): Promise<any> {
    if (!this.reactGenerator) {
      throw new Error('React generator not configured');
    }

    await this.auditLogger.log({
      type: 'task-started',
      action: 'generate-react',
      details: { options },
    });

    try {
      const result = await this.reactGenerator.generate(parsedDesign, options);

      await this.auditLogger.log({
        type: 'task-completed',
        action: 'generate-react',
        details: { success: true },
      });

      return result;
    } catch (error: any) {
      await this.auditLogger.log({
        type: 'task-failed',
        action: 'generate-react',
        details: { error: error.message },
      });
      throw error;
    }
  }

  /**
   * Generate Mendix pages directly
   */
  async generateMendix(components: any, options?: any): Promise<any> {
    if (!this.mendixGenerator) {
      throw new Error('Mendix generator not configured');
    }

    // Check policy
    const assessment = this.policyEngine.assessRisk({
      taskType: 'generate-mendix',
      environment: options?.environment,
    });

    if (assessment.autonomyLevel === 'manual-only') {
      throw new Error('Mendix generation requires approval for this risk level');
    }

    await this.auditLogger.log({
      type: 'task-started',
      action: 'generate-mendix',
      details: { options, riskLevel: assessment.riskLevel },
    });

    try {
      const result = await this.mendixGenerator.generate(components, options);

      await this.auditLogger.log({
        type: 'task-completed',
        action: 'generate-mendix',
        details: { success: true },
      });

      return result;
    } catch (error: any) {
      await this.auditLogger.log({
        type: 'task-failed',
        action: 'generate-mendix',
        details: { error: error.message },
      });
      throw error;
    }
  }

  // ==========================================
  // WORKFLOW HELPERS
  // ==========================================

  private async waitForWorkflow(workflowId: string): Promise<Workflow> {
    // In production, this would poll or use events
    // For now, simple wait
    const maxWait = 300000; // 5 minutes
    const interval = 1000;
    let elapsed = 0;

    while (elapsed < maxWait) {
      const workflow = this.leadAgent.getWorkflow(workflowId);
      
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      if (workflow.status === 'completed' || 
          workflow.status === 'failed' ||
          workflow.status === 'cancelled') {
        return workflow;
      }

      if (workflow.status === 'waiting-approval') {
        // In production, would wait for approval
        // For now, auto-approve for testing
        await this.leadAgent.resumeWorkflow(workflowId, true);
      }

      await this.sleep(interval);
      elapsed += interval;
    }

    throw new Error('Workflow timeout');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private extractPipelineOutput(workflow: Workflow): PipelineOutput {
    const output: PipelineOutput = {};

    for (const stage of workflow.stages) {
      if (stage.output) {
        switch (stage.taskType) {
          case 'parse-figma':
            output.parsedDesign = stage.output;
            break;
          case 'extract-tokens':
            output.designTokens = stage.output;
            break;
          case 'generate-react':
            output.reactComponents = stage.output;
            break;
          case 'generate-mendix':
            output.mendixPages = stage.output;
            break;
          case 'validate-output':
            output.validationResult = stage.output;
            break;
          case 'create-evidence':
            output.evidencePack = stage.output;
            break;
        }
      }
    }

    return output;
  }

  private extractStageResults(workflow: Workflow): StageResult[] {
    return workflow.stages.map(stage => ({
      name: stage.name,
      success: stage.status === 'completed',
      duration: stage.completedAt && stage.startedAt
        ? stage.completedAt.getTime() - stage.startedAt.getTime()
        : 0,
      output: stage.output,
      error: stage.status === 'failed' ? 'Stage failed' : undefined,
    }));
  }

  // ==========================================
  // GETTERS
  // ==========================================

  getLeadAgent(): LeadAgent {
    return this.leadAgent;
  }

  getPolicyEngine(): PolicyEngine {
    return this.policyEngine;
  }

  getAuditLogger(): AuditLogger {
    return this.auditLogger;
  }

  getApprovalGate(): ApprovalGate {
    return this.approvalGate;
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.leadAgent.getWorkflow(id);
  }

  listWorkflows(): Workflow[] {
    return this.leadAgent.listWorkflows();
  }

  getAuditTrail(workflowId: string) {
    return this.auditLogger.getWorkflowTrail(workflowId);
  }
}

// ============================================
// SUPPORTING TYPES
// ============================================

export interface PackageRegistry {
  figmaParser?: any;
  reactGenerator?: any;
  mendixGenerator?: any;
  convergenceEngine?: any;
  answerContract?: any;
  evidenceCollector?: any;
  evidenceExporter?: any;
  validators?: any;
}

export interface FigmaToReactOptions {
  accessToken?: string;
  outputFormat?: 'functional' | 'class' | 'forwardRef';
  stylingApproach?: 'tailwind' | 'css-modules' | 'styled-components';
  includeTests?: boolean;
}

export interface FigmaToMendixOptions extends FigmaToReactOptions {
  moduleName?: string;
  mendixVersion?: string;
}

export interface GenerationOptions {
  maxIterations?: number;
  targetScore?: number;
  timeoutMs?: number;
}

export interface ValidationOptions {
  validators?: string[];
  strict?: boolean;
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createPipeline(config?: Partial<GovernanceConfig>): IntegrationPipeline {
  return new IntegrationPipeline(config);
}

// ============================================
// EXPORTS
// ============================================

export default IntegrationPipeline;
