/**
 * FORGE Platform UI - Run Detail Page
 * @epic 10b - Execution Monitor
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Pause, 
  Play, 
  Square, 
  GitBranch, 
  Download,
  ExternalLink,
  Wifi,
  WifiOff
} from 'lucide-react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { RunSummaryCard } from '@/components/runs/run-summary-card';
import { RunTimeline } from '@/components/runs/run-timeline';
import { IterationsList } from '@/components/runs/iterations-list';
import { RunEventsLog } from '@/components/runs/run-events-log';
import { ScoreChart } from '@/components/runs/score-chart';
import { useRunStream } from '@/hooks/use-run-stream';
import type { RunStatus } from '@/lib/types/runs';

type DetailTab = 'timeline' | 'iterations' | 'events' | 'output';

export default function RunDetailPage() {
  const params = useParams();
  const runId = params.runId as string;
  
  const [activeTab, setActiveTab] = useState<DetailTab>('timeline');
  const [isActionPending, setIsActionPending] = useState(false);
  
  const {
    run,
    iterations,
    events,
    isConnected,
    isLoading,
    error,
    pause,
    resume,
    kill,
    fork,
  } = useRunStream({ runId });

  const handleAction = async (action: () => Promise<void>) => {
    setIsActionPending(true);
    try {
      await action();
    } catch (e: any) {
      console.error('Action failed:', e);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleFork = async () => {
    const lastCheckpoint = iterations[iterations.length - 1];
    if (lastCheckpoint) {
      setIsActionPending(true);
      try {
        const newRunId = await fork(lastCheckpoint.id);
        window.location.href = `/runs/${newRunId}`;
      } catch (e: any) {
        console.error('Fork failed:', e);
      } finally {
        setIsActionPending(false);
      }
    }
  };

  const handleExport = () => {
    const exportData = { run, iterations, events };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forge-run-${runId}-evidence.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: RunStatus) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'killed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 mt-14">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex flex-col items-center justify-center h-96 mt-14">
        <p className="text-destructive mb-4">{error || 'Run not found'}</p>
        <Link href="/runs" className="text-primary hover:underline">
          ← Back to runs
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'timeline' as const, label: 'Timeline' },
    { id: 'iterations' as const, label: `Iterations (${iterations.length})` },
    { id: 'events' as const, label: `Events (${events.length})` },
    { id: 'output' as const, label: 'Output' },
  ];

  return (
    <div className="space-y-6 mt-14">
      {/* Breadcrumbs */}
      <Breadcrumbs 
        items={[
          { label: 'Runs', href: '/runs' },
          { label: run.contractName },
        ]} 
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link 
            href="/runs"
            className="forge-button h-9 w-9 hover:bg-muted mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{run.contractName}</h1>
              <span className={`forge-badge ${getStatusColor(run.status)}`}>
                {run.status.toUpperCase()}
              </span>
              {isConnected ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Wifi className="h-3 w-3" /> Live
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <WifiOff className="h-3 w-3" /> Offline
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Run ID: {run.id}
              {run.workId && (
                <> • Work: <Link href={`/work/${run.workId}`} className="text-primary hover:underline">{run.workId}</Link></>
              )}
              {run.repo && (
                <> • Repo: {run.repo}</>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {run.status === 'running' && (
            <button
              onClick={() => handleAction(pause)}
              disabled={isActionPending}
              className="forge-button h-9 px-3 bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </button>
          )}
          
          {run.status === 'paused' && (
            <button
              onClick={() => handleAction(resume)}
              disabled={isActionPending}
              className="forge-button h-9 px-3 bg-green-100 text-green-700 hover:bg-green-200"
            >
              <Play className="h-4 w-4 mr-2" />
              Resume
            </button>
          )}
          
          {(run.status === 'running' || run.status === 'paused') && (
            <button
              onClick={() => handleAction(kill)}
              disabled={isActionPending}
              className="forge-button h-9 px-3 bg-red-100 text-red-700 hover:bg-red-200"
            >
              <Square className="h-4 w-4 mr-2" />
              Kill
            </button>
          )}

          <button
            onClick={handleFork}
            disabled={isActionPending || iterations.length === 0}
            className="forge-button h-9 px-3 hover:bg-muted"
            title="Fork from last checkpoint"
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Fork
          </button>

          <button
            onClick={handleExport}
            className="forge-button h-9 px-3 hover:bg-muted"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>

          {run.workId && (
            <Link
              href={`/evidence?runId=${run.id}`}
              className="forge-button h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Evidence
            </Link>
          )}
        </div>
      </div>

      {/* Summary + Score Chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RunSummaryCard run={run} />
        </div>
        <div>
          <ScoreChart 
            iterations={iterations} 
            targetScore={run.targetScore}
            currentScore={run.currentScore}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'timeline' && (
          <RunTimeline run={run} iterations={iterations} events={events} />
        )}
        {activeTab === 'iterations' && (
          <IterationsList iterations={iterations} />
        )}
        {activeTab === 'events' && (
          <RunEventsLog events={events} />
        )}
        {activeTab === 'output' && (
          <div className="forge-card">
            <h3 className="font-semibold mb-4">Final Output</h3>
            {iterations.length > 0 ? (
              <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                {JSON.stringify(iterations[iterations.length - 1]?.output, null, 2) || 'No output yet'}
              </pre>
            ) : (
              <p className="text-muted-foreground">No iterations completed yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
