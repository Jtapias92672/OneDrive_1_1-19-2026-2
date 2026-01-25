/**
 * FORGE React Generator - Code Formatter
 * 
 * @epic 06 - React Generator
 * @task 3.2 - Code Formatting
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Formats generated code according to configuration.
 *   Handles indentation, quotes, semicolons, and line wrapping.
 */

import { FormattingOptions } from '../core/types';

// ============================================
// DEFAULT OPTIONS
// ============================================

const DEFAULT_OPTIONS: FormattingOptions = {
  indentation: 'spaces',
  indentSize: 2,
  quotes: 'single',
  trailingComma: 'es5',
  semicolons: true,
  printWidth: 100,
};

// ============================================
// CODE FORMATTER
// ============================================

export class CodeFormatter {
  private options: FormattingOptions;

  constructor(options?: Partial<FormattingOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ==========================================
  // MAIN FORMATTING
  // ==========================================

  /**
   * Format JavaScript/TypeScript code
   */
  format(code: string): string {
    let formatted = code;

    // Normalize line endings
    formatted = this.normalizeLineEndings(formatted);

    // Fix indentation
    formatted = this.fixIndentation(formatted);

    // Fix quotes
    formatted = this.fixQuotes(formatted);

    // Fix semicolons
    formatted = this.fixSemicolons(formatted);

    // Fix trailing commas
    formatted = this.fixTrailingCommas(formatted);

    // Trim trailing whitespace
    formatted = this.trimTrailingWhitespace(formatted);

    // Ensure final newline
    formatted = this.ensureFinalNewline(formatted);

    return formatted;
  }

  /**
   * Format CSS code
   */
  formatCSS(code: string): string {
    let formatted = code;

    // Normalize line endings
    formatted = this.normalizeLineEndings(formatted);

    // Fix indentation
    formatted = this.fixIndentation(formatted);

    // Trim trailing whitespace
    formatted = this.trimTrailingWhitespace(formatted);

    // Ensure final newline
    formatted = this.ensureFinalNewline(formatted);

    return formatted;
  }

  /**
   * Format JSON
   */
  formatJSON(json: string | object): string {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    return JSON.stringify(obj, null, this.getIndent());
  }

  // ==========================================
  // INDENTATION
  // ==========================================

  /**
   * Get indent string based on options
   */
  getIndent(levels = 1): string {
    const unit = this.options.indentation === 'tabs' 
      ? '\t' 
      : ' '.repeat(this.options.indentSize);
    return unit.repeat(levels);
  }

  /**
   * Fix indentation in code
   */
  private fixIndentation(code: string): string {
    if (this.options.indentation === 'tabs') {
      // Convert spaces to tabs
      const spaceIndent = ' '.repeat(this.options.indentSize);
      return code.replace(new RegExp(`^(${spaceIndent})+`, 'gm'), match => {
        const levels = match.length / this.options.indentSize;
        return '\t'.repeat(levels);
      });
    } else {
      // Convert tabs to spaces
      return code.replace(/^\t+/gm, match => {
        return ' '.repeat(match.length * this.options.indentSize);
      });
    }
  }

  /**
   * Indent a block of code
   */
  indent(code: string, levels = 1): string {
    const indent = this.getIndent(levels);
    return code.split('\n').map(line => indent + line).join('\n');
  }

  /**
   * Dedent a block of code
   */
  dedent(code: string, levels = 1): string {
    const indent = this.getIndent(levels);
    const regex = new RegExp(`^${indent.replace(/\t/g, '\\t')}`, 'gm');
    return code.replace(regex, '');
  }

  // ==========================================
  // QUOTES
  // ==========================================

  /**
   * Fix quote style in code
   */
  private fixQuotes(code: string): string {
    const targetQuote = this.options.quotes === 'single' ? "'" : '"';
    const otherQuote = this.options.quotes === 'single' ? '"' : "'";

    // Don't change quotes inside template literals or JSX
    const parts = this.splitByStrings(code);

    return parts.map(part => {
      if (part.type === 'string' && part.quote !== '`' && part.content !== undefined) {
        // Change quote style
        const content = part.content
          .replace(new RegExp(`\\\\${targetQuote}`, 'g'), targetQuote) // Unescape target
          .replace(new RegExp(targetQuote, 'g'), `\\${targetQuote}`); // Escape target in content
        return targetQuote + content + targetQuote;
      }
      return part.raw;
    }).join('');
  }

  private splitByStrings(code: string): Array<{ type: 'code' | 'string'; raw: string; content?: string; quote?: string }> {
    const parts: Array<{ type: 'code' | 'string'; raw: string; content?: string; quote?: string }> = [];
    let current = '';
    let inString = false;
    let stringQuote = '';
    let stringContent = '';

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const prevChar = code[i - 1];

      if (!inString) {
        if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
          if (current) {
            parts.push({ type: 'code', raw: current });
            current = '';
          }
          inString = true;
          stringQuote = char;
          stringContent = '';
        } else {
          current += char;
        }
      } else {
        if (char === stringQuote && prevChar !== '\\') {
          parts.push({
            type: 'string',
            raw: stringQuote + stringContent + char,
            content: stringContent,
            quote: stringQuote,
          });
          inString = false;
          stringQuote = '';
          stringContent = '';
        } else {
          stringContent += char;
        }
      }
    }

    if (current) {
      parts.push({ type: 'code', raw: current });
    }

