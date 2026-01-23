# Agentic DX Complete

This comprehensive reference combines all six Agentic Developer Experience skills with FULL content.

---

## Part 1: Agentic DX Principles


# Agentic DX Principles Skill

## The Five Principles

Based on Capital One's research on "Developer Experience in the Age of AI Coding Agents"

---

## Principle 1: Writing is Reviewing

> "The human's job isn't to write specs; it's to review and refine what AI drafts."

**Implementation**:
- AI drafts specifications, code, documentation
- Humans review, critique, approve
- Never skip human review for production changes

**Anti-pattern**: Human writes everything while AI just "helps"
**Correct pattern**: AI writes first draft, human refines

**Related skill**: human-review-gates

---

## Principle 2: Deterministic Validation

> "Error messages should be instructions, not complaints."

**Implementation**:
- Every error includes file, line, what's wrong, how to fix
- Errors should enable self-correction
- Validation must be deterministic (same input = same output)

**Anti-pattern**: "Build failed" with no details
**Correct pattern**: Structured errors with actionable fixes

**Related skill**: actionable-errors

---

## Principle 3: Local-First Validation Loops

> "Validation that takes more than 60 seconds breaks flow."

**Implementation**:
- Lint: < 5 seconds
- Type check: < 15 seconds
- Unit tests: < 30 seconds
- Total local validation: < 60 seconds

**Anti-pattern**: "Run full CI to check your change"
**Correct pattern**: Instant local feedback, CI for thoroughness

**Related skill**: local-validation-timing

---

## Principle 4: Documentation as Specification

> "The spec is the contract between intent and implementation."

**Implementation**:
- Write specs before code
- Specs include acceptance criteria
- Implementation is validated against spec

**Anti-pattern**: Code first, document later (or never)
**Correct pattern**: Spec → Review → Implement → Verify

**Related skill**: specification-first

---

## Principle 5: Agent-Ready Codebase

> "The codebase must have an 'external nervous system' that stops agents when they err."

**Implementation**:
- Automated checks catch common AI mistakes
- Slop tests detect AI artifacts
- Verification gates block bad changes
- Self-healing where possible

**Anti-pattern**: Trust AI output implicitly
**Correct pattern**: Trust but verify with automated checks

**Related skills**: slop-tests, verification-protocol, verification-pillars

---

## No-Regrets Investment

These principles are "no-regrets" investments because they:
- Improve developer productivity regardless of AI
- Make codebase maintainable for humans and agents
- Reduce bugs and rework
- Enable faster iteration

---

## Applying the Principles

When starting any task:

1. **Review, don't write from scratch**
   - Let AI draft first
   - Focus human effort on critique and refinement

2. **Ensure validation is actionable**
   - Check that errors include fixes
   - Add structured error handling where missing

3. **Keep feedback fast**
   - If validation > 60s, optimize or parallelize
   - Move slow checks to CI

4. **Spec before implement**
   - Write spec for any non-trivial change
   - Get spec approved before coding

5. **Add automated guardrails**
   - Add slop tests for new patterns
   - Ensure verification covers the change

---

## Integration Points

This meta-skill encompasses:
- human-review-gates
- actionable-errors
- local-validation-timing
- specification-first
- slop-tests
- verification-protocol

---

*These five principles form the foundation of effective AI-assisted development.*

---

## Part 2: Human Review Gates


# Human Review Gates Skill

## Core Principle

> "Writing is Reviewing - The human's job isn't to write specs; it's to review and refine what AI drafts."

AI should never validate its own output. Humans must be in the loop for:
- Code that goes to production
- Decisions that affect customers
- Changes to critical infrastructure

---

## The Anti-Pattern This Prevents

```
❌ WRONG: Agent-Validates-Agent
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Generator   │ ──▶ │  Validator  │ ──▶ │ Production  │
│   Agent     │     │   Agent     │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                    "Looks good!"
                    (AI reviewing AI)

✅ RIGHT: Human-In-The-Loop
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Generator   │ ──▶ │   HUMAN     │ ──▶ │ Production  │
│   Agent     │     │  REVIEWER   │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                    "I verify this is correct"
                    (Human accountability)
```

---

## Gate Types

### Gate 1: Specification Review

**When**: Before implementation begins
**Who**: Product owner or technical lead
**What they review**: AI-generated specifications

```yaml
specification_gate:
  trigger: spec_generated
  reviewer: product_owner
  checklist:
    - Requirements captured correctly?
    - Edge cases considered?
    - Acceptance criteria clear?
    - Dependencies identified?
  outcome: approve | request_changes | reject
```

### Gate 2: Code Review

**When**: After implementation, before merge
**Who**: Senior developer
**What they review**: AI-generated code

