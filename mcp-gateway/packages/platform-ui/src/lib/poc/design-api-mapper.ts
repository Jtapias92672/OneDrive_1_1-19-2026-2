/**
 * Design-to-API Mapper
 * Infers backend data models from Figma design components
 *
 * Skills Applied:
 * - ui-ux-promax: Classify Figma patterns (form → CRUD, dashboard → stats)
 * - brainstorming: Structure confirmation with user (one question at a time)
 */

import type { ParsedComponent, InferredDataModel, ComponentProp } from './types';

// =============================================================================
// Types
// =============================================================================

export interface DesignAPIMapperConfig {
  inferRelationships?: boolean;
  generateSharedTypes?: boolean;
}

export interface InferenceResult {
  models: InferredDataModel[];
  sharedTypes: string;
  confidence: number;
  suggestions: string[];
}

export interface FieldMapping {
  name: string;
  type: string;
  required: boolean;
  validation?: string;
}

// =============================================================================
// Pattern Matchers
// =============================================================================

const FORM_PATTERNS = ['form', 'input', 'field', 'editor', 'create', 'edit', 'add', 'new'];
const LIST_PATTERNS = ['list', 'table', 'grid', 'collection', 'items', 'feed'];
const DETAIL_PATTERNS = ['detail', 'view', 'profile', 'card', 'preview', 'show'];
const DASHBOARD_PATTERNS = ['dashboard', 'overview', 'stats', 'metrics', 'summary'];
const AUTH_PATTERNS = ['login', 'signup', 'register', 'auth', 'signin', 'password'];

const FIELD_TYPE_MAP: Record<string, string> = {
  email: 'email',
  mail: 'email',
  password: 'string',
  pass: 'string',
  phone: 'string',
  tel: 'string',
  date: 'date',
  time: 'date',
  datetime: 'date',
  age: 'number',
  count: 'number',
  quantity: 'number',
  qty: 'number',
  price: 'number',
  amount: 'number',
  cost: 'number',
  total: 'number',
  id: 'string',
  uuid: 'string',
  name: 'string',
  title: 'string',
  description: 'string',
  desc: 'string',
  text: 'string',
  content: 'string',
  message: 'string',
  note: 'string',
  url: 'string',
  link: 'string',
  image: 'string',
  avatar: 'string',
  photo: 'string',
  active: 'boolean',
  enabled: 'boolean',
  disabled: 'boolean',
  visible: 'boolean',
  hidden: 'boolean',
  checked: 'boolean',
  selected: 'boolean',
};

// =============================================================================
// Mapper Class
// =============================================================================

export class DesignAPIMapper {
  private config: DesignAPIMapperConfig;

  constructor(config: DesignAPIMapperConfig = {}) {
    this.config = {
      inferRelationships: true,
      generateSharedTypes: true,
      ...config,
    };
  }

  /**
   * Infer data models from parsed design components
   */
  infer(components: ParsedComponent[]): InferenceResult {
    const models: InferredDataModel[] = [];
    const suggestions: string[] = [];
    let totalConfidence = 0;

    // Group components by inferred resource
    const resourceGroups = this.groupByResource(components);

    for (const [resourceName, groupedComponents] of Object.entries(resourceGroups)) {
      const model = this.inferModelFromComponents(resourceName, groupedComponents);
      models.push(model);
      totalConfidence += model.confidence || 0.5;

      // Generate suggestions for low-confidence inferences
      if ((model.confidence || 0) < 0.7) {
        suggestions.push(
          `Review "${resourceName}" model - inferred from UI patterns, may need refinement`
        );
      }
    }

    const avgConfidence = models.length > 0 ? totalConfidence / models.length : 0;

    // Infer relationships between models
    if (this.config.inferRelationships) {
      this.inferRelationships(models);
    }

    // Generate shared TypeScript types
    const sharedTypes = this.config.generateSharedTypes
      ? this.generateSharedTypes(models)
      : '';

    return {
      models,
      sharedTypes,
      confidence: avgConfidence,
      suggestions,
    };
  }