    return parts;
  }

  // ==========================================
  // SEMICOLONS
  // ==========================================

  /**
   * Fix semicolon usage
   */
  private fixSemicolons(code: string): string {
    if (this.options.semicolons) {
      // Add semicolons where missing
      return code.replace(/^([^{;]*[^;\s{])(\s*)$/gm, (match, statement, whitespace) => {
        // Skip certain patterns
        if (this.shouldSkipSemicolon(statement)) {
          return match;
        }
        return statement + ';' + whitespace;
      });
    } else {
      // Remove unnecessary semicolons
      return code.replace(/;\s*$/gm, '');
    }
  }

  private shouldSkipSemicolon(statement: string): boolean {
    const trimmed = statement.trim();
    
    // Skip if ends with certain patterns
    const skipPatterns = [
      /\{$/, // Block opening
      /\}$/, // Block closing (sometimes)
      /^\/\//, // Comment
      /^\/\*/, // Multi-line comment
      /^\*/, // Multi-line comment continuation
      /^import\s+.*\s+from\s+['"]/, // Import
      /^export\s+(default\s+)?{/, // Named export
    ];

    return skipPatterns.some(pattern => pattern.test(trimmed));
  }

  // ==========================================
  // TRAILING COMMAS
  // ==========================================

  /**
   * Fix trailing comma usage
   */
  private fixTrailingCommas(code: string): string {
    switch (this.options.trailingComma) {
      case 'none':
        // Remove all trailing commas
        return code.replace(/,(\s*[\]\}])/g, '$1');

      case 'es5':
        // Add trailing commas to arrays and objects
        return this.addTrailingCommasES5(code);

      case 'all':
        // Add trailing commas everywhere valid
        return this.addTrailingCommasAll(code);

      default:
        return code;
    }
  }

  private addTrailingCommasES5(code: string): string {
    // Add trailing comma before closing ] or } on separate line
    return code.replace(/([^\s,])(\s*\n\s*[\]\}])/g, '$1,$2');
  }

  private addTrailingCommasAll(code: string): string {
    // Same as ES5 + function parameters
    let result = this.addTrailingCommasES5(code);
    // Add trailing comma before closing ) on separate line (in function calls/definitions)
    result = result.replace(/([^\s,])(\s*\n\s*\))/g, '$1,$2');
    return result;
  }

  // ==========================================
  // WHITESPACE
  // ==========================================

  /**
   * Normalize line endings to LF
   */
  private normalizeLineEndings(code: string): string {
    return code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * Trim trailing whitespace from lines
   */
  private trimTrailingWhitespace(code: string): string {
    return code.replace(/[ \t]+$/gm, '');
  }

  /**
   * Ensure file ends with newline
   */
  private ensureFinalNewline(code: string): string {
    if (!code.endsWith('\n')) {
      return code + '\n';
    }
    return code;
  }

  // ==========================================
  // LINE WRAPPING
  // ==========================================

  /**
   * Wrap long lines
   */
  wrapLines(code: string): string {
    const lines = code.split('\n');
    const wrapped: string[] = [];

    for (const line of lines) {
      if (line.length <= this.options.printWidth) {
        wrapped.push(line);
        continue;
      }

      // Try to wrap at sensible points
      wrapped.push(...this.wrapLongLine(line));
    }

    return wrapped.join('\n');
  }

  private wrapLongLine(line: string): string[] {
    // Simple implementation - would need more sophisticated logic for real use
    const indent = line.match(/^\s*/)?.[0] || '';
    const content = line.slice(indent.length);
    
    // Try to break at operators, commas, or brackets
    const breakPoints = /([,\s]+)|(\s*[+\-*/%&|^]=?\s*)|(\s*[<>=!]=*\s*)/g;
    
    const parts: string[] = [];
    let current = indent;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = breakPoints.exec(content)) !== null) {
      const segment = content.slice(lastIndex, match.index + match[0].length);
      
      if ((current + segment).length > this.options.printWidth && current !== indent) {
        parts.push(current.trimEnd());
        current = indent + this.getIndent() + segment.trimStart();
      } else {
        current += segment;
      }
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining content
    const remaining = content.slice(lastIndex);
    if (remaining) {
      if ((current + remaining).length > this.options.printWidth && current !== indent) {
        parts.push(current.trimEnd());
        parts.push(indent + this.getIndent() + remaining.trimStart());
      } else {
        parts.push(current + remaining);
      }
    } else if (current !== indent) {
      parts.push(current);
    }

    return parts.length > 0 ? parts : [line];
  }

  // ==========================================
  // JSX FORMATTING
  // ==========================================

  /**
   * Format JSX attributes
   */
  formatJSXAttributes(attributes: string[], indent: string = ''): string {
    if (attributes.length === 0) return '';
    if (attributes.length === 1) return ' ' + attributes[0];

    // Check if single line fits
    const singleLine = ' ' + attributes.join(' ');
    if (singleLine.length <= this.options.printWidth - indent.length - 10) {
      return singleLine;
    }

    // Multi-line
    const attrIndent = indent + this.getIndent();
    return '\n' + attributes.map(attr => attrIndent + attr).join('\n') + '\n' + indent;
  }

  // ==========================================
  // CONFIGURATION
  // ==========================================

  /**
   * Update formatting options
   */
  setOptions(options: Partial<FormattingOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): FormattingOptions {
    return { ...this.options };
  }
}

// ============================================
// EXPORTS
// ============================================

export default CodeFormatter;
