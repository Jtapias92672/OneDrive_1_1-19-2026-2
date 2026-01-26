#!/bin/bash
# ArcFoundry Slop Tests
# Run after EVERY code generation
# Exit 1 on any failure

set -e
ERRORS=0

echo "🔍 Running Slop Tests..."

# ============================================
# TEST 1: Unfinished TODOs
# ============================================
echo "Checking for TODO comments..."
if grep -rn "// TODO" src/ packages/ --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null | grep -v node_modules; then
    echo "❌ SLOP: Found TODO comments"
    ERRORS=$((ERRORS + 1))
fi

# ============================================
# TEST 2: Placeholder Values
# ============================================
echo "Checking for placeholder values..."
PLACEHOLDERS=(
    "YOUR_API_KEY"
    "REPLACE_ME"
    "your-api-key"
    "xxx-xxx-xxx"
    "PLACEHOLDER"
    "example\.com"
    "test@test\.com"
)

for placeholder in "${PLACEHOLDERS[@]}"; do
    if grep -rni "$placeholder" src/ packages/ --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null | grep -v node_modules | grep -v "\.test\."; then
        echo "❌ SLOP: Found placeholder '$placeholder'"
        ERRORS=$((ERRORS + 1))
    fi
done

# ============================================
# TEST 3: Console.log in production code
# ============================================
echo "Checking for console.log..."
if grep -rn "console\.log" src/ packages/ --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null | grep -v node_modules | grep -v "\.test\." | grep -v "__tests__"; then
    echo "⚠️ WARNING: Found console.log (may be intentional)"
fi

# ============================================
# TEST 4: Claims without evidence
# ============================================
echo "Checking for unverified claims in progress..."
if grep -rn "✅ COMPLETE" .forge/ --include="*.md" 2>/dev/null | head -5; then
    echo "⚠️ Found COMPLETE claims - ensure all have evidence"
fi

# ============================================
# TEST 5: Empty test files
# ============================================
echo "Checking for empty test files..."
for testfile in $(find . -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | grep -v node_modules); do
    if [ $(wc -l < "$testfile") -lt 10 ]; then
        echo "⚠️ WARNING: $testfile appears nearly empty"
    fi
done

# ============================================
# RESULT
# ============================================
echo ""
if [ $ERRORS -gt 0 ]; then
    echo "❌ SLOP TESTS FAILED: $ERRORS issues found"
    echo "Fix before claiming complete."
    exit 1
else
    echo "✅ SLOP TESTS PASSED"
    exit 0
fi
