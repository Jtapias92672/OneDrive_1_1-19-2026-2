#!/bin/bash
# verify-session-end.sh
# Run before ending any coding agent session to ensure clean state

set -e

echo "🔍 Verifying session end state..."
echo ""

ERRORS=0
WARNINGS=0

# ============================================
# CHECK 1: Git status - no uncommitted changes
# ============================================
echo "Checking git status..."
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l)
if [ "$UNCOMMITTED" -gt 0 ]; then
    echo "❌ ERROR: $UNCOMMITTED uncommitted changes found"
    git status --short
    ERRORS=$((ERRORS + 1))
else
    echo "✅ All changes committed"
fi

# ============================================
# CHECK 2: Progress file updated
# ============================================
echo ""
echo "Checking progress file..."
if [ -f "claude-progress.txt" ]; then
    # Check if updated today
    TODAY=$(date +%Y-%m-%d)
    if grep -q "$TODAY" claude-progress.txt; then
        echo "✅ Progress file updated today"
    else
        echo "⚠️  WARNING: Progress file may not be updated for this session"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "❌ ERROR: claude-progress.txt not found"
    ERRORS=$((ERRORS + 1))
fi

# ============================================
# CHECK 3: Feature list exists and is valid JSON
# ============================================
echo ""
echo "Checking feature list..."
if [ -f "feature_list.json" ]; then
    if python3 -c "import json; json.load(open('feature_list.json'))" 2>/dev/null; then
        echo "✅ feature_list.json is valid JSON"
        
        # Count features
        TOTAL=$(python3 -c "import json; data=json.load(open('feature_list.json')); print(len(data.get('features', [])))")
        PASSING=$(python3 -c "import json; data=json.load(open('feature_list.json')); print(sum(1 for f in data.get('features', []) if f.get('passes', False)))")
        echo "   Features: $PASSING/$TOTAL passing"
    else
        echo "❌ ERROR: feature_list.json is not valid JSON"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "❌ ERROR: feature_list.json not found"
    ERRORS=$((ERRORS + 1))
fi

# ============================================
# CHECK 4: No syntax errors in code
# ============================================
echo ""
echo "Checking for syntax errors..."

# Python files
PY_ERRORS=0
for pyfile in $(find . -name "*.py" -not -path "./node_modules/*" -not -path "./.venv/*" 2>/dev/null); do
    if ! python3 -m py_compile "$pyfile" 2>/dev/null; then
        echo "❌ Syntax error in $pyfile"
        PY_ERRORS=$((PY_ERRORS + 1))
    fi
done

if [ "$PY_ERRORS" -eq 0 ]; then
    echo "✅ No Python syntax errors"
else
    ERRORS=$((ERRORS + PY_ERRORS))
fi

# TypeScript/JavaScript (if tsc available)
if command -v tsc &> /dev/null && [ -f "tsconfig.json" ]; then
    if tsc --noEmit 2>&1 | grep -q "error"; then
        echo "❌ TypeScript compilation errors found"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ No TypeScript errors"
    fi
fi

# ============================================
# CHECK 5: Recent commit message quality
# ============================================
echo ""
echo "Checking recent commits..."
LAST_COMMIT=$(git log --oneline -1 2>/dev/null)
if [ -n "$LAST_COMMIT" ]; then
    echo "   Last commit: $LAST_COMMIT"
    
    # Check for feature ID in commit
    if echo "$LAST_COMMIT" | grep -qE "F[0-9]{3}"; then
        echo "✅ Commit includes feature ID"
    else
        echo "⚠️  WARNING: Commit should include feature ID (e.g., F001)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "⚠️  WARNING: No commits found"
    WARNINGS=$((WARNINGS + 1))
fi

# ============================================
# CHECK 6: No half-implemented features
# ============================================
echo ""
echo "Checking for incomplete implementations..."

# Look for TODO/FIXME in recently changed files
RECENT_FILES=$(git diff --name-only HEAD~1 2>/dev/null || echo "")
INCOMPLETE=0
for file in $RECENT_FILES; do
    if [ -f "$file" ]; then
        if grep -n "TODO\|FIXME\|XXX\|HACK" "$file" 2>/dev/null; then
            echo "⚠️  Found incomplete marker in $file"
            INCOMPLETE=$((INCOMPLETE + 1))
        fi
    fi
done

if [ "$INCOMPLETE" -gt 0 ]; then
    echo "⚠️  WARNING: $INCOMPLETE files have incomplete markers"
    WARNINGS=$((WARNINGS + 1))
else
    echo "✅ No incomplete markers in recent changes"
fi

# ============================================
# RESULTS
# ============================================
echo ""
echo "======================================"
echo "SESSION END VERIFICATION RESULTS"
echo "======================================"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ "$ERRORS" -gt 0 ]; then
    echo "❌ SESSION NOT READY TO END"
    echo ""
    echo "Fix the errors above before ending this session."
    echo "The next agent will struggle with an unclean state."
    exit 1
elif [ "$WARNINGS" -gt 2 ]; then
    echo "⚠️  SESSION CAN END (but review warnings)"
    echo ""
    echo "Consider addressing warnings for cleaner handoff."
    exit 0
else
    echo "✅ SESSION READY TO END"
    echo ""
    echo "State is clean for next agent session."
    exit 0
fi
