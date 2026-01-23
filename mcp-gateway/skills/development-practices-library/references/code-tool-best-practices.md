---
name: code-tool-best-practices
description: Best practices for using AI code tools to prevent unnecessary blocking, wasted time, and unresponsive behavior. Use when working with AI coding assistants to avoid anti-patterns in tool usage, blocking timeouts, background task management, and silent failures. Provides rules for timeout management, communication patterns, and responsive development workflow.
---

# Claude Code Tool Best Practices Skill
## Preventing Common Anti-Patterns in Tool Usage

**Version**: 1.0  
**Applicability**: ANY Claude Code project  
**Problem Solved**: Unnecessary blocking, wasted time, unresponsive behavior

---

## When to Use This Skill

Use this skill when working with Claude Code to prevent:
- Unnecessary waiting on completed tasks
- Blocking timeouts that waste time
- Unresponsive behavior during background operations
- Silent failures without communication

---

## The Core Problem

Claude Code can use tools like `TaskOutput`, `Bash`, and others with blocking behavior. A common anti-pattern:

```
❌ ANTI-PATTERN:
1. Start background task
2. Call TaskOutput with block=true, timeout=30000 (30 seconds)
3. Task finishes in 5 seconds
4. Claude waits 25 more seconds unnecessarily
5. User thinks Claude is stuck/broken
```

---

## Rule 1: Short Timeouts Only

**Never use blocking timeouts longer than 5 seconds.**

| Operation | Max Timeout | Block? |
|-----------|-------------|--------|
| Server check | 5000ms | true |
| File read | 1000ms | true |
| API call | 5000ms | true |
| Build/compile | N/A | false (poll) |
| Long task | N/A | false (poll) |

```
✅ CORRECT:
TaskOutput with timeout: 5000, block: true

❌ WRONG:
TaskOutput with timeout: 30000, block: true
```

---

## Rule 2: Poll Instead of Block for Long Tasks

For any task that might take more than 5 seconds:

```
✅ CORRECT PATTERN:
1. Start task with run_in_background=true
2. Wait 2 seconds
3. Check TaskOutput with block=false
4. If not done, wait 3 more seconds
5. Check again
6. Repeat until done or timeout (with communication)

❌ WRONG PATTERN:
1. Start task with run_in_background=true
2. Call TaskOutput with block=true, timeout=60000
3. Wait silently for 60 seconds
```

---

## Rule 3: Verify Completion Independently

Don't rely solely on TaskOutput. Verify task completion through other means:

**For server restarts:**
```
✅ Check if port is responding (curl localhost:3000)
✅ Check if PID exists
✅ Check log file for "ready" message

❌ Wait for TaskOutput to return
```

**For file operations:**
```
✅ Check if file exists
✅ Read file contents to verify
✅ Check file modification time

❌ Assume success without verification
```

**For builds:**
```
✅ Check for build output directory
✅ Check for error files
✅ Verify artifact exists

❌ Wait for build script to return
```

---

## Rule 4: Communicate During Waits

If you must wait, communicate:

```
✅ CORRECT:
"Starting server restart, will check in 5 seconds..."
[5 seconds later]
"Server started successfully on port 3000"

❌ WRONG:
[30 seconds of silence]
"Done"
```

---

## Rule 5: Fail Fast, Recover Fast

If something isn't working:
- Stop waiting after reasonable timeout
- Report the issue immediately
- Suggest next steps
- Don't silently retry indefinitely

```
✅ CORRECT:
"Server didn't respond after 10 seconds. Checking logs..."
[reads logs]
"Found error: port already in use. Killing existing process..."

❌ WRONG:
[60 seconds of silence while retrying]
"It's not working"
```

---

## Common Scenarios

### Scenario 1: Server Restart
```typescript
// Start restart
Bash({ command: "npm run restart", run_in_background: true })

// Wait briefly
sleep(3000)

// Check if running (don't block on TaskOutput)
Bash({ command: "curl -s localhost:3000/health || echo 'not ready'" })

// If ready, proceed. If not, wait 2 more seconds and check again.
```

### Scenario 2: Build Process
```typescript
// Start build
Bash({ command: "npm run build", run_in_background: true })

// Poll for completion
for (let i = 0; i < 6; i++) {
  sleep(5000)
  const result = TaskOutput({ block: false })
  if (result.completed) break
  console.log(`Build in progress... ${i * 5}s elapsed`)
}
```

### Scenario 3: File Download
```typescript
// Start download
Bash({ command: "curl -O https://...", run_in_background: true })

// Check file exists rather than waiting on curl
while (!fileExists(targetPath)) {
  sleep(2000)
  console.log("Downloading...")
}
```

---

## Anti-Pattern Checklist

Before using any blocking operation, ask:

- [ ] Is my timeout 5 seconds or less?
- [ ] If task might take longer, am I polling instead of blocking?
- [ ] Am I communicating status to the user during waits?
- [ ] Can I verify completion another way (file exists, port responds, etc.)?
- [ ] If this fails, will I know quickly (not after 60 seconds)?

---

## CLAUDE.md Addition

Add this to any project's CLAUDE.md:

```markdown
## Tool Usage Rules

### Blocking Timeouts
- NEVER use block=true with timeout > 5000ms
- For long tasks, use block=false and poll
- Verify completion independently (check port, file, etc.)
- Communicate status during any wait > 3 seconds

### Quick Reference
| Operation | Max Block Timeout |
|-----------|-------------------|
| Server check | 5000ms |
| File op | 1000ms |
| API call | 5000ms |
| Build/Long task | Poll every 5s |
```

---

## Key Principle

**Be responsive, not patient.**

Claude Code should:
- Check quickly and often
- Report status frequently  
- Verify independently
- Fail fast if something's wrong

NOT:
- Wait silently for long timeouts
- Assume tasks are still running
- Block on completed operations
- Leave users wondering what's happening

---

*This skill prevents wasted time and improves Claude Code responsiveness.*
