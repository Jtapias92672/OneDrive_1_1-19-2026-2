# CC FAILING TESTS FIX DIRECTIVE

**Date:** January 28, 2026
**Priority:** CRITICAL - BLOCKING
**Location:** `tests/unit/`

---

## TEST RESULTS SUMMARY

```
Test Suites: 7 failed, 14 passed, 21 total
Tests:       25 failed, 621 passed, 646 total
```

---

## FAILING TEST FILES (7 files)

### 1. SECRET DETECTION - `tests/unit/secret-metrics.test.ts`
**Failures:** 6 tests
**Root Cause:** Detection recall below 100% target

| Test | Issue |
|------|-------|
| `MUST achieve 100% recall - NO EXCEPTIONS` | Recall below 100% |
| `should have ZERO false negatives` | False negatives exist |
| `should achieve 100% recall for AWS keys` | Missing AWS key patterns |
| `should achieve 100% recall for cloud provider tokens` | Missing GCP/Azure patterns |
| `should achieve 100% recall for VCS tokens` | Missing GitHub/GitLab patterns |
| `should achieve 100% recall for service API keys` | Missing Stripe/Twilio patterns |

**Fix Required:**
```typescript
// Location: src/detection/secret-detection.ts (or equivalent)
// Add missing regex patterns for:
- AWS Access Key: /AKIA[0-9A-Z]{16}/
- AWS Secret Key: /[A-Za-z0-9/+=]{40}/
- GitHub Token: /ghp_[a-zA-Z0-9]{36}/
- GitLab Token: /glpat-[a-zA-Z0-9\-]{20}/
- GCP API Key: /AIza[0-9A-Za-z\-_]{35}/
- Azure Key: /[a-zA-Z0-9]{32}/
- Stripe Key: /sk_live_[a-zA-Z0-9]{24}/
- Twilio SID: /SK[a-f0-9]{32}/
```

---

### 2. PII DETECTION - `tests/unit/pii-detection.test.ts`
**Failures:** 9 tests
**Root Cause:** Missing detection patterns for specific PII types

| Test | Issue |
|------|-------|
| `should detect E.164 format phones` | Missing +1234567890 pattern |
| `should detect 00-prefix international phones` | Missing 00-prefix pattern |
| `should detect HICN (legacy format)` | Missing Medicare HICN pattern |
| `should detect Canadian passports` | Missing CA passport pattern |
| `should detect passports with context keyword` | Context-aware detection missing |
| `should detect standard 17-character VINs` | VIN regex incomplete |
| `should detect VINs with context keyword` | Context-aware VIN detection |
| `should detect license plates with context` | License plate patterns missing |
| `should achieve ≥99% recall across all categories` | Overall recall: ~80% |

**Fix Required:**
```typescript
// Location: src/detection/pii-detection.ts (or equivalent)
// Add missing patterns:

// E.164 International Phone
/\+[1-9]\d{1,14}/

// 00-prefix International Phone
/00[1-9]\d{1,14}/

// Medicare HICN (legacy)
/[A-Z]{1}[0-9]{9}[A-Z]{0,2}/

// Canadian Passport
/[A-Z]{2}[0-9]{6}/

// VIN (17 characters)
/[A-HJ-NPR-Z0-9]{17}/

// License Plate (with context)
/(?:plate|license|tag)[:\s]*([A-Z0-9]{1,8})/i
```

---

### 3. PII METRICS - `tests/unit/pii-metrics.test.ts`
**Failures:** 4 tests
**Root Cause:** Detection quality below thresholds

| Test | Expected | Actual |
|------|----------|--------|
| `should achieve overall recall ≥95%` | ≥95% | ~80% |
| `should achieve phone recall ≥95%` | ≥95% | <95% |
| `should detect vehicle VINs` | VIN detection | Not working |
| `should achieve overall accuracy ≥90%` | ≥90% | 83.27% |

