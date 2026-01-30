/**
 * RenderEngine - Unified orchestration for all generators
 *
 * Single entry point for generating React, Test, Storybook, and HTML from Figma designs.
 * Orchestrates extraction + rendering for any target format.
 *
 * Guided by Skills:
 * - forge-architectural-entropy.md: Single orchestration point prevents duplication
 * - react-best-practices.md: Type-safe, performant generation
 * - forge-vector-containers.md: Consistent logo handling across all formats
 * - forge-hierarchy-preservation.md: Consistent hierarchy handling across all formats
 */

import type { ParsedComponent } from '../poc/types';
import {
  createExtractors,
  type StyleExtractor,
  type ImageResolver,
  type LayoutCalculator,
  type TextExtractor,
  type PropsExtractor,
} from './extractors';
import {
  ReactGenerator,
  TestGenerator,
  StorybookGenerator,
  HTMLGenerator,
  type ReactGeneratorOptions,
  type TestGeneratorOptions,
  type StorybookGeneratorOptions,
  type HTMLGeneratorOptions,
} from './generators';

/**
 * Target format for code generation
 */
export type RenderTarget = 'react' | 'test' | 'storybook' | 'html';

/**
 * Options for RenderEngine
 */
export interface RenderEngineOptions {
  /**
   * Options for React generator
   */
  reactOptions?: ReactGeneratorOptions;

  /**
   * Options for Test generator
   */
  testOptions?: TestGeneratorOptions;

  /**
   * Options for Storybook generator
   */
  storybookOptions?: StorybookGeneratorOptions;

  /**
   * Options for HTML generator
   */
  htmlOptions?: HTMLGeneratorOptions;
}

/**
 * Generated code for a component across all targets
 */
export interface GeneratedCode {
  /**
   * Component name (PascalCase)
   */
  componentName: string;

  /**
   * React component code
   */
  react?: string;

  /**
   * Test code
   */
  test?: string;

  /**
   * Storybook story code
   */
  storybook?: string;

  /**
   * HTML code
   */
  html?: string;
}

/**
 * RenderEngine - Unified code generation orchestrator
 *
 * SKILL: forge-architectural-entropy.md
 * Single orchestration point ensures all generators use same extractors
 */
export class RenderEngine {
  // Shared extractors (single source of truth)
  private styleExtractor: StyleExtractor;
  private imageResolver: ImageResolver;
  private layoutCalculator: LayoutCalculator;
  private textExtractor: TextExtractor;
  private propsExtractor: PropsExtractor;

  // Generators
  private reactGenerator: ReactGenerator;
  private testGenerator: TestGenerator;
  private storybookGenerator: StorybookGenerator;
  private htmlGenerator: HTMLGenerator;

  constructor(options: RenderEngineOptions = {}) {
    // Initialize shared extractors
    const extractors = createExtractors();
    this.styleExtractor = extractors.styleExtractor;
    this.imageResolver = extractors.imageResolver;
    this.layoutCalculator = extractors.layoutCalculator;
    this.textExtractor = extractors.textExtractor;
    this.propsExtractor = extractors.propsExtractor;

    // Initialize generators with options
    this.reactGenerator = new ReactGenerator(options.reactOptions);
    this.testGenerator = new TestGenerator(options.testOptions);
    this.storybookGenerator = new StorybookGenerator(options.storybookOptions);
    this.htmlGenerator = new HTMLGenerator(options.htmlOptions);
  }

  /**
   * Render component to target format
   *
   * @param component - Parsed Figma component
   * @param componentName - PascalCase component name
   * @param target - Target format (react, test, storybook, html)
   * @returns Generated code string
   */
  render(component: ParsedComponent, componentName: string, target: RenderTarget): string {
    switch (target) {
      case 'react':
        return this.reactGenerator.generateComponent(component, componentName);

      case 'test':
        return this.testGenerator.generateTest(component, componentName);

      case 'storybook':
        return this.storybookGenerator.generateStory(component, componentName);

      case 'html':
        return this.htmlGenerator.renderComponentTree(component);

      default:
        throw new Error(`Unknown render target: ${target}`);
    }
  }

  /**
   * Render component to all targets
   *
   * @param component - Parsed Figma component
   * @param componentName - PascalCase component name
   * @param targets - Array of targets to generate (default: all)
   * @returns Generated code for all requested targets
   */
  renderAll(
    component: ParsedComponent,
    componentName: string,
    targets: RenderTarget[] = ['react', 'test', 'storybook', 'html']
  ): GeneratedCode {
    const result: GeneratedCode = {
      componentName,
    };

    for (const target of targets) {
      const code = this.render(component, componentName, target);

      switch (target) {
        case 'react':
          result.react = code;
          break;
        case 'test':
          result.test = code;
          break;
        case 'storybook':
          result.storybook = code;
          break;
        case 'html':
          result.html = code;
          break;
      }
    }

    return result;
  }

  /**
   * Batch render multiple components
   *
   * @param components - Array of parsed components
   * @param targets - Array of targets to generate (default: all)
   * @returns Array of generated code for all components
   */
  renderBatch(
    components: Array<{ component: ParsedComponent; componentName: string }>,
    targets: RenderTarget[] = ['react', 'test', 'storybook', 'html']
  ): GeneratedCode[] {
    return components.map(({ component, componentName }) =>
      this.renderAll(component, componentName, targets)
    );
  }

  /**
   * Get extractors (for advanced use cases)
   *
   * Allows direct access to extractors for custom generation logic
   */
  getExtractors() {
    return {
      styleExtractor: this.styleExtractor,
      imageResolver: this.imageResolver,
      layoutCalculator: this.layoutCalculator,
      textExtractor: this.textExtractor,
      propsExtractor: this.propsExtractor,
    };
  }

  /**
   * Get generators (for advanced use cases)
   *
   * Allows direct access to generators for custom orchestration
   */
  getGenerators() {
    return {
      reactGenerator: this.reactGenerator,
      testGenerator: this.testGenerator,
      storybookGenerator: this.storybookGenerator,
      htmlGenerator: this.htmlGenerator,
    };
  }
}
