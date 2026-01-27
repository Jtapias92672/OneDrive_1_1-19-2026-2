/**
 * PipelineProgressIndicator Component
 * Shows real-time progress during pipeline execution
 */

import React from 'react';
import { PipelineProgress, PipelineStage } from '@/lib/api/pipeline';

export interface PipelineProgressIndicatorProps {
  progress: PipelineProgress;
  onCancel?: () => void;
  compact?: boolean;
}

const stageConfig: Record<PipelineStage, { label: string; icon: string; color: string }> = {
  idle: { label: 'Ready', icon: '○', color: 'text-gray-500' },
  'fetching-figma': { label: 'Fetching Figma', icon: '↓', color: 'text-blue-600' },
  parsing: { label: 'Parsing Design', icon: '⚙', color: 'text-purple-600' },
  'generating-react': { label: 'Generating React', icon: '⚛', color: 'text-cyan-600' },
  'generating-mendix': { label: 'Generating Mendix', icon: '⬡', color: 'text-orange-600' },
  verifying: { label: 'Verifying', icon: '✓', color: 'text-green-600' },
  complete: { label: 'Complete', icon: '✓', color: 'text-green-600' },
  error: { label: 'Error', icon: '✗', color: 'text-red-600' },
};

const stages: PipelineStage[] = [
  'fetching-figma',
  'parsing',
  'generating-react',
  'generating-mendix',
  'verifying',
];

export const PipelineProgressIndicator: React.FC<PipelineProgressIndicatorProps> = ({
  progress,
  onCancel,
  compact = false,
}) => {
  const currentConfig = stageConfig[progress.stage];
  const isRunning = !['idle', 'complete', 'error'].includes(progress.stage);
  const isComplete = progress.stage === 'complete';
  const isError = progress.stage === 'error';

  const getStageStatus = (stage: PipelineStage): 'pending' | 'active' | 'complete' | 'error' => {
    if (progress.stage === 'error') return 'error';
    if (progress.stage === 'complete') return 'complete';

    const currentIndex = stages.indexOf(progress.stage);
    const stageIndex = stages.indexOf(stage);

    if (stageIndex < currentIndex) return 'complete';
    if (stageIndex === currentIndex) return 'active';
    return 'pending';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3" data-testid="pipeline-progress-compact">
        <div className={`text-lg ${currentConfig.color}`}>{currentConfig.icon}</div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">{currentConfig.label}</span>
            <span className="text-sm text-gray-500">{progress.progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isError ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-teal-600'
              }`}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
        {isRunning && onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Cancel"
          >
            ✗
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg border" data-testid="pipeline-progress">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-2xl ${currentConfig.color}`}>{currentConfig.icon}</span>
          <div>
            <h3 className="font-semibold">{currentConfig.label}</h3>
            <p className="text-sm text-gray-500">{progress.message}</p>
          </div>
        </div>
        {isRunning && onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium">{progress.progress}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isError ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-teal-600'
            }`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      </div>

      {/* Stage indicators */}
      <div className="flex justify-between items-center">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage);
          const config = stageConfig[stage];
          return (
            <React.Fragment key={stage}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                    status === 'complete'
                      ? 'bg-green-100 border-green-500 text-green-600'
                      : status === 'active'
                        ? 'bg-teal-100 border-teal-500 text-teal-600 animate-pulse'
                        : status === 'error'
                          ? 'bg-red-100 border-red-500 text-red-600'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}
                >
                  {status === 'complete' ? '✓' : index + 1}
                </div>
                <span
                  className={`text-[10px] mt-1 ${
                    status === 'active' ? 'font-semibold text-teal-600' : 'text-gray-500'
                  }`}
                >
                  {config.label.split(' ')[0]}
                </span>
              </div>
              {index < stages.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 ${
                    getStageStatus(stages[index + 1]) !== 'pending'
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Error message */}
      {isError && progress.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {progress.error}
        </div>
      )}

      {/* Completion message */}
      {isComplete && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          Pipeline completed successfully!
        </div>
      )}
    </div>
  );
};

export default PipelineProgressIndicator;
