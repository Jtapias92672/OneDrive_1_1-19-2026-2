/**
 * Code Generators - Target format generators
 *
 * Each generator uses the unified extraction layer to produce different outputs.
 * Prevents code duplication and ensures consistency.
 *
 * Guided by Skills:
 * - forge-architectural-entropy.md: Shared extractors prevent duplication
 * - react-best-practices.md: Type-safe, performant code generation
 */

export { ReactGenerator } from './react-generator';
export type { ReactGeneratorOptions } from './react-generator';

export { TestGenerator } from './test-generator';
export type { TestGeneratorOptions } from './test-generator';

export { StorybookGenerator } from './storybook-generator';
export type { StorybookGeneratorOptions } from './storybook-generator';
