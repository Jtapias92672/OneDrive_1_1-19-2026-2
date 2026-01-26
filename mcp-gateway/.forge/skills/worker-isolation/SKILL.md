---
name: worker-isolation
description: Worker isolation patterns for multi-agent systems. Enforces Minimum Viable Context (MVC), tool budgets, and filesystem-level role separation to prevent coordination collapse and enable safe parallelism.
---

# Worker Isolation

Patterns for preventing coordination collapse through strict agent isolation.

## When to Use
- Scaling beyond 4-10 agents
- Preventing "helpful" agents from touching things they shouldn't
- Enabling 100+ agent parallelism (like Cursor's 1M-line codebase)
- Stopping the 41-50% rework rate from uncontrolled agents

## Core Principle

> "Most LLM 'hallucinations' in coding occur because the agent tries to be 'helpful' by changing things it wasn't asked to touch."

Strict scoping is the only way to achieve reliable multi-agent parallelism.

## The Three Isolation Layers

### Layer 1: Context Isolation (MVC)

**Minimum Viable Context** = absolute minimum needed for THIS task

```typescript
// ❌ WRONG: Full context
interface BadWorkerContext {
  fullConversationHistory: Message[];     // 50K tokens
  allProjectFiles: File[];                // Everything
  otherWorkerStatus: WorkerStatus[];      // Knows about others
  bigPictureGoal: string;                 // "Build auth system"
}

// ✅ CORRECT: Minimum Viable Context
interface MVCWorkerContext {
  task: {                                 // Just this task
    id: string;
    type: "translate";
    input: { componentId: string };
    expectedOutput: Schema;
  };
  component: FigmaComponent;              // Just this component
  tools: ["figma-api", "mendix-sdk"];     // Just needed tools
  // NO history, NO other workers, NO big picture
}
```

### Layer 2: Tool Isolation (Budget)

Workers should have **3-5 tools maximum**.

Research shows: >10 tools causes 2-6x efficiency drop.

```typescript
// ❌ WRONG: Kitchen sink toolset
const translatorTools = [
  "figma-api",
  "mendix-sdk", 
  "file-system",
  "git",
  "npm",
  "docker",
  "database",
  "http-client",
  "email",
  "slack",
  "jira",
  // ... 15 more tools
];

// ✅ CORRECT: Scoped toolset
const translatorTools = [
  "figma-api",      // Read Figma components
  "mendix-sdk",     // Generate Mendix code
  "file-system",    // Write output files
];

const validatorTools = [
  "file-system",    // Read generated files
  "image-compare",  // Visual diff
  "schema-check",   // Structure validation
];
```

### Layer 3: Filesystem Isolation

Each worker role gets isolated directories and config.

```
project/
├── .forge/
│   ├── roles/
│   │   ├── translator/
│   │   │   ├── CLAUDE.md         # Translator-specific instructions
│   │   │   ├── tools.json        # Allowed tools (3-5)
│   │   │   └── schema.json       # Expected I/O format
│   │   ├── validator/
│   │   │   ├── CLAUDE.md         # Validator-specific instructions
│   │   │   ├── tools.json        # Different tool set
│   │   │   └── schema.json       # Different I/O format
│   │   └── remediator/
│   │       └── ...
│   └── workers/
│       ├── translator-1/         # Instance workspace
│       │   ├── input/            # Read-only
│       │   ├── output/           # Write-only
│       │   └── scratch/          # Temporary work
│       └── translator-2/
│           └── ...
```

### Why Filesystem Isolation?

Gas Town learned this the hard way:

```go
// IMPORTANT: CLAUDE.md must be in ~/gt/mayor/, NOT ~/gt/
// CLAUDE.md at town root would be inherited by ALL agents via
// directory traversal, causing crew/polecat/etc to receive
// Mayor-specific instructions.
```

Each role MUST have its own instructions file. Shared files = shared context = coordination collapse.

## MVC Decision Framework

Before dispatching to worker, ask:

| Question | If YES | If NO |
|----------|--------|-------|
| Does worker need this to complete the task? | Include | Exclude |
| Does this reference other workers? | EXCLUDE | OK |
| Does this contain conversation history? | EXCLUDE | OK |
| Does this explain the "big picture"? | EXCLUDE | OK |
| Is this >4000 tokens? | Split task | OK |

### MVC Examples

**Translator MVC:**
```json
{
  "task": {
    "type": "translate",
    "componentId": "figma:node:123"
  },
  "component": {
    "name": "LoginButton",
    "type": "COMPONENT",
    "styles": { ... },
    "children": [ ... ]
  },
  "outputPath": ".forge/output/LoginButton.mpk",
  "tools": ["figma-api", "mendix-sdk", "file-system"]
}
```

**Validator MVC:**
```json
{
  "task": {
    "type": "validate",
    "mpkPath": ".forge/output/LoginButton.mpk"
  },
  "expectedVisual": "figma-export:LoginButton.png",
  "schema": { ... },
  "tools": ["file-system", "image-compare", "schema-validator"]
}
```

**Remediator MVC:**
```json
{
  "task": {
    "type": "remediate",
    "mpkPath": ".forge/output/LoginButton.mpk",
    "validationReport": {
      "pixelDiff": 234,
      "diffRegions": [{ "x": 10, "y": 20, "w": 50, "h": 30 }]
    }
  },
  "previousAttempts": 1,
  "maxAttempts": 3,
  "tools": ["mendix-sdk", "file-system", "diff-analyzer"]
}
```

## Tool Budget Enforcement

### Per-Role Tool Allocation

| Role | Tools | Justification |
|------|-------|---------------|
| Translator | 3 | figma-api, mendix-sdk, file-system |
| Validator | 3 | file-system, image-compare, schema-validator |
| Remediator | 3 | mendix-sdk, file-system, diff-analyzer |
| Orchestrator | 5 | ledger, convoy, hook, mail, metrics |

### Tool Access Control

```typescript
// tools.json for translator role
{
  "allowed": [
    "figma-api",
    "mendix-sdk",
    "file-system"
  ],
  "denied": [
    "git",           // Orchestrator handles commits
    "database",      // No direct DB access
    "http-client",   // No arbitrary network
    "shell"          // No arbitrary commands
  ]
}
```

### Enforcement

```typescript
async function executeWithToolBudget(
  task: Task,
  context: MVC,
  allowedTools: string[]
) {
  // Intercept tool calls
  const toolProxy = new Proxy(tools, {
    get(target, prop) {
      if (!allowedTools.includes(prop as string)) {
        throw new Error(`Tool '${prop}' not allowed for this role`);
      }
      return target[prop];
    }
  });
  
  return await worker.execute(task, context, toolProxy);
}
```

## Information Hiding

### What Workers MUST NOT Know

1. **Other workers exist**
   ```typescript
   // ❌ Worker sees global state
   const allWorkers = await getWorkers();
   const otherProgress = await worker2.getProgress();
   
   // ✅ Worker only knows its task
   const myTask = await hook.getTask();
   ```

2. **The "big picture"**
   ```typescript
   // ❌ Worker knows overall goal
   const goal = "Build complete auth system with OAuth";
   
   // ✅ Worker knows only its piece
   const task = "Generate LoginButton component";
   ```

3. **Conversation history**
   ```typescript
   // ❌ Worker has full history
   const context = await getConversationHistory();  // 50K tokens
   
   // ✅ Worker has fresh context
   const context = await hook.getContext();  // <4K tokens
   ```

4. **What happens next**
   ```typescript
   // ❌ Worker knows the pipeline
   const nextStep = "After I finish, Validator will check";
   
   // ✅ Worker doesn't know or care
   // Writes to hook, terminates, done
   ```

## Coordination Without Communication

### ❌ Wrong: Direct Communication
```typescript
// Workers talking to each other
await translatorWorker.notify(validatorWorker, "Done!");
await validatorWorker.request(translatorWorker, "Need clarification");
// → Race conditions, deadlocks, coupling
```

### ✅ Correct: Ledger-Based Coordination
```typescript
// All coordination through external ledger
// Workers never communicate directly

// Translator writes to ledger
await ledger.complete(taskId, { mpkPath: "..." });

// Orchestrator reads ledger, dispatches validator
const result = await ledger.getResult(taskId);
await sling({ type: "validate", input: result.mpkPath });

// Validator has no idea Translator existed
```

## Isolation Checklist

Before deploying multi-agent system:

- [ ] Each role has separate CLAUDE.md / instructions
- [ ] Each role has explicit tool allowlist (3-5 max)
- [ ] Workers cannot see other workers' state
- [ ] Workers don't know the "big picture"
- [ ] Context per worker < 4000 tokens
- [ ] All coordination via external ledger
- [ ] Workers terminate after single task
- [ ] No shared mutable state between workers

## Anti-Patterns

### ❌ Shared Instructions
```
project/
└── CLAUDE.md  # Shared by all agents = bad
```

### ❌ Promiscuous Tool Access
```typescript
const worker = new Worker({
  tools: allAvailableTools  // Everything = chaos
});
```

### ❌ Context Accumulation
```typescript
// Context grows over time
for (const task of tasks) {
  context.push(await execute(task));  // Memory leak
}
```

### ❌ Worker-to-Worker Dependencies
```typescript
// Translator waits for Validator feedback
const feedback = await validator.getFeedback();  // Coupling
```

## Scaling Limits

| Agents | Without Isolation | With Isolation |
|--------|------------------|----------------|
| 1-4 | Workable | Easy |
| 5-10 | Chaotic | Manageable |
| 10-30 | Collapse | Comfortable |
| 30-100 | Impossible | Achievable |
| 100+ | N/A | Proven (Cursor) |

## References
- Google/MIT Study (Dec 2025): 45% rule, tool count impact
- Gas Town: Filesystem isolation patterns
- Cursor AI: 1M-line codebase with 100s of agents
- FORGE verification-quality-library: Human review gates
