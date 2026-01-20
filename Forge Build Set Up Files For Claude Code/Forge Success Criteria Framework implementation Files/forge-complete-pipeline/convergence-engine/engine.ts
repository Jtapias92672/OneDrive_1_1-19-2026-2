/**
 * FORGE Convergence Engine
 * 
 * @epic 04 - Convergence Engine
 * @task 2.1 - Core Engine
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   The core convergence engine that orchestrates iterative validation
 *   and repair loops to ensure AI outputs meet contract specifications.
 * 
 *   Governing Principle:
 *   Success = (P(Right) × V(Right)) ÷ C(Wrong)
 */

import {
  ConvergenceStatus,
  ConvergenceConfig,
  ConvergenceSession,
  ConvergenceResult,
  ConvergenceMetrics,
  ConvergenceFeedback,
  ConvergenceEngineOptions,
  ConvergenceEvent,
  ConvergenceEventHandler,
  IterationResult,
  ValidationResult,
  RepairAction,
  StoppingPolicyResult,
  DEFAULT_CONVERGENCE_CONFIG,
  ValidatorFactory,
} from './types';

import { ConvergenceStrategy, StrategyFactory } from './strategies/strategy';
import { StoppingPolicy } from './runner/stopping-policy';
import { FeedbackGenerator } from './feedback/feedback-generator';
import { MetricsCollector } from './metrics/metrics-collector';

// ============================================
// CONVERGENCE ENGINE
// ============================================

export class ConvergenceEngine {
  private options: ConvergenceEngineOptions;
  private sessions = new Map<string, ConvergenceSession>();
  private validators = new Map<string, ValidatorFactory>();
  private eventHandlers: ConvergenceEventHandler[] = [];
  private metricsCollector: MetricsCollector;
  private feedbackGenerator: FeedbackGenerator;

  constructor(options: ConvergenceEngineOptions = {}) {
    this.options = options;
    this.metricsCollector = new MetricsCollector();
    this.feedbackGenerator = new FeedbackGenerator();
    
    // Register custom validators
    if (options.customValidators) {
      for (const [id, factory] of options.customValidators) {
        this.validators.set(id, factory);
      }
    }
    
    // Register event handler
    if (options.onEvent) {
      this.eventHandlers.push(options.onEvent);
    }
  }

  // ==========================================
  // MAIN CONVERGENCE LOOP
  // ==========================================

