---
name: agentic-context-engineering
description: Universal framework for long-running AI agent projects based on Anthropic's 9 Principles of Agentic Context Engineering. Use when building agents that run across multiple sessions, managing context windows critically, requiring reliable self-correcting agent behavior, learning from past failures, or working with Claude Code on complex multi-day tasks. Implements tiered memory, compiled context views, and systematic error recovery patterns.
---

# Agentic Context Engineering Skill
## Universal Framework for Long-Running AI Agent Projects

**Version**: 1.0  
**Based on**: Anthropic's 9 Principles of Agentic Context Engineering  
**Applicability**: ANY Claude Code project requiring multi-session persistence

---

## When to Use This Skill

Use this skill when:
- Building agents that run across multiple sessions
- Context window management is critical
- You need reliable, self-correcting agent behavior
- Projects require learning from past failures
- Working with Claude Code on complex, multi-day tasks

---

## The 9 Principles

### Principle 1: Context as Compiled View, Not Transcript
**Problem**: Blind accumulation of history drowns critical signals  
**Solution**: Compute a fresh, minimal projection of state for each turn

```xml
<context_compiler_instructions>
  <selection_rules>
    1. Static Prefix: Always include system_instructions and agent_rules
    2. Dynamic Context (Current): Include ONLY the current task's requirements
    3. Dynamic Context (Recency): Last 3-5 entries from progress log
    4. Dynamic Context (Artifacts): Titles and paths only, not full contents
  </selection_rules>
</context_compiler_instructions>
```

### Principle 2: Tiered Memory Model
**Problem**: Everything in context = bloated, unfocused agent  
**Solution**: Separate storage from presentation

```xml
<agent_memory_tiers>
  <working_context>
    Transient per-call view. MUST be minimal and high-signal.
    Contains: Current feature, relevant templates, recent progress.
  </working_context>
  
  <session>
    Event logs of all actions this session.
    Format: JSON (tool_call, input, output, timestamp, success)
  </session>
  
  <durable_memory>
    Searchable insights across sessions.
    Location: .claude/heuristics.json
  </durable_memory>
  
  <artifacts>
    Large files passed by handle (path), not content.
    Rule: Anything over 50 lines = artifact
  </artifacts>
</agent_memory_tiers>
```

### Principle 3: Retrieval is an Active Decision
**Problem**: Loading everything upfront causes signal dilution  
**Solution**: Agent actively chooses what to retrieve

```xml
<active_retrieval_rule>
  <default_context>ONLY system_instructions and current user_query</default_context>
  <retrieval_command>
    Before acting, agent MUST issue file_manager:read for necessary context.
    Example: "I need the G-001 template, so I will read section 3.1 only"
  </retrieval_command>
</active_retrieval_rule>
```

### Principle 4: Retrieval Beats Pinning
**Problem**: Permanently pinned memory reduces accuracy as context grows  
**Solution**: Query memory on-demand with relevance ranking

```xml
<memory_query_protocol>
  <query_template>
    <thinking>Determine minimal keywords for relevant retrieval</thinking>
    <search_keywords>[Keywords from thinking]</search_keywords>
    <context_type_filter>Heuristic | Constraint | Past Failure</context_type_filter>
    <max_results>3</max_results>
  </query_template>
</memory_query_protocol>
```

### Principle 5: Schema-Driven Summarization
**Problem**: Naive summarization loses critical decision structures  
**Solution**: Use schemas to preserve semantics

```xml
<session_compaction_schema>
  <event_type>SUCCESS | FAILURE | CRITICAL_DECISION | STRATEGY_UPDATE</event_type>
  <task_id>Feature or task identifier</task_id>
  <outcome_summary>2 sentences max</outcome_summary>
  <preserved_constraint>Key constraint learned</preserved_constraint>
  <causal_link>IF [Condition], THEN [Result]</causal_link>
  <relevant_artifacts>File paths involved</relevant_artifacts>
</session_compaction_schema>
```

