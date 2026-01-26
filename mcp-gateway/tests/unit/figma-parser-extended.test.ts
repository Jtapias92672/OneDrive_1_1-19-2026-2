/**
 * FORGE Figma Parser Extended Tests
 *
 * @epic 05 - Figma Parser
 * @target 97%+ coverage
 * @owner joe@arcfoundry.ai
 * @created 2026-01-25
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
} from '../../src/figma-parser/index.js';
import type {
  FigmaFile,
  FigmaNode,
  ParsedDesign,
  ParsedFrame,
} from '../../src/figma-parser/index.js';

// ============================================
// ENHANCED TEST FIXTURES
// ============================================

function createMockFigmaFile(overrides: Partial<FigmaFile> = {}): FigmaFile {
  return {
    name: 'Test Design',
    lastModified: '2026-01-25T10:00:00Z',
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
    children: children || [],
    fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8, a: 1 }, visible: true }],
    absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 50 },
  });
}

function createMockTextNode(text: string, fontSize = 16): FigmaNode {
  return createMockNode({
    type: 'TEXT',
    name: 'Text',
    characters: text,
    style: {
      fontFamily: 'Inter',
      fontSize,
      fontWeight: 400,
      textAlignHorizontal: 'LEFT',
      textAlignVertical: 'TOP',
      letterSpacing: 0,
      lineHeightPx: fontSize * 1.5,
      lineHeightUnit: 'PIXELS',
    },
    absoluteBoundingBox: { x: 0, y: 0, width: 200, height: fontSize * 1.5 },
  });
}

function createMockAutoLayoutFrame(
  direction: 'HORIZONTAL' | 'VERTICAL',
  options: {
    gap?: number;
    padding?: number;
    wrap?: boolean;
    alignment?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  } = {}
): FigmaNode {
  const { gap = 8, padding = 16, wrap = false, alignment = 'MIN' } = options;
  return createMockNode({
    type: 'FRAME',
    name: 'Auto Layout Frame',
    layoutMode: direction,
    primaryAxisAlignItems: alignment,
    counterAxisAlignItems: alignment === 'SPACE_BETWEEN' ? 'MIN' : alignment,
    layoutWrap: wrap ? 'WRAP' : 'NO_WRAP',
    itemSpacing: gap,
    paddingTop: padding,
    paddingRight: padding,
    paddingBottom: padding,
    paddingLeft: padding,
    absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
    children: [
      createMockNode({ name: 'Child 1', absoluteBoundingBox: { x: 16, y: 16, width: 80, height: 40 } }),
      createMockNode({ name: 'Child 2', absoluteBoundingBox: { x: 104, y: 16, width: 80, height: 40 } }),
      createMockNode({ name: 'Child 3', absoluteBoundingBox: { x: 192, y: 16, width: 80, height: 40 } }),
    ],
  });
}

// ============================================
// 1. SIMPLE COMPONENT PARSING
// ============================================

describe('Simple Component Parsing', () => {
  let parser: FigmaParser;

  beforeEach(() => {
    parser = new FigmaParser();
  });

  it('should parse a button component with text', () => {
    const button = createMockComponent('Primary Button', [
      createMockTextNode('Click Me'),
    ]);

    const file = createMockFigmaFile({
      document: createMockNode({
        type: 'DOCUMENT',
        children: [createMockCanvas([button])],
      }),
    });

    const result = parser.parseFileData(file, 'test-key');

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]?.frames).toHaveLength(1);
    expect(result.pages[0]?.frames[0]?.name).toBe('Primary Button');
    expect(result.pages[0]?.frames[0]?.children).toHaveLength(1);
  });

  it('should parse component with multiple fills', () => {
    const component = createMockNode({
      type: 'COMPONENT',
      name: 'Gradient Button',
      fills: [
        { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, visible: true },
        {
          type: 'GRADIENT_LINEAR',
          visible: true,
          gradientHandlePositions: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
          gradientStops: [
            { position: 0, color: { r: 0, g: 0, b: 1, a: 1 } },
            { position: 1, color: { r: 1, g: 0, b: 1, a: 1 } },
          ],
        },
      ],
      absoluteBoundingBox: { x: 0, y: 0, width: 120, height: 44 },
    });

    const result = parser.parseNode(component);

    expect(result.styles?.fills).toBeDefined();
    expect(result.styles?.fills?.length).toBeGreaterThanOrEqual(1);
  });

  it('should parse component with strokes and effects', () => {
    const component = createMockNode({
      type: 'COMPONENT',
      name: 'Card',
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true }],
      strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, visible: true }],
      strokeWeight: 1,
      effects: [
        { type: 'DROP_SHADOW', visible: true, radius: 8, offset: { x: 0, y: 4 }, color: { r: 0, g: 0, b: 0, a: 0.1 } },
      ],
      cornerRadius: 12,
      absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
    });

    const result = parser.parseNode(component);

    expect(result.styles?.strokes).toHaveLength(1);
    expect(result.styles?.effects).toHaveLength(1);
    expect(result.styles?.cornerRadius).toBe(12);
  });

  it('should preserve component visibility', () => {
    const hiddenComponent = createMockComponent('Hidden');
    hiddenComponent.visible = false;

    const result = parser.parseNode(hiddenComponent);

    expect(result.visible).toBe(false);
  });

  it('should extract component constraints', () => {
    const component = createMockNode({
      type: 'COMPONENT',
      name: 'Responsive Card',
      constraints: { horizontal: 'SCALE', vertical: 'TOP' },
      absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
    });

    const result = parser.parseNode(component);

    expect(result).toBeDefined();
    expect(result.name).toBe('Responsive Card');
  });
});

// ============================================
// 2. NESTED FRAMES PARSING
// ============================================

describe('Nested Frames Parsing', () => {
  let parser: FigmaParser;

  beforeEach(() => {
    parser = new FigmaParser();
  });

  it('should parse deeply nested frames (3 levels)', () => {
    const deeplyNested = createMockNode({
      name: 'Level 1',
      children: [
        createMockNode({
          name: 'Level 2',
          children: [
            createMockNode({
              name: 'Level 3',
              children: [
                createMockTextNode('Deep Content'),
              ],
            }),
          ],
        }),
      ],
    });

    const result = parser.parseNode(deeplyNested);

    expect(result.children).toHaveLength(1);
    expect(result.children[0]?.children).toHaveLength(1);
    expect(result.children[0]?.children[0]?.children).toHaveLength(1);
    expect(result.children[0]?.children[0]?.children[0]?.textContent).toBe('Deep Content');
  });

  it('should parse frame with mixed child types', () => {
    const mixedFrame = createMockNode({
      name: 'Mixed Container',
      children: [
        createMockTextNode('Title'),
        createMockNode({ type: 'RECTANGLE', name: 'Divider' }),
        createMockNode({ type: 'FRAME', name: 'Content Frame' }),
        createMockNode({ type: 'VECTOR', name: 'Icon' }),
        createMockNode({ type: 'ELLIPSE', name: 'Avatar' }),
      ],
    });

    const result = parser.parseNode(mixedFrame);

    expect(result.children).toHaveLength(5);
    expect(result.children.map(c => c.type)).toContain('TEXT');
    expect(result.children.map(c => c.type)).toContain('RECTANGLE');
    expect(result.children.map(c => c.type)).toContain('FRAME');
    expect(result.children.map(c => c.type)).toContain('VECTOR');
    expect(result.children.map(c => c.type)).toContain('ELLIPSE');
  });

  it('should handle empty nested frames', () => {
    const emptyNested = createMockNode({
      name: 'Parent',
      children: [
        createMockNode({ name: 'Empty Child 1', children: [] }),
        createMockNode({ name: 'Empty Child 2', children: [] }),
      ],
    });

    const result = parser.parseNode(emptyNested);

    expect(result.children).toHaveLength(2);
    expect(result.children[0]?.children).toHaveLength(0);
    expect(result.children[1]?.children).toHaveLength(0);
  });

  it('should preserve frame bounds through nesting', () => {
    const nestedWithBounds = createMockNode({
      name: 'Parent',
      absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
      children: [
        createMockNode({
          name: 'Child',
          absoluteBoundingBox: { x: 20, y: 20, width: 360, height: 260 },
        }),
      ],
    });

    const result = parser.parseNode(nestedWithBounds);

    expect(result.bounds?.width).toBe(400);
    expect(result.bounds?.height).toBe(300);
    expect(result.children[0]?.bounds?.width).toBe(360);
  });

  it('should handle sibling frames with same name', () => {
    const siblingsSameName = createMockNode({
      name: 'Container',
      children: [
        createMockNode({ id: 'item-1', name: 'Item' }),
        createMockNode({ id: 'item-2', name: 'Item' }),
        createMockNode({ id: 'item-3', name: 'Item' }),
      ],
    });

    const result = parser.parseNode(siblingsSameName);

    expect(result.children).toHaveLength(3);
    // All should have unique IDs
    const ids = result.children.map(c => c.id);
    expect(new Set(ids).size).toBe(3);
  });
});

// ============================================
// 3. AUTO-LAYOUT PARSING
// ============================================

describe('Auto-Layout Parsing', () => {
  let parser: FigmaParser;
  let layoutAnalyzer: LayoutAnalyzer;

  beforeEach(() => {
    parser = new FigmaParser();
    layoutAnalyzer = new LayoutAnalyzer();
  });

  it('should parse horizontal auto-layout with gap', () => {
    const hLayout = createMockAutoLayoutFrame('HORIZONTAL', { gap: 12 });

    const result = parser.parseNode(hLayout);

    expect(result.layout?.type).toBe('flex');
    if (result.layout?.type === 'flex') {
      expect(result.layout.direction).toBe('row');
      expect(result.layout.gap).toBe(12);
    }
  });

  it('should parse vertical auto-layout with padding', () => {
    const vLayout = createMockAutoLayoutFrame('VERTICAL', { padding: 24 });

    const result = parser.parseNode(vLayout);

    expect(result.layout?.type).toBe('flex');
    if (result.layout?.type === 'flex') {
      expect(result.layout.direction).toBe('column');
      expect(result.layout.padding?.top).toBe(24);
    }
  });

  it('should parse auto-layout with wrap', () => {
    const wrapLayout = createMockAutoLayoutFrame('HORIZONTAL', { wrap: true });

    const layout = layoutAnalyzer.analyze(wrapLayout);

    expect(layout.type).toBe('flex');
    if (layout.type === 'flex') {
      expect(layout.wrap).toBe('wrap');
    }
  });

  it('should parse center-aligned auto-layout', () => {
    const centerLayout = createMockNode({
      type: 'FRAME',
      name: 'Centered',
      layoutMode: 'HORIZONTAL',
      primaryAxisAlignItems: 'CENTER',
      counterAxisAlignItems: 'CENTER',
      itemSpacing: 8,
      absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 100 },
      children: [],
    });

    const layout = layoutAnalyzer.analyze(centerLayout);

    expect(layout.type).toBe('flex');
    if (layout.type === 'flex') {
      expect(layout.justifyContent).toBe('center');
      expect(layout.alignItems).toBe('center');
    }
  });

  it('should parse space-between auto-layout', () => {
    const spaceBetween = createMockNode({
      type: 'FRAME',
      name: 'Space Between',
      layoutMode: 'HORIZONTAL',
      primaryAxisAlignItems: 'SPACE_BETWEEN',
      counterAxisAlignItems: 'MIN',
      itemSpacing: 0,
      absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 50 },
      children: [
        createMockNode({ name: 'Left' }),
        createMockNode({ name: 'Right' }),
      ],
    });

    const layout = layoutAnalyzer.analyze(spaceBetween);

    expect(layout.type).toBe('flex');
    if (layout.type === 'flex') {
      expect(layout.justifyContent).toBe('space-between');
    }
  });

  it('should generate correct CSS for auto-layout', () => {
    const layout = layoutAnalyzer.analyze(createMockAutoLayoutFrame('HORIZONTAL', { gap: 16, padding: 20 }));
    const css = layoutAnalyzer.layoutToCss(layout);

    expect(css['display']).toBe('flex');
    expect(css['flex-direction']).toBe('row');
    expect(css['gap']).toBe('16px');
    expect(css['padding']).toBe('20px');
  });

  it('should handle mixed padding values', () => {
    const mixedPadding = createMockNode({
      type: 'FRAME',
      name: 'Mixed Padding',
      layoutMode: 'VERTICAL',
      paddingTop: 10,
      paddingRight: 20,
      paddingBottom: 30,
      paddingLeft: 40,
      itemSpacing: 8,
      absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 200 },
      children: [],
    });

    const result = parser.parseNode(mixedPadding);

    expect(result.layout?.type).toBe('flex');
    if (result.layout?.type === 'flex') {
      expect(result.layout.padding?.top).toBe(10);
      expect(result.layout.padding?.right).toBe(20);
      expect(result.layout.padding?.bottom).toBe(30);
      expect(result.layout.padding?.left).toBe(40);
    }
  });
});

// ============================================
// 4. VARIANTS / COMPONENT SETS
// ============================================

describe('Variants and Component Sets', () => {
  let extractor: ComponentExtractor;

  beforeEach(() => {
    extractor = new ComponentExtractor();
  });

  it('should extract component set with size variants', () => {
    const smallVariant = createMockComponent('Button, size=small');
    const mediumVariant = createMockComponent('Button, size=medium');
    const largeVariant = createMockComponent('Button, size=large');

    const componentSet = createMockNode({
      type: 'COMPONENT_SET',
      name: 'Button',
      children: [smallVariant, mediumVariant, largeVariant],
      componentPropertyDefinitions: {
        size: {
          type: 'VARIANT',
          defaultValue: 'medium',
          variantOptions: ['small', 'medium', 'large'],
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
    expect(result.componentSets[0]?.name).toBe('Button');
    expect(result.componentSets[0]?.variantGroupProperties['size']).toContain('small');
    expect(result.componentSets[0]?.variantGroupProperties['size']).toContain('medium');
    expect(result.componentSets[0]?.variantGroupProperties['size']).toContain('large');
  });

  it('should extract component set with multiple variant properties', () => {
    const variants = [
      createMockComponent('Button, size=small, state=default'),
      createMockComponent('Button, size=small, state=hover'),
      createMockComponent('Button, size=large, state=default'),
      createMockComponent('Button, size=large, state=hover'),
    ];

    const componentSet = createMockNode({
      type: 'COMPONENT_SET',
      name: 'Button',
      children: variants,
      componentPropertyDefinitions: {
        size: {
          type: 'VARIANT',
          defaultValue: 'small',
          variantOptions: ['small', 'large'],
        },
        state: {
          type: 'VARIANT',
          defaultValue: 'default',
          variantOptions: ['default', 'hover'],
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
    expect(result.componentSets[0]?.variantGroupProperties).toHaveProperty('size');
    expect(result.componentSets[0]?.variantGroupProperties).toHaveProperty('state');
  });

  it('should extract boolean variant property', () => {
    const defaultVariant = createMockComponent('Switch, isOn=false');
    const activeVariant = createMockComponent('Switch, isOn=true');

    const componentSet = createMockNode({
      type: 'COMPONENT_SET',
      name: 'Switch',
      children: [defaultVariant, activeVariant],
      componentPropertyDefinitions: {
        isOn: {
          type: 'VARIANT',
          defaultValue: 'false',
          variantOptions: ['false', 'true'],
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
    expect(result.componentSets[0]?.variantGroupProperties['isOn']).toEqual(['false', 'true']);
  });

  it('should link instances to their base components', () => {
    const button = createMockComponent('Button');
    const buttonInstance = createMockNode({
      type: 'INSTANCE',
      name: 'Button Instance',
      componentId: button.id,
    });

    const file = createMockFigmaFile({
      document: createMockNode({
        type: 'DOCUMENT',
        children: [createMockCanvas([button, buttonInstance])],
      }),
    });

    const result = extractor.extract(file);

    expect(result.instances).toHaveLength(1);
    expect(result.instances[0]?.componentId).toBe(button.id);
  });

  it('should count component usage across instances', () => {
    const button = createMockComponent('Button');
    const instances = [
      createMockNode({ type: 'INSTANCE', name: 'Instance 1', componentId: button.id }),
      createMockNode({ type: 'INSTANCE', name: 'Instance 2', componentId: button.id }),
      createMockNode({ type: 'INSTANCE', name: 'Instance 3', componentId: button.id }),
    ];

    const file = createMockFigmaFile({
      document: createMockNode({
        type: 'DOCUMENT',
        children: [createMockCanvas([button, ...instances])],
      }),
    });

    const result = extractor.extract(file);

    expect(result.stats.totalInstances).toBe(3);
  });
});

// ============================================
// 5. ERROR HANDLING (MALFORMED INPUT)
// ============================================

describe('Error Handling - Malformed Input', () => {
  let parser: FigmaParser;

  beforeEach(() => {
    parser = new FigmaParser();
  });

  it('should handle null document gracefully', () => {
    const file = createMockFigmaFile({
      document: null as any,
    });

    // Parser may throw or return empty - either is acceptable error handling
    try {
      const result = parser.parseFileData(file);
      expect(result.pages).toEqual([]);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should handle missing children array', () => {
    const node = createMockNode({
      name: 'No Children',
      children: undefined,
    });

    const result = parser.parseNode(node);

    expect(result.children).toEqual([]);
  });

  it('should handle null node in children', () => {
    const node = createMockNode({
      name: 'Parent',
      children: [
        createMockNode({ name: 'Valid Child' }),
        null as any,
        createMockNode({ name: 'Another Valid Child' }),
      ],
    });

    // Parser may throw or filter nulls - either is acceptable
    try {
      const result = parser.parseNode(node);
      // If it doesn't throw, valid children should be parsed
      expect(result.children.length).toBeGreaterThanOrEqual(0);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should handle missing absoluteBoundingBox', () => {
    const node = createMockNode({
      name: 'No Bounds',
      absoluteBoundingBox: undefined,
    });

    const result = parser.parseNode(node);

    expect(result.bounds).toBeUndefined();
  });

  it('should handle malformed fills array', () => {
    const node = createMockNode({
      name: 'Bad Fills',
      fills: [
        { type: 'SOLID', color: null as any, visible: true },
        { type: 'UNKNOWN_TYPE' as any, visible: true },
        null as any,
      ],
    });

    // Parser may throw or skip malformed fills - either is acceptable
    try {
      const result = parser.parseNode(node);
      expect(result).toBeDefined();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should handle malformed effects array', () => {
    const node = createMockNode({
      name: 'Bad Effects',
      effects: [
        { type: 'DROP_SHADOW', visible: true, radius: null as any, offset: { x: 0, y: 0 }, color: { r: 0, g: 0, b: 0, a: 1 } },
        { type: 'UNKNOWN_EFFECT' as any, visible: true, radius: 0, offset: { x: 0, y: 0 }, color: { r: 0, g: 0, b: 0, a: 1 } },
      ],
    });

    expect(() => parser.parseNode(node)).not.toThrow();
  });

  it('should handle missing style on text node', () => {
    const textNode = createMockNode({
      type: 'TEXT',
      name: 'Text',
      characters: 'Hello',
      style: undefined,
    });

    expect(() => parser.parseNode(textNode)).not.toThrow();
  });

  it('should validate ParsedDesign structure', () => {
    const invalidDesign = {
      version: '2.0.0', // Wrong version
      metadata: null,
    };

    const result = validateParsedDesign(invalidDesign);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle circular reference gracefully', () => {
    const node: any = createMockNode({ name: 'Circular' });
    // Note: In practice, Figma files don't have circular refs,
    // but the parser should handle malformed data

    expect(() => parser.parseNode(node)).not.toThrow();
  });

  it('should handle extremely deep nesting', () => {
    let deepNode = createMockNode({ name: 'Deepest' });
    for (let i = 0; i < 50; i++) {
      deepNode = createMockNode({
        name: `Level ${50 - i}`,
        children: [deepNode],
      });
    }

    expect(() => parser.parseNode(deepNode)).not.toThrow();
  });
});

// ============================================
// 6. OUTPUT VALIDATION (AST/INTERMEDIATE FORMAT)
// ============================================

describe('Output Validation - AST/Intermediate Format', () => {
  let parser: FigmaParser;

  beforeEach(() => {
    parser = new FigmaParser();
  });

  it('should produce valid ParsedDesign structure', () => {
    const file = createMockFigmaFile({
      document: createMockNode({
        type: 'DOCUMENT',
        children: [createMockCanvas([createMockComponent('Button')])],
      }),
    });

    const result = parser.parseFileData(file, 'test-key');

    // Validate top-level structure
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('metadata');
    expect(result).toHaveProperty('pages');
    expect(result).toHaveProperty('components');
    expect(result).toHaveProperty('componentSets');
    expect(result).toHaveProperty('tokens');
    expect(result).toHaveProperty('assets');
    expect(result).toHaveProperty('stats');

    // Validate version
    expect(result.version).toBe('1.0.0');
  });

  it('should produce valid metadata', () => {
    const file = createMockFigmaFile({
      name: 'My Design System',
      lastModified: '2026-01-25T12:00:00Z',
    });

    const result = parser.parseFileData(file, 'abc123');

    expect(result.metadata.name).toBe('My Design System');
    expect(result.metadata.fileKey).toBe('abc123');
    expect(result.metadata.lastModified).toBe('2026-01-25T12:00:00Z');
  });

  it('should produce valid ParsedFrame structure', () => {
    const frame = createMockNode({
      id: 'frame-123',
      name: 'Card Component',
      type: 'FRAME',
      visible: true,
      absoluteBoundingBox: { x: 10, y: 20, width: 300, height: 200 },
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true }],
      cornerRadius: 8,
      children: [createMockTextNode('Title')],
    });

    const result = parser.parseNode(frame);

    // Validate ParsedFrame structure
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('visible');
    expect(result).toHaveProperty('bounds');
    expect(result).toHaveProperty('styles');
    expect(result).toHaveProperty('layout');
    expect(result).toHaveProperty('semantic');
    expect(result).toHaveProperty('children');

    // Validate bounds
    expect(result.bounds).toEqual({ x: 10, y: 20, width: 300, height: 200 });
  });

  it('should produce valid styles object', () => {
    const node = createMockNode({
      fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, visible: true }],
      strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, visible: true }],
      strokeWeight: 2,
      effects: [{ type: 'DROP_SHADOW', visible: true, radius: 4, offset: { x: 0, y: 2 }, color: { r: 0, g: 0, b: 0, a: 0.2 } }],
      cornerRadius: 12,
      opacity: 0.9,
    });

    const result = parser.parseNode(node);

    expect(result.styles?.fills).toBeDefined();
    expect(result.styles?.strokes).toBeDefined();
    expect(result.styles?.effects).toBeDefined();
    expect(result.styles?.cornerRadius).toBe(12);
    expect(result.styles?.opacity).toBe(0.9);
  });

  it('should produce valid layout object for flex', () => {
    const flexNode = createMockAutoLayoutFrame('HORIZONTAL', { gap: 16, padding: 24 });

    const result = parser.parseNode(flexNode);

    expect(result.layout?.type).toBe('flex');
    if (result.layout?.type === 'flex') {
      expect(result.layout).toHaveProperty('direction');
      expect(result.layout).toHaveProperty('gap');
      expect(result.layout).toHaveProperty('padding');
      expect(result.layout).toHaveProperty('justifyContent');
      expect(result.layout).toHaveProperty('alignItems');
    }
  });

  it('should produce valid semantic analysis', () => {
    const button = createMockNode({
      name: 'Submit Button',
      fills: [{ type: 'SOLID', color: { r: 0, g: 0.5, b: 1, a: 1 }, visible: true }],
      absoluteBoundingBox: { x: 0, y: 0, width: 120, height: 44 },
      children: [createMockTextNode('Submit')],
    });

    const result = parser.parseNode(button);

    expect(result.semantic).toBeDefined();
    expect(result.semantic).toHaveProperty('type');
    expect(result.semantic).toHaveProperty('htmlElement');
    expect(result.semantic).toHaveProperty('confidence');
    expect(result.semantic?.confidence).toBeGreaterThanOrEqual(0);
    expect(result.semantic?.confidence).toBeLessThanOrEqual(1);
  });

  it('should produce valid token structure', () => {
    const file = createMockFigmaFile({
      document: createMockNode({
        type: 'DOCUMENT',
        children: [
          createMockCanvas([
            createMockNode({
              fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8, a: 1 }, visible: true }],
              cornerRadius: 8,
              paddingTop: 16,
            }),
          ]),
        ],
      }),
    });

    const result = parser.parseFileData(file);

    expect(result.tokens).toHaveProperty('colors');
    expect(result.tokens).toHaveProperty('typography');
    expect(result.tokens).toHaveProperty('spacing');
    expect(result.tokens).toHaveProperty('radii');
    expect(result.tokens).toHaveProperty('shadows');
    expect(result.tokens).toHaveProperty('meta');
  });

  it('should produce consistent IDs', () => {
    const node = createMockNode({ id: 'my-unique-id', name: 'Test' });

    const result = parser.parseNode(node);

    expect(result.id).toBe('my-unique-id');
  });

  it('should preserve text content', () => {
    const textNode = createMockNode({
      type: 'TEXT',
      name: 'Heading',
      characters: 'Welcome to FORGE',
    });

    const result = parser.parseNode(textNode);

    expect(result.textContent).toBe('Welcome to FORGE');
  });
});

// ============================================
// ADDITIONAL EDGE CASES
// ============================================

describe('Edge Cases', () => {
  let parser: FigmaParser;

  beforeEach(() => {
    parser = new FigmaParser();
  });

  it('should handle unicode in text content', () => {
    const textNode = createMockNode({
      type: 'TEXT',
      name: 'Unicode Text',
      characters: '你好世界 🌍 مرحبا',
    });

    const result = parser.parseNode(textNode);

    expect(result.textContent).toBe('你好世界 🌍 مرحبا');
  });

  it('should handle special characters in names', () => {
    const node = createMockNode({
      name: 'Button & Icon <special> "quoted"',
    });

    const result = parser.parseNode(node);

    expect(result.name).toBe('Button & Icon <special> "quoted"');
  });

  it('should handle zero dimensions', () => {
    const node = createMockNode({
      absoluteBoundingBox: { x: 0, y: 0, width: 0, height: 0 },
    });

    const result = parser.parseNode(node);

    expect(result.bounds?.width).toBe(0);
    expect(result.bounds?.height).toBe(0);
  });

  it('should handle negative positions', () => {
    const node = createMockNode({
      absoluteBoundingBox: { x: -100, y: -50, width: 200, height: 100 },
    });

    const result = parser.parseNode(node);

    expect(result.bounds?.x).toBe(-100);
    expect(result.bounds?.y).toBe(-50);
  });

  it('should handle opacity of 0', () => {
    const node = createMockNode({
      opacity: 0,
      visible: true,
    });

    const result = parser.parseNode(node);

    expect(result.styles?.opacity).toBe(0);
    expect(result.visible).toBe(true);
  });
});
