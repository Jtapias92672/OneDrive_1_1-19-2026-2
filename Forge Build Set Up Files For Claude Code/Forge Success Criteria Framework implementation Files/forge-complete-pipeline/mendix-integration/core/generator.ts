/**
 * FORGE Mendix Integration - Main Generator
 * 
 * @epic 07 - Mendix Integration
 * @task 2.1 - Core Generator
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Main orchestrator for Mendix page/widget generation from React/Figma designs.
 *   Coordinates widget mapping, layout generation, and style output.
 */

import {
  MendixIntegrationConfig,
  DEFAULT_CONFIG,
  MendixWidget,
  MendixWidgetType,
  MendixPage,
  MendixSnippet,
  MendixGenerationResult,
  MendixGenerationStats,
  MendixWarning,
  MendixError,
  MendixPageStyles,
  MendixStyleBundle,
  WidgetLibraryUsage,
  MappingContext,
} from './types';

import { WidgetMapper } from '../mappings/widget-mapper';
import { LayoutGenerator } from '../layouts/layout-generator';
import { StyleConverter } from '../widgets/style-converter';

// ============================================
// MENDIX GENERATOR
// ============================================

export class MendixGenerator {
  private config: MendixIntegrationConfig;
  private widgetMapper: WidgetMapper;
  private layoutGenerator: LayoutGenerator;
  private styleConverter: StyleConverter;
  
  private warnings: MendixWarning[] = [];
  private errors: MendixError[] = [];
  private widgetCounts: Record<string, number> = {};

  constructor(config: Partial<MendixIntegrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.widgetMapper = new WidgetMapper(this.config);
    this.layoutGenerator = new LayoutGenerator(this.config);
    this.styleConverter = new StyleConverter(this.config);
  }

  // ==========================================
  // MAIN GENERATION METHODS
  // ==========================================

