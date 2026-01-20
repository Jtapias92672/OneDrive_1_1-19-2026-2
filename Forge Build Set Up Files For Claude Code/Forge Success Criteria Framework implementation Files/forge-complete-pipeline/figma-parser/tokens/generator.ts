/**
 * FORGE Design Token Generator
 * 
 * @epic 05 - Figma Parser
 * @task 5.1 - Token Generation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Generates design tokens from extracted Figma styles.
 *   Exports to CSS variables, Tailwind config, and JSON formats.
 */

import {
  FigmaFile,
  FigmaNode,
  Paint,
  Color,
  TypeStyle,
  Effect,
  hasChildren,
} from '../types/figma-api';

// ============================================
// TYPES
// ============================================

export interface DesignTokens {
  /** Color tokens */
  colors: Record<string, ColorToken>;
  
  /** Typography tokens */
  typography: Record<string, TypographyToken>;
  
  /** Spacing tokens */
  spacing: Record<string, SpacingToken>;
  
  /** Border radius tokens */
  radii: Record<string, RadiusToken>;
  
  /** Shadow tokens */
  shadows: Record<string, ShadowToken>;
  
  /** Breakpoint tokens (if detected) */
  breakpoints?: Record<string, BreakpointToken>;
  
  /** Metadata */
  meta: {
    source: string;
    generatedAt: string;
    version: string;
  };
}

export interface ColorToken {
  name: string;
  value: string; // hex
  rgba: string;
  usage: string[];
}

export interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: string;
  letterSpacing: string;
  textTransform?: string;
}

export interface SpacingToken {
  name: string;
  value: string;
  pixels: number;
}

export interface RadiusToken {
  name: string;
  value: string;
  pixels: number;
}

export interface ShadowToken {
  name: string;
  value: string;
  type: 'drop' | 'inner';
}

export interface BreakpointToken {
  name: string;
  value: string;
  pixels: number;
}

export interface ExportOptions {
  /** Include source comments */
  includeComments?: boolean;
  
  /** Prefix for CSS variables */
  cssPrefix?: string;
  
  /** Use rem units instead of px */
  useRem?: boolean;
  
  /** Base font size for rem calculations */
  baseFontSize?: number;
}

// ============================================
// TOKEN GENERATOR
// ============================================

export class TokenGenerator {
  private colors = new Map<string, { hex: string; count: number; usage: string[] }>();
  private typography = new Map<string, { style: TypeStyle; count: number }>();
  private spacing = new Set<number>();
  private radii = new Set<number>();
  private shadows: Array<{ effect: Effect; name: string }> = [];

