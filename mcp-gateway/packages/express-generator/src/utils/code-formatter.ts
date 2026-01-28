/**
 * Express Generator - Code Formatter
 *
 * @epic 14 - Backend Code Generation
 * @task 2.2 - Code Formatting
 *
 * @description
 *   Formats generated code according to configuration.
 *   Follows React Generator patterns exactly.
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
   * Format JSON
   */
  formatJSON(json: string | object): string {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    return JSON.stringify(obj, null, this.getIndent());
  }

  /**
   * Format Prisma schema
   */
  formatPrisma(code: string): string {
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
    const indentStr = this.getIndent(levels);
    return code.split('\n').map(line => line ? indentStr + line : line).join('\n');
  }

  /**
   * Dedent a block of code
   */
  dedent(code: string, levels = 1): string {
    const indentStr = this.getIndent(levels);
    const regex = new RegExp(`^${indentStr.replace(/\t/g, '\\t')}`, 'gm');
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

    // Don't change quotes inside template literals
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
    // Automatic semicolon insertion is disabled because it's too complex
    // to handle correctly with regex for all edge cases (ternaries,
    // multi-line expressions, object literals, etc.).
    // The code builders are responsible for producing code with correct semicolons.
    if (!this.options.semicolons) {
      // Remove semicolons if explicitly disabled
      return code.replace(/;\s*$/gm, '');
    }
    return code;
  }

  private shouldSkipSemicolon(statement: string): boolean {
    const trimmed = statement.trim();

    const skipPatterns = [
      /\{$/, // Block opening
      /\}$/, // Block closing
      /\[$/, // Array opening
      /\($/, // Function call / grouping opening
      /\)$/, // Closing paren (function signature ending)
      /^\/\//, // Comment
      /^\/\*/, // Multi-line comment start
      /^\*/, // Multi-line comment continuation
      /\*\/$/, // Multi-line comment end
      /^import\s+.*\s+from\s+['"]/, // Import
      /^export\s+(default\s+)?{/, // Named export
      /;$/, // Already has semicolon
      /,$/, // Ends with comma (object/array element)
      /:$/, // Ends with colon (ternary, type annotation in progress)
      /^\?/, // Ternary continuation (? branch)
      /^:/, // Ternary continuation (: branch) or object property
      /^[a-zA-Z_]\w*\??:\s*[A-Z]/, // Function parameter line (identifier: TypeName)
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
        return code.replace(/,(\s*[\]\}])/g, '$1');

      case 'es5':
        return this.addTrailingCommasES5(code);

      case 'all':
        return this.addTrailingCommasAll(code);

      default:
        return code;
    }
  }

  private addTrailingCommasES5(code: string): string {
    // Trailing comma logic is too complex for regex-based formatting
    // to handle correctly with nested code structures.
    // Return code unchanged - generated code already has correct commas.
    return code;
  }

  private addTrailingCommasAll(code: string): string {
    // Trailing comma logic is too complex for regex-based formatting.
    // Return code unchanged.
    return code;
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
  // LINE UTILITIES
  // ==========================================

  /**
   * Join lines with separator
   */
  joinLines(lines: string[], separator = '\n'): string {
    return lines.filter(line => line !== null && line !== undefined).join(separator);
  }

  /**
   * Add blank lines between blocks
   */
  separateBlocks(blocks: string[], blankLines = 1): string {
    const separator = '\n'.repeat(blankLines + 1);
    return blocks.filter(Boolean).join(separator);
  }

  /**
   * Wrap code in a block
   */
  wrapInBlock(code: string, opener = '{', closer = '}'): string {
    return `${opener}\n${this.indent(code)}\n${closer}`;
  }

  // ==========================================
  // IMPORT UTILITIES
  // ==========================================

  /**
   * Format import statement
   */
  formatImport(specifiers: string[], source: string): string {
    const quote = this.options.quotes === 'single' ? "'" : '"';
    const semi = this.options.semicolons ? ';' : '';

    if (specifiers.length === 0) {
      return `import ${quote}${source}${quote}${semi}`;
    }

    if (specifiers.length === 1 && !specifiers[0].startsWith('{')) {
      return `import ${specifiers[0]} from ${quote}${source}${quote}${semi}`;
    }

    const joined = specifiers.join(', ');
    if (joined.length < 60) {
      return `import { ${specifiers.join(', ')} } from ${quote}${source}${quote}${semi}`;
    }

    // Multi-line import
    const indentedSpecs = specifiers.map(s => this.getIndent() + s).join(',\n');
    return `import {\n${indentedSpecs},\n} from ${quote}${source}${quote}${semi}`;
  }

  /**
   * Format export statement
   */
  formatExport(specifiers: string[]): string {
    const semi = this.options.semicolons ? ';' : '';

    if (specifiers.length <= 3) {
      return `export { ${specifiers.join(', ')} }${semi}`;
    }

    const indentedSpecs = specifiers.map(s => this.getIndent() + s).join(',\n');
    return `export {\n${indentedSpecs},\n}${semi}`;
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
