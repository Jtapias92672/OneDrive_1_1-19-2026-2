#!/bin/bash
# pre-completion-check.sh
# MANDATORY: Run before claiming ANY epic as COMPLETE

echo "=== Epic Completion Verification ==="
echo ""

echo "1. Build verification:"
npm run build || exit 1

echo ""
echo "2. Test verification:"
npm test || exit 1

echo ""
echo "3. Coverage verification (MANDATORY):"
npm test -- --coverage

echo ""
echo "4. Coverage threshold check:"
# Extract statement coverage percentage
COVERAGE=$(npm test -- --coverage --silent 2>&1 | grep "All files" | awk '{print $4}' | tr -d '%')

if [ -z "$COVERAGE" ]; then
    echo "❌ FAIL: Could not extract coverage percentage"
    echo "Status: INCOMPLETE - Coverage verification failed"
    exit 1
fi

echo "Coverage: ${COVERAGE}%"

if [ "${COVERAGE%.*}" -lt 80 ]; then
    echo ""
    echo "❌ FAIL: Coverage ${COVERAGE}% < 80% minimum"
    echo "Status: FUNCTIONAL (not complete)"
    echo "Action: Add more tests to reach 80%+ coverage"
    exit 1
fi

if [ "${COVERAGE%.*}" -lt 97 ]; then
    echo ""
    echo "⚠️ WARNING: Coverage ${COVERAGE}% < 97% target"
    echo "Status: FUNCTIONAL (meets minimum, below target)"
    echo "Action: Consider adding tests to reach 97%+"
    exit 0
fi

echo ""
echo "✅ PASS: All verification checks complete"
echo "Coverage: ${COVERAGE}% (meets 97% target)"
echo "Status: Ready for COMPLETE marking"
