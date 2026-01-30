/**
 * FORGE Layout Analyzer - Functional Verification Tests
 *
 * @epic 05 - Figma Parser
 * @purpose Verify LayoutAnalyzer correctly converts Figma layouts to CSS
 * @philosophy Coverage shows WHERE we've verified, not a target to chase
 *
 * Each test documents WHAT it proves about the code's actual behavior.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

import {
  LayoutAnalyzer,
  type FlexLayout,
  type GridLayout,
  type AbsoluteLayout,
  type StaticLayout,
} from '../../src/figma-parser/analysis/layout.js';

import type { FigmaNode } from '../../src/figma-parser/types/figma-api.js';

// ============================================
// TEST FIXTURES
// ============================================

/**
 * Create a minimal Figma node for testing
 */
function createNode(overrides: Partial<FigmaNode> = {}): FigmaNode {
  return {
    id: 'test-node',
    name: 'Test Node',
    type: 'FRAME',
    visible: true,
    ...overrides,
  } as FigmaNode;
}

/**
 * Create a node with Auto Layout (flex)
 */
function createAutoLayoutNode(overrides: Partial<FigmaNode> = {}): FigmaNode {
  return createNode({
    layoutMode: 'HORIZONTAL',
    itemSpacing: 8,
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    ...overrides,
  });
}

/**
 * Create children arranged in a grid pattern
 */
function createGridChildren(cols: number, rows: number, itemWidth = 100, itemHeight = 100, gap = 10): FigmaNode[] {
  const children: FigmaNode[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      children.push(createNode({
        id: `child-${row}-${col}`,
        name: `Child ${row}-${col}`,
        visible: true,
        absoluteBoundingBox: {
          x: col * (itemWidth + gap),
          y: row * (itemHeight + gap),
          width: itemWidth,
          height: itemHeight,
        },
      }));
    }
  }
  return children;
}

// ============================================
// TESTS
// ============================================