```yaml
code_review_gate:
  trigger: pr_created
  reviewer: senior_developer
  checklist:
    - Logic correct?
    - Error handling complete?
    - Tests adequate?
    - No security issues?
    - Performance acceptable?
  outcome: approve | request_changes | reject
```

### Gate 3: Deployment Approval

**When**: Before production deployment
**Who**: Platform admin
**What they review**: Deployment plan

```yaml
deployment_gate:
  trigger: deployment_requested
  reviewer: platform_admin
  checklist:
    - Rollback plan exists?
    - Monitoring in place?
    - On-call notified?
    - Change window appropriate?
  outcome: approve | delay | reject
```

---

## Bypass Prevention

Gates cannot be bypassed by:
- AI claiming urgency
- AI self-approving
- Automated approval bots

```typescript
function validateApproval(approval: Approval): boolean {
  // Approver must be human
  if (approval.approverType !== 'HUMAN') {
    throw new Error('Only humans can approve gates');
  }
  
  // Approver cannot be the generator
  if (approval.approverId === approval.generatorId) {
    throw new Error('Self-approval not permitted');
  }
  
  // Approval must be recent
  if (hoursAgo(approval.timestamp) > 24) {
    throw new Error('Approval expired, re-review required');
  }
  
  return true;
}
```

---

## Escalation Path

If reviewer is unavailable:

```
1. Wait up to 4 hours for primary reviewer
2. Escalate to backup reviewer
3. If critical, escalate to manager with justification
4. Never skip the gate
```

---

## Integration Points

```yaml
integrates_with:
  - cars-framework: "Risk level determines gate requirements"
  - verification-protocol: "Gates are verification checkpoints"
  - deployment-readiness: "Deployment gate is part of readiness"
```

---

*This skill ensures humans remain accountable for AI-assisted decisions.*

---

## Part 3: Human Approval Gates


# Human Approval Gates Skill

## Core Principle

> "High-stakes decisions require explicit human approval."

This skill defines when AI must stop and wait for human approval, regardless of
how confident the AI is in its decision.

---

## Approval Triggers

| Action Category | Risk Level | Approval Required |
|-----------------|------------|-------------------|
| Read-only operations | LOW | No |
| Write to development | LOW | No |
| Write to staging | MEDIUM | Yes (single approver) |
| Write to production | HIGH | Yes (dual approver) |
| Delete any data | HIGH | Yes (dual approver) |
| Change security config | CRITICAL | Yes (security team) |
| Financial transactions | CRITICAL | Yes (finance team) |

---

## Approval Request Format

```typescript
interface ApprovalRequest {
  id: string;
  action: {
    type: string;           // "deploy", "delete", "modify"
    target: string;         // "production/service-x"
    description: string;    // Human-readable description
  };
  risk: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: string[];      // Why this risk level
    mitigations: string[];  // What safeguards exist
  };
  requestor: {
    agent: string;          // Which AI agent
    session: string;        // Session ID
    timestamp: Date;
  };
  rollback: {
    possible: boolean;
    procedure: string;      // How to undo
  };
}
```

---

## Approval Response Format

```typescript
interface ApprovalResponse {
  requestId: string;
  decision: 'APPROVED' | 'DENIED' | 'DEFERRED';
  approver: {
    id: string;
    name: string;
    role: string;
  };
  conditions?: string[];    // "Only during maintenance window"
  expiresAt?: Date;         // Approval expires after X hours
  notes?: string;
}
```

---

## Approval Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPROVAL GATE FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   AI Agent                                                                   │
│      │                                                                       │
│      ▼                                                                       │
│   ┌─────────────────┐                                                       │
│   │ Assess Risk     │                                                       │
│   │ Level           │                                                       │
│   └────────┬────────┘                                                       │
│            │                                                                 │
│            ▼                                                                 │
│   ┌─────────────────┐     LOW          ┌─────────────────┐                 │
│   │ Risk > LOW?     │─────────────────▶│ Proceed         │                 │
│   └────────┬────────┘                  └─────────────────┘                 │
│            │ YES                                                             │
│            ▼                                                                 │
│   ┌─────────────────┐                                                       │
│   │ Create Approval │                                                       │
│   │ Request         │                                                       │
│   └────────┬────────┘                                                       │
│            │                                                                 │
│            ▼                                                                 │
│   ┌─────────────────┐                                                       │
│   │ WAIT for Human  │◀──────────────────────────────────┐                  │
│   │ Response        │                                    │                  │
│   └────────┬────────┘                                    │                  │
│            │                                              │                  │
│            ▼                                              │                  │
│   ┌─────────────────┐                                    │                  │
│   │ Decision?       │                                    │                  │
│   └────────┬────────┘                                    │                  │
│            │                                              │                  │
│     ┌──────┼──────┐                                      │                  │
│     │      │      │                                      │                  │
│     ▼      ▼      ▼                                      │                  │
│  APPROVED DENIED DEFERRED                                │                  │
│     │      │      │                                      │                  │
│     │      │      └──────────────────────────────────────┘                  │
│     │      │                                                                 │
│     │      ▼                                                                 │
│     │   ┌─────────────────┐                                                 │
│     │   │ Log and Abort   │                                                 │
│     │   └─────────────────┘                                                 │
│     ▼                                                                        │
│   ┌─────────────────┐                                                       │
│   │ Execute Action  │                                                       │
│   └─────────────────┘                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration with CARS

