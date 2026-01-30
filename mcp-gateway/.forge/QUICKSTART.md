# TRUE-RALPH Quick Start Guide

## What is TRUE-RALPH?

TRUE-RALPH (Task-Routed Unified Loop - Resilient Atomic Loop Protocol for Humans) is a build system designed to prevent context rot in AI-assisted development.

**Key Principles:**
1. **One Task Per Session** - Each Claude session handles exactly one atomic task
2. **Fresh Context** - Every session starts with a clean context, no inherited assumptions
3. **Explicit Progress** - All progress tracked in `progress.md`, never in AI memory
4. **Verification Required** - Tasks must be verified before marked complete

---

## Quick Start (5 Minutes)

### 1. Initialize the System

```bash
cd /path/to/forge-app/mcp-gateway
source .forge/agent-bootstrap.sh
```

You should see:
```
═══════════════════════════════════════════════════════════════════
           TRUE-RALPH Loop Build System Initialized
═══════════════════════════════════════════════════════════════════

Type ralph help for available commands.
```

### 2. Check Status

```bash
ralph status
```

### 3. See Next Task

```bash
ralph task
```

### 4. Start a Task

```bash
ralph start RECOVERY-01.1
```

This will:
- Set the current task
- Create a session log
- Display the task prompt template

### 5. Do the Work

Copy the generated prompt into a **fresh Claude session**.

Complete the task following the prompt instructions.

### 6. Complete the Task

```bash
ralph complete
```

This marks the task complete in `progress.md`.

### 7. Repeat

```bash
ralph task  # See next task
ralph start <next-task-id>
```

---

## Essential Commands

| Command | Description |
|---------|-------------|
| `ralph task` | Show next uncompleted task |
| `ralph progress` | Show overall progress with stats |
| `ralph status` | Show current epic and task |
| `ralph start <id>` | Start working on a task |
| `ralph complete` | Mark current task as done |
| `ralph alignment` | Show Epic ↔ Success Criteria mapping |
| `ralph help` | Show all commands |

---

## The Task Session Workflow

### Starting a Fresh Session

1. Open a **new** Claude session (clear context)
2. Copy the task prompt from `ralph start <task-id>`
3. Paste it into the new session
4. Wait for Claude to load context and confirm understanding

### During the Session

1. Follow the task instructions exactly
2. Make only the changes specified
3. Verify the work against success criteria
4. Update `progress.md` if instructed

### Ending the Session

1. Ensure all changes are saved
2. Run `ralph complete` in your terminal
3. Verify the task is marked `[x]` in `progress.md`
4. **EXIT** - Do not continue with more tasks

---

## Golden Rules

1. **One Task = One Session**
   Never do multiple tasks in a single Claude session.

2. **Never Trust Previous Context**
   Always start fresh. Read files, don't assume.

3. **Verify Before Complete**
   Run tests, check types, confirm against criteria.

4. **Update Progress Immediately**
   After completing, run `ralph complete` right away.

5. **When in Doubt, Exit**
   If confused or context seems stale, exit and start fresh.

---

## Troubleshooting

### "I'm confused about the current state"

Exit the session immediately. Start fresh with:
```bash
ralph status
ralph task
```

### "The task seems too big"

Tasks should be completable in 30-60 minutes. If a task feels too big, it needs to be split. Update `progress.md` to break it into sub-tasks.

### "I made changes but forgot to complete"

Run `ralph complete <task-id>` with the specific task ID to mark it done retroactively.

### "Tests are failing"

Don't mark the task complete. Note the failures, exit the session, and create a follow-up task to fix them.

---

## Next Steps

1. Run `ralph task` to see your next task
2. Read the full documentation in `.forge/README.md`
3. Check the current progress in `.forge/progress.md`
4. Review the task prompt template in `.forge/prompts/task-prompt-template.md`

---

*TRUE-RALPH: Preventing context rot, one task at a time.*
