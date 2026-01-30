# TRUE-RALPH Loop Build System

## Task-Routed Unified Loop - Resilient Atomic Loop Protocol for Humans

**Version:** 1.0.0
**Created:** 2026-01-23
**Purpose:** Prevent context rot in AI-assisted software development

---

## Table of Contents

1. [Overview](#overview)
2. [The Problem: Context Rot](#the-problem-context-rot)
3. [The Solution: TRUE-RALPH](#the-solution-true-ralph)
4. [Directory Structure](#directory-structure)
5. [Core Concepts](#core-concepts)
6. [Commands Reference](#commands-reference)
7. [Workflow](#workflow)
8. [Task Prompt System](#task-prompt-system)
9. [Progress Tracking](#progress-tracking)
10. [Epic Management](#epic-management)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Overview

TRUE-RALPH is a build orchestration system designed specifically for AI-assisted development projects. It addresses the fundamental challenge of "context rot" - the gradual degradation of implementation quality that occurs when AI assistants accumulate incorrect assumptions over long development sessions.

### Key Features

- **Atomic Task Execution** - Each task is designed to be completable in a single, focused session
- **Explicit State Management** - All progress tracked in files, never in AI memory
- **Fresh Context Protocol** - Every session starts clean, loading only what's needed
- **Success Criteria Alignment** - Every task maps to specific, verifiable criteria
- **Cross-Session Continuity** - Progress persists across any number of sessions

---

## The Problem: Context Rot

### What is Context Rot?

Context rot occurs when AI assistants make incremental errors that compound over time:

1. **Assumption Accumulation** - Each session inherits assumptions from previous ones
2. **Verification Drift** - "It worked before" replaces actual testing
3. **Scope Creep** - Tasks expand beyond original specifications
4. **Documentation Lag** - Code changes faster than documentation
5. **Integration Gaps** - Components that "should work together" don't

### FORGE Case Study

On 2026-01-23, a deep audit of the FORGE project revealed:

| Claimed Confidence | Actual Confidence | Delta |
|--------------------|-------------------|-------|
| 97.4% | 57% | -40.4% |

Key findings:
- JWT validation had **no signature verification**
- Convergence Engine was **100% simulated**
- Infrastructure **could not reach AWS Bedrock**
- 10 P0 critical issues discovered

This happened despite passing tests and clean TypeScript compilation.

---

## The Solution: TRUE-RALPH

TRUE-RALPH prevents context rot through five core principles:

### 1. One Task Per Session

Each Claude session handles exactly one atomic task. No exceptions.

```
Session 1: RECOVERY-01.1 (Add jose library)
Session 2: RECOVERY-01.2 (Implement JWKS fetching)
Session 3: RECOVERY-01.3 (Replace validateToken)
```

### 2. Fresh Context Always

Every session starts by reading current state from files. Never trust "memory" from previous sessions.

```
First action in every session:
Read: .forge/progress.md
Read: [target files for this task]
```

### 3. Explicit Progress Tracking

All progress recorded in `progress.md`. If it's not checked off there, it's not done.

```markdown
- [x] Task RECOVERY-01.1: Add jose library dependency
- [x] Task RECOVERY-01.2: Implement JWKS fetching
- [ ] Task RECOVERY-01.3: Replace validateToken  ← Current
```

### 4. Success Criteria Verification

Every task maps to specific success criteria. Verification is required, not optional.

```
Task: RECOVERY-01.3
Success Criteria: SC-3.6 (JWT signature verification)
Verification: Tests must pass for invalid signatures
```

### 5. Mandatory Exit

After completing a task, the session MUST end. No "while I'm here" additions.

---

## Directory Structure

```
.forge/
├── agent-bootstrap.sh          # Main orchestration script
├── progress.md                 # Cross-session state tracking
├── current-epic.txt            # Current epic identifier
├── current-task.txt            # Current task identifier
├── QUICKSTART.md              # Quick start guide
├── README.md                  # This file
├── epics/                     # Epic-specific directories
│   ├── epic-00/
│   ├── epic-02/
│   ├── epic-03/
│   ├── epic-3.5/
│   ├── epic-3.6/
│   ├── epic-3.7/
│   ├── epic-3.75/
│   ├── epic-04/
│   ├── epic-05/
│   └── ...
├── prompts/
│   └── task-prompt-template.md # Template for task sessions
├── context-packages/          # Packaged context for epic handoffs
└── logs/
    ├── sessions/              # Session logs
    └── errors/                # Error logs
```

---

## Core Concepts

### Task

A task is the smallest unit of work that can be meaningfully completed and verified. Tasks should be:

- **Atomic** - Completable without dependencies on uncommitted work
- **Verifiable** - Has clear success criteria
- **Time-bounded** - Completable in 30-60 minutes
- **Documented** - Fully described in progress.md

### Epic

An epic is a collection of related tasks that together deliver a major feature or capability. Epics should be:

- **Cohesive** - All tasks relate to a single capability
- **Ordered** - Tasks have a logical sequence
- **Gated** - Epic completion requires all tasks done and verified

### Session

A session is a single interaction with an AI assistant. In TRUE-RALPH:

- One session = One task
- Fresh context each session
- Mandatory exit after task completion

### Success Criteria

Success criteria are specific, measurable conditions that must be true for a task/epic to be considered complete. They come from the project specification and are non-negotiable.

---

## Commands Reference

### ralph task

Shows the next uncompleted task from progress.md.

```bash
ralph task
```

Output includes:
- Current epic
- Current task (if set)
- Next 5 uncompleted tasks

### ralph progress

Shows overall progress statistics.

```bash
ralph progress
```

Output includes:
- Total/completed/remaining tasks
- Progress percentage with visual bar
- P0 critical issues summary

### ralph status

Shows current system status.

```bash
ralph status
```

Output includes:
- Project root and FORGE directory
- Current epic and task
- Quick progress summary

### ralph start <task-id>

Starts a task by setting it as current and generating a session prompt.

```bash
ralph start RECOVERY-01.1
```

Actions:
- Sets current task in `current-task.txt`
- Creates session log
- Outputs task prompt template

### ralph complete [task-id]

Marks a task as complete.

```bash
ralph complete           # Completes current task
ralph complete RECOVERY-01.1  # Completes specific task
```

Actions:
- Updates progress.md (changes `[ ]` to `[x]`)
- Clears current task
- Shows next task

### ralph alignment

Shows the mapping between Epics and Success Criteria.

```bash
ralph alignment
```

### ralph verify-criteria

Runs verification checks (TypeScript, tests).

```bash
ralph verify-criteria
```

### ralph set-epic <epic-id>

Sets the current epic.

```bash
ralph set-epic RECOVERY
```

### ralph next-epic

Advances to the next epic after verifying current is complete.

```bash
ralph next-epic
```

---

## Workflow

### Daily Workflow

```
1. source .forge/agent-bootstrap.sh
2. ralph status
3. ralph task
4. ralph start <next-task-id>
5. [Copy prompt to fresh Claude session]
6. [Complete the task]
7. ralph complete
8. Repeat 3-7 until done for the day
```

### Task Session Workflow

```
1. Open NEW Claude session
2. Paste task prompt from ralph start
3. Wait for context loading
4. Execute task (no extras!)
5. Verify against success criteria
6. Update progress.md
7. Confirm and EXIT
```

### Epic Transition Workflow

```
1. Verify all tasks in current epic complete
2. ralph verify-criteria
3. Review epic success criteria
4. ralph next-epic
5. ralph set-epic <new-epic>
6. Continue with new epic's tasks
```

---

## Task Prompt System

The task prompt template (`.forge/prompts/task-prompt-template.md`) generates consistent prompts for every task session.

### Key Sections

1. **Critical Instructions** - DO/DON'T rules for the session
2. **Context Loading** - Files to read before starting
3. **Task Execution** - Step-by-step process
4. **Success Criteria Reference** - What must be true when done
5. **EXIT Protocol** - How to properly end the session

### Customization

For complex tasks, create custom prompts in `.forge/epics/epic-XX/prompts/`.

---

## Progress Tracking

### progress.md Structure

```markdown
# FORGE Build Progress - TRUE-RALPH System

**Started:** 2026-01-23
**Current Status:** CONTEXT ROT RECOVERY
**Overall Confidence:** 57%

## Completed Epics
[Epic summaries with status and issues]

## Recovery Tasks
[Detailed task lists with checkboxes]

## Session Log
[Table of sessions and outcomes]

## Confidence Tracking
[Historical confidence measurements]
```

### Task Status

- `- [ ]` - Not started
- `- [x]` - Completed

### Epic Status Indicators

- ✅ Complete
- ⚠️ Complete with Issues
- 🔴 Critical Issues
- ❓ Needs Audit

---

## Epic Management

### Epic Directories

Each epic has a directory in `.forge/epics/`:

```
.forge/epics/epic-3.6/
├── specification.md    # Epic-specific requirements
├── prompts/           # Custom task prompts
├── context/           # Context files for handoff
└── verification/      # Verification results
```

### Context Packages

When transitioning between epics or handing off to a different developer:

1. Create a context package in `.forge/context-packages/`
2. Include all necessary specification excerpts
3. Document any known issues or gotchas
4. Reference in the next epic's first task

---

## Best Practices

### Do

- ✅ Start every session fresh
- ✅ Read files before modifying them
- ✅ Verify against success criteria
- ✅ Update progress.md immediately
- ✅ Exit after completing your task

### Don't

- ❌ Trust information from "previous sessions"
- ❌ Make changes beyond task scope
- ❌ Skip verification steps
- ❌ Continue to additional tasks
- ❌ Leave progress.md outdated

### Task Size Guidelines

- **Too small**: "Add a semicolon" - Combine with related changes
- **Just right**: "Add jose library and update package.json" - Atomic and verifiable
- **Too large**: "Implement JWT validation" - Split into 5-9 subtasks

---

## Troubleshooting

### "Context seems stale or wrong"

**Symptom**: Files look different than expected, or changes from "before" are missing.

**Solution**: Exit immediately. Start a fresh session. Read current file state.

### "Task is too complex"

**Symptom**: Can't complete in 30-60 minutes, need to make many related changes.

**Solution**: Exit. Update progress.md to split into subtasks. Start with first subtask.

### "Tests are failing unexpectedly"

**Symptom**: Tests that "should pass" don't.

**Solution**: Don't assume. Read the test code. Read the implementation. Find the actual issue. If it's outside task scope, document and exit.

### "I accidentally did extra work"

**Symptom**: Made changes beyond the task scope.

**Solution**: If changes are valuable, create new tasks for them in progress.md. Revert any incomplete changes. Complete only the original task.

### "progress.md seems wrong"

**Symptom**: Tasks marked complete that aren't, or vice versa.

**Solution**: Trust the files, not memory. Audit the actual state. Update progress.md to match reality.

---

## Appendix: Recovery Task Reference

The current FORGE recovery effort has 10 P0 critical issues:

| ID | Issue | Epic | Priority |
|----|-------|------|----------|
| RECOVERY-01 | JWT Signature Verification | 3.6 | P0-1 |
| RECOVERY-02 | Approval Workflow | 3.75 | P0-2 |
| RECOVERY-03 | PII Detection | 3.75 | P0-3 |
| RECOVERY-04 | Secret Detection | 3.75 | P0-4 |
| RECOVERY-05 | Convergence Decision | 04 | P0-5 |
| RECOVERY-06 | Signature Verification | 3.7 | P0-6 |
| RECOVERY-07 | Provenance Verification | 3.7 | P0-7 |
| RECOVERY-08 | Lambda-Bedrock Connectivity | 09 | P0-8 |
| RECOVERY-09 | Security Groups | 09 | P0-9 |
| RECOVERY-10 | Root Terraform Module | 09 | P0-10 |

See `progress.md` for detailed subtasks.

---

*TRUE-RALPH: Because "it worked in the last session" is not a test.*
