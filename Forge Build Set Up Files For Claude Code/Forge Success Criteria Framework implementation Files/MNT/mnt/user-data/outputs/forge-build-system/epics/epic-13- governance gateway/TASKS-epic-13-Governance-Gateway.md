# TASKS: Epic 13 - Governance Gateway

> **Epic:** 13 - Governance Gateway (Agentic SDLC)  
> **Duration:** 10 days  
> **Token Budget:** 60K tokens  
> **Owner:** joe@arcfoundry.ai  
> **Status:** Not Started

---

## Success Criteria Alignment

| Component | Criteria IDs | Description |
|-----------|--------------|-------------|
| 10_ORCHESTRATION | OR-01 → OR-10 | Multi-agent coordination |
| 09_DATA_PROTECTION | DP-01 → DP-10 | Sandbox security |
| 11_OBSERVABILITY | OB-01 → OB-11 | Audit logging |
| 12_HUMAN_REVIEW | HR-01 → HR-10 | Escalation gates |

---

## Day 1-2: Lead Agent Implementation

### Task 13.1.1: Lead Agent Base Structure
**Duration:** 2 hours  
**Criteria:** GG-01

```bash
# Create lead agent package structure
mkdir -p packages/governance-gateway/src/agents
touch packages/governance-gateway/src/agents/lead-agent.ts
touch packages/governance-gateway/src/agents/agent-base.ts
```

**Deliverables:**
- [ ] `agent-base.ts` with common interface
- [ ] `lead-agent.ts` skeleton

---

### Task 13.1.2: Requirement Parser
**Duration:** 3 hours  
**Criteria:** GG-01, GG-02

Implement parsing of incoming requirements from:
- Jira issues (via webhook)
- GitHub issues (via webhook)
- Slack messages (via bot)

**Deliverables:**
- [ ] `requirement-parser.ts`
- [ ] Jira issue schema
- [ ] GitHub issue schema
- [ ] Unit tests

---

### Task 13.1.3: Task Decomposition Engine
**Duration:** 4 hours  
**Criteria:** GG-02, GG-03, GG-04

```typescript
// Expected output structure
interface TaskDecomposition {
  task_id: string;
  parent_requirement: string;
  description: string;
  estimated_tokens: number;
  estimated_cost_usd: number;
  slo_budget: SLOBudget;
  dependencies: string[];
  required_tools: string[];
  required_permissions: string[];
}
```

**Deliverables:**
- [ ] `task-decomposer.ts`
- [ ] Dependency graph builder
- [ ] Token estimation logic
- [ ] Unit tests

---

### Task 13.1.4: SLO Budget Calculator
**Duration:** 2 hours  
**Criteria:** GG-03, GG-05

Default SLO budgets:
- Max cost: $5 USD
- Max tokens: 80K
- Max duration: 30 minutes

**Deliverables:**
- [ ] `slo-calculator.ts`
- [ ] Budget configuration schema
- [ ] Feasibility validator

---

## Day 3-4: Governance Gateway Core

### Task 13.2.1: Gateway Service Skeleton
**Duration:** 2 hours  
**Criteria:** GG-06

```bash
# Create gateway package structure
mkdir -p packages/governance-gateway/src/gateway
touch packages/governance-gateway/src/gateway/gateway.ts
touch packages/governance-gateway/src/gateway/policy-engine.ts
```

**Deliverables:**
- [ ] Gateway service class
- [ ] Express/tRPC endpoints
- [ ] Health check endpoint

---

### Task 13.2.2: Policy Engine (00_CLAUDE.md Enforcement)
**Duration:** 4 hours  
**Criteria:** GG-06, GG-07

Load and enforce rules from 00_CLAUDE.md:
- Tool restrictions per role
- Path access controls
- Rate limits
- Cost limits

**Deliverables:**
- [ ] `policy-engine.ts`
- [ ] Policy schema
- [ ] Rule evaluator
- [ ] Unit tests

---

### Task 13.2.3: Tool Gating Implementation
**Duration:** 4 hours  
**Criteria:** GG-07, GG-08

Implement the tool gating matrix:

| Tool | Lead Agent | Worker Agent | Human Required |
|------|------------|--------------|----------------|
| Read | ✅ | ✅ | ❌ |
| Write | ❌ | ✅ (sandboxed) | If sensitive |
| Bash | ❌ | ✅ (allowlist) | Always |
| Deploy | ❌ | ❌ | Always |

**Deliverables:**
- [ ] `tool-gating.ts`
- [ ] Permission matrix config
- [ ] Gating middleware
- [ ] Integration tests

---

### Task 13.2.4: Zero-Defect Authorization
**Duration:** 3 hours  
**Criteria:** GG-08, GG-10

