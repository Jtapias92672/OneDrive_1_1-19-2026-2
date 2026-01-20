# Epic 4: Convergence Engine - Atomic Task Breakdown

**Token Budget:** 70K (LIMIT: 70K) ⚠️ CORE IP  
**Tasks:** 14  
**Estimated Time:** 6 days  
**Dependencies:** Epic 3.75 (Code Execution)

---

## Overview

Epic 4 implements the core convergence engine that iteratively refines LLM output until it meets the Answer Contract validation criteria. This is the intellectual property core of FORGE.

---

## Phase 4.1: Core Loop

### Task 4.1.1: Create convergence package structure

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/convergence/src/engine/types.ts`
- `packages/convergence/src/engine/index.ts`
- `packages/convergence/src/index.ts`

**Purpose:** Define convergence engine types and interfaces.

**Implementation:**

```typescript
// packages/convergence/src/engine/types.ts
import { ForgeResult, TokenUsage } from '@forge/core';
import { AnswerContract, ValidationResult } from '@forge/answer-contract';

export interface ConvergenceState {
  iteration: number;
  output: unknown;
  validationResults: ValidationResult[];
  score: number;
  converged: boolean;
  feedback: string[];
}

export interface ConvergenceOptions {
  maxIterations?: number;
  minScore?: number;
  earlyExit?: boolean;
  parallelValidation?: boolean;
}

export interface ConvergenceMetrics {
  totalIterations: number;
  totalTokens: TokenUsage;
  totalDuration: number;
  scoreHistory: number[];
  convergedAt?: number;
}

export interface ConvergenceEngine {
  run(
    contract: AnswerContract,
    input: string,
    options?: ConvergenceOptions
  ): Promise<ForgeResult<ConvergenceState>>;
}
```

**Done When:** Types compile correctly

---

### Task 4.1.2: Implement ConvergenceEngine class

**Time:** 10 minutes | **Tokens:** ~6K

**Files to CREATE:**
- `packages/convergence/src/engine/convergence-engine.ts`

**Purpose:** Main convergence loop implementation.

**Implementation:**

```typescript
// packages/convergence/src/engine/convergence-engine.ts
import { ForgeResult, success, failure, createLogger, TokenTracker } from '@forge/core';
import { AnswerContract, Validator, validatorFactory, ValidationResult } from '@forge/answer-contract';
import { LLMProvider, Message } from '@forge/forge-c';
import { ConvergenceState, ConvergenceOptions, ConvergenceMetrics } from './types.js';
import { FeedbackGenerator } from '../feedback/generator.js';

const logger = createLogger('convergence');

export class ConvergenceEngineImpl {
  private provider: LLMProvider;
  private feedbackGenerator: FeedbackGenerator;
  private tokenTracker: TokenTracker;

  constructor(provider: LLMProvider) {
    this.provider = provider;
    this.feedbackGenerator = new FeedbackGenerator();
    this.tokenTracker = new TokenTracker();
  }

