/**
 * StyleExtractor - Extract style information from ParsedComponent
 *
 * Extracts fills (colors), strokes (borders), effects (shadows), and text styles
 * into CSS-compatible format. Single source of truth for style extraction.
 *
 * Guided by Skills:
 * - forge-architectural-entropy.md: Prevents duplication across generators
 * - react-best-practices.md: Generates performance-optimized styles
 */

import type { ParsedComponent } from '../../poc/types';

export interface ExtractedTextStyles {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  textAlign: string;
}

export class StyleExtractor {
  /**
   * Extract background color from fills array
   * Used for containers, shapes, buttons, etc.
   *
   * @param fills - Array of fill objects from ParsedComponent
   * @returns CSS color string (rgba) or null if no solid fill
   */
  extractFillColor(component: ParsedComponent): string | null {
    const fills = component.fills;
    if (!fills || fills.length === 0) return null;

    // Find first SOLID fill with color
    const solidFill = fills.find(f => f.type === 'SOLID' && f.color);
    if (!solidFill?.color) return null;

    const { r, g, b, a } = solidFill.color;
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  }

  /**
   * Extract text color from TEXT nodes
   * Per Figma API: Text color is in fills array, NOT text.color property
   *
   * @param component - ParsedComponent (should be TEXT type)
   * @returns CSS color string (rgba) or null if no color (inherit from parent)
   */
  extractTextColor(component: ParsedComponent): string | null {
    // Text color comes from fills array (first SOLID fill)
    if (component.fills && component.fills.length > 0) {
      const solidFill = component.fills.find(f => f.type === 'SOLID' && f.color);
      if (solidFill?.color) {
        const { r, g, b, a } = solidFill.color;
        return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
      }
    }

    // No color found - inherit from parent
    return null;
  }

  /**
   * Extract stroke styles for borders
   * Used for icons, shapes, containers with borders
   *
   * @param strokes - Array of stroke objects from ParsedComponent
   * @returns Array of CSS border strings
   */
  extractStrokeStyles(component: ParsedComponent): string[] {
    const strokes = component.strokes;
    if (!strokes || strokes.length === 0) return [];

    const stroke = strokes.find(s => s.type === 'SOLID' && s.color);
    if (!stroke?.color) return [];

    const { r, g, b, a } = stroke.color;
    const color = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
    const weight = stroke.weight || 1;

    return [`border: ${weight}px solid ${color}`];
  }

  /**
   * Extract all fill colors (for gradients, multiple fills)
   * Returns array of colors for advanced use cases
   *
   * @param fills - Array of fill objects
   * @returns Array of CSS color strings
   */
  extractAllFillColors(fills?: ParsedComponent['fills']): string[] {
    if (!fills || fills.length === 0) return [];

    return fills
      .filter(f => f.type === 'SOLID' && f.color)
      .map(f => {
        const c = f.color!;
        const r = Math.round(c.r * 255);
        const g = Math.round(c.g * 255);
        const b = Math.round(c.b * 255);
        return `rgba(${r}, ${g}, ${b}, ${c.a})`;
      });
  }

  /**
   * Extract text styles (typography)
   * Returns complete typography object for text rendering
   *
   * @param component - ParsedComponent with text property
   * @returns Typography styles or null if no text
   */
  extractTextStyles(component: ParsedComponent): ExtractedTextStyles | null {
    const text = component.text;
    if (!text) return null;

    return {
      fontFamily: text.fontFamily
        ? `'${text.fontFamily}', Inter, -apple-system, sans-serif`
        : 'Inter, -apple-system, sans-serif',
      fontSize: text.fontSize ? `${text.fontSize}px` : '14px',
      fontWeight: text.fontWeight ? `${text.fontWeight}` : '400',
      lineHeight: text.lineHeight ? `${text.lineHeight}px` : 'normal',
      textAlign: text.textAlign ? text.textAlign.toLowerCase() : 'left',
    };
  }

