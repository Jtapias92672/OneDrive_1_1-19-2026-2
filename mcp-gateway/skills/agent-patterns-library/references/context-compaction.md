---
name: context-compaction
description: Combat Context Rot by enforcing automatic compaction after extended conversations. Use when tasks exceed 10 turns, context window feels cluttered, Claude starts repeating mistakes or forgetting constraints, or when implementing the ACCE "Pull-based" memory pattern. Forces periodic context refresh to maintain 100% attention on current work.
---

# Context Compaction Skill
## Combat Context Rot with Auto-Compaction

**Problem**: Performance degrades as context accumulates ("Context Rot")
**Solution**: Automatic context reset after threshold with structured summary

---

## The 10-Turn Rule

**Trigger**: When ANY task exceeds 10 turns without resolution

**Action**: Stop implementation and execute compaction:

```
Claude, summarize our progress into progress.md, identify the current 
'failing' node in features.json, and clear your active chat history.
```

---

## Compaction Protocol

### Step 1: Generate Context Summary

Create/update `.claude/session_compaction.md`:

```markdown
# Session Compaction - [TIMESTAMP]

## Current Objective
[Single sentence: What we're trying to accomplish]

## Progress State
- **Last Passing Feature:** [Feature ID or "None"]
- **Current Feature:** [Feature ID and status]
- **Blockers:** [Specific technical blockers, not descriptions]

## Critical Constraints
[Max 5 items - only constraints that affect current work]
1. [Constraint with source/reason]

## Failed Approaches This Session
[What NOT to try again]
1. [Approach] - [Why it failed]

## Next Step
[Single specific action to take after compaction]
```

### Step 2: Update Machine-Readable State

Update `features.json` with current status:
- Mark current feature as `"failing"` if not passing
- Add `"last_session_notes"` field with failure hypothesis

### Step 3: Clear Chat History

**For Claude Code:**
```
/clear
```

**For Web Interface:**
- Start new conversation with bootup ritual

### Step 4: Restart from Clean Context

Begin new session with:
```
Read .claude/session_compaction.md and .claude/features.json.
Continue from the Next Step identified in compaction.
Do NOT re-attempt failed approaches listed.
```

---

## Compaction Triggers

Compact immediately when you observe:

| Signal | Meaning |
|--------|---------|
| Repeating the same approach | Context overwhelm |
| Forgetting earlier constraints | Signal dilution |
| "Let me try a different approach" (3rd time) | Thrashing |
| Response quality degrading | Context rot |
| Error messages being misinterpreted | Attention fragmentation |

---

## What to Preserve vs Discard

### PRESERVE (in compaction file)
- Current objective (1 sentence)
- Specific technical blockers
- Failed approaches with reasons
- Critical constraints affecting current work
- File paths being modified

### DISCARD
- Conversation history
- Exploratory discussion
- Abandoned approaches (just note they failed)
- Verbose error logs (keep only key message)
- General context that's in codebase

---

## Emergency Compaction

When things go seriously wrong:

```markdown
# EMERGENCY COMPACTION

## Crisis State
[What went wrong in one sentence]

## Rollback Point
[Git commit hash or backup file timestamp]

## Recovery Action
1. [Specific recovery step]

## DO NOT
- [List what caused the crisis to prevent repeat]
```

---

## Integration with Domain Memory Pattern

This skill complements `domain-memory-pattern`:

1. **features.json** = What needs to be done (stable)
2. **progress.md** = Historical log (append-only)
3. **session_compaction.md** = Working context (regenerated)

The compaction refreshes #3 without losing #1 and #2.

---

## Quick Reference

```
IF turns > 10 AND not making progress:
    1. Stop working
    2. Create session_compaction.md
    3. Update features.json status
    4. Clear context (/clear or new chat)
    5. Resume with bootup from compaction file

GOAL: Keep Working Context small = Claude attention 100% on current task
```

---

*This skill prevents the "transcript soup" that causes agents to lose effectiveness over long sessions.*
