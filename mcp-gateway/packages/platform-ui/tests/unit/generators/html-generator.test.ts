/**
 * Unit Tests: HTMLGenerator (Phase 5)
 *
 * Tests comprehensive HTML generation including:
 * - Component tree rendering
 * - Text node rendering
 * - Image and icon rendering
 * - Vector container (logo) rendering
 * - Children hierarchy preservation
 * - Style generation
 * - Edge cases and error handling
 */

import { HTMLGenerator } from '@/lib/generation/generators';
import type { ParsedComponent } from '@/lib/poc/types';

describe('HTMLGenerator', () => {
  let generator: HTMLGenerator;

  beforeEach(() => {
    generator = new HTMLGenerator();
  });

  describe('Basic HTML Generation', () => {
    it('should generate HTML with figma-component class', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const html = generator.renderComponentTree(component);

      expect(html).toContain('class="figma-component"');
      expect(html).toContain('data-name="Box"');
      expect(html).toContain('data-type="FRAME"');
    });

    it('should generate dimensions from bounds', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 150 },
      };

      const html = generator.renderComponentTree(component);

      expect(html).toContain('width: 200px');
      expect(html).toContain('height: 150px');
    });

    it('should include position: relative and box-sizing', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const html = generator.renderComponentTree(component);

      expect(html).toContain('position: relative');
      expect(html).toContain('box-sizing: border-box');
    });
  });

  describe('Text Node Rendering', () => {
    it('should render text node with span', () => {
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

      const html = generator.renderComponentTree(component);

      expect(html).toContain('<span');
      expect(html).toContain('Hello World');
    });

    it('should apply text styles', () => {
      const component: ParsedComponent = {
        id: 'text-1',
        name: 'Text',
        type: 'text',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 20 },
        text: {
          content: 'Styled text',
          fontFamily: 'Inter',
          fontSize: 18,
          fontWeight: 700,
          textAlign: 'center',
        },
      };

      const html = generator.renderComponentTree(component);

      expect(html).toContain('font-size: 18px');
      expect(html).toContain("font-family: 'Inter'");
      expect(html).toContain('font-weight: 700');
      expect(html).toContain('text-align: center');
    });

    it('should prevent text wrapping', () => {
      const component: ParsedComponent = {
        id: 'text-1',
        name: 'Text',
        type: 'text',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 20 },
        text: {
          content: 'No wrap',
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 400,
          textAlign: 'left',
        },
      };

      const html = generator.renderComponentTree(component);

      expect(html).toContain('white-space: nowrap');
      expect(html).toContain('overflow: visible');
    });

    it('should handle text color', () => {
      const component: ParsedComponent = {
        id: 'text-1',
        name: 'Text',
        type: 'text',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 20 },
        fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1 }],
        text: {
          content: 'Red text',
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 400,
          textAlign: 'left',
        },
      };

      const html = generator.renderComponentTree(component);

      expect(html).toContain('color:');
    });
  });

  describe('Background Colors and Fills', () => {
    it('should apply background color', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 1, a: 1 }, opacity: 1 }],
      };

      const html = generator.renderComponentTree(component);

      expect(html).toContain('background-color:');
      expect(html).toContain('rgba(51, 102, 255, 1)');
    });

    it('should handle IMAGE fills', () => {
      const component: ParsedComponent = {
        id: 'img-1',
        name: 'Background',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 150 },
        fills: [{ type: 'IMAGE', imageRef: 'img-123', opacity: 1 }],
      };

      const html = generator.renderComponentTree(component);

      // Should generate valid HTML
      expect(html).toBeTruthy();
      expect(html).toContain('data-name="Background"');
    });
  });

  describe('Border/Stroke Rendering', () => {
    it('should apply border styles', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, weight: 2 }],
      };

      const html = generator.renderComponentTree(component);

      expect(html).toContain('border:');
    });
  });

  describe('Image Rendering', () => {
    it('should render image with img tag', () => {
      const component: ParsedComponent = {
        id: 'img-1',
        name: 'Photo',
        type: 'image',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 150 },
        imageUrl: 'https://example.com/photo.jpg',
      };

      const html = generator.renderComponentTree(component);

      expect(html).toContain('<img');
      expect(html).toContain('src="https://example.com/photo.jpg"');
      expect(html).toContain('alt="Photo"');
      expect(html).toContain('object-fit: cover');
    });

    it('should render placeholder for images without URL', () => {
      const component: ParsedComponent = {
        id: 'img-1',
        name: 'Missing Image',
        type: 'image',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 150 },
      };

      const html = generator.renderComponentTree(component);

      expect(html).toContain('[Image: Missing Image]');
      expect(html).toContain('background: #f0f0f0');
    });
  });

  describe('Icon Rendering', () => {
    it('should render icon with object-fit: contain', () => {
      const component: ParsedComponent = {
        id: 'icon-1',
        name: 'Icon',
        type: 'icon',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 24, height: 24 },
        imageUrl: 'https://example.com/icon.svg',
      };

      const html = generator.renderComponentTree(component);

      expect(html).toContain('<img');
      expect(html).toContain('src="https://example.com/icon.svg"');
      expect(html).toContain('object-fit: contain');
    });

    it('should hide empty icons (ghost image prevention)', () => {
      const component: ParsedComponent = {
        id: 'icon-1',
        name: 'Empty Icon',
        type: 'icon',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 24, height: 24 },
      };

      const html = generator.renderComponentTree(component);

      expect(html).toContain('opacity: 0');
    });
  });

  describe('Vector Container (Logo) Rendering', () => {
    it('should render vector container as single image', () => {
      const component: ParsedComponent = {
        id: 'logo-1',
        name: 'Logo',
        type: 'container',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 120, height: 40 },
        imageUrl: 'https://example.com/logo.svg',
      };

      const html = generator.renderComponentTree(component);

      expect(html).toContain('<img');
      expect(html).toContain('src="https://example.com/logo.svg"');
      expect(html).toContain('data-type="logo"');
      expect(html).toContain('object-fit: contain');
    });
  });

  describe('Children Hierarchy Preservation', () => {
    it('should render children recursively', () => {
      const component: ParsedComponent = {
        id: 'parent-1',
        name: 'Parent',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 200 },
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

      const html = generator.renderComponentTree(component);

      // Should contain nested divs
      const divCount = (html.match(/<div/g) || []).length;
      expect(divCount).toBeGreaterThanOrEqual(2);
    });

    it('should calculate relative positioning for children', () => {
      const component: ParsedComponent = {
        id: 'parent-1',
        name: 'Parent',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 100, y: 50, width: 200, height: 200 },
        children: [
          {
            id: 'child-1',
            name: 'Child',
            type: 'FRAME',
            props: [],
            styles: {},
            bounds: { x: 120, y: 70, width: 50, height: 50 },
          },
        ],
      };

      const html = generator.renderComponentTree(component);

      // Child should be positioned at (120-100, 70-50) = (20, 20) relative to parent
      expect(html).toContain('left: 20px');
      expect(html).toContain('top: 20px');
    });

    it('should skip string children (legacy format)', () => {
      const component: ParsedComponent = {
        id: 'parent-1',
        name: 'Parent',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 200 },
        children: ['child-id-string' as any],
      };

      const html = generator.renderComponentTree(component);

      expect(html).toBeTruthy();
    });

    it('should handle deeply nested children', () => {
      const component: ParsedComponent = {
        id: 'level0',
        name: 'Level0',
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

      const html = generator.renderComponentTree(component);

      // Should have 3 levels of divs
      const divCount = (html.match(/<div/g) || []).length;
      expect(divCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Max Depth Protection', () => {
    it('should prevent infinite recursion with max depth', () => {
      const generator = new HTMLGenerator({ maxDepth: 2 });

      // Create deeply nested structure
      const component: ParsedComponent = {
        id: 'level0',
        name: 'Level0',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        children: [
          {
            id: 'level1',
            name: 'Level1',
            type: 'FRAME',
            props: [],
            styles: {},
            bounds: { x: 0, y: 0, width: 100, height: 100 },
            children: [
              {
                id: 'level2',
                name: 'Level2',
                type: 'FRAME',
                props: [],
                styles: {},
                bounds: { x: 0, y: 0, width: 100, height: 100 },
                children: [
                  {
                    id: 'level3',
                    name: 'Level3',
                    type: 'FRAME',
                    props: [],
                    styles: {},
                    bounds: { x: 0, y: 0, width: 100, height: 100 },
                  },
                ],
              },
            ],
          },
        ],
      };

      const html = generator.renderComponentTree(component);

      expect(html).toContain('<!-- Max depth reached -->');
    });

    it('should use default maxDepth of 50', () => {
      const generator = new HTMLGenerator();

      // Should not hit max depth with reasonable nesting
      const component: ParsedComponent = {
        id: 'comp',
        name: 'Component',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const html = generator.renderComponentTree(component, 49);

      expect(html).not.toContain('<!-- Max depth reached -->');
    });
  });

  describe('Edge Cases', () => {
    it('should handle component with no bounds', () => {
      const component: ParsedComponent = {
        id: 'nobounds-1',
        name: 'NoBounds',
        type: 'FRAME',
        props: [],
        styles: {},
      };

      const html = generator.renderComponentTree(component);

      expect(html).toBeTruthy();
      expect(html).not.toContain('width:');
      expect(html).not.toContain('height:');
    });

    it('should handle component with no children', () => {
      const component: ParsedComponent = {
        id: 'empty-1',
        name: 'Empty',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const html = generator.renderComponentTree(component);

      expect(html).toBeTruthy();
    });

    it('should handle component with empty text', () => {
      const component: ParsedComponent = {
        id: 'text-1',
        name: 'Text',
        type: 'text',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 20 },
        text: {
          content: '',
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 400,
          textAlign: 'left',
        },
      };

      const html = generator.renderComponentTree(component);

      expect(html).toBeTruthy();
    });

    it('should handle component with no name', () => {
      const component: ParsedComponent = {
        id: 'unnamed-1',
        name: '',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const html = generator.renderComponentTree(component);

      expect(html).toBeTruthy();
      expect(html).toContain('data-name=""');
    });

    it('should handle children without bounds', () => {
      const component: ParsedComponent = {
        id: 'parent-1',
        name: 'Parent',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 200 },
        children: [
          {
            id: 'child-1',
            name: 'Child',
            type: 'FRAME',
            props: [],
            styles: {},
          },
        ],
      };

      const html = generator.renderComponentTree(component);

      expect(html).toBeTruthy();
    });
  });

  describe('Generator Options', () => {
    it('should accept maxDepth option', () => {
      const generator = new HTMLGenerator({ maxDepth: 10 });

      const component: ParsedComponent = {
        id: 'comp',
        name: 'Component',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const html = generator.renderComponentTree(component);

      expect(html).toBeTruthy();
    });
  });
});