  /**
   * Run convergence loop on an output
   */
  async converge(
    output: unknown,
    contractId: string,
    validators: Array<{
      id: string;
      type: string;
      config: unknown;
      validate: (output: unknown) => Promise<ValidationResult>;
    }>,
    config: Partial<ConvergenceConfig> = {}
  ): Promise<ConvergenceResult> {
    const fullConfig: ConvergenceConfig = {
      ...DEFAULT_CONVERGENCE_CONFIG,
      ...this.options.defaultConfig,
      ...config,
    };
    
    // Create session
    const session = this.createSession(output, contractId, fullConfig);
    
    // Get strategy
    const strategy = StrategyFactory.create(fullConfig.strategy, fullConfig.strategyOptions);
    
    // Stopping policy
    const stoppingPolicy = new StoppingPolicy(fullConfig);
    
    // Emit start event
    await this.emit({
      type: 'session:start',
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      data: { contractId, config: fullConfig },
    });
    
    // Start timing
    const startTime = Date.now();
    let currentOutput = output;
    let previousScore = 0;
    
    try {
      // Main convergence loop
      while (true) {
        const iterationNumber = session.iterations.length;
        
        // Check stopping conditions before iteration
        const stopCheck = stoppingPolicy.evaluate(session, previousScore);
        if (stopCheck.shouldStop) {
          session.status = stopCheck.finalStatus;
          this.log('info', `Stopping: ${stopCheck.reason}`);
          break;
        }
        
        // Emit iteration start
        await this.emit({
          type: 'iteration:start',
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          data: { iteration: iterationNumber },
        });
        
        // Run all validators
        const iterationStart = Date.now();
        const validations = await this.runValidators(
          currentOutput,
          validators,
          session.id
        );
        
        // Calculate score
        const score = this.calculateScore(validations);
        const scoreDelta = score - previousScore;
        
        // Create iteration result
        const iterationResult: IterationResult = {
          iteration: iterationNumber,
          validations,
          allPassed: validations.every(v => v.passed),
          score,
          scoreDelta,
          output: currentOutput,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - iterationStart,
        };
        
        session.iterations.push(iterationResult);
        session.output = currentOutput;
        
        // Track metrics
        this.metricsCollector.trackIteration(session.id, iterationResult);
        
        // Emit iteration end
        await this.emit({
          type: 'iteration:end',
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          data: iterationResult,
        });
        
        // Check if converged
        if (iterationResult.allPassed && score >= fullConfig.targetScore) {
          session.status = 'converged';
          this.log('info', `Converged at iteration ${iterationNumber} with score ${score}`);
          break;
        }
        
        // Generate repair actions if not converged
        if (fullConfig.enableRepairSuggestions) {
          const actions = strategy.generateRepairActions(
            iterationResult,
            session.iterations
          );
          
          // Emit repair suggestions
          for (const action of actions) {
            await this.emit({
              type: 'repair:suggested',
              sessionId: session.id,
              timestamp: new Date().toISOString(),
              data: action,
            });
          }
          
          // Apply repairs (if we have an LLM client or simple fixes)
          currentOutput = await this.applyRepairs(
            currentOutput,
            actions,
            session.id
          );
        }
        
        previousScore = score;
        
        // Check timeout
        if (fullConfig.timeoutMs > 0 && Date.now() - startTime > fullConfig.timeoutMs) {
          session.status = 'timeout';
          this.log('warn', `Session timeout after ${fullConfig.timeoutMs}ms`);
          break;
        }
      }
    } catch (error: any) {
      session.status = 'aborted';
      this.log('error', `Session aborted: ${error.message}`);
      
      await this.emit({
        type: 'error',
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        data: { error: error.message },
      });
    }
    
    // Finalize session
    session.endedAt = new Date().toISOString();
    session.totalDurationMs = Date.now() - startTime;
    
    // Generate final feedback
    const feedback = this.feedbackGenerator.generate(session);
    session.finalFeedback = feedback;
    
    // Collect metrics
    const metrics = this.metricsCollector.finalize(session);
    
    // Emit end event
    await this.emit({
      type: 'session:end',
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      data: { status: session.status, metrics },
    });
    
    return {
      success: session.status === 'converged',
      session,
      metrics,
      output: session.output,
      feedback,
    };
  }

  // ==========================================
  // VALIDATION
  // ==========================================

  private async runValidators(
    output: unknown,
    validators: Array<{
      id: string;
      type: string;
      config: unknown;
      validate: (output: unknown) => Promise<ValidationResult>;
    }>,
    sessionId: string
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    for (const validator of validators) {
      await this.emit({
        type: 'validation:start',
        sessionId,
        timestamp: new Date().toISOString(),
        data: { validatorId: validator.id, validatorType: validator.type },
      });
      
      const startTime = Date.now();
      
      try {
        const result = await validator.validate(output);
        result.validatorId = validator.id;
        result.validatorType = validator.type;
        result.durationMs = Date.now() - startTime;
        results.push(result);
      } catch (error: any) {
        // Create failed result on error
        results.push({
          validatorId: validator.id,
          validatorType: validator.type,
          passed: false,
          confidence: 0,
          errors: [{
            code: 'VALIDATOR_ERROR',
            message: error.message,
            severity: 'critical',
          }],
          warnings: [],
          durationMs: Date.now() - startTime,
        });
      }
      
      await this.emit({
        type: 'validation:end',
        sessionId,
        timestamp: new Date().toISOString(),
        data: results[results.length - 1],
      });
    }
    
    return results;
  }

  // ==========================================
  // SCORING
  // ==========================================

