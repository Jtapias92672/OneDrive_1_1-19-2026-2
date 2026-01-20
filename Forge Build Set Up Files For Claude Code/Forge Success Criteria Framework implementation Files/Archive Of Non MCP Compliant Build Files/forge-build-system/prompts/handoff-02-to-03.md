# Epic 3 Initialization: FORGE C Core Orchestrator

**Read Time:** 2 minutes | **Context Load:** ~10K tokens

---

## What Was Built (Epic 2: Answer Contract)

- ✅ **Contract Schema**: JSON Schema defining contract structure
- ✅ **YAML/JSON Parser**: `parseContract(content) → AnswerContract`
- ✅ **Validator System**: JSON Schema, custom, LLM Judge validators
- ✅ **Template Registry**: ECR, Jira Ticket, React Component templates
- ✅ **Type Definitions**: Full TypeScript types for contracts

---

## Key Imports Available

```typescript
// Contract loading and validation
import { 
  ContractLoader,
  CompiledContract,
  ValidationResult,
  Validator
} from '@forge/answer-contract';

// Load a contract
const loader = new ContractLoader();
const contract = await loader.load('ecr-v1');

// Validate output against contract
const result = await contract.validate(output);
// result.valid: boolean
// result.errors: ValidationError[]
```

---

## Your Mission (Epic 3)

Build **FORGE C** - the central orchestration engine. This coordinates:
- LLM provider calls (Anthropic, OpenAI, Bedrock)
- Session management (tracking, persistence)
- Plugin system (logging, metrics, evidence)
- MCP tool surface (forge_converge, forge_validate)

**Note:** You're building the FRAMEWORK. Epic 4 builds the actual convergence loop.

---

## DO NOT

- ❌ Load Epic 2 parser implementation (just import)
- ❌ Modify contract schema or templates
- ❌ Build the convergence loop (that's Epic 4)
- ❌ Stay in session longer than ONE task

---

## DO

- ✅ Create `packages/forge-c/` package
- ✅ Build LLM provider abstraction (multi-provider)
- ✅ Build session management system
- ✅ Build plugin architecture
- ✅ Define MCP tool interfaces
- ✅ ONE task per session, then EXIT

---

## Token Budget

- **Per-task:** 5-8K tokens
- **Epic total:** 60K tokens across ~10 tasks

---

## First Steps

1. Read: `.forge/epics/epic-03-forge-c-core/TASKS.md`
2. Start: Task 3.1.1 (Create ForgeC class skeleton)
3. Update: `progress.md` when task complete
4. EXIT session

---

## Key Architecture Pattern

```typescript
// ForgeC is the main entry point
const forge = new ForgeC({
  providers: [anthropicProvider, openaiProvider],
  plugins: [loggingPlugin, metricsPlugin],
});

// Session tracks a single generation attempt
const session = forge.createSession(contract);

// Epic 4 will add: session.converge()
```

---

## Provider Interface (What You're Building)

```typescript
interface LLMProvider {
  name: string;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  estimateTokens(text: string): number;
}

// You'll implement:
// - AnthropicProvider
// - OpenAIProvider (optional)
// - BedrockProvider (optional)
```

---

## Key Files (Reference Only)

- `packages/answer-contract/src/types.ts` - Contract types
- `packages/answer-contract/src/loader.ts` - How contracts load
- `packages/core/src/tokens.ts` - Token tracking pattern
