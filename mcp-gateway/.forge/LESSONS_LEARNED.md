# FORGE Lessons Learned

Operational lessons captured from epic implementation. Reference before starting new epics.

---

## Epic 7.5: V&V Framework (2026-01-26)

### What Happened
- Token consumption: ~150K (1.9x larger than Epic 07)
- Session hit context compaction
- 50K tokens burned debugging js-yaml dependency issue
- Required separate verification session to confirm quality
- Found duplicate code requiring refactor (evaluateVerification/evaluateValidation)

### Root Causes
1. **Scope underestimated** — 4 phases should have been 2 sessions
2. **Missing dependency verification** — js-yaml was transitive, not direct
3. **Schema-heavy work is expensive** — 7 new schema files = high token cost
4. **No mid-session token checkpoints** — Hit compaction without warning

### Lessons

| Lesson | Rule | Application |
|--------|------|-------------|
| Split large epics | Stop at 60K tokens, evaluate | Schema-heavy or cross-cutting epics get 2 sessions |
| Verify dependencies first | `npm list <pkg>` before import | Add as Phase 0 for any epic using new packages |
| Schema epics cost 2x | Budget 150% of estimate | Multiply initial estimate by 1.5-2x for schema work |
| Self-verify after compaction | Fresh session, verification protocol | Any session hitting compaction needs quality audit |
| Track tokens per phase | Report after each phase | "Phase N complete. Tokens: X/Y (Z%)" |

### Prevention Checklist (Pre-Epic)

Before starting any epic:
- [ ] Estimate token budget (base estimate × complexity factor)
- [ ] Identify session split points if budget > 60K
- [ ] List external dependencies, verify with `npm list`
- [ ] Define verification criteria upfront
- [ ] Plan token checkpoints (report after each phase)

---

## Epic 07: Agent Orchestration (2026-01-26)

### What Went Well
- Clean execution in single session (~80K tokens)
- 4 lib files + 4 role files, no major debugging
- Integration tests passed on first run

### Lesson
Execution-layer epics (runtime code) are more predictable than policy-layer epics (schemas + validation).

---

## General Patterns

### High-Risk Epic Indicators
- 7+ new files
- Cross-cutting changes (touches lib + roles + schemas)
- External spec integration (mapping someone else's design)
- New package dependencies
- Policy-as-code (YAML/JSON schemas with validation)

### Token Budget Guidelines

| Epic Type | Base Budget | Risk Factor | Recommended Sessions |
|-----------|-------------|-------------|---------------------|
| Simple feature | 30K | 1.0x | 1 |
| Runtime/lib work | 60K | 1.2x | 1 |
| Schema-heavy | 80K | 1.5x | 1-2 |
| Cross-cutting | 100K | 2.0x | 2 |
| External spec integration | 120K | 2.0x | 2-3 |

### Recovery Protocol

If session hits compaction:
1. STOP implementation immediately
2. Commit current progress
3. Generate handoff summary
4. Fresh session for verification
5. Document in LESSONS_LEARNED.md

---

## Epic 7.5 v2: Figma-HTML Image Rendering (2026-01-29)

### What Happened
- **Task:** Fix Figma images not rendering in generated HTML
- **Duration:** ~4 hours, ~100 turns
- **Token consumption:** ~120K
- **Outcome:** ✅ Root cause identified via systematic analysis

### Root Causes
1. **Chased symptoms (20+ turns)** — "missing error components" message was React hydration failure, NOT missing files
2. **Port mismatch undetected** — JavaScript bundles 404'd (port 3000 vs 3003), caused blank center section
3. **Never validated fix** — Applied image enrichment code, assumed it worked, moved on
4. **HTML generation fallback** — `generateHTMLFile()` line 1283 bypasses `renderComponentTree()` when `original=undefined`

### Critical Mistakes

| Mistake | Impact | Turns Wasted |
|---------|--------|--------------|
| Didn't check browser Console FIRST | Created unnecessary error boundaries | 20 |
| Assumed build success = fix works | Original problem remained unsolved entire session | N/A |
| Reacted to symptom not cause | Created files that didn't fix anything | 15 |

### What Went Right
1. **User intervention** — "STOP and run Epic 7.5 v2" broke fixation loop
2. **Smoke tests** — Proved orchestrator logic was sound, narrowed search to Next.js app
3. **Plan Mode + 3 Explore agents** — Found root cause in 15 minutes via systematic exploration
4. **Hypothesis validation** — Systematically invalidated Options A, B, C with evidence

### Lessons

| Lesson | Rule | Application |
|--------|------|-------------|
| Browser Console is ground truth | Check Console FIRST before any code changes | All Next.js/React debugging |
| End-to-end validation mandatory | Build → RUN FEATURE → Inspect Output → Verify | After EVERY fix, not just build |
| Port mismatch symptoms | 404s on /_next/static/chunks → check port | Next.js dev server issues |
| Symptoms ≠ Root Cause | Error message may be diagnostic, not literal | Use evidence-based debugging |
| Plan Mode for stuck loops | If same action 3x → STOP → Plan Mode → Explore | When fixated on wrong path |

### Prevention Checklist (Next.js Debugging)

Before changing any code:
- [ ] Check browser Console (F12) for actual JavaScript errors
- [ ] Check Network tab for 404s or failed requests
- [ ] Identify error type: build/runtime/network/port
- [ ] THEN diagnose code based on evidence

After applying ANY fix:
- [ ] Build succeeds
- [ ] Tests pass
- [ ] **RUN actual feature in browser** ← MANDATORY
- [ ] Inspect output (HTML, Console logs)
- [ ] Take screenshot as proof
- [ ] ONLY THEN claim success

### Technical Findings

**Image Rendering Pipeline (Validated as Working):**
```
Figma API → FigmaParser → collectImageRefs → fetchImagesFromFigma →
enrichComponentsWithImageUrls → renderComponentTree → HTML
```

**Actual Problem:** HTML generation bypasses pipeline
```typescript
// orchestrator.ts:1283
${original ? this.renderComponentTree(original) : `<div>${component.name}</div>`}
// When original=undefined → plain text fallback
```

**Fix:** Use enriched `component` parameter:
```typescript
${this.renderComponentTree(component)}
```

### Token Budget Analysis

| Phase | Tokens | Notes |
|-------|--------|-------|
| Image fixes (wasted) | ~10K | Applied but never validated |
| Error boundaries (wasted) | ~30K | Chasing symptom not cause |
| Port mismatch diagnosis | ~10K | Trial and error |
| Plan Mode + Explore | ~15K | Systematic root cause analysis |
| Documentation | ~20K | This entry + plan file |
| **Total** | ~120K | 40K wasted on wrong path |

**Lesson:** 33% of tokens wasted by not checking browser Console first

### Updated Recovery Protocol

When stuck (same action 3+ times):
1. STOP current approach
2. Run smoke tests to validate core logic
3. Enter Plan Mode
4. Launch Explore agents (max 3 parallel)
5. Systematic hypothesis validation
6. Document findings before implementing

### Related Documentation
- Plan file: `.claude/plans/noble-toasting-boole.md`
- Root cause: `orchestrator.ts:1283` fallback bypass
- Fix: One-line change to use enriched component
