/**
 * FORGE Figma Parser - Capability Verification Tests
 *
 * @epic 05 - Figma Parser
 * @purpose Verify REMAINING real functionality works correctly
 * @philosophy These test CAPABILITIES, not coverage metrics
 *
 * Each test documents WHAT CAPABILITY it proves and WHEN.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import { FigmaParser } from '../../src/figma-parser/index.js';
import { TokenGenerator } from '../../src/figma-parser/tokens/generator.js';
import type { FigmaFile, FigmaNode, Color, Effect, TypeStyle } from '../../src/figma-parser/types/figma-api.js';

// ============================================
// TEST FIXTURES
// ============================================

function createColor(r: number, g: number, b: number, a = 1): Color {
  return { r, g, b, a };
}

function createDropShadow(blur: number, x = 0, y = 4): Effect {
  return {
    type: 'DROP_SHADOW',
    visible: true,
    radius: blur,
    offset: { x, y },
    spread: 0,
    color: createColor(0, 0, 0, 0.25),
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
    id: 'node-1',
    name: 'Node',
    type: 'FRAME',
    visible: true,
    ...overrides,
  } as FigmaNode;
}

function createFile(document: FigmaNode): FigmaFile {
  return {
    name: 'Test Design',
    lastModified: '2026-01-25T10:00:00Z',
    version: '123',
    document,
  } as FigmaFile;
}

function createMinimalFile(): FigmaFile {
  return createFile(createNode({
    type: 'DOCUMENT',
    children: [
      createNode({
        id: 'page-1',
        name: 'Page 1',
        type: 'CANVAS',
        children: [
          createNode({
            id: 'frame-1',
            name: 'Frame 1',
            type: 'FRAME',
          }),
        ],
      }),
    ],
  }));
}

// ============================================
// P1: parseFile() with mocked FigmaClient
// ============================================

describe('P1: parseFile() with FigmaClient', () => {
  /**
   * Test proves: parseFile() calls FigmaClient.getFile() and parses response
   * → API integration works end-to-end
   */
  it('calls FigmaClient API and returns parsed design', async () => {
    const mockFile = createMinimalFile();
    const mockGetFile = jest.fn<() => Promise<FigmaFile>>().mockResolvedValue(mockFile);
    const mockClient = {
      getFile: mockGetFile,
    };

    const parser = new FigmaParser({
      client: mockClient as any,
    });

    const result = await parser.parseFile('test-file-key');

    // Verify API was called with correct file key
    expect(mockGetFile).toHaveBeenCalledWith('test-file-key');
    expect(mockGetFile).toHaveBeenCalledTimes(1);

    // Verify parsed result
    expect(result.metadata.name).toBe('Test Design');
    expect(result.metadata.fileKey).toBe('test-file-key');
    expect(result.pages).toHaveLength(1);
  });

  /**
   * Test proves: parseFile() throws meaningful error when no client configured
   * → Clear error message for misconfiguration
   */
  it('throws clear error when FigmaClient not configured', async () => {
    const parser = new FigmaParser({}); // No client

    await expect(parser.parseFile('any-key')).rejects.toThrow(
      'FigmaClient not configured. Provide clientConfig or use parseFileData.'
    );
  });

  /**
   * Test proves: parseFile() propagates API errors
   * → Errors from Figma API are not swallowed
   */
  it('propagates API errors from FigmaClient', async () => {
    const mockGetFile = jest.fn<() => Promise<FigmaFile>>().mockRejectedValue(new Error('Rate limited'));
    const mockClient = {
      getFile: mockGetFile,
    };

    const parser = new FigmaParser({
      client: mockClient as any,
    });

    await expect(parser.parseFile('test-key')).rejects.toThrow('Rate limited');
  });
});

// ============================================
// P2: extractAssets()
// ============================================

