/**
 * FORGE React Generator - Component Builder
 * 
 * @epic 06 - React Generator
 * @task 2.2 - Component Building
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Builds React component JSX from Figma parsed frames.
 *   Handles element mapping, prop binding, and component composition.
 */

import {
  ReactGeneratorConfig,
  GeneratedStyles,
  ElementMapping,
} from '../core/types';

import { StyleGenerator } from '../styles/style-generator';

// ============================================
// TYPES
// ============================================

interface ParsedFrame {
  id: string;
  name: string;
  type: string;
  semantic?: {
    type: string;
    confidence: number;
    element: string;
    role?: string;
    ariaLabel?: string;
  };
  layout?: any;
  styles?: any;
  children: ParsedFrame[];
  visible: boolean;
  textContent?: string;
  componentRef?: string;
  bounds?: { x: number; y: number; width: number; height: number };
  interactions?: any[];
}

// ============================================
// ELEMENT MAPPINGS
// ============================================

const ELEMENT_MAPPINGS: Record<string, ElementMapping> = {
  button: {
    element: 'button',
    role: 'button',
    defaultProps: { type: 'button' },
    semantic: 'button',
  },
  link: {
    element: 'a',
    role: 'link',
    defaultProps: { href: '#' },
    semantic: 'link',
  },
  input: {
    element: 'input',
    role: 'textbox',
    defaultProps: { type: 'text' },
    semantic: 'input',
  },
  textarea: {
    element: 'textarea',
    role: 'textbox',
    semantic: 'input',
  },
  checkbox: {
    element: 'input',
    role: 'checkbox',
    defaultProps: { type: 'checkbox' },
    semantic: 'input',
  },
  radio: {
    element: 'input',
    role: 'radio',
    defaultProps: { type: 'radio' },
    semantic: 'input',
  },
  image: {
    element: 'img',
    role: 'img',
    defaultProps: { alt: '' },
    semantic: 'image',
  },
  text: {
    element: 'span',
    semantic: 'text',
  },
  heading: {
    element: 'h2',
    role: 'heading',
    semantic: 'heading',
  },
  paragraph: {
    element: 'p',
    semantic: 'text',
  },
  list: {
    element: 'ul',
    role: 'list',
    semantic: 'list',
  },
  listItem: {
    element: 'li',
    role: 'listitem',
    semantic: 'listItem',
  },
  navigation: {
    element: 'nav',
    role: 'navigation',
    semantic: 'navigation',
  },
  header: {
    element: 'header',
    role: 'banner',
    semantic: 'container',
  },
  footer: {
    element: 'footer',
    role: 'contentinfo',
    semantic: 'container',
  },
  main: {
    element: 'main',
    role: 'main',
    semantic: 'container',
  },
  section: {
    element: 'section',
    role: 'region',
    semantic: 'container',
  },
  article: {
    element: 'article',
    role: 'article',
    semantic: 'container',
  },
  aside: {
    element: 'aside',
    role: 'complementary',
    semantic: 'container',
  },
  card: {
    element: 'div',
    semantic: 'card',
  },
  modal: {
    element: 'dialog',
    role: 'dialog',
    semantic: 'modal',
  },
  container: {
    element: 'div',
    semantic: 'container',
  },
  form: {
    element: 'form',
    role: 'form',
    semantic: 'form',
  },
  icon: {
    element: 'span',
    role: 'img',
    semantic: 'image',
  },
};

// ============================================
// COMPONENT BUILDER
// ============================================

export class ComponentBuilder {
  private config: ReactGeneratorConfig;
  private styleGenerator: StyleGenerator;
  private indentLevel = 0;

  constructor(config: ReactGeneratorConfig) {
    this.config = config;
    this.styleGenerator = new StyleGenerator(config);
  }

  // ==========================================
  // MAIN BUILD METHOD
  // ==========================================

  /**
   * Build JSX for a frame and its children
   */
  buildJSX(frame: ParsedFrame, styles: GeneratedStyles, _config: ReactGeneratorConfig): string {
    this.indentLevel = 0;
    return this.buildElement(frame, styles);
  }

  // ==========================================
  // ELEMENT BUILDING
  // ==========================================

  private buildElement(frame: ParsedFrame, styles: GeneratedStyles): string {
    // Skip invisible frames
    if (!frame.visible) {
      return '';
    }

    // Determine HTML element
    const elementMapping = this.getElementMapping(frame);
    const element = elementMapping.element;

    // Build attributes
    const attributes = this.buildAttributes(frame, styles, elementMapping);

    // Build children
    const children = this.buildChildren(frame, styles);

    // Handle self-closing elements
    const selfClosing = this.isSelfClosing(element);

    if (selfClosing) {
      return this.formatElement(element, attributes, null);
    }

    // Handle text content
    if (frame.type === 'TEXT' && frame.textContent) {
      const textContent = this.formatTextContent(frame);
      return this.formatElement(element, attributes, textContent);
    }

    // Handle empty elements
    if (children.length === 0) {
      // For certain elements, use explicit children
      if (['div', 'span', 'button', 'a'].includes(element)) {
        return this.formatElement(element, attributes, '');
      }
      return this.formatElement(element, attributes, null);
    }

    return this.formatElement(element, attributes, children);
  }

