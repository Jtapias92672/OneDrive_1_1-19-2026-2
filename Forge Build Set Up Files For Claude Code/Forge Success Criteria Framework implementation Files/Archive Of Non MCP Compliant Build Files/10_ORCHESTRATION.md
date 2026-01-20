# 10_ORCHESTRATION

> **Version:** 1.0.0 | **Status:** Active | **Last Updated:** 2026-01-17

---

## 1. Component Summary

**What it is:** Multi-agent coordination layer that manages specialized agents (Generator, Validator, Critic, Repairer) working in parallel or sequence. Implements patterns like Maker-Checker and parallel validation.

**Why it exists:** Complex validation benefits from agent specialization. A dedicated Critic agent catches issues a Generator misses. Parallel validators reduce latency. Orchestration manages this complexity.

**Boundaries:**
- IN SCOPE: Agent lifecycle, parallel execution, inter-agent communication, resource management, pattern implementation
- OUT OF SCOPE: Individual agent logic (agents are pluggable), LLM API calls (agents handle), convergence decisions (see 05)

**Non-Goals:**
- Does not implement agent internals (provides coordination only)
- Does not make convergence decisions (delegates to Convergence Engine)
- Does not handle data protection (agents use Data Protection layer)

---

## 2. Success Criteria

| ID | Criterion | Testable By |
|----|-----------|-------------|
| OR-01 | Orchestrator MUST support parallel validator execution | Parallel test |
| OR-02 | Orchestrator MUST implement Maker-Checker (Critic-Refiner) pattern | Pattern test |
| OR-03 | Orchestrator MUST manage agent lifecycle (spawn, monitor, terminate) | Lifecycle test |
| OR-04 | Orchestrator MUST handle agent failures gracefully (retry, fallback) | Failure test |
| OR-05 | Orchestrator MUST enforce resource limits per agent (tokens, time) | Resource test |
| OR-06 | Orchestrator MUST support agent result aggregation | Aggregation test |
| OR-07 | Parallel execution MUST reduce latency vs. sequential (≥30% improvement) | Latency test |
| OR-08 | Orchestrator MUST log inter-agent communication for debugging | Logging test |
| OR-09 | Orchestrator MUST support configurable agent pipelines | Config test |
| OR-10 | Orchestrator MUST prevent agent deadlocks | Deadlock test |

---

## 3. Acceptance Tests / Completion Checks

### OR-01: Parallel validator execution

| Aspect | Detail |
|--------|--------|
| **How to verify** | Run 3 validators in parallel, verify concurrent execution via timing |
| **Automated** | Yes - parallel timing test |
| **Evidence** | Total time ≈ max(individual times), not sum |
| **Pass/Fail** | PASS if parallel execution verified; FAIL if sequential |

### OR-02: Maker-Checker pattern

| Aspect | Detail |
|--------|--------|
| **How to verify** | Generator produces output → Critic evaluates → Refiner fixes → verify flow |
| **Automated** | Yes - pattern execution test |
| **Evidence** | Audit log showing Generator → Critic → Refiner sequence |
| **Pass/Fail** | PASS if pattern executed correctly; FAIL if flow broken |

### OR-03: Agent lifecycle management

| Aspect | Detail |
|--------|--------|
| **How to verify** | Spawn agent, verify running, terminate, verify stopped |
| **Automated** | Yes - lifecycle test |
| **Evidence** | Agent state transitions logged |
| **Pass/Fail** | PASS if lifecycle managed; FAIL if zombie agents |

### OR-04: Graceful failure handling

| Aspect | Detail |
|--------|--------|
| **How to verify** | Inject agent failure, verify retry then fallback |
| **Automated** | Yes - failure injection test |
| **Evidence** | Retry attempts logged, fallback invoked |
| **Pass/Fail** | PASS if failure handled; FAIL if crash propagates |

### OR-05: Resource limits enforced

| Aspect | Detail |
|--------|--------|
| **How to verify** | Set token limit, verify agent stopped when exceeded |
| **Automated** | Yes - resource limit test |
| **Evidence** | Agent terminated at limit with error |
| **Pass/Fail** | PASS if limit enforced; FAIL if exceeded |

### OR-06: Result aggregation

| Aspect | Detail |
|--------|--------|
| **How to verify** | 3 validators return results, verify combined result |
| **Automated** | Yes - aggregation test |
| **Evidence** | Combined result contains all validator outputs |
| **Pass/Fail** | PASS if aggregated correctly; FAIL if any lost |

### OR-07: ≥30% latency improvement

| Aspect | Detail |
|--------|--------|
| **How to verify** | Measure parallel vs. sequential execution times |
| **Automated** | Yes - benchmark comparison |
| **Evidence** | Parallel time ≤ 70% of sequential time |
| **Pass/Fail** | PASS if ≥30% improvement; FAIL otherwise |

### OR-08: Inter-agent communication logging

| Aspect | Detail |
|--------|--------|
| **How to verify** | Run agent pipeline, verify all messages logged |
| **Automated** | Yes - log completeness check |
| **Evidence** | Logs contain agent-to-agent messages |
| **Pass/Fail** | PASS if all comms logged; FAIL if gaps |

### OR-09: Configurable pipelines

| Aspect | Detail |
|--------|--------|
| **How to verify** | Define custom pipeline in config, verify execution matches |
| **Automated** | Yes - config-driven test |
| **Evidence** | Pipeline matches configuration |
| **Pass/Fail** | PASS if config respected; FAIL if hardcoded |

### OR-10: Deadlock prevention

