/**
 * Unit Tests: ReactGenerator (Phase 2)
 *
 * Tests comprehensive React component generation including:
 * - Component structure (imports, interface, function)
 * - JSX generation (containers, text, images)
 * - Style generation (layout, colors, typography)
 * - Hierarchy preservation (recursive children)
 * - Edge cases and error handling
 */

import { ReactGenerator } from '@/lib/generation/generators';
import type { ParsedComponent } from '@/lib/poc/types';

describe('ReactGenerator', () => {
  let generator: ReactGenerator;

  beforeEach(() => {
    generator = new ReactGenerator();
  });

  describe('Basic Component Generation', () => {
    it('should generate component with imports', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const code = generator.generateComponent(component, 'Button');

      expect(code).toContain("import React from 'react'");
    });

    it('should generate props interface by default', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'label', type: 'string', required: true },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const code = generator.generateComponent(component, 'Button');

      expect(code).toContain('interface ButtonProps');
      expect(code).toContain('label: string');
    });

    it('should generate component function', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const code = generator.generateComponent(component, 'Button');

      expect(code).toContain('export function Button');
      expect(code).toContain('return (');
      expect(code).toContain('export default Button');
    });

    it('should include props parameter when component has props', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'label', type: 'string', required: true },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const code = generator.generateComponent(component, 'Button');

      expect(code).toContain('export function Button(props: ButtonProps)');
    });

    it('should include comment by default', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const code = generator.generateComponent(component, 'Button');

      expect(code).toContain('// Generated from Figma component: Button');
    });
  });

  describe('Generator Options', () => {
    it('should skip interface generation when generateInterfaces is false', () => {
      const generator = new ReactGenerator({ generateInterfaces: false });

      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'label', type: 'string', required: true },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const code = generator.generateComponent(component, 'Button');

      expect(code).not.toContain('interface ButtonProps');
    });

    it('should skip comments when includeComments is false', () => {
      const generator = new ReactGenerator({ includeComments: false });

      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const code = generator.generateComponent(component, 'Button');

      expect(code).not.toContain('// Generated from Figma component');
    });
  });

  describe('JSX Generation - Containers', () => {
    it('should generate div for container component', () => {
      const component: ParsedComponent = {
        id: 'container-1',
        name: 'Container',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 100 },
      };

      const code = generator.generateComponent(component, 'Container');

      expect(code).toContain('<div');
      expect(code).toContain('style={');
    });

    it('should generate self-closing div when no children', () => {
      const component: ParsedComponent = {
        id: 'container-1',
        name: 'Container',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 100 },
      };

      const code = generator.generateComponent(component, 'Container');

      expect(code).toContain('<div style={') && expect(code).toContain('} />');
    });

    it('should render children recursively', () => {
      const component: ParsedComponent = {
        id: 'parent-1',
        name: 'Parent',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 100 },
        children: [
          {
            id: 'child-1',
            name: 'Child',
            type: 'FRAME',
            props: [],
            styles: {},
            bounds: { x: 10, y: 10, width: 50, height: 50 },
          },
        ],
      };

      const code = generator.generateComponent(component, 'Parent');

      // Should have nested divs (parent and child)
      const divCount = (code.match(/<div/g) || []).length;
      expect(divCount).toBeGreaterThanOrEqual(2);
    });

    it('should skip string children (legacy format)', () => {
      const component: ParsedComponent = {
        id: 'parent-1',
        name: 'Parent',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 100 },
        children: ['child-id-string' as any],
      };

      const code = generator.generateComponent(component, 'Parent');

      expect(code).toBeTruthy();
    });
  });

  describe('JSX Generation - Text Elements', () => {
    it('should handle text components', () => {
      const component: ParsedComponent = {
        id: 'text-1',
        name: 'Text',
        type: 'text',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 20 },
        text: {
          content: 'Hello World',
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 400,
          textAlign: 'left',
        },
      };

      const code = generator.generateComponent(component, 'Text');

      // Should generate valid component
      expect(code).toBeTruthy();
      expect(code).toContain('export function Text');
    });
  });

  describe('JSX Generation - Images', () => {
    it('should handle image components', () => {
      const component: ParsedComponent = {
        id: 'img-1',
        name: 'Logo',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        fills: [{ type: 'IMAGE', imageRef: 'image-hash-123', opacity: 1 }],
      };

      const code = generator.generateComponent(component, 'Logo');

      // Should generate valid component
      expect(code).toBeTruthy();
      expect(code).toContain('export function Logo');
    });
  });

  describe('Style Generation - Layout', () => {
    it('should generate absolute position styles', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 100, y: 50, width: 200, height: 60 },
      };

      const code = generator.generateComponent(component, 'Box');

      expect(code).toContain("position: 'absolute'");
      expect(code).toContain('left: 100');
      expect(code).toContain('top: 50');
      expect(code).toContain('width: 200');
      expect(code).toContain('height: 60');
    });

    it('should detect flex layout', () => {
      const component: ParsedComponent = {
        id: 'flex-1',
        name: 'FlexContainer',
        type: 'FRAME',
        props: [],
        styles: {
          layoutMode: 'HORIZONTAL',
          itemSpacing: 16,
        },
        bounds: { x: 0, y: 0, width: 300, height: 100 },
        children: [
          {
            id: 'child-1',
            name: 'Child1',
            type: 'FRAME',
            props: [],
            styles: {},
            bounds: { x: 0, y: 0, width: 100, height: 100 },
          },
          {
            id: 'child-2',
            name: 'Child2',
            type: 'FRAME',
            props: [],
            styles: {},
            bounds: { x: 116, y: 0, width: 100, height: 100 },
          },
        ],
      };

      const code = generator.generateComponent(component, 'FlexContainer');

      expect(code).toContain("display: 'flex'");
      expect(code).toContain("flexDirection:");
    });
  });

  describe('Style Generation - Colors', () => {
    it('should generate background color', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 1, a: 1 }, opacity: 1 }],
      };

      const code = generator.generateComponent(component, 'Box');

      expect(code).toContain('backgroundColor:');
      expect(code).toContain('rgba(51, 102, 255, 1)');
    });

    it('should generate text color for text nodes', () => {
      const component: ParsedComponent = {
        id: 'text-1',
        name: 'Text',
        type: 'text',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 20 },
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 1, a: 1 }, opacity: 1 }],
        text: {
          content: 'Colored text',
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 400,
          textAlign: 'left',
        },
      };

      const code = generator.generateComponent(component, 'Text');

      expect(code).toContain('color:');
      expect(code).toContain('rgba(51, 102, 255, 1)');
    });
  });

  describe('Style Generation - Borders', () => {
    it('should handle components with strokes', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, weight: 2 }],
      };

      const code = generator.generateComponent(component, 'Box');

      // Should generate valid component
      expect(code).toBeTruthy();
      expect(code).toContain('export function Box');
    });
  });

  describe('Style Generation - Effects', () => {
    it('should handle components with effects', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        effects: [
          {
            type: 'DROP_SHADOW',
            color: { r: 0, g: 0, b: 0, a: 0.25 },
            offset: { x: 0, y: 4 },
            radius: 8,
          },
        ],
      };

      const code = generator.generateComponent(component, 'Box');

      // Should generate valid component
      expect(code).toBeTruthy();
      expect(code).toContain('export function Box');
    });
  });

  describe('Style Generation - Typography', () => {
    it('should handle text with typography', () => {
      const component: ParsedComponent = {
        id: 'text-1',
        name: 'Text',
        type: 'text',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 20 },
        text: {
          content: 'Bold text',
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 700,
          textAlign: 'center',
        },
      };

      const code = generator.generateComponent(component, 'Text');

      // Should generate valid component
      expect(code).toBeTruthy();
      expect(code).toContain('export function Text');
    });
  });

  describe('Edge Cases', () => {
    it('should handle component with no props (no props parameter)', () => {
      const component: ParsedComponent = {
        id: 'simple-1',
        name: 'Simple',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const code = generator.generateComponent(component, 'Simple');

      expect(code).toBeTruthy();
      expect(code).toContain('export function Simple(');
    });

    it('should handle component with no bounds', () => {
      const component: ParsedComponent = {
        id: 'nobounds-1',
        name: 'NoBounds',
        type: 'FRAME',
        props: [],
        styles: {},
      };

      const code = generator.generateComponent(component, 'NoBounds');

      expect(code).toBeTruthy();
      expect(code).not.toContain('position:');
    });

    it('should handle empty component name', () => {
      const component: ParsedComponent = {
        id: 'unnamed-1',
        name: '',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const code = generator.generateComponent(component, 'Component');

      expect(code).toBeTruthy();
      expect(code).toContain('export function Component');
    });

    it('should handle component with no styles', () => {
      const component: ParsedComponent = {
        id: 'nostyles-1',
        name: 'NoStyles',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const code = generator.generateComponent(component, 'NoStyles');

      expect(code).toBeTruthy();
      expect(code).toContain('<div');
    });

    it('should handle deeply nested children', () => {
      const component: ParsedComponent = {
        id: 'deep-1',
        name: 'Deep',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 200 },
        children: [
          {
            id: 'level1',
            name: 'Level1',
            type: 'FRAME',
            props: [],
            styles: {},
            bounds: { x: 10, y: 10, width: 180, height: 180 },
            children: [
              {
                id: 'level2',
                name: 'Level2',
                type: 'FRAME',
                props: [],
                styles: {},
                bounds: { x: 20, y: 20, width: 160, height: 160 },
              },
            ],
          },
        ],
      };

      const code = generator.generateComponent(component, 'Deep');

      expect(code).toBeTruthy();
      // Should have 3 nested divs
      const divCount = (code.match(/<div/g) || []).length;
      expect(divCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Style Serialization', () => {
    it('should serialize empty styles as empty object', () => {
      const component: ParsedComponent = {
        id: 'empty-1',
        name: 'Empty',
        type: 'FRAME',
        props: [],
        styles: {},
      };

      const code = generator.generateComponent(component, 'Empty');

      expect(code).toContain('style={{}}');
    });

    it('should serialize numeric values correctly', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 50 },
      };

      const code = generator.generateComponent(component, 'Box');

      expect(code).toContain('width: 100');
      expect(code).toContain('height: 50');
    });

    it('should serialize string values with quotes', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1 }],
      };

      const code = generator.generateComponent(component, 'Box');

      expect(code).toContain("backgroundColor: 'rgba");
    });
  });
});
