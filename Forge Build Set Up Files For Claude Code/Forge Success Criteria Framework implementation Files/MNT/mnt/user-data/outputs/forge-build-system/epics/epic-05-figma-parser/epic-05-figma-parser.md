# Epic 05: Figma Parser

**Status:** ✅ 100% Complete  
**Duration:** 1 session  
**Owner:** joe@arcfoundry.ai  
**Created:** 2026-01-19

---

## Epic Goal

Build a robust Figma file parser that extracts design intent, component hierarchy, styling, and layout constraints from Figma designs. This is the "input" side of the Figma → Code pipeline.

---

## Files Created

| File | Lines | Description |
|------|-------|-------------|
| `types/figma-api.ts` | ~450 | Complete Figma REST API TypeScript types |
| `client/figma-client.ts` | ~400 | REST API client with caching & rate limiting |
| `extractors/components.ts` | ~350 | Component/variant/instance extraction |
| `extractors/styles.ts` | ~500 | Fill, stroke, effect, typography extraction |
| `analysis/layout.ts` | ~450 | Auto Layout → Flexbox/Grid conversion |
| `analysis/semantic.ts` | ~550 | Semantic type detection (40+ types) |
| `tokens/generator.ts` | ~450 | Design token generation (CSS/Tailwind/JSON) |
| `output/schema.ts` | ~350 | ParsedDesign output schema & validation |
| `index.ts` | ~400 | Main FigmaParser class with full exports |
| **Total** | **~3,900** | |

---

## Key Features

### 1. Figma API Client (`client/figma-client.ts`)
- Full REST API integration
- Response caching with configurable TTL
- Rate limiting (100 req/min default)
- Retry with exponential backoff
- Typed responses for files, nodes, images

### 2. Component Extraction (`extractors/components.ts`)
- Extract components and component sets (variants)
- Parse variant properties from naming conventions
- Track instances and link to source components
- Component property extraction (boolean, text, instance swap, variant)

### 3. Style Extraction (`extractors/styles.ts`)
- Fill extraction (solid, gradient, image)
- Stroke extraction (width, align, dashes)
- Effect extraction (shadows, blurs)
- Typography extraction (font, size, weight, line height)
- Named style tracking with usage counts

### 4. Layout Analysis (`analysis/layout.ts`)
- Auto Layout → Flexbox conversion
- Grid pattern detection
- Absolute positioning handling
- CSS property generation
- Child sizing analysis (fixed/hug/fill)

### 5. Semantic Analysis (`analysis/semantic.ts`)
- 40+ semantic type patterns
- Confidence scoring (0-1)
- HTML element mapping
- ARIA role suggestions
- Interactive element detection
- Name + structure pattern matching

### 6. Design Token Generation (`tokens/generator.ts`)
- Color tokens with semantic naming
- Typography scale generation
- Spacing scale extraction
- Border radius tokens
- Shadow tokens
- Export formats: CSS variables, Tailwind config, JSON

### 7. Output Schema (`output/schema.ts`)
- `ParsedDesign` - top level output
- `ParsedPage` - page with frames
- `ParsedFrame` - frame with semantic/layout/style
- `ParsedComponent` - component with props/variants
- JSON Schema for validation
- TypeScript types for all structures

---

## Usage

```typescript
import { FigmaParser, ParsedDesign } from './figma-parser';

// With API client
const parser = new FigmaParser({
  clientConfig: {
    accessToken: process.env.FIGMA_ACCESS_TOKEN,
  }
});
const design = await parser.parseFile('file-key-here');

// With local JSON data
const parser = new FigmaParser();
const design = parser.parseFileData(figmaJsonResponse, 'local');

// Access extracted data
console.log(design.tokens);        // Design tokens
console.log(design.components);    // Parsed components
console.log(design.pages[0].frames); // Parsed frames

// Export tokens
import { TokenGenerator } from './figma-parser';
const generator = new TokenGenerator();
const tokens = generator.generate(figmaFile);
console.log(generator.exportCss(tokens));
console.log(generator.exportTailwind(tokens));
```

---

## Semantic Type Coverage

| Category | Types |
|----------|-------|
| **Inputs** | button, link, input, textarea, select, checkbox, radio, switch, slider |
| **Layout** | card, list, list-item, table, table-row, table-cell, container, section, divider |
| **Navigation** | navigation, navbar, sidebar, breadcrumb, pagination, tab, tab-panel, menu, menu-item |
| **Overlays** | modal, dialog, dropdown, tooltip, accordion, accordion-item |
| **Feedback** | alert, toast, badge, tag, chip, progress, spinner |
| **Media** | image, icon, avatar |
| **Typography** | heading, paragraph, text, label |
| **Page** | header, footer, form |

---

## Integration Points

### Upstream (Input)
- Figma REST API (https://api.figma.com)
- Figma plugin exports (JSON)
- Local fixture files

### Downstream (Output)
- **Epic 06 (React Generator)**: Consumes `ParsedDesign` to generate React components
- **Epic 04 (Convergence Engine)**: Validates generated code against design intent
- **Epic 08 (Evidence Packs)**: Records design → code mapping for compliance

---

## Handoff Context for Epic 06

```typescript
// What Epic 06 imports
import {
  FigmaParser,
  ParsedDesign,
  ParsedFrame,
  ParsedComponent,
  DesignTokens,
  SemanticAnalysis,
  LayoutAnalysis,
} from '@forge/figma-parser';

// Each ParsedFrame contains:
interface ParsedFrame {
  id: string;
  name: string;
  type: string;
  semantic: SemanticAnalysis;  // { type, confidence, htmlElement, ariaRole, interactive }
  layout: LayoutAnalysis;       // { type: 'flex'|'grid'|'absolute', ... }
  styles: NodeStyles;          // { fills, strokes, effects, typography, cornerRadius }
  children: ParsedFrame[];
  textContent?: string;
  componentRef?: string;
}
```

---

## Verification

```bash
bash figma-parser/tests/quick-test.sh
```

---

## Status

✅ **COMPLETE** - Ready for Epic 06 consumption