describe('P2: extractAssets() - Image extraction', () => {
  /**
   * Test proves: IMAGE fills are extracted as assets
   * → Image references collected from design
   */
  it('extracts IMAGE fills as design assets', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'frame-with-image',
              type: 'FRAME',
              fills: [
                {
                  type: 'IMAGE',
                  visible: true,
                  imageRef: 'img-abc123',
                },
              ],
            }),
          ],
        }),
      ],
    }));

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]!.id).toBe('img-abc123');
    expect(result.assets[0]!.type).toBe('image');
    expect(result.assets[0]!.usedBy).toContain('frame-with-image');
  });

  /**
   * Test proves: Multiple uses of same image tracked
   * → usedBy array contains all references
   */
  it('tracks multiple uses of same image reference', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'frame-1',
              fills: [{ type: 'IMAGE', visible: true, imageRef: 'shared-img' }],
            }),
            createNode({
              id: 'frame-2',
              fills: [{ type: 'IMAGE', visible: true, imageRef: 'shared-img' }],
            }),
          ],
        }),
      ],
    }));

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]!.usedBy).toHaveLength(2);
    expect(result.assets[0]!.usedBy).toContain('frame-1');
    expect(result.assets[0]!.usedBy).toContain('frame-2');
  });

  /**
   * Test proves: No images returns empty assets array
   * → Edge case handled gracefully
   */
  it('returns empty assets array when no images present', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'frame-1',
              fills: [{ type: 'SOLID', visible: true, color: createColor(1, 0, 0) }],
            }),
          ],
        }),
      ],
    }));

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    expect(result.assets).toHaveLength(0);
  });
});

// ============================================
// P3: Export functions
// ============================================

