# Epic 4: Convergence Engine - Atomic Task Breakdown

**Total Tasks:** 14  
**Estimated Tokens:** 70K total (~5K per task)  
**Estimated Time:** 6 days

⚠️ **This is the largest and most critical epic - the core IP of FORGE.**

---

## Phase 4.1: Core Convergence Loop

### Task 4.1.1: Create convergence package structure

**Time:** 5 minutes  
**Tokens:** ~3K  
**Files to CREATE:**
- `packages/convergence/package.json`
- `packages/convergence/tsconfig.json`
- `packages/convergence/src/index.ts`

**Directory Structure:**
```
packages/convergence/
├── src/
│   ├── index.ts
│   ├── engine.ts
│   ├── strategies/
│   ├── feedback/
│   ├── cost/
│   └── types.ts
├── package.json
└── tsconfig.json
```

**Dependencies:**
```json
{
  "dependencies": {
    "@forge/core": "workspace:*",
    "@forge/answer-contract": "workspace:*",
    "@forge/forge-c": "workspace:*"
  }
}
```

**Acceptance Criteria:**
- [ ] Package name is `@forge/convergence`
- [ ] Depends on forge-c and answer-contract
- [ ] `pnpm build` succeeds

**Verification:**
```bash
cd packages/convergence && pnpm build
```

---

### Task 4.1.2: Create ConvergenceEngine class skeleton

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/convergence/src/engine.ts`
- `packages/convergence/src/types.ts`

**Implementation:**
```typescript
export interface ConvergenceOptions {
  maxIterations?: number;      // Default: 5
  maxTokens?: number;          // Default: 50000
  maxCost?: number;            // Default: $1.00
  timeout?: number;            // Default: 300000 (5 min)
  strategy?: ConvergenceStrategy;
}

export interface ConvergenceResult {
  status: 'converged' | 'failed' | 'max_iterations' | 'timeout' | 'budget_exceeded';
  iterations: number;
  finalOutput: unknown;
  tokenUsage: TokenUsage;
  cost: number;
  durationMs: number;
  trace: IterationTrace[];
}

export class ConvergenceEngine {
  constructor(
    private session: ForgeSession,
    private contract: CompiledContract,
    private options: ConvergenceOptions = {}
  ) {}
  
  async run(input: unknown): Promise<ConvergenceResult> {
    // Main convergence loop - implement in next tasks
    throw new Error('Not implemented');
  }
}
```

**Acceptance Criteria:**
- [ ] Class skeleton with constructor
- [ ] Options with sensible defaults
- [ ] Result type fully defined
- [ ] Exported from package

**Verification:**
```typescript
import { ConvergenceEngine } from '@forge/convergence';
```

---

### Task 4.1.3: Implement core convergence loop

**Time:** 10 minutes  
**Tokens:** ~8K  
**Files to MODIFY:**
- `packages/convergence/src/engine.ts`

**Implementation:**
```typescript
async run(input: unknown): Promise<ConvergenceResult> {
  const startTime = Date.now();
  const trace: IterationTrace[] = [];
  let currentOutput = input;
  let iteration = 0;
  
  while (iteration < this.options.maxIterations) {
    iteration++;
    
    // Check budget/timeout before iteration
    if (this.shouldExit(trace, startTime)) {
      return this.buildResult('budget_exceeded', trace, currentOutput);
    }
    
    // Run single iteration
    const iterResult = await this.runIteration(iteration, currentOutput);
    trace.push(iterResult);
    
    // Check if converged
    if (iterResult.validation.valid) {
      return this.buildResult('converged', trace, iterResult.output);
    }
    
    // Check for no progress (same errors twice)
    if (this.detectNoProgress(trace)) {
      return this.buildResult('failed', trace, currentOutput);
    }
    
    currentOutput = iterResult.output;
  }
  
  return this.buildResult('max_iterations', trace, currentOutput);
}

