# FORGE Success Criteria Framework - Orchestration

**Version:** 2.0  
**Last Updated:** 2026-01-19  
**Epic:** 03 - forge-core (Orchestration Layer)  
**Status:** ✅ Complete (35 files, ~5,800 lines)

---

## Overview

The Orchestration Layer coordinates all components of the FORGE platform, managing the lifecycle of generation requests from receipt through completion. It handles request routing, agent coordination, resource allocation, and workflow management across the distributed system.

---

## Orchestration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATION ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        REQUEST INGESTION                             │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐   │   │
│  │  │   REST     │  │   gRPC     │  │    MCP     │  │   QUEUE     │   │   │
│  │  │  ENDPOINT  │  │  ENDPOINT  │  │   SERVER   │  │  CONSUMER   │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       ORCHESTRATION CORE                             │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐   │   │
│  │  │  REQUEST   │  │  WORKFLOW  │  │   AGENT    │  │  RESOURCE   │   │   │
│  │  │  MANAGER   │  │   ENGINE   │  │  REGISTRY  │  │   MANAGER   │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        EXECUTION LAYER                               │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │ GENERATE │  │ VALIDATE │  │ CONVERGE │  │ FINALIZE │            │   │
│  │  │   TASK   │  │   TASK   │  │   TASK   │  │   TASK   │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### Request Manager

The Request Manager handles the lifecycle of all incoming generation requests.

```typescript
interface RequestManager {
  // Request handling
  submit(request: GenerationRequest): Promise<RequestHandle>;
  cancel(requestId: string): Promise<void>;
  getStatus(requestId: string): Promise<RequestStatus>;
  
  // Priority management
  setPriority(requestId: string, priority: Priority): Promise<void>;
  requeue(requestId: string): Promise<void>;
  
  // Batch operations
  submitBatch(requests: GenerationRequest[]): Promise<RequestHandle[]>;
  cancelBatch(requestIds: string[]): Promise<void>;
}

interface GenerationRequest {
  // Identity
  id: string;
  contractId: string;
  projectId: string;
  
  // Input
  prompt: string;
  context: RequestContext;
  parameters: GenerationParameters;
  
  // Configuration
  priority: Priority;
  timeout: number;
  retryPolicy: RetryPolicy;
  
  // Routing
  targetAgent?: string;
  routingHints?: RoutingHint[];
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  tags: string[];
}

interface RequestHandle {
  requestId: string;
  status: RequestStatus;
  queuePosition?: number;
  estimatedStartTime?: Date;
  
  // Async result
  getResult(): Promise<GenerationResult>;
  waitForCompletion(timeout?: number): Promise<GenerationResult>;
  
  // Events
  onProgress(callback: (progress: Progress) => void): void;
  onStatusChange(callback: (status: RequestStatus) => void): void;
}
```

### Workflow Engine

The Workflow Engine defines and executes multi-step generation workflows.

```typescript
interface WorkflowEngine {
  // Workflow management
  defineWorkflow(definition: WorkflowDefinition): Promise<Workflow>;
  executeWorkflow(workflowId: string, input: WorkflowInput): Promise<WorkflowExecution>;
  
  // Execution control
  pauseExecution(executionId: string): Promise<void>;
  resumeExecution(executionId: string): Promise<void>;
  cancelExecution(executionId: string): Promise<void>;
  
  // State management
  getExecutionState(executionId: string): Promise<ExecutionState>;
  setCheckpoint(executionId: string): Promise<Checkpoint>;
  rollbackToCheckpoint(executionId: string, checkpointId: string): Promise<void>;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  
  // Structure
  steps: WorkflowStep[];
  transitions: StepTransition[];
  
  // Configuration
  parallelism: ParallelismConfig;
  errorHandling: ErrorHandlingConfig;
  timeout: number;
  
  // Hooks
  onStart?: WorkflowHook;
  onComplete?: WorkflowHook;
  onError?: WorkflowHook;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  
  // Execution
  action: StepAction;
  input: StepInputMapping;
  output: StepOutputMapping;
  
  // Configuration
  timeout?: number;
  retries?: number;
  condition?: StepCondition;
}

type StepType = 
  | 'GENERATE'      // LLM generation
  | 'VALIDATE'      // Run validation
  | 'TRANSFORM'     // Data transformation
  | 'DECISION'      // Conditional branch
  | 'PARALLEL'      // Parallel execution
  | 'HUMAN_REVIEW'  // Human-in-the-loop
  | 'EXTERNAL'      // External service call
  | 'WAIT';         // Timer/event wait
```

### Agent Registry

