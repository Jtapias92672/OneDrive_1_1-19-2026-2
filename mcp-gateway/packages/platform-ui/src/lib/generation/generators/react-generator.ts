/**
 * ReactGenerator - Generate React components from Figma design
 *
 * Uses unified extraction layer to generate production-ready React components
 * that accurately reflect Figma design (layout, colors, typography, images).
 *
 * Guided by Skills:
 * - react-best-practices.md: Type-safe props, performance optimizations
 * - forge-vector-containers.md: Logo rendering pattern
 * - forge-hierarchy-preservation.md: Recursive component rendering
 * - forge-architectural-entropy.md: Uses shared extractors (no duplication)
 */

import type { ParsedComponent } from '../../poc/types';
import {
  StyleExtractor,
  ImageResolver,
  LayoutCalculator,
  TextExtractor,
  PropsExtractor,
  type InferredProp,
} from '../extractors';

export interface ReactGeneratorOptions {
  /**
   * Use Tailwind CSS classes instead of inline styles
   * Default: false (use inline styles for design accuracy)
   */
  useTailwind?: boolean;

  /**
   * Generate TypeScript interfaces for props
   * Default: true
   */
  generateInterfaces?: boolean;

  /**
   * Add comments in generated code
   * Default: true
   */
  includeComments?: boolean;
}

export class ReactGenerator {
  private styleExtractor: StyleExtractor;
  private imageResolver: ImageResolver;
  private layoutCalculator: LayoutCalculator;
  private textExtractor: TextExtractor;
  private propsExtractor: PropsExtractor;

  constructor(private options: ReactGeneratorOptions = {}) {
    this.styleExtractor = new StyleExtractor();
    this.imageResolver = new ImageResolver();
    this.layoutCalculator = new LayoutCalculator();
    this.textExtractor = new TextExtractor();
    this.propsExtractor = new PropsExtractor();

    // Set defaults
    this.options.generateInterfaces = options.generateInterfaces !== false;
    this.options.includeComments = options.includeComments !== false;
  }

  /**
   * Generate React component code from ParsedComponent
   *
   * @param component - Parsed Figma component
   * @param componentName - PascalCase component name
   * @returns React component code string
   */
  generateComponent(component: ParsedComponent, componentName: string): string {
    // Extract props from component structure
    const props = this.propsExtractor.extractProps(component);

    // Generate imports
    const imports = this.generateImports(component, props);

    // Generate props interface
    const propsInterface = this.options.generateInterfaces
      ? this.propsExtractor.generatePropsInterface(componentName, props)
      : '';

    // Generate component function
    const componentFunction = this.generateComponentFunction(
      component,
      componentName,
      props
    );

    // Combine all parts
    const parts: string[] = [imports];

    if (propsInterface) {
      parts.push('', propsInterface);
    }

    parts.push('', componentFunction);

    return parts.join('\n');
  }

  /**
   * Generate import statements
   */
  private generateImports(component: ParsedComponent, props: InferredProp[]): string {
    const imports: string[] = ["import React from 'react';"];

    // Add Image import if component has images
    if (this.hasImages(component)) {
      // Assume Next.js Image component is available
      imports.push("import Image from 'next/image';");
    }

    return imports.join('\n');
  }

  /**
   * Generate component function
   */
  private generateComponentFunction(
    component: ParsedComponent,
    componentName: string,
    props: InferredProp[]
  ): string {
    const propsParam = props.length > 0 ? `props: ${componentName}Props` : '';

    const jsxContent = this.generateJSX(component, 1);

    const comment = this.options.includeComments
      ? `  // Generated from Figma component: ${component.name}\n`
      : '';

    return `export function ${componentName}(${propsParam}) {
${comment}  return (
${jsxContent}
  );
}

export default ${componentName};`;
  }

