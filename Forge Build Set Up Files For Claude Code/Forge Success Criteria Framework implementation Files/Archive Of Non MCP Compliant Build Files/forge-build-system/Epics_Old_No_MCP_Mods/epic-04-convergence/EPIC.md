# Epic 4: Convergence Engine

**Duration:** 6 days  
**Token Budget:** 70K tokens (SPLIT: 2 sessions × 35K)  
**Status:** Not Started  
**Dependencies:** Epic 2 (Answer Contract), Epic 3 (FORGE C Core)

---

## Epic Goal

Implement the iterative refinement loop that transforms initial LLM outputs into contract-compliant results through progressive validation and correction. This is the "CI/CD for AI answers" - the core value proposition.

---

## Session Split Strategy

**Session 4A (35K tokens):** US-4.1 through US-4.3 (Core loop + strategies)  
**Session 4B (35K tokens):** US-4.4 through US-4.6 (Cost control + recovery + metrics)

---

## User Stories

### US-4.1: Core Convergence Loop
**As a** FORGE user  
**I want** outputs iteratively refined until valid  
**So that** I get contract-compliant results automatically

**Acceptance Criteria:**
- [ ] Generate → Validate → Refine cycle
- [ ] Exit on success or max iterations
- [ ] Full iteration history tracked
- [ ] Configurable iteration limits
- [ ] Early exit on unrecoverable errors

**Core Implementation:**
```typescript
// packages/convergence/src/engine.ts
export class ConvergenceEngine {
  async run<T>(
    session: ForgeSession,
    contract: CompiledContract,
    request: ConvergenceRequest,
    options: ConvergenceOptions = {}
  ): Promise<ConvergenceResult<T>> {
    const maxIterations = options.maxIterations ?? contract.convergenceCriteria.maxIterations ?? 5;
    let currentOutput: unknown = null;
    let iterations: IterationRecord[] = [];
    
    for (let i = 0; i < maxIterations; i++) {
      const iteration = await this.runIteration(
        session,
        contract,
        request,
        currentOutput,
        iterations,
        i
      );
      
      iterations.push(iteration);
      currentOutput = iteration.output;
      
      // Check convergence
      if (iteration.validation.valid) {
        return this.buildSuccessResult<T>(session, iterations, currentOutput as T);
      }
      
      // Check for unrecoverable errors
      if (this.isUnrecoverable(iteration.validation)) {
        return this.buildFailureResult(session, iterations, 'unrecoverable_error');
      }
    }
    
    return this.buildFailureResult(session, iterations, 'max_iterations');
  }
  
  private async runIteration(
    session: ForgeSession,
    contract: CompiledContract,
    request: ConvergenceRequest,
    previousOutput: unknown | null,
    history: IterationRecord[],
    iterationNumber: number
  ): Promise<IterationRecord> {
    const startTime = Date.now();
    
    // Build prompt with context
    const prompt = this.buildPrompt(contract, request, previousOutput, history);
    
    // Generate
    const generation = await this.generate(session, prompt);
    
    // Parse output
    const parsed = this.parseOutput(generation.content, contract);
    
    // Validate
    const validation = await this.validate(parsed, contract);
    
    return {
      number: iterationNumber,
      prompt: prompt.content,
      rawOutput: generation.content,
      parsedOutput: parsed,
      validation,
      tokensUsed: generation.usage,
      durationMs: Date.now() - startTime,
    };
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/convergence test:core-loop
```

---

### US-4.2: Convergence Strategies
**As a** contract author  
**I want** different convergence strategies  
**So that** I can optimize for my use case

**Acceptance Criteria:**
- [ ] Iterative Refinement (default)
- [ ] Chain of Thought
- [ ] Parallel Generation with voting
- [ ] Tree of Thought exploration
- [ ] Strategy selection based on contract type

