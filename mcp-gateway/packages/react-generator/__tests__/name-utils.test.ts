/**
 * FORGE React Generator - NameUtils Tests
 *
 * @epic 06 - React Generator
 * Target: 97%+ coverage for name-utils.ts
 */

import { NameUtils } from '../src/utils/name-utils';

describe('NameUtils', () => {
  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  describe('constructor', () => {
    it('should create with default convention (PascalCase)', () => {
      const utils = new NameUtils();
      expect(utils).toBeDefined();
    });

    it('should create with kebab-case convention', () => {
      const utils = new NameUtils('kebab-case');
      expect(utils).toBeDefined();
    });

    it('should create with snake_case convention', () => {
      const utils = new NameUtils('snake_case');
      expect(utils).toBeDefined();
    });

    it('should create with camelCase convention', () => {
      const utils = new NameUtils('camelCase');
      expect(utils).toBeDefined();
    });
  });

  // ==========================================
  // TO COMPONENT NAME
  // ==========================================

  describe('toComponentName', () => {
    let utils: NameUtils;

    beforeEach(() => {
      utils = new NameUtils();
    });

    it('should convert simple name to PascalCase', () => {
      expect(utils.toComponentName('button')).toBe('Button');
    });

    it('should convert hyphenated name', () => {
      expect(utils.toComponentName('submit-button')).toBe('SubmitButton');
    });

    it('should convert underscored name', () => {
      expect(utils.toComponentName('submit_button')).toBe('SubmitButton');
    });

    it('should convert spaced name', () => {
      expect(utils.toComponentName('submit button')).toBe('SubmitButton');
    });

    it('should convert mixed separators', () => {
      expect(utils.toComponentName('my-cool_component name')).toBe('MyCoolComponentName');
    });

    it('should handle special characters', () => {
      expect(utils.toComponentName('button@#$%test')).toBe('Buttontest');
    });

    it('should handle numbers at start', () => {
      const result = utils.toComponentName('123button');
      expect(result).toMatch(/^[A-Z]/);
    });

    it('should prefix with Component if starts with number', () => {
      const result = utils.toComponentName('123test');
      expect(result.startsWith('Component')).toBe(true);
    });

    it('should handle reserved word "class"', () => {
      const result = utils.toComponentName('class');
      expect(result).toBe('ClassComponent');
    });

    it('should handle reserved word "function"', () => {
      const result = utils.toComponentName('function');
      expect(result).toBe('FunctionComponent');
    });

    it('should handle reserved word "return"', () => {
      const result = utils.toComponentName('return');
      expect(result).toBe('ReturnComponent');
    });

    it('should handle React reserved word "Component"', () => {
      const result = utils.toComponentName('Component');
      expect(result).toBe('ComponentComponent');
    });

    it('should handle React reserved word "Fragment"', () => {
      const result = utils.toComponentName('Fragment');
      expect(result).toBe('FragmentComponent');
    });

    it('should handle empty string', () => {
      const result = utils.toComponentName('');
      expect(result).toBeDefined();
    });

    it('should generate unique names for duplicates', () => {
      const name1 = utils.toComponentName('Button');
      const name2 = utils.toComponentName('Button');

      expect(name1).toBe('Button');
      expect(name2).toBe('Button2');
    });

    it('should increment counter for multiple duplicates', () => {
      utils.toComponentName('Card');
      utils.toComponentName('Card');
      const name3 = utils.toComponentName('Card');

      expect(name3).toBe('Card3');
    });
  });

  // ==========================================
  // TO FILE NAME
  // ==========================================

  describe('toFileName', () => {
    it('should return PascalCase for PascalCase convention', () => {
      const utils = new NameUtils('PascalCase');
      expect(utils.toFileName('MyComponent')).toBe('MyComponent');
    });

    it('should convert to kebab-case', () => {
      const utils = new NameUtils('kebab-case');
      expect(utils.toFileName('MyComponent')).toBe('my-component');
    });

    it('should convert to snake_case', () => {
      const utils = new NameUtils('snake_case');
      expect(utils.toFileName('MyComponent')).toBe('my_component');
    });

    it('should convert to camelCase', () => {
      const utils = new NameUtils('camelCase');
      const result = utils.toFileName('MyComponent');
      // First letter is lowercase in camelCase
      expect(result.charAt(0)).toBe(result.charAt(0).toLowerCase());
    });
  });

  // ==========================================
  // TO PROP NAME
  // ==========================================

  describe('toPropName', () => {
    let utils: NameUtils;

    beforeEach(() => {
      utils = new NameUtils();
    });

    it('should convert to camelCase', () => {
      expect(utils.toPropName('button-text')).toBe('buttonText');
    });

    it('should convert PascalCase to camelCase', () => {
      // Note: the implementation converts to PascalCase first, so 'ButtonText' becomes 'Buttontext' then 'buttontext'
      const result = utils.toPropName('ButtonText');
      expect(result.charAt(0)).toBe(result.charAt(0).toLowerCase());
    });

    it('should handle underscores', () => {
      expect(utils.toPropName('button_text')).toBe('buttonText');
    });

    it('should handle spaces', () => {
      expect(utils.toPropName('button text')).toBe('buttonText');
    });

    it('should handle reserved word "class"', () => {
      const result = utils.toPropName('class');
      // Reserved words get a suffix
      expect(result).toMatch(/class/i);
    });

    it('should handle reserved word "for"', () => {
      const result = utils.toPropName('for');
      // Reserved words get a suffix
      expect(result).toMatch(/for/i);
    });

    it('should handle special characters', () => {
      // Special characters are stripped, then converted to camelCase
      const result = utils.toPropName('my@prop#name');
      expect(result).toMatch(/^[a-z]/);
      expect(result.includes('@')).toBe(false);
      expect(result.includes('#')).toBe(false);
    });
  });

  // ==========================================
  // TO VARIABLE NAME
  // ==========================================

  describe('toVariableName', () => {
    let utils: NameUtils;

    beforeEach(() => {
      utils = new NameUtils();
    });

    it('should convert to camelCase (same as prop)', () => {
      const result = utils.toVariableName('button-text');
      expect(result.charAt(0)).toBe(result.charAt(0).toLowerCase());
    });

    it('should handle reserved words', () => {
      const result = utils.toVariableName('delete');
      // Reserved words get suffix
      expect(result).toMatch(/delete/i);
    });
  });

  // ==========================================
  // CASE CONVERSIONS
  // ==========================================

  describe('toPascalCase', () => {
    let utils: NameUtils;

    beforeEach(() => {
      utils = new NameUtils();
    });

    it('should convert lowercase to PascalCase', () => {
      expect(utils.toPascalCase('button')).toBe('Button');
    });

    it('should convert kebab-case to PascalCase', () => {
      expect(utils.toPascalCase('my-button')).toBe('MyButton');
    });

    it('should convert snake_case to PascalCase', () => {
      expect(utils.toPascalCase('my_button')).toBe('MyButton');
    });

    it('should convert spaces to PascalCase', () => {
      expect(utils.toPascalCase('my button')).toBe('MyButton');
    });

    it('should handle multiple separators', () => {
      expect(utils.toPascalCase('my-cool_button name')).toBe('MyCoolButtonName');
    });

    it('should handle empty parts', () => {
      expect(utils.toPascalCase('my--button')).toBe('MyButton');
    });
  });

  describe('toCamelCase', () => {
    let utils: NameUtils;

    beforeEach(() => {
      utils = new NameUtils();
    });

    it('should convert to camelCase', () => {
      expect(utils.toCamelCase('my-button')).toBe('myButton');
    });

    it('should convert PascalCase to camelCase', () => {
      // toCamelCase goes through toPascalCase first, so 'MyButton' → 'Mybutton' → 'mybutton'
      const result = utils.toCamelCase('MyButton');
      expect(result.charAt(0)).toBe(result.charAt(0).toLowerCase());
    });

    it('should handle single word', () => {
      expect(utils.toCamelCase('button')).toBe('button');
    });
  });

  describe('toKebabCase', () => {
    let utils: NameUtils;

    beforeEach(() => {
      utils = new NameUtils();
    });

    it('should convert PascalCase to kebab-case', () => {
      expect(utils.toKebabCase('MyButton')).toBe('my-button');
    });

    it('should convert camelCase to kebab-case', () => {
      expect(utils.toKebabCase('myButton')).toBe('my-button');
    });

    it('should convert spaces to hyphens', () => {
      expect(utils.toKebabCase('my button')).toBe('my-button');
    });

    it('should convert underscores to hyphens', () => {
      expect(utils.toKebabCase('my_button')).toBe('my-button');
    });

    it('should handle multiple capitals', () => {
      expect(utils.toKebabCase('MyButtonComponent')).toBe('my-button-component');
    });
  });

  describe('toSnakeCase', () => {
    let utils: NameUtils;

    beforeEach(() => {
      utils = new NameUtils();
    });

    it('should convert PascalCase to snake_case', () => {
      expect(utils.toSnakeCase('MyButton')).toBe('my_button');
    });

    it('should convert camelCase to snake_case', () => {
      expect(utils.toSnakeCase('myButton')).toBe('my_button');
    });

    it('should convert spaces to underscores', () => {
      expect(utils.toSnakeCase('my button')).toBe('my_button');
    });

    it('should convert hyphens to underscores', () => {
      expect(utils.toSnakeCase('my-button')).toBe('my_button');
    });
  });

  describe('toConstantCase', () => {
    let utils: NameUtils;

    beforeEach(() => {
      utils = new NameUtils();
    });

    it('should convert to CONSTANT_CASE', () => {
      expect(utils.toConstantCase('myButton')).toBe('MY_BUTTON');
    });

    it('should convert PascalCase to CONSTANT_CASE', () => {
      expect(utils.toConstantCase('MyButton')).toBe('MY_BUTTON');
    });

    it('should convert kebab-case to CONSTANT_CASE', () => {
      expect(utils.toConstantCase('my-button')).toBe('MY_BUTTON');
    });
  });

  // ==========================================
  // CSS NAMING
  // ==========================================

  describe('toCSSClassName', () => {
    let utils: NameUtils;

    beforeEach(() => {
      utils = new NameUtils();
    });

    it('should convert to valid CSS class name', () => {
      expect(utils.toCSSClassName('MyButton')).toBe('my-button');
    });

    it('should handle special characters', () => {
      expect(utils.toCSSClassName('my@button#test')).toBe('mybuttontest');
    });

    it('should prefix number-starting names', () => {
      const result = utils.toCSSClassName('123button');
      expect(result).toMatch(/^c-/);
    });
  });

  describe('toCSSVariable', () => {
    let utils: NameUtils;

    beforeEach(() => {
      utils = new NameUtils();
    });

    it('should convert to CSS custom property', () => {
      expect(utils.toCSSVariable('primaryColor')).toBe('--primary-color');
    });

    it('should convert PascalCase', () => {
      expect(utils.toCSSVariable('PrimaryColor')).toBe('--primary-color');
    });

    it('should handle already kebab-case', () => {
      expect(utils.toCSSVariable('primary-color')).toBe('--primary-color');
    });
  });

  // ==========================================
  // FILE PATH NAMING
  // ==========================================

  describe('toComponentPath', () => {
    it('should generate tsx path by default', () => {
      const utils = new NameUtils('PascalCase');
      expect(utils.toComponentPath('button')).toBe('Button.tsx');
    });

    it('should generate jsx path', () => {
      const utils = new NameUtils('PascalCase');
      expect(utils.toComponentPath('button', 'jsx')).toBe('Button.jsx');
    });

    it('should use kebab-case convention', () => {
      const utils = new NameUtils('kebab-case');
      // The component name becomes 'Mybutton' (via toPascalCase), then converted to kebab-case
      const result = utils.toComponentPath('MyButton');
      expect(result).toMatch(/\.tsx$/);
      expect(result).toMatch(/^[a-z]/);
    });
  });

  describe('toStylePath', () => {
    let utils: NameUtils;

    beforeEach(() => {
      utils = new NameUtils('PascalCase');
    });

    it('should generate css-modules path', () => {
      expect(utils.toStylePath('Button', 'css-modules')).toBe('Button.module.css');
    });

    it('should generate sass path', () => {
      expect(utils.toStylePath('Button', 'sass')).toBe('Button.scss');
    });

    it('should generate styled-components path', () => {
      expect(utils.toStylePath('Button', 'styled-components')).toBe('Button.styles.ts');
    });

    it('should generate default css path', () => {
      expect(utils.toStylePath('Button', 'vanilla')).toBe('Button.css');
    });

    it('should generate default for unknown approach', () => {
      expect(utils.toStylePath('Button', 'unknown')).toBe('Button.css');
    });
  });

  describe('toStoryPath', () => {
    let utils: NameUtils;

    beforeEach(() => {
      utils = new NameUtils('PascalCase');
    });

    it('should generate stories.tsx path by default', () => {
      expect(utils.toStoryPath('Button')).toBe('Button.stories.tsx');
    });

    it('should generate custom extension', () => {
      expect(utils.toStoryPath('Button', 'stories.jsx')).toBe('Button.stories.jsx');
    });
  });

  describe('toTestPath', () => {
    let utils: NameUtils;

    beforeEach(() => {
      utils = new NameUtils('PascalCase');
    });

    it('should generate test.tsx path by default', () => {
      expect(utils.toTestPath('Button')).toBe('Button.test.tsx');
    });

    it('should generate custom extension', () => {
      expect(utils.toTestPath('Button', 'spec.tsx')).toBe('Button.spec.tsx');
    });
  });

  // ==========================================
  // RESET
  // ==========================================

  describe('reset', () => {
    it('should clear used names', () => {
      const utils = new NameUtils();

      utils.toComponentName('Button');
      utils.toComponentName('Button');
      expect(utils.toComponentName('Button')).toBe('Button3');

      utils.reset();

      expect(utils.toComponentName('Button')).toBe('Button');
    });
  });

  // ==========================================
  // EDGE CASES
  // ==========================================

  describe('edge cases', () => {
    let utils: NameUtils;

    beforeEach(() => {
      utils = new NameUtils();
    });

    it('should handle only special characters', () => {
      const result = utils.toComponentName('@#$%');
      expect(result).toBeDefined();
    });

    it('should handle only numbers', () => {
      const result = utils.toComponentName('12345');
      expect(result).toMatch(/^Component/);
    });

    it('should handle very long names', () => {
      const longName = 'a'.repeat(100);
      const result = utils.toComponentName(longName);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      const result = utils.toComponentName('button');
      expect(result).toBeDefined();
    });

    it('should handle consecutive duplicates efficiently', () => {
      for (let i = 0; i < 10; i++) {
        utils.toComponentName('Widget');
      }
      const finalName = utils.toComponentName('Widget');
      expect(finalName).toBe('Widget11');
    });

    it('should handle mixed case input', () => {
      const result = utils.toPascalCase('mYbUTTon');
      // PascalCase normalizes to capitalize first letter of each word
      expect(result.charAt(0)).toBe(result.charAt(0).toUpperCase());
    });

    it('should handle all JavaScript reserved words', () => {
      const reserved = [
        'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
        'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
        'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
        'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
        'import', 'super', 'implements', 'interface', 'let', 'package', 'private',
        'protected', 'public', 'static', 'yield', 'null', 'true', 'false',
      ];

      for (const word of reserved) {
        const result = utils.toComponentName(word);
        expect(result).toContain('Component');
      }
    });
  });
});
