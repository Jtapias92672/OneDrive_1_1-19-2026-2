---
name: contract-validation
description: API contract validation skill for detecting frontend/backend mismatches before runtime. Use when reviewing API integrations, debugging "tests pass but feature broken" scenarios, auditing data flow contracts, or enforcing type consistency across service boundaries. Triggers on API route changes, type definition updates, and hook/component data consumption patterns.
---

# Contract Validation

Detect and prevent frontend/backend contract mismatches that cause "tests pass but feature broken" scenarios.

## Core Insight

> "180 tests passed, but the user couldn't use the feature."

The most dangerous bugs hide in the gaps between systems that both have passing tests.

## The Pattern

```
Frontend Type:
interface POCRunResult {
  htmlFiles: FileContent[];  // Expected
}

Backend Response:
{
  html_files: [...]  // Actually sent (snake_case)
}

Result: UI shows "No files found" while tests pass
```

Both sides are "correct" in isolation. The contract is broken.

## Detection Categories

### 1. Response Shape Mismatches
```typescript
// ❌ Flag: Type expects one shape, API returns another

// Frontend expects:
interface User {
  id: string;
  fullName: string;
  createdAt: Date;
}

// Backend returns:
{
  "id": 123,              // number vs string
  "full_name": "John",    // snake_case vs camelCase
  "created_at": "2024-01-01"  // string vs Date
}
```

### 2. Optional vs Required Fields
```typescript
// ❌ Flag: Frontend assumes required, backend sends optional

// Frontend code (assumes htmlFiles always exists):
result.htmlFiles.map(file => ...)  // Crashes if undefined

// Backend may return:
{ frontendComponents: [...] }  // htmlFiles omitted when empty
```

### 3. Array vs Object Confusion
```typescript
// ❌ Flag: Type mismatch in collection handling

// API returns single item when one result:
{ "user": { "name": "John" } }

// API returns array when multiple:
{ "users": [{ "name": "John" }, { "name": "Jane" }] }

// Frontend expects consistent array:
users.map(...)  // Fails on single-item response
```

### 4. Nested Path Mismatches
```typescript
// ❌ Flag: Different nesting levels

// Frontend expects:
response.data.results.items

// Backend returns:
response.results  // Missing intermediate levels
```

### 5. Enum/Status Value Drift
```typescript
// ❌ Flag: Status values don't match

// Frontend enum:
type Status = 'pending' | 'active' | 'completed';

// Backend sends:
{ status: 'PENDING' }  // Uppercase
{ status: 'in_progress' }  // Different value entirely
```

## Audit Protocol

### Step 1: Map the Contract
```bash
# Find all API route handlers
find . -path "*/api/*" -name "route.ts" | head -20

# Find all fetch/API calls in frontend
grep -r "fetch\|axios\|useSWR" --include="*.ts" --include="*.tsx" src/ | head -20

# Find shared type definitions
find . -name "types.ts" -o -name "*.types.ts" | head -20
```

### Step 2: Extract Response Shapes
```bash
# Check what API actually returns
grep -A 20 "return.*Response\|res.json\|NextResponse" src/app/api/**/*.ts | head -50

# Check what frontend expects
grep -B 5 -A 10 "interface.*Result\|type.*Response" src/**/*.ts | head -50
```

### Step 3: Verify Field Alignment
```typescript
// Create contract test
describe('API Contract', () => {
  it('matches frontend type expectations', async () => {
    const response = await fetch('/api/poc/results/test-id');
    const data = await response.json();

    // Verify required fields exist
    expect(data).toHaveProperty('htmlFiles');
    expect(Array.isArray(data.htmlFiles)).toBe(true);

    // Verify field types
    if (data.htmlFiles.length > 0) {
      expect(typeof data.htmlFiles[0].name).toBe('string');
      expect(typeof data.htmlFiles[0].content).toBe('string');
    }
  });
});
```

## Contract Validation Checklist

