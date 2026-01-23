---
name: agent-orchestration
description: Define multi-agent work patterns, handoff protocols, conflict resolution, and resource contention management. Use when parallelizing work across multiple AI agents, coordinating agent specializations, preventing resource conflicts, or scaling agent-assisted development. Formalizes agent collaboration for enterprise workflows.
---

# Agent Orchestration Skill

```yaml
skill:
  name: agent-orchestration
  version: 1.0
  priority: P3
  lifecycle_stage:
    - planning
    - development
    - verification
  triggers:
    - Multiple agents working on same codebase
    - Work parallelization opportunity identified
    - Agent handoff between sessions required
    - Resource contention detected
    - "Can we have multiple agents..." question asked
    - Complex task requiring specialized agents
  blocks_without:
    - Agent roles explicitly defined
    - Handoff protocol established
    - Resource locking mechanism in place
    - Conflict resolution procedure documented
  inputs:
    required:
      - Task decomposition
      - Available agent types
      - Shared resources list
    optional:
      - Agent performance history
      - Resource availability
      - Priority rankings
  outputs:
    required:
      - agent-plan.json
      - handoff-log.md
      - Resource lock files
  responsibilities:
    - Agent role assignment
    - Work distribution
    - Handoff coordination
    - Conflict resolution
    - Resource locking
  non_responsibilities:
    - Individual agent behavior (see domain-memory-pattern)
    - Task verification (see verification-protocol)
    - Context management (see context-compaction)
    - File modifications (see safe-modification-protocol)
```

---

## Procedure

### Step 1: Define Agent Topology

```markdown
## Agent Topology Design

### Available Agent Types

| Agent Type | Capabilities | Constraints |
|------------|--------------|-------------|
| Researcher | Read-only, grep, analysis | Cannot modify files |
| Implementer | Write to assigned files | Cannot access unassigned |
| Reviewer | Read-only, verify, report | Cannot modify, can flag |
| Compiler | Context curation only | No implementation |
| Orchestrator | Coordination only | No direct work |

### Topology Patterns

#### Pattern A: Serial Pipeline
```
Researcher → Implementer → Reviewer → Deploy
```
Use when: Sequential dependencies, high-risk changes

#### Pattern B: Parallel Workers
```
         ┌→ Implementer A (Feature 1)
Compiler ├→ Implementer B (Feature 2) → Reviewer → Merge
         └→ Implementer C (Feature 3)
```
Use when: Independent features, time pressure

#### Pattern C: Specialist Swarm
```
         ┌→ Frontend Agent
Architect ├→ Backend Agent  → Integration Agent → Reviewer
         └→ Database Agent
```
Use when: Full-stack features, domain expertise needed

#### Pattern D: Research-Implement Loop
```
Researcher ←→ Implementer ←→ Reviewer
    ↓              ↓            ↓
    └──────── Orchestrator ──────┘
```
Use when: Complex debugging, iterative refinement
```

### Step 2: Generate agent-plan.json

Create `agent-plan.json`:

