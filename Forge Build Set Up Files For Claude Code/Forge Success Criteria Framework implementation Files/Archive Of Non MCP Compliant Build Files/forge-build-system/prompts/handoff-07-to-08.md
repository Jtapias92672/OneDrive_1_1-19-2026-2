# Epic 8 Initialization: Evidence Pack Builder

**Read Time:** 2 minutes | **Context Load:** ~8K tokens

---

## What Was Built (Epic 7: Test Generation)

- ✅ **Unit Test Generator**: Backend + Frontend (Vitest/Jest)
- ✅ **Component Test Generator**: React Testing Library
- ✅ **E2E Test Generator**: Playwright tests from scenarios
- ✅ **Contract Test Generator**: Tests from Answer Contract specs
- ✅ **Coverage Analysis**: Reports on test coverage

---

## Key Data Available

```typescript
// Test reports from Epic 7
const backendTests: TestReport = {
  type: 'unit',
  total: 47,
  passed: 45,
  failed: 2,
  coverage: { statements: 73.2, branches: 68.5, functions: 71.0 },
  duration: 12.4
};

// Convergence trace from Epic 4
const convergenceResult: ConvergenceResult = {
  status: 'converged',
  iterations: 3,
  trace: [
    { iteration: 1, passed: false, tokensUsed: 8234 },
    { iteration: 2, passed: false, tokensUsed: 6891 },
    { iteration: 3, passed: true, tokensUsed: 5432 }
  ],
  budgetUsed: { tokens: 20557, timeSeconds: 147, costUSD: 0.31 }
};
```

---

## Your Mission (Epic 8)

Build the **Evidence Pack system** - auditable, compliance-ready documentation:
- Validation evidence (from Epic 4 convergence)
- Test evidence (from Epic 7 test reports)
- Security evidence (from implementations)
- Compliance mapping (CMMC, SOC2, OWASP)
- Integrity verification (cryptographic hashes)

**This is for AUDITORS and COMPLIANCE OFFICERS.**

---

## DO NOT

- ❌ Load full generated code (use results/manifests)
- ❌ Re-validate anything (use existing results)
- ❌ Re-generate code (just document what exists)
- ❌ Load all evidence templates at once
- ❌ Stay in session longer than ONE task

---

## DO

- ✅ Create `packages/evidence-pack/` package
- ✅ Collect validation results from logs
- ✅ Collect test reports (unit, e2e, coverage)
- ✅ Map implementations to compliance controls
- ✅ Generate JSON evidence (machine-readable)
- ✅ Generate PDF/Markdown reports (human-readable)
- ✅ Compute integrity hashes (tamper-proof)
- ✅ ONE task per session, then EXIT

---

## Token Budget

- **Per-task:** 5-6K tokens
- **Epic total:** 40K tokens across ~8 tasks

---

## First Steps

1. Read: `.forge/epics/epic-08-evidence-packs/TASKS.md`
2. Start: Task 8.1.1 (Create EvidencePack data model)
3. Update: `progress.md` when task complete
4. EXIT session

---

## Evidence Pack Structure

```typescript
interface EvidencePack {
  id: string;
  version: '1.0.0';
  generatedAt: Date;
  
  validation: {
    converged: boolean;
    iterations: number;
    finalValidation: ValidationSummary;
  };
  
  tests: {
    unitTests: TestReport;
    e2eTests: TestReport;
    coverage: CoverageReport;
  };
  
  security: {
    authentication: SecurityEvidence;
    authorization: SecurityEvidence;
    encryption: SecurityEvidence;
  };
  
  compliance: {
    cmmc: ControlMapping[];
    soc2: ControlMapping[];
    owasp: ControlMapping[];
  };
  
  metrics: {
    tokens: number;
    cost: number;
    duration: number;
  };
  
  integrity: {
    algorithm: 'SHA-256';
    rootHash: string;
    fileHashes: Record<string, string>;
  };
}
```

---

## Token-Efficient Evidence Collection

```typescript
// ❌ BAD: Load and analyze all code
function collectEvidence(backendFiles: string[]): Evidence {
  const code = backendFiles.join('\n');  // 50K tokens
  return analyzeCode(code);
}

// ✅ GOOD: Use existing artifacts
function collectEvidence(
  convergenceLog: ConvergenceResult,
  testReports: TestReport[]
): Evidence {
  return {
    authentication: {
      mechanism: 'JWT',  // Known from contract
      tested: testReports.some(r => r.name.includes('auth')),
      validated: convergenceLog.validation.auth.passed
    }
  };  // 2K tokens
}
```

---

## CMMC Control Mapping (Sample)

```typescript
const cmmcControls: ControlMapping[] = [
  {
    controlId: 'AC.L2-3.1.1',
    name: 'Limit system access to authorized users',
    implemented: true,
    evidence: 'JWT authentication in src/middleware/auth.ts',
    tested: true,
    testRef: 'tests/auth.test.ts'
  },
  {
    controlId: 'AC.L2-3.1.2',
    name: 'Limit access to authorized functions',
    implemented: true,
    evidence: 'RBAC middleware in src/middleware/rbac.ts',
    tested: true,
    testRef: 'tests/rbac.test.ts'
  }
];
```

---

## What Epic 10 Needs From You

Platform UI will display and download evidence packs:

```typescript
import { 
  EvidencePackGenerator,
  EvidencePack,
  exportToPDF,
  exportToMarkdown
} from '@forge/evidence-pack';
```
