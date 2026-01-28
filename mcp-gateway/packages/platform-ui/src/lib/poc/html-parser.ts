/**
 * HTML Parser for POC Orchestrator
 * Converts HTML to ParsedComponent[] format for the generation pipeline
 *
 * Enables: HTML file → ParsedComponent[] → React/Express generation
 */

import { JSDOM } from 'jsdom';
import type { ParsedComponent, ComponentProp, ComponentStyles } from './types';

// =============================================================================
// Types
// =============================================================================

export interface HTMLParserConfig {
  /** Extract inline styles */
  extractStyles?: boolean;
  /** Extract data attributes as props */
  extractDataAttributes?: boolean;
  /** Minimum depth to extract components */
  minDepth?: number;
  /** Maximum depth to traverse */
  maxDepth?: number;
  /** CSS class patterns to identify components */
  componentClassPatterns?: string[];
}

export interface HTMLParseResult {
  components: ParsedComponent[];
  metadata: {
    title: string;
    totalElements: number;
    extractedComponents: number;
  };
}

// =============================================================================
// Element Type Mapping
// =============================================================================

const ELEMENT_TYPE_MAP: Record<string, string> = {
  // Forms
  form: 'form',
  input: 'input',
  textarea: 'input',
  select: 'input',
  button: 'button',

  // Layout
  div: 'container',
  section: 'container',
  article: 'card',
  aside: 'container',
  main: 'container',
  header: 'navigation',
  footer: 'container',
  nav: 'navigation',

  // Content
  h1: 'text',
  h2: 'text',
  h3: 'text',
  h4: 'text',
  h5: 'text',
  h6: 'text',
  p: 'text',
  span: 'text',
  label: 'text',

  // Lists
  ul: 'list',
  ol: 'list',
  li: 'list',
  table: 'list',

  // Media
  img: 'image',
  svg: 'icon',
  video: 'container',

  // Interactive
  a: 'button',
  dialog: 'modal',
};

const CLASS_PATTERN_MAP: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /card|tile|panel/i, type: 'card' },
  { pattern: /btn|button/i, type: 'button' },
  { pattern: /form|input-group/i, type: 'form' },
  { pattern: /nav|menu|sidebar/i, type: 'navigation' },
  { pattern: /modal|dialog|popup/i, type: 'modal' },
  { pattern: /list|grid|table/i, type: 'list' },
  { pattern: /header|hero/i, type: 'navigation' },
  { pattern: /footer/i, type: 'container' },
  { pattern: /dashboard|stats|metrics/i, type: 'container' },
  { pattern: /avatar|profile/i, type: 'card' },
  { pattern: /badge|tag|chip/i, type: 'button' },
  { pattern: /alert|toast|notification/i, type: 'container' },
];

// =============================================================================
// HTML Parser Class
// =============================================================================

export class HTMLParser {
  private config: Required<HTMLParserConfig>;
  private componentCounter: number = 0;

  constructor(config: HTMLParserConfig = {}) {
    this.config = {
      extractStyles: true,
      extractDataAttributes: true,
      minDepth: 0,
      maxDepth: 10,
      componentClassPatterns: [],
      ...config,
    };
  }

  /**
   * Parse HTML string to ParsedComponent array
   */
  parse(html: string): HTMLParseResult {
    this.componentCounter = 0;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const title = document.title || 'Untitled';
    const body = document.body;

    if (!body) {
      return {
        components: [],
        metadata: { title, totalElements: 0, extractedComponents: 0 },
      };
    }

    const totalElements = body.querySelectorAll('*').length;
    const components = this.extractComponents(body, 0);

    return {
      components,
      metadata: {
        title,
        totalElements,
        extractedComponents: components.length,
      },
    };
  }

  /**
   * Parse HTML file from path
   */
  async parseFile(filePath: string): Promise<HTMLParseResult> {
    const fs = await import('fs/promises');
    const html = await fs.readFile(filePath, 'utf-8');
    return this.parse(html);
  }

  /**
   * Extract components from an element and its children
   */
  private extractComponents(element: Element, depth: number): ParsedComponent[] {
    if (depth > this.config.maxDepth) {
      return [];
    }

    const components: ParsedComponent[] = [];
    const children = Array.from(element.children);

    for (const child of children) {
      if (this.shouldExtractAsComponent(child, depth)) {
        const component = this.elementToComponent(child, depth);
        components.push(component);

        // Extract nested components
        const nestedComponents = this.extractComponents(child, depth + 1);
        component.children = nestedComponents.map(c => c.id);
        components.push(...nestedComponents);
      } else {
        // Continue traversing without creating component
        components.push(...this.extractComponents(child, depth + 1));
      }
    }

    return components;
  }

