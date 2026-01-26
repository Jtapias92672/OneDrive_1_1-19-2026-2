---
name: habitat-isolation
description: Prevent Reasoning Drift by isolating agent capabilities into read-only and write-only roles. Use when debugging complex issues, making high-risk changes, or when a single agent starts "fixing" unrelated things. Implements the "Little Guy" theory where Agent A (Researcher) has read-only access and Agent B (Coder) has write access only to files identified by Agent A.
---

# Habitat Isolation Skill
## The "Little Guy" Theory for Agent Scope Control

**Problem**: Agents with full access drift to fixing unrelated things
**Solution**: Divide work into isolated "habitats" with specific permissions

---

## The Core Pattern

### Agent A: The Researcher
- **Access**: Read-only
- **Job**: Find the problem, identify exact files/lines
- **Output**: Specific diagnosis with file paths

### Agent B: The Coder  
- **Access**: Write access ONLY to files identified by Agent A
- **Job**: Implement the fix
- **Constraint**: Cannot explore or touch other files

---

## Why Habitat Isolation?

### The Drift Problem

```
Single Agent with Full Access:
1. Asked to fix bug in auth.ts
2. While investigating, notices "issue" in utils.ts
3. Fixes utils.ts (unrequested)
4. utils.ts change breaks something else
5. Investigates new breakage
6. Context grows, agent gets confused
7. Original bug still not fixed
```

### The Isolated Solution

```
Agent A (Researcher - Read Only):
1. Asked to find bug in auth.ts
2. Reads auth.ts, related files
3. Diagnosis: "Bug is in auth.ts:47, incorrect token validation"
4. OUTPUT: {file: "auth.ts", lines: [47-52], issue: "..."}

Agent B (Coder - Limited Write):
1. Receives: "Fix auth.ts lines 47-52"
2. Can ONLY modify auth.ts
3. Makes targeted fix
4. OUTPUT: Modified auth.ts only
```

---

## Implementation Patterns

### Pattern 1: Two-Phase Prompting

```markdown
## PHASE 1: RESEARCH (Read-Only Mode)

You are in READ-ONLY research mode.
You may use: cat, grep, find, head, tail, ls
You may NOT use: echo >, sed -i, any write operation

Task: [Description of problem]

Your output must be a structured diagnosis:
- File(s) containing the issue
- Exact line numbers
- Description of the problem
- DO NOT propose a fix yet

---

## PHASE 2: IMPLEMENTATION (Scoped Write Mode)

You are in SCOPED WRITE mode.
You may ONLY modify: [files from Phase 1 diagnosis]
You may NOT modify: Any other files

Task: Implement fix for [diagnosis from Phase 1]

Constraint: If you discover additional issues in other files,
STOP and report back. Do not fix them.
```

### Pattern 2: Session Handoff

```markdown
# Research Session Output

## Diagnosis Report
**ID**: DIAG-2024-001
**Issue**: [Problem description]
**Root Cause**: [Technical explanation]

## Affected Files (Write Permission Granted)
1. src/auth/token.ts (lines 47-52)
2. src/auth/types.ts (lines 12-15)

## Files Investigated (NO write permission)
- src/utils/logger.ts (read only)
- src/config/auth.ts (read only)

## Implementation Boundary
The following changes are authorized:
- [ ] Fix token validation logic in token.ts
- [ ] Update TokenPayload type in types.ts

The following are OUT OF SCOPE:
- Any changes to logging
- Any changes to configuration
- Any "improvements" noticed during research
```

### Pattern 3: Explicit Constraints in agents.md

```markdown
# agents.md

## Agent Habitat Rules

### Research Mode
When instructed to "investigate" or "find" an issue:
- You are in READ-ONLY mode
- Document findings, do not implement fixes
- Output a Diagnosis Report with exact file:line references

### Implementation Mode  
When instructed to "fix" or "implement":
- You may ONLY modify files explicitly listed
- If you discover additional issues, STOP and report
- Do not refactor, clean up, or improve adjacent code

### Scope Violation Protocol
If you feel the urge to modify a file not in your scope:
1. STOP
2. Document what you wanted to change and why
3. Ask for scope expansion
4. Wait for approval before proceeding
```

