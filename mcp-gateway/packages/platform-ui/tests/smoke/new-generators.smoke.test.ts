/**
 * Smoke Test: New Generators (Phases 0-6)
 * Validates all 7 phases of unified generation architecture
 *
 * Tests:
 * - Phase 1: Extractors work correctly
 * - Phase 2: ReactGenerator produces valid React code
 * - Phase 3: TestGenerator produces valid test code
 * - Phase 4: StorybookGenerator produces valid story code
 * - Phase 5: HTMLGenerator produces valid HTML
 * - Phase 6: RenderEngine orchestrates all generators
 */

import {
  StyleExtractor,
  ImageResolver,
  LayoutCalculator,
  TextExtractor,
  PropsExtractor,
  createExtractors,
} from '@/lib/generation/extractors';
import {
  ReactGenerator,
  TestGenerator,
  StorybookGenerator,
  HTMLGenerator,
} from '@/lib/generation/generators';
import { RenderEngine } from '@/lib/generation/render-engine';
import type { ParsedComponent } from '@/lib/poc/types';

// Mock Figma component for testing
// Real Figma structure: Button is a FRAME container with TEXT child
const mockButton: ParsedComponent = {
  id: 'button-123',
  name: 'Primary Button',
  type: 'FRAME',  // Real Figma type
  props: [
    { name: 'label', type: 'string', required: true, defaultValue: '"Click Me"' },
    { name: 'onClick', type: 'function', required: false },
  ],
  styles: {},
  bounds: { x: 100, y: 50, width: 200, height: 60 },
  fills: [
    {
      type: 'SOLID',
      color: { r: 0.2, g: 0.4, b: 1.0, a: 1.0 },
      opacity: 1,
    },
  ],
  strokes: [
    {
      type: 'SOLID',
      color: { r: 0.0, g: 0.0, b: 0.0, a: 0.1 },
      weight: 2,
    },
  ],
  children: [
    {
      id: 'button-text-456',
      name: 'Button Label',
      type: 'text',  // TEXT child
      bounds: { x: 100, y: 50, width: 200, height: 60 },
      text: {
        content: 'Click Me',
        fontFamily: 'Inter',
        fontSize: 16,
        fontWeight: 500,
        textAlign: 'center',
      },
      fills: [
        {
          type: 'SOLID',
          color: { r: 0.2, g: 0.4, b: 1.0, a: 1.0 },
          opacity: 1,
        },
      ],
      styles: {},
    },
  ],
};

describe('Smoke: Phase 1 - Extractors', () => {
  it('should create all extractors via factory', () => {
    const extractors = createExtractors();

    expect(extractors.styleExtractor).toBeInstanceOf(StyleExtractor);
    expect(extractors.imageResolver).toBeInstanceOf(ImageResolver);
    expect(extractors.layoutCalculator).toBeInstanceOf(LayoutCalculator);
    expect(extractors.textExtractor).toBeInstanceOf(TextExtractor);
    expect(extractors.propsExtractor).toBeInstanceOf(PropsExtractor);

    console.log('[Smoke] ✅ Phase 1: All extractors created');
  });

  it('should extract fill color', () => {
    const extractor = new StyleExtractor();
    const color = extractor.extractFillColor(mockButton);

    expect(color).toBe('rgba(51, 102, 255, 1)');
    console.log('[Smoke] ✅ StyleExtractor.extractFillColor:', color);
  });

  it('should extract text color', () => {
    const extractor = new StyleExtractor();
    const color = extractor.extractTextColor(mockButton);

    expect(color).toBe('rgba(51, 102, 255, 1)');
    console.log('[Smoke] ✅ StyleExtractor.extractTextColor:', color);
  });

  it('should extract stroke styles', () => {
    const extractor = new StyleExtractor();
    const strokes = extractor.extractStrokeStyles(mockButton);

    expect(strokes).toHaveLength(1);
    expect(strokes[0]).toContain('border:');
    console.log('[Smoke] ✅ StyleExtractor.extractStrokeStyles:', strokes[0]);
  });

  it('should identify text nodes', () => {
    const extractor = new TextExtractor();

    // FRAME container is not a text node
    const isButtonText = extractor.isTextNode(mockButton);
    expect(isButtonText).toBe(false);

    // TEXT child is a text node
    const textChild = mockButton.children?.[0];
    if (textChild) {
      const isTextChildText = extractor.isTextNode(textChild);
      expect(isTextChildText).toBe(true);
    }

    console.log('[Smoke] ✅ TextExtractor.isTextNode: FRAME=false, TEXT=true');
  });

  it('should extract text content', () => {
    const extractor = new TextExtractor();

    // Extract from TEXT child, not FRAME
    const textChild = mockButton.children?.[0];
    const text = textChild ? extractor.extractText(textChild) : null;

    expect(text).toBe('Click Me');
    console.log('[Smoke] ✅ TextExtractor.extractText:', text);
  });

  it('should calculate position', () => {
    const calculator = new LayoutCalculator();
    const position = calculator.calculatePosition(mockButton);

    expect(position).toEqual({ x: 100, y: 50, width: 200, height: 60 });
    console.log('[Smoke] ✅ LayoutCalculator.calculatePosition:', position);
  });

  it('should extract props', () => {
    const extractor = new PropsExtractor();
    const props = extractor.extractProps(mockButton);

    expect(props.length).toBeGreaterThan(0);
    expect(props.some(p => p.name === 'label')).toBe(true);
    expect(props.some(p => p.name === 'onClick')).toBe(true);
    console.log('[Smoke] ✅ PropsExtractor.extractProps:', props.length, 'props');
  });
});