The Agent Registry manages available generation agents and their capabilities.

```typescript
interface AgentRegistry {
  // Registration
  registerAgent(agent: AgentDefinition): Promise<void>;
  deregisterAgent(agentId: string): Promise<void>;
  updateAgent(agentId: string, updates: Partial<AgentDefinition>): Promise<void>;
  
  // Discovery
  getAgent(agentId: string): Promise<Agent | null>;
  listAgents(filter?: AgentFilter): Promise<Agent[]>;
  findBestAgent(requirements: AgentRequirements): Promise<Agent | null>;
  
  // Health monitoring
  getAgentHealth(agentId: string): Promise<AgentHealth>;
  setAgentStatus(agentId: string, status: AgentStatus): Promise<void>;
}

interface AgentDefinition {
  id: string;
  name: string;
  version: string;
  
  // Capabilities
  capabilities: AgentCapability[];
  supportedModels: string[];
  supportedLanguages: string[];
  
  // Resources
  endpoint: string;
  maxConcurrency: number;
  resourceRequirements: ResourceRequirements;
  
  // Configuration
  defaultParameters: Record<string, unknown>;
  timeoutMs: number;
  
  // Metadata
  owner: string;
  tags: string[];
}

interface AgentCapability {
  type: CapabilityType;
  languages?: string[];
  frameworks?: string[];
  specializations?: string[];
  qualityLevel: QualityLevel;
}

type CapabilityType = 
  | 'CODE_GENERATION'
  | 'CODE_REVIEW'
  | 'DOCUMENTATION'
  | 'TEST_GENERATION'
  | 'REFACTORING'
  | 'BUG_FIX'
  | 'TRANSLATION';
```

### Resource Manager

The Resource Manager handles allocation and tracking of computational resources.

```typescript
interface ResourceManager {
  // Allocation
  allocate(request: ResourceRequest): Promise<ResourceAllocation>;
  release(allocationId: string): Promise<void>;
  
  // Monitoring
  getUsage(resourceType?: ResourceType): Promise<ResourceUsage>;
  getQuotas(tenantId: string): Promise<ResourceQuotas>;
  
  // Scaling
  requestScale(resourceType: ResourceType, amount: number): Promise<void>;
  setAutoscaling(config: AutoscalingConfig): Promise<void>;
}

interface ResourceRequest {
  requesterId: string;
  type: ResourceType;
  amount: number;
  priority: Priority;
  duration?: number;
  exclusive?: boolean;
}

interface ResourceAllocation {
  id: string;
  resources: AllocatedResource[];
  expiresAt?: Date;
  
  // Control
  extend(duration: number): Promise<void>;
  resize(newAmount: number): Promise<void>;
}

type ResourceType = 
  | 'LLM_TOKENS'
  | 'COMPUTE_UNITS'
  | 'MEMORY'
  | 'STORAGE'
  | 'NETWORK_BANDWIDTH'
  | 'API_CALLS';
```

---

## Workflow Patterns

### Standard Generation Workflow

```yaml
workflow:
  id: standard-generation
  name: Standard Code Generation
  version: "1.0.0"
  
  steps:
    - id: validate-input
      type: VALIDATE
      action:
        validator: input-validator
        rules:
          - contract-compliance
          - security-scan
      
    - id: generate
      type: GENERATE
      action:
        agent: code-generator
        model: claude-sonnet-4-20250514
      input:
        prompt: "$.request.prompt"
        context: "$.request.context"
      
    - id: validate-output
      type: VALIDATE
      action:
        validators:
          - structural-validator
          - semantic-validator
          - quality-validator
      
    - id: converge
      type: DECISION
      condition: "$.validation.score < $.contract.threshold"
      branches:
        true:
          next: refine
        false:
          next: finalize
      
    - id: refine
      type: GENERATE
      action:
        agent: code-generator
        mode: refinement
      input:
        original: "$.steps.generate.output"
        feedback: "$.steps.validate-output.feedback"
      transitions:
        - to: validate-output
          maxIterations: 5
      
    - id: finalize
      type: TRANSFORM
      action:
        transformer: output-formatter
      output:
        result: "$.steps.generate.output"
        evidence: "$.validation.evidence"
```

### Defense Contract Workflow

