/**
 * PropsExtractor - Infer React props from component structure
 *
 * Analyzes component type, children, text, and interactions to generate
 * appropriate React component props and TypeScript interfaces.
 *
 * Guided by Skills:
 * - react-best-practices.md: Type-safe props, proper naming conventions
 * - forge-architectural-entropy.md: Single implementation for all generators
 */

import type { ParsedComponent, ComponentProp } from '../../poc/types';

export interface InferredProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

export class PropsExtractor {
  /**
   * Extract props from component structure
   *
   * Analyzes component to infer appropriate React props:
   * - Text content → text/label/children props
   * - Buttons → onClick handler
   * - Inputs → value, onChange handlers
   * - Images → src, alt props
   * - Children → children prop
   *
   * @param component - ParsedComponent
   * @returns Array of inferred props
   */
  extractProps(component: ParsedComponent): InferredProp[] {
    // If component already has props defined (e.g., test scenarios), use those
    if (component.props && component.props.length > 0) {
      return component.props.map((p) => ({
        name: p.name,
        type: p.type,
        required: p.required,
        defaultValue: p.defaultValue,
        description: p.description,
      }));
    }

    const props: InferredProp[] = [];

    // Extract props based on component type
    switch (component.type) {
      case 'button':
        props.push(...this.extractButtonProps(component));
        break;

      case 'input':
        props.push(...this.extractInputProps(component));
        break;

      case 'text':
        props.push(...this.extractTextProps(component));
        break;

      case 'image':
      case 'icon':
        props.push(...this.extractImageProps(component));
        break;

      case 'form':
        props.push(...this.extractFormProps(component));
        break;

      case 'list':
        props.push(...this.extractListProps(component));
        break;

      case 'card':
        props.push(...this.extractCardProps(component));
        break;

      default:
        props.push(...this.extractContainerProps(component));
        break;
    }

    // Add children prop if component has children
    if (this.hasChildren(component)) {
      props.push({
        name: 'children',
        type: 'React.ReactNode',
        required: false,
        description: 'Child components',
      });
    }

    // Add className prop for styling (always optional)
    props.push({
      name: 'className',
      type: 'string',
      required: false,
      description: 'Additional CSS classes',
    });

    // Remove duplicates
    return this.deduplicateProps(props);
  }

  /**
   * Extract props for button components
   */
  private extractButtonProps(component: ParsedComponent): InferredProp[] {
    const props: InferredProp[] = [];

    // Button text
    if (component.text?.content) {
      props.push({
        name: 'label',
        type: 'string',
        required: true,
        defaultValue: `"${component.text.content}"`,
        description: 'Button label text',
      });
    }

    // onClick handler
    props.push({
      name: 'onClick',
      type: '() => void',
      required: false,
      description: 'Click event handler',
    });

    // Button variants (infer from name)
    if (this.isPrimaryButton(component)) {
      props.push({
        name: 'variant',
        type: '"primary" | "secondary" | "outline"',
        required: false,
        defaultValue: '"primary"',
        description: 'Button variant',
      });
    }

    // Disabled state
    props.push({
      name: 'disabled',
      type: 'boolean',
      required: false,
      defaultValue: 'false',
      description: 'Whether button is disabled',
    });

    return props;
  }

  /**
   * Extract props for input components
   */
  private extractInputProps(component: ParsedComponent): InferredProp[] {
    const props: InferredProp[] = [];

    // Input value
    props.push({
      name: 'value',
      type: 'string',
      required: false,
      description: 'Input value',
    });

    // onChange handler
    props.push({
      name: 'onChange',
      type: '(value: string) => void',
      required: false,
      description: 'Change event handler',
    });

    // Placeholder
    if (component.text?.content) {
      props.push({
        name: 'placeholder',
        type: 'string',
        required: false,
        defaultValue: `"${component.text.content}"`,
        description: 'Placeholder text',
      });
    }

    // Input type (infer from name)
    const inputType = this.inferInputType(component);
    if (inputType !== 'text') {
      props.push({
        name: 'type',
        type: `"${inputType}"`,
        required: false,
        defaultValue: `"${inputType}"`,
        description: 'Input type',
      });
    }

    // Disabled state
    props.push({
      name: 'disabled',
      type: 'boolean',
      required: false,
      defaultValue: 'false',
      description: 'Whether input is disabled',
    });

    return props;
  }

  /**
   * Extract props for text components
   */
  private extractTextProps(component: ParsedComponent): InferredProp[] {
    const props: InferredProp[] = [];

    // Text content
    if (component.text?.content) {
      props.push({
        name: 'text',
        type: 'string',
        required: true,
        defaultValue: `"${component.text.content}"`,
        description: 'Text content',
      });
    }

    // Text variant (heading, body, caption)
    const variant = this.inferTextVariant(component);
    if (variant !== 'body') {
      props.push({
        name: 'variant',
        type: '"heading" | "body" | "caption"',
        required: false,
        defaultValue: `"${variant}"`,
        description: 'Text variant',
      });
    }

    return props;
  }

  /**
   * Extract props for image/icon components
   */
  private extractImageProps(component: ParsedComponent): InferredProp[] {
    const props: InferredProp[] = [];

    // Image source
    props.push({
      name: 'src',
      type: 'string',
      required: true,
      defaultValue: component.imageUrl ? `"${component.imageUrl}"` : undefined,
      description: 'Image source URL',
    });

    // Alt text
    props.push({
      name: 'alt',
      type: 'string',
      required: true,
      defaultValue: `"${component.name}"`,
      description: 'Alternative text for accessibility',
    });

    // Icon-specific: size prop
    if (component.type === 'icon') {
      props.push({
        name: 'size',
        type: 'number',
        required: false,
        defaultValue: component.bounds ? `${Math.min(component.bounds.width, component.bounds.height)}` : '24',
        description: 'Icon size in pixels',
      });
    }

    return props;
  }

