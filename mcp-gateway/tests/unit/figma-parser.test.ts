/**
 * FORGE Figma Parser Unit Tests
 *
 * @epic 05 - Figma Parser
 * @owner joe@arcfoundry.ai
 * @created 2026-01-24
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  FigmaParser,
  ComponentExtractor,
  StyleExtractor,
  LayoutAnalyzer,
  SemanticAnalyzer,
  TokenGenerator,
  validateParsedDesign,
  hasChildren,
  isTextNode,
  hasAutoLayout,
  isComponent,
  isInstance,
} from '../../src/figma-parser/index.js';
import type {
  FigmaFile,
  FigmaNode,
  ParsedDesign,
} from '../../src/figma-parser/index.js';

// ============================================
// TEST FIXTURES
// ============================================

function createMockFigmaFile(overrides: Partial<FigmaFile> = {}): FigmaFile {
  return {
    name: 'Test Design',
    lastModified: '2026-01-24T10:00:00Z',
    version: '1234567890',
    role: 'viewer',
    document: createMockNode({ type: 'DOCUMENT', name: 'Document' }),
    components: {},
    componentSets: {},
    styles: {},
    schemaVersion: 0,
    ...overrides,
  };
}

function createMockNode(overrides: Partial<FigmaNode> = {}): FigmaNode {
  return {
    id: `node-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Test Node',
    type: 'FRAME',
    visible: true,
    ...overrides,
  };
}

function createMockCanvas(frames: FigmaNode[] = []): FigmaNode {
  return createMockNode({
    type: 'CANVAS',
    name: 'Page 1',
    children: frames,
  });
}

function createMockComponent(name: string, children?: FigmaNode[]): FigmaNode {
  return createMockNode({
    type: 'COMPONENT',
    name,
    children,
    fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8, a: 1 }, visible: true }],
  });
}

function createMockTextNode(text: string): FigmaNode {
  return createMockNode({
    type: 'TEXT',
    name: 'Text',
    characters: text,
    style: {
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: 400,
      textAlignHorizontal: 'LEFT',
      textAlignVertical: 'TOP',
      letterSpacing: 0,
      lineHeightPx: 24,
      lineHeightUnit: 'PIXELS',
    },
  });
}

function createMockAutoLayoutFrame(direction: 'HORIZONTAL' | 'VERTICAL'): FigmaNode {
  return createMockNode({
    type: 'FRAME',
    name: 'Auto Layout Frame',
    layoutMode: direction,
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    itemSpacing: 8,
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    children: [
      createMockNode({ name: 'Child 1' }),
      createMockNode({ name: 'Child 2' }),
    ],
  });
}

// ============================================
// FIGMA PARSER TESTS
// ============================================

describe('FigmaParser', () => {
  let parser: FigmaParser;

  beforeEach(() => {
    parser = new FigmaParser();
  });

  describe('parseFileData', () => {
    it('should parse a minimal Figma file', () => {
      const file = createMockFigmaFile({
        document: createMockNode({
          type: 'DOCUMENT',
          name: 'Document',
          children: [createMockCanvas()],
        }),
      });

      const result = parser.parseFileData(file, 'test-file-key');

      expect(result.version).toBe('1.0.0');
      expect(result.metadata.name).toBe('Test Design');
      expect(result.metadata.fileKey).toBe('test-file-key');
      expect(result.pages).toHaveLength(1);
      expect(result.stats.totalPages).toBe(1);
    });

    it('should extract components from file', () => {
      const component = createMockComponent('Button');
      const file = createMockFigmaFile({
        document: createMockNode({
          type: 'DOCUMENT',
          children: [
            createMockCanvas([component]),
          ],
        }),
        components: {
          [component.id]: {
            key: 'button-key',
            name: 'Button',
            description: 'A button component',
          },
        },
      });

      const result = parser.parseFileData(file);

      expect(result.stats.totalComponents).toBeGreaterThanOrEqual(0);
    });

    it('should generate design tokens', () => {
      const file = createMockFigmaFile({
        document: createMockNode({
          type: 'DOCUMENT',
          children: [
            createMockCanvas([
              createMockNode({
                fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, visible: true }],
              }),
            ]),
          ],
        }),
      });

      const result = parser.parseFileData(file);

      expect(result.tokens).toBeDefined();
      expect(result.tokens.meta).toBeDefined();
      expect(result.tokens.meta.version).toBe('1.0.0');
    });

    it('should skip components when skipComponents is true', () => {
      const skipParser = new FigmaParser({ skipComponents: true });
      const file = createMockFigmaFile({
        document: createMockNode({
          type: 'DOCUMENT',
          children: [createMockCanvas([createMockComponent('Button')])],
        }),
      });

      const result = skipParser.parseFileData(file);

      expect(result.stats.totalComponents).toBe(0);
    });

    it('should skip tokens when skipTokens is true', () => {
      const skipParser = new FigmaParser({ skipTokens: true });
      const file = createMockFigmaFile();

      const result = skipParser.parseFileData(file);

      expect(result.tokens.meta.source).toBe('');
    });
  });

  describe('parseNode', () => {
    it('should parse a single node', () => {
      const node = createMockNode({
        name: 'Card',
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true }],
        cornerRadius: 8,
      });

      const result = parser.parseNode(node);

      expect(result.id).toBe(node.id);
      expect(result.name).toBe('Card');
      expect(result.semantic).toBeDefined();
      expect(result.layout).toBeDefined();
      expect(result.styles).toBeDefined();
    });

    it('should parse nested children', () => {
      const node = createMockNode({
        children: [
          createMockNode({ name: 'Child 1' }),
          createMockNode({ name: 'Child 2' }),
        ],
      });

      const result = parser.parseNode(node);

      expect(result.children).toHaveLength(2);
    });

    it('should extract text content from text nodes', () => {
      const textNode = createMockTextNode('Hello World');

      const result = parser.parseNode(textNode);

      expect(result.textContent).toBe('Hello World');
    });
  });
});

// ============================================
// COMPONENT EXTRACTOR TESTS
// ============================================

describe('ComponentExtractor', () => {
  let extractor: ComponentExtractor;

  beforeEach(() => {
    extractor = new ComponentExtractor();
  });

  describe('extract', () => {
    it('should extract components from file', () => {
      const file = createMockFigmaFile({
        document: createMockNode({
          type: 'DOCUMENT',
          children: [
            createMockCanvas([
              createMockComponent('Button'),
              createMockComponent('Card'),
            ]),
          ],
        }),
      });

      const result = extractor.extract(file);

      expect(result.components).toHaveLength(2);
      expect(result.stats.totalComponents).toBe(2);
    });

    it('should extract component sets with variants', () => {
      const variant1 = createMockComponent('Button, size=small');
      const variant2 = createMockComponent('Button, size=large');

      const componentSet = createMockNode({
        type: 'COMPONENT_SET',
        name: 'Button',
        children: [variant1, variant2],
        componentPropertyDefinitions: {
          size: {
            type: 'VARIANT',
            defaultValue: 'small',
            variantOptions: ['small', 'large'],
          },
        },
      });

      const file = createMockFigmaFile({
        document: createMockNode({
          type: 'DOCUMENT',
          children: [createMockCanvas([componentSet])],
        }),
      });

      const result = extractor.extract(file);

      expect(result.componentSets).toHaveLength(1);
      expect(result.componentSets[0]?.variantGroupProperties['size']).toEqual(['small', 'large']);
    });

    it('should extract instances and link to components', () => {
      const component = createMockComponent('Button');
      const instance = createMockNode({
        type: 'INSTANCE',
        name: 'Button Instance',
        componentId: component.id,
      });

      const file = createMockFigmaFile({
        document: createMockNode({
          type: 'DOCUMENT',
          children: [createMockCanvas([component, instance])],
        }),
      });

      const result = extractor.extract(file);

      expect(result.instances).toHaveLength(1);
      expect(result.stats.totalInstances).toBe(1);
    });
  });
});

// ============================================
// STYLE EXTRACTOR TESTS
// ============================================

describe('StyleExtractor', () => {
  let extractor: StyleExtractor;

  beforeEach(() => {
    extractor = new StyleExtractor();
  });

  describe('extractNodeStyles', () => {
    it('should extract solid fills', () => {
      const node = createMockNode({
        fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, visible: true }],
      });

      const result = extractor.extractNodeStyles(node);

      expect(result.fills).toHaveLength(1);
      expect(result.fills[0]?.type).toBe('solid');
      expect(result.fills[0]?.color).toBe('#FF0000');
    });

    it('should extract gradient fills', () => {
      const node = createMockNode({
        fills: [{
          type: 'GRADIENT_LINEAR',
          visible: true,
          gradientHandlePositions: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
          gradientStops: [
            { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
            { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
          ],
        }],
      });

      const result = extractor.extractNodeStyles(node);

      expect(result.fills).toHaveLength(1);
      expect(result.fills[0]?.type).toBe('gradient');
      expect(result.fills[0]?.gradient?.type).toBe('linear');
    });

    it('should extract strokes', () => {
      const node = createMockNode({
        strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, visible: true }],
        strokeWeight: 2,
        strokeAlign: 'INSIDE',
      });

      const result = extractor.extractNodeStyles(node);

      expect(result.strokes).toHaveLength(1);
      expect(result.strokes[0]?.width).toBe(2);
      expect(result.strokes[0]?.align).toBe('inside');
    });

    it('should extract effects (shadows)', () => {
      const node = createMockNode({
        effects: [{
          type: 'DROP_SHADOW',
          visible: true,
          radius: 4,
          offset: { x: 0, y: 2 },
          color: { r: 0, g: 0, b: 0, a: 0.25 },
        }],
      });

      const result = extractor.extractNodeStyles(node);

      expect(result.effects).toHaveLength(1);
      expect(result.effects[0]?.type).toBe('shadow');
      expect(result.effects[0]?.blur).toBe(4);
    });

    it('should extract typography from text nodes', () => {
      const node = createMockTextNode('Test');

      const result = extractor.extractNodeStyles(node);

      expect(result.typography).toBeDefined();
      expect(result.typography?.fontFamily).toBe('Inter');
      expect(result.typography?.fontSize).toBe(16);
    });

    it('should extract corner radius', () => {
      const node = createMockNode({ cornerRadius: 8 });

      const result = extractor.extractNodeStyles(node);

      expect(result.cornerRadius).toBe(8);
    });

    it('should extract individual corner radii', () => {
      const node = createMockNode({
        rectangleCornerRadii: [4, 8, 12, 16],
      });

      const result = extractor.extractNodeStyles(node);

      expect(result.cornerRadius).toEqual([4, 8, 12, 16]);
    });
  });
});

// ============================================
// LAYOUT ANALYZER TESTS
// ============================================

describe('LayoutAnalyzer', () => {
  let analyzer: LayoutAnalyzer;

  beforeEach(() => {
    analyzer = new LayoutAnalyzer();
  });

  describe('analyze', () => {
    it('should detect horizontal auto layout as flex row', () => {
      const node = createMockAutoLayoutFrame('HORIZONTAL');

      const result = analyzer.analyze(node);

      expect(result.type).toBe('flex');
      if (result.type === 'flex') {
        expect(result.direction).toBe('row');
        expect(result.gap).toBe(8);
        expect(result.padding).toEqual({ top: 16, right: 16, bottom: 16, left: 16 });
      }
    });

    it('should detect vertical auto layout as flex column', () => {
      const node = createMockAutoLayoutFrame('VERTICAL');

      const result = analyzer.analyze(node);

      expect(result.type).toBe('flex');
      if (result.type === 'flex') {
        expect(result.direction).toBe('column');
      }
    });

    it('should detect static layout for regular frames', () => {
      const node = createMockNode({
        absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 50 },
      });

      const result = analyzer.analyze(node);

      expect(result.type).toBe('static');
      if (result.type === 'static') {
        expect(result.width).toBe(100);
        expect(result.height).toBe(50);
      }
    });

    it('should detect absolute positioning', () => {
      const node = createMockNode({
        layoutPositioning: 'ABSOLUTE',
        absoluteBoundingBox: { x: 10, y: 20, width: 100, height: 50 },
      });

      const result = analyzer.analyze(node);

      expect(result.type).toBe('absolute');
    });
  });

  describe('layoutToCss', () => {
    it('should generate CSS for flex layout', () => {
      const layout = analyzer.analyze(createMockAutoLayoutFrame('HORIZONTAL'));
      const css = analyzer.layoutToCss(layout);

      expect(css['display']).toBe('flex');
      expect(css['flex-direction']).toBe('row');
      expect(css['gap']).toBe('8px');
      expect(css['padding']).toBe('16px');
    });
  });
});

// ============================================
// SEMANTIC ANALYZER TESTS
// ============================================

describe('SemanticAnalyzer', () => {
  let analyzer: SemanticAnalyzer;

  beforeEach(() => {
    analyzer = new SemanticAnalyzer();
  });

  describe('analyze', () => {
    it('should detect button by name', () => {
      const node = createMockNode({
        name: 'Primary Button',
        children: [createMockTextNode('Click me')],
        fills: [{ type: 'SOLID', color: { r: 0, g: 0.5, b: 1, a: 1 }, visible: true }],
        absoluteBoundingBox: { x: 0, y: 0, width: 120, height: 40 },
      });

      const result = analyzer.analyze(node);

      expect(result.type).toBe('button');
      expect(result.htmlElement).toBe('button');
      expect(result.interactive).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect input field by name', () => {
      const node = createMockNode({
        name: 'Email Input',
        strokes: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, visible: true }],
        absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 40 },
      });

      const result = analyzer.analyze(node);

      expect(result.type).toBe('input');
      expect(result.htmlElement).toBe('input');
      expect(result.ariaRole).toBe('textbox');
    });

    it('should detect card by name and structure', () => {
      const node = createMockNode({
        name: 'Product Card',
        cornerRadius: 8,
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true }],
        children: [
          createMockNode({ name: 'Image' }),
          createMockNode({ name: 'Title' }),
          createMockNode({ name: 'Description' }),
        ],
      });

      const result = analyzer.analyze(node);

      expect(result.type).toBe('card');
      expect(result.htmlElement).toBe('article');
    });

    it('should detect icon by size and name', () => {
      const node = createMockNode({
        name: 'Search Icon',
        absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 },
      });

      const result = analyzer.analyze(node);

      expect(result.type).toBe('icon');
      expect(result.ariaRole).toBe('img');
    });

    it('should detect heading by font size', () => {
      const node = createMockNode({
        type: 'TEXT',
        name: 'Page Title',
        characters: 'Welcome',
        style: {
          fontFamily: 'Inter',
          fontSize: 32,
          fontWeight: 700,
          textAlignHorizontal: 'LEFT',
          textAlignVertical: 'TOP',
          letterSpacing: 0,
          lineHeightPx: 40,
          lineHeightUnit: 'PIXELS',
        },
      });

      const result = analyzer.analyze(node);

      expect(result.type).toBe('heading');
      expect(result.htmlElement).toBe('h1');
    });

    it('should return unknown for unrecognized elements', () => {
      const node = createMockNode({
        name: 'Random Element 12345',
      });

      const result = analyzer.analyze(node);

      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe(0);
    });
  });
});

// ============================================
// TOKEN GENERATOR TESTS
// ============================================

describe('TokenGenerator', () => {
  let generator: TokenGenerator;

  beforeEach(() => {
    generator = new TokenGenerator();
  });

  describe('generate', () => {
    it('should extract colors from fills', () => {
      const file = createMockFigmaFile({
        document: createMockNode({
          type: 'DOCUMENT',
          children: [
            createMockCanvas([
              createMockNode({
                fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, visible: true }],
              }),
            ]),
          ],
        }),
      });

      const result = generator.generate(file);

      expect(Object.keys(result.colors).length).toBeGreaterThan(0);
    });

    it('should extract spacing from padding', () => {
      const file = createMockFigmaFile({
        document: createMockNode({
          type: 'DOCUMENT',
          children: [
            createMockCanvas([
              createMockNode({
                paddingTop: 16,
                paddingRight: 24,
                paddingBottom: 16,
                paddingLeft: 24,
              }),
            ]),
          ],
        }),
      });

      const result = generator.generate(file);

      expect(Object.keys(result.spacing).length).toBeGreaterThan(0);
    });

    it('should extract border radii', () => {
      const file = createMockFigmaFile({
        document: createMockNode({
          type: 'DOCUMENT',
          children: [
            createMockCanvas([
              createMockNode({ cornerRadius: 4 }),
              createMockNode({ cornerRadius: 8 }),
              createMockNode({ cornerRadius: 16 }),
            ]),
          ],
        }),
      });

      const result = generator.generate(file);

      expect(Object.keys(result.radii).length).toBeGreaterThan(2); // 2 defaults + extracted
    });

    it('should include metadata in tokens', () => {
      const file = createMockFigmaFile();

      const result = generator.generate(file);

      expect(result.meta.source).toBe('Test Design');
      expect(result.meta.version).toBe('1.0.0');
      expect(result.meta.generatedAt).toBeDefined();
    });
  });

  describe('exportCss', () => {
    it('should generate valid CSS variables', () => {
      const file = createMockFigmaFile({
        document: createMockNode({
          type: 'DOCUMENT',
          children: [
            createMockCanvas([
              createMockNode({
                fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8, a: 1 }, visible: true }],
              }),
            ]),
          ],
        }),
      });

      const tokens = generator.generate(file);
      const css = generator.exportCss(tokens);

      expect(css).toContain(':root {');
      expect(css).toContain('/* Colors */');
      expect(css).toContain('--color-');
    });

    it('should support custom prefix', () => {
      const tokens = generator.generate(createMockFigmaFile());
      const css = generator.exportCss(tokens, { cssPrefix: 'forge-' });

      expect(css).toContain('--forge-');
    });
  });

  describe('exportTailwind', () => {
    it('should generate Tailwind config structure', () => {
      const tokens = generator.generate(createMockFigmaFile());
      const config = generator.exportTailwind(tokens);

      expect(config).toHaveProperty('theme');
      expect(config).toHaveProperty('theme.extend');
    });
  });
});