private async runIteration(iteration: number, input: unknown): Promise<IterationTrace> {
  // Generate → Validate → Return
  const generated = await this.generate(input);
  const validation = await this.validate(generated);
  
  return {
    iteration,
    input,
    output: generated,
    validation,
    tokensUsed: this.session.getTokensUsed(),
    timestamp: new Date()
  };
}
```

**Acceptance Criteria:**
- [ ] Loop runs until converged or max iterations
- [ ] Checks budget/timeout before each iteration
- [ ] Detects no-progress condition
- [ ] Returns appropriate status

**Verification:**
```bash
pnpm test -- --grep "convergence loop"
```

---

### Task 4.1.4: Implement validation step

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to MODIFY:**
- `packages/convergence/src/engine.ts`

**Implementation:**
```typescript
private async validate(output: unknown): Promise<ValidationResult> {
  const validators = this.contract.validators;
  const results: ValidatorResult[] = [];
  
  for (const validator of validators) {
    const result = await validator.validate(output);
    results.push(result);
    
    // Short-circuit on critical failure
    if (!result.valid && result.severity === 'critical') {
      break;
    }
  }
  
  return {
    valid: results.every(r => r.valid),
    errors: results.flatMap(r => r.errors),
    warnings: results.flatMap(r => r.warnings),
    validatorResults: results
  };
}
```

**Acceptance Criteria:**
- [ ] Runs all contract validators
- [ ] Aggregates errors and warnings
- [ ] Short-circuits on critical failure
- [ ] Returns complete validation result

**Verification:**
```bash
pnpm test -- --grep "validation step"
```

---

### Task 4.1.5: Implement no-progress detection

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to MODIFY:**
- `packages/convergence/src/engine.ts`

**Implementation:**
```typescript
private detectNoProgress(trace: IterationTrace[]): boolean {
  if (trace.length < 2) return false;
  
  const current = trace[trace.length - 1];
  const previous = trace[trace.length - 2];
  
  // Compare error signatures
  const currentErrors = this.getErrorSignature(current.validation.errors);
  const previousErrors = this.getErrorSignature(previous.validation.errors);
  
  // Same errors twice = no progress
  if (currentErrors === previousErrors) {
    this.logger.warn('No progress detected', {
      iteration: current.iteration,
      errors: currentErrors
    });
    return true;
  }
  
  // Error count increasing = diverging
  if (current.validation.errors.length > previous.validation.errors.length * 1.5) {
    this.logger.warn('Diverging detected', {
      iteration: current.iteration,
      errorCount: current.validation.errors.length
    });
    return true;
  }
  
  return false;
}

private getErrorSignature(errors: ValidationError[]): string {
  return errors
    .map(e => `${e.path}:${e.code}`)
    .sort()
    .join('|');
}
```

**Acceptance Criteria:**
- [ ] Detects identical errors across iterations
- [ ] Detects diverging (increasing errors)
- [ ] Uses error signature comparison
- [ ] Logs warnings

**Verification:**
```bash
pnpm test -- --grep "no progress"
```

---

## Phase 4.2: Feedback Generation

### Task 4.2.1: Create FeedbackGenerator class

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/convergence/src/feedback/generator.ts`
- `packages/convergence/src/feedback/types.ts`

**Implementation:**
```typescript
export interface StructuredFeedback {
  summary: string;
  errors: FeedbackItem[];
  suggestions: string[];
}

export interface FeedbackItem {
  severity: 'error' | 'warning';
  location: string;
  issue: string;
  expected: string;
  actual: string;
  suggestion: string;
}

export class FeedbackGenerator {
  generate(validation: ValidationResult, previousOutput: unknown): StructuredFeedback {
    const errors = validation.errors.map(e => this.formatError(e));
    const suggestions = this.generateSuggestions(validation.errors);
    
    return {
      summary: this.generateSummary(validation),
      errors,
      suggestions
    };
  }
  
  private formatError(error: ValidationError): FeedbackItem {
    return {
      severity: error.severity || 'error',
      location: error.path || 'root',
      issue: error.message,
      expected: error.expected || 'unknown',
      actual: error.actual || 'unknown',
      suggestion: this.suggestFix(error)
    };
  }
}
```

**Acceptance Criteria:**
- [ ] Converts ValidationResult to LLM-friendly feedback
- [ ] Includes fix suggestions
- [ ] Structured format for parsing
- [ ] Summary for quick understanding

