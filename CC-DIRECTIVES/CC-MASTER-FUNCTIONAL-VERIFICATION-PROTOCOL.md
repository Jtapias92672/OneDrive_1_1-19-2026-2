# CC MASTER FUNCTIONAL VERIFICATION PROTOCOL

**Date:** January 28, 2026
**Priority:** CRITICAL - BLOCKING ALL NEW EPICS
**Scope:** ENTIRE FORGE CODEBASE

---

## EXECUTIVE SUMMARY

FORGE is NOT PRODUCTION READY. Before ANY new epic work proceeds, the following must be achieved:

| Metric | Current | Required | Gap |
|--------|---------|----------|-----|
| Passing Tests | 725/762 | 762/762 | 37 failures |
| Line Coverage | 62.83% | 90%+ | -27.17% |
| Branch Coverage | 53.42% | 85%+ | -31.58% |
| Function Coverage | 60.76% | 90%+ | -29.24% |

---

## PHASE 0: FIX ALL FAILING TESTS (IMMEDIATE)

### Priority 1: Secret Detection (15 failures)
**Location:** `tests/unit/secret-detection/`
**Issue:** Recall only 40.1% (target: 100%)
**Action:**
- Fix regex patterns for AWS keys, API tokens, passwords
- Add missing secret patterns
- Verify ALL secret types detected

### Priority 2: PII Detection (11 failures)
**Location:** `tests/unit/pii-detection.test.ts`
**Issue:** Recall only 80.8% (target: 95%)
**Action:**
- Fix SSN detection patterns
- Fix email extraction edge cases
- Add phone number variations

### Priority 3: Security Verification (7 failures)
**Components:**
- `signature-verification.test.ts` (2 failures)
- `provenance-verification.test.ts` (3 failures)
- `jwt-validation.test.ts` (2 failures)
**Action:** Fix cryptographic verification logic

---

## PHASE 1: SECURITY-CRITICAL COMPONENTS (1.31% - 8.14% coverage)

These components are DANGEROUSLY UNDERTESTED. Code exists but has NEVER BEEN EXECUTED.

### 1.1 Sandbox Security Policy (1.31% → 90%+)
**File:** `src/sandbox/security-policy.ts`
**Lines:** 153 total, 151 UNTESTED
**Risk:** SANDBOX ESCAPE - Malicious code execution

**Untested Functionality:**
- Policy enforcement rules
- Resource limits
- Network isolation
- File system restrictions
- Process isolation

**CC Action:**
```
Read src/sandbox/security-policy.ts
Identify ALL exported functions and classes
Create tests that EXECUTE each function with:
- Valid inputs (happy path)
- Invalid inputs (error handling)
- Boundary conditions (limits)
- Attack vectors (security bypass attempts)
Target: 90%+ line AND branch coverage
```

### 1.2 OAuth Scopes (1.96% → 90%+)
**File:** `src/oauth/scopes.ts`
**Lines:** 51 total, 50 UNTESTED
**Risk:** OAUTH SCOPE BYPASS - Unauthorized access

**Untested Functionality:**
- Scope validation
- Scope inheritance
- Scope enforcement
- Token scope checking

### 1.3 Tenant Limits (2.04% → 90%+)
**File:** `src/tenant/limits.ts`
**Lines:** 98 total, 96 UNTESTED
**Risk:** DOS ATTACK - Resource exhaustion

**Untested Functionality:**
- Rate limiting
- Quota enforcement
- Resource caps
- Concurrent request limits

### 1.4 Approval System (5.13% → 90%+)
**File:** `src/approval/index.ts`
**Lines:** 78 total, 74 UNTESTED
**Risk:** APPROVAL BYPASS - Unauthorized actions

### 1.5 Output Sanitization (8.14% → 90%+)
**File:** `src/sanitization/output.ts`
**Lines:** 86 total, 79 UNTESTED
**Risk:** XSS INJECTION - Script injection attacks

---

## PHASE 2: SANDBOX & EXECUTION (15-45% coverage)

### 2.1 Deno Runtime (15.28% → 90%+)
**File:** `src/sandbox/deno-runtime.ts`
**Issue:** Code execution paths UNTESTED
**Action:** Test all runtime configurations, error handling, timeout behavior

### 2.2 Privacy Filter (45.45% → 90%+)
**File:** `src/execution/privacy-filter.ts`
**Issue:** Tool execution may leak PII
**Action:** Test all filter modes, redaction patterns

