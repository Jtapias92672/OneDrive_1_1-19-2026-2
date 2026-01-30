# MORNING START — 2026-01-29

Execute the Morning Start Protocol from CLAUDE.md, then debug HTML Generation with archaeology-first approach.

---

## PHASE 0: MORNING START PROTOCOL [Turn 0]

```
=== SESSION START ===
Turn: 0
Date: 2026-01-29

PREFLIGHT CHECKLIST:
1. cat TICKET.md                    # What was left from last session
2. cat CLAUDE.md | head -100        # Load protocols
3. git status                       # Check uncommitted work
4. npm test 2>&1 | tail -10         # Verify baseline

CONFIRM:
- [ ] Philosophy loaded (capabilities over metrics)
- [ ] 10-turn rule acknowledged
- [ ] First question: "What capabilities must work?"

Today's priorities:
1. FIX HTML GENERATION (URGENT - User can't use feature despite 180 tests passing)
2. Add archaeology step to understand WHY decisions were made
3. Epic 15 EC2 (ONLY if #1 verified working by user)

Report: Protocols loaded, ready for task
```

---

## PHASE 1: ARCHAEOLOGY (Understand the WHY) [Turn 1]

**CRITICAL INSIGHT:** Previous debug attempts failed because they focused on the "what" (code) not the "why" (history).

> "AI sees the code (the 'what') but lacks the history (the 'why')."

### 1.1 Trace the History of Changes
```bash
# Find when the folder structure changed
git log --oneline --since="2026-01-27" -- packages/platform-ui/src/lib/poc/ | head -10

# Find when frontend/ was renamed to react/
git log --oneline -p --all -S 'frontend/' -- packages/platform-ui/src/lib/poc/orchestrator.ts | head -30

# Find when htmlFiles was added to the API
git log --oneline --since="2026-01-27" -- "packages/platform-ui/src/app/api/poc/results/*/route.ts" | head -10
```

### 1.2 Answer These Questions Before Coding
```
ARCHAEOLOGY CHECKLIST:
- [ ] WHY was frontend/ renamed to react/? (commit hash: ___)
- [ ] WHEN did htmlFiles get added to POCRunResult? (commit hash: ___)
- [ ] WHICH commit introduced the API route changes? (commit hash: ___)
- [ ] WHERE is the mismatch? (API expects ___, files are in ___)
```

### 1.3 Map the Data Flow Contract
```
EXPECTED DATA FLOW:
1. orchestrator.ts generateHTML() → writes to generated/[runId]/html/
2. route.ts loadFilesWithContent() → reads from generated/[runId]/html/
3. useConversation.ts → receives { htmlFiles: [...] }
4. FileViewer.tsx → renders result.htmlFiles

VERIFY EACH LINK:
- [ ] Step 1→2: Folder names match exactly?
- [ ] Step 2→3: API response includes htmlFiles?
- [ ] Step 3→4: Hook passes htmlFiles to component?
```

---

## PHASE 2: VERIFY FILES EXIST [Turn 2]

```bash
cd packages/platform-ui

# Find latest run
RUNID=$(ls -t generated/ 2>/dev/null | head -1)
echo "Latest Run ID: $RUNID"

# Check all three folders
echo "=== HTML ===" && ls generated/$RUNID/html/ 2>/dev/null | head -5
echo "=== REACT ===" && ls generated/$RUNID/react/ 2>/dev/null | head -5
echo "=== BACKEND ===" && ls generated/$RUNID/backend/ 2>/dev/null | head -5

# Count files
echo "HTML count:" && ls generated/$RUNID/html/ 2>/dev/null | wc -l
echo "React count:" && ls generated/$RUNID/react/ 2>/dev/null | wc -l
echo "Backend count:" && ls generated/$RUNID/backend/ 2>/dev/null | wc -l
```

**Report format:**
```
[Turn 2] Files on Disk:
- HTML: X files in generated/[runId]/html/
- React: X files in generated/[runId]/react/
- Backend: X files in generated/[runId]/backend/
```

---

## PHASE 3: TEST API DIRECTLY [Turn 3]

```bash
cd packages/platform-ui

# Start dev server if not running
npm run dev &
sleep 5

# Test API endpoint directly
RUNID=$(ls -t generated/ 2>/dev/null | head -1)
echo "Testing API for run: $RUNID"

# Check what API returns
curl -s "http://localhost:3000/api/poc/results/$RUNID" | head -100

# Specifically check htmlFiles
curl -s "http://localhost:3000/api/poc/results/$RUNID" | grep -o '"htmlFiles":\[[^]]*\]' | head -1

# Check frontendComponents
curl -s "http://localhost:3000/api/poc/results/$RUNID" | grep -o '"frontendComponents":\[[^]]*\]' | head -1
```