describe('P3: Export functions', () => {
  let generator: TokenGenerator;
  let tokens: ReturnType<TokenGenerator['generate']>;

  beforeEach(() => {
    generator = new TokenGenerator();

    // Create file with colors, typography, spacing, radii, shadows
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'frame-1',
              fills: [{ type: 'SOLID', visible: true, color: createColor(1, 0, 0) }],
              paddingTop: 16,
              paddingRight: 16,
              paddingBottom: 16,
              paddingLeft: 16,
              cornerRadius: 8,
              effects: [createDropShadow(4, 0, 2)],
            }),
            createNode({
              id: 'text-1',
              type: 'TEXT',
              style: createTypeStyle({ fontSize: 24, fontWeight: 700 }),
            }),
          ],
        }),
      ],
    }));

    tokens = generator.generate(file);
  });

  describe('exportCss()', () => {
    /**
     * Test proves: exportCss() generates valid CSS custom properties
     * → Output can be used in stylesheets
     */
    it('generates valid CSS with :root selector', () => {
      const css = generator.exportCss(tokens);

      expect(css).toContain(':root {');
      expect(css).toContain('}');
      expect(css).toContain('/* Design Tokens - Generated by FORGE */');
    });

    /**
     * Test proves: Color tokens become CSS variables
     * → Colors accessible via var(--color-*)
     */
    it('exports colors as CSS custom properties', () => {
      const css = generator.exportCss(tokens);

      expect(css).toContain('/* Colors */');
      expect(css).toMatch(/--color-[\w-]+:\s*#[A-F0-9]{6}/);
    });

    /**
     * Test proves: Typography tokens become CSS variables
     * → Font properties accessible via var(--font-*)
     */
    it('exports typography as CSS custom properties', () => {
      const css = generator.exportCss(tokens);

      expect(css).toContain('/* Typography */');
      expect(css).toMatch(/--font-size-[\w-]+:/);
      expect(css).toMatch(/--font-weight-[\w-]+:/);
      expect(css).toMatch(/--line-height-[\w-]+:/);
    });

    /**
     * Test proves: Spacing tokens become CSS variables
     * → Spacing accessible via var(--spacing-*)
     */
    it('exports spacing as CSS custom properties', () => {
      const css = generator.exportCss(tokens);

      expect(css).toContain('/* Spacing */');
      expect(css).toMatch(/--spacing-[\w-]+:\s*\d+px/);
    });

    /**
     * Test proves: Shadow tokens become CSS variables
     * → Shadows accessible via var(--shadow-*)
     */
    it('exports shadows as CSS custom properties', () => {
      const css = generator.exportCss(tokens);

      expect(css).toContain('/* Shadows */');
      expect(css).toMatch(/--shadow-[\w-]+:/);
    });

    /**
     * Test proves: CSS prefix option works
     * → Custom namespace for variables
     */
    it('applies custom CSS prefix', () => {
      const css = generator.exportCss(tokens, { cssPrefix: 'forge-' });

      expect(css).toContain('--forge-color-');
      expect(css).toContain('--forge-spacing-');
    });
  });

  describe('exportTailwind()', () => {
    /**
     * Test proves: exportTailwind() returns valid Tailwind config structure
     * → Can be spread into tailwind.config.js
     */
    it('returns valid Tailwind config structure', () => {
      const config = generator.exportTailwind(tokens) as any;

      expect(config).toHaveProperty('theme');
      expect(config.theme).toHaveProperty('extend');
      expect(config.theme.extend).toHaveProperty('colors');
      expect(config.theme.extend).toHaveProperty('fontSize');
      expect(config.theme.extend).toHaveProperty('spacing');
      expect(config.theme.extend).toHaveProperty('borderRadius');
      expect(config.theme.extend).toHaveProperty('boxShadow');
    });

    /**
     * Test proves: Colors mapped to Tailwind format
     * → Can use bg-colorName, text-colorName classes
     */
    it('maps colors to Tailwind format', () => {
      const config = generator.exportTailwind(tokens) as any;

      expect(typeof config.theme.extend.colors).toBe('object');
      const colorValues = Object.values(config.theme.extend.colors);
      expect(colorValues.every((v: unknown) => typeof v === 'string' && (v as string).startsWith('#'))).toBe(true);
    });

    /**
     * Test proves: Typography mapped to Tailwind fontSize format
     * → Can use text-* classes with line-height
     */
    it('maps typography to Tailwind fontSize format', () => {
      const config = generator.exportTailwind(tokens) as any;

      // Tailwind fontSize is [size, { lineHeight, fontWeight }]
      const fontSizes = Object.values(config.theme.extend.fontSize);
      for (const entry of fontSizes) {
        expect(Array.isArray(entry)).toBe(true);
        expect((entry as any[]).length).toBe(2);
        expect(typeof (entry as any[])[0]).toBe('string'); // Size
        expect(typeof (entry as any[])[1]).toBe('object'); // Options
      }
    });
  });

  describe('exportJson()', () => {
    /**
     * Test proves: exportJson() returns valid JSON string
     * → Can be saved to file and parsed back
     */
    it('returns valid JSON string', () => {
      const json = generator.exportJson(tokens);

      expect(() => JSON.parse(json)).not.toThrow();
    });

    /**
     * Test proves: JSON roundtrip preserves structure
     * → Data integrity maintained
     */
    it('preserves token structure in JSON roundtrip', () => {
      const json = generator.exportJson(tokens);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('colors');
      expect(parsed).toHaveProperty('typography');
      expect(parsed).toHaveProperty('spacing');
      expect(parsed).toHaveProperty('radii');
      expect(parsed).toHaveProperty('shadows');
      expect(parsed).toHaveProperty('meta');
    });
  });
});

// ============================================
// P4: Page filtering
// ============================================

describe('P4: Page filtering with pageIds', () => {
  const multiPageFile = createFile(createNode({
    type: 'DOCUMENT',
    children: [
      createNode({ id: 'page-1', name: 'Home', type: 'CANVAS', children: [] }),
      createNode({ id: 'page-2', name: 'About', type: 'CANVAS', children: [] }),
      createNode({ id: 'page-3', name: 'Contact', type: 'CANVAS', children: [] }),
    ],
  }));

  /**
   * Test proves: pageIds option filters to specified pages only
   * → Can parse subset of design
   */
  it('filters to only specified pageIds', () => {
    const parser = new FigmaParser({ pageIds: ['page-1', 'page-3'] });
    const result = parser.parseFileData(multiPageFile);

    expect(result.pages).toHaveLength(2);
    expect(result.pages.map(p => p.id)).toEqual(['page-1', 'page-3']);
  });

  /**
   * Test proves: Single pageId works
   * → Can parse single page from multi-page file
   */
  it('filters to single page when one pageId specified', () => {
    const parser = new FigmaParser({ pageIds: ['page-2'] });
    const result = parser.parseFileData(multiPageFile);

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]!.name).toBe('About');
  });

  /**
   * Test proves: Invalid pageId returns empty pages
   * → Graceful handling of non-existent page
   */
  it('returns empty pages array for invalid pageId', () => {
    const parser = new FigmaParser({ pageIds: ['non-existent-page'] });
    const result = parser.parseFileData(multiPageFile);

    expect(result.pages).toHaveLength(0);
    expect(result.stats.totalPages).toBe(0);
  });

  /**
   * Test proves: No pageIds option parses all pages
   * → Default behavior includes everything
   */
  it('parses all pages when pageIds not specified', () => {
    const parser = new FigmaParser({});
    const result = parser.parseFileData(multiPageFile);

    expect(result.pages).toHaveLength(3);
  });
});

