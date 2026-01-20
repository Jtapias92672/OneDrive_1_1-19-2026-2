# Epic 7 Initialization: Test Generation Engine

**Read Time:** 2 minutes | **Context Load:** ~10K tokens

---

## What Was Built (Epic 6: React Generator)

- ✅ **ReactGenerator**: Transforms ParsedDesign → React components
- ✅ **Style Translator**: Figma styles → Tailwind classes
- ✅ **Props Generator**: Variants → TypeScript interfaces
- ✅ **Accessibility Generator**: ARIA attributes
- ✅ **Project Generator**: Complete file structure

---

## Key Imports Available

```typescript
// React Generator output
import { GeneratedProject, GeneratedComponent } from '@forge/react-generator';

// Convergence (from Epic 4) - for validating generated tests
import { ConvergenceEngine } from '@forge/convergence';

// Contract validation (from Epic 2)
import { CompiledContract } from '@forge/answer-contract';
```

---

## Your Mission (Epic 7)

Build the **Test Generation Engine** - automatically create tests for generated code:
- Unit tests (Vitest/Jest)
- Component tests (React Testing Library)
- E2E tests (Playwright)
- Contract-based tests (from Answer Contract specs)

**You're testing TWO codebases:** Backend (Epic 3) and Frontend (Epic 6).

---

## DO NOT

- ❌ Load full generated code (use AST analysis)
- ❌ Write tests manually (generate them)
- ❌ Re-generate frontend/backend (already done)
- ❌ Load all test templates at once
- ❌ Stay in session longer than ONE task

---

## DO

- ✅ Create `packages/test-generator/` package
- ✅ Analyze code via TypeScript AST (not full file loading)
- ✅ Generate unit tests for functions/classes
- ✅ Generate component tests for React components
- ✅ Generate E2E tests from contract scenarios
- ✅ Target 70%+ coverage
- ✅ ONE task per session, then EXIT

---

## Token Budget

- **Per-task:** 5-8K tokens
- **Epic total:** 50K tokens across ~10 tasks

---

## First Steps

1. Read: `.forge/epics/epic-07-test-generation/TASKS.md`
2. Start: Task 7.1.1 (Create TestGenerator class skeleton)
3. Update: `progress.md` when task complete
4. EXIT session

---

## Code Analysis Pattern (Token-Efficient)

```typescript
import * as ts from 'typescript';

// ❌ BAD: Load full file content
const content = fs.readFileSync(file, 'utf8');  // 10K tokens
const tests = generateTests(content);

// ✅ GOOD: Analyze AST structure only
function analyzeFile(filename: string): FunctionInfo[] {
  const sourceFile = ts.createSourceFile(
    filename,
    fs.readFileSync(filename, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  
  const functions: FunctionInfo[] = [];
  
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node)) {
      // Extract signature, not implementation
      functions.push({
        name: node.name?.getText(),
        params: node.parameters.map(p => p.name.getText()),
        returnType: node.type?.getText(),
      });
    }
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return functions;  // 500 tokens, not 10K
}
```

---

## Test Generation Example

**Input (Function Signature):**
```typescript
{ 
  name: 'validateContract', 
  params: ['contract', 'output'],
  returnType: 'ValidationResult'
}
```

**Output (Generated Test):**
```typescript
describe('validateContract', () => {
  it('should return valid for correct output', () => {
    const contract = createMockContract();
    const output = createValidOutput();
    
    const result = validateContract(contract, output);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should return errors for invalid output', () => {
    const contract = createMockContract();
    const output = createInvalidOutput();
    
    const result = validateContract(contract, output);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

---

## What Epic 8 Needs From You

```typescript
interface TestReport {
  type: 'unit' | 'component' | 'e2e';
  total: number;
  passed: number;
  failed: number;
  coverage: CoverageReport;
  duration: number;
}
```

Epic 8 (Evidence Packs) will consume these reports.
