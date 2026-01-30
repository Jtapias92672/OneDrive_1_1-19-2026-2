# CC FIX PHASE 0: Failing Tests

**Scope:** Fix 25 failing tests in tests/unit/
**Run:** `npx jest tests/unit/`
**Target:** 646/646 passing

---

## File 1: secret-metrics.test.ts (6 failures)

**Problem:** Missing secret detection patterns
**Fix:** Add regex patterns to src/detection/ for:
- AWS keys: `/AKIA[0-9A-Z]{16}/`
- GitHub: `/ghp_[a-zA-Z0-9]{36}/`
- GCP: `/AIza[0-9A-Za-z\-_]{35}/`

---

## File 2: pii-detection.test.ts (9 failures)

**Problem:** Missing PII patterns
**Fix:** Add patterns for:
- E.164 phones: `/\+[1-9]\d{1,14}/`
- VIN: `/[A-HJ-NPR-Z0-9]{17}/`
- HICN: `/[A-Z][0-9]{9}[A-Z]{0,2}/`

---

## File 3: gateway.test.ts (1 failure)

**Problem:** Hash is 16 chars, should be 64
**Fix:** Change MD5 to SHA-256 in src/core/gateway.ts

---

## File 4: signature-verification.test.ts (2 failures)

**Problem:** No error handling
**Fix:** Add package existence check before verification

---

## File 5: provenance-verification.test.ts (3 failures)

**Problem:** SLSA verification not implemented
**Fix:** Implement basic SLSA check or mock for now

---

## File 6: jwt-validation.test.ts (can't run)

**Problem:** ESM import error with 'jose'
**Fix:** Add to jest.config.js transformIgnorePatterns:
```
transformIgnorePatterns: ['node_modules/(?!(jose)/)']
```

---

## Verify

```bash
npx jest tests/unit/
# Target: 646/646 passing
```

Commit: `fix(tests): Resolve 25 failing unit tests`