**Fix Required:** Fix underlying PII detection patterns (see #2 above)

---

### 4. GATEWAY - `tests/unit/gateway.test.ts`
**Failures:** 1 test
**Root Cause:** Integrity hash length mismatch

| Test | Expected | Actual |
|------|----------|--------|
| `sets integrity hash on registration` | 64 chars (SHA-256) | 16 chars |

**Fix Required:**
```typescript
// Location: src/core/gateway.ts (or equivalent)
// The integrity hash is using wrong algorithm

// WRONG (MD5 = 32 hex chars, but getting 16?)
const hash = crypto.createHash('md5').update(data).digest('hex');

// CORRECT (SHA-256 = 64 hex chars)
const hash = crypto.createHash('sha256').update(data).digest('hex');
```

---

### 5. SIGNATURE VERIFICATION - `tests/unit/signature-verification.test.ts`
**Failures:** 2 tests
**Root Cause:** Error handling not working

| Test | Issue |
|------|-------|
| `should fail for non-existent package` | Not throwing/returning error |
| `should handle invalid version gracefully` | Crashing instead of graceful handling |

**Fix Required:**
```typescript
// Location: src/verification/signature-verification.ts
// Add proper error handling:

async function verifySignature(pkg: string, version: string) {
  // Check if package exists FIRST
  if (!await packageExists(pkg)) {
    return { valid: false, error: 'Package not found' };
  }

  // Check if version is valid
  if (!isValidVersion(version)) {
    return { valid: false, error: 'Invalid version format' };
  }

  // Proceed with verification...
}
```

---

### 6. PROVENANCE VERIFICATION - `tests/unit/provenance-verification.test.ts`
**Failures:** 3 tests
**Root Cause:** SLSA/Sigstore verification not implemented

| Test | Issue |
|------|-------|
| `should verify package with SLSA provenance` | SLSA verification missing |
| `should handle invalid version gracefully` | Same as signature verification |
| `should verify cryptographically via sigstore` | Sigstore integration broken |

**Fix Required:**
```typescript
// Location: src/verification/provenance-verification.ts
// Implement SLSA provenance verification
// Implement Sigstore verification
// Add same error handling as signature verification
```

---

### 7. JWT VALIDATION - `tests/unit/jwt-validation.test.ts`
**Failures:** Test file cannot run
**Root Cause:** ESM import error

```
SyntaxError: Unexpected token 'export'
> 21 | import * as jose from 'jose';
```

**Fix Required:**
```typescript
// Option A: Configure Jest for ESM
// jest.config.js:
module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jose)/)'
  ],
};

// Option B: Use dynamic import
const jose = await import('jose');

// Option C: Use jose v4 CommonJS build
import { jwtVerify } from 'jose/jwt/verify';
```

---

## CC EXECUTION ORDER

```
PHASE 1: Fix Module Issues (BLOCKING)
1. Fix jwt-validation.test.ts ESM import issue
   - Configure Jest transformIgnorePatterns for 'jose'
   - Verify test file can execute

PHASE 2: Fix Detection Patterns (HIGH PRIORITY)
2. Fix secret detection patterns in src/detection/
   - Add all missing secret regex patterns
   - Run: npx jest tests/unit/secret-metrics.test.ts
   - Target: 6/6 passing

3. Fix PII detection patterns in src/detection/
   - Add all missing PII regex patterns
   - Add context-aware detection
   - Run: npx jest tests/unit/pii-detection.test.ts tests/unit/pii-metrics.test.ts
   - Target: 13/13 passing

PHASE 3: Fix Security Verification (HIGH PRIORITY)
4. Fix gateway integrity hash
   - Change to SHA-256 (64 chars)
   - Run: npx jest tests/unit/gateway.test.ts
   - Target: 1/1 passing

5. Fix signature verification error handling
   - Add package existence check
   - Add version validation
   - Run: npx jest tests/unit/signature-verification.test.ts
   - Target: 2/2 passing

6. Fix provenance verification
   - Implement SLSA verification
   - Implement Sigstore verification
   - Add same error handling
   - Run: npx jest tests/unit/provenance-verification.test.ts
   - Target: 3/3 passing

PHASE 4: Verify All Pass
7. Run full test suite
   - npx jest tests/unit/
   - Target: 646/646 passing (0 failures)
```

---

## ACCEPTANCE CRITERIA

```
BEFORE:
Test Suites: 7 failed, 14 passed, 21 total
Tests:       25 failed, 621 passed, 646 total

AFTER:
Test Suites: 21 passed, 21 total
Tests:       646 passed, 646 total
```

---

## COMMIT FORMAT

```
fix(security): Fix secret detection patterns for 100% recall

- Add AWS access key and secret key patterns
- Add GitHub/GitLab token patterns
- Add GCP/Azure key patterns
- Add Stripe/Twilio API key patterns
```

```
fix(pii): Fix PII detection for E.164 phones, VINs, passports

- Add E.164 international phone format
- Add 00-prefix international format
- Add Medicare HICN pattern
- Add Canadian passport pattern
- Add VIN detection with context
- Add license plate detection with context
```

```
fix(gateway): Use SHA-256 for integrity hash (64 chars)
```

```
fix(verification): Add error handling for invalid packages/versions
```

```
fix(provenance): Implement SLSA and Sigstore verification
```

```
fix(jwt): Configure Jest for jose ESM module
```

---

## DO NOT PROCEED TO NEW EPICS UNTIL:

✅ 0 failing tests in tests/unit/
✅ Secret detection recall = 100%
✅ PII detection recall ≥ 95%
✅ All security verification tests passing
✅ JWT validation test can execute
