# 06_EVIDENCE_PACK

> **Version:** 1.0.0 | **Status:** Active | **Last Updated:** 2026-01-17

---

## 1. Component Summary

**What it is:** Audit artifact generator that produces a complete, tamper-evident record of the convergence process. Contains validation scores, iteration history, reasoning traces, and timestamps for compliance and debugging.

**Why it exists:** Enterprise deployments require audit trails. Evidence Packs prove that outputs were validated, document how convergence occurred, and provide forensic data for failure analysis. Essential for SOC 2, DCMA/DFARS, and CMMC compliance.

**Boundaries:**
- IN SCOPE: Evidence collection, packaging, integrity verification (hashing), storage, retrieval
- OUT OF SCOPE: Validation logic (collected from 02-04), convergence orchestration (see 05)

**Non-Goals:**
- Does not perform validation (only records results)
- Does not make decisions (only documents)
- Does not modify outputs (read-only recording)

---

## 2. Success Criteria

| ID | Criterion | Testable By |
|----|-----------|-------------|
| EP-01 | Evidence Pack MUST include complete iteration history from Convergence Engine | Content check |
| EP-02 | Evidence Pack MUST include all validation scores per layer per iteration | Score presence check |
| EP-03 | Evidence Pack MUST include reasoning traces from qualitative validation | Trace presence check |
| EP-04 | Evidence Pack MUST include contract version used | Metadata check |
| EP-05 | Evidence Pack MUST include cryptographic hash of final output | Hash presence check |
| EP-06 | Evidence Pack MUST include timestamps (start, end, per-iteration) | Timestamp check |
| EP-07 | Evidence Pack MUST be tamper-evident (signed or hash-chained) | Integrity verification |
| EP-08 | Evidence Pack MUST be serializable to JSON | Serialization test |
| EP-09 | Evidence Pack MUST be retrievable by task_id | Retrieval test |
| EP-10 | Evidence Pack MUST NOT contain raw PII (redacted or tokenized) | Privacy check |

---

## 3. Acceptance Tests / Completion Checks

### EP-01: Complete iteration history

| Aspect | Detail |
|--------|--------|
| **How to verify** | Run 3-iteration convergence, verify Evidence Pack has 3 iteration records |
| **Automated** | Yes - record count check |
| **Evidence** | Evidence Pack with `iterations.length == 3` |
| **Pass/Fail** | PASS if all iterations present; FAIL if any missing |

### EP-02: All validation scores present

| Aspect | Detail |
|--------|--------|
| **How to verify** | Each iteration must have structural, semantic, qualitative scores |
| **Automated** | Yes - field presence check |
| **Evidence** | All iterations have all three score fields |
| **Pass/Fail** | PASS if all scores present; FAIL if any missing |

### EP-03: Reasoning traces included

| Aspect | Detail |
|--------|--------|
| **How to verify** | Qualitative validation reasoning must be captured per criterion |
| **Automated** | Yes - content check |
| **Evidence** | Non-empty reasoning strings in qualitative results |
| **Pass/Fail** | PASS if traces present; FAIL if empty |

### EP-04: Contract version recorded

| Aspect | Detail |
|--------|--------|
| **How to verify** | `evidence_pack.metadata.contract_version` must match contract used |
| **Automated** | Yes - version comparison |
| **Evidence** | Matching version strings |
| **Pass/Fail** | PASS if versions match; FAIL if mismatch or missing |

### EP-05: Output hash included

| Aspect | Detail |
|--------|--------|
| **How to verify** | SHA256 hash of final output must be present and verifiable |
| **Automated** | Yes - hash computation and comparison |
| **Evidence** | Hash matches recomputed hash of output |
| **Pass/Fail** | PASS if hash valid; FAIL if missing or mismatch |

### EP-06: Timestamps present

| Aspect | Detail |
|--------|--------|
| **How to verify** | Check for `started_at`, `completed_at`, and per-iteration timestamps |
| **Automated** | Yes - timestamp presence and validity check |
| **Evidence** | All timestamps present and in ISO8601 format |
| **Pass/Fail** | PASS if all timestamps valid; FAIL if any missing/invalid |

### EP-07: Tamper evidence

| Aspect | Detail |
|--------|--------|
| **How to verify** | Modify one byte of Evidence Pack, verify integrity check fails |
| **Automated** | Yes - tamper detection test |
| **Evidence** | Integrity verification fails after modification |
| **Pass/Fail** | PASS if tamper detected; FAIL if modification undetected |

### EP-08: JSON serializable

| Aspect | Detail |
|--------|--------|
| **How to verify** | Serialize to JSON, deserialize, verify equality |
| **Automated** | Yes - round-trip test |
| **Evidence** | Successful round-trip with no data loss |
| **Pass/Fail** | PASS if round-trip successful; FAIL otherwise |

### EP-09: Retrieval by task_id

| Aspect | Detail |
|--------|--------|
| **How to verify** | Store Evidence Pack, retrieve by task_id, verify match |
| **Automated** | Yes - storage retrieval test |
| **Evidence** | Retrieved pack matches stored pack |
| **Pass/Fail** | PASS if retrieval successful; FAIL if not found or mismatch |

### EP-10: No raw PII

| Aspect | Detail |
|--------|--------|
| **How to verify** | Scan Evidence Pack for PII patterns (email, SSN, phone) |
| **Automated** | Yes - PII scanner |
| **Evidence** | Zero PII pattern matches |
| **Pass/Fail** | PASS if no PII found; FAIL if PII detected |

---

## 4. Telemetry & Metrics

