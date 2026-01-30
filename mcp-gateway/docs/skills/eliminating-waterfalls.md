---
name: eliminating-waterfalls
description: Performance optimization skill for parallelizing independent async operations. Use when auditing code with multiple sequential await calls, fixing request waterfalls, optimizing API call patterns, or reviewing async/await usage. Triggers on Promise.all opportunities, sequential fetches, and await cascades.
---

# Eliminating Waterfalls

Parallelize independent async operations to eliminate request waterfalls.

## Core Problem

Sequential awaits create "waterfalls" where each request waits for the previous to complete:

```typescript
// ❌ WATERFALL - 3 sequential requests (3000ms total)
const user = await fetchUser(id);      // 1000ms
const posts = await fetchPosts(id);    // 1000ms
const comments = await fetchComments(id); // 1000ms
```

## The Fix

Use Promise.all for independent operations:

```typescript
// ✅ PARALLEL - 3 concurrent requests (1000ms total)
const [user, posts, comments] = await Promise.all([
  fetchUser(id),
  fetchPosts(id),
  fetchComments(id)
]);
```

## Detection Patterns

### Pattern 1: Sequential Awaits (Same Scope)
```typescript
// ❌ Flag this
const a = await fetchA();
const b = await fetchB();
const c = await fetchC();
```

### Pattern 2: Loop Awaits
```typescript
// ❌ Flag this
for (const id of ids) {
  const result = await fetch(id); // N sequential requests
}

// ✅ Fix
const results = await Promise.all(ids.map(id => fetch(id)));
```

### Pattern 3: Conditional Independence
```typescript
// ❌ Flag if fetchB doesn't depend on userA
const userA = await fetchUserA();
const userB = await fetchUserB(); // Independent!
```

## When NOT to Parallelize

1. **Dependent data:** B needs result of A
2. **Rate limits:** API has request throttling
3. **Order matters:** Mutations that must be sequential
4. **Resource constraints:** Memory-heavy operations

## Audit Checklist

When reviewing async code:
- [ ] Are there 2+ sequential awaits in the same function?
- [ ] Do the awaited operations depend on each other?
- [ ] Is there a loop with await inside?
- [ ] Could Promise.all reduce total execution time?

## Real-World Impact

| Pattern | Before | After | Savings |
|---------|--------|-------|---------|
| 3 API calls | 3000ms | 1000ms | 66% |
| 10 item loop | 10000ms | 1000ms | 90% |
| Page load | 5000ms | 1500ms | 70% |

## Integration with React/Next.js

```typescript
// Next.js Server Component - Parallel data fetching
async function Page({ params }) {
  const [user, posts, settings] = await Promise.all([
    getUser(params.id),
    getPosts(params.id),
    getSettings(params.id)
  ]);

  return <Dashboard user={user} posts={posts} settings={settings} />;
}
```

## Error Handling

```typescript
// With error handling
const results = await Promise.allSettled([
  fetchUser(id),
  fetchPosts(id),
  fetchComments(id)
]);

const user = results[0].status === 'fulfilled' ? results[0].value : null;
```
