# Epic 5 Initialization: Figma Parser

**Read Time:** 2 minutes | **Context Load:** ~8K tokens

---

## What Was Built (Epic 4: Convergence Engine)

- ✅ **ConvergenceEngine**: Iterative refinement loop
- ✅ **Validation Harness**: Runs structural, semantic, custom checks
- ✅ **Repair Prompt Generator**: Structured feedback from errors
- ✅ **Cost Controller**: Token/cost budgets with early exit
- ✅ **Progress Detection**: Prevents infinite loops
- ✅ **Convergence Strategies**: Iterative, Parallel, CoT

---

## Key Imports Available

```typescript
// Convergence (you'll use this later in Epic 6)
import { ConvergenceEngine, ConvergenceResult } from '@forge/convergence';

// Pattern for iterating until valid
const engine = new ConvergenceEngine(session, contract);
const result = await engine.run(initialInput);
// result.status: 'converged' | 'failed' | 'max_iterations'
// result.iterations: number
// result.finalOutput: T
```

---

## Your Mission (Epic 5)

Build the **Figma Parser** - extracts design intent from Figma files:
- Component hierarchy
- Layout analysis (Auto Layout → Flexbox)
- Design tokens (colors, typography, spacing)
- Semantic detection (is this a button? input? card?)

**This is the INPUT side of Figma → Code.**

---

## Context Shift

You're moving from **backend convergence** to **frontend parsing**.

Epic 4 was about validating generated code.
Epic 5 is about EXTRACTING design information.

**These are INDEPENDENT.** You don't need Epic 4's convergence yet.

---

## DO NOT

- ❌ Load Epic 4 convergence code (not needed yet)
- ❌ Generate any React components (that's Epic 6)
- ❌ Load full Figma API responses (they're huge: 100K+ tokens)
- ❌ Process entire design at once
- ❌ Stay in session longer than ONE task

---

## DO

- ✅ Create `packages/figma-parser/` package
- ✅ Build Figma REST API client (with caching)
- ✅ Extract design tokens (colors, fonts, spacing)
- ✅ Detect component types (button, input, table, etc.)
- ✅ Analyze layouts (Auto Layout → flex/grid)
- ✅ Build component hierarchy tree
- ✅ ONE task per session, then EXIT

---

## Token Budget

- **Per-task:** 5-8K tokens
- **Epic total:** 50K tokens across ~10 tasks

---

## First Steps

1. Read: `.forge/epics/epic-05-figma-parser/TASKS.md`
2. Start: Task 5.1.1 (Create FigmaClient class)
3. Update: `progress.md` when task complete
4. EXIT session

---

## Figma API Structure (Overview)

```typescript
// Figma file response (simplified)
interface FigmaFile {
  document: {
    children: FigmaNode[];  // Pages
  };
  styles: Record<string, FigmaStyle>;
}

interface FigmaNode {
  id: string;
  name: string;
  type: 'COMPONENT' | 'INSTANCE' | 'FRAME' | 'TEXT' | ...;
  children?: FigmaNode[];
  
  // Layout (Auto Layout)
  layoutMode?: 'HORIZONTAL' | 'VERTICAL';
  itemSpacing?: number;
  paddingLeft?: number;
  
  // Styling
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
}
```

---

## Token-Efficient Parsing Pattern

```typescript
// ❌ BAD: Load entire design tree
const allNodes = figmaFile.document.children.flatMap(
  page => getAllNodes(page)  // Could be 10K+ nodes
);

// ✅ GOOD: Stream/iterate one at a time
function* walkNodes(root: FigmaNode): Generator<FigmaNode> {
  yield root;
  for (const child of root.children || []) {
    yield* walkNodes(child);
  }
}

for (const node of walkNodes(figmaFile.document)) {
  processNode(node);  // One at a time
}
```

---

## What Epic 6 Needs From You

Epic 6 (React Generator) will import:

```typescript
import { 
  FigmaParser,
  ParsedDesign,
  ComponentTree,
  DesignTokens,
  LayoutAnalysis
} from '@forge/figma-parser';

// Your output structure
interface ParsedDesign {
  pages: ParsedPage[];
  components: ParsedComponent[];
  tokens: DesignTokens;
}
```

Build these data structures clean and well-typed.

---

## Key Files (Reference Only)

- Figma API Docs: https://www.figma.com/developers/api
- Use test fixtures, not live API (saves tokens and rate limits)
