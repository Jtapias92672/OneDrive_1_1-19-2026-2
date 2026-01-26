/**
 * FORGE C Main Orchestrator
 * 
 * @epic 03 - FORGE C Core
 * @task 2.1 - Core Orchestrator
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   The central orchestration engine that coordinates LLM generation,
 *   validation, and iterative refinement until outputs satisfy contracts.
 */

import {
  ForgeCConfig,
  Session,
  SessionStatus,
  GenerationRequest,
  GenerationResult,
  CompletionRequest,
  CompletionResponse,
  Message,
  TokenUsage,
  ForgeEvent,
  ForgeEventHandler,
  ForgeEventType,
  DEFAULT_MODEL_PRICING,
  ModelPricing,
} from './types';

import { SessionManager } from './session';
import { LLMProvider, createProvider } from '../providers';
import { Plugin, PluginManager } from '../plugins';

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: Partial<ForgeCConfig> = {
  defaultModel: 'claude-sonnet-4-20250514',
  logging: {
    level: 'info',
    pretty: true,
    timestamps: true,
    destination: 'console',
  },
  convergence: {
    maxIterations: 10,
    targetScore: 0.95,
    timeoutMs: 300000, // 5 minutes
    strategy: 'hill-climbing',
  },
  budget: {
    maxApiCallsPerSession: 50,
    maxTokensPerSession: 100000,
    maxCostPerSession: 1.0, // $1
    maxConcurrentSessions: 10,
  },
};

// ============================================
// FORGE C CLASS
// ============================================

export class ForgeC {
  private config: ForgeCConfig;
  private providers = new Map<string, LLMProvider>();
  private defaultProvider: LLMProvider | null = null;
  private sessionManager: SessionManager;
  private pluginManager: PluginManager;
  private eventHandlers: ForgeEventHandler[] = [];
  private activeSessions = new Map<string, Session>();
  private modelPricing: ModelPricing[];

  constructor(config: ForgeCConfig) {
    this.config = this.mergeConfig(config);
    this.sessionManager = new SessionManager(this.config.sessionStorage);
    this.pluginManager = new PluginManager();
    this.modelPricing = DEFAULT_MODEL_PRICING;
    
    // Initialize providers
    this.initializeProviders();
    
    // Initialize plugins
    this.initializePlugins();
    
    this.log('info', 'ForgeC initialized', {
      providers: Array.from(this.providers.keys()),
      defaultProvider: this.config.defaultProvider,
    });
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  private mergeConfig(config: ForgeCConfig): ForgeCConfig {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      logging: { ...DEFAULT_CONFIG.logging, ...config.logging },
      convergence: { ...DEFAULT_CONFIG.convergence, ...config.convergence },
      budget: { ...DEFAULT_CONFIG.budget, ...config.budget },
    };
  }

  private initializeProviders(): void {
    for (const providerConfig of this.config.providers) {
      try {
        const provider = createProvider(providerConfig);
        this.providers.set(providerConfig.name, provider);
        
        // Set default provider
        if (!this.defaultProvider || providerConfig.name === this.config.defaultProvider) {
          this.defaultProvider = provider;
        }
        
        this.log('debug', `Provider initialized: ${providerConfig.name}`);
      } catch (error: any) {
        this.log('error', `Failed to initialize provider: ${providerConfig.name}`, { error: error.message });
      }
    }
    
    if (!this.defaultProvider && this.providers.size > 0) {
      this.defaultProvider = this.providers.values().next().value;
    }
  }

  private initializePlugins(): void {
    const plugins = this.config.plugins || [];
    
    for (const pluginConfig of plugins) {
      if (pluginConfig.enabled === false) continue;
      
      try {
        this.pluginManager.register(pluginConfig);
        this.log('debug', `Plugin registered: ${pluginConfig.name}`);
      } catch (error: any) {
        this.log('warn', `Failed to register plugin: ${pluginConfig.name}`, { error: error.message });
      }
    }
  }

  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================

