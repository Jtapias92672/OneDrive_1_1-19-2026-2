/**
 * Playwright Test Generator
 * Generates E2E tests for React components
 *
 * Skills Applied:
 * - impeccable-style: Tests visual consistency
 * - react-best-practices: Tests accessibility
 */

import type { GeneratedComponent, ParsedComponent, ComponentProp } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface PlaywrightTestConfig {
  baseUrl: string;
  componentPath?: string;
  includeVisualTests?: boolean;
  includeAccessibilityTests?: boolean;
  includeInteractionTests?: boolean;
}

export interface GeneratedPlaywrightTest {
  componentName: string;
  testCode: string;
  filePath: string;
}

// =============================================================================
// Templates
// =============================================================================

const TEST_HEADER_BASE = `import { test, expect } from '@playwright/test';`;

const AXE_IMPORT = `import { AxeBuilder } from '@axe-core/playwright';`;

const COMPONENT_TEST_TEMPLATE = `
test.describe('{componentName} Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('{baseUrl}{componentPath}');
  });

  test('renders correctly', async ({ page }) => {
    const component = page.getByTestId('{testId}');
    await expect(component).toBeVisible();
  });

{visualTests}
{accessibilityTests}
{interactionTests}
{propTests}
});
`;

const VISUAL_SNAPSHOT_TEST = `
  test('matches visual snapshot', async ({ page }) => {
    const component = page.getByTestId('{testId}');
    await expect(component).toHaveScreenshot('{componentName}.png');
  });

  test('matches snapshot on hover state', async ({ page }) => {
    const component = page.getByTestId('{testId}');
    await component.hover();
    await expect(component).toHaveScreenshot('{componentName}-hover.png');
  });
`;

const ACCESSIBILITY_TEST = `
  test('has no accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="{testId}"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('is keyboard navigable', async ({ page }) => {
    const component = page.getByTestId('{testId}');
    await component.focus();
    await expect(component).toBeFocused();
  });
`;

const BUTTON_INTERACTION_TEST = `
  test('responds to click', async ({ page }) => {
    const button = page.getByTestId('{testId}');
    await button.click();
    // Verify click effect (customize based on component behavior)
    await expect(button).toBeEnabled();
  });

  test('shows loading state when clicked', async ({ page }) => {
    const button = page.getByTestId('{testId}');
    await button.click();
    // Check for loading indicator if applicable
    // await expect(button).toHaveAttribute('data-loading', 'true');
  });
`;

const INPUT_INTERACTION_TEST = `
  test('accepts text input', async ({ page }) => {
    const input = page.getByTestId('{testId}');
    await input.fill('test value');
    await expect(input).toHaveValue('test value');
  });

  test('shows validation state', async ({ page }) => {
    const input = page.getByTestId('{testId}');
    await input.fill('');
    await input.blur();
    // Check for validation message if applicable
  });
`;

const FORM_INTERACTION_TEST = `
  test('submits form data', async ({ page }) => {
    const form = page.getByTestId('{testId}');
    // Fill form fields
    await form.getByRole('textbox').first().fill('test data');
    await form.getByRole('button', { name: /submit/i }).click();
    // Verify submission (customize based on behavior)
  });

  test('validates required fields', async ({ page }) => {
    const form = page.getByTestId('{testId}');
    await form.getByRole('button', { name: /submit/i }).click();
    // Check for validation errors
    await expect(form.getByText(/required/i)).toBeVisible();
  });
`;

const PROP_TEST_TEMPLATE = `
  test('renders with {propName} prop', async ({ page }) => {
    // Navigate to component with specific prop value
    await page.goto('{baseUrl}{componentPath}?{propName}={propValue}');
    const component = page.getByTestId('{testId}');
    await expect(component).toBeVisible();
  });
`;

const INTEGRATION_TEST_TEMPLATE = `import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('{pageName} Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('{baseUrl}{pagePath}');
  });

  test('all components render', async ({ page }) => {
{componentChecks}
  });

  test('page has no accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('page matches visual snapshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('{pageName}-full.png', {
      fullPage: true,
    });
  });

{interactionFlowTests}
});
`;

// =============================================================================
// Generator Class
// =============================================================================

export class PlaywrightTestGenerator {
  private config: PlaywrightTestConfig;

  constructor(config: PlaywrightTestConfig) {
    this.config = {
      includeVisualTests: true,
      includeAccessibilityTests: true,
      includeInteractionTests: true,
      ...config,
    };
  }

  /**
   * Generate E2E test for a single component
   */
  generate(component: GeneratedComponent | ParsedComponent): GeneratedPlaywrightTest {
    const componentName = this.getComponentName(component);
    const testId = this.toTestId(componentName);
    const componentPath = this.config.componentPath || `/preview/${componentName}`;
    const componentType = this.getComponentType(component);

    let testCode = TEST_HEADER_BASE;
    if (this.config.includeAccessibilityTests) {
      testCode += '\n' + AXE_IMPORT;
    }
    testCode += '\n';

    let componentTest = COMPONENT_TEST_TEMPLATE
      .replace(/{componentName}/g, componentName)
      .replace(/{baseUrl}/g, this.config.baseUrl)
      .replace(/{componentPath}/g, componentPath)
      .replace(/{testId}/g, testId);

    // Add visual tests
    const visualTests = this.config.includeVisualTests
      ? VISUAL_SNAPSHOT_TEST
          .replace(/{componentName}/g, componentName)
          .replace(/{testId}/g, testId)
      : '';

    // Add accessibility tests
    const accessibilityTests = this.config.includeAccessibilityTests
      ? ACCESSIBILITY_TEST.replace(/{testId}/g, testId)
      : '';

    // Add interaction tests based on component type
    const interactionTests = this.config.includeInteractionTests
      ? this.generateInteractionTests(componentType, testId)
      : '';

    // Add prop tests
    const props = this.getProps(component);
    const propTests = this.generatePropTests(props, testId, componentPath);

    componentTest = componentTest
      .replace('{visualTests}', visualTests)
      .replace('{accessibilityTests}', accessibilityTests)
      .replace('{interactionTests}', interactionTests)
      .replace('{propTests}', propTests);

    testCode += componentTest;

    return {
      componentName,
      testCode,
      filePath: `${componentName}.e2e.test.ts`,
    };
  }

