# Epic 5: Figma Parser - Atomic Task Breakdown

**Token Budget:** 50K (LIMIT: 50K) ✅ SAFE  
**Tasks:** 10  
**Estimated Time:** 5 days  
**Dependencies:** Epic 2 (Answer Contract)

---

## Overview

Epic 5 implements the Figma API integration for parsing design files, extracting component hierarchies, styles, and design tokens for code generation.

---

## Phase 5.1: Package Setup

### Task 5.1.1: Create figma-parser package structure

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/figma-parser/package.json` (update with dependencies)
- `packages/figma-parser/src/api/index.ts`
- `packages/figma-parser/src/parser/index.ts`
- `packages/figma-parser/src/styles/index.ts`
- `packages/figma-parser/src/output/index.ts`

**Dependencies:** Add `@figma/rest-api-spec` for official Figma types

**Done When:** Package structure created with directories

---

### Task 5.1.2: Define Figma API types

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/figma-parser/src/api/types.ts`

**Key Types:**
```typescript
interface FigmaFile { ... }
interface FigmaNode { ... }
interface FigmaComponent { ... }
interface FigmaStyle { ... }
interface FigmaColor { r, g, b, a }
```

**Done When:** Types compile correctly

---

## Phase 5.2: API Integration

### Task 5.2.1: Implement Figma API client

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/figma-parser/src/api/client.ts`

**Methods:**
- `getFile(fileKey: string): Promise<FigmaFile>`
- `getComponents(fileKey: string): Promise<FigmaComponent[]>`
- `getStyles(fileKey: string): Promise<FigmaStyle[]>`
- `getImages(fileKey: string, nodeIds: string[]): Promise<Record<string, string>>`

**Done When:** API client fetches Figma data successfully

---

### Task 5.2.2: Implement document parser

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/figma-parser/src/parser/document-parser.ts`

**Features:**
- Parse Figma document structure
- Build internal tree representation
- Handle nested frames and groups

**Done When:** Parser extracts document tree

---

### Task 5.2.3: Implement component hierarchy extraction

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/figma-parser/src/parser/component-extractor.ts`

**Features:**
- Extract component instances and masters
- Identify component variants
- Map component props

**Done When:** Components extracted with full hierarchy

---

## Phase 5.3: Style Extraction

### Task 5.3.1: Implement color and typography extraction

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/figma-parser/src/styles/color-extractor.ts`
- `packages/figma-parser/src/styles/typography-extractor.ts`

**Features:**
- Extract fill colors and gradients
- Extract stroke colors
- Extract text styles (font, size, weight, line height)

**Done When:** Colors and fonts extracted to standard format

---

### Task 5.3.2: Implement design tokens generation

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/figma-parser/src/styles/design-tokens.ts`

**Features:**
- Generate CSS custom properties
- Generate Tailwind config values
- Support W3C design token format

**Done When:** Design tokens generated in multiple formats

---

### Task 5.3.3: Implement auto-layout conversion

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/figma-parser/src/styles/layout-converter.ts`

**Features:**
- Convert Figma auto-layout to CSS flexbox
- Handle spacing, padding, alignment
- Support responsive constraints

**Done When:** Layout properties converted to CSS

---

## Phase 5.4: Output

### Task 5.4.1: Implement component mapping

**Time:** 5 minutes | **Tokens:** ~4K

**Files to CREATE:**
- `packages/figma-parser/src/output/component-mapper.ts`

**Features:**
- Map Figma components to React component specs
- Generate prop definitions from variants
- Create component hierarchy JSON

**Done When:** Components mapped to React specs

---

### Task 5.4.2: Implement JSON export and package index

**Time:** 5 minutes | **Tokens:** ~3K

**Files to CREATE:**
- `packages/figma-parser/src/output/json-export.ts`
- `packages/figma-parser/src/index.ts`

**Features:**
- Export parsed design as structured JSON
- Include components, styles, tokens
- Support partial exports

**Verification:**
```bash
cd packages/figma-parser && pnpm build
node -e "import('@forge/figma-parser').then(m => console.log(Object.keys(m)))"
```

**Done When:** All exports work from @forge/figma-parser

---

## Epic 5 Completion Checklist

Before moving to Epic 6:

- [ ] All 10 tasks marked [x] in progress.md
- [ ] `pnpm build` succeeds for figma-parser
- [ ] Figma API client fetches data
- [ ] Document parser extracts tree
- [ ] Component extractor handles variants
- [ ] Design tokens generated
- [ ] Layout conversion works
- [ ] JSON export complete

**Commit:** `git commit -m "Epic 5: Figma Parser complete"`

**Next:** Epic 6 - React Generator
