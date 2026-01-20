/**
 * FORGE React Generator - Main Generator Class
 * 
 * @epic 06 - React Generator
 * @task 1.2 - Core Generator
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Main orchestrator for React component generation from Figma designs.
 *   Coordinates style extraction, component generation, and code output.
 */

import {
  ReactGeneratorConfig,
  DEFAULT_CONFIG,
  GeneratedComponent,
  GenerationResult,
  GenerationStats,
  GenerationWarning,
  GenerationError,
  ImportStatement,
  ComponentProp,
  WarningType,
  ErrorType,
} from './types';

import { StyleGenerator } from '../styles/style-generator';
import { ComponentBuilder } from '../components/component-builder';
import { NameUtils } from '../utils/name-utils';
import { CodeFormatter } from '../utils/code-formatter';

// Import types from figma-parser (would be actual imports in real project)
interface ParsedDesign {
  version: string;
  metadata: {
    name: string;
    fileKey: string;
    lastModified: string;
  };
  pages: ParsedPage[];
  components: ParsedComponent[];
  componentSets: any[];
  tokens: DesignTokens;
  assets: any[];
  stats: any;
}

interface ParsedPage {
  id: string;
  name: string;
  frames: ParsedFrame[];
  isMain: boolean;
}

interface ParsedFrame {
  id: string;
  name: string;
  type: string;
  semantic?: SemanticAnalysis;
  layout?: LayoutAnalysis;
  styles?: NodeStyles;
  children: ParsedFrame[];
  visible: boolean;
  textContent?: string;
  componentRef?: string;
  bounds?: { x: number; y: number; width: number; height: number };
  interactions?: any[];
}

interface ParsedComponent {
  id: string;
  name: string;
  description?: string;
  key?: string;
  isVariant: boolean;
  componentSetId?: string;
  variantProperties?: Record<string, string>;
  props: any[];
  frame: ParsedFrame;
  usageCount: number;
}

interface SemanticAnalysis {
  type: string;
  confidence: number;
  element: string;
  role?: string;
  ariaLabel?: string;
}

interface LayoutAnalysis {
  type: string;
  direction?: string;
  wrap?: boolean;
  gap?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  alignment?: { main: string; cross: string };
}

interface NodeStyles {
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  typography?: any;
  opacity?: number;
  borderRadius?: number | number[];
}

interface DesignTokens {
  colors: Record<string, any>;
  typography: Record<string, any>;
  spacing: Record<string, any>;
  radii: Record<string, any>;
  shadows: Record<string, any>;
}

// ============================================
// REACT GENERATOR
// ============================================

export class ReactGenerator {
  private config: ReactGeneratorConfig;
  private styleGenerator: StyleGenerator;
  private componentBuilder: ComponentBuilder;
  private nameUtils: NameUtils;
  private formatter: CodeFormatter;
  
  private warnings: GenerationWarning[] = [];
  private errors: GenerationError[] = [];

  constructor(config: Partial<ReactGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.styleGenerator = new StyleGenerator(this.config);
    this.componentBuilder = new ComponentBuilder(this.config);
    this.nameUtils = new NameUtils(this.config.namingConvention);
    this.formatter = new CodeFormatter(this.config.formatting);
  }

  // ==========================================
  // MAIN GENERATION METHODS
  // ==========================================

