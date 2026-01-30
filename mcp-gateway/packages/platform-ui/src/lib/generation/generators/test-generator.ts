/**
 * TestGenerator - Generate Jest tests for React components
 *
 * Uses unified extraction layer to generate meaningful tests that verify:
 * - Props (type safety, required/optional)
 * - Visual styles (colors, layout, typography)
 * - Interactions (onClick, onChange handlers)
 * - Text content (actual rendered text)
 *
 * Guided by Skills:
 * - react-best-practices.md: Testing best practices, accessibility
 * - forge-architectural-entropy.md: Uses shared extractors (no duplication)
 */

import type { ParsedComponent } from '../../poc/types';
import {
  StyleExtractor,
  ImageResolver,
  TextExtractor,
  PropsExtractor,
  type InferredProp,
} from '../extractors';

export interface TestGeneratorOptions {
  /**
   * Include visual style tests (colors, layout)
   * Default: true
   */
  includeVisualTests?: boolean;

  /**
   * Include interaction tests (onClick, onChange)
   * Default: true
   */
  includeInteractionTests?: boolean;

  /**
   * Include accessibility tests (ARIA, semantic HTML)
   * Default: true
   */
  includeA11yTests?: boolean;
}

export class TestGenerator {
  private styleExtractor: StyleExtractor;
  private imageResolver: ImageResolver;
  private textExtractor: TextExtractor;
  private propsExtractor: PropsExtractor;

  constructor(private options: TestGeneratorOptions = {}) {
    this.styleExtractor = new StyleExtractor();
    this.imageResolver = new ImageResolver();
    this.textExtractor = new TextExtractor();
    this.propsExtractor = new PropsExtractor();

    // Set defaults
    this.options.includeVisualTests = options.includeVisualTests !== false;
    this.options.includeInteractionTests = options.includeInteractionTests !== false;
    this.options.includeA11yTests = options.includeA11yTests !== false;
  }

  /**
   * Generate Jest test code for React component
   *
   * @param component - Parsed Figma component
   * @param componentName - PascalCase component name
   * @returns Jest test code string
   */
  generateTest(component: ParsedComponent, componentName: string): string {
    // Extract component data
    const props = this.propsExtractor.extractProps(component);
    const text = this.textExtractor.extractText(component);
    const hasImages = this.imageResolver.shouldRenderAsImage(component);

    // Generate test sections
    const imports = this.generateImports(componentName);
    const describeBlock = this.generateDescribeBlock(
      component,
      componentName,
      props,
      text,
      hasImages
    );

    return `${imports}\n\n${describeBlock}`;
  }

  /**
   * Generate import statements
   */
  private generateImports(componentName: string): string {
    const imports: string[] = [
      "import React from 'react';",
      "import { render, screen } from '@testing-library/react';",
      "import '@testing-library/jest-dom';",
      `import ${componentName} from './${componentName}';`,
    ];

    // Add user-event if interaction tests enabled
    if (this.options.includeInteractionTests) {
      imports.splice(2, 0, "import userEvent from '@testing-library/user-event';");
    }

    return imports.join('\n');
  }

  /**
   * Generate describe block with test cases
   */
  private generateDescribeBlock(
    component: ParsedComponent,
    componentName: string,
    props: InferredProp[],
    text: string | null,
    hasImages: boolean
  ): string {
    const tests: string[] = [];

    // Basic rendering test (always included)
    tests.push(this.generateRenderTest(componentName, props));

    // Text content test
    if (text) {
      tests.push(this.generateTextContentTest(componentName, text));
    }

    // Props tests
    if (props.length > 0) {
      tests.push(this.generatePropsTest(componentName, props));
    }

    // Visual style tests
    if (this.options.includeVisualTests) {
      const visualTest = this.generateVisualTest(component, componentName);
      if (visualTest) {
        tests.push(visualTest);
      }
    }

    // Interaction tests
    if (this.options.includeInteractionTests) {
      const interactionTest = this.generateInteractionTest(component, componentName, props);
      if (interactionTest) {
        tests.push(interactionTest);
      }
    }

    // Accessibility tests
    if (this.options.includeA11yTests) {
      const a11yTest = this.generateA11yTest(component, componentName, hasImages);
      if (a11yTest) {
        tests.push(a11yTest);
      }
    }

    const testsString = tests.map(t => `  ${t}`).join('\n\n');

    return `describe('${componentName}', () => {
${testsString}
});`;
  }

