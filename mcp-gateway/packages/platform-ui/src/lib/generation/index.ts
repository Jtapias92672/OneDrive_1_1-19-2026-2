/**
 * Generation Module - Unified code generation from Figma designs
 *
 * Complete architecture for generating React, Tests, Storybook, and HTML
 * from Figma designs using shared extraction layer.
 *
 * Guided by Skills:
 * - forge-architectural-entropy.md: Single source of truth prevents duplication
 * - react-best-practices.md: Type-safe, performant generation
 * - forge-vector-containers.md: Consistent logo handling
 * - forge-hierarchy-preservation.md: Consistent hierarchy handling
 *
 * Usage:
 * ```typescript
 * import { RenderEngine } from './generation';
 *
 * const engine = new RenderEngine();
 * const code = engine.renderAll(component, 'MyComponent');
 * // Returns: { react, test, storybook, html }
 * ```
 */

// Export RenderEngine (primary API)
export { RenderEngine } from './render-engine';
export type {
  RenderTarget,
  RenderEngineOptions,
  GeneratedCode,
} from './render-engine';

// Export extractors (for custom generation)
export * from './extractors';

// Export generators (for custom orchestration)
export * from './generators';
