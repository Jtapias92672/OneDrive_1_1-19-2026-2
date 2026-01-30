---
name: referential-equality
description: Caching and memoization skill for fixing broken caches caused by new object references. Use when debugging cache misses, fixing useMemo/useCallback issues, optimizing React re-renders, or reviewing dependency arrays. Triggers on cache invalidation bugs, excessive re-renders, and memo anti-patterns.
---

# Referential Equality

Fix broken caches and memoization caused by new object references.

## Core Problem

JavaScript compares objects by reference, not value:

```typescript
// Same value, different references
const a = { name: 'John' };
const b = { name: 'John' };
console.log(a === b); // false! Different references

// This breaks caching, memoization, and dependency arrays
```

## React-Specific Issues

### Pattern 1: Inline Objects in Props
```typescript
// ❌ Creates new object every render - breaks memo
<Child config={{ theme: 'dark' }} />

// ✅ Stable reference
const config = useMemo(() => ({ theme: 'dark' }), []);
<Child config={config} />
```

### Pattern 2: Inline Functions
```typescript
// ❌ Creates new function every render
<Button onClick={() => handleClick(id)} />

// ✅ Stable callback
const handleButtonClick = useCallback(() => handleClick(id), [id]);
<Button onClick={handleButtonClick} />
```

### Pattern 3: Dependency Arrays
```typescript
// ❌ Object in dependency - runs every render
const options = { limit: 10 };
useEffect(() => {
  fetch('/api', options);
}, [options]); // New object every time!

// ✅ Memoized or primitive dependencies
const options = useMemo(() => ({ limit: 10 }), []);
useEffect(() => {
  fetch('/api', options);
}, [options]); // Stable reference
```

### Pattern 4: Array Mapping in Render
```typescript
// ❌ New array every render
<List items={data.map(transform)} />

// ✅ Memoized transformation
const transformedItems = useMemo(() => data.map(transform), [data]);
<List items={transformedItems} />
```

## Detection Checklist

Look for these in components:
- [ ] Objects/arrays created inline in JSX
- [ ] Functions defined inline in JSX
- [ ] Object literals in useEffect/useMemo/useCallback dependencies
- [ ] `.map()`, `.filter()`, `.reduce()` directly in render
- [ ] Spread operators creating new objects in hot paths

## Caching Issues

### API Response Caching
```typescript
// ❌ Cache never hits - new object as key
const cache = new Map();
const getUser = (id) => {
  const key = { userId: id }; // New object every call!
  if (cache.has(key)) return cache.get(key);
  // ...
};

// ✅ Primitive or stringified key
const getUser = (id) => {
  const key = `user:${id}`;
  if (cache.has(key)) return cache.get(key);
  // ...
};
```

### SWR/React Query Keys
```typescript
// ❌ New array reference - cache miss
useSWR(['/api/user', { id }], fetcher);

// ✅ Stable key
useSWR(`/api/user/${id}`, fetcher);

// Or with stable array
const key = useMemo(() => ['/api/user', id], [id]);
useSWR(key, fetcher);
```

## Debugging Tools

```typescript
// useWhyDidYouRender - tracks unnecessary re-renders
import whyDidYouRender from '@welldone-software/why-did-you-render';
whyDidYouRender(React, { trackAllPureComponents: true });

// Manual comparison
useEffect(() => {
  console.log('Deps changed:', {
    objSame: prevObj === currentObj,
    arrSame: prevArr === currentArr
  });
});
```

## Fix Strategies

| Issue | Fix |
|-------|-----|
| Inline object in JSX | `useMemo` or module-level constant |
| Inline function in JSX | `useCallback` |
| Object in dependency array | Memoize or use primitives |
| Array transform in render | `useMemo` the result |
| Cache key is object | Use string/primitive key |

## Real-World Impact

| Fix | Re-renders | Performance |
|-----|-----------|-------------|
| Memoize config objects | -80% | +200ms saved |
| useCallback handlers | -50% | +100ms saved |
| Stable SWR keys | Cache hits | -500ms API wait |
| Primitive deps | Correct behavior | Bugs fixed |