// ============================================
// P5: Component instance references
// ============================================

describe('P5: Component instance references', () => {
  /**
   * Test proves: INSTANCE nodes get componentRef populated
   * → Can trace instance back to source component
   */
  it('populates componentRef for INSTANCE nodes', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'instance-1',
              name: 'Button Instance',
              type: 'INSTANCE',
              componentId: 'button-component-id',
            }),
          ],
        }),
      ],
    }));

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    const frame = result.pages[0]!.frames[0]!;
    expect(frame.componentRef).toBe('button-component-id');
  });

  /**
   * Test proves: Non-INSTANCE nodes don't have componentRef
   * → Only instances have this property
   */
  it('does not populate componentRef for non-INSTANCE nodes', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'frame-1',
              type: 'FRAME', // Not INSTANCE
            }),
          ],
        }),
      ],
    }));

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    const frame = result.pages[0]!.frames[0]!;
    expect(frame.componentRef).toBeUndefined();
  });

  /**
   * Test proves: Instance without componentId handled gracefully
   * → Edge case doesn't crash parser
   */
  it('handles INSTANCE without componentId', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'instance-broken',
              type: 'INSTANCE',
              // No componentId
            }),
          ],
        }),
      ],
    }));

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    // Should not throw, componentRef just undefined
    expect(result.pages[0]!.frames[0]!.componentRef).toBeUndefined();
  });
});

// ============================================
// P6: Stroke and shadow tokens
// ============================================

