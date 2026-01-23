# Epic 4: Convergence Engine - Atomic Tasks

**Epic**: Answer Contract-driven Convergence Loop  
**Token Budget**: 50K tokens  
**Task Count**: 18 tasks  
**Duration**: 7 days  
**Dependencies**: Epic 3.75 (Code Execution Layer)

---

## Task Breakdown

### Phase 1: Convergence Loop Foundation (5 tasks, 2 days)

#### Task 4.1: Convergence State Manager
**Time**: 10 minutes  
**Files**:
- `packages/convergence-engine/src/core/state-manager.ts`

**Acceptance Criteria**:
- [ ] Initialize convergence state (iteration 0)
- [ ] Track iterations (code, validation results, score)
- [ ] Calculate token usage per iteration
- [ ] State serialization (save/restore)

**Code**:
```typescript
// packages/convergence-engine/src/core/state-manager.ts
export class StateManager {
  private state: ConvergenceState;
  
  initialize(contract: AnswerContract): ConvergenceState {
    return {
      runId: uuidv4(),
      contract,
      iterations: [],
      score: 0,
      tokensUsed: 0,
      startTime: Date.now(),
      status: 'RUNNING',
    };
  }
  
  addIteration(
    state: ConvergenceState,
    iteration: Iteration
  ): ConvergenceState {
    return {
      ...state,
      iterations: [...state.iterations, iteration],
      score: iteration.score,
      tokensUsed: state.tokensUsed + iteration.tokensUsed,
    };
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:state-manager
```

---

#### Task 4.2: Stop Conditions Evaluator
**Time**: 10 minutes  
**Files**:
- `packages/convergence-engine/src/core/stop-conditions.ts`

**Acceptance Criteria**:
- [ ] Early stop on convergence (score ≥ threshold)
- [ ] Stop on max iterations (15)
- [ ] Stop on stagnation (no improvement for 3 iterations)
- [ ] Stop on token budget exhaustion

**Code**:
```typescript
// packages/convergence-engine/src/core/stop-conditions.ts
export class StopConditions {
  shouldStop(state: ConvergenceState, config: ConvergenceConfig): StopDecision {
    // Priority 1: Early stop (converged)
    if (state.score >= config.minScore) {
      return { stop: true, reason: 'CONVERGED', success: true };
    }
    
    // Priority 2: Max iterations (safety)
    if (state.iterations.length >= config.maxIterations) {
      return { stop: true, reason: 'MAX_ITERATIONS', success: false };
    }
    
    // Priority 3: Stagnation (optimization)
    if (this.detectStagnation(state, config.stagnationLimit)) {
      return { stop: true, reason: 'STAGNATION', success: false };
    }
    
    // Priority 4: Budget exhaustion (required)
    if (state.tokensUsed >= config.tokenBudget) {
      return { stop: true, reason: 'BUDGET_EXHAUSTED', success: false };
    }
    
    return { stop: false };
  }
  
  private detectStagnation(state: ConvergenceState, limit: number): boolean {
    if (state.iterations.length < limit) return false;
    
    const recent = state.iterations.slice(-limit);
    const scores = recent.map(i => i.score);
    
    // Check if all recent scores are within 0.01 of each other
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    return (max - min) < 0.01;
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:stop-conditions
```

---

#### Task 4.3: Code Generator Wrapper
**Time**: 10 minutes  
**Files**:
- `packages/convergence-engine/src/generation/code-generator.ts`

**Acceptance Criteria**:
- [ ] Call Claude API for code generation
- [ ] Pass Answer Contract + previous iteration feedback
- [ ] Request code-first format (TypeScript)
- [ ] Track token usage

