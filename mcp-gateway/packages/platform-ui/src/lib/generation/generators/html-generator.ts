/**
 * HTMLGenerator - Generate static HTML from Figma design
 *
 * Refactored from orchestrator.ts to use unified extraction layer.
 * Maintains identical output to original implementation (backward compatible).
 *
 * Guided by Skills:
 * - forge-vector-containers.md: Logos render as single image
 * - forge-hierarchy-preservation.md: Recursive rendering with relative positioning
 * - forge-architectural-entropy.md: Uses shared extractors (no duplication)
 */

import type { ParsedComponent } from '../../poc/types';
import {
  StyleExtractor,
  ImageResolver,
  LayoutCalculator,
  TextExtractor,
} from '../extractors';

export interface HTMLGeneratorOptions {
  /**
   * Maximum recursion depth for component tree
   * Default: 50
   */
  maxDepth?: number;
}

export class HTMLGenerator {
  private styleExtractor: StyleExtractor;
  private imageResolver: ImageResolver;
  private layoutCalculator: LayoutCalculator;
  private textExtractor: TextExtractor;

  constructor(private options: HTMLGeneratorOptions = {}) {
    this.styleExtractor = new StyleExtractor();
    this.imageResolver = new ImageResolver();
    this.layoutCalculator = new LayoutCalculator();
    this.textExtractor = new TextExtractor();

    // Set defaults
    this.options.maxDepth = options.maxDepth || 50;
  }

  /**
   * Render component tree recursively preserving hierarchy
   *
   * SKILL: forge-hierarchy-preservation.md
   * Maintains parent-relative positioning and recursive structure
   *
   * @param component - Component to render
   * @param depth - Current recursion depth
   * @returns HTML string
   */
  renderComponentTree(component: ParsedComponent, depth: number = 0): string {
    // Safety: prevent infinite recursion
    if (depth > this.options.maxDepth!) {
      console.warn(`Max render depth reached for component: ${component.name}`);
      return `<div><!-- Max depth reached --></div>`;
    }

    const { bounds, fills, strokes, text, children, type, imageUrl } = component;
    const textContent = text?.content || '';

    // Determine node types using extractors
    const isTextNode = this.textExtractor.isTextNode(component);
    const isIconNode = this.imageResolver.isIcon(component);
    const isImageNode = this.imageResolver.isImage(component);
    // Vector containers (logos) - use ImageResolver
    const isVectorContainer = type === 'container' && imageUrl;

    // Debug logging for icons (maintain original behavior)
    if (isIconNode) {
      console.log(`[renderComponentTree] Icon "${component.name}": type=${type}, imageUrl=${imageUrl ? 'SET' : 'MISSING'}`);
    }
    if (isVectorContainer) {
      console.log(`[renderComponentTree] Vector container (logo) "${component.name}": rendering as single image`);
    }

    // Extract colors and styles using extractors
    const fillColor = isTextNode ? null : this.styleExtractor.extractFillColor(component);
    const textColor = isTextNode ? this.styleExtractor.extractTextColor(component) : null;
    const strokeStyles = !isTextNode ? this.styleExtractor.extractStrokeStyles(component) : [];

    // Check for IMAGE fill with URL
    const imageUrl_fill = this.styleExtractor.extractImageFillUrl(component);

    if (imageUrl_fill) {
      console.log('[renderComponentTree] Rendering IMAGE fill for:', component.name, imageUrl_fill);
    }

    // Base styles for container
    const containerStyles = [
      bounds ? `width: ${bounds.width}px` : '',
      bounds ? `height: ${bounds.height}px` : '',
      // Use background image for IMAGE fills, otherwise use background color
      imageUrl_fill ? `background-image: url('${imageUrl_fill}')` : '',
      imageUrl_fill ? `background-size: cover` : '',
      imageUrl_fill ? `background-position: center` : '',
      // Background color for icons and containers (skip for text nodes, image fills, and empty icons)
      !isTextNode && !imageUrl_fill && fillColor && !(isIconNode && !imageUrl) ? `background-color: ${fillColor}` : '',
      // Only add stroke/border if NOT an empty icon (ghost image fix)
      // Icons without imageUrl should be invisible, not show borders
      ...(isIconNode && !imageUrl ? [] : strokeStyles),
      // Hide empty icons completely (prevents ghost images on buttons)
      isIconNode && !imageUrl ? 'opacity: 0' : '',
      // Prevent text wrapping in labels (form field text wrapping issue)
      isTextNode ? 'white-space: nowrap' : '',
      isTextNode ? 'overflow: visible' : '',
      // text-align must be on container div, not inline span
      text?.textAlign ? `text-align: ${text.textAlign.toLowerCase()}` : '',
      'position: relative',
      'box-sizing: border-box',
    ].filter(Boolean).join('; ');

    // Text styles (for inline span element)
    const textStyles = this.generateTextStyles(component, isTextNode, textColor);

    // Render children recursively
    const childrenHtml = this.renderChildren(component, bounds, depth);

    // Render image nodes as <img> tags
    if (isImageNode && imageUrl) {
      return this.renderImageElement(component, containerStyles, childrenHtml, 'cover');
    }

    // Render icon nodes with imageUrl (vectors exported as SVG)
    if (isIconNode && imageUrl) {
      return this.renderImageElement(component, containerStyles, childrenHtml, 'contain');
    }

    // Render vector containers (logos) as single image
    if (isVectorContainer) {
      return this.renderVectorContainer(component, containerStyles);
    }

    // Render placeholder for images without URL
    if (isImageNode && !imageUrl) {
      return this.renderImagePlaceholder(component, containerStyles, childrenHtml);
    }

    // Default rendering for other nodes
    return `
    <div class="figma-component" data-name="${component.name}" data-type="${type}" style="${containerStyles}">
      ${textContent ? `<span style="${textStyles}">${textContent}</span>` : ''}
      ${childrenHtml}
    </div>`;
  }

