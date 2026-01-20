/**
 * FORGE React Generator Package
 * 
 * @epic 06 - React Generator
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Generates React components from Figma parsed designs.
 *   Supports multiple styling approaches (Tailwind, CSS Modules, styled-components).
 *   Outputs TypeScript or JavaScript with optional Storybook stories and tests.
 */

// ============================================
// CORE EXPORTS
// ============================================

export { ReactGenerator } from './core/generator';
export { default as ReactGeneratorClass } from './core/generator';

export {
  ReactGeneratorConfig,
  DEFAULT_CONFIG,
  OutputFormat,
  StylingApproach,
  NamingConvention,
  ComponentLibrary,
  ComponentMapping,
  Breakpoints,
  AssetConfig,
  FormattingOptions,
  GeneratedComponent,
  GeneratedStyles,
  TailwindStyles,
  CSSStyles,
  ResponsiveStyles,
  GenerationResult,
  GenerationStats,
  GenerationWarning,
  GenerationError,
  WarningType,
  ErrorType,
  ImportStatement,
  ComponentProp,
  ElementMapping,
  SemanticRole,
  ComponentTemplate,
  TemplateContext,
  ColorValue,
  SpacingValue,
  FontValue,
} from './core/types';

// ============================================
// STYLE EXPORTS
// ============================================

export { StyleGenerator } from './styles/style-generator';
export { default as StyleGeneratorClass } from './styles/style-generator';

// ============================================
// COMPONENT EXPORTS
// ============================================

export { ComponentBuilder } from './components/component-builder';
export { default as ComponentBuilderClass } from './components/component-builder';

// ============================================
// UTILITY EXPORTS
// ============================================

export { NameUtils } from './utils/name-utils';
export { default as NameUtilsClass } from './utils/name-utils';

export { CodeFormatter } from './utils/code-formatter';
export { default as CodeFormatterClass } from './utils/code-formatter';

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

import { ReactGenerator } from './core/generator';
import { ReactGeneratorConfig, GenerationResult } from './core/types';

let defaultGenerator: ReactGenerator | null = null;

/**
 * Create a new React Generator
 */
export function createGenerator(config?: Partial<ReactGeneratorConfig>): ReactGenerator {
  return new ReactGenerator(config);
}

/**
 * Get or create the default generator
 */
export function getDefaultGenerator(): ReactGenerator {
  if (!defaultGenerator) {
    defaultGenerator = new ReactGenerator();
  }
  return defaultGenerator;
}

/**
 * Set the default generator
 */
export function setDefaultGenerator(generator: ReactGenerator): void {
  defaultGenerator = generator;
}

/**
 * Quick generation using default generator
 */
export async function generate(design: any): Promise<GenerationResult> {
  return getDefaultGenerator().generate(design);
}

// ============================================
// PRESET CONFIGURATIONS
// ============================================

/**
 * Tailwind CSS preset
 */
export const TAILWIND_PRESET: Partial<ReactGeneratorConfig> = {
  stylingApproach: 'tailwind',
  typescript: true,
  outputFormat: 'functional',
  generatePropTypes: true,
};

/**
 * CSS Modules preset
 */
export const CSS_MODULES_PRESET: Partial<ReactGeneratorConfig> = {
  stylingApproach: 'css-modules',
  typescript: true,
  outputFormat: 'functional',
  generatePropTypes: true,
};

/**
 * Styled Components preset
 */
export const STYLED_COMPONENTS_PRESET: Partial<ReactGeneratorConfig> = {
  stylingApproach: 'styled-components',
  typescript: true,
  outputFormat: 'functional',
  generatePropTypes: true,
};

/**
 * JavaScript preset (no TypeScript)
 */
export const JAVASCRIPT_PRESET: Partial<ReactGeneratorConfig> = {
  typescript: false,
  outputFormat: 'functional',
  generatePropTypes: false,
};

/**
 * Full-featured preset (with stories and tests)
 */
export const FULL_PRESET: Partial<ReactGeneratorConfig> = {
  stylingApproach: 'tailwind',
  typescript: true,
  outputFormat: 'functional',
  generatePropTypes: true,
  generateStories: true,
  generateTests: true,
};

// ============================================
// DEFAULT EXPORT
// ============================================

export default ReactGenerator;
