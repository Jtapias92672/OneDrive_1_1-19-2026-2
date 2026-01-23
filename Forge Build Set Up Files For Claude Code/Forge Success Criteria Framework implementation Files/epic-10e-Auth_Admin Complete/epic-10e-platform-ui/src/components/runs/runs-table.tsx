/**
 * FORGE Platform UI - Runs Table
 * @epic 10b - Execution Monitor
 */

'use client';

import Link from 'next/link';
import { Play, Pause, Eye, MoreVertical } from 'lucide-react';
import type { Run, RunStatus } from '@/lib/types/runs';

interface RunsTableProps {
  runs: Run[];
}

export function RunsTable({ runs }: RunsTableProps) {
  const getStatusBadge = (status: RunStatus) => {
    const styles: Record<RunStatus, string> = {
      pending: 'bg-gray-100 text-gray-700',
      running: 'bg-blue-100 text-blue-700',
      paused: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      killed: 'bg-gray-100 text-gray-700',
      timeout: 'bg-orange-100 text-orange-700',
    };
    return styles[status] || styles.pending;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="forge-card p-0 overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 text-sm">
          <tr>
            <th className="text-left p-4 font-medium">Run</th>
            <th className="text-left p-4 font-medium">Status</th>
            <th className="text-left p-4 font-medium">Progress</th>
            <th className="text-left p-4 font-medium">Score</th>
            <th className="text-left p-4 font-medium">Cost</th>
            <th className="text-left p-4 font-medium">Duration</th>
            <th className="text-left p-4 font-medium">Started</th>
            <th className="text-right p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {runs.map((run) => (
            <tr key={run.id} className="hover:bg-muted/30 transition-colors">
              {/* Run Info */}
              <td className="p-4">
                <Link href={`/runs/${run.id}`} className="block">
                  <p className="font-medium hover:underline">{run.contractName}</p>
                  <p className="text-xs text-muted-foreground">
                    {run.id}
                    {run.workId && <span className="ml-2">• {run.workId}</span>}
                  </p>
                </Link>
              </td>

              {/* Status */}
              <td className="p-4">
                <span className={`forge-badge ${getStatusBadge(run.status)}`}>
                  {run.status === 'running' && (
                    <span className="mr-1.5 h-2 w-2 rounded-full bg-blue-500 animate-pulse inline-block" />
                  )}
                  {run.status}
                </span>
              </td>

              {/* Progress */}
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        run.status === 'completed' ? 'bg-green-500' :
                        run.status === 'failed' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${(run.currentIteration / run.maxIterations) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {run.currentIteration}/{run.maxIterations}
                  </span>
                </div>
              </td>

              {/* Score */}
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${
                    run.currentScore >= run.targetScore ? 'text-green-600' : ''
                  }`}>
                    {(run.currentScore * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {(run.targetScore * 100).toFixed(0)}%
                  </span>
                </div>
              </td>

              {/* Cost */}
              <td className="p-4 text-sm">
                ${run.estimatedCost.toFixed(2)}
              </td>

              {/* Duration */}
              <td className="p-4 text-sm text-muted-foreground">
                {formatDuration(run.duration)}
              </td>

              {/* Started */}
              <td className="p-4 text-sm text-muted-foreground">
                {formatTime(run.startedAt)}
              </td>

              {/* Actions */}
              <td className="p-4">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/runs/${run.id}`}
                    className="forge-button h-8 w-8 hover:bg-muted"
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  {run.status === 'running' && (
                    <button
                      className="forge-button h-8 w-8 hover:bg-muted"
                      title="Pause"
                    >
                      <Pause className="h-4 w-4" />
                    </button>
                  )}
                  {run.status === 'paused' && (
                    <button
                      className="forge-button h-8 w-8 hover:bg-muted"
                      title="Resume"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    className="forge-button h-8 w-8 hover:bg-muted"
                    title="More actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RunsTable;
