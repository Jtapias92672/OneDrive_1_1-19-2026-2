---
name: arcfoundry-development-methodology
description: >
  Core development principles and patterns used at ArcFoundry. Includes the
  Three Truths philosophy, enterprise-grade standards, DCMA/DFARS alignment,
  and systematic approaches to complex technical challenges.
version: 1.0.0
author: ArcFoundry
triggers:
  - "arcfoundry standards"
  - "development methodology"
  - "three truths"
  - "enterprise patterns"
---

# ArcFoundry Development Methodology

## The Three Truths

### Truth 1: Truth Serum Protocol

> "Reality over claims. Evidence over assertions."

- Never claim something works without proof
- Test before reporting success
- Verify external state, don't assume from memory
- If you're not sure, say so

### Truth 2: Eyes Before Hands

> "Understand before changing. Read before writing."

- Read existing code before modifying
- Understand the system before proposing changes
- Check current state before assuming state
- Explore before implementing

### Truth 3: Systematic Over Fast

> "Correct is better than quick. Repeatable beats one-time."

- Build systems, not one-off solutions
- Document patterns for reuse
- Prefer boring technology that works
- Invest in verification infrastructure

---

## Enterprise-Grade Standards

### Code Quality

```yaml
code_quality:
  type_safety:
    - TypeScript strict mode enabled
    - No 'any' types without justification
    - Explicit return types on functions
    
  error_handling:
    - No swallowed errors
    - Structured error types
    - Actionable error messages
    
  testing:
    - Unit tests for business logic
    - Integration tests for boundaries
    - E2E tests for critical paths
    
  documentation:
    - Public APIs documented
    - Complex logic explained
    - Architecture decisions recorded
```

### Defense Contractor Alignment

ArcFoundry maintains standards aligned with:
- DCMA (Defense Contract Management Agency)
- DFARS (Defense Federal Acquisition Regulation Supplement)
- CMMC (Cybersecurity Maturity Model Certification)

```yaml
compliance_alignment:
  access_control:
    - Role-based access
    - Principle of least privilege
    - Audit logging on all actions
    
  data_protection:
    - Encryption at rest
    - Encryption in transit
    - Key rotation policies
    
  audit:
    - All changes traceable
    - Retention policies defined
    - Evidence preservation
```

---

## Baby Steps Approach

Complex problems are solved incrementally:

```
1. Prove the smallest possible thing works
2. Add one element of complexity
3. Verify it still works
4. Repeat until complete
```

**Never**:
- Build the whole thing then test
- Assume components will integrate
- Skip verification between steps

---

## Persistence Philosophy

> "I do not quit."

When facing technical challenges:
- Systematic debugging over random attempts
- Document failures for learning
- Take breaks but don't abandon
- Invoke JT1 Protocol when blocked

---

## Integration Points

```yaml
integrates_with:
  - jt1-recovery-protocol: "Crisis management"
  - verification-protocol: "Proof over claims"
  - safe-modification-protocol: "Systematic changes"
  - lessons-learned: "Capture knowledge"
```

---

*These principles guide all ArcFoundry development work.*