  private getElementMapping(frame: ParsedFrame): ElementMapping {
    // Check semantic type first
    if (frame.semantic?.type) {
      const mapping = ELEMENT_MAPPINGS[frame.semantic.type];
      if (mapping) return mapping;
    }

    // Check frame type
    switch (frame.type) {
      case 'TEXT':
        return ELEMENT_MAPPINGS.text!;

      case 'RECTANGLE':
        // Could be a button, card, or container based on children
        if (frame.interactions?.some(i => i.trigger === 'click')) {
          return ELEMENT_MAPPINGS.button!;
        }
        return ELEMENT_MAPPINGS.container!;

      case 'ELLIPSE':
      case 'POLYGON':
      case 'STAR':
      case 'VECTOR':
        return { element: 'div', semantic: 'container' };

      case 'FRAME':
      case 'GROUP':
        return this.inferElementFromName(frame.name);

      case 'INSTANCE':
        return ELEMENT_MAPPINGS.container!;

      case 'COMPONENT':
        return ELEMENT_MAPPINGS.container!;

      default:
        return ELEMENT_MAPPINGS.container!;
    }
  }

  private inferElementFromName(name: string): ElementMapping {
    const lowerName = name.toLowerCase();

    // Check for common patterns
    if (lowerName.includes('button') || lowerName.includes('btn')) {
      return ELEMENT_MAPPINGS.button!;
    }
    if (lowerName.includes('link')) {
      return ELEMENT_MAPPINGS.link!;
    }
    if (lowerName.includes('input') || lowerName.includes('field')) {
      return ELEMENT_MAPPINGS.input!;
    }
    if (lowerName.includes('image') || lowerName.includes('img') || lowerName.includes('avatar')) {
      return ELEMENT_MAPPINGS.image!;
    }
    if (lowerName.includes('header')) {
      return ELEMENT_MAPPINGS.header!;
    }
    if (lowerName.includes('footer')) {
      return ELEMENT_MAPPINGS.footer!;
    }
    if (lowerName.includes('nav')) {
      return ELEMENT_MAPPINGS.navigation!;
    }
    if (lowerName.includes('card')) {
      return ELEMENT_MAPPINGS.card!;
    }
    if (lowerName.includes('modal') || lowerName.includes('dialog')) {
      return ELEMENT_MAPPINGS.modal!;
    }
    if (lowerName.includes('form')) {
      return ELEMENT_MAPPINGS.form!;
    }
    if (lowerName.includes('list')) {
      return ELEMENT_MAPPINGS.list!;
    }
    if (lowerName.includes('icon')) {
      return ELEMENT_MAPPINGS.icon!;
    }
    if (/^h[1-6]$/i.test(lowerName) || lowerName.includes('heading') || lowerName.includes('title')) {
      return { ...ELEMENT_MAPPINGS.heading!, element: this.inferHeadingLevel(lowerName) };
    }

    return ELEMENT_MAPPINGS.container!;
  }

  private inferHeadingLevel(name: string): string {
    const match = name.match(/h([1-6])/i);
    if (match) return `h${match[1]}`;
    
    if (name.includes('title') || name.includes('main')) return 'h1';
    if (name.includes('subtitle')) return 'h2';
    return 'h2';
  }

  // ==========================================
  // ATTRIBUTE BUILDING
  // ==========================================

  private buildAttributes(
    frame: ParsedFrame,
    styles: GeneratedStyles,
    mapping: ElementMapping
  ): string[] {
    const attrs: string[] = [];

    // Class name attribute
    const className = this.buildClassName(frame, styles);
    if (className) {
      attrs.push(`className="${className}"`);
    }

    // ARIA attributes
    if (mapping.role && mapping.role !== mapping.element) {
      attrs.push(`role="${mapping.role}"`);
    }
    if (frame.semantic?.ariaLabel) {
      attrs.push(`aria-label="${this.escapeAttr(frame.semantic.ariaLabel)}"`);
    }

    // Default props from mapping
    if (mapping.defaultProps) {
      for (const [key, value] of Object.entries(mapping.defaultProps)) {
        attrs.push(`${key}="${value}"`);
      }
    }

    // Data attributes for debugging
    if (this.config.formatting?.indentation === 'spaces') {
      // In dev mode, add data-figma-id
      // attrs.push(`data-figma-id="${frame.id}"`);
    }

    // Event handlers
    if (frame.interactions?.some(i => i.trigger === 'click')) {
      attrs.push('onClick={onClick}');
    }

    // Image-specific attributes
    if (mapping.element === 'img') {
      const altText = frame.semantic?.ariaLabel || frame.name || '';
      attrs.push(`alt="${this.escapeAttr(altText)}"`);
      attrs.push('src={imageSrc}'); // Placeholder
    }

    // Input-specific attributes
    if (mapping.element === 'input') {
      const placeholder = this.extractPlaceholder(frame);
      if (placeholder) {
        attrs.push(`placeholder="${this.escapeAttr(placeholder)}"`);
      }
    }

    // Link-specific attributes
    if (mapping.element === 'a') {
      const url = frame.interactions?.find(i => i.action === 'url')?.url;
      if (url) {
        attrs.push(`href="${url}"`);
      }
    }

    return attrs;
  }