  /**
   * Determine if an element should be extracted as a component
   */
  private shouldExtractAsComponent(element: Element, depth: number): boolean {
    if (depth < this.config.minDepth) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    const className = element.className || '';
    const id = element.id || '';

    // Skip script, style, and other non-visual elements
    if (['script', 'style', 'link', 'meta', 'noscript'].includes(tagName)) {
      return false;
    }

    // Always extract semantic elements
    if (['header', 'nav', 'main', 'section', 'article', 'aside', 'footer', 'form'].includes(tagName)) {
      return true;
    }

    // Extract elements with IDs (likely important)
    if (id && !id.startsWith('__')) {
      return true;
    }

    // Extract elements with component-like classes
    if (this.hasComponentClass(className)) {
      return true;
    }

    // Extract interactive elements
    if (['button', 'a', 'input', 'select', 'textarea'].includes(tagName)) {
      return true;
    }

    // Extract divs/sections with meaningful content
    if (['div', 'section'].includes(tagName)) {
      const hasSubstantialContent = element.children.length > 0 ||
        (element.textContent?.trim().length || 0) > 20;
      const hasClasses = className.trim().length > 0;
      return hasSubstantialContent && hasClasses;
    }

    return false;
  }

  /**
   * Check if className contains component-like patterns
   */
  private hasComponentClass(className: string): boolean {
    if (!className) return false;

    // Check custom patterns
    for (const pattern of this.config.componentClassPatterns) {
      if (className.includes(pattern)) {
        return true;
      }
    }

    // Check built-in patterns
    for (const { pattern } of CLASS_PATTERN_MAP) {
      if (pattern.test(className)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Convert an HTML element to ParsedComponent
   */
  private elementToComponent(element: Element, depth: number): ParsedComponent {
    const tagName = element.tagName.toLowerCase();
    const className = element.className || '';
    const id = element.id || '';

    const componentId = `html-${++this.componentCounter}`;
    const name = this.inferComponentName(element, tagName, className, id);
    const type = this.inferComponentType(element, tagName, className);
    const props = this.extractProps(element);
    const styles = this.extractStyles(element);

    return {
      id: componentId,
      name,
      type,
      props,
      styles,
      children: [],
    };
  }

  /**
   * Infer a component name from element attributes
   */
  private inferComponentName(element: Element, tagName: string, className: string, id: string): string {
    // Use ID if available
    if (id && !id.startsWith('__')) {
      return this.toPascalCase(id);
    }

    // Use aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return this.toPascalCase(ariaLabel);
    }

    // Use first meaningful class
    if (className) {
      const classes = className.split(/\s+/).filter(c => c && !this.isUtilityClass(c));
      if (classes.length > 0) {
        return this.toPascalCase(classes[0]);
      }
    }

    // Use tag + text content hint
    const textHint = element.textContent?.trim().slice(0, 20) || '';
    if (textHint) {
      const words = textHint.split(/\s+/).slice(0, 2).join('');
      if (words.length > 2) {
        return this.toPascalCase(`${tagName}-${words}`);
      }
    }

    // Fallback to tag + counter
    return this.toPascalCase(`${tagName}-${this.componentCounter}`);
  }

  /**
   * Infer component type from element
   */
  private inferComponentType(element: Element, tagName: string, className: string): string {
    // Check class patterns first (more specific)
    for (const { pattern, type } of CLASS_PATTERN_MAP) {
      if (pattern.test(className)) {
        return type;
      }
    }

    // Check tag name mapping
    if (ELEMENT_TYPE_MAP[tagName]) {
      return ELEMENT_TYPE_MAP[tagName];
    }

    // Check for form-like content
    if (element.querySelector('input, select, textarea')) {
      return 'form';
    }

    // Check for list-like content
    if (element.querySelector('ul, ol, li') || element.children.length > 3) {
      return 'list';
    }

    return 'container';
  }

  /**
   * Extract props from element attributes
   */
  private extractProps(element: Element): ComponentProp[] {
    const props: ComponentProp[] = [];
    const tagName = element.tagName.toLowerCase();

    // Extract from attributes
    const attrs = element.attributes;
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      const name = attr.name;
      const value = attr.value;

      // Skip class, id, style (handled separately)
      if (['class', 'id', 'style'].includes(name)) continue;

      // Data attributes
      if (name.startsWith('data-') && this.config.extractDataAttributes) {
        const propName = this.toCamelCase(name.replace('data-', ''));
        props.push({
          name: propName,
          type: this.inferPropType(value),
          required: false,
          defaultValue: value,
        });
      }

      // Standard attributes
      if (['placeholder', 'type', 'name', 'value', 'href', 'src', 'alt', 'title'].includes(name)) {
        props.push({
          name,
          type: 'string',
          required: false,
          defaultValue: value,
        });
      }

      // Boolean attributes
      if (['disabled', 'readonly', 'required', 'checked', 'selected'].includes(name)) {
        props.push({
          name,
          type: 'boolean',
          required: false,
          defaultValue: 'true',
        });
      }
    }

    // Infer props from tag-specific patterns
    if (tagName === 'input') {
      const inputType = element.getAttribute('type') || 'text';
      if (!props.find(p => p.name === 'type')) {
        props.push({ name: 'type', type: 'string', required: false, defaultValue: inputType });
      }
      if (!props.find(p => p.name === 'value')) {
        props.push({ name: 'value', type: 'string', required: true });
      }
      if (!props.find(p => p.name === 'onChange')) {
        props.push({ name: 'onChange', type: 'function', required: false });
      }
    }

    if (tagName === 'button' || (tagName === 'a' && element.getAttribute('role') === 'button')) {
      if (!props.find(p => p.name === 'onClick')) {
        props.push({ name: 'onClick', type: 'function', required: false });
      }
    }

    // Extract text content as children prop
    const textContent = this.getDirectTextContent(element);
    if (textContent) {
      props.push({
        name: 'children',
        type: 'string',
        required: false,
        defaultValue: textContent,
      });
    }

    return props;
  }

  /**
   * Extract styles from element
   */
  private extractStyles(element: Element): ComponentStyles {
    const styles: ComponentStyles = {};

    if (!this.config.extractStyles) {
      return styles;
    }

    const className = element.className || '';
    const inlineStyle = element.getAttribute('style') || '';

    // Infer layout from classes
    if (/flex|d-flex/i.test(className)) {
      styles.layout = 'flex';
    } else if (/grid|d-grid/i.test(className)) {
      styles.layout = 'grid';
    } else if (/absolute|fixed|relative/i.test(className)) {
      styles.layout = 'absolute';
    }

    // Extract spacing from Tailwind-like classes
    const spacingMatch = className.match(/(?:p|m|gap)-(\d+)/);
    if (spacingMatch) {
      styles.spacing = parseInt(spacingMatch[1]) * 4; // Tailwind spacing scale
    }

    // Extract colors from inline styles
    const colors: string[] = [];
    const colorMatches = inlineStyle.match(/(?:background-color|color|border-color):\s*([^;]+)/gi);
    if (colorMatches) {
      for (const match of colorMatches) {
        const color = match.split(':')[1]?.trim();
        if (color) colors.push(color);
      }
    }

    // Extract colors from Tailwind classes
    const bgColorMatch = className.match(/bg-(\w+-\d+|\w+)/);
    if (bgColorMatch) {
      colors.push(`tailwind:${bgColorMatch[1]}`);
    }

    if (colors.length > 0) {
      styles.colors = colors;
    }

    return styles;
  }

  /**
   * Get direct text content (not from children)
   */
  private getDirectTextContent(element: Element): string {
    let text = '';
    const childNodes = Array.from(element.childNodes);
    for (const node of childNodes) {
      if (node.nodeType === 3) { // Text node
        text += node.textContent || '';
      }
    }
    return text.trim().slice(0, 100); // Limit length
  }

  /**
   * Check if class is a utility class (Tailwind, Bootstrap, etc.)
   */
  private isUtilityClass(className: string): boolean {
    const utilityPatterns = [
      /^(p|m|w|h|min|max|gap|space|text|font|bg|border|rounded|shadow|flex|grid|items|justify|self|col|row)-/,
      /^(sm|md|lg|xl|2xl):/,
      /^(hover|focus|active|disabled|dark):/,
      /^d-(flex|grid|block|inline|none)$/,
      /^(row|col)-\d+$/,
    ];

    return utilityPatterns.some(p => p.test(className));
  }

  /**
   * Infer prop type from value
   */
  private inferPropType(value: string): string {
    if (value === 'true' || value === 'false') return 'boolean';
    if (!isNaN(Number(value))) return 'number';
    if (value.startsWith('{') || value.startsWith('[')) return 'object';
    return 'string';
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^./, s => s.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Convert string to camelCase
   */
  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createHTMLParser(config?: HTMLParserConfig): HTMLParser {
  return new HTMLParser(config);
}