  async run(
    contract: AnswerContract,
    input: string,
    options: ConvergenceOptions = {}
  ): Promise<ForgeResult<ConvergenceState>> {
    const startTime = Date.now();
    const maxIterations = options.maxIterations ?? contract.convergence.maxIterations;
    const minScore = options.minScore ?? contract.convergence.exitConditions.minScore ?? 0.9;
    
    const validators = validatorFactory.createAll(contract.validators);
    let state: ConvergenceState = {
      iteration: 0,
      output: null,
      validationResults: [],
      score: 0,
      converged: false,
      feedback: [],
    };

    const scoreHistory: number[] = [];
    let consecutiveFailures = 0;

    for (let i = 1; i <= maxIterations; i++) {
      state.iteration = i;
      logger.info(`Starting iteration ${i}/${maxIterations}`);

      // Generate output
      const outputResult = await this.generateOutput(contract, input, state);
      if (!outputResult.success) {
        return failure(outputResult.error, { duration: Date.now() - startTime });
      }
      state.output = outputResult.data;

      // Validate output
      state.validationResults = await this.validateOutput(state.output, validators);
      state.score = this.calculateScore(state.validationResults, contract.validators);
      scoreHistory.push(state.score);

      logger.info(`Iteration ${i} score: ${state.score.toFixed(3)}`);

      // Check exit conditions
      if (this.checkConvergence(state, minScore, contract)) {
        state.converged = true;
        logger.info(`Converged at iteration ${i}`);
        break;
      }

      // Check for consecutive failures
      if (state.score < 0.5) {
        consecutiveFailures++;
        if (consecutiveFailures >= contract.convergence.exitConditions.maxConsecutiveFailures) {
          logger.warn('Max consecutive failures reached');
          break;
        }
      } else {
        consecutiveFailures = 0;
      }

      // Generate feedback for next iteration
      state.feedback = this.feedbackGenerator.generate(state.validationResults);
    }

    return success(state, {
      duration: Date.now() - startTime,
      iterations: state.iteration,
      tokensUsed: this.tokenTracker.getUsage(),
    });
  }

  private async generateOutput(
    contract: AnswerContract,
    input: string,
    state: ConvergenceState
  ): Promise<ForgeResult<unknown>> {
    const messages: Message[] = [
      { role: 'system', content: this.buildSystemPrompt(contract) },
      { role: 'user', content: this.buildUserPrompt(input, state) },
    ];

    const result = await this.provider.complete(messages);
    if (!result.success) return result;

    this.tokenTracker.record(result.data.usage);
    
    try {
      return success(JSON.parse(result.data.content));
    } catch {
      return success(result.data.content);
    }
  }

  private buildSystemPrompt(contract: AnswerContract): string {
    return `You are generating output for: ${contract.name}
${contract.description ?? ''}
${contract.context?.systemPrompt ?? ''}

Output requirements:
- Type: ${contract.output.type}
${contract.context?.constraints?.map(c => `- ${c}`).join('\n') ?? ''}`;
  }

  private buildUserPrompt(input: string, state: ConvergenceState): string {
    let prompt = `Request: ${input}`;
    
    if (state.iteration > 1 && state.feedback.length > 0) {
      prompt += `\n\nPrevious attempt feedback:\n${state.feedback.join('\n')}`;
      prompt += `\n\nPlease address this feedback and improve your response.`;
    }
    
    return prompt;
  }

