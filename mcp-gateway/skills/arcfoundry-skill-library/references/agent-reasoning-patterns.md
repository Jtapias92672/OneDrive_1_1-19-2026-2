# Agent Reasoning Patterns

This comprehensive reference combines all four agent reasoning and tool usage skills with FULL content.

---

## Part 1: Reasoning Technique Selector


# Reasoning Technique Selector Skill

## Core Principle

> "Different problems require different thinking strategies."

Not every problem needs chain-of-thought. Some need decomposition, others need
exploration, some need systematic enumeration.

---

## Technique Catalog

### 1. Chain-of-Thought (CoT)

**When**: Sequential reasoning, math, logic

```
Step 1 → Step 2 → Step 3 → Answer
```

**Use for**:
- Mathematical calculations
- Logical deductions
- Causal reasoning

### 2. Tree-of-Thought (ToT)

**When**: Multiple paths to explore, optimization

```
        Start
       /  |  \
     A    B    C
    /\   /\   /\
   A1 A2 B1 B2 C1 C2
```

**Use for**:
- Search problems
- Game playing
- Multi-step planning

### 3. Decomposition

**When**: Complex problems with independent parts

```
Big Problem
├── Subproblem 1 → Solution 1
├── Subproblem 2 → Solution 2
└── Subproblem 3 → Solution 3
                   └── Combine → Final Solution
```

**Use for**:
- Large coding tasks
- System design
- Research synthesis

### 4. Analogical Reasoning

**When**: Novel problem with similar precedents

```
Known Problem → Known Solution
      ↓ (map)
New Problem → New Solution
```

**Use for**:
- Design patterns
- Bug diagnosis
- Strategy transfer

### 5. Systematic Enumeration

**When**: Finite space to explore

```
All possibilities: [A, B, C, D]
Check A: ❌
Check B: ❌
Check C: ✓ → Answer
```

**Use for**:
- Debugging
- Configuration
- Edge case analysis

---

## Selection Decision Tree

```
Is the problem...
├── Sequential/causal? → Chain-of-Thought
├── Multi-path with backtracking? → Tree-of-Thought
├── Large and divisible? → Decomposition
├── Similar to known problem? → Analogical
├── Finite search space? → Systematic Enumeration
└── Unclear? → Start with Chain-of-Thought, switch if stuck
```

---

## Technique Switching

Sometimes you need to switch mid-problem:

```yaml
switch_triggers:
  cot_to_decomposition:
    signal: "Problem too large for single chain"
    action: "Break into subproblems"
    
  cot_to_tot:
    signal: "Multiple viable paths, unclear best"
    action: "Explore branches in parallel"
    
  tot_to_enumeration:
    signal: "Search space is finite and small"
    action: "Systematically check all options"
```

---

## Integration Points

```yaml
integrates_with:
  - exploration-protocol: "Exploration uses multiple techniques"
  - analytics-orchestration: "Query routing uses reasoning selection"
```

---

*This skill ensures the right thinking approach for each problem type.*

---

## Part 2: Model Routing Protocol


# Model Routing Protocol Skill

## Core Principle

> "Use the smallest model that can do the job well."

Not every task needs the most powerful model. Routing appropriately:
- Reduces cost
- Improves latency
- Reserves capacity for complex tasks

---

## Model Tiers

| Tier | Model Class | Use For | Cost | Latency |
|------|-------------|---------|------|---------|
| Flash | Haiku, GPT-4o-mini | Simple tasks, high volume | $ | ~100ms |
| Standard | Sonnet | Most tasks | $$ | ~500ms |
| Expert | Opus | Complex reasoning | $$$ | ~2s |

---

## Routing Decision Matrix

| Task Type | Complexity | Recommended Tier |
|-----------|------------|------------------|
| Classification | Low | Flash |
| Entity extraction | Low | Flash |
| Simple Q&A | Low | Flash |
| Code completion | Medium | Standard |
| Document summarization | Medium | Standard |
| Analysis with reasoning | Medium | Standard |
| Architecture design | High | Expert |
| Complex debugging | High | Expert |
| Multi-step planning | High | Expert |

---

## Routing Algorithm

```typescript
function routeToModel(task: Task): ModelTier {
  // Check explicit requirements
  if (task.requiresExpert) return 'EXPERT';
  
  // Estimate complexity
  const complexity = estimateComplexity(task);
  
  // Check latency requirements
  if (task.maxLatencyMs < 200) return 'FLASH';
  
  // Route by complexity
  if (complexity < 0.3) return 'FLASH';
  if (complexity < 0.7) return 'STANDARD';
  return 'EXPERT';
}

function estimateComplexity(task: Task): number {
  const factors = [
    task.inputTokens / 10000,           // Length factor
    task.requiresReasoning ? 0.3 : 0,   // Reasoning factor
    task.requiresCreativity ? 0.2 : 0,  // Creativity factor
    task.domainSpecificity * 0.2,       // Domain factor
    task.multiStep ? 0.3 : 0            // Multi-step factor
  ];
  
  return Math.min(1, factors.reduce((a, b) => a + b, 0));
}
```

---

## Escalation Pattern

Start small, escalate if needed:

```
1. Try FLASH tier
2. If confidence < threshold → escalate to STANDARD
3. If still struggling → escalate to EXPERT
4. Log escalation for future routing improvement
```

---

## Cost Tracking

```typescript
interface CostMetrics {
  taskType: string;
  tierUsed: ModelTier;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number;
  qualityScore: number;  // Did it work?
}
```

Track over time to optimize routing decisions.

---

## Integration Points

```yaml
integrates_with:
  - agent-orchestration: "Agents specify model requirements"
  - analytics-orchestration: "Query complexity determines model"
  - performance-budgets: "Cost is a budget metric"
```