```json
{
  "schema_version": "1.0",
  "plan_id": "PLAN-2024-001",
  "created": "YYYY-MM-DDTHH:MM:SSZ",
  "objective": "Implement user authentication feature",
  "topology": "parallel_workers",
  
  "agents": [
    {
      "id": "compiler-001",
      "type": "compiler",
      "role": "Context Curator",
      "phase": 1,
      "inputs": ["requirements.md", "existing codebase"],
      "outputs": ["context-package.md"],
      "constraints": {
        "read_paths": ["src/**", "docs/**", "tests/**"],
        "write_paths": [".claude/context_packages/"],
        "max_context_tokens": 50000
      },
      "success_criteria": "Context package created with <100 files referenced"
    },
    {
      "id": "impl-backend-001",
      "type": "implementer",
      "role": "Backend Developer",
      "phase": 2,
      "depends_on": ["compiler-001"],
      "inputs": ["context-package.md"],
      "outputs": ["src/auth/**", "tests/auth/**"],
      "constraints": {
        "read_paths": ["src/**", "docs/**"],
        "write_paths": ["src/auth/**", "tests/auth/**"],
        "forbidden_paths": ["src/frontend/**", "src/database/migrations/**"]
      },
      "success_criteria": "API endpoints implemented, unit tests passing"
    },
    {
      "id": "impl-frontend-001",
      "type": "implementer",
      "role": "Frontend Developer",
      "phase": 2,
      "depends_on": ["compiler-001"],
      "inputs": ["context-package.md"],
      "outputs": ["src/frontend/auth/**"],
      "constraints": {
        "read_paths": ["src/**", "docs/**"],
        "write_paths": ["src/frontend/auth/**", "tests/frontend/auth/**"],
        "forbidden_paths": ["src/backend/**", "src/database/**"]
      },
      "success_criteria": "Auth UI components implemented, component tests passing"
    },
    {
      "id": "reviewer-001",
      "type": "reviewer",
      "role": "Integration Verifier",
      "phase": 3,
      "depends_on": ["impl-backend-001", "impl-frontend-001"],
      "inputs": ["All outputs from phase 2"],
      "outputs": ["review-report.md", "integration-test-results.json"],
      "constraints": {
        "read_paths": ["**"],
        "write_paths": [".claude/reviews/"],
        "can_flag": true,
        "can_modify": false
      },
      "success_criteria": "Integration tests pass, no blocking issues"
    }
  ],
  
  "resources": {
    "shared": [
      {
        "resource": "features.json",
        "lock_type": "write_exclusive",
        "owner": "orchestrator"
      },
      {
        "resource": "progress.md",
        "lock_type": "append_only",
        "owner": null
      }
    ],
    "partitioned": [
      {
        "resource": "src/auth/",
        "owner": "impl-backend-001",
        "lock_type": "write_exclusive"
      },
      {
        "resource": "src/frontend/auth/",
        "owner": "impl-frontend-001",
        "lock_type": "write_exclusive"
      }
    ]
  },
  
  "handoff_protocol": {
    "format": "structured_json",
    "required_fields": ["completed_tasks", "output_files", "blocking_issues", "next_agent"],
    "validation": "schema_check"
  },
  
  "conflict_resolution": {
    "file_conflict": "orchestrator_decides",
    "priority_conflict": "phase_order",
    "resource_contention": "queue_fifo"
  },
  
  "termination_conditions": {
    "success": "All agents complete with success_criteria met",
    "failure": "Any agent fails 3 times on same task",
    "timeout": "48 hours from plan start"
  }
}
```

### Step 3: Implement Resource Locking

Create lock files for shared resources:

```bash
# .claude/locks/features.json.lock
{
  "resource": "features.json",
  "locked_by": "orchestrator",
  "locked_at": "YYYY-MM-DDTHH:MM:SSZ",
  "lock_type": "write_exclusive",
  "expires": "YYYY-MM-DDTHH:MM:SSZ"
}
```

Lock acquisition protocol:

```markdown
## Resource Lock Protocol

### Acquire Lock
1. Check if `.claude/locks/{resource}.lock` exists
2. If exists and not expired:
   - WAIT or QUEUE (based on conflict_resolution)
3. If not exists or expired:
   - Create lock file with agent ID and timestamp
   - Set expiry (default: 30 minutes)
   - Proceed with operation

### Release Lock
1. Verify lock is owned by releasing agent
2. Delete lock file
3. Log release to handoff-log.md

### Lock Expiry
- Locks auto-expire after defined period
- Orchestrator can force-release stale locks
- Expired lock + no agent activity = failed agent recovery

### Deadlock Prevention
- Agents must acquire locks in alphabetical order
- Maximum lock hold time enforced
- Orchestrator monitors for deadlock conditions
```

### Step 4: Handoff Protocol

Update `handoff-log.md` after each agent completes:

