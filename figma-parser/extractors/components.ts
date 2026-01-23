/**
 * FORGE Component Extractor
 * 
 * @epic 05 - Figma Parser
 * @task 3.1 - Component Extraction
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Extracts components, component sets (variants), and instances
 *   from Figma design files.
 */

import {
  FigmaNode,
  FigmaFile,
  ComponentMetadata,
  ComponentPropertyDefinition,
  hasChildren,
  isComponent,
  isInstance,
} from '../types/figma-api';

// ============================================
// TYPES
// ============================================

export interface ExtractedComponent {
  /** Figma node ID */
  id: string;
  
  /** Component name */
  name: string;
  
  /** Component description (from Figma) */
  description?: string;
  
  /** Component key (for linking) */
  key?: string;
  
  /** Is this part of a component set (variants)? */
  isVariant: boolean;
  
  /** Parent component set ID (if variant) */
  componentSetId?: string;
  
  /** Variant properties (e.g., { state: 'hover', size: 'large' }) */
  variantProperties?: Record<string, string>;
  
  /** Component property definitions */
  properties: ComponentProperty[];
  
  /** The node tree for this component */
  node: FigmaNode;
  
  /** Instances of this component found in the file */
  instances: ComponentInstance[];
}

export interface ComponentProperty {
  name: string;
  type: 'BOOLEAN' | 'INSTANCE_SWAP' | 'TEXT' | 'VARIANT';
  defaultValue: unknown;
  variantOptions?: string[];
}

export interface ComponentInstance {
  id: string;
  name: string;
  componentId: string;
  overrides: Record<string, unknown>;
  node: FigmaNode;
}

export interface ComponentSet {
  id: string;
  name: string;
  description?: string;
  variants: ExtractedComponent[];
  variantGroupProperties: Record<string, string[]>;
}

export interface ExtractionResult {
  /** All extracted components */
  components: ExtractedComponent[];
  
  /** Component sets (grouped variants) */
  componentSets: ComponentSet[];
  
  /** All instances found */
  instances: ComponentInstance[];
  
  /** Statistics */
  stats: {
    totalComponents: number;
    totalVariants: number;
    totalInstances: number;
    totalComponentSets: number;
  };
}

// ============================================
// COMPONENT EXTRACTOR
// ============================================

export class ComponentExtractor {
  private components = new Map<string, ExtractedComponent>();
  private componentSets = new Map<string, ComponentSet>();
  private instances: ComponentInstance[] = [];
  private componentMetadata: Record<string, ComponentMetadata> = {};

  /**
   * Extract all components from a Figma file
   */
  extract(file: FigmaFile): ExtractionResult {
    // Reset state
    this.components.clear();
    this.componentSets.clear();
    this.instances = [];
    this.componentMetadata = file.components || {};
    
    // Walk the document tree
    this.walkNode(file.document);
    
    // Build component sets from variants
    this.buildComponentSets();
    
    // Link instances to components
    this.linkInstances();
    
    return {
      components: Array.from(this.components.values()),
      componentSets: Array.from(this.componentSets.values()),
      instances: this.instances,
      stats: {
        totalComponents: this.components.size,
        totalVariants: Array.from(this.components.values()).filter(c => c.isVariant).length,
        totalInstances: this.instances.length,
        totalComponentSets: this.componentSets.size,
      },
    };
  }

  /**
   * Extract components from a specific node (for partial parsing)
   */
  extractFromNode(node: FigmaNode, metadata?: Record<string, ComponentMetadata>): ExtractionResult {
    this.components.clear();
    this.componentSets.clear();
    this.instances = [];
    this.componentMetadata = metadata || {};
    
    this.walkNode(node);
    this.buildComponentSets();
    this.linkInstances();
    
    return {
      components: Array.from(this.components.values()),
      componentSets: Array.from(this.componentSets.values()),
      instances: this.instances,
      stats: {
        totalComponents: this.components.size,
        totalVariants: Array.from(this.components.values()).filter(c => c.isVariant).length,
        totalInstances: this.instances.length,
        totalComponentSets: this.componentSets.size,
      },
    };
  }

  // ==========================================
  // TREE WALKING
  // ==========================================

  private walkNode(node: FigmaNode): void {
    // Process current node
    if (node.type === 'COMPONENT') {
      this.extractComponent(node);
    } else if (node.type === 'COMPONENT_SET') {
      this.extractComponentSet(node);
    } else if (node.type === 'INSTANCE') {
      this.extractInstance(node);
    }
    
    // Recursively process children
    if (hasChildren(node)) {
      for (const child of node.children) {
        this.walkNode(child);
      }
    }
  }

  // ==========================================
  // COMPONENT EXTRACTION
  // ==========================================

  private extractComponent(node: FigmaNode): void {
    const metadata = this.componentMetadata[node.id];
    
    // Parse variant properties from name (e.g., "Button, state=hover, size=large")
    const variantProps = this.parseVariantProperties(node.name);
    
    const component: ExtractedComponent = {
      id: node.id,
      name: this.getBaseName(node.name),
      description: metadata?.description,
      key: metadata?.key,
      isVariant: Object.keys(variantProps).length > 0,
      variantProperties: Object.keys(variantProps).length > 0 ? variantProps : undefined,
      properties: this.extractProperties(node),
      node,
      instances: [],
    };
    
    this.components.set(node.id, component);
  }