**Code**:
```typescript
// packages/convergence-engine/src/generation/code-generator.ts
export class CodeGenerator {
  async generate(
    contract: AnswerContract,
    feedback?: IterationFeedback
  ): Promise<GenerationResult> {
    const prompt = this.buildPrompt(contract, feedback);
    
    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const code = this.extractCode(response.content);
    
    return {
      code,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      model: response.model,
    };
  }
  
  private buildPrompt(
    contract: AnswerContract,
    feedback?: IterationFeedback
  ): string {
    let prompt = `Generate TypeScript code that satisfies this contract:\n\n`;
    prompt += `Task: ${contract.description}\n\n`;
    prompt += `Requirements:\n`;
    contract.validators.forEach(v => {
      prompt += `- ${v.name}: ${v.type} (threshold: ${v.threshold})\n`;
    });
    
    if (feedback) {
      prompt += `\nPrevious attempt failed. Feedback:\n`;
      feedback.failures.forEach(f => {
        prompt += `- ${f.validator}: ${f.reason}\n`;
      });
    }
    
    return prompt;
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:code-generator
```

---

#### Task 4.4: Validation Orchestrator
**Time**: 15 minutes  
**Files**:
- `packages/convergence-engine/src/validation/validator-orchestrator.ts`

**Acceptance Criteria**:
- [ ] Load validators from Answer Contract
- [ ] Execute validators in parallel (when possible)
- [ ] Aggregate validation results
- [ ] Calculate weighted score

**Code**:
```typescript
// packages/convergence-engine/src/validation/validator-orchestrator.ts
export class ValidatorOrchestrator {
  async validateAll(
    code: string,
    validators: Validator[]
  ): Promise<AggregatedResults> {
    // Execute validators in parallel
    const results = await Promise.all(
      validators.map(v => this.executor.execute(v, code))
    );
    
    // Calculate weighted score
    const totalWeight = validators.reduce((sum, v) => sum + (v.weight || 1), 0);
    const weightedScore = results.reduce((sum, r, i) => {
      const weight = validators[i].weight || 1;
      return sum + (r.score * weight);
    }, 0) / totalWeight;
    
    return {
      results,
      score: weightedScore,
      passed: results.every(r => r.passed),
    };
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:validator-orchestrator
```

---

#### Task 4.5: Main Convergence Loop
**Time**: 15 minutes  
**Files**:
- `packages/convergence-engine/src/core/convergence-loop.ts`

**Acceptance Criteria**:
- [ ] Initialize state
- [ ] Loop: generate → validate → update state
- [ ] Check stop conditions each iteration
- [ ] Return convergence result

**Code**:
```typescript
// packages/convergence-engine/src/core/convergence-loop.ts
export class ConvergenceLoop {
  async converge(
    contract: AnswerContract,
    config: ConvergenceConfig
  ): Promise<ConvergenceResult> {
    let state = this.stateManager.initialize(contract);
    let feedback: IterationFeedback | undefined;
    
    while (!this.stopConditions.shouldStop(state, config).stop) {
      // Generate code
      const generation = await this.codeGenerator.generate(contract, feedback);
      
      // Validate code
      const validation = await this.validatorOrchestrator.validateAll(
        generation.code,
        contract.validators
      );
      
      // Create iteration record
      const iteration: Iteration = {
        index: state.iterations.length,
        code: generation.code,
        validation,
        score: validation.score,
        tokensUsed: generation.tokensUsed,
        timestamp: Date.now(),
      };
      
      // Update state
      state = this.stateManager.addIteration(state, iteration);
      
      // Prepare feedback for next iteration
      if (!validation.passed) {
        feedback = this.createFeedback(validation);
      }
    }
    
    const decision = this.stopConditions.shouldStop(state, config);
    
    return {
      converged: decision.success,
      reason: decision.reason,
      finalCode: state.iterations[state.iterations.length - 1].code,
      iterations: state.iterations.length,
      score: state.score,
      tokensUsed: state.tokensUsed,
      duration: Date.now() - state.startTime,
    };
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:convergence-loop
pnpm --filter @forge/convergence-engine test:integration
```

---

### Phase 2: Timeout & Error Handling (4 tasks, 1 day)

#### Task 4.6: Timeout Manager
**Time**: 10 minutes  
**Files**:
- `packages/convergence-engine/src/timeout/timeout-manager.ts`

**Acceptance Criteria**:
- [ ] Execute with timeout (30s, 60s, 120s)
- [ ] Timeout based on validator type
- [ ] Return timeout error with context

