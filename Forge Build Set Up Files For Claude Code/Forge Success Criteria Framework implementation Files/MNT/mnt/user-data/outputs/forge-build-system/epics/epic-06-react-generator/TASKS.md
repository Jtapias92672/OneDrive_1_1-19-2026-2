# Epic 6: React Generator - Atomic Task Breakdown

**Token Budget:** 60K (LIMIT: 60K) ⚠️ AT LIMIT  
**Tasks:** 12  
**Estimated Time:** 5 days  
**Dependencies:** Epic 5 (Figma Parser)

---

## Overview

Epic 6 implements React component code generation from Figma designs, including TypeScript props, styling, accessibility attributes, and test generation.

---

## Phase 6.1: Package Setup

### Task 6.1.1: Create react-generator package structure

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/react-generator/src/templates/index.ts`
- `packages/react-generator/src/generators/index.ts`
- `packages/react-generator/src/styling/index.ts`
- `packages/react-generator/src/quality/index.ts`

**Done When:** Package structure created

---

### Task 6.1.2: Define generation types

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/react-generator/src/types.ts`

**Key Types:** ComponentSpec, PropDefinition, StyleConfig, GenerationOptions

**Done When:** Types compile correctly

---

## Phase 6.2: Component Generation

### Task 6.2.1: Implement template system

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/react-generator/src/templates/base.ts`
- `packages/react-generator/src/templates/functional.ts`

**Features:** Template rendering with variable substitution

**Done When:** Templates generate code

---

### Task 6.2.2: Implement functional component generator

**Time:** 5 minutes | **Tokens:** ~5K

**Files to CREATE:**
- `packages/react-generator/src/generators/component-generator.ts`

**Features:** Generate React functional components from specs

**Done When:** Components generated correctly

---

### Task 6.2.3: Implement TypeScript props generator

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/react-generator/src/generators/props-generator.ts`

**Features:** Generate typed Props interfaces

**Done When:** Props interfaces generated

---

### Task 6.2.4: Implement hooks integration

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/react-generator/src/generators/hooks-generator.ts`

**Features:** Add useState, useEffect, custom hooks as needed

**Done When:** Hooks integrated correctly

---

## Phase 6.3: Styling

### Task 6.3.1: Implement Tailwind conversion

**Time:** 5 minutes | **Tokens:** ~5K

**Files to CREATE:**
- `packages/react-generator/src/styling/tailwind-converter.ts`

**Features:** Convert Figma styles to Tailwind classes

**Done When:** Tailwind classes generated

---

### Task 6.3.2: Implement CSS modules alternative

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/react-generator/src/styling/css-modules.ts`

**Features:** Generate CSS modules as alternative to Tailwind

**Done When:** CSS modules generated

---

### Task 6.3.3: Implement responsive breakpoints

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/react-generator/src/styling/responsive.ts`

**Features:** Add responsive classes and media queries

**Done When:** Responsive styles generated

---

## Phase 6.4: Quality

### Task 6.4.1: Implement accessibility attributes

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/react-generator/src/quality/accessibility.ts`

**Features:** Add ARIA attributes, roles, labels

**Done When:** A11y attributes added

---

### Task 6.4.2: Implement test generation

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/react-generator/src/quality/test-generator.ts`

**Features:** Generate React Testing Library tests

**Done When:** Tests generated

---

### Task 6.4.3: Implement Storybook stories and exports

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/react-generator/src/quality/storybook-generator.ts`
- `packages/react-generator/src/index.ts`

**Verification:**
```bash
cd packages/react-generator && pnpm build
```

**Done When:** All exports work from @forge/react-generator

---

## Epic 6 Completion Checklist

- [ ] All 12 tasks complete
- [ ] Component generator creates valid React code
- [ ] TypeScript props properly typed
- [ ] Tailwind/CSS modules styling works
- [ ] Accessibility attributes included
- [ ] Test and Storybook generation works

**Next:** Epic 7 - Test Generation
