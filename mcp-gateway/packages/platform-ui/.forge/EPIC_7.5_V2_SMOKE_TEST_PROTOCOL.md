# Epic 7.5 V2: Enhanced Smoke Test Protocol

**Version:** 2.0
**Date:** 2026-01-30
**Purpose:** Prevent critical integration bugs by testing all code paths
**Origin:** Depth parameter bug (e189f7b) - unit tests passed, Figma integration broken

---

## Executive Summary

**Problem:** Unit tests with mocks can give false confidence while critical integration paths remain untested.

**Solution:** 3-tier test strategy ensuring all code paths are validated:
1. **Unit Tests** (fast, mocks) - Test isolated logic
2. **Integration Tests** (real APIs) - Test external integrations ← PREVIOUSLY MISSING
3. **E2E Tests** (full flow) - Test complete user journey

---

## Test Pyramid

```
       /\
      /  \     E2E Tests (Manual)
     /____\    - Full user workflow
    /      \   - Real environment
   /________\  - Slow, high-value

     /\
    /  \       Integration Tests (Automated)
   /____\      - Real API calls
  /      \     - Real tokens/credentials
 /________\    - Medium speed, catch integration bugs ← NEW TIER

    /\
   /  \        Unit Tests (Automated)
  /____\       - Mocks, fast
 /______\      - Pure logic
/__________\   - Fast, catch logic bugs
```

---

## Phase 1: Unit Tests (Existing)

**Goal:** Verify isolated logic works correctly
**Speed:** Fast (<10s for full suite)
**Dependencies:** None (mocks only)

### Test Files
- `tests/smoke/poc-pipeline.smoke.test.ts`
- `tests/smoke/figma-html-pipeline.smoke.test.ts`

### What They Test
✅ HTML parsing logic
✅ Component tree rendering
✅ Memory management
✅ Nested children handling (with HTML)
✅ Multiple siblings handling

### What They DON'T Test
❌ Figma API integration
❌ API parameters (depth, version, etc.)
❌ Real file processing
❌ Network error handling

### Run Command
```bash
npm test -- --testPathPattern=smoke/poc-pipeline
npm test -- --testPathPattern=smoke/figma-html-pipeline
```

### Success Criteria
- All tests pass
- No memory leaks
- Performance < baseline

---

## Phase 2: Integration Tests (NEW - MANDATORY)

**Goal:** Verify external integrations work with real APIs
**Speed:** Medium (30s-2min)
**Dependencies:** Real credentials, network access

### Test File
- `tests/smoke/figma-api-integration.smoke.test.ts` ← NEW

### What They Test
✅ **Figma API calls with real tokens**
✅ **Depth parameter is included**
✅ **Nested children are fetched**
✅ **API response structure matches expectations**
✅ **Component count > 0 (not empty)**

### Prerequisites
```bash
# Required environment variables
export FIGMA_TOKEN="figd_..."  # Real Figma token
export TEST_FIGMA_URL="https://www.figma.com/design/..."  # Test file URL

# Verify token works
curl -H "X-Figma-Token: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/files/6GefaVgI8xnuDIHhSbfzsJ?depth=5"
```

### Run Command
```bash
npm test -- --testPathPattern=smoke/figma-api-integration
```

### Success Criteria
- ✅ All tests pass
- ✅ Components fetched > 0
- ✅ Nested children present
- ✅ Text/Button components found (depth validation)

### Skip Behavior
Tests automatically skip if:
- No FIGMA_TOKEN set
- Token is placeholder ("mock-token", "your-figma-token-here")
- Network unavailable

**Warning logged:** `⚠️  Skipping Figma integration tests - no real FIGMA_TOKEN`

---

## Phase 3: End-to-End Tests (Manual)

**Goal:** Verify complete user workflow in real environment
**Speed:** Slow (2-5 minutes)
**Dependencies:** Full stack running

### Test Procedure

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to generation UI:**
   http://localhost:3000/dashboard/generation

3. **Clear previous state:**
   ```javascript
   // In browser console
   localStorage.removeItem('forge-poc-conversation')
   location.reload()
   ```

4. **Run generation flow:**
   - Select "Figma Design"
   - Paste test URL: `https://www.figma.com/design/6GefaVgI8xnuDIHhSbfzsJ/POC_Test_Design?node-id=0-1`
   - Select options: Components, Tests, Stories, API, HTML
   - Click "Generate"

5. **Verify output:**
   - ✅ Progress shows real stages (not stuck at 0%)
   - ✅ Components generated (count > 50 for test file)
   - ✅ HTML files present (9 expected)
   - ✅ Tests generated
   - ✅ "View Files" button appears

### Success Criteria
- No freezing at "Initializing... 0%"
- Component count matches expected (100+ for test file)
- All selected output types generated
- No error messages in console

---

## Pre-flight Checks (Automated)

**Added in:** e189f7b + orchestrator updates
**Location:** `src/lib/poc/orchestrator.ts:195-213`

### Warning 1: No Components Fetched
```
⚠️  [PREFLIGHT] No components fetched from source
⚠️  [PREFLIGHT] Possible causes:
    - Figma file is empty (no UI elements)
    - API depth parameter missing (check orchestrator.getFigmaFile)
    - File permissions issue
```

**Triggers when:** `components.length === 0`

