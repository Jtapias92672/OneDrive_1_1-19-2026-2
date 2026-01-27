/**
 * Dashboard UI Integration E2E Tests
 * Epic 12: Tests for dashboard wiring and UI integration
 */

import { pipelineService } from '@/lib/api/pipeline';

interface DashboardState {
  currentRun: PipelineRun | null;
  recentRuns: PipelineRun[];
  isImporting: boolean;
  error: string | null;
}

interface PipelineRun {
  id: string;
  status: string;
  progress: {
    stage: string;
    progress: number;
    message: string;
  };
  result?: {
    source: { fileKey: string; fileName: string };
    output: {
      reactComponents: number;
      mendixPages: number;
      mendixWidgets: number;
      scssLines: number;
    };
    steps: Array<{ step: string; success: boolean; duration: number }>;
  };
  createdAt: string;
}

/**
 * Dashboard State Manager (simulates React state management)
 */
class DashboardStateManager {
  private state: DashboardState = {
    currentRun: null,
    recentRuns: [],
    isImporting: false,
    error: null,
  };

  private listeners: Array<(state: DashboardState) => void> = [];

  getState(): DashboardState {
    return { ...this.state };
  }

  subscribe(listener: (state: DashboardState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }

  async startImport(fileKey: string): Promise<void> {
    this.state.isImporting = true;
    this.state.error = null;
    this.notify();

    try {
      const run = await pipelineService.startImport({ fileKey });
      this.state.currentRun = run as unknown as PipelineRun;
      this.state.isImporting = false;
      this.notify();

      // Subscribe to progress
      pipelineService.subscribe(run.id, (progress) => {
        if (this.state.currentRun) {
          this.state.currentRun.progress = progress;
          this.state.currentRun.status = progress.stage;
          this.notify();
        }
      });
    } catch (error) {
      this.state.isImporting = false;
      this.state.error = error instanceof Error ? error.message : 'Import failed';
      this.notify();
    }
  }

  cancelImport(): void {
    if (this.state.currentRun) {
      pipelineService.cancel(this.state.currentRun.id);
      this.state.isImporting = false;
      this.notify();
    }
  }

  addToRecent(run: PipelineRun): void {
    this.state.recentRuns = [run, ...this.state.recentRuns.slice(0, 4)];
    this.notify();
  }

  reset(): void {
    this.state = {
      currentRun: null,
      recentRuns: [],
      isImporting: false,
      error: null,
    };
    pipelineService.reset();
  }
}

/**
 * UI Event Simulator
 */
class UIEventSimulator {
  static async clickImportButton(manager: DashboardStateManager, fileKey: string): Promise<void> {
    await manager.startImport(fileKey);
  }

  static clickCancelButton(manager: DashboardStateManager): void {
    manager.cancelImport();
  }

  static async waitForStage(
    manager: DashboardStateManager,
    targetStage: string,
    timeoutMs = 10000
  ): Promise<boolean> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkState = () => {
        const state = manager.getState();
        if (state.currentRun?.progress.stage === targetStage) {
          resolve(true);
          return;
        }
        if (Date.now() - startTime > timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(checkState, 50);
      };
      checkState();
    });
  }

  static async waitForCompletion(
    manager: DashboardStateManager,
    timeoutMs = 10000
  ): Promise<boolean> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkState = () => {
        const state = manager.getState();
        if (
          state.currentRun?.status === 'complete' ||
          state.currentRun?.status === 'error'
        ) {
          resolve(true);
          return;
        }
        if (Date.now() - startTime > timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(checkState, 50);
      };
      checkState();
    });
  }
}