**Verification:**
```bash
pnpm test -- --grep "FeedbackGenerator"
```

---

### Task 4.2.2: Create repair prompt builder

**Time:** 5 minutes  
**Tokens:** ~5K  
**Files to CREATE:**
- `packages/convergence/src/feedback/repair-prompt.ts`

**Implementation:**
```typescript
export class RepairPromptBuilder {
  build(feedback: StructuredFeedback, context: RepairContext): string {
    return `
## Validation Feedback

${feedback.summary}

### Errors to Fix (${feedback.errors.length})

${feedback.errors.map((e, i) => `
**${i + 1}. ${e.severity.toUpperCase()} at \`${e.location}\`**
- Issue: ${e.issue}
- Expected: ${e.expected}
- Got: ${e.actual}
- Suggestion: ${e.suggestion}
`).join('\n')}

### Repair Instructions

Fix each error above. Return ONLY the corrected output in the same format.
Do not include explanations or markdown formatting around the output.

${context.additionalInstructions || ''}
`.trim();
  }
  
  buildMinimal(feedback: StructuredFeedback): string {
    // Token-efficient version for simple fixes
    return feedback.errors
      .map(e => `Fix ${e.location}: ${e.issue} → ${e.suggestion}`)
      .join('\n');
  }
}
```

**Acceptance Criteria:**
- [ ] Generates clear repair prompts
- [ ] Includes all error details
- [ ] Has minimal version for token efficiency
- [ ] Customizable with context

**Verification:**
```bash
pnpm test -- --grep "RepairPromptBuilder"
```

---

## Phase 4.3: Convergence Strategies

### Task 4.3.1: Define Strategy interface

**Time:** 5 minutes  
**Tokens:** ~3K  
**Files to CREATE:**
- `packages/convergence/src/strategies/types.ts`

**Types:**
```typescript
export interface ConvergenceStrategy {
  name: string;
  
  initialize(contract: CompiledContract, options: StrategyOptions): void;
  
  generateNext(
    input: unknown,
    feedback: StructuredFeedback | null,
    history: IterationTrace[]
  ): Promise<GenerationResult>;
  
  shouldContinue(history: IterationTrace[]): boolean;
}

export interface GenerationResult {
  output: unknown;
  tokensUsed: number;
  metadata?: Record<string, unknown>;
}
```

**Acceptance Criteria:**
- [ ] Strategy interface defined
- [ ] Supports stateful initialization
- [ ] Provides generateNext method
- [ ] Has shouldContinue hook

**Verification:**
```bash
pnpm build
```

---

### Task 4.3.2: Implement IterativeRefinementStrategy

**Time:** 8 minutes  
**Tokens:** ~6K  
**Files to CREATE:**
- `packages/convergence/src/strategies/iterative.ts`

**Implementation:**
```typescript
export class IterativeRefinementStrategy implements ConvergenceStrategy {
  name = 'iterative_refinement';
  private promptBuilder = new RepairPromptBuilder();
  private provider: LLMProvider;
  
  initialize(contract: CompiledContract, options: StrategyOptions): void {
    this.provider = options.provider;
  }
  
  async generateNext(
    input: unknown,
    feedback: StructuredFeedback | null,
    history: IterationTrace[]
  ): Promise<GenerationResult> {
    // First iteration: generate from input
    if (!feedback) {
      return this.generateInitial(input);
    }
    
    // Subsequent: repair based on feedback
    const repairPrompt = this.promptBuilder.build(feedback, {
      previousOutput: history[history.length - 1]?.output
    });
    
    const response = await this.provider.complete({
      model: this.options.model,
      messages: [
        { role: 'user', content: repairPrompt }
      ],
      maxTokens: this.options.maxTokensPerIteration
    });
    
    return {
      output: this.parseOutput(response.content),
      tokensUsed: response.usage.inputTokens + response.usage.outputTokens
    };
  }
  
  shouldContinue(history: IterationTrace[]): boolean {
    // Continue if making progress
    return history.length < 2 || 
      history[history.length - 1].validation.errors.length <
      history[history.length - 2].validation.errors.length;
  }
}
```