  /**
   * Generate basic rendering test
   */
  private generateRenderTest(componentName: string, props: InferredProp[]): string {
    // Build minimal props object
    const requiredProps = props.filter(p => p.required);
    const propsObject = requiredProps.length > 0
      ? this.generateMockProps(requiredProps)
      : '';

    const propsArg = propsObject ? ` {...${propsObject}}` : '';

    return `it('renders without crashing', () => {
${propsObject ? `    ${propsObject}\n` : ''}    const { container } = render(<${componentName}${propsArg} />);
    expect(container).toBeInTheDocument();
  });`;
  }

  /**
   * Generate text content test
   */
  private generateTextContentTest(componentName: string, text: string): string {
    // Escape quotes in text
    const escapedText = text.replace(/"/g, '\\"');

    return `it('displays correct text content', () => {
    render(<${componentName} />);
    expect(screen.getByText("${escapedText}")).toBeInTheDocument();
  });`;
  }

  /**
   * Generate props test (required props cause error if missing)
   */
  private generatePropsTest(componentName: string, props: InferredProp[]): string {
    const requiredProps = props.filter(p => p.required);

    if (requiredProps.length === 0) {
      return `it('accepts optional props', () => {
    const optionalProps = ${this.generateMockProps(props.filter(p => !p.required))};
    const { container } = render(<${componentName} {...optionalProps} />);
    expect(container).toBeInTheDocument();
  });`;
    }

    const propName = requiredProps[0].name;
    const mockValue = this.getMockValue(requiredProps[0]);

    return `it('requires ${propName} prop', () => {
    const props = { ${propName}: ${mockValue} };
    const { container } = render(<${componentName} {...props} />);
    expect(container).toBeInTheDocument();
  });`;
  }

  /**
   * Generate visual style test
   */
  private generateVisualTest(component: ParsedComponent, componentName: string): string | null {
    const fillColor = this.styleExtractor.extractFillColor(component);

    if (!fillColor) return null;

    return `it('has correct background color', () => {
    const { container } = render(<${componentName} />);
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveStyle({ backgroundColor: '${fillColor}' });
  });`;
  }

  /**
   * Generate interaction test (onClick, onChange)
   */
  private generateInteractionTest(
    component: ParsedComponent,
    componentName: string,
    props: InferredProp[]
  ): string | null {
    // Check if component has onClick handler
    const hasOnClick = props.some(p => p.name === 'onClick');

    if (!hasOnClick) return null;

    return `it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    render(<${componentName} onClick={handleClick} />);

    const element = screen.getByRole('button');
    await user.click(element);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });`;
  }

  /**
   * Generate accessibility test
   */
  private generateA11yTest(component: ParsedComponent, componentName: string, hasImages: boolean): string | null {
    if (component.type === 'button') {
      return `it('is accessible as a button', () => {
    render(<${componentName} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });`;
    }

    if (hasImages) {
      return `it('has accessible image alt text', () => {
    render(<${componentName} />);
    const image = screen.getByRole('img');
    expect(image).toHaveAccessibleName();
  });`;
    }

    return null;
  }

  /**
   * Generate mock props object
   */
  private generateMockProps(props: InferredProp[]): string {
    if (props.length === 0) return '{}';

    const entries = props.map(prop => {
      const value = this.getMockValue(prop);
      return `${prop.name}: ${value}`;
    });

    return `{ ${entries.join(', ')} }`;
  }

  /**
   * Get mock value for prop based on type
   */
  private getMockValue(prop: InferredProp): string {
    // Use default value if available
    if (prop.defaultValue) {
      return prop.defaultValue;
    }

    // Generate mock based on type
    const type = prop.type.toLowerCase();

    if (type.includes('string')) {
      return `"${prop.name} value"`;
    }

    if (type.includes('number')) {
      return '0';
    }

    if (type.includes('boolean')) {
      return 'false';
    }

    if (type.includes('() => void') || type.includes('function')) {
      return 'jest.fn()';
    }

    if (type.includes('array')) {
      return '[]';
    }

    if (type.includes('react.reactnode')) {
      return '<div>Child content</div>';
    }

    // Default: empty object
    return '{}';
  }
}