  private async validateOutput(output: unknown, validators: Validator[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    for (const validator of validators) {
      const result = await validator.validate(output);
      if (result.success) {
        results.push(result.data);
      }
    }
    
    return results;
  }

  private calculateScore(results: ValidationResult[], configs: AnswerContract['validators']): number {
    if (results.length === 0) return 0;
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < results.length; i++) {
      const weight = configs[i]?.weight ?? 1;
      weightedSum += results[i].score * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private checkConvergence(state: ConvergenceState, minScore: number, contract: AnswerContract): boolean {
    if (state.score < minScore) return false;
    
    if (contract.convergence.exitConditions.allValidatorsPassing) {
      const requiredValidators = contract.validators.filter(v => v.required !== false);
      const passedRequired = state.validationResults
        .filter((r, i) => contract.validators[i]?.required !== false)
        .every(r => r.valid);
      
      if (!passedRequired) return false;
    }
    
    return true;
  }
}
```

**Done When:** Convergence engine runs iterative loop

---

### Task 4.1.3: Implement validation orchestration

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/convergence/src/engine/validation-orchestrator.ts`

**Purpose:** Orchestrate parallel or sequential validation.

**Implementation:**

```typescript
// packages/convergence/src/engine/validation-orchestrator.ts
import { Validator, ValidationResult } from '@forge/answer-contract';

export interface OrchestrationOptions {
  parallel?: boolean;
  timeout?: number;
  stopOnFirstFailure?: boolean;
}

export class ValidationOrchestrator {
  async orchestrate(
    output: unknown,
    validators: Validator[],
    options: OrchestrationOptions = {}
  ): Promise<ValidationResult[]> {
    if (options.parallel) {
      return this.runParallel(output, validators, options.timeout);
    }
    return this.runSequential(output, validators, options.stopOnFirstFailure);
  }

  private async runParallel(
    output: unknown,
    validators: Validator[],
    timeout?: number
  ): Promise<ValidationResult[]> {
    const promises = validators.map(async (v) => {
      const result = await v.validate(output);
      return result.success ? result.data : null;
    });

    if (timeout) {
      const timeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), timeout)
      );
      const results = await Promise.all(
        promises.map((p) => Promise.race([p, timeoutPromise]))
      );
      return results.filter((r): r is ValidationResult => r !== null);
    }

    const results = await Promise.all(promises);
    return results.filter((r): r is ValidationResult => r !== null);
  }

  private async runSequential(
    output: unknown,
    validators: Validator[],
    stopOnFirstFailure?: boolean
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    for (const validator of validators) {
      const result = await validator.validate(output);
      if (result.success) {
        results.push(result.data);
        if (stopOnFirstFailure && !result.data.valid) {
          break;
        }
      }
    }
    
    return results;
  }
}
```

**Done When:** Orchestrator supports parallel and sequential modes

---

### Task 4.1.4: Implement exit condition evaluator

**Time:** 5 minutes | **Tokens:** ~2K

**Files to CREATE:**
- `packages/convergence/src/engine/exit-conditions.ts`

**Purpose:** Evaluate when convergence loop should exit.

**Implementation:**

```typescript
// packages/convergence/src/engine/exit-conditions.ts
import { ConvergenceConfig, ExitConditions } from '@forge/answer-contract';
import { ConvergenceState } from './types.js';

export type ExitReason = 
  | 'converged'
  | 'max_iterations'
  | 'max_failures'
  | 'min_score_reached'
  | 'cost_limit'
  | 'timeout';

export interface ExitEvaluation {
  shouldExit: boolean;
  reason?: ExitReason;
  details?: string;
}

export class ExitConditionEvaluator {
  evaluate(
    state: ConvergenceState,
    config: ConvergenceConfig,
    metrics: { consecutiveFailures: number; elapsedTime: number; cost: number }
  ): ExitEvaluation {
    const conditions = config.exitConditions;

    // Check max iterations
    if (state.iteration >= config.maxIterations) {
      return { shouldExit: true, reason: 'max_iterations' };
    }

    // Check consecutive failures
    if (metrics.consecutiveFailures >= conditions.maxConsecutiveFailures) {
      return { shouldExit: true, reason: 'max_failures' };
    }

    // Check convergence
    if (conditions.minScore && state.score >= conditions.minScore) {
      if (!conditions.allValidatorsPassing || state.validationResults.every(r => r.valid)) {
        return { shouldExit: true, reason: 'converged' };
      }
    }

    return { shouldExit: false };
  }
}
```

**Done When:** Exit evaluator handles all conditions

---

## Phase 4.2: Strategies

### Task 4.2.1: Implement iterative strategy

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/convergence/src/strategies/iterative.ts`
- `packages/convergence/src/strategies/base.ts`

**Purpose:** Default iterative refinement strategy.

**Implementation:**

```typescript
// packages/convergence/src/strategies/base.ts
import { AnswerContract } from '@forge/answer-contract';
import { ConvergenceState, ConvergenceOptions } from '../engine/types.js';
import { ForgeResult } from '@forge/core';

export interface ConvergenceStrategy {
  name: string;
  run(
    contract: AnswerContract,
    input: string,
    options: ConvergenceOptions
  ): Promise<ForgeResult<ConvergenceState>>;
}
```

```typescript
// packages/convergence/src/strategies/iterative.ts
import { ForgeResult } from '@forge/core';
import { AnswerContract } from '@forge/answer-contract';
import { LLMProvider } from '@forge/forge-c';
import { ConvergenceStrategy } from './base.js';
import { ConvergenceState, ConvergenceOptions } from '../engine/types.js';
import { ConvergenceEngineImpl } from '../engine/convergence-engine.js';

export class IterativeStrategy implements ConvergenceStrategy {
  name = 'iterative';
  private engine: ConvergenceEngineImpl;

  constructor(provider: LLMProvider) {
    this.engine = new ConvergenceEngineImpl(provider);
  }

  async run(
    contract: AnswerContract,
    input: string,
    options: ConvergenceOptions
  ): Promise<ForgeResult<ConvergenceState>> {
    return this.engine.run(contract, input, options);
  }
}
```

**Done When:** Iterative strategy wraps engine

---

### Task 4.2.2: Implement parallel strategy

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/convergence/src/strategies/parallel.ts`

**Purpose:** Generate multiple outputs in parallel and select best.

**Implementation:**

```typescript
// packages/convergence/src/strategies/parallel.ts
import { ForgeResult, success, failure } from '@forge/core';
import { AnswerContract, validatorFactory } from '@forge/answer-contract';
import { LLMProvider } from '@forge/forge-c';
import { ConvergenceStrategy } from './base.js';
import { ConvergenceState, ConvergenceOptions } from '../engine/types.js';

export class ParallelStrategy implements ConvergenceStrategy {
  name = 'parallel';
  private parallelCount: number;

  constructor(private provider: LLMProvider, parallelCount = 3) {
    this.parallelCount = parallelCount;
  }

  async run(
    contract: AnswerContract,
    input: string,
    options: ConvergenceOptions
  ): Promise<ForgeResult<ConvergenceState>> {
    const startTime = Date.now();
    const validators = validatorFactory.createAll(contract.validators);

    // Generate multiple outputs in parallel
    const promises = Array(this.parallelCount).fill(null).map(() =>
      this.provider.complete([
        { role: 'system', content: `Generate output for: ${contract.name}` },
        { role: 'user', content: input },
      ])
    );

    const results = await Promise.all(promises);
    const outputs = results.filter(r => r.success).map(r => r.data!.content);

    // Validate all outputs
    const validatedOutputs = await Promise.all(
      outputs.map(async (output) => {
        const validationResults = await Promise.all(
          validators.map(v => v.validate(output))
        );
        const score = validationResults
          .filter(r => r.success)
          .reduce((sum, r) => sum + r.data!.score, 0) / validators.length;
        return { output, score, validationResults };
      })
    );

    // Select best output
    const best = validatedOutputs.reduce((a, b) => a.score > b.score ? a : b);

    return success({
      iteration: 1,
      output: best.output,
      validationResults: best.validationResults
        .filter(r => r.success)
        .map(r => r.data!),
      score: best.score,
      converged: best.score >= (options.minScore ?? 0.9),
      feedback: [],
    }, { duration: Date.now() - startTime });
  }
}
```

**Done When:** Parallel strategy generates and selects best

---

### Task 4.2.3: Implement chain-of-thought strategy

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/convergence/src/strategies/chain-of-thought.ts`
- `packages/convergence/src/strategies/index.ts`

**Purpose:** Strategy that prompts for explicit reasoning.

**Implementation:**

```typescript
// packages/convergence/src/strategies/chain-of-thought.ts
import { ForgeResult, success } from '@forge/core';
import { AnswerContract, validatorFactory } from '@forge/answer-contract';
import { LLMProvider } from '@forge/forge-c';
import { ConvergenceStrategy } from './base.js';
import { ConvergenceState, ConvergenceOptions } from '../engine/types.js';

export class ChainOfThoughtStrategy implements ConvergenceStrategy {
  name = 'chain_of_thought';

  constructor(private provider: LLMProvider) {}

  async run(
    contract: AnswerContract,
    input: string,
    options: ConvergenceOptions
  ): Promise<ForgeResult<ConvergenceState>> {
    const startTime = Date.now();
    const validators = validatorFactory.createAll(contract.validators);

    // Step 1: Think about the problem
    const thinkingResult = await this.provider.complete([
      { role: 'system', content: 'Think step-by-step about how to solve this problem.' },
      { role: 'user', content: `Problem: ${input}\n\nThink through your approach:` },
    ]);

    if (!thinkingResult.success) {
      return thinkingResult as ForgeResult<ConvergenceState>;
    }

    // Step 2: Generate solution based on thinking
    const solutionResult = await this.provider.complete([
      { role: 'system', content: `You are generating: ${contract.name}` },
      { role: 'user', content: input },
      { role: 'assistant', content: `My thinking: ${thinkingResult.data.content}` },
      { role: 'user', content: 'Now provide your final solution:' },
    ]);

    if (!solutionResult.success) {
      return solutionResult as ForgeResult<ConvergenceState>;
    }

    const output = solutionResult.data.content;
    const validationResults = await Promise.all(
      validators.map(v => v.validate(output))
    );

    const score = validationResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.data!.score, 0) / validators.length;

    return success({
      iteration: 1,
      output,
      validationResults: validationResults.filter(r => r.success).map(r => r.data!),
      score,
      converged: score >= (options.minScore ?? 0.9),
      feedback: [],
    }, { duration: Date.now() - startTime });
  }
}
```

```typescript
// packages/convergence/src/strategies/index.ts
export * from './base.js';
export * from './iterative.js';
export * from './parallel.js';
export * from './chain-of-thought.js';
```

**Done When:** All three strategies implemented

---

## Phase 4.3: Feedback & Recovery

### Task 4.3.1: Implement feedback generator

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/convergence/src/feedback/generator.ts`
- `packages/convergence/src/feedback/index.ts`

**Purpose:** Generate actionable feedback from validation results.

**Implementation:**

```typescript
// packages/convergence/src/feedback/generator.ts
import { ValidationResult } from '@forge/answer-contract';

export class FeedbackGenerator {
  generate(results: ValidationResult[]): string[] {
    const feedback: string[] = [];

    for (const result of results) {
      if (!result.valid) {
        for (const error of result.errors) {
          feedback.push(`Error at ${error.path}: ${error.message}`);
        }
      }
      for (const warning of result.warnings) {
        feedback.push(`Warning at ${warning.path}: ${warning.message}`);
      }
    }

    // Deduplicate and prioritize
    return [...new Set(feedback)].slice(0, 5);
  }

  generateDetailed(results: ValidationResult[]): {
    critical: string[];
    improvements: string[];
    suggestions: string[];
  } {
    const critical: string[] = [];
    const improvements: string[] = [];
    const suggestions: string[] = [];

    for (const result of results) {
      for (const error of result.errors) {
        if (error.code.includes('REQUIRED') || error.code.includes('TYPE')) {
          critical.push(error.message);
        } else {
          improvements.push(error.message);
        }
      }
      for (const warning of result.warnings) {
        suggestions.push(warning.message);
      }
    }

    return { critical, improvements, suggestions };
  }
}
```

```typescript
// packages/convergence/src/feedback/index.ts
export * from './generator.js';
```

**Done When:** Feedback generator creates actionable items

---

### Task 4.3.2: Implement partial recovery

**Time:** 5 minutes | **Tokens:** ~2K

**Files to CREATE:**
- `packages/convergence/src/recovery/partial.ts`

**Purpose:** Attempt to salvage partial outputs when validation fails.

**Implementation:**

```typescript
// packages/convergence/src/recovery/partial.ts
import { ValidationResult } from '@forge/answer-contract';

export interface RecoveryResult {
  recovered: boolean;
  output: unknown;
  appliedFixes: string[];
}

export class PartialRecovery {
  attempt(output: unknown, results: ValidationResult[]): RecoveryResult {
    const appliedFixes: string[] = [];
    let modified = output;

    // Attempt JSON fixes
    if (typeof output === 'string') {
      try {
        modified = JSON.parse(output);
        appliedFixes.push('Parsed JSON from string');
      } catch {
        // Try to extract JSON
        const jsonMatch = output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            modified = JSON.parse(jsonMatch[0]);
            appliedFixes.push('Extracted and parsed JSON block');
          } catch {
            // Keep original
          }
        }
      }
    }

    // Attempt to fix common issues based on validation errors
    if (typeof modified === 'object' && modified !== null) {
      for (const result of results) {
        for (const error of result.errors) {
          if (error.code === 'additionalProperties') {
            // Remove extra properties
            const pathParts = error.path.split('/').filter(Boolean);
            const propName = pathParts[pathParts.length - 1];
            if (propName && (modified as Record<string, unknown>)[propName] !== undefined) {
              delete (modified as Record<string, unknown>)[propName];
              appliedFixes.push(`Removed extra property: ${propName}`);
            }
          }
        }
      }
    }

    return {
      recovered: appliedFixes.length > 0,
      output: modified,
      appliedFixes,
    };
  }
}
```

**Done When:** Partial recovery attempts common fixes

---

### Task 4.3.3: Implement retry with backoff

**Time:** 5 minutes | **Tokens:** ~2K

**Files to CREATE:**
- `packages/convergence/src/recovery/retry.ts`
- `packages/convergence/src/recovery/index.ts`

**Purpose:** Retry failed operations with exponential backoff.

**Implementation:**

```typescript
// packages/convergence/src/recovery/retry.ts
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000, backoffMultiplier = 2 } = options;

  let lastError: Error | undefined;
  let delay = baseDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  throw lastError ?? new Error('Operation failed after retries');
}
```

```typescript
// packages/convergence/src/recovery/index.ts
export * from './partial.js';
export * from './retry.js';
```

**Done When:** Retry utility handles backoff

---

## Phase 4.4: Integration

### Task 4.4.1: Connect convergence to ForgeC

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/convergence/src/integration/forge-integration.ts`

**Purpose:** Integrate convergence engine with ForgeC orchestrator.

**Implementation:**

```typescript
// packages/convergence/src/integration/forge-integration.ts
import { ForgeResult, success, failure } from '@forge/core';
import { AnswerContract } from '@forge/answer-contract';
import { ForgeC, LLMProvider, ConvergenceResult } from '@forge/forge-c';
import { IterativeStrategy } from '../strategies/iterative.js';
import { ParallelStrategy } from '../strategies/parallel.js';
import { ChainOfThoughtStrategy } from '../strategies/chain-of-thought.js';
import { ConvergenceOptions } from '../engine/types.js';

export function createConvergenceRunner(forge: ForgeC) {
  return async function runConvergence(
    contract: AnswerContract,
    input: string,
    options: ConvergenceOptions = {}
  ): Promise<ForgeResult<ConvergenceResult>> {
    const provider = forge.getProvider();
    if (!provider) {
      return failure({ code: 'NO_PROVIDER', message: 'No LLM provider configured' }, { duration: 0 });
    }

    const strategy = getStrategy(contract.convergence.strategy, provider);
    const result = await strategy.run(contract, input, options);

    if (!result.success) {
      return failure(result.error, result.metadata);
    }

    return success({
      success: result.data.converged,
      iterations: result.data.iteration,
      finalOutput: result.data.output,
      validationResults: result.data.validationResults,
      totalTokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      totalCost: 0,
      duration: result.metadata.duration,
    }, result.metadata);
  };
}

function getStrategy(name: string, provider: LLMProvider) {
  switch (name) {
    case 'parallel':
      return new ParallelStrategy(provider);
    case 'chain_of_thought':
      return new ChainOfThoughtStrategy(provider);
    default:
      return new IterativeStrategy(provider);
  }
}
```

**Done When:** Integration connects all components

---

### Task 4.4.2: Add plugin event emission

**Time:** 5 minutes | **Tokens:** ~2K

**Files to CREATE:**
- `packages/convergence/src/integration/events.ts`

**Purpose:** Emit events for plugins during convergence.

**Implementation:**

```typescript
// packages/convergence/src/integration/events.ts
import { ForgeSession, IterationResult, Plugin } from '@forge/forge-c';
import { ValidationResult } from '@forge/answer-contract';

export class EventEmitter {
  constructor(private plugins: Plugin[]) {}

