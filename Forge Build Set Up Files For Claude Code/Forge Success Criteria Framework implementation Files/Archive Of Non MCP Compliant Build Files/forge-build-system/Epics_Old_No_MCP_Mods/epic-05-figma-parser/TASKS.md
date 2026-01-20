# Epic 5: Figma Parser - Atomic Task Breakdown

**Total Tasks:** 10  
**Estimated Tokens:** 50K total (~5K per task)  
**Estimated Time:** 5 days

---

## Phase 5.1: Package Setup & API Client

### Task 5.1.1: Create figma-parser package structure

**Time:** 5 minutes  
**Tokens:** ~3K  
**Files to CREATE:**
- `packages/figma-parser/package.json`
- `packages/figma-parser/tsconfig.json`
- `packages/figma-parser/src/index.ts`

**Directory Structure:**
```
packages/figma-parser/
├── src/
│   ├── index.ts
│   ├── client/
│   ├── extractors/
│   ├── analysis/
│   ├── tokens/
│   └── types/
├── __tests__/
│   └── fixtures/
├── package.json
└── tsconfig.json
```

**Acceptance Criteria:**
- [ ] Package name is `@forge/figma-parser`
- [ ] Dependencies: none external (uses fetch)
- [ ] `pnpm build` succeeds

**Verification:**
```bash
cd packages/figma-parser && pnpm build
```

---

### Task 5.1.2: Define Figma API types

**Time:** 5 minutes  
**Tokens:** ~5K  
**Files to CREATE:**
- `packages/figma-parser/src/types/figma-api.ts`

**Types:**
```typescript
export interface FigmaFile {
  name: string;
  lastModified: string;
  version: string;
  document: DocumentNode;
  components: Record<string, ComponentMetadata>;
  styles: Record<string, StyleMetadata>;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: FigmaNodeType;
  visible?: boolean;
  children?: FigmaNode[];
  
  // Layout
  absoluteBoundingBox?: Rectangle;
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  
  // Styling
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  cornerRadius?: number;
  
  // Text
  characters?: string;
  style?: TypeStyle;
}

export type FigmaNodeType = 
  | 'DOCUMENT' | 'CANVAS' | 'FRAME' | 'GROUP'
  | 'COMPONENT' | 'COMPONENT_SET' | 'INSTANCE'
  | 'TEXT' | 'RECTANGLE' | 'ELLIPSE' | 'LINE'
  | 'VECTOR' | 'BOOLEAN_OPERATION';
```

**Acceptance Criteria:**
- [ ] All Figma API types defined
- [ ] Node types enum complete
- [ ] Layout properties included
- [ ] Styling properties included

**Verification:**
```bash
pnpm build
```

---

### Task 5.1.3: Create FigmaClient class

**Time:** 8 minutes  
**Tokens:** ~6K  
**Files to CREATE:**
- `packages/figma-parser/src/client/figma-client.ts`

**Implementation:**
```typescript
export class FigmaClient {
  private baseUrl = 'https://api.figma.com/v1';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  
  constructor(private accessToken: string) {}
  
  async getFile(fileKey: string): Promise<FigmaFile> {
    return this.request(`/files/${fileKey}`);
  }
  
  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<FigmaNodes> {
    const ids = nodeIds.join(',');
    return this.request(`/files/${fileKey}/nodes?ids=${ids}`);
  }
  
  async getImages(fileKey: string, nodeIds: string[], options?: ImageOptions): Promise<ImageUrls> {
    const { format = 'png', scale = 2 } = options || {};
    const ids = nodeIds.join(',');
    return this.request(`/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`);
  }
  
  private async request<T>(path: string): Promise<T> {
    // Check cache
    const cached = this.cache.get(path);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'X-Figma-Token': this.accessToken }
    });
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '60';
      throw new RateLimitError(parseInt(retryAfter));
    }
    
    if (!response.ok) {
      throw new FigmaAPIError(response.status, await response.text());
    }
    
    const data = await response.json();
    this.cache.set(path, { data, timestamp: Date.now() });
    return data;
  }
}
```