---

*This skill optimizes model usage for cost and performance.*

---

## Part 3: Dynamic Prioritization Queue


# Dynamic Prioritization Queue Skill

## Core Principle

> "Priorities change. The queue must adapt."

Static task lists become stale. Dynamic prioritization responds to:
- New blockers
- Changing deadlines
- Discovered dependencies
- Resource availability

---

## Priority Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Deadline urgency | 0.3 | Time until due |
| Blocking others | 0.25 | How many tasks depend on this |
| Business value | 0.2 | Impact if completed |
| Effort required | 0.15 | Complexity and duration |
| Risk of delay | 0.1 | Consequences of slipping |

---

## Priority Score Calculation

```typescript
function calculatePriority(task: Task, context: Context): number {
  const urgency = deadlineUrgency(task.deadline);
  const blocking = blockingFactor(task, context.dependencies);
  const value = task.businessValue;
  const effort = 1 - (task.estimatedHours / 40); // Prefer smaller tasks
  const risk = task.riskLevel;
  
  return (
    urgency * 0.30 +
    blocking * 0.25 +
    value * 0.20 +
    effort * 0.15 +
    risk * 0.10
  );
}
```

---

## Re-prioritization Triggers

```yaml
triggers:
  - new_blocker_discovered
  - deadline_changed
  - dependency_completed
  - resource_became_available
  - task_failed
  - priority_override_by_human
```

---

## Queue Operations

```typescript
class DynamicPriorityQueue {
  private tasks: Task[];
  
  add(task: Task): void {
    this.tasks.push(task);
    this.reorder();
  }
  
  next(): Task {
    this.reorder();  // Always reorder before dequeue
    return this.tasks.shift();
  }
  
  reorder(): void {
    const context = this.getCurrentContext();
    this.tasks.sort((a, b) => 
      calculatePriority(b, context) - calculatePriority(a, context)
    );
  }
  
  onBlockerDiscovered(blockerId: string, blockedIds: string[]): void {
    // Move blocker up, blocked items down
    this.reorder();
  }
  
  onDeadlineChanged(taskId: string, newDeadline: Date): void {
    const task = this.tasks.find(t => t.id === taskId);
    task.deadline = newDeadline;
    this.reorder();
  }
}
```

---

## Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│ PRIORITY QUEUE                                    [Refresh] [+] │
├─────────────────────────────────────────────────────────────────┤
│ # │ Task                    │ Score │ Deadline │ Blockers       │
├───┼─────────────────────────┼───────┼──────────┼────────────────┤
│ 1 │ Fix auth bug           │ 0.92  │ TODAY    │ Blocks 3 tasks │
│ 2 │ Deploy connector       │ 0.78  │ Tomorrow │ -              │
│ 3 │ Write specs            │ 0.65  │ Friday   │ -              │
│ 4 │ Update docs            │ 0.42  │ Next week│ Blocked by #1  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

```yaml
integrates_with:
  - agent-orchestration: "Multi-agent task distribution"
  - jt1-recovery-protocol: "Crisis tasks get top priority"
  - task-estimation: "Effort estimates feed priority"
```

---

*This skill ensures you're always working on the most important thing.*

---

## Part 4: Advanced Tool Patterns


# Advanced Tool Patterns Skill

## Pattern 1: Parallel Tool Execution

When multiple independent tools can run simultaneously:

```typescript
// Instead of sequential:
const result1 = await tool1();
const result2 = await tool2();
const result3 = await tool3();

// Use parallel:
const [result1, result2, result3] = await Promise.all([
  tool1(),
  tool2(),
  tool3()
]);
```

**When to use**: Tools have no dependencies on each other
**When NOT to use**: Tool2 needs Tool1's output

---

## Pattern 2: Streaming Results

For long-running tools, stream partial results:

```typescript
async function* streamingSearch(query: string) {
  const results = [];
  for await (const batch of searchBatches(query)) {
    results.push(...batch);
    yield { partial: true, results };
  }
  yield { partial: false, results };
}
```

---

## Pattern 3: Graceful Degradation

When tools fail, degrade gracefully:

```typescript
async function robustToolCall(primary, fallback, cache) {
  try {
    return await primary();
  } catch (e) {
    console.warn('Primary failed, trying fallback');
    try {
      return await fallback();
    } catch (e2) {
      console.warn('Fallback failed, using cache');
      return cache.get();
    }
  }
}
```

---

## Pattern 4: Context Preservation

Maintain context across tool calls:

```typescript
interface ToolContext {
  conversationId: string;
  previousResults: Map<string, any>;
  errorHistory: Error[];
}

async function callWithContext(tool, args, context) {
  const result = await tool(args);
  context.previousResults.set(tool.name, result);
  return result;
}
```

---

## Pattern 5: Rate Limiting

Respect API rate limits:

```typescript
const rateLimiter = new RateLimiter({
  maxRequests: 100,
  perSeconds: 60
});

async function rateLimitedCall(tool, args) {
  await rateLimiter.acquire();
  try {
    return await tool(args);
  } finally {
    rateLimiter.release();
  }
}
```

---

## Pattern 6: Result Caching

Cache expensive tool results:

```typescript
const cache = new LRUCache({ maxSize: 1000, ttl: 300000 });

async function cachedToolCall(tool, args) {
  const key = JSON.stringify({ tool: tool.name, args });
  if (cache.has(key)) {
    return cache.get(key);
  }
  const result = await tool(args);
  cache.set(key, result);
  return result;
}
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Fire and forget | Lost results | Always await |
| Infinite retry | Resource exhaustion | Max retry with backoff |
| No timeout | Hanging calls | Always set timeout |
| Ignoring errors | Silent failures | Log and handle |

---

*This skill captures advanced patterns for robust tool usage.*
