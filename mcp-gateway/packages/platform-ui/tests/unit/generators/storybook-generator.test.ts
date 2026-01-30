/**
 * Unit Tests: StorybookGenerator (Phase 4)
 *
 * Tests comprehensive Storybook story generation including:
 * - Component stories with props
 * - ArgTypes generation
 * - Multiple variants
 * - Interactive controls
 * - Edge cases and error handling
 */

import { StorybookGenerator } from '@/lib/generation/generators';
import type { ParsedComponent } from '@/lib/poc/types';

describe('StorybookGenerator', () => {
  let generator: StorybookGenerator;

  beforeEach(() => {
    generator = new StorybookGenerator();
  });

  describe('Basic Story Generation', () => {
    it('should generate story with meta export', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const story = generator.generateStory(component, 'Button');

      expect(story).toContain('const meta: Meta<typeof Button>');
      expect(story).toContain("title: 'Components/Button'");
      expect(story).toContain("component: Button");
      expect(story).toContain("tags: ['autodocs']");
      expect(story).toContain('export default meta');
    });

    it('should generate Default story', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const story = generator.generateStory(component, 'Button');

      expect(story).toContain('export const Default: Story');
      expect(story).toContain('args:');
    });

    it('should generate type alias', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const story = generator.generateStory(component, 'Button');

      expect(story).toContain('type Story = StoryObj<typeof Button>');
    });
  });

  describe('ArgTypes Generation', () => {
    it('should generate argTypes for string props', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'label', type: 'string', required: true, defaultValue: '"Click"' },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const story = generator.generateStory(component, 'Button');

      expect(story).toContain('argTypes: {');
      expect(story).toContain('label:');
      expect(story).toContain("control: 'text'");
    });

    it('should generate argTypes for boolean props', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'disabled', type: 'boolean', required: false, defaultValue: 'false' },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const story = generator.generateStory(component, 'Button');

      expect(story).toContain('disabled:');
      expect(story).toContain("control: 'boolean'");
    });

    it('should generate argTypes for function props', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'onClick', type: 'function', required: false },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const story = generator.generateStory(component, 'Button');

      expect(story).toContain('onClick:');
      expect(story).toContain("action: 'clicked'");
    });

    it('should generate argTypes for number props', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Counter',
        type: 'FRAME',
        props: [
          { name: 'count', type: 'number', required: false, defaultValue: '0' },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const story = generator.generateStory(component, 'Counter');

      expect(story).toContain('count:');
      expect(story).toContain("control: 'number'");
    });

    it('should handle multiple props', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'label', type: 'string', required: true },
          { name: 'disabled', type: 'boolean', required: false },
          { name: 'onClick', type: 'function', required: false },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const story = generator.generateStory(component, 'Button');

      expect(story).toContain('label:');
      expect(story).toContain('disabled:');
      expect(story).toContain('onClick:');
    });
  });

  describe('Multiple Variants', () => {
    it('should generate Default variant', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'label', type: 'string', required: true, defaultValue: '"Click"' },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const story = generator.generateStory(component, 'Button');

      expect(story).toContain('export const Default: Story');
      expect(story).toContain('label:');
    });

    it('should generate WithProps variant when component has props', () => {
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

      const story = generator.generateStory(component, 'Button');

      expect(story).toContain('export const WithProps: Story');
    });

    it('should generate Primary variant for buttons with variant prop', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'button',
        props: [
          { name: 'variant', type: 'string', required: false, defaultValue: '"primary"' },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const story = generator.generateStory(component, 'Button');

      expect(story).toContain('export const Primary: Story');
      expect(story).toContain("variant: 'primary'");
    });

    it('should generate Disabled variant for components with disabled prop', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'button',
        props: [
          { name: 'disabled', type: 'boolean', required: false, defaultValue: 'false' },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const story = generator.generateStory(component, 'Button');

      expect(story).toContain('export const Disabled: Story');
      expect(story).toContain('disabled: true');
    });
  });

  describe('Component Naming', () => {
    it('should handle PascalCase names', () => {
      const component: ParsedComponent = {
        id: 'card-1',
        name: 'UserCard',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 100 },
      };

      const story = generator.generateStory(component, 'UserCard');

      expect(story).toContain("title: 'Components/UserCard'");
      expect(story).toContain('component: UserCard');
    });

    it('should use provided component name', () => {
      const component: ParsedComponent = {
        id: 'card-1',
        name: 'user-card',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 100 },
      };

      const story = generator.generateStory(component, 'UserCard');

      expect(story).toContain('UserCard');
    });

    it('should handle component name parameter', () => {
      const component: ParsedComponent = {
        id: 'card-1',
        name: 'User Card',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 100 },
      };

      const story = generator.generateStory(component, 'UserCard');

      expect(story).toContain('UserCard');
    });
  });

  describe('Edge Cases', () => {
    it('should handle component with no props', () => {
      const component: ParsedComponent = {
        id: 'card-1',
        name: 'Card',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 100 },
      };

      const story = generator.generateStory(component, 'Card');

      expect(story).toContain('export default meta');
      expect(story).toContain('export const Default: Story');
      expect(story).toBeTruthy();
    });

    it('should handle empty component name parameter', () => {
      const component: ParsedComponent = {
        id: 'comp-1',
        name: '',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const story = generator.generateStory(component, 'Component');

      expect(story).toBeTruthy();
      expect(story).toContain('export default meta');
    });

    it('should handle props with undefined defaultValue', () => {
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

      const story = generator.generateStory(component, 'Button');

      expect(story).toBeTruthy();
      expect(story).toContain('label:');
    });
  });

  describe('Interactive Controls', () => {
    it('should add action handlers for function props', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'onClick', type: 'function', required: false },
          { name: 'onHover', type: 'function', required: false },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const story = generator.generateStory(component, 'Button');

      expect(story).toMatch(/onClick.*action:/);
      expect(story).toMatch(/onHover.*action:/);
    });

    it('should set default values for props', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'label', type: 'string', required: true, defaultValue: '"Submit"' },
          { name: 'size', type: 'string', required: false, defaultValue: '"medium"' },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const story = generator.generateStory(component, 'Button');

      expect(story).toContain('Submit');
      expect(story).toContain('medium');
    });
  });

  describe('Output Format', () => {
    it('should be valid TypeScript', () => {
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

      const story = generator.generateStory(component, 'Button');

      // Check for TypeScript syntax
      expect(story).toContain('import type');
      expect(story).toContain(': Meta<typeof');
      expect(story).toContain('type Story = StoryObj<typeof');
    });

    it('should include proper imports', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const story = generator.generateStory(component, 'Button');

      expect(story).toContain("import type { Meta, StoryObj } from '@storybook/react'");
      expect(story).toContain("import Button from './Button'");
    });
  });
});
