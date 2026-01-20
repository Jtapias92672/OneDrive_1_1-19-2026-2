# Epic 6: React Code Generator - Atomic Task Breakdown

**Total Tasks:** 12  
**Estimated Tokens:** 60K total (~5K per task)  
**Estimated Time:** 5 days

---

## Phase 6.1: Package Setup & Core Generator

### Task 6.1.1: Create react-generator package structure

**Time:** 5 minutes  
**Tokens:** ~3K  
**Files to CREATE:**
- `packages/react-generator/package.json`
- `packages/react-generator/tsconfig.json`
- `packages/react-generator/src/index.ts`

**Acceptance Criteria:**
- [ ] Package name is `@forge/react-generator`
- [ ] Depends on @forge/figma-parser
- [ ] `pnpm build` succeeds

---

### Task 6.1.2: Create ReactGenerator main class skeleton

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/react-generator/src/generator.ts`
- `packages/react-generator/src/types.ts`

**Acceptance Criteria:**
- [ ] Class skeleton with constructor
- [ ] Options with sensible defaults
- [ ] Output types defined

---

## Phase 6.2: Style Translation

### Task 6.2.1: Create LayoutTranslator (Figma → Tailwind)

**Time:** 8 minutes  
**Tokens:** ~6K  
**Files to CREATE:**
- `packages/react-generator/src/translators/layout.ts`

**Acceptance Criteria:**
- [ ] Translates flex layouts
- [ ] Translates gap, padding
- [ ] Converts pixels to Tailwind spacing

---

### Task 6.2.2: Create StyleTranslator (colors, typography)

**Time:** 8 minutes  
**Tokens:** ~6K  
**Files to CREATE:**
- `packages/react-generator/src/translators/styles.ts`

**Acceptance Criteria:**
- [ ] Translates colors (token or arbitrary)
- [ ] Translates border radius
- [ ] Translates typography

---

## Phase 6.3: Component Generation

### Task 6.3.1: Create ComponentGenerator

**Time:** 8 minutes  
**Tokens:** ~6K  
**Files to CREATE:**
- `packages/react-generator/src/generators/component.ts`

**Acceptance Criteria:**
- [ ] Generates React functional components
- [ ] Applies Tailwind classes
- [ ] Uses correct HTML elements

---

### Task 6.3.2: Create PropsGenerator

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/react-generator/src/generators/props.ts`

**Acceptance Criteria:**
- [ ] Generates props from variants
- [ ] Adds standard props (className, children)
- [ ] Generates TypeScript interface

---

### Task 6.3.3: Create AccessibilityGenerator

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/react-generator/src/generators/accessibility.ts`

**Acceptance Criteria:**
- [ ] Adds ARIA roles when needed
- [ ] Adds aria-label for interactive
- [ ] Adds tabIndex for custom interactive

---

## Phase 6.4: Token & Project Generation

### Task 6.4.1: Create TokensGenerator (Tailwind config)

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/react-generator/src/generators/tokens.ts`

**Acceptance Criteria:**
- [ ] Generates Tailwind config
- [ ] Generates CSS variables
- [ ] Generates theme TypeScript file

---

### Task 6.4.2: Complete ReactGenerator.generate method

**Time:** 8 minutes  
**Tokens:** ~6K  
**Files to MODIFY:**
- `packages/react-generator/src/generator.ts`

**Acceptance Criteria:**
- [ ] Generates all components
- [ ] Generates all pages
- [ ] Generates tokens
- [ ] Formats code with Prettier

---

## Phase 6.5: Testing & Export

### Task 6.5.1: Create TestGenerator for components

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/react-generator/src/generators/tests.ts`

**Acceptance Criteria:**
- [ ] Generates render test
- [ ] Generates className test
- [ ] Uses React Testing Library

---

### Task 6.5.2: Export package and create tests

**Time:** 5 minutes  
**Tokens:** ~3K  
**Files to MODIFY:**
- `packages/react-generator/src/index.ts`

**Acceptance Criteria:**
- [ ] All public APIs exported
- [ ] Integration test passes
- [ ] Package builds successfully

---

## Epic 6 Completion Checklist

- [ ] All 12 tasks marked [x]
- [ ] ReactGenerator produces valid React code
- [ ] Layout and style translation works
- [ ] Generated code passes ESLint

**Then run:** `.forge/agent-bootstrap.sh next-epic`
