
# Skill Installation Protocol v2.0

## The Failure This Prevents

On December 23-26, 2025, **26 skills were "created" and "verified" but never persisted**.
Each conversation reported "✅ Installed" but the skills vanished when the chat ended.

**Root Cause**: Verification checked session storage instead of persistent storage.

---

## Critical Storage Locations

| Location | Type | Behavior | Use For |
|----------|------|----------|---------|
| `/mnt/skills/user/` | **SESSION** | Wiped when chat ends | Immediate availability |
| `/mnt/user-data/outputs/settings/skills/` | **PERSISTENT** | Survives forever | Actual installation |

> **THE RULE**: A skill is NOT installed until it exists in PERSISTENT storage.

---

## MANDATORY Procedure

### Step 1: Create in Session (For Immediate Use)

```bash
mkdir -p /mnt/skills/user/{skill-name}
# Use create_file tool to write SKILL.md
```

### Step 2: COPY TO PERSISTENT STORAGE (CRITICAL)

```bash
mkdir -p /mnt/user-data/outputs/settings/skills/{skill-name}
cp -r /mnt/skills/user/{skill-name}/* /mnt/user-data/outputs/settings/skills/{skill-name}/
```

### Step 3: VERIFY PERSISTENT LOCATION (NOT SESSION)

```bash
# ✅ CORRECT - Check PERSISTENT storage
if [ -f "/mnt/user-data/outputs/settings/skills/{skill-name}/SKILL.md" ]; then
  size=$(wc -c < "/mnt/user-data/outputs/settings/skills/{skill-name}/SKILL.md")
  echo "✅ PERSISTED: {skill-name} ($size bytes)"
else
  echo "❌ NOT PERSISTED: {skill-name}"
fi

# ❌ WRONG - This only checks ephemeral session storage
# if [ -f "/mnt/skills/user/{skill-name}/SKILL.md" ]; then ...
```

### Step 4: Report to User

Only after Step 3 verification passes:

```
✅ {skill-name} PERSISTED to settings ($size bytes)
   Location: /mnt/user-data/outputs/settings/skills/{skill-name}/
```

If Step 3 fails:

```
❌ PERSISTENCE FAILED: {skill-name}
   The skill exists in session but will be LOST when this chat ends.
   Attempting recovery...
```

---

## Batch Installation Script

For installing multiple skills:

```bash
#!/bin/bash
# SKILL BATCH PERSISTENCE SCRIPT

SKILLS_TO_PERSIST="skill1 skill2 skill3"

echo "=== PERSISTING SKILLS ==="

for skill in $SKILLS_TO_PERSIST; do
  # Ensure persistent directory exists
  mkdir -p "/mnt/user-data/outputs/settings/skills/$skill"
  
  # Copy from session to persistent
  if [ -d "/mnt/skills/user/$skill" ]; then
    cp -r "/mnt/skills/user/$skill/"* "/mnt/user-data/outputs/settings/skills/$skill/"
  fi
  
  # VERIFY PERSISTENT LOCATION
  if [ -f "/mnt/user-data/outputs/settings/skills/$skill/SKILL.md" ]; then
    size=$(wc -c < "/mnt/user-data/outputs/settings/skills/$skill/SKILL.md")
    echo "✅ $skill: PERSISTED ($size bytes)"
  else
    echo "❌ $skill: PERSISTENCE FAILED"
  fi
done

echo ""
echo "=== FINAL COUNT ==="
echo "Persistent: $(ls -d /mnt/user-data/outputs/settings/skills/*/ 2>/dev/null | wc -l) skills"
```

---

## Verification Checklist

Before telling the user a skill is "installed", verify ALL of the following:

- [ ] File exists in `/mnt/user-data/outputs/settings/skills/{skill}/SKILL.md`
- [ ] File size > 100 bytes (not empty or stub)
- [ ] YAML frontmatter is valid (has name, description)
- [ ] No verification of session storage only

---

## Anti-Patterns (NEVER DO THESE)

| Anti-Pattern | Why It Fails | Correct Approach |
|--------------|--------------|------------------|
| Verify only `/mnt/skills/user/` | Session storage vanishes | Verify `/mnt/user-data/outputs/settings/skills/` |
| "Created file" = "Installed" | Display ≠ persistence | Copy to persistent + verify |
| Skip copy to persistent | Skill lost on chat end | ALWAYS copy to persistent |
| Trust `create_file` success | Only confirms session write | Independent persistent verification |
| Verify before copy | Verifying wrong state | Copy first, then verify persistent |

---

## Memory Reminders

These should be in Claude's active memory:

1. **PERSISTENCE**: Write skills to `/mnt/user-data/outputs/settings/skills/` (persistent). `/mnt/skills/user/` is ephemeral. Verify PERSISTENT location only.

2. **Memory ≠ Reality**: Memory of creating something is NOT proof it exists. Always verify current state.

---

## Why This Protocol Exists

```
December 23-26, 2025:
- 26 skills were "created" in conversations
- Each conversation verified with ✅
- ALL 26 skills were LOST when chats ended
- Root cause: Verified session storage, not persistent storage
- This protocol was created to prevent recurrence
```

---

## Quick Reference

```
SESSION (ephemeral):    /mnt/skills/user/
PERSISTENT (survives):  /mnt/user-data/outputs/settings/skills/

CREATE: Session first, then copy to persistent
VERIFY: ONLY check persistent location
REPORT: Only after persistent verification passes
```

---

*Version 2.0 - Corrected to verify PERSISTENT storage*
*Original v1.0 failed because it verified session storage*
