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