**Acceptance Criteria:**
- [ ] Generates initial output from input
- [ ] Repairs based on feedback
- [ ] Tracks token usage
- [ ] Implements shouldContinue

**Verification:**
```bash
pnpm test -- --grep "IterativeRefinementStrategy"
```

---

### Task 4.3.3: Implement ParallelVotingStrategy

**Time:** 8 minutes  
**Tokens:** ~6K  
**Files to CREATE:**
- `packages/convergence/src/strategies/parallel.ts`

**Implementation:**
```typescript
export class ParallelVotingStrategy implements ConvergenceStrategy {
  name = 'parallel_voting';
  
  async generateNext(
    input: unknown,
    feedback: StructuredFeedback | null,
    history: IterationTrace[]
  ): Promise<GenerationResult> {
    const candidates = await Promise.all(
      Array(this.options.candidateCount || 3).fill(null).map(() =>
        this.generateCandidate(input, feedback)
      )
    );
    
    // Score and rank candidates
    const scored = await Promise.all(
      candidates.map(async (c) => ({
        candidate: c,
        score: await this.scoreCandidate(c)
      }))
    );
    
    scored.sort((a, b) => b.score - a.score);
    
    return {
      output: scored[0].candidate,
      tokensUsed: candidates.reduce((sum, c) => sum + c.tokensUsed, 0),
      metadata: { 
        candidateCount: candidates.length,
        topScore: scored[0].score
      }
    };
  }
  
  private async scoreCandidate(candidate: unknown): Promise<number> {
    const validation = await this.contract.validate(candidate);
    // Higher score = fewer errors
    return 1 / (1 + validation.errors.length);
  }
}
```

**Acceptance Criteria:**
- [ ] Generates multiple candidates in parallel
- [ ] Scores candidates by validation
- [ ] Returns best candidate
- [ ] Tracks total token usage

**Verification:**
```bash
pnpm test -- --grep "ParallelVotingStrategy"
```

---

## Phase 4.4: Cost & Budget Control

### Task 4.4.1: Create CostController class

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/convergence/src/cost/controller.ts`

**Implementation:**
```typescript
export interface CostBudget {
  maxTokens: number;
  maxCost: number;  // USD
  maxDuration: number;  // ms
}

export interface CostPricing {
  inputPer1kTokens: number;
  outputPer1kTokens: number;
}

export class CostController {
  private tokensUsed = { input: 0, output: 0 };
  private startTime = Date.now();
  
  constructor(
    private budget: CostBudget,
    private pricing: CostPricing
  ) {}
  
  recordTokens(input: number, output: number): void {
    this.tokensUsed.input += input;
    this.tokensUsed.output += output;
  }
  
  canContinue(): { allowed: boolean; reason?: string } {
    const cost = this.getCurrentCost();
    const tokens = this.tokensUsed.input + this.tokensUsed.output;
    const duration = Date.now() - this.startTime;
    
    if (tokens >= this.budget.maxTokens) {
      return { allowed: false, reason: 'token_budget_exceeded' };
    }
    if (cost >= this.budget.maxCost) {
      return { allowed: false, reason: 'cost_budget_exceeded' };
    }
    if (duration >= this.budget.maxDuration) {
      return { allowed: false, reason: 'timeout' };
    }
    
    return { allowed: true };
  }
  
  getCurrentCost(): number {
    return (
      (this.tokensUsed.input / 1000) * this.pricing.inputPer1kTokens +
      (this.tokensUsed.output / 1000) * this.pricing.outputPer1kTokens
    );
  }
  
  getReport(): CostReport {
    return {
      tokensUsed: { ...this.tokensUsed },
      totalTokens: this.tokensUsed.input + this.tokensUsed.output,
      cost: this.getCurrentCost(),
      durationMs: Date.now() - this.startTime,
      budgetRemaining: {
        tokens: this.budget.maxTokens - (this.tokensUsed.input + this.tokensUsed.output),
        cost: this.budget.maxCost - this.getCurrentCost()
      }
    };
  }
}
```

**Acceptance Criteria:**
- [ ] Tracks input/output tokens separately
- [ ] Calculates cost from pricing
- [ ] Enforces all budget limits
- [ ] Provides detailed report

**Verification:**
```bash
pnpm test -- --grep "CostController"
```

---

### Task 4.4.2: Integrate CostController into ConvergenceEngine

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to MODIFY:**
- `packages/convergence/src/engine.ts`

**Changes:**
```typescript
export class ConvergenceEngine {
  private costController: CostController;
  
