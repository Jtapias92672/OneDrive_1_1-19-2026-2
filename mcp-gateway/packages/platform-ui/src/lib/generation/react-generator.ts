/**
 * React Generator
 * Epic 11: External Integrations - Phase 3
 *
 * Generates production-quality React components from parsed Figma designs.
 */

import { ParsedComponent, ParsedDesign } from '../integrations/figma/parsed-types';
import {
  mapFillToTailwind,
  mapFillToTextColor,
  mapAutoLayoutToTailwind,
  mapTextToTailwind,
  mapEffectToTailwind,
  mapBoundsToTailwind,
  mapCornerRadiusToTailwind,
} from './tailwind-mapper';

export interface GeneratedComponent {
  name: string;
  fileName: string;
  code: string;
  imports: string[];
  props: string[];
}

export interface GeneratorOptions {
  /** Use Tailwind classes instead of inline styles */
  useTailwind?: boolean;
  /** Include TypeScript types */
  typescript?: boolean;
  /** Add React.memo wrapper */
  memo?: boolean;
  /** Export as default */
  defaultExport?: boolean;
}

const DEFAULT_OPTIONS: GeneratorOptions = {
  useTailwind: true,
  typescript: true,
  memo: false,
  defaultExport: true,
};

export class ReactGenerator {
  private options: GeneratorOptions;