  /**
   * Extract effect styles (shadows, blur, etc.)
   * TODO: Implement when effects are added to ParsedComponent interface
   *
   * @param component - ParsedComponent
   * @returns Array of CSS effect strings
   */
  extractEffectStyles(component: ParsedComponent): string[] {
    // Placeholder - effects not yet in ParsedComponent interface
    // Will be implemented when effects property is added
    return [];
  }

  /**
   * Extract IMAGE fill URL
   * Some components use background images instead of nested <img> tags
   *
   * @param component - ParsedComponent
   * @returns Image URL or null
   */
  extractImageFillUrl(component: ParsedComponent): string | null {
    const fills = component.fills;
    if (!fills || fills.length === 0) return null;

    const imageFill = fills.find(f => f.type === 'IMAGE' && f.imageUrl);
    return imageFill?.imageUrl ?? null;
  }

  /**
   * Generate complete CSS styles for container element
   * Combines all extracted styles into single CSS string
   *
   * Applies Skills:
   * - forge-vector-containers.md: Handles ghost images (empty icons)
   * - forge-hierarchy-preservation.md: Text alignment on container
   *
   * @param component - ParsedComponent
   * @param isTextNode - Whether this is a TEXT node
   * @param isIconNode - Whether this is an ICON node
   * @param hasImageUrl - Whether component has imageUrl
   * @returns CSS style string
   */
  generateContainerStyles(
    component: ParsedComponent,
    isTextNode: boolean,
    isIconNode: boolean,
    hasImageUrl: boolean
  ): string {
    const fillColor = isTextNode ? null : this.extractFillColor(component);
    const strokeStyles = this.extractStrokeStyles(component);
    const imageUrl_fill = this.extractImageFillUrl(component);

    const styles: string[] = [];

    // Background image (IMAGE fills)
    if (imageUrl_fill) {
      styles.push(`background-image: url('${imageUrl_fill}')`);
      styles.push('background-size: cover');
      styles.push('background-position: center');
    }

    // Background color (skip for text nodes, image fills, and empty icons)
    if (!isTextNode && !imageUrl_fill && fillColor && !(isIconNode && !hasImageUrl)) {
      styles.push(`background-color: ${fillColor}`);
    }

    // Borders (SKILL: Skip for empty icons to prevent ghost images)
    if (!(isIconNode && !hasImageUrl)) {
      styles.push(...strokeStyles);
    }

    // Hide empty icons completely (SKILL: forge-vector-containers.md)
    if (isIconNode && !hasImageUrl) {
      styles.push('opacity: 0');
    }

    // Text wrapping control (SKILL: forge-hierarchy-preservation.md)
    if (isTextNode) {
      styles.push('white-space: nowrap');
      styles.push('overflow: visible');
    }

    // Text alignment on container (SKILL: forge-hierarchy-preservation.md)
    const text = component.text;
    if (text?.textAlign) {
      styles.push(`text-align: ${text.textAlign.toLowerCase()}`);
    }

    // Base layout styles
    styles.push('position: relative');
    styles.push('box-sizing: border-box');

    return styles.filter(Boolean).join('; ');
  }

  /**
   * Generate CSS styles for inline text element (span)
   * Separate from container styles to allow text-align on container
   *
   * @param component - ParsedComponent (TEXT type)
   * @returns CSS style string for text span
   */
  generateTextStyles(component: ParsedComponent): string {
    const textStyles = this.extractTextStyles(component);
    const textColor = this.extractTextColor(component);

    if (!textStyles) return '';

    const styles: string[] = [
      `font-size: ${textStyles.fontSize}`,
      `font-family: ${textStyles.fontFamily}`,
      `font-weight: ${textStyles.fontWeight}`,
    ];

    // Add color if specified, otherwise inherit
    if (textColor) {
      styles.push(`color: ${textColor}`);
    } else {
      styles.push('color: inherit');
    }

    return styles.join('; ');
  }
}
