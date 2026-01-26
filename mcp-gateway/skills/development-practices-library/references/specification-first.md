---
name: specification-first
description: >
  Write specifications before implementation. Documentation as specification means
  AI drafts specs, humans review, then AI implements. Based on Capital One's principle
  that specs prevent misunderstanding and enable validation.
version: 1.0.0
author: ArcFoundry
triggers:
  - "write spec first"
  - "specification before code"
  - "requirements document"
  - "design doc"
---

# Specification-First Skill

## Core Principle

> "Documentation as Specification - The spec is the contract between intent and implementation."

Before writing any code, write a specification that answers:
- What are we building?
- Why are we building it?
- How will we know it's correct?

---

## The Problem This Solves

```
❌ WITHOUT SPEC:
Human: "Build a user authentication system"
AI: *builds something*
Human: "That's not what I wanted"
AI: *rebuilds*
Human: "Still wrong"
[Repeat until frustrated]

✅ WITH SPEC:
Human: "Build a user authentication system"
AI: *writes specification*
Human: "OAuth2 should be the primary method, not secondary"
AI: *updates specification*
Human: "Approved"
AI: *implements exactly what was specified*
Human: "Perfect"
```

---

## Specification Template

```markdown
# Specification: [Feature Name]

## Overview
[One paragraph describing what this feature does]

## Goals
- [ ] Primary goal
- [ ] Secondary goal

## Non-Goals
- [ ] What this explicitly does NOT do

## Requirements

### Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-001 | [Requirement] | P0 | [How to verify] |
| FR-002 | [Requirement] | P1 | [How to verify] |

### Non-Functional Requirements
| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Response time | < 200ms |
| NFR-002 | Availability | 99.9% |

## Design

### Architecture
[Diagram or description of components]

### Data Model
[Schema or entity descriptions]

### API Contracts
[Endpoints, request/response formats]

## Edge Cases
| Case | Expected Behavior |
|------|-------------------|
| [Edge case 1] | [Behavior] |
| [Edge case 2] | [Behavior] |

## Security Considerations
- [ ] Authentication required
- [ ] Authorization checks
- [ ] Data encryption

## Testing Strategy
- Unit tests for: [components]
- Integration tests for: [boundaries]
- E2E tests for: [flows]

## Rollout Plan
1. Deploy to staging
2. Verify acceptance criteria
3. Deploy to production with feature flag
4. Gradual rollout

## Approval
- [ ] Product Owner: [name] - [date]
- [ ] Tech Lead: [name] - [date]
```

---

## Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SPECIFICATION-FIRST WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐                │
│   │  User   │ ─▶ │   AI    │ ─▶ │  Human  │ ─▶ │   AI    │                │
│   │ Request │    │  Drafts │    │ Reviews │    │  Builds │                │
│   │         │    │  Spec   │    │  Spec   │    │  Code   │                │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘                │
│                                      │                                       │
│                          ┌───────────┴───────────┐                          │
│                          │ Approved? │ Changes?  │                          │
│                          └───────────┴───────────┘                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Specification Reviews

Specs must be reviewed for:

```yaml
review_checklist:
  completeness:
    - All requirements captured?
    - Edge cases identified?
    - Acceptance criteria defined?
    
  clarity:
    - Unambiguous language?
    - No conflicting requirements?
    - Examples provided?
    
  feasibility:
    - Technically possible?
    - Within resource constraints?
    - Timeline realistic?
    
  testability:
    - Can each requirement be verified?
    - Test strategy defined?
    - Success metrics clear?
```

---

## Integration Points

```yaml
integrates_with:
  - human-review-gates: "Spec review is a gate"
  - api-contracts: "API specs are contracts"
  - verification-protocol: "Spec enables verification"
```

---

*This skill ensures alignment between intent and implementation before any code is written.*