  constructor(/* ... */) {
    this.costController = new CostController(
      {
        maxTokens: options.maxTokens ?? 50000,
        maxCost: options.maxCost ?? 1.0,
        maxDuration: options.timeout ?? 300000
      },
      options.pricing ?? DEFAULT_ANTHROPIC_PRICING
    );
  }
  
  async run(input: unknown): Promise<ConvergenceResult> {
    // ... existing loop ...
    
    // Before each iteration:
    const budget = this.costController.canContinue();
    if (!budget.allowed) {
      return this.buildResult(budget.reason as any, trace, currentOutput);
    }
    
    // After each iteration:
    this.costController.recordTokens(
      iterResult.tokensUsed.input,
      iterResult.tokensUsed.output
    );
  }
  
  private buildResult(status, trace, output): ConvergenceResult {
    const costReport = this.costController.getReport();
    return {
      status,
      iterations: trace.length,
      finalOutput: output,
      tokenUsage: costReport.tokensUsed,
      cost: costReport.cost,
      durationMs: costReport.durationMs,
      trace
    };
  }
}
```

**Acceptance Criteria:**
- [ ] CostController created in constructor
- [ ] Budget checked before each iteration
- [ ] Tokens recorded after each iteration
- [ ] Final result includes cost report

**Verification:**
```bash
pnpm test -- --grep "budget integration"
```

---

## Phase 4.5: Recovery & Checkpointing

### Task 4.5.1: Create CheckpointManager

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/convergence/src/checkpoint/manager.ts`

**Implementation:**
```typescript
export interface Checkpoint {
  sessionId: string;
  iteration: number;
  output: unknown;
  validation: ValidationResult;
  costReport: CostReport;
  timestamp: Date;
}

export class CheckpointManager {
  private checkpoints: Checkpoint[] = [];
  
  save(checkpoint: Checkpoint): void {
    this.checkpoints.push(checkpoint);
  }
  
  getLatest(): Checkpoint | undefined {
    return this.checkpoints[this.checkpoints.length - 1];
  }
  
  getAll(): Checkpoint[] {
    return [...this.checkpoints];
  }
  
  async persist(storage: CheckpointStorage): Promise<void> {
    await storage.save(this.checkpoints);
  }
  
  async restore(storage: CheckpointStorage, sessionId: string): Promise<boolean> {
    const saved = await storage.load(sessionId);
    if (saved) {
      this.checkpoints = saved;
      return true;
    }
    return false;
  }
}
```

**Acceptance Criteria:**
- [ ] Saves checkpoint after each iteration
- [ ] Retrieves latest checkpoint
- [ ] Supports persistence to storage
- [ ] Supports restoration

**Verification:**
```bash
pnpm test -- --grep "CheckpointManager"
```

---

### Task 4.5.2: Add resume capability to ConvergenceEngine

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to MODIFY:**
- `packages/convergence/src/engine.ts`

**Changes:**
```typescript
export class ConvergenceEngine {
  private checkpointManager = new CheckpointManager();
  
  async run(input: unknown, resumeFrom?: string): Promise<ConvergenceResult> {
    let startIteration = 0;
    let currentOutput = input;
    let trace: IterationTrace[] = [];
    
    // Resume from checkpoint if specified
    if (resumeFrom) {
      const restored = await this.checkpointManager.restore(
        this.storage,
        resumeFrom
      );
      if (restored) {
        const latest = this.checkpointManager.getLatest();
        startIteration = latest.iteration;
        currentOutput = latest.output;
        trace = this.checkpointManager.getAll().map(c => this.toTrace(c));
        this.logger.info('Resumed from checkpoint', { iteration: startIteration });
      }
    }
    
    // Continue from where we left off
    let iteration = startIteration;
    while (iteration < this.options.maxIterations) {
      iteration++;
      const iterResult = await this.runIteration(iteration, currentOutput);
      trace.push(iterResult);
      
      // Save checkpoint
      this.checkpointManager.save({
        sessionId: this.session.id,
        iteration,
        output: iterResult.output,
        validation: iterResult.validation,
        costReport: this.costController.getReport(),
        timestamp: new Date()
      });
      
      // ... rest of loop ...
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Resumes from specified checkpoint
- [ ] Saves checkpoint after each iteration
- [ ] Continues iteration count correctly
- [ ] Preserves trace history

**Verification:**
```bash
pnpm test -- --grep "resume"
```

---

## Phase 4.6: Metrics & Tracing

### Task 4.6.1: Create ConvergenceMetrics collector

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/convergence/src/metrics/collector.ts`