**If API returns empty htmlFiles:** Problem is in route.ts
**If API returns htmlFiles but UI empty:** Problem is in useConversation or FileViewer

---

## PHASE 4: TRACE DATA FLOW [Turns 4-5]

### 4a. Check Route Implementation
```bash
cat src/app/api/poc/results/\[runId\]/route.ts | head -100
```

**Verify:**
- [ ] Reads from correct path (html/, react/, backend/)
- [ ] Returns htmlFiles in response JSON
- [ ] loadFilesWithContent() function exists and works

### 4b. Check useConversation Hook
```bash
grep -A 30 "htmlFiles" src/app/dashboard/forge-cowork/hooks/useConversation.ts
```

**Verify:**
- [ ] Fetches from correct API endpoint
- [ ] Parses htmlFiles from response
- [ ] Returns htmlFiles in result object

### 4c. Check FileViewer Component
```bash
cat src/app/dashboard/forge-cowork/components/ConversationalPOC/FileViewer.tsx | head -120
```

**Verify:**
- [ ] Receives result prop with htmlFiles
- [ ] Correctly maps over htmlFiles array
- [ ] No conditional hiding files

---

## PHASE 5: ADD DIAGNOSTIC LOGGING [Turn 6]

**Add these console.log statements:**

**File 1: route.ts** (API Route)
```typescript
// After loading files
console.log('[API] loadFilesWithContent results:', {
  htmlCount: htmlFiles?.length || 0,
  reactCount: reactFiles?.length || 0,
  backendCount: backendFiles?.length || 0
});
```

**File 2: useConversation.ts** (Hook)
```typescript
// After API fetch
console.log('[useConversation] API response:', {
  hasHtmlFiles: !!data?.htmlFiles,
  htmlCount: data?.htmlFiles?.length || 0
});
```

**File 3: FileViewer.tsx** (Component)
```typescript
// At component render
console.log('[FileViewer] Received:', {
  hasResult: !!result,
  htmlFiles: result?.htmlFiles?.length || 0,
  frontendComponents: result?.frontendComponents?.length || 0
});
```

---

## PHASE 6: BROWSER VERIFICATION [Turn 7]

1. Open http://localhost:3000/dashboard/forge-cowork
2. Open DevTools → Console (clear it first)
3. Open DevTools → Network tab
4. Click "View Files" on an existing generation
5. **Screenshot the console output**
6. **Screenshot the Network response**

**Report:**
```
[Turn 7] Browser Verification:
Console shows:
- [API] htmlCount: ___
- [useConversation] htmlCount: ___
- [FileViewer] htmlFiles: ___

Network response htmlFiles length: ___
Broken link in chain: [route → hook → component]
```

---

## PHASE 7: FIX THE BROKEN LINK [Turns 8-9]

Based on diagnostic output, fix ONLY the broken link:

| Symptom | Root Cause | Fix |
|---------|------------|-----|
| API returns 0 htmlFiles | Path mismatch in route.ts | Fix folder path |
| API OK but hook returns 0 | Response parsing error | Fix useConversation |
| Hook OK but FileViewer empty | Render condition | Fix FileViewer JSX |
| All logs show data but UI empty | CSS/visibility issue | Check CSS display |

**FIX FORMAT:**
```
=== FIX APPLIED ===
File: [path]
Change: [description]
Reason: [why this fixes the broken link]
Commit: [do not commit until user verifies]
```

---

## PHASE 8: USER VERIFICATION [Turn 10]

**DO NOT CLAIM SUCCESS UNTIL USER CONFIRMS**

Ask user:
```
Please test:
1. Go to http://localhost:3000/dashboard/forge-cowork
2. Click "View Files" on a generation
3. Do you see HTML files in the FileViewer?
4. Can you expand folders and see file contents?

Reply with: "It works" or "Still broken"
```

**Only if user says "It works":**
```
=== SESSION END ===
Turns: 10
Status: HTML GENERATION FIXED ✅
User Verification: CONFIRMED

Commit message:
fix(poc): HTML generation display - user verified working

Next: Update TICKET.md, then proceed to Epic 15
```

---

## RULES (NON-NEGOTIABLE)

1. **ARCHAEOLOGY FIRST** - Understand WHY before changing WHAT
2. **DO NOT iterate more than 3 times** without stopping to analyze
3. **DO NOT claim success** without user saying "It works"
4. **Track turns:** [Turn N/10]
5. **Output limits:** `| tail -20` on all commands

---

## STOP CONDITIONS

**STOP and report if:**
- 3 fix iterations without progress
- Root cause unclear after Phase 5
- Webpack crashes
- User not available to verify

**Do not iterate endlessly. Diagnose → Fix → Verify → STOP.**
