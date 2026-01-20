# Epic 3: FORGE C Core Orchestrator

**Duration:** 5 days  
**Token Budget:** 60K tokens  
**Status:** Not Started  
**Dependencies:** Epic 1 (Foundation), Epic 2 (Answer Contract)

---

## Epic Goal

Build FORGE C (Convergent), the central orchestration engine that coordinates LLM generation, validation, and iterative refinement until outputs satisfy their Answer Contracts.

---

## User Stories

### US-3.1: Core Orchestrator Architecture
**As a** platform operator  
**I want** a central orchestration engine  
**So that** all generation flows through a single, auditable system

**Acceptance Criteria:**
- [ ] ForgeC class as main entry point
- [ ] Plugin architecture for extensibility
- [ ] Event-driven execution with hooks
- [ ] Graceful error handling and recovery
- [ ] Comprehensive logging at all stages

**Core Architecture:**
```typescript
// packages/forge-c/src/index.ts
export class ForgeC {
  private plugins: ForgePlugin[] = [];
  private eventBus: EventBus;
  private convergenceEngine: ConvergenceEngine;
  private contractLoader: ContractLoader;
  
  constructor(config: ForgeCConfig) {
    this.eventBus = new EventBus();
    this.convergenceEngine = new ConvergenceEngine(config.convergence);
    this.contractLoader = new ContractLoader(config.contracts);
    
    // Register built-in plugins
    this.use(new LoggingPlugin());
    this.use(new MetricsPlugin());
    this.use(new EvidencePlugin());
  }
  
  use(plugin: ForgePlugin): this {
    this.plugins.push(plugin);
    plugin.register(this.eventBus);
    return this;
  }
  
  async converge<T>(
    request: ConvergenceRequest,
    options?: ConvergenceOptions
  ): Promise<ConvergenceResult<T>> {
    const session = this.createSession(request);
    
    this.eventBus.emit('convergence:start', { session, request });
    
    try {
      const contract = await this.contractLoader.load(request.contractId);
      const result = await this.convergenceEngine.run<T>(
        session,
        contract,
        request,
        options
      );
      
      this.eventBus.emit('convergence:complete', { session, result });
      return result;
      
    } catch (error) {
      this.eventBus.emit('convergence:error', { session, error });
      throw new ForgeConvergenceError(error, session);
    }
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/forge-c test:core
```

---

### US-3.2: Session Management
**As a** platform operator  
**I want** each convergence run tracked as a session  
**So that** I can audit and debug any generation

**Acceptance Criteria:**
- [ ] Unique session IDs (ULID format)
- [ ] Session state persistence
- [ ] Session replay capability
- [ ] Session timeout handling
- [ ] Concurrent session limits

**Session Implementation:**
```typescript
// packages/forge-c/src/session.ts
export interface ForgeSession {
  id: string;                    // ULID
  projectId: string;
  contractId: string;
  status: SessionStatus;
  startedAt: Date;
  completedAt?: Date;
  iterations: IterationRecord[];
  finalOutput?: unknown;
  evidence: EvidenceCollector;
  metrics: SessionMetrics;
}

export class SessionManager {
  private activeSessions: Map<string, ForgeSession> = new Map();
  private storage: SessionStorage;
  
  async create(request: ConvergenceRequest): Promise<ForgeSession> {
    const session: ForgeSession = {
      id: ulid(),
      projectId: request.projectId,
      contractId: request.contractId,
      status: 'initializing',
      startedAt: new Date(),
      iterations: [],
      evidence: new EvidenceCollector(),
      metrics: new SessionMetrics(),
    };
    
    this.activeSessions.set(session.id, session);
    await this.storage.save(session);
    
    return session;
  }
  
  async checkpoint(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new SessionNotFoundError(sessionId);
    
    await this.storage.save(session);
  }
  
  async replay(sessionId: string): Promise<ReplayResult> {
    const session = await this.storage.load(sessionId);
    // Replay logic for debugging
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/forge-c test:session
```

---

### US-3.3: LLM Provider Abstraction
**As a** platform operator  
**I want** to swap LLM providers  
**So that** I'm not locked into a single vendor

**Acceptance Criteria:**
- [ ] Provider interface abstraction
- [ ] Anthropic Claude provider
- [ ] OpenAI GPT provider
- [ ] AWS Bedrock provider
- [ ] Provider fallback chain
- [ ] Rate limiting per provider

