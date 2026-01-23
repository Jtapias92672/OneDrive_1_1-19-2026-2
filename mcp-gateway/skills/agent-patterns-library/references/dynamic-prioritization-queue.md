---
name: dynamic-prioritization-queue
description: >
  Adaptive task ordering based on changing priorities, dependencies, and context.
  Re-prioritizes as new information arrives. Use for managing complex multi-task
  work sessions.
version: 1.0.0
author: ArcFoundry
triggers:
  - "task priority"
  - "what should I do next"
  - "reorder tasks"
---

# Dynamic Prioritization Queue Skill

## Core Principle

> "Priorities change. The queue must adapt."

Static task lists become stale. Dynamic prioritization responds to:
- New blockers
- Changing deadlines
- Discovered dependencies
- Resource availability

---

## Priority Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Deadline urgency | 0.3 | Time until due |
| Blocking others | 0.25 | How many tasks depend on this |
| Business value | 0.2 | Impact if completed |
| Effort required | 0.15 | Complexity and duration |
| Risk of delay | 0.1 | Consequences of slipping |

---

## Priority Score Calculation

```typescript
function calculatePriority(task: Task, context: Context): number {
  const urgency = deadlineUrgency(task.deadline);
  const blocking = blockingFactor(task, context.dependencies);
  const value = task.businessValue;
  const effort = 1 - (task.estimatedHours / 40); // Prefer smaller tasks
  const risk = task.riskLevel;
  
  return (
    urgency * 0.30 +
    blocking * 0.25 +
    value * 0.20 +
    effort * 0.15 +
    risk * 0.10
  );
}
```

---

## Re-prioritization Triggers

```yaml
triggers:
  - new_blocker_discovered
  - deadline_changed
  - dependency_completed
  - resource_became_available
  - task_failed
  - priority_override_by_human
```

---

## Queue Operations

```typescript
class DynamicPriorityQueue {
  private tasks: Task[];
  
  add(task: Task): void {
    this.tasks.push(task);
    this.reorder();
  }
  
  next(): Task {
    this.reorder();  // Always reorder before dequeue
    return this.tasks.shift();
  }
  
  reorder(): void {
    const context = this.getCurrentContext();
    this.tasks.sort((a, b) => 
      calculatePriority(b, context) - calculatePriority(a, context)
    );
  }
  
  onBlockerDiscovered(blockerId: string, blockedIds: string[]): void {
    // Move blocker up, blocked items down
    this.reorder();
  }
  
  onDeadlineChanged(taskId: string, newDeadline: Date): void {
    const task = this.tasks.find(t => t.id === taskId);
    task.deadline = newDeadline;
    this.reorder();
  }
}
```

---

## Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│ PRIORITY QUEUE                                    [Refresh] [+] │
├─────────────────────────────────────────────────────────────────┤
│ # │ Task                    │ Score │ Deadline │ Blockers       │
├───┼─────────────────────────┼───────┼──────────┼────────────────┤
│ 1 │ Fix auth bug           │ 0.92  │ TODAY    │ Blocks 3 tasks │
│ 2 │ Deploy connector       │ 0.78  │ Tomorrow │ -              │
│ 3 │ Write specs            │ 0.65  │ Friday   │ -              │
│ 4 │ Update docs            │ 0.42  │ Next week│ Blocked by #1  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

```yaml
integrates_with:
  - agent-orchestration: "Multi-agent task distribution"
  - jt1-recovery-protocol: "Crisis tasks get top priority"
  - task-estimation: "Effort estimates feed priority"
```

---

*This skill ensures you're always working on the most important thing.*