describe('Smoke: Phase 2 - ReactGenerator', () => {
  it('should generate React component', () => {
    const generator = new ReactGenerator();
    const code = generator.generateComponent(mockButton, 'PrimaryButton');

    // Verify structure
    expect(code).toContain('import React from');
    expect(code).toContain('export function PrimaryButton');
    expect(code).toContain('interface PrimaryButtonProps');
    expect(code).toContain('export default PrimaryButton');

    // Verify design data used
    expect(code).toContain('left: 100'); // Bounds
    expect(code).toContain('rgba(51, 102, 255, 1)'); // Color

    console.log('[Smoke] ✅ Phase 2: ReactGenerator produced', code.length, 'chars');
  });

  it('should generate valid TypeScript', () => {
    const generator = new ReactGenerator();
    const code = generator.generateComponent(mockButton, 'PrimaryButton');

    // Check TypeScript syntax
    expect(code).toContain('interface');
    expect(code).toContain(': string');
    expect(code).toContain('() => void');

    console.log('[Smoke] ✅ ReactGenerator produces valid TypeScript');
  });
});

describe('Smoke: Phase 3 - TestGenerator', () => {
  it('should generate test file', () => {
    const generator = new TestGenerator();
    const code = generator.generateTest(mockButton, 'PrimaryButton');

    // Verify structure
    expect(code).toContain('import { render, screen }');
    expect(code).toContain("describe('PrimaryButton'");
    expect(code).toContain("it('renders without crashing'");

    console.log('[Smoke] ✅ Phase 3: TestGenerator produced', code.length, 'chars');
  });

  it('should generate visual assertion', () => {
    const generator = new TestGenerator();
    const code = generator.generateTest(mockButton, 'PrimaryButton');

    // Verify design-aware test
    expect(code).toContain('backgroundColor');
    expect(code).toContain('rgba(51, 102, 255, 1)');

    console.log('[Smoke] ✅ TestGenerator includes visual assertions');
  });

  it('should generate interaction test', () => {
    const generator = new TestGenerator();
    const code = generator.generateTest(mockButton, 'PrimaryButton');

    // Verify interaction test
    expect(code).toContain('userEvent');
    expect(code).toContain('jest.fn()');

    console.log('[Smoke] ✅ TestGenerator includes interaction tests');
  });
});

describe('Smoke: Phase 4 - StorybookGenerator', () => {
  it('should generate story file', () => {
    const generator = new StorybookGenerator();
    const code = generator.generateStory(mockButton, 'PrimaryButton');

    // Verify structure
    expect(code).toContain('import type { Meta, StoryObj }');
    expect(code).toContain('const meta: Meta<typeof PrimaryButton>');
    expect(code).toContain('export const Default: Story');

    console.log('[Smoke] ✅ Phase 4: StorybookGenerator produced', code.length, 'chars');
  });

  it('should generate argTypes', () => {
    const generator = new StorybookGenerator();
    const code = generator.generateStory(mockButton, 'PrimaryButton');

    // Verify controls
    expect(code).toContain('argTypes');
    expect(code).toContain('control:');

    console.log('[Smoke] ✅ StorybookGenerator includes argTypes');
  });

  it('should generate multiple variants', () => {
    const generator = new StorybookGenerator({ generateVariants: true });
    const code = generator.generateStory(mockButton, 'PrimaryButton');

    // Verify variants (generator creates: Default, WithProps, WithBackground)
    expect(code).toContain('export const Default');
    expect(code).toContain('export const WithProps');

    console.log('[Smoke] ✅ StorybookGenerator includes multiple variants');
  });
});