### Principle 6: Offload Heavy State to Tools
**Problem**: Large tool outputs bloat context  
**Solution**: Write to disk, pass pointers

```xml
<environment_contract>
  <tool_list>
    - file_manager (read, write, delete): All disk operations
    - shell_executor (run_command): OS/CLI commands
    - artifact_inspector (validate, diff): Verification
  </tool_list>
  
  <artifact_handling_rule>
    Tool output exceeding 50 lines MUST be written to artifact.
    Pass artifact_handle (path), not full content.
  </artifact_handling_rule>
</environment_contract>
```

### Principle 7: Sub-Agents for Isolated Scope
**Problem**: Single agent = cognitive overload on complex tasks  
**Solution**: Delegate with structured communication

```xml
<delegation_artifact>
  <target_agent_scope>VERIFIER | IMPLEMENTER | RESEARCHER</target_agent_scope>
  <task_objective>Specific, narrow objective</task_objective>
  <artifact_dependency>Files needed</artifact_dependency>
  <expected_output_schema>
    <verification_report>
      <passed type="integer">0</passed>
      <failed type="integer">0</failed>
      <log_path type="artifact_handle">path</log_path>
    </verification_report>
  </expected_output_schema>
</delegation_artifact>
```

### Principle 8: Prefix Stability for Caching
**Problem**: Changing prompts = no LLM caching benefit  
**Solution**: Static prefix + dynamic suffix

```xml
<prompt_structure>
  <stable_prefix>
    <!-- NEVER changes - enables caching -->
    <agent_identity>Role and expertise</agent_identity>
    <core_constraints>Immutable rules</core_constraints>
    <memory_tiers>Tier definitions</memory_tiers>
    <tools_available>Tool contracts</tools_available>
  </stable_prefix>
  
  <dynamic_suffix>
    <!-- Changes per session -->
    <current_task>Today's objective</current_task>
    <recent_context>Last 3 progress entries</recent_context>
  </dynamic_suffix>
</prompt_structure>
```

### Principle 9: Strategy Evolution
**Problem**: Static prompts = Version 1 forever  
**Solution**: Agent records new heuristics from experience

```xml
<strategy_update_instruction>
  <trigger>After SUCCESS or FAILURE with new insight</trigger>
  
  <strategy_update_schema>
    <heuristic_id>H_[TaskID]_[NN]</heuristic_id>
    <discovered_date>YYYY-MM-DD</discovered_date>
    <old_belief>Previous assumption</old_belief>
    <new_heuristic>Learned truth</new_heuristic>
    <trigger_condition>When to apply</trigger_condition>
    <evidence>Test/log proving this</evidence>
  </strategy_update_schema>
  
  <storage>Append to .claude/heuristics.json</storage>
</strategy_update_instruction>
```

---

## Self-Correction Pattern

Every implementation should use `<thinking>` blocks:

```xml
<thinking_block>
  <step_by_step_plan>
    1. What is the specific task?
    2. What information do I need to retrieve?
    3. What are the exact changes required?
    4. How will I verify success?
  </step_by_step_plan>
  
  <self_critique>
    - Am I missing dependencies?
    - What assumptions need verification?
    - What edge cases could cause failure?
    - Have previous sessions failed here? Why?
  </self_critique>
  
  <corrected_plan>
    Based on critique, refined approach...
  </corrected_plan>
</thinking_block>
```

---

## Quick Start Template

For any new project, create `.claude/` directory with:

1. **features.json** - Machine-readable task list with status
2. **progress.md** - Session history using compaction schema
3. **heuristics.json** - Learned strategies (starts empty)
4. **BOOTUP-RITUAL.md** - Session initialization protocol

---

## Integration with Claude Code

Tell Claude Code at session start:
```
Read .claude/BOOTUP-RITUAL.md and follow the Agentic Context Engineering principles.
Use <thinking> blocks before any implementation.
Update heuristics.json if you learn something new.
```

---

*This skill implements Anthropic's research on long-running agent effectiveness.*