Every action requires:
1. Policy validation
2. Budget check
3. Tool permission check
4. Human approval (if required)

**Deliverables:**
- [ ] `authorization.ts`
- [ ] Pre-action validator
- [ ] Human escalation queue
- [ ] Unit tests

---

### Task 13.2.5: Audit Logger
**Duration:** 3 hours  
**Criteria:** GG-09, OB-01 → OB-05

```typescript
interface AuditEntry {
  timestamp: string;
  correlation_id: string;
  agent: string;
  action: string;
  tool: string;
  decision: 'allowed' | 'denied' | 'escalated';
  reason?: string;
  metadata: Record<string, any>;
}
```

**Deliverables:**
- [ ] `audit-logger.ts`
- [ ] Write-ahead logging
- [ ] Integrity hashing
- [ ] Query interface

---

### Task 13.2.6: CARS Framework Integration
**Duration:** 2 hours  
**Criteria:** GG-11

Integrate with existing CARS (Contextual Autonomy with Risk-based Safeguards):
- Risk level assessment
- Autonomy boundaries
- Approval requirements

**Deliverables:**
- [ ] CARS adapter
- [ ] Risk level enum
- [ ] Autonomy config

---

## Day 5-6: Worker Agent Implementation

### Task 13.3.1: Worker Agent Base
**Duration:** 2 hours  
**Criteria:** GG-12

```bash
touch packages/governance-gateway/src/agents/worker-agent.ts
```

**Deliverables:**
- [ ] Worker agent class
- [ ] Sandbox initialization
- [ ] Gateway communication

---

### Task 13.3.2: Git Worktree Sandbox
**Duration:** 3 hours  
**Criteria:** GG-12, DP-01 → DP-05

```bash
# Worker operates in isolated worktree
git worktree add .forge-worktrees/worker-${task_id} -b forge/task-${task_id}
```

**Deliverables:**
- [ ] Worktree manager
- [ ] Filesystem isolation
- [ ] Cleanup on completion

---

### Task 13.3.3: Convergent Repair Loop
**Duration:** 4 hours  
**Criteria:** GG-13, CE-01 → CE-05

```
Execute → Validate → Pass? → Done
              ↓
           Fail (iteration < 3) → Repair → Execute
              ↓
           Fail (iteration >= 3) → Escalate
```

**Deliverables:**
- [ ] Repair loop controller
- [ ] Iteration tracker
- [ ] Validation integration (Epic 14)
- [ ] Unit tests

---

### Task 13.3.4: Receipt Generation
**Duration:** 3 hours  
**Criteria:** GG-14, EP-01 → EP-05

Every Worker action produces a receipt:

```typescript
interface ActionReceipt {
  receipt_id: string;
  task_id: string;
  action: string;
  input_hash: string;
  output_hash: string;
  validation_results: ValidationResult[];
  tokens_used: number;
  cost_usd: number;
  duration_ms: number;
  timestamp: string;
}
```

**Deliverables:**
- [ ] Receipt generator
- [ ] Evidence pack integration
- [ ] Integrity signing

---

### Task 13.3.5: Budget Enforcement
**Duration:** 2 hours  
**Criteria:** GG-16, GG-17, TM-01 → TM-05

**Deliverables:**
- [ ] Budget tracker
- [ ] Exhaustion handler
- [ ] Partial result packaging

---

## Day 7-8: Workflow Implementation

### Task 13.4.1: Ticket-to-PR Workflow
**Duration:** 4 hours  
**Criteria:** GG-18 → GG-24

```
Issue Assigned → Lead Decomposes → Gateway Authorizes → Worker Executes → PR Created
```

**Deliverables:**
- [ ] `workflows/ticket-to-pr.ts`
- [ ] Issue webhook handler
- [ ] PR creation logic
- [ ] Evidence attachment
- [ ] Integration tests

---

### Task 13.4.2: Dependency Upgrade Workflow
**Duration:** 3 hours  
**Criteria:** GG-25 → GG-30

```
Snyk Alert → Patch Generation → Test Suite → SBOM Update → PR (auto-merge if low severity)
```

**Deliverables:**
- [ ] `workflows/dependency-upgrade.ts`
- [ ] Snyk/Dependabot adapter
- [ ] SBOM updater
- [ ] Auto-merge logic

---

### Task 13.4.3: Release Evidence Bundle Workflow
**Duration:** 3 hours  
**Criteria:** GG-31 → GG-36

```
Sprint Complete → Aggregate Evidence → Generate Bundle → Archive to S3
```

**Deliverables:**
- [ ] `workflows/release-bundle.ts`
- [ ] Evidence aggregator
- [ ] DCMA-ready formatter
- [ ] S3 archiver

---

### Task 13.4.4: Production Incident Workflow
**Duration:** 3 hours  
**Criteria:** GG-37 → GG-42