| Metric | Type | Target | Collection Method |
|--------|------|--------|-------------------|
| `evidence.generation_time_ms` | Histogram | P95 < 500ms | Timer around generate() |
| `evidence.pack_size_bytes` | Histogram | Track | Measure serialized size |
| `evidence.storage_success_rate` | Gauge | 100% | storage_success / attempts |
| `evidence.retrieval_latency_ms` | Histogram | P95 < 100ms | Timer around retrieve() |
| `evidence.integrity_failures` | Counter | 0 | Increment on tamper detection |

---

## 5. Security / Compliance Notes

| Control | Implementation |
|---------|----------------|
| **Tamper evidence** | HMAC-SHA256 signature over pack contents |
| **PII redaction** | Evidence Pack runs through PII scanner before storage |
| **Access control** | Evidence retrieval requires task_id + authorization |
| **Retention policy** | Configurable retention (default: 90 days) |
| **Encryption at rest** | Evidence Packs encrypted in storage |
| **SOC 2** | Evidence Packs provide audit trail for all generations |
| **DCMA/DFARS** | Traceability from output to validation evidence |
| **CMMC** | Audit logging requirements satisfied |

---

## 6. Dependencies & Interfaces

### Depends On

| Component | Dependency Type | Interface |
|-----------|-----------------|-----------|
| Convergence Engine (05) | Data source | `ConvergenceResult` with iteration history |
| Data Protection (09) | Pre-processing | PII redaction before storage |
| Storage Backend | Infrastructure | Key-value or document store |

### Produces

| Output | Consumer | Format |
|--------|----------|--------|
| Evidence Pack | Audit systems | `EvidencePack` JSON |
| Integrity Token | Verification | HMAC signature |

### Input Schema

```yaml
# EvidencePackGenerator.generate() input
convergence_result: ConvergenceResult
task_metadata:
  task_id: string (required, unique)
  requester: string (optional, for audit)
  purpose: string (optional)
contract_snapshot:
  contract_id: string
  version: string
  hash: string  # Hash of contract used
```

### Output Schema

```yaml
# EvidencePack
pack_id: string (UUID)
task_id: string (from input)
created_at: ISO8601 timestamp

metadata:
  contract_id: string
  contract_version: string
  contract_hash: string
  requester: string (optional)
  purpose: string (optional)

timing:
  started_at: ISO8601
  completed_at: ISO8601
  total_duration_ms: integer

result:
  status: enum (SUCCESS | STAGNATION | BUDGET_EXHAUSTED | TIMEOUT)
  final_score: number
  passed: boolean
  output_hash: string (SHA256)

iterations:
  - iteration_number: integer
    timestamp: ISO8601
    scores:
      structural: number
      semantic: number
      qualitative: number
      overall: number
    errors:
      - layer: string
        path: string
        message: string
    qualitative_reasoning:
      - criterion: string
        reasoning: string
        score: integer
        confidence: number

budget:
  iterations_used: integer
  iterations_max: integer
  tokens_used: integer
  tokens_max: integer

integrity:
  signature: string (HMAC-SHA256)
  algorithm: "HMAC-SHA256"
  signed_fields: string[] (list of fields included in signature)
```

---

## 7. Implementation Notes

### Build Order

1. Implement `EvidencePack` model with all required fields
2. Implement `EvidencePackGenerator` to collect data
3. Implement integrity signing (HMAC-SHA256)
4. Implement storage backend adapter (pluggable)
5. Implement retrieval by task_id
6. Add PII scanning before storage
7. Add performance benchmarks

### Recommended Modules

```
src/forge/evidence/
├── __init__.py
├── generator.py         # EvidencePackGenerator class
├── models.py            # EvidencePack dataclass
├── integrity.py         # HMAC signing and verification
├── storage/
│   ├── __init__.py
│   ├── base.py          # Storage interface
│   ├── s3.py            # S3 storage adapter
│   ├── postgres.py      # PostgreSQL storage adapter
│   └── local.py         # Local filesystem (dev only)
└── privacy.py           # PII scanner for evidence packs
```

### Integrity Signing

```python
import hmac
import hashlib
import json

def sign_evidence_pack(pack: EvidencePack, secret_key: bytes) -> str:
    """Generate HMAC-SHA256 signature for evidence pack."""
    # Canonicalize fields to sign
    signed_data = {
        'pack_id': pack.pack_id,
        'task_id': pack.task_id,
        'created_at': pack.created_at,
        'output_hash': pack.result.output_hash,
        'final_score': pack.result.final_score,
        'status': pack.result.status,
        'iterations_count': len(pack.iterations),
    }
    
    canonical = json.dumps(signed_data, sort_keys=True)
    signature = hmac.new(
        secret_key,
        canonical.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return signature

def verify_signature(pack: EvidencePack, signature: str, secret_key: bytes) -> bool:
    """Verify evidence pack integrity."""
    expected = sign_evidence_pack(pack, secret_key)
    return hmac.compare_digest(signature, expected)
```

### Pitfalls to Avoid

- **Don't store full output** - Store hash only; output may contain sensitive data
- **Don't skip integrity signing** - Unsigned packs are not audit-worthy
- **Don't include PII in reasoning** - Scan and redact before storage
- **Don't use predictable pack_id** - Use UUIDv4 to prevent enumeration
- **Don't skip timestamp validation** - ISO8601 only; no ambiguous formats

### Storage Considerations

| Backend | Pros | Cons | Use Case |
|---------|------|------|----------|
| S3 | Durable, cheap, scalable | Latency | Production archives |
| PostgreSQL | Queryable, transactional | Schema overhead | When querying needed |
| Local FS | Simple, fast | Not distributed | Development only |

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-17 | Initial specification |

---

*Reference: 00_MASTER_ROADMAP.md for framework context*
