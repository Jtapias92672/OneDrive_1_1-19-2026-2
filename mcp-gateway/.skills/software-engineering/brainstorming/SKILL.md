---
name: brainstorming
description: Socratic questioning skill for clarifying intent before implementation. Use BEFORE writing any code when user says "build X", "create Y", or "implement Z". Explores requirements through conversational back-and-forth, surfaces hidden assumptions, and produces validated specifications. Prevents building the wrong thing.
---

# Brainstorming

Clarify intent through Socratic dialogue before writing code.

## Core Principle

**Never jump to implementation. First understand what you're building.**

When a user says "build me X", they have a vision. Your job is to extract that vision through questions, not assumptions.

## When to Activate

Trigger on:
- "Build me a..."
- "Create a..."
- "I want to make..."
- "Let's implement..."
- "Can you help me build..."

## The Brainstorming Flow

### Phase 1: Understand the Goal

Ask ONE question at a time. Wait for response.

```
User: "Build me a todo app"

You: "What's the main problem you're trying to solve with this todo app?
     Is it personal task management, team collaboration, or something else?"

[Wait for response]

You: "Who will be using this? Just you, or will others need access?"

[Wait for response]

You: "What's the one feature that would make this feel 'done' to you?"
```

### Phase 2: Explore Constraints

```
"What platforms need to be supported?"
"Any existing systems this needs to integrate with?"
"What's your timeline for this?"
"Are there any technical constraints I should know about?"
```

### Phase 3: Surface Assumptions

```
"I'm assuming you want [X]. Is that correct?"
"When you say [term], do you mean [interpretation A] or [interpretation B]?"
"Should this handle [edge case], or is that out of scope?"
```

### Phase 4: Present the Design

Present in **200-300 word chunks**. Get validation before continuing.

```markdown
## Core Concept

[2-3 sentences describing what we're building]

Does this match your vision? Any adjustments?

---

## Key Features

1. **Feature A**: [One sentence]
2. **Feature B**: [One sentence]
3. **Feature C**: [One sentence]

Are these the right priorities? Anything missing?

---

## Technical Approach

[Brief description of how we'll build it]

Sound good, or should we explore alternatives?
```

## Question Types

### Clarifying Questions
- "When you say X, do you mean...?"
- "Can you give me an example of...?"
- "What would success look like?"

### Constraint Questions
- "What's the budget/timeline?"
- "Who needs access?"
- "What systems does this touch?"

### Priority Questions
- "If you could only have one feature, which?"
- "What's the MVP vs nice-to-have?"
- "What can we cut if needed?"

### Edge Case Questions
- "What happens when...?"
- "How should we handle...?"
- "What if the user does...?"

## Anti-Patterns to Avoid

| Don't | Do |
|-------|-----|
| Ask 5 questions at once | One question, wait for answer |
| Assume requirements | Ask and confirm |
| Present 1000-word specs | 200-300 word chunks with validation |
| Jump to code | Complete brainstorming first |
| Use jargon | Plain language |

## Output: The Validated Spec

After brainstorming, produce:

```markdown
# [Project Name] Specification

## Problem Statement
[One paragraph: what problem we're solving]

## Target Users
[Who is this for]

## Core Features (MVP)
1. [Feature]: [One sentence description]
2. [Feature]: [One sentence description]
3. [Feature]: [One sentence description]

## Out of Scope (v1)
- [Thing we're not building yet]

## Technical Constraints
- [Platform/integration requirements]

## Success Criteria
- [How we know it's working]

---
Validated with user: [date]
```

## Transition to Implementation

Only after spec is validated:

```
"Great, we have a clear picture of what to build.
Ready to move into implementation planning?"
```

Then hand off to implementation skills (TDD, planning, etc.).