```
Alert → Triage → Hypothesis → Hotfix Draft → Human Approval → Postmortem
```

**Deliverables:**
- [ ] `workflows/incident-response.ts`
- [ ] PagerDuty adapter
- [ ] RCA template generator
- [ ] Postmortem builder

---

## Day 9: Agent Communication Protocol

### Task 13.5.1: Message Schema
**Duration:** 2 hours  
**Criteria:** GG-43, GG-44

```typescript
interface AgentMessage {
  message_id: string;
  correlation_id: string;
  timestamp: string;
  source_agent: 'lead' | 'gateway' | 'worker';
  target_agent: 'lead' | 'gateway' | 'worker' | 'human';
  message_type: 'task' | 'result' | 'escalation' | 'status';
  payload: any;
  metadata: MessageMetadata;
}
```

**Deliverables:**
- [ ] Message schema
- [ ] Zod validators
- [ ] TypeScript types

---

### Task 13.5.2: Message Router
**Duration:** 3 hours  
**Criteria:** GG-43, GG-45, GG-46

All messages route through Gateway - no direct agent-to-agent calls.

**Deliverables:**
- [ ] Message router
- [ ] Correlation ID generator
- [ ] Message logger
- [ ] Unit tests

---

### Task 13.5.3: Async Message Queue
**Duration:** 3 hours  
**Criteria:** GG-47

For long-running tasks, support async messaging:

**Deliverables:**
- [ ] Queue adapter (Redis/SQS)
- [ ] Message persistence
- [ ] Retry logic

---

## Day 10: Dashboard & Testing

### Task 13.6.1: Workflow Status Dashboard
**Duration:** 3 hours  
**Criteria:** GG-48, GG-49, GG-50

**Deliverables:**
- [ ] Dashboard API endpoints
- [ ] Real-time status feed
- [ ] Budget consumption graphs

---

### Task 13.6.2: Escalation Queue UI
**Duration:** 2 hours  
**Criteria:** GG-51

**Deliverables:**
- [ ] Escalation list endpoint
- [ ] Approve/Reject actions
- [ ] Notification integration

---

### Task 13.6.3: Audit Log Viewer
**Duration:** 2 hours  
**Criteria:** GG-52

**Deliverables:**
- [ ] Audit log query API
- [ ] Search/filter support
- [ ] Export capability

---

### Task 13.6.4: Integration Testing
**Duration:** 4 hours  
**Criteria:** All GG-*

**Deliverables:**
- [ ] Full workflow tests
- [ ] Load tests (100 req/min)
- [ ] Security tests
- [ ] Documentation

---

## Completion Checklist

### Acceptance Criteria Summary

| ID | Description | Status |
|----|-------------|--------|
| GG-01 | Lead Agent parses requirements | ⏳ |
| GG-02 | Task decomposition with budgets | ⏳ |
| GG-03 | SLO budget creation | ⏳ |
| GG-04 | Dependency graph generation | ⏳ |
| GG-05 | Feasibility validation | ⏳ |
| GG-06 | 00_CLAUDE.md enforcement | ⏳ |
| GG-07 | Tool gating matrix | ⏳ |
| GG-08 | Zero-Defect Authorization | ⏳ |
| GG-09 | Audit logging | ⏳ |
| GG-10 | Human escalation | ⏳ |
| GG-11 | CARS integration | ⏳ |
| GG-12 | Worktree sandbox | ⏳ |
| GG-13 | Convergent repair loop | ⏳ |
| GG-14 | Receipt generation | ⏳ |
| GG-15 | Real-time progress | ⏳ |
| GG-16 | Budget respect | ⏳ |
| GG-17 | Auto-terminate on exhaustion | ⏳ |
| GG-18 → GG-24 | Ticket-to-PR workflow | ⏳ |
| GG-25 → GG-30 | Dependency upgrade workflow | ⏳ |
| GG-31 → GG-36 | Release bundle workflow | ⏳ |
| GG-37 → GG-42 | Incident response workflow | ⏳ |
| GG-43 → GG-47 | Agent communication protocol | ⏳ |
| GG-48 → GG-52 | Dashboard & observability | ⏳ |

### Final Verification

```bash
# Run all Epic 13 tests
pnpm --filter @forge/governance-gateway test

# Run integration tests
pnpm --filter @forge/governance-gateway test:integration

# Verify 100 req/min capacity
pnpm --filter @forge/governance-gateway test:load

# Generate coverage report
pnpm --filter @forge/governance-gateway coverage
```

---

## Session Log

*Record your progress here:*

| Date | Task | Status | Notes |
|------|------|--------|-------|
| | | | |

---

*Legend:* ⏳ Pending | 🔄 In Progress | ✅ Complete | ❌ Blocked