### 2.3 OAuth Client (32.47% → 90%+)
**File:** `src/oauth/oauth-client.ts`
**Issue:** OAuth flow broken
**Action:** Test token refresh, error recovery, session management

---

## PHASE 3: MONITORING & PRIVACY (21-38% coverage)

### 3.1 Monitoring (21.01% → 90%+)
**File:** `src/monitoring/index.ts`
**Issue:** Alert detection untested

### 3.2 Privacy (38.46% → 90%+)
**File:** `src/privacy/index.ts`
**Issue:** PII filtering incomplete

---

## PHASE 4: PACKAGE VERIFICATION

### 4.1 Express Generator (Current: ~92%)
**Location:** `packages/express-generator/`
**Issues Found:**
- ServiceBuilder: 66.66% branch coverage
  - Lines 209-213: Non-transactional create NEVER EXECUTED
  - Lines 330-339: Non-transactional update NEVER EXECUTED
  - Lines 283-285: Hard delete findOne NEVER EXECUTED

**Action:**
```
Test ALL configuration combinations:
- { useTransactions: true, useSoftDelete: true }    ✅ tested
- { useTransactions: true, useSoftDelete: false }   ❌ NOT tested
- { useTransactions: false, useSoftDelete: true }   ❌ NOT tested
- { useTransactions: false, useSoftDelete: false }  ❌ NOT tested

Verify generated code contains/excludes:
- "$transaction" wrapper based on config
- "deletedAt: null" based on soft delete config
```

### 4.2 React Generator
**Location:** `packages/react-generator/`
**Action:** Run same config combination verification

### 4.3 Platform UI
**Location:** `packages/platform-ui/`
**Action:** Verify all API routes, hooks, components

---

## VERIFICATION METHODOLOGY

### For EVERY untested code path:

1. **READ** the source file
2. **IDENTIFY** the untested lines (from coverage report)
3. **UNDERSTAND** what functionality those lines implement
4. **CREATE** tests that EXECUTE those specific lines
5. **VERIFY** the code produces CORRECT output
6. **CONFIRM** error handling works
7. **RUN** coverage to confirm lines now covered

### DO NOT:
- Write tests that pass without executing the code
- Mock everything (mocks don't verify real behavior)
- Increase test count without increasing coverage
- Mark things complete based on test count

### DO:
- Execute ACTUAL code paths
- Verify ACTUAL output
- Test ACTUAL error conditions
- Confirm ACTUAL security enforcement

---

## ACCEPTANCE CRITERIA

### Gate 1: All Tests Pass
```
npm test
# Result: 762/762 passing (0 failures)
```

### Gate 2: Line Coverage ≥90%
```
npm test -- --coverage
# Lines: ≥90%
```

### Gate 3: Branch Coverage ≥85%
```
# Branches: ≥85%
```

### Gate 4: Security Components ≥95%
```
# sandbox/security-policy.ts: ≥95%
# oauth/scopes.ts: ≥95%
# tenant/limits.ts: ≥95%
# sanitization/output.ts: ≥95%
```

### Gate 5: Zero Security Gaps
- All secret detection patterns work
- All PII detection patterns work
- All crypto verification works
- All sandbox policies enforced

---

## CC EXECUTION ORDER

```
STOP all new epic work until this protocol completes.

1. Fix 37 failing tests FIRST
2. Security-critical components (1-8% coverage)
3. Sandbox & execution (15-45% coverage)
4. Monitoring & privacy (21-38% coverage)
5. Package verification (express, react, platform-ui)
6. Full regression test
7. Generate final coverage report

Commit after each component reaches target.
Message format: fix(security): [component] coverage [X]% → [Y]%
```

---

## ESTIMATED EFFORT

| Phase | Hours | Priority |
|-------|-------|----------|
| Phase 0: Fix Failures | 16h | CRITICAL |
| Phase 1: Security | 40h | CRITICAL |
| Phase 2: Sandbox/Execution | 24h | HIGH |
| Phase 3: Monitoring/Privacy | 16h | HIGH |
| Phase 4: Packages | 24h | MEDIUM |
| **TOTAL** | **120h** | - |

---

## FINAL GATE

Before ANY new epic (15, 16, etc.) proceeds:

```
✅ 762/762 tests passing
✅ Line coverage ≥90%
✅ Branch coverage ≥85%
✅ Security components ≥95%
✅ Zero known vulnerabilities
✅ All code paths VERIFIED FUNCTIONAL
```

---

**This is not optional. FORGE must work before we add more code.**
