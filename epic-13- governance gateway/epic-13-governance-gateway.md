# Epic 13: Governance Gateway (Agentic SDLC)

**Duration:** 10 days  
**Token Budget:** 60K tokens  
**Status:** Not Started  
**Dependencies:** Epics 1-12 (Foundation through E2E)  
**Owner:** joe@arcfoundry.ai

---

## Epic Goal

Implement the Governance Gateway - a supervisory layer that orchestrates multi-agent workflows with zero-defect authorization, enforcing FORGE policies across the entire software development lifecycle. This epic transforms FORGE from a code generation tool into a governed agentic SDLC platform.

---

## Success Formula Integration

```
Success = (P(Right) × V(Right)) ÷ C(Wrong)

Where for Governance Gateway:
- P(Right) = Probability of compliant output (target: 0.99+)
- V(Right) = Value of automated SDLC (HIGH - productivity gains)
- C(Wrong) = Cost of ungoverned agent actions (CRITICAL - security/compliance risk)
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GOVERNANCE GATEWAY                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌────────────────────┐    ┌──────────────────┐    │
│  │ Lead Agent   │───▶│ Governance Gateway │───▶│ Worker Agent     │    │
│  │ (Planner)    │    │ (Policy Enforcer)  │    │ (Executor)       │    │
│  │              │    │                    │    │                  │    │
│  │ • Decompose  │    │ • 00_CLAUDE.md     │    │ • Sandboxed      │    │
│  │   requirements│   │   Rules            │    │   Execution      │    │
│  │ • Create SLO │    │ • Zero-Defect      │    │ • Convergent     │    │
│  │   budget     │    │   Authorization    │    │   Repair Loop    │    │
│  │ • Plan tasks │    │ • Tool Gating      │    │ • Receipt Gen    │    │
│  └──────────────┘    └────────────────────┘    └──────────────────┘    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     WORKFLOW LANES                                │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │  1. Ticket-to-PR         │ Issue → Code → Tests → PR + Evidence  │   │
│  │  2. Dependency Upgrades  │ Alert → Patch → SBOM Update           │   │
│  │  3. Release Bundles      │ Sprint → DCMA-Ready Artifacts         │   │
│  │  4. Production Incident  │ Alert → RCA → Hotfix → Postmortem     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## User Stories

### US-13.1: Lead Agent (Planner) Implementation
**As a** platform operator  
**I want** a Lead Agent that decomposes requirements into actionable tasks  
**So that** complex work is broken into governed, trackable units

**Story Points:** 8

**Acceptance Criteria:**
- [ ] GG-01: Lead Agent parses incoming requirements (Jira, GitHub Issue, Slack)
- [ ] GG-02: Generates task decomposition with estimated token/cost budgets
- [ ] GG-03: Creates SLO budget per task (default: $5 max, 80K tokens)
- [ ] GG-04: Produces dependency graph for parallel/sequential execution
- [ ] GG-05: Validates task feasibility against available tools and permissions

**Technical Notes:**
```typescript
interface TaskDecomposition {
  task_id: string;
  parent_requirement: string;
  description: string;
  estimated_tokens: number;
  estimated_cost_usd: number;
  slo_budget: {
    max_cost_usd: number;
    max_tokens: number;
    max_duration_minutes: number;
  };
  dependencies: string[];
  required_tools: string[];
  required_permissions: string[];
}
```

---

### US-13.2: Governance Gateway Core
**As a** security officer  
**I want** a central policy enforcement point for all agent actions  
**So that** no agent can bypass security or compliance rules

**Story Points:** 13

**Acceptance Criteria:**
- [ ] GG-06: Gateway loads and enforces 00_CLAUDE.md ruleset
- [ ] GG-07: Implements tool gating with allowlist/denylist per agent role
- [ ] GG-08: Enforces Zero-Defect Authorization (no action without validation)
- [ ] GG-09: Maintains audit log of all authorization decisions
- [ ] GG-10: Supports human-in-the-loop escalation for high-risk actions
- [ ] GG-11: Integrates with CARS framework (Contextual Autonomy with Risk-based Safeguards)

**Tool Gating Matrix:**

| Tool | Lead Agent | Worker Agent | Human Required |
|------|------------|--------------|----------------|
| Read | ✅ | ✅ | ❌ |
| Glob | ✅ | ✅ | ❌ |
| Grep | ✅ | ✅ | ❌ |
| Write | ❌ | ✅ (sandboxed) | If sensitive path |
| Edit | ❌ | ✅ (sandboxed) | If production |
| Bash | ❌ | ✅ (allowlist) | Always |
| HttpPost | ❌ | ✅ (domain allowlist) | External APIs |
| Git Push | ❌ | ✅ | Force push = always |
| Deploy | ❌ | ❌ | Always |

---

### US-13.3: Worker Agent (Executor) Implementation
**As a** developer  
**I want** sandboxed Worker Agents that execute tasks safely  
**So that** code generation happens in isolation with repair capabilities

**Story Points:** 8

**Acceptance Criteria:**
- [ ] GG-12: Worker executes in isolated worktree (git worktree)
- [ ] GG-13: Implements convergent repair loop (max 3 iterations)
- [ ] GG-14: Generates receipt/evidence for each action taken
- [ ] GG-15: Reports progress to Gateway in real-time
- [ ] GG-16: Respects token/cost budget from Lead Agent SLO
- [ ] GG-17: Auto-terminates on budget exhaustion with partial results

**Convergent Repair Loop:**
```
Worker receives task
  │
  ▼