  /**
   * Generate design tokens from a Figma file
   */
  generate(file: FigmaFile): DesignTokens {
    // Reset state
    this.colors.clear();
    this.typography.clear();
    this.spacing.clear();
    this.radii.clear();
    this.shadows = [];
    
    // Walk the document
    this.walkNode(file.document, '');
    
    // Generate tokens
    return {
      colors: this.generateColorTokens(),
      typography: this.generateTypographyTokens(),
      spacing: this.generateSpacingTokens(),
      radii: this.generateRadiiTokens(),
      shadows: this.generateShadowTokens(),
      meta: {
        source: file.name,
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  }

  // ==========================================
  // TREE WALKING
  // ==========================================

  private walkNode(node: FigmaNode, path: string): void {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    
    // Extract colors from fills
    if (node.fills) {
      for (const fill of node.fills) {
        if (fill.visible !== false && fill.type === 'SOLID' && fill.color) {
          this.addColor(fill.color, currentPath);
        }
      }
    }
    
    // Extract colors from strokes
    if (node.strokes) {
      for (const stroke of node.strokes) {
        if (stroke.visible !== false && stroke.type === 'SOLID' && stroke.color) {
          this.addColor(stroke.color, `${currentPath}/stroke`);
        }
      }
    }
    
    // Extract typography
    if (node.style && node.type === 'TEXT') {
      this.addTypography(node.style);
    }
    
    // Extract spacing from padding and gaps
    if (node.paddingTop !== undefined) this.spacing.add(node.paddingTop);
    if (node.paddingRight !== undefined) this.spacing.add(node.paddingRight);
    if (node.paddingBottom !== undefined) this.spacing.add(node.paddingBottom);
    if (node.paddingLeft !== undefined) this.spacing.add(node.paddingLeft);
    if (node.itemSpacing !== undefined) this.spacing.add(node.itemSpacing);
    
    // Extract border radius
    if (node.cornerRadius !== undefined && node.cornerRadius > 0) {
      this.radii.add(node.cornerRadius);
    }
    if (node.rectangleCornerRadii) {
      for (const r of node.rectangleCornerRadii) {
        if (r > 0) this.radii.add(r);
      }
    }
    
    // Extract shadows
    if (node.effects) {
      for (const effect of node.effects) {
        if (effect.visible && (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW')) {
          this.shadows.push({ effect, name: node.name });
        }
      }
    }
    
    // Recurse
    if (hasChildren(node)) {
      for (const child of node.children) {
        this.walkNode(child, currentPath);
      }
    }
  }

  // ==========================================
  // DATA COLLECTION
  // ==========================================

  private addColor(color: Color, usage: string): void {
    const hex = this.colorToHex(color);
    const existing = this.colors.get(hex);
    
    if (existing) {
      existing.count++;
      if (!existing.usage.includes(usage)) {
        existing.usage.push(usage);
      }
    } else {
      this.colors.set(hex, { hex, count: 1, usage: [usage] });
    }
  }

  private addTypography(style: TypeStyle): void {
    const key = `${style.fontFamily}-${style.fontSize}-${style.fontWeight}`;
    const existing = this.typography.get(key);
    
    if (existing) {
      existing.count++;
    } else {
      this.typography.set(key, { style, count: 1 });
    }
  }

  // ==========================================
  // TOKEN GENERATION
  // ==========================================

  private generateColorTokens(): Record<string, ColorToken> {
    const tokens: Record<string, ColorToken> = {};
    
    // Sort colors by usage count
    const sortedColors = Array.from(this.colors.entries())
      .sort((a, b) => b[1].count - a[1].count);
    
    // Generate semantic names
    for (let i = 0; i < sortedColors.length; i++) {
      const [hex, data] = sortedColors[i];
      const name = this.generateColorName(hex, data.usage, i);
      
      tokens[name] = {
        name,
        value: hex,
        rgba: this.hexToRgba(hex),
        usage: data.usage.slice(0, 5), // Limit usage examples
      };
    }
    
    return tokens;
  }

  private generateTypographyTokens(): Record<string, TypographyToken> {
    const tokens: Record<string, TypographyToken> = {};
    
    // Sort by font size (largest first)
    const sortedTypo = Array.from(this.typography.entries())
      .sort((a, b) => b[1].style.fontSize - a[1].style.fontSize);
    
    const sizeNames = ['display', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body-lg', 'body', 'body-sm', 'caption', 'overline'];
    
    for (let i = 0; i < sortedTypo.length && i < sizeNames.length; i++) {
      const [_, data] = sortedTypo[i];
      const name = sizeNames[i];
      const style = data.style;
      
      tokens[name] = {
        name,
        fontFamily: `"${style.fontFamily}", sans-serif`,
        fontSize: `${style.fontSize}px`,
        fontWeight: style.fontWeight,
        lineHeight: this.calculateLineHeight(style),
        letterSpacing: this.calculateLetterSpacing(style),
        textTransform: this.mapTextCase(style.textCase),
      };
    }
    
    return tokens;
  }

  private generateSpacingTokens(): Record<string, SpacingToken> {
    const tokens: Record<string, SpacingToken> = {};
    
    // Sort spacing values
    const sortedSpacing = Array.from(this.spacing)
      .filter(s => s > 0)
      .sort((a, b) => a - b);
    
    // Generate scale names
    const scaleNames = ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24', '32', '40', '48', '64'];
    
    for (let i = 0; i < sortedSpacing.length; i++) {
      const pixels = sortedSpacing[i];
      const name = i < scaleNames.length ? scaleNames[i] : `${pixels}`;
      
      tokens[name] = {
        name,
        value: `${pixels}px`,
        pixels,
      };
    }
    
    return tokens;
  }

  private generateRadiiTokens(): Record<string, RadiusToken> {
    const tokens: Record<string, RadiusToken> = {};
    
    const sortedRadii = Array.from(this.radii).sort((a, b) => a - b);
    const radiusNames = ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];
    
    for (let i = 0; i < sortedRadii.length && i < radiusNames.length; i++) {
      const pixels = sortedRadii[i];
      const name = radiusNames[i + 1] || `r-${pixels}`; // Skip 'none'
      
      tokens[name] = {
        name,
        value: `${pixels}px`,
        pixels,
      };
    }
    
    // Always include none and full
    tokens['none'] = { name: 'none', value: '0', pixels: 0 };
    tokens['full'] = { name: 'full', value: '9999px', pixels: 9999 };
    
    return tokens;
  }

  private generateShadowTokens(): Record<string, ShadowToken> {
    const tokens: Record<string, ShadowToken> = {};
    
    // Dedupe shadows
    const uniqueShadows = new Map<string, { effect: Effect; name: string }>();
    
    for (const shadow of this.shadows) {
      const key = this.shadowToKey(shadow.effect);
      if (!uniqueShadows.has(key)) {
        uniqueShadows.set(key, shadow);
      }
    }
    
    const shadowNames = ['sm', 'md', 'lg', 'xl', '2xl', 'inner'];
    let i = 0;
    
    for (const [_, shadow] of uniqueShadows) {
      const name = shadow.effect.type === 'INNER_SHADOW' ? 'inner' : (shadowNames[i++] || `shadow-${i}`);
      
      tokens[name] = {
        name,
        value: this.effectToShadow(shadow.effect),
        type: shadow.effect.type === 'INNER_SHADOW' ? 'inner' : 'drop',
      };
    }
    
    return tokens;
  }

  // ==========================================
  // EXPORT FORMATS
  // ==========================================

  /**
   * Export tokens as CSS custom properties
   */
  exportCss(tokens: DesignTokens, options: ExportOptions = {}): string {
    const prefix = options.cssPrefix || '';
    const lines: string[] = [];
    
    lines.push('/* Design Tokens - Generated by FORGE */');
    lines.push(`:root {`);
    
    // Colors
    lines.push('  /* Colors */');
    for (const [name, token] of Object.entries(tokens.colors)) {
      lines.push(`  --${prefix}color-${name}: ${token.value};`);
    }
    
    // Typography
    lines.push('');
    lines.push('  /* Typography */');
    for (const [name, token] of Object.entries(tokens.typography)) {
      lines.push(`  --${prefix}font-size-${name}: ${token.fontSize};`);
      lines.push(`  --${prefix}font-weight-${name}: ${token.fontWeight};`);
      lines.push(`  --${prefix}line-height-${name}: ${token.lineHeight};`);
    }
    
    // Spacing
    lines.push('');
    lines.push('  /* Spacing */');
    for (const [name, token] of Object.entries(tokens.spacing)) {
      lines.push(`  --${prefix}spacing-${name}: ${token.value};`);
    }
    
    // Radii
    lines.push('');
    lines.push('  /* Border Radius */');
    for (const [name, token] of Object.entries(tokens.radii)) {
      lines.push(`  --${prefix}radius-${name}: ${token.value};`);
    }
    
    // Shadows
    lines.push('');
    lines.push('  /* Shadows */');
    for (const [name, token] of Object.entries(tokens.shadows)) {
      lines.push(`  --${prefix}shadow-${name}: ${token.value};`);
    }
    
    lines.push('}');
    
    return lines.join('\n');
  }

  /**
   * Export tokens as Tailwind config
   */
  exportTailwind(tokens: DesignTokens): object {
    return {
      theme: {
        extend: {
          colors: Object.fromEntries(
            Object.entries(tokens.colors).map(([name, token]) => [name, token.value])
          ),
          fontSize: Object.fromEntries(
            Object.entries(tokens.typography).map(([name, token]) => [
              name,
              [token.fontSize, { lineHeight: token.lineHeight, fontWeight: token.fontWeight.toString() }],
            ])
          ),
          spacing: Object.fromEntries(
            Object.entries(tokens.spacing).map(([name, token]) => [name, token.value])
          ),
          borderRadius: Object.fromEntries(
            Object.entries(tokens.radii).map(([name, token]) => [name, token.value])
          ),
          boxShadow: Object.fromEntries(
            Object.entries(tokens.shadows).map(([name, token]) => [name, token.value])
          ),
        },
      },
    };
  }

  /**
   * Export tokens as JSON
   */
  exportJson(tokens: DesignTokens): string {
    return JSON.stringify(tokens, null, 2);
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  private colorToHex(color: Color): string {
    const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }

  private hexToRgba(hex: string, alpha = 1): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private generateColorName(hex: string, usage: string[], index: number): string {
    // Try to infer name from usage
    const lowerUsage = usage.map(u => u.toLowerCase()).join(' ');
    
    if (lowerUsage.includes('primary')) return 'primary';
    if (lowerUsage.includes('secondary')) return 'secondary';
    if (lowerUsage.includes('accent')) return 'accent';
    if (lowerUsage.includes('background') || lowerUsage.includes('bg')) return `bg-${index}`;
    if (lowerUsage.includes('text') || lowerUsage.includes('label')) return `text-${index}`;
    if (lowerUsage.includes('border')) return `border-${index}`;
    if (lowerUsage.includes('error') || lowerUsage.includes('danger')) return 'error';
    if (lowerUsage.includes('success')) return 'success';
    if (lowerUsage.includes('warning')) return 'warning';
    if (lowerUsage.includes('info')) return 'info';
    
    // Fallback to generic name
    return `color-${index + 1}`;
  }

  private calculateLineHeight(style: TypeStyle): string {
    if (style.lineHeightUnit === 'PIXELS') {
      return `${style.lineHeightPx}px`;
    }
    const ratio = style.lineHeightPx / style.fontSize;
    return ratio.toFixed(2);
  }

  private calculateLetterSpacing(style: TypeStyle): string {
    if (style.letterSpacing === 0) return 'normal';
    const em = style.letterSpacing / style.fontSize;
    return `${em.toFixed(3)}em`;
  }

  private mapTextCase(textCase?: string): string | undefined {
    switch (textCase) {
      case 'UPPER': return 'uppercase';
      case 'LOWER': return 'lowercase';
      case 'TITLE': return 'capitalize';
      default: return undefined;
    }
  }

  private shadowToKey(effect: Effect): string {
    return `${effect.type}-${effect.radius}-${effect.offset?.x}-${effect.offset?.y}-${effect.spread}`;
  }

  private effectToShadow(effect: Effect): string {
    const x = effect.offset?.x ?? 0;
    const y = effect.offset?.y ?? 4;
    const blur = effect.radius;
    const spread = effect.spread ?? 0;
    const color = effect.color
      ? `rgba(${Math.round(effect.color.r * 255)}, ${Math.round(effect.color.g * 255)}, ${Math.round(effect.color.b * 255)}, ${effect.color.a.toFixed(2)})`
      : 'rgba(0, 0, 0, 0.25)';
    const inset = effect.type === 'INNER_SHADOW' ? 'inset ' : '';
    
    return `${inset}${x}px ${y}px ${blur}px ${spread}px ${color}`;
  }
}

// ============================================
// EXPORTS
// ============================================

export default TokenGenerator;
