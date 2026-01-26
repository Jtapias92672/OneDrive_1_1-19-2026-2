/**
 * FORGE React Generator - Core Types
 * 
 * @epic 06 - React Generator
 * @task 1.1 - Type Definitions
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Type definitions for React component generation from Figma designs.
 */

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface ReactGeneratorConfig {
  /** Output format */
  outputFormat: OutputFormat;
  
  /** Styling approach */
  stylingApproach: StylingApproach;
  
  /** TypeScript or JavaScript */
  typescript: boolean;
  
  /** Component naming convention */
  namingConvention: NamingConvention;
  
  /** Generate prop types/interfaces */
  generatePropTypes: boolean;
  
  /** Generate storybook stories */
  generateStories: boolean;
  
  /** Generate unit tests */
  generateTests: boolean;
  
  /** Base component library */
  componentLibrary?: ComponentLibrary;
  
  /** Custom component mappings */
  componentMappings?: ComponentMapping[];
  
  /** Responsive breakpoints */
  breakpoints?: Breakpoints;
  
  /** Asset handling */
  assetConfig?: AssetConfig;
  
  /** Code formatting options */
  formatting?: FormattingOptions;
}

export type OutputFormat = 
  | 'functional'      // Arrow function components
  | 'function'        // Function declaration components
  | 'class'           // Class components
  | 'forwardRef';     // forwardRef wrapped

export type StylingApproach =
  | 'tailwind'        // Tailwind CSS classes
  | 'css-modules'     // CSS Modules
  | 'styled-components' // styled-components
  | 'emotion'         // Emotion CSS-in-JS
  | 'inline'          // Inline styles
  | 'sass'            // SASS/SCSS
  | 'vanilla';        // Plain CSS

export type NamingConvention =
  | 'PascalCase'      // MyComponent
  | 'camelCase'       // myComponent
  | 'kebab-case'      // my-component
  | 'snake_case';     // my_component

export type ComponentLibrary =
  | 'none'
  | 'chakra-ui'
  | 'material-ui'
  | 'ant-design'
  | 'shadcn'
  | 'radix';

export interface ComponentMapping {
  /** Figma component name pattern (regex) */
  figmaPattern: string;
  
  /** React component to map to */
  reactComponent: string;
  
  /** Import path */
  importPath: string;
  
  /** Prop mappings */
  propMappings?: Record<string, string>;
}

export interface Breakpoints {
  sm: number;   // e.g., 640
  md: number;   // e.g., 768
  lg: number;   // e.g., 1024
  xl: number;   // e.g., 1280
  '2xl': number; // e.g., 1536
}

export interface AssetConfig {
  /** Output directory for assets */
  outputDir: string;
  
  /** Asset path prefix in code */
  pathPrefix: string;
  
  /** Image optimization */
  optimize: boolean;
  
  /** Generate responsive images */
  responsive: boolean;
}

export interface FormattingOptions {
  /** Indentation (spaces or tabs) */
  indentation: 'spaces' | 'tabs';
  
  /** Number of spaces for indent */
  indentSize: number;
  
  /** Single or double quotes */
  quotes: 'single' | 'double';
  
  /** Trailing commas */
  trailingComma: 'none' | 'es5' | 'all';
  
  /** Semicolons */
  semicolons: boolean;
  
  /** Print width for wrapping */
  printWidth: number;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_CONFIG: ReactGeneratorConfig = {
  outputFormat: 'functional',
  stylingApproach: 'tailwind',
  typescript: true,
  namingConvention: 'PascalCase',
  generatePropTypes: true,
  generateStories: false,
  generateTests: false,
  componentLibrary: 'none',
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
  formatting: {
    indentation: 'spaces',
    indentSize: 2,
    quotes: 'single',
    trailingComma: 'es5',
    semicolons: true,
    printWidth: 100,
  },
};

// ============================================
// GENERATED OUTPUT TYPES
// ============================================

export interface GeneratedComponent {
  /** Component name */
  name: string;
  
  /** File name (without extension) */
  fileName: string;
  
  /** Component code */
  code: string;
  
  /** Style code (if separate file) */
  styleCode?: string;
  
  /** Style file name */
  styleFileName?: string;
  
  /** Props interface/type */
  propsType?: string;
  
  /** Imports required */
  imports: ImportStatement[];
  
  /** Child components */
  children: string[];
  
  /** Source Figma node ID */
  sourceNodeId: string;
  
  /** Source Figma component name */
  sourceComponentName?: string;
  
  /** Props extracted */
  props: ComponentProp[];
  
  /** Storybook story (if generated) */
  story?: string;
  
  /** Test file (if generated) */
  test?: string;
}

export interface ImportStatement {
  /** Module/package name */
  from: string;
  
  /** Default import name */
  default?: string;
  
  /** Named imports */
  named?: string[];
  
  /** Type import (for TypeScript) */
  isType?: boolean;
}

export interface ComponentProp {
  /** Prop name */
  name: string;
  
  /** TypeScript type */
  type: string;
  
  /** Is required */
  required: boolean;
  
