---
name: long-running-agent-harness
description: Implement effective harnesses for agents working across multiple context windows. Use when building multi-session agent workflows, autonomous coding projects, or any task spanning hours or days. Provides Initializer/Coding agent pattern with feature lists, progress tracking, and incremental verification.
---

# Long-Running Agent Harness

**Source**: Anthropic Engineering - "Effective harnesses for long-running agents" (Nov 2025)

## The Problem

Long-running agents must work in discrete sessions where each new session begins with no memory of what came before. Without proper harness design, agents will:

1. **One-shot attempts**: Try to do too much at once, running out of context mid-implementation
2. **Premature completion**: Declare victory before features actually work
3. **Lost state**: Leave environment in broken/undocumented state
4. **Wasted context**: Spend tokens figuring out what happened previously

## The Solution: Two-Agent Pattern

### 1. Initializer Agent (First Session Only)
Sets up the environment with all context future agents need:
- `init.sh` script to run development server
- `feature_list.json` with comprehensive requirements
- `claude-progress.txt` for session logs
- Initial git commit showing file structure

### 2. Coding Agent (All Subsequent Sessions)
Makes incremental progress while maintaining clean state:
- Reads progress files and git history first
- Works on ONE feature at a time
- Commits with descriptive messages
- Writes progress updates before ending

---

## Initializer Agent Setup

### Feature List File (feature_list.json)

Create comprehensive feature requirements expanding user's prompt:

```json
{
  "features": [
    {
      "id": "F001",
      "category": "functional",
      "priority": 1,
      "description": "User can open a new chat and see welcome state",
      "steps": [
        "Navigate to main interface",
        "Click the 'New Chat' button",
        "Verify a new conversation is created",
        "Check that chat area shows welcome state",
        "Verify conversation appears in sidebar"
      ],
      "passes": false
    },
    {
      "id": "F002",
      "category": "functional",
      "priority": 2,
      "description": "User can type a message and receive AI response",
      "steps": [
        "Open a chat",
        "Type a message in input field",
        "Press enter or click send",
        "Verify message appears in chat",
        "Verify AI response is displayed"
      ],
      "passes": false
    }
  ],
  "metadata": {
    "total_features": 0,
    "passing": 0,
    "failing": 0,
    "last_updated": ""
  }
}
```

**Critical Rule**: Use JSON not Markdown. Models are less likely to inappropriately modify JSON files.

### Progress File (claude-progress.txt)

```markdown
# Claude Progress Log

## Project: [Project Name]
## Started: [Date]

---

### Session 1 - [Date/Time]
**Agent**: Initializer
**Duration**: ~X minutes

#### Completed:
- Set up initial project structure
- Created feature_list.json with N features
- Wrote init.sh script
- Initial git commit

#### Next Steps:
- Begin implementing F001: [description]

---
```

### Init Script (init.sh)

```bash
#!/bin/bash
# init.sh - Start development environment

set -e

echo "Starting development environment..."

# Install dependencies if needed
if [ -f "package.json" ]; then
    npm install
fi

if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
fi

# Start development server
if [ -f "package.json" ]; then
    npm run dev &
    DEV_PID=$!
    echo "Development server started (PID: $DEV_PID)"
fi

# Wait for server to be ready
sleep 5

echo "Environment ready!"
echo "Run basic verification before starting new work."
```

---

## Coding Agent Workflow

### Session Startup Sequence

Every coding agent session MUST begin with:

```
1. Run `pwd` to see working directory
2. Read claude-progress.txt for recent history
3. Read feature_list.json to see what's done/pending
4. Run `git log --oneline -20` to see recent commits
5. Run init.sh to start development server
6. Run basic verification test before new work
```

### Example Session Start

```
[Agent] I'll start by getting my bearings and understanding the current state.

[Tool: bash] pwd
[Tool: read] claude-progress.txt
[Tool: read] feature_list.json
[Tool: bash] git log --oneline -20

[Agent] Let me check if there's an init.sh script to restart the servers.

[Tool: bash] ./init.sh

[Agent] Now let me verify fundamental features still work.

<Runs basic end-to-end test>

[Agent] Core functionality verified. Now reviewing feature list for next priority item.

<Selects ONE feature to implement>
```

### Incremental Progress Rules

| Rule | Why | Implementation |
|------|-----|----------------|
| ONE feature per session | Prevents context exhaustion mid-implementation | Select highest-priority failing feature |
| Test before marking done | Prevents false completion claims | Use actual browser/API testing, not just code review |
| Commit after each feature | Creates recovery points | `git commit -m "F001: [description] - PASSING"` |
| Update progress file | Future agents know what happened | Append session summary |
| Leave clean state | Next agent can start fresh | No half-implemented features, no broken tests |

