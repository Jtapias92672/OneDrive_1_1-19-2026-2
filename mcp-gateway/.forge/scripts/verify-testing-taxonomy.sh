#!/bin/bash
# .forge/scripts/verify-testing-taxonomy.sh
# Epic 7.5: Testing Taxonomy Verification Script
# Updated: 2026-01-28

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     EPIC 7.5 TESTING TAXONOMY VERIFICATION                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

# Track results
PASSED=0
FAILED=0

check_pass() {
  echo "  ✅ $1"
  PASSED=$((PASSED + 1))
}

check_fail() {
  echo "  ❌ $1"
  FAILED=$((FAILED + 1))
}

# =============================================================================
# 1. VERIFY TEST COMMANDS EXIST
# =============================================================================

echo -e "\n📋 1. Verifying test commands exist in package.json..."

if grep -q '"test:unit"' package.json 2>/dev/null; then
  check_pass "test:unit command exists"
else
  check_fail "test:unit command MISSING"
fi

if grep -q '"test:story"' package.json 2>/dev/null; then
  check_pass "test:story command exists"
else
  check_fail "test:story command MISSING"
fi

if grep -q '"test:e2e"' package.json 2>/dev/null; then
  check_pass "test:e2e command exists"
else
  check_fail "test:e2e command MISSING"
fi

if grep -q '"test:smoke"' package.json 2>/dev/null; then
  check_pass "test:smoke command exists"
else
  check_fail "test:smoke command MISSING"
fi

if grep -q '"test:sanity"' package.json 2>/dev/null; then
  check_pass "test:sanity command exists"
else
  check_fail "test:sanity command MISSING"
fi

if grep -q '"test:regression"' package.json 2>/dev/null; then
  check_pass "test:regression command exists"
else
  check_fail "test:regression command MISSING"
fi

# =============================================================================
# 2. VERIFY E2E DIRECTORY STRUCTURE
# =============================================================================

echo -e "\n📁 2. Verifying E2E directory structure..."

E2E_DIR=""
if [ -d "e2e" ]; then
  E2E_DIR="e2e"
  check_pass "E2E directory exists at e2e/"
elif [ -d "src/lib/e2e" ]; then
  E2E_DIR="src/lib/e2e"
  check_pass "E2E directory exists at src/lib/e2e/"
elif [ -d "packages/platform-ui/src/lib/e2e" ]; then
  E2E_DIR="packages/platform-ui/src/lib/e2e"
  check_pass "E2E directory exists at packages/platform-ui/src/lib/e2e/"
else
  check_fail "E2E directory NOT FOUND"
fi

if [ -n "$E2E_DIR" ]; then
  # Check for both *.e2e.ts and *.test.ts in e2e directory
  E2E_FILE_COUNT=$(find "$E2E_DIR" \( -name "*.e2e.ts" -o -name "*.test.ts" \) 2>/dev/null | wc -l | tr -d ' ')
  if [ "$E2E_FILE_COUNT" -gt 0 ]; then
    check_pass "Found $E2E_FILE_COUNT E2E test file(s)"
  else
    check_fail "No E2E test files found in $E2E_DIR"
  fi
fi

# =============================================================================
# 3. COUNT TESTS BY LAYER
# =============================================================================

echo -e "\n📊 3. Test counts by layer..."

UNIT_COUNT=$(grep -r "describe\|it(" --include="*.test.ts" --exclude-dir="e2e" . 2>/dev/null | wc -l | tr -d ' ' || echo 0)
STORY_COUNT=$(grep -r "describe\|it(" --include="*.story.test.ts" . 2>/dev/null | wc -l | tr -d ' ' || echo 0)
# Count E2E tests from e2e directory (both .e2e.ts and .test.ts patterns)
E2E_COUNT=$(grep -r "describe\|it(" --include="*.e2e.test.ts" ./packages/platform-ui/src/lib/e2e ./src/lib/e2e ./e2e 2>/dev/null | wc -l | tr -d ' ' || echo 0)

echo "  Unit tests:  $UNIT_COUNT occurrences"
echo "  Story tests: $STORY_COUNT occurrences"
echo "  E2E tests:   $E2E_COUNT occurrences"