This skill extends the CARS framework:

```yaml
cars_integration:
  risk_levels:
    LOW: auto_approve
    MEDIUM: single_human_approval
    HIGH: dual_human_approval
    CRITICAL: security_team_approval
```

---

## Integration Points

```yaml
integrates_with:
  - cars-framework: "Risk assessment determines approval level"
  - human-review-gates: "Reviews are softer than approvals"
  - deployment-readiness: "Production deploys need approval"
```

---

*This skill ensures humans remain in control of high-stakes AI actions.*

---

## Part 4: Actionable Errors


# Actionable Errors Skill

## Core Principle

> "Error messages are instructions, not complaints."

An error that says "Something went wrong" is useless. An error that says "File X, line Y: 
missing import Z, add `import Z from 'module'`" enables immediate correction.

---

## The Problem with Vague Errors

```
❌ VAGUE ERROR (Useless):
"Build failed"

❌ SLIGHTLY BETTER (Still bad):
"TypeScript compilation error"

✅ ACTIONABLE ERROR (Useful):
{
  "file": "src/connector.ts",
  "line": 42,
  "column": 15,
  "error": "Property 'execute' does not exist on type 'Client'",
  "context": "client.execute(query)",
  "suggestion": "Did you mean 'client.query()'? The method was renamed in v2.0",
  "fix": "Replace 'execute' with 'query'",
  "docs": "https://docs.example.com/migration-guide#execute-renamed"
}
```

---

## Actionable Error Schema

```typescript
interface ActionableError {
  // Location
  file: string;           // Full path to file
  line: number;           // Line number (1-indexed)
  column?: number;        // Column number if available
  
  // What's wrong
  error: string;          // Clear description of the problem
  code?: string;          // Error code for lookup
  context?: string;       // The problematic code snippet
  
  // How to fix
  suggestion: string;     // What the user should do
  fix?: string;           // Exact fix if known
  docs?: string;          // Link to documentation
  
  // Severity
  severity: 'error' | 'warning' | 'info';
  blocking: boolean;      // Does this prevent continuation?
  
  // For AI self-correction
  autoFixable: boolean;   // Can AI fix this automatically?
  autoFixAction?: string; // Action to take if autoFixable
}
```

---

## Error Categories

### Syntax Errors
```json
{
  "file": "src/index.ts",
  "line": 15,
  "error": "Unexpected token '}'",
  "context": "if (condition) { doThing() }",
  "suggestion": "Missing semicolon after 'doThing()'",
  "fix": "Add ';' after 'doThing()'",
  "autoFixable": true,
  "autoFixAction": "insert_semicolon"
}
```

### Type Errors
```json
{
  "file": "src/handler.ts",
  "line": 28,
  "error": "Type 'string' is not assignable to type 'number'",
  "context": "const count: number = getData()",
  "suggestion": "getData() returns string, but count expects number",
  "fix": "Either change count type to string, or parse: parseInt(getData())",
  "autoFixable": false
}
```

### Runtime Errors
```json
{
  "file": "src/api.ts",
  "line": 55,
  "error": "Cannot read property 'id' of undefined",
  "context": "const id = response.data.id",
  "suggestion": "response.data is undefined - API call may have failed",
  "fix": "Add null check: const id = response.data?.id",
  "autoFixable": true,
  "autoFixAction": "add_optional_chaining"
}
```

---

## Implementation Pattern

```typescript
function createActionableError(
  raw: Error,
  context: ExecutionContext
): ActionableError {
  // Parse the raw error
  const parsed = parseError(raw);
  
  // Enrich with file/line info
  const location = extractLocation(parsed, context);
  
  // Generate suggestion
  const suggestion = generateSuggestion(parsed);
  
  // Check if auto-fixable
  const autoFix = checkAutoFixable(parsed);
  
  return {
    file: location.file,
    line: location.line,
    column: location.column,
    error: parsed.message,
    code: parsed.code,
    context: getCodeContext(location, 2), // 2 lines of context
    suggestion: suggestion.text,
    fix: suggestion.fix,
    docs: suggestion.docs,
    severity: parsed.severity,
    blocking: parsed.blocking,
    autoFixable: autoFix.possible,
    autoFixAction: autoFix.action
  };
}
```