  /**
   * Generate text styles for inline span element
   */
  private generateTextStyles(component: ParsedComponent, isTextNode: boolean, textColor: string | null): string {
    const text = component.text;

    const textStyles = [
      text?.fontSize ? `font-size: ${text.fontSize}px` : '',
      text?.fontFamily ? `font-family: '${text.fontFamily}', Inter, -apple-system, sans-serif` : 'font-family: Inter, -apple-system, sans-serif',
      text?.fontWeight ? `font-weight: ${text.fontWeight}` : '',
      // Use extractTextColor() for TEXT nodes, inherit if no color specified
      isTextNode && textColor ? `color: ${textColor}` : (isTextNode ? 'color: inherit' : ''),
    ].filter(Boolean).join('; ');

    return textStyles;
  }

  /**
   * Render children recursively with relative positioning
   *
   * SKILL: forge-hierarchy-preservation.md
   * Children positioned relative to parent bounds
   */
  private renderChildren(component: ParsedComponent, bounds: ParsedComponent['bounds'], depth: number): string {
    const children = component.children;

    if (!Array.isArray(children) || children.length === 0) {
      return '';
    }

    return children.map(child => {
      if (typeof child === 'string') return ''; // Skip string IDs

      const childBounds = child.bounds;
      if (!childBounds || !bounds) return this.renderComponentTree(child, depth + 1);

      // Calculate relative position (SKILL: forge-hierarchy-preservation.md)
      const relativeX = childBounds.x - bounds.x;
      const relativeY = childBounds.y - bounds.y;

      return `
          <div style="position: absolute; left: ${relativeX}px; top: ${relativeY}px;">
            ${this.renderComponentTree(child, depth + 1)}
          </div>`;
    }).join('\n');
  }

  /**
   * Render image element (image or icon with URL)
   */
  private renderImageElement(
    component: ParsedComponent,
    containerStyles: string,
    childrenHtml: string,
    objectFit: 'cover' | 'contain'
  ): string {
    const imgStyles = [
      'width: 100%',
      'height: 100%',
      `object-fit: ${objectFit}`,
    ].join('; ');

    return `
    <div class="figma-component" data-name="${component.name}" data-type="${component.type}" style="${containerStyles}">
      <img src="${component.imageUrl}" alt="${component.name}" style="${imgStyles}" />
      ${childrenHtml}
    </div>`;
  }

  /**
   * Render vector container (logo) as single image
   *
   * SKILL: forge-vector-containers.md
   * Prevents 50+ individual vector fragments
   */
  private renderVectorContainer(component: ParsedComponent, containerStyles: string): string {
    const imgStyles = [
      'width: 100%',
      'height: 100%',
      'object-fit: contain',
    ].join('; ');

    return `
    <div class="figma-component" data-name="${component.name}" data-type="logo" style="${containerStyles}">
      <img src="${component.imageUrl}" alt="${component.name}" style="${imgStyles}" />
    </div>`;
  }

  /**
   * Render placeholder for images without URL
   */
  private renderImagePlaceholder(
    component: ParsedComponent,
    containerStyles: string,
    childrenHtml: string
  ): string {
    return `
    <div class="figma-component" data-name="${component.name}" data-type="${component.type}" style="${containerStyles}">
      <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #999;">
        [Image: ${component.name}]
      </div>
      ${childrenHtml}
    </div>`;
  }
}