  /**
   * Generate React components from a parsed Figma design
   */
  async generate(design: ParsedDesign): Promise<GenerationResult> {
    const startTime = Date.now();
    this.warnings = [];
    this.errors = [];

    try {
      // Generate shared styles from tokens
      const sharedStyles = this.generateSharedStyles(design.tokens);

      // Generate components from pages
      const components: GeneratedComponent[] = [];

      // First, generate Figma components (reusable)
      for (const component of design.components) {
        try {
          const generated = this.generateComponent(component.frame, component);
          if (generated) {
            components.push(generated);
          }
        } catch (error: any) {
          this.addError('generation-failed', `Failed to generate component ${component.name}: ${error.message}`, component.id);
        }
      }

      // Then, generate page frames
      for (const page of design.pages) {
        for (const frame of page.frames) {
          try {
            // Skip if already generated as a component
            if (components.some(c => c.sourceNodeId === frame.id)) {
              continue;
            }

            const generated = this.generateComponent(frame);
            if (generated) {
              components.push(generated);
            }
          } catch (error: any) {
            this.addError('generation-failed', `Failed to generate frame ${frame.name}: ${error.message}`, frame.id);
          }
        }
      }

      // Generate index file
      const indexFile = this.generateIndexFile(components);

      // Generate types file
      const typesFile = this.config.typescript ? this.generateTypesFile(components) : undefined;

      // Calculate stats
      const stats = this.calculateStats(components, startTime);

      return {
        components,
        sharedStyles,
        indexFile,
        typesFile,
        stats,
        warnings: this.warnings,
        errors: this.errors,
      };

    } catch (error: any) {
      this.addError('generation-failed', `Generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a single component from a frame
   */
  generateComponent(frame: ParsedFrame, componentDef?: ParsedComponent): GeneratedComponent | null {
    // Skip invisible frames
    if (!frame.visible) {
      return null;
    }

    // Determine component name
    const name = this.nameUtils.toComponentName(componentDef?.name || frame.name);
    const fileName = this.nameUtils.toFileName(name);

    // Build imports
    const imports: ImportStatement[] = [
      { from: 'react', named: ['FC'] },
    ];

    // Extract props
    const props = this.extractProps(frame, componentDef);

    // Generate styles
    const styles = this.styleGenerator.generate(frame);

    // Generate JSX
    const jsxContent = this.componentBuilder.buildJSX(frame, styles, this.config);

    // Generate props interface
    const propsType = this.config.generatePropTypes
      ? this.generatePropsInterface(name, props)
      : undefined;

    // Build component code
    const code = this.buildComponentCode(name, props, jsxContent, imports, propsType);

    // Generate style file if needed
    const { styleCode, styleFileName } = this.generateStyleFile(name, styles);

    // Track children
    const children = this.extractChildComponentNames(frame);

    // Generate story if requested
    const story = this.config.generateStories
      ? this.generateStory(name, props)
      : undefined;

    // Generate test if requested
    const test = this.config.generateTests
      ? this.generateTest(name, props)
      : undefined;

    return {
      name,
      fileName,
      code: this.formatter.format(code),
      styleCode: styleCode ? this.formatter.formatCSS(styleCode) : undefined,
      styleFileName,
      propsType,
      imports,
      children,
      sourceNodeId: frame.id,
      sourceComponentName: componentDef?.name,
      props,
      story,
      test,
    };
  }

  // ==========================================
  // PROPS EXTRACTION
  // ==========================================

  private extractProps(frame: ParsedFrame, componentDef?: ParsedComponent): ComponentProp[] {
    const props: ComponentProp[] = [];

    // Add className prop
    props.push({
      name: 'className',
      type: 'string',
      required: false,
      description: 'Additional CSS class names',
    });

    // Extract props from component definition
    if (componentDef?.props) {
      for (const prop of componentDef.props) {
        props.push({
          name: this.nameUtils.toPropName(prop.name),
          type: this.mapPropType(prop.type),
          required: prop.required ?? false,
          defaultValue: prop.defaultValue,
          description: prop.description,
        });
      }
    }

    // Extract text content props
    const textNodes = this.findTextNodes(frame);
    for (const textNode of textNodes) {
      const propName = this.nameUtils.toPropName(textNode.name);
      if (!props.some(p => p.name === propName)) {
        props.push({
          name: propName,
          type: 'string',
          required: false,
          defaultValue: `'${this.escapeString(textNode.textContent || '')}'`,
          description: `Text content for ${textNode.name}`,
        });
      }
    }

    // Add onClick if interactive
    if (frame.interactions?.some(i => i.trigger === 'click')) {
      props.push({
        name: 'onClick',
        type: '() => void',
        required: false,
        description: 'Click handler',
      });
    }

    // Add children prop for containers
    if (frame.children.length > 0 && frame.semantic?.type === 'container') {
      props.push({
        name: 'children',
        type: 'React.ReactNode',
        required: false,
        description: 'Child elements',
      });
    }

    return props;
  }

  private mapPropType(figmaType: string): string {
    switch (figmaType) {
      case 'boolean': return 'boolean';
      case 'text': return 'string';
      case 'instanceSwap': return 'React.ReactNode';
      case 'variant': return 'string';
      default: return 'any';
    }
  }

  private findTextNodes(frame: ParsedFrame): ParsedFrame[] {
    const textNodes: ParsedFrame[] = [];

    const walk = (node: ParsedFrame) => {
      if (node.type === 'TEXT' && node.textContent) {
        textNodes.push(node);
      }
      for (const child of node.children) {
        walk(child);
      }
    };

    walk(frame);
    return textNodes;
  }

  // ==========================================
  // CODE GENERATION
  // ==========================================

  private buildComponentCode(
    name: string,
    props: ComponentProp[],
    jsxContent: string,
    imports: ImportStatement[],
    propsType?: string
  ): string {
    const ext = this.config.typescript ? 'tsx' : 'jsx';
    const propsInterfaceName = `${name}Props`;

    // Build imports
    let importsBlock = this.buildImportsBlock(imports);

    // Add style import if needed
    if (this.config.stylingApproach === 'css-modules') {
      importsBlock += `\nimport styles from './${this.nameUtils.toFileName(name)}.module.css';`;
    } else if (this.config.stylingApproach === 'styled-components') {
      importsBlock += `\nimport styled from 'styled-components';`;
    }

    // Build props destructuring
    const propsDestructure = props
      .filter(p => p.name !== 'className')
      .map(p => p.defaultValue ? `${p.name} = ${p.defaultValue}` : p.name)
      .join(', ');

    const hasClassNameProp = props.some(p => p.name === 'className');

    // Build component based on output format
    let componentCode: string;

    switch (this.config.outputFormat) {
      case 'functional':
        componentCode = this.buildFunctionalComponent(
          name,
          propsInterfaceName,
          propsDestructure,
          hasClassNameProp,
          jsxContent
        );
        break;

      case 'function':
        componentCode = this.buildFunctionComponent(
          name,
          propsInterfaceName,
          propsDestructure,
          hasClassNameProp,
          jsxContent
        );
        break;

      case 'forwardRef':
        componentCode = this.buildForwardRefComponent(
          name,
          propsInterfaceName,
          propsDestructure,
          hasClassNameProp,
          jsxContent
        );
        break;

      default:
        componentCode = this.buildFunctionalComponent(
          name,
          propsInterfaceName,
          propsDestructure,
          hasClassNameProp,
          jsxContent
        );
    }

    // Combine all parts
    const fullCode = [
      `/**`,
      ` * ${name} Component`,
      ` * `,
      ` * @generated by FORGE React Generator`,
      ` * @source Figma`,
      ` */`,
      '',
      importsBlock,
      '',
      propsType || '',
      '',
      componentCode,
      '',
      `export default ${name};`,
    ].filter(Boolean).join('\n');

    return fullCode;
  }

  private buildFunctionalComponent(
    name: string,
    propsInterfaceName: string,
    propsDestructure: string,
    hasClassNameProp: boolean,
    jsxContent: string
  ): string {
    const typeAnnotation = this.config.typescript ? `: FC<${propsInterfaceName}>` : '';
    const classNameParam = hasClassNameProp ? ', className' : '';

    return `export const ${name}${typeAnnotation} = ({ ${propsDestructure}${classNameParam} }) => {
  return (
${this.indentJSX(jsxContent, 2)}
  );
};`;
  }

  private buildFunctionComponent(
    name: string,
    propsInterfaceName: string,
    propsDestructure: string,
    hasClassNameProp: boolean,
    jsxContent: string
  ): string {
    const typeAnnotation = this.config.typescript ? `: ${propsInterfaceName}` : '';
    const classNameParam = hasClassNameProp ? ', className' : '';

    return `export function ${name}({ ${propsDestructure}${classNameParam} }${typeAnnotation}) {
  return (
${this.indentJSX(jsxContent, 2)}
  );
}`;
  }

  private buildForwardRefComponent(
    name: string,
    propsInterfaceName: string,
    propsDestructure: string,
    hasClassNameProp: boolean,
    jsxContent: string
  ): string {
    const typeAnnotation = this.config.typescript 
      ? `<HTMLDivElement, ${propsInterfaceName}>`
      : '';
    const classNameParam = hasClassNameProp ? ', className' : '';

    return `export const ${name} = forwardRef${typeAnnotation}(({ ${propsDestructure}${classNameParam} }, ref) => {
  return (
${this.indentJSX(jsxContent, 2)}
  );
});

${name}.displayName = '${name}';`;
  }

  private buildImportsBlock(imports: ImportStatement[]): string {
    return imports.map(imp => {
      const parts: string[] = [];

      if (imp.default) {
        parts.push(imp.default);
      }

      if (imp.named && imp.named.length > 0) {
        const namedStr = `{ ${imp.named.join(', ')} }`;
        parts.push(namedStr);
      }

      const importKeyword = imp.isType ? 'import type' : 'import';
      return `${importKeyword} ${parts.join(', ')} from '${imp.from}';`;
    }).join('\n');
  }

  private indentJSX(jsx: string, levels: number): string {
    const indent = '  '.repeat(levels);
    return jsx.split('\n').map(line => indent + line).join('\n');
  }

  // ==========================================
  // PROPS INTERFACE GENERATION
  // ==========================================

  private generatePropsInterface(name: string, props: ComponentProp[]): string {
    if (!this.config.typescript) return '';

    const propsInterfaceName = `${name}Props`;
    const propLines = props.map(prop => {
      const optional = prop.required ? '' : '?';
      const comment = prop.description ? `  /** ${prop.description} */\n` : '';
      return `${comment}  ${prop.name}${optional}: ${prop.type};`;
    });

    return `export interface ${propsInterfaceName} {\n${propLines.join('\n')}\n}`;
  }

  // ==========================================
  // STYLE FILE GENERATION
  // ==========================================

  private generateStyleFile(name: string, styles: any): { styleCode?: string; styleFileName?: string } {
    switch (this.config.stylingApproach) {
      case 'css-modules':
        return {
          styleCode: this.styleGenerator.generateCSSModule(styles),
          styleFileName: `${this.nameUtils.toFileName(name)}.module.css`,
        };

      case 'sass':
        return {
          styleCode: this.styleGenerator.generateSCSS(styles),
          styleFileName: `${this.nameUtils.toFileName(name)}.scss`,
        };

      case 'vanilla':
        return {
          styleCode: this.styleGenerator.generateCSS(styles),
          styleFileName: `${this.nameUtils.toFileName(name)}.css`,
        };

      default:
        return {};
    }
  }

  // ==========================================
  // SHARED STYLES GENERATION
  // ==========================================

  private generateSharedStyles(tokens: DesignTokens): string {
    if (this.config.stylingApproach === 'tailwind') {
      return this.generateTailwindConfig(tokens);
    }

    return this.generateCSSVariables(tokens);
  }

  private generateTailwindConfig(tokens: DesignTokens): string {
    const colors = Object.entries(tokens.colors || {}).map(([name, value]) => {
      return `      '${name}': '${value}',`;
    }).join('\n');

    const spacing = Object.entries(tokens.spacing || {}).map(([name, value]) => {
      return `      '${name}': '${value}px',`;
    }).join('\n');

    const borderRadius = Object.entries(tokens.radii || {}).map(([name, value]) => {
      return `      '${name}': '${value}px',`;
    }).join('\n');

    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
${colors}
      },
      spacing: {
${spacing}
      },
      borderRadius: {
${borderRadius}
      },
    },
  },
  plugins: [],
};`;
  }

  private generateCSSVariables(tokens: DesignTokens): string {
    const lines: string[] = [':root {'];

    // Colors
    for (const [name, value] of Object.entries(tokens.colors || {})) {
      lines.push(`  --color-${this.nameUtils.toKebabCase(name)}: ${value};`);
    }

    // Spacing
    for (const [name, value] of Object.entries(tokens.spacing || {})) {
      lines.push(`  --spacing-${this.nameUtils.toKebabCase(name)}: ${value}px;`);
    }

    // Border radius
    for (const [name, value] of Object.entries(tokens.radii || {})) {
      lines.push(`  --radius-${this.nameUtils.toKebabCase(name)}: ${value}px;`);
    }

    // Typography
    for (const [name, value] of Object.entries(tokens.typography || {})) {
      if (typeof value === 'object') {
        const typeName = this.nameUtils.toKebabCase(name);
        lines.push(`  --font-${typeName}-family: ${(value as any).fontFamily};`);
        lines.push(`  --font-${typeName}-size: ${(value as any).fontSize}px;`);
        lines.push(`  --font-${typeName}-weight: ${(value as any).fontWeight};`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  // ==========================================
  // INDEX FILE GENERATION
  // ==========================================

  private generateIndexFile(components: GeneratedComponent[]): string {
    const exports = components.map(comp => {
      return `export { default as ${comp.name} } from './${comp.fileName}';`;
    });

    // Add type exports if TypeScript
    if (this.config.typescript) {
      exports.push('');
      exports.push('// Type exports');
      for (const comp of components) {
        exports.push(`export type { ${comp.name}Props } from './${comp.fileName}';`);
      }
    }

    return exports.join('\n');
  }

  // ==========================================
  // TYPES FILE GENERATION
  // ==========================================

  private generateTypesFile(components: GeneratedComponent[]): string {
    if (!this.config.typescript) return '';

    const typeExports = components
      .filter(c => c.propsType)
      .map(c => `export type { ${c.name}Props } from './${c.fileName}';`);

    return `/**
 * Type definitions for generated components
 * @generated by FORGE React Generator
 */

${typeExports.join('\n')}
`;
  }

  // ==========================================
  // STORYBOOK GENERATION
  // ==========================================

  private generateStory(name: string, props: ComponentProp[]): string {
    const args = props
      .filter(p => p.defaultValue)
      .map(p => `    ${p.name}: ${p.defaultValue},`)
      .join('\n');

    return `import type { Meta, StoryObj } from '@storybook/react';
import { ${name} } from './${this.nameUtils.toFileName(name)}';

const meta: Meta<typeof ${name}> = {
  title: 'Components/${name}',
  component: ${name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ${name}>;

export const Default: Story = {
  args: {
${args}
  },
};
`;
  }

  // ==========================================
  // TEST GENERATION
  // ==========================================

  private generateTest(name: string, props: ComponentProp[]): string {
    return `import { render, screen } from '@testing-library/react';
import { ${name} } from './${this.nameUtils.toFileName(name)}';

describe('${name}', () => {
  it('renders without crashing', () => {
    render(<${name} />);
  });

  it('applies custom className', () => {
    const { container } = render(<${name} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
`;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  private extractChildComponentNames(frame: ParsedFrame): string[] {
    const names: string[] = [];

    const walk = (node: ParsedFrame) => {
      if (node.componentRef) {
        names.push(node.componentRef);
      }
      for (const child of node.children) {
        walk(child);
      }
    };

    for (const child of frame.children) {
      walk(child);
    }

    return [...new Set(names)];
  }

  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
  }

  private calculateStats(components: GeneratedComponent[], startTime: number): GenerationStats {
    let totalLines = 0;
    const allImports = new Set<string>();

    for (const comp of components) {
      totalLines += comp.code.split('\n').length;
      if (comp.styleCode) {
        totalLines += comp.styleCode.split('\n').length;
      }
      for (const imp of comp.imports) {
        allImports.add(imp.from);
      }
    }

    return {
      totalComponents: components.length,
      totalLines,
      componentsWithProps: components.filter(c => c.props.length > 1).length,
      uniqueImports: allImports.size,
      durationMs: Date.now() - startTime,
    };
  }

  private addWarning(type: WarningType, message: string, nodeId?: string, componentName?: string): void {
    this.warnings.push({ type, message, nodeId, componentName });
  }

  private addError(type: ErrorType, message: string, nodeId?: string): void {
    this.errors.push({ type, message, nodeId });
  }

  // ==========================================
  // CONFIGURATION
  // ==========================================

  /**
   * Update generator configuration
   */
  setConfig(config: Partial<ReactGeneratorConfig>): void {
    this.config = { ...this.config, ...config };
    this.styleGenerator = new StyleGenerator(this.config);
    this.componentBuilder = new ComponentBuilder(this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): ReactGeneratorConfig {
    return { ...this.config };
  }
}

// ============================================
// EXPORTS
// ============================================

export default ReactGenerator;