  /**
   * Generate JSX for component tree
   *
   * SKILL: forge-hierarchy-preservation.md
   * Recursively renders children, preserving Figma hierarchy
   *
   * @param component - Component to render
   * @param depth - Indentation depth
   * @returns JSX string
   */
  private generateJSX(component: ParsedComponent, depth: number): string {
    const indent = '  '.repeat(depth);

    // SKILL: forge-vector-containers.md
    // Vector containers render as single <Image> (not 50+ fragments)
    if (this.imageResolver.isVectorContainer(component)) {
      return this.generateImageElement(component, depth);
    }

    // Check if should render as image
    if (this.imageResolver.shouldRenderAsImage(component)) {
      return this.generateImageElement(component, depth);
    }

    // Check if text node (leaf with text content, no children)
    if (this.textExtractor.isTextNode(component)) {
      return this.generateTextElement(component, depth);
    }

    // Container element with potential children
    return this.generateContainerElement(component, depth);
  }

  /**
   * Generate <Image> element for images and vector containers
   */
  private generateImageElement(component: ParsedComponent, depth: number): string {
    const indent = '  '.repeat(depth);
    const imageUrl = this.imageResolver.getImageUrl(component);

    if (!imageUrl) {
      // Ghost image prevention (SKILL: forge-vector-containers.md)
      return `${indent}<div style={{ opacity: 0 }} />`;
    }

    const styles = this.generateStyleObject(component, true, false);
    const objectFit = this.imageResolver.getObjectFit(component);

    // Add object-fit to styles
    styles.objectFit = `'${objectFit}'`;

    const styleString = this.serializeStyleObject(styles);
    const alt = component.name || 'Image';

    return `${indent}<Image
${indent}  src="${imageUrl}"
${indent}  alt="${alt}"
${indent}  style={${styleString}}
${indent}/>`;
  }

  /**
   * Generate text element (span or div with text content)
   */
  private generateTextElement(component: ParsedComponent, depth: number): string {
    const indent = '  '.repeat(depth);
    const text = this.textExtractor.extractText(component);

    if (!text) {
      return `${indent}<div />`;
    }

    const styles = this.generateStyleObject(component, false, true);
    const styleString = this.serializeStyleObject(styles);

    // Escape text for JSX (prevent XSS)
    const escapedText = this.escapeJSX(text);

    return `${indent}<span style={${styleString}}>{${JSON.stringify(escapedText)}}</span>`;
  }

  /**
   * Generate container element (div) with children
   */
  private generateContainerElement(component: ParsedComponent, depth: number): string {
    const indent = '  '.repeat(depth);
    const styles = this.generateStyleObject(component, false, false);
    const styleString = this.serializeStyleObject(styles);

    // Render children recursively (SKILL: forge-hierarchy-preservation.md)
    const childrenJSX: string[] = [];

    if (component.children && Array.isArray(component.children)) {
      for (const child of component.children) {
        // Skip string IDs (legacy format)
        if (typeof child === 'string') continue;

        // Skip if vector container already rendered parent
        if (this.imageResolver.shouldSkipChildren(component)) {
          break;
        }

        childrenJSX.push(this.generateJSX(child as ParsedComponent, depth + 1));
      }
    }

    if (childrenJSX.length === 0) {
      // Self-closing div
      return `${indent}<div style={${styleString}} />`;
    }

    // Container with children
    const childrenString = childrenJSX.join('\n');

    return `${indent}<div style={${styleString}}>
${childrenString}
${indent}</div>`;
  }