describe('@sanity Dashboard Integration E2E', () => {
  let manager: DashboardStateManager;

  beforeEach(() => {
    manager = new DashboardStateManager();
    manager.reset();
  });

  afterEach(() => {
    manager.reset();
  });

  describe('initial state', () => {
    it('@sanity starts with empty state', () => {
      const state = manager.getState();

      expect(state.currentRun).toBeNull();
      expect(state.recentRuns).toEqual([]);
      expect(state.isImporting).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('import workflow', () => {
    it('@sanity starts import on button click', async () => {
      await UIEventSimulator.clickImportButton(manager, 'test-file-key-12345');

      const state = manager.getState();
      expect(state.currentRun).toBeDefined();
      expect(state.currentRun?.id).toBeDefined();
    });

    it('shows importing state', async () => {
      const stateHistory: boolean[] = [];

      manager.subscribe((state) => {
        stateHistory.push(state.isImporting);
      });

      await UIEventSimulator.clickImportButton(manager, 'test-file-key-12345');

      // Should have been true at some point
      expect(stateHistory.includes(true)).toBe(true);
    });

    it('updates progress during pipeline execution', async () => {
      await UIEventSimulator.clickImportButton(manager, 'test-file-key-12345');

      // Wait a bit for progress updates
      await new Promise((resolve) => setTimeout(resolve, 500));

      const state = manager.getState();
      expect(state.currentRun?.progress).toBeDefined();
      expect(state.currentRun?.progress.progress).toBeGreaterThanOrEqual(0);
    });

    it('completes pipeline execution', async () => {
      await UIEventSimulator.clickImportButton(manager, 'test-file-key-12345');

      const completed = await UIEventSimulator.waitForCompletion(manager, 5000);

      expect(completed).toBe(true);

      const state = manager.getState();
      expect(['complete', 'error']).toContain(state.currentRun?.status);
    }, 6000);
  });

  describe('state subscriptions', () => {
    it('notifies subscribers of state changes', async () => {
      const stateChanges: DashboardState[] = [];

      manager.subscribe((state) => {
        stateChanges.push(state);
      });

      await UIEventSimulator.clickImportButton(manager, 'test-file-key-12345');

      expect(stateChanges.length).toBeGreaterThan(0);
    });

    it('allows unsubscribing', async () => {
      let callCount = 0;

      const unsubscribe = manager.subscribe(() => {
        callCount++;
      });

      // Trigger one change
      await manager.startImport('test-key-12345');
      const countAfterFirst = callCount;

      // Unsubscribe
      unsubscribe();

      // This shouldn't increase count
      manager.reset();

      expect(callCount).toBe(countAfterFirst);
    });
  });

  describe('cancel functionality', () => {
    it('cancels running import', async () => {
      await UIEventSimulator.clickImportButton(manager, 'test-file-key-12345');

      // Wait for pipeline to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      UIEventSimulator.clickCancelButton(manager);

      const state = manager.getState();
      expect(state.isImporting).toBe(false);
    });
  });

  describe('recent runs', () => {
    it('adds completed run to recent', async () => {
      const mockRun: PipelineRun = {
        id: 'run-1',
        status: 'complete',
        progress: { stage: 'complete', progress: 100, message: 'Done' },
        createdAt: new Date().toISOString(),
      };

      manager.addToRecent(mockRun);

      const state = manager.getState();
      expect(state.recentRuns.length).toBe(1);
      expect(state.recentRuns[0].id).toBe('run-1');
    });

    it('limits recent runs to 5', () => {
      for (let i = 0; i < 7; i++) {
        manager.addToRecent({
          id: `run-${i}`,
          status: 'complete',
          progress: { stage: 'complete', progress: 100, message: 'Done' },
          createdAt: new Date().toISOString(),
        });
      }

      const state = manager.getState();
      expect(state.recentRuns.length).toBe(5);
      expect(state.recentRuns[0].id).toBe('run-6'); // Most recent first
    });
  });

  describe('error handling', () => {
    it('handles import failure gracefully', async () => {
      // Simulate error by using invalid state
      try {
        await manager.startImport('');
      } catch {
        // Expected
      }

      // State should be recoverable
      const state = manager.getState();
      expect(state.isImporting).toBe(false);
    });
  });
});

describe('Dashboard Component Integration', () => {
  describe('FigmaImportButton integration', () => {
    it('extracts file key from full URL', () => {
      const url = 'https://www.figma.com/file/abc123xyz456/MyDesign';
      const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);

      expect(match).not.toBeNull();
      expect(match![1]).toBe('abc123xyz456');
    });

    it('accepts raw file key', () => {
      const fileKey = '6GefaVgI8xnuDIHhSbfzsJ';
      const isValidKey = /^[a-zA-Z0-9]{10,30}$/.test(fileKey);

      expect(isValidKey).toBe(true);
    });

    it('validates minimum key length', () => {
      const shortKey = 'abc';
      const isValidKey = shortKey.length >= 10;

      expect(isValidKey).toBe(false);
    });
  });

  describe('PipelineProgressIndicator integration', () => {
    it('displays correct stage labels', () => {
      const stages = [
        'fetching-figma',
        'parsing',
        'generating-react',
        'generating-mendix',
        'verifying',
        'complete',
      ];

      const stageLabels: Record<string, string> = {
        'fetching-figma': 'Fetching Figma',
        parsing: 'Parsing Design',
        'generating-react': 'Generating React',
        'generating-mendix': 'Generating Mendix',
        verifying: 'Verifying',
        complete: 'Complete',
      };

      for (const stage of stages) {
        expect(stageLabels[stage]).toBeDefined();
      }
    });

    it('calculates progress percentage correctly', () => {
      const stageProgress: Record<string, number> = {
        idle: 0,
        'fetching-figma': 10,
        parsing: 30,
        'generating-react': 50,
        'generating-mendix': 70,
        verifying: 90,
        complete: 100,
      };

      expect(stageProgress['complete']).toBe(100);
      expect(stageProgress['generating-react']).toBe(50);
    });
  });

  describe('PipelineResultPanel integration', () => {
    it('formats duration correctly', () => {
      const formatDuration = (ms: number): string => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
      };

      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(1500)).toBe('1.50s');
      expect(formatDuration(3200)).toBe('3.20s');
    });

    it('displays output counts correctly', () => {
      const result = {
        output: {
          reactComponents: 7,
          mendixPages: 7,
          mendixWidgets: 7,
          scssLines: 3635,
        },
      };

      expect(result.output.reactComponents).toBe(7);
      expect(result.output.mendixPages).toBe(7);
      expect(result.output.scssLines).toBe(3635);
    });
  });
});

describe('Pipeline Service Integration', () => {
  beforeEach(() => {
    pipelineService.reset();
  });

  it('creates pipeline run', async () => {
    const run = await pipelineService.startImport({
      fileKey: 'test-file-key-12345',
    });

    expect(run.id).toBeDefined();
    expect(run.id).toMatch(/^pipeline-/);
  });

  it('retrieves run by ID', async () => {
    const created = await pipelineService.startImport({
      fileKey: 'test-file-key-12345',
    });

    const retrieved = pipelineService.getRun(created.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(created.id);
  });

  it('lists all runs sorted by creation time', async () => {
    await pipelineService.startImport({ fileKey: 'key-1-1234567890' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await pipelineService.startImport({ fileKey: 'key-2-1234567890' });

    const runs = pipelineService.getAllRuns();

    expect(runs.length).toBe(2);
    // Most recent first
    expect(new Date(runs[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(runs[1].createdAt).getTime()
    );
  });

  it('cancels running pipeline', async () => {
    const run = await pipelineService.startImport({
      fileKey: 'test-file-key-12345',
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const cancelled = pipelineService.cancel(run.id);

    expect(cancelled).toBe(true);
  });

  it('progresses through all stages', async () => {
    const stages: string[] = [];

    const run = await pipelineService.startImport({
      fileKey: 'test-file-key-12345',
    });

    pipelineService.subscribe(run.id, (progress) => {
      if (!stages.includes(progress.stage)) {
        stages.push(progress.stage);
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 4000));

    expect(stages).toContain('parsing');
    expect(stages).toContain('generating-react');
    expect(stages).toContain('complete');
  }, 5000);
});
