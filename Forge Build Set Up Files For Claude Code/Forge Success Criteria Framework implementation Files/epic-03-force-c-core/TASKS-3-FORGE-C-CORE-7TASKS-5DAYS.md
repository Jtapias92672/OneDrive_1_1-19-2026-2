# Epic 3: FORGE C Core Orchestrator - Atomic Task Breakdown

**Token Budget:** 60K (LIMIT: 60K) ⚠️ AT LIMIT  
**Tasks:** 7  
**Estimated Time:** 5 days  
**Dependencies:** Epic 2 (Answer Contract)

---

## Overview

Epic 3 implements the FORGE C core orchestrator including the main ForgeC class, LLM provider abstraction, plugin system, and MCP server for tool integration.

---

## Phase 3.1: Package Setup & Core Architecture

### Task 3.1.1: Create forge-c package structure

**Time:** 5 minutes | **Tokens:** ~3K

**Files to UPDATE:**
- `packages/forge-c/package.json`

**Files to CREATE:**
- `packages/forge-c/src/core/index.ts`
- `packages/forge-c/src/providers/index.ts`
- `packages/forge-c/src/plugins/index.ts`
- `packages/forge-c/src/mcp/index.ts`

**Purpose:** Establish package structure for the FORGE C orchestrator.

**Implementation:**

```json
// packages/forge-c/package.json
{
  "name": "@forge/forge-c",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "dependencies": {
    "@forge/core": "workspace:*",
    "@forge/answer-contract": "workspace:*",
    "@anthropic-ai/sdk": "^0.32.0"
  }
}
```

**Verification:**
```bash
cd packages/forge-c && pnpm install && pnpm build
```

**Done When:** Package builds with dependencies

---

### Task 3.1.2: Create ForgeC types and session management

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/forge-c/src/core/types.ts`
- `packages/forge-c/src/core/session.ts`

**Purpose:** Define core types for sessions and convergence.

**Implementation:**

```typescript
// packages/forge-c/src/core/types.ts
import { ForgeContext, ForgeConfig, TokenUsage } from '@forge/core';
import { AnswerContract, ValidationResult } from '@forge/answer-contract';

export interface ForgeCOptions {
  config?: Partial<ForgeConfig>;
  defaultProvider?: string;
}