---

## AI Self-Correction Flow

When AI encounters an actionable error:

```
1. Parse the error structure
2. If autoFixable:
   - Apply the autoFixAction
   - Re-run verification
   - If still failing, escalate to human
3. If not autoFixable:
   - Present error with full context
   - Suggest manual intervention
   - Provide docs link
```

---

## Integration Points

```yaml
integrates_with:
  - verification-protocol: "Errors from verification must be actionable"
  - slop-tests: "Slop detection produces actionable errors"
  - jt1-recovery-protocol: "Recovery uses actionable error info"
```

---

*This skill ensures every error message enables correction, not just complaint.*

---

## Part 5: Local Validation Timing


# Local Validation Timing Skill

## Core Principle

> "Validation that takes more than 60 seconds breaks flow and loses context."

When an AI agent or developer makes a change, they need to know if it worked 
within 60 seconds. Longer waits cause:
- Context loss
- Task switching
- Forgotten assumptions
- Reduced iteration speed

---

## Timing Budgets

| Validation Type | Budget | If Exceeded |
|-----------------|--------|-------------|
| Lint check | 5s | Split files |
| Type check | 15s | Incremental build |
| Unit tests | 30s | Parallelize |
| Integration tests | 60s | Mock external |
| Full build | 90s | Cache aggressively |

---

## Validation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LOCAL VALIDATION PIPELINE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐                │
│   │  Lint   │ ─▶ │  Type   │ ─▶ │  Unit   │ ─▶ │ Slop    │                │
│   │  <5s    │    │  <15s   │    │  <30s   │    │  <10s   │                │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘                │
│                                                                              │
│   Total: Must complete in <60s                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Timing Enforcement

```typescript
interface ValidationTiming {
  step: string;
  budget: number;      // milliseconds
  actual?: number;
  status: 'pending' | 'passed' | 'failed' | 'timeout';
}

async function runValidationWithTiming(
  steps: ValidationStep[]
): Promise<ValidationResult> {
  const timings: ValidationTiming[] = [];
  
  for (const step of steps) {
    const start = Date.now();
    
    try {
      await Promise.race([
        step.run(),
        timeout(step.budget)
      ]);
      
      timings.push({
        step: step.name,
        budget: step.budget,
        actual: Date.now() - start,
        status: 'passed'
      });
    } catch (e) {
      if (e.message === 'TIMEOUT') {
        timings.push({
          step: step.name,
          budget: step.budget,
          actual: step.budget,
          status: 'timeout'
        });
        // Timeout is a failure
        break;
      }
      throw e;
    }
  }
  
  return { timings, totalTime: sum(timings.map(t => t.actual)) };
}
```

---

## When Budget Is Exceeded

### Option 1: Optimize the Step

```yaml
if: lint_exceeds_5s
then:
  - Split into multiple lint configs
  - Lint only changed files
  - Use faster linter
```

### Option 2: Run in Parallel

```yaml
if: tests_exceed_30s
then:
  - Split into parallel workers
  - Run affected tests only
  - Use test sharding
```

### Option 3: Move to CI

```yaml
if: cannot_optimize_locally
then:
  - Move to CI pipeline
  - Run async after commit
  - Block merge, not local dev
```

---

## Budget Tracking Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ LOCAL VALIDATION TIMING                            Run: 47.2s ✓ │
├─────────────────────────────────────────────────────────────────┤
│ Step           │ Budget  │ Actual  │ Status                     │
├────────────────┼─────────┼─────────┼────────────────────────────┤
│ Lint           │   5.0s  │   3.2s  │ ✓ Under budget            │
│ TypeScript     │  15.0s  │  12.8s  │ ✓ Under budget            │
│ Unit Tests     │  30.0s  │  24.1s  │ ✓ Under budget            │
│ Slop Tests     │  10.0s  │   7.1s  │ ✓ Under budget            │
├────────────────┼─────────┼─────────┼────────────────────────────┤
│ TOTAL          │  60.0s  │  47.2s  │ ✓ 12.8s headroom          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

```yaml
integrates_with:
  - verification-protocol: "Timing is part of verification"
  - slop-tests: "Slop tests have own budget"
  - performance-budgets: "Timing is a performance metric"
```

---

*This skill ensures feedback loops stay fast enough for productive iteration.*

---

## Part 6: Specification First


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