---

## Integration with Domain Memory

### Research Phase Output → features.json

```json
{
  "features": [
    {
      "id": "FIX-001",
      "description": "Fix token validation bug",
      "status": "diagnosed",
      "diagnosis": {
        "researcher_session": "2024-12-20_001",
        "root_cause": "Token expiry check uses wrong comparison",
        "affected_files": ["src/auth/token.ts"],
        "affected_lines": {"src/auth/token.ts": [47, 52]},
        "read_only_context": ["src/utils/logger.ts", "src/config/auth.ts"]
      },
      "implementation_scope": {
        "write_allowed": ["src/auth/token.ts"],
        "write_forbidden": ["*"]
      }
    }
  ]
}
```

### Worker Bootup with Scope

```markdown
# BOOTUP-RITUAL.md

## Implementation Session Start

1. Read features.json, find feature with status "diagnosed"
2. Extract `implementation_scope.write_allowed` list
3. **CONSTRAINT**: You may ONLY modify files in write_allowed
4. If you encounter issues in other files:
   - Document in progress.md
   - Mark feature as "blocked_scope_expansion_needed"
   - Do NOT modify forbidden files
```

---

## Practical Commands

### Enforcing Read-Only in Claude Code

```bash
# Create read-only session context
cat << 'CONSTRAINT'
You are operating in READ-ONLY mode for this investigation.

ALLOWED commands: cat, grep, find, head, tail, ls, tree, wc
FORBIDDEN commands: echo >, >>, sed -i, rm, mv, cp (as write), any editor

If you attempt to write, I will reject the command.
Your output: A diagnosis report, not code changes.
CONSTRAINT
```

### Enforcing Scoped Write

```bash
# Create scoped write context
ALLOWED_FILES="src/auth/token.ts src/auth/types.ts"

cat << CONSTRAINT
You are operating in SCOPED WRITE mode.

ALLOWED to modify: $ALLOWED_FILES
FORBIDDEN to modify: Everything else

If you need to change files outside this scope:
1. STOP
2. Explain what you need to change and why
3. Wait for scope expansion approval
CONSTRAINT
```

---

## When to Use Habitat Isolation

| Situation | Use Isolation? | Reason |
|-----------|---------------|--------|
| Simple bug in single file | Optional | Low risk of drift |
| Bug with unclear cause | **YES** | Research first |
| Refactoring across files | **YES** | Scope each file explicitly |
| Security-sensitive change | **YES** | Limit blast radius |
| Agent seems distracted | **YES** | Reset with isolation |
| Context window getting large | **YES** | Isolation reduces scope |

---

## Anti-Pattern Detection

Watch for these signs of Drift:

```
❌ "While I was fixing X, I noticed Y could be improved..."
❌ "I also cleaned up some code in [unrelated file]..."
❌ "I refactored this to be more maintainable..."
❌ "I found some technical debt and addressed it..."
```

Correct responses:

```
✅ "I noticed [issue] in [file] but it's outside my scope. 
    Adding to progress.md for future investigation."
✅ "The fix requires changes to [file] which is not in my 
    write_allowed list. Requesting scope expansion."
```

---

## Quick Reference

```
RESEARCH HABITAT:
├── Can: Read everything
├── Cannot: Write anything
└── Output: Diagnosis with file:line references

IMPLEMENTATION HABITAT:
├── Can: Write to specified files only
├── Cannot: Touch anything else
└── Output: Targeted changes + test results

SCOPE EXPANSION PROTOCOL:
├── Stop current work
├── Document why expansion needed
├── Wait for explicit approval
└── Then proceed with new scope
```

---

*This skill prevents agents from "boiling the ocean" when they should be fixing one thing.*