  /**
   * Create a new generation session
   */
  async createSession(request: GenerationRequest): Promise<Session> {
    // Check concurrent sessions limit
    if (this.activeSessions.size >= (this.config.budget?.maxConcurrentSessions || 10)) {
      throw new Error('Maximum concurrent sessions reached');
    }
    
    // Get provider
    const providerName = request.provider || this.config.defaultProvider || 'anthropic';
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }
    
    // Create session
    const session = await this.sessionManager.create({
      contractId: typeof request.contract === 'string' ? request.contract : 'inline',
      input: request.input,
      provider: providerName,
      model: request.model || this.config.defaultModel || 'claude-sonnet-4-20250514',
      metadata: request.metadata || {},
    });
    
    this.activeSessions.set(session.id, session);
    
    // Emit event
    await this.emit({
      type: 'session:created',
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      data: { contractId: session.contractId },
    });
    
    // Notify plugins
    await this.pluginManager.trigger('session:created', {
      sessionId: session.id,
      timestamp: session.createdAt,
      data: session,
    });
    
    return session;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    // Check active sessions first
    if (this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId)!;
    }
    
    // Check storage
    return this.sessionManager.get(sessionId);
  }

  /**
   * List all sessions
   */
  async listSessions(options?: {
    status?: SessionStatus;
    limit?: number;
    offset?: number;
  }): Promise<Session[]> {
    return this.sessionManager.list(options);
  }

  /**
   * Abort a session
   */
  async abortSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      session.status = 'aborted';
      session.updatedAt = new Date().toISOString();
      await this.sessionManager.update(session);
      this.activeSessions.delete(sessionId);
      
      await this.emit({
        type: 'session:failed',
        sessionId,
        timestamp: new Date().toISOString(),
        data: { reason: 'aborted' },
      });
    }
  }

  // ==========================================
  // GENERATION
  // ==========================================

  /**
   * Run generation with convergence
   */
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    
    // Create session
    const session = await this.createSession(request);
    
    try {
      // Mark session as running
      session.status = 'running';
      session.updatedAt = new Date().toISOString();
      
      await this.emit({
        type: 'session:started',
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        data: {},
      });
      
      // Get provider
      const provider = this.providers.get(session.provider)!;
      
      // Get options
      const options = {
        ...this.config.convergence,
        ...request.options,
      };
      
      // Build initial prompt
      const messages = this.buildInitialMessages(request);
      
      let iteration = 0;
      let score = 0;
      let output: unknown = null;
      
      // Convergence loop
      while (iteration < (options.maxIterations || 10)) {
        iteration++;
        const iterationStart = Date.now();
        
        await this.emit({
          type: 'iteration:start',
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          data: { iteration },
        });
        
        // Check timeout
        if (Date.now() - startTime > (options.timeoutMs || 300000)) {
          session.status = 'failed';
          session.error = { code: 'TIMEOUT', message: 'Generation timeout' };
          break;
        }
        
        // Check budget
        if (!this.checkBudget(session)) {
          session.status = 'failed';
          session.error = { code: 'BUDGET_EXCEEDED', message: 'Budget limit exceeded' };
          break;
        }
        
        // Call LLM
        const completionRequest: CompletionRequest = {
          model: session.model,
          messages,
          maxTokens: 4096,
          temperature: 0.7,
        };
        
        await this.emit({
          type: 'llm:request',
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          data: { model: session.model, messageCount: messages.length },
        });
        
        await this.pluginManager.trigger('llm:request', {
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          data: completionRequest,
        });
        
        let response: CompletionResponse;
        try {
          response = await provider.complete(completionRequest);
        } catch (error: any) {
          this.log('error', `LLM call failed: ${error.message}`);
          session.status = 'failed';
          session.error = { code: 'LLM_ERROR', message: error.message };
          break;
        }
        
        await this.emit({
          type: 'llm:response',
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          data: { stopReason: response.stopReason, tokens: response.usage.total },
        });
        
        await this.pluginManager.trigger('llm:response', {
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          data: response,
        });
        
        // Update token usage
        session.tokenUsage.input += response.usage.input;
        session.tokenUsage.output += response.usage.output;
        session.tokenUsage.total += response.usage.total;
        
        // Update cost
        session.cost += this.calculateCost(session.model, response.usage);
        
        // Parse response
        try {
          output = this.parseResponse(response.content);
        } catch (error: any) {
          this.log('warn', `Failed to parse response: ${error.message}`);
          output = response.content;
        }
        
        // Validate (if not skipped)
        if (!options.skipValidation) {
          await this.emit({
            type: 'validation:start',
            sessionId: session.id,
            timestamp: new Date().toISOString(),
            data: { iteration },
          });
          
          // TODO: Integrate with convergence engine validators
          // For now, use a placeholder score
          score = this.estimateScore(output, request.contract);
          
          await this.emit({
            type: 'validation:complete',
            sessionId: session.id,
            timestamp: new Date().toISOString(),
            data: { iteration, score },
          });
        } else {
          score = 1.0; // Skip validation means success
        }
        
        // Record iteration
        session.iterations.push({
          number: iteration,
          response: response.content,
          output,
          score,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - iterationStart,
          tokensUsed: response.usage.total,
        });
        
        await this.emit({
          type: 'iteration:complete',
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          data: { iteration, score },
        });
        
        await this.pluginManager.trigger('iteration:complete', {
          sessionId: session.id,
          iteration,
          timestamp: new Date().toISOString(),
          data: { score, output },
        });
        
        // Check if converged
        if (score >= (options.targetScore || 0.95)) {
          session.status = 'completed';
          session.output = output;
          break;
        }
        
        // Add feedback to messages for next iteration
        const feedback = this.generateFeedback(output, score);
        messages.push({
          role: 'user',
          content: feedback,
        });
      }
      
      // Finalize session
      session.updatedAt = new Date().toISOString();
      session.completedAt = new Date().toISOString();
      session.output = output;
      
      if (session.status === 'running') {
        // Max iterations reached without convergence
        session.status = 'failed';
        session.error = { code: 'MAX_ITERATIONS', message: 'Maximum iterations reached' };
      }
      
      await this.sessionManager.update(session);
      this.activeSessions.delete(session.id);
      
      // Emit completion event
      const eventType = session.status === 'completed' ? 'session:completed' : 'session:failed';
      await this.emit({
        type: eventType,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        data: { status: session.status, score },
      });
      
      await this.pluginManager.trigger(eventType, {
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        data: session,
      });
      
      return {
        sessionId: session.id,
        status: session.status === 'completed' ? 'success' : 'failed',
        output: session.output,
        iterations: session.iterations.length,
        score,
        durationMs: Date.now() - startTime,
        tokenUsage: session.tokenUsage,
        cost: session.cost,
        error: session.error,
      };
      
    } catch (error: any) {
      session.status = 'failed';
      session.error = { code: 'UNEXPECTED_ERROR', message: error.message, stack: error.stack };
      session.updatedAt = new Date().toISOString();
      
      await this.sessionManager.update(session);
      this.activeSessions.delete(session.id);
      
      await this.emit({
        type: 'error',
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        data: { error: error.message },
      });
      
      throw error;
    }
  }

  /**
   * Simple completion without convergence
   */
  async complete(request: CompletionRequest, providerName?: string): Promise<CompletionResponse> {
    const provider = providerName 
      ? this.providers.get(providerName) 
      : this.defaultProvider;
    
    if (!provider) {
      throw new Error('No provider available');
    }
    
    return provider.complete(request);
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private buildInitialMessages(request: GenerationRequest): Message[] {
    const messages: Message[] = [];
    
    // Build system prompt
    let systemPrompt = 'You are a precise code generator.';
    
    if (typeof request.contract === 'object') {
      systemPrompt += '\n\nGenerate output according to this contract:\n';
      systemPrompt += JSON.stringify(request.contract, null, 2);
    }
    
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
    
    // Add user request
    messages.push({
      role: 'user',
      content: typeof request.input === 'string' 
        ? request.input 
        : JSON.stringify(request.input, null, 2),
    });
    
    return messages;
  }

  private parseResponse(content: string): unknown {
    // Try to extract JSON from response
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try direct JSON parse
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }

  private estimateScore(output: unknown, contract: string | object): number {
    // Placeholder scoring - real implementation uses convergence engine validators
    if (output === null || output === undefined) return 0;
    if (typeof output === 'string' && output.length < 10) return 0.3;
    if (typeof output === 'object') return 0.8;
    return 0.5;
  }

  private generateFeedback(output: unknown, score: number): string {
    if (score >= 0.95) {
      return 'Output looks good. Please confirm or make any final adjustments.';
    }
    
    if (score < 0.5) {
      return 'The output needs significant improvement. Please review the contract requirements and try again.';
    }
    
    return `Current score: ${(score * 100).toFixed(1)}%. Please improve the output to better match the contract requirements.`;
  }

  private checkBudget(session: Session): boolean {
    const budget = this.config.budget!;
    
    if (budget.maxTokensPerSession && session.tokenUsage.total >= budget.maxTokensPerSession) {
      this.emit({
        type: 'budget:exceeded',
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        data: { type: 'tokens', limit: budget.maxTokensPerSession, current: session.tokenUsage.total },
      });
      return false;
    }
    
    if (budget.maxCostPerSession && session.cost >= budget.maxCostPerSession) {
      this.emit({
        type: 'budget:exceeded',
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        data: { type: 'cost', limit: budget.maxCostPerSession, current: session.cost },
      });
      return false;
    }
    
    // Warn at 80%
    if (budget.maxCostPerSession && session.cost >= budget.maxCostPerSession * 0.8) {
      this.emit({
        type: 'budget:warning',
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        data: { type: 'cost', limit: budget.maxCostPerSession, current: session.cost },
      });
    }
    
    return true;
  }

  private calculateCost(model: string, usage: TokenUsage): number {
    const pricing = this.modelPricing.find(p => p.model === model);
    
    if (!pricing) {
      // Default pricing
      return (usage.input * 0.003 + usage.output * 0.015) / 1000;
    }
    
    return (usage.input * pricing.inputCostPer1K + usage.output * pricing.outputCostPer1K) / 1000;
  }

  // ==========================================
  // EVENTS
  // ==========================================

  private async emit(event: ForgeEvent): Promise<void> {
    for (const handler of this.eventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        this.log('error', `Event handler error: ${error}`);
      }
    }
  }

  addEventListener(handler: ForgeEventHandler): void {
    this.eventHandlers.push(handler);
  }

  removeEventListener(handler: ForgeEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index >= 0) {
      this.eventHandlers.splice(index, 1);
    }
  }

  // ==========================================
  // PLUGIN MANAGEMENT
  // ==========================================

  use(plugin: Plugin): this {
    this.pluginManager.add(plugin);
    return this;
  }

  // ==========================================
  // PROVIDER MANAGEMENT
  // ==========================================

  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  getDefaultProvider(): LLMProvider | null {
    return this.defaultProvider;
  }

  // ==========================================
  // LOGGING
  // ==========================================

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    const config = this.config.logging!;
    const levels = ['debug', 'info', 'warn', 'error'];
    
    if (levels.indexOf(level) < levels.indexOf(config.level)) {
      return;
    }
    
    const timestamp = config.timestamps ? new Date().toISOString() : '';
    const prefix = timestamp ? `[${timestamp}] ` : '';
    
    const logFn = console[level] || console.log;
    
    if (config.pretty) {
      logFn(`${prefix}[ForgeC] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    } else {
      logFn(`${prefix}[ForgeC] ${message}`, data || '');
    }
  }
}

// ============================================
// FACTORY
// ============================================

let defaultForgeC: ForgeC | null = null;

export function createForgeC(config: ForgeCConfig): ForgeC {
  return new ForgeC(config);
}

export function getDefaultForgeC(): ForgeC {
  if (!defaultForgeC) {
    throw new Error('Default ForgeC not initialized. Call createForgeC first.');
  }
  return defaultForgeC;
}

export function setDefaultForgeC(forge: ForgeC): void {
  defaultForgeC = forge;
}

// ============================================
// EXPORTS
// ============================================

export default ForgeC;
