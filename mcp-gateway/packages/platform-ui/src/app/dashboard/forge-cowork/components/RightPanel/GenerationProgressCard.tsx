'use client';

/**
 * Generation Progress Card
 * Real-time stage-by-stage progress tracking during POC generation
 * Positioned in right panel - shows detailed execution progress
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  Zap,
  CheckCircle2,
  Loader,
  XCircle,
  Clock,
} from 'lucide-react';

export type GenerationStageStatus = 'pending' | 'in-progress' | 'completed' | 'error';

export interface GenerationStage {
  id: string;
  label: string;
  status: GenerationStageStatus;
  progress?: number;
  fileCount?: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface GenerationProgressData {
  runId: string | null;
  currentStage: string | null;
  overallProgress: number;
  stages: GenerationStage[];
  elapsedTime: number;
  isExecuting: boolean;
  componentCount?: number;
  testCount?: number;
}

interface GenerationProgressCardProps {
  data?: GenerationProgressData;
  expanded: boolean;
  onToggle: () => void;
}

const DEFAULT_STAGES: GenerationStage[] = [
  { id: 'init', label: 'Project initialization', status: 'pending' },
  { id: 'parse', label: 'Parsing design source', status: 'pending' },
  { id: 'extract', label: 'Extracting components', status: 'pending' },
  { id: 'generate', label: 'Generating React code', status: 'pending' },
  { id: 'tests', label: 'Creating tests', status: 'pending' },
  { id: 'api', label: 'Generating API endpoints', status: 'pending' },
  { id: 'html', label: 'Building HTML output', status: 'pending' },
  { id: 'save', label: 'Saving artifacts', status: 'pending' },
  { id: 'finalize', label: 'Finalizing', status: 'pending' },
];

function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function StageIcon({ status }: { status: GenerationStageStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'in-progress':
      return <Loader className="w-4 h-4 text-violet-600 animate-spin" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-600" />;
    default:
      return null;
  }
}

export function GenerationProgressCard({
  data,
  expanded,
  onToggle,
}: GenerationProgressCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  const isExecuting = data?.isExecuting ?? false;
  const overallProgress = data?.overallProgress ?? 0;
  const stages = data?.stages ?? DEFAULT_STAGES;
  const runId = data?.runId;

  // Timer for elapsed time
  useEffect(() => {
    if (!isExecuting) {
      setElapsedTime(data?.elapsedTime ?? 0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isExecuting, data?.elapsedTime]);

  // Get last run summary for collapsed state
  const lastRunSummary = useCallback(() => {
    if (!runId) return 'No generation runs yet';

    const completedStages = stages.filter(s => s.status === 'completed').length;
    const totalStages = stages.length;

    if (completedStages === totalStages) {
      const componentCount = data?.componentCount ?? 0;
      const testCount = data?.testCount ?? 0;
      return `✓ Generated ${componentCount} components, ${testCount} tests`;
    }

    if (isExecuting) {
      return `⟳ In progress... ${completedStages}/${totalStages} stages`;
    }

    return `${completedStages}/${totalStages} stages completed`;
  }, [runId, stages, isExecuting, data?.componentCount, data?.testCount]);

  // Get status label
  const statusLabel = useCallback(() => {
    if (!isExecuting && overallProgress === 100) return 'completed';
    if (isExecuting) return `${overallProgress}%`;
    if (stages.some(s => s.status === 'error')) return 'error';
    return 'idle';
  }, [isExecuting, overallProgress, stages]);

  return (
    <div className="mb-5 bg-white rounded-xl border-2 border-violet-600 overflow-hidden">
      {/* Header */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-200"
      >
        <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
          <span
            className={`text-violet-600 transition-transform duration-200 ${
              expanded ? 'rotate-90' : ''
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </span>
          <Zap className="w-4 h-4 text-violet-600" />
          Generation Progress
        </h3>
        <span
          className={`text-[11px] font-semibold ${
            isExecuting
              ? 'text-violet-600'
              : overallProgress === 100
              ? 'text-green-600'
              : 'text-slate-500'
          }`}
        >
          {statusLabel()}
        </span>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4">
          {/* Collapsed Summary */}
          {!isExecuting && !runId && (
            <div className="text-[11px] text-slate-500 text-center py-4">
              {lastRunSummary()}
            </div>
          )}

          {/* Execution or Last Run Details */}
          {(isExecuting || runId) && (
            <>
              {/* Timer and Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {isExecuting ? 'Elapsed:' : 'Completed in:'}
                    </span>
                    <span className="font-semibold">{formatElapsedTime(elapsedTime)}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-violet-600">
                    {overallProgress}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300 ease-out ${
                      isExecuting ? 'animate-pulse' : ''
                    }`}
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>

              {/* Last Run Summary (collapsed) */}
              {!expanded && runId && (
                <div className="text-[11px] text-slate-600">
                  {lastRunSummary()}
                </div>
              )}

              {/* Stage List */}
              <div className="space-y-1">
                {stages.map((stage, index) => (
                  <div
                    key={stage.id}
                    className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                      stage.status === 'in-progress'
                        ? 'bg-violet-50'
                        : stage.status === 'completed'
                        ? 'bg-green-50'
                        : stage.status === 'error'
                        ? 'bg-red-50'
                        : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {/* Icon/Number */}
                      <div className="w-5 flex items-center justify-center">
                        {stage.status === 'pending' ? (
                          <span className="text-[11px] font-medium text-gray-400">
                            {index + 1}
                          </span>
                        ) : (
                          <StageIcon status={stage.status} />
                        )}
                      </div>

                      {/* Label */}
                      <div className="flex-1">
                        <div
                          className={`text-[11px] font-medium ${
                            stage.status === 'completed'
                              ? 'text-green-700'
                              : stage.status === 'in-progress'
                              ? 'text-violet-700'
                              : stage.status === 'error'
                              ? 'text-red-700'
                              : 'text-gray-500'
                          }`}
                        >
                          {stage.label}
                          {stage.status === 'in-progress' && '...'}
                        </div>

                        {/* Error Message */}
                        {stage.status === 'error' && stage.errorMessage && (
                          <div className="text-[10px] text-red-600 mt-0.5">
                            → {stage.errorMessage}
                          </div>
                        )}
                      </div>

                      {/* File Count */}
                      {stage.fileCount !== undefined && stage.fileCount > 0 && (
                        <span className="text-[10px] text-slate-500">
                          {stage.fileCount} {stage.fileCount === 1 ? 'file' : 'files'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Last Run Summary (expanded, completed) */}
              {!isExecuting && overallProgress === 100 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-[11px] text-slate-600 text-center">
                    {lastRunSummary()}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
