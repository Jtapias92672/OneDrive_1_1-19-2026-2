/**
 * PipelineDashboard Component
 * Phase 5: Main dashboard panel for Figma-to-Code pipeline
 */

import React, { useState, useEffect, useCallback } from 'react';
import { pipelineService, PipelineProgress, PipelineRun } from '@/lib/api/pipeline';
import { FigmaImportButton } from './FigmaImportButton';
import { PipelineProgressIndicator } from './PipelineProgressIndicator';
import { PipelineResultPanel } from './PipelineResultPanel';

export interface PipelineDashboardProps {
  defaultFileKey?: string;
  onPipelineComplete?: (result: PipelineRun) => void;
}

export const PipelineDashboard: React.FC<PipelineDashboardProps> = ({
  defaultFileKey = '6GefaVgI8xnuDIHhSbfzsJ',
  onPipelineComplete,
}) => {
  const [currentRun, setCurrentRun] = useState<PipelineRun | null>(null);
  const [recentRuns, setRecentRuns] = useState<PipelineRun[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Load recent runs on mount
  useEffect(() => {
    setRecentRuns(pipelineService.getAllRuns().slice(0, 5));
  }, []);

  // Subscribe to progress updates
  useEffect(() => {
    if (!currentRun) return;

    const unsubscribe = pipelineService.subscribe(currentRun.id, (progress: PipelineProgress) => {
      setCurrentRun((prev) => (prev ? { ...prev, progress, status: progress.stage } : prev));

      if (progress.stage === 'complete' || progress.stage === 'error') {
        setIsImporting(false);
        const updatedRun = pipelineService.getRun(currentRun.id);
        if (updatedRun) {
          setRecentRuns((prev) => [updatedRun, ...prev.filter((r) => r.id !== updatedRun.id)].slice(0, 5));
          onPipelineComplete?.(updatedRun);
        }
      }
    });

    return unsubscribe;
  }, [currentRun?.id, onPipelineComplete]);

  const handleImport = useCallback(async (fileKey: string) => {
    setIsImporting(true);
    try {
      const run = await pipelineService.startImport({
        fileKey,
        options: {
          generateReact: true,
          generateMendix: true,
        },
      });
      setCurrentRun(run);
    } catch (error) {
      setIsImporting(false);
      console.error('Failed to start import:', error);
    }
  }, []);

  const handleCancel = useCallback(() => {
    if (currentRun) {
      pipelineService.cancel(currentRun.id);
      setIsImporting(false);
    }
  }, [currentRun]);

  const handleRunAgain = useCallback(() => {
    if (currentRun?.result) {
      handleImport(currentRun.result.source.fileKey);
    }
  }, [currentRun, handleImport]);

  const isRunning = currentRun && !['idle', 'complete', 'error'].includes(currentRun.status);
  const hasResult = currentRun?.result;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="pipeline-dashboard">
      {/* Header */}
      <div className="px-4 py-3.5 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 text-teal-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-900">Figma-to-Code Pipeline</h3>
        </div>
        {recentRuns.length > 0 && (
          <span className="text-xs text-gray-500">{recentRuns.length} recent runs</span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Import button (when idle) */}
        {!isRunning && !hasResult && (
          <div className="text-center py-6">
            <p className="text-gray-500 mb-4">
              Transform Figma designs into React components and Mendix pages
            </p>
            <FigmaImportButton
              onImport={handleImport}
              isLoading={isImporting}
              defaultFileKey={defaultFileKey}
            />
          </div>
        )}

        {/* Progress indicator (when running) */}
        {isRunning && currentRun && (
          <PipelineProgressIndicator progress={currentRun.progress} onCancel={handleCancel} />
        )}

        {/* Result panel (when complete) */}
        {hasResult && currentRun?.result && (
          <div className="space-y-4">
            <PipelineResultPanel
              result={currentRun.result}
              onRunAgain={handleRunAgain}
            />
            <div className="text-center">
              <FigmaImportButton
                onImport={handleImport}
                isLoading={isImporting}
                defaultFileKey={defaultFileKey}
              />
            </div>
          </div>
        )}
      </div>

      {/* Recent runs */}
      {recentRuns.length > 0 && !isRunning && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Recent Runs</h4>
          <div className="space-y-1">
            {recentRuns.slice(0, 3).map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-100 cursor-pointer"
                onClick={() => setCurrentRun(run)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      run.status === 'complete'
                        ? 'text-green-500'
                        : run.status === 'error'
                          ? 'text-red-500'
                          : 'text-gray-400'
                    }`}
                  >
                    {run.status === 'complete' ? '✓' : run.status === 'error' ? '✗' : '○'}
                  </span>
                  <span className="text-sm text-gray-700">
                    {run.result?.source.fileName || 'Unknown'}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(run.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineDashboard;