  /** Default value */
  defaultValue?: string;
  
  /** JSDoc description */
  description?: string;
}

// ============================================
// STYLE TYPES
// ============================================

export interface GeneratedStyles {
  /** Tailwind classes (if tailwind) */
  tailwind?: TailwindStyles;
  
  /** CSS properties (if css/modules/inline) */
  css?: CSSStyles;
  
  /** styled-components template (if styled) */
  styledTemplate?: string;
  
  /** Responsive styles */
  responsive?: ResponsiveStyles;
}

export interface TailwindStyles {
  /** Base classes */
  base: string[];
  
  /** Hover classes */
  hover?: string[];
  
  /** Focus classes */
  focus?: string[];
  
  /** Active classes */
  active?: string[];
  
  /** Dark mode classes */
  dark?: string[];
  
  /** Responsive classes by breakpoint */
  responsive?: Record<string, string[]>;
}

export interface CSSStyles {
  /** CSS properties */
  properties: Record<string, string>;
  
  /** Pseudo-selectors */
  pseudo?: Record<string, Record<string, string>>;
  
  /** Media queries */
  mediaQueries?: Record<string, Record<string, string>>;
}

export interface ResponsiveStyles {
  /** Base (mobile-first) */
  base: Record<string, string>;
  
  /** Breakpoint overrides */
  breakpoints: Record<string, Record<string, string>>;
}

// ============================================
// GENERATION RESULT TYPES
// ============================================

export interface GenerationResult {
  /** Successfully generated components */
  components: GeneratedComponent[];
  
  /** Shared styles (design tokens, etc.) */
  sharedStyles?: string;
  
  /** Index/barrel file */
  indexFile: string;
  
  /** Type definitions file */
  typesFile?: string;
  
  /** Generation statistics */
  stats: GenerationStats;
  
  /** Warnings encountered */
  warnings: GenerationWarning[];
  
  /** Errors encountered */
  errors: GenerationError[];
}

export interface GenerationStats {
  /** Total components generated */
  totalComponents: number;
  
  /** Total lines of code */
  totalLines: number;
  
  /** Components with props */
  componentsWithProps: number;
  
  /** Unique imports */
  uniqueImports: number;
  
  /** Generation duration */
  durationMs: number;
}

export interface GenerationWarning {
  /** Warning type */
  type: WarningType;
  
  /** Human-readable message */
  message: string;
  
  /** Related node ID */
  nodeId?: string;
  
  /** Related component name */
  componentName?: string;
}

export type WarningType =
  | 'unsupported-feature'
  | 'missing-asset'
  | 'complex-layout'
  | 'naming-conflict'
  | 'style-approximation'
  | 'unknown-component';

export interface GenerationError {
  /** Error type */
  type: ErrorType;
  
  /** Human-readable message */
  message: string;
  
  /** Stack trace */
  stack?: string;
  
  /** Related node ID */
  nodeId?: string;
}

export type ErrorType =
  | 'invalid-input'
  | 'generation-failed'
  | 'style-extraction-failed'
  | 'component-conflict';

// ============================================
// ELEMENT MAPPING TYPES
// ============================================

export interface ElementMapping {
  /** HTML element to use */
  element: string;
  
  /** ARIA role */
  role?: string;
  
  /** Default props */
  defaultProps?: Record<string, string>;
  
  /** Semantic meaning */
  semantic?: SemanticRole;
}

export type SemanticRole =
  | 'button'
  | 'link'
  | 'input'
  | 'text'
  | 'heading'
  | 'image'
  | 'container'
  | 'list'
  | 'listItem'
  | 'navigation'
  | 'form'
  | 'card'
  | 'modal'
  | 'tooltip';

// ============================================
// TEMPLATE TYPES
// ============================================

export interface ComponentTemplate {
  /** Template name */
  name: string;
  
  /** Template content */
  content: string;
  
  /** Required variables */
  variables: string[];
  
  /** Optional variables */
  optionalVariables?: string[];
}

export interface TemplateContext {
  /** Component name */
  componentName: string;
  
  /** Props interface name */
  propsInterfaceName: string;
  
  /** Props definition */
  propsDefinition: string;
  
  /** Imports block */
  importsBlock: string;
  
  /** JSX content */
  jsxContent: string;
  
  /** Style classes or object */
  styles: string;
  
  /** Hooks and logic */
  hooks?: string;
  
  /** Event handlers */
  handlers?: string;
  
  /** JSDoc comment */
  jsDoc?: string;
}

// ============================================
// UTILITY TYPES
// ============================================

export interface ColorValue {
  hex: string;
  rgb: { r: number; g: number; b: number };
  rgba: { r: number; g: number; b: number; a: number };
  hsl: { h: number; s: number; l: number };
}

export interface SpacingValue {
  px: number;
  rem: number;
  tailwind?: string;
}

export interface FontValue {
  family: string;
  size: number;
  weight: number;
  lineHeight: number;
  letterSpacing: number;
}

// ============================================
// EXPORTS
// ============================================

export default ReactGeneratorConfig;
