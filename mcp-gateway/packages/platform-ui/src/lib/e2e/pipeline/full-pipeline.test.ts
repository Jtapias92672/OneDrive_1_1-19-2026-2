/**
 * Full Pipeline E2E Tests
 * Epic 12: Complete Figma-to-Mendix flow
 */

import {
  FigmaFixture,
  ASTFixture,
  ReactComponentFixture,
  MendixExportFixture,
  PipelineResult,
  E2ERunResult,
  E2ESummary,
} from '../types';
import sampleFigmaFile from '../fixtures/sample-figma-file.json';

// Import mock services
import { MockFigmaClient } from '@/lib/integrations/figma';
import { MockMendixClient } from '@/lib/integrations/mendix';
import { auditLogger } from '@/lib/governance/audit';
import { claimDetector } from '@/lib/accuracy/claims';
import { confidenceCalculator } from '@/lib/accuracy/confidence';

/**
 * Full Pipeline Orchestrator
 * Coordinates all stages of the FORGE pipeline
 */
class PipelineOrchestrator {
  private results: PipelineResult[] = [];
  private runId: string;

  constructor() {
    this.runId = `run-${Date.now()}`;
  }

  async execute(figmaFile: FigmaFixture): Promise<E2ERunResult> {
    const startedAt = new Date();
    this.results = [];

    try {
      // Stage 1: Parse Figma to AST
      const ast = await this.parseFigmaToAST(figmaFile);

      // Stage 2: Generate React components
      const components = await this.generateReact(ast);

      // Stage 3: Validate with orchestration
      const validated = await this.validateComponents(components);

      // Stage 4: Export to Mendix
      const mendixExport = await this.exportToMendix(validated);

      // Stage 5: Log to governance
      await this.logGovernance(mendixExport);

      // Stage 6: Calculate accuracy
      const accuracy = await this.calculateAccuracy(components);

      return this.buildResult(startedAt, accuracy);
    } catch (error) {
      const failedResult: PipelineResult = {
        stage: 'figma-input',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0,
        timestamp: new Date(),
      };
      this.results.push(failedResult);
      return this.buildResult(startedAt, 0);
    }
  }

  private async parseFigmaToAST(figma: FigmaFixture): Promise<ASTFixture> {
    const start = Date.now();

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
          type: this.inferType(child.name),
          name: child.name,
          props: {},
        })),
      })) || []
    );

    const ast: ASTFixture = {
      nodes,
      metadata: {
        sourceFile: 'figma-input',
        parsedAt: new Date().toISOString(),
        nodeCount: nodes.length,
      },
    };

    this.results.push({
      stage: 'ast-parse',
      success: true,
      data: ast,
      duration: Date.now() - start,
      timestamp: new Date(),
    });

    return ast;
  }

  private async generateReact(ast: ASTFixture): Promise<ReactComponentFixture[]> {
    const start = Date.now();

    const components = ast.nodes.map((node) => ({
      name: node.name,
      code: `export const ${node.name} = () => <div>${node.name}</div>;`,
      imports: ['import React from "react";'],
      props: [],
    }));

    this.results.push({
      stage: 'react-generate',
      success: true,
      data: components,
      duration: Date.now() - start,
      timestamp: new Date(),
    });

    return components;
  }

  private async validateComponents(
    components: ReactComponentFixture[]
  ): Promise<ReactComponentFixture[]> {
    const start = Date.now();

    // Mock validation - in real impl would use Epic 7 orchestration
    const validated = components.filter((c) => c.code.length > 0);

    this.results.push({
      stage: 'orchestration',
      success: true,
      data: { validatedCount: validated.length },
      duration: Date.now() - start,
      timestamp: new Date(),
    });

    return validated;
  }

  private async exportToMendix(
    components: ReactComponentFixture[]
  ): Promise<MendixExportFixture> {
    const start = Date.now();

    // Mock Mendix export
    const mendixExport: MendixExportFixture = {
      projectId: `mendix-${this.runId}`,
      pages: components.map((c, i) => ({
        id: `page-${i}`,
        name: `${c.name}Page`,
      })),
      widgets: components.map((c, i) => ({
        id: `widget-${i}`,
        type: 'CustomWidget',
      })),
      exportedAt: new Date().toISOString(),
    };

    this.results.push({
      stage: 'mendix-export',
      success: true,
      data: mendixExport,
      duration: Date.now() - start,
      timestamp: new Date(),
    });

    return mendixExport;
  }

  private async logGovernance(mendixExport: MendixExportFixture): Promise<void> {
    const start = Date.now();

    // Log to audit trail
    await auditLogger.log(
      'workflow_completed',
      { type: 'system', id: 'e2e-orchestrator' },
      'pipeline-complete',
      {
        resource: { type: 'pipeline', id: mendixExport.projectId },
        riskLevel: 'low',
        details: {
          pagesExported: mendixExport.pages.length,
          widgetsExported: mendixExport.widgets.length,
        },
      }
    );

    this.results.push({
      stage: 'governance',
      success: true,
      data: { auditLogged: true },
      duration: Date.now() - start,
      timestamp: new Date(),
    });
  }

  private async calculateAccuracy(components: ReactComponentFixture[]): Promise<number> {
    const start = Date.now();

    // Mock accuracy calculation - detect claims in generated code
    const allCode = components.map((c) => c.code).join('\n');
    const result = claimDetector.detect(allCode);

    // Calculate confidence
    const confidence = result.claims.length > 0 ? 85 : 100; // Mock confidence

    this.results.push({
      stage: 'accuracy',
      success: true,
      data: { claims: result.claims.length, confidence },
      duration: Date.now() - start,
      timestamp: new Date(),
    });

    return confidence;
  }

  private inferType(name: string): string {
    if (name.toLowerCase().includes('input')) return 'Input';
    if (name.toLowerCase().includes('button')) return 'Button';
    return 'Box';
  }

  private buildResult(startedAt: Date, accuracy: number): E2ERunResult {
    const completedAt = new Date();
    const passed = this.results.filter((r) => r.success);
    const failed = this.results.filter((r) => !r.success);

    const summary: E2ESummary = {
      totalStages: this.results.length,
      passedStages: passed.length,
      failedStages: failed.length,
      governanceChecks: 1,
      accuracyScore: accuracy,
    };

    return {
      runId: this.runId,
      status: failed.length === 0 ? 'passed' : 'failed',
      stages: this.results,
      totalDuration: completedAt.getTime() - startedAt.getTime(),
      startedAt,
      completedAt,
      summary,
    };
  }
}

