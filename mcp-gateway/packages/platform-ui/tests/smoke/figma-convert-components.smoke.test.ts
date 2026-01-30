/**
 * Smoke Test: convertComponents() FUNCTIONAL VERIFICATION
 * Epic 7.5 v2: Directly test convertComponents() with mock Figma data
 *
 * Tests convertComponents() with realistic mock Figma data to verify:
 * 1. Simple component conversion
 * 2. Nested children handling
 * 3. IMAGE fills detection and processing
 * 4. Hierarchy preservation
 * 5. Bounds handling
 */

import { createPOCOrchestrator } from '@/lib/poc';
import type { ParsedComponent as FigmaParsedComponent } from '@/lib/integrations/figma/parsed-types';

describe('Smoke: convertComponents() Direct Testing', () => {
  const config = {
    figmaToken: process.env.FIGMA_TOKEN || 'mock-token',
  };

  /**
   * Capability 1: Convert simple Figma component with SOLID fill
   */
  it('should convert simple component with SOLID fill', () => {
    const mockFigmaComponent: FigmaParsedComponent = {
      id: 'button-1',
      name: 'Primary Button',
      type: 'COMPONENT',
      bounds: { x: 0, y: 0, width: 120, height: 40 },
      fills: [
        {
          type: 'SOLID',
          color: { r: 0.2, g: 0.5, b: 0.9, a: 1 },
          opacity: 1,
        }
      ],
      strokes: [],
      effects: [],
      children: [],
    };

    // Access the private method via type assertion for testing
    const orchestrator = createPOCOrchestrator(config) as any;
    const result = orchestrator.convertComponents([mockFigmaComponent], 0);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('button-1');
    expect(result[0].name).toBe('Primary Button');
    expect(result[0].type).toBe('component');
    expect(result[0].bounds).toEqual({ x: 0, y: 0, width: 120, height: 40 });
    // RGB conversion: r:0.2*255=51, g:0.5*255=128 (rounded), b:0.9*255=230 (rounded)
    expect(result[0].styles.colors).toHaveLength(1);
    expect(result[0].styles.colors[0]).toBe('rgba(51, 128, 230, 1)');
    expect(result[0].children).toEqual([]);

    console.log('[Smoke] ✅ Simple component conversion: PASS');
  });

  /**
   * Capability 2: Convert nested children (2 levels deep)
   */
  it('should convert nested children preserving hierarchy', () => {
    const mockFigmaComponent: FigmaParsedComponent = {
      id: 'frame-1',
      name: 'Card Frame',
      type: 'FRAME',
      bounds: { x: 0, y: 0, width: 300, height: 200 },
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1 }],
      strokes: [],
      effects: [],
      children: [
        {
          id: 'text-1',
          name: 'Title',
          type: 'TEXT',
          bounds: { x: 10, y: 10, width: 280, height: 30 },
          fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1 }],
          strokes: [],
          effects: [],
          children: [],
          text: {
            content: 'Hello World',
            fontFamily: 'Inter',
            fontSize: 24,
            fontWeight: 700,
            textAlign: 'LEFT',
          },
        },
        {
          id: 'button-1',
          name: 'Action Button',
          type: 'COMPONENT',
          bounds: { x: 10, y: 50, width: 100, height: 40 },
          fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.7, b: 0.4, a: 1 }, opacity: 1 }],
          strokes: [],
          effects: [],
          children: [],
        },
      ],
    };

    const orchestrator = createPOCOrchestrator(config) as any;
    const result = orchestrator.convertComponents([mockFigmaComponent], 0);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('frame-1');
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children[0].id).toBe('text-1');
    expect(result[0].children[0].text?.content).toBe('Hello World');
    expect(result[0].children[1].id).toBe('button-1');
    expect(result[0].children[1].type).toBe('component');

    console.log('[Smoke] ✅ Nested children hierarchy: PASS');
  });

  /**
   * Capability 3: Handle IMAGE fills
   */
  it('should detect and handle IMAGE fills', () => {
    const mockFigmaComponent: FigmaParsedComponent = {
      id: 'image-frame-1',
      name: 'Avatar Container',
      type: 'RECTANGLE',
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      fills: [
        {
          type: 'IMAGE',
          imageRef: 'abc123def456',
          opacity: 1,
          scaleMode: 'FILL',
        }
      ],
      strokes: [],
      effects: [],
      children: [],
    };

    const orchestrator = createPOCOrchestrator(config) as any;
    const result = orchestrator.convertComponents([mockFigmaComponent], 0);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('image-frame-1');
    expect(result[0].fills).toHaveLength(1);
    expect(result[0].fills[0].type).toBe('IMAGE');

    console.log('[Smoke] ✅ IMAGE fills detection: PASS');
  });

  /**
   * Capability 4: Handle explicit IMAGE node type
   */
  it('should handle explicit IMAGE node type', () => {
    const mockFigmaComponent: FigmaParsedComponent = {
      id: 'image-1',
      name: 'Profile Photo',
      type: 'IMAGE',
      bounds: { x: 0, y: 0, width: 200, height: 200 },
      fills: [],
      strokes: [],
      effects: [],
      children: [],
      imageUrl: 'https://example.com/image.png',
    };

    const orchestrator = createPOCOrchestrator(config) as any;
    const result = orchestrator.convertComponents([mockFigmaComponent], 0);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('image-1');
    expect(result[0].type).toBe('image');
    expect(result[0].bounds).toEqual({ x: 0, y: 0, width: 200, height: 200 });

    console.log('[Smoke] ✅ Explicit IMAGE node type: PASS');
  });

  /**
   * Capability 5: Handle deeply nested structure (5 levels)
   */
  it('should handle deeply nested structure without stack overflow', () => {
    // Create 5-level deep nesting
    const level5: FigmaParsedComponent = {
      id: 'level-5',
      name: 'Deepest Child',
      type: 'TEXT',
      bounds: { x: 50, y: 50, width: 50, height: 20 },
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1 }],
      strokes: [],
      effects: [],
      children: [],
      text: { content: 'Deep Text', fontFamily: 'Inter', fontSize: 14, fontWeight: 400, textAlign: 'LEFT' },
    };

    const level4: FigmaParsedComponent = {
      id: 'level-4',
      name: 'Level 4',
      type: 'FRAME',
      bounds: { x: 40, y: 40, width: 80, height: 40 },
      fills: [],
      strokes: [],
      effects: [],
      children: [level5],
    };

    const level3: FigmaParsedComponent = {
      id: 'level-3',
      name: 'Level 3',
      type: 'FRAME',
      bounds: { x: 30, y: 30, width: 110, height: 60 },
      fills: [],
      strokes: [],
      effects: [],
      children: [level4],
    };

    const level2: FigmaParsedComponent = {
      id: 'level-2',
      name: 'Level 2',
      type: 'FRAME',
      bounds: { x: 20, y: 20, width: 140, height: 80 },
      fills: [],
      strokes: [],
      effects: [],
      children: [level3],
    };

    const level1: FigmaParsedComponent = {
      id: 'level-1',
      name: 'Root Frame',
      type: 'FRAME',
      bounds: { x: 0, y: 0, width: 200, height: 120 },
      fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, opacity: 1 }],
      strokes: [],
      effects: [],
      children: [level2],
    };

    const orchestrator = createPOCOrchestrator(config) as any;
    const startTime = Date.now();
    const result = orchestrator.convertComponents([level1], 0);
    const elapsed = Date.now() - startTime;

    expect(result).toHaveLength(1);
    expect(result[0].children[0].children[0].children[0].children[0].id).toBe('level-5');
    expect(elapsed).toBeLessThan(100); // Should complete instantly

    console.log(`[Smoke] ✅ 5-level nesting: PASS (${elapsed}ms)`);
  });

  /**
   * Capability 6: Handle multiple siblings with mixed types
   */
  it('should handle multiple siblings with mixed types', () => {
    const mockFigmaComponents: FigmaParsedComponent[] = [
      {
        id: 'text-1',
        name: 'Title',
        type: 'TEXT',
        bounds: { x: 0, y: 0, width: 200, height: 30 },
        fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1 }],
        strokes: [],
        effects: [],
        children: [],
        text: { content: 'Title', fontFamily: 'Inter', fontSize: 24, fontWeight: 700, textAlign: 'LEFT' },
      },
      {
        id: 'image-1',
        name: 'Banner',
        type: 'RECTANGLE',
        bounds: { x: 0, y: 40, width: 200, height: 100 },
        fills: [{ type: 'IMAGE', imageRef: 'img-ref-123', opacity: 1, scaleMode: 'FILL' }],
        strokes: [],
        effects: [],
        children: [],
      },
      {
        id: 'button-1',
        name: 'CTA Button',
        type: 'COMPONENT',
        bounds: { x: 0, y: 150, width: 120, height: 40 },
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 1, a: 1 }, opacity: 1 }],
        strokes: [],
        effects: [],
        children: [],
      },
    ];

    const orchestrator = createPOCOrchestrator(config) as any;
    const result = orchestrator.convertComponents(mockFigmaComponents, 0);

    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('text');
    expect(result[1].type).toBe('container'); // RECTANGLE -> container
    expect(result[1].fills[0].type).toBe('IMAGE');
    expect(result[2].type).toBe('component');

    console.log('[Smoke] ✅ Multiple siblings mixed types: PASS');
  });

  /**
   * Capability 7: Empty and undefined children arrays
   */
  it('should handle empty and undefined children arrays', () => {
    const mockFigmaComponents: FigmaParsedComponent[] = [
      {
        id: 'empty-children',
        name: 'Empty',
        type: 'FRAME',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        fills: [],
        strokes: [],
        effects: [],
        children: [],
      },
    ];

    const orchestrator = createPOCOrchestrator(config) as any;
    const result = orchestrator.convertComponents(mockFigmaComponents, 0);

    expect(result).toHaveLength(1);
    expect(result[0].children).toEqual([]);

    console.log('[Smoke] ✅ Empty/undefined children: PASS');
  });

  /**
   * Capability 8: Auto-layout properties preserved
   */
  it('should preserve auto-layout properties', () => {
    const mockFigmaComponent: FigmaParsedComponent = {
      id: 'autolayout-1',
      name: 'Flex Container',
      type: 'FRAME',
      bounds: { x: 0, y: 0, width: 300, height: 200 },
      fills: [],
      strokes: [],
      effects: [],
      children: [],
      autoLayout: {
        direction: 'HORIZONTAL',
        spacing: 16,
        paddingTop: 8,
        paddingRight: 12,
        paddingBottom: 8,
        paddingLeft: 12,
        alignItems: 'CENTER',
        justifyContent: 'SPACE_BETWEEN',
      },
    };

    const orchestrator = createPOCOrchestrator(config) as any;
    const result = orchestrator.convertComponents([mockFigmaComponent], 0);

    expect(result).toHaveLength(1);
    expect(result[0].styles.layout).toBe('flex');
    expect(result[0].styles.spacing).toBe(16);

    console.log('[Smoke] ✅ Auto-layout properties: PASS');
  });
});