**Provider Interface:**
```typescript
// packages/forge-c/src/providers/types.ts
export interface LLMProvider {
  name: string;
  models: string[];
  
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncIterable<StreamChunk>;
  
  estimateTokens(text: string): number;
  getModelLimits(model: string): ModelLimits;
}

export interface CompletionRequest {
  model: string;
  messages: Message[];
  maxTokens: number;
  temperature?: number;
  systemPrompt?: string;
  tools?: Tool[];
}

// packages/forge-c/src/providers/anthropic.ts
export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  models = ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'];
  
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens,
      messages: this.formatMessages(request.messages),
      system: request.systemPrompt,
    });
    
    return this.parseResponse(response);
  }
}
```

**Provider Chain:**
```typescript
// packages/forge-c/src/providers/chain.ts
export class ProviderChain {
  private providers: LLMProvider[];
  
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    for (const provider of this.providers) {
      try {
        return await provider.complete(request);
      } catch (error) {
        if (this.isRetryable(error)) continue;
        throw error;
      }
    }
    throw new AllProvidersFailedError();
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/forge-c test:providers
```

---

### US-3.4: Prompt Template Engine
**As a** contract author  
**I want** structured prompt templates  
**So that** prompts are consistent and optimized

**Acceptance Criteria:**
- [ ] Handlebars-based template syntax
- [ ] Context variable injection
- [ ] Partial templates for reuse
- [ ] Prompt versioning
- [ ] Token estimation before send

**Template System:**
```typescript
// packages/forge-c/src/prompts/engine.ts
export class PromptEngine {
  private templates: Map<string, CompiledTemplate> = new Map();
  
  compile(template: string): CompiledTemplate {
    return Handlebars.compile(template, { strict: true });
  }
  
  render(templateId: string, context: PromptContext): RenderedPrompt {
    const template = this.templates.get(templateId);
    if (!template) throw new TemplateNotFoundError(templateId);
    
    const rendered = template(context);
    const tokens = this.estimateTokens(rendered);
    
    return {
      content: rendered,
      estimatedTokens: tokens,
      context: this.sanitizeContext(context),
    };
  }
}

// Example template
const CONVERGENCE_PROMPT = `
You are generating a {{contractName}} that must satisfy specific requirements.