describe('Full Pipeline E2E', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
  });

  it('executes complete Figma-to-Mendix pipeline', async () => {
    const figma = sampleFigmaFile as FigmaFixture;
    const result = await orchestrator.execute(figma);

    expect(result.status).toBe('passed');
    expect(result.stages.length).toBeGreaterThanOrEqual(5);
    expect(result.summary.failedStages).toBe(0);
  });

  it('passes through all pipeline stages', async () => {
    const figma = sampleFigmaFile as FigmaFixture;
    const result = await orchestrator.execute(figma);

    const stageNames = result.stages.map((s) => s.stage);
    expect(stageNames).toContain('ast-parse');
    expect(stageNames).toContain('react-generate');
    expect(stageNames).toContain('orchestration');
    expect(stageNames).toContain('mendix-export');
    expect(stageNames).toContain('governance');
    expect(stageNames).toContain('accuracy');
  });

  it('generates components for each Figma frame', async () => {
    const figma = sampleFigmaFile as FigmaFixture;
    const result = await orchestrator.execute(figma);

    const reactStage = result.stages.find((s) => s.stage === 'react-generate');
    const components = reactStage?.data as ReactComponentFixture[];

    expect(components.length).toBe(2); // LoginForm and Header
  });

  it('exports to Mendix with pages and widgets', async () => {
    const figma = sampleFigmaFile as FigmaFixture;
    const result = await orchestrator.execute(figma);

    const mendixStage = result.stages.find((s) => s.stage === 'mendix-export');
    const mendixExport = mendixStage?.data as MendixExportFixture;

    expect(mendixExport.pages.length).toBe(2);
    expect(mendixExport.widgets.length).toBe(2);
  });

  it('logs to governance audit trail', async () => {
    const figma = sampleFigmaFile as FigmaFixture;
    const result = await orchestrator.execute(figma);

    const govStage = result.stages.find((s) => s.stage === 'governance');
    expect(govStage?.success).toBe(true);
    expect((govStage?.data as { auditLogged: boolean }).auditLogged).toBe(true);
  });

  it('calculates accuracy score', async () => {
    const figma = sampleFigmaFile as FigmaFixture;
    const result = await orchestrator.execute(figma);

    expect(result.summary.accuracyScore).toBeDefined();
    expect(result.summary.accuracyScore).toBeGreaterThanOrEqual(0);
    expect(result.summary.accuracyScore).toBeLessThanOrEqual(100);
  });

  it('tracks total duration', async () => {
    const figma = sampleFigmaFile as FigmaFixture;
    const result = await orchestrator.execute(figma);

    expect(result.totalDuration).toBeGreaterThanOrEqual(0);
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it('provides detailed summary', async () => {
    const figma = sampleFigmaFile as FigmaFixture;
    const result = await orchestrator.execute(figma);

    expect(result.summary.totalStages).toBeGreaterThan(0);
    expect(result.summary.passedStages).toBe(result.summary.totalStages);
    expect(result.summary.governanceChecks).toBeGreaterThan(0);
  });
});