  /**
   * Generate style object for component
   *
   * Uses extractors to get styles from Figma design data
   *
   * @param component - Component to extract styles from
   * @param isImage - Whether component is an image (different style rules)
   * @param isText - Whether component is a text node
   * @returns Style object (keys are camelCase CSS properties)
   */
  private generateStyleObject(
    component: ParsedComponent,
    isImage: boolean,
    isText: boolean
  ): Record<string, string> {
    const styles: Record<string, string> = {};

    // Layout (position + size)
    const position = this.layoutCalculator.calculatePosition(component);
    if (this.layoutCalculator.hasBounds(component)) {
      styles.position = "'absolute'";
      styles.left = `${position.x}`;
      styles.top = `${position.y}`;
      styles.width = `${position.width}`;
      styles.height = `${position.height}`;
    }

    // Flex layout detection (SKILL: react-best-practices.md)
    const flexInfo = this.layoutCalculator.inferFlexLayout(component);
    if (flexInfo) {
      styles.display = "'flex'";
      styles.flexDirection = `'${flexInfo.flexDirection}'`;
      if (flexInfo.gap > 0) {
        styles.gap = `${flexInfo.gap}`;
      }
    }

    // Background color
    const fillColor = this.styleExtractor.extractFillColor(component);
    if (fillColor) {
      styles.backgroundColor = `'${fillColor}'`;
    }

    // Border (strokes)
    const strokeStyles = this.styleExtractor.extractStrokeStyles(component);
    if (strokeStyles.length > 0) {
      // Parse "border: 2px solid rgba(...)"
      const borderMatch = strokeStyles[0].match(/border: (.+)/);
      if (borderMatch) {
        styles.border = `'${borderMatch[1]}'`;
      }
    }

    // Border radius (corner radius)
    // TODO: Add extractBorderRadius to StyleExtractor when cornerRadius added to ParsedComponent

    // Text styles (if text node)
    if (isText) {
      const textStyles = this.styleExtractor.extractTextStyles(component);
      if (textStyles) {
        styles.fontFamily = `'${textStyles.fontFamily}'`;
        styles.fontSize = `'${textStyles.fontSize}'`;
        styles.fontWeight = textStyles.fontWeight;
        styles.lineHeight = `'${textStyles.lineHeight}'`;
        styles.textAlign = `'${textStyles.textAlign}'`;

        // Text color
        const textColor = this.styleExtractor.extractTextColor(component);
        if (textColor) {
          styles.color = `'${textColor}'`;
        }

        // Prevent wrapping for text nodes (SKILL: forge-hierarchy-preservation.md)
        if (this.textExtractor.shouldPreventWrapping(component)) {
          styles.whiteSpace = "'nowrap'";
          styles.overflow = "'visible'";
        }
      }
    }

    // Box shadow (effects)
    const effectStyles = this.styleExtractor.extractEffectStyles(component);
    if (effectStyles.length > 0) {
      const shadowMatch = effectStyles[0].match(/box-shadow: (.+)/);
      if (shadowMatch) {
        styles.boxShadow = `'${shadowMatch[1]}'`;
      }
    }

    return styles;
  }

  /**
   * Serialize style object to React inline style format
   *
   * SKILL: react-best-practices.md
   * Uses inline styles for design accuracy (not Tailwind approximations)
   *
   * @param styles - Style object with camelCase keys
   * @returns Serialized style string for React
   */
  private serializeStyleObject(styles: Record<string, string>): string {
    if (Object.keys(styles).length === 0) {
      return '{}';
    }

    const entries = Object.entries(styles)
      .map(([key, value]) => {
        // Check if value already has quotes (string literals)
        if (value.startsWith("'") && value.endsWith("'")) {
          return `${key}: ${value}`;
        }
        // Numeric values (no units assumed to be px)
        return `${key}: ${value}`;
      })
      .join(', ');

    return `{ ${entries} }`;
  }

  /**
   * Check if component tree contains images
   */
  private hasImages(component: ParsedComponent): boolean {
    if (this.imageResolver.shouldRenderAsImage(component)) {
      return true;
    }

    if (component.children && Array.isArray(component.children)) {
      for (const child of component.children) {
        if (typeof child === 'string') continue;
        if (this.hasImages(child as ParsedComponent)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Escape text for JSX (prevent XSS)
   *
   * SKILL: react-best-practices.md (security)
   *
   * @param text - Text to escape
   * @returns Escaped text safe for JSX
   */
  private escapeJSX(text: string): string {
    // In JSX, we use {""} for text content, so we need to escape
    // backslashes and quotes that would break the JSON.stringify
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}