  private calculateScore(validations: ValidationResult[]): number {
    if (validations.length === 0) return 0;
    
    // Weighted average based on confidence
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const v of validations) {
      const weight = v.confidence > 0 ? v.confidence : 0.5;
      const score = v.passed ? 1 : 0;
      weightedSum += score * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  // ==========================================
  // REPAIR
  // ==========================================

  private async applyRepairs(
    output: unknown,
    actions: RepairAction[],
    sessionId: string
  ): Promise<unknown> {
    if (actions.length === 0) return output;
    
    let result = JSON.parse(JSON.stringify(output)); // Deep clone
    
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'modify':
            if (action.targetPath && action.suggestedValue !== undefined) {
              result = this.setValueAtPath(result, action.targetPath, action.suggestedValue);
              
              await this.emit({
                type: 'repair:applied',
                sessionId,
                timestamp: new Date().toISOString(),
                data: { action, success: true },
              });
            }
            break;
            
          case 'regenerate':
            if (this.options.llmClient && action.regenerationPrompt) {
              const newValue = await this.options.llmClient.complete(action.regenerationPrompt);
              if (action.targetPath) {
                result = this.setValueAtPath(result, action.targetPath, newValue);
              }
              
              await this.emit({
                type: 'repair:applied',
                sessionId,
                timestamp: new Date().toISOString(),
                data: { action, success: true },
              });
            }
            break;
            
          case 'augment':
            // Augmentation requires additional context/data
            this.log('debug', `Augment action skipped (not implemented): ${action.id}`);
            break;
            
          case 'manual':
            // Manual actions are for human review
            this.log('debug', `Manual action logged: ${action.id}`);
            break;
        }
      } catch (error: any) {
        this.log('warn', `Failed to apply repair action ${action.id}: ${error.message}`);
        
        await this.emit({
          type: 'repair:applied',
          sessionId,
          timestamp: new Date().toISOString(),
          data: { action, success: false, error: error.message },
        });
      }
    }
    
    return result;
  }

  private setValueAtPath(obj: any, path: string, value: unknown): any {
    const parts = path.split('.');
    const result = JSON.parse(JSON.stringify(obj));
    let current = result;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
    return result;
  }

  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================

  private createSession(
    output: unknown,
    contractId: string,
    config: ConvergenceConfig
  ): ConvergenceSession {
    const session: ConvergenceSession = {
      id: this.generateId(),
      contractId,
      status: 'running',
      iterations: [],
      output,
      initialOutput: JSON.parse(JSON.stringify(output)),
      config,
      startedAt: new Date().toISOString(),
    };
    
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string): ConvergenceSession | undefined {
    return this.sessions.get(id);
  }

  listSessions(): ConvergenceSession[] {
    return Array.from(this.sessions.values());
  }

  // ==========================================
  // EVENTS
  // ==========================================

  private async emit(event: ConvergenceEvent): Promise<void> {
    for (const handler of this.eventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        this.log('error', `Event handler error: ${error}`);
      }
    }
  }

  addEventListener(handler: ConvergenceEventHandler): void {
    this.eventHandlers.push(handler);
  }

  removeEventListener(handler: ConvergenceEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index >= 0) {
      this.eventHandlers.splice(index, 1);
    }
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  private generateId(): string {
    return `cvg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void {
    const logger = this.options.logger || console;
    logger[level](`[ConvergenceEngine] ${message}`, ...args);
  }

  // ==========================================
  // VALIDATOR REGISTRATION
  // ==========================================

  registerValidator(id: string, factory: ValidatorFactory): void {
    this.validators.set(id, factory);
  }

  getValidator(id: string): ValidatorFactory | undefined {
    return this.validators.get(id);
  }
}

// ============================================
// FACTORY
// ============================================

let defaultEngine: ConvergenceEngine | null = null;

export function createConvergenceEngine(options?: ConvergenceEngineOptions): ConvergenceEngine {
  return new ConvergenceEngine(options);
}

export function getDefaultEngine(): ConvergenceEngine {
  if (!defaultEngine) {
    defaultEngine = new ConvergenceEngine();
  }
  return defaultEngine;
}

// ============================================
// EXPORTS
// ============================================

export default ConvergenceEngine;