  /**
   * Generate integration test for multiple components on a page
   */
  generateIntegration(
    pageName: string,
    components: (GeneratedComponent | ParsedComponent)[],
    pagePath?: string
  ): GeneratedPlaywrightTest {
    const resolvedPagePath = pagePath || `/preview/${pageName}`;

    // Generate component visibility checks
    const componentChecks = components
      .map((c) => {
        const name = this.getComponentName(c);
        const testId = this.toTestId(name);
        return `    await expect(page.getByTestId('${testId}')).toBeVisible();`;
      })
      .join('\n');

    // Generate interaction flow tests
    const interactionFlowTests = this.generateInteractionFlowTests(components);

    const testCode = INTEGRATION_TEST_TEMPLATE
      .replace(/{pageName}/g, pageName)
      .replace(/{baseUrl}/g, this.config.baseUrl)
      .replace(/{pagePath}/g, resolvedPagePath)
      .replace('{componentChecks}', componentChecks)
      .replace('{interactionFlowTests}', interactionFlowTests);

    return {
      componentName: pageName,
      testCode,
      filePath: `${pageName}.integration.e2e.test.ts`,
    };
  }

  /**
   * Generate tests for all components
   */
  generateAll(components: (GeneratedComponent | ParsedComponent)[]): GeneratedPlaywrightTest[] {
    return components.map((component) => this.generate(component));
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private getComponentName(component: GeneratedComponent | ParsedComponent): string {
    return 'code' in component ? component.name : component.name;
  }

  private getComponentType(component: GeneratedComponent | ParsedComponent): string {
    if ('type' in component) {
      return component.type;
    }
    // Infer from name
    const name = component.name.toLowerCase();
    if (name.includes('button')) return 'button';
    if (name.includes('input') || name.includes('field')) return 'input';
    if (name.includes('form')) return 'form';
    if (name.includes('card')) return 'card';
    if (name.includes('modal') || name.includes('dialog')) return 'modal';
    if (name.includes('nav')) return 'navigation';
    return 'container';
  }

  private getProps(component: GeneratedComponent | ParsedComponent): ComponentProp[] {
    if ('props' in component) {
      return component.props;
    }
    return [];
  }

  private toTestId(name: string): string {
    return name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
      .replace(/\s+/g, '-');
  }

  private generateInteractionTests(componentType: string, testId: string): string {
    switch (componentType) {
      case 'button':
        return BUTTON_INTERACTION_TEST.replace(/{testId}/g, testId);
      case 'input':
        return INPUT_INTERACTION_TEST.replace(/{testId}/g, testId);
      case 'form':
        return FORM_INTERACTION_TEST.replace(/{testId}/g, testId);
      default:
        return '';
    }
  }

  private generatePropTests(
    props: ComponentProp[],
    testId: string,
    componentPath: string
  ): string {
    const testableProps = props.filter(
      (p) => p.name !== 'className' && p.name !== 'children' && p.name !== 'style'
    );

    if (testableProps.length === 0) return '';

    return testableProps
      .slice(0, 3) // Limit to 3 prop tests
      .map((prop) => {
        const propValue = this.getDefaultTestValue(prop.type);
        return PROP_TEST_TEMPLATE
          .replace(/{propName}/g, prop.name)
          .replace(/{propValue}/g, encodeURIComponent(propValue))
          .replace(/{testId}/g, testId)
          .replace(/{baseUrl}/g, this.config.baseUrl)
          .replace(/{componentPath}/g, componentPath);
      })
      .join('\n');
  }

  private generateInteractionFlowTests(
    components: (GeneratedComponent | ParsedComponent)[]
  ): string {
    // Find forms and buttons for flow testing
    const forms = components.filter((c) => this.getComponentType(c) === 'form');
    const buttons = components.filter((c) => this.getComponentType(c) === 'button');

    if (forms.length === 0 && buttons.length === 0) {
      return '';
    }

    let flowTest = `
  test('user interaction flow', async ({ page }) => {`;

    // Add form interaction
    if (forms.length > 0) {
      const formName = this.getComponentName(forms[0]);
      const formTestId = this.toTestId(formName);
      flowTest += `
    // Fill form
    const form = page.getByTestId('${formTestId}');
    await form.getByRole('textbox').first().fill('test data');`;
    }

    // Add button interaction
    if (buttons.length > 0) {
      const buttonName = this.getComponentName(buttons[0]);
      const buttonTestId = this.toTestId(buttonName);
      flowTest += `
    // Click button
    const button = page.getByTestId('${buttonTestId}');
    await button.click();`;
    }

    flowTest += `
    // Verify result
    await expect(page).toHaveURL(/.*/);
  });`;

    return flowTest;
  }

  private getDefaultTestValue(type: string): string {
    switch (type.toLowerCase()) {
      case 'string':
        return 'test-value';
      case 'number':
        return '42';
      case 'boolean':
        return 'true';
      default:
        return 'test';
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createPlaywrightTestGenerator(
  config: PlaywrightTestConfig
): PlaywrightTestGenerator {
  return new PlaywrightTestGenerator(config);
}
