/**
 * Generation Extractors - Single Source of Truth
 *
 * Centralized extraction layer for all generators (HTML, React, Tests, Storybook).
 * Prevents code duplication and ensures consistency across generation targets.
 *
 * Guided by Skills:
 * - forge-architectural-entropy.md: Single implementation prevents duplication
 * - forge-vector-containers.md: Codified logo rendering pattern
 * - forge-hierarchy-preservation.md: Recursive, parent-aware extraction
 * - react-best-practices.md: Performance-optimized patterns
 *
 * Usage:
 * ```typescript
 * import { StyleExtractor, ImageResolver, LayoutCalculator, TextExtractor, PropsExtractor } from './generation/extractors';
 *
 * const styleExtractor = new StyleExtractor();
 * const imageResolver = new ImageResolver();
 * const layoutCalculator = new LayoutCalculator();
 * const textExtractor = new TextExtractor();
 * const propsExtractor = new PropsExtractor();
 *
 * // Use in generators
 * const fillColor = styleExtractor.extractFillColor(component);
 * const isLogo = imageResolver.isVectorContainer(component);
 * const position = layoutCalculator.calculatePosition(component, parent);
 * const text = textExtractor.extractText(component);
 * const props = propsExtractor.extractProps(component);
 * ```
 */

import { StyleExtractor } from './style-extractor';
import { ImageResolver } from './image-resolver';
import { LayoutCalculator } from './layout-calculator';
import { TextExtractor } from './text-extractor';
import { PropsExtractor } from './props-extractor';

export { StyleExtractor } from './style-extractor';
export type { ExtractedTextStyles } from './style-extractor';

export { ImageResolver } from './image-resolver';

export { LayoutCalculator } from './layout-calculator';
export type { CalculatedPosition, FlexLayoutInfo } from './layout-calculator';

export { TextExtractor } from './text-extractor';
export type { ExtractedTypography } from './text-extractor';

export { PropsExtractor } from './props-extractor';
export type { InferredProp } from './props-extractor';

/**
 * Factory function to create all extractors at once
 * Useful for dependency injection in generators
 */
export function createExtractors() {
  return {
    styleExtractor: new StyleExtractor(),
    imageResolver: new ImageResolver(),
    layoutCalculator: new LayoutCalculator(),
    textExtractor: new TextExtractor(),
    propsExtractor: new PropsExtractor(),
  };
}