**Strategy Interface:**
```typescript
// packages/convergence/src/strategies/types.ts
export interface ConvergenceStrategy {
  name: string;
  
  execute<T>(
    context: StrategyContext,
    contract: CompiledContract,
    request: ConvergenceRequest
  ): Promise<ConvergenceResult<T>>;
  
  estimateCost(contract: CompiledContract): CostEstimate;
}

// packages/convergence/src/strategies/iterative.ts
export class IterativeRefinementStrategy implements ConvergenceStrategy {
  name = 'iterative_refinement';
  
  async execute<T>(
    context: StrategyContext,
    contract: CompiledContract,
    request: ConvergenceRequest
  ): Promise<ConvergenceResult<T>> {
    // Each iteration gets the previous output + validation errors
    // LLM refines based on specific feedback
  }
}

// packages/convergence/src/strategies/parallel.ts
export class ParallelVotingStrategy implements ConvergenceStrategy {
  name = 'parallel_voting';
  
  constructor(private parallelCount: number = 3) {}
  
  async execute<T>(
    context: StrategyContext,
    contract: CompiledContract,
    request: ConvergenceRequest
  ): Promise<ConvergenceResult<T>> {
    // Generate N outputs in parallel
    const candidates = await Promise.all(
      Array(this.parallelCount).fill(null).map(() => 
        this.generateCandidate(context, contract, request)
      )
    );
    
    // Validate all
    const validated = await Promise.all(
      candidates.map(c => this.validate(c, contract))
    );
    
    // Select best (first valid, or highest score)
    return this.selectBest(validated);
  }
}

// packages/convergence/src/strategies/chain-of-thought.ts
export class ChainOfThoughtStrategy implements ConvergenceStrategy {
  name = 'chain_of_thought';
  
  async execute<T>(
    context: StrategyContext,
    contract: CompiledContract,
    request: ConvergenceRequest
  ): Promise<ConvergenceResult<T>> {
    // Step 1: Think through the problem
    const reasoning = await this.generateReasoning(context, contract, request);
    
    // Step 2: Generate based on reasoning
    const output = await this.generateFromReasoning(context, contract, reasoning);
    
    // Step 3: Self-critique
    const critique = await this.selfCritique(context, contract, output);
    
    // Step 4: Refine based on critique
    return this.refineWithCritique(context, contract, output, critique);
  }
}
```

**Strategy Selection:**
```typescript
// packages/convergence/src/strategies/selector.ts
export class StrategySelector {
  select(contract: CompiledContract): ConvergenceStrategy {
    const hint = contract.convergenceCriteria.strategy;
    
    switch (hint) {
      case 'parallel_voting':
        return new ParallelVotingStrategy();
      case 'chain_of_thought':
        return new ChainOfThoughtStrategy();
      case 'tree_of_thought':
        return new TreeOfThoughtStrategy();
      default:
        return new IterativeRefinementStrategy();
    }
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/convergence test:strategies
```

---

### US-4.3: Validation Error Feedback
**As a** convergence engine  
**I want** to provide structured feedback to LLM  
**So that** subsequent iterations fix specific issues

**Acceptance Criteria:**
- [ ] Error categorization (structural, semantic, missing, invalid)
- [ ] Path-specific error locations
- [ ] Suggested fixes where possible
- [ ] Error severity ranking
- [ ] Feedback prompt optimization

**Feedback Generation:**
```typescript
// packages/convergence/src/feedback.ts
export class FeedbackGenerator {
  generate(
    validation: ValidationResult,
    contract: CompiledContract
  ): StructuredFeedback {
    const errors = validation.errors.map(e => this.categorizeError(e, contract));
    
    // Sort by severity and actionability
    const prioritized = this.prioritize(errors);
    
    // Generate fix suggestions
    const withSuggestions = prioritized.map(e => ({
      ...e,
      suggestion: this.suggestFix(e, contract),
    }));
    
    return {
      summary: this.summarize(withSuggestions),
      errors: withSuggestions,
      focusAreas: this.identifyFocusAreas(withSuggestions),
    };
  }
  
  private categorizeError(
    error: ValidationError,
    contract: CompiledContract
  ): CategorizedError {
    if (error.type === 'missing_required') {
      return {
        category: 'structural',
        severity: 'high',
        path: error.path,
        message: `Missing required field: ${error.path}`,
        schemaHint: this.getSchemaHint(error.path, contract),
      };
    }
    
    if (error.type === 'type_mismatch') {
      return {
        category: 'structural',
        severity: 'medium',
        path: error.path,
        message: `Type mismatch at ${error.path}: expected ${error.expected}, got ${error.actual}`,
        schemaHint: this.getSchemaHint(error.path, contract),
      };
    }
    
    if (error.type === 'llm_judge_failed') {
      return {
        category: 'semantic',
        severity: 'medium',
        path: null,
        message: error.message,
        llmFeedback: error.metadata?.reasoning,
      };
    }
    
    // Default
    return {
      category: 'unknown',
      severity: 'low',
      path: error.path,
      message: error.message,
    };
  }
  
  formatForPrompt(feedback: StructuredFeedback): string {
    return `