  /**
   * Classify a component's UI pattern
   * Note: Order matters - more specific patterns checked first
   */
  classifyPattern(component: ParsedComponent): 'form' | 'list' | 'detail' | 'dashboard' | 'auth' | 'unknown' {
    const name = component.name.toLowerCase();
    const type = component.type.toLowerCase();

    // Auth patterns (most specific, check first)
    if (AUTH_PATTERNS.some((p) => name.includes(p) || type.includes(p))) {
      return 'auth';
    }
    // Dashboard patterns (before detail - "overview" contains "view")
    if (DASHBOARD_PATTERNS.some((p) => name.includes(p) || type.includes(p))) {
      return 'dashboard';
    }
    // List patterns (before form - "items" could match "input" substring)
    if (LIST_PATTERNS.some((p) => name.includes(p) || type.includes(p))) {
      return 'list';
    }
    // Form patterns
    if (FORM_PATTERNS.some((p) => name.includes(p) || type.includes(p))) {
      return 'form';
    }
    // Detail patterns (least specific)
    if (DETAIL_PATTERNS.some((p) => name.includes(p) || type.includes(p))) {
      return 'detail';
    }
    return 'unknown';
  }

  /**
   * Infer resource name from component
   */
  inferResourceName(component: ParsedComponent): string {
    const name = component.name;

    // Remove common suffixes
    const suffixes = [
      'Form', 'List', 'Table', 'Grid', 'Card', 'View', 'Detail',
      'Editor', 'Input', 'Field', 'Modal', 'Dialog', 'Page',
      'Dashboard', 'Panel', 'Section', 'Container', 'Wrapper',
    ];

    let resourceName = name;
    for (const suffix of suffixes) {
      if (resourceName.endsWith(suffix)) {
        resourceName = resourceName.slice(0, -suffix.length);
        break;
      }
    }

    // Handle special cases
    if (resourceName.toLowerCase() === 'login' || resourceName.toLowerCase() === 'signin') {
      return 'Auth';
    }
    if (resourceName.toLowerCase() === 'signup' || resourceName.toLowerCase() === 'register') {
      return 'User';
    }

    return resourceName || 'Resource';
  }

  /**
   * Infer field type from field name
   */
  inferFieldType(fieldName: string, propType?: string): string {
    const lowerName = fieldName.toLowerCase();

    // Check explicit mappings
    for (const [pattern, type] of Object.entries(FIELD_TYPE_MAP)) {
      if (lowerName.includes(pattern)) {
        return type;
      }
    }

    // Use prop type if available
    if (propType) {
      const lowerPropType = propType.toLowerCase();
      if (lowerPropType.includes('number') || lowerPropType.includes('int')) {
        return 'number';
      }
      if (lowerPropType.includes('bool')) {
        return 'boolean';
      }
      if (lowerPropType.includes('date')) {
        return 'date';
      }
    }

    return 'string';
  }

