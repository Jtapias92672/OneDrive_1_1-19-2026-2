---
name: agent-orchestration
description: Guardrails for using MCP servers, agents, and managing token limits. Use when doing multi-file exploration, complex debugging, or any task that could exceed context limits.
---

# Agent Orchestration Skill

## Core Principle

> "Delegate to agents, don't accumulate context. Fresh sessions = peak performance."

## Token Limit Awareness

| Model | Context Window | Safe Working Limit | Action at Limit |
|-------|---------------|-------------------|-----------------|
| Claude | 200k tokens | 150k tokens | Spawn agent or restart |
| Agents | 200k tokens | 100k tokens | Return results, don't chain |

**Signs you're hitting limits:**
- Responses getting slower
- Forgetting earlier context
- Repeating work already done
- Missing obvious patterns

## Agent Usage Rules

### MUST Use Agents For:

| Task | Agent Type | Why |
|------|------------|-----|
| Multi-file exploration | `Explore` | Keeps main context clean |
| Complex debugging | `general-purpose` | Isolated investigation |
| Code search across codebase | `Explore` | Faster, parallel search |
| Verification tasks | `general-purpose` | Fresh context, no bias |

### DO NOT:
- Read 10+ files directly into main context
- Chain multiple complex operations without delegation
- Accumulate search results in main context
- Debug by manually reading file after file

### DO:
- Spawn Explore agent: "Find all files related to X"
- Spawn general-purpose agent: "Investigate why Y is failing"
- Keep main context for orchestration, not accumulation
- Return concise summaries from agents

## Session Restart Protocol

### When to Restart Session:

1. **Token threshold reached** (~150k tokens used)
2. **After completing major milestone** (Epic phase, feature complete)
3. **When responses degrade** (slower, repetitive, missing context)
4. **Before starting unrelated work** (new Epic, different feature)

### Restart Checklist:

```markdown
Before restarting:
- [ ] Commit all changes
- [ ] Update TICKET.md with current state
- [ ] Create handoff summary in CC-RESTART-PROMPT.md
- [ ] Run tests to verify stable state

After restart:
- [ ] Read CLAUDE.md for context
- [ ] Read TICKET.md for current task
- [ ] Read CC-RESTART-PROMPT.md for handoff
- [ ] Verify with quick smoke test
```

## Agent Delegation Patterns

### Pattern 1: Exploration Delegation
```
WRONG (accumulates context):
- Read file A
- Read file B
- Read file C
- Grep for pattern
- Read file D
- ...now context is bloated

RIGHT (delegates exploration):
Task(Explore): "Find all files handling HTML generation,
               trace data flow from input to output,
               return summary of key files and their roles"
```

### Pattern 2: Debugging Delegation
```
WRONG (manual debugging):
- Read orchestrator.ts
- Add console.log
- Read types.ts
- Check parser.ts
- ...context grows with each step

RIGHT (delegated investigation):
Task(general-purpose): "Investigate why Figma parsing freezes.
                        Add logging, run tests, identify root cause.
                        Return: cause, evidence, fix recommendation"
```

### Pattern 3: Verification Delegation
```
WRONG (inline verification):
- Run all tests
- Check coverage
- Review each failure
- ...verification pollutes working context

RIGHT (isolated verification):
Task(general-purpose): "Run Epic 7.5 v2 verification on HTML pipeline.
                        Return: pass/fail status, failures found, fixes needed"
```

## MCP Server Usage

### Check Available Servers
```bash
# In CC, check for MCP configuration
cat .mcp.json 2>/dev/null || echo "No MCP config"
```

### When MCP Servers Exist:
- Use them for file operations
- Use them for code intelligence
- Use them for search/navigation
- Prefer MCP over direct Bash when available

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| "Let me read that file" x10 | Context bloat | Spawn Explore agent |
| Manual grep/read cycles | Slow, pollutes context | Delegate to agent |
| Long debugging sessions | Token exhaustion | Restart after findings |
| Chaining without summary | Lost thread | Summarize, then continue |
| Ignoring degraded performance | Quality drops | Restart session |

## The Golden Rules

1. **One complex task = One agent** (don't chain in main context)
2. **Exploration = Always delegate** (never manually read 5+ files)
3. **150k tokens = Time to restart** (don't push limits)
4. **Agents return summaries** (not raw data)
5. **Fresh context = Peak performance** (restart is not failure)

## Session Handoff Template

```markdown
## Session Handoff - [DATE]

### Completed This Session:
- [x] Task 1
- [x] Task 2

### Current State:
- Tests: PASSING/FAILING
- Build: SUCCESS/FAILED
- Feature: WORKING/BROKEN

### Next Session Must:
1. First priority
2. Second priority

### Key Files Modified:
- path/to/file1.ts - [what changed]
- path/to/file2.ts - [what changed]

### Context Notes:
- Important decision made: [why]
- Gotcha discovered: [what]
```