## Validation Feedback

### Summary
${feedback.summary}

### Errors to Fix (in priority order)
${feedback.errors.map((e, i) => `
${i + 1}. **${e.category.toUpperCase()}** at \`${e.path || 'root'}\`
   - Issue: ${e.message}
   - Severity: ${e.severity}
   ${e.suggestion ? `- Suggested Fix: ${e.suggestion}` : ''}
   ${e.schemaHint ? `- Schema: ${e.schemaHint}` : ''}
`).join('\n')}

### Focus Areas
${feedback.focusAreas.map(a => `- ${a}`).join('\n')}
`;
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/convergence test:feedback
```

---

### US-4.4: Cost & Token Management
**As a** platform operator  
**I want** cost controls on convergence  
**So that** runaway loops don't drain budgets

**Acceptance Criteria:**
- [ ] Token budgets per session
- [ ] Cost estimation before run
- [ ] Cost tracking during run
- [ ] Budget exceeded early exit
- [ ] Cost-aware strategy selection

**Cost Control:**
```typescript
// packages/convergence/src/cost.ts
export interface CostConfig {
  maxTokensPerSession: number;
  maxCostPerSession: number;  // USD
  warningThreshold: number;   // Percentage
}

export class CostController {
  private config: CostConfig;
  private currentUsage: TokenUsage = { input: 0, output: 0 };
  
  constructor(config: CostConfig) {
    this.config = config;
  }
  
  track(usage: TokenUsage): void {
    this.currentUsage.input += usage.input;
    this.currentUsage.output += usage.output;
  }
  
  canContinue(): CostCheckResult {
    const totalTokens = this.currentUsage.input + this.currentUsage.output;
    const estimatedCost = this.estimateCost(this.currentUsage);
    
    if (totalTokens > this.config.maxTokensPerSession) {
      return { allowed: false, reason: 'token_budget_exceeded' };
    }
    
    if (estimatedCost > this.config.maxCostPerSession) {
      return { allowed: false, reason: 'cost_budget_exceeded' };
    }
    
    const usagePercent = totalTokens / this.config.maxTokensPerSession;
    if (usagePercent > this.config.warningThreshold) {
      return { allowed: true, warning: 'approaching_budget_limit' };
    }
    
    return { allowed: true };
  }
  
  estimateCost(usage: TokenUsage): number {
    // Claude Sonnet pricing (example)
    const inputCostPer1k = 0.003;
    const outputCostPer1k = 0.015;
    
    return (usage.input / 1000 * inputCostPer1k) + 
           (usage.output / 1000 * outputCostPer1k);
  }
  
  getReport(): CostReport {
    return {
      tokensUsed: this.currentUsage,
      estimatedCost: this.estimateCost(this.currentUsage),
      budgetRemaining: {
        tokens: this.config.maxTokensPerSession - 
                (this.currentUsage.input + this.currentUsage.output),
        cost: this.config.maxCostPerSession - this.estimateCost(this.currentUsage),
      },
    };
  }
}
```