  async emitIterationStart(session: ForgeSession, iteration: number): Promise<void> {
    for (const plugin of this.plugins) {
      await plugin.onIterationStart?.(session, iteration);
    }
  }

  async emitIterationEnd(session: ForgeSession, iteration: number, result: IterationResult): Promise<void> {
    for (const plugin of this.plugins) {
      await plugin.onIterationEnd?.(session, iteration, result);
    }
  }

  async emitValidationComplete(session: ForgeSession, results: ValidationResult[]): Promise<void> {
    for (const plugin of this.plugins) {
      await plugin.onValidationComplete?.(session, results);
    }
  }

  async emitError(session: ForgeSession, error: Error): Promise<void> {
    for (const plugin of this.plugins) {
      await plugin.onError?.(session, error);
    }
  }
}
```

**Done When:** Events emitted to plugins

---

### Task 4.4.3: Create package exports

**Time:** 5 minutes | **Tokens:** ~2K

**Files to CREATE/UPDATE:**
- `packages/convergence/src/integration/index.ts`
- `packages/convergence/src/index.ts`

**Purpose:** Export all convergence components.

**Implementation:**

```typescript
// packages/convergence/src/integration/index.ts
export * from './forge-integration.js';
export * from './events.js';
```

```typescript
// packages/convergence/src/index.ts
export * from './engine/index.js';
export * from './strategies/index.js';
export * from './feedback/index.js';
export * from './recovery/index.js';
export * from './integration/index.js';
```

**Verification:**
```bash
cd packages/convergence && pnpm build
node -e "import('@forge/convergence').then(m => console.log(Object.keys(m)))"
```

**Done When:** All exports work from @forge/convergence

---

### Task 4.4.4: Write integration tests

**Time:** 10 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/convergence/src/__tests__/convergence.test.ts`

**Purpose:** Integration tests for convergence engine.

**Implementation:**

```typescript
// packages/convergence/src/__tests__/convergence.test.ts
import { describe, it, expect, vi } from 'vitest';
import { IterativeStrategy } from '../strategies/iterative.js';
import { FeedbackGenerator } from '../feedback/generator.js';
import { PartialRecovery } from '../recovery/partial.js';

describe('Convergence Engine', () => {
  describe('FeedbackGenerator', () => {
    it('generates feedback from validation errors', () => {
      const generator = new FeedbackGenerator();
      const feedback = generator.generate([
        {
          valid: false,
          score: 0.5,
          errors: [{ path: '/name', message: 'Required', code: 'REQUIRED' }],
          warnings: [],
        },
      ]);
      expect(feedback).toContain('Error at /name: Required');
    });
  });

  describe('PartialRecovery', () => {
    it('extracts JSON from string', () => {
      const recovery = new PartialRecovery();
      const result = recovery.attempt('Here is the JSON: {"key": "value"}', []);
      expect(result.recovered).toBe(true);
      expect(result.output).toEqual({ key: 'value' });
    });
  });
});
```

**Done When:** Tests pass

---

## Epic 4 Completion Checklist

Before moving to Epic 5:

- [ ] All 14 tasks marked [x] in progress.md
- [ ] `pnpm build` succeeds for convergence
- [ ] `pnpm test` passes
- [ ] ConvergenceEngine runs iterative loop
- [ ] All 3 strategies implemented
- [ ] Feedback generator creates actionable items
- [ ] Integration with ForgeC complete

**Commit:** `git commit -m "Epic 4: Convergence Engine complete"`

**Next:** Epic 5 - Figma Parser
