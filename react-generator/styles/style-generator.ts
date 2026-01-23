/**
 * FORGE React Generator - Style Generator
 * 
 * @epic 06 - React Generator
 * @task 2.1 - Style Generation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Generates styles from Figma design data.
 *   Supports Tailwind, CSS Modules, styled-components, and more.
 */

import {
  ReactGeneratorConfig,
  GeneratedStyles,
  TailwindStyles,
  CSSStyles,
  StylingApproach,
} from '../core/types';

// ============================================
// STYLE GENERATOR
// ============================================

export class StyleGenerator {
  private config: ReactGeneratorConfig;

  constructor(config: ReactGeneratorConfig) {
    this.config = config;
  }

  // ==========================================
  // MAIN GENERATION
  // ==========================================

  /**
   * Generate styles for a frame based on configured approach
   */
  generate(frame: any): GeneratedStyles {
    switch (this.config.stylingApproach) {
      case 'tailwind':
        return { tailwind: this.generateTailwind(frame) };

      case 'css-modules':
      case 'vanilla':
      case 'sass':
        return { css: this.generateCSS(frame) };

      case 'styled-components':
      case 'emotion':
        return { styledTemplate: this.generateStyledTemplate(frame) };

      case 'inline':
        return { css: this.generateInlineStyles(frame) };

      default:
        return { tailwind: this.generateTailwind(frame) };
    }
  }

  // ==========================================
  // TAILWIND GENERATION
  // ==========================================

  private generateTailwind(frame: any): TailwindStyles {
    const base: string[] = [];
    const hover: string[] = [];
    const focus: string[] = [];
    const responsive: Record<string, string[]> = {};

    // Layout classes
    base.push(...this.layoutToTailwind(frame.layout));

    // Size classes
    base.push(...this.sizeToTailwind(frame.bounds));

    // Style classes
    if (frame.styles) {
      base.push(...this.stylesToTailwind(frame.styles));
    }

    // Typography classes
    if (frame.type === 'TEXT' && frame.styles?.typography) {
      base.push(...this.typographyToTailwind(frame.styles.typography));
    }

    // Semantic-based classes
    if (frame.semantic) {
      base.push(...this.semanticToTailwind(frame.semantic));
    }

    // Interactive states
    if (frame.interactions?.length > 0) {
      hover.push('cursor-pointer');
    }

    return {
      base: [...new Set(base)],
      hover: hover.length > 0 ? hover : undefined,
      focus: focus.length > 0 ? focus : undefined,
      responsive: Object.keys(responsive).length > 0 ? responsive : undefined,
    };
  }

  private layoutToTailwind(layout: any): string[] {
    if (!layout) return [];

    const classes: string[] = [];

    switch (layout.type) {
      case 'flex':
        classes.push('flex');
        if (layout.direction === 'vertical') {
          classes.push('flex-col');
        }
        if (layout.wrap) {
          classes.push('flex-wrap');
        }
        // Gap
        if (layout.gap) {
          classes.push(this.spacingToTailwind('gap', layout.gap));
        }
        // Alignment
        if (layout.alignment) {
          classes.push(this.alignmentToTailwind(layout.alignment));
        }
        break;

      case 'grid':
        classes.push('grid');
        if (layout.columns) {
          classes.push(`grid-cols-${layout.columns}`);
        }
        if (layout.gap) {
          classes.push(this.spacingToTailwind('gap', layout.gap));
        }
        break;

      case 'absolute':
        classes.push('absolute');
        break;

      default:
        classes.push('relative');
    }

    // Padding
    if (layout.padding) {
      const { top, right, bottom, left } = layout.padding;
      if (top === right && right === bottom && bottom === left) {
        classes.push(this.spacingToTailwind('p', top));
      } else if (top === bottom && left === right) {
        classes.push(this.spacingToTailwind('py', top));
        classes.push(this.spacingToTailwind('px', left));
      } else {
        if (top) classes.push(this.spacingToTailwind('pt', top));
        if (right) classes.push(this.spacingToTailwind('pr', right));
        if (bottom) classes.push(this.spacingToTailwind('pb', bottom));
        if (left) classes.push(this.spacingToTailwind('pl', left));
      }
    }

    return classes;
  }

  private sizeToTailwind(bounds: any): string[] {
    if (!bounds) return [];

    const classes: string[] = [];

    // Width
    if (bounds.width) {
      const widthClass = this.dimensionToTailwind('w', bounds.width);
      if (widthClass) classes.push(widthClass);
    }

    // Height
    if (bounds.height) {
      const heightClass = this.dimensionToTailwind('h', bounds.height);
      if (heightClass) classes.push(heightClass);
    }

    return classes;
  }