**Acceptance Criteria:**
- [ ] Fetches files by key
- [ ] Fetches specific nodes
- [ ] Exports images
- [ ] Caches responses
- [ ] Handles rate limiting

**Verification:**
```bash
pnpm test -- --grep "FigmaClient"
```

---

## Phase 5.2: Component & Style Extraction

### Task 5.2.1: Create ComponentExtractor

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/figma-parser/src/extractors/components.ts`

**Implementation:**
```typescript
export interface ExtractedComponent {
  id: string;
  name: string;
  key: string;
  description?: string;
  node: FigmaNode;
  variants?: Map<string, VariantProperty>;
  instances: ComponentInstance[];
}

export class ComponentExtractor {
  extract(file: FigmaFile): ExtractedComponent[] {
    const components: ExtractedComponent[] = [];
    
    for (const [id, meta] of Object.entries(file.components)) {
      const node = this.findNode(file.document, id);
      if (!node) continue;
      
      components.push({
        id,
        name: meta.name,
        key: meta.key,
        description: meta.description,
        node,
        variants: this.extractVariants(node),
        instances: this.findInstances(file.document, meta.key)
      });
    }
    
    return components;
  }
  
  private extractVariants(node: FigmaNode): Map<string, VariantProperty> {
    // Extract from COMPONENT_SET if parent is one
    const variants = new Map<string, VariantProperty>();
    // Parse variant properties from name (e.g., "Size=Large, State=Hover")
    return variants;
  }
  
  private findInstances(root: FigmaNode, componentKey: string): ComponentInstance[] {
    const instances: ComponentInstance[] = [];
    this.walkNodes(root, node => {
      if (node.type === 'INSTANCE' && node.componentId === componentKey) {
        instances.push({ id: node.id, overrides: node.overrides || [] });
      }
    });
    return instances;
  }
}
```

**Acceptance Criteria:**
- [ ] Extracts all components from file
- [ ] Includes component metadata
- [ ] Extracts variant properties
- [ ] Finds all instances

**Verification:**
```bash
pnpm test -- --grep "ComponentExtractor"
```

---

### Task 5.2.2: Create StyleExtractor

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/figma-parser/src/extractors/styles.ts`

**Implementation:**
```typescript
export interface ExtractedStyles {
  colors: ColorStyle[];
  typography: TypographyStyle[];
  effects: EffectStyle[];
}

export class StyleExtractor {
  extract(file: FigmaFile): ExtractedStyles {
    const colors: ColorStyle[] = [];
    const typography: TypographyStyle[] = [];
    const effects: EffectStyle[] = [];
    
    for (const [id, style] of Object.entries(file.styles)) {
      switch (style.styleType) {
        case 'FILL':
          colors.push(this.extractColorStyle(id, style));
          break;
        case 'TEXT':
          typography.push(this.extractTypographyStyle(id, style));
          break;
        case 'EFFECT':
          effects.push(this.extractEffectStyle(id, style));
          break;
      }
    }
    
    return { colors, typography, effects };
  }
  
  private extractColorStyle(id: string, meta: StyleMetadata): ColorStyle {
    return {
      id,
      name: meta.name,
      // Will be populated when we find a node using this style
      value: null
    };
  }
}
```

**Acceptance Criteria:**
- [ ] Extracts color styles
- [ ] Extracts typography styles
- [ ] Extracts effect styles
- [ ] Links styles to values

**Verification:**
```bash
pnpm test -- --grep "StyleExtractor"
```

---

## Phase 5.3: Layout Analysis

### Task 5.3.1: Create LayoutAnalyzer

**Time:** 8 minutes  
**Tokens:** ~6K  
**Files to CREATE:**
- `packages/figma-parser/src/analysis/layout.ts`

