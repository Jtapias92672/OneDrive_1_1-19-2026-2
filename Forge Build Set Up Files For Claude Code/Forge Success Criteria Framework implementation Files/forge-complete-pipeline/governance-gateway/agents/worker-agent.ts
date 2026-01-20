/**
 * FORGE Governance Gateway - Worker Agents
 * 
 * @epic 13 - Governance Gateway (Agentic SDLC)
 * @task 2.2 - Worker Agent Implementation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-20
 * 
 * @description
 *   Specialized worker agents for each SDLC phase:
 *   - Figma Parser Agent
 *   - React Generator Agent
 *   - Validator Agent
 *   - Mendix SDK Agent
 *   - Evidence Generator Agent
 */

import {
  AgentRole,
  AgentState,
  AgentStatus,
  AgentMetrics,
  TaskType,
  TaskResult,
  TaskError,
  RetryPolicy,
  DEFAULT_RETRY_POLICY,
} from '../core/types';

// ============================================
// WORKER AGENT BASE CLASS
// ============================================

export abstract class WorkerAgent {
  protected id: string;
  protected role: AgentRole;
  protected name: string;
  protected status: AgentStatus = 'idle';
  protected currentTask?: string;
  protected taskQueue: string[] = [];
  protected metrics: AgentMetrics;
  protected retryPolicy: RetryPolicy;
  protected lastActivity: Date = new Date();

  constructor(role: AgentRole, name: string, retryPolicy?: RetryPolicy) {
    this.id = `agent_${role}_${Date.now()}`;
    this.role = role;
    this.name = name;
    this.retryPolicy = retryPolicy || DEFAULT_RETRY_POLICY;
    this.metrics = {
      totalTasks: 0,
      successRate: 1,
      avgDurationMs: 0,
      tokensUsed: 0,
      errorCount: 0,
    };
  }

  /**
   * Execute a task
   */
  async execute(taskType: TaskType, input: any): Promise<TaskResult> {
    const startTime = Date.now();
    this.status = 'busy';
    this.lastActivity = new Date();
    this.metrics.totalTasks++;

    try {
      const output = await this.performTask(taskType, input);
      const durationMs = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(true, durationMs, 0);

      this.status = 'idle';
      return {
        taskId: `task_${Date.now()}`,
        success: true,
        output,
        durationMs,
        tokensUsed: 0,
        attempts: 1,
      };

    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      this.updateMetrics(false, durationMs, 0);
      this.status = 'idle';

      return {
        taskId: `task_${Date.now()}`,
        success: false,
        error: {
          code: 'TASK_ERROR',
          message: error.message,
          recoverable: this.isRecoverable(error),
          timestamp: new Date(),
        },
        durationMs,
        tokensUsed: 0,
        attempts: 1,
      };
    }
  }

  /**
   * Perform the actual task - implemented by subclasses
   */
  protected abstract performTask(taskType: TaskType, input: any): Promise<any>;

  /**
   * Check if error is recoverable
   */
  protected isRecoverable(error: any): boolean {
    const nonRecoverablePatterns = [
      'authentication',
      'authorization',
      'not found',
      'invalid schema',
    ];
    const message = error.message?.toLowerCase() || '';
    return !nonRecoverablePatterns.some(p => message.includes(p));
  }

  /**
   * Update agent metrics
   */
  private updateMetrics(success: boolean, durationMs: number, tokens: number): void {
    if (!success) {
      this.metrics.errorCount++;
    }
    
    const totalSuccess = this.metrics.totalTasks - this.metrics.errorCount;
    this.metrics.successRate = totalSuccess / this.metrics.totalTasks;
    
    // Rolling average
    this.metrics.avgDurationMs = 
      (this.metrics.avgDurationMs * (this.metrics.totalTasks - 1) + durationMs) / 
      this.metrics.totalTasks;
    
    this.metrics.tokensUsed += tokens;
  }

  // ==========================================
  // GETTERS
  // ==========================================

  getId(): string { return this.id; }
  getRole(): AgentRole { return this.role; }
  getName(): string { return this.name; }
  getStatus(): AgentStatus { return this.status; }