**Pre-run Estimation:**
```typescript
// packages/convergence/src/estimator.ts
export class CostEstimator {
  estimate(
    contract: CompiledContract,
    request: ConvergenceRequest,
    strategy: ConvergenceStrategy
  ): CostEstimate {
    const avgIterations = this.estimateIterations(contract);
    const tokensPerIteration = this.estimateTokensPerIteration(contract, request);
    
    return {
      minCost: this.calculate(1, tokensPerIteration),
      expectedCost: this.calculate(avgIterations, tokensPerIteration),
      maxCost: this.calculate(contract.convergenceCriteria.maxIterations, tokensPerIteration),
      confidence: 0.7,
    };
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/convergence test:cost
```

---

### US-4.5: Error Recovery & Checkpointing
**As a** platform operator  
**I want** recovery from failures mid-convergence  
**So that** work isn't lost on transient errors

**Acceptance Criteria:**
- [ ] Checkpoint after each iteration
- [ ] Resume from checkpoint
- [ ] Retry with backoff on transient errors
- [ ] Dead letter queue for unrecoverable
- [ ] Manual intervention hooks

**Recovery System:**
```typescript
// packages/convergence/src/recovery.ts
export class RecoveryManager {
  private checkpointStorage: CheckpointStorage;
  
  async checkpoint(session: ForgeSession, iteration: IterationRecord): Promise<void> {
    const checkpoint: Checkpoint = {
      sessionId: session.id,
      iterationNumber: iteration.number,
      state: {
        currentOutput: iteration.parsedOutput,
        iterations: session.iterations,
        costUsed: session.metrics.costUsed,
      },
      timestamp: new Date(),
    };
    
    await this.checkpointStorage.save(checkpoint);
  }
  
  async resume(sessionId: string): Promise<ResumeResult> {
    const checkpoint = await this.checkpointStorage.load(sessionId);
    if (!checkpoint) {
      return { status: 'not_found' };
    }
    
    return {
      status: 'found',
      checkpoint,
      resumeFrom: checkpoint.iterationNumber + 1,
    };
  }
  
  async handleError(
    session: ForgeSession,
    error: Error,
    iteration: number
  ): Promise<ErrorHandlingResult> {
    if (this.isTransient(error)) {
      // Retry with exponential backoff
      const delay = Math.pow(2, iteration) * 1000;
      await sleep(delay);
      return { action: 'retry', delay };
    }
    
    if (this.isRateLimitError(error)) {
      // Switch provider or wait
      return { action: 'switch_provider' };
    }
    
    // Unrecoverable - checkpoint and fail
    await this.checkpoint(session, session.iterations[session.iterations.length - 1]);
    return { action: 'fail', checkpoint: true };
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/convergence test:recovery
```

---

### US-4.6: Convergence Metrics & Analytics
**As a** platform operator  
**I want** detailed convergence metrics  
**So that** I can optimize contracts and monitor health

**Acceptance Criteria:**
- [ ] Per-session metrics
- [ ] Per-contract aggregate metrics
- [ ] Convergence rate tracking
- [ ] Cost efficiency metrics
- [ ] Time-to-convergence tracking