describe('P6: Stroke and shadow token extraction', () => {
  /**
   * Test proves: Stroke colors extracted to color tokens
   * → Border colors included in design system
   */
  it('extracts stroke colors to tokens', () => {
    const generator = new TokenGenerator();
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'frame-with-stroke',
              strokes: [
                { type: 'SOLID', visible: true, color: createColor(0, 0, 1) }, // Blue
              ],
            }),
          ],
        }),
      ],
    }));

    const tokens = generator.generate(file);

    // Should have the blue stroke color
    const colorValues = Object.values(tokens.colors).map(c => c.value);
    expect(colorValues).toContain('#0000FF');
  });

  /**
   * Test proves: Stroke usage path includes '/stroke' suffix
   * → Can distinguish fill vs stroke usage
   */
  it('marks stroke colors with /stroke usage path', () => {
    const generator = new TokenGenerator();
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'frame-1',
              name: 'Card',
              strokes: [{ type: 'SOLID', visible: true, color: createColor(0.5, 0.5, 0.5) }],
            }),
          ],
        }),
      ],
    }));

    const tokens = generator.generate(file);

    // Find the gray color token
    const grayToken = Object.values(tokens.colors).find(c => c.value === '#808080');
    expect(grayToken).toBeDefined();
    expect(grayToken!.usage.some(u => u.includes('/stroke'))).toBe(true);
  });

  /**
   * Test proves: DROP_SHADOW effects extracted to shadow tokens
   * → Box shadows included in design system
   */
  it('extracts DROP_SHADOW effects to shadow tokens', () => {
    const generator = new TokenGenerator();
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'frame-with-shadow',
              effects: [createDropShadow(8, 0, 4)],
            }),
          ],
        }),
      ],
    }));

    const tokens = generator.generate(file);

    expect(Object.keys(tokens.shadows).length).toBeGreaterThan(0);
    const shadowValue = Object.values(tokens.shadows)[0]!.value;
    expect(shadowValue).toContain('px'); // Has pixel values
    expect(shadowValue).toContain('rgba'); // Has color
  });

  /**
   * Test proves: INNER_SHADOW effects create 'inner' token
   * → Inset shadows distinguished from drop shadows
   */
  it('extracts INNER_SHADOW effects with inset keyword', () => {
    const generator = new TokenGenerator();
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'frame-with-inner-shadow',
              effects: [{
                type: 'INNER_SHADOW',
                visible: true,
                radius: 4,
                offset: { x: 0, y: 2 },
                color: createColor(0, 0, 0, 0.1),
              }],
            }),
          ],
        }),
      ],
    }));

    const tokens = generator.generate(file);

    // Should have inner shadow with 'inset' in value
    const innerShadow = tokens.shadows['inner'];
    expect(innerShadow).toBeDefined();
    expect(innerShadow!.value).toContain('inset');
    expect(innerShadow!.type).toBe('inner');
  });

  /**
   * Test proves: Individual corner radii extracted
   * → Non-uniform border radius tokens created
   */
  it('extracts individual corner radii from rectangleCornerRadii', () => {
    const generator = new TokenGenerator();
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'frame-with-radii',
              rectangleCornerRadii: [4, 8, 12, 16],
            }),
          ],
        }),
      ],
    }));

    const tokens = generator.generate(file);

    // Should have multiple radius values
    const radiiPixels = Object.values(tokens.radii)
      .map(r => r.pixels)
      .filter(p => p > 0 && p < 9999);

    expect(radiiPixels).toContain(4);
    expect(radiiPixels).toContain(8);
    expect(radiiPixels).toContain(12);
    expect(radiiPixels).toContain(16);
  });

  /**
   * Test proves: Text case mapping works (UPPER/LOWER/TITLE)
   * → Typography tokens include text-transform
   */
  it('maps text case to textTransform in typography tokens', () => {
    const generator = new TokenGenerator();
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'text-upper',
              type: 'TEXT',
              style: createTypeStyle({ textCase: 'UPPER', fontSize: 14 }),
            }),
          ],
        }),
      ],
    }));

    const tokens = generator.generate(file);

    // Find typography token with textTransform
    const typoWithTransform = Object.values(tokens.typography).find(t => t.textTransform);
    expect(typoWithTransform).toBeDefined();
    expect(typoWithTransform!.textTransform).toBe('uppercase');
  });
});

// ============================================
// P7: Interactions/Prototype Extraction
// ============================================

describe('P7: Interactions and Prototype Extraction', () => {
  /**
   * Test proves: Nodes with reactions array get interactions populated
   * → Prototype data extracted from Figma
   */
  it('extracts interactions from node with reactions', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'button-1',
              name: 'Button',
              type: 'FRAME',
              reactions: [
                {
                  trigger: { type: 'ON_CLICK' },
                  action: {
                    type: 'NODE',
                    destinationId: 'target-frame',
                    transition: {
                      type: 'DISSOLVE',
                      duration: 300,
                      easing: { type: 'EASE_OUT' },
                    },
                  },
                },
              ],
            }),
          ],
        }),
      ],
    }));

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    const frame = result.pages[0]!.frames[0]!;
    expect(frame.interactions).toBeDefined();
    expect(frame.interactions).toHaveLength(1);
    expect(frame.interactions![0]!.trigger).toBe('click');
    expect(frame.interactions![0]!.action).toBe('navigate');
    expect(frame.interactions![0]!.target).toBe('target-frame');
    expect(frame.interactions![0]!.transition).toBeDefined();
    expect(frame.interactions![0]!.transition!.type).toBe('DISSOLVE');
    expect(frame.interactions![0]!.transition!.duration).toBe(300);
  });

  /**
   * Test proves: URL action type extracts url property
   * → External links captured
   */
  it('extracts URL action with url property', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'link-1',
              name: 'External Link',
              type: 'FRAME',
              reactions: [
                {
                  trigger: { type: 'ON_CLICK' },
                  action: {
                    type: 'URL',
                    url: 'https://example.com',
                  },
                },
              ],
            }),
          ],
        }),
      ],
    }));

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    const frame = result.pages[0]!.frames[0]!;
    expect(frame.interactions![0]!.action).toBe('url');
    expect(frame.interactions![0]!.url).toBe('https://example.com');
  });

  /**
   * Test proves: Multiple reactions on single node extracted
   * → Complex interaction states handled
   */
  it('extracts multiple reactions from single node', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'interactive-1',
              name: 'Interactive Element',
              type: 'FRAME',
              reactions: [
                {
                  trigger: { type: 'ON_CLICK' },
                  action: { type: 'NODE', destinationId: 'screen-2' },
                },
                {
                  trigger: { type: 'ON_HOVER' },
                  action: { type: 'NODE', destinationId: 'tooltip' },
                },
              ],
            }),
          ],
        }),
      ],
    }));

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    const frame = result.pages[0]!.frames[0]!;
    expect(frame.interactions).toHaveLength(2);
    expect(frame.interactions![0]!.trigger).toBe('click');
    expect(frame.interactions![1]!.trigger).toBe('hover');
  });

  /**
   * Test proves: Nodes without reactions have no interactions property
   * → Clean output for non-interactive elements
   */
  it('does not add interactions for nodes without reactions', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'static-1',
              name: 'Static Frame',
              type: 'FRAME',
              // No reactions
            }),
          ],
        }),
      ],
    }));

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    const frame = result.pages[0]!.frames[0]!;
    expect(frame.interactions).toBeUndefined();
  });
});