**Implementation:**
```typescript
export type LayoutStrategy = 'flex-row' | 'flex-column' | 'grid' | 'absolute' | 'none';

export interface LayoutAnalysis {
  strategy: LayoutStrategy;
  direction?: 'row' | 'column';
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
  align?: 'start' | 'center' | 'end' | 'stretch';
  gap?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  wrap?: boolean;
}

export class LayoutAnalyzer {
  analyze(node: FigmaNode): LayoutAnalysis {
    // Auto Layout → Flexbox
    if (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL') {
      return this.analyzeAutoLayout(node);
    }
    
    // Grid detection (children in grid pattern)
    if (this.detectsGridPattern(node)) {
      return this.analyzeGrid(node);
    }
    
    // Absolute positioning
    if (node.children?.length && !node.layoutMode) {
      return { strategy: 'absolute' };
    }
    
    return { strategy: 'none' };
  }
  
  private analyzeAutoLayout(node: FigmaNode): LayoutAnalysis {
    return {
      strategy: node.layoutMode === 'HORIZONTAL' ? 'flex-row' : 'flex-column',
      direction: node.layoutMode === 'HORIZONTAL' ? 'row' : 'column',
      justify: this.mapAxisAlign(node.primaryAxisAlignItems),
      align: this.mapAxisAlign(node.counterAxisAlignItems),
      gap: node.itemSpacing,
      padding: {
        top: node.paddingTop || 0,
        right: node.paddingRight || 0,
        bottom: node.paddingBottom || 0,
        left: node.paddingLeft || 0
      }
    };
  }
  
  private mapAxisAlign(value?: string): LayoutAnalysis['justify'] {
    const map: Record<string, LayoutAnalysis['justify']> = {
      'MIN': 'start',
      'CENTER': 'center',
      'MAX': 'end',
      'SPACE_BETWEEN': 'space-between'
    };
    return map[value || ''] || 'start';
  }
}
```

**Acceptance Criteria:**
- [ ] Detects Auto Layout → Flexbox
- [ ] Detects grid patterns
- [ ] Handles absolute positioning
- [ ] Extracts gap, padding, alignment

**Verification:**
```bash
pnpm test -- --grep "LayoutAnalyzer"
```

---

## Phase 5.4: Semantic Analysis

### Task 5.4.1: Create SemanticAnalyzer

**Time:** 8 minutes  
**Tokens:** ~6K  
**Files to CREATE:**
- `packages/figma-parser/src/analysis/semantic.ts`

**Implementation:**
```typescript
export type SemanticType = 
  | 'button' | 'link' | 'input' | 'textarea' | 'select'
  | 'card' | 'list' | 'list-item' | 'table' | 'table-row' | 'table-cell'
  | 'navigation' | 'header' | 'footer' | 'modal' | 'form'
  | 'image' | 'icon' | 'avatar' | 'badge' | 'tag'
  | 'container' | 'section' | 'unknown';

export interface SemanticAnalysis {
  type: SemanticType;
  confidence: number;
  htmlElement: string;
  ariaRole?: string;
  interactive: boolean;
  textContent?: string;
}

export class SemanticAnalyzer {
  private patterns: SemanticPattern[] = [
    { regex: /btn|button/i, type: 'button', element: 'button', interactive: true },
    { regex: /input|field|textbox/i, type: 'input', element: 'input', interactive: true },
    { regex: /card/i, type: 'card', element: 'article', interactive: false },
    { regex: /nav|menu/i, type: 'navigation', element: 'nav', interactive: false },
    { regex: /header|topbar/i, type: 'header', element: 'header', interactive: false },
    { regex: /footer/i, type: 'footer', element: 'footer', interactive: false },
    { regex: /modal|dialog|popup/i, type: 'modal', element: 'dialog', interactive: true },
    { regex: /list/i, type: 'list', element: 'ul', interactive: false },
    { regex: /table/i, type: 'table', element: 'table', interactive: false },
    { regex: /image|img|photo/i, type: 'image', element: 'img', interactive: false },
    { regex: /icon/i, type: 'icon', element: 'span', interactive: false },
  ];
  
  analyze(node: FigmaNode): SemanticAnalysis {
    // Try name-based detection
    const nameMatch = this.matchByName(node.name);
    if (nameMatch.confidence > 0.7) return nameMatch;
    
    // Try structure-based detection
    const structureMatch = this.matchByStructure(node);
    if (structureMatch.confidence > 0.6) return structureMatch;
    
    // Default to container
    return {
      type: 'container',
      confidence: 0.3,
      htmlElement: 'div',
      interactive: false
    };
  }
  
  private matchByName(name: string): SemanticAnalysis {
    for (const pattern of this.patterns) {
      if (pattern.regex.test(name)) {
        return {
          type: pattern.type,
          confidence: 0.9,
          htmlElement: pattern.element,
          interactive: pattern.interactive
        };
      }
    }
    return { type: 'unknown', confidence: 0, htmlElement: 'div', interactive: false };
  }
}
```

