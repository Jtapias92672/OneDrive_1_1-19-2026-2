# Epic 8: Evidence Pack Builder - Atomic Task Breakdown

**Total Tasks:** 8 | **Tokens:** 40K | **Time:** 3 days

---

## Phase 8.1: Package Setup & Data Model

### Task 8.1.1: Create evidence-pack package structure
**Files:** package.json, tsconfig.json, src/index.ts
**Criteria:** Package builds, depends on convergence

### Task 8.1.2: Define EvidencePack data model
**Files:** src/types.ts
**Criteria:** Complete interface for pack structure

---

## Phase 8.2: Evidence Collection

### Task 8.2.1: Create EvidenceCollector class
**Files:** src/collector.ts
**Criteria:** Records iterations, validation, tokens

### Task 8.2.2: Create ValidationEvidenceCollector
**Files:** src/collectors/validation.ts
**Criteria:** Collects from convergence logs

### Task 8.2.3: Create TestEvidenceCollector
**Files:** src/collectors/tests.ts
**Criteria:** Collects from test reports

---

## Phase 8.3: Pack Generation & Export

### Task 8.3.1: Create EvidencePackGenerator
**Files:** src/generator.ts
**Criteria:** Builds complete pack, computes hashes

### Task 8.3.2: Create exporters (JSON, Markdown, PDF)
**Files:** src/exporters/json.ts, markdown.ts, pdf.ts
**Criteria:** All formats work, PDF renders correctly

### Task 8.3.3: Create ComplianceMapper (CMMC, SOC2)
**Files:** src/compliance/mapper.ts
**Criteria:** Maps implementations to controls

---

## Completion Checklist
- [ ] Evidence collection works
- [ ] Pack generation complete
- [ ] All export formats work
- [ ] CMMC mapping complete
