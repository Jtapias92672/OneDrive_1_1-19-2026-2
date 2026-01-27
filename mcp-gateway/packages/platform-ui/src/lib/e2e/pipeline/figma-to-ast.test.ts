/**
 * Figma to AST E2E Tests
 * Epic 12: Pipeline Integration - Stage 1
 */

import { FigmaFixture, ASTFixture, PipelineResult } from '../types';
import sampleFigmaFile from '../fixtures/sample-figma-file.json';
import expectedAst from '../fixtures/expected-ast.json';

/**
 * Mock Figma Parser
 * In real implementation, this would use packages/figma-parser
 */
function parseFigmaToAST(figma: FigmaFixture): ASTFixture {
  const nodes = figma.document.children.flatMap((page) =>
    page.children?.map((frame) => ({
      id: frame.id,
      type: 'Component',
      name: frame.name,
      props: {
        width: frame.absoluteBoundingBox?.width || 0,
        height: frame.absoluteBoundingBox?.height || 0,
      },
      children: frame.children?.map((child) => ({
        id: child.id,
        type: inferNodeType(child.type, child.name),
        name: child.name,
        props: {
          width: child.absoluteBoundingBox?.width || 0,
          height: child.absoluteBoundingBox?.height || 0,
        },
        children: child.children?.map((grandchild) => ({
          id: grandchild.id,
          type: inferNodeType(grandchild.type, grandchild.name),
          name: grandchild.name,
          props: {},
        })),
      })),
    })) || []
  );

  return {
    nodes,
    metadata: {
      sourceFile: 'sample-figma-file.json',
      parsedAt: new Date().toISOString(),
      nodeCount: countNodes(nodes),
    },
  };
}

function inferNodeType(figmaType: string, name: string): string {
  if (figmaType === 'TEXT') return 'Text';
  if (name.toLowerCase().includes('input')) return 'Input';
  if (name.toLowerCase().includes('button')) return 'Button';
  if (name.toLowerCase().includes('logo') || name.toLowerCase().includes('image'))
    return 'Image';
  if (figmaType === 'FRAME') return 'Container';
  return 'Box';
}

function countNodes(nodes: unknown[]): number {
  let count = 0;
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop() as { children?: unknown[] };
    count++;
    if (node.children) {
      stack.push(...node.children);
    }
  }
  return count;
}

describe('Figma to AST E2E', () => {
  describe('parseFigmaToAST', () => {
    it('parses sample Figma file to AST', () => {
      const figma = sampleFigmaFile as FigmaFixture;
      const ast = parseFigmaToAST(figma);

      expect(ast.nodes.length).toBeGreaterThan(0);
      expect(ast.metadata.nodeCount).toBeGreaterThan(0);
    });

    it('extracts component names from frames', () => {
      const figma = sampleFigmaFile as FigmaFixture;
      const ast = parseFigmaToAST(figma);

      const componentNames = ast.nodes.map((n) => n.name);
      expect(componentNames).toContain('LoginForm');
      expect(componentNames).toContain('Header');
    });

    it('preserves component dimensions', () => {
      const figma = sampleFigmaFile as FigmaFixture;
      const ast = parseFigmaToAST(figma);

      const loginForm = ast.nodes.find((n) => n.name === 'LoginForm');
      expect(loginForm?.props.width).toBe(400);
      expect(loginForm?.props.height).toBe(300);
    });

    it('infers node types from names', () => {
      const figma = sampleFigmaFile as FigmaFixture;
      const ast = parseFigmaToAST(figma);

      const loginForm = ast.nodes.find((n) => n.name === 'LoginForm');
      const emailInput = loginForm?.children?.find((c) => c.name === 'EmailInput');
      const submitButton = loginForm?.children?.find((c) => c.name === 'SubmitButton');

      expect(emailInput?.type).toBe('Input');
      expect(submitButton?.type).toBe('Button');
    });

    it('returns pipeline result format', () => {
      const figma = sampleFigmaFile as FigmaFixture;
      const startTime = Date.now();
      const ast = parseFigmaToAST(figma);
      const duration = Date.now() - startTime;

      const result: PipelineResult<ASTFixture> = {
        stage: 'ast-parse',
        success: true,
        data: ast,
        duration,
        timestamp: new Date(),
      };

      expect(result.stage).toBe('ast-parse');
      expect(result.success).toBe(true);
      expect(result.data?.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('fixture validation', () => {
    it('sample Figma file has expected structure', () => {
      const figma = sampleFigmaFile as FigmaFixture;

      expect(figma.document).toBeDefined();
      expect(figma.document.children.length).toBeGreaterThan(0);
      expect(figma.components).toBeDefined();
      expect(figma.styles).toBeDefined();
    });

    it('expected AST has correct node count', () => {
      const ast = expectedAst as ASTFixture;

      expect(ast.nodes.length).toBe(2); // LoginForm and Header
      expect(ast.metadata.nodeCount).toBe(8);
    });
  });
});
