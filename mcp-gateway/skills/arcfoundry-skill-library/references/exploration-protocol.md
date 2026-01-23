
# Exploration Protocol Skill

## Core Principle

> "You cannot build what you do not understand."

Before implementing anything, invest time in exploration. This prevents:
- Building the wrong thing
- Misunderstanding constraints
- Missing critical context

---

## When to Use

- Starting a new project
- Entering an unfamiliar codebase
- Facing an ambiguous requirement
- Before any major architectural decision

---

## Exploration Phases

### Phase 1: Orient (15 min)

**Goal**: Understand the landscape

```yaml
orient_checklist:
  - What is the system's purpose?
  - Who are the users/stakeholders?
  - What are the boundaries?
  - What exists already?
  - What are the constraints?
```

### Phase 2: Map (30 min)

**Goal**: Document the territory

```yaml
map_checklist:
  - Draw a system diagram
  - Identify key components
  - Note integration points
  - List dependencies
  - Mark unknown areas
```

### Phase 3: Probe (30 min)

**Goal**: Test assumptions

```yaml
probe_checklist:
  - Run existing code
  - Check logs and outputs
  - Try edge cases
  - Verify documentation accuracy
  - Note surprises
```

### Phase 4: Synthesize (15 min)

**Goal**: Consolidate understanding

```yaml
synthesize_checklist:
  - Summarize key findings
  - List open questions
  - Identify risks
  - Propose next steps
  - Document for future reference
```

---

## Exploration Report Template

```markdown
# Exploration Report: [System/Feature]

## Context
[What are we exploring and why]

## Key Findings
1. [Finding 1]
2. [Finding 2]

## System Map
[Diagram or description]

## Risks Identified
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk] | HIGH | HIGH | [Mitigation] |

## Open Questions
- [ ] Question 1
- [ ] Question 2

## Recommended Approach
[How to proceed based on exploration]
```

---

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Correct Approach |
|--------------|--------------|------------------|
| Skip exploration | Build wrong thing | Always explore first |
| Explore forever | Never ship | Time-box exploration |
| Explore alone | Miss perspectives | Involve stakeholders |

---

*This skill ensures understanding before action.*
