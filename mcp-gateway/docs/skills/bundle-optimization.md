---
name: bundle-optimization
description: Bundle size optimization skill for identifying and fixing JavaScript bundle bloat. Use when auditing bundle size, finding barrel file imports, optimizing tree-shaking, reducing initial load time, or reviewing import statements. Triggers on large bundles, slow page loads, and import anti-patterns.
---

# Bundle Optimization

Identify and fix patterns that bloat JavaScript bundles.

## Core Problem: Barrel Files

Barrel files (`index.ts` that re-exports everything) break tree-shaking:

```typescript
// ❌ BAD - Imports entire library (500KB)
import { Button } from '@/components';
// This loads ALL components, not just Button

// ✅ GOOD - Direct import (5KB)
import { Button } from '@/components/Button';
```

## Detection Patterns

### Pattern 1: Barrel Imports
```typescript
// ❌ Flag these
import { X } from './components';
import { Y } from '@/lib';
import { Z } from '../utils';

// ✅ Direct imports
import { X } from './components/X';
import { Y } from '@/lib/Y';
import { Z } from '../utils/Z';
```

### Pattern 2: Namespace Imports
```typescript
// ❌ Imports everything
import * as utils from './utils';
utils.formatDate(date);

// ✅ Named import
import { formatDate } from './utils/formatDate';
```

### Pattern 3: Large Library Imports
```typescript
// ❌ Entire lodash (70KB)
import _ from 'lodash';
_.debounce(fn, 300);

// ✅ Single function (2KB)
import debounce from 'lodash/debounce';
```

## Common Offenders

| Library | Bad Import | Good Import | Savings |
|---------|-----------|-------------|---------|
| lodash | `import _` | `import X from 'lodash/X'` | ~68KB |
| date-fns | `import * as fns` | `import { format }` | ~50KB |
| @mui/material | `import { Button }` | `import Button from '@mui/material/Button'` | ~100KB |
| @mui/icons | `import { Icon }` | `import Icon from '@mui/icons-material/Icon'` | ~200KB |

## Next.js Specific

### Dynamic Imports for Code Splitting
```typescript
// ❌ Static import - included in main bundle
import HeavyComponent from './HeavyComponent';

// ✅ Dynamic import - separate chunk
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false // if client-only
});
```

### Route-Based Splitting
```typescript
// Next.js App Router automatically code-splits by route
// Each page.tsx becomes its own chunk

// For shared components that are heavy:
'use client';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('./Chart'), { ssr: false });
```

## Audit Commands

```bash
# Analyze bundle
npx @next/bundle-analyzer

# Find large dependencies
npx source-map-explorer .next/static/chunks/*.js

# Check import cost in VS Code
# Install "Import Cost" extension
```

## Audit Checklist

- [ ] Are there imports from barrel files (index.ts)?
- [ ] Are there `import *` namespace imports?
- [ ] Are large libraries imported entirely?
- [ ] Are heavy components dynamically imported?
- [ ] Is the initial bundle under 200KB?

## Real-World Impact

| Fix | Bundle Reduction | Load Time |
|-----|-----------------|-----------|
| Direct imports | -30% | -500ms |
| lodash tree-shake | -68KB | -200ms |
| Dynamic imports | -50% initial | -1s FCP |
| Icon optimization | -200KB | -400ms |

## Configuration

### next.config.js
```javascript
module.exports = {
  modularizeImports: {
    'lodash': {
      transform: 'lodash/{{member}}'
    },
    '@mui/material': {
      transform: '@mui/material/{{member}}'
    },
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}'
    }
  }
};
```
