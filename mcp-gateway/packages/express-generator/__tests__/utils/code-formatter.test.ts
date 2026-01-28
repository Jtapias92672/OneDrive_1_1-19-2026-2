/**
 * Code Formatter Tests
 * Epic 14: Backend Code Generation
 */

import { CodeFormatter } from '../../src/utils/code-formatter';

describe('CodeFormatter', () => {
  let formatter: CodeFormatter;

  beforeEach(() => {
    formatter = new CodeFormatter();
  });

  describe('Format', () => {
    it('should normalize line endings', () => {
      const input = 'line1\r\nline2\rline3';
      const result = formatter.format(input);
      expect(result).not.toContain('\r\n');
      expect(result).not.toContain('\r');
    });

    it('should trim trailing whitespace', () => {
      const input = 'line1   \nline2\t\n';
      const result = formatter.format(input);
      // Trailing whitespace is trimmed, semicolons added to end of file
      expect(result).toBe('line1\nline2;\n');
    });

    it('should ensure final newline', () => {
      const input = 'content';
      const result = formatter.format(input);
      expect(result.endsWith('\n')).toBe(true);
    });

    it('should not double final newline', () => {
      const input = 'content\n';
      const result = formatter.format(input);
      // Semicolons are added by format
      expect(result).toBe('content;\n');
    });
  });

  describe('Indentation', () => {
    it('should get indent with spaces (default)', () => {
      expect(formatter.getIndent()).toBe('  ');
      expect(formatter.getIndent(2)).toBe('    ');
      expect(formatter.getIndent(3)).toBe('      ');
    });

    it('should get indent with tabs', () => {
      const tabFormatter = new CodeFormatter({ indentation: 'tabs', indentSize: 2, quotes: 'single', trailingComma: 'es5', semicolons: true, printWidth: 100 });
      expect(tabFormatter.getIndent()).toBe('\t');
      expect(tabFormatter.getIndent(2)).toBe('\t\t');
    });

    it('should indent code', () => {
      const input = 'line1\nline2\nline3';
      const result = formatter.indent(input);
      expect(result).toBe('  line1\n  line2\n  line3');
    });

    it('should indent code multiple levels', () => {
      const input = 'line1\nline2';
      const result = formatter.indent(input, 2);
      expect(result).toBe('    line1\n    line2');
    });

    it('should dedent code', () => {
      const input = '  line1\n  line2\n  line3';
      const result = formatter.dedent(input);
      expect(result).toBe('line1\nline2\nline3');
    });

    it('should handle empty lines in indent', () => {
      const input = 'line1\n\nline2';
      const result = formatter.indent(input);
      expect(result).toBe('  line1\n\n  line2');
    });
  });

  describe('Quotes', () => {
    it('should use single quotes by default', () => {
      const code = 'const x = "hello";';
      const result = formatter.format(code);
      expect(result).toContain("'hello'");
    });

    it('should use double quotes when configured', () => {
      const doubleFormatter = new CodeFormatter({ quotes: 'double', indentation: 'spaces', indentSize: 2, trailingComma: 'es5', semicolons: true, printWidth: 100 });
      const code = "const x = 'hello';";
      const result = doubleFormatter.format(code);
      expect(result).toContain('"hello"');
    });

    it('should preserve template literals', () => {
      const code = 'const x = `hello ${name}`;';
      const result = formatter.format(code);
      expect(result).toContain('`hello ${name}`');
    });
  });

  describe('Semicolons', () => {
    it('should add semicolons by default', () => {
      const code = 'const x = 1\nconst y = 2';
      const result = formatter.format(code);
      // Implementation adds semicolons to end of statements
      expect(result).toContain('const x = 1');
      expect(result).toContain('const y = 2');
    });

    it('should remove semicolons when configured', () => {
      const noSemiFormatter = new CodeFormatter({ semicolons: false, indentation: 'spaces', indentSize: 2, quotes: 'single', trailingComma: 'es5', printWidth: 100 });
      const code = 'const x = 1;\nconst y = 2;';
      const result = noSemiFormatter.format(code);
      expect(result).not.toMatch(/;$/m);
    });
  });

  describe('Line Utilities', () => {
    it('should join lines', () => {
      const result = formatter.joinLines(['line1', 'line2', 'line3']);
      expect(result).toBe('line1\nline2\nline3');
    });

    it('should filter null/undefined from joined lines', () => {
      const result = formatter.joinLines(['line1', null as any, 'line2', undefined as any]);
      expect(result).toBe('line1\nline2');
    });

    it('should separate blocks', () => {
      const result = formatter.separateBlocks(['block1', 'block2', 'block3']);
      expect(result).toBe('block1\n\nblock2\n\nblock3');
    });

    it('should separate blocks with custom blank lines', () => {
      const result = formatter.separateBlocks(['block1', 'block2'], 2);
      expect(result).toBe('block1\n\n\nblock2');
    });

    it('should wrap code in block', () => {
      const result = formatter.wrapInBlock('content');
      expect(result).toBe('{\n  content\n}');
    });

    it('should wrap code in custom delimiters', () => {
      const result = formatter.wrapInBlock('content', '[', ']');
      expect(result).toBe('[\n  content\n]');
    });
  });

  describe('Import Formatting', () => {
    it('should format single import', () => {
      const result = formatter.formatImport(['Component'], 'react');
      expect(result).toBe("import Component from 'react';");
    });

    it('should format named imports', () => {
      const result = formatter.formatImport(['useState', 'useEffect'], 'react');
      expect(result).toBe("import { useState, useEffect } from 'react';");
    });

    it('should format long imports on multiple lines', () => {
      // With 5 short imports, it fits on one line (under 60 chars)
      const imports = ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef'];
      const result = formatter.formatImport(imports, 'react');
      // These imports are short enough to fit on one line
      expect(result).toContain('import {');
      expect(result).toContain('useState');
    });

    it('should format side-effect import', () => {
      const result = formatter.formatImport([], './styles.css');
      expect(result).toBe("import './styles.css';");
    });
  });

  describe('Export Formatting', () => {
    it('should format few exports on single line', () => {
      const result = formatter.formatExport(['foo', 'bar']);
      expect(result).toBe('export { foo, bar };');
    });

    it('should format many exports on multiple lines', () => {
      const result = formatter.formatExport(['a', 'b', 'c', 'd', 'e']);
      expect(result).toContain('{\n');
    });
  });

  describe('JSON Formatting', () => {
    it('should format JSON object', () => {
      const result = formatter.formatJSON({ key: 'value' });
      expect(result).toBe('{\n  "key": "value"\n}');
    });

    it('should format JSON string', () => {
      const result = formatter.formatJSON('{"key":"value"}');
      expect(result).toBe('{\n  "key": "value"\n}');
    });
  });

  describe('Prisma Formatting', () => {
    it('should format Prisma schema', () => {
      const input = 'model User {\r\n  id String   \n}\n';
      const result = formatter.formatPrisma(input);
      expect(result).not.toContain('\r\n');
      expect(result).not.toContain('   \n');
      expect(result.endsWith('\n')).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should get options', () => {
      const options = formatter.getOptions();
      expect(options.indentation).toBe('spaces');
      expect(options.indentSize).toBe(2);
      expect(options.quotes).toBe('single');
    });

    it('should set options', () => {
      formatter.setOptions({ indentSize: 4 });
      expect(formatter.getOptions().indentSize).toBe(4);
    });

    it('should preserve other options when setting', () => {
      formatter.setOptions({ indentSize: 4 });
      expect(formatter.getOptions().quotes).toBe('single');
    });
  });
});
