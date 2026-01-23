/**
 * FORGE Mendix Integration - Widget Mapper
 * @epic 07 - Mendix Integration
 */

import { MendixIntegrationConfig, MendixWidgetType, WidgetMappingRule } from '../core/types';

const DEFAULT_MAPPINGS: WidgetMappingRule[] = [
  { id: 'button', sourceType: 'button', targetType: 'Button', priority: 100, properties: [], childHandling: 'ignore' },
  { id: 'link', sourceType: 'link', targetType: 'LinkButton', priority: 100, properties: [], childHandling: 'ignore' },
  { id: 'input', sourceType: 'input', targetType: 'TextBox', priority: 100, properties: [], childHandling: 'ignore' },
  { id: 'textarea', sourceType: 'textarea', targetType: 'TextArea', priority: 100, properties: [], childHandling: 'ignore' },
  { id: 'checkbox', sourceType: 'checkbox', targetType: 'CheckBox', priority: 100, properties: [], childHandling: 'ignore' },
  { id: 'select', sourceType: 'select', targetType: 'DropDown', priority: 100, properties: [], childHandling: 'ignore' },
  { id: 'image', sourceType: 'image', targetType: 'Image', priority: 100, properties: [], childHandling: 'ignore' },
  { id: 'text', sourceType: 'TEXT', targetType: 'Text', priority: 90, properties: [], childHandling: 'ignore' },
  { id: 'heading', sourceType: 'heading', targetType: 'Title', priority: 95, properties: [], childHandling: 'ignore' },
  { id: 'container', sourceType: 'container', targetType: 'Container', priority: 50, properties: [], childHandling: 'map' },
  { id: 'card', sourceType: 'card', targetType: 'GroupBox', priority: 80, properties: [], childHandling: 'map' },
  { id: 'list', sourceType: 'list', targetType: 'ListView', priority: 85, properties: [], childHandling: 'map' },
  { id: 'nav', sourceType: 'navigation', targetType: 'NavigationList', priority: 90, properties: [], childHandling: 'map' },
  { id: 'form', sourceType: 'form', targetType: 'DataView', priority: 85, properties: [], childHandling: 'map' },
  { id: 'frame', sourceType: 'FRAME', targetType: 'Container', priority: 40, properties: [], childHandling: 'map' },
  { id: 'group', sourceType: 'GROUP', targetType: 'Container', priority: 40, properties: [], childHandling: 'map' },
];

export class WidgetMapper {
  private config: MendixIntegrationConfig;
  private rules: WidgetMappingRule[];

  constructor(config: MendixIntegrationConfig) {
    this.config = config;
    this.rules = [...DEFAULT_MAPPINGS, ...(config.customMappings?.map((m, i) => ({
      id: `custom_${i}`,
      sourceType: m.sourcePattern,
      targetType: m.targetWidget as MendixWidgetType,
      priority: 200,
      properties: m.propertyMappings || [],
      childHandling: 'map' as const,
    })) || [])].sort((a, b) => b.priority - a.priority);
  }

  mapToWidgetType(node: any): MendixWidgetType {
    const nodeType = node.type || '';
    const semantic = node.semantic?.type || '';
    const name = (node.name || '').toLowerCase();

    // Check semantic type first
    for (const rule of this.rules) {
      if (rule.sourceSemantic && semantic === rule.sourceSemantic) return rule.targetType;
      if (semantic === rule.sourceType) return rule.targetType;
    }

    // Check node type
    for (const rule of this.rules) {
      if (nodeType === rule.sourceType) return rule.targetType;
    }

    // Check name patterns
    if (name.includes('button') || name.includes('btn')) return 'Button';
    if (name.includes('input') || name.includes('field')) return 'TextBox';
    if (name.includes('image') || name.includes('img') || name.includes('avatar')) return 'Image';
    if (name.includes('title') || name.includes('heading') || /^h[1-6]/.test(name)) return 'Title';
    if (name.includes('card')) return 'GroupBox';
    if (name.includes('list')) return 'ListView';
    if (name.includes('nav')) return 'NavigationList';
    if (name.includes('tab')) return 'TabContainer';

    // Check for flex layout -> LayoutGrid
    if (node.layout?.type === 'flex' && this.config.layoutPreferences.preferLayoutGrid) {
      return 'LayoutGrid';
    }

    // Default based on children
    if (node.children?.length > 0) return 'Container';
    if (node.textContent) return 'Text';

    return 'Container';
  }

  getRule(widgetType: MendixWidgetType): WidgetMappingRule | undefined {
    return this.rules.find(r => r.targetType === widgetType);
  }
}

export default WidgetMapper;