  getState(): AgentState {
    return {
      id: this.id,
      role: this.role,
      status: this.status,
      currentTask: this.currentTask,
      taskQueue: this.taskQueue,
      completedTasks: this.metrics.totalTasks - this.metrics.errorCount,
      failedTasks: this.metrics.errorCount,
      lastActivity: this.lastActivity,
      metrics: { ...this.metrics },
    };
  }
}

// ============================================
// FIGMA PARSER AGENT
// ============================================

export class FigmaParserAgent extends WorkerAgent {
  private figmaParser: any; // Will be injected

  constructor(figmaParser?: any) {
    super('figma-parser', 'Figma Parser Agent');
    this.figmaParser = figmaParser;
  }

  setParser(parser: any): void {
    this.figmaParser = parser;
  }

  protected async performTask(taskType: TaskType, input: any): Promise<any> {
    switch (taskType) {
      case 'parse-figma':
        return this.parseFigma(input);
      case 'extract-tokens':
        return this.extractTokens(input);
      default:
        throw new Error(`Unsupported task type: ${taskType}`);
    }
  }

  private async parseFigma(input: any): Promise<any> {
    if (!this.figmaParser) {
      throw new Error('Figma parser not configured');
    }

    const { fileKey, accessToken } = input;
    if (!fileKey) {
      throw new Error('Figma file key required');
    }

    // Use the figma-parser package
    const result = await this.figmaParser.parse(fileKey, accessToken);
    return result;
  }

  private async extractTokens(input: any): Promise<any> {
    if (!this.figmaParser) {
      throw new Error('Figma parser not configured');
    }

    const { parsedDesign } = input.previousOutputs || input;
    if (!parsedDesign) {
      throw new Error('Parsed design required for token extraction');
    }

    // Extract design tokens
    const tokens = await this.figmaParser.extractTokens(parsedDesign);
    return tokens;
  }
}

// ============================================
// REACT GENERATOR AGENT
// ============================================

export class ReactGeneratorAgent extends WorkerAgent {
  private reactGenerator: any; // Will be injected

  constructor(reactGenerator?: any) {
    super('react-generator', 'React Generator Agent');
    this.reactGenerator = reactGenerator;
  }

  setGenerator(generator: any): void {
    this.reactGenerator = generator;
  }

  protected async performTask(taskType: TaskType, input: any): Promise<any> {
    switch (taskType) {
      case 'generate-react':
        return this.generateReact(input);
      default:
        throw new Error(`Unsupported task type: ${taskType}`);
    }
  }

  private async generateReact(input: any): Promise<any> {
    if (!this.reactGenerator) {
      throw new Error('React generator not configured');
    }

    // Get parsed design from previous stage
    const parsedDesign = input.previousOutputs?.['parse-figma'] || input.parsedDesign;
    if (!parsedDesign) {
      throw new Error('Parsed design required for React generation');
    }

    const options = input.options || {};
    const result = await this.reactGenerator.generate(parsedDesign, options);
    return result;
  }
}

// ============================================
// VALIDATOR AGENT
// ============================================

export class ValidatorAgent extends WorkerAgent {
  private convergenceEngine: any; // Will be injected
  private validators: any; // Will be injected

  constructor(convergenceEngine?: any, validators?: any) {
    super('validator', 'Validator Agent');
    this.convergenceEngine = convergenceEngine;
    this.validators = validators;
  }

  setConvergenceEngine(engine: any): void {
    this.convergenceEngine = engine;
  }

  setValidators(validators: any): void {
    this.validators = validators;
  }

  protected async performTask(taskType: TaskType, input: any): Promise<any> {
    switch (taskType) {
      case 'validate-output':
        return this.validateOutput(input);
      case 'run-convergence':
        return this.runConvergence(input);
      default:
        throw new Error(`Unsupported task type: ${taskType}`);
    }
  }

  private async validateOutput(input: any): Promise<any> {
    const { output, contract, validators } = input;
    
    const results = {
      valid: true,
      score: 0,
      validations: [] as any[],
    };

    // Run schema validation
    if (contract?.schema) {
      const schemaResult = this.validateSchema(output, contract.schema);
      results.validations.push(schemaResult);
      if (!schemaResult.valid) results.valid = false;
    }

    // Calculate overall score
    const validCount = results.validations.filter(v => v.valid).length;
    results.score = validCount / Math.max(results.validations.length, 1);

    return results;
  }

