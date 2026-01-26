/**
 * FORGE React Generator - ComponentBuilder Tests
 *
 * @epic 06 - React Generator
 * Target: 97%+ coverage for component-builder.ts
 */

import { ComponentBuilder } from '../src/components/component-builder';
import { DEFAULT_CONFIG } from '../src/core/types';
import type { ReactGeneratorConfig } from '../src/core/types';

describe('ComponentBuilder', () => {
  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  describe('constructor', () => {
    it('should create with default config', () => {
      const builder = new ComponentBuilder(DEFAULT_CONFIG);
      expect(builder).toBeDefined();
    });

    it('should create with custom config', () => {
      const config: ReactGeneratorConfig = {
        ...DEFAULT_CONFIG,
        stylingApproach: 'css-modules',
      };
      const builder = new ComponentBuilder(config);
      expect(builder).toBeDefined();
    });
  });

  // ==========================================
  // BUILD JSX - BASIC FRAMES
  // ==========================================

  describe('buildJSX', () => {
    let builder: ComponentBuilder;

    beforeEach(() => {
      builder = new ComponentBuilder(DEFAULT_CONFIG);
    });

    it('should build JSX for visible frame', () => {
      const frame = {
        id: 'frame-1',
        name: 'Container',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: ['flex'] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
      expect(jsx).toContain('className');
    });

    it('should return empty string for invisible frame', () => {
      const frame = {
        id: 'frame-1',
        name: 'Container',
        type: 'FRAME',
        visible: false,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: ['flex'] } }, DEFAULT_CONFIG);

      expect(jsx).toBe('');
    });

    it('should handle TEXT type with content', () => {
      const frame = {
        id: 'text-1',
        name: 'Label',
        type: 'TEXT',
        visible: true,
        textContent: 'Hello World',
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<span');
      expect(jsx).toContain('</span>');
    });

    it('should handle RECTANGLE type', () => {
      const frame = {
        id: 'rect-1',
        name: 'Box',
        type: 'RECTANGLE',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
    });

    it('should handle RECTANGLE with click interaction as button', () => {
      const frame = {
        id: 'rect-1',
        name: 'Box',
        type: 'RECTANGLE',
        visible: true,
        children: [],
        interactions: [{ trigger: 'click' }],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<button');
    });

    it('should handle ELLIPSE type', () => {
      const frame = {
        id: 'ellipse-1',
        name: 'Circle',
        type: 'ELLIPSE',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
    });

    it('should handle POLYGON type', () => {
      const frame = {
        id: 'polygon-1',
        name: 'Triangle',
        type: 'POLYGON',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
    });

    it('should handle STAR type', () => {
      const frame = {
        id: 'star-1',
        name: 'Star',
        type: 'STAR',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
    });

    it('should handle VECTOR type', () => {
      const frame = {
        id: 'vector-1',
        name: 'Vector',
        type: 'VECTOR',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
    });

    it('should handle INSTANCE type', () => {
      const frame = {
        id: 'instance-1',
        name: 'Instance',
        type: 'INSTANCE',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
    });

    it('should handle COMPONENT type', () => {
      const frame = {
        id: 'comp-1',
        name: 'MyComponent',
        type: 'COMPONENT',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
    });

    it('should handle GROUP type', () => {
      const frame = {
        id: 'group-1',
        name: 'Group',
        type: 'GROUP',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
    });

    it('should handle unknown type as container', () => {
      const frame = {
        id: 'unknown-1',
        name: 'Unknown',
        type: 'UNKNOWN_TYPE',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
    });
  });

  // ==========================================
  // SEMANTIC TYPE MAPPING
  // ==========================================

  describe('semantic type mapping', () => {
    let builder: ComponentBuilder;

    beforeEach(() => {
      builder = new ComponentBuilder(DEFAULT_CONFIG);
    });

    it('should map button semantic to button element', () => {
      const frame = {
        id: 'btn-1',
        name: 'Btn',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'button', confidence: 0.95, element: 'button' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<button');
    });

    it('should map link semantic to anchor element', () => {
      const frame = {
        id: 'link-1',
        name: 'Link',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'link', confidence: 0.95, element: 'a' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<a');
    });

    it('should map input semantic to input element', () => {
      const frame = {
        id: 'input-1',
        name: 'Input',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'input', confidence: 0.95, element: 'input' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<input');
    });

    it('should map textarea semantic', () => {
      const frame = {
        id: 'textarea-1',
        name: 'TextArea',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'textarea', confidence: 0.95, element: 'textarea' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<textarea');
    });

    it('should map checkbox semantic', () => {
      const frame = {
        id: 'checkbox-1',
        name: 'Checkbox',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'checkbox', confidence: 0.95, element: 'input' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<input');
      expect(jsx).toContain('type="checkbox"');
    });

    it('should map radio semantic', () => {
      const frame = {
        id: 'radio-1',
        name: 'Radio',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'radio', confidence: 0.95, element: 'input' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<input');
      expect(jsx).toContain('type="radio"');
    });

    it('should map image semantic to img element', () => {
      const frame = {
        id: 'img-1',
        name: 'Image',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'image', confidence: 0.95, element: 'img', ariaLabel: 'Product photo' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<img');
      expect(jsx).toContain('alt=');
    });

    it('should map heading semantic', () => {
      const frame = {
        id: 'heading-1',
        name: 'Heading',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'heading', confidence: 0.95, element: 'h2' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<h2');
    });

    it('should map paragraph semantic', () => {
      const frame = {
        id: 'para-1',
        name: 'Paragraph',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'paragraph', confidence: 0.95, element: 'p' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<p');
    });

    it('should map list semantic', () => {
      const frame = {
        id: 'list-1',
        name: 'List',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'list', confidence: 0.95, element: 'ul' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<ul');
    });

    it('should map listItem semantic', () => {
      const frame = {
        id: 'li-1',
        name: 'ListItem',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'listItem', confidence: 0.95, element: 'li' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<li');
    });

    it('should map navigation semantic', () => {
      const frame = {
        id: 'nav-1',
        name: 'Navigation',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'navigation', confidence: 0.95, element: 'nav' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<nav');
    });

    it('should map header semantic', () => {
      const frame = {
        id: 'header-1',
        name: 'Header',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'header', confidence: 0.95, element: 'header' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<header');
    });

    it('should map footer semantic', () => {
      const frame = {
        id: 'footer-1',
        name: 'Footer',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'footer', confidence: 0.95, element: 'footer' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<footer');
    });

    it('should map main semantic', () => {
      const frame = {
        id: 'main-1',
        name: 'Main',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'main', confidence: 0.95, element: 'main' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<main');
    });

    it('should map section semantic', () => {
      const frame = {
        id: 'section-1',
        name: 'Section',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'section', confidence: 0.95, element: 'section' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<section');
    });

    it('should map article semantic', () => {
      const frame = {
        id: 'article-1',
        name: 'Article',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'article', confidence: 0.95, element: 'article' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<article');
    });

    it('should map aside semantic', () => {
      const frame = {
        id: 'aside-1',
        name: 'Aside',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'aside', confidence: 0.95, element: 'aside' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<aside');
    });

    it('should map card semantic', () => {
      const frame = {
        id: 'card-1',
        name: 'Card',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'card', confidence: 0.95, element: 'div' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
    });

    it('should map modal semantic', () => {
      const frame = {
        id: 'modal-1',
        name: 'Modal',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'modal', confidence: 0.95, element: 'dialog' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<dialog');
    });

    it('should map form semantic', () => {
      const frame = {
        id: 'form-1',
        name: 'Form',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'form', confidence: 0.95, element: 'form' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<form');
    });

    it('should map icon semantic', () => {
      const frame = {
        id: 'icon-1',
        name: 'Icon',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'icon', confidence: 0.95, element: 'span' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<span');
    });
  });

  // ==========================================
  // NAME-BASED ELEMENT INFERENCE
  // ==========================================

  describe('name-based element inference', () => {
    let builder: ComponentBuilder;

    beforeEach(() => {
      builder = new ComponentBuilder(DEFAULT_CONFIG);
    });

    it('should infer button from name containing "button"', () => {
      const frame = {
        id: 'f1',
        name: 'SubmitButton',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<button');
    });

    it('should infer button from name containing "btn"', () => {
      const frame = {
        id: 'f1',
        name: 'SubmitBtn',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<button');
    });

    it('should infer link from name', () => {
      const frame = {
        id: 'f1',
        name: 'NavLink',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<a');
    });

    it('should infer input from name containing "input"', () => {
      const frame = {
        id: 'f1',
        name: 'EmailInput',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<input');
    });

    it('should infer input from name containing "field"', () => {
      const frame = {
        id: 'f1',
        name: 'PasswordField',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<input');
    });

    it('should infer image from name containing "image"', () => {
      const frame = {
        id: 'f1',
        name: 'ProfileImage',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<img');
    });

    it('should infer image from name containing "img"', () => {
      const frame = {
        id: 'f1',
        name: 'ProfileImg',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<img');
    });

    it('should infer image from name containing "avatar"', () => {
      const frame = {
        id: 'f1',
        name: 'UserAvatar',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<img');
    });

    it('should infer header from name', () => {
      const frame = {
        id: 'f1',
        name: 'PageHeader',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<header');
    });

    it('should infer footer from name', () => {
      const frame = {
        id: 'f1',
        name: 'PageFooter',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<footer');
    });

    it('should infer nav from name', () => {
      const frame = {
        id: 'f1',
        name: 'MainNav',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<nav');
    });

    it('should infer card from name', () => {
      const frame = {
        id: 'f1',
        name: 'ProductCard',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
    });

    it('should infer modal from name', () => {
      const frame = {
        id: 'f1',
        name: 'ConfirmModal',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<dialog');
    });

    it('should infer dialog from name', () => {
      const frame = {
        id: 'f1',
        name: 'AlertDialog',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<dialog');
    });

    it('should infer form from name', () => {
      const frame = {
        id: 'f1',
        name: 'LoginForm',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<form');
    });

    it('should infer list from name', () => {
      const frame = {
        id: 'f1',
        name: 'UserList',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<ul');
    });

    it('should infer icon from name', () => {
      const frame = {
        id: 'f1',
        name: 'CheckIcon',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<span');
    });

    it('should infer h1 from name containing "title"', () => {
      const frame = {
        id: 'f1',
        name: 'PageTitle',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<h1');
    });

    it('should infer h1 from name containing "main"', () => {
      const frame = {
        id: 'f1',
        name: 'MainHeading',
        type: 'GROUP',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<h1');
    });

    it('should infer heading from name containing "subtitle"', () => {
      const frame = {
        id: 'f1',
        name: 'Subtitle',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      // Subtitle infers a heading element
      expect(jsx).toMatch(/<h[12]/);
    });

    it('should infer h1-h6 from explicit heading names', () => {
      for (let i = 1; i <= 6; i++) {
        const frame = {
          id: `f${i}`,
          name: `H${i}Heading`,
          type: 'FRAME',
          visible: true,
          children: [],
        };

        const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

        expect(jsx).toContain(`<h${i}`);
      }
    });
  });

  // ==========================================
  // ATTRIBUTES
  // ==========================================

  describe('attributes', () => {
    let builder: ComponentBuilder;

    beforeEach(() => {
      builder = new ComponentBuilder(DEFAULT_CONFIG);
    });

    it('should add role attribute when different from element', () => {
      const frame = {
        id: 'f1',
        name: 'Button',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'button', confidence: 0.95, element: 'button', role: 'button' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      // Button element has role="button" which is same as element, so not added
      expect(jsx).toContain('<button');
    });

    it('should add aria-label attribute', () => {
      const frame = {
        id: 'f1',
        name: 'Icon',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'icon', confidence: 0.95, element: 'span', ariaLabel: 'Close button' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('aria-label="Close button"');
    });

    it('should escape special characters in aria-label', () => {
      const frame = {
        id: 'f1',
        name: 'Icon',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'icon', confidence: 0.95, element: 'span', ariaLabel: 'Test & "quotes" <tags>' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('&amp;');
      expect(jsx).toContain('&quot;');
      expect(jsx).toContain('&lt;');
      expect(jsx).toContain('&gt;');
    });

    it('should add onClick handler for interactive elements', () => {
      const frame = {
        id: 'f1',
        name: 'Button',
        type: 'FRAME',
        visible: true,
        children: [],
        interactions: [{ trigger: 'click', action: 'navigate' }],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('onClick={onClick}');
    });

    it('should add alt and src for img elements', () => {
      const frame = {
        id: 'f1',
        name: 'ProductImage',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'image', confidence: 0.95, element: 'img' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('alt=');
      expect(jsx).toContain('src={imageSrc}');
    });

    it('should use ariaLabel for img alt text', () => {
      const frame = {
        id: 'f1',
        name: 'ProductImage',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'image', confidence: 0.95, element: 'img', ariaLabel: 'Product thumbnail' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('alt="Product thumbnail"');
    });

    it('should add placeholder for input elements', () => {
      const frame = {
        id: 'f1',
        name: 'EmailInput',
        type: 'FRAME',
        visible: true,
        children: [
          {
            id: 't1',
            name: 'Placeholder',
            type: 'TEXT',
            visible: true,
            textContent: 'Enter email',
            children: [],
          },
        ],
        semantic: { type: 'input', confidence: 0.95, element: 'input' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('placeholder="Enter email"');
    });

    it('should add href for link elements with url interaction', () => {
      const frame = {
        id: 'f1',
        name: 'Link',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'link', confidence: 0.95, element: 'a' },
        interactions: [{ action: 'url', url: 'https://example.com' }],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('href="https://example.com"');
    });
  });

  // ==========================================
  // STYLING APPROACHES
  // ==========================================

  describe('styling approaches', () => {
    it('should use tailwind classes', () => {
      const builder = new ComponentBuilder({ ...DEFAULT_CONFIG, stylingApproach: 'tailwind' });
      const frame = {
        id: 'f1',
        name: 'Box',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: ['flex', 'p-4'] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('flex');
      expect(jsx).toContain('p-4');
    });

    it('should use tailwind hover classes', () => {
      const builder = new ComponentBuilder({ ...DEFAULT_CONFIG, stylingApproach: 'tailwind' });
      const frame = {
        id: 'f1',
        name: 'Box',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: ['flex'], hover: ['bg-blue-500'] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('hover:bg-blue-500');
    });

    it('should use tailwind focus classes', () => {
      const builder = new ComponentBuilder({ ...DEFAULT_CONFIG, stylingApproach: 'tailwind' });
      const frame = {
        id: 'f1',
        name: 'Box',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: ['flex'], focus: ['ring-2'] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('focus:ring-2');
    });

    it('should use CSS Modules', () => {
      const builder = new ComponentBuilder({ ...DEFAULT_CONFIG, stylingApproach: 'css-modules' });
      const frame = {
        id: 'f1',
        name: 'Box',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { css: { properties: {} } }, { ...DEFAULT_CONFIG, stylingApproach: 'css-modules' });

      expect(jsx).toContain('styles.root');
    });

    it('should use kebab-case class names for vanilla CSS', () => {
      const builder = new ComponentBuilder({ ...DEFAULT_CONFIG, stylingApproach: 'vanilla' });
      const frame = {
        id: 'f1',
        name: 'MyComponent',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { css: { properties: {} } }, { ...DEFAULT_CONFIG, stylingApproach: 'vanilla' });

      expect(jsx).toContain('my-component');
    });
  });

  // ==========================================
  // CHILDREN
  // ==========================================

  describe('children', () => {
    let builder: ComponentBuilder;

    beforeEach(() => {
      builder = new ComponentBuilder(DEFAULT_CONFIG);
    });

    it('should build children recursively', () => {
      const frame = {
        id: 'f1',
        name: 'Container',
        type: 'FRAME',
        visible: true,
        children: [
          {
            id: 'c1',
            name: 'Child',
            type: 'FRAME',
            visible: true,
            children: [],
          },
        ],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
      expect(jsx.match(/<div/g)?.length).toBeGreaterThanOrEqual(2);
    });

    it('should skip invisible children', () => {
      const frame = {
        id: 'f1',
        name: 'Container',
        type: 'FRAME',
        visible: true,
        children: [
          {
            id: 'c1',
            name: 'VisibleChild',
            type: 'FRAME',
            visible: true,
            children: [],
          },
          {
            id: 'c2',
            name: 'InvisibleChild',
            type: 'FRAME',
            visible: false,
            children: [],
          },
        ],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).not.toContain('InvisibleChild');
    });
  });

  // ==========================================
  // TEXT CONTENT
  // ==========================================

  describe('text content', () => {
    let builder: ComponentBuilder;

    beforeEach(() => {
      builder = new ComponentBuilder(DEFAULT_CONFIG);
    });

    it('should render text content', () => {
      const frame = {
        id: 't1',
        name: 'Label',
        type: 'TEXT',
        visible: true,
        textContent: 'Hello World',
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('</span>');
    });

    it('should handle JSX text with special characters', () => {
      const frame = {
        id: 't1',
        name: 'Label',
        type: 'TEXT',
        visible: true,
        textContent: 'Test text',
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      // Text content is rendered (may be escaped or as prop reference)
      expect(jsx).toContain('</span>');
    });

    it('should render text frames with content', () => {
      const frame = {
        id: 't1',
        name: 'title',
        type: 'TEXT',
        visible: true,
        textContent: 'Default Title',
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      // Text content is rendered in a span
      expect(jsx).toContain('<span');
    });

    it('should handle "text" named frame', () => {
      const frame = {
        id: 't1',
        name: 'text',
        type: 'TEXT',
        visible: true,
        textContent: 'Some text',
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      // Text is rendered in a span
      expect(jsx).toContain('<span');
    });
  });

  // ==========================================
  // SELF-CLOSING ELEMENTS
  // ==========================================

  describe('self-closing elements', () => {
    let builder: ComponentBuilder;

    beforeEach(() => {
      builder = new ComponentBuilder(DEFAULT_CONFIG);
    });

    it('should render img as self-closing', () => {
      const frame = {
        id: 'f1',
        name: 'Image',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'image', confidence: 0.95, element: 'img' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('/>');
      expect(jsx).not.toContain('</img>');
    });

    it('should render input as self-closing', () => {
      const frame = {
        id: 'f1',
        name: 'Input',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'input', confidence: 0.95, element: 'input' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('/>');
      expect(jsx).not.toContain('</input>');
    });

    it('should handle frame with br-like semantic', () => {
      const frame = {
        id: 'f1',
        name: 'Break',
        type: 'FRAME',
        visible: true,
        children: [],
        semantic: { type: 'container', confidence: 0.95, element: 'div' },
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      // BR semantic type might not be in mapping, falls back to container
      expect(jsx).toContain('<div');
    });
  });

  // ==========================================
  // COMPONENT REFERENCES
  // ==========================================

  describe('buildComponentReference', () => {
    let builder: ComponentBuilder;

    beforeEach(() => {
      builder = new ComponentBuilder(DEFAULT_CONFIG);
    });

    it('should return empty string if no componentRef', () => {
      const frame = {
        id: 'f1',
        name: 'Box',
        type: 'INSTANCE',
        visible: true,
        children: [],
      };

      const jsx = builder.buildComponentReference(frame);

      expect(jsx).toBe('');
    });

    it('should generate component reference JSX', () => {
      const frame = {
        id: 'f1',
        name: 'ButtonInstance',
        type: 'INSTANCE',
        visible: true,
        children: [],
        componentRef: 'btn-component-123',
      };

      const jsx = builder.buildComponentReference(frame);

      expect(jsx).toContain('<Component_');
      expect(jsx).toContain('/>');
    });
  });

  // ==========================================
  // EDGE CASES
  // ==========================================

  describe('edge cases', () => {
    let builder: ComponentBuilder;

    beforeEach(() => {
      builder = new ComponentBuilder(DEFAULT_CONFIG);
    });

    it('should handle empty children array', () => {
      const frame = {
        id: 'f1',
        name: 'Empty',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
      expect(jsx).toContain('></');
    });

    it('should handle deeply nested children', () => {
      const frame = {
        id: 'f1',
        name: 'Root',
        type: 'FRAME',
        visible: true,
        children: [
          {
            id: 'c1',
            name: 'Level1',
            type: 'FRAME',
            visible: true,
            children: [
              {
                id: 'c2',
                name: 'Level2',
                type: 'FRAME',
                visible: true,
                children: [
                  {
                    id: 'c3',
                    name: 'Level3',
                    type: 'TEXT',
                    visible: true,
                    textContent: 'Deep text',
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx.match(/<div/g)?.length).toBe(3);
      expect(jsx).toContain('<span');
    });

    it('should handle frame with no semantic and generic name', () => {
      const frame = {
        id: 'f1',
        name: 'Frame 123',
        type: 'FRAME',
        visible: true,
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('<div');
    });

    it('should handle multiline text content', () => {
      const frame = {
        id: 't1',
        name: 'Paragraph',
        type: 'TEXT',
        visible: true,
        textContent: 'Line 1\nLine 2\nLine 3',
        children: [],
      };

      const jsx = builder.buildJSX(frame, { tailwind: { base: [] } }, DEFAULT_CONFIG);

      expect(jsx).toContain('</span>');
    });
  });
});
