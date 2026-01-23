---
name: model-routing-protocol
description: >
  Route tasks to appropriate model tiers based on complexity, cost, and latency
  requirements. Matches simple tasks to smaller models, complex tasks to larger
  ones. Optimizes cost while maintaining quality.
version: 1.0.0
author: ArcFoundry
triggers:
  - "which model"
  - "model selection"
  - "cost optimization"
  - "model routing"
---

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
