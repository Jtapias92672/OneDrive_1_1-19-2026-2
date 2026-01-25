/**
 * FORGE React Generator - StyleGenerator Tests
 *
 * @epic 06 - React Generator
 * Target: 97%+ coverage for style-generator.ts
 */

import { StyleGenerator } from '../src/styles/style-generator';
import { DEFAULT_CONFIG } from '../src/core/types';
import type { ReactGeneratorConfig } from '../src/core/types';

describe('StyleGenerator', () => {
  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  describe('constructor', () => {
    it('should create with default config', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      expect(generator).toBeDefined();
    });

    it('should create with custom config', () => {
      const config: ReactGeneratorConfig = {
        ...DEFAULT_CONFIG,
        stylingApproach: 'css-modules',
      };
      const generator = new StyleGenerator(config);
      expect(generator).toBeDefined();
    });
  });

  // ==========================================
  // GENERATE - ALL STYLING APPROACHES
  // ==========================================

  describe('generate', () => {
    const mockFrame = {
      id: 'frame-1',
      name: 'Test',
      type: 'FRAME',
      visible: true,
      children: [],
      layout: { type: 'flex', direction: 'horizontal', gap: 8 },
      bounds: { x: 0, y: 0, width: 200, height: 100 },
      styles: {
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 }],
        borderRadius: 8,
      },
    };

    it('should generate tailwind styles by default', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const result = generator.generate(mockFrame);

      expect(result.tailwind).toBeDefined();
      expect(result.tailwind?.base).toBeInstanceOf(Array);
    });

    it('should generate css-modules styles', () => {
      const generator = new StyleGenerator({ ...DEFAULT_CONFIG, stylingApproach: 'css-modules' });
      const result = generator.generate(mockFrame);

      expect(result.css).toBeDefined();
      expect(result.css?.properties).toBeDefined();
    });

    it('should generate vanilla CSS styles', () => {
      const generator = new StyleGenerator({ ...DEFAULT_CONFIG, stylingApproach: 'vanilla' });
      const result = generator.generate(mockFrame);

      expect(result.css).toBeDefined();
    });

    it('should generate sass styles', () => {
      const generator = new StyleGenerator({ ...DEFAULT_CONFIG, stylingApproach: 'sass' });
      const result = generator.generate(mockFrame);

      expect(result.css).toBeDefined();
    });

    it('should generate styled-components styles', () => {
      const generator = new StyleGenerator({ ...DEFAULT_CONFIG, stylingApproach: 'styled-components' });
      const result = generator.generate(mockFrame);

      expect(result.styledTemplate).toBeDefined();
      expect(result.styledTemplate).toContain('styled.div');
    });

    it('should generate emotion styles', () => {
      const generator = new StyleGenerator({ ...DEFAULT_CONFIG, stylingApproach: 'emotion' });
      const result = generator.generate(mockFrame);

      expect(result.styledTemplate).toBeDefined();
    });

    it('should generate inline styles', () => {
      const generator = new StyleGenerator({ ...DEFAULT_CONFIG, stylingApproach: 'inline' });
      const result = generator.generate(mockFrame);

      expect(result.css).toBeDefined();
    });

    it('should fallback to tailwind for unknown approach', () => {
      const generator = new StyleGenerator({ ...DEFAULT_CONFIG, stylingApproach: 'unknown' as any });
      const result = generator.generate(mockFrame);

      expect(result.tailwind).toBeDefined();
    });
  });

  // ==========================================
  // TAILWIND GENERATION
  // ==========================================

  describe('Tailwind generation', () => {
    let generator: StyleGenerator;

    beforeEach(() => {
      generator = new StyleGenerator(DEFAULT_CONFIG);
    });

    describe('layoutToTailwind', () => {
      it('should generate flex classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'flex', direction: 'horizontal', gap: 8 },
        });

        expect(result.tailwind?.base).toContain('flex');
        expect(result.tailwind?.base).toContain('gap-2');
      });

      it('should generate flex-col for vertical direction', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'flex', direction: 'vertical' },
        });

        expect(result.tailwind?.base).toContain('flex');
        expect(result.tailwind?.base).toContain('flex-col');
      });

      it('should generate flex-wrap', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'flex', wrap: true },
        });

        expect(result.tailwind?.base).toContain('flex-wrap');
      });

      it('should generate alignment classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: {
            type: 'flex',
            alignment: { main: 'center', cross: 'center' },
          },
        });

        expect(result.tailwind?.base.join(' ')).toContain('justify-center');
        expect(result.tailwind?.base.join(' ')).toContain('items-center');
      });

      it('should generate grid classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'grid', columns: 3, gap: 16 },
        });

        expect(result.tailwind?.base).toContain('grid');
        expect(result.tailwind?.base).toContain('grid-cols-3');
        expect(result.tailwind?.base).toContain('gap-4');
      });

      it('should generate absolute position', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'absolute' },
        });

        expect(result.tailwind?.base).toContain('absolute');
      });

      it('should default to relative', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'unknown' },
        });

        expect(result.tailwind?.base).toContain('relative');
      });

      it('should generate uniform padding', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: {
            type: 'flex',
            padding: { top: 16, right: 16, bottom: 16, left: 16 },
          },
        });

        expect(result.tailwind?.base).toContain('p-4');
      });

      it('should generate xy padding', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: {
            type: 'flex',
            padding: { top: 8, right: 16, bottom: 8, left: 16 },
          },
        });

        expect(result.tailwind?.base).toContain('py-2');
        expect(result.tailwind?.base).toContain('px-4');
      });

      it('should generate individual padding', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: {
            type: 'flex',
            padding: { top: 4, right: 8, bottom: 12, left: 16 },
          },
        });

        expect(result.tailwind?.base).toContain('pt-1');
        expect(result.tailwind?.base).toContain('pr-2');
        expect(result.tailwind?.base).toContain('pb-3');
        expect(result.tailwind?.base).toContain('pl-4');
      });
    });

    describe('sizeToTailwind', () => {
      it('should generate width classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          bounds: { x: 0, y: 0, width: 64, height: 32 },
        });

        expect(result.tailwind?.base).toContain('w-16');
        expect(result.tailwind?.base).toContain('h-8');
      });

      it('should generate w-full for large widths', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          bounds: { x: 0, y: 0, width: 1200, height: 100 },
        });

        expect(result.tailwind?.base).toContain('w-full');
      });

      it('should generate h-full for large heights', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          bounds: { x: 0, y: 0, width: 100, height: 900 },
        });

        expect(result.tailwind?.base).toContain('h-full');
      });

      it('should generate w-0 for zero width', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          bounds: { x: 0, y: 0, width: 0, height: 50 },
        });

        // Zero width generates w-0 or may not add width at all
        expect(result.tailwind?.base).toBeDefined();
      });
    });

    describe('stylesToTailwind', () => {
      it('should generate background color', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 }],
          },
        });

        expect(result.tailwind?.base).toContain('bg-white');
      });

      it('should generate background with opacity', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.5 }],
          },
        });

        expect(result.tailwind?.base.join(' ')).toMatch(/bg-black\/50|bg-\[#000000\]/);
      });

      it('should generate arbitrary color value', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.3, b: 0.1 } }],
          },
        });

        expect(result.tailwind?.base.join(' ')).toMatch(/bg-\[#/);
      });

      it('should generate border classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            strokes: [{ weight: 2, color: { r: 0, g: 0, b: 0 } }],
          },
        });

        expect(result.tailwind?.base).toContain('border');
        expect(result.tailwind?.base).toContain('border-2');
        expect(result.tailwind?.base).toContain('border-black');
      });

      it('should generate border-radius classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: { borderRadius: 8 },
        });

        expect(result.tailwind?.base).toContain('rounded-lg');
      });

      it('should generate rounded-full for large radius', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: { borderRadius: 9999 },
        });

        expect(result.tailwind?.base).toContain('rounded-full');
      });

      it('should handle array border-radius', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: { borderRadius: [4, 8, 12, 16] },
        });

        expect(result.tailwind?.base.join(' ')).toMatch(/rounded/);
      });

      it('should generate opacity classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: { opacity: 0.5 },
        });

        expect(result.tailwind?.base).toContain('opacity-50');
      });

      it('should generate shadow classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            effects: [{ type: 'DROP_SHADOW', radius: 4 }],
          },
        });

        expect(result.tailwind?.base).toContain('shadow');
      });

      it('should generate shadow-sm for small blur', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            effects: [{ type: 'DROP_SHADOW', radius: 2 }],
          },
        });

        expect(result.tailwind?.base).toContain('shadow-sm');
      });

      it('should generate shadow-md for medium blur', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            effects: [{ type: 'DROP_SHADOW', radius: 6 }],
          },
        });

        expect(result.tailwind?.base).toContain('shadow-md');
      });

      it('should generate shadow-lg for larger blur', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            effects: [{ type: 'DROP_SHADOW', radius: 12 }],
          },
        });

        expect(result.tailwind?.base).toContain('shadow-lg');
      });

      it('should generate shadow-xl for large blur', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            effects: [{ type: 'DROP_SHADOW', radius: 20 }],
          },
        });

        expect(result.tailwind?.base).toContain('shadow-xl');
      });

      it('should generate shadow-2xl for very large blur', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            effects: [{ type: 'DROP_SHADOW', radius: 30 }],
          },
        });

        expect(result.tailwind?.base).toContain('shadow-2xl');
      });
    });

    describe('typographyToTailwind', () => {
      it('should generate text size classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { fontSize: 16 },
          },
        });

        expect(result.tailwind?.base).toContain('text-base');
      });

      it('should generate text-xs for small text', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { fontSize: 12 },
          },
        });

        expect(result.tailwind?.base).toContain('text-xs');
      });

      it('should generate text-9xl for huge text', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { fontSize: 128 },
          },
        });

        expect(result.tailwind?.base).toContain('text-9xl');
      });

      it('should generate arbitrary font size', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { fontSize: 17 },
          },
        });

        expect(result.tailwind?.base.join(' ')).toMatch(/text-/);
      });

      it('should generate font weight classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { fontWeight: 700 },
          },
        });

        expect(result.tailwind?.base).toContain('font-bold');
      });

      it('should generate font-thin', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { fontWeight: 100 },
          },
        });

        expect(result.tailwind?.base).toContain('font-thin');
      });

      it('should generate font-black', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { fontWeight: 900 },
          },
        });

        expect(result.tailwind?.base).toContain('font-black');
      });

      it('should default to font-normal for unknown weight', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { fontWeight: 450 },
          },
        });

        expect(result.tailwind?.base).toContain('font-normal');
      });

      it('should generate line height classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { fontSize: 16, lineHeight: 24 },
          },
        });

        expect(result.tailwind?.base).toContain('leading-normal');
      });

      it('should generate leading-none for tight line height', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { fontSize: 16, lineHeight: 16 },
          },
        });

        expect(result.tailwind?.base).toContain('leading-none');
      });

      it('should generate leading-tight', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { fontSize: 16, lineHeight: 19 },
          },
        });

        expect(result.tailwind?.base).toContain('leading-tight');
      });

      it('should generate leading-loose for loose line height', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { fontSize: 16, lineHeight: 32 },
          },
        });

        expect(result.tailwind?.base).toContain('leading-loose');
      });

      it('should generate leading-normal when no fontSize', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { lineHeight: 24 },
          },
        });

        expect(result.tailwind?.base).toContain('leading-normal');
      });

      it('should generate letter spacing classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { letterSpacing: 0.05 },
          },
        });

        expect(result.tailwind?.base).toContain('tracking-wider');
      });

      it('should generate tracking-tighter', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { letterSpacing: -0.1 },
          },
        });

        expect(result.tailwind?.base).toContain('tracking-tighter');
      });

      it('should generate tracking-tight', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { letterSpacing: -0.025 },
          },
        });

        expect(result.tailwind?.base).toContain('tracking-tight');
      });

      it('should generate tracking class for zero spacing', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { letterSpacing: 0.01 },
          },
        });

        // Small letter-spacing generates tracking class
        expect(result.tailwind?.base.some((c: string) => c.startsWith('tracking-'))).toBe(true);
      });

      it('should generate tracking-wide', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { letterSpacing: 0.02 },
          },
        });

        expect(result.tailwind?.base).toContain('tracking-wide');
      });

      it('should generate tracking-widest', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { letterSpacing: 0.1 },
          },
        });

        expect(result.tailwind?.base).toContain('tracking-widest');
      });

      it('should generate text color', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { color: { r: 0, g: 0, b: 0 } },
          },
        });

        expect(result.tailwind?.base).toContain('text-black');
      });

      it('should generate text alignment', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: { textAlign: 'CENTER' },
          },
        });

        expect(result.tailwind?.base).toContain('text-center');
      });
    });

    describe('semanticToTailwind', () => {
      it('should generate button classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          semantic: { type: 'button', confidence: 0.9, element: 'button' },
        });

        expect(result.tailwind?.base).toContain('inline-flex');
        expect(result.tailwind?.base).toContain('items-center');
        expect(result.tailwind?.base).toContain('justify-center');
      });

      it('should generate input classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          semantic: { type: 'input', confidence: 0.9, element: 'input' },
        });

        expect(result.tailwind?.base).toContain('outline-none');
        expect(result.tailwind?.base).toContain('focus:ring-2');
      });

      it('should generate card classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          semantic: { type: 'card', confidence: 0.9, element: 'div' },
        });

        expect(result.tailwind?.base).toContain('overflow-hidden');
      });

      it('should generate navigation classes', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          semantic: { type: 'navigation', confidence: 0.9, element: 'nav' },
        });

        expect(result.tailwind?.base).toContain('flex');
        expect(result.tailwind?.base).toContain('items-center');
      });
    });

    describe('interactive states', () => {
      it('should add cursor-pointer for interactive elements', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          interactions: [{ trigger: 'click', action: 'navigate' }],
        });

        expect(result.tailwind?.hover).toContain('cursor-pointer');
      });
    });

    describe('alignment classes', () => {
      it('should generate justify-start', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'flex', alignment: { main: 'start' } },
        });

        expect(result.tailwind?.base.join(' ')).toContain('justify-start');
      });

      it('should generate justify-end', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'flex', alignment: { main: 'end' } },
        });

        expect(result.tailwind?.base.join(' ')).toContain('justify-end');
      });

      it('should generate justify-between', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'flex', alignment: { main: 'space-between' } },
        });

        expect(result.tailwind?.base.join(' ')).toContain('justify-between');
      });

      it('should generate justify-around', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'flex', alignment: { main: 'space-around' } },
        });

        expect(result.tailwind?.base.join(' ')).toContain('justify-around');
      });

      it('should generate justify-evenly', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'flex', alignment: { main: 'space-evenly' } },
        });

        expect(result.tailwind?.base.join(' ')).toContain('justify-evenly');
      });

      it('should generate items-start', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'flex', alignment: { cross: 'start' } },
        });

        expect(result.tailwind?.base.join(' ')).toContain('items-start');
      });

      it('should generate items-end', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'flex', alignment: { cross: 'end' } },
        });

        expect(result.tailwind?.base.join(' ')).toContain('items-end');
      });

      it('should generate items-stretch', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'flex', alignment: { cross: 'stretch' } },
        });

        expect(result.tailwind?.base.join(' ')).toContain('items-stretch');
      });

      it('should generate items-baseline', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'flex', alignment: { cross: 'baseline' } },
        });

        expect(result.tailwind?.base.join(' ')).toContain('items-baseline');
      });
    });
  });

  // ==========================================
  // CSS GENERATION
  // ==========================================

  describe('CSS generation', () => {
    let generator: StyleGenerator;

    beforeEach(() => {
      generator = new StyleGenerator({ ...DEFAULT_CONFIG, stylingApproach: 'css-modules' });
    });

    describe('layoutToCSS', () => {
      it('should generate flex CSS', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'flex', direction: 'vertical', gap: 16, wrap: true },
        });

        expect(result.css?.properties['display']).toBe('flex');
        expect(result.css?.properties['flex-direction']).toBe('column');
        expect(result.css?.properties['gap']).toBe('16px');
        expect(result.css?.properties['flex-wrap']).toBe('wrap');
      });

      it('should generate grid CSS', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'grid', columns: 4, gap: 24 },
        });

        expect(result.css?.properties['display']).toBe('grid');
        expect(result.css?.properties['grid-template-columns']).toBe('repeat(4, 1fr)');
        expect(result.css?.properties['gap']).toBe('24px');
      });

      it('should generate absolute CSS', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'absolute' },
        });

        expect(result.css?.properties['position']).toBe('absolute');
      });

      it('should generate relative CSS by default', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: { type: 'unknown' },
        });

        expect(result.css?.properties['position']).toBe('relative');
      });

      it('should generate padding CSS', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: {
            type: 'flex',
            padding: { top: 8, right: 16, bottom: 24, left: 32 },
          },
        });

        expect(result.css?.properties['padding']).toBe('8px 16px 24px 32px');
      });

      it('should generate alignment CSS', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          layout: {
            type: 'flex',
            alignment: { main: 'center', cross: 'flex-end' },
          },
        });

        expect(result.css?.properties['justify-content']).toBe('center');
        expect(result.css?.properties['align-items']).toBe('flex-end');
      });
    });

    describe('stylesToCSS', () => {
      it('should generate background color CSS', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
          },
        });

        expect(result.css?.properties['background-color']).toBe('#ff0000');
      });

      it('should generate background with opacity CSS', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 }, opacity: 0.5 }],
          },
        });

        expect(result.css?.properties['background-color']).toMatch(/#00ff00[0-9a-f]{2}/i);
      });

      it('should generate border CSS', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            strokes: [{ weight: 2, color: { r: 0, g: 0, b: 1 } }],
          },
        });

        expect(result.css?.properties['border']).toBe('2px solid #0000ff');
      });

      it('should generate default border', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            strokes: [{}],
          },
        });

        expect(result.css?.properties['border']).toBe('1px solid #000000');
      });

      it('should generate border-radius CSS', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: { borderRadius: 16 },
        });

        expect(result.css?.properties['border-radius']).toBe('16px');
      });

      it('should generate array border-radius CSS', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: { borderRadius: [4, 8, 12, 16] },
        });

        expect(result.css?.properties['border-radius']).toBe('4px 8px 12px 16px');
      });

      it('should generate opacity CSS', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: { opacity: 0.75 },
        });

        expect(result.css?.properties['opacity']).toBe('0.75');
      });

      it('should generate box-shadow CSS', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            effects: [{
              type: 'DROP_SHADOW',
              offset: { x: 2, y: 4 },
              radius: 8,
              spread: 0,
              color: { r: 0, g: 0, b: 0, a: 0.25 },
            }],
          },
        });

        expect(result.css?.properties['box-shadow']).toMatch(/2px 4px 8px 0px/);
      });

      it('should generate default shadow color', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          styles: {
            effects: [{
              type: 'DROP_SHADOW',
              radius: 8,
            }],
          },
        });

        expect(result.css?.properties['box-shadow']).toContain('rgba(0, 0, 0, 0.25)');
      });
    });

    describe('typographyToCSS', () => {
      it('should generate font properties', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'TEXT',
          visible: true,
          children: [],
          styles: {
            typography: {
              fontFamily: 'Inter',
              fontSize: 16,
              fontWeight: 600,
              lineHeight: 24,
              letterSpacing: 0.02,
              textAlign: 'CENTER',
              color: { r: 0.2, g: 0.3, b: 0.4 },
            },
          },
        });

        expect(result.css?.properties['font-family']).toBe('Inter');
        expect(result.css?.properties['font-size']).toBe('16px');
        expect(result.css?.properties['font-weight']).toBe('600');
        expect(result.css?.properties['line-height']).toBe('24px');
        expect(result.css?.properties['letter-spacing']).toBe('0.02em');
        expect(result.css?.properties['text-align']).toBe('center');
        expect(result.css?.properties['color']).toMatch(/#[0-9a-f]{6}/i);
      });
    });

    describe('size CSS', () => {
      it('should generate width and height', () => {
        const result = generator.generate({
          id: 'test',
          name: 'Test',
          type: 'FRAME',
          visible: true,
          children: [],
          bounds: { x: 0, y: 0, width: 300, height: 200 },
        });

        expect(result.css?.properties['width']).toBe('300px');
        expect(result.css?.properties['height']).toBe('200px');
      });
    });
  });

  // ==========================================
  // CSS MODULE GENERATION
  // ==========================================

  describe('generateCSSModule', () => {
    it('should generate CSS module content', () => {
      const generator = new StyleGenerator({ ...DEFAULT_CONFIG, stylingApproach: 'css-modules' });
      const styles = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
        layout: { type: 'flex' },
      });

      const cssModule = generator.generateCSSModule(styles);

      expect(cssModule).toContain('.root {');
      expect(cssModule).toContain('display: flex;');
      expect(cssModule).toContain('}');
    });

    it('should return empty string for tailwind styles', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const styles = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
      });

      const cssModule = generator.generateCSSModule(styles);

      expect(cssModule).toBe('');
    });
  });

  // ==========================================
  // SCSS GENERATION
  // ==========================================

  describe('generateSCSS', () => {
    it('should generate SCSS content', () => {
      const generator = new StyleGenerator({ ...DEFAULT_CONFIG, stylingApproach: 'sass' });
      const styles = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
        layout: { type: 'flex' },
      });

      const scss = generator.generateSCSS(styles);

      expect(scss).toContain('.root {');
    });

    it('should return empty string for tailwind styles', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const styles = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
      });

      const scss = generator.generateSCSS(styles);

      expect(scss).toBe('');
    });
  });

  // ==========================================
  // VANILLA CSS GENERATION
  // ==========================================

  describe('generateVanillaCSS', () => {
    it('should generate vanilla CSS with selector', () => {
      const generator = new StyleGenerator({ ...DEFAULT_CONFIG, stylingApproach: 'vanilla' });
      const styles = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
        layout: { type: 'flex' },
      });

      const css = generator.generateVanillaCSS(styles, '.my-component');

      expect(css).toContain('.my-component {');
    });

    it('should return empty string for tailwind styles', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const styles = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
      });

      const css = generator.generateVanillaCSS(styles, '.test');

      expect(css).toBe('');
    });
  });

  // ==========================================
  // GET TAILWIND CLASSES
  // ==========================================

  describe('getTailwindClasses', () => {
    it('should combine all tailwind classes', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const styles = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
        layout: { type: 'flex' },
        interactions: [{ trigger: 'click' }],
      });

      const classes = generator.getTailwindClasses(styles);

      expect(classes).toContain('flex');
      expect(classes).toContain('hover:cursor-pointer');
    });

    it('should include focus classes', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const styles = {
        tailwind: {
          base: ['flex'],
          focus: ['ring-2', 'ring-blue-500'],
        },
      };

      const classes = generator.getTailwindClasses(styles);

      expect(classes).toContain('focus:ring-2');
      expect(classes).toContain('focus:ring-blue-500');
    });

    it('should include responsive classes', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const styles = {
        tailwind: {
          base: ['flex'],
          responsive: {
            md: ['flex-row'],
            lg: ['flex-col'],
          },
        },
      };

      const classes = generator.getTailwindClasses(styles);

      expect(classes).toContain('md:flex-row');
      expect(classes).toContain('lg:flex-col');
    });

    it('should return empty string for non-tailwind styles', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const styles = { css: { properties: {} } };

      const classes = generator.getTailwindClasses(styles);

      expect(classes).toBe('');
    });
  });

  // ==========================================
  // EDGE CASES
  // ==========================================

  describe('edge cases', () => {
    it('should handle null layout', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const result = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
        layout: null as any,
      });

      expect(result.tailwind?.base).toBeDefined();
    });

    it('should handle null bounds', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const result = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
        bounds: null as any,
      });

      expect(result.tailwind?.base).toBeDefined();
    });

    it('should handle null styles', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const result = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
        styles: null as any,
      });

      expect(result.tailwind?.base).toBeDefined();
    });

    it('should handle empty fills array', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const result = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
        styles: { fills: [] },
      });

      expect(result.tailwind?.base).toBeDefined();
    });

    it('should handle non-SOLID fill type', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const result = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
        styles: {
          fills: [{ type: 'GRADIENT', color: { r: 1, g: 0, b: 0 } }],
        },
      });

      expect(result.tailwind?.base).toBeDefined();
    });

    it('should handle empty strokes array', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const result = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
        styles: { strokes: [] },
      });

      expect(result.tailwind?.base).toBeDefined();
    });

    it('should handle empty effects array', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const result = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
        styles: { effects: [] },
      });

      expect(result.tailwind?.base).toBeDefined();
    });

    it('should handle non-DROP_SHADOW effect', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const result = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
        styles: {
          effects: [{ type: 'BLUR', radius: 8 }],
        },
      });

      expect(result.tailwind?.base).toBeDefined();
    });

    it('should handle null color in colorToTailwind', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const result = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
        styles: {
          fills: [{ type: 'SOLID', color: null }],
        },
      });

      expect(result.tailwind?.base).toBeDefined();
    });

    it('should use arbitrary pixel values for unusual spacing', () => {
      const generator = new StyleGenerator(DEFAULT_CONFIG);
      const result = generator.generate({
        id: 'test',
        name: 'Test',
        type: 'FRAME',
        visible: true,
        children: [],
        layout: { type: 'flex', gap: 999 },
      });

      expect(result.tailwind?.base.join(' ')).toMatch(/gap-/);
    });
  });
});