if [ "$UNIT_COUNT" -gt 0 ]; then
  check_pass "Unit tests exist"
else
  check_fail "No unit tests found"
fi

if [ "$E2E_COUNT" -gt 0 ]; then
  check_pass "E2E tests exist"
else
  check_fail "No E2E tests found"
fi

# =============================================================================
# 4. E2E TAG DISTRIBUTION
# =============================================================================

echo -e "\n🏷️  4. E2E tag distribution..."

# Check for tags in e2e directory (both patterns)
SMOKE_TAGS=$(grep -r "@smoke" ./packages/platform-ui/src/lib/e2e ./src/lib/e2e ./e2e 2>/dev/null | wc -l | tr -d ' ' || echo 0)
SANITY_TAGS=$(grep -r "@sanity" ./packages/platform-ui/src/lib/e2e ./src/lib/e2e ./e2e 2>/dev/null | wc -l | tr -d ' ' || echo 0)

echo "  @smoke tagged:  $SMOKE_TAGS"
echo "  @sanity tagged: $SANITY_TAGS"

if [ "$SMOKE_TAGS" -gt 0 ]; then
  check_pass "Smoke tags exist in E2E tests"
else
  echo "  ⚠️  Warning: No @smoke tags found (recommended for critical paths)"
fi

# =============================================================================
# 5. VERIFY TEST COMMANDS EXECUTE
# =============================================================================

echo -e "\n🧪 5. Verifying test commands execute..."

echo "  Testing npm run test:unit..."
if npm run test:unit -- --passWithNoTests 2>&1 | grep -q "passed"; then
  check_pass "test:unit executes"
else
  check_fail "test:unit failed to execute"
fi

echo "  Testing npm run test:regression..."
if npm run test:regression -- --passWithNoTests 2>&1 | grep -q "passed"; then
  check_pass "test:regression executes"
else
  check_fail "test:regression failed to execute"
fi

# =============================================================================
# 6. VERIFY EPIC 7.5 ACCEPTANCE CRITERIA
# =============================================================================

echo -e "\n✓ 6. Epic 7.5 Acceptance Criteria..."

echo "  AC-7.5.1: E2E test directory exists"
[ -n "$E2E_DIR" ] && check_pass "AC-7.5.1 PASSED" || check_fail "AC-7.5.1 FAILED"

echo "  AC-7.5.2: At least one E2E test file exists"
[ "$E2E_COUNT" -gt 0 ] && check_pass "AC-7.5.2 PASSED" || check_fail "AC-7.5.2 FAILED"

echo "  AC-7.5.3: E2E entry point exists (npm run test:e2e)"
grep -q '"test:e2e"' package.json 2>/dev/null && check_pass "AC-7.5.3 PASSED" || check_fail "AC-7.5.3 FAILED"

echo "  AC-7.5.4: Smoke entry point exists (npm run test:smoke)"
grep -q '"test:smoke"' package.json 2>/dev/null && check_pass "AC-7.5.4 PASSED" || check_fail "AC-7.5.4 FAILED"

echo "  AC-7.5.5: Sanity entry point exists (npm run test:sanity)"
grep -q '"test:sanity"' package.json 2>/dev/null && check_pass "AC-7.5.5 PASSED" || check_fail "AC-7.5.5 FAILED"

echo "  AC-7.5.6: Regression entry point exists (npm run test:regression)"
grep -q '"test:regression"' package.json 2>/dev/null && check_pass "AC-7.5.6 PASSED" || check_fail "AC-7.5.6 FAILED"

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                         SUMMARY                               ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
printf "║  Passed: %-3d                                                  ║\n" $PASSED
printf "║  Failed: %-3d                                                  ║\n" $FAILED
echo "╠═══════════════════════════════════════════════════════════════╣"

if [ $FAILED -eq 0 ]; then
  echo "║  Result: ✅ ALL CHECKS PASSED                                 ║"
else
  echo "║  Result: ❌ SOME CHECKS FAILED                                ║"
fi

echo "╚═══════════════════════════════════════════════════════════════╝"

# Exit with failure if any checks failed
[ $FAILED -eq 0 ] || exit 1