Execute task ──────────────────────┐
  │                                │
  ▼                                │
Run validation (L1/L1.5/L2)        │
  │                                │
  ├── PASS ──▶ Generate receipt    │
  │            Return success      │
  │                                │
  └── FAIL ──▶ Iteration < 3? ────┘
               │
               └── NO ──▶ Escalate to human
                          Return partial + error
```

---

### US-13.4: Ticket-to-PR Workflow
**As a** engineering manager  
**I want** automated ticket-to-PR pipelines  
**So that** routine development tasks are handled without human intervention

**Story Points:** 8

**Acceptance Criteria:**
- [ ] GG-18: Workflow triggers on Jira/GitHub issue assignment
- [ ] GG-19: Lead Agent decomposes issue into implementation tasks
- [ ] GG-20: Worker Agent generates code with tests
- [ ] GG-21: Runs compatibility checks (lint, type-check, unit tests)
- [ ] GG-22: Creates PR with evidence pack attached
- [ ] GG-23: Posts summary to original issue with PR link
- [ ] GG-24: Supports draft PR mode for human review before merge

**Workflow Steps:**
```
1. Issue assigned to "forge-bot" label
2. Lead Agent: Parse issue → Generate task spec
3. Gateway: Validate permissions, allocate budget
4. Worker Agent: Create branch → Generate code → Run tests
5. Gateway: Validate output against acceptance criteria
6. Worker Agent: Create PR with evidence pack
7. Notify: Post to issue, Slack channel
```

---

### US-13.5: Dependency Upgrade Workflow
**As a** security engineer  
**I want** automated dependency patching  
**So that** vulnerabilities are remediated within SLA

**Story Points:** 5

**Acceptance Criteria:**
- [ ] GG-25: Integrates with Snyk/Dependabot/Renovate alerts
- [ ] GG-26: Generates patch for vulnerable dependency
- [ ] GG-27: Runs full test suite after patch
- [ ] GG-28: Updates lockfile and SBOM
- [ ] GG-29: Creates PR with vulnerability details and evidence
- [ ] GG-30: Auto-merges if tests pass and severity < HIGH

---

### US-13.6: Release Evidence Bundle Workflow
**As a** compliance officer  
**I want** automated release evidence generation  
**So that** DCMA/DFARS audit requirements are met

**Story Points:** 5

**Acceptance Criteria:**
- [ ] GG-31: Triggers on sprint completion or release tag
- [ ] GG-32: Aggregates all evidence packs from sprint PRs
- [ ] GG-33: Generates thinking trace timeline (7-year retention)
- [ ] GG-34: Creates SBOM snapshot at release point
- [ ] GG-35: Produces DCMA-ready receipt pack with integrity hashes
- [ ] GG-36: Archives to S3 with compliance tagging

**Evidence Bundle Contents:**
```
release-evidence-v1.2.0/
├── manifest.json              # Bundle metadata + integrity
├── sbom.spdx.json            # Software Bill of Materials
├── thinking-traces/          # All agent reasoning logs
│   ├── task-001.trace.json
│   ├── task-002.trace.json
│   └── ...
├── validation-results/       # L1/L1.5/L2 validation logs
├── test-reports/             # Full test execution logs
├── pr-evidence/              # Per-PR evidence packs
└── signatures/               # Integrity signatures
```

---

### US-13.7: Production Incident Workflow
**As an** SRE  
**I want** automated incident response initiation  
**So that** production issues get immediate attention with audit trail

**Story Points:** 5

**Acceptance Criteria:**
- [ ] GG-37: Triggers on PagerDuty/OpsGenie alert
- [ ] GG-38: Lead Agent performs initial triage (log analysis)
- [ ] GG-39: Generates root cause hypothesis with evidence
- [ ] GG-40: Worker Agent drafts hotfix PR (human approval required)
- [ ] GG-41: Creates postmortem template with timeline
- [ ] GG-42: All actions logged for incident review

---

### US-13.8: Agent Communication Protocol
**As a** system architect  
**I want** standardized agent-to-agent communication  
**So that** workflows are debuggable and auditable

**Story Points:** 5

**Acceptance Criteria:**
- [ ] GG-43: Agents communicate only through Gateway (no direct calls)
- [ ] GG-44: All messages follow AgentMessage schema
- [ ] GG-45: Messages include correlation IDs for tracing
- [ ] GG-46: Gateway logs all inter-agent communication
- [ ] GG-47: Supports async message queuing for long-running tasks

**Agent Message Schema:**
```typescript
interface AgentMessage {
  message_id: string;
  correlation_id: string;
  timestamp: string;
  source_agent: 'lead' | 'gateway' | 'worker';
  target_agent: 'lead' | 'gateway' | 'worker' | 'human';
  message_type: 'task' | 'result' | 'escalation' | 'status';
  payload: {
    task_id?: string;
    status?: 'pending' | 'running' | 'success' | 'failed' | 'escalated';
    data?: any;
    error?: {
      code: string;
      message: string;
      recoverable: boolean;
    };
  };
  metadata: {
    tokens_used: number;
    cost_usd: number;
    duration_ms: number;
  };
}
```

---

### US-13.9: Dashboard & Observability
**As a** platform admin  
**I want** visibility into agent operations  
**So that** I can monitor health and intervene when needed

**Story Points:** 5

**Acceptance Criteria:**
- [ ] GG-48: Real-time workflow status dashboard
- [ ] GG-49: Agent activity feed with filtering
- [ ] GG-50: Budget consumption graphs (tokens, cost, time)
- [ ] GG-51: Escalation queue for human review items
- [ ] GG-52: Historical audit log viewer with search

---

## Technical Architecture

### Package Structure
```
packages/governance-gateway/
├── src/
│   ├── agents/
│   │   ├── lead-agent.ts         # Planner agent
│   │   ├── worker-agent.ts       # Executor agent
│   │   └── agent-base.ts         # Common agent interface
│   ├── gateway/
│   │   ├── gateway.ts            # Core gateway logic
│   │   ├── policy-engine.ts      # 00_CLAUDE.md enforcement
│   │   ├── tool-gating.ts        # Permission checks
│   │   └── audit-logger.ts       # Action logging
│   ├── workflows/
│   │   ├── ticket-to-pr.ts       # Issue → PR workflow
│   │   ├── dependency-upgrade.ts # Security patching
│   │   ├── release-bundle.ts     # Evidence generation
│   │   └── incident-response.ts  # Production incidents
│   ├── schemas/
│   │   ├── task-decomposition.ts
│   │   ├── agent-message.ts
│   │   └── evidence-bundle.ts
│   └── index.ts
├── tests/
│   ├── gateway.test.ts
│   ├── workflows.test.ts
│   └── integration/
├── package.json
└── tsconfig.json
```

### Integration Points

| System | Integration | Purpose |
|--------|-------------|---------|
| Epic 4 | Convergence Engine | Validation in repair loop |
| Epic 8 | Evidence Packs | Receipt generation |
| Epic 9 | Infrastructure | Deployment workflows |
| Epic 10 | Platform UI | Dashboard integration |
| Epic 11 | Integrations | Jira, GitHub, Slack triggers |
| Epic 14 | Accuracy Layer | L1/L1.5/L2 validation |

---

## Verification Script

```bash
#!/bin/bash
echo "🔍 Verifying Epic 13: Governance Gateway"

