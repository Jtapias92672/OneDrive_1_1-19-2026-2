# Epic 3: FORGE C Core Orchestrator - Atomic Task Breakdown

**Total Tasks:** 12  
**Estimated Tokens:** 60K total (~5K per task)  
**Estimated Time:** 5 days

---

## Phase 3.1: Package Setup & Core Architecture

### Task 3.1.1: Create forge-c package structure

**Time:** 5 minutes  
**Tokens:** ~3K  
**Files to CREATE:**
- `packages/forge-c/package.json`
- `packages/forge-c/tsconfig.json`
- `packages/forge-c/src/index.ts`

**Directory Structure:**
```
packages/forge-c/
├── src/
│   ├── index.ts
│   ├── core/
│   │   ├── forge-c.ts
│   │   └── session.ts
│   ├── providers/
│   ├── plugins/
│   └── mcp/
├── package.json
└── tsconfig.json
```

**Dependencies:**
```json
{
  "dependencies": {
    "@forge/core": "workspace:*",
    "@forge/answer-contract": "workspace:*",
    "@anthropic-ai/sdk": "^0.20.0"
  }
}
```

**Acceptance Criteria:**
- [ ] Package name is `@forge/forge-c`
- [ ] Depends on @forge/core and @forge/answer-contract
- [ ] `pnpm build` succeeds

**Verification:**
```bash
cd packages/forge-c && pnpm build
```

---

### Task 3.1.2: Create ForgeC main class skeleton

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/forge-c/src/core/forge-c.ts`
- `packages/forge-c/src/core/types.ts`

**Implementation:**
```typescript
import { ForgeConfig, ForgeContext } from '@forge/core';
import { AnswerContract } from '@forge/answer-contract';

export interface ForgeCOptions {
  providers: ProviderConfig[];
  plugins?: PluginConfig[];
  defaultModel?: string;
}

export class ForgeC {
  private providers: Map<string, LLMProvider> = new Map();
  private plugins: Plugin[] = [];
  
  constructor(private options: ForgeCOptions) {
    this.initializeProviders();
    this.initializePlugins();
  }
  
  async createSession(contract: AnswerContract): Promise<ForgeSession> {
    // Create new session with contract
  }
  
  private initializeProviders(): void { /* TODO */ }
  private initializePlugins(): void { /* TODO */ }
}
```

**Acceptance Criteria:**
- [ ] ForgeC class with constructor
- [ ] Provider and plugin initialization stubs
- [ ] createSession method signature
- [ ] Types exported

**Verification:**
```typescript
import { ForgeC } from '@forge/forge-c';
const forge = new ForgeC({ providers: [] });
```

---

### Task 3.1.3: Create ForgeSession class

**Time:** 8 minutes  
**Tokens:** ~6K  
**Files to CREATE:**
- `packages/forge-c/src/core/session.ts`

**Implementation:**
```typescript
import { ulid } from 'ulid';

export interface SessionState {
  id: string;
  contractId: string;
  status: 'created' | 'running' | 'converged' | 'failed';
  iterations: number;
  tokenUsage: TokenUsage;
  startedAt: Date;
  completedAt?: Date;
}

export class ForgeSession {
  readonly id: string;
  private state: SessionState;
  private history: SessionEvent[] = [];
  
  constructor(
    private contract: AnswerContract,
    private provider: LLMProvider,
    private plugins: Plugin[]
  ) {
    this.id = ulid();
    this.state = this.initializeState();
  }
  
  async run(input: unknown): Promise<SessionResult> {
    // Main entry point - will call convergence
  }
  
  getState(): SessionState { return { ...this.state }; }
  getHistory(): SessionEvent[] { return [...this.history]; }
  
  private emit(event: SessionEvent): void {
    this.history.push(event);
    this.plugins.forEach(p => p.onEvent?.(event));
  }
}
```

**Acceptance Criteria:**
- [ ] Session has unique ULID
- [ ] Tracks state (status, iterations, tokens)
- [ ] Event history for plugins
- [ ] Immutable state getters

**Verification:**
```bash
pnpm test -- --grep "ForgeSession"
```

---

## Phase 3.2: LLM Provider Abstraction

### Task 3.2.1: Define LLMProvider interface

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/forge-c/src/providers/types.ts`

**Types:**
```typescript
export interface LLMProvider {
  name: string;
  models: string[];
  
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  estimateTokens(text: string): number;
  
  // Optional streaming support
  stream?(request: CompletionRequest): AsyncIterable<StreamChunk>;
}

export interface CompletionRequest {
  model: string;
  messages: Message[];
  maxTokens: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface CompletionResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence';
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

**Acceptance Criteria:**
- [ ] Complete interface definition
- [ ] Request/Response types
- [ ] Optional streaming support
- [ ] Exported from package

**Verification:**
```bash
pnpm build
```

---

### Task 3.2.2: Implement AnthropicProvider

**Time:** 8 minutes  
**Tokens:** ~6K  
**Files to CREATE:**
- `packages/forge-c/src/providers/anthropic.ts`

**Implementation:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  models = ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'];
  
  private client: Anthropic;
  
  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
  }
  
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens,
      messages: this.formatMessages(request.messages),
      temperature: request.temperature,
      stop_sequences: request.stopSequences,
    });
    
    return {
      content: this.extractContent(response),
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      stopReason: response.stop_reason as any,
    };
  }
  
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
```

