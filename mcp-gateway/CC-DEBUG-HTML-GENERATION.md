# DEBUG: HTML Generation Feature — BROKEN

**Priority:** URGENT
**Status:** 180 tests pass, user cannot use feature
**Objective:** Fix HTML Generation so files display in FileViewer

---

## RULES FOR THIS SESSION

1. **DO NOT claim success without user verification**
2. **DO NOT iterate more than 3 times without stopping to analyze**
3. **Track turns:** [Turn N/10]
4. **Output limits:** `| tail -20` on all commands

---

## PHASE 1: Verify Files Exist on Disk [Turn 1]

```bash
# Find the latest run
ls -lt packages/platform-ui/generated/ | head -5

# Check file counts in latest run (replace [runId] with actual)
RUNID=$(ls -t packages/platform-ui/generated/ | head -1)
echo "Run ID: $RUNID"
ls packages/platform-ui/generated/$RUNID/

# Count files in each folder
echo "HTML files:" && ls packages/platform-ui/generated/$RUNID/html/ 2>/dev/null | wc -l
echo "React files:" && ls packages/platform-ui/generated/$RUNID/react/ 2>/dev/null | wc -l
echo "Backend files:" && ls packages/platform-ui/generated/$RUNID/backend/ 2>/dev/null | wc -l
```

**Expected:** Files exist in html/, react/, backend/
**If files missing:** Problem is in generation, not display

---

## PHASE 2: Test API Directly [Turn 2]

```bash
# Start the dev server if not running
cd packages/platform-ui && npm run dev &

# Wait for server
sleep 5

# Test API endpoint directly (replace [runId])
RUNID=$(ls -t generated/ | head -1)
curl -s "http://localhost:3000/api/poc/results/$RUNID" | head -100

# Check specific fields
curl -s "http://localhost:3000/api/poc/results/$RUNID" | grep -o '"htmlFiles":\[[^]]*\]' | head -1
curl -s "http://localhost:3000/api/poc/results/$RUNID" | grep -o '"frontendComponents":\[[^]]*\]' | head -1
```

**Expected:** API returns htmlFiles array with file objects
**If htmlFiles empty/missing:** Problem is in API route

---

## PHASE 3: Trace the Data Flow [Turn 3-4]

### 3a. Check API Route Implementation
```bash
cat packages/platform-ui/src/app/api/poc/results/\[runId\]/route.ts | head -80
```

**Verify:**
- [ ] Route reads from correct folder paths (html/, react/, backend/)
- [ ] Returns `htmlFiles` in response
- [ ] `loadFilesWithContent()` function works

### 3b. Check FileViewer Component
```bash
cat packages/platform-ui/src/app/dashboard/forge-cowork/components/ConversationalPOC/FileViewer.tsx | head -100
```

**Verify:**
- [ ] Receives `result` prop with `htmlFiles`
- [ ] Maps over files correctly
- [ ] No conditional that hides files

### 3c. Check useConversation Hook
```bash
cat packages/platform-ui/src/app/dashboard/forge-cowork/hooks/useConversation.ts | grep -A 20 "htmlFiles"
```

**Verify:**
- [ ] `htmlFiles` is in the result state
- [ ] API response is parsed correctly

---

## PHASE 4: Add Diagnostic Logging [Turn 5]

Add console.log statements to trace the data:

**File 1: API Route** (`/api/poc/results/[runId]/route.ts`)
```typescript
// After loading files
console.log('[API] HTML files loaded:', htmlFiles?.length || 0);
console.log('[API] React files loaded:', reactFiles?.length || 0);
console.log('[API] Returning result with htmlFiles:', !!result.htmlFiles);
```

**File 2: FileViewer** (`FileViewer.tsx`)
```typescript
// At component start
console.log('[FileViewer] Received result:', {
  hasHtmlFiles: !!result?.htmlFiles,
  htmlCount: result?.htmlFiles?.length || 0,
  hasFrontend: !!result?.frontendComponents,
  frontendCount: result?.frontendComponents?.length || 0
});
```

**File 3: useConversation** (`useConversation.ts`)
```typescript
// After API fetch
console.log('[useConversation] API response:', {
  htmlFiles: data?.htmlFiles?.length || 0,
  frontendComponents: data?.frontendComponents?.length || 0
});
```

---

## PHASE 5: Test in Browser [Turn 6]

1. Open http://localhost:3000/dashboard/forge-cowork
2. Open DevTools → Console
3. Click "View Files" on an existing generation
4. Check console output for the logs above
5. Check Network tab for API response

**Report:**
```
[API] HTML files loaded: ___
[FileViewer] Received result: { hasHtmlFiles: ___, htmlCount: ___ }
Network response htmlFiles length: ___
```

---

## PHASE 6: Fix Based on Findings [Turn 7-8]

Based on diagnostic output, fix the broken link in the chain:

| Symptom | Root Cause | Fix |
|---------|------------|-----|
| API returns 0 htmlFiles | Wrong folder path | Fix path in route.ts |
| API returns files but FileViewer empty | State not updating | Fix useConversation |
| FileViewer receives data but shows nothing | Render condition wrong | Fix FileViewer JSX |
| Files don't exist on disk | Generation broken | Fix orchestrator.ts |

---

## PHASE 7: Verify Fix [Turn 9]

```bash
# Run the specific test
npm test -- --testPathPattern="poc" 2>&1 | tail -30

# Generate fresh data
# (Use UI to trigger new generation)

# Verify files created
ls -la packages/platform-ui/generated/[new-runId]/html/ | head -10
```

**Then ask user to verify in browser.**

---

## SUCCESS CRITERIA

**NOT Success:**
- "Tests pass"
- "Code looks correct"
- "Should work now"

**IS Success:**
- User clicks "View Files"
- FileViewer shows HTML files
- User can download files
- **User confirms: "It works"**

---

## STOP CONDITIONS

**STOP and report if:**
- 3 fix iterations without progress
- Root cause unclear after Phase 4
- Webpack crashes
- Tests start failing

**Do not iterate endlessly. Diagnose → Fix → Verify → Report.**

---

## OUTPUT FORMAT

After each phase, report:
```
[Turn N/10] Phase X Complete

Findings:
- [what you discovered]

Next:
- [what you'll do next]
```

After fix attempt:
```
=== FIX APPLIED ===
Change: [what changed]
File: [which file]
Reason: [why this fixes it]

Verification needed: [what user should test]
```
