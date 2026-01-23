/**
 * FORGE Mendix Integration - Style Converter
 * @epic 07 - Mendix Integration
 */

import { MendixIntegrationConfig, MendixCustomClass } from '../core/types';

export class StyleConverter {
  private config: MendixIntegrationConfig;

  constructor(config: MendixIntegrationConfig) {
    this.config = config;
  }

  generateSCSS(component: any): string {
    const lines: string[] = [`// Styles for ${component.name || 'component'}`, ''];
    const className = this.toClassName(component.name);

    lines.push(`.${className} {`);
    
    if (component.styles) {
      const css = this.stylesToCSS(component.styles);
      for (const [prop, value] of Object.entries(css)) {
        lines.push(`  ${prop}: ${value};`);
      }
    }

    if (component.layout) {
      const layoutCSS = this.layoutToCSS(component.layout);
      for (const [prop, value] of Object.entries(layoutCSS)) {
        lines.push(`  ${prop}: ${value};`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  extractVariables(component: any): Record<string, string> {
    const vars: Record<string, string> = {};
    
    if (component.styles?.fills?.[0]?.color) {
      const c = component.styles.fills[0].color;
      vars[`${this.toVarName(component.name)}-bg`] = this.rgbToHex(c.r, c.g, c.b);
    }

    if (component.styles?.typography?.color) {
      const c = component.styles.typography.color;
      vars[`${this.toVarName(component.name)}-text`] = this.rgbToHex(c.r, c.g, c.b);
    }

    return vars;
  }

  generateCustomClasses(component: any): MendixCustomClass[] {
    const classes: MendixCustomClass[] = [];
    const className = this.toClassName(component.name);

    if (component.styles || component.layout) {
      const cssProps: string[] = [];
      
      if (component.styles) {
        const css = this.stylesToCSS(component.styles);
        for (const [prop, value] of Object.entries(css)) {
          cssProps.push(`${prop}: ${value}`);
        }
      }

      if (cssProps.length > 0) {
        classes.push({
          name: className,
          definition: cssProps.join('; '),
        });
      }
    }

    return classes;
  }

  private stylesToCSS(styles: any): Record<string, string> {
    const css: Record<string, string> = {};

    if (styles.fills?.[0]) {
      const fill = styles.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        css['background-color'] = this.rgbToHex(fill.color.r, fill.color.g, fill.color.b);
      }
    }

    if (styles.strokes?.[0]) {
      const stroke = styles.strokes[0];
      const width = stroke.weight || 1;
      const color = stroke.color ? this.rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b) : '#000';
      css['border'] = `${width}px solid ${color}`;
    }

    if (styles.borderRadius !== undefined) {
      css['border-radius'] = `${styles.borderRadius}px`;
    }

    if (styles.opacity !== undefined && styles.opacity < 1) {
      css['opacity'] = styles.opacity.toString();
    }

    if (styles.typography) {
      const t = styles.typography;
      if (t.fontSize) css['font-size'] = `${t.fontSize}px`;
      if (t.fontWeight) css['font-weight'] = t.fontWeight.toString();
      if (t.lineHeight) css['line-height'] = `${t.lineHeight}px`;
      if (t.color) css['color'] = this.rgbToHex(t.color.r, t.color.g, t.color.b);
    }

    return css;
  }

  private layoutToCSS(layout: any): Record<string, string> {
    const css: Record<string, string> = {};

    if (layout.type === 'flex') {
      css['display'] = 'flex';
      if (layout.direction === 'vertical') css['flex-direction'] = 'column';
      if (layout.gap) css['gap'] = `${layout.gap}px`;
      if (layout.alignment?.main) css['justify-content'] = layout.alignment.main;
      if (layout.alignment?.cross) css['align-items'] = layout.alignment.cross;
    }

    if (layout.padding) {
      const p = layout.padding;
      css['padding'] = `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
    }

    return css;
  }

  private toClassName(name: string): string {
    return this.config.styleOptions.classPrefix + name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  }

  private toVarName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}

export default StyleConverter;
