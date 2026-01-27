/**
 * Mendix Generator
 * Epic 11: External Integrations - Phase 4
 *
 * Generates Mendix-compatible XML pages and widgets from parsed Figma designs.
 */

import { ParsedComponent, ParsedDesign } from '../integrations/figma/parsed-types';
import {
  MendixPageConfig,
  MendixWidgetConfig,
  MendixStyleConfig,
  generatePageXml,
  generateThemeScss,
} from './mendix-templates';
import { rgbToHex } from './color-utils';

export interface MendixOutput {
  pages: MendixPageFile[];
  widgets: MendixWidgetFile[];
  styles: MendixStyleFile;
}

export interface MendixPageFile {
  name: string;
  fileName: string;
  content: string;
}

export interface MendixWidgetFile {
  name: string;
  fileName: string;
  content: string;
}

export interface MendixStyleFile {
  fileName: string;
  content: string;
}

export interface MendixGeneratorOptions {
  /** Module name for Mendix project */
  moduleName?: string;
  /** Default layout to use */
  layoutName?: string;
  /** Generate individual widget files */
  splitWidgets?: boolean;
}

const DEFAULT_OPTIONS: MendixGeneratorOptions = {
  moduleName: 'Generated',
  layoutName: 'Atlas_Default',
  splitWidgets: false,
};

export class MendixGenerator {
  private options: MendixGeneratorOptions;
  private collectedStyles: MendixStyleConfig[] = [];

  constructor(options: Partial<MendixGeneratorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate Mendix output from a parsed design
   */
  generate(design: ParsedDesign): MendixOutput {
    this.collectedStyles = [];

    const pages: MendixPageFile[] = [];
    const widgets: MendixWidgetFile[] = [];

    // Generate a page for each top-level component
    for (const component of design.components) {
      const page = this.generatePage(component, design.name);
      pages.push(page);

      // Optionally generate separate widget files
      if (this.options.splitWidgets) {
        const widgetFiles = this.generateWidgetFiles(component);
        widgets.push(...widgetFiles);
      }
    }

    // Generate theme SCSS
    const styles = this.generateStyles();

    return { pages, widgets, styles };
  }

  /**
   * Generate a Mendix page from a component
   */
  private generatePage(component: ParsedComponent, designName: string): MendixPageFile {
    const pageName = this.sanitizeName(component.name);
    const widgets = this.convertToWidgets(component);

    const pageConfig: MendixPageConfig = {
      name: `${this.options.moduleName}.${pageName}`,
      title: component.name,
      layoutName: this.options.layoutName,
      widgets,
    };

    const content = generatePageXml(pageConfig);

    return {
      name: pageName,
      fileName: `${pageName}.page.xml`,
      content,
    };
  }

  /**
   * Convert parsed component to Mendix widget config
   */
  private convertToWidgets(component: ParsedComponent): MendixWidgetConfig[] {
    const widget = this.componentToWidget(component);
    return [widget];
  }

  /**
   * Convert a single component to a widget
   */
  private componentToWidget(component: ParsedComponent): MendixWidgetConfig {
    const widgetType = this.inferWidgetType(component);
    const styles = this.extractStyles(component);

    // Collect styles for theme generation
    if (styles.class) {
      this.collectedStyles.push(styles);
    }

    const widget: MendixWidgetConfig = {
      id: component.id,
      name: this.sanitizeName(component.name),
      type: widgetType,
      properties: this.extractProperties(component),
      styles,
      children: component.children.map((child) => this.componentToWidget(child)),
    };

    return widget;
  }

  /**
   * Infer Mendix widget type from parsed component
   */
  private inferWidgetType(component: ParsedComponent): MendixWidgetConfig['type'] {
    // Check by type first
    if (component.type === 'TEXT') {
      // Check if it looks like a button
      if (component.name.toLowerCase().includes('button')) {
        return 'Button';
      }
      return 'Text';
    }

    // Check by name patterns
    const nameLower = component.name.toLowerCase();
    if (nameLower.includes('button') || nameLower.includes('btn')) {
      return 'Button';
    }
    if (nameLower.includes('image') || nameLower.includes('icon')) {
      return 'Image';
    }
    if (nameLower.includes('list')) {
      return 'ListView';
    }

    // Default to Container
    return 'Container';
  }

  /**
   * Extract properties from component
   */
  private extractProperties(component: ParsedComponent): Record<string, string | number | boolean> {
    const props: Record<string, string | number | boolean> = {};

    // Extract text content
    if (component.text) {
      props.content = component.text.content;
    }

    // Extract dimensions
    props.width = component.bounds.width;
    props.height = component.bounds.height;

    return props;
  }

  /**
   * Extract styles from component for SCSS generation
   */
  private extractStyles(component: ParsedComponent): MendixStyleConfig {
    const styles: MendixStyleConfig = {};

    // Generate unique class name
    const className = `gen-${this.sanitizeName(component.name).toLowerCase()}`;
    styles.class = className;

    // Background color
    if (component.fills.length > 0 && component.fills[0].color) {
      styles.backgroundColor = rgbToHex(component.fills[0].color);
    }

    // Text properties
    if (component.text) {
      styles.fontSize = component.text.fontSize;
      if (component.text.fontWeight >= 700) {
        styles.fontWeight = 'bold';
      } else if (component.text.fontWeight >= 500) {
        styles.fontWeight = '500';
      }
    }

    // Text color (from fills on text nodes)
    if (component.type === 'TEXT' && component.fills.length > 0 && component.fills[0].color) {
      styles.textColor = rgbToHex(component.fills[0].color);
    }

    // Border radius
    if (component.cornerRadius) {
      styles.borderRadius = component.cornerRadius;
    }

    // Padding from auto-layout
    if (component.autoLayout) {
      const { paddingTop, paddingRight, paddingBottom, paddingLeft } = component.autoLayout;
      if (paddingTop === paddingBottom && paddingLeft === paddingRight && paddingTop === paddingLeft) {
        styles.padding = `${paddingTop}px`;
      } else {
        styles.padding = `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`;
      }
    }

    return styles;
  }

  /**
   * Generate separate widget XML files
   */
  private generateWidgetFiles(component: ParsedComponent): MendixWidgetFile[] {
    const files: MendixWidgetFile[] = [];

    const widgetName = this.sanitizeName(component.name);
    const widget = this.componentToWidget(component);

    const content = this.generateWidgetXml(widget);
    files.push({
      name: widgetName,
      fileName: `${widgetName}.widget.xml`,
      content,
    });

    return files;
  }

  /**
   * Generate widget XML (simplified)
   */
  private generateWidgetXml(widget: MendixWidgetConfig): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<widget xmlns="http://www.mendix.com/widget/1.0"
        id="${widget.id}"
        name="${widget.name}"
        type="${widget.type}">
  <properties>
    ${Object.entries(widget.properties)
      .map(([key, value]) => `<property key="${key}">${this.escapeXml(String(value))}</property>`)
      .join('\n    ')}
  </properties>
</widget>`;
  }

  /**
   * Generate theme SCSS file
   */
  private generateStyles(): MendixStyleFile {
    const content = generateThemeScss(this.collectedStyles);
    return {
      fileName: 'theme.scss',
      content,
    };
  }

  /**
   * Sanitize name for valid Mendix identifier
   */
  private sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * Factory function for quick Mendix generation
 */
export function generateMendixOutput(
  design: ParsedDesign,
  options?: Partial<MendixGeneratorOptions>
): MendixOutput {
  const generator = new MendixGenerator(options);
  return generator.generate(design);
}
