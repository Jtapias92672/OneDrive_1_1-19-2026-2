# 09_DATA_PROTECTION

> **Version:** 1.0.0 | **Status:** Active | **Last Updated:** 2026-01-17

---

## 1. Component Summary

**What it is:** Security layer that protects sensitive data throughout the FORGE pipeline. Handles PII detection/redaction, secret scanning, data classification, and audit logging for compliance.

**Why it exists:** Enterprise data processed by LLMs is "the new training data" - it must be protected from leakage. Data Protection ensures PII and secrets never reach external LLMs and provides audit evidence for compliance.

**Boundaries:**
- IN SCOPE: PII detection, secret scanning, data classification, redaction/tokenization, output verification, audit logging
- OUT OF SCOPE: Encryption at rest (infrastructure), network security (infrastructure), access control (identity layer)

**Non-Goals:**
- Does not replace infrastructure security (complements it)
- Does not handle user authentication (assumes authenticated context)
- Does not make classification decisions for novel data types (uses defined patterns)

---

## 2. Success Criteria

| ID | Criterion | Testable By |
|----|-----------|-------------|
| DP-01 | System MUST detect and redact standard PII patterns (email, phone, SSN) | Pattern test |
| DP-02 | System MUST detect and block API keys/secrets before LLM processing | Secret scan test |
| DP-03 | System MUST support configurable data classification levels | Config test |
| DP-04 | System MUST tokenize redacted values for restoration if needed | Round-trip test |
| DP-05 | System MUST verify no leaked secrets in LLM outputs | Output scan test |
| DP-06 | System MUST log all data access with classification level | Audit log test |
| DP-07 | System MUST process redaction in <50ms for typical payloads | Performance test |
| DP-08 | System MUST support custom PII patterns per deployment | Extension test |
| DP-09 | System MUST achieve ≥99% recall on standard PII test set | Accuracy test |
| DP-10 | System MUST produce zero false negatives on secrets (100% recall) | Secret test |

---

## 3. Acceptance Tests / Completion Checks

### DP-01: Standard PII detection

| Aspect | Detail |
|--------|--------|
| **How to verify** | Input text with email, phone, SSN; verify all redacted |
| **Automated** | Yes - PII injection test |
| **Evidence** | Output showing `[REDACTED_EMAIL_1]`, `[REDACTED_PHONE_1]`, etc. |
| **Pass/Fail** | PASS if all PII redacted; FAIL if any missed |

**Test Cases:**
- Email: `john.doe@example.com` → `[REDACTED_EMAIL_1]`
- Phone: `555-123-4567` → `[REDACTED_PHONE_1]`
- SSN: `123-45-6789` → `[REDACTED_SSN_1]`
- Credit Card: `4111-1111-1111-1111` → `[REDACTED_CC_1]`

### DP-02: API key/secret blocking

| Aspect | Detail |
|--------|--------|
| **How to verify** | Input text with AWS key, API token; verify processing blocked |
| **Automated** | Yes - secret injection test |
| **Evidence** | Error returned before LLM call; secret logged (hashed) |
| **Pass/Fail** | PASS if blocked; FAIL if processed |

**Test Cases:**
- AWS Key: `AKIAIOSFODNN7EXAMPLE` → BLOCKED
- Generic API Key: `sk-proj-abc123...` (32+ chars) → BLOCKED

### DP-03: Data classification levels

| Aspect | Detail |
|--------|--------|
| **How to verify** | Configure PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED; verify behavior per level |
| **Automated** | Yes - classification routing test |
| **Evidence** | Different handling per classification |
| **Pass/Fail** | PASS if classification enforced; FAIL if bypassed |

### DP-04: Tokenization round-trip

| Aspect | Detail |
|--------|--------|
| **How to verify** | Redact PII, process, restore tokens; verify original values recovered |
| **Automated** | Yes - round-trip test |
| **Evidence** | Original values restored exactly |
| **Pass/Fail** | PASS if perfect restoration; FAIL if any loss |

### DP-05: Output secret verification

| Aspect | Detail |
|--------|--------|
| **How to verify** | LLM output scanned for secrets before returning to caller |
| **Automated** | Yes - output scan test |
| **Evidence** | Secret in output triggers alert/redaction |
| **Pass/Fail** | PASS if output scanned; FAIL if secrets pass through |

### DP-06: Audit logging

| Aspect | Detail |
|--------|--------|
| **How to verify** | Process data, verify audit log entry with timestamp, classification, action |
| **Automated** | Yes - log verification |
| **Evidence** | Audit log entry with required fields |
| **Pass/Fail** | PASS if log complete; FAIL if missing fields |

### DP-07: Redaction time <50ms

| Aspect | Detail |
|--------|--------|
| **How to verify** | Redact 10KB payload 1000 times, measure P95 |
| **Automated** | Yes - benchmark test |
| **Evidence** | P95 < 50ms in timing report |
| **Pass/Fail** | PASS if P95 < 50ms; FAIL otherwise |

### DP-08: Custom PII patterns

| Aspect | Detail |
|--------|--------|
| **How to verify** | Add custom pattern (e.g., employee ID), verify detection |
| **Automated** | Yes - custom pattern test |
| **Evidence** | Custom pattern detected and redacted |
| **Pass/Fail** | PASS if custom pattern works; FAIL otherwise |

### DP-09: ≥99% PII recall

