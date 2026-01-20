/**
 * FORGE Platform UI - Work Run History
 * @epic 10g - Work Intake
 */

'use client';

import Link from 'next/link';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  Zap,
  DollarSign
} from 'lucide-react';
import type { WorkRun } from '@/lib/types/work';

interface WorkRunHistoryProps {
  runs: WorkRun[];
}

export function WorkRunHistory({ runs }: WorkRunHistoryProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTokens = (tokens?: number) => {
    if (!tokens) return '—';
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return tokens.toString();
  };

  const statusConfig = {
    running: { icon: Play, color: 'text-blue-600 bg-blue-100', label: 'Running' },
    converged: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Converged' },
    failed: { icon: XCircle, color: 'text-red-600 bg-red-100', label: 'Failed' },
    timeout: { icon: Clock, color: 'text-yellow-600 bg-yellow-100', label: 'Timeout' },
    cancelled: { icon: XCircle, color: 'text-gray-600 bg-gray-100', label: 'Cancelled' },
  };

  if (runs.length === 0) {
    return (
      <div className="forge-card text-center py-8">
        <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No runs yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start a run to see execution history
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const config = statusConfig[run.status];
        const StatusIcon = config.icon;
        
        return (
          <div key={run.id} className="forge-card">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <StatusIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/runs/${run.runId}`}
                      className="font-medium hover:underline"
                    >
                      {run.runId}
                    </Link>
                    <span className={`forge-badge ${config.color}`}>
                      {config.label}
                    </span>
                    {run.score !== undefined && (
                      <span className={`text-sm font-medium ${
                        run.score >= 0.9 ? 'text-green-600' :
                        run.score >= 0.7 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {(run.score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Started {formatTime(run.startedAt)}
                    {run.completedAt && ` • Completed ${formatTime(run.completedAt)}`}
                  </p>
                </div>
              </div>
              
              <Link 
                href={`/runs/${run.runId}`}
                className="forge-button h-8 w-8 hover:bg-muted"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-lg font-semibold">{run.iterations}</p>
                <p className="text-xs text-muted-foreground">Iterations</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{formatDuration(run.duration)}</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold flex items-center justify-center gap-1">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  {formatTokens(run.tokens)}
                </p>
                <p className="text-xs text-muted-foreground">Tokens</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold flex items-center justify-center gap-1">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  {run.cost?.toFixed(2) || '—'}
                </p>
                <p className="text-xs text-muted-foreground">Cost</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default WorkRunHistory;
