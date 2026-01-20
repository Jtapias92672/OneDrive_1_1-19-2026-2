# Epic 4 Initialization: Convergence Engine ⭐ CORE IP

**Read Time:** 3 minutes | **Context Load:** ~12K tokens

---

## What Was Built (Epic 3: FORGE C Core)

- ✅ **ForgeC Class**: Main orchestrator with plugin system
- ✅ **Session Management**: Create, track, persist sessions
- ✅ **LLM Providers**: Anthropic (primary), abstraction for others
- ✅ **Plugin System**: Logging, Metrics, Evidence hooks
- ✅ **MCP Tools**: `forge_converge`, `forge_validate`, `forge_status`

---

## Key Imports Available

```typescript
// Main orchestrator
import { ForgeC, ForgeSession } from '@forge/forge-c';

// Create session
const forge = new ForgeC(config);
const session = await forge.createSession(contract);

// LLM calls
const response = await session.provider.complete({
  model: 'claude-sonnet-4-20250514',
  messages: [...],
  maxTokens: 4096,
});

// Contract validation (from Epic 2)
import { CompiledContract } from '@forge/answer-contract';
const valid = await contract.validate(output);
```

---

## Your Mission (Epic 4)

Build the **Convergence Engine** - the iterative refinement loop that transforms initial LLM outputs into contract-compliant results.

**This is the core value proposition:** "CI/CD for AI answers"

The pattern:
```
Generate → Validate → Feedback → Repair → Repeat
   ↓          ↓          ↓         ↓        ↓
  LLM     Contract   Structured   LLM    Until Valid
         Validators   Errors            or Max Iter
```

---

## The Problem You're Solving

Single-pass LLM generation often produces:
- TypeScript compilation errors
- Missing required fields
- Invalid enum values
- Semantic quality issues

**Your job:** Make FORGE iterate until output is VALID.

---

## DO NOT

- ❌ Load full generated code (use file manifests)
- ❌ Re-implement ForgeC or Session (import them)
- ❌ Load entire contract into each iteration
- ❌ Try to fix code yourself (let LLM do repair)
- ❌ Stay in session longer than ONE task

---

## DO

- ✅ Create `packages/convergence/` package
- ✅ Build validation harness (runs checks)
- ✅ Build convergence loop: Generate → Validate → Repair → Repeat
- ✅ Track iterations, tokens, time, cost
- ✅ Detect "no progress" (same failures twice)
- ✅ Generate structured repair prompts
- ✅ ONE task per session, then EXIT

---

## Token Budget

- **Per-task:** 5-8K tokens
- **Epic total:** 70K tokens across ~14 tasks

⚠️ **This is the largest epic.** Stay disciplined with task boundaries.

---

## First Steps

1. Read: `.forge/epics/epic-04-convergence/TASKS.md`
2. Start: Task 4.1.1 (Create ConvergenceEngine class skeleton)
3. Update: `progress.md` when task complete
4. EXIT session

---

## Critical Pattern: Token-Efficient Iteration

```typescript
// ❌ BAD: Load everything every iteration
for (let i = 0; i < 5; i++) {
  const code = generateBackend(contract);      // 20K tokens
  const validation = validate(code, contract); // 80K tokens
  const repaired = repair(code, validation);   // 100K tokens
  // Total per iteration: 200K → 1M tokens after 5 iterations 🔴
}

// ✅ GOOD: Load only what's needed
for (let i = 0; i < 5; i++) {
  // Only load validation FAILURES, not full code
  const failures = validate(codeManifest, contract); // 5K tokens
  
  // Repair prompt includes ONLY error messages
  const repairPrompt = createRepairPrompt(failures); // 3K tokens
  const fixes = await llm.repair(repairPrompt);      // 8K tokens
  
  applyFixes(codeManifest, fixes);
  // Total per iteration: 16K → 80K after 5 iterations ✅
}
```

---

## Convergence Strategies (Build Incrementally)

1. **Iterative Refinement** (default): Fix errors one iteration at a time
2. **Parallel Voting**: Generate N candidates, pick best
3. **Chain of Thought**: Think → Generate → Critique → Refine

Build Iterative Refinement first (Tasks 4.1.x-4.2.x), then others.

---

## Feedback Generation Pattern

```typescript
// Convert validation errors to LLM-friendly feedback
function createRepairPrompt(failures: ValidationError[]): string {
  return `
## Validation Failures (Fix These)

${failures.map((f, i) => `
${i + 1}. **${f.severity.toUpperCase()}** at \`${f.path}\`
   - Issue: ${f.message}
   - Expected: ${f.expected}
   - Got: ${f.actual}
`).join('\n')}

Fix each issue. Return ONLY the corrected sections.
`;
}
```

---

## Key Files (Reference Only)

- `packages/forge-c/src/index.ts` - ForgeC class
- `packages/forge-c/src/session.ts` - Session management
- `packages/answer-contract/src/validators/` - Validator interface
