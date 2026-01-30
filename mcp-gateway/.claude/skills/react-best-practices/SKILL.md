---
name: react-best-practices
description: Comprehensive React and Next.js performance optimization skill with 40+ rules across 8 categories. Use when auditing React codebases, fixing performance issues, optimizing bundle size, eliminating render waterfalls, implementing caching strategies, or reviewing React/Next.js code. Triggers on React performance, bundle optimization, useEffect cascades, re-render issues, SSR/SSG decisions.
---

# React Best Practices

Performance optimization guide for React and Next.js applications, encapsulating 10+ years of optimization patterns.

## When to Use

- Auditing React/Next.js codebases for performance issues
- Fixing bundle size problems
- Eliminating render waterfalls
- Optimizing re-renders
- Implementing proper caching
- Reviewing React code for best practices

## Audit Workflow

1. **Initial Scan**: Run codebase analysis to identify issues
2. **Prioritize**: Focus on CRITICAL issues first (bundle size, waterfalls)
3. **Fix Systematically**: Address one category at a time
4. **Verify**: Measure before/after impact

## Priority Categories (by Impact)

### CRITICAL: Eliminate Waterfalls

```typescript
// BAD: Sequential data fetching (waterfall)
useEffect(() => {
  fetchUser().then(user => {
    fetchOrders(user.id).then(orders => {
      fetchProducts(orders).then(setProducts);
    });
  });
}, []);

// GOOD: Parallel fetching with Promise.all
useEffect(() => {
  Promise.all([fetchUser(), fetchOrders(), fetchProducts()])
    .then(([user, orders, products]) => {
      setUser(user);
      setOrders(orders);
      setProducts(products);
    });
}, []);
```

### CRITICAL: Reduce Bundle Size

```typescript
// BAD: Importing entire library
import _ from 'lodash';
import moment from 'moment';

// GOOD: Import only what you need
import debounce from 'lodash/debounce';
import { format } from 'date-fns';

// GOOD: Dynamic imports for heavy components
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
});
```

### HIGH: Prevent Unnecessary Re-renders

```typescript
// BAD: Creating new objects/arrays in render
<Component style={{ margin: 10 }} items={[1, 2, 3]} />

// GOOD: Memoize stable references
const style = useMemo(() => ({ margin: 10 }), []);
const items = useMemo(() => [1, 2, 3], []);
<Component style={style} items={items} />

// GOOD: Use React.memo for pure components
const ExpensiveList = React.memo(({ items }) => (
  items.map(item => <Item key={item.id} {...item} />)
));
```

### HIGH: Optimize useEffect Dependencies

```typescript
// BAD: Missing dependencies cause stale closures
useEffect(() => {
  fetchData(userId); // userId not in deps!
}, []);

// BAD: Object/array in deps causes infinite loops
useEffect(() => {
  doSomething(config);
}, [config]); // config = {} recreated each render

// GOOD: Primitive deps or useMemo
const configKey = JSON.stringify(config);
useEffect(() => {
  doSomething(config);
}, [configKey]);
```

### MEDIUM: Server vs Client Components

```typescript
// GOOD: Default to Server Components
// app/products/page.tsx
export default async function ProductsPage() {
  const products = await db.products.findMany();
  return <ProductList products={products} />;
}

// GOOD: 'use client' only when needed
'use client';
export function AddToCartButton({ productId }) {
  const [isPending, startTransition] = useTransition();
  // Client interactivity required
}
```

### MEDIUM: Implement Proper Caching

```typescript
// GOOD: React Query / SWR for client caching
const { data, isLoading } = useSWR(`/api/user/${id}`, fetcher, {
  revalidateOnFocus: false,
  staleTime: 60000
});

// GOOD: Next.js fetch caching
const data = await fetch(url, {
  next: { revalidate: 3600 } // Cache for 1 hour
});
```

## Quick Reference Checklist

- [ ] No cascading useEffect calls (waterfalls)
- [ ] Dynamic imports for components >50KB
- [ ] Tree-shakeable imports (no `import *`)
- [ ] React.memo on expensive pure components
- [ ] useMemo/useCallback for stable references
- [ ] Correct useEffect dependency arrays
- [ ] Server Components by default (Next.js)
- [ ] Proper caching strategy implemented
- [ ] No inline object/array props
- [ ] Keys are stable and unique (not index)

## Common Anti-Patterns

| Anti-Pattern | Impact | Fix |
|--------------|--------|-----|
| `useEffect` cascade | Slow load | Parallel fetch |
| `import *` from libs | Large bundle | Named imports |
| Inline `style={{}}` | Re-renders | useMemo |
| `key={index}` | Broken updates | Unique IDs |
| Client-first thinking | Slow TTFB | Server Components |

## References

For detailed patterns, see `references/react-patterns.md`.