**Acceptance Criteria:**
- [ ] Detects common component types
- [ ] Name-based pattern matching
- [ ] Structure-based detection
- [ ] Returns confidence score
- [ ] Maps to HTML elements

**Verification:**
```bash
pnpm test -- --grep "SemanticAnalyzer"
```

---

## Phase 5.5: Design Token Generation

### Task 5.5.1: Create TokenGenerator

**Time:** 5 minutes  
**Tokens:** ~5K  
**Files to CREATE:**
- `packages/figma-parser/src/tokens/generator.ts`

**Implementation:**
```typescript
export interface DesignTokens {
  colors: Record<string, string>;
  typography: Record<string, TypographyToken>;
  spacing: number[];
  radii: number[];
  shadows: Record<string, string>;
}

export class TokenGenerator {
  generate(styles: ExtractedStyles, nodes: FigmaNode[]): DesignTokens {
    return {
      colors: this.generateColorTokens(styles.colors, nodes),
      typography: this.generateTypographyTokens(styles.typography),
      spacing: this.extractSpacingScale(nodes),
      radii: this.extractRadiusScale(nodes),
      shadows: this.generateShadowTokens(nodes)
    };
  }
  
  private generateColorTokens(styles: ColorStyle[], nodes: FigmaNode[]): Record<string, string> {
    const tokens: Record<string, string> = {};
    
    for (const style of styles) {
      const tokenName = this.normalizeTokenName(style.name);
      const color = this.findColorValue(style.id, nodes);
      if (color) {
        tokens[tokenName] = this.colorToHex(color);
      }
    }
    
    return tokens;
  }
  
  private extractSpacingScale(nodes: FigmaNode[]): number[] {
    const spacings = new Set<number>();
    
    this.walkNodes(nodes, node => {
      if (node.itemSpacing) spacings.add(node.itemSpacing);
      if (node.paddingLeft) spacings.add(node.paddingLeft);
      if (node.paddingTop) spacings.add(node.paddingTop);
    });
    
    return Array.from(spacings).sort((a, b) => a - b);
  }
  
  exportToTailwind(tokens: DesignTokens): TailwindConfig {
    return {
      theme: {
        extend: {
          colors: tokens.colors,
          spacing: this.spacingToTailwind(tokens.spacing),
          borderRadius: this.radiiToTailwind(tokens.radii)
        }
      }
    };
  }
}
```

**Acceptance Criteria:**
- [ ] Extracts color tokens
- [ ] Extracts typography tokens
- [ ] Extracts spacing scale
- [ ] Exports to Tailwind format

**Verification:**
```bash
pnpm test -- --grep "TokenGenerator"
```

---

## Phase 5.6: Parser Output

### Task 5.6.1: Create FigmaParser main class

**Time:** 5 minutes  
**Tokens:** ~4K  
**Files to CREATE:**
- `packages/figma-parser/src/parser.ts`