// ============================================
// P8: Trigger and Action Type Mapping
// ============================================

describe('P8: Trigger and Action Type Mapping', () => {
  // Helper to create reaction with specific trigger/action
  // Uses `as any` to allow testing unknown/future types
  function createReactionFile(triggerType: string, actionType: string) {
    return createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'node-1',
              type: 'FRAME',
              reactions: [
                {
                  trigger: { type: triggerType } as any,
                  action: { type: actionType, destinationId: 'target' } as any,
                },
              ],
            }),
          ],
        }),
      ],
    }));
  }

  describe('mapTrigger coverage', () => {
    /**
     * Test proves: ON_CLICK maps to 'click'
     */
    it('maps ON_CLICK to click', () => {
      const parser = new FigmaParser({});
      const result = parser.parseFileData(createReactionFile('ON_CLICK', 'NODE'));
      expect(result.pages[0]!.frames[0]!.interactions![0]!.trigger).toBe('click');
    });

    /**
     * Test proves: ON_HOVER maps to 'hover'
     */
    it('maps ON_HOVER to hover', () => {
      const parser = new FigmaParser({});
      const result = parser.parseFileData(createReactionFile('ON_HOVER', 'NODE'));
      expect(result.pages[0]!.frames[0]!.interactions![0]!.trigger).toBe('hover');
    });

    /**
     * Test proves: MOUSE_ENTER maps to 'hover'
     */
    it('maps MOUSE_ENTER to hover', () => {
      const parser = new FigmaParser({});
      const result = parser.parseFileData(createReactionFile('MOUSE_ENTER', 'NODE'));
      expect(result.pages[0]!.frames[0]!.interactions![0]!.trigger).toBe('hover');
    });

    /**
     * Test proves: ON_PRESS maps to 'press'
     */
    it('maps ON_PRESS to press', () => {
      const parser = new FigmaParser({});
      const result = parser.parseFileData(createReactionFile('ON_PRESS', 'NODE'));
      expect(result.pages[0]!.frames[0]!.interactions![0]!.trigger).toBe('press');
    });

    /**
     * Test proves: MOUSE_DOWN maps to 'press'
     */
    it('maps MOUSE_DOWN to press', () => {
      const parser = new FigmaParser({});
      const result = parser.parseFileData(createReactionFile('MOUSE_DOWN', 'NODE'));
      expect(result.pages[0]!.frames[0]!.interactions![0]!.trigger).toBe('press');
    });

    /**
     * Test proves: ON_DRAG maps to 'drag'
     */
    it('maps ON_DRAG to drag', () => {
      const parser = new FigmaParser({});
      const result = parser.parseFileData(createReactionFile('ON_DRAG', 'NODE'));
      expect(result.pages[0]!.frames[0]!.interactions![0]!.trigger).toBe('drag');
    });

    /**
     * Test proves: Unknown trigger defaults to 'click'
     */
    it('maps unknown trigger to click (default)', () => {
      const parser = new FigmaParser({});
      const result = parser.parseFileData(createReactionFile('UNKNOWN_TRIGGER', 'NODE'));
      expect(result.pages[0]!.frames[0]!.interactions![0]!.trigger).toBe('click');
    });
  });

  describe('mapAction coverage', () => {
    /**
     * Test proves: NODE maps to 'navigate'
     */
    it('maps NODE to navigate', () => {
      const parser = new FigmaParser({});
      const result = parser.parseFileData(createReactionFile('ON_CLICK', 'NODE'));
      expect(result.pages[0]!.frames[0]!.interactions![0]!.action).toBe('navigate');
    });

    /**
     * Test proves: OVERLAY maps to 'overlay'
     */
    it('maps OVERLAY to overlay', () => {
      const parser = new FigmaParser({});
      const result = parser.parseFileData(createReactionFile('ON_CLICK', 'OVERLAY'));
      expect(result.pages[0]!.frames[0]!.interactions![0]!.action).toBe('overlay');
    });

    /**
     * Test proves: SWAP maps to 'swap'
     */
    it('maps SWAP to swap', () => {
      const parser = new FigmaParser({});
      const result = parser.parseFileData(createReactionFile('ON_CLICK', 'SWAP'));
      expect(result.pages[0]!.frames[0]!.interactions![0]!.action).toBe('swap');
    });

    /**
     * Test proves: BACK maps to 'back'
     */
    it('maps BACK to back', () => {
      const parser = new FigmaParser({});
      const result = parser.parseFileData(createReactionFile('ON_CLICK', 'BACK'));
      expect(result.pages[0]!.frames[0]!.interactions![0]!.action).toBe('back');
    });

    /**
     * Test proves: URL maps to 'url'
     */
    it('maps URL to url', () => {
      const parser = new FigmaParser({});
      const result = parser.parseFileData(createReactionFile('ON_CLICK', 'URL'));
      expect(result.pages[0]!.frames[0]!.interactions![0]!.action).toBe('url');
    });

    /**
     * Test proves: SCROLL_TO maps to 'scroll'
     */
    it('maps SCROLL_TO to scroll', () => {
      const parser = new FigmaParser({});
      const result = parser.parseFileData(createReactionFile('ON_CLICK', 'SCROLL_TO'));
      expect(result.pages[0]!.frames[0]!.interactions![0]!.action).toBe('scroll');
    });

    /**
     * Test proves: Unknown action defaults to 'navigate'
     */
    it('maps unknown action to navigate (default)', () => {
      const parser = new FigmaParser({});
      const result = parser.parseFileData(createReactionFile('ON_CLICK', 'UNKNOWN_ACTION'));
      expect(result.pages[0]!.frames[0]!.interactions![0]!.action).toBe('navigate');
    });
  });
});