  /**
   * Generate Mendix pages from React components
   */
  async generate(reactComponents: any[]): Promise<MendixGenerationResult> {
    const startTime = Date.now();
    this.reset();

    try {
      const pages: MendixPage[] = [];
      const snippets: MendixSnippet[] = [];

      // Process each component
      for (const component of reactComponents) {
        try {
          // Determine if page or snippet
          if (this.isPageComponent(component)) {
            const page = this.generatePage(component);
            pages.push(page);
          } else {
            const snippet = this.generateSnippet(component);
            snippets.push(snippet);
          }
        } catch (error: any) {
          this.addError('GENERATION_FAILED', `Failed to generate ${component.name}: ${error.message}`, component.sourceNodeId);
        }
      }

      // Generate consolidated styles
      const styles = this.generateStyleBundle(pages, snippets);

      // Calculate widget usage
      const widgetLibrary = this.calculateWidgetUsage();

      // Calculate stats
      const stats = this.calculateStats(pages, snippets, startTime);

      return {
        pages,
        snippets,
        styles,
        widgetLibrary,
        stats,
        warnings: this.warnings,
        errors: this.errors,
      };

    } catch (error: any) {
      this.addError('FATAL_ERROR', `Generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a single Mendix page
   */
  generatePage(component: any): MendixPage {
    const pageName = this.toMendixName(component.name);
    const context: MappingContext = {
      depth: 0,
      dataSources: [],
      pageParameters: [],
      module: this.config.moduleName,
    };

    // Convert component tree to Mendix widgets
    const content = this.convertToWidget(component, context);

    // Extract page styles
    const styles = this.extractPageStyles(component);

    return {
      id: this.generateId('page'),
      name: pageName,
      title: this.toPageTitle(component.name),
      module: this.config.moduleName,
      layout: 'Atlas_Default',
      parameters: [],
      content,
      styles,
      navigationProfile: 'Responsive',
    };
  }

  /**
   * Generate a Mendix snippet
   */
  generateSnippet(component: any): MendixSnippet {
    const snippetName = this.toMendixName(component.name);
    const context: MappingContext = {
      depth: 0,
      dataSources: [],
      pageParameters: [],
      module: this.config.moduleName,
    };

    const content = this.convertToWidget(component, context);

    return {
      id: this.generateId('snippet'),
      name: snippetName,
      module: this.config.moduleName,
      content,
      parameters: [],
    };
  }

  // ==========================================
  // WIDGET CONVERSION
  // ==========================================

  /**
   * Convert a React/Figma component to Mendix widget tree
   */
  private convertToWidget(node: any, context: MappingContext): MendixWidget {
    // Map the node type to a Mendix widget
    const widgetType = this.widgetMapper.mapToWidgetType(node);
    
    // Track widget usage
    this.trackWidgetUsage(widgetType);

    // Create the widget
    const widget: MendixWidget = {
      id: this.generateId('widget'),
      type: widgetType,
      name: this.toWidgetName(node.name, widgetType),
      properties: this.mapProperties(node, widgetType),
      children: [],
      cssClasses: this.extractCssClasses(node),
      sourceId: node.sourceNodeId || node.id,
    };

    // Handle special widget types
    if (this.isLayoutWidget(widgetType)) {
      widget.children = this.convertLayoutChildren(node, context);
    } else if (this.isContainerWidget(widgetType)) {
      widget.children = this.convertChildren(node, context);
    }

    // Map events
    if (node.interactions?.length > 0) {
      widget.events = this.mapEvents(node.interactions);
    }

    return widget;
  }

  private convertChildren(node: any, context: MappingContext): MendixWidget[] {
    if (!node.children || node.children.length === 0) {
      return [];
    }

    const newContext: MappingContext = {
      ...context,
      depth: context.depth + 1,
      parentType: this.widgetMapper.mapToWidgetType(node),
    };

    return node.children
      .filter((child: any) => child.visible !== false)
      .map((child: any) => this.convertToWidget(child, newContext));
  }

  private convertLayoutChildren(node: any, context: MappingContext): MendixWidget[] {
    // For layout grids, wrap children in rows and columns
    if (!node.children || node.children.length === 0) {
      return [];
    }

    const layout = node.layout || {};
    
    if (layout.type === 'flex' && layout.direction === 'horizontal') {
      // Create a layout grid row with columns
      return this.createLayoutGridRow(node.children, context);
    }

    return this.convertChildren(node, context);
  }

  private createLayoutGridRow(children: any[], context: MappingContext): MendixWidget[] {
    const row: MendixWidget = {
      id: this.generateId('widget'),
      type: 'LayoutGridRow',
      name: 'row',
      properties: {},
      children: children.map((child, index) => this.createLayoutGridColumn(child, index, children.length, context)),
      cssClasses: [],
    };

    this.trackWidgetUsage('LayoutGridRow');
    return [row];
  }

  private createLayoutGridColumn(child: any, index: number, totalColumns: number, context: MappingContext): MendixWidget {
    const columnWeight = Math.floor(12 / totalColumns);

    const column: MendixWidget = {
      id: this.generateId('widget'),
      type: 'LayoutGridColumn',
      name: `column${index}`,
      properties: {
        weight: columnWeight,
        tabletWeight: columnWeight,
        phoneWeight: 12, // Full width on phone
      },
      children: [this.convertToWidget(child, { ...context, depth: context.depth + 1 })],
      cssClasses: [],
    };

    this.trackWidgetUsage('LayoutGridColumn');
    return column;
  }

  // ==========================================
  // PROPERTY MAPPING
  // ==========================================

  private mapProperties(node: any, widgetType: MendixWidgetType): Record<string, any> {
    const properties: Record<string, any> = {};

    switch (widgetType) {
      case 'Text':
      case 'DynamicText':
        properties.content = node.textContent || node.props?.text || '';
        break;

      case 'Title':
        properties.content = node.textContent || node.props?.title || '';
        properties.level = this.inferHeadingLevel(node.name);
        break;

      case 'Button':
      case 'ActionButton':
        properties.caption = node.textContent || node.props?.label || 'Button';
        properties.buttonStyle = this.inferButtonStyle(node);
        break;

      case 'TextBox':
        properties.placeholder = node.props?.placeholder || '';
        break;

      case 'Image':
      case 'StaticImage':
        properties.image = node.props?.src || '';
        properties.alternativeText = node.props?.alt || node.name;
        break;

      case 'Container':
        properties.renderMode = 'div';
        break;

      case 'LayoutGrid':
        properties.columns = 12;
        break;
    }

    return properties;
  }

  private mapEvents(interactions: any[]): any[] {
    return interactions.map(interaction => ({
      type: this.mapEventType(interaction.trigger),
      action: this.mapAction(interaction),
    }));
  }

  private mapEventType(trigger: string): string {
    const mapping: Record<string, string> = {
      click: 'onClick',
      hover: 'onEnter',
      focus: 'onEnter',
      blur: 'onLeave',
    };
    return mapping[trigger] || 'onClick';
  }

  private mapAction(interaction: any): any {
    if (interaction.action === 'navigate' && interaction.target) {
      return {
        type: 'action',
        actionType: 'openPage',
        parameters: { pageName: interaction.target },
      };
    }

    if (interaction.action === 'url' && interaction.url) {
      return {
        type: 'action',
        actionType: 'callNanoflow',
        parameters: { url: interaction.url },
      };
    }

    return {
      type: 'action',
      actionType: 'callNanoflow',
      parameters: {},
    };
  }

  // ==========================================
  // STYLE GENERATION
  // ==========================================

  private extractPageStyles(component: any): MendixPageStyles {
    const scss = this.styleConverter.generateSCSS(component);
    const variables = this.styleConverter.extractVariables(component);
    const customClasses = this.styleConverter.generateCustomClasses(component);

    return {
      scss,
      variables,
      customClasses,
    };
  }

  private generateStyleBundle(pages: MendixPage[], snippets: MendixSnippet[]): MendixStyleBundle {
    // Collect all styles
    const allStyles = [
      ...pages.map(p => p.styles),
      ...snippets.map(s => this.extractPageStyles(s.content)),
    ];

    // Merge variables
    const variables: Record<string, string> = {};
    for (const style of allStyles) {
      Object.assign(variables, style.variables);
    }

    // Generate main SCSS
    const mainScss = this.generateMainSCSS(allStyles);

    // Generate variables file
    const variablesScss = this.generateVariablesSCSS(variables);

    // Generate component styles
    const componentStyles: Record<string, string> = {};
    for (const page of pages) {
      componentStyles[page.name] = page.styles.scss;
    }

    return {
      mainScss,
      variablesScss,
      componentStyles,
      designTokens: variables,
    };
  }

  private generateMainSCSS(styles: MendixPageStyles[]): string {
    const lines: string[] = [
      '// Generated by FORGE Mendix Integration',
      '// Do not edit manually',
      '',
      '@import "variables";',
      '',
    ];

    // Add custom classes
    for (const style of styles) {
      for (const customClass of style.customClasses) {
        lines.push(`.${this.config.styleOptions.classPrefix}${customClass.name} {`);
        lines.push(`  ${customClass.definition}`);
        lines.push('}');
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  private generateVariablesSCSS(variables: Record<string, string>): string {
    const lines: string[] = [
      '// Design Tokens - Generated by FORGE',
      '',
    ];

    for (const [name, value] of Object.entries(variables)) {
      lines.push(`$${name}: ${value};`);
    }

    return lines.join('\n');
  }

  private extractCssClasses(node: any): string[] {
    const classes: string[] = [];

    // Add semantic-based classes
    if (node.semantic?.type) {
      classes.push(`${this.config.styleOptions.classPrefix}${node.semantic.type}`);
    }

    // Add component-specific class
    classes.push(`${this.config.styleOptions.classPrefix}${this.toKebabCase(node.name)}`);

    return classes;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  private isPageComponent(component: any): boolean {
    // Check if component looks like a page (large frame, has navigation, etc.)
    const name = (component.name || '').toLowerCase();
    return name.includes('page') || 
           name.includes('screen') ||
           name.includes('view') ||
           (component.bounds?.width > 800 && component.bounds?.height > 600);
  }

  private isLayoutWidget(type: MendixWidgetType): boolean {
    return ['LayoutGrid', 'LayoutGridRow', 'LayoutGridColumn', 'TabContainer'].includes(type);
  }

  private isContainerWidget(type: MendixWidgetType): boolean {
    return ['Container', 'ScrollContainer', 'GroupBox', 'DataView', 'ListView'].includes(type);
  }

  private toMendixName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }

  private toPageTitle(name: string): string {
    return name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private toWidgetName(name: string, type: MendixWidgetType): string {
    const baseName = this.toMendixName(name);
    return `${baseName}_${type}`;
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  private inferHeadingLevel(name: string): number {
    const lower = name.toLowerCase();
    if (lower.includes('h1') || lower.includes('title')) return 1;
    if (lower.includes('h2') || lower.includes('subtitle')) return 2;
    if (lower.includes('h3') || lower.includes('section')) return 3;
    if (lower.includes('h4')) return 4;
    if (lower.includes('h5')) return 5;
    if (lower.includes('h6')) return 6;
    return 2;
  }

  private inferButtonStyle(node: any): string {
    const name = (node.name || '').toLowerCase();
    if (name.includes('primary') || name.includes('main')) return 'primary';
    if (name.includes('secondary')) return 'secondary';
    if (name.includes('danger') || name.includes('delete')) return 'danger';
    if (name.includes('success')) return 'success';
    if (name.includes('warning')) return 'warning';
    if (name.includes('link')) return 'link';
    return 'default';
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private trackWidgetUsage(type: MendixWidgetType): void {
    this.widgetCounts[type] = (this.widgetCounts[type] || 0) + 1;
  }

  private calculateWidgetUsage(): WidgetLibraryUsage {
    const coreWidgets = ['Container', 'Text', 'Button', 'TextBox', 'Image', 'DataView', 'ListView'];
    const atlasWidgets = ['LayoutGrid', 'LayoutGridRow', 'LayoutGridColumn', 'GroupBox', 'TabContainer'];

    return {
      coreWidgets: coreWidgets.filter(w => this.widgetCounts[w]),
      atlasWidgets: atlasWidgets.filter(w => this.widgetCounts[w]),
      customWidgets: [],
      counts: { ...this.widgetCounts },
    };
  }

  private calculateStats(pages: MendixPage[], snippets: MendixSnippet[], startTime: number): MendixGenerationStats {
    let totalWidgets = 0;
    const countWidgets = (widget: MendixWidget) => {
      totalWidgets++;
      widget.children.forEach(countWidgets);
    };

    pages.forEach(p => countWidgets(p.content));
    snippets.forEach(s => countWidgets(s.content));

    return {
      totalPages: pages.length,
      totalSnippets: snippets.length,
      totalWidgets,
      mappingSuccessRate: this.errors.length === 0 ? 1 : 1 - (this.errors.length / (totalWidgets || 1)),
      durationMs: Date.now() - startTime,
    };
  }

  private addWarning(code: string, message: string, sourceId?: string, suggestion?: string): void {
    this.warnings.push({ code, message, sourceId, suggestion });
  }

  private addError(code: string, message: string, sourceId?: string): void {
    this.errors.push({ code, message, sourceId });
  }

  private reset(): void {
    this.warnings = [];
    this.errors = [];
    this.widgetCounts = {};
  }

  // ==========================================
  // CONFIGURATION
  // ==========================================

  setConfig(config: Partial<MendixIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
    this.widgetMapper = new WidgetMapper(this.config);
    this.layoutGenerator = new LayoutGenerator(this.config);
    this.styleConverter = new StyleConverter(this.config);
  }

  getConfig(): MendixIntegrationConfig {
    return { ...this.config };
  }
}

// ============================================
// EXPORTS
// ============================================

export default MendixGenerator;