  private buildClassName(frame: ParsedFrame, styles: GeneratedStyles): string {
    const classes: string[] = [];

    // Add style classes based on approach
    switch (this.config.stylingApproach) {
      case 'tailwind':
        if (styles.tailwind) {
          classes.push(...styles.tailwind.base);
          if (styles.tailwind.hover) {
            classes.push(...styles.tailwind.hover.map(c => `hover:${c}`));
          }
          if (styles.tailwind.focus) {
            classes.push(...styles.tailwind.focus.map(c => `focus:${c}`));
          }
        }
        break;

      case 'css-modules':
        classes.push('styles.root');
        break;

      default:
        // Use generated class name
        classes.push(this.toKebabCase(frame.name));
    }

    // Always include className prop if component accepts it
    const classString = classes.join(' ');
    return classString ? `${classString} \${className || ''}`.trim() : '${className || \'\'}';
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  private escapeAttr(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private extractPlaceholder(frame: ParsedFrame): string | null {
    // Look for placeholder text in children
    const textChild = frame.children.find(c => c.type === 'TEXT');
    return textChild?.textContent || null;
  }

  // ==========================================
  // CHILDREN BUILDING
  // ==========================================

  private buildChildren(frame: ParsedFrame, _parentStyles: GeneratedStyles): string {
    if (frame.children.length === 0) {
      return '';
    }

    this.indentLevel++;

    const childElements = frame.children
      .filter(child => child.visible)
      .map(child => {
        const childStyles = this.styleGenerator.generate(child);
        return this.buildElement(child, childStyles);
      })
      .filter(Boolean);

    this.indentLevel--;

    return childElements.join('\n');
  }

  // ==========================================
  // TEXT FORMATTING
  // ==========================================

  private formatTextContent(frame: ParsedFrame): string {
    const text = frame.textContent || '';

    // Check if this should be a prop
    const propName = this.toPropName(frame.name);
    
    // Return as expression if prop exists
    if (propName && propName !== 'text') {
      return `{${propName}}`;
    }

    // Escape JSX characters
    return this.escapeJSX(text);
  }

  private toPropName(name: string): string {
    // Convert frame name to camelCase prop name
    return name
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((word, index) => 
        index === 0 
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
  }

  private escapeJSX(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/{/g, '&#123;')
      .replace(/}/g, '&#125;');
  }

  // ==========================================
  // ELEMENT FORMATTING
  // ==========================================

  private formatElement(element: string, attributes: string[], children: string | null): string {
    const indent = '  '.repeat(this.indentLevel);
    const attrString = attributes.length > 0 ? ' ' + attributes.join(' ') : '';

    // Self-closing
    if (children === null) {
      return `${indent}<${element}${attrString} />`;
    }

    // Empty children
    if (children === '') {
      return `${indent}<${element}${attrString}></${element}>`;
    }

    // Inline content (short text)
    if (!children.includes('\n') && children.length < 40) {
      return `${indent}<${element}${attrString}>${children}</${element}>`;
    }

    // Multi-line content
    return `${indent}<${element}${attrString}>
${children}
${indent}</${element}>`;
  }

  private isSelfClosing(element: string): boolean {
    const selfClosingElements = [
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ];
    return selfClosingElements.includes(element);
  }

  // ==========================================
  // COMPONENT REFERENCE HANDLING
  // ==========================================

  /**
   * Build JSX for a component instance reference
   */
  buildComponentReference(frame: ParsedFrame): string {
    if (!frame.componentRef) {
      return '';
    }

    // Convert component ID to component name
    const componentName = this.componentIdToName(frame.componentRef);
    const props = this.extractInstanceProps(frame);

    const propsString = Object.entries(props)
      .map(([key, value]) => `${key}={${value}}`)
      .join(' ');

    const indent = '  '.repeat(this.indentLevel);
    return `${indent}<${componentName} ${propsString} />`;
  }

  private componentIdToName(componentId: string): string {
    // In real implementation, would look up from component registry
    return `Component_${componentId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private extractInstanceProps(_frame: ParsedFrame): Record<string, string> {
    const props: Record<string, string> = {};

    // Extract overridden props from instance
    // This would be implemented based on Figma instance data

    return props;
  }
}

// ============================================
// EXPORTS
// ============================================

export default ComponentBuilder;
