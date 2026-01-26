# Session Start Checklist

**Execute at the START of every Claude Code session.**

## Step 1: Announce Session Start
```
=== SESSION START ===
Turn: 0
Date: [YYYY-MM-DD]
```

## Step 2: Load Protocols
```bash
cat CLAUDE.md | head -50
cat .forge/skills/MANIFEST.md | head -30
```

Confirm loaded:
- [ ] CLAUDE.md
- [ ] MANIFEST.md
- [ ] Token limits understood (<200 directives, <800 responses)
- [ ] 10-turn compaction rule understood

## Step 3: Identify Task
```
Current task: [description]
Target files: [list]
Relevant skills: [list]
```

## Step 4: Verify Clean State
```bash
git status
npm test 2>/dev/null || echo "No tests yet"
```

## Step 5: Confirm Ready
```
Protocols loaded: ✅
Turn count: 0
Ready for task: [task name]
```

---

## Mid-Session Checkpoints

**Every response must include:**
```
[Turn N/10]
```

**At Turn 10:**
1. STOP implementation
2. Run: `bash .forge/compaction.sh` (or manual compaction)
3. Create `.claude/session_compaction.md`
4. Announce: "Compaction complete. Turn: 0"

---

## Post-Code-Gen Checkpoint

**After ANY code generation:**
```bash
bash .forge/slop-tests.sh
```

If fails → Fix before proceeding.

---

## Pre-Completion Checkpoint

**Before claiming COMPLETE:**
```bash
npm run build
npm test -- --coverage
```

Show:
1. Full coverage table
2. Per-file breakdown
3. Uncovered line classification (with code snippets)

---

## Session End

```
=== SESSION END ===
Turns used: [N]
Task status: [COMPLETE/FUNCTIONAL/BLOCKED]
Commits: [list hashes]
Next: [what's remaining]
```
