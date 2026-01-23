
# Preflight Verification Skill

## Core Principle

> "Verify existence before reference. Never build on phantoms."

This skill exists because on December 25, 2025, a 139K architecture document was
built referencing 17 skills that didn't exist. Preflight verification prevents this.

---

## When to Run Preflight

- Before writing architecture documents
- Before starting implementation that uses dependencies
- Before referencing skills in documentation
- Before any work that assumes external resources exist

---

## Preflight Procedure

```bash
#!/bin/bash
# PREFLIGHT VERIFICATION SCRIPT

echo "=== PREFLIGHT VERIFICATION ==="
echo "Checking dependencies before proceeding..."

DEPENDENCIES="$@"
MISSING=0
FOUND=0

for dep in $DEPENDENCIES; do
  # Check for skill
  if [ -f "/mnt/user-data/outputs/settings/skills/$dep/SKILL.md" ]; then
    echo "✅ FOUND: $dep"
    FOUND=$((FOUND + 1))
  else
    echo "❌ MISSING: $dep"
    MISSING=$((MISSING + 1))
  fi
done

echo ""
echo "=== RESULTS ==="
echo "Found: $FOUND"
echo "Missing: $MISSING"

if [ $MISSING -gt 0 ]; then
  echo ""
  echo "🛑 PREFLIGHT FAILED"
  echo "Cannot proceed until missing dependencies are resolved."
  exit 1
else
  echo ""
  echo "✅ PREFLIGHT PASSED"
  echo "All dependencies verified. Safe to proceed."
  exit 0
fi
```

---

## Dependency Categories

| Category | Location | Check Command |
|----------|----------|---------------|
| Skills | /mnt/user-data/outputs/settings/skills/ | `[ -f "$path/SKILL.md" ]` |
| Files | Various | `[ -f "$path" ]` |
| Directories | Various | `[ -d "$path" ]` |
| Services | Network | `curl -s $url > /dev/null` |

---

## Architecture Preflight Template

Before writing any architecture document:

```bash
# Example: Sevco 2.0 preflight
./preflight.sh \
  certified-asset-lifecycle \
  genbi-trust-tiers \
  evidence-binding-standard \
  cars-framework \
  connector-factory \
  data-lake-governance \
  analytics-orchestration

# Only proceed if exit code is 0
```

---

## Memory ≠ Reality

**Critical Understanding**: Claude's memory of creating something is NOT proof it exists.

| What Memory Says | What Reality Might Be |
|------------------|----------------------|
| "Created skill X" | Skill was in session, now deleted |
| "Installed Y" | Installation failed silently |
| "Built Z" | Build was in temp directory |

**Always verify with actual filesystem checks.**

---

## Integration Points

```yaml
integrates_with:
  - skill-installation-protocol: "Preflight before install"
  - architecture-decisions: "ADRs must pass preflight"
  - deployment-readiness: "Preflight part of deploy"
```

---

*This skill prevents building on phantom foundations.*