**Code**:
```typescript
// packages/convergence-engine/src/timeout/timeout-manager.ts
export class TimeoutManager {
  async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(timeout)), timeout)
    );
    
    return await Promise.race([fn(), timeoutPromise]);
  }
  
  getTimeoutForValidator(type: ValidatorType): number {
    const timeouts = {
      syntax: 30000,        // 30s - Fast checks
      unit_test: 60000,     // 60s - Standard tests
      integration: 120000,  // 120s - Slower tests
      security: 90000,      // 90s - Security scans
      performance: 180000,  // 180s - Load tests
    };
    
    return timeouts[type] || 60000; // Default 60s
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:timeout-manager
```

---

#### Task 4.7: Circuit Breaker
**Time**: 15 minutes  
**Files**:
- `packages/convergence-engine/src/timeout/circuit-breaker.ts`

**Acceptance Criteria**:
- [ ] Track consecutive failures
- [ ] Open circuit after 3 failures
- [ ] Half-open state for recovery attempts
- [ ] Reset on success

**Code**:
```typescript
// packages/convergence-engine/src/timeout/circuit-breaker.ts
export class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private lastFailureTime?: number;
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      // Check if we should try half-open
      if (Date.now() - this.lastFailureTime! > 60000) { // 1 minute
        this.state = 'HALF_OPEN';
      } else {
        throw new CircuitBreakerOpenError('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= 3) {
      this.state = 'OPEN';
    }
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:circuit-breaker
```

---

#### Task 4.8: Fallback Handler
**Time**: 10 minutes  
**Files**:
- `packages/convergence-engine/src/timeout/fallback-handler.ts`

**Acceptance Criteria**:
- [ ] Detect timeout/circuit breaker errors
- [ ] Fallback to LLM validation (non-code-first)
- [ ] Log fallback occurrences
- [ ] Track fallback rate

**Code**:
```typescript
// packages/convergence-engine/src/timeout/fallback-handler.ts
export class FallbackHandler {
  async handleValidation(
    validator: Validator,
    code: string
  ): Promise<ValidationResult> {
    try {
      // Try code-first execution
      return await this.circuitBreaker.execute(() =>
        this.timeoutManager.executeWithTimeout(
          () => this.executor.execute(validator, code),
          this.timeoutManager.getTimeoutForValidator(validator.type)
        )
      );
    } catch (error) {
      if (error instanceof TimeoutError || error instanceof CircuitBreakerOpenError) {
        // Fallback to LLM validation
        await this.logger.warn('Code-first validation failed, falling back to LLM', {
          validator: validator.name,
          error: error.message,
        });
        
        await this.metrics.increment('fallback_count');
        
        return await this.llmValidation(validator, code);
      }
      throw error;
    }
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:fallback-handler
```

---

#### Task 4.9: Integration with Validation Orchestrator
**Time**: 5 minutes  
**Files**:
- `packages/convergence-engine/src/validation/validator-orchestrator.ts` (modify)

**Acceptance Criteria**:
- [ ] Use FallbackHandler for all validations
- [ ] Track timeout rate
- [ ] Alert on high fallback rate (>10%)

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:validator-orchestrator-timeout
```

---

### Phase 3: Evidence Pack Generation (3 tasks, 1 day)

#### Task 4.10: Evidence Collector (Code-First)
**Time**: 15 minutes  
**Files**:
- `packages/convergence-engine/src/evidence/evidence-collector.ts`

**Acceptance Criteria**:
- [ ] Collect tool invocations (deterministic)
- [ ] Collect validation results (structured)
- [ ] Collect file artifacts (with SHA-256 hashes)
- [ ] Collect convergence metrics

**Code**:
```typescript
// packages/convergence-engine/src/evidence/evidence-collector.ts
export class EvidenceCollector {
  async collect(state: ConvergenceState): Promise<RawEvidence> {
    return {
      runId: state.runId,
      timestamp: new Date().toISOString(),
      contract: state.contract.name,
      
      iterations: state.iterations.map(iter => ({
        index: iter.index,
        score: iter.score,
        tokensUsed: iter.tokensUsed,
        validations: iter.validation.results.map(v => ({
          validator: v.validator,
          passed: v.passed,
          score: v.score,
          evidence: v.evidence,
        })),
      })),
      
      artifacts: await this.collectArtifacts(state),
      
      metrics: {
        totalIterations: state.iterations.length,
        finalScore: state.score,
        tokensUsed: state.tokensUsed,
        duration: Date.now() - state.startTime,
        converged: state.score >= state.contract.success_criteria.min_score,
      },
    };
  }
  
