/**
 * FORGE C Plugin System
 * 
 * @epic 03 - FORGE C Core
 * @task 5.1 - Plugin Architecture
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Extensible plugin system for ForgeC with built-in plugins
 *   for logging, metrics, and evidence collection.
 */

import {
  PluginConfig,
  PluginContext,
  PluginHook,
  PluginHookHandler,
} from '../core/types';

// ============================================
// PLUGIN INTERFACE
// ============================================

export interface Plugin {
  /** Plugin name */
  readonly name: string;
  
  /** Plugin version */
  readonly version: string;
  
  /** Initialize plugin */
  initialize?(config?: Record<string, unknown>): Promise<void>;
  
  /** Cleanup plugin */
  destroy?(): Promise<void>;
  
  /** Get hook handlers */
  getHooks(): Map<PluginHook, PluginHookHandler>;
}

// ============================================
// PLUGIN MANAGER
// ============================================

export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private hooks = new Map<PluginHook, PluginHookHandler[]>();

  /**
   * Register a plugin from config
   */
  register(config: PluginConfig): void {
    const plugin = this.createPlugin(config);
    this.add(plugin);
  }

  /**
   * Add a plugin instance
   */
  add(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin already registered: ${plugin.name}`);
    }
    
    this.plugins.set(plugin.name, plugin);
    
    // Register hooks
    const hooks = plugin.getHooks();
    for (const [hook, handler] of hooks) {
      this.addHook(hook, handler);
    }
  }

  /**
   * Remove a plugin
   */
  async remove(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) return;
    
    // Cleanup
    if (plugin.destroy) {
      await plugin.destroy();
    }
    
    // Remove hooks
    const hooks = plugin.getHooks();
    for (const [hook, handler] of hooks) {
      this.removeHook(hook, handler);
    }
    
    this.plugins.delete(name);
  }

  /**
   * Get a plugin by name
   */
  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * List all plugins
   */
  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Trigger a hook
   */
  async trigger(hook: PluginHook, context: PluginContext): Promise<void> {
    const handlers = this.hooks.get(hook) || [];
    
    for (const handler of handlers) {
      try {
        await handler(context);
      } catch (error) {
        console.error(`[PluginManager] Hook ${hook} handler error:`, error);
      }
    }
  }

  private addHook(hook: PluginHook, handler: PluginHookHandler): void {
    const handlers = this.hooks.get(hook) || [];
    handlers.push(handler);
    this.hooks.set(hook, handlers);
  }

  private removeHook(hook: PluginHook, handler: PluginHookHandler): void {
    const handlers = this.hooks.get(hook) || [];
    const index = handlers.indexOf(handler);
    if (index >= 0) {
      handlers.splice(index, 1);
    }
  }

  private createPlugin(config: PluginConfig): Plugin {
    switch (config.name.toLowerCase()) {
      case 'logging':
        return new LoggingPlugin(config.options);
      case 'metrics':
        return new MetricsPlugin(config.options);
      case 'evidence':
        return new EvidencePlugin(config.options);
      default:
        throw new Error(`Unknown plugin: ${config.name}`);
    }
  }
}

// ============================================
// LOGGING PLUGIN
// ============================================

export class LoggingPlugin implements Plugin {
  readonly name = 'logging';
  readonly version = '1.0.0';
  
  private options: LoggingPluginOptions;

  constructor(options?: Record<string, unknown>) {
    this.options = {
      level: (options?.level as string) || 'info',
      format: (options?.format as string) || 'pretty',
      includeTimestamp: options?.includeTimestamp !== false,
      includeSessionId: options?.includeSessionId !== false,
    };
  }

  getHooks(): Map<PluginHook, PluginHookHandler> {
    const hooks = new Map<PluginHook, PluginHookHandler>();
    
    hooks.set('session:created', (ctx) => {
      this.log('info', 'Session created', { sessionId: ctx.sessionId });
    });
    
    hooks.set('session:started', (ctx) => {
      this.log('info', 'Session started', { sessionId: ctx.sessionId });
    });
    
    hooks.set('session:completed', (ctx) => {
      this.log('info', 'Session completed', { 
        sessionId: ctx.sessionId,
        data: ctx.data,
      });
    });
    
    hooks.set('session:failed', (ctx) => {
      this.log('error', 'Session failed', { 
        sessionId: ctx.sessionId,
        data: ctx.data,
      });
    });
    
    hooks.set('iteration:start', (ctx) => {
      this.log('debug', 'Iteration started', { 
        sessionId: ctx.sessionId,
        iteration: (ctx.data as any)?.iteration,
      });
    });
    
    hooks.set('iteration:complete', (ctx) => {
      this.log('debug', 'Iteration completed', { 
        sessionId: ctx.sessionId,
        data: ctx.data,
      });
    });
    
    hooks.set('llm:request', (ctx) => {
      this.log('debug', 'LLM request', { 
        sessionId: ctx.sessionId,
        model: (ctx.data as any)?.model,
      });
    });
    
    hooks.set('llm:response', (ctx) => {
      this.log('debug', 'LLM response', { 
        sessionId: ctx.sessionId,
        tokens: (ctx.data as any)?.tokens,
      });
    });
    
    hooks.set('error', (ctx) => {
      this.log('error', 'Error', { 
        sessionId: ctx.sessionId,
        error: ctx.data,
      });
    });
    
    return hooks;
  }

  private log(level: string, message: string, data?: unknown): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) < levels.indexOf(this.options.level)) {
      return;
    }
    
    const parts: string[] = [];
    
    if (this.options.includeTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);
    
    if (this.options.format === 'pretty') {
      console.log(parts.join(' '), data ? JSON.stringify(data, null, 2) : '');
    } else {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...((data as object) || {}),
      }));
    }
  }
}

interface LoggingPluginOptions {
  level: string;
  format: string;
  includeTimestamp: boolean;
  includeSessionId: boolean;
}

// ============================================
// METRICS PLUGIN
// ============================================

export class MetricsPlugin implements Plugin {
  readonly name = 'metrics';
  readonly version = '1.0.0';
  
  private metrics: MetricsData = {
    sessions: { total: 0, completed: 0, failed: 0 },
    iterations: { total: 0, avgPerSession: 0 },
    tokens: { input: 0, output: 0, total: 0 },
    latency: { llmCalls: [], iterations: [] },
    cost: 0,
  };
  
  private sessionMetrics = new Map<string, SessionMetrics>();

  constructor(options?: Record<string, unknown>) {
    // Options could include reporting interval, export format, etc.
  }

  getHooks(): Map<PluginHook, PluginHookHandler> {
    const hooks = new Map<PluginHook, PluginHookHandler>();
    
    hooks.set('session:created', (ctx) => {
      this.metrics.sessions.total++;
      this.sessionMetrics.set(ctx.sessionId!, {
        startTime: Date.now(),
        iterations: 0,
        tokens: { input: 0, output: 0, total: 0 },
        llmLatencies: [],
      });
    });
    
    hooks.set('session:completed', (ctx) => {
      this.metrics.sessions.completed++;
      this.finalizeSession(ctx.sessionId!);
    });
    
    hooks.set('session:failed', (ctx) => {
      this.metrics.sessions.failed++;
      this.finalizeSession(ctx.sessionId!);
    });
    
    hooks.set('iteration:complete', (ctx) => {
      const sessionId = ctx.sessionId!;
      const session = this.sessionMetrics.get(sessionId);
      if (session) {
        session.iterations++;
        this.metrics.iterations.total++;
      }
    });
    
    hooks.set('llm:response', (ctx) => {
      const data = ctx.data as any;
      const sessionId = ctx.sessionId!;
      const session = this.sessionMetrics.get(sessionId);
      
      if (session && data.usage) {
        session.tokens.input += data.usage.input || 0;
        session.tokens.output += data.usage.output || 0;
        session.tokens.total += data.usage.total || 0;
        
        this.metrics.tokens.input += data.usage.input || 0;
        this.metrics.tokens.output += data.usage.output || 0;
        this.metrics.tokens.total += data.usage.total || 0;
      }
      
      if (data.latencyMs) {
        session?.llmLatencies.push(data.latencyMs);
        this.metrics.latency.llmCalls.push(data.latencyMs);
      }
    });
    
    return hooks;
  }

  private finalizeSession(sessionId: string): void {
    const session = this.sessionMetrics.get(sessionId);
    if (!session) return;
    
    const duration = Date.now() - session.startTime;
    this.metrics.latency.iterations.push(duration);
    
    // Update averages
    if (this.metrics.sessions.total > 0) {
      this.metrics.iterations.avgPerSession = 
        this.metrics.iterations.total / this.metrics.sessions.total;
    }
    
    this.sessionMetrics.delete(sessionId);
  }

  /**
   * Get current metrics
   */
  getMetrics(): MetricsData {
    return JSON.parse(JSON.stringify(this.metrics));
  }

  /**
   * Get metrics summary
   */
  getSummary(): MetricsSummary {
    const llmLatencies = this.metrics.latency.llmCalls;
    const iterLatencies = this.metrics.latency.iterations;
    
    return {
      sessions: {
        total: this.metrics.sessions.total,
        completed: this.metrics.sessions.completed,
        failed: this.metrics.sessions.failed,
        successRate: this.metrics.sessions.total > 0 
          ? this.metrics.sessions.completed / this.metrics.sessions.total 
          : 0,
      },
      iterations: {
        total: this.metrics.iterations.total,
        avgPerSession: this.metrics.iterations.avgPerSession,
      },
      tokens: this.metrics.tokens,
      latency: {
        avgLlmCall: this.avg(llmLatencies),
        p50LlmCall: this.percentile(llmLatencies, 50),
        p95LlmCall: this.percentile(llmLatencies, 95),
        avgIteration: this.avg(iterLatencies),
      },
      cost: this.metrics.cost,
    };
  }

  private avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

interface MetricsData {
  sessions: { total: number; completed: number; failed: number };
  iterations: { total: number; avgPerSession: number };
  tokens: { input: number; output: number; total: number };
  latency: { llmCalls: number[]; iterations: number[] };
  cost: number;
}

interface SessionMetrics {
  startTime: number;
  iterations: number;
  tokens: { input: number; output: number; total: number };
  llmLatencies: number[];
}

interface MetricsSummary {
  sessions: { total: number; completed: number; failed: number; successRate: number };
  iterations: { total: number; avgPerSession: number };
  tokens: { input: number; output: number; total: number };
  latency: { avgLlmCall: number; p50LlmCall: number; p95LlmCall: number; avgIteration: number };
  cost: number;
}

// ============================================
// EVIDENCE PLUGIN
// ============================================

export class EvidencePlugin implements Plugin {
  readonly name = 'evidence';
  readonly version = '1.0.0';
  
  private evidence = new Map<string, EvidenceRecord>();
  private options: EvidencePluginOptions;

  constructor(options?: Record<string, unknown>) {
    this.options = {
      captureRequests: options?.captureRequests !== false,
      captureResponses: options?.captureResponses !== false,
      captureValidations: options?.captureValidations !== false,
      maxRecordsPerSession: (options?.maxRecordsPerSession as number) || 100,
    };
  }

  getHooks(): Map<PluginHook, PluginHookHandler> {
    const hooks = new Map<PluginHook, PluginHookHandler>();
    
    hooks.set('session:created', (ctx) => {
      this.evidence.set(ctx.sessionId!, {
        sessionId: ctx.sessionId!,
        contractId: (ctx.data as any)?.contractId,
        startedAt: ctx.timestamp,
        records: [],
      });
    });
    
    hooks.set('session:completed', (ctx) => {
      const evidence = this.evidence.get(ctx.sessionId!);
      if (evidence) {
        evidence.completedAt = ctx.timestamp;
        evidence.status = 'completed';
        evidence.finalOutput = (ctx.data as any)?.output;
      }
    });
    
    hooks.set('session:failed', (ctx) => {
      const evidence = this.evidence.get(ctx.sessionId!);
      if (evidence) {
        evidence.completedAt = ctx.timestamp;
        evidence.status = 'failed';
        evidence.error = (ctx.data as any)?.error;
      }
    });
    
    if (this.options.captureRequests) {
      hooks.set('llm:request', (ctx) => {
        this.addRecord(ctx.sessionId!, 'llm_request', ctx.data, ctx.timestamp);
      });
    }
    
    if (this.options.captureResponses) {
      hooks.set('llm:response', (ctx) => {
        this.addRecord(ctx.sessionId!, 'llm_response', ctx.data, ctx.timestamp);
      });
    }
    
    if (this.options.captureValidations) {
      hooks.set('validation:start', (ctx) => {
        this.addRecord(ctx.sessionId!, 'validation_start', ctx.data, ctx.timestamp);
      });
      
      hooks.set('validation:complete', (ctx) => {
        this.addRecord(ctx.sessionId!, 'validation_complete', ctx.data, ctx.timestamp);
      });
    }
    
    hooks.set('iteration:complete', (ctx) => {
      this.addRecord(ctx.sessionId!, 'iteration', ctx.data, ctx.timestamp);
    });
    
    return hooks;
  }

  private addRecord(sessionId: string, type: string, data: unknown, timestamp: string): void {
    const evidence = this.evidence.get(sessionId);
    if (!evidence) return;
    
    if (evidence.records.length >= this.options.maxRecordsPerSession) {
      // Remove oldest record
      evidence.records.shift();
    }
    
    evidence.records.push({
      type,
      timestamp,
      data,
    });
  }

  /**
   * Get evidence for a session
   */
  getEvidence(sessionId: string): EvidenceRecord | undefined {
    return this.evidence.get(sessionId);
  }

  /**
   * Export evidence pack for a session
   */
  exportPack(sessionId: string): EvidencePack | null {
    const evidence = this.evidence.get(sessionId);
    if (!evidence) return null;
    
    return {
      id: `evp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      contractId: evidence.contractId,
      generatedAt: new Date().toISOString(),
      status: evidence.status || 'unknown',
      duration: evidence.completedAt 
        ? new Date(evidence.completedAt).getTime() - new Date(evidence.startedAt).getTime()
        : 0,
      records: evidence.records,
      finalOutput: evidence.finalOutput,
      error: evidence.error,
    };
  }

  /**
   * Clear evidence for a session
   */
  clearEvidence(sessionId: string): void {
    this.evidence.delete(sessionId);
  }
}

interface EvidencePluginOptions {
  captureRequests: boolean;
  captureResponses: boolean;
  captureValidations: boolean;
  maxRecordsPerSession: number;
}

interface EvidenceRecord {
  sessionId: string;
  contractId?: string;
  startedAt: string;
  completedAt?: string;
  status?: string;
  records: Array<{
    type: string;
    timestamp: string;
    data: unknown;
  }>;
  finalOutput?: unknown;
  error?: unknown;
}

interface EvidencePack {
  id: string;
  sessionId: string;
  contractId?: string;
  generatedAt: string;
  status: string;
  duration: number;
  records: Array<{
    type: string;
    timestamp: string;
    data: unknown;
  }>;
  finalOutput?: unknown;
  error?: unknown;
}

// ============================================
// EXPORTS
// ============================================

export default PluginManager;
