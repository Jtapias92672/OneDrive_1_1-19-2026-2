/**
 * FORGE Style Extractor - Functional Verification Tests
 *
 * @epic 05 - Figma Parser
 * @purpose Verify StyleExtractor correctly converts Figma styles to CSS
 * @philosophy Coverage shows WHERE we've verified, not a target to chase
 *
 * Each test documents WHAT it proves about the code's actual behavior.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

import {
  StyleExtractor,
  type ExtractedFill,
  type ExtractedStroke,
  type ExtractedEffect,
  type ExtractedTypography,
} from '../../src/figma-parser/extractors/styles.js';

import type { FigmaNode, FigmaFile, Paint, Effect, TypeStyle, Color } from '../../src/figma-parser/types/figma-api.js';

// ============================================
// TEST FIXTURES
// ============================================

function createColor(r: number, g: number, b: number, a = 1): Color {
  return { r, g, b, a };
}

function createSolidFill(color: Color, opacity = 1): Paint {
  return {
    type: 'SOLID',
    visible: true,
    color,
    opacity,
  };
}

function createGradientFill(type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND'): Paint {
  return {
    type,
    visible: true,
    opacity: 1,
    gradientHandlePositions: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    gradientStops: [
      { position: 0, color: createColor(1, 0, 0, 1) },
      { position: 1, color: createColor(0, 0, 1, 1) },
    ],
  };
}

function createImageFill(imageRef: string): Paint {
  return {
    type: 'IMAGE',
    visible: true,
    opacity: 1,
    imageRef,
  };
}

function createDropShadow(blur: number, offsetX = 0, offsetY = 4, spread = 0): Effect {
  return {
    type: 'DROP_SHADOW',
    visible: true,
    radius: blur,
    offset: { x: offsetX, y: offsetY },
    spread,
    color: createColor(0, 0, 0, 0.25),
  };
}

function createInnerShadow(blur: number): Effect {
  return {
    type: 'INNER_SHADOW',
    visible: true,
    radius: blur,
    offset: { x: 0, y: 2 },
    color: createColor(0, 0, 0, 0.15),
  };
}

function createBlur(radius: number): Effect {
  return {
    type: 'LAYER_BLUR',
    visible: true,
    radius,
  };
}

function createBackgroundBlur(radius: number): Effect {
  return {
    type: 'BACKGROUND_BLUR',
    visible: true,
    radius,
  };
}

function createTypeStyle(overrides: Partial<TypeStyle> = {}): TypeStyle {
  return {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: 400,
    letterSpacing: 0,
    lineHeightPx: 24,
    lineHeightUnit: 'PIXELS',
    textAlignHorizontal: 'LEFT',
    ...overrides,
  } as TypeStyle;
}

function createNode(overrides: Partial<FigmaNode> = {}): FigmaNode {
  return {
    id: 'test-node',
    name: 'Test Node',
    type: 'FRAME',
    visible: true,
    ...overrides,
  } as FigmaNode;
}

function createFile(document: FigmaNode, styles?: Record<string, unknown>): FigmaFile {
  return {
    name: 'Test File',
    lastModified: '2026-01-25',
    version: '1',
    document,
    styles,
  } as FigmaFile;
}

// ============================================
// TESTS
// ============================================

describe('StyleExtractor', () => {
  let extractor: StyleExtractor;

  beforeEach(() => {
    extractor = new StyleExtractor();
  });

  // ==========================================
  // FILL EXTRACTION
  // ==========================================

  describe('Fill Extraction', () => {
    /**
     * Test verifies: Solid fill extracts hex and rgba colors
     * → Color conversion from Figma 0-1 to hex/rgba
     */
    it('extracts solid fills with correct hex and rgba', () => {
      const node = createNode({
        fills: [createSolidFill(createColor(1, 0, 0))], // Red
      });

      const styles = extractor.extractNodeStyles(node);

      expect(styles.fills).toHaveLength(1);
      expect(styles.fills[0]!.type).toBe('solid');
      expect(styles.fills[0]!.color).toBe('#FF0000');
      expect(styles.fills[0]!.rgba).toMatch(/^rgba\(255, 0, 0, 1(\.0+)?\)$/);
    });

    /**
     * Test verifies: Fill opacity preserved
     * → Semi-transparent fills work correctly
     */
    it('preserves fill opacity', () => {
      const node = createNode({
        fills: [createSolidFill(createColor(0, 0, 1), 0.5)], // 50% opacity blue
      });

      const styles = extractor.extractNodeStyles(node);

      expect(styles.fills[0]!.opacity).toBe(0.5);
      expect(styles.fills[0]!.rgba).toMatch(/^rgba\(0, 0, 255, 0\.50?\)$/);
    });

    /**
     * Test verifies: Linear gradient fill extracted correctly
     * → Gradient type, angle, and stops
     */
    it('extracts linear gradient fills', () => {
      const node = createNode({
        fills: [createGradientFill('GRADIENT_LINEAR')],
      });

      const styles = extractor.extractNodeStyles(node);

      expect(styles.fills[0]!.type).toBe('gradient');
      expect(styles.fills[0]!.gradient!.type).toBe('linear');
      expect(styles.fills[0]!.gradient!.stops).toHaveLength(2);
    });

    /**
     * Test verifies: Radial gradient type mapped correctly
     * → GRADIENT_RADIAL becomes 'radial'
     */
    it('extracts radial gradient fills', () => {
      const node = createNode({
        fills: [createGradientFill('GRADIENT_RADIAL')],
      });

      const styles = extractor.extractNodeStyles(node);
      expect(styles.fills[0]!.gradient!.type).toBe('radial');
    });

    /**
     * Test verifies: Angular gradient type mapped correctly
     * → GRADIENT_ANGULAR becomes 'angular'
     */
    it('extracts angular gradient fills', () => {
      const node = createNode({
        fills: [createGradientFill('GRADIENT_ANGULAR')],
      });

      const styles = extractor.extractNodeStyles(node);
      expect(styles.fills[0]!.gradient!.type).toBe('angular');
    });

    /**
     * Test verifies: Diamond gradient type mapped correctly
     * → GRADIENT_DIAMOND becomes 'diamond'
     */
    it('extracts diamond gradient fills', () => {
      const node = createNode({
        fills: [createGradientFill('GRADIENT_DIAMOND')],
      });

      const styles = extractor.extractNodeStyles(node);
      expect(styles.fills[0]!.gradient!.type).toBe('diamond');
    });

    /**
     * Test verifies: Image fill extracts imageRef
     * → For background images
     */
    it('extracts image fills with imageRef', () => {
      const node = createNode({
        fills: [createImageFill('image123')],
      });

      const styles = extractor.extractNodeStyles(node);

      expect(styles.fills[0]!.type).toBe('image');
      expect(styles.fills[0]!.imageRef).toBe('image123');
    });

    /**
     * Test verifies: Invisible fills filtered out
     * → Only visible fills included
     */
    it('filters out invisible fills', () => {
      const node = createNode({
        fills: [
          { ...createSolidFill(createColor(1, 0, 0)), visible: false },
          createSolidFill(createColor(0, 1, 0)),
        ],
      });

      const styles = extractor.extractNodeStyles(node);

      expect(styles.fills).toHaveLength(1);
      expect(styles.fills[0]!.color).toBe('#00FF00');
    });
  });

  // ==========================================
  // STROKE EXTRACTION
  // ==========================================

  describe('Stroke Extraction', () => {
    /**
     * Test verifies: Stroke color and width extracted
     * → Basic stroke properties
     */
    it('extracts stroke color and width', () => {
      const node = createNode({
        strokes: [createSolidFill(createColor(0, 0, 0))],
        strokeWeight: 2,
      });

      const styles = extractor.extractNodeStyles(node);

      expect(styles.strokes).toHaveLength(1);
      expect(styles.strokes[0]!.color).toBe('#000000');
      expect(styles.strokes[0]!.width).toBe(2);
    });

    /**
     * Test verifies: Stroke align INSIDE mapped correctly
     * → Inner stroke position
     */
    it('maps INSIDE stroke alignment', () => {
      const node = createNode({
        strokes: [createSolidFill(createColor(0, 0, 0))],
        strokeAlign: 'INSIDE',
      });

      const styles = extractor.extractNodeStyles(node);
      expect(styles.strokes[0]!.align).toBe('inside');
    });

    /**
     * Test verifies: Stroke align OUTSIDE mapped correctly
     * → Outer stroke position
     */
    it('maps OUTSIDE stroke alignment', () => {
      const node = createNode({
        strokes: [createSolidFill(createColor(0, 0, 0))],
        strokeAlign: 'OUTSIDE',
      });

      const styles = extractor.extractNodeStyles(node);
      expect(styles.strokes[0]!.align).toBe('outside');
    });

    /**
     * Test verifies: Stroke cap types mapped correctly
     * → Line end styles
     */
    it('maps stroke cap types', () => {
      const cases: Array<{ figma: string; css: string }> = [
        { figma: 'ROUND', css: 'round' },
        { figma: 'SQUARE', css: 'square' },
        { figma: 'NONE', css: 'butt' },
      ];

      for (const { figma, css } of cases) {
        const node = createNode({
          strokes: [createSolidFill(createColor(0, 0, 0))],
          strokeCap: figma as FigmaNode['strokeCap'],
        });
        const styles = extractor.extractNodeStyles(node);
        expect(styles.strokes[0]!.cap).toBe(css);
      }
    });

    /**
     * Test verifies: Stroke join types mapped correctly
     * → Corner styles
     */
    it('maps stroke join types', () => {
      const cases: Array<{ figma: string; css: string }> = [
        { figma: 'ROUND', css: 'round' },
        { figma: 'BEVEL', css: 'bevel' },
        { figma: 'MITER', css: 'miter' },
      ];

      for (const { figma, css } of cases) {
        const node = createNode({
          strokes: [createSolidFill(createColor(0, 0, 0))],
          strokeJoin: figma as FigmaNode['strokeJoin'],
        });
        const styles = extractor.extractNodeStyles(node);
        expect(styles.strokes[0]!.join).toBe(css);
      }
    });

    /**
     * Test verifies: Dash array preserved
     * → For dashed strokes
     */
    it('extracts stroke dash array', () => {
      const node = createNode({
        strokes: [createSolidFill(createColor(0, 0, 0))],
        strokeDashes: [5, 3],
      });

      const styles = extractor.extractNodeStyles(node);
      expect(styles.strokes[0]!.dashArray).toEqual([5, 3]);
    });
  });

  // ==========================================
  // EFFECT EXTRACTION
  // ==========================================

  describe('Effect Extraction', () => {
    /**
     * Test verifies: Drop shadow generates CSS box-shadow
     * → Complete shadow properties
     */
    it('extracts drop shadow with CSS value', () => {
      const node = createNode({
        effects: [createDropShadow(8, 2, 4, 0)],
      });

      const styles = extractor.extractNodeStyles(node);

      expect(styles.effects).toHaveLength(1);
      expect(styles.effects[0]!.type).toBe('shadow');
      expect(styles.effects[0]!.blur).toBe(8);
      expect(styles.effects[0]!.offset).toEqual({ x: 2, y: 4 });
      expect(styles.effects[0]!.cssValue).toContain('2px 4px 8px');
    });

    /**
     * Test verifies: Inner shadow generates CSS with inset
     * → Inset keyword in box-shadow
     */
    it('extracts inner shadow with inset CSS', () => {
      const node = createNode({
        effects: [createInnerShadow(4)],
      });

      const styles = extractor.extractNodeStyles(node);

      expect(styles.effects[0]!.type).toBe('innerShadow');
      expect(styles.effects[0]!.cssValue).toContain('inset');
    });

    /**
     * Test verifies: Layer blur generates CSS filter
     * → blur() function
     */
    it('extracts layer blur effect', () => {
      const node = createNode({
        effects: [createBlur(10)],
      });

      const styles = extractor.extractNodeStyles(node);

      expect(styles.effects[0]!.type).toBe('blur');
      expect(styles.effects[0]!.cssValue).toBe('blur(10px)');
    });

    /**
     * Test verifies: Background blur generates CSS filter
     * → For backdrop-filter property
     */
    it('extracts background blur effect', () => {
      const node = createNode({
        effects: [createBackgroundBlur(20)],
      });

      const styles = extractor.extractNodeStyles(node);

      expect(styles.effects[0]!.type).toBe('backgroundBlur');
      expect(styles.effects[0]!.cssValue).toBe('blur(20px)');
    });

    /**
     * Test verifies: Invisible effects filtered out
     * → Only visible effects included
     */
    it('filters out invisible effects', () => {
      const node = createNode({
        effects: [
          { ...createDropShadow(4), visible: false },
          createDropShadow(8),
        ],
      });

      const styles = extractor.extractNodeStyles(node);
      expect(styles.effects).toHaveLength(1);
      expect(styles.effects[0]!.blur).toBe(8);
    });
  });

  // ==========================================
  // TYPOGRAPHY EXTRACTION
  // ==========================================

  describe('Typography Extraction', () => {
    /**
     * Test verifies: Basic typography properties extracted
     * → Font family, size, weight
     */
    it('extracts basic typography properties', () => {
      const node = createNode({
        type: 'TEXT',
        style: createTypeStyle({
          fontFamily: 'Roboto',
          fontSize: 18,
          fontWeight: 700,
        }),
      });

      const styles = extractor.extractNodeStyles(node);

      expect(styles.typography).toBeDefined();
      expect(styles.typography!.fontFamily).toBe('Roboto');
      expect(styles.typography!.fontSize).toBe(18);
      expect(styles.typography!.fontWeight).toBe(700);
    });

    /**
     * Test verifies: Line height calculated from pixels
     * → When lineHeightUnit is PIXELS
     */
    it('extracts pixel line height', () => {
      const node = createNode({
        type: 'TEXT',
        style: createTypeStyle({
          lineHeightPx: 28,
          lineHeightUnit: 'PIXELS',
        }),
      });

      const styles = extractor.extractNodeStyles(node);
      expect(styles.typography!.lineHeight).toBe(28);
    });

    /**
     * Test verifies: Line height as percentage
     * → When lineHeightPercent is used
     */
    it('extracts percentage line height', () => {
      const node = createNode({
        type: 'TEXT',
        style: createTypeStyle({
          lineHeightPercent: 150,
          lineHeightUnit: 'FONT_SIZE_%',
          lineHeightPx: 24,
        }),
      });

      const styles = extractor.extractNodeStyles(node);
      expect(styles.typography!.lineHeight).toBe('150%');
    });

    /**
     * Test verifies: Letter spacing converted to em
     * → Relative to font size
     */
    it('converts letter spacing to em', () => {
      const node = createNode({
        type: 'TEXT',
        style: createTypeStyle({
          fontSize: 16,
          letterSpacing: 0.8, // 0.8px at 16px = 0.05em
        }),
      });

      const styles = extractor.extractNodeStyles(node);
      expect(styles.typography!.letterSpacing).toBe('0.050em');
    });

    /**
     * Test verifies: Zero letter spacing stays zero
     * → No em conversion needed
     */
    it('keeps zero letter spacing as zero', () => {
      const node = createNode({
        type: 'TEXT',
        style: createTypeStyle({ letterSpacing: 0 }),
      });

      const styles = extractor.extractNodeStyles(node);
      expect(styles.typography!.letterSpacing).toBe(0);
    });

    /**
     * Test verifies: All text alignments mapped correctly
     * → LEFT, RIGHT, CENTER, JUSTIFIED
     */
    it('maps all text alignment values', () => {
      const cases: Array<{ figma: string; css: string }> = [
        { figma: 'LEFT', css: 'left' },
        { figma: 'RIGHT', css: 'right' },
        { figma: 'CENTER', css: 'center' },
        { figma: 'JUSTIFIED', css: 'justify' },
      ];

      for (const { figma, css } of cases) {
        const node = createNode({
          type: 'TEXT',
          style: createTypeStyle({ textAlignHorizontal: figma as TypeStyle['textAlignHorizontal'] }),
        });
        const styles = extractor.extractNodeStyles(node);
        expect(styles.typography!.textAlign).toBe(css);
      }
    });

    /**
     * Test verifies: Text case transformations mapped
     * → UPPER, LOWER, TITLE
     */
    it('maps text case transformations', () => {
      const cases: Array<{ figma: string; css: string }> = [
        { figma: 'UPPER', css: 'uppercase' },
        { figma: 'LOWER', css: 'lowercase' },
        { figma: 'TITLE', css: 'capitalize' },
      ];

      for (const { figma, css } of cases) {
        const node = createNode({
          type: 'TEXT',
          style: createTypeStyle({ textCase: figma as TypeStyle['textCase'] }),
        });
        const styles = extractor.extractNodeStyles(node);
        expect(styles.typography!.textTransform).toBe(css);
      }
    });

    /**
     * Test verifies: Text decoration mapped
     * → UNDERLINE, STRIKETHROUGH
     */
    it('maps text decoration values', () => {
      const cases: Array<{ figma: string; css: string }> = [
        { figma: 'UNDERLINE', css: 'underline' },
        { figma: 'STRIKETHROUGH', css: 'line-through' },
      ];

      for (const { figma, css } of cases) {
        const node = createNode({
          type: 'TEXT',
          style: createTypeStyle({ textDecoration: figma as TypeStyle['textDecoration'] }),
        });
        const styles = extractor.extractNodeStyles(node);
        expect(styles.typography!.textDecoration).toBe(css);
      }
    });
  });

  // ==========================================
  // NODE STYLES EXTRACTION
  // ==========================================

  describe('Node Styles Extraction', () => {
    /**
     * Test verifies: Opacity extracted from node
     * → Node-level opacity
     */
    it('extracts node opacity', () => {
      const node = createNode({ opacity: 0.8 });
      const styles = extractor.extractNodeStyles(node);
      expect(styles.opacity).toBe(0.8);
    });

    /**
     * Test verifies: Blend mode extracted
     * → For CSS mix-blend-mode
     */
    it('extracts blend mode', () => {
      const node = createNode({ blendMode: 'MULTIPLY' });
      const styles = extractor.extractNodeStyles(node);
      expect(styles.blendMode).toBe('MULTIPLY');
    });

    /**
     * Test verifies: Uniform corner radius extracted
     * → Single radius value
     */
    it('extracts uniform corner radius', () => {
      const node = createNode({ cornerRadius: 8 });
      const styles = extractor.extractNodeStyles(node);
      expect(styles.cornerRadius).toBe(8);
    });

    /**
     * Test verifies: Individual corner radii extracted
     * → [topLeft, topRight, bottomRight, bottomLeft]
     */
    it('extracts individual corner radii', () => {
      const node = createNode({
        rectangleCornerRadii: [4, 8, 12, 16],
      });
      const styles = extractor.extractNodeStyles(node);
      expect(styles.cornerRadius).toEqual([4, 8, 12, 16]);
    });
  });

  // ==========================================
  // DOCUMENT-WIDE EXTRACTION
  // ==========================================

  describe('Document Extraction', () => {
    /**
     * Test verifies: Extract collects all unique colors
     * → Color palette from document
     */
    it('collects unique colors from document', () => {
      const document = createNode({
        children: [
          createNode({ fills: [createSolidFill(createColor(1, 0, 0))] }),
          createNode({ fills: [createSolidFill(createColor(0, 1, 0))] }),
          createNode({ fills: [createSolidFill(createColor(1, 0, 0))] }), // Duplicate
        ],
      });
      const file = createFile(document);

      const result = extractor.extract(file);

      expect(result.colors.size).toBe(2);
      expect(result.stats.uniqueColors).toBe(2);
    });

    /**
     * Test verifies: Color usage count tracked
     * → How many times each color appears
     */
    it('tracks color usage count', () => {
      const document = createNode({
        children: [
          createNode({ fills: [createSolidFill(createColor(1, 0, 0))] }),
          createNode({ fills: [createSolidFill(createColor(1, 0, 0))] }),
          createNode({ fills: [createSolidFill(createColor(1, 0, 0))] }),
        ],
      });
      const file = createFile(document);

      const result = extractor.extract(file);
      const redColor = result.colors.get('#FF0000');

      expect(redColor).toBeDefined();
      expect(redColor!.usageCount).toBe(3);
    });

    /**
     * Test verifies: Colors extracted from strokes too
     * → Not just fills
     */
    it('extracts colors from strokes', () => {
      const document = createNode({
        children: [
          createNode({
            strokes: [createSolidFill(createColor(0, 0, 1))], // Blue stroke
          }),
        ],
      });
      const file = createFile(document);

      const result = extractor.extract(file);

      expect(result.colors.has('#0000FF')).toBe(true);
    });

    /**
     * Test verifies: Typography styles collected
     * → Unique text styles in document
     */
    it('collects unique typography styles', () => {
      const document = createNode({
        children: [
          createNode({
            type: 'TEXT',
            style: createTypeStyle({ fontFamily: 'Inter', fontSize: 16 }),
          }),
          createNode({
            type: 'TEXT',
            style: createTypeStyle({ fontFamily: 'Inter', fontSize: 24 }),
          }),
        ],
      });
      const file = createFile(document);

      const result = extractor.extract(file);

      expect(result.typography.size).toBe(2);
      expect(result.stats.uniqueTypography).toBe(2);
    });

    /**
     * Test verifies: Effects collected from document
     * → Unique effects by CSS value
     */
    it('collects unique effects from document', () => {
      const document = createNode({
        children: [
          createNode({ effects: [createDropShadow(4)] }),
          createNode({ effects: [createDropShadow(8)] }),
          createNode({ effects: [createDropShadow(4)] }), // Duplicate
        ],
      });
      const file = createFile(document);

      const result = extractor.extract(file);

      expect(result.effects.length).toBe(2);
      expect(result.stats.uniqueEffects).toBe(2);
    });

    /**
     * Test verifies: Named styles extracted with metadata
     * → Styles linked to Figma's style system
     */
    it('extracts named styles from document', () => {
      const document = createNode({
        children: [
          createNode({
            styles: { fill: 'style-1' },
            fills: [createSolidFill(createColor(1, 0, 0))],
          }),
        ],
      });
      const file = createFile(document, {
        'style-1': {
          name: 'Primary Red',
          styleType: 'FILL',
        },
      });

      const result = extractor.extract(file);

      expect(result.namedStyles).toHaveLength(1);
      expect(result.namedStyles[0]!.name).toBe('Primary Red');
      expect(result.namedStyles[0]!.type).toBe('fill');
      expect(result.namedStyles[0]!.cssValue).toBe('#FF0000');
    });

    /**
     * Test verifies: Named style usage count incremented
     * → When same style used multiple times
     */
    it('tracks named style usage count', () => {
      const document = createNode({
        children: [
          createNode({
            styles: { fill: 'style-1' },
            fills: [createSolidFill(createColor(1, 0, 0))],
          }),
          createNode({
            styles: { fill: 'style-1' },
            fills: [createSolidFill(createColor(1, 0, 0))],
          }),
        ],
      });
      const file = createFile(document, {
        'style-1': { name: 'Primary Red', styleType: 'FILL' },
      });

      const result = extractor.extract(file);

      expect(result.namedStyles).toHaveLength(1);
      expect(result.namedStyles[0]!.usageCount).toBe(2);
    });
  });
});
