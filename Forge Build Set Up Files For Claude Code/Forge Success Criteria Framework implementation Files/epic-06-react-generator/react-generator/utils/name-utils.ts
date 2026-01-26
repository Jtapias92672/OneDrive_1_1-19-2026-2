/**
 * FORGE React Generator - Name Utilities
 * 
 * @epic 06 - React Generator
 * @task 3.1 - Naming Utilities
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Utilities for converting Figma names to valid React identifiers.
 */

import { NamingConvention } from '../core/types';

// ============================================
// NAME UTILS
// ============================================

export class NameUtils {
  private convention: NamingConvention;
  private usedNames = new Set<string>();

  constructor(convention: NamingConvention = 'PascalCase') {
    this.convention = convention;
  }

  // ==========================================
  // COMPONENT NAMES
  // ==========================================

  /**
   * Convert a Figma name to a valid React component name
   */
  toComponentName(name: string): string {
    // Clean the name
    let cleaned = this.cleanName(name);

    // Convert to PascalCase for components
    let componentName = this.toPascalCase(cleaned);

    // Ensure it starts with a letter
    if (!/^[A-Z]/.test(componentName)) {
      componentName = 'Component' + componentName;
    }

    // Handle reserved words
    componentName = this.handleReservedWords(componentName);

    // Handle duplicates
    componentName = this.ensureUnique(componentName);

    return componentName;
  }

  /**
   * Convert a component name to a file name
   */
  toFileName(componentName: string): string {
    switch (this.convention) {
      case 'kebab-case':
        return this.toKebabCase(componentName);
      
      case 'snake_case':
        return this.toSnakeCase(componentName);
      
      case 'camelCase':
        return this.toCamelCase(componentName);
      
      case 'PascalCase':
      default:
        return componentName;
    }
  }

  // ==========================================
  // PROP NAMES
  // ==========================================

  /**
   * Convert a name to a valid prop name (camelCase)
   */
  toPropName(name: string): string {
    const cleaned = this.cleanName(name);
    let propName = this.toCamelCase(cleaned);

    // Handle reserved words
    propName = this.handleReservedWords(propName, true);

    return propName;
  }

  /**
   * Convert a name to a valid variable name
   */
  toVariableName(name: string): string {
    return this.toPropName(name);
  }

  // ==========================================
  // CASE CONVERSIONS
  // ==========================================

  /**
   * Convert to PascalCase
   */
  toPascalCase(str: string): string {
    return str
      .split(/[\s\-_]+/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Convert to camelCase
   */
  toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * Convert to kebab-case
   */
  toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Convert to snake_case
   */
  toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s\-]+/g, '_')
      .toLowerCase();
  }

  /**
   * Convert to CONSTANT_CASE
   */
  toConstantCase(str: string): string {
    return this.toSnakeCase(str).toUpperCase();
  }

  // ==========================================
  // CLEANING & VALIDATION
  // ==========================================

  /**
   * Clean a name for use as an identifier
   */
  private cleanName(name: string): string {
    return name
      // Remove special characters except spaces, hyphens, underscores
      .replace(/[^\w\s\-]/g, '')
      // Replace multiple spaces/hyphens/underscores with single space
      .replace(/[\s\-_]+/g, ' ')
      // Trim
      .trim();
  }

  /**
   * Handle JavaScript reserved words
   */
  private handleReservedWords(name: string, isLower = false): string {
    const reserved = [
      'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
      'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
      'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
      'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
      'import', 'super', 'implements', 'interface', 'let', 'package', 'private',
      'protected', 'public', 'static', 'yield', 'null', 'true', 'false',
      // React specific
      'React', 'Component', 'Fragment', 'Children', 'Props', 'State',
    ];

    const lowerName = name.toLowerCase();
    const lowerReserved = reserved.map(r => r.toLowerCase());

    if (lowerReserved.includes(lowerName)) {
      return isLower ? `${name}Value` : `${name}Component`;
    }

    return name;
  }

  /**
   * Ensure name is unique
   */
  private ensureUnique(name: string): string {
    if (!this.usedNames.has(name)) {
      this.usedNames.add(name);
      return name;
    }

    let counter = 2;
    while (this.usedNames.has(`${name}${counter}`)) {
      counter++;
    }

    const uniqueName = `${name}${counter}`;
    this.usedNames.add(uniqueName);
    return uniqueName;
  }

  /**
   * Reset used names (for new generation run)
   */
  reset(): void {
    this.usedNames.clear();
  }

  // ==========================================
  // CSS NAMING
  // ==========================================

  /**
   * Convert to valid CSS class name
   */
  toCSSClassName(name: string): string {
    return this.toKebabCase(this.cleanName(name))
      .replace(/^[0-9]/, 'c-$&'); // Prefix with 'c-' if starts with number
  }

  /**
   * Convert to CSS custom property name
   */
  toCSSVariable(name: string): string {
    return `--${this.toKebabCase(this.cleanName(name))}`;
  }

  // ==========================================
  // FILE NAMING
  // ==========================================

  /**
   * Generate component file path
   */
  toComponentPath(name: string, extension: string = 'tsx'): string {
    const fileName = this.toFileName(this.toComponentName(name));
    return `${fileName}.${extension}`;
  }

  /**
   * Generate style file path
   */
  toStylePath(name: string, approach: string): string {
    const fileName = this.toFileName(this.toComponentName(name));
    
    switch (approach) {
      case 'css-modules':
        return `${fileName}.module.css`;
      case 'sass':
        return `${fileName}.scss`;
      case 'styled-components':
        return `${fileName}.styles.ts`;
      default:
        return `${fileName}.css`;
    }
  }

  /**
   * Generate story file path
   */
  toStoryPath(name: string, extension: string = 'stories.tsx'): string {
    const fileName = this.toFileName(this.toComponentName(name));
    return `${fileName}.${extension}`;
  }

  /**
   * Generate test file path
   */
  toTestPath(name: string, extension: string = 'test.tsx'): string {
    const fileName = this.toFileName(this.toComponentName(name));
    return `${fileName}.${extension}`;
  }
}

// ============================================
// EXPORTS
// ============================================

export default NameUtils;