### Warning 2: No Nested Children
```
⚠️  [PREFLIGHT] No nested children found - possible depth parameter issue
    Top-level components: 7, Total nodes: 7
    Expected: totalNodes > topLevel for real Figma files
```

**Triggers when:** `totalNodes === components.length && input.figmaUrl`

**Indicates:** Depth parameter missing or too low

---

## Regression Prevention

### For Developers

**Before committing code that touches Figma integration:**

1. ✅ Run unit tests: `npm test -- smoke/poc-pipeline`
2. ✅ Run integration tests: `npm test -- smoke/figma-api-integration`
3. ✅ Check logs for preflight warnings
4. ✅ Verify component count > 0
5. ✅ Run manual E2E test with real URL

### For CI/CD

**Pipeline stages:**

```yaml
test-unit:
  - npm test -- --testPathPattern="smoke/(poc-pipeline|figma-html-pipeline)"
  # Fast, no external deps

test-integration:
  - npm test -- --testPathPattern="smoke/figma-api-integration"
  env:
    FIGMA_TOKEN: ${{ secrets.FIGMA_TEST_TOKEN }}
    TEST_FIGMA_URL: ${{ secrets.TEST_FIGMA_URL }}
  # Requires secrets, tests real API

test-e2e:
  - npm run dev &
  - npx playwright test
  # Full stack, browser automation
```

**Failure handling:**
- Unit test failure: Block merge
- Integration test failure: Block merge (critical)
- E2E test failure: Block deploy

---

## What Each Tier Catches

### Unit Tests Catch
- Logic errors (wrong conditions, bad math)
- Null/undefined handling
- Type errors
- Memory leaks in isolated functions

### Integration Tests Catch
- **Missing API parameters** ← Caught depth bug
- Wrong API endpoints
- Authentication failures
- Response parsing errors
- Network error handling

### E2E Tests Catch
- UI bugs
- State management issues
- User workflow problems
- Browser compatibility
- Performance issues

---

## Historical Context

### The Depth Bug (2026-01-30)

**Bug:** Missing `depth` parameter in Figma API calls
**Commit:** e189f7b
**Impact:** ALL Figma files appeared empty (0 components)

**Why unit tests missed it:**
- Tests used `htmlContent: '<div>...'` (not Figma URL)
- Never called `orchestrator.run({ figmaUrl: '...' })`
- Integration path completely untested

**What caught it:**
- Manual testing with user's actual URL
- Epic 7.5 v2 investigation with real API calls
- Gap analysis revealing missing integration tier

**Lesson:**
> Green tests ≠ Working code
> Must test ALL code paths, not just the ones we mocked

---

## Quick Reference

### Daily Development
```bash
# Before committing
npm test -- smoke/poc-pipeline          # Fast unit tests
npm test -- smoke/figma-api-integration # Real API tests
```

### Investigating Bugs
```bash
# 1. Run all smoke tests
npm test -- --testPathPattern=smoke

# 2. Check for preflight warnings in logs
grep "PREFLIGHT" /tmp/dev-server.log

# 3. Manual test with real URL
npm run dev
# Open browser, run generation flow

# 4. Manual API test
curl -H "X-Figma-Token: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/files/$FILE_KEY?depth=10"
```

### Debugging Failed Integration Tests
```bash
# Verify token
echo $FIGMA_TOKEN

# Test API access
curl -H "X-Figma-Token: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/files/6GefaVgI8xnuDIHhSbfzsJ"

# Check depth parameter response
curl -H "X-Figma-Token: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/files/6GefaVgI8xnuDIHhSbfzsJ?depth=10" \
  | jq '.document.children[0].children[0].children | length'
```

---

## Maintenance

### When to Update This Protocol

- New external integration added (add integration tests)
- New API endpoint used (add integration test)
- Critical bug found that tests missed (add regression test)
- User workflow changes (update E2E tests)

### Test File Locations

```
tests/
├── smoke/
│   ├── poc-pipeline.smoke.test.ts           # Unit tests (HTML path)
│   ├── figma-html-pipeline.smoke.test.ts    # Unit tests (parser logic)
│   └── figma-api-integration.smoke.test.ts  # Integration tests (real API) ← NEW
├── unit/
│   └── ... (generator unit tests)
└── integration/
    └── ... (future integration tests)
```

---

## Success Metrics

### Coverage Goals

**NOT measured by percentage!** Measured by capabilities proven:

✅ **Unit Tests:**
- HTML parser handles all node types
- Component tree rendering preserves hierarchy
- Memory scales linearly with component count

✅ **Integration Tests:**
- Figma API authentication works
- Depth parameter included in calls
- Nested children fetched successfully
- Real files process without errors

✅ **E2E Tests:**
- Users can generate from Figma URL
- All output types appear
- No freezing or crashes

### Red Flags

🚩 Integration tests skipped (no token)
🚩 Component count = 0 in any test
🚩 Preflight warnings in logs
🚩 Manual E2E test fails
🚩 User reports "no files generated"

---

## Contact

**Questions:** See `.forge/LESSONS_LEARNED.md`
**Bug Reports:** Include test tier that failed (unit/integration/e2e)
**Protocol Updates:** Commit with "Epic 7.5 v2" in message

---

**Last Updated:** 2026-01-30
**Next Review:** After next major integration addition