```yaml
workflow:
  id: defense-contract-generation
  name: Defense Contract Code Generation
  version: "1.0.0"
  
  steps:
    - id: security-pre-check
      type: VALIDATE
      action:
        validator: security-clearance-validator
        rules:
          - clearance-verification
          - need-to-know-check
          - facility-authorization
      
    - id: classify-content
      type: TRANSFORM
      action:
        transformer: classification-engine
        config:
          defaultLevel: CUI
          markingRequired: true
      
    - id: generate
      type: GENERATE
      action:
        agent: cleared-code-generator
        environment: isolated
        model: claude-sonnet-4-20250514
      config:
        airgapped: true
        auditAll: true
      
    - id: compliance-validation
      type: VALIDATE
      action:
        validators:
          - dcma-validator
          - dfars-validator
          - cmmc-validator
          - nist-800-171-validator
      
    - id: human-review
      type: HUMAN_REVIEW
      action:
        reviewers:
          - role: security-officer
            required: true
          - role: technical-lead
            required: true
        timeout: 72h
        escalation: security-director
      
    - id: evidence-pack
      type: TRANSFORM
      action:
        transformer: evidence-pack-generator
        config:
          includeSignatures: true
          encryptionRequired: true
          archiveRetention: 7y
      
    - id: finalize
      type: TRANSFORM
      action:
        transformer: secure-output-formatter
      output:
        result: "$.steps.generate.output"
        evidence: "$.steps.evidence-pack.output"
        classification: "$.steps.classify-content.output"
```

---

## Request Routing

### Routing Engine

```typescript
interface RoutingEngine {
  // Route selection
  selectRoute(request: GenerationRequest): Promise<Route>;
  
  // Strategy management
  setStrategy(strategy: RoutingStrategy): void;
  addRule(rule: RoutingRule): void;
  
  // Load balancing
  getRouteMetrics(): Promise<RouteMetrics>;
  rebalance(): Promise<void>;
}

interface Route {
  agent: Agent;
  endpoint: string;
  estimatedLatency: number;
  cost: number;
  confidence: number;
}

interface RoutingRule {
  id: string;
  priority: number;
  
  // Matching
  condition: RoutingCondition;
  
  // Target
  target: RoutingTarget;
  
  // Fallback
  fallback?: RoutingTarget;
}

type RoutingCondition = {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'matches';
  value: unknown;
} | {
  and: RoutingCondition[];
} | {
  or: RoutingCondition[];
};
```

### Load Balancing Strategies

```typescript
type LoadBalancingStrategy = 
  | 'ROUND_ROBIN'      // Equal distribution
  | 'LEAST_LOADED'     // Route to least busy agent
  | 'RESPONSE_TIME'    // Route to fastest agent
  | 'COST_OPTIMIZED'   // Minimize resource cost
  | 'QUALITY_OPTIMIZED' // Maximize output quality
  | 'WEIGHTED'         // Custom weight distribution
  | 'STICKY';          // Same user to same agent

interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy;
  
  // Health checking
  healthCheckInterval: number;
  unhealthyThreshold: number;
  healthyThreshold: number;
  
  // Circuit breaker
  circuitBreakerEnabled: boolean;
  failureThreshold: number;
  recoveryTimeout: number;
  
  // Rate limiting
  maxRequestsPerSecond?: number;
  burstSize?: number;
}
```

---

## Execution Management

### Task Executor

```typescript
interface TaskExecutor {
  // Execution
  execute(task: Task): Promise<TaskResult>;
  executeAsync(task: Task): Promise<TaskHandle>;
  
  // Control
  pause(taskId: string): Promise<void>;
  resume(taskId: string): Promise<void>;
  cancel(taskId: string): Promise<void>;
  
  // Retry
  retry(taskId: string): Promise<TaskHandle>;
  retryWithConfig(taskId: string, config: RetryConfig): Promise<TaskHandle>;
}

interface Task {
  id: string;
  type: TaskType;
  
  // Input
  input: unknown;
  context: TaskContext;
  
  // Configuration
  timeout: number;
  retryPolicy: RetryPolicy;
  priority: Priority;
  
  // Dependencies
  dependsOn?: string[];
  
  // Callbacks
  onProgress?: (progress: Progress) => void;
  onComplete?: (result: TaskResult) => void;
  onError?: (error: Error) => void;
}

interface RetryPolicy {
  maxAttempts: number;
  backoffType: 'FIXED' | 'EXPONENTIAL' | 'LINEAR';
  initialDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}
```

### Parallel Execution

