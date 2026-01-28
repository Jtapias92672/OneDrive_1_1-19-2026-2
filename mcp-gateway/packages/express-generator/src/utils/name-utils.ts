/**
 * Express Generator - Name Utilities
 *
 * @epic 14 - Backend Code Generation
 * @task 2.1 - Naming Utilities
 *
 * @description
 *   Utilities for converting data model names to valid identifiers.
 *   Follows React Generator patterns exactly.
 */

import { NamingConvention } from '../core/types';

// ============================================
// NAME UTILS
// ============================================

export class NameUtils {
  private convention: NamingConvention;
  private usedNames = new Set<string>();

  constructor(convention: NamingConvention = 'camelCase') {
    this.convention = convention;
  }

  // ==========================================
  // ENTITY NAMES
  // ==========================================

  /**
   * Convert an entity name to PascalCase (for classes)
   */
  toEntityName(name: string): string {
    let cleaned = this.cleanName(name);
    let entityName = this.toPascalCase(cleaned);

    // Ensure it starts with a letter
    if (!/^[A-Z]/.test(entityName)) {
      entityName = 'Entity' + entityName;
    }

    // Handle reserved words
    entityName = this.handleReservedWords(entityName);

    return entityName;
  }

  /**
   * Convert entity name to plural form (for routes/tables)
   */
  toPlural(name: string): string {
    const singular = this.toEntityName(name).toLowerCase();

    // Common irregular plurals
    const irregulars: Record<string, string> = {
      person: 'people',
      child: 'children',
      man: 'men',
      woman: 'women',
      tooth: 'teeth',
      foot: 'feet',
      mouse: 'mice',
      goose: 'geese',
      ox: 'oxen',
    };

    if (irregulars[singular]) {
      return irregulars[singular];
    }

    // Rules
    if (singular.endsWith('s') || singular.endsWith('x') ||
        singular.endsWith('ch') || singular.endsWith('sh')) {
      return singular + 'es';
    }
    if (singular.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(singular.charAt(singular.length - 2))) {
      return singular.slice(0, -1) + 'ies';
    }
    if (singular.endsWith('f')) {
      return singular.slice(0, -1) + 'ves';
    }
    if (singular.endsWith('fe')) {
      return singular.slice(0, -2) + 'ves';
    }

    return singular + 's';
  }

  // ==========================================
  // FILE NAMING
  // ==========================================

  /**
   * Convert to a file name based on convention
   */
  toFileName(name: string): string {
    switch (this.convention) {
      case 'kebab-case':
        return this.toKebabCase(name);

      case 'snake_case':
        return this.toSnakeCase(name);

      case 'camelCase':
        return this.toCamelCase(name);

      case 'PascalCase':
      default:
        return this.toPascalCase(name);
    }
  }

  /**
   * Generate controller file name
   */
  toControllerFileName(entityName: string): string {
    const base = this.toFileName(entityName);
    return `${base}.controller.ts`;
  }

  /**
   * Generate service file name
   */
  toServiceFileName(entityName: string): string {
    const base = this.toFileName(entityName);
    return `${base}.service.ts`;
  }

  /**
   * Generate route file name
   */
  toRouteFileName(entityName: string): string {
    const base = this.toFileName(entityName);
    return `${base}.routes.ts`;
  }

  /**
   * Generate model file name
   */
  toModelFileName(entityName: string): string {
    const base = this.toFileName(entityName);
    return `${base}.model.ts`;
  }

  /**
   * Generate test file name
   */
  toTestFileName(entityName: string, type: 'controller' | 'service' | 'route'): string {
    const base = this.toFileName(entityName);
    return `${base}.${type}.test.ts`;
  }

  // ==========================================
  // CLASS/INTERFACE NAMES
  // ==========================================

  /**
   * Convert to controller class name
   */
  toControllerName(entityName: string): string {
    return `${this.toEntityName(entityName)}Controller`;
  }

  /**
   * Convert to service class name
   */
  toServiceName(entityName: string): string {
    return `${this.toEntityName(entityName)}Service`;
  }

  /**
   * Convert to router name
   */
  toRouterName(entityName: string): string {
    return `${this.toCamelCase(entityName)}Router`;
  }

  /**
   * Convert to DTO name
   */
  toDtoName(entityName: string, type: 'create' | 'update' | 'response'): string {
    const prefix = type.charAt(0).toUpperCase() + type.slice(1);
    return `${prefix}${this.toEntityName(entityName)}Dto`;
  }

  // ==========================================
  // VARIABLE/PROPERTY NAMES
  // ==========================================

  /**
   * Convert to variable name (camelCase)
   */
  toVariableName(name: string): string {
    const cleaned = this.cleanName(name);
    let varName = this.toCamelCase(cleaned);
    varName = this.handleReservedWords(varName, true);
    return varName;
  }

  /**
   * Convert to property name (camelCase)
   */
  toPropertyName(name: string): string {
    return this.toVariableName(name);
  }

  /**
   * Convert to constant name (UPPER_SNAKE_CASE)
   */
  toConstantName(name: string): string {
    return this.toConstantCase(this.cleanName(name));
  }

  // ==========================================
  // DATABASE NAMING
  // ==========================================

  /**
   * Convert to table name (snake_case plural)
   */
  toTableName(entityName: string): string {
    return this.toSnakeCase(this.toPlural(entityName));
  }

  /**
   * Convert to column name (snake_case)
   */
  toColumnName(fieldName: string): string {
    return this.toSnakeCase(fieldName);
  }

  /**
   * Convert to foreign key name
   */
  toForeignKeyName(entityName: string): string {
    return `${this.toSnakeCase(entityName)}_id`;
  }

  /**
   * Convert to index name
   */
  toIndexName(tableName: string, columns: string[]): string {
    return `idx_${tableName}_${columns.join('_')}`;
  }

  // ==========================================
  // ROUTE NAMING
  // ==========================================

  /**
   * Convert to route path (kebab-case plural)
   */
  toRoutePath(entityName: string): string {
    return '/' + this.toKebabCase(this.toPlural(entityName));
  }

  /**
   * Convert to route param name
   */
  toRouteParam(name: string): string {
    return `:${this.toCamelCase(name)}`;
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
   * Handle JavaScript/TypeScript reserved words
   */
  private handleReservedWords(name: string, isLower = false): string {
    const reserved = [
      'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
      'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
      'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
      'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
      'import', 'super', 'implements', 'interface', 'let', 'package', 'private',
      'protected', 'public', 'static', 'yield', 'null', 'true', 'false',
      // Database/ORM specific
      'model', 'query', 'schema', 'table', 'column', 'index',
    ];

    const lowerName = name.toLowerCase();
    const lowerReserved = reserved.map(r => r.toLowerCase());

    if (lowerReserved.includes(lowerName)) {
      return isLower ? `${name}Value` : `${name}Entity`;
    }

    return name;
  }

  /**
   * Ensure name is unique
   */
  ensureUnique(name: string): string {
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
  // VALIDATION
  // ==========================================

  /**
   * Check if name is a valid identifier
   */
  isValidIdentifier(name: string): boolean {
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
  }

  /**
   * Check if name is a valid file name
   */
  isValidFileName(name: string): boolean {
    return /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name);
  }
}

// ============================================
// EXPORTS
// ============================================

export default NameUtils;