// ============================================
// P9: Component Property Mapping
// ============================================

describe('P9: Component Property Mapping', () => {
  /**
   * Test proves: Component with BOOLEAN property mapped correctly
   * → boolean props extracted with correct type
   */
  it('maps BOOLEAN property type to boolean', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'comp-1',
              name: 'Toggle',
              type: 'COMPONENT',
              componentPropertyDefinitions: {
                isEnabled: {
                  type: 'BOOLEAN',
                  defaultValue: true,
                },
              },
            }),
          ],
        }),
      ],
    }));
    file.components = {
      'comp-1': { name: 'Toggle', description: '', key: 'key-1' },
    };

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    const toggle = result.components.find(c => c.id === 'comp-1');
    expect(toggle).toBeDefined();
    expect(toggle!.props).toHaveLength(1);
    expect(toggle!.props[0]!.name).toBe('isEnabled');
    expect(toggle!.props[0]!.type).toBe('boolean');
    expect(toggle!.props[0]!.defaultValue).toBe(true);
    expect(toggle!.props[0]!.required).toBe(false); // BOOLEAN is not required
  });

  /**
   * Test proves: Component with TEXT property mapped correctly
   * → text props extracted with correct type
   */
  it('maps TEXT property type to text', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'comp-1',
              name: 'Button',
              type: 'COMPONENT',
              componentPropertyDefinitions: {
                label: {
                  type: 'TEXT',
                  defaultValue: 'Click me',
                },
              },
            }),
          ],
        }),
      ],
    }));
    file.components = {
      'comp-1': { name: 'Button', description: '', key: 'key-1' },
    };

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    const button = result.components.find(c => c.id === 'comp-1');
    expect(button!.props[0]!.type).toBe('text');
    expect(button!.props[0]!.defaultValue).toBe('Click me');
    expect(button!.props[0]!.required).toBe(true); // TEXT is required
  });

  /**
   * Test proves: Component with INSTANCE_SWAP property mapped correctly
   * → instanceSwap props for slot-like behavior
   */
  it('maps INSTANCE_SWAP property type to instanceSwap', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'comp-1',
              name: 'IconButton',
              type: 'COMPONENT',
              componentPropertyDefinitions: {
                icon: {
                  type: 'INSTANCE_SWAP',
                  defaultValue: 'icon-placeholder',
                },
              },
            }),
          ],
        }),
      ],
    }));
    file.components = {
      'comp-1': { name: 'IconButton', description: '', key: 'key-1' },
    };

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    const iconButton = result.components.find(c => c.id === 'comp-1');
    expect(iconButton!.props[0]!.type).toBe('instanceSwap');
  });

  /**
   * Test proves: Component with VARIANT property mapped with options
   * → variant props include variantOptions array
   */
  it('maps VARIANT property type with options', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'comp-1',
              name: 'Button',
              type: 'COMPONENT',
              componentPropertyDefinitions: {
                size: {
                  type: 'VARIANT',
                  defaultValue: 'medium',
                  variantOptions: ['small', 'medium', 'large'],
                },
              },
            }),
          ],
        }),
      ],
    }));
    file.components = {
      'comp-1': { name: 'Button', description: '', key: 'key-1' },
    };

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    const button = result.components.find(c => c.id === 'comp-1');
    expect(button!.props[0]!.type).toBe('variant');
    expect(button!.props[0]!.options).toEqual(['small', 'medium', 'large']);
  });

  /**
   * Test proves: Unknown property type defaults to 'text'
   * → Graceful fallback for future Figma property types
   */
  it('maps unknown property type to text (default)', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'comp-1',
              name: 'Widget',
              type: 'COMPONENT',
              componentPropertyDefinitions: {
                mystery: {
                  type: 'FUTURE_TYPE' as any, // Unknown type - cast to any for testing
                  defaultValue: 'value',
                },
              },
            }),
          ],
        }),
      ],
    }));
    file.components = {
      'comp-1': { name: 'Widget', description: '', key: 'key-1' },
    };

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    const widget = result.components.find(c => c.id === 'comp-1');
    expect(widget!.props[0]!.type).toBe('text'); // Default fallback
  });

  /**
   * Test proves: Multiple properties extracted together
   * → Complete component API captured
   */
  it('extracts multiple properties from single component', () => {
    const file = createFile(createNode({
      type: 'DOCUMENT',
      children: [
        createNode({
          id: 'page-1',
          type: 'CANVAS',
          children: [
            createNode({
              id: 'comp-1',
              name: 'Card',
              type: 'COMPONENT',
              componentPropertyDefinitions: {
                title: { type: 'TEXT', defaultValue: 'Title' },
                showImage: { type: 'BOOLEAN', defaultValue: true },
                variant: { type: 'VARIANT', defaultValue: 'default', variantOptions: ['default', 'outlined'] },
              },
            }),
          ],
        }),
      ],
    }));
    file.components = {
      'comp-1': { name: 'Card', description: '', key: 'key-1' },
    };

    const parser = new FigmaParser({});
    const result = parser.parseFileData(file);

    const card = result.components.find(c => c.id === 'comp-1');
    expect(card!.props).toHaveLength(3);
    expect(card!.props.map(p => p.name).sort()).toEqual(['showImage', 'title', 'variant']);
  });
});