export interface ForgeSession {
  id: string;
  contractId: string;
  contract: AnswerContract;
  context: ForgeContext;
  status: 'pending' | 'running' | 'completed' | 'failed';
  iterations: IterationResult[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface IterationResult {
  iteration: number;
  output: unknown;
  validationResults: ValidationResult[];
  tokens: TokenUsage;
  duration: number;
}

export interface ConvergenceResult {
  success: boolean;
  iterations: number;
  finalOutput: unknown;
  validationResults: ValidationResult[];
  totalTokens: TokenUsage;
  totalCost: number;
  duration: number;
}
```

```typescript
// packages/forge-c/src/core/session.ts
import { ForgeContext, ForgeConfig } from '@forge/core';
import { AnswerContract } from '@forge/answer-contract';
import { ForgeSession, IterationResult } from './types.js';
import { randomUUID } from 'crypto';

const DEFAULT_CONFIG: ForgeConfig = {
  maxIterations: 10,
  maxTokens: 100000,
  maxCost: 10.0,
  providers: [],
};

export function createSession(
  contract: AnswerContract,
  config?: Partial<ForgeConfig>
): ForgeSession {
  const sessionId = randomUUID();
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  return {
    id: sessionId,
    contractId: contract.id,
    contract,
    context: {
      sessionId,
      projectId: contract.id,
      timestamp: new Date(),
      config: mergedConfig,
      tokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    },
    status: 'pending',
    iterations: [],
  };
}
```

**Done When:** Types compile correctly

---

### Task 3.1.3: Create ForgeC main class

**Time:** 5 minutes | **Tokens:** ~5K

**Files to CREATE:**
- `packages/forge-c/src/core/forge-c.ts`
- `packages/forge-c/src/core/index.ts`

**Purpose:** Implement the main ForgeC orchestrator class.

**Implementation:**

```typescript
// packages/forge-c/src/core/forge-c.ts
import { ForgeResult, success, failure, createLogger } from '@forge/core';
import { AnswerContract } from '@forge/answer-contract';
import { LLMProvider } from '../providers/base.js';
import { Plugin } from '../plugins/base.js';
import { ForgeSession, ForgeCOptions, ConvergenceResult } from './types.js';
import { createSession } from './session.js';

const logger = createLogger('forge-c');

export class ForgeC {
  private providers = new Map<string, LLMProvider>();
  private contracts = new Map<string, AnswerContract>();
  private sessions = new Map<string, ForgeSession>();
  private plugins: Plugin[] = [];
  private defaultProvider?: string;

  constructor(private options: ForgeCOptions = {}) {
    this.defaultProvider = options.defaultProvider;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing ForgeC');
    for (const plugin of this.plugins) {
      await plugin.onInitialize?.();
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down ForgeC');
    for (const plugin of this.plugins) {
      await plugin.onShutdown?.();
    }
  }

  registerProvider(name: string, provider: LLMProvider): void {
    this.providers.set(name, provider);
    if (!this.defaultProvider) this.defaultProvider = name;
  }

  registerPlugin(plugin: Plugin): void {
    this.plugins.push(plugin);
  }

  loadContract(contract: AnswerContract): void {
    this.contracts.set(contract.id, contract);
  }

  createSession(contractId: string): ForgeResult<ForgeSession> {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      return failure({ code: 'CONTRACT_NOT_FOUND', message: `Contract ${contractId} not found` }, { duration: 0 });
    }
    const session = createSession(contract, this.options.config);
    this.sessions.set(session.id, session);
    return success(session, { duration: 0 });
  }

  getSession(id: string): ForgeSession | undefined {
    return this.sessions.get(id);
  }

  getProvider(name?: string): LLMProvider | undefined {
    return this.providers.get(name ?? this.defaultProvider ?? '');
  }

  // Convergence will be implemented in Epic 4
  async runConvergence(_sessionId: string): Promise<ForgeResult<ConvergenceResult>> {
    return failure({ code: 'NOT_IMPLEMENTED', message: 'Convergence engine not yet implemented' }, { duration: 0 });
  }
}
```

```typescript
// packages/forge-c/src/core/index.ts
export * from './types.js';
export * from './session.js';
export * from './forge-c.js';
```

**Done When:** ForgeC class compiles with session management

---

### Task 3.1.4: Create base LLM Provider interface

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/forge-c/src/providers/base.ts`

**Purpose:** Define the common interface for LLM providers.

**Implementation:**

```typescript
// packages/forge-c/src/providers/base.ts
import { ForgeResult, TokenUsage } from '@forge/core';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface CompletionResult {
  content: string;
  usage: TokenUsage;
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  model: string;
}

export interface StreamChunk {
  type: 'text' | 'usage' | 'done';
  text?: string;
  usage?: TokenUsage;
}

export interface LLMProvider {
  name: string;
  model: string;
  complete(messages: Message[], options?: CompletionOptions): Promise<ForgeResult<CompletionResult>>;
  stream?(messages: Message[], options?: CompletionOptions): AsyncIterable<StreamChunk>;
}

export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;
  abstract model: string;
  abstract complete(messages: Message[], options?: CompletionOptions): Promise<ForgeResult<CompletionResult>>;
}
```

**Done When:** Provider interface exports correctly

---

### Task 3.1.5: Implement Anthropic provider

**Time:** 5 minutes | **Tokens:** ~5K

**Files to CREATE:**
- `packages/forge-c/src/providers/anthropic.ts`
- `packages/forge-c/src/providers/index.ts`

**Purpose:** Implement the Anthropic Claude provider.

**Implementation:**

```typescript
// packages/forge-c/src/providers/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';
import { ForgeResult, success, failure } from '@forge/core';
import { BaseLLMProvider, Message, CompletionOptions, CompletionResult, StreamChunk } from './base.js';

export interface AnthropicConfig {
  apiKey?: string;
  model?: string;
}

export class AnthropicProvider extends BaseLLMProvider {
  name = 'anthropic';
  model: string;
  private client: Anthropic;

  constructor(config: AnthropicConfig = {}) {
    super();
    this.model = config.model ?? 'claude-sonnet-4-20250514';
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async complete(messages: Message[], options?: CompletionOptions): Promise<ForgeResult<CompletionResult>> {
    const startTime = Date.now();
    
    try {
      const systemMessage = messages.find(m => m.role === 'system');
      const chatMessages = messages.filter(m => m.role !== 'system');

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens ?? 4096,
        system: systemMessage?.content,
        messages: chatMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        temperature: options?.temperature,
        stop_sequences: options?.stopSequences,
      });

      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as { type: 'text'; text: string }).text)
        .join('');

      return success({
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        stopReason: response.stop_reason === 'end_turn' ? 'end_turn' : 'max_tokens',
        model: this.model,
      }, { duration: Date.now() - startTime });
    } catch (error) {
      return failure({
        code: 'PROVIDER_ERROR',
        message: `Anthropic API error: ${error instanceof Error ? error.message : 'Unknown'}`,
      }, { duration: Date.now() - startTime });
    }
  }

  async *stream(messages: Message[], options?: CompletionOptions): AsyncIterable<StreamChunk> {
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: options?.maxTokens ?? 4096,
      system: systemMessage?.content,
      messages: chatMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text', text: event.delta.text };
      }
    }

    const finalMessage = await stream.finalMessage();
    yield {
      type: 'usage',
      usage: {
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
        totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
      },
    };
    yield { type: 'done' };
  }
}
```

```typescript
// packages/forge-c/src/providers/index.ts
export * from './base.js';
export * from './anthropic.js';
```

**Done When:** Anthropic provider compiles and handles streaming

---

## Phase 3.2: Plugin System

### Task 3.2.1: Create plugin base interface

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/forge-c/src/plugins/base.ts`

**Purpose:** Define the plugin lifecycle hooks.

**Implementation:**

```typescript
// packages/forge-c/src/plugins/base.ts
import { ForgeSession, IterationResult } from '../core/types.js';
import { ValidationResult } from '@forge/answer-contract';

export interface PluginHooks {
  onInitialize?(): Promise<void>;
  onShutdown?(): Promise<void>;
  onSessionCreate?(session: ForgeSession): Promise<void>;
  onSessionComplete?(session: ForgeSession): Promise<void>;
  onIterationStart?(session: ForgeSession, iteration: number): Promise<void>;
  onIterationEnd?(session: ForgeSession, iteration: number, result: IterationResult): Promise<void>;
  onValidationComplete?(session: ForgeSession, results: ValidationResult[]): Promise<void>;
  onError?(session: ForgeSession, error: Error): Promise<void>;
}

export interface Plugin extends PluginHooks {
  name: string;
}

export abstract class BasePlugin implements Plugin {
  abstract name: string;
}
```

**Done When:** Plugin base class provides lifecycle hooks

---

### Task 3.2.2: Implement logging plugin

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/forge-c/src/plugins/logging.ts`

**Purpose:** Plugin for structured logging of session events.

**Implementation:**

```typescript
// packages/forge-c/src/plugins/logging.ts
import { createLogger } from '@forge/core';
import { BasePlugin } from './base.js';
import { ForgeSession, IterationResult } from '../core/types.js';
import { ValidationResult } from '@forge/answer-contract';

export interface LoggingConfig {
  level?: 'debug' | 'info' | 'warn' | 'error';
  includeTokens?: boolean;
  includeOutput?: boolean;
}

export class LoggingPlugin extends BasePlugin {
  name = 'logging';
  private logger = createLogger('forge-plugin');
  private config: LoggingConfig;

  constructor(config: LoggingConfig = {}) {
    super();
    this.config = { level: 'info', includeTokens: true, ...config };
  }

  async onSessionCreate(session: ForgeSession): Promise<void> {
    this.logger.info('Session created', { sessionId: session.id, contractId: session.contractId });
  }

  async onSessionComplete(session: ForgeSession): Promise<void> {
    this.logger.info('Session completed', {
      sessionId: session.id,
      status: session.status,
      iterations: session.iterations.length,
      ...(this.config.includeTokens && { tokens: session.context.tokens }),
    });
  }

  async onIterationStart(session: ForgeSession, iteration: number): Promise<void> {
    this.logger.debug('Iteration started', { sessionId: session.id, iteration });
  }

  async onIterationEnd(session: ForgeSession, iteration: number, result: IterationResult): Promise<void> {
    this.logger.info('Iteration completed', {
      sessionId: session.id,
      iteration,
      duration: result.duration,
      ...(this.config.includeTokens && { tokens: result.tokens }),
    });
  }

  async onValidationComplete(session: ForgeSession, results: ValidationResult[]): Promise<void> {
    const passed = results.filter(r => r.valid).length;
    this.logger.info('Validation completed', { sessionId: session.id, passed, total: results.length });
  }

  async onError(session: ForgeSession, error: Error): Promise<void> {
    this.logger.error('Session error', { sessionId: session.id, error: error.message });
  }
}
```

**Done When:** Logging plugin captures all lifecycle events

---

### Task 3.2.3: Implement metrics plugin

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/forge-c/src/plugins/metrics.ts`

**Purpose:** Plugin for tracking usage metrics.

**Implementation:**

```typescript
// packages/forge-c/src/plugins/metrics.ts
import { TokenUsage, DEFAULT_PRICING } from '@forge/core';
import { BasePlugin } from './base.js';
import { ForgeSession, IterationResult } from '../core/types.js';

export interface Metrics {
  sessionsTotal: number;
  sessionsSuccessful: number;
  sessionsFailed: number;
  iterationsTotal: number;
  tokensInput: number;
  tokensOutput: number;
  totalCost: number;
  averageIterationsPerSession: number;
}

export class MetricsPlugin extends BasePlugin {
  name = 'metrics';
  private sessionsTotal = 0;
  private sessionsSuccessful = 0;
  private sessionsFailed = 0;
  private iterationsTotal = 0;
  private tokensInput = 0;
  private tokensOutput = 0;
  private model = 'claude-sonnet-4-20250514';

  constructor(model?: string) {
    super();
    if (model) this.model = model;
  }

  async onSessionCreate(_session: ForgeSession): Promise<void> {
    this.sessionsTotal++;
  }

  async onSessionComplete(session: ForgeSession): Promise<void> {
    if (session.status === 'completed') {
      this.sessionsSuccessful++;
    } else if (session.status === 'failed') {
      this.sessionsFailed++;
    }
  }

  async onIterationEnd(_session: ForgeSession, _iteration: number, result: IterationResult): Promise<void> {
    this.iterationsTotal++;
    this.tokensInput += result.tokens.inputTokens;
    this.tokensOutput += result.tokens.outputTokens;
  }

  getMetrics(): Metrics {
    const pricing = DEFAULT_PRICING[this.model] ?? DEFAULT_PRICING['claude-sonnet-4-20250514'];
    const inputCost = (this.tokensInput / 1000) * pricing.inputPer1k;
    const outputCost = (this.tokensOutput / 1000) * pricing.outputPer1k;

    return {
      sessionsTotal: this.sessionsTotal,
      sessionsSuccessful: this.sessionsSuccessful,
      sessionsFailed: this.sessionsFailed,
      iterationsTotal: this.iterationsTotal,
      tokensInput: this.tokensInput,
      tokensOutput: this.tokensOutput,
      totalCost: inputCost + outputCost,
      averageIterationsPerSession: this.sessionsTotal > 0 ? this.iterationsTotal / this.sessionsTotal : 0,
    };
  }

  reset(): void {
    this.sessionsTotal = 0;
    this.sessionsSuccessful = 0;
    this.sessionsFailed = 0;
    this.iterationsTotal = 0;
    this.tokensInput = 0;
    this.tokensOutput = 0;
  }
}
```

**Done When:** Metrics plugin tracks usage statistics

---

### Task 3.2.4: Implement cost limiter plugin

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/forge-c/src/plugins/cost-limiter.ts`
- `packages/forge-c/src/plugins/index.ts`

**Purpose:** Plugin for enforcing cost limits.

**Implementation:**

```typescript
// packages/forge-c/src/plugins/cost-limiter.ts
import { DEFAULT_PRICING } from '@forge/core';
import { BasePlugin } from './base.js';
import { ForgeSession, IterationResult } from '../core/types.js';

export interface CostLimiterConfig {
  maxCostPerSession?: number;
  maxCostTotal?: number;
  warningThreshold?: number;
  model?: string;
}

export class CostLimiterPlugin extends BasePlugin {
  name = 'cost-limiter';
  private config: Required<CostLimiterConfig>;
  private totalCost = 0;
  private sessionCosts = new Map<string, number>();

  constructor(config: CostLimiterConfig = {}) {
    super();
    this.config = {
      maxCostPerSession: config.maxCostPerSession ?? 5.0,
      maxCostTotal: config.maxCostTotal ?? 100.0,
      warningThreshold: config.warningThreshold ?? 0.8,
      model: config.model ?? 'claude-sonnet-4-20250514',
    };
  }

  async onSessionCreate(session: ForgeSession): Promise<void> {
    this.sessionCosts.set(session.id, 0);
  }

  async onIterationEnd(session: ForgeSession, _iteration: number, result: IterationResult): Promise<void> {
    const pricing = DEFAULT_PRICING[this.config.model];
    const cost = (result.tokens.inputTokens / 1000) * pricing.inputPer1k +
                 (result.tokens.outputTokens / 1000) * pricing.outputPer1k;
    
    const sessionCost = (this.sessionCosts.get(session.id) ?? 0) + cost;
    this.sessionCosts.set(session.id, sessionCost);
    this.totalCost += cost;

    if (sessionCost >= this.config.maxCostPerSession) {
      throw new Error(`Session cost limit exceeded: $${sessionCost.toFixed(4)} >= $${this.config.maxCostPerSession}`);
    }

    if (this.totalCost >= this.config.maxCostTotal) {
      throw new Error(`Total cost limit exceeded: $${this.totalCost.toFixed(4)} >= $${this.config.maxCostTotal}`);
    }
  }

  getTotalCost(): number {
    return this.totalCost;
  }

  getSessionCost(sessionId: string): number {
    return this.sessionCosts.get(sessionId) ?? 0;
  }
}
```

```typescript
// packages/forge-c/src/plugins/index.ts
export * from './base.js';
export * from './logging.js';
export * from './metrics.js';
export * from './cost-limiter.js';
```

**Done When:** Cost limiter enforces budget constraints

---

## Phase 3.3: MCP Server

### Task 3.3.1: Create MCP server skeleton

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/forge-c/src/mcp/types.ts`
- `packages/forge-c/src/mcp/server.ts`

**Purpose:** Create the MCP server for tool integration.

**Implementation:**

```typescript
// packages/forge-c/src/mcp/types.ts
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(input: unknown, context: MCPContext): Promise<MCPResult>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPContext {
  sessionId?: string;
}

export interface MCPResult {
  content: Array<{ type: 'text'; text: string } | { type: 'resource'; resource: MCPResource }>;
  isError?: boolean;
}
```

```typescript
// packages/forge-c/src/mcp/server.ts
import { createLogger } from '@forge/core';
import { ForgeC } from '../core/forge-c.js';
import { MCPTool, MCPResource, MCPContext, MCPResult } from './types.js';

const logger = createLogger('mcp-server');

export class ForgeMCPServer {
  private tools = new Map<string, MCPTool>();
  private resources = new Map<string, MCPResource>();

  constructor(private forge: ForgeC) {}

  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    logger.debug('Registered tool', { name: tool.name });
  }

  registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource);
    logger.debug('Registered resource', { uri: resource.uri });
  }

  listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  listResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  async callTool(name: string, input: unknown, context: MCPContext = {}): Promise<MCPResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { content: [{ type: 'text', text: `Tool not found: ${name}` }], isError: true };
    }
    return tool.execute(input, context);
  }

  getForge(): ForgeC {
    return this.forge;
  }
}
```

**Done When:** MCP server handles tool and resource requests

---

### Task 3.3.2: Implement forge_converge tool

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/forge-c/src/mcp/tools/converge.ts`

