/**
 * React Generator Tests
 * Epic 11: External Integrations - Phase 3
 */

import { ReactGenerator, generateReactComponents, GeneratedComponent } from '../react-generator';
import { FigmaParser } from '../../integrations/figma/figma-parser';
import { ParsedDesign, ParsedComponent } from '../../integrations/figma/parsed-types';
import * as fs from 'fs';
import * as path from 'path';

describe('ReactGenerator', () => {
  let generator: ReactGenerator;

  beforeEach(() => {
    generator = new ReactGenerator();
  });

  describe('generateComponent', () => {
    it('generates a basic component', () => {
      const parsed: ParsedComponent = {
        id: '1:1',
        name: 'Test Frame',
        type: 'FRAME',
        bounds: { x: 0, y: 0, width: 400, height: 300 },
        fills: [],
        strokes: [],
        effects: [],
        children: [],
      };

      const result = generator.generateComponent(parsed);

      expect(result.name).toBe('TestFrame');
      expect(result.fileName).toBe('TestFrame.tsx');
      expect(result.code).toContain("import React from 'react'");
      expect(result.code).toContain('export interface TestFrameProps');
      expect(result.code).toContain('export const TestFrame');
      expect(result.code).toContain('export default TestFrame');
    });

    it('generates Tailwind classes for fills', () => {
      const parsed: ParsedComponent = {
        id: '1:1',
        name: 'White Box',
        type: 'FRAME',
        bounds: { x: 0, y: 0, width: 200, height: 200 },
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1 }],
        strokes: [],
        effects: [],
        children: [],
      };

      const result = generator.generateComponent(parsed);

      expect(result.code).toContain('bg-white');
    });

    it('generates Tailwind classes for auto-layout', () => {
      const parsed: ParsedComponent = {
        id: '1:1',
        name: 'Flex Container',
        type: 'FRAME',
        bounds: { x: 0, y: 0, width: 400, height: 300 },
        fills: [],
        strokes: [],
        effects: [],
        autoLayout: {
          direction: 'VERTICAL',
          spacing: 16,
          paddingTop: 24,
          paddingRight: 24,
          paddingBottom: 24,
          paddingLeft: 24,
          alignItems: 'CENTER',
          justifyContent: 'MIN',
        },
        children: [],
      };

      const result = generator.generateComponent(parsed);

      expect(result.code).toContain('flex');
      expect(result.code).toContain('flex-col');
      expect(result.code).toContain('gap-4');
      expect(result.code).toContain('p-6');
      expect(result.code).toContain('items-center');
    });

    it('generates Tailwind classes for corner radius', () => {
      const parsed: ParsedComponent = {
        id: '1:1',
        name: 'Rounded Box',
        type: 'FRAME',
        bounds: { x: 0, y: 0, width: 200, height: 200 },
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: 8,
        children: [],
      };

      const result = generator.generateComponent(parsed);

      expect(result.code).toContain('rounded-lg');
    });

    it('generates Tailwind classes for shadows', () => {
      const parsed: ParsedComponent = {
        id: '1:1',
        name: 'Shadowed Box',
        type: 'FRAME',
        bounds: { x: 0, y: 0, width: 200, height: 200 },
        fills: [],
        strokes: [],
        effects: [
          {
            type: 'DROP_SHADOW',
            radius: 8,
            color: { r: 0, g: 0, b: 0, a: 0.25 },
            offset: { x: 0, y: 4 },
          },
        ],
        children: [],
      };

      const result = generator.generateComponent(parsed);

      expect(result.code).toContain('shadow-md');
    });

    it('generates text nodes with typography classes', () => {
      const parsed: ParsedComponent = {
        id: '1:1',
        name: 'Heading',
        type: 'TEXT',
        bounds: { x: 0, y: 0, width: 300, height: 40 },
        fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1 }],
        strokes: [],
        effects: [],
        text: {
          content: 'Hello World',
          fontFamily: 'Inter',
          fontSize: 24,
          fontWeight: 700,
          textAlign: 'CENTER',
        },
        children: [],
      };

      const result = generator.generateComponent(parsed);

      expect(result.code).toContain('Hello World');
      expect(result.code).toContain('text-2xl');
      expect(result.code).toContain('font-bold');
      expect(result.code).toContain('text-center');
      expect(result.code).toContain('text-black');
    });

    it('renders children recursively', () => {
      const parsed: ParsedComponent = {
        id: '1:1',
        name: 'Parent',
        type: 'FRAME',
        bounds: { x: 0, y: 0, width: 400, height: 300 },
        fills: [],
        strokes: [],
        effects: [],
        children: [
          {
            id: '1:2',
            name: 'Child 1',
            type: 'RECTANGLE',
            bounds: { x: 0, y: 0, width: 100, height: 50 },
            fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1 }],
            strokes: [],
            effects: [],
            children: [],
          },
          {
            id: '1:3',
            name: 'Child Text',
            type: 'TEXT',
            bounds: { x: 0, y: 0, width: 200, height: 30 },
            fills: [],
            strokes: [],
            effects: [],
            text: {
              content: 'Nested text',
              fontFamily: 'Inter',
              fontSize: 16,
              fontWeight: 400,
              textAlign: 'LEFT',
            },
            children: [],
          },
        ],
      };

      const result = generator.generateComponent(parsed);

      expect(result.code).toContain('bg-[#ff0000]');
      expect(result.code).toContain('Nested text');
    });
  });

  describe('generate', () => {
    it('generates multiple components from a design', () => {
      const design: ParsedDesign = {
        name: 'Test Design',
        lastModified: '2025-01-27T00:00:00Z',
        components: [
          {
            id: '1:1',
            name: 'Frame One',
            type: 'FRAME',
            bounds: { x: 0, y: 0, width: 400, height: 300 },
            fills: [],
            strokes: [],
            effects: [],
            children: [],
          },
          {
            id: '1:2',
            name: 'Frame Two',
            type: 'FRAME',
            bounds: { x: 500, y: 0, width: 400, height: 300 },
            fills: [],
            strokes: [],
            effects: [],
            children: [],
          },
        ],
        styles: {},
      };

      const results = generator.generate(design);

      expect(results.length).toBe(2);
      expect(results[0].name).toBe('FrameOne');
      expect(results[1].name).toBe('FrameTwo');
    });
  });

  describe('generateReactComponents factory', () => {
    it('provides convenience function', () => {
      const design: ParsedDesign = {
        name: 'Quick Test',
        lastModified: '',
        components: [
          {
            id: '1:1',
            name: 'Quick Frame',
            type: 'FRAME',
            bounds: { x: 0, y: 0, width: 200, height: 200 },
            fills: [],
            strokes: [],
            effects: [],
            children: [],
          },
        ],
        styles: {},
      };

      const results = generateReactComponents(design);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('QuickFrame');
    });
  });

  describe('options', () => {
    it('respects useTailwind: false option', () => {
      const gen = new ReactGenerator({ useTailwind: false });

      const parsed: ParsedComponent = {
        id: '1:1',
        name: 'Inline Style Box',
        type: 'FRAME',
        bounds: { x: 0, y: 0, width: 400, height: 300 },
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1 }],
        strokes: [],
        effects: [],
        children: [],
      };

      const result = gen.generateComponent(parsed);

      // Should have inline styles instead of Tailwind
      expect(result.code).toContain('"width": 400');
      expect(result.code).toContain('"height": 300');
      expect(result.code).not.toContain('bg-white');
    });

    it('respects memo: true option', () => {
      const gen = new ReactGenerator({ memo: true });

      const parsed: ParsedComponent = {
        id: '1:1',
        name: 'Memo Box',
        type: 'FRAME',
        bounds: { x: 0, y: 0, width: 200, height: 200 },
        fills: [],
        strokes: [],
        effects: [],
        children: [],
      };

      const result = gen.generateComponent(parsed);

      expect(result.code).toContain('React.memo(');
    });

    it('respects defaultExport: false option', () => {
      const gen = new ReactGenerator({ defaultExport: false });

      const parsed: ParsedComponent = {
        id: '1:1',
        name: 'Named Export',
        type: 'FRAME',
        bounds: { x: 0, y: 0, width: 200, height: 200 },
        fills: [],
        strokes: [],
        effects: [],
        children: [],
      };

      const result = gen.generateComponent(parsed);

      expect(result.code).not.toContain('export default');
    });
  });

  describe('name sanitization', () => {
    it('sanitizes names with special characters', () => {
      const parsed: ParsedComponent = {
        id: '1:1',
        name: 'Button - Primary (Large)',
        type: 'FRAME',
        bounds: { x: 0, y: 0, width: 200, height: 50 },
        fills: [],
        strokes: [],
        effects: [],
        children: [],
      };

      const result = generator.generateComponent(parsed);

      expect(result.name).toBe('ButtonPrimaryLarge');
      expect(result.fileName).toBe('ButtonPrimaryLarge.tsx');
    });

    it('handles numeric prefixes', () => {
      const parsed: ParsedComponent = {
        id: '1:1',
        name: '123 Test Frame',
        type: 'FRAME',
        bounds: { x: 0, y: 0, width: 200, height: 200 },
        fills: [],
        strokes: [],
        effects: [],
        children: [],
      };

      const result = generator.generateComponent(parsed);

      expect(result.name).toBe('123TestFrame');
    });
  });

  describe('with real Figma data', () => {
    let realDesign: ParsedDesign | null = null;

    beforeAll(() => {
      const dataPath = path.join(
        __dirname,
        '../../../../vertical-slice-output/figma-api-response.json'
      );
      if (fs.existsSync(dataPath)) {
        const figmaData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const parser = new FigmaParser();
        realDesign = parser.parse(figmaData);
      }
    });

    it('generates components from POC_Test_Design', () => {
      if (!realDesign) {
        console.log('Skipping real data test - figma-api-response.json not found');
        return;
      }

      const results = generator.generate(realDesign);

      expect(results.length).toBeGreaterThan(0);
      console.log(`Generated ${results.length} components from real data`);
    });

    it('generates valid JSX with Tailwind classes', () => {
      if (!realDesign) return;

      const results = generator.generate(realDesign);
      const firstComponent = results[0];

      // Should have import statement
      expect(firstComponent.code).toContain("import React from 'react'");

      // Should have props interface
      expect(firstComponent.code).toContain('Props');

      // Should export the component
      expect(firstComponent.code).toContain('export const');

      console.log('First component name:', firstComponent.name);
      console.log('Code snippet:', firstComponent.code.substring(0, 500));
    });

    it('extracts text content from real data', () => {
      if (!realDesign) return;

      const results = generator.generate(realDesign);
      const allCode = results.map((r) => r.code).join('\n');

      // Should contain some text from the design
      const hasText =
        allCode.includes('Welcome') ||
        allCode.includes('Login') ||
        allCode.includes('Button') ||
        allCode.includes('ArcFoundry');

      expect(hasText).toBe(true);
    });
  });
});