**Implementation:**
```typescript
export interface ConvergenceMetrics {
  sessionId: string;
  contractId: string;
  status: ConvergenceStatus;
  iterations: number;
  tokensUsed: number;
  cost: number;
  durationMs: number;
  errorsPerIteration: number[];
  convergenceRate: number;  // errors reduced per iteration
}

export class MetricsCollector {
  collect(session: ForgeSession, result: ConvergenceResult): ConvergenceMetrics {
    const errorsPerIteration = result.trace.map(t => t.validation.errors.length);
    
    return {
      sessionId: session.id,
      contractId: session.contractId,
      status: result.status,
      iterations: result.iterations,
      tokensUsed: result.tokenUsage.input + result.tokenUsage.output,
      cost: result.cost,
      durationMs: result.durationMs,
      errorsPerIteration,
      convergenceRate: this.calculateConvergenceRate(errorsPerIteration)
    };
  }
  
  private calculateConvergenceRate(errors: number[]): number {
    if (errors.length < 2) return 0;
    const initial = errors[0] || 1;
    const final = errors[errors.length - 1];
    return (initial - final) / initial;
  }
}
```

**Acceptance Criteria:**
- [ ] Collects all relevant metrics
- [ ] Tracks errors per iteration
- [ ] Calculates convergence rate
- [ ] Standard metrics format

**Verification:**
```bash
pnpm test -- --grep "MetricsCollector"
```

---

### Task 4.6.2: Export package and write integration tests

**Time:** 8 minutes  
**Tokens:** ~5K  
**Files to MODIFY:**
- `packages/convergence/src/index.ts`

**Files to CREATE:**
- `packages/convergence/src/__tests__/integration.test.ts`

**Exports:**
```typescript
// packages/convergence/src/index.ts
export { ConvergenceEngine } from './engine';
export { IterativeRefinementStrategy } from './strategies/iterative';
export { ParallelVotingStrategy } from './strategies/parallel';
export { FeedbackGenerator } from './feedback/generator';
export { CostController } from './cost/controller';
export { CheckpointManager } from './checkpoint/manager';
export { MetricsCollector } from './metrics/collector';
export * from './types';
```

**Integration Test:**
```typescript
describe('Convergence Integration', () => {
  it('should converge simple contract in 2-3 iterations', async () => {
    const engine = new ConvergenceEngine(session, contract, {
      maxIterations: 5,
      strategy: new IterativeRefinementStrategy()
    });
    
    const result = await engine.run({ name: 'test' });
    
    expect(result.status).toBe('converged');
    expect(result.iterations).toBeLessThanOrEqual(3);
    expect(result.cost).toBeLessThan(0.10);
  });
});
```

**Acceptance Criteria:**
- [ ] All public APIs exported
- [ ] Integration test passes
- [ ] Package builds successfully
- [ ] Types are exported

**Verification:**
```bash
cd packages/convergence && pnpm build && pnpm test
```

---

## Epic 4 Completion Checklist

Before moving to Epic 5:

- [ ] All 14 tasks marked [x] in progress.md
- [ ] `pnpm build` succeeds for convergence
- [ ] `pnpm test` passes (>80% coverage)
- [ ] ConvergenceEngine runs end-to-end
- [ ] Both strategies implemented
- [ ] Cost tracking works
- [ ] Checkpoint/resume works
- [ ] Metrics collected
- [ ] Integration test passes

**Then run:** `.forge/agent-bootstrap.sh next-epic`
