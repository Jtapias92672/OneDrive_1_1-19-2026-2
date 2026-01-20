# Epic 7: Test Generation - Atomic Task Breakdown

**Token Budget:** 40K (LIMIT: 40K) ✅ SAFE  
**Tasks:** 10  
**Estimated Time:** 4 days  
**Dependencies:** Epic 4 (Convergence)

---

## Overview

Epic 7 implements automated test generation for FORGE outputs, including unit tests, component tests, API tests, and coverage validation.

---

## Phase 7.1: Package Setup

### Task 7.1.1: Create test-generator package structure

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/test-generator/src/templates/index.ts`
- `packages/test-generator/src/generators/index.ts`
- `packages/test-generator/src/validation/index.ts`

**Done When:** Package structure created

---

### Task 7.1.2: Define test template types

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/test-generator/src/types.ts`

**Key Types:** TestSuite, TestCase, TestAssertion, CoverageReport

**Done When:** Types compile correctly

---

## Phase 7.2: Unit Tests

### Task 7.2.1: Implement function test generator

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/test-generator/src/generators/function-tests.ts`

**Features:** Generate Jest/Vitest tests for functions

**Done When:** Function tests generated

---

### Task 7.2.2: Implement component test generator (RTL)

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/test-generator/src/generators/component-tests.ts`

**Features:** Generate React Testing Library tests

**Done When:** Component tests generated

---

### Task 7.2.3: Implement API endpoint test generator

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/test-generator/src/generators/api-tests.ts`

**Features:** Generate API endpoint tests with mocks

**Done When:** API tests generated

---

## Phase 7.3: Integration Tests

### Task 7.3.1: Implement integration test generator

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/test-generator/src/generators/integration-tests.ts`

**Features:** Generate tests for component interactions

**Done When:** Integration tests generated

---

### Task 7.3.2: Implement E2E test outlines

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/test-generator/src/generators/e2e-outlines.ts`

**Features:** Generate Playwright test scaffolds

**Done When:** E2E outlines generated

---

### Task 7.3.3: Implement test data fixtures

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/test-generator/src/generators/fixtures.ts`

**Features:** Generate test data and mocks

**Done When:** Fixtures generated

---

## Phase 7.4: Validation

### Task 7.4.1: Implement coverage validator

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/test-generator/src/validation/coverage-validator.ts`

**Features:** Validate test coverage meets thresholds

**Done When:** Coverage validation works

---

### Task 7.4.2: Implement convergence integration

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/test-generator/src/validation/convergence-integration.ts`
- `packages/test-generator/src/index.ts`

**Features:** Integrate with convergence validation loop

**Done When:** All exports work from @forge/test-generator

---

## Epic 7 Completion Checklist

- [ ] All 10 tasks complete
- [ ] Unit test generation works
- [ ] Component tests use RTL patterns
- [ ] Coverage validator enforces thresholds
- [ ] Integration with convergence complete

**Next:** Epic 8 - Evidence Packs