  private extractComponentSet(node: FigmaNode): void {
    // Component sets contain variant components as children
    // We'll process the children as components and group them later
    
    // Store basic info for later
    const setInfo: ComponentSet = {
      id: node.id,
      name: node.name,
      variants: [],
      variantGroupProperties: {},
    };
    
    // Extract variant group properties from the component set
    if (node.componentPropertyDefinitions) {
      for (const [name, def] of Object.entries(node.componentPropertyDefinitions)) {
        if (def.type === 'VARIANT' && def.variantOptions) {
          setInfo.variantGroupProperties[name] = def.variantOptions;
        }
      }
    }
    
    this.componentSets.set(node.id, setInfo);
    
    // Process children (variant components)
    if (hasChildren(node)) {
      for (const child of node.children) {
        if (child.type === 'COMPONENT') {
          this.extractComponent(child);
          // Mark as belonging to this set
          const comp = this.components.get(child.id);
          if (comp) {
            comp.componentSetId = node.id;
            comp.isVariant = true;
          }
        }
      }
    }
  }

  private extractInstance(node: FigmaNode): void {
    const instance: ComponentInstance = {
      id: node.id,
      name: node.name,
      componentId: node.componentId || '',
      overrides: this.extractOverrides(node),
      node,
    };
    
    this.instances.push(instance);
  }

  // ==========================================
  // PROPERTY EXTRACTION
  // ==========================================

  private extractProperties(node: FigmaNode): ComponentProperty[] {
    const properties: ComponentProperty[] = [];
    
    if (node.componentPropertyDefinitions) {
      for (const [name, def] of Object.entries(node.componentPropertyDefinitions)) {
        properties.push({
          name,
          type: def.type,
          defaultValue: def.defaultValue,
          variantOptions: def.variantOptions,
        });
      }
    }
    
    return properties;
  }

  private extractOverrides(node: FigmaNode): Record<string, unknown> {
    const overrides: Record<string, unknown> = {};
    
    if (node.componentPropertyReferences) {
      for (const [key, value] of Object.entries(node.componentPropertyReferences)) {
        overrides[key] = value;
      }
    }
    
    // Also check for direct overrides
    if (node.overrides) {
      Object.assign(overrides, node.overrides);
    }
    
    return overrides;
  }

  // ==========================================
  // VARIANT PARSING
  // ==========================================

  private parseVariantProperties(name: string): Record<string, string> {
    const props: Record<string, string> = {};
    
    // Figma variant naming: "ComponentName, prop1=value1, prop2=value2"
    const parts = name.split(',').map(p => p.trim());
    
    for (let i = 1; i < parts.length; i++) {
      const [key, value] = parts[i].split('=').map(s => s.trim());
      if (key && value) {
        props[key] = value;
      }
    }
    
    return props;
  }

  private getBaseName(name: string): string {
    // Get the base name without variant properties
    const commaIndex = name.indexOf(',');
    return commaIndex > 0 ? name.substring(0, commaIndex).trim() : name;
  }

  // ==========================================
  // LINKING
  // ==========================================

  private buildComponentSets(): void {
    // Group variants into their component sets
    for (const component of this.components.values()) {
      if (component.componentSetId) {
        const set = this.componentSets.get(component.componentSetId);
        if (set) {
          set.variants.push(component);
        }
      }
    }
  }

  private linkInstances(): void {
    // Link instances to their source components
    for (const instance of this.instances) {
      const component = this.components.get(instance.componentId);
      if (component) {
        component.instances.push(instance);
      }
    }
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Find all components in a node tree
 */
export function findComponents(node: FigmaNode): FigmaNode[] {
  const components: FigmaNode[] = [];
  
  function walk(n: FigmaNode): void {
    if (isComponent(n)) {
      components.push(n);
    }
    if (hasChildren(n)) {
      for (const child of n.children) {
        walk(child);
      }
    }
  }
  
  walk(node);
  return components;
}

/**
 * Find all instances in a node tree
 */
export function findInstances(node: FigmaNode): FigmaNode[] {
  const instances: FigmaNode[] = [];
  
  function walk(n: FigmaNode): void {
    if (isInstance(n)) {
      instances.push(n);
    }
    if (hasChildren(n)) {
      for (const child of n.children) {
        walk(child);
      }
    }
  }
  
  walk(node);
  return instances;
}

/**
 * Get component hierarchy (parent components)
 */
export function getComponentHierarchy(
  componentId: string,
  components: Map<string, ExtractedComponent>
): ExtractedComponent[] {
  const hierarchy: ExtractedComponent[] = [];
  let current = components.get(componentId);
  
  while (current) {
    hierarchy.push(current);
    current = current.componentSetId 
      ? components.get(current.componentSetId)
      : undefined;
  }
  
  return hierarchy;
}

// ============================================
// EXPORTS
// ============================================

export default ComponentExtractor;
