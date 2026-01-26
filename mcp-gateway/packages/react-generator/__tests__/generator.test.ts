/**
 * FORGE React Generator - Tests
 *
 * @epic 06 - React Generator
 */

import { ReactGenerator, DEFAULT_CONFIG, createGenerator } from '../src';
import type { GenerationResult, ReactGeneratorConfig } from '../src';

// Mock ParsedDesign for testing
const mockDesign = {
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
};

describe('ReactGenerator', () => {
  describe('constructor', () => {
    it('should create generator with default config', () => {
      const generator = new ReactGenerator();
      const config = generator.getConfig();

      expect(config.outputFormat).toBe(DEFAULT_CONFIG.outputFormat);
      expect(config.stylingApproach).toBe(DEFAULT_CONFIG.stylingApproach);
      expect(config.typescript).toBe(DEFAULT_CONFIG.typescript);
    });

    it('should merge custom config with defaults', () => {
      const generator = new ReactGenerator({
        stylingApproach: 'css-modules',
        generateStories: true,
      });
      const config = generator.getConfig();

      expect(config.stylingApproach).toBe('css-modules');
      expect(config.generateStories).toBe(true);
      expect(config.outputFormat).toBe(DEFAULT_CONFIG.outputFormat);
    });
  });

  describe('generate', () => {
    it('should generate components from parsed design', async () => {
      const generator = new ReactGenerator();
      const result = await generator.generate(mockDesign);

      expect(result).toBeDefined();
      expect(result.components).toBeInstanceOf(Array);
      expect(result.stats).toBeDefined();
      expect(result.warnings).toBeInstanceOf(Array);
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should generate index file', async () => {
      const generator = new ReactGenerator();
      const result = await generator.generate(mockDesign);

      expect(result.indexFile).toBeDefined();
      expect(result.indexFile.length).toBeGreaterThan(0);
    });

    it('should generate shared styles', async () => {
      const generator = new ReactGenerator();
      const result = await generator.generate(mockDesign);

      expect(result.sharedStyles).toBeDefined();
    });

    it('should track generation stats', async () => {
      const generator = new ReactGenerator();
      const result = await generator.generate(mockDesign);

      expect(result.stats.totalComponents).toBeGreaterThanOrEqual(0);
      expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateComponent', () => {
    it('should generate a single component from frame', () => {
      const generator = new ReactGenerator();
      const frame = mockDesign.pages[0].frames[0];
      const component = generator.generateComponent(frame);

      expect(component).toBeDefined();
      expect(component?.name).toBe('Button');
      expect(component?.code).toContain('export');
      expect(component?.code).toContain('Button');
    });

    it('should skip invisible frames', () => {
      const generator = new ReactGenerator();
      const invisibleFrame = {
        ...mockDesign.pages[0].frames[0],
        visible: false,
      };
      const component = generator.generateComponent(invisibleFrame);

      expect(component).toBeNull();
    });

    it('should include className prop', () => {
      const generator = new ReactGenerator();
      const frame = mockDesign.pages[0].frames[0];
      const component = generator.generateComponent(frame);

      expect(component?.props.some(p => p.name === 'className')).toBe(true);
    });
  });

  describe('setConfig', () => {
    it('should update configuration', () => {
      const generator = new ReactGenerator();
      generator.setConfig({ stylingApproach: 'styled-components' });

      expect(generator.getConfig().stylingApproach).toBe('styled-components');
    });
  });
});

describe('createGenerator', () => {
  it('should create new generator instance', () => {
    const generator = createGenerator();
    expect(generator).toBeInstanceOf(ReactGenerator);
  });

  it('should accept custom config', () => {
    const generator = createGenerator({ typescript: false });
    expect(generator.getConfig().typescript).toBe(false);
  });
});

describe('TypeScript generation', () => {
  it('should generate TypeScript code when enabled', async () => {
    const generator = new ReactGenerator({ typescript: true });
    const result = await generator.generate(mockDesign);

    if (result.components.length > 0) {
      expect(result.components[0].code).toContain('FC<');
    }
    expect(result.typesFile).toBeDefined();
  });

  it('should not include types when TypeScript disabled', async () => {
    const generator = new ReactGenerator({ typescript: false });
    const result = await generator.generate(mockDesign);

    expect(result.typesFile).toBeUndefined();
  });
});

describe('Styling approaches', () => {
  it('should generate Tailwind classes', async () => {
    const generator = new ReactGenerator({ stylingApproach: 'tailwind' });
    const result = await generator.generate(mockDesign);

    if (result.components.length > 0) {
      expect(result.components[0].code).toContain('className');
    }
  });

  it('should generate CSS Module imports', async () => {
    const generator = new ReactGenerator({ stylingApproach: 'css-modules' });
    const frame = mockDesign.pages[0].frames[0];
    const component = generator.generateComponent(frame);

    if (component) {
      expect(component.styleFileName).toMatch(/\.module\.css$/);
    }
  });
});