  private async collectArtifacts(state: ConvergenceState): Promise<Artifact[]> {
    const finalCode = state.iterations[state.iterations.length - 1].code;
    
    return [{
      path: 'generated-code.ts',
      sha256: this.computeHash(finalCode),
      size: finalCode.length,
      timestamp: new Date().toISOString(),
    }];
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:evidence-collector
```

---

#### Task 4.11: Evidence Synthesizer (LLM)
**Time**: 10 minutes  
**Files**:
- `packages/convergence-engine/src/evidence/evidence-synthesizer.ts`

**Acceptance Criteria**:
- [ ] Generate executive summary
- [ ] Identify key findings
- [ ] Provide recommendations
- [ ] Create narrative report

**Code**:
```typescript
// packages/convergence-engine/src/evidence/evidence-synthesizer.ts
export class EvidenceSynthesizer {
  async synthesize(raw: RawEvidence): Promise<EvidenceSynthesis> {
    const prompt = this.buildSynthesisPrompt(raw);
    
    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const synthesis = this.parseResponse(response.content);
    
    return {
      executiveSummary: synthesis.summary,
      keyFindings: synthesis.findings,
      recommendations: synthesis.recommendations,
      narrative: synthesis.narrative,
    };
  }
  
  private buildSynthesisPrompt(raw: RawEvidence): string {
    return `
      Analyze this convergence run and provide:
      1. Executive summary (2-3 sentences)
      2. Key findings (3-5 bullet points)
      3. Recommendations (2-3 bullet points)
      4. Narrative (1 paragraph)
      
      Data:
      - Contract: ${raw.contract}
      - Iterations: ${raw.metrics.totalIterations}
      - Final Score: ${raw.metrics.finalScore}
      - Converged: ${raw.metrics.converged}
      - Duration: ${raw.metrics.duration}ms
    `;
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:evidence-synthesizer
```

---

#### Task 4.12: Evidence Pack Signer & Exporter
**Time**: 10 minutes  
**Files**:
- `packages/convergence-engine/src/evidence/evidence-signer.ts`
- `packages/convergence-engine/src/evidence/evidence-exporter.ts`

**Acceptance Criteria**:
- [ ] Sign evidence with HMAC-SHA256
- [ ] Export to JSON
- [ ] Export to Markdown (human-readable)
- [ ] Store with 7-year retention policy

**Code**:
```typescript
// packages/convergence-engine/src/evidence/evidence-signer.ts
export class EvidenceSigner {
  signEvidencePack(pack: EvidencePack): SignedEvidencePack {
    const payload = JSON.stringify({
      metadata: pack.metadata,
      rawEvidence: pack.rawEvidence,
      synthesis: pack.synthesis,
    });
    
    const signature = crypto
      .createHmac('sha256', this.signingKey)
      .update(payload)
      .digest('hex');
    
    return {
      ...pack,
      integrity: {
        sha256: crypto.createHash('sha256').update(payload).digest('hex'),
        signature,
        signedAt: new Date().toISOString(),
      },
    };
  }
}

// packages/convergence-engine/src/evidence/evidence-exporter.ts
export class EvidenceExporter {
  async exportJSON(pack: SignedEvidencePack): Promise<string> {
    return JSON.stringify(pack, null, 2);
  }
  
  async exportMarkdown(pack: SignedEvidencePack): Promise<string> {
    return `
# Convergence Evidence Pack

**Run ID**: ${pack.metadata.runId}
**Contract**: ${pack.metadata.contract}
**Timestamp**: ${pack.metadata.timestamp}

## Executive Summary
${pack.synthesis.executiveSummary}

## Key Findings
${pack.synthesis.keyFindings.map(f => `- ${f}`).join('\n')}

## Metrics
- Iterations: ${pack.rawEvidence.metrics.totalIterations}
- Final Score: ${pack.rawEvidence.metrics.finalScore}
- Converged: ${pack.rawEvidence.metrics.converged}

## Signature
- SHA-256: ${pack.integrity.sha256}
- Signed: ${pack.integrity.signedAt}
    `;
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:evidence-signer
pnpm --filter @forge/convergence-engine test:evidence-exporter
```

---

### Phase 4: Gateway Integration (3 tasks, 1.5 days)

#### Task 4.13: REST API Endpoints
**Time**: 15 minutes  
**Files**:
- `packages/convergence-engine/src/gateway/rest-api.ts`

**Acceptance Criteria**:
- [ ] POST /api/v1/converge - Start convergence
- [ ] GET /api/v1/converge/:id - Get status
- [ ] GET /api/v1/converge/:id/evidence - Download evidence pack
- [ ] DELETE /api/v1/converge/:id - Cancel convergence

**Code**:
```typescript
// packages/convergence-engine/src/gateway/rest-api.ts
export class ConvergenceAPI {
  async startConvergence(req: Request, res: Response): Promise<void> {
    const { contractPath, config } = req.body;
    
    // Parse contract
    const contract = await this.contractParser.parse(contractPath);
    
    // Start convergence (async)
    const convergenceId = uuidv4();
    this.convergenceManager.start(convergenceId, contract, config);
    
    res.json({
      convergenceId,
      status: 'RUNNING',
      message: 'Convergence started',
    });
  }
  
  async getStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const status = await this.convergenceManager.getStatus(id);
    
    res.json(status);
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:rest-api
```

---

#### Task 4.14: WebSocket Server (Real-Time Updates)
**Time**: 15 minutes  
**Files**:
- `packages/convergence-engine/src/gateway/websocket-server.ts`

**Acceptance Criteria**:
- [ ] Connect to convergence by ID
- [ ] Stream iteration updates
- [ ] Send final result on completion
- [ ] Handle disconnections gracefully

**Code**:
```typescript
// packages/convergence-engine/src/gateway/websocket-server.ts
export class ConvergenceWebSocket {
  handleConnection(ws: WebSocket, convergenceId: string): void {
    // Subscribe to convergence events
    this.convergenceManager.on(`iteration:${convergenceId}`, (iteration) => {
      ws.send(JSON.stringify({
        type: 'ITERATION',
        data: {
          index: iteration.index,
          score: iteration.score,
          tokensUsed: iteration.tokensUsed,
        },
      }));
    });
    
    this.convergenceManager.on(`complete:${convergenceId}`, (result) => {
      ws.send(JSON.stringify({
        type: 'COMPLETE',
        data: result,
      }));
      ws.close();
    });
  }
}
```

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:websocket
```

---

#### Task 4.15: Authentication & Authorization
**Time**: 10 minutes  
**Files**:
- `packages/convergence-engine/src/gateway/auth-middleware.ts`

**Acceptance Criteria**:
- [ ] JWT token validation
- [ ] Rate limiting (per-user)
- [ ] Permission checks (can user run convergence?)
- [ ] Audit logging

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:auth-middleware
```

---

### Phase 5: Metrics & Observability (3 tasks, 1.5 days)

#### Task 4.16: Prometheus Metrics Exporter
**Time**: 15 minutes  
**Files**:
- `packages/convergence-engine/src/metrics/prometheus-exporter.ts`

**Acceptance Criteria**:
- [ ] Counter: convergence_total
- [ ] Gauge: convergence_success_rate
- [ ] Histogram: convergence_iterations
- [ ] Histogram: convergence_tokens
- [ ] Histogram: convergence_duration
- [ ] Gauge: validator_timeout_rate

**Code**:
```typescript
// packages/convergence-engine/src/metrics/prometheus-exporter.ts
import { Counter, Gauge, Histogram, register } from 'prom-client';

export const METRICS = {
  convergence_total: new Counter({
    name: 'convergence_total',
    help: 'Total convergence runs',
    labelNames: ['status'],
  }),
  
  convergence_success_rate: new Gauge({
    name: 'convergence_success_rate',
    help: 'Success rate (%)',
  }),
  
  convergence_iterations: new Histogram({
    name: 'convergence_iterations',
    help: 'Iterations per convergence run',
    buckets: [1, 3, 5, 10, 15, 20],
  }),
  
  convergence_tokens: new Histogram({
    name: 'convergence_tokens',
    help: 'Tokens used per convergence run',
    buckets: [1000, 5000, 10000, 25000, 50000, 100000],
  }),
  
  convergence_duration: new Histogram({
    name: 'convergence_duration_ms',
    help: 'Duration per convergence run (ms)',
    buckets: [10000, 30000, 60000, 120000, 300000],
  }),
};
```

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:prometheus-exporter
curl http://localhost:3000/metrics
```

---

#### Task 4.17: Grafana Dashboard JSON
**Time**: 10 minutes  
**Files**:
- `packages/convergence-engine/dashboards/convergence-dashboard.json`

**Acceptance Criteria**:
- [ ] Success rate panel
- [ ] Token usage panel
- [ ] Iteration distribution panel
- [ ] Duration panel
- [ ] Timeout rate panel

**Verification**:
```bash
# Import dashboard into Grafana
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @dashboards/convergence-dashboard.json
```

---

#### Task 4.18: Integration Test Suite
**Time**: 15 minutes  
**Files**:
- `packages/convergence-engine/tests/integration/end-to-end.test.ts`

**Acceptance Criteria**:
- [ ] Test full convergence flow (contract → code → evidence)
- [ ] Test timeout handling
- [ ] Test circuit breaker
- [ ] Test evidence pack generation
- [ ] Test metrics collection

**Verification**:
```bash
pnpm --filter @forge/convergence-engine test:integration
pnpm --filter @forge/convergence-engine test        # All tests
pnpm --filter @forge/convergence-engine build       # Final build
```

---

## Completion Checklist

- [ ] **Phase 1**: Convergence Loop Foundation (5 tasks) ✅
- [ ] **Phase 2**: Timeout & Error Handling (4 tasks) ✅
- [ ] **Phase 3**: Evidence Pack Generation (3 tasks) ✅
- [ ] **Phase 4**: Gateway Integration (3 tasks) ✅
- [ ] **Phase 5**: Metrics & Observability (3 tasks) ✅
- [ ] All tests passing (>90% coverage)
- [ ] Integration tests passing
- [ ] Evidence packs generating with signatures
- [ ] Metrics exporting to Prometheus
- [ ] Documentation complete

---

## Task Dependencies

```
Phase 1 (Foundation)
├── Task 4.1: State Manager ──┐
├── Task 4.2: Stop Conditions │
├── Task 4.3: Code Generator  ├──> Task 4.5: Convergence Loop
└── Task 4.4: Validator Orch ─┘

Phase 2 (Timeout)
├── Task 4.6: Timeout Manager ──┐
├── Task 4.7: Circuit Breaker  ├──> Task 4.9: Integration
└── Task 4.8: Fallback Handler ─┘

Phase 3 (Evidence)
├── Task 4.10: Evidence Collector ──┐
├── Task 4.11: Evidence Synthesizer ├──> Task 4.12: Signer & Exporter
└── (both parallel)                 ─┘

Phase 4 (Gateway)
├── Task 4.13: REST API ──┐
├── Task 4.14: WebSocket  ├──> All can be parallel
└── Task 4.15: Auth ──────┘

Phase 5 (Metrics)
├── Task 4.16: Prometheus ──> Task 4.17: Dashboard
└── Task 4.18: Integration Tests (requires all above)
```

---

## Handoff to Epic 5

**Epic 5 Multi-Agent Orchestration will add**:
1. Agent specialization (Frontend, Backend, Testing, Security agents)
2. Parallel convergence (multiple contracts simultaneously)
3. Agent handoff protocols (context passing between agents)
4. Multi-agent coordination (Initializer + Worker pattern)

**Files Epic 5 needs**:
- `packages/convergence-engine/src/core/convergence-loop.ts` - Extend for multi-agent
- `packages/convergence-engine/src/evidence/evidence-collector.ts` - Collect per-agent evidence
- `packages/convergence-engine/src/metrics/prometheus-exporter.ts` - Add per-agent metrics