describe('Smoke: Phase 5 - HTMLGenerator', () => {
  it('should generate HTML', () => {
    const generator = new HTMLGenerator();
    const html = generator.renderComponentTree(mockButton);

    // Verify structure
    expect(html).toContain('<div');
    expect(html).toContain('class="figma-component"');
    expect(html).toContain('data-name="Primary Button"');

    console.log('[Smoke] ✅ Phase 5: HTMLGenerator produced', html.length, 'chars');
  });

  it('should include design styles', () => {
    const generator = new HTMLGenerator();
    const html = generator.renderComponentTree(mockButton);

    // Verify styles
    expect(html).toContain('width: 200px');
    expect(html).toContain('height: 60px');
    expect(html).toContain('rgba(51, 102, 255, 1)'); // Color from extractors

    console.log('[Smoke] ✅ HTMLGenerator includes design styles');
  });

  it('should render text content', () => {
    const generator = new HTMLGenerator();
    const html = generator.renderComponentTree(mockButton);

    // Verify text
    expect(html).toContain('Click Me');

    console.log('[Smoke] ✅ HTMLGenerator renders text content');
  });
});

describe('Smoke: Phase 6 - RenderEngine', () => {
  it('should orchestrate all generators', () => {
    const engine = new RenderEngine();

    expect(engine).toBeInstanceOf(RenderEngine);
    expect(engine.getExtractors()).toBeDefined();
    expect(engine.getGenerators()).toBeDefined();

    console.log('[Smoke] ✅ Phase 6: RenderEngine initialized');
  });

  it('should render single format', () => {
    const engine = new RenderEngine();
    const reactCode = engine.render(mockButton, 'PrimaryButton', 'react');

    expect(reactCode).toContain('export function PrimaryButton');
    console.log('[Smoke] ✅ RenderEngine.render() works');
  });

  it('should render all formats', () => {
    const engine = new RenderEngine();
    const allCode = engine.renderAll(mockButton, 'PrimaryButton');

    expect(allCode.componentName).toBe('PrimaryButton');
    expect(allCode.react).toContain('export function PrimaryButton');
    expect(allCode.test).toContain("describe('PrimaryButton'");
    expect(allCode.storybook).toContain('export const Default');
    expect(allCode.html).toContain('class="figma-component"');

    console.log('[Smoke] ✅ RenderEngine.renderAll() works');
    console.log('  - React:', allCode.react ? allCode.react.length : 0, 'chars');
    console.log('  - Test:', allCode.test ? allCode.test.length : 0, 'chars');
    console.log('  - Storybook:', allCode.storybook ? allCode.storybook.length : 0, 'chars');
    console.log('  - HTML:', allCode.html ? allCode.html.length : 0, 'chars');
  });

  it('should batch process', () => {
    const engine = new RenderEngine();
    const batch = engine.renderBatch([
      { component: mockButton, componentName: 'PrimaryButton' },
      { component: { ...mockButton, name: 'Secondary Button' }, componentName: 'SecondaryButton' },
    ]);

    expect(batch).toHaveLength(2);
    expect(batch[0].componentName).toBe('PrimaryButton');
    expect(batch[1].componentName).toBe('SecondaryButton');

    console.log('[Smoke] ✅ RenderEngine.renderBatch() works');
    console.log('  - Processed', batch.length, 'components');
  });
});

describe('Smoke: E2E - All Phases Working Together', () => {
  it('should demonstrate complete workflow', () => {
    // Phase 1: Extractors extract design data
    const extractors = createExtractors();
    const fillColor = extractors.styleExtractor.extractFillColor(mockButton);

    // Extract text from TEXT child (real Figma structure)
    const textChild = mockButton.children?.[0];
    const text = textChild ? extractors.textExtractor.extractText(textChild) : null;

    const props = extractors.propsExtractor.extractProps(mockButton);

    expect(fillColor).toBeTruthy();
    expect(text).toBeTruthy();
    expect(props.length).toBeGreaterThan(0);

    // Phase 6: RenderEngine orchestrates all generators
    const engine = new RenderEngine();
    const result = engine.renderAll(mockButton, 'PrimaryButton');

    // Verify all formats generated
    expect(result.react).toBeTruthy();
    expect(result.test).toBeTruthy();
    expect(result.storybook).toBeTruthy();
    expect(result.html).toBeTruthy();

    // Verify design data propagated to all formats
    expect(result.react).toContain('rgba(51, 102, 255, 1)'); // Color from extractor
    expect(result.test).toContain('rgba(51, 102, 255, 1)'); // Color assertion
    expect(result.html).toContain('rgba(51, 102, 255, 1)'); // Color in HTML

    console.log('[Smoke] ✅ E2E: All phases working together');
    console.log('  - Extractors: ✅ Extracted design data');
    console.log('  - ReactGenerator: ✅ Generated component');
    console.log('  - TestGenerator: ✅ Generated tests');
    console.log('  - StorybookGenerator: ✅ Generated stories');
    console.log('  - HTMLGenerator: ✅ Generated HTML');
    console.log('  - RenderEngine: ✅ Orchestrated all');
  });
});