**Acceptance Criteria:**
- [ ] Wraps Anthropic SDK
- [ ] Implements LLMProvider interface
- [ ] Handles API key from env
- [ ] Proper error handling

**Verification:**
```typescript
const provider = new AnthropicProvider();
// Should create without error (API key from env)
```

---

### Task 3.2.3: Create ProviderRegistry with fallback chain

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/forge-c/src/providers/registry.ts`

**Implementation:**
```typescript
export class ProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();
  private fallbackChain: string[] = [];
  
  register(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
  }
  
  setFallbackChain(chain: string[]): void {
    this.fallbackChain = chain;
  }
  
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const errors: Error[] = [];
    
    for (const providerName of this.fallbackChain) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;
      
      try {
        return await provider.complete(request);
      } catch (error) {
        errors.push(error);
        // Continue to next provider
      }
    }
    
    throw new AggregateError(errors, 'All providers failed');
  }
}
```

**Acceptance Criteria:**
- [ ] Registers multiple providers
- [ ] Fallback chain on failure
- [ ] Aggregates errors
- [ ] Returns first successful response

**Verification:**
```bash
pnpm test -- --grep "ProviderRegistry"
```

---

## Phase 3.3: Plugin System

### Task 3.3.1: Define Plugin interface and lifecycle hooks

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/forge-c/src/plugins/types.ts`

**Types:**
```typescript
export interface Plugin {
  name: string;
  
  // Lifecycle hooks
  onSessionCreate?(session: ForgeSession): void | Promise<void>;
  onSessionComplete?(session: ForgeSession, result: SessionResult): void | Promise<void>;
  onIterationStart?(session: ForgeSession, iteration: number): void | Promise<void>;
  onIterationComplete?(session: ForgeSession, iteration: number, result: IterationResult): void | Promise<void>;
  onEvent?(event: SessionEvent): void;
  onError?(error: Error, context: ErrorContext): void;
}

export interface SessionEvent {
  type: 'iteration_start' | 'iteration_complete' | 'validation' | 'llm_call' | 'error';
  timestamp: Date;
  data: unknown;
}
```

**Acceptance Criteria:**
- [ ] All lifecycle hooks optional
- [ ] Event types defined
- [ ] Async hooks supported
- [ ] Error context provided

**Verification:**
```bash
pnpm build
```

---

### Task 3.3.2: Implement LoggingPlugin

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/forge-c/src/plugins/logging.ts`

**Implementation:**
```typescript
import { createLogger } from '@forge/core';

export class LoggingPlugin implements Plugin {
  name = 'logging';
  private logger = createLogger('forge-session');
  
  onSessionCreate(session: ForgeSession): void {
    this.logger.info('Session created', { 
      sessionId: session.id,
      contractId: session.contractId 
    });
  }
  
  onIterationStart(session: ForgeSession, iteration: number): void {
    this.logger.info('Iteration started', { 
      sessionId: session.id, 
      iteration 
    });
  }
  
  onIterationComplete(session: ForgeSession, iteration: number, result: IterationResult): void {
    this.logger.info('Iteration complete', {
      sessionId: session.id,
      iteration,
      valid: result.valid,
      tokensUsed: result.tokensUsed
    });
  }
  
  onError(error: Error, context: ErrorContext): void {
    this.logger.error('Session error', { 
      error: error.message,
      ...context 
    });
  }
}
```

**Acceptance Criteria:**
- [ ] Uses @forge/core logger
- [ ] Logs all lifecycle events
- [ ] Includes relevant metadata
- [ ] Structured logging format

**Verification:**
```typescript
const plugin = new LoggingPlugin();
// Should not throw
```

---

### Task 3.3.3: Implement MetricsPlugin

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/forge-c/src/plugins/metrics.ts`

**Implementation:**
```typescript
export class MetricsPlugin implements Plugin {
  name = 'metrics';
  private metrics: SessionMetrics[] = [];
  
  onSessionComplete(session: ForgeSession, result: SessionResult): void {
    this.metrics.push({
      sessionId: session.id,
      contractId: session.contractId,
      status: result.status,
      iterations: result.iterations,
      totalTokens: result.tokenUsage.total,
      totalCost: this.calculateCost(result.tokenUsage),
      durationMs: result.durationMs,
      timestamp: new Date()
    });
  }
  
  getMetrics(): SessionMetrics[] {
    return [...this.metrics];
  }
  
  getAggregates(): AggregateMetrics {
    return {
      totalSessions: this.metrics.length,
      avgIterations: this.average(this.metrics.map(m => m.iterations)),
      avgTokens: this.average(this.metrics.map(m => m.totalTokens)),
      successRate: this.metrics.filter(m => m.status === 'converged').length / this.metrics.length,
      totalCost: this.metrics.reduce((sum, m) => sum + m.totalCost, 0)
    };
  }
}
```