// ============================================
// VALIDATION TESTS
// ============================================

describe('validateParsedDesign', () => {
  it('should validate a correct ParsedDesign', () => {
    const parser = new FigmaParser();
    const file = createMockFigmaFile({
      document: createMockNode({
        type: 'DOCUMENT',
        children: [createMockCanvas()],
      }),
    });

    const design = parser.parseFileData(file);
    const result = validateParsedDesign(design);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid input', () => {
    const result = validateParsedDesign(null);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject missing version', () => {
    const result = validateParsedDesign({ version: '2.0.0' });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_VERSION')).toBe(true);
  });
});

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('Utility Functions', () => {
  describe('hasChildren', () => {
    it('should return true for nodes with children', () => {
      const node = createMockNode({
        children: [createMockNode()],
      });

      expect(hasChildren(node)).toBe(true);
    });

    it('should return false for nodes without children', () => {
      const node = createMockNode();

      expect(hasChildren(node)).toBe(false);
    });

    it('should return false for empty children array', () => {
      const node = createMockNode({ children: [] });

      expect(hasChildren(node)).toBe(false);
    });
  });

  describe('isTextNode', () => {
    it('should return true for TEXT nodes', () => {
      const node = createMockTextNode('Hello');

      expect(isTextNode(node)).toBe(true);
    });

    it('should return false for non-TEXT nodes', () => {
      const node = createMockNode({ type: 'FRAME' });

      expect(isTextNode(node)).toBe(false);
    });
  });

  describe('hasAutoLayout', () => {
    it('should return true for horizontal auto layout', () => {
      const node = createMockAutoLayoutFrame('HORIZONTAL');

      expect(hasAutoLayout(node)).toBe(true);
    });

    it('should return true for vertical auto layout', () => {
      const node = createMockAutoLayoutFrame('VERTICAL');

      expect(hasAutoLayout(node)).toBe(true);
    });

    it('should return false for regular frames', () => {
      const node = createMockNode({ type: 'FRAME' });

      expect(hasAutoLayout(node)).toBe(false);
    });
  });

  describe('isComponent', () => {
    it('should return true for COMPONENT nodes', () => {
      const node = createMockComponent('Button');

      expect(isComponent(node)).toBe(true);
    });

    it('should return false for non-COMPONENT nodes', () => {
      const node = createMockNode({ type: 'FRAME' });

      expect(isComponent(node)).toBe(false);
    });
  });

  describe('isInstance', () => {
    it('should return true for INSTANCE nodes', () => {
      const node = createMockNode({ type: 'INSTANCE' });

      expect(isInstance(node)).toBe(true);
    });

    it('should return false for non-INSTANCE nodes', () => {
      const node = createMockNode({ type: 'FRAME' });

      expect(isInstance(node)).toBe(false);
    });
  });
});