```typescript
interface ParallelExecutor {
  // Parallel execution
  executeParallel(tasks: Task[]): Promise<TaskResult[]>;
  executeParallelWithLimit(tasks: Task[], concurrency: number): Promise<TaskResult[]>;
  
  // Fork-join
  forkJoin(forkConfig: ForkConfig): Promise<JoinResult>;
  
  // Map-reduce
  mapReduce<T, U>(
    items: T[],
    mapper: (item: T) => Promise<U>,
    reducer: (results: U[]) => Promise<U>
  ): Promise<U>;
}

interface ForkConfig {
  // Tasks to fork
  tasks: Task[];
  
  // Join strategy
  joinStrategy: JoinStrategy;
  
  // Failure handling
  failFast: boolean;
  partialResults: boolean;
}

type JoinStrategy = 
  | 'ALL'           // Wait for all tasks
  | 'ANY'           // Return first completion
  | 'MAJORITY'      // Return when majority complete
  | 'QUORUM';       // Return when quorum reached
```

---

## State Management

### Execution State

```typescript
interface ExecutionState {
  executionId: string;
  workflowId: string;
  
  // Current position
  currentStep: string;
  status: ExecutionStatus;
  
  // Data
  input: unknown;
  output: unknown;
  stepResults: Map<string, StepResult>;
  
  // Progress
  completedSteps: string[];
  pendingSteps: string[];
  failedSteps: string[];
  
  // Timing
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Checkpoints
  checkpoints: Checkpoint[];
  currentCheckpoint?: string;
}

interface Checkpoint {
  id: string;
  step: string;
  timestamp: Date;
  
  // State snapshot
  state: Partial<ExecutionState>;
  
  // Metadata
  reason: string;
  auto: boolean;
}

type ExecutionStatus = 
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'WAITING_HUMAN'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMEOUT';
```

### State Persistence

