/**
 * TextExtractor - Extract text content and typography
 *
 * Extracts text content, font properties, and text alignment.
 * Provides consistent text handling across all generators.
 *
 * Guided by Skills:
 * - forge-hierarchy-preservation.md: Text alignment on container
 * - forge-architectural-entropy.md: Single implementation for all generators
 */

import type { ParsedComponent } from '../../poc/types';

export interface ExtractedTypography {
  fontFamily: string;
  fontSize: number;
  fontWeight?: number;
  textAlign?: string;
  lineHeight?: number;
}

export class TextExtractor {
  /**
   * Extract text content from component
   *
   * @param component - ParsedComponent with text property
   * @returns Text content string or null
   */
  extractText(component: ParsedComponent): string | null {
    return component.text?.content || null;
  }

  /**
   * Extract typography information
   *
   * @param component - ParsedComponent with text property
   * @returns Typography object or null
   */
  extractTypography(component: ParsedComponent): ExtractedTypography | null {
    const text = component.text;
    if (!text) return null;

    return {
      fontFamily: text.fontFamily || 'Inter',
      fontSize: text.fontSize || 14,
      fontWeight: text.fontWeight,
      textAlign: text.textAlign,
      lineHeight: text.lineHeight,
    };
  }

  /**
   * Check if component is a text node
   *
   * A component is considered a text node if:
   * - type is 'text', OR
   * - has text content and no children (leaf text node)
   * - BUT NOT if it's an interactive element (button, input, etc.)
   *
   * @param component - ParsedComponent
   * @returns true if component is a text node
   */
  isTextNode(component: ParsedComponent): boolean {
    // Explicit text type
    if (component.type === 'text') {
      return true;
    }

    // Interactive elements are never text nodes
    const interactiveTypes = ['button', 'input', 'form', 'link'];
    if (interactiveTypes.includes(component.type)) {
      return false;
    }

    // Has text content and no children (leaf text node)
    const hasText = !!component.text?.content;
    const hasNoChildren = !component.children || component.children.length === 0;

    return hasText && hasNoChildren;
  }

  /**
   * Generate CSS font-family string
   *
   * SKILL: react-best-practices.md
   * Includes fallback fonts for performance and compatibility
   *
   * @param fontFamily - Font family name from Figma
   * @returns CSS font-family string with fallbacks
   */
  generateFontFamilyCSS(fontFamily: string): string {
    // Add quotes if font name has spaces
    const quoted = fontFamily.includes(' ') ? `'${fontFamily}'` : fontFamily;

    // Add system font fallbacks for performance
    return `${quoted}, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  }

  /**
   * Convert Figma text align to CSS text-align
   *
   * @param textAlign - Figma text align value
   * @returns CSS text-align value
   */
  convertTextAlign(textAlign?: string): string {
    if (!textAlign) return 'left';

    const align = textAlign.toLowerCase();

    // Map Figma values to CSS
    const alignMap: Record<string, string> = {
      left: 'left',
      center: 'center',
      right: 'right',
      justified: 'justify',
    };

    return alignMap[align] || 'left';
  }

  /**
   * Generate CSS line-height from Figma lineHeight
   *
   * @param lineHeight - Line height from Figma (in pixels)
   * @param fontSize - Font size from Figma (in pixels)
   * @returns CSS line-height value
   */
  generateLineHeight(lineHeight?: number, fontSize?: number): string {
    if (!lineHeight) return 'normal';

    // If both provided, calculate unitless value (preferred for accessibility)
    if (fontSize && fontSize > 0) {
      const ratio = lineHeight / fontSize;
      return ratio.toFixed(2);
    }

    // Otherwise return px value
    return `${lineHeight}px`;
  }

  /**
   * Check if text should not wrap
   *
   * SKILL: forge-hierarchy-preservation.md
   * Form labels and button text should not wrap
   *
   * @param component - ParsedComponent
   * @returns true if text should use nowrap
   */
  shouldPreventWrapping(component: ParsedComponent): boolean {
    // Prevent wrapping for text nodes
    return this.isTextNode(component);
  }

  /**
   * Extract text decoration styles (underline, strikethrough)
   * TODO: Implement when text decoration is added to ParsedComponent
   *
   * @param component - ParsedComponent
   * @returns CSS text-decoration value
   */
  extractTextDecoration(component: ParsedComponent): string | null {
    // Placeholder - text decoration not yet in ParsedComponent interface
    return null;
  }

  /**
   * Extract letter spacing
   * TODO: Implement when letter spacing is added to ParsedComponent
   *
   * @param component - ParsedComponent
   * @returns CSS letter-spacing value
   */
  extractLetterSpacing(component: ParsedComponent): string | null {
    // Placeholder - letter spacing not yet in ParsedComponent interface
    return null;
  }

  /**
   * Generate complete text styles object for React/CSS
   *
   * @param component - ParsedComponent with text
   * @returns Object with CSS properties
   */
  generateTextStylesObject(component: ParsedComponent): Record<string, string> {
    const typography = this.extractTypography(component);
    if (!typography) return {};

    const styles: Record<string, string> = {
      fontFamily: this.generateFontFamilyCSS(typography.fontFamily),
      fontSize: `${typography.fontSize}px`,
    };

    if (typography.fontWeight) {
      styles.fontWeight = `${typography.fontWeight}`;
    }

    if (typography.lineHeight && typography.fontSize) {
      styles.lineHeight = this.generateLineHeight(typography.lineHeight, typography.fontSize);
    }

    if (typography.textAlign) {
      styles.textAlign = this.convertTextAlign(typography.textAlign);
    }

    // Prevent wrapping for text nodes (SKILL: forge-hierarchy-preservation.md)
    if (this.shouldPreventWrapping(component)) {
      styles.whiteSpace = 'nowrap';
      styles.overflow = 'visible';
    }

    return styles;
  }

  /**
   * Generate inline CSS style string for text
   *
   * @param component - ParsedComponent with text
   * @returns CSS style string
   */
  generateTextStylesString(component: ParsedComponent): string {
    const styles = this.generateTextStylesObject(component);

    return Object.entries(styles)
      .map(([key, value]) => {
        // Convert camelCase to kebab-case
        const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${kebab}: ${value}`;
      })
      .join('; ');
  }

  /**
   * Truncate text with ellipsis
   * Useful for previews and long text handling
   *
   * @param text - Text content
   * @param maxLength - Maximum length before truncation
   * @returns Truncated text with ellipsis if needed
   */
  truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;

    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Escape text for HTML rendering
   * Prevents XSS vulnerabilities
   *
   * SKILL: react-best-practices.md (security)
   *
   * @param text - Text content
   * @returns HTML-escaped text
   */
  escapeHTML(text: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return text.replace(/[&<>"']/g, char => escapeMap[char] || char);
  }
}