**Acceptance Criteria:**
- [ ] Tracks per-session metrics
- [ ] Calculates cost
- [ ] Provides aggregates
- [ ] Immutable getters

**Verification:**
```bash
pnpm test -- --grep "MetricsPlugin"
```

---

### Task 3.3.4: Implement EvidencePlugin

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/forge-c/src/plugins/evidence.ts`

**Implementation:**
```typescript
export class EvidencePlugin implements Plugin {
  name = 'evidence';
  private traces: Map<string, EvidenceTrace> = new Map();
  
  onSessionCreate(session: ForgeSession): void {
    this.traces.set(session.id, {
      sessionId: session.id,
      startedAt: new Date(),
      iterations: [],
      events: []
    });
  }
  
  onEvent(event: SessionEvent): void {
    // Record all events for evidence
  }
  
  onIterationComplete(session: ForgeSession, iteration: number, result: IterationResult): void {
    const trace = this.traces.get(session.id);
    if (trace) {
      trace.iterations.push({
        number: iteration,
        input: result.input,
        output: result.output,
        validation: result.validation,
        tokensUsed: result.tokensUsed,
        timestamp: new Date()
      });
    }
  }
  
  getTrace(sessionId: string): EvidenceTrace | undefined {
    return this.traces.get(sessionId);
  }
}
```

**Acceptance Criteria:**
- [ ] Records all iterations
- [ ] Captures input/output pairs
- [ ] Records validation results
- [ ] Provides trace retrieval

**Verification:**
```bash
pnpm test -- --grep "EvidencePlugin"
```

---

## Phase 3.4: MCP Tool Surface

### Task 3.4.1: Define MCP tool interfaces

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/forge-c/src/mcp/types.ts`

**Types:**
```typescript
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  execute(input: unknown, context: MCPContext): Promise<MCPResult>;
}

export interface MCPContext {
  forge: ForgeC;
  session?: ForgeSession;
}

export interface MCPResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
```

**Acceptance Criteria:**
- [ ] Tool interface defined
- [ ] JSON Schema for inputs
- [ ] Context includes ForgeC instance
- [ ] Result format standardized

**Verification:**
```bash
pnpm build
```

---

### Task 3.4.2: Implement forge_converge tool

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/forge-c/src/mcp/tools/converge.ts`

**Implementation:**
```typescript
export const forgeConvergeTool: MCPTool = {
  name: 'forge_converge',
  description: 'Run convergence on input to produce contract-compliant output',
  inputSchema: {
    type: 'object',
    required: ['contractId', 'input'],
    properties: {
      contractId: { type: 'string' },
      input: { type: 'object' },
      options: { type: 'object' }
    }
  },
  
  async execute(input: ConvergeInput, context: MCPContext): Promise<MCPResult> {
    const { contractId, input: data, options } = input;
    
    const contract = await context.forge.loadContract(contractId);
    const session = await context.forge.createSession(contract);
    const result = await session.run(data);
    
    return {
      success: result.status === 'converged',
      data: result
    };
  }
};
```

**Acceptance Criteria:**
- [ ] Loads contract by ID
- [ ] Creates session
- [ ] Runs convergence
- [ ] Returns structured result

**Verification:**
```bash
pnpm test -- --grep "forge_converge"
```

---

### Task 3.4.3: Implement forge_validate and forge_status tools

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/forge-c/src/mcp/tools/validate.ts`
- `packages/forge-c/src/mcp/tools/status.ts`

**forge_validate:**
```typescript
export const forgeValidateTool: MCPTool = {
  name: 'forge_validate',
  description: 'Validate output against a contract without convergence',
  inputSchema: { /* ... */ },
  async execute(input, context): Promise<MCPResult> {
    const { contractId, output } = input;
    const contract = await context.forge.loadContract(contractId);
    const result = await contract.validate(output);
    return { success: result.valid, data: result };
  }
};
```

**forge_status:**
```typescript
export const forgeStatusTool: MCPTool = {
  name: 'forge_status',
  description: 'Get status of a running or completed session',
  inputSchema: { /* ... */ },
  async execute(input, context): Promise<MCPResult> {
    const { sessionId } = input;
    const session = context.forge.getSession(sessionId);
    return { success: true, data: session?.getState() };
  }
};
```

**Acceptance Criteria:**
- [ ] forge_validate runs validators only
- [ ] forge_status returns session state
- [ ] Both handle missing resources gracefully

**Verification:**
```bash
pnpm test -- --grep "forge_validate\|forge_status"
```

---

## Epic 3 Completion Checklist

Before moving to Epic 4:

- [ ] All 12 tasks marked [x] in progress.md
- [ ] `pnpm build` succeeds for forge-c
- [ ] ForgeC class instantiates
- [ ] AnthropicProvider works with API key
- [ ] All 3 plugins implemented
- [ ] All 3 MCP tools implemented
- [ ] Types exported from @forge/forge-c

**Then run:** `.forge/agent-bootstrap.sh next-epic`
