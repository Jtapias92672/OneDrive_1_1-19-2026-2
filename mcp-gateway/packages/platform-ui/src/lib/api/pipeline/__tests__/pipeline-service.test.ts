/**
 * Pipeline Service Tests
 * Phase 5: Dashboard Wiring
 */

import { pipelineService } from '../pipeline-service';

describe('Pipeline Service', () => {
  beforeEach(() => {
    pipelineService.reset();
  });

  describe('startImport', () => {
    it('creates a new pipeline run', async () => {
      const run = await pipelineService.startImport({
        fileKey: 'test-file-key',
      });

      expect(run.id).toBeDefined();
      // Pipeline starts immediately, so status may already be running
      expect(['idle', 'fetching-figma']).toContain(run.status);
      expect(run.createdAt).toBeDefined();
    });

    it('sets progress info', async () => {
      const run = await pipelineService.startImport({
        fileKey: 'test-file-key',
      });

      // Pipeline starts immediately, so check that progress exists
      expect(run.progress.message).toBeDefined();
      expect(run.progress.progress).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRun', () => {
    it('returns run by ID', async () => {
      const created = await pipelineService.startImport({
        fileKey: 'test-file-key',
      });

      const retrieved = pipelineService.getRun(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it('returns null for unknown ID', () => {
      const result = pipelineService.getRun('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('getAllRuns', () => {
    it('returns all runs sorted by creation time', async () => {
      await pipelineService.startImport({ fileKey: 'key-1' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await pipelineService.startImport({ fileKey: 'key-2' });

      const runs = pipelineService.getAllRuns();

      expect(runs.length).toBe(2);
      // Most recent first
      expect(new Date(runs[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(runs[1].createdAt).getTime()
      );
    });
  });

  describe('subscribe', () => {
    it('calls listener on progress updates', async () => {
      const listener = jest.fn();
      const run = await pipelineService.startImport({ fileKey: 'test-key' });

      pipelineService.subscribe(run.id, listener);

      // Wait for some progress updates
      await new Promise((resolve) => setTimeout(resolve, 1500));

      expect(listener).toHaveBeenCalled();
    });

    it('returns unsubscribe function', async () => {
      const listener = jest.fn();
      const run = await pipelineService.startImport({ fileKey: 'test-key' });

      const unsubscribe = pipelineService.subscribe(run.id, listener);
      unsubscribe();

      // Listener should not be called after unsubscribe
      const callCountBefore = listener.mock.calls.length;
      await new Promise((resolve) => setTimeout(resolve, 500));

      // May have some calls from before unsubscribe
      expect(listener.mock.calls.length).toBe(callCountBefore);
    });
  });

  describe('cancel', () => {
    it('cancels a running pipeline', async () => {
      const run = await pipelineService.startImport({ fileKey: 'test-key' });

      // Wait for pipeline to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      const cancelled = pipelineService.cancel(run.id);

      expect(cancelled).toBe(true);

      const updated = pipelineService.getRun(run.id);
      expect(updated?.status).toBe('error');
      expect(updated?.progress.error).toBe('Cancelled');
    });

    it('returns false for completed pipeline', async () => {
      const run = await pipelineService.startImport({ fileKey: 'test-key' });

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 4000));

      const cancelled = pipelineService.cancel(run.id);

      expect(cancelled).toBe(false);
    }, 5000);

    it('returns false for unknown run', () => {
      const cancelled = pipelineService.cancel('nonexistent');

      expect(cancelled).toBe(false);
    });
  });

  describe('pipeline execution', () => {
    it('progresses through stages', async () => {
      const stages: string[] = [];
      const run = await pipelineService.startImport({ fileKey: 'test-key' });

      pipelineService.subscribe(run.id, (progress) => {
        if (!stages.includes(progress.stage)) {
          stages.push(progress.stage);
        }
      });

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Pipeline starts immediately, so fetching-figma may have already passed
      // Check that key stages are observed
      expect(stages).toContain('parsing');
      expect(stages).toContain('generating-react');
      expect(stages).toContain('generating-mendix');
      expect(stages).toContain('verifying');
      expect(stages).toContain('complete');
    }, 5000);

    it('produces result on completion', async () => {
      const run = await pipelineService.startImport({ fileKey: 'test-key' });

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 4000));

      const completed = pipelineService.getRun(run.id);

      expect(completed?.result).toBeDefined();
      expect(completed?.result?.status).toBe('success');
      expect(completed?.result?.output.reactComponents).toBeGreaterThan(0);
      expect(completed?.result?.output.mendixPages).toBeGreaterThan(0);
    }, 5000);
  });

  describe('reset', () => {
    it('clears all runs', async () => {
      await pipelineService.startImport({ fileKey: 'key-1' });
      await pipelineService.startImport({ fileKey: 'key-2' });

      pipelineService.reset();

      const runs = pipelineService.getAllRuns();
      expect(runs.length).toBe(0);
    });
  });
});
