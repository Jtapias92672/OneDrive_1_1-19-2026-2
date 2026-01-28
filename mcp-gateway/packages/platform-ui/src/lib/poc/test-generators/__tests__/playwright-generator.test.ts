/**
 * Tests for PlaywrightTestGenerator
 */

import {
  PlaywrightTestGenerator,
  createPlaywrightTestGenerator,
  type PlaywrightTestConfig,
} from '../playwright-generator';
import type { ParsedComponent, GeneratedComponent } from '../../types';

describe('PlaywrightTestGenerator', () => {
  const defaultConfig: PlaywrightTestConfig = {
    baseUrl: 'http://localhost:3000',
  };

  describe('constructor', () => {
    it('creates instance with config', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      expect(generator).toBeInstanceOf(PlaywrightTestGenerator);
    });

    it('defaults optional config values', () => {
      const generator = new PlaywrightTestGenerator({ baseUrl: 'http://test.com' });
      expect(generator).toBeInstanceOf(PlaywrightTestGenerator);
    });
  });

  describe('createPlaywrightTestGenerator', () => {
    it('creates generator via factory', () => {
      const generator = createPlaywrightTestGenerator(defaultConfig);
      expect(generator).toBeInstanceOf(PlaywrightTestGenerator);
    });
  });

  describe('generate', () => {
    it('generates test for ParsedComponent', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const component: ParsedComponent = {
        id: '1',
        name: 'Button',
        type: 'button',
        props: [],
        styles: {},
      };

      const result = generator.generate(component);

      expect(result.componentName).toBe('Button');
      expect(result.filePath).toBe('Button.e2e.test.ts');
      expect(result.testCode).toContain("import { test, expect } from '@playwright/test'");
    });

    it('generates test for GeneratedComponent', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const component: GeneratedComponent = {
        name: 'Card',
        code: 'export const Card = () => <div>Card</div>',
        filePath: 'Card.tsx',
      };

      const result = generator.generate(component);

      expect(result.componentName).toBe('Card');
      expect(result.testCode).toContain('Card Component');
    });

    it('includes visual snapshot tests by default', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const component: ParsedComponent = {
        id: '1',
        name: 'Button',
        type: 'button',
        props: [],
        styles: {},
      };

      const result = generator.generate(component);

      expect(result.testCode).toContain('matches visual snapshot');
      expect(result.testCode).toContain('toHaveScreenshot');
    });

    it('includes accessibility tests by default', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const component: ParsedComponent = {
        id: '1',
        name: 'Button',
        type: 'button',
        props: [],
        styles: {},
      };

      const result = generator.generate(component);

      expect(result.testCode).toContain('has no accessibility violations');
      expect(result.testCode).toContain('AxeBuilder');
    });

    it('excludes visual tests when disabled', () => {
      const generator = new PlaywrightTestGenerator({
        ...defaultConfig,
        includeVisualTests: false,
      });
      const component: ParsedComponent = {
        id: '1',
        name: 'Button',
        type: 'button',
        props: [],
        styles: {},
      };

      const result = generator.generate(component);

      expect(result.testCode).not.toContain('toHaveScreenshot');
    });

    it('excludes accessibility tests when disabled', () => {
      const generator = new PlaywrightTestGenerator({
        ...defaultConfig,
        includeAccessibilityTests: false,
      });
      const component: ParsedComponent = {
        id: '1',
        name: 'Button',
        type: 'button',
        props: [],
        styles: {},
      };

      const result = generator.generate(component);

      expect(result.testCode).not.toContain('AxeBuilder');
    });

    it('generates button interaction tests', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const component: ParsedComponent = {
        id: '1',
        name: 'SubmitButton',
        type: 'button',
        props: [],
        styles: {},
      };

      const result = generator.generate(component);

      expect(result.testCode).toContain('responds to click');
      expect(result.testCode).toContain('button.click()');
    });

    it('generates input interaction tests', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const component: ParsedComponent = {
        id: '1',
        name: 'EmailInput',
        type: 'input',
        props: [],
        styles: {},
      };

      const result = generator.generate(component);

      expect(result.testCode).toContain('accepts text input');
      expect(result.testCode).toContain('input.fill');
    });

    it('generates form interaction tests', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const component: ParsedComponent = {
        id: '1',
        name: 'LoginForm',
        type: 'form',
        props: [],
        styles: {},
      };

      const result = generator.generate(component);

      expect(result.testCode).toContain('submits form data');
      expect(result.testCode).toContain('validates required fields');
    });

    it('generates prop tests for component props', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const component: ParsedComponent = {
        id: '1',
        name: 'Button',
        type: 'button',
        props: [
          { name: 'variant', type: 'string', required: false },
          { name: 'size', type: 'string', required: false },
        ],
        styles: {},
      };

      const result = generator.generate(component);

      expect(result.testCode).toContain('renders with variant prop');
      expect(result.testCode).toContain('renders with size prop');
    });

    it('skips className, children, and style in prop tests', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const component: ParsedComponent = {
        id: '1',
        name: 'Button',
        type: 'button',
        props: [
          { name: 'className', type: 'string', required: false },
          { name: 'children', type: 'ReactNode', required: false },
          { name: 'style', type: 'object', required: false },
          { name: 'variant', type: 'string', required: false },
        ],
        styles: {},
      };

      const result = generator.generate(component);

      expect(result.testCode).not.toContain('renders with className prop');
      expect(result.testCode).not.toContain('renders with children prop');
      expect(result.testCode).not.toContain('renders with style prop');
      expect(result.testCode).toContain('renders with variant prop');
    });

    it('converts component name to kebab-case test ID', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const component: ParsedComponent = {
        id: '1',
        name: 'UserProfileCard',
        type: 'card',
        props: [],
        styles: {},
      };

      const result = generator.generate(component);

      expect(result.testCode).toContain("getByTestId('user-profile-card')");
    });

    it('uses custom component path when provided', () => {
      const generator = new PlaywrightTestGenerator({
        ...defaultConfig,
        componentPath: '/storybook/Button',
      });
      const component: ParsedComponent = {
        id: '1',
        name: 'Button',
        type: 'button',
        props: [],
        styles: {},
      };

      const result = generator.generate(component);

      expect(result.testCode).toContain('/storybook/Button');
    });

    it('infers component type from name', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);

      // Button inference
      const button: GeneratedComponent = {
        name: 'PrimaryButton',
        code: '',
        filePath: 'PrimaryButton.tsx',
      };
      const buttonResult = generator.generate(button);
      expect(buttonResult.testCode).toContain('responds to click');

      // Input inference
      const input: GeneratedComponent = {
        name: 'TextField',
        code: '',
        filePath: 'TextField.tsx',
      };
      const inputResult = generator.generate(input);
      expect(inputResult.testCode).toContain('accepts text input');

      // Form inference
      const form: GeneratedComponent = {
        name: 'ContactForm',
        code: '',
        filePath: 'ContactForm.tsx',
      };
      const formResult = generator.generate(form);
      expect(formResult.testCode).toContain('submits form data');
    });

    it('infers modal type from name', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);

      const modal: GeneratedComponent = {
        name: 'ConfirmModal',
        code: '',
        filePath: 'ConfirmModal.tsx',
      };
      const result = generator.generate(modal);
      expect(result.testCode).toContain('ConfirmModal Component');

      const dialog: GeneratedComponent = {
        name: 'AlertDialog',
        code: '',
        filePath: 'AlertDialog.tsx',
      };
      const dialogResult = generator.generate(dialog);
      expect(dialogResult.testCode).toContain('AlertDialog Component');
    });

    it('infers navigation type from name', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);

      const nav: GeneratedComponent = {
        name: 'MainNav',
        code: '',
        filePath: 'MainNav.tsx',
      };
      const result = generator.generate(nav);
      expect(result.testCode).toContain('MainNav Component');
    });

    it('defaults to container type for unknown components', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);

      const unknown: GeneratedComponent = {
        name: 'DataDisplay',
        code: '',
        filePath: 'DataDisplay.tsx',
      };
      const result = generator.generate(unknown);
      expect(result.testCode).toContain('DataDisplay Component');
    });

    it('generates prop tests with different prop types', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const component: ParsedComponent = {
        id: '1',
        name: 'TestComponent',
        type: 'container',
        props: [
          { name: 'count', type: 'number', required: false },
          { name: 'enabled', type: 'boolean', required: false },
          { name: 'data', type: 'object', required: false },
        ],
        styles: {},
      };

      const result = generator.generate(component);

      expect(result.testCode).toContain('renders with count prop');
      expect(result.testCode).toContain('renders with enabled prop');
      expect(result.testCode).toContain('renders with data prop');
    });
  });

  describe('generateIntegration', () => {
    it('generates integration test for multiple components', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const components: ParsedComponent[] = [
        { id: '1', name: 'Header', type: 'navigation', props: [], styles: {} },
        { id: '2', name: 'LoginForm', type: 'form', props: [], styles: {} },
        { id: '3', name: 'SubmitButton', type: 'button', props: [], styles: {} },
      ];

      const result = generator.generateIntegration('LoginPage', components);

      expect(result.componentName).toBe('LoginPage');
      expect(result.filePath).toBe('LoginPage.integration.e2e.test.ts');
      expect(result.testCode).toContain('LoginPage Integration Tests');
    });

    it('includes visibility checks for all components', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const components: ParsedComponent[] = [
        { id: '1', name: 'Header', type: 'navigation', props: [], styles: {} },
        { id: '2', name: 'Footer', type: 'container', props: [], styles: {} },
      ];

      const result = generator.generateIntegration('HomePage', components);

      expect(result.testCode).toContain("getByTestId('header')");
      expect(result.testCode).toContain("getByTestId('footer')");
      expect(result.testCode).toContain('toBeVisible()');
    });

    it('includes page-level accessibility test', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const components: ParsedComponent[] = [
        { id: '1', name: 'Content', type: 'container', props: [], styles: {} },
      ];

      const result = generator.generateIntegration('MainPage', components);

      expect(result.testCode).toContain('page has no accessibility violations');
      expect(result.testCode).toContain('AxeBuilder');
    });

    it('includes full-page visual snapshot', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const components: ParsedComponent[] = [
        { id: '1', name: 'Content', type: 'container', props: [], styles: {} },
      ];

      const result = generator.generateIntegration('DashboardPage', components);

      expect(result.testCode).toContain('page matches visual snapshot');
      expect(result.testCode).toContain('DashboardPage-full.png');
      expect(result.testCode).toContain('fullPage: true');
    });

    it('generates interaction flow tests for forms and buttons', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const components: ParsedComponent[] = [
        { id: '1', name: 'SignupForm', type: 'form', props: [], styles: {} },
        { id: '2', name: 'SubmitButton', type: 'button', props: [], styles: {} },
      ];

      const result = generator.generateIntegration('SignupPage', components);

      expect(result.testCode).toContain('user interaction flow');
      expect(result.testCode).toContain('Fill form');
      expect(result.testCode).toContain('Click button');
    });

    it('uses custom page path when provided', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const components: ParsedComponent[] = [
        { id: '1', name: 'Content', type: 'container', props: [], styles: {} },
      ];

      const result = generator.generateIntegration('CustomPage', components, '/custom/path');

      expect(result.testCode).toContain('/custom/path');
    });
  });

  describe('generateAll', () => {
    it('generates tests for all components', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const components: ParsedComponent[] = [
        { id: '1', name: 'Button', type: 'button', props: [], styles: {} },
        { id: '2', name: 'Card', type: 'card', props: [], styles: {} },
        { id: '3', name: 'Input', type: 'input', props: [], styles: {} },
      ];

      const results = generator.generateAll(components);

      expect(results.length).toBe(3);
      expect(results[0].componentName).toBe('Button');
      expect(results[1].componentName).toBe('Card');
      expect(results[2].componentName).toBe('Input');
    });

    it('returns empty array for empty input', () => {
      const generator = new PlaywrightTestGenerator(defaultConfig);
      const results = generator.generateAll([]);

      expect(results).toEqual([]);
    });
  });
});