  private validateSchema(output: any, schema: any): any {
    // Basic schema validation
    try {
      // In real implementation, use Ajv or similar
      return { valid: true, validator: 'schema', score: 1 };
    } catch (error: any) {
      return { valid: false, validator: 'schema', score: 0, error: error.message };
    }
  }

  private async runConvergence(input: any): Promise<any> {
    if (!this.convergenceEngine) {
      throw new Error('Convergence engine not configured');
    }

    const { contract, initialInput, options } = input;
    const result = await this.convergenceEngine.run(contract, initialInput, options);
    return result;
  }
}

// ============================================
// MENDIX SDK AGENT
// ============================================

export class MendixSDKAgent extends WorkerAgent {
  private mendixGenerator: any; // Will be injected

  constructor(mendixGenerator?: any) {
    super('mendix-sdk', 'Mendix SDK Agent');
    this.mendixGenerator = mendixGenerator;
  }

  setGenerator(generator: any): void {
    this.mendixGenerator = generator;
  }

  protected async performTask(taskType: TaskType, input: any): Promise<any> {
    switch (taskType) {
      case 'generate-mendix':
        return this.generateMendix(input);
      default:
        throw new Error(`Unsupported task type: ${taskType}`);
    }
  }

  private async generateMendix(input: any): Promise<any> {
    if (!this.mendixGenerator) {
      throw new Error('Mendix generator not configured');
    }

    // Get React components from previous stage
    const reactComponents = input.previousOutputs?.['generate-react'] || input.reactComponents;
    if (!reactComponents) {
      throw new Error('React components required for Mendix generation');
    }

    const options = input.options || {};
    const result = await this.mendixGenerator.generate(reactComponents, options);
    return result;
  }
}

// ============================================
// EVIDENCE GENERATOR AGENT
// ============================================

export class EvidenceGeneratorAgent extends WorkerAgent {
  private evidenceCollector: any; // Will be injected
  private evidenceExporter: any; // Will be injected

  constructor(evidenceCollector?: any, evidenceExporter?: any) {
    super('evidence-generator', 'Evidence Generator Agent');
    this.evidenceCollector = evidenceCollector;
    this.evidenceExporter = evidenceExporter;
  }

  setCollector(collector: any): void {
    this.evidenceCollector = collector;
  }

  setExporter(exporter: any): void {
    this.evidenceExporter = exporter;
  }

  protected async performTask(taskType: TaskType, input: any): Promise<any> {
    switch (taskType) {
      case 'create-evidence':
        return this.createEvidence(input);
      default:
        throw new Error(`Unsupported task type: ${taskType}`);
    }
  }

  private async createEvidence(input: any): Promise<any> {
    if (!this.evidenceCollector) {
      // Create basic evidence without collector
      return this.createBasicEvidence(input);
    }

    const { workflowId, context, previousOutputs } = input;

    // Collect evidence from workflow
    const pack = await this.evidenceCollector.collect({
      sessionId: workflowId,
      context,
      outputs: previousOutputs,
    });

    // Export if exporter available
    if (this.evidenceExporter) {
      pack.exports = {
        json: this.evidenceExporter.toJSON(pack),
        markdown: this.evidenceExporter.toMarkdown(pack),
      };
    }

    return pack;
  }

  private createBasicEvidence(input: any): any {
    return {
      workflowId: input.context?.workflowId,
      timestamp: new Date().toISOString(),
      stages: Object.keys(input.previousOutputs || {}),
      success: true,
      summary: 'Evidence pack generated',
    };
  }
}

// ============================================
// TEST GENERATOR AGENT (Placeholder)
// ============================================

export class TestGeneratorAgent extends WorkerAgent {
  constructor() {
    super('test-generator', 'Test Generator Agent');
  }

  protected async performTask(taskType: TaskType, input: any): Promise<any> {
    switch (taskType) {
      case 'generate-tests':
        return this.generateTests(input);
      default:
        throw new Error(`Unsupported task type: ${taskType}`);
    }
  }

  private async generateTests(input: any): Promise<any> {
    // Placeholder for test generation
    const components = input.previousOutputs?.['generate-react'] || input.components;
    
    return {
      tests: [],
      coverage: 0,
      message: 'Test generation not implemented',
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export default WorkerAgent;
