---
name: domain-memory-pattern
description: Two-agent system for multi-session projects requiring persistence across Claude sessions. Use when projects span multiple days or sessions, need incremental progress tracking, require automated testing and verification, or involve substantial codebases. Implements Initializer/Worker pattern with features.json and progress.md for explicit "definition of done" tracking.
---

# Domain Memory Pattern Skill
## Two-Agent System for Multi-Session Projects

**Version**: 1.0  
**Based on**: "AI Agents That Actually Work" - Anthropic Pattern  
**Applicability**: ANY project requiring persistence across Claude sessions

---

## When to Use This Skill

Use this skill when:
- Projects span multiple days or sessions
- You need Claude to "remember" where you left off
- Complex tasks require incremental progress
- You want automated testing and verification
- Building with Claude Code on substantial codebases

---

## The Two-Agent Pattern

### Agent 1: Initializer (Setup Phase)

**Purpose**: Bootstrap the project's memory structure

**Process**:
1. User provides high-level goal (e.g., "Build a Figma-to-Mendix translator")
2. Initializer expands into structured artifacts:
   - Generates `features.json` with all tasks marked "todo"
   - Creates `progress.md` template
   - Sets up test scaffolding
   - Does NOT write application code

**Outcome**: A structured environment where "definition of done" is explicit and machine-readable.

### Agent 2: Worker (Execution Loop)

**Purpose**: Iteratively complete tasks using Domain Memory

**Process** (each session):
1. **Bootup Ritual**: Read features.json, progress.md, git log
2. **Selection**: Pick ONE failing/todo feature
3. **Implementation**: Write code for that single feature
4. **Verification**: Run test harness (trust output, not opinion)
5. **State Update**: 
   - If PASS: Update features.json status
   - Write summary to progress.md
6. **Commit & Reset**: Git commit, session ends

**Critical Rule**: Memory is "wiped" between sessions, but state preserved in files.

---

## Required Files

### 1. features.json (Task Registry)

```json
{
  "project_name": "Your Project Name",
  "goal": "High-level project objective",
  "last_updated": "YYYY-MM-DD",
  
  "features": [
    {
      "id": "F001",
      "description": "Initialize database connection",
      "acceptance_criteria": "Connection established, health check passes",
      "status": "passing",
      "test_file": "tests/test_database.py",
      "notes": "Uses DATABASE_URL environment variable"
    },
    {
      "id": "F002",
      "description": "Implement user authentication",
      "acceptance_criteria": "Login/logout works, session persists",
      "status": "failing",
      "test_file": "tests/test_auth.py",
      "blockers": ["F001"]
    },
    {
      "id": "F003",
      "description": "Build dashboard UI",
      "acceptance_criteria": "Dashboard renders with user data",
      "status": "todo",
      "test_file": "tests/test_dashboard.py",
      "depends_on": ["F001", "F002"]
    }
  ],
  
  "constraints": [
    "Must use TypeScript",
    "All code must pass linting"
  ]
}
```

**Status Values**:
- `"passing"` - Feature complete and verified
- `"failing"` - Attempted but tests fail
- `"todo"` - Not yet attempted
- `"blocked"` - Cannot proceed due to dependency

### 2. progress.md (Session History)

```markdown
# Project Progress Log

## Run ID: 2025-12-16_001
- **Agent**: Initializer
- **Action**: Created project structure and features.json
- **Status**: SUCCESS

## Run ID: 2025-12-16_002
- **Agent**: Worker
- **Target Feature**: F001 (Database Connection)
- **Changes**: 
  - Created src/database.ts
  - Added connection pooling
- **Test Results**: tests/test_database.py PASSED
- **Outcome**: Updated F001 status to "passing"

## Run ID: 2025-12-16_003
- **Agent**: Worker
- **Target Feature**: F002 (Authentication)
- **Changes**: Added auth middleware
- **Test Results**: tests/test_auth.py FAILED (session not persisting)
- **Outcome**: F002 remains "failing"
- **Note for next run**: Check cookie settings, may need secure flag
```

### 3. BOOTUP-RITUAL.md (Session Protocol)

```markdown
# Bootup Ritual

You are an expert software engineer agent.
Your memory is wiped after every session.
You must rely entirely on the Domain Memory files.

## YOUR BOOTUP SEQUENCE

1. Read features.json - identify next failing/todo feature
2. Read progress.md - review last 3 entries
3. Check git status - verify clean state

## YOUR TASK RULES

- Select ONE single feature to implement
- Write implementation code
- Run the associated test
- IF PASS: Update features.json, log success to progress.md
- IF FAIL: Log failure details to progress.md, DO NOT update status

DO NOT attempt multiple features.
DO NOT hallucinate success - trust test output only.
```

---

## Verification Protocol

### Trust the Test Harness

```
❌ WRONG: "I believe this code is correct"
✅ RIGHT: "The test output shows: PASSED (3/3 assertions)"
```

### Multi-Level Verification

1. **Unit Test**: Does the code work in isolation?
2. **Integration Test**: Does it work with other components?
3. **Artifact Inspection**: Are outputs correct format/structure?

### Failure Protocol

When tests fail:
1. DO NOT update features.json status
2. Capture full error output
3. Log failure with hypothesis in progress.md
4. TERMINATE session - do not attempt fix in same run

---

## Directory Structure

```
your-project/
├── .claude/                    # Domain Memory
│   ├── features.json          # Task registry
│   ├── progress.md            # Session history
│   └── BOOTUP-RITUAL.md       # Protocol
│
├── src/                        # Application code
├── tests/                      # Test files
└── docs/                       # Documentation
```

---

## Session Start Command

Tell Claude Code:
```
Read .claude/BOOTUP-RITUAL.md and follow the protocol.
Select the next failing feature and implement it.
Trust only test harness output for verification.
```

---

## Variations for Other Domains

### Research Agent
- `features.json` → `hypothesis_backlog.json`
- `progress.md` → `experiment_registry.md`
- Status: "proven" | "disproven" | "testing"

### Operations Agent
- `features.json` → `runbook_steps.json` or `ticket_queue.json`
- `progress.md` → `incident_timeline.md`
- Status: "resolved" | "investigating" | "escalated"

### Writing Agent
- `features.json` → `outline_sections.json`
- `progress.md` → `revision_history.md`
- Status: "drafted" | "reviewing" | "final"

---

## Key Insights

1. **"The magic is in the memory schema"** - Structure > volume
2. **"Disciplined engineer, not autocomplete"** - Verification > confidence
3. **One feature per session** - Focus > breadth
4. **Trust test harness** - External validation > self-assessment
5. **Log everything** - Future sessions depend on history

---

*This pattern ensures Claude Code never "forgets" project state across sessions.*