| Check | Question | Fix |
|-------|----------|-----|
| Field Names | camelCase vs snake_case? | Standardize or transform |
| Field Types | string vs number? Date vs string? | Add type coercion |
| Required Fields | Does backend always send it? | Add defaults or optionals |
| Array Consistency | Always array or sometimes object? | Normalize response |
| Null Handling | null vs undefined vs missing? | Define null strategy |
| Error Shape | Same structure for all errors? | Standardize error format |

## Data Flow Tracing

```
┌─────────────────┐
│   API Route     │  Returns: { htmlFiles: [...] }
│   route.ts      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Hook/Fetch    │  Parses: data.htmlFiles
│   useData.ts    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Component     │  Renders: result.htmlFiles.map(...)
│   Display.tsx   │
└─────────────────┘

VERIFY EACH LINK:
- [ ] API returns correct field name?
- [ ] Hook extracts correct field?
- [ ] Component accesses correct property?
```

## Common Contract Bugs

### The "Works Locally" Bug
```typescript
// Dev API returns full data
{ htmlFiles: [...], reactFiles: [...] }

// Prod API returns minimal data
{ htmlFiles: [] }  // Empty because different config

// Fix: Contract test that runs against prod-like data
```

### The "Cached Schema" Bug
```typescript
// Old cached response:
{ frontendComponents: [...] }  // Old field name

// New API response:
{ reactComponents: [...] }  // Renamed field

// Frontend still expects old name
// Fix: Clear cache, add version header
```

### The "Silent Failure" Bug
```typescript
// API returns error as success
{ success: true, data: null }

// Frontend assumes data exists
data.items.map(...)  // Crashes

// Fix: Validate response shape before use
```

## Prevention Rules

### 1. Shared Type Definitions
```typescript
// packages/shared/types/api.ts
export interface POCRunResult {
  htmlFiles: FileContent[];
  reactFiles: FileContent[];
  backendFiles: FileContent[];
}

// Used by both frontend AND backend
```

### 2. Runtime Validation
```typescript
import { z } from 'zod';

const POCRunResultSchema = z.object({
  htmlFiles: z.array(FileContentSchema),
  reactFiles: z.array(FileContentSchema),
  backendFiles: z.array(FileContentSchema),
});

// Validate API response
const result = POCRunResultSchema.parse(apiResponse);
```

### 3. Contract Tests
```typescript
// Run against real API, not mocks
describe('Contract: /api/poc/results/[runId]', () => {
  it('returns expected shape', async () => {
    const res = await fetch(`${API_URL}/api/poc/results/test-run`);
    const data = await res.json();

    expect(data).toMatchObject({
      htmlFiles: expect.any(Array),
      reactFiles: expect.any(Array),
    });
  });
});
```

## The "Chain of Trust" Test

Before claiming a feature works:

```
1. API test passes           ✅ (unit test)
2. Component test passes     ✅ (unit test)
3. Contract test passes      ❓ (integration test)
4. E2E test passes           ❓ (system test)
5. User can use feature      ❓ (acceptance test)

If #1-2 pass but #5 fails → Contract is broken
```

## Recovery Protocol

When contract mismatch detected:

1. **Identify the Gap**
   ```bash
   # Add logging at each layer
   console.log('[API] Returning:', JSON.stringify(result));
   console.log('[Hook] Received:', JSON.stringify(data));
   console.log('[Component] Rendering:', JSON.stringify(props));
   ```

2. **Find the Divergence Point**
   - Where does actual data differ from expected?
   - Is it field name, type, or structure?

3. **Fix at the Source**
   - Don't add workarounds in multiple places
   - Fix the contract at the API level
   - Update types to match reality

4. **Add Contract Test**
   - Prevent regression
   - Test against real API response

## The Golden Rule

> "If tests pass but users can't use the feature, the contract is broken."

Never trust unit tests alone. Validate the full data flow from API to UI.