**Implementation:**
```typescript
export interface ParsedDesign {
  version: '1.0.0';
  metadata: DesignMetadata;
  pages: ParsedPage[];
  components: ParsedComponent[];
  tokens: DesignTokens;
}

export interface ParsedComponent {
  id: string;
  name: string;
  semantic: SemanticAnalysis;
  layout: LayoutAnalysis;
  styles: NodeStyles;
  children: ParsedComponent[];
  variants?: Map<string, VariantProperty>;
}

export class FigmaParser {
  private client: FigmaClient;
  private componentExtractor = new ComponentExtractor();
  private styleExtractor = new StyleExtractor();
  private layoutAnalyzer = new LayoutAnalyzer();
  private semanticAnalyzer = new SemanticAnalyzer();
  private tokenGenerator = new TokenGenerator();
  
  constructor(accessToken: string) {
    this.client = new FigmaClient(accessToken);
  }
  
  async parse(fileKey: string): Promise<ParsedDesign> {
    const file = await this.client.getFile(fileKey);
    
    const components = this.componentExtractor.extract(file);
    const styles = this.styleExtractor.extract(file);
    const tokens = this.tokenGenerator.generate(styles, [file.document]);
    
    const pages = this.parsePages(file.document.children);
    const parsedComponents = components.map(c => this.parseComponent(c.node));
    
    return {
      version: '1.0.0',
      metadata: {
        name: file.name,
        lastModified: file.lastModified,
        fileKey
      },
      pages,
      components: parsedComponents,
      tokens
    };
  }
  
  private parseComponent(node: FigmaNode): ParsedComponent {
    return {
      id: node.id,
      name: node.name,
      semantic: this.semanticAnalyzer.analyze(node),
      layout: this.layoutAnalyzer.analyze(node),
      styles: this.extractStyles(node),
      children: (node.children || []).map(c => this.parseComponent(c))
    };
  }
}
```

**Acceptance Criteria:**
- [ ] Fetches and parses Figma file
- [ ] Combines all extractors/analyzers
- [ ] Returns ParsedDesign structure
- [ ] Processes all pages and components

**Verification:**
```bash
pnpm test -- --grep "FigmaParser"
```

---

### Task 5.6.2: Export package and create test fixtures

**Time:** 5 minutes  
**Tokens:** ~3K  
**Files to MODIFY:**
- `packages/figma-parser/src/index.ts`

**Files to CREATE:**
- `packages/figma-parser/__tests__/fixtures/sample-design.json`

**Exports:**
```typescript
export { FigmaParser, ParsedDesign, ParsedComponent } from './parser';
export { FigmaClient } from './client/figma-client';
export { ComponentExtractor } from './extractors/components';
export { StyleExtractor } from './extractors/styles';
export { LayoutAnalyzer, LayoutAnalysis } from './analysis/layout';
export { SemanticAnalyzer, SemanticAnalysis, SemanticType } from './analysis/semantic';
export { TokenGenerator, DesignTokens } from './tokens/generator';
export * from './types/figma-api';
```

**Acceptance Criteria:**
- [ ] All public APIs exported
- [ ] Test fixture with sample Figma response
- [ ] Integration test passes
- [ ] Package builds successfully

**Verification:**
```bash
cd packages/figma-parser && pnpm build && pnpm test
```

---

## Epic 5 Completion Checklist

Before moving to Epic 6:

- [ ] All 10 tasks marked [x] in progress.md
- [ ] `pnpm build` succeeds for figma-parser
- [ ] `pnpm test` passes (>80% coverage)
- [ ] FigmaClient works with test fixtures
- [ ] Layout analysis detects Auto Layout
- [ ] Semantic analysis classifies components
- [ ] Design tokens extracted
- [ ] ParsedDesign structure complete

**Then run:** `.forge/agent-bootstrap.sh next-epic`
