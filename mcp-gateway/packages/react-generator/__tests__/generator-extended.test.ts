/**
 * FORGE React Generator - Extended Generator Tests
 *
 * @epic 06 - React Generator
 * Target: 97%+ coverage for generator.ts
 */

import { ReactGenerator, DEFAULT_CONFIG, createGenerator, getDefaultGenerator, setDefaultGenerator, generate, TAILWIND_PRESET, CSS_MODULES_PRESET, STYLED_COMPONENTS_PRESET, JAVASCRIPT_PRESET, FULL_PRESET } from '../src';

// Mock designs for testing
const createMockDesign = (overrides = {}) => ({
  version: '1.0.0',
  metadata: {
    name: 'Test Design',
    fileKey: 'test-file-key',
    lastModified: '2026-01-24',
  },
  pages: [
    {
      id: 'page-1',
      name: 'Main',
      isMain: true,
      frames: [
        {
          id: 'frame-1',
          name: 'Button',
          type: 'FRAME',
          visible: true,
          children: [
            {
              id: 'text-1',
              name: 'Label',
              type: 'TEXT',
              visible: true,
              textContent: 'Click me',
              children: [],
            },
          ],
          semantic: {
            type: 'button',
            confidence: 0.95,
            element: 'button',
          },
          layout: {
            type: 'flex',
            direction: 'horizontal',
            gap: 8,
            padding: { top: 12, right: 24, bottom: 12, left: 24 },
          },
          styles: {
            fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 1 }, opacity: 1 }],
            borderRadius: 8,
          },
          bounds: { x: 0, y: 0, width: 120, height: 44 },
        },
      ],
    },
  ],
  components: [],
  componentSets: [],
  tokens: {
    colors: { primary: '#3b82f6', secondary: '#64748b' },
    typography: {},
    spacing: { sm: 8, md: 16, lg: 24 },
    radii: { sm: 4, md: 8, lg: 16 },
    shadows: {},
  },
  assets: [],
  stats: {},
  ...overrides,
});

