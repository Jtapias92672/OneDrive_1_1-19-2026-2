---
name: advanced-tool-patterns
description: >
  Advanced patterns for AI tool usage including parallel execution, streaming,
  error recovery, and context management. Based on Anthropic's latest best
  practices for tool-augmented agents.
version: 1.0.0
author: ArcFoundry
triggers:
  - "tool patterns"
  - "parallel tools"
  - "tool execution"
---

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
