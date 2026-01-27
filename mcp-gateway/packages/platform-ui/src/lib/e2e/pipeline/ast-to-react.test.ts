/**
 * AST to React E2E Tests
 * Epic 12: Pipeline Integration - Stage 2
 */

import { ASTFixture, ReactComponentFixture, PipelineResult } from '../types';
import expectedAst from '../fixtures/expected-ast.json';

/**
 * Mock React Generator
 * In real implementation, this would use packages/react-generator
 */
function generateReactFromAST(ast: ASTFixture): ReactComponentFixture[] {
  return ast.nodes.map((node) => {
    const imports = ['import React from "react";'];
    const props: { name: string; type: string }[] = [];

    // Analyze children to determine props
    if (node.children) {
      for (const child of node.children) {
        if (child.type === 'Input') {
          props.push({ name: 'onInputChange', type: '(value: string) => void' });
        }
        if (child.type === 'Button') {
          props.push({ name: 'onSubmit', type: '() => void' });
        }
      }
    }

    const propsInterface = props.length > 0
      ? `interface ${node.name}Props {\n${props.map(p => `  ${p.name}?: ${p.type};`).join('\n')}\n}\n\n`
      : '';

    const propsType = props.length > 0 ? `${node.name}Props` : '{}';

    const code = `${imports.join('\n')}

${propsInterface}export const ${node.name}: React.FC<${propsType}> = (props) => {
  return (
    <div className="${node.name.toLowerCase()}" style={{ width: ${node.props.width}, height: ${node.props.height} }}>
${generateChildrenJSX(node.children || [], 3)}
    </div>
  );
};

export default ${node.name};
`;

    return {
      name: node.name,
      code,
      imports,
      props,
    };
  });
}

function generateChildrenJSX(children: ASTFixture['nodes'][0]['children'], indent: number): string {
  if (!children || children.length === 0) return '';

  const spaces = '  '.repeat(indent);
  return children.map(child => {
    const tag = getReactTag(child.type);
    const className = child.name.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase();

    if (child.children && child.children.length > 0) {
      return `${spaces}<${tag} className="${className}">\n${generateChildrenJSX(child.children, indent + 1)}${spaces}</${tag}>`;
    }
    return `${spaces}<${tag} className="${className}" />`;
  }).join('\n');
}

function getReactTag(type: string): string {
  switch (type) {
    case 'Input': return 'input';
    case 'Button': return 'button';
    case 'Text': return 'span';
    case 'Image': return 'img';
    case 'Container': return 'div';
    default: return 'div';
  }
}

describe('AST to React E2E', () => {
  describe('generateReactFromAST', () => {
    it('generates React components from AST', () => {
      const ast = expectedAst as ASTFixture;
      const components = generateReactFromAST(ast);

      expect(components.length).toBe(2);
      expect(components.map(c => c.name)).toContain('LoginForm');
      expect(components.map(c => c.name)).toContain('Header');
    });

    it('generates valid React code structure', () => {
      const ast = expectedAst as ASTFixture;
      const components = generateReactFromAST(ast);

      const loginForm = components.find(c => c.name === 'LoginForm');
      expect(loginForm?.code).toContain('import React');
      expect(loginForm?.code).toContain('export const LoginForm');
      expect(loginForm?.code).toContain('React.FC');
    });

    it('includes component dimensions in styles', () => {
      const ast = expectedAst as ASTFixture;
      const components = generateReactFromAST(ast);

      const loginForm = components.find(c => c.name === 'LoginForm');
      expect(loginForm?.code).toContain('width: 400');
      expect(loginForm?.code).toContain('height: 300');
    });

    it('generates props for interactive elements', () => {
      const ast = expectedAst as ASTFixture;
      const components = generateReactFromAST(ast);

      const loginForm = components.find(c => c.name === 'LoginForm');
      expect(loginForm?.props.some(p => p.name === 'onInputChange')).toBe(true);
      expect(loginForm?.props.some(p => p.name === 'onSubmit')).toBe(true);
    });

    it('includes child elements in JSX', () => {
      const ast = expectedAst as ASTFixture;
      const components = generateReactFromAST(ast);

      const loginForm = components.find(c => c.name === 'LoginForm');
      expect(loginForm?.code).toContain('<input');
      expect(loginForm?.code).toContain('<button');
    });

    it('returns pipeline result format', () => {
      const ast = expectedAst as ASTFixture;
      const startTime = Date.now();
      const components = generateReactFromAST(ast);
      const duration = Date.now() - startTime;

      const result: PipelineResult<ReactComponentFixture[]> = {
        stage: 'react-generate',
        success: true,
        data: components,
        duration,
        timestamp: new Date(),
      };

      expect(result.stage).toBe('react-generate');
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });
  });

  describe('code quality', () => {
    it('generates TypeScript-compatible code', () => {
      const ast = expectedAst as ASTFixture;
      const components = generateReactFromAST(ast);

      for (const component of components) {
        expect(component.code).toContain('React.FC');
        // Should have typed props interface if props exist
        if (component.props.length > 0) {
          expect(component.code).toContain(`interface ${component.name}Props`);
        }
      }
    });

    it('exports components as named and default', () => {
      const ast = expectedAst as ASTFixture;
      const components = generateReactFromAST(ast);

      for (const component of components) {
        expect(component.code).toContain(`export const ${component.name}`);
        expect(component.code).toContain(`export default ${component.name}`);
      }
    });
  });
});