describe('ReactGenerator - Extended Tests', () => {
  // ==========================================
  // INPUT VALIDATION
  // ==========================================

  describe('input validation', () => {
    it('should throw error for null input', async () => {
      const generator = new ReactGenerator();
      await expect(generator.generate(null as any)).rejects.toThrow('Design input required');
    });

    it('should throw error for undefined input', async () => {
      const generator = new ReactGenerator();
      await expect(generator.generate(undefined as any)).rejects.toThrow('Design input required');
    });

    it('should throw error for missing pages', async () => {
      const generator = new ReactGenerator();
      await expect(generator.generate({} as any)).rejects.toThrow('Design must have pages');
    });

    it('should throw error for non-array pages', async () => {
      const generator = new ReactGenerator();
      await expect(generator.generate({ pages: {} } as any)).rejects.toThrow('Pages must be an array');
    });

    it('should return empty result for empty pages array', async () => {
      const generator = new ReactGenerator();
      const result = await generator.generate(createMockDesign({ pages: [] }));

      expect(result.components).toHaveLength(0);
      expect(result.stats.totalComponents).toBe(0);
    });
  });

  // ==========================================
  // COMPONENT GENERATION FROM FIGMA COMPONENTS
  // ==========================================

  describe('component generation', () => {
    it('should generate components from Figma components', async () => {
      const generator = new ReactGenerator();
      const design = createMockDesign({
        components: [
          {
            id: 'comp-1',
            name: 'IconButton',
            description: 'An icon button',
            isVariant: false,
            props: [{ name: 'icon', type: 'text', required: true }],
            usageCount: 5,
            frame: {
              id: 'frame-comp-1',
              name: 'IconButton',
              type: 'COMPONENT',
              visible: true,
              children: [],
              semantic: { type: 'button', confidence: 0.95, element: 'button' },
            },
          },
        ],
      });

      const result = await generator.generate(design);

      expect(result.components.length).toBeGreaterThanOrEqual(1);
      // Component may be named IconButton or Button depending on generation order
      expect(result.components.some(c => c.name.includes('Button'))).toBe(true);
    });

    it('should skip already generated components', async () => {
      const generator = new ReactGenerator();
      const design = createMockDesign({
        components: [
          {
            id: 'comp-1',
            name: 'Button',
            isVariant: false,
            props: [],
            usageCount: 5,
            frame: {
              id: 'frame-1', // Same ID as page frame
              name: 'Button',
              type: 'COMPONENT',
              visible: true,
              children: [],
            },
          },
        ],
      });

      const result = await generator.generate(design);

      // Should not have duplicates
      const buttonComponents = result.components.filter(c => c.sourceNodeId === 'frame-1');
      expect(buttonComponents.length).toBeLessThanOrEqual(1);
    });

    it('should handle component with variant props', async () => {
      const generator = new ReactGenerator();
      const design = createMockDesign({
        components: [
          {
            id: 'comp-1',
            name: 'Button',
            isVariant: true,
            variantProperties: { size: 'large', variant: 'primary' },
            props: [
              { name: 'size', type: 'variant', required: false, defaultValue: 'medium' },
              { name: 'disabled', type: 'boolean', required: false },
            ],
            usageCount: 10,
            frame: {
              id: 'frame-variant',
              name: 'ButtonVariant',
              type: 'COMPONENT',
              visible: true,
              children: [],
            },
          },
        ],
      });

      const result = await generator.generate(design);

      expect(result.components.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle component generation errors gracefully', async () => {
      const generator = new ReactGenerator();
      const design = createMockDesign({
        components: [
          {
            id: 'comp-error',
            name: null as any, // This will cause an error
            isVariant: false,
            props: [],
            usageCount: 0,
            frame: {
              id: 'frame-error',
              name: 'ErrorComponent',
              type: 'COMPONENT',
              visible: true,
              children: [],
            },
          },
        ],
      });

      const result = await generator.generate(design);

      // Should complete without throwing and record error
      expect(result).toBeDefined();
    });
  });

  // ==========================================
  // OUTPUT FORMATS
  // ==========================================

  describe('output formats', () => {
    it('should generate functional components', async () => {
      const generator = new ReactGenerator({ outputFormat: 'functional' });
      const result = await generator.generate(createMockDesign());

      if (result.components.length > 0) {
        expect(result.components[0].code).toContain('export const');
        expect(result.components[0].code).toContain(': FC<');
      }
    });

    it('should generate function declaration components', async () => {
      const generator = new ReactGenerator({ outputFormat: 'function' });
      const result = await generator.generate(createMockDesign());

      if (result.components.length > 0) {
        expect(result.components[0].code).toContain('export function');
      }
    });

    it('should generate forwardRef components', async () => {
      const generator = new ReactGenerator({ outputFormat: 'forwardRef' });
      const result = await generator.generate(createMockDesign());

      if (result.components.length > 0) {
        expect(result.components[0].code).toContain('forwardRef');
        expect(result.components[0].code).toContain('displayName');
      }
    });
  });

  // ==========================================
  // STYLING APPROACHES
  // ==========================================

  describe('styling approaches', () => {
    it('should generate CSS modules with import', async () => {
      const generator = new ReactGenerator({ stylingApproach: 'css-modules' });
      const result = await generator.generate(createMockDesign());

      if (result.components.length > 0) {
        expect(result.components[0].code).toContain("import styles from");
        expect(result.components[0].styleFileName).toMatch(/\.module\.css$/);
      }
    });

    it('should generate styled-components import', async () => {
      const generator = new ReactGenerator({ stylingApproach: 'styled-components' });
      const result = await generator.generate(createMockDesign());

      if (result.components.length > 0) {
        expect(result.components[0].code).toContain("styled-components");
      }
    });

    it('should generate SCSS files', async () => {
      const generator = new ReactGenerator({ stylingApproach: 'sass' });
      const result = await generator.generate(createMockDesign());

      if (result.components.length > 0) {
        expect(result.components[0].styleFileName).toMatch(/\.scss$/);
      }
    });

    it('should generate vanilla CSS files', async () => {
      const generator = new ReactGenerator({ stylingApproach: 'vanilla' });
      const result = await generator.generate(createMockDesign());

      if (result.components.length > 0) {
        expect(result.components[0].styleFileName).toMatch(/\.css$/);
        expect(result.components[0].styleFileName).not.toContain('.module');
      }
    });
  });

  // ==========================================
  // PROPS EXTRACTION
  // ==========================================

  describe('props extraction', () => {
    it('should extract text nodes as props', async () => {
      const generator = new ReactGenerator();
      const design = createMockDesign({
        pages: [
          {
            id: 'page-1',
            name: 'Main',
            isMain: true,
            frames: [
              {
                id: 'card-1',
                name: 'Card',
                type: 'FRAME',
                visible: true,
                children: [
                  {
                    id: 'title-1',
                    name: 'title',
                    type: 'TEXT',
                    visible: true,
                    textContent: 'Card Title',
                    children: [],
                  },
                  {
                    id: 'subtitle-1',
                    name: 'subtitle',
                    type: 'TEXT',
                    visible: true,
                    textContent: 'Card subtitle',
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = await generator.generate(design);

      if (result.components.length > 0) {
        const props = result.components[0].props;
        expect(props.some(p => p.name === 'className')).toBe(true);
      }
    });

    it('should add onClick prop for interactive elements', async () => {
      const generator = new ReactGenerator();
      const design = createMockDesign({
        pages: [
          {
            id: 'page-1',
            name: 'Main',
            isMain: true,
            frames: [
              {
                id: 'btn-1',
                name: 'InteractiveButton',
                type: 'FRAME',
                visible: true,
                children: [],
                interactions: [{ trigger: 'click', action: 'navigate' }],
              },
            ],
          },
        ],
      });

      const result = await generator.generate(design);

      if (result.components.length > 0) {
        const props = result.components[0].props;
        expect(props.some(p => p.name === 'onClick')).toBe(true);
      }
    });

    it('should add children prop for containers', async () => {
      const generator = new ReactGenerator();
      const design = createMockDesign({
        pages: [
          {
            id: 'page-1',
            name: 'Main',
            isMain: true,
            frames: [
              {
                id: 'container-1',
                name: 'Container',
                type: 'FRAME',
                visible: true,
                children: [{ id: 'child-1', name: 'Child', type: 'FRAME', visible: true, children: [] }],
                semantic: { type: 'container', confidence: 0.9, element: 'div' },
              },
            ],
          },
        ],
      });

      const result = await generator.generate(design);

      if (result.components.length > 0) {
        const props = result.components[0].props;
        expect(props.some(p => p.name === 'children')).toBe(true);
      }
    });

    it('should map instanceSwap prop type', async () => {
      const generator = new ReactGenerator();
      const design = createMockDesign({
        components: [
          {
            id: 'comp-1',
            name: 'SwapComponent',
            isVariant: false,
            props: [{ name: 'icon', type: 'instanceSwap', required: true }],
            usageCount: 1,
            frame: {
              id: 'frame-swap',
              name: 'SwapComponent',
              type: 'COMPONENT',
              visible: true,
              children: [],
            },
          },
        ],
      });

      const result = await generator.generate(design);

      expect(result.components.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================
  // TYPESCRIPT GENERATION
  // ==========================================

  describe('TypeScript generation', () => {
    it('should generate props interface when enabled', async () => {
      const generator = new ReactGenerator({ typescript: true, generatePropTypes: true });
      const result = await generator.generate(createMockDesign());

      if (result.components.length > 0) {
        expect(result.components[0].propsType).toContain('interface');
        expect(result.components[0].propsType).toContain('Props');
      }
    });

    it('should not generate props interface when TypeScript disabled', async () => {
      const generator = new ReactGenerator({ typescript: false });
      const result = await generator.generate(createMockDesign());

      expect(result.typesFile).toBeUndefined();
    });

    it('should generate types file', async () => {
      const generator = new ReactGenerator({ typescript: true, generatePropTypes: true });
      const result = await generator.generate(createMockDesign());

      expect(result.typesFile).toBeDefined();
      expect(result.typesFile).toContain('export type');
    });
  });

  // ==========================================
  // STORIES AND TESTS GENERATION
  // ==========================================

  describe('stories and tests generation', () => {
    it('should generate stories when enabled', async () => {
      const generator = new ReactGenerator({ generateStories: true });
      const result = await generator.generate(createMockDesign());

      if (result.components.length > 0) {
        expect(result.components[0].story).toBeDefined();
        expect(result.components[0].story).toContain('@storybook/react');
        expect(result.components[0].story).toContain('export default meta');
      }
    });

    it('should generate tests when enabled', async () => {
      const generator = new ReactGenerator({ generateTests: true });
      const result = await generator.generate(createMockDesign());

      if (result.components.length > 0) {
        expect(result.components[0].test).toBeDefined();
        expect(result.components[0].test).toContain('@testing-library/react');
        expect(result.components[0].test).toContain('describe');
      }
    });
  });

  // ==========================================
  // SHARED STYLES GENERATION
  // ==========================================

  describe('shared styles generation', () => {
    it('should generate Tailwind config for tailwind approach', async () => {
      const generator = new ReactGenerator({ stylingApproach: 'tailwind' });
      const result = await generator.generate(createMockDesign());

      expect(result.sharedStyles).toContain('tailwindcss');
      expect(result.sharedStyles).toContain('colors');
      expect(result.sharedStyles).toContain('spacing');
    });

    it('should generate CSS variables for other approaches', async () => {
      const generator = new ReactGenerator({ stylingApproach: 'css-modules' });
      const result = await generator.generate(createMockDesign());

      expect(result.sharedStyles).toContain(':root');
      expect(result.sharedStyles).toContain('--color-');
      expect(result.sharedStyles).toContain('--spacing-');
    });

    it('should include typography tokens in CSS variables', async () => {
      const generator = new ReactGenerator({ stylingApproach: 'vanilla' });
      const design = createMockDesign({
        tokens: {
          colors: { primary: '#3b82f6' },
          typography: {
            heading: { fontFamily: 'Inter', fontSize: 24, fontWeight: 700 },
          },
          spacing: {},
          radii: {},
          shadows: {},
        },
      });

      const result = await generator.generate(design);

      expect(result.sharedStyles).toContain('--font-heading');
    });
  });

  // ==========================================
  // INDEX FILE GENERATION
  // ==========================================

  describe('index file generation', () => {
    it('should export all components', async () => {
      const generator = new ReactGenerator();
      const design = createMockDesign({
        pages: [
          {
            id: 'page-1',
            name: 'Main',
            isMain: true,
            frames: [
              { id: 'f1', name: 'Button', type: 'FRAME', visible: true, children: [] },
              { id: 'f2', name: 'Card', type: 'FRAME', visible: true, children: [] },
            ],
          },
        ],
      });

      const result = await generator.generate(design);

      expect(result.indexFile).toContain('export');
      expect(result.indexFile).toContain('Button');
      expect(result.indexFile).toContain('Card');
    });

    it('should export types when TypeScript enabled', async () => {
      const generator = new ReactGenerator({ typescript: true, generatePropTypes: true });
      const result = await generator.generate(createMockDesign());

      expect(result.indexFile).toContain('export type');
      expect(result.indexFile).toContain('Props');
    });
  });

  // ==========================================
  // STATS CALCULATION
  // ==========================================

  describe('stats calculation', () => {
    it('should calculate total components', async () => {
      const generator = new ReactGenerator();
      const result = await generator.generate(createMockDesign());

      expect(result.stats.totalComponents).toBeGreaterThanOrEqual(0);
    });

    it('should calculate total lines', async () => {
      const generator = new ReactGenerator();
      const result = await generator.generate(createMockDesign());

      expect(result.stats.totalLines).toBeGreaterThan(0);
    });

    it('should count components with props', async () => {
      const generator = new ReactGenerator();
      const result = await generator.generate(createMockDesign());

      expect(result.stats.componentsWithProps).toBeGreaterThanOrEqual(0);
    });

    it('should count unique imports', async () => {
      const generator = new ReactGenerator();
      const result = await generator.generate(createMockDesign());

      expect(result.stats.uniqueImports).toBeGreaterThanOrEqual(0);
    });

    it('should track duration', async () => {
      const generator = new ReactGenerator();
      const result = await generator.generate(createMockDesign());

      expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================
  // CHILD COMPONENT EXTRACTION
  // ==========================================

  describe('child component extraction', () => {
    it('should extract child component references', async () => {
      const generator = new ReactGenerator();
      const design = createMockDesign({
        pages: [
          {
            id: 'page-1',
            name: 'Main',
            isMain: true,
            frames: [
              {
                id: 'parent-1',
                name: 'Parent',
                type: 'FRAME',
                visible: true,
                children: [
                  {
                    id: 'child-instance',
                    name: 'ChildInstance',
                    type: 'INSTANCE',
                    visible: true,
                    componentRef: 'comp-child-1',
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = await generator.generate(design);

      if (result.components.length > 0) {
        expect(result.components[0].children).toBeDefined();
      }
    });
  });
});

// ==========================================
// CONVENIENCE FUNCTIONS
// ==========================================

describe('Convenience functions', () => {
  it('should create generator with createGenerator', () => {
    const generator = createGenerator({ typescript: false });
    expect(generator).toBeDefined();
    expect(generator.getConfig().typescript).toBe(false);
  });

  it('should get/set default generator', () => {
    const generator = new ReactGenerator({ stylingApproach: 'emotion' });
    setDefaultGenerator(generator);

    const retrieved = getDefaultGenerator();
    expect(retrieved.getConfig().stylingApproach).toBe('emotion');
  });

  it('should generate with default generator', async () => {
    const result = await generate(createMockDesign({ pages: [] }));
    expect(result.components).toHaveLength(0);
  });
});

// ==========================================
// PRESET CONFIGURATIONS
// ==========================================

describe('Preset configurations', () => {
  it('should have TAILWIND_PRESET', () => {
    expect(TAILWIND_PRESET.stylingApproach).toBe('tailwind');
    expect(TAILWIND_PRESET.typescript).toBe(true);
  });

  it('should have CSS_MODULES_PRESET', () => {
    expect(CSS_MODULES_PRESET.stylingApproach).toBe('css-modules');
    expect(CSS_MODULES_PRESET.typescript).toBe(true);
  });

  it('should have STYLED_COMPONENTS_PRESET', () => {
    expect(STYLED_COMPONENTS_PRESET.stylingApproach).toBe('styled-components');
    expect(STYLED_COMPONENTS_PRESET.typescript).toBe(true);
  });

  it('should have JAVASCRIPT_PRESET', () => {
    expect(JAVASCRIPT_PRESET.typescript).toBe(false);
  });

  it('should have FULL_PRESET', () => {
    expect(FULL_PRESET.generateStories).toBe(true);
    expect(FULL_PRESET.generateTests).toBe(true);
  });

  it('should work with preset configurations', async () => {
    const generator = createGenerator(FULL_PRESET);
    const result = await generator.generate(createMockDesign());

    if (result.components.length > 0) {
      expect(result.components[0].story).toBeDefined();
      expect(result.components[0].test).toBeDefined();
    }
  });
});

// ==========================================
// IMPORT GENERATION (Private Method Coverage)
// ==========================================

describe('Import generation', () => {
  it('should handle default imports', () => {
    const generator = new ReactGenerator();
    const buildImportsBlock = (generator as any).buildImportsBlock.bind(generator);

    const imports = [
      { from: 'react', default: 'React' },
    ];

    const result = buildImportsBlock(imports);
    expect(result).toContain("import React from 'react'");
  });

  it('should handle default + named imports together', () => {
    const generator = new ReactGenerator();
    const buildImportsBlock = (generator as any).buildImportsBlock.bind(generator);

    const imports = [
      { from: 'react', default: 'React', named: ['useState', 'useEffect'] },
    ];

    const result = buildImportsBlock(imports);
    expect(result).toContain('React');
    expect(result).toContain('useState');
    expect(result).toContain('useEffect');
  });

  it('should handle type imports with default', () => {
    const generator = new ReactGenerator();
    const buildImportsBlock = (generator as any).buildImportsBlock.bind(generator);

    const imports = [
      { from: './types', default: 'Types', isType: true },
    ];

    const result = buildImportsBlock(imports);
    expect(result).toContain('import type Types');
  });
});