describe('LayoutAnalyzer', () => {
  let analyzer: LayoutAnalyzer;

  beforeEach(() => {
    analyzer = new LayoutAnalyzer();
  });

  // ==========================================
  // AUTO LAYOUT (FLEX) ANALYSIS
  // ==========================================

  describe('Auto Layout (Flex) Analysis', () => {
    /**
     * Test verifies: Horizontal Auto Layout maps to flex-direction: row
     * → Figma HORIZONTAL becomes CSS row
     */
    it('converts HORIZONTAL layout to flex-direction: row', () => {
      const node = createAutoLayoutNode({ layoutMode: 'HORIZONTAL' });
      const result = analyzer.analyze(node) as FlexLayout;

      expect(result.type).toBe('flex');
      expect(result.direction).toBe('row');
    });

    /**
     * Test verifies: Vertical Auto Layout maps to flex-direction: column
     * → Figma VERTICAL becomes CSS column
     */
    it('converts VERTICAL layout to flex-direction: column', () => {
      const node = createAutoLayoutNode({ layoutMode: 'VERTICAL' });
      const result = analyzer.analyze(node) as FlexLayout;

      expect(result.type).toBe('flex');
      expect(result.direction).toBe('column');
    });

    /**
     * Test verifies: Reverse z-index creates reversed flex direction
     * → Figma itemReverseZIndex: true becomes row-reverse or column-reverse
     */
    it('applies reverse direction when itemReverseZIndex is true', () => {
      const horizontalReverse = createAutoLayoutNode({
        layoutMode: 'HORIZONTAL',
        itemReverseZIndex: true,
      });
      expect((analyzer.analyze(horizontalReverse) as FlexLayout).direction).toBe('row-reverse');

      const verticalReverse = createAutoLayoutNode({
        layoutMode: 'VERTICAL',
        itemReverseZIndex: true,
      });
      expect((analyzer.analyze(verticalReverse) as FlexLayout).direction).toBe('column-reverse');
    });

    /**
     * Test verifies: WRAP layout mode creates flex-wrap: wrap
     * → Enables multi-line flex layout
     */
    it('sets flex-wrap: wrap when layoutWrap is WRAP', () => {
      const node = createAutoLayoutNode({ layoutWrap: 'WRAP' });
      const result = analyzer.analyze(node) as FlexLayout;

      expect(result.wrap).toBe('wrap');
    });

    /**
     * Test verifies: justify-content maps from primaryAxisAlignItems
     * → All Figma alignment values produce correct CSS
     */
    it('maps all primaryAxisAlignItems values to justify-content', () => {
      const cases: Array<{ figma: string; css: string }> = [
        { figma: 'MIN', css: 'flex-start' },
        { figma: 'CENTER', css: 'center' },
        { figma: 'MAX', css: 'flex-end' },
        { figma: 'SPACE_BETWEEN', css: 'space-between' },
      ];

      for (const { figma, css } of cases) {
        const node = createAutoLayoutNode({ primaryAxisAlignItems: figma as FigmaNode['primaryAxisAlignItems'] });
        const result = analyzer.analyze(node) as FlexLayout;
        expect(result.justifyContent).toBe(css);
      }
    });

    /**
     * Test verifies: align-items maps from counterAxisAlignItems
     * → All Figma alignment values produce correct CSS
     */
    it('maps all counterAxisAlignItems values to align-items', () => {
      const cases: Array<{ figma: string; css: string }> = [
        { figma: 'MIN', css: 'flex-start' },
        { figma: 'CENTER', css: 'center' },
        { figma: 'MAX', css: 'flex-end' },
        { figma: 'BASELINE', css: 'baseline' },
      ];

      for (const { figma, css } of cases) {
        const node = createAutoLayoutNode({ counterAxisAlignItems: figma as FigmaNode['counterAxisAlignItems'] });
        const result = analyzer.analyze(node) as FlexLayout;
        expect(result.alignItems).toBe(css);
      }
    });

    /**
     * Test verifies: Simple gap (same row and column) becomes single number
     * → Figma itemSpacing becomes CSS gap
     */
    it('extracts simple gap from itemSpacing', () => {
      const node = createAutoLayoutNode({ itemSpacing: 12 });
      const result = analyzer.analyze(node) as FlexLayout;

      expect(result.gap).toBe(12);
    });

    /**
     * Test verifies: Different row/column gaps become object
     * → Figma counterAxisSpacing differs from itemSpacing
     */
    it('extracts complex gap when counterAxisSpacing differs from itemSpacing', () => {
      const node = createAutoLayoutNode({
        layoutMode: 'HORIZONTAL',
        itemSpacing: 8,
        counterAxisSpacing: 16,
      });
      const result = analyzer.analyze(node) as FlexLayout;

      expect(result.gap).toEqual({ row: 16, column: 8 });
    });

    /**
     * Test verifies: Padding values extracted correctly
     * → All four padding values from Figma
     */
    it('extracts padding from all four edges', () => {
      const node = createAutoLayoutNode({
        paddingTop: 10,
        paddingRight: 20,
        paddingBottom: 30,
        paddingLeft: 40,
      });
      const result = analyzer.analyze(node) as FlexLayout;

      expect(result.padding).toEqual({
        top: 10,
        right: 20,
        bottom: 30,
        left: 40,
      });
    });
  });

  // ==========================================
  // GRID DETECTION & ANALYSIS
  // ==========================================

  describe('Grid Detection and Analysis', () => {
    /**
     * Test verifies: 2x2 children arrangement detected as grid
     * → Multiple rows AND columns triggers grid layout
     */
    it('detects grid pattern in 2x2 child arrangement', () => {
      const children = createGridChildren(2, 2);
      const node = createNode({
        children,
      });
      const result = analyzer.analyze(node) as GridLayout;

      expect(result.type).toBe('grid');
      expect(result.columns).toBe(2);
      expect(result.rows).toBe(2);
    });

    /**
     * Test verifies: 3x4 children arrangement detected correctly
     * → Larger grids also work
     */
    it('detects 3x4 grid correctly', () => {
      const children = createGridChildren(3, 4);
      const node = createNode({
        children,
      });
      const result = analyzer.analyze(node) as GridLayout;

      expect(result.type).toBe('grid');
      expect(result.columns).toBe(3);
      expect(result.rows).toBe(4);
    });

    /**
     * Test verifies: Grid gap calculated from child spacing
     * → Gap derived from position differences minus size
     */
    it('calculates grid gap from child positions', () => {
      const children = createGridChildren(2, 2, 100, 100, 20);
      const node = createNode({
        children,
      });
      const result = analyzer.analyze(node) as GridLayout;

      expect(result.type).toBe('grid');
      // Gap should be approximately 20 (position difference minus width)
      expect(typeof result.gap === 'number' ? result.gap : result.gap.column).toBeCloseTo(20, -1);
    });

    /**
     * Test verifies: Single row doesn't become grid
     * → Falls through to static or other layout
     */
    it('does not detect grid for single row of children', () => {
      // 4 children in a row (all same Y)
      const children: FigmaNode[] = [];
      for (let i = 0; i < 4; i++) {
        children.push(createNode({
          id: `child-${i}`,
          visible: true,
          absoluteBoundingBox: { x: i * 100, y: 0, width: 80, height: 80 },
        }));
      }
      const node = createNode({ children });
      const result = analyzer.analyze(node);

      // Should NOT be grid since only 1 row
      expect(result.type).not.toBe('grid');
    });

    /**
     * Test verifies: Too few children doesn't trigger grid
     * → Need at least 4 children for grid detection
     */
    it('does not detect grid with fewer than 4 children', () => {
      const children = createGridChildren(1, 3);
      const node = createNode({ children });
      const result = analyzer.analyze(node);

      expect(result.type).not.toBe('grid');
    });
  });

  // ==========================================
  // ABSOLUTE LAYOUT ANALYSIS
  // ==========================================

  describe('Absolute Layout Analysis', () => {
    /**
     * Test verifies: layoutPositioning: ABSOLUTE creates absolute layout
     * → Figma absolute positioning recognized
     */
    it('identifies absolute positioning', () => {
      const node = createNode({
        layoutPositioning: 'ABSOLUTE',
        absoluteBoundingBox: { x: 100, y: 50, width: 200, height: 100 },
      });
      const result = analyzer.analyze(node) as AbsoluteLayout;

      expect(result.type).toBe('absolute');
      expect(result.width).toBe(200);
      expect(result.height).toBe(100);
    });

    /**
     * Test verifies: Width and height included in absolute layout
     * → Dimensions preserved for absolute elements
     */
    it('includes width and height in absolute layout', () => {
      const node = createNode({
        layoutPositioning: 'ABSOLUTE',
        absoluteBoundingBox: { x: 0, y: 0, width: 150, height: 75 },
      });
      const result = analyzer.analyze(node) as AbsoluteLayout;

      expect(result.width).toBe(150);
      expect(result.height).toBe(75);
    });
  });

  // ==========================================
  // STATIC LAYOUT
  // ==========================================

  describe('Static Layout Analysis', () => {
    /**
     * Test verifies: Node without special layout becomes static
     * → Default fallback layout type
     */
    it('defaults to static layout for basic nodes', () => {
      const node = createNode({
        absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
      });
      const result = analyzer.analyze(node) as StaticLayout;

      expect(result.type).toBe('static');
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });
  });

  // ==========================================
  // LAYOUT TREE ANALYSIS
  // ==========================================

  describe('Layout Tree Analysis', () => {
    /**
     * Test verifies: analyzeTree returns complete tree structure
     * → Recursive analysis of node and children
     */
    it('builds complete layout tree with children', () => {
      const parent = createAutoLayoutNode({
        id: 'parent',
        name: 'Parent',
        children: [
          createNode({ id: 'child1', name: 'Child 1', visible: true }),
          createNode({ id: 'child2', name: 'Child 2', visible: true }),
        ],
      });

      const tree = analyzer.analyzeTree(parent);

      expect(tree.nodeId).toBe('parent');
      expect(tree.nodeName).toBe('Parent');
      expect(tree.layout.type).toBe('flex');
      expect(tree.children).toHaveLength(2);
      expect(tree.children[0]!.nodeId).toBe('child1');
      expect(tree.children[1]!.nodeId).toBe('child2');
    });

    /**
     * Test verifies: Invisible children excluded from tree
     * → Only visible children are analyzed
     */
    it('excludes invisible children from layout tree', () => {
      const parent = createAutoLayoutNode({
        children: [
          createNode({ id: 'visible', visible: true }),
          createNode({ id: 'hidden', visible: false }),
        ],
      });

      const tree = analyzer.analyzeTree(parent);

      expect(tree.children).toHaveLength(1);
      expect(tree.children[0]!.nodeId).toBe('visible');
    });

    /**
     * Test verifies: CSS properties included in tree
     * → layoutToCss output included
     */
    it('includes CSS properties in layout tree', () => {
      const node = createAutoLayoutNode();
      const tree = analyzer.analyzeTree(node);

      expect(tree.cssProperties).toBeDefined();
      expect(tree.cssProperties['display']).toBe('flex');
    });
  });

  // ==========================================
  // CHILD SIZING ANALYSIS
  // ==========================================

  describe('Child Sizing Analysis', () => {
    /**
     * Test verifies: HUG sizing recognized
     * → Child fits content width/height
     */
    it('identifies HUG sizing mode', () => {
      const parent = createAutoLayoutNode({
        children: [
          createNode({
            layoutSizingHorizontal: 'HUG',
            layoutSizingVertical: 'HUG',
            visible: true,
          }),
        ],
      });

      const tree = analyzer.analyzeTree(parent);
      expect(tree.children[0]!.sizing.width).toBe('hug');
      expect(tree.children[0]!.sizing.height).toBe('hug');
    });

    /**
     * Test verifies: FILL sizing recognized
     * → Child stretches to fill container
     */
    it('identifies FILL sizing mode', () => {
      const parent = createAutoLayoutNode({
        children: [
          createNode({
            layoutSizingHorizontal: 'FILL',
            layoutGrow: 1,
            visible: true,
          }),
        ],
      });

      const tree = analyzer.analyzeTree(parent);
      expect(tree.children[0]!.sizing.width).toBe('fill');
      expect(tree.children[0]!.sizing.height).toBe('fill');
    });

    /**
     * Test verifies: STRETCH layout align implies fill width
     * → Alternative way to specify fill
     */
    it('recognizes STRETCH as fill sizing', () => {
      const parent = createAutoLayoutNode({
        children: [
          createNode({
            layoutAlign: 'STRETCH',
            visible: true,
          }),
        ],
      });

      const tree = analyzer.analyzeTree(parent);
      expect(tree.children[0]!.sizing.width).toBe('fill');
    });

    /**
     * Test verifies: flexGrow passed through
     * → For flex items that grow
     */
    it('passes through flexGrow from layoutGrow', () => {
      const parent = createAutoLayoutNode({
        children: [
          createNode({
            layoutGrow: 2,
            visible: true,
          }),
        ],
      });

      const tree = analyzer.analyzeTree(parent);
      expect(tree.children[0]!.flexGrow).toBe(2);
    });
  });

  // ==========================================
  // CSS GENERATION
  // ==========================================

  describe('CSS Generation', () => {
    describe('Flex to CSS', () => {
      /**
       * Test verifies: Basic flex layout generates correct CSS
       * → display, direction, wrap, justify, align
       */
      it('generates correct CSS for flex layout', () => {
        const layout: FlexLayout = {
          type: 'flex',
          direction: 'row',
          wrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        };

        const css = analyzer.layoutToCss(layout);

        expect(css['display']).toBe('flex');
        expect(css['flex-direction']).toBe('row');
        expect(css['flex-wrap']).toBe('wrap');
        expect(css['justify-content']).toBe('space-between');
        expect(css['align-items']).toBe('center');
        expect(css['gap']).toBe('10px');
      });

      /**
       * Test verifies: Complex gap (row/column) generates two-value gap
       * → CSS gap: rowpx columnpx
       */
      it('generates complex gap CSS', () => {
        const layout: FlexLayout = {
          type: 'flex',
          direction: 'column',
          wrap: 'nowrap',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          gap: { row: 8, column: 16 },
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        };

        const css = analyzer.layoutToCss(layout);
        expect(css['gap']).toBe('8px 16px');
      });

      /**
       * Test verifies: Uniform padding collapses to single value
       * → CSS padding: Npx
       */
      it('generates collapsed padding for uniform values', () => {
        const layout: FlexLayout = {
          type: 'flex',
          direction: 'row',
          wrap: 'nowrap',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          gap: 0,
          padding: { top: 16, right: 16, bottom: 16, left: 16 },
        };

        const css = analyzer.layoutToCss(layout);
        expect(css['padding']).toBe('16px');
      });

      /**
       * Test verifies: Symmetric padding collapses to two values
       * → CSS padding: Vpx Hpx
       */
      it('generates two-value padding for symmetric values', () => {
        const layout: FlexLayout = {
          type: 'flex',
          direction: 'row',
          wrap: 'nowrap',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          gap: 0,
          padding: { top: 10, right: 20, bottom: 10, left: 20 },
        };

        const css = analyzer.layoutToCss(layout);
        expect(css['padding']).toBe('10px 20px');
      });

      /**
       * Test verifies: Non-uniform padding uses four values
       * → CSS padding: T R B L
       */
      it('generates four-value padding for non-uniform values', () => {
        const layout: FlexLayout = {
          type: 'flex',
          direction: 'row',
          wrap: 'nowrap',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          gap: 0,
          padding: { top: 1, right: 2, bottom: 3, left: 4 },
        };

        const css = analyzer.layoutToCss(layout);
        expect(css['padding']).toBe('1px 2px 3px 4px');
      });
    });

    describe('Grid to CSS', () => {
      /**
       * Test verifies: Numeric columns generate repeat()
       * → CSS grid-template-columns: repeat(N, 1fr)
       */
      it('generates grid-template-columns from numeric columns', () => {
        const layout: GridLayout = {
          type: 'grid',
          columns: 3,
          rows: 2,
          gap: 10,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        };

        const css = analyzer.layoutToCss(layout);

        expect(css['display']).toBe('grid');
        expect(css['grid-template-columns']).toBe('repeat(3, 1fr)');
        expect(css['grid-template-rows']).toBe('repeat(2, auto)');
        expect(css['gap']).toBe('10px');
      });

      /**
       * Test verifies: String columns passed through
       * → Custom grid-template-columns
       */
      it('passes through string column definition', () => {
        const layout: GridLayout = {
          type: 'grid',
          columns: '1fr 2fr 1fr',
          rows: 'auto',
          gap: 0,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        };

        const css = analyzer.layoutToCss(layout);
        expect(css['grid-template-columns']).toBe('1fr 2fr 1fr');
        expect(css['grid-template-rows']).toBe('auto');
      });
    });

    describe('Absolute to CSS', () => {
      /**
       * Test verifies: Absolute layout generates position CSS
       * → All position properties converted
       */
      it('generates position CSS for absolute layout', () => {
        const layout: AbsoluteLayout = {
          type: 'absolute',
          position: {
            top: 10,
            left: 20,
          },
          width: 100,
          height: 50,
        };

        const css = analyzer.layoutToCss(layout);

        expect(css['position']).toBe('absolute');
        expect(css['top']).toBe('10px');
        expect(css['left']).toBe('20px');
        expect(css['width']).toBe('100px');
        expect(css['height']).toBe('50px');
      });

      /**
       * Test verifies: String position values (like 50%) passed through
       * → For center positioning
       */
      it('handles string position values', () => {
        const layout: AbsoluteLayout = {
          type: 'absolute',
          position: {
            top: '50%',
            left: '50%',
          },
        };

        const css = analyzer.layoutToCss(layout);
        expect(css['top']).toBe('50%');
        expect(css['left']).toBe('50%');
      });
    });

    describe('Static to CSS', () => {
      /**
       * Test verifies: Static layout generates width/height only
       * → No positioning, just dimensions
       */
      it('generates dimension CSS for static layout', () => {
        const layout: StaticLayout = {
          type: 'static',
          width: 200,
          height: 100,
        };

        const css = analyzer.layoutToCss(layout);

        expect(css['width']).toBe('200px');
        expect(css['height']).toBe('100px');
        expect(css['position']).toBeUndefined();
      });

      /**
       * Test verifies: Static layout handles undefined dimensions
       * → No CSS emitted for undefined values
       */
      it('omits undefined dimensions', () => {
        const layout: StaticLayout = {
          type: 'static',
        };

        const css = analyzer.layoutToCss(layout);

        expect(css['width']).toBeUndefined();
        expect(css['height']).toBeUndefined();
      });
    });
  });
});
