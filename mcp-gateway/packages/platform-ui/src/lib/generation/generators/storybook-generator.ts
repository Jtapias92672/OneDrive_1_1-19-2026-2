/**
 * StorybookGenerator - Generate Storybook stories for React components
 *
 * Uses unified extraction layer to generate stories that showcase:
 * - Design variants (default, hover, disabled states)
 * - Props variations (different prop combinations)
 * - Visual design (actual colors, layout from Figma)
 * - Interactive controls (Storybook controls for props)
 *
 * Guided by Skills:
 * - impeccable-style.md: Design tokens, consistent spacing, color scales
 * - react-best-practices.md: Type-safe story definitions
 * - forge-architectural-entropy.md: Uses shared extractors (no duplication)
 */

import type { ParsedComponent } from '../../poc/types';
import {
  StyleExtractor,
  TextExtractor,
  PropsExtractor,
  type InferredProp,
} from '../extractors';

export interface StorybookGeneratorOptions {
  /**
   * Generate multiple story variants (default, with props, states)
   * Default: true
   */
  generateVariants?: boolean;

  /**
   * Include Storybook controls for props
   * Default: true
   */
  includeControls?: boolean;

  /**
   * Generate autodocs
   * Default: true
   */
  includeAutodocs?: boolean;
}

export class StorybookGenerator {
  private styleExtractor: StyleExtractor;
  private textExtractor: TextExtractor;
  private propsExtractor: PropsExtractor;

  constructor(private options: StorybookGeneratorOptions = {}) {
    this.styleExtractor = new StyleExtractor();
    this.textExtractor = new TextExtractor();
    this.propsExtractor = new PropsExtractor();

    // Set defaults
    this.options.generateVariants = options.generateVariants !== false;
    this.options.includeControls = options.includeControls !== false;
    this.options.includeAutodocs = options.includeAutodocs !== false;
  }

  /**
   * Generate Storybook story code for React component
   *
   * @param component - Parsed Figma component
   * @param componentName - PascalCase component name
   * @returns Storybook story code string
   */
  generateStory(component: ParsedComponent, componentName: string): string {
    // Extract component data
    const props = this.propsExtractor.extractProps(component);
    const text = this.textExtractor.extractText(component);
    const fillColor = this.styleExtractor.extractFillColor(component);

    // Generate story sections
    const imports = this.generateImports(componentName);
    const meta = this.generateMeta(componentName, props);
    const stories = this.generateStories(component, componentName, props, text, fillColor);

    return `${imports}\n\n${meta}\n\n${stories}`;
  }

  /**
   * Generate import statements
   */
  private generateImports(componentName: string): string {
    return `import type { Meta, StoryObj } from '@storybook/react';
import ${componentName} from './${componentName}';`;
  }

  /**
   * Generate Meta object
   */
  private generateMeta(componentName: string, props: InferredProp[]): string {
    const autodocs = this.options.includeAutodocs ? "\n  tags: ['autodocs']," : '';

    // Generate argTypes for controls
    const argTypes = this.options.includeControls && props.length > 0
      ? this.generateArgTypes(props)
      : '';

    return `const meta: Meta<typeof ${componentName}> = {
  title: 'Components/${componentName}',
  component: ${componentName},${autodocs}${argTypes}
};

export default meta;
type Story = StoryObj<typeof ${componentName}>;`;
  }

  /**
   * Generate argTypes for Storybook controls
   *
   * SKILL: impeccable-style.md
   * Provides intuitive controls for design properties
   */
  private generateArgTypes(props: InferredProp[]): string {
    const argTypes: string[] = [];

    for (const prop of props) {
      const control = this.getControlType(prop);
      if (control) {
        argTypes.push(`    ${prop.name}: ${control}`);
      }
    }

    if (argTypes.length === 0) return '';

    return `\n  argTypes: {\n${argTypes.join(',\n')}\n  },`;
  }