```typescript
interface StateStore {
  // State operations
  save(state: ExecutionState): Promise<void>;
  load(executionId: string): Promise<ExecutionState | null>;
  delete(executionId: string): Promise<void>;
  
  // Checkpoint operations
  saveCheckpoint(checkpoint: Checkpoint): Promise<void>;
  loadCheckpoint(checkpointId: string): Promise<Checkpoint | null>;
  listCheckpoints(executionId: string): Promise<Checkpoint[]>;
  
  // Query
  query(filter: StateFilter): Promise<ExecutionState[]>;
}

// PostgreSQL-backed implementation
class PostgresStateStore implements StateStore {
  constructor(private pool: Pool) {}
  
  async save(state: ExecutionState): Promise<void> {
    await this.pool.query(`
      INSERT INTO execution_states (
        execution_id, workflow_id, current_step, status,
        input, output, step_results, completed_steps,
        started_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (execution_id) DO UPDATE SET
        current_step = $3,
        status = $4,
        output = $6,
        step_results = $7,
        completed_steps = $8,
        updated_at = NOW()
    `, [
      state.executionId,
      state.workflowId,
      state.currentStep,
      state.status,
      JSON.stringify(state.input),
      JSON.stringify(state.output),
      JSON.stringify(Object.fromEntries(state.stepResults)),
      state.completedSteps
    ]);
  }
}
```

---

## Error Handling

### Error Types

```typescript
type OrchestrationError = 
  | RequestError
  | WorkflowError
  | AgentError
  | ResourceError
  | TimeoutError;

class RequestError extends Error {
  constructor(
    public requestId: string,
    public reason: RequestErrorReason,
    message: string
  ) {
    super(message);
  }
}

type RequestErrorReason = 
  | 'INVALID_INPUT'
  | 'CONTRACT_VIOLATION'
  | 'AUTHORIZATION_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'DUPLICATE_REQUEST';

class WorkflowError extends Error {
  constructor(
    public executionId: string,
    public step: string,
    public reason: WorkflowErrorReason,
    message: string
  ) {
    super(message);
  }
}

type WorkflowErrorReason = 
  | 'STEP_FAILED'
  | 'TRANSITION_INVALID'
  | 'CONDITION_ERROR'
  | 'MAX_ITERATIONS'
  | 'HUMAN_REJECTION';
```

### Error Recovery

```typescript
interface ErrorRecovery {
  // Recovery strategies
  canRecover(error: OrchestrationError): boolean;
  getRecoveryStrategy(error: OrchestrationError): RecoveryStrategy;
  executeRecovery(execution: WorkflowExecution, strategy: RecoveryStrategy): Promise<void>;
}

type RecoveryStrategy = 
  | { type: 'RETRY'; config: RetryConfig }
  | { type: 'ROLLBACK'; checkpointId: string }
  | { type: 'SKIP'; continueFrom: string }
  | { type: 'ALTERNATIVE'; alternativeStep: string }
  | { type: 'HUMAN_INTERVENTION'; escalation: EscalationConfig }
  | { type: 'ABORT'; cleanup: boolean };
```

---

## Monitoring & Metrics

### Orchestration Metrics

```typescript
const orchestrationMetrics = {
  // Request metrics
  requests_total: new Counter({
    name: 'forge_orchestration_requests_total',
    help: 'Total generation requests',
    labelNames: ['status', 'contract_type', 'priority']
  }),
  
  request_duration: new Histogram({
    name: 'forge_orchestration_request_duration_seconds',
    help: 'Request processing duration',
    labelNames: ['workflow', 'status'],
    buckets: [1, 5, 10, 30, 60, 120, 300]
  }),
  
  // Workflow metrics
  workflow_executions: new Counter({
    name: 'forge_orchestration_workflow_executions_total',
    help: 'Total workflow executions',
    labelNames: ['workflow_id', 'status']
  }),
  
  workflow_steps: new Counter({
    name: 'forge_orchestration_workflow_steps_total',
    help: 'Workflow steps executed',
    labelNames: ['workflow_id', 'step', 'status']
  }),
  
  // Agent metrics
  agent_utilization: new Gauge({
    name: 'forge_orchestration_agent_utilization',
    help: 'Agent utilization percentage',
    labelNames: ['agent_id']
  }),
  
  // Resource metrics
  resource_allocation: new Gauge({
    name: 'forge_orchestration_resource_allocation',
    help: 'Currently allocated resources',
    labelNames: ['resource_type', 'tenant_id']
  }),
  
  // Queue metrics
  queue_depth: new Gauge({
    name: 'forge_orchestration_queue_depth',
    help: 'Number of requests in queue',
    labelNames: ['priority']
  }),
  
  queue_wait_time: new Histogram({
    name: 'forge_orchestration_queue_wait_seconds',
    help: 'Time spent waiting in queue',
    labelNames: ['priority'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60]
  })
};
```

---

## Package Structure

```
forge-core/
├── src/
│   ├── orchestration/
│   │   ├── request-manager.ts         # Request lifecycle management
│   │   ├── workflow-engine.ts         # Workflow execution
│   │   ├── agent-registry.ts          # Agent management
│   │   ├── resource-manager.ts        # Resource allocation
│   │   ├── routing-engine.ts          # Request routing
│   │   ├── task-executor.ts           # Task execution
│   │   ├── parallel-executor.ts       # Parallel execution
│   │   └── index.ts
│   │
│   ├── state/
│   │   ├── execution-state.ts         # State types
│   │   ├── state-store.ts             # State persistence
│   │   ├── postgres-store.ts          # PostgreSQL implementation
│   │   ├── checkpoint-manager.ts      # Checkpoint handling
│   │   └── index.ts
│   │
│   ├── workflows/
│   │   ├── standard-generation.ts     # Standard workflow
│   │   ├── defense-contract.ts        # Defense workflow
│   │   ├── batch-processing.ts        # Batch workflow
│   │   └── index.ts
│   │
│   ├── errors/
│   │   ├── orchestration-errors.ts    # Error types
│   │   ├── error-recovery.ts          # Recovery strategies
│   │   └── index.ts
│   │
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

---

## Configuration

### Orchestration Config

```yaml
# orchestration-config.yaml
orchestration:
  # Request handling
  requests:
    maxConcurrent: 100
    defaultTimeout: 300000  # 5 minutes
    maxTimeout: 3600000     # 1 hour
    queueSize: 10000
    priorityLevels: 5
  
  # Workflow engine
  workflows:
    maxSteps: 50
    maxIterations: 10
    checkpointInterval: 5
    stateRetention: 604800  # 7 days
  
  # Agent management
  agents:
    healthCheckInterval: 30000
    unhealthyThreshold: 3
    deregistrationDelay: 300000
  
  # Resource management
  resources:
    allocationTimeout: 5000
    maxAllocationDuration: 3600000
    autoscalingEnabled: true
  
  # Routing
  routing:
    strategy: QUALITY_OPTIMIZED
    circuitBreakerEnabled: true
    failureThreshold: 5
    recoveryTimeout: 60000
```

---

## Related Documents

- [00_MASTER_ROADMAP.md](./00_MASTER_ROADMAP.md) - Platform overview
- [01_ANSWER_CONTRACT.md](./01_ANSWER_CONTRACT.md) - Contract definitions
- [05_CONVERGENCE_ENGINE.md](./05_CONVERGENCE_ENGINE.md) - Convergence system
- [07_RULE_SYSTEM.md](./07_RULE_SYSTEM.md) - Policy enforcement
- [11_OBSERVABILITY.md](./11_OBSERVABILITY.md) - Monitoring integration
