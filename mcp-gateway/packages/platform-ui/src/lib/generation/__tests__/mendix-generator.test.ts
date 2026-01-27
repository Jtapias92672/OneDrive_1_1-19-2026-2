/**
 * Mendix Generator Tests
 * Epic 11: External Integrations - Phase 4
 */

import { MendixGenerator, generateMendixOutput } from '../mendix-generator';
import { FigmaParser } from '../../integrations/figma/figma-parser';
import { ParsedDesign, ParsedComponent } from '../../integrations/figma/parsed-types';
import * as fs from 'fs';
import * as path from 'path';

describe('MendixGenerator', () => {
  let generator: MendixGenerator;

  beforeEach(() => {
    generator = new MendixGenerator();
  });

  describe('generate', () => {
    it('generates pages for each component', () => {
      const design: ParsedDesign = {
        name: 'Test Design',
        lastModified: '',
        components: [
          {
            id: '1:1',
            name: 'Login Page',
            type: 'FRAME',
            bounds: { x: 0, y: 0, width: 400, height: 600 },
            fills: [],
            strokes: [],
            effects: [],
            children: [],
          },
        ],
        styles: {},
      };

      const result = generator.generate(design);

      expect(result.pages.length).toBe(1);
      expect(result.pages[0].name).toBe('LoginPage');
      expect(result.pages[0].fileName).toBe('LoginPage.page.xml');
    });

    it('generates valid XML structure', () => {
      const design: ParsedDesign = {
        name: 'XML Test',
        lastModified: '',
        components: [
          {
            id: '1:1',
            name: 'Test Page',
            type: 'FRAME',
            bounds: { x: 0, y: 0, width: 800, height: 600 },
            fills: [],
            strokes: [],
            effects: [],
            children: [],
          },
        ],
        styles: {},
      };

      const result = generator.generate(design);
      const pageContent = result.pages[0].content;

      expect(pageContent).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(pageContent).toContain('<page xmlns="http://www.mendix.com/clientSystem/9.0"');
      expect(pageContent).toContain('</page>');
    });

    it('generates theme SCSS file', () => {
      const design: ParsedDesign = {
        name: 'Styled Design',
        lastModified: '',
        components: [
          {
            id: '1:1',
            name: 'Styled Frame',
            type: 'FRAME',
            bounds: { x: 0, y: 0, width: 400, height: 300 },
            fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1 }],
            strokes: [],
            effects: [],
            cornerRadius: 8,
            children: [],
          },
        ],
        styles: {},
      };

      const result = generator.generate(design);

      expect(result.styles.fileName).toBe('theme.scss');
      expect(result.styles.content).toContain('$primary-color');
      expect(result.styles.content).toContain('.gen-styledframe');
      expect(result.styles.content).toContain('background-color: #ff0000');
      expect(result.styles.content).toContain('border-radius: 8px');
    });
  });

  describe('widget type inference', () => {
    it('infers Text widget from TEXT type', () => {
      const design: ParsedDesign = {
        name: 'Text Test',
        lastModified: '',
        components: [
          {
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
                name: 'Heading',
                type: 'TEXT',
                bounds: { x: 0, y: 0, width: 200, height: 40 },
                fills: [],
                strokes: [],
                effects: [],
                text: {
                  content: 'Hello World',
                  fontFamily: 'Inter',
                  fontSize: 24,
                  fontWeight: 700,
                  textAlign: 'LEFT',
                },
                children: [],
              },
            ],
          },
        ],
        styles: {},
      };

      const result = generator.generate(design);
      const pageContent = result.pages[0].content;

      expect(pageContent).toContain('<text');
      expect(pageContent).toContain('Hello World');
    });

    it('infers Button widget from name pattern', () => {
      const design: ParsedDesign = {
        name: 'Button Test',
        lastModified: '',
        components: [
          {
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
                name: 'Submit Button',
                type: 'FRAME',
                bounds: { x: 0, y: 0, width: 120, height: 40 },
                fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, opacity: 1 }],
                strokes: [],
                effects: [],
                children: [],
              },
            ],
          },
        ],
        styles: {},
      };

      const result = generator.generate(design);
      const pageContent = result.pages[0].content;

      expect(pageContent).toContain('<actionButton');
    });
  });

  describe('options', () => {
    it('uses custom module name', () => {
      const gen = new MendixGenerator({ moduleName: 'MyModule' });

      const design: ParsedDesign = {
        name: 'Module Test',
        lastModified: '',
        components: [
          {
            id: '1:1',
            name: 'Test Page',
            type: 'FRAME',
            bounds: { x: 0, y: 0, width: 800, height: 600 },
            fills: [],
            strokes: [],
            effects: [],
            children: [],
          },
        ],
        styles: {},
      };

      const result = gen.generate(design);

      expect(result.pages[0].content).toContain('name="MyModule.TestPage"');
    });

    it('uses custom layout name', () => {
      const gen = new MendixGenerator({ layoutName: 'CustomLayout' });

      const design: ParsedDesign = {
        name: 'Layout Test',
        lastModified: '',
        components: [
          {
            id: '1:1',
            name: 'Test Page',
            type: 'FRAME',
            bounds: { x: 0, y: 0, width: 800, height: 600 },
            fills: [],
            strokes: [],
            effects: [],
            children: [],
          },
        ],
        styles: {},
      };

      const result = gen.generate(design);

      expect(result.pages[0].content).toContain('layoutName="CustomLayout"');
    });

    it('generates widget files when splitWidgets is true', () => {
      const gen = new MendixGenerator({ splitWidgets: true });

      const design: ParsedDesign = {
        name: 'Widget Split Test',
        lastModified: '',
        components: [
          {
            id: '1:1',
            name: 'Card Widget',
            type: 'FRAME',
            bounds: { x: 0, y: 0, width: 300, height: 200 },
            fills: [],
            strokes: [],
            effects: [],
            children: [],
          },
        ],
        styles: {},
      };

      const result = gen.generate(design);

      expect(result.widgets.length).toBe(1);
      expect(result.widgets[0].fileName).toBe('CardWidget.widget.xml');
      expect(result.widgets[0].content).toContain('<widget');
    });
  });

  describe('style extraction', () => {
    it('extracts padding from auto-layout', () => {
      const design: ParsedDesign = {
        name: 'Padding Test',
        lastModified: '',
        components: [
          {
            id: '1:1',
            name: 'Padded Box',
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
              alignItems: 'MIN',
              justifyContent: 'MIN',
            },
            children: [],
          },
        ],
        styles: {},
      };

      const result = generator.generate(design);

      expect(result.styles.content).toContain('padding: 24px');
    });

    it('extracts text styles', () => {
      const design: ParsedDesign = {
        name: 'Text Style Test',
        lastModified: '',
        components: [
          {
            id: '1:1',
            name: 'Bold Heading',
            type: 'TEXT',
            bounds: { x: 0, y: 0, width: 300, height: 40 },
            fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1 }],
            strokes: [],
            effects: [],
            text: {
              content: 'Bold Text',
              fontFamily: 'Inter',
              fontSize: 20,
              fontWeight: 700,
              textAlign: 'LEFT',
            },
            children: [],
          },
        ],
        styles: {},
      };

      const result = generator.generate(design);

      expect(result.styles.content).toContain('font-size: 20px');
      expect(result.styles.content).toContain('font-weight: bold');
      expect(result.styles.content).toContain('color: #000000');
    });
  });

  describe('generateMendixOutput factory', () => {
    it('provides convenience function', () => {
      const design: ParsedDesign = {
        name: 'Factory Test',
        lastModified: '',
        components: [
          {
            id: '1:1',
            name: 'Quick Page',
            type: 'FRAME',
            bounds: { x: 0, y: 0, width: 800, height: 600 },
            fills: [],
            strokes: [],
            effects: [],
            children: [],
          },
        ],
        styles: {},
      };

      const result = generateMendixOutput(design);

      expect(result.pages.length).toBe(1);
      expect(result.styles.content).toBeDefined();
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

    it('generates pages from POC_Test_Design', () => {
      if (!realDesign) {
        console.log('Skipping real data test - figma-api-response.json not found');
        return;
      }

      const result = generator.generate(realDesign);

      expect(result.pages.length).toBeGreaterThan(0);
      console.log(`Generated ${result.pages.length} Mendix pages from real data`);
    });

    it('generates valid XML for each page', () => {
      if (!realDesign) return;

      const result = generator.generate(realDesign);

      for (const page of result.pages) {
        expect(page.content).toContain('<?xml');
        expect(page.content).toContain('<page');
        expect(page.content).toContain('</page>');
      }
    });

    it('generates theme with extracted styles', () => {
      if (!realDesign) return;

      const result = generator.generate(realDesign);

      expect(result.styles.content).toContain('$primary-color');
      console.log('Generated theme with', result.styles.content.split('\n').length, 'lines');
    });
  });
});