| Aspect | Detail |
|--------|--------|
| **How to verify** | Create circular dependency scenario, verify timeout/resolution |
| **Automated** | Yes - deadlock scenario test |
| **Evidence** | Timeout triggered, no hang |
| **Pass/Fail** | PASS if deadlock prevented; FAIL if hangs |

---

## 4. Telemetry & Metrics

| Metric | Type | Target | Collection Method |
|--------|------|--------|-------------------|
| `orchestration.parallel_speedup` | Gauge | ≥ 1.3x | parallel_time / sequential_time |
| `orchestration.agent_failures` | Counter | Minimize | Per failure |
| `orchestration.retry_rate` | Gauge | < 10% | retries / total_calls |
| `orchestration.pipeline_duration_ms` | Histogram | Track | Timer around pipeline |
| `orchestration.agent_utilization` | Gauge | Track | active_time / total_time |

---

## 5. Security / Compliance Notes

| Control | Implementation |
|---------|----------------|
| **Agent isolation** | Agents run in isolated contexts; no shared mutable state |
| **Resource limits** | Hard limits on tokens, time, memory per agent |
| **Communication audit** | All inter-agent messages logged for forensics |
| **No credential sharing** | Each agent has scoped credentials |
| **NIST AI RMF** | Multi-agent patterns support robustness requirements |

---

## 6. Dependencies & Interfaces

### Depends On

| Component | Dependency Type | Interface |
|-----------|-----------------|-----------|
| Convergence Engine (05) | Controller | Orchestrator is invoked by engine |
| Data Protection (09) | Pre-processing | Agents use protected data |
| LLM Providers | External | Agents call LLMs |

### Produces

| Output | Consumer | Format |
|--------|----------|--------|
| Aggregated Results | Convergence Engine (05) | Combined validation results |
| Agent Logs | Observability (11) | Structured agent activity logs |

### Pipeline Configuration Schema

```yaml
# Pipeline configuration
pipeline_id: string
name: string
description: string

stages:
  - stage_id: string
    name: string
    agents:
      - agent_type: enum (generator | validator | critic | refiner)
        config:
          model: string (optional)
          temperature: number (optional)
          max_tokens: integer (optional)
          timeout_ms: integer (optional)
    execution: enum (sequential | parallel)
    aggregation: enum (all | first_success | majority)
    on_failure: enum (retry | fallback | abort)
    retry_config:
      max_retries: integer
      backoff_ms: integer

patterns:
  maker_checker:
    enabled: boolean
    critic_agent: string (agent_id)
    refiner_agent: string (agent_id)
    max_critique_rounds: integer
```

### Agent Interface

```python
class Agent(Protocol):
    """Base agent interface for orchestration."""
    
    agent_id: str
    agent_type: str
    
    async def execute(
        self,
        input: AgentInput,
        context: AgentContext
    ) -> AgentOutput:
        """Execute agent task."""
        ...
    
    async def health_check(self) -> bool:
        """Check agent health."""
        ...
    
    def get_resource_usage(self) -> ResourceUsage:
        """Get current resource consumption."""
        ...
```

---

## 7. Implementation Notes

### Build Order

1. Define Agent interface/protocol
2. Implement Orchestrator core with sequential execution
3. Add parallel execution support (asyncio/threading)
4. Implement Maker-Checker pattern
5. Add failure handling (retry, fallback)
6. Add resource limit enforcement
7. Add result aggregation
8. Add pipeline configuration

### Recommended Modules

```
src/forge/orchestration/
├── __init__.py
├── orchestrator.py      # Main orchestrator class
├── pipeline.py          # Pipeline configuration and execution
├── agents/
│   ├── __init__.py
│   ├── base.py          # Agent interface
│   ├── generator.py     # Generator agent
│   ├── validator.py     # Validator agent (wraps 02-04)
│   ├── critic.py        # Critic agent
│   └── refiner.py       # Refiner agent
├── patterns/
│   ├── __init__.py
│   ├── maker_checker.py # Maker-Checker pattern
│   └── parallel.py      # Parallel execution pattern
├── resources.py         # Resource tracking and limits
└── aggregation.py       # Result aggregation strategies
```

### Maker-Checker Pattern

```
┌─────────────┐         ┌─────────────┐
│  GENERATOR  │ ──────▶ │   CRITIC    │
│  (Maker)    │         │  (Checker)  │
└─────────────┘         └─────────────┘
       ▲                       │
       │                       │ Critique
       │    ┌─────────────┐    │
       └────│  REFINER    │◀───┘
            │             │
            │  Applies    │
            │  critique   │
            └─────────────┘
```

**Implementation:**
1. Generator produces initial output
2. Critic evaluates output, produces critique
3. If critique has issues, Refiner modifies output
4. Repeat until Critic approves or max rounds

### Parallel Validation Pattern

```
                    ┌─────────────────┐
                    │    OUTPUT       │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ STRUCTURAL  │    │  SEMANTIC   │    │ QUALITATIVE │
│ VALIDATOR   │    │  VALIDATOR  │    │  VALIDATOR  │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │ AGGREGATOR  │
                    └─────────────┘
```

### Pitfalls to Avoid

- **Don't share mutable state between agents** - Causes race conditions
- **Don't forget timeouts** - Agents can hang; always set limits
- **Don't ignore partial failures** - Aggregate what succeeded
- **Don't over-parallelize** - API rate limits may throttle
- **Don't skip health checks** - Unhealthy agents waste resources

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-17 | Initial specification |

---

*Reference: 00_MASTER_ROADMAP.md for framework context*