# Check package exists
[ -d "packages/governance-gateway" ] || { echo "❌ Package missing"; exit 1; }

# Run unit tests
pnpm --filter @forge/governance-gateway test || { echo "❌ Tests failed"; exit 1; }

# Verify gateway starts
pnpm --filter @forge/governance-gateway start:test || { echo "❌ Gateway failed to start"; exit 1; }

# Test tool gating
pnpm --filter @forge/governance-gateway test:tool-gating || { echo "❌ Tool gating tests failed"; exit 1; }

# Test workflow triggers
pnpm --filter @forge/governance-gateway test:workflows || { echo "❌ Workflow tests failed"; exit 1; }

# Verify audit logging
grep -q "audit_log" packages/governance-gateway/src/gateway/audit-logger.ts || {
  echo "❌ Audit logging not implemented"
  exit 1
}

echo "✅ Epic 13 verification complete"
```

---

## Completion Criteria

- [ ] All 52 acceptance criteria (GG-01 through GG-52) passing
- [ ] Unit test coverage > 80%
- [ ] Integration tests for all 4 workflow types
- [ ] Gateway processes 100 requests/minute without degradation
- [ ] Audit log captures all agent actions with correlation IDs
- [ ] Documentation complete (API docs, workflow diagrams)
- [ ] Security review completed for tool gating implementation

---

## Risk Mitigation

| Risk | Mitigation | Owner |
|------|------------|-------|
| Agent escapes sandbox | Filesystem permissions + tool allowlist | Security |
| Budget exhaustion | Hard limits with graceful termination | Gateway |
| Workflow deadlock | Timeout + automatic escalation | SRE |
| Audit log gaps | Write-ahead logging + integrity checks | Compliance |

---

## Notes for Epic 14

**Handoff to Epic 14 (Computational Accuracy Layer):**
- Gateway will invoke L1/L1.5/L2 validators during Worker repair loop
- Evidence packs must include validation receipts
- Wolfram API calls should be gated through Gateway for cost tracking

---

*Last Updated: 2026-01-19*
*Epic 13 of 14 in FORGE B-D Platform*