  private stylesToTailwind(styles: any): string[] {
    const classes: string[] = [];

    // Background
    if (styles.fills?.length > 0) {
      const fill = styles.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        const bgClass = this.colorToTailwind('bg', fill.color, fill.opacity);
        if (bgClass) classes.push(bgClass);
      }
    }

    // Border
    if (styles.strokes?.length > 0) {
      const stroke = styles.strokes[0];
      classes.push('border');
      if (stroke.weight && stroke.weight !== 1) {
        classes.push(`border-${stroke.weight}`);
      }
      if (stroke.color) {
        const borderClass = this.colorToTailwind('border', stroke.color);
        if (borderClass) classes.push(borderClass);
      }
    }

    // Border Radius
    if (styles.borderRadius !== undefined) {
      classes.push(this.radiusToTailwind(styles.borderRadius));
    }

    // Opacity
    if (styles.opacity !== undefined && styles.opacity < 1) {
      classes.push(`opacity-${Math.round(styles.opacity * 100)}`);
    }

    // Effects (shadows)
    if (styles.effects?.length > 0) {
      const shadow = styles.effects.find((e: any) => e.type === 'DROP_SHADOW');
      if (shadow) {
        classes.push(this.shadowToTailwind(shadow));
      }
    }

    return classes;
  }

  private typographyToTailwind(typography: any): string[] {
    const classes: string[] = [];

    // Font size
    if (typography.fontSize) {
      classes.push(this.fontSizeToTailwind(typography.fontSize));
    }

    // Font weight
    if (typography.fontWeight) {
      classes.push(this.fontWeightToTailwind(typography.fontWeight));
    }

    // Line height
    if (typography.lineHeight) {
      classes.push(this.lineHeightToTailwind(typography.lineHeight, typography.fontSize));
    }

    // Letter spacing
    if (typography.letterSpacing) {
      classes.push(this.letterSpacingToTailwind(typography.letterSpacing));
    }

    // Text color
    if (typography.color) {
      const colorClass = this.colorToTailwind('text', typography.color);
      if (colorClass) classes.push(colorClass);
    }

    // Text align
    if (typography.textAlign) {
      classes.push(`text-${typography.textAlign.toLowerCase()}`);
    }

    return classes;
  }

  private semanticToTailwind(semantic: any): string[] {
    const classes: string[] = [];

    switch (semantic.type) {
      case 'button':
        classes.push('inline-flex', 'items-center', 'justify-center');
        break;

      case 'input':
        classes.push('outline-none', 'focus:ring-2');
        break;

      case 'card':
        classes.push('overflow-hidden');
        break;

      case 'navigation':
        classes.push('flex', 'items-center');
        break;
    }

    return classes;
  }

  // ==========================================
  // TAILWIND UTILITY METHODS
  // ==========================================

  private spacingToTailwind(prefix: string, value: number): string {
    const spacing = this.pxToSpacing(value);
    return `${prefix}-${spacing}`;
  }

  private pxToSpacing(px: number): string {
    // Tailwind spacing scale
    const scale: Record<number, string> = {
      0: '0',
      1: 'px',
      2: '0.5',
      4: '1',
      6: '1.5',
      8: '2',
      10: '2.5',
      12: '3',
      14: '3.5',
      16: '4',
      20: '5',
      24: '6',
      28: '7',
      32: '8',
      36: '9',
      40: '10',
      44: '11',
      48: '12',
      56: '14',
      64: '16',
      80: '20',
      96: '24',
      112: '28',
      128: '32',
      144: '36',
      160: '40',
      176: '44',
      192: '48',
      208: '52',
      224: '56',
      240: '60',
      256: '64',
      288: '72',
      320: '80',
      384: '96',
    };

    // Find closest value
    const closest = Object.keys(scale)
      .map(Number)
      .reduce((prev, curr) => 
        Math.abs(curr - px) < Math.abs(prev - px) ? curr : prev
      );

    return scale[closest] || `[${px}px]`;
  }

  private dimensionToTailwind(prefix: string, value: number): string | null {
    // Check for common dimensions
    if (value === 0) return `${prefix}-0`;
    
    const fractions: Record<number, string> = {
      50: '1/2',
      33.33: '1/3',
      66.67: '2/3',
      25: '1/4',
      75: '3/4',
      20: '1/5',
      40: '2/5',
      60: '3/5',
      80: '4/5',
    };

    // Check for full width/height
    if (prefix === 'w' && value >= 1000) return 'w-full';
    if (prefix === 'h' && value >= 800) return 'h-full';

    // Use spacing scale or arbitrary value
    const spacing = this.pxToSpacing(value);
    return `${prefix}-${spacing}`;
  }

  private colorToTailwind(prefix: string, color: any, opacity?: number): string | null {
    if (!color) return null;

    // Convert to hex
    const hex = this.rgbaToHex(color.r, color.g, color.b);

    // Check for common Tailwind colors
    const tailwindColor = this.hexToTailwindColor(hex);
    if (tailwindColor) {
      const opacitySuffix = opacity !== undefined && opacity < 1 
        ? `/${Math.round(opacity * 100)}` 
        : '';
      return `${prefix}-${tailwindColor}${opacitySuffix}`;
    }

    // Use arbitrary value
    return `${prefix}-[${hex}]`;
  }

  private hexToTailwindColor(hex: string): string | null {
    const colors: Record<string, string> = {
      '#ffffff': 'white',
      '#000000': 'black',
      '#f8fafc': 'slate-50',
      '#f1f5f9': 'slate-100',
      '#e2e8f0': 'slate-200',
      '#cbd5e1': 'slate-300',
      '#94a3b8': 'slate-400',
      '#64748b': 'slate-500',
      '#475569': 'slate-600',
      '#334155': 'slate-700',
      '#1e293b': 'slate-800',
      '#0f172a': 'slate-900',
      '#fef2f2': 'red-50',
      '#fee2e2': 'red-100',
      '#fecaca': 'red-200',
      '#ef4444': 'red-500',
      '#dc2626': 'red-600',
      '#eff6ff': 'blue-50',
      '#dbeafe': 'blue-100',
      '#3b82f6': 'blue-500',
      '#2563eb': 'blue-600',
      '#1d4ed8': 'blue-700',
      '#f0fdf4': 'green-50',
      '#dcfce7': 'green-100',
      '#22c55e': 'green-500',
      '#16a34a': 'green-600',
    };

    return colors[hex.toLowerCase()] || null;
  }

  private rgbaToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const val = Math.round(n * 255);
      return val.toString(16).padStart(2, '0');
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private radiusToTailwind(radius: number | number[]): string {
    const value = Array.isArray(radius) ? radius[0] : radius;

    const radiusMap: Record<number, string> = {
      0: 'rounded-none',
      2: 'rounded-sm',
      4: 'rounded',
      6: 'rounded-md',
      8: 'rounded-lg',
      12: 'rounded-xl',
      16: 'rounded-2xl',
      24: 'rounded-3xl',
      9999: 'rounded-full',
    };

    // Find closest
    const closest = Object.keys(radiusMap)
      .map(Number)
      .reduce((prev, curr) => 
        Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
      );

    return radiusMap[closest] || `rounded-[${value}px]`;
  }

  private shadowToTailwind(shadow: any): string {
    // Simplified shadow mapping
    const blur = shadow.radius || 0;
    
    if (blur <= 2) return 'shadow-sm';
    if (blur <= 4) return 'shadow';
    if (blur <= 8) return 'shadow-md';
    if (blur <= 16) return 'shadow-lg';
    if (blur <= 24) return 'shadow-xl';
    return 'shadow-2xl';
  }

  private fontSizeToTailwind(size: number): string {
    const sizeMap: Record<number, string> = {
      12: 'text-xs',
      14: 'text-sm',
      16: 'text-base',
      18: 'text-lg',
      20: 'text-xl',
      24: 'text-2xl',
      30: 'text-3xl',
      36: 'text-4xl',
      48: 'text-5xl',
      60: 'text-6xl',
      72: 'text-7xl',
      96: 'text-8xl',
      128: 'text-9xl',
    };

    const closest = Object.keys(sizeMap)
      .map(Number)
      .reduce((prev, curr) => 
        Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
      );

    return sizeMap[closest] || `text-[${size}px]`;
  }

  private fontWeightToTailwind(weight: number): string {
    const weightMap: Record<number, string> = {
      100: 'font-thin',
      200: 'font-extralight',
      300: 'font-light',
      400: 'font-normal',
      500: 'font-medium',
      600: 'font-semibold',
      700: 'font-bold',
      800: 'font-extrabold',
      900: 'font-black',
    };

    return weightMap[weight] || 'font-normal';
  }

  private lineHeightToTailwind(lineHeight: number, fontSize?: number): string {
    if (!fontSize) return 'leading-normal';

    const ratio = lineHeight / fontSize;

    if (ratio <= 1) return 'leading-none';
    if (ratio <= 1.25) return 'leading-tight';
    if (ratio <= 1.375) return 'leading-snug';
    if (ratio <= 1.5) return 'leading-normal';
    if (ratio <= 1.625) return 'leading-relaxed';
    return 'leading-loose';
  }

  private letterSpacingToTailwind(spacing: number): string {
    if (spacing <= -0.05) return 'tracking-tighter';
    if (spacing <= -0.025) return 'tracking-tight';
    if (spacing === 0) return 'tracking-normal';
    if (spacing <= 0.025) return 'tracking-wide';
    if (spacing <= 0.05) return 'tracking-wider';
    return 'tracking-widest';
  }

  private alignmentToTailwind(alignment: { main?: string; cross?: string }): string {
    const classes: string[] = [];

    // Main axis (justify)
    switch (alignment.main) {
      case 'start': classes.push('justify-start'); break;
      case 'center': classes.push('justify-center'); break;
      case 'end': classes.push('justify-end'); break;
      case 'space-between': classes.push('justify-between'); break;
      case 'space-around': classes.push('justify-around'); break;
      case 'space-evenly': classes.push('justify-evenly'); break;
    }

    // Cross axis (items)
    switch (alignment.cross) {
      case 'start': classes.push('items-start'); break;
      case 'center': classes.push('items-center'); break;
      case 'end': classes.push('items-end'); break;
      case 'stretch': classes.push('items-stretch'); break;
      case 'baseline': classes.push('items-baseline'); break;
    }

    return classes.join(' ');
  }

  // ==========================================
  // CSS GENERATION
  // ==========================================

  private generateCSS(frame: any): CSSStyles {
    const properties: Record<string, string> = {};

    // Layout
    if (frame.layout) {
      Object.assign(properties, this.layoutToCSS(frame.layout));
    }

    // Size
    if (frame.bounds) {
      if (frame.bounds.width) properties['width'] = `${frame.bounds.width}px`;
      if (frame.bounds.height) properties['height'] = `${frame.bounds.height}px`;
    }

    // Styles
    if (frame.styles) {
      Object.assign(properties, this.stylesToCSS(frame.styles));
    }

    // Typography
    if (frame.type === 'TEXT' && frame.styles?.typography) {
      Object.assign(properties, this.typographyToCSS(frame.styles.typography));
    }

    return { properties };
  }

  private layoutToCSS(layout: any): Record<string, string> {
    const css: Record<string, string> = {};

    switch (layout.type) {
      case 'flex':
        css['display'] = 'flex';
        if (layout.direction === 'vertical') {
          css['flex-direction'] = 'column';
        }
        if (layout.wrap) {
          css['flex-wrap'] = 'wrap';
        }
        if (layout.gap) {
          css['gap'] = `${layout.gap}px`;
        }
        if (layout.alignment?.main) {
          css['justify-content'] = layout.alignment.main;
        }
        if (layout.alignment?.cross) {
          css['align-items'] = layout.alignment.cross;
        }
        break;

      case 'grid':
        css['display'] = 'grid';
        if (layout.columns) {
          css['grid-template-columns'] = `repeat(${layout.columns}, 1fr)`;
        }
        if (layout.gap) {
          css['gap'] = `${layout.gap}px`;
        }
        break;

      case 'absolute':
        css['position'] = 'absolute';
        break;

      default:
        css['position'] = 'relative';
    }

    // Padding
    if (layout.padding) {
      const { top, right, bottom, left } = layout.padding;
      css['padding'] = `${top}px ${right}px ${bottom}px ${left}px`;
    }

    return css;
  }

  private stylesToCSS(styles: any): Record<string, string> {
    const css: Record<string, string> = {};

    // Background
    if (styles.fills?.length > 0) {
      const fill = styles.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        const hex = this.rgbaToHex(fill.color.r, fill.color.g, fill.color.b);
        css['background-color'] = fill.opacity !== undefined && fill.opacity < 1
          ? `${hex}${Math.round(fill.opacity * 255).toString(16).padStart(2, '0')}`
          : hex;
      }
    }

    // Border
    if (styles.strokes?.length > 0) {
      const stroke = styles.strokes[0];
      const width = stroke.weight || 1;
      const color = stroke.color 
        ? this.rgbaToHex(stroke.color.r, stroke.color.g, stroke.color.b)
        : '#000000';
      css['border'] = `${width}px solid ${color}`;
    }

    // Border Radius
    if (styles.borderRadius !== undefined) {
      const radius = Array.isArray(styles.borderRadius) 
        ? styles.borderRadius.join('px ') + 'px'
        : `${styles.borderRadius}px`;
      css['border-radius'] = radius;
    }

    // Opacity
    if (styles.opacity !== undefined && styles.opacity < 1) {
      css['opacity'] = styles.opacity.toString();
    }

    // Effects (shadows)
    if (styles.effects?.length > 0) {
      const shadows = styles.effects
        .filter((e: any) => e.type === 'DROP_SHADOW')
        .map((s: any) => {
          const color = s.color 
            ? `rgba(${Math.round(s.color.r * 255)}, ${Math.round(s.color.g * 255)}, ${Math.round(s.color.b * 255)}, ${s.color.a || 1})`
            : 'rgba(0, 0, 0, 0.25)';
          return `${s.offset?.x || 0}px ${s.offset?.y || 0}px ${s.radius || 0}px ${s.spread || 0}px ${color}`;
        });
      
      if (shadows.length > 0) {
        css['box-shadow'] = shadows.join(', ');
      }
    }

    return css;
  }

  private typographyToCSS(typography: any): Record<string, string> {
    const css: Record<string, string> = {};

    if (typography.fontFamily) css['font-family'] = typography.fontFamily;
    if (typography.fontSize) css['font-size'] = `${typography.fontSize}px`;
    if (typography.fontWeight) css['font-weight'] = typography.fontWeight.toString();
    if (typography.lineHeight) css['line-height'] = `${typography.lineHeight}px`;
    if (typography.letterSpacing) css['letter-spacing'] = `${typography.letterSpacing}em`;
    if (typography.textAlign) css['text-align'] = typography.textAlign.toLowerCase();

    if (typography.color) {
      css['color'] = this.rgbaToHex(typography.color.r, typography.color.g, typography.color.b);
    }

    return css;
  }

  private generateInlineStyles(frame: any): CSSStyles {
    return this.generateCSS(frame);
  }

  // ==========================================
  // CSS MODULE GENERATION
  // ==========================================

  generateCSSModule(styles: GeneratedStyles): string {
    const css = styles.css;
    if (!css) return '';

    const lines: string[] = ['.root {'];

    for (const [prop, value] of Object.entries(css.properties)) {
      lines.push(`  ${prop}: ${value};`);
    }

    lines.push('}');

    return lines.join('\n');
  }

  // ==========================================
  // SCSS GENERATION
  // ==========================================

  generateSCSS(styles: GeneratedStyles): string {
    const css = styles.css;
    if (!css) return '';

    // SCSS is similar to CSS Module for basic cases
    return this.generateCSSModule(styles);
  }

  // ==========================================
  // VANILLA CSS GENERATION
  // ==========================================

  generateVanillaCSS(styles: GeneratedStyles, selector: string): string {
    const css = styles.css;
    if (!css) return '';

    const lines: string[] = [`${selector} {`];

    for (const [prop, value] of Object.entries(css.properties)) {
      lines.push(`  ${prop}: ${value};`);
    }

    lines.push('}');

    return lines.join('\n');
  }

  // ==========================================
  // STYLED-COMPONENTS GENERATION
  // ==========================================

  private generateStyledTemplate(frame: any): string {
    const css = this.generateCSS(frame);
    
    const cssString = Object.entries(css.properties)
      .map(([prop, value]) => `  ${prop}: ${value};`)
      .join('\n');

    return `const Container = styled.div\`
${cssString}
\`;`;
  }

  // ==========================================
  // PUBLIC ACCESSORS
  // ==========================================

  /**
   * Get Tailwind classes as a string
   */
  getTailwindClasses(styles: GeneratedStyles): string {
    if (!styles.tailwind) return '';

    const classes = [...styles.tailwind.base];

    if (styles.tailwind.hover) {
      classes.push(...styles.tailwind.hover.map(c => `hover:${c}`));
    }

    if (styles.tailwind.focus) {
      classes.push(...styles.tailwind.focus.map(c => `focus:${c}`));
    }

    if (styles.tailwind.responsive) {
      for (const [breakpoint, bpClasses] of Object.entries(styles.tailwind.responsive)) {
        classes.push(...bpClasses.map(c => `${breakpoint}:${c}`));
      }
    }

    return classes.join(' ');
  }
}

// ============================================
// EXPORTS
// ============================================

export default StyleGenerator;