**Metrics Collection:**
```typescript
// packages/convergence/src/metrics.ts
export interface ConvergenceMetrics {
  // Session-level
  sessionId: string;
  contractId: string;
  status: 'converged' | 'failed' | 'max_iterations';
  iterations: number;
  totalTokens: number;
  totalCost: number;
  totalDurationMs: number;
  
  // Per-iteration breakdown
  iterationMetrics: IterationMetrics[];
  
  // Validation insights
  validationErrorsByType: Record<string, number>;
  mostCommonErrors: string[];
  
  // Efficiency
  tokensPerIteration: number;
  costPerIteration: number;
  validationPassRate: number;
}

export class MetricsCollector {
  collect(session: ForgeSession, result: ConvergenceResult): ConvergenceMetrics {
    return {
      sessionId: session.id,
      contractId: session.contractId,
      status: result.status,
      iterations: result.iterations,
      totalTokens: this.sumTokens(session.iterations),
      totalCost: this.sumCost(session.iterations),
      totalDurationMs: session.completedAt.getTime() - session.startedAt.getTime(),
      iterationMetrics: session.iterations.map(this.collectIterationMetrics),
      validationErrorsByType: this.aggregateErrors(session.iterations),
      mostCommonErrors: this.findCommonErrors(session.iterations),
      tokensPerIteration: this.avgTokensPerIteration(session.iterations),
      costPerIteration: this.avgCostPerIteration(session.iterations),
      validationPassRate: this.calculatePassRate(session.iterations),
    };
  }
}

// Aggregate metrics over time
export class MetricsAggregator {
  async getContractStats(contractId: string, timeRange: TimeRange): Promise<ContractStats> {
    const sessions = await this.storage.getSessionsForContract(contractId, timeRange);
    
    return {
      totalSessions: sessions.length,
      convergenceRate: this.calculateConvergenceRate(sessions),
      avgIterations: this.calculateAvgIterations(sessions),
      avgCost: this.calculateAvgCost(sessions),
      avgDuration: this.calculateAvgDuration(sessions),
      costTrend: this.calculateTrend(sessions, 'cost'),
      convergenceTrend: this.calculateTrend(sessions, 'convergence'),
    };
  }
}
```

**Verification:**
```bash
pnpm --filter @forge/convergence test:metrics
```

---

## Key Deliverables

```
packages/convergence/
├── src/
│   ├── index.ts
│   ├── engine.ts                # Core convergence loop
│   ├── strategies/
│   │   ├── types.ts
│   │   ├── iterative.ts
│   │   ├── parallel.ts
│   │   ├── chain-of-thought.ts
│   │   ├── tree-of-thought.ts
│   │   └── selector.ts
│   ├── feedback.ts              # Validation feedback generator
│   ├── cost.ts                  # Cost control
│   ├── estimator.ts             # Pre-run estimation
│   ├── recovery.ts              # Error recovery & checkpoints
│   ├── metrics.ts               # Analytics collection
│   └── types/
│       └── index.ts
├── __tests__/
│   ├── engine.test.ts
│   ├── strategies/
│   ├── feedback.test.ts
│   ├── cost.test.ts
│   └── recovery.test.ts
├── package.json
└── tsconfig.json
```

---

## Completion Criteria

- [ ] Core convergence loop working end-to-end
- [ ] 4 convergence strategies implemented
- [ ] Structured feedback generation
- [ ] Cost control with budget enforcement
- [ ] Checkpoint and recovery system
- [ ] Metrics collection and aggregation
- [ ] 90%+ test coverage
- [ ] Integration test: Full convergence with ECR contract

---

## Handoff Context for Epic 5

**What Epic 5 needs to know:**
- Import: `import { ConvergenceEngine, ConvergenceResult } from '@forge/convergence'`
- Figma parser will produce output that feeds into convergence
- Contract for React components will validate generated code

---

## Verification Script

```bash
#!/bin/bash
# .forge/epics/epic-04-convergence/verify.sh

echo "🔍 Verifying Epic 4: Convergence Engine"

cd packages/convergence

# Check source files
[ -f "src/engine.ts" ] || { echo "❌ engine.ts missing"; exit 1; }
[ -f "src/strategies/iterative.ts" ] || { echo "❌ Iterative strategy missing"; exit 1; }
[ -f "src/strategies/parallel.ts" ] || { echo "❌ Parallel strategy missing"; exit 1; }
[ -f "src/cost.ts" ] || { echo "❌ cost.ts missing"; exit 1; }
[ -f "src/recovery.ts" ] || { echo "❌ recovery.ts missing"; exit 1; }

# Run tests
pnpm test || { echo "❌ Tests failed"; exit 1; }

# Run integration test
pnpm test:integration || { echo "❌ Integration tests failed"; exit 1; }

# Check coverage
COVERAGE=$(pnpm test --coverage --reporter=json | jq '.total.lines.pct')
if (( $(echo "$COVERAGE < 90" | bc -l) )); then
  echo "❌ Coverage below 90%: $COVERAGE%"
  exit 1
fi

echo "✅ Epic 4 verification complete"
```
