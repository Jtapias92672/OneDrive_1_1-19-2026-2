/**
 * Figma Parser Tests
 * Epic 11: External Integrations - Phase 2
 */

import { FigmaParser } from '../figma-parser';
import { FigmaFile } from '../figma-types';
import { ParsedComponent } from '../parsed-types';
import * as fs from 'fs';
import * as path from 'path';

describe('FigmaParser', () => {
  let parser: FigmaParser;
  let realFigmaData: FigmaFile | null = null;

  beforeAll(() => {
    parser = new FigmaParser();
    // Load REAL data from vertical slice output
    const dataPath = path.join(__dirname, '../../../../../vertical-slice-output/figma-api-response.json');
    if (fs.existsSync(dataPath)) {
      realFigmaData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
  });

  describe('parse', () => {
    it('parses a minimal Figma file', () => {
      const minimalFile: FigmaFile = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '0:1',
              name: 'Page 1',
              type: 'CANVAS',
              children: [
                {
                  id: '1:2',
                  name: 'Test Frame',
                  type: 'FRAME',
                  absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
                  fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
                },
              ],
            },
          ],
        },
        components: {},
        schemaVersion: 0,
        styles: {},
        name: 'Test File',
        lastModified: '2025-01-27T00:00:00Z',
        thumbnailUrl: '',
        version: '1',
      };

      const result = parser.parse(minimalFile);

      expect(result.name).toBe('Test File');
      expect(result.lastModified).toBe('2025-01-27T00:00:00Z');
      expect(result.components.length).toBe(1);
      expect(result.components[0].name).toBe('Test Frame');
      expect(result.components[0].type).toBe('FRAME');
    });

    it('extracts bounds from absoluteBoundingBox', () => {
      const file: FigmaFile = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '0:1',
              name: 'Page',
              type: 'CANVAS',
              children: [
                {
                  id: '1:1',
                  name: 'Frame',
                  type: 'FRAME',
                  absoluteBoundingBox: { x: 100, y: 200, width: 500, height: 400 },
                },
              ],
            },
          ],
        },
        components: {},
        schemaVersion: 0,
        styles: {},
        name: 'Bounds Test',
        lastModified: '',
        thumbnailUrl: '',
        version: '1',
      };

      const result = parser.parse(file);
      const frame = result.components[0];

      expect(frame.bounds).toEqual({ x: 100, y: 200, width: 500, height: 400 });
    });
  });

  describe('parseFills', () => {
    it('parses solid fill colors', () => {
      const file: FigmaFile = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '0:1',
              name: 'Page',
              type: 'CANVAS',
              children: [
                {
                  id: '1:1',
                  name: 'Colored Box',
                  type: 'RECTANGLE',
                  fills: [
                    { type: 'SOLID', color: { r: 0.5, g: 0.25, b: 0.75, a: 1 } },
                  ],
                },
              ],
            },
          ],
        },
        components: {},
        schemaVersion: 0,
        styles: {},
        name: 'Fill Test',
        lastModified: '',
        thumbnailUrl: '',
        version: '1',
      };

      const result = parser.parse(file);
      const fills = result.components[0].fills;

      expect(fills.length).toBe(1);
      expect(fills[0].type).toBe('SOLID');
      expect(fills[0].color).toEqual({ r: 0.5, g: 0.25, b: 0.75, a: 1 });
      expect(fills[0].opacity).toBe(1);
    });

    it('respects fill opacity', () => {
      const file: FigmaFile = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '0:1',
              name: 'Page',
              type: 'CANVAS',
              children: [
                {
                  id: '1:1',
                  name: 'Semi-transparent',
                  type: 'RECTANGLE',
                  fills: [
                    { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 0.5 },
                  ],
                },
              ],
            },
          ],
        },
        components: {},
        schemaVersion: 0,
        styles: {},
        name: 'Opacity Test',
        lastModified: '',
        thumbnailUrl: '',
        version: '1',
      };

      const result = parser.parse(file);
      expect(result.components[0].fills[0].opacity).toBe(0.5);
    });

    it('filters out invisible fills', () => {
      const file: FigmaFile = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '0:1',
              name: 'Page',
              type: 'CANVAS',
              children: [
                {
                  id: '1:1',
                  name: 'Mixed Visibility',
                  type: 'RECTANGLE',
                  fills: [
                    { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, visible: true },
                    { type: 'SOLID', color: { r: 0, g: 1, b: 0, a: 1 }, visible: false },
                  ],
                },
              ],
            },
          ],
        },
        components: {},
        schemaVersion: 0,
        styles: {},
        name: 'Visibility Test',
        lastModified: '',
        thumbnailUrl: '',
        version: '1',
      };

      const result = parser.parse(file);
      expect(result.components[0].fills.length).toBe(1);
      expect(result.components[0].fills[0].color?.r).toBe(1); // Red fill, not green
    });
  });

  describe('parseStrokes', () => {
    it('parses stroke properties', () => {
      const file: FigmaFile = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '0:1',
              name: 'Page',
              type: 'CANVAS',
              children: [
                {
                  id: '1:1',
                  name: 'Stroked Box',
                  type: 'RECTANGLE',
                  strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
                  strokeWeight: 2,
                  strokeAlign: 'INSIDE',
                },
              ],
            },
          ],
        },
        components: {},
        schemaVersion: 0,
        styles: {},
        name: 'Stroke Test',
        lastModified: '',
        thumbnailUrl: '',
        version: '1',
      };

      const result = parser.parse(file);
      const strokes = result.components[0].strokes;

      expect(strokes.length).toBe(1);
      expect(strokes[0].weight).toBe(2);
      expect(strokes[0].alignment).toBe('INSIDE');
      expect(strokes[0].color).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });
  });

  describe('parseText', () => {
    it('extracts text content and style', () => {
      const file: FigmaFile = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '0:1',
              name: 'Page',
              type: 'CANVAS',
              children: [
                {
                  id: '1:1',
                  name: 'Heading',
                  type: 'TEXT',
                  characters: 'Hello World',
                  style: {
                    fontFamily: 'Inter',
                    fontWeight: 700,
                    fontSize: 24,
                    textAlignHorizontal: 'CENTER',
                    lineHeightPx: 30,
                    letterSpacing: 0.5,
                  },
                },
              ],
            },
          ],
        },
        components: {},
        schemaVersion: 0,
        styles: {},
        name: 'Text Test',
        lastModified: '',
        thumbnailUrl: '',
        version: '1',
      };

      const result = parser.parse(file);
      const textNode = result.components[0];

      expect(textNode.type).toBe('TEXT');
      expect(textNode.text).toBeDefined();
      expect(textNode.text?.content).toBe('Hello World');
      expect(textNode.text?.fontFamily).toBe('Inter');
      expect(textNode.text?.fontWeight).toBe(700);
      expect(textNode.text?.fontSize).toBe(24);
      expect(textNode.text?.textAlign).toBe('CENTER');
      expect(textNode.text?.lineHeight).toBe(30);
      expect(textNode.text?.letterSpacing).toBe(0.5);
    });

    it('uses default values when style is missing', () => {
      const file: FigmaFile = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '0:1',
              name: 'Page',
              type: 'CANVAS',
              children: [
                {
                  id: '1:1',
                  name: 'Plain Text',
                  type: 'TEXT',
                  characters: 'No style',
                },
              ],
            },
          ],
        },
        components: {},
        schemaVersion: 0,
        styles: {},
        name: 'Default Style Test',
        lastModified: '',
        thumbnailUrl: '',
        version: '1',
      };

      const result = parser.parse(file);
      const textNode = result.components[0];

      expect(textNode.text?.fontFamily).toBe('Inter');
      expect(textNode.text?.fontWeight).toBe(400);
      expect(textNode.text?.fontSize).toBe(14);
      expect(textNode.text?.textAlign).toBe('LEFT');
    });
  });

  describe('parseAutoLayout', () => {
    it('extracts auto-layout properties', () => {
      const file: FigmaFile = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '0:1',
              name: 'Page',
              type: 'CANVAS',
              children: [
                {
                  id: '1:1',
                  name: 'Flex Container',
                  type: 'FRAME',
                  layoutMode: 'VERTICAL',
                  itemSpacing: 16,
                  paddingTop: 24,
                  paddingRight: 24,
                  paddingBottom: 24,
                  paddingLeft: 24,
                  primaryAxisAlignItems: 'CENTER',
                  counterAxisAlignItems: 'MAX',
                },
              ],
            },
          ],
        },
        components: {},
        schemaVersion: 0,
        styles: {},
        name: 'AutoLayout Test',
        lastModified: '',
        thumbnailUrl: '',
        version: '1',
      };

      const result = parser.parse(file);
      const frame = result.components[0];

      expect(frame.autoLayout).toBeDefined();
      expect(frame.autoLayout?.direction).toBe('VERTICAL');
      expect(frame.autoLayout?.spacing).toBe(16);
      expect(frame.autoLayout?.paddingTop).toBe(24);
      expect(frame.autoLayout?.paddingRight).toBe(24);
      expect(frame.autoLayout?.paddingBottom).toBe(24);
      expect(frame.autoLayout?.paddingLeft).toBe(24);
      // counterAxisAlignItems maps to alignItems
      expect(frame.autoLayout?.alignItems).toBe('MAX');
      // primaryAxisAlignItems maps to justifyContent
      expect(frame.autoLayout?.justifyContent).toBe('CENTER');
    });

    it('returns undefined for non-auto-layout frames', () => {
      const file: FigmaFile = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '0:1',
              name: 'Page',
              type: 'CANVAS',
              children: [
                {
                  id: '1:1',
                  name: 'Regular Frame',
                  type: 'FRAME',
                },
              ],
            },
          ],
        },
        components: {},
        schemaVersion: 0,
        styles: {},
        name: 'No AutoLayout Test',
        lastModified: '',
        thumbnailUrl: '',
        version: '1',
      };

      const result = parser.parse(file);
      expect(result.components[0].autoLayout).toBeUndefined();
    });
  });

  describe('parseEffects', () => {
    it('parses drop shadow effects', () => {
      const file: FigmaFile = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '0:1',
              name: 'Page',
              type: 'CANVAS',
              children: [
                {
                  id: '1:1',
                  name: 'Shadowed Box',
                  type: 'RECTANGLE',
                  effects: [
                    {
                      type: 'DROP_SHADOW',
                      visible: true,
                      radius: 8,
                      color: { r: 0, g: 0, b: 0, a: 0.25 },
                      offset: { x: 0, y: 4 },
                      spread: 0,
                    },
                  ],
                },
              ],
            },
          ],
        },
        components: {},
        schemaVersion: 0,
        styles: {},
        name: 'Shadow Test',
        lastModified: '',
        thumbnailUrl: '',
        version: '1',
      };

      const result = parser.parse(file);
      const effects = result.components[0].effects;

      expect(effects.length).toBe(1);
      expect(effects[0].type).toBe('DROP_SHADOW');
      expect(effects[0].radius).toBe(8);
      expect(effects[0].offset).toEqual({ x: 0, y: 4 });
      expect(effects[0].color?.a).toBe(0.25);
    });
  });

  describe('parseNode', () => {
    it('recursively parses children', () => {
      const file: FigmaFile = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '0:1',
              name: 'Page',
              type: 'CANVAS',
              children: [
                {
                  id: '1:1',
                  name: 'Parent',
                  type: 'FRAME',
                  children: [
                    { id: '1:2', name: 'Child 1', type: 'RECTANGLE' },
                    { id: '1:3', name: 'Child 2', type: 'TEXT', characters: 'Hello' },
                  ],
                },
              ],
            },
          ],
        },
        components: {},
        schemaVersion: 0,
        styles: {},
        name: 'Nested Test',
        lastModified: '',
        thumbnailUrl: '',
        version: '1',
      };

      const result = parser.parse(file);
      const parent = result.components[0];

      expect(parent.children.length).toBe(2);
      expect(parent.children[0].name).toBe('Child 1');
      expect(parent.children[0].type).toBe('RECTANGLE');
      expect(parent.children[1].name).toBe('Child 2');
      expect(parent.children[1].type).toBe('TEXT');
    });
  });

  describe('static utility methods', () => {
    it('converts RGB to hex', () => {
      expect(FigmaParser.rgbToHex({ r: 1, g: 1, b: 1, a: 1 })).toBe('#ffffff');
      expect(FigmaParser.rgbToHex({ r: 0, g: 0, b: 0, a: 1 })).toBe('#000000');
      expect(FigmaParser.rgbToHex({ r: 1, g: 0, b: 0, a: 1 })).toBe('#ff0000');
      expect(FigmaParser.rgbToHex({ r: 0.5, g: 0.5, b: 0.5, a: 1 })).toBe('#808080');
    });

    it('converts RGB to CSS', () => {
      expect(FigmaParser.rgbToCss({ r: 1, g: 1, b: 1, a: 1 })).toBe('rgb(255, 255, 255)');
      expect(FigmaParser.rgbToCss({ r: 0, g: 0, b: 0, a: 1 })).toBe('rgb(0, 0, 0)');
      expect(FigmaParser.rgbToCss({ r: 0, g: 0, b: 0, a: 0.5 })).toBe('rgba(0, 0, 0, 0.50)');
    });
  });

  describe('with real Figma data', () => {
    it('parses document name from POC_Test_Design', () => {
      if (!realFigmaData) {
        console.log('Skipping real data test - figma-api-response.json not found');
        return;
      }
      const result = parser.parse(realFigmaData);
      expect(result.name).toBe('POC_Test_Design');
    });

    it('extracts multiple components from real data', () => {
      if (!realFigmaData) return;
      const result = parser.parse(realFigmaData);
      expect(result.components.length).toBeGreaterThan(0);
      console.log(`Found ${result.components.length} top-level components`);
    });

    it('extracts fill colors from real data', () => {
      if (!realFigmaData) return;
      const result = parser.parse(realFigmaData);

      // Recursively find all fills
      const allFills = collectFills(result.components);
      const solidFills = allFills.filter((f) => f.type === 'SOLID' && f.color);

      expect(solidFills.length).toBeGreaterThan(0);
      console.log(
        'Colors found:',
        solidFills.slice(0, 5).map((f) => FigmaParser.rgbToHex(f.color!))
      );
    });

    it('extracts text properties from real data', () => {
      if (!realFigmaData) return;
      const result = parser.parse(realFigmaData);

      const textNodes = findTextNodes(result.components);

      expect(textNodes.length).toBeGreaterThan(0);
      console.log(
        'Text found:',
        textNodes.slice(0, 5).map((t) => ({
          content: t.text?.content?.substring(0, 30),
          font: t.text?.fontFamily,
          size: t.text?.fontSize,
        }))
      );
    });

    it('extracts auto-layout properties from real data', () => {
      if (!realFigmaData) return;
      const result = parser.parse(realFigmaData);

      const autoLayoutNodes = findAutoLayoutNodes(result.components);

      console.log(`Found ${autoLayoutNodes.length} auto-layout nodes`);
      if (autoLayoutNodes.length > 0) {
        console.log(
          'Auto-layout samples:',
          autoLayoutNodes.slice(0, 3).map((n) => ({
            name: n.name,
            direction: n.autoLayout?.direction,
            spacing: n.autoLayout?.spacing,
          }))
        );
      }
    });
  });
});

// Helper functions
function collectFills(components: ParsedComponent[]): any[] {
  const fills: any[] = [];
  for (const c of components) {
    fills.push(...c.fills);
    if (c.children) {
      fills.push(...collectFills(c.children));
    }
  }
  return fills;
}

function findTextNodes(components: ParsedComponent[]): ParsedComponent[] {
  const result: ParsedComponent[] = [];
  for (const c of components) {
    if (c.type === 'TEXT') result.push(c);
    if (c.children) result.push(...findTextNodes(c.children));
  }
  return result;
}

function findAutoLayoutNodes(components: ParsedComponent[]): ParsedComponent[] {
  const result: ParsedComponent[] = [];
  for (const c of components) {
    if (c.autoLayout) result.push(c);
    if (c.children) result.push(...findAutoLayoutNodes(c.children));
  }
  return result;
}
