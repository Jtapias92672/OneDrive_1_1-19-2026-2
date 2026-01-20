/**
 * FORGE Platform UI - Run Summary Card
 * @epic 10b - Execution Monitor
 */

'use client';

import { 
  Target, 
  Clock, 
  Zap, 
  DollarSign, 
  User, 
  GitBranch,
  Shield,
  AlertTriangle
} from 'lucide-react';
import type { Run } from '@/lib/types/runs';

interface RunSummaryCardProps {
  run: Run;
}

export function RunSummaryCard({ run }: RunSummaryCardProps) {
  const formatDuration = (ms?: number) => {
    if (!ms) return 'In progress';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOutcomeStyle = () => {
    switch (run.outcome) {
      case 'success': return 'bg-green-50 border-green-200 text-green-700';
      case 'failure': return 'bg-red-50 border-red-200 text-red-700';
      case 'partial': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      default: return 'bg-muted border-border';
    }
  };

  return (
    <div className="forge-card">
      <h3 className="font-semibold mb-4">Run Summary</h3>

      {/* Outcome Banner */}
      {run.outcome && (
        <div className={`p-4 rounded-lg border mb-4 ${getOutcomeStyle()}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">{run.outcome}</p>
              {run.errorMessage && (
                <p className="text-sm mt-1">{run.errorMessage}</p>
              )}
            </div>
            {run.confidence && (
              <span className="text-lg font-bold">
                {(run.confidence * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error Details */}
      {run.errorType && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-medium text-red-700">
              {run.errorType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
            <p className="text-sm text-red-600 mt-1">
              {run.errorMessage || 'No additional details available'}
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Score */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Score</p>
            <p className="font-semibold">
              <span className={run.currentScore >= run.targetScore ? 'text-green-600' : ''}>
                {(run.currentScore * 100).toFixed(1)}%
              </span>
              <span className="text-muted-foreground font-normal">
                {' / '}{(run.targetScore * 100).toFixed(0)}% target
              </span>
            </p>
          </div>
        </div>

        {/* Iterations */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <Zap className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Iterations</p>
            <p className="font-semibold">
              {run.currentIteration}
              <span className="text-muted-foreground font-normal">
                {' / '}{run.maxIterations} max
              </span>
            </p>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-semibold">{formatDuration(run.duration)}</p>
          </div>
        </div>

        {/* Cost */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Cost</p>
            <p className="font-semibold">
              ${run.estimatedCost.toFixed(2)}
              <span className="text-muted-foreground font-normal text-sm ml-1">
                ({run.tokensUsed.toLocaleString()} tokens)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-4 pt-4 border-t space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Owner:</span>
          <span>{run.owner}</span>
        </div>

        {run.repo && (
          <div className="flex items-center gap-2 text-sm">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Repo:</span>
            <span>{run.repo}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Policy:</span>
          <span>{run.policyProfile}</span>
          <span className="forge-badge bg-muted text-muted-foreground">
            {run.environment}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Started:</span>
          <span>{formatDate(run.startedAt)}</span>
          {run.completedAt && (
            <>
              <span className="text-muted-foreground">→</span>
              <span>{formatDate(run.completedAt)}</span>
            </>
          )}
        </div>
      </div>

      {/* Versions */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-sm text-muted-foreground mb-2">Versions</p>
        <div className="flex gap-2 flex-wrap">
          <span className="forge-badge bg-muted text-muted-foreground">
            Contract: {run.contractVersion}
          </span>
          <span className="forge-badge bg-muted text-muted-foreground">
            Policy: {run.policyProfile}
          </span>
        </div>
      </div>
    </div>
  );
}

export default RunSummaryCard;
