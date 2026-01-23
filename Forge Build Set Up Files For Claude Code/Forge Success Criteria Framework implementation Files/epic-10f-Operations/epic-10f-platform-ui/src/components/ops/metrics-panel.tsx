/**
 * FORGE Platform UI - Metrics Panel
 * @epic 10f - Operations
 */

'use client';

import { Activity, Zap, Clock, Cpu, Database, AlertCircle } from 'lucide-react';
import type { SystemMetrics } from '@/lib/types/ops';

interface MetricsPanelProps {
  metrics: SystemMetrics;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  const getBarColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Active Runs */}
      <div className="forge-card py-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground">Active Runs</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{metrics.activeRuns}</span>
          {metrics.queuedRuns > 0 && (
            <span className="text-sm text-muted-foreground">
              +{metrics.queuedRuns} queued
            </span>
          )}
        </div>
      </div>

      {/* Throughput */}
      <div className="forge-card py-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <span className="text-sm text-muted-foreground">Throughput</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{metrics.runsPerHour}</span>
          <span className="text-sm text-muted-foreground">runs/hr</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatNumber(metrics.tokensPerHour)} tokens/hr
        </p>
      </div>

      {/* Completed Today */}
      <div className="forge-card py-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-green-500" />
          <span className="text-sm text-muted-foreground">Today</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{metrics.completedRunsToday}</span>
          <span className="text-sm text-muted-foreground">completed</span>
        </div>
        {metrics.failedRunsToday > 0 && (
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {metrics.failedRunsToday} failed
          </p>
        )}
      </div>

      {/* Performance */}
      <div className="forge-card py-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-5 w-5 text-purple-500" />
          <span className="text-sm text-muted-foreground">Performance</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Duration</span>
            <span className="font-medium">{metrics.avgRunDuration.toFixed(1)}s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Iterations</span>
            <span className="font-medium">{metrics.avgIterations.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Score</span>
            <span className="font-medium">{(metrics.avgScore * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Resources */}
      {(metrics.cpuUsage !== undefined || metrics.memoryUsage !== undefined) && (
        <>
          <div className="forge-card py-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">CPU Usage</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold">{metrics.cpuUsage}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(metrics.cpuUsage!)}`}
                style={{ width: `${metrics.cpuUsage}%` }}
              />
            </div>
          </div>

          <div className="forge-card py-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-5 w-5 text-indigo-500" />
              <span className="text-sm text-muted-foreground">Memory Usage</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold">{metrics.memoryUsage}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(metrics.memoryUsage!)}`}
                style={{ width: `${metrics.memoryUsage}%` }}
              />
            </div>
          </div>
        </>
      )}

      {/* Queue Depth */}
      <div className="forge-card py-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-5 w-5 text-orange-500" />
          <span className="text-sm text-muted-foreground">Queue Depth</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{metrics.queueDepth}</span>
          <span className="text-sm text-muted-foreground">pending</span>
        </div>
      </div>
    </div>
  );
}

export default MetricsPanel;
