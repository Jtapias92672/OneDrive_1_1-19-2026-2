---
name: architectural-entropy-detector
description: Architectural governance skill for detecting accumulating technical debt and "reasonable" local decisions that create systemic failures. Use when auditing codebases for drift, reviewing PRs for hidden global costs, preventing architectural rot, or enforcing consistency. Triggers on pattern violations, inconsistent implementations, and accumulating complexity.
---

# Architectural Entropy Detector

Detect and prevent the accumulation of "reasonable" local decisions that cause systemic failures.

## Core Insight

> "Performance issues are rarely technical; they are entropy problems."
> — Shuding (Vercel)

Technical debt accumulates through thousands of tiny, defensible changes that no single human saw adding up to a mess.

## The Pattern

```
Day 1: "Just add a global event listener here" (reasonable)
Day 30: "We need another listener for this feature" (reasonable)
Day 100: 47 global listeners, app is slow (disaster)
```

Each decision was locally reasonable. The global cost was invisible.

## Detection Categories

### 1. Global State Accumulation
```typescript
// ❌ Flag: Multiple global stores emerging
// store/userStore.ts
// store/cartStore.ts
// store/uiStore.ts
// store/notificationStore.ts
// store/featureFlags.ts
// store/analyticsStore.ts
// ... 15 more stores

// Ask: Is this intentional architecture or accumulated drift?
```

### 2. Event Listener Proliferation
```typescript
// ❌ Flag: Multiple components adding same listener
// Component A
window.addEventListener('resize', handleResizeA);
// Component B
window.addEventListener('resize', handleResizeB);
// Component C
window.addEventListener('resize', handleResizeC);

// Fix: Single listener with event bus
```

### 3. API Endpoint Sprawl
```typescript
// ❌ Flag: Similar endpoints with slight variations
GET /api/users
GET /api/users/active
GET /api/users/with-posts
GET /api/users/with-comments
GET /api/users/full
GET /api/users/minimal

// Ask: Should this be query parameters?
GET /api/users?include=posts,comments&status=active
```

### 4. Component Variants
```typescript
// ❌ Flag: Similar components with slight differences
Button.tsx
ButtonPrimary.tsx
ButtonSecondary.tsx
ButtonWithIcon.tsx
ButtonSmall.tsx
ButtonLarge.tsx
SubmitButton.tsx

// Fix: Single configurable component
<Button variant="primary" size="large" icon={<Icon />} />
```

### 5. Utility Function Duplication
```typescript
// ❌ Flag: Similar functions across codebase
// utils/formatDate.ts
// helpers/dateFormatter.ts
// lib/dates.ts
// components/DateDisplay/format.ts

// All doing slightly different date formatting
```

## Audit Protocol

### Step 1: Inventory
```bash
# Count similar patterns
find . -name "*.ts" | xargs grep -l "addEventListener" | wc -l
find . -name "*.ts" | xargs grep -l "useState" | wc -l
find . -name "*Store.ts" | wc -l
find . -name "*Button*.tsx" | wc -l
```

### Step 2: Timeline
```bash
# When did this pattern emerge?
git log --oneline --all -- "**/store/*.ts" | head -20
git log --oneline --all -S "addEventListener" | head -20
```

### Step 3: Ownership
```bash
# Who added each instance?
git blame src/stores/ | cut -d'(' -f2 | cut -d' ' -f1 | sort | uniq -c
```

## Entropy Indicators

| Indicator | Threshold | Action |
|-----------|-----------|--------|
| Global stores | > 5 | Review architecture |
| Event listeners | > 10 | Consolidate |
| Similar components | > 3 variants | Unify |
| API endpoints | > 20 | Rationalize |
| Utility files | > 10 | Consolidate |

## Prevention Rules

### PR Review Checklist
- [ ] Does this add a new global pattern?
- [ ] Is there an existing similar implementation?
- [ ] What's the 100-instance future of this decision?
- [ ] Does this follow established conventions?

### Architectural Decision Record (ADR)
When adding new patterns, document:
1. Why this pattern?
2. When to use it?
3. When NOT to use it?
4. Maximum instances expected?

## The "100x Test"

Before approving any pattern, ask:
> "If 100 developers each add one instance of this pattern, what happens?"

- 100 global listeners → App crashes
- 100 utility files → Unmaintainable
- 100 button variants → Design chaos
- 100 API endpoints → API spaghetti

## Recovery Protocol

When entropy is detected:
1. **Inventory:** Count all instances
2. **Categorize:** Group by purpose
3. **Unify:** Design single solution
4. **Migrate:** Move all instances
5. **Prevent:** Add lint rules

```bash
# Example: Consolidate date utilities
git mv utils/formatDate.ts lib/dates/
git mv helpers/dateFormatter.ts lib/dates/
# Create single unified API
# Add eslint rule to prevent new date utils
```