  /**
   * Generate CRUD endpoints for a resource
   */
  generateEndpoints(resourceName: string, pattern: string): InferredDataModel['endpoints'] {
    const basePath = this.toResourcePath(resourceName);

    switch (pattern) {
      case 'form':
        return [
          { method: 'POST', path: `/${basePath}` },
          { method: 'PUT', path: `/${basePath}/:id` },
        ];
      case 'list':
        return [
          { method: 'GET', path: `/${basePath}` },
        ];
      case 'detail':
        return [
          { method: 'GET', path: `/${basePath}/:id` },
        ];
      case 'auth':
        return [
          { method: 'POST', path: '/auth/login' },
          { method: 'POST', path: '/auth/logout' },
        ];
      case 'dashboard':
        return [
          { method: 'GET', path: `/${basePath}/stats` },
        ];
      default:
        // Full CRUD for unknown patterns
        return [
          { method: 'GET', path: `/${basePath}` },
          { method: 'GET', path: `/${basePath}/:id` },
          { method: 'POST', path: `/${basePath}` },
          { method: 'PUT', path: `/${basePath}/:id` },
          { method: 'DELETE', path: `/${basePath}/:id` },
        ];
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private groupByResource(
    components: ParsedComponent[]
  ): Record<string, ParsedComponent[]> {
    const groups: Record<string, ParsedComponent[]> = {};

    for (const component of components) {
      const resourceName = this.inferResourceName(component);
      if (!groups[resourceName]) {
        groups[resourceName] = [];
      }
      groups[resourceName].push(component);
    }

    return groups;
  }

  private inferModelFromComponents(
    resourceName: string,
    components: ParsedComponent[]
  ): InferredDataModel {
    const fields: FieldMapping[] = [
      { name: 'id', type: 'string', required: true },
    ];
    const sources: string[] = [];
    let pattern: string = 'unknown';
    let confidence = 0.5;

    // Collect fields from all component props
    for (const component of components) {
      sources.push(component.name);
      const componentPattern = this.classifyPattern(component);
      if (componentPattern !== 'unknown') {
        pattern = componentPattern;
        confidence = 0.7;
      }

      for (const prop of component.props) {
        // Skip common React props
        if (this.isReactProp(prop.name)) continue;

        const existingField = fields.find((f) => f.name === prop.name);
        if (!existingField) {
          fields.push({
            name: prop.name,
            type: this.inferFieldType(prop.name, prop.type),
            required: prop.required,
          });
        }
      }
    }

    // If no specific fields found, add common fields based on pattern
    if (fields.length === 1) {
      fields.push(...this.getDefaultFields(pattern, resourceName));
      confidence = 0.4;
    }

    // Generate endpoints based on pattern
    const endpoints = this.generateEndpoints(resourceName, pattern);

    return {
      name: resourceName,
      source: sources.join(', '),
      fields,
      endpoints,
      confidence,
    };
  }

  private isReactProp(propName: string): boolean {
    const reactProps = [
      'className', 'style', 'children', 'key', 'ref',
      'onClick', 'onChange', 'onSubmit', 'onBlur', 'onFocus',
      'disabled', 'readOnly', 'placeholder', 'type', 'value',
      'defaultValue', 'checked', 'defaultChecked',
    ];
    return reactProps.includes(propName);
  }

  private getDefaultFields(pattern: string, resourceName: string): FieldMapping[] {
    switch (pattern) {
      case 'auth':
        return [
          { name: 'email', type: 'email', required: true },
          { name: 'password', type: 'string', required: true },
        ];
      case 'form':
      case 'detail':
        return [
          { name: 'name', type: 'string', required: true },
          { name: 'createdAt', type: 'date', required: false },
          { name: 'updatedAt', type: 'date', required: false },
        ];
      case 'list':
        return [
          { name: 'title', type: 'string', required: true },
          { name: 'description', type: 'string', required: false },
        ];
      case 'dashboard':
        return [
          { name: 'count', type: 'number', required: true },
          { name: 'total', type: 'number', required: true },
        ];
      default:
        return [
          { name: 'name', type: 'string', required: true },
        ];
    }
  }

  private inferRelationships(models: InferredDataModel[]): void {
    // Look for foreign key patterns (e.g., userId, productId)
    for (const model of models) {
      for (const field of model.fields) {
        if (field.name.endsWith('Id') && field.name !== 'id') {
          const relatedModelName = field.name.slice(0, -2);
          const relatedModel = models.find(
            (m) => m.name.toLowerCase() === relatedModelName.toLowerCase()
          );
          if (relatedModel) {
            field.type = `${relatedModel.name}['id']`;
          }
        }
      }
    }
  }

  private generateSharedTypes(models: InferredDataModel[]): string {
    const types: string[] = [
      '// Auto-generated shared types from Figma design',
      '// Review and adjust as needed',
      '',
    ];

    for (const model of models) {
      types.push(`export interface ${model.name} {`);
      for (const field of model.fields) {
        const optional = field.required ? '' : '?';
        const tsType = this.toTSType(field.type);
        types.push(`  ${field.name}${optional}: ${tsType};`);
      }
      types.push('}');
      types.push('');
    }

    return types.join('\n');
  }

  private toTSType(type: string): string {
    switch (type.toLowerCase()) {
      case 'string':
      case 'email':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'Date';
      default:
        return type;
    }
  }

  private toResourcePath(name: string): string {
    return name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '') + 's';
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createDesignAPIMapper(
  config?: DesignAPIMapperConfig
): DesignAPIMapper {
  return new DesignAPIMapper(config);
}