### Session End Sequence

Before ending ANY session:

```
1. Verify current feature works end-to-end
2. Update feature_list.json (change passes: true if verified)
3. Commit changes with descriptive message
4. Append session summary to claude-progress.txt
5. Note any blockers or next steps
```

---

## Feature Verification

### The Problem with Self-Testing

Agents tend to:
- Mark features complete after writing code (not testing)
- Use unit tests or curl commands instead of E2E tests
- Miss bugs only visible through actual user interaction

### Solution: Browser Automation Testing

For web apps, use Puppeteer MCP or similar:

```javascript
// Example verification test
async function verifyNewChat() {
  await page.goto('http://localhost:3000');
  await page.click('[data-testid="new-chat-button"]');
  await page.waitForSelector('[data-testid="chat-input"]');
  
  // Type and send message
  await page.type('[data-testid="chat-input"]', 'Hello');
  await page.click('[data-testid="send-button"]');
  
  // Wait for response
  await page.waitForSelector('[data-testid="assistant-message"]');
  
  // Verify response exists
  const response = await page.$('[data-testid="assistant-message"]');
  if (!response) throw new Error('No AI response received');
  
  return true;
}
```

### Verification Checklist

Before marking ANY feature as passing:

- [ ] Code compiles/runs without errors
- [ ] Feature works via actual UI (not just API)
- [ ] Edge cases handled (empty input, errors, etc.)
- [ ] No console errors in browser
- [ ] Feature persists after page refresh (if applicable)
- [ ] Previous features still work (regression check)

---

## Failure Modes and Solutions

| Problem | Initializer Agent Solution | Coding Agent Solution |
|---------|---------------------------|----------------------|
| Declares victory too early | Create comprehensive feature_list.json | Read feature list first; only work on failing features |
| Leaves broken state | Set up git repo + progress file | Commit after each feature; update progress file |
| Marks features done prematurely | All features start as `passes: false` | Only mark passing after E2E verification |
| Wastes time figuring out state | Write init.sh and progress file | Read progress + git log at session start |
| Context exhaustion mid-feature | Break down into small features | Work on ONE feature at a time |

---

## Prompt Templates

### Initializer Agent Prompt

```
You are setting up a new project for long-running agent development.

Your task: Create the scaffolding that will enable future agent sessions to make incremental progress.

Required outputs:
1. feature_list.json - Comprehensive list of ALL features needed, each marked passes: false
2. claude-progress.txt - Progress tracking file with initial entry
3. init.sh - Script to start development environment
4. Initial git commit with all setup files

Rules:
- Break the user's request into 50-200 discrete, testable features
- Each feature should be completable in one agent session
- Use JSON for feature list (not Markdown)
- Include verification steps for each feature
- Set up proper git repository

User request: [INSERT USER'S ORIGINAL REQUEST]
```

### Coding Agent Prompt

```
You are continuing work on an ongoing project.

Session startup (REQUIRED):
1. Run pwd to confirm working directory
2. Read claude-progress.txt for recent history
3. Read feature_list.json to see pending work
4. Check git log --oneline -20 for recent commits
5. Run init.sh to start development server
6. Verify basic functionality before new work

Work rules:
- Select ONE failing feature to implement
- Test the feature end-to-end before marking done
- Only change passes: false to passes: true after verification
- NEVER remove or edit feature descriptions
- Commit your work with descriptive message
- Update claude-progress.txt before ending

Session end (REQUIRED):
1. Verify feature works via actual testing
2. Update feature_list.json if feature passes
3. Git commit with message: "F###: [description] - PASSING"
4. Append session summary to claude-progress.txt
5. Note blockers or next priority for next session

It is unacceptable to:
- Mark features as passing without E2E testing
- Remove or modify feature descriptions
- Leave the codebase in a broken state
- Work on multiple features simultaneously
```

---

## Integration with Other Skills

This skill complements:

| Skill | Integration |
|-------|-------------|
| domain-memory-pattern | feature_list.json = features.json; claude-progress.txt = progress.md |
| verification-pillars | Add Pillar 10 checks to verification workflow |
| cars-framework | Assess risk before each feature implementation |
| slop-tests | Run after each feature completion |

---

## Key Insights

> "The core challenge of long-running agents is that they must work in discrete sessions, and each new session begins with no memory of what came before."

> "Inspiration for these practices came from knowing what effective software engineers do every day."

> "It's still essential that the model leaves the environment in a clean state after making a code change."

---

*This skill enables agents to make consistent progress across multiple context windows by mimicking how effective human engineers manage long-running projects.*
