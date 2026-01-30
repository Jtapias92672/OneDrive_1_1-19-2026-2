---
name: writing-clearly
description: Skill for producing concise, direct technical writing. Eliminates AI verbosity in PRs, documentation, commit messages, and code comments. Use when writing technical documentation, PR descriptions, commit messages, code reviews, or any developer-facing text. Enforces spartan, direct output style.
---

# Writing Clearly and Concisely

Transforms verbose AI output into direct, actionable technical writing.

## Core Principle

**Default: Claude is verbose. Override: Be spartan.**

Every word must earn its place. Technical writing is not creative writing.

## When to Use

- Writing commit messages
- Creating PR descriptions
- Writing code comments
- Documentation
- Code review feedback
- Technical specifications
- Error messages

## The Spartan Rules

### 1. Cut Filler Words

```
BAD:  "This function basically takes the user input and then validates it"
GOOD: "Validates user input"

BAD:  "I think we should probably consider implementing caching here"
GOOD: "Implement caching here"

BAD:  "It's worth noting that this approach has some limitations"
GOOD: "Limitations: [list them]"
```

### 2. Active Voice, Imperative Mood

```
BAD:  "The configuration was updated by the system"
GOOD: "System updates configuration"

BAD:  "It would be good if we could add tests"
GOOD: "Add tests"

BAD:  "This PR is introducing a new feature"
GOOD: "Add user authentication"
```

### 3. One Idea Per Sentence

```
BAD:  "This change fixes the bug where users couldn't log in and also
       improves performance by caching the auth token and adds logging"

GOOD: "Fix login bug. Cache auth token. Add logging."
```

### 4. No Throat-Clearing

```
BAD:  "Before we begin, it's important to understand that..."
GOOD: [Just start with the content]

BAD:  "In this document, we will discuss..."
GOOD: [Just discuss it]

BAD:  "Let me explain what this code does..."
GOOD: [Just explain it]
```

## Commit Message Format

```
<type>: <what changed>

[optional body: why it changed]

Types: fix, feat, refactor, docs, test, chore
```

Examples:
```
fix: prevent crash on empty input

feat: add user authentication
- JWT tokens for session management
- Refresh token rotation

refactor: extract validation logic
```

## PR Description Format

```markdown
## What
[One sentence: what this PR does]

## Why
[One sentence: why this change is needed]

## How
[Bullet points: key implementation details]

## Test
[How to verify this works]
```

## Code Comment Rules

```typescript
// BAD: This function is used to calculate the total price of items
//      in the shopping cart by iterating through each item and
//      multiplying quantity by price, then summing everything up

// GOOD: Calculate cart total

// BAD: TODO: We should probably refactor this at some point
//      when we have time because it's getting messy

// GOOD: TODO(#123): Extract into CartCalculator class
```

## Documentation Pattern

```markdown
# Component Name

Brief description (one line).

## Usage

\`\`\`tsx
<Component prop="value" />
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| prop | string | - | What it does |

## Examples

[Show, don't tell]
```

## Anti-Verbosity Checklist

Before submitting any text:

- [ ] Removed "basically", "simply", "just", "really"
- [ ] Removed "I think", "I believe", "probably"
- [ ] Removed "It's worth noting", "It's important to"
- [ ] Removed "In order to" (use "To")
- [ ] Removed "due to the fact that" (use "because")
- [ ] Each sentence has one idea
- [ ] Active voice throughout
- [ ] No introductory fluff
- [ ] No concluding summaries (unless requested)

## Word Substitutions

| Verbose | Concise |
|---------|---------|
| In order to | To |
| Due to the fact that | Because |
| At this point in time | Now |
| In the event that | If |
| Has the ability to | Can |
| Is able to | Can |
| Make a decision | Decide |
| Give consideration to | Consider |
| It is necessary that | Must |
| For the purpose of | For/To |