**Purpose:** MCP tool for running convergence loops.

**Implementation:**

```typescript
// packages/forge-c/src/mcp/tools/converge.ts
import { MCPTool, MCPContext, MCPResult } from '../types.js';
import { ForgeMCPServer } from '../server.js';

export interface ConvergeInput {
  contractId: string;
  input?: string;
  options?: {
    maxIterations?: number;
  };
}

export function createConvergeTool(server: ForgeMCPServer): MCPTool {
  return {
    name: 'forge_converge',
    description: 'Run FORGE convergence loop on an Answer Contract',
    inputSchema: {
      type: 'object',
      required: ['contractId'],
      properties: {
        contractId: { type: 'string', description: 'ID of the Answer Contract to execute' },
        input: { type: 'string', description: 'Input prompt or data for the contract' },
        options: {
          type: 'object',
          properties: {
            maxIterations: { type: 'number', description: 'Maximum iterations to run' },
          },
        },
      },
    },
    async execute(input: unknown, context: MCPContext): Promise<MCPResult> {
      const { contractId, input: userInput, options } = input as ConvergeInput;
      const forge = server.getForge();

      const sessionResult = forge.createSession(contractId);
      if (!sessionResult.success) {
        return {
          content: [{ type: 'text', text: `Failed to create session: ${sessionResult.error.message}` }],
          isError: true,
        };
      }

      const result = await forge.runConvergence(sessionResult.data.id);
      
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Convergence failed: ${result.error.message}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: result.data.success,
            iterations: result.data.iterations,
            output: result.data.finalOutput,
          }, null, 2),
        }],
      };
    },
  };
}
```

