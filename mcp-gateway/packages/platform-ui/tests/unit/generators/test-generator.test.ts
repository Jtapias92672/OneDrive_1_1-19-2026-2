/**
 * Unit Tests: TestGenerator (Phase 3)
 *
 * Tests comprehensive Jest test generation including:
 * - Import statements
 * - Basic rendering tests
 * - Text content tests
 * - Props tests (required/optional)
 * - Visual style tests
 * - Interaction tests (onClick handlers)
 * - Accessibility tests
 * - Generator options
 */

import { TestGenerator } from '@/lib/generation/generators';
import type { ParsedComponent } from '@/lib/poc/types';

describe('TestGenerator', () => {
  let generator: TestGenerator;

  beforeEach(() => {
    generator = new TestGenerator();
  });

  describe('Basic Test Generation', () => {
    it('should generate import statements', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const test = generator.generateTest(component, 'Button');

      expect(test).toContain("import React from 'react'");
      expect(test).toContain("import { render, screen } from '@testing-library/react'");
      expect(test).toContain("import '@testing-library/jest-dom'");
      expect(test).toContain("import Button from '../components/Button'");
    });

    it('should generate describe block', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const test = generator.generateTest(component, 'Button');

      expect(test).toContain("describe('Button'");
    });

    it('should generate rendering test', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const test = generator.generateTest(component, 'Button');

      expect(test).toContain("it('renders without crashing'");
      expect(test).toContain('render(<Button');
      expect(test).toContain('expect(container).toBeInTheDocument()');
    });
  });

  describe('Generator Options', () => {
    it('should include userEvent import when interactions enabled', () => {
      const generator = new TestGenerator({ includeInteractionTests: true });

      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'onClick', type: 'function', required: false },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const test = generator.generateTest(component, 'Button');

      expect(test).toContain("import userEvent from '@testing-library/user-event'");
    });

    it('should skip visual tests when disabled', () => {
      const generator = new TestGenerator({ includeVisualTests: false });

      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
        fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1 }],
      };

      const test = generator.generateTest(component, 'Button');

      expect(test).not.toContain('has correct background color');
    });

    it('should skip interaction tests when disabled', () => {
      const generator = new TestGenerator({ includeInteractionTests: false });

      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'onClick', type: 'function', required: false },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const test = generator.generateTest(component, 'Button');

      expect(test).not.toContain('handles click events');
      expect(test).not.toContain('userEvent');
    });

    it('should skip accessibility tests when disabled', () => {
      const generator = new TestGenerator({ includeA11yTests: false });

      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'button',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const test = generator.generateTest(component, 'Button');

      expect(test).not.toContain('is accessible');
    });
  });

  describe('Text Content Tests', () => {
    it('should generate text content test', () => {
      const component: ParsedComponent = {
        id: 'text-1',
        name: 'Text',
        type: 'text',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 20 },
        text: {
          content: 'Click Me',
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 400,
          textAlign: 'left',
        },
      };

      const test = generator.generateTest(component, 'Text');

      expect(test).toContain("it('displays correct text content'");
      expect(test).toContain('screen.getByText("Click Me")');
    });

    it('should escape quotes in text', () => {
      const component: ParsedComponent = {
        id: 'text-1',
        name: 'Text',
        type: 'text',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 20 },
        text: {
          content: 'Text with "quotes"',
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 400,
          textAlign: 'left',
        },
      };

      const test = generator.generateTest(component, 'Text');

      expect(test).toContain('\\"quotes\\"');
    });
  });

  describe('Props Tests', () => {
    it('should generate test for required props', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'label', type: 'string', required: true },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const test = generator.generateTest(component, 'Button');

      expect(test).toContain("it('requires label prop'");
      expect(test).toContain('label:');
    });

    it('should generate test for optional props', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'disabled', type: 'boolean', required: false },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const test = generator.generateTest(component, 'Button');

      expect(test).toContain("it('accepts optional props'");
    });

    it('should use default values for props', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'label', type: 'string', required: true, defaultValue: '"Submit"' },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const test = generator.generateTest(component, 'Button');

      expect(test).toContain('label: "Submit"');
    });

    it('should generate mock values for different prop types', () => {
      const component: ParsedComponent = {
        id: 'form-1',
        name: 'Form',
        type: 'FRAME',
        props: [
          { name: 'title', type: 'string', required: true },
          { name: 'count', type: 'number', required: true },
          { name: 'enabled', type: 'boolean', required: true },
          { name: 'onClick', type: 'function', required: true },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 100 },
      };

      const test = generator.generateTest(component, 'Form');

      // Should contain mock values for each type
      expect(test).toContain('title:');
      expect(test).toContain('count:');
      expect(test).toContain('enabled:');
      expect(test).toContain('onClick:');
    });
  });

  describe('Visual Style Tests', () => {
    it('should generate background color test', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 1, a: 1 }, opacity: 1 }],
      };

      const test = generator.generateTest(component, 'Box');

      expect(test).toContain("it('has correct background color'");
      expect(test).toContain('toHaveStyle');
      expect(test).toContain('backgroundColor:');
    });

    it('should skip visual test when no fill color', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const test = generator.generateTest(component, 'Box');

      expect(test).not.toContain('has correct background color');
    });
  });

  describe('Interaction Tests', () => {
    it('should generate onClick test', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'FRAME',
        props: [
          { name: 'onClick', type: 'function', required: false },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const test = generator.generateTest(component, 'Button');

      expect(test).toContain("it('handles click events'");
      expect(test).toContain('const handleClick = jest.fn()');
      expect(test).toContain('userEvent.setup()');
      expect(test).toContain('await user.click(element)');
      expect(test).toContain('expect(handleClick).toHaveBeenCalledTimes(1)');
    });

    it('should skip interaction test when no onClick', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [
          { name: 'label', type: 'string', required: true },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const test = generator.generateTest(component, 'Box');

      expect(test).not.toContain('handles click events');
    });
  });

  describe('Accessibility Tests', () => {
    it('should generate button accessibility test', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'Button',
        type: 'button',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 40 },
      };

      const test = generator.generateTest(component, 'Button');

      expect(test).toContain("it('is accessible as a button'");
      expect(test).toContain("screen.getByRole('button')");
    });

    it('should generate image accessibility test', () => {
      const component: ParsedComponent = {
        id: 'img-1',
        name: 'Photo',
        type: 'image',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 200, height: 150 },
        imageUrl: 'https://example.com/photo.jpg',
      };

      const test = generator.generateTest(component, 'Photo');

      expect(test).toContain("it('has accessible image alt text'");
      expect(test).toContain("screen.getByRole('img')");
      expect(test).toContain('toHaveAccessibleName()');
    });

    it('should skip accessibility test for generic components', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const test = generator.generateTest(component, 'Box');

      // Should not contain a11y tests for generic components
      expect(test).not.toContain('is accessible');
    });
  });

  describe('Mock Value Generation', () => {
    it('should generate mock string value', () => {
      const component: ParsedComponent = {
        id: 'comp-1',
        name: 'Component',
        type: 'FRAME',
        props: [
          { name: 'title', type: 'string', required: true },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const test = generator.generateTest(component, 'Component');

      expect(test).toContain('title: "title value"');
    });

    it('should generate mock number value', () => {
      const component: ParsedComponent = {
        id: 'comp-1',
        name: 'Component',
        type: 'FRAME',
        props: [
          { name: 'count', type: 'number', required: true },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const test = generator.generateTest(component, 'Component');

      expect(test).toContain('count: 0');
    });

    it('should generate mock boolean value', () => {
      const component: ParsedComponent = {
        id: 'comp-1',
        name: 'Component',
        type: 'FRAME',
        props: [
          { name: 'enabled', type: 'boolean', required: true },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const test = generator.generateTest(component, 'Component');

      expect(test).toContain('enabled: false');
    });

    it('should generate jest.fn() for function props', () => {
      const component: ParsedComponent = {
        id: 'comp-1',
        name: 'Component',
        type: 'FRAME',
        props: [
          { name: 'onSubmit', type: '() => void', required: true },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const test = generator.generateTest(component, 'Component');

      expect(test).toContain('onSubmit: jest.fn()');
    });

    it('should generate empty array for array props', () => {
      const component: ParsedComponent = {
        id: 'comp-1',
        name: 'Component',
        type: 'FRAME',
        props: [
          { name: 'items', type: 'array', required: true },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const test = generator.generateTest(component, 'Component');

      expect(test).toContain('items: []');
    });
  });

  describe('Edge Cases', () => {
    it('should handle component with no props', () => {
      const component: ParsedComponent = {
        id: 'simple-1',
        name: 'Simple',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const test = generator.generateTest(component, 'Simple');

      expect(test).toBeTruthy();
      expect(test).toContain("describe('Simple'");
    });

    it('should handle component with no text', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const test = generator.generateTest(component, 'Box');

      expect(test).toBeTruthy();
      expect(test).not.toContain('displays correct text content');
    });

    it('should handle component with no fills', () => {
      const component: ParsedComponent = {
        id: 'box-1',
        name: 'Box',
        type: 'FRAME',
        props: [],
        styles: {},
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      const test = generator.generateTest(component, 'Box');

      expect(test).toBeTruthy();
      expect(test).not.toContain('has correct background color');
    });
  });

  describe('Complete Test Suite Generation', () => {
    it('should generate complete test file for button', () => {
      const component: ParsedComponent = {
        id: 'btn-1',
        name: 'PrimaryButton',
        type: 'button',
        props: [
          { name: 'label', type: 'string', required: true, defaultValue: '"Click Me"' },
          { name: 'onClick', type: 'function', required: false },
        ],
        styles: {},
        bounds: { x: 0, y: 0, width: 120, height: 40 },
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 1, a: 1 }, opacity: 1 }],
        text: {
          content: 'Click Me',
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 500,
          textAlign: 'center',
        },
      };

      const test = generator.generateTest(component, 'PrimaryButton');

      // Should include all test types
      expect(test).toContain("describe('PrimaryButton'");
      expect(test).toContain('renders without crashing');
      expect(test).toContain('displays correct text content');
      expect(test).toContain('requires label prop');
      expect(test).toContain('has correct background color');
      expect(test).toContain('handles click events');
      expect(test).toContain('is accessible as a button');
    });
  });
});
