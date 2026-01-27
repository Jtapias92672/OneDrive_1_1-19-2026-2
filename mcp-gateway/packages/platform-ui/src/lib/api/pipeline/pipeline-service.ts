/**
 * Pipeline Service
 * Phase 5: Dashboard Wiring - Orchestrates Figma-to-Code Pipeline
 */

import {
  PipelineStage,
  PipelineProgress,
  PipelineResult,
  PipelineRun,
  PipelineStepResult,
  FigmaImportRequest,
} from './pipeline-types';

// In-memory store for pipeline runs
const pipelineRuns = new Map<string, PipelineRun>();
const progressListeners = new Map<string, Set<(progress: PipelineProgress) => void>>();

function generateId(): string {
  return `pipeline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function notifyListeners(runId: string, progress: PipelineProgress): void {
  const listeners = progressListeners.get(runId);
  if (listeners) {
    listeners.forEach((listener) => listener(progress));
  }
}

export const pipelineService = {
  /**
   * Start a new pipeline run
   */
  async startImport(request: FigmaImportRequest): Promise<PipelineRun> {
    const runId = generateId();
    const now = new Date().toISOString();

    const run: PipelineRun = {
      id: runId,
      status: 'idle',
      progress: {
        stage: 'idle',
        progress: 0,
        message: 'Initializing pipeline...',
        startedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    pipelineRuns.set(runId, run);

    // Start async pipeline execution
    this.executePipeline(runId, request);

    return run;
  },

  /**
   * Execute the pipeline stages (simulated for dashboard demo)
   */
  async executePipeline(runId: string, request: FigmaImportRequest): Promise<void> {
    const run = pipelineRuns.get(runId);
    if (!run) return;

    const steps: PipelineStepResult[] = [];
    const startTime = Date.now();

    try {
      // Stage 1: Fetching Figma
      await this.updateProgress(runId, {
        stage: 'fetching-figma',
        progress: 10,
        message: `Fetching Figma file: ${request.fileKey}`,
      });
      await this.simulateDelay(800);
      steps.push({
        step: 'Figma API',
        success: true,
        message: 'Retrieved design file',
        duration: 800,
        details: [`File key: ${request.fileKey}`],
      });

      // Stage 2: Parsing
      await this.updateProgress(runId, {
        stage: 'parsing',
        progress: 30,
        message: 'Parsing Figma design structure...',
      });
      await this.simulateDelay(600);
      steps.push({
        step: 'FigmaParser',
        success: true,
        message: 'Parsed 7 components',
        duration: 600,
        details: ['Fills: 253', 'Text: 76', 'Auto-layout: 12'],
      });

      // Stage 3: Generating React
      if (request.options?.generateReact !== false) {
        await this.updateProgress(runId, {
          stage: 'generating-react',
          progress: 50,
          message: 'Generating React components with Tailwind...',
        });
        await this.simulateDelay(700);
        steps.push({
          step: 'ReactGenerator',
          success: true,
          message: 'Generated 7 React components',
          duration: 700,
          details: ['Frame1.tsx', 'Frame2.tsx', 'Frame3.tsx', 'Frame4.tsx', 'Frame5.tsx', 'Frame6.tsx', 'Frame7.tsx'],
        });
      }

      // Stage 4: Generating Mendix
      if (request.options?.generateMendix !== false) {
        await this.updateProgress(runId, {
          stage: 'generating-mendix',
          progress: 70,
          message: 'Generating Mendix pages and widgets...',
        });
        await this.simulateDelay(700);
        steps.push({
          step: 'MendixGenerator',
          success: true,
          message: 'Generated 7 pages, 7 widgets',
          duration: 700,
          details: ['pages/*.page.xml', 'widgets/*.widget.xml', 'styles/theme.scss'],
        });
      }

      // Stage 5: Verifying
      await this.updateProgress(runId, {
        stage: 'verifying',
        progress: 90,
        message: 'Verifying generated outputs...',
      });
      await this.simulateDelay(400);
      steps.push({
        step: 'Verification',
        success: true,
        message: 'All outputs valid',
        duration: 400,
        details: ['React: 7/7 valid', 'Mendix: 7/7 valid', 'SCSS: 3635 lines'],
      });

      // Complete
      const completedAt = new Date().toISOString();
      const result: PipelineResult = {
        runId,
        status: 'success',
        startedAt: run.progress.startedAt!,
        completedAt,
        duration: Date.now() - startTime,
        source: {
          fileKey: request.fileKey,
          fileName: 'POC_Test_Design',
          lastModified: new Date().toISOString(),
        },
        output: {
          reactComponents: 7,
          mendixPages: 7,
          mendixWidgets: 7,
          scssLines: 3635,
          outputDir: request.options?.outputDir || './vertical-slice-output',
        },
        steps,
      };

      run.status = 'complete';
      run.result = result;
      run.updatedAt = completedAt;

      await this.updateProgress(runId, {
        stage: 'complete',
        progress: 100,
        message: 'Pipeline complete! Generated 7 React components, 7 Mendix pages.',
        completedAt,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      run.status = 'error';
      run.updatedAt = new Date().toISOString();

      await this.updateProgress(runId, {
        stage: 'error',
        progress: run.progress.progress,
        message: `Pipeline failed: ${errorMessage}`,
        error: errorMessage,
      });
    }
  },

  /**
   * Update progress and notify listeners
   */
  async updateProgress(runId: string, progress: Partial<PipelineProgress>): Promise<void> {
    const run = pipelineRuns.get(runId);
    if (!run) return;

    run.progress = { ...run.progress, ...progress };
    run.status = progress.stage || run.status;
    run.updatedAt = new Date().toISOString();

    notifyListeners(runId, run.progress);
  },

  /**
   * Simulate async delay
   */
  async simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Get a pipeline run by ID
   */
  getRun(runId: string): PipelineRun | null {
    return pipelineRuns.get(runId) || null;
  },

  /**
   * Get all pipeline runs
   */
  getAllRuns(): PipelineRun[] {
    return Array.from(pipelineRuns.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  /**
   * Subscribe to progress updates
   */
  subscribe(runId: string, listener: (progress: PipelineProgress) => void): () => void {
    if (!progressListeners.has(runId)) {
      progressListeners.set(runId, new Set());
    }
    progressListeners.get(runId)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = progressListeners.get(runId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          progressListeners.delete(runId);
        }
      }
    };
  },

  /**
   * Cancel a running pipeline
   */
  cancel(runId: string): boolean {
    const run = pipelineRuns.get(runId);
    if (!run || run.status === 'complete' || run.status === 'error') {
      return false;
    }

    run.status = 'error';
    run.progress.stage = 'error';
    run.progress.message = 'Pipeline cancelled by user';
    run.progress.error = 'Cancelled';
    run.updatedAt = new Date().toISOString();

    notifyListeners(runId, run.progress);
    return true;
  },

  /**
   * Reset service (for testing)
   */
  reset(): void {
    pipelineRuns.clear();
    progressListeners.clear();
  },
};