| Aspect | Detail |
|--------|--------|
| **How to verify** | Run against standard PII test dataset (1000+ examples) |
| **Automated** | Yes - accuracy test |
| **Evidence** | Recall ≥ 99% on test set |
| **Pass/Fail** | PASS if recall ≥ 99%; FAIL otherwise |

### DP-10: 100% secret recall

| Aspect | Detail |
|--------|--------|
| **How to verify** | Run against secret test dataset (API keys, passwords, tokens) |
| **Automated** | Yes - secret detection test |
| **Evidence** | 100% recall (zero false negatives) |
| **Pass/Fail** | PASS if 100% recall; FAIL if any missed |

---

## 4. Telemetry & Metrics

| Metric | Type | Target | Collection Method |
|--------|------|--------|-------------------|
| `data_protection.redaction_time_ms` | Histogram | P95 < 50ms | Timer |
| `data_protection.pii_detections` | Counter by type | Track | Per detection |
| `data_protection.secret_blocks` | Counter | Alert on any | Per block |
| `data_protection.output_leaks` | Counter | 0 | Per leak detected |
| `data_protection.classification_distribution` | Gauge | Track | Per classification |

---

## 5. Security / Compliance Notes

| Control | Implementation |
|---------|----------------|
| **PII handling** | Tokenization preserves referential integrity; redaction for high-risk |
| **Secret handling** | Block processing; never log actual secrets (hash only) |
| **Data residency** | Configurable per deployment (US, EU, etc.) |
| **Audit retention** | 90-day default; configurable per compliance requirement |
| **SOC 2** | Audit logs provide evidence for data handling controls |
| **DCMA/DFARS** | Classified data handling documented |
| **CMMC** | CUI protection patterns supported |
| **GDPR** | PII redaction supports data minimization |

---

## 6. Dependencies & Interfaces

### Depends On

| Component | Dependency Type | Interface |
|-----------|-----------------|-----------|
| Configuration | Startup | Classification levels, custom patterns |
| Audit Storage | Infrastructure | Secure log storage |

### Produces

| Output | Consumer | Format |
|--------|----------|--------|
| Redacted Input | All LLM calls | Sanitized text |
| Token Map | Output restoration | Token → original mapping |
| Audit Events | Compliance systems | Structured audit log |

### Input Schema

```yaml
# DataProtection.process() input
content: string | object    # Raw content to protect
classification: enum        # PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED
context:
  task_id: string
  requester: string (optional)
  purpose: string (optional)
options:
  redact: boolean (default: true)
  tokenize: boolean (default: true for restoration)
  block_on_secret: boolean (default: true)
```

### Output Schema

```yaml
# DataProtectionResult
processed_content: string | object  # Redacted/tokenized content
blocked: boolean                    # True if secret detected and blocked
detections:
  - type: enum (pii | secret)
    category: string (email, phone, ssn, api_key, etc.)
    original_hash: string (SHA256, not actual value)
    token: string (e.g., "[REDACTED_EMAIL_1]")
    location:
      start: integer
      end: integer
token_map:
  "[REDACTED_EMAIL_1]": string (encrypted original, if tokenize=true)
audit_event:
  timestamp: ISO8601
  task_id: string
  classification: string
  action: enum (redacted | blocked | passed)
  detection_count: integer
```

---

## 7. Implementation Notes

### Build Order

1. Implement PII pattern library (regex + NER optional)
2. Implement secret pattern library
3. Implement redaction engine with tokenization
4. Implement output verification
5. Implement audit logging
6. Add custom pattern support
7. Add performance benchmarks
8. Add accuracy testing infrastructure

### Recommended Modules

```
src/forge/protection/
├── __init__.py
├── detector.py          # PII and secret detection
├── redactor.py          # Redaction and tokenization
├── verifier.py          # Output verification
├── audit.py             # Audit logging
├── patterns/
│   ├── __init__.py
│   ├── pii.py           # PII patterns
│   ├── secrets.py       # Secret patterns
│   └── custom.py        # Custom pattern loader
└── classification.py    # Data classification logic
```

### Standard PII Patterns

```python
PII_PATTERNS = {
    'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    'phone_us': r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
    'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
    'credit_card': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
    'ip_address': r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',
}
```

### Secret Patterns

```python
SECRET_PATTERNS = {
    'aws_access_key': r'AKIA[0-9A-Z]{16}',
    'aws_secret_key': r'[A-Za-z0-9/+=]{40}',
    'generic_api_key': r'\b[A-Za-z0-9_-]{32,}\b',  # Heuristic
    'jwt_token': r'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',
    'private_key': r'-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----',
}
```

### Pitfalls to Avoid

- **Don't log actual secrets** - Hash only, never plaintext
- **Don't skip output verification** - LLMs can hallucinate secrets
- **Don't use overly broad patterns** - High false positives frustrate users
- **Don't forget token map encryption** - Token maps are sensitive
- **Don't skip performance testing** - Redaction is on critical path

### Classification Handling

| Level | LLM Processing | Redaction | Logging |
|-------|----------------|-----------|---------|
| PUBLIC | Any LLM | Optional | Minimal |
| INTERNAL | Enterprise LLM only | PII redacted | Standard |
| CONFIDENTIAL | Enterprise LLM, no training | Full redaction | Detailed |
| RESTRICTED | NO LLM processing | N/A | Full audit |

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-17 | Initial specification |

---

*Reference: 00_MASTER_ROADMAP.md for framework context*