  /**
   * Get Storybook control type for prop
   */
  private getControlType(prop: InferredProp): string | null {
    const type = prop.type.toLowerCase();

    if (type.includes('string')) {
      return "{ control: 'text' }";
    }

    if (type.includes('number')) {
      return "{ control: 'number' }";
    }

    if (type.includes('boolean')) {
      return "{ control: 'boolean' }";
    }

    if (type.includes('"') && type.includes('|')) {
      // Union type like "primary" | "secondary"
      const options = type.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, ''));
      if (options && options.length > 0) {
        return `{ control: 'select', options: [${options.map(o => `'${o}'`).join(', ')}] }`;
      }
    }

    if (type.includes('() => void') || type.includes('function')) {
      return "{ action: 'clicked' }";
    }

    // No control for complex types (React.ReactNode, arrays, objects)
    return null;
  }

  /**
   * Generate story variants
   *
   * SKILL: impeccable-style.md
   * Showcases design system variations and states
   */
  private generateStories(
    component: ParsedComponent,
    componentName: string,
    props: InferredProp[],
    text: string | null,
    fillColor: string | null
  ): string {
    const stories: string[] = [];

    // Default story (always included)
    stories.push(this.generateDefaultStory(props, text));

    if (this.options.generateVariants) {
      // With Props story (if component has props)
      if (props.length > 0) {
        stories.push(this.generateWithPropsStory(props, text));
      }

      // State variants based on component type
      if (component.type === 'button') {
        stories.push(this.generateButtonVariants(props, text));
      }

      // Color variant (if component has background color)
      if (fillColor) {
        stories.push(this.generateColorVariant(props, text, fillColor));
      }
    }

    return stories.join('\n\n');
  }

  /**
   * Generate Default story
   */
  private generateDefaultStory(props: InferredProp[], text: string | null): string {
    const args = this.generateDefaultArgs(props, text);

    return `export const Default: Story = {
  args: ${args},
};`;
  }

  /**
   * Generate default args object
   */
  private generateDefaultArgs(props: InferredProp[], text: string | null): string {
    if (props.length === 0) return '{}';

    const args: string[] = [];

    for (const prop of props) {
      // Skip function props (they're actions)
      if (prop.type.includes('() => void') || prop.type.includes('function')) {
        continue;
      }

      // Use default value if available
      if (prop.defaultValue) {
        // Remove quotes from defaultValue if it's already a string literal
        const value = prop.defaultValue.startsWith('"') && prop.defaultValue.endsWith('"')
          ? prop.defaultValue
          : prop.defaultValue;
        args.push(`${prop.name}: ${value}`);
        continue;
      }

      // Generate mock value based on type
      const mockValue = this.getMockValue(prop, text);
      if (mockValue) {
        args.push(`${prop.name}: ${mockValue}`);
      }
    }

    if (args.length === 0) return '{}';

    return `{\n    ${args.join(',\n    ')},\n  }`;
  }

  /**
   * Generate With Props story (shows all props filled)
   */
  private generateWithPropsStory(props: InferredProp[], text: string | null): string {
    const args: string[] = [];

    for (const prop of props) {
      // Skip function props (they're actions)
      if (prop.type.includes('() => void') || prop.type.includes('function')) {
        continue;
      }

      const mockValue = this.getMockValue(prop, text);
      if (mockValue) {
        args.push(`${prop.name}: ${mockValue}`);
      }
    }

    const argsString = args.length > 0
      ? `{\n    ${args.join(',\n    ')},\n  }`
      : '{}';

    return `export const WithProps: Story = {
  args: ${argsString},
};`;
  }

  /**
   * Generate button-specific variants (Primary, Disabled)
   */
  private generateButtonVariants(props: InferredProp[], text: string | null): string {
    const hasVariantProp = props.some(p => p.name === 'variant');
    const hasDisabledProp = props.some(p => p.name === 'disabled');

    const variants: string[] = [];

    // Primary variant
    if (hasVariantProp) {
      const args = this.generateDefaultArgs(props, text);
      const argsWithVariant = args.replace('}', "    variant: 'primary',\n  }");
      variants.push(`export const Primary: Story = {
  args: ${argsWithVariant},
};`);
    }

    // Disabled state
    if (hasDisabledProp) {
      const args = this.generateDefaultArgs(props, text);
      const argsWithDisabled = args.replace('}', '    disabled: true,\n  }');
      variants.push(`export const Disabled: Story = {
  args: ${argsWithDisabled},
};`);
    }

    return variants.join('\n\n');
  }

  /**
   * Generate color variant story
   *
   * SKILL: impeccable-style.md
   * Demonstrates color system from design tokens
   */
  private generateColorVariant(
    props: InferredProp[],
    text: string | null,
    fillColor: string
  ): string {
    const args = this.generateDefaultArgs(props, text);

    return `export const WithBackground: Story = {
  args: ${args},
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#333333' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
};`;
  }

  /**
   * Get mock value for prop based on type
   */
  private getMockValue(prop: InferredProp, text: string | null): string | null {
    // Use default value if available
    if (prop.defaultValue) {
      return prop.defaultValue;
    }

    const type = prop.type.toLowerCase();

    // Text/label props - use extracted text or prop name
    if (prop.name === 'text' || prop.name === 'label') {
      return text ? `"${text}"` : `"${prop.name} value"`;
    }

    if (type.includes('string')) {
      return `"${prop.name} value"`;
    }

    if (type.includes('number')) {
      return '24';
    }

    if (type.includes('boolean')) {
      return 'false';
    }

    if (type.includes('array')) {
      return '[]';
    }

    if (type.includes('react.reactnode')) {
      return '<div>Child content</div>';
    }

    // Skip function props (they're handled by actions)
    if (type.includes('() => void') || type.includes('function')) {
      return null;
    }

    return null;
  }
}