```markdown
# Agent Handoff Log

## Session: PLAN-2024-001

---

### Handoff: compiler-001 → [impl-backend-001, impl-frontend-001]
**Timestamp**: YYYY-MM-DDTHH:MM:SSZ
**From Agent**: compiler-001 (Context Curator)
**To Agents**: impl-backend-001, impl-frontend-001

**Completed Tasks**:
- [x] Analyzed authentication requirements
- [x] Identified relevant source files
- [x] Created context package

**Output Files**:
- `.claude/context_packages/AUTH-001.md`

**Context Summary**:
```json
{
  "files_analyzed": 45,
  "files_included": 12,
  "key_patterns": ["JWT auth", "refresh tokens", "RBAC"],
  "constraints_found": ["Must use existing User model", "OAuth optional"]
}
```

**Blocking Issues**: None

**Recommendations for Next Agents**:
- Backend: Start with token service, user model is stable
- Frontend: Auth context pattern exists in src/contexts/

---

### Handoff: impl-backend-001 → reviewer-001
**Timestamp**: YYYY-MM-DDTHH:MM:SSZ
**From Agent**: impl-backend-001 (Backend Developer)
**To Agent**: reviewer-001

**Completed Tasks**:
- [x] Implemented /auth/login endpoint
- [x] Implemented /auth/refresh endpoint
- [x] Added JWT validation middleware
- [x] Unit tests passing (12/12)

**Output Files**:
- `src/auth/routes.ts` (new)
- `src/auth/middleware.ts` (new)
- `src/auth/token-service.ts` (new)
- `tests/auth/*.test.ts` (new)

**Test Results**:
```
✓ 12 tests passed
✓ Coverage: 94%
✓ Lint: 0 warnings
```

**Blocking Issues**: None

**Notes for Reviewer**:
- Token expiry is configurable via env
- Rate limiting not implemented (out of scope)

---
```

### Step 5: Conflict Resolution

```markdown
## Conflict Resolution Procedures

### Type 1: File Conflict (Multiple agents want same file)
**Detection**: Lock acquisition fails
**Resolution**:
1. Queue requesting agent
2. Notify orchestrator
3. Orchestrator decides:
   - Serialize access (wait)
   - Reassign to single agent
   - Split file into partitions

### Type 2: Priority Conflict (Agents disagree on order)
**Detection**: Dependency graph violation
**Resolution**:
1. Phase order takes precedence
2. Within phase: Alphabetical agent ID
3. Orchestrator can override with documented reason

### Type 3: Resource Contention (Shared resource exhausted)
**Detection**: Lock timeout or queue overflow
**Resolution**:
1. FIFO queue for access
2. Maximum queue size: 3 agents
3. If queue full: Fail and notify orchestrator
4. Orchestrator can:
   - Pause low-priority agents
   - Provision additional resources
   - Restructure plan

### Type 4: Output Conflict (Agents produce contradictory outputs)
**Detection**: Reviewer identifies inconsistency
**Resolution**:
1. Reviewer flags conflict
2. Orchestrator retrieves both outputs
3. Options:
   - Prefer later timestamp
   - Merge manually
   - Re-run with single agent
4. Document decision in handoff-log.md

### Type 5: Agent Failure (Agent times out or errors)
**Detection**: No heartbeat or explicit error
**Resolution**:
1. Release all locks held by failed agent
2. Log failure to handoff-log.md
3. Options:
   - Retry same agent (max 3 times)
   - Assign to different agent
   - Escalate to human
4. Preserve partial outputs if usable
```

---

## Integration Points

```yaml
integration_points:
  upstream:
    - task-estimation (work decomposition for distribution)
    - architecture-decisions (agent topology decisions)
    - context-compiler (context packages for agents)
  downstream:
    - domain-memory-pattern (each agent uses this)
    - verification-protocol (reviewer agents use this)
    - habitat-isolation (enforces agent constraints)
    - safe-modification-protocol (write agents use this)
```

---

## Verification

```yaml
verification:
  success_criteria:
    - All agents completed their tasks
    - No unresolved conflicts
    - Handoff log complete
    - All locks released
    - Outputs integrate correctly
  failure_modes:
    - Deadlock (agents waiting on each other)
    - Orphaned locks (agent failed without cleanup)
    - Missing handoff (outputs not communicated)
    - Integration failure (agent outputs incompatible)
    - Resource exhaustion (too many concurrent agents)
```

---

## Governance

```yaml
governance:
  approvals_required:
    - Tech Lead (agent plan approval)
    - Security Lead (if agents access sensitive data)
  audit_artifacts:
    - agent-plan.json
    - handoff-log.md
    - Lock history
    - Conflict resolution decisions
```

---

## Rationale

```yaml
rationale:
  why_this_skill_exists: |
    Scaling AI-assisted development requires multiple agents working
    concurrently. Without orchestration, agents conflict, duplicate
    work, or produce incompatible outputs. This skill formalizes
    multi-agent collaboration for enterprise reliability.
  risks_if_missing:
    - Resource conflicts (file corruption)
    - Duplicate work (wasted compute)
    - Integration failures (incompatible outputs)
    - Deadlocks (stuck agents)
    - Unpredictable behavior (race conditions)
```
