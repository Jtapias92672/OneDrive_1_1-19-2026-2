# Epic 5: Figma Parser

**Duration:** 5 days  
**Token Budget:** 50K tokens  
**Status:** Not Started  
**Dependencies:** Epic 1 (Foundation), Epic 2 (Answer Contract)

---

## Epic Goal

Build a robust Figma file parser that extracts design intent, component hierarchy, styling, and layout constraints from Figma designs. This is the "input" side of the Figma → Code pipeline.

---

## User Stories

### US-5.1: Figma File Format Parser
**As a** platform user  
**I want** to parse Figma .fig files or API exports  
**So that** I can process designs programmatically

**Acceptance Criteria:**
- [ ] Parse Figma REST API JSON response
- [ ] Parse Figma Plugin export format
- [ ] Handle nested frame hierarchies
- [ ] Extract all node types (Frame, Component, Instance, Text, etc.)
- [ ] Preserve node relationships and parent-child structure

**Core Types:**
```typescript
// packages/figma-parser/src/types/figma.ts
export interface FigmaDocument {
  name: string;
  version: string;
  pages: FigmaPage[];
  components: Map<string, ComponentDefinition>;
  componentSets: Map<string, ComponentSetDefinition>;
  styles: Map<string, StyleDefinition>;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: FigmaNodeType;
  visible: boolean;
  locked: boolean;
  children?: FigmaNode[];
  absoluteBoundingBox?: BoundingBox;
  constraints?: LayoutConstraints;
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
}
```

---

### US-5.2: Component & Style Extraction
**As a** platform user  
**I want** components and styles extracted separately  
**So that** I can generate reusable code

**Acceptance Criteria:**
- [ ] Extract component definitions with variants
- [ ] Extract component instances and overrides
- [ ] Extract color, text, effect styles
- [ ] Map instances to their definitions

**Component Types:**
```typescript
export interface ComponentDefinition {
  id: string;
  name: string;
  key: string;
  node: FigmaNode;
  variants?: Map<string, VariantProperty>;
}

export interface ComponentInstance {
  id: string;
  componentId: string;
  overrides: PropertyOverride[];
}
```

---

### US-5.3: Layout Analysis
**As a** platform user  
**I want** layout intent inferred from designs  
**So that** generated code uses correct layout strategies

**Acceptance Criteria:**
- [ ] Detect Auto Layout (Flexbox equivalent)
- [ ] Detect Grid layouts
- [ ] Detect absolute positioning
- [ ] Infer responsive behavior from constraints

**Layout Types:**
```typescript
export type LayoutStrategy = 'flex-row' | 'flex-column' | 'grid' | 'absolute' | 'none';

export interface LayoutAnalysis {
  strategy: LayoutStrategy;
  properties: LayoutProperties;
  responsive: ResponsiveBehavior;
}

export interface LayoutProperties {
  direction?: 'row' | 'column';
  justify?: 'start' | 'center' | 'end' | 'space-between';
  align?: 'start' | 'center' | 'end' | 'stretch';
  gap?: number;
  wrap?: boolean;
  padding?: Padding;
}
```

---

### US-5.4: Design Token Generation
**As a** platform user  
**I want** design tokens extracted from Figma  
**So that** generated code uses consistent values

**Acceptance Criteria:**
- [ ] Extract color tokens
- [ ] Extract typography tokens  
- [ ] Extract spacing tokens
- [ ] Extract shadow tokens
- [ ] Export as CSS variables, Tailwind config, or JSON

**Token Types:**
```typescript
export interface DesignTokens {
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: SpacingToken[];
  shadows: ShadowToken[];
  radii: RadiusToken[];
}
```

---

### US-5.5: Semantic Analysis
**As a** platform user  
**I want** design semantics inferred from naming and structure  
**So that** generated code has meaningful names and accessibility

**Acceptance Criteria:**
- [ ] Infer component types (Button, Input, Card, etc.)
- [ ] Detect interactive elements
- [ ] Extract accessibility hints
- [ ] Map names to semantic HTML elements

**Semantic Types:**
```typescript
export type SemanticType = 
  | 'button' | 'link' | 'input' | 'card' | 'list' 
  | 'navigation' | 'header' | 'footer' | 'modal' | 'form' | 'container';

export interface SemanticAnalysis {
  type: SemanticType;
  confidence: number;
  htmlElement: string;
  ariaRole?: string;
  interactive: boolean;
}
```

---

### US-5.6: Parser Output Schema
**As a** downstream consumer (React Generator)  
**I want** a well-defined parser output schema  
**So that** I can reliably generate code from it

**Acceptance Criteria:**
- [ ] JSON Schema for parser output
- [ ] TypeScript types generated from schema
- [ ] Versioned output format
- [ ] Validation on output

**Output Schema:**
```typescript
export interface ParsedDesign {
  version: '1.0.0';
  metadata: DesignMetadata;
  pages: ParsedPage[];
  components: ParsedComponent[];
  tokens: DesignTokens;
}

export interface ParsedFrame {
  id: string;
  name: string;
  semantic: SemanticAnalysis;
  layout: LayoutAnalysis;
  styles: NodeStyles;
  children: ParsedFrame[];
}
```

---

## Key Deliverables

```
packages/figma-parser/
├── src/
│   ├── index.ts
│   ├── parser.ts
│   ├── extractors/
│   │   ├── components.ts
│   │   └── styles.ts
│   ├── analysis/
│   │   ├── layout.ts
│   │   └── semantic.ts
│   ├── tokens/
│   │   ├── generator.ts
│   │   └── exporters.ts
│   ├── output/
│   │   ├── schema.ts
│   │   └── validator.ts
│   └── types/
│       └── figma.ts
├── __tests__/
├── fixtures/
│   └── sample-designs/
└── package.json
```

---

## Completion Criteria

- [ ] Parse Figma API response correctly
- [ ] Extract components with variants
- [ ] Layout analysis for Auto Layout
- [ ] Design tokens in 3 formats (CSS, Tailwind, JSON)
- [ ] Semantic analysis with 80%+ accuracy
- [ ] Output schema validated
- [ ] 85%+ test coverage
- [ ] Integration: Parse sample CMMC dashboard design

---

## Handoff Context for Epic 6

**What Epic 6 needs:**
- Import: `import { FigmaParser, ParsedDesign } from '@forge/figma-parser'`
- Output: `ParsedDesign` with frames, components, tokens
- Each `ParsedFrame` has layout, semantic, and style info

---

## Verification Script

```bash
#!/bin/bash
echo "🔍 Verifying Epic 5: Figma Parser"
cd packages/figma-parser

[ -f "src/parser.ts" ] || { echo "❌ parser.ts missing"; exit 1; }
[ -f "src/analysis/layout.ts" ] || { echo "❌ layout analysis missing"; exit 1; }
[ -f "src/tokens/generator.ts" ] || { echo "❌ token generator missing"; exit 1; }

pnpm test || { echo "❌ Tests failed"; exit 1; }
pnpm build || { echo "❌ Build failed"; exit 1; }

echo "✅ Epic 5 verification complete"
```