  constructor(options: Partial<GeneratorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate React components from a parsed design
   */
  generate(design: ParsedDesign): GeneratedComponent[] {
    return design.components.map((component) => this.generateComponent(component));
  }

  /**
   * Generate a single React component
   */
  generateComponent(component: ParsedComponent): GeneratedComponent {
    const name = this.sanitizeName(component.name);
    const fileName = `${name}.tsx`;

    const imports = this.generateImports(component);
    const propsInterface = this.generatePropsInterface(name);
    const componentBody = this.generateComponentBody(component, name);

    const code = [
      this.generateFileHeader(component),
      imports.join('\n'),
      '',
      propsInterface,
      '',
      componentBody,
      this.options.defaultExport ? `\nexport default ${name};` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      name,
      fileName,
      code,
      imports,
      props: ['className', 'children'],
    };
  }

  /**
   * Generate file header comment
   */
  private generateFileHeader(component: ParsedComponent): string {
    return `/**
 * ${this.sanitizeName(component.name)}
 * Generated from Figma: "${component.name}"
 * Type: ${component.type}
 */`;
  }

  /**
   * Generate import statements
   */
  private generateImports(component: ParsedComponent): string[] {
    const imports: string[] = ["import React from 'react';"];

    // Check if we need any child-specific imports
    const hasTextChildren = this.hasTextNodes(component);
    if (hasTextChildren) {
      // Could add text-related imports here if needed
    }

    return imports;
  }

  /**
   * Generate TypeScript props interface
   */
  private generatePropsInterface(name: string): string {
    if (!this.options.typescript) return '';

    return `export interface ${name}Props {
  className?: string;
  children?: React.ReactNode;
}`;
  }

  /**
   * Generate the component body
   */
  private generateComponentBody(component: ParsedComponent, name: string): string {
    const propsType = this.options.typescript ? `: React.FC<${name}Props>` : '';
    const classes = this.generateClasses(component);
    const styles = this.generateStyles(component);
    const children = this.generateChildren(component);

    const classNameAttr = classes.length > 0 ? `\n      className={\`${classes.join(' ')} \${className || ''}\`}` : '';

    const styleAttr = Object.keys(styles).length > 0 ? `\n      style={${JSON.stringify(styles, null, 2).replace(/\n/g, '\n      ')}}` : '';

    const wrapStart = this.options.memo ? `export const ${name}${propsType} = React.memo(` : `export const ${name}${propsType} = `;
    const wrapEnd = this.options.memo ? ');' : ';';

    return `${wrapStart}({ className, children }) => {
  return (
    <div${classNameAttr}${styleAttr}
    >
      ${children}
    </div>
  );
}${wrapEnd}`;
  }

  /**
   * Generate Tailwind classes for a component
   */
  private generateClasses(component: ParsedComponent): string[] {
    if (!this.options.useTailwind) return [];

    const classes: string[] = [];

    // Auto-layout classes
    if (component.autoLayout) {
      classes.push(...mapAutoLayoutToTailwind(component.autoLayout));
    }

    // Background color
    if (component.fills.length > 0) {
      const bgClass = mapFillToTailwind(component.fills[0]);
      if (bgClass) classes.push(bgClass);
    }

    // Corner radius
    const roundedClass = mapCornerRadiusToTailwind(component.cornerRadius);
    if (roundedClass) classes.push(roundedClass);

    // Effects (shadows)
    for (const effect of component.effects) {
      const effectClass = mapEffectToTailwind(effect);
      if (effectClass) classes.push(effectClass);
    }

    // Dimensions (only if no auto-layout)
    if (!component.autoLayout) {
      classes.push(...mapBoundsToTailwind(component.bounds));
    }

    return classes;
  }

  /**
   * Generate inline styles (fallback for non-Tailwind properties)
   */
  private generateStyles(component: ParsedComponent): Record<string, unknown> {
    const styles: Record<string, unknown> = {};

    // If not using Tailwind, add all styles inline
    if (!this.options.useTailwind) {
      styles.width = component.bounds.width;
      styles.height = component.bounds.height;

      if (component.fills.length > 0 && component.fills[0].color) {
        const c = component.fills[0].color;
        styles.backgroundColor = `rgb(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)})`;
      }

      if (component.cornerRadius) {
        styles.borderRadius = component.cornerRadius;
      }
    }

    // Box sizing is always useful
    styles.boxSizing = 'border-box';

    return styles;
  }

  /**
   * Generate children JSX
   */
  private generateChildren(component: ParsedComponent): string {
    if (component.children.length === 0) {
      // Leaf node - render text content or placeholder
      if (component.type === 'TEXT' && component.text) {
        return this.generateTextNode(component);
      }
      return `{children || <span>${component.name}</span>}`;
    }

    // Render child components recursively
    const childJsx = component.children
      .map((child) => this.generateChildJsx(child))
      .join('\n      ');

    return `{children || (
        <>
          ${childJsx}
        </>
      )}`;
  }

  /**
   * Generate JSX for a text node
   */
  private generateTextNode(component: ParsedComponent): string {
    if (!component.text) return `<span>${component.name}</span>`;

    const textClasses = this.options.useTailwind ? mapTextToTailwind(component.text) : [];

    // Add text color if present
    if (component.fills.length > 0) {
      const colorClass = mapFillToTextColor(component.fills[0]);
      if (colorClass) textClasses.push(colorClass);
    }

    const classAttr = textClasses.length > 0 ? ` className="${textClasses.join(' ')}"` : '';
    const content = this.escapeJsx(component.text.content);

    // Choose element based on font weight/size
    if (component.text.fontWeight >= 700 && component.text.fontSize >= 20) {
      return `<h2${classAttr}>${content}</h2>`;
    }
    if (component.text.fontWeight >= 600 && component.text.fontSize >= 18) {
      return `<h3${classAttr}>${content}</h3>`;
    }

    return `<span${classAttr}>${content}</span>`;
  }

  /**
   * Generate JSX for a child component
   */
  private generateChildJsx(child: ParsedComponent): string {
    const classes = this.generateClasses(child);
    const classAttr = classes.length > 0 ? ` className="${classes.join(' ')}"` : '';

    if (child.type === 'TEXT' && child.text) {
      return this.generateTextNode(child);
    }

    if (child.children.length === 0) {
      return `<div${classAttr}>${child.name}</div>`;
    }

    // Recursive children
    const nestedChildren = child.children.map((c) => this.generateChildJsx(c)).join('\n          ');

    return `<div${classAttr}>
          ${nestedChildren}
        </div>`;
  }

  /**
   * Check if component has text nodes
   */
  private hasTextNodes(component: ParsedComponent): boolean {
    if (component.type === 'TEXT') return true;
    return component.children.some((c) => this.hasTextNodes(c));
  }

  /**
   * Sanitize component name for valid JS identifier
   */
  private sanitizeName(name: string): string {
    // Remove special characters, capitalize first letter of each word
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Escape special characters for JSX
   */
  private escapeJsx(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/{/g, '&#123;')
      .replace(/}/g, '&#125;');
  }
}

/**
 * Factory function for quick generation
 */
export function generateReactComponents(
  design: ParsedDesign,
  options?: Partial<GeneratorOptions>
): GeneratedComponent[] {
  const generator = new ReactGenerator(options);
  return generator.generate(design);
}