## Contract Requirements
{{#each requirements}}
- {{this}}
{{/each}}

## Previous Attempt
{{#if previousOutput}}
Your previous output:
\`\`\`json
{{previousOutput}}
\`\`\`

## Validation Errors
{{#each validationErrors}}
- {{this.message}} ({{this.path}})
{{/each}}

Fix these issues while maintaining the valid parts.
{{else}}
Generate a new {{contractName}} from scratch.
{{/if}}

## Output Format
Respond with valid JSON matching this schema:
\`\`\`json
{{schemaExample}}
\`\`\`
`;
```

**Verification:**
```bash
pnpm --filter @forge/forge-c test:prompts
```

---

### US-3.5: Plugin System
**As a** platform developer  
**I want** to extend FORGE with plugins  
**So that** custom functionality can be added without modifying core

**Acceptance Criteria:**
- [ ] Plugin lifecycle hooks
- [ ] Event subscription
- [ ] Context modification
- [ ] Built-in plugins: Logging, Metrics, Evidence
- [ ] Plugin configuration

**Plugin Interface:**
```typescript
// packages/forge-c/src/plugins/types.ts
export interface ForgePlugin {
  name: string;
  version: string;
  
  register(eventBus: EventBus): void;
  
  // Lifecycle hooks (optional)
  onSessionStart?(session: ForgeSession): Promise<void>;
  onIterationStart?(iteration: IterationContext): Promise<void>;
  onIterationComplete?(iteration: IterationContext, result: IterationResult): Promise<void>;
  onValidation?(output: unknown, result: ValidationResult): Promise<void>;
  onConvergence?(session: ForgeSession, result: ConvergenceResult): Promise<void>;
  onError?(session: ForgeSession, error: Error): Promise<void>;
}

// packages/forge-c/src/plugins/logging.ts
export class LoggingPlugin implements ForgePlugin {
  name = 'logging';
  version = '1.0.0';
  
  private logger: Logger;
  
  register(eventBus: EventBus): void {
    eventBus.on('convergence:start', this.logStart.bind(this));
    eventBus.on('iteration:complete', this.logIteration.bind(this));
    eventBus.on('convergence:complete', this.logComplete.bind(this));
    eventBus.on('convergence:error', this.logError.bind(this));
  }
  
  private logIteration(ctx: { iteration: IterationContext; result: IterationResult }) {
    this.logger.info('Iteration complete', {
      sessionId: ctx.iteration.sessionId,
      iterationNumber: ctx.iteration.number,
      valid: ctx.result.valid,
      tokensUsed: ctx.result.tokensUsed,
    });
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/forge-c test:plugins
```

---

### US-3.6: MCP Tool Surface
**As an** external system  
**I want** MCP tools for FORGE operations  
**So that** AI agents can use FORGE capabilities

**Acceptance Criteria:**
- [ ] `forge_converge` - Start convergence
- [ ] `forge_validate` - Validate output against contract
- [ ] `forge_status` - Check session status
- [ ] `forge_evidence` - Retrieve evidence pack
- [ ] Tool parameter validation
- [ ] Streaming progress updates

**MCP Tool Definitions:**
```typescript
// packages/forge-c/src/mcp/tools.ts
export const forgeTools: MCPTool[] = [
  {
    name: 'forge_converge',
    description: 'Start a convergence session to generate output matching a contract',
    inputSchema: {
      type: 'object',
      required: ['contractId', 'input'],
      properties: {
        contractId: {
          type: 'string',
          description: 'ID of the answer contract to use',
        },
        input: {
          type: 'object',
          description: 'Input data for generation',
        },
        options: {
          type: 'object',
          properties: {
            maxIterations: { type: 'number', default: 5 },
            timeout: { type: 'number', default: 300000 },
          },
        },
      },
    },
    handler: async (params, context) => {
      const forge = context.getForgeC();
      const result = await forge.converge(params);
      return {
        sessionId: result.sessionId,
        status: result.status,
        output: result.finalOutput,
        iterations: result.iterations,
      };
    },
  },
  // Additional tools...
];
```

**Verification:**
```bash
pnpm --filter @forge/forge-c test:mcp
```

---

## Key Deliverables

```
packages/forge-c/
├── src/
│   ├── index.ts                 # ForgeC main class
│   ├── session.ts               # Session management
│   ├── providers/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── anthropic.ts
│   │   ├── openai.ts
│   │   ├── bedrock.ts
│   │   └── chain.ts
│   ├── prompts/
│   │   ├── engine.ts
│   │   ├── templates/
│   │   └── partials/
│   ├── plugins/
│   │   ├── types.ts
│   │   ├── logging.ts
│   │   ├── metrics.ts
│   │   └── evidence.ts
│   ├── mcp/
│   │   ├── tools.ts
│   │   └── server.ts
│   └── types/
│       └── index.ts
├── __tests__/
│   ├── forge-c.test.ts
│   ├── session.test.ts
│   ├── providers.test.ts
│   └── plugins.test.ts
├── package.json
└── tsconfig.json
```

---

## Completion Criteria

- [ ] ForgeC class instantiates and runs
- [ ] Session management with persistence
- [ ] At least 2 LLM providers working
- [ ] Plugin system with 3 built-in plugins
- [ ] MCP tools defined and functional
- [ ] Prompt template engine working
- [ ] 85%+ test coverage
- [ ] Integration test: Load contract → Run convergence → Get result

---

## Handoff Context for Epic 4

**What Epic 4 needs to know:**
- Import: `import { ForgeC, ForgeSession } from '@forge/forge-c'`
- Session interface for convergence loop
- Provider abstraction for LLM calls
- Event bus for iteration tracking

**Key Integration Point:**
```typescript
// Epic 4 will implement this method
interface ConvergenceEngine {
  run<T>(
    session: ForgeSession,
    contract: CompiledContract,
    request: ConvergenceRequest,
    options?: ConvergenceOptions
  ): Promise<ConvergenceResult<T>>;
}
```

---

## Verification Script

```bash
#!/bin/bash
# .forge/epics/epic-03-forge-c-core/verify.sh

echo "🔍 Verifying Epic 3: FORGE C Core"

cd packages/forge-c

# Check source files
[ -f "src/index.ts" ] || { echo "❌ index.ts missing"; exit 1; }
[ -f "src/session.ts" ] || { echo "❌ session.ts missing"; exit 1; }
[ -f "src/providers/anthropic.ts" ] || { echo "❌ Anthropic provider missing"; exit 1; }
[ -f "src/plugins/logging.ts" ] || { echo "❌ Logging plugin missing"; exit 1; }
[ -f "src/mcp/tools.ts" ] || { echo "❌ MCP tools missing"; exit 1; }

# Run tests
pnpm test || { echo "❌ Tests failed"; exit 1; }

# Build check
pnpm build || { echo "❌ Build failed"; exit 1; }

# Integration test
pnpm test:integration || { echo "❌ Integration tests failed"; exit 1; }

echo "✅ Epic 3 verification complete"
```