  /**
   * Extract props for form components
   */
  private extractFormProps(component: ParsedComponent): InferredProp[] {
    const props: InferredProp[] = [];

    // onSubmit handler
    props.push({
      name: 'onSubmit',
      type: '(data: FormData) => void',
      required: false,
      description: 'Form submit handler',
    });

    return props;
  }

  /**
   * Extract props for list components
   */
  private extractListProps(component: ParsedComponent): InferredProp[] {
    const props: InferredProp[] = [];

    // Items array
    props.push({
      name: 'items',
      type: 'Array<any>',
      required: true,
      description: 'List items',
    });

    // Render function
    props.push({
      name: 'renderItem',
      type: '(item: any, index: number) => React.ReactNode',
      required: false,
      description: 'Custom render function for list items',
    });

    return props;
  }

  /**
   * Extract props for card components
   */
  private extractCardProps(component: ParsedComponent): InferredProp[] {
    const props: InferredProp[] = [];

    // Title
    props.push({
      name: 'title',
      type: 'string',
      required: false,
      description: 'Card title',
    });

    // Description
    props.push({
      name: 'description',
      type: 'string',
      required: false,
      description: 'Card description',
    });

    return props;
  }

  /**
   * Extract props for container components
   */
  private extractContainerProps(component: ParsedComponent): InferredProp[] {
    // Containers typically only have children and className
    return [];
  }

  /**
   * Check if component has children
   */
  private hasChildren(component: ParsedComponent): boolean {
    return !!(component.children && component.children.length > 0);
  }

  /**
   * Infer if button is primary based on name/styling
   */
  private isPrimaryButton(component: ParsedComponent): boolean {
    const name = component.name.toLowerCase();
    return name.includes('primary') || name.includes('cta') || name.includes('submit');
  }

  /**
   * Infer input type from component name
   */
  private inferInputType(component: ParsedComponent): string {
    const name = component.name.toLowerCase();

    if (name.includes('email')) return 'email';
    if (name.includes('password')) return 'password';
    if (name.includes('search')) return 'search';
    if (name.includes('number') || name.includes('tel')) return 'number';
    if (name.includes('date')) return 'date';
    if (name.includes('time')) return 'time';
    if (name.includes('url')) return 'url';

    return 'text';
  }

  /**
   * Infer text variant from font size
   */
  private inferTextVariant(component: ParsedComponent): 'heading' | 'body' | 'caption' {
    const fontSize = component.text?.fontSize;

    if (!fontSize) return 'body';

    // Heuristics based on font size
    if (fontSize >= 24) return 'heading';
    if (fontSize <= 12) return 'caption';

    return 'body';
  }

  /**
   * Infer prop type from component structure
   *
   * @param component - ParsedComponent
   * @param propName - Prop name to infer type for
   * @returns TypeScript type string
   */
  inferPropType(component: ParsedComponent, propName: string): string {
    // Common prop type mappings
    const typeMap: Record<string, string> = {
      onClick: '() => void',
      onChange: '(value: any) => void',
      onSubmit: '(data: FormData) => void',
      children: 'React.ReactNode',
      className: 'string',
      style: 'React.CSSProperties',
      disabled: 'boolean',
      required: 'boolean',
      value: 'string',
      text: 'string',
      label: 'string',
      title: 'string',
      description: 'string',
      src: 'string',
      alt: 'string',
      href: 'string',
      items: 'Array<any>',
    };

    return typeMap[propName] || 'any';
  }

  /**
   * Remove duplicate props (keep first occurrence)
   */
  private deduplicateProps(props: InferredProp[]): InferredProp[] {
    const seen = new Set<string>();
    return props.filter(prop => {
      if (seen.has(prop.name)) return false;
      seen.add(prop.name);
      return true;
    });
  }

  /**
   * Convert InferredProp to ComponentProp (for backward compatibility)
   */
  toComponentProp(inferredProp: InferredProp): ComponentProp {
    return {
      name: inferredProp.name,
      type: inferredProp.type,
      required: inferredProp.required,
      defaultValue: inferredProp.defaultValue,
    };
  }

  /**
   * Generate TypeScript interface string from props
   *
   * SKILL: react-best-practices.md (type safety)
   *
   * @param componentName - Name of the component
   * @param props - Array of inferred props
   * @returns TypeScript interface string
   */
  /**
   * Convert generic prop type to TypeScript type
   */
  private convertToTypeScriptType(type: string): string {
    const typeMap: Record<string, string> = {
      function: '() => void',
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      array: 'any[]',
      object: 'Record<string, any>',
    };

    return typeMap[type.toLowerCase()] || type;
  }

  generatePropsInterface(componentName: string, props: InferredProp[]): string {
    if (props.length === 0) return '';

    const lines: string[] = [
      `interface ${componentName}Props {`,
    ];

    for (const prop of props) {
      const optional = prop.required ? '' : '?';
      const comment = prop.description ? `  /** ${prop.description} */\n` : '';
      const tsType = this.convertToTypeScriptType(prop.type);
      lines.push(`${comment}  ${prop.name}${optional}: ${tsType};`);
    }

    lines.push('}');

    return lines.join('\n');
  }
}