**Done When:** forge_converge tool handles full workflow

---

### Task 3.3.3: Implement forge_validate and forge_status tools

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/forge-c/src/mcp/tools/validate.ts`
- `packages/forge-c/src/mcp/tools/status.ts`

**Purpose:** MCP tools for validation and status checking.

**Implementation:**

```typescript
// packages/forge-c/src/mcp/tools/validate.ts
import { MCPTool, MCPResult } from '../types.js';
import { ForgeMCPServer } from '../server.js';

export function createValidateTool(server: ForgeMCPServer): MCPTool {
  return {
    name: 'forge_validate',
    description: 'Validate output against a contract without running convergence',
    inputSchema: {
      type: 'object',
      required: ['contractId', 'output'],
      properties: {
        contractId: { type: 'string' },
        output: { type: 'object' },
      },
    },
    async execute(input: unknown): Promise<MCPResult> {
      // Validation logic will be completed in Epic 4
      return {
        content: [{ type: 'text', text: 'Validation completed (stub)' }],
      };
    },
  };
}
```

```typescript
// packages/forge-c/src/mcp/tools/status.ts
import { MCPTool, MCPResult } from '../types.js';
import { ForgeMCPServer } from '../server.js';

export function createStatusTool(server: ForgeMCPServer): MCPTool {
  return {
    name: 'forge_status',
    description: 'Get status of a FORGE session',
    inputSchema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: { type: 'string' },
      },
    },
    async execute(input: unknown): Promise<MCPResult> {
      const { sessionId } = input as { sessionId: string };
      const forge = server.getForge();
      const session = forge.getSession(sessionId);

      if (!session) {
        return {
          content: [{ type: 'text', text: `Session not found: ${sessionId}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            id: session.id,
            status: session.status,
            iterations: session.iterations.length,
            tokens: session.context.tokens,
          }, null, 2),
        }],
      };
    },
  };
}
```

**Done When:** Both tools handle requests correctly

---

### Task 3.3.4: Export MCP components and create package index

**Time:** 5 minutes | **Tokens:** ~2K

**Files to CREATE:**
- `packages/forge-c/src/mcp/tools/index.ts`
- `packages/forge-c/src/mcp/index.ts`

**Files to UPDATE:**
- `packages/forge-c/src/index.ts`

**Purpose:** Export all MCP components and finalize package exports.

**Implementation:**

```typescript
// packages/forge-c/src/mcp/tools/index.ts
export * from './converge.js';
export * from './validate.js';
export * from './status.js';
```

```typescript
// packages/forge-c/src/mcp/index.ts
export * from './types.js';
export * from './server.js';
export * from './tools/index.js';
```

```typescript
// packages/forge-c/src/index.ts
export * from './core/index.js';
export * from './providers/index.js';
export * from './plugins/index.js';
export * from './mcp/index.js';
```

**Verification:**
```bash
cd packages/forge-c && pnpm build
node -e "import('@forge/forge-c').then(m => console.log(Object.keys(m)))"
```

**Done When:** All exports work from @forge/forge-c

---

## Epic 3 Completion Checklist

Before moving to Epic 3.75:

- [ ] All 12 tasks marked [x] in progress.md
- [ ] `pnpm build` succeeds for forge-c
- [ ] ForgeC class instantiates
- [ ] AnthropicProvider compiles (API testing in integration)
- [ ] All 3 plugins implemented (logging, metrics, cost-limiter)
- [ ] MCP server and 3 tools implemented
- [ ] Types exported from @forge/forge-c

**Commit:** `git commit -m "Epic 3: FORGE C Core complete"`

**Next:** Epic 3.75 - Code Execution (Security/Sandbox)
