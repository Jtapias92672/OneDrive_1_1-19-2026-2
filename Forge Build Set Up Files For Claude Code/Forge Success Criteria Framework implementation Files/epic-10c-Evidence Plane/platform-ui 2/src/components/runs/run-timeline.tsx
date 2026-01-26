/**
 * FORGE Platform UI - Run Timeline
 * @epic 10b - Execution Monitor
 */

'use client';

import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Pause, 
  Square,
  Zap,
  Target,
  AlertTriangle,
  Tool,
  Clock
} from 'lucide-react';
import type { Run, Iteration, RunEvent } from '@/lib/types/runs';

interface RunTimelineProps {
  run: Run;
  iterations: Iteration[];
  events: RunEvent[];
}

export function RunTimeline({ run, iterations, events }: RunTimelineProps) {
  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const getEventIcon = (type: RunEvent['type']) => {
    switch (type) {
      case 'run_started': return <Play className="h-4 w-4 text-blue-500" />;
      case 'run_completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'run_failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'run_paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'run_resumed': return <Play className="h-4 w-4 text-green-500" />;
      case 'run_killed': return <Square className="h-4 w-4 text-gray-500" />;
      case 'iteration_started': return <Zap className="h-4 w-4 text-blue-400" />;
      case 'iteration_completed': return <Target className="h-4 w-4 text-green-400" />;
      case 'tool_call_started': return <Tool className="h-4 w-4 text-purple-400" />;
      case 'tool_call_completed': return <Tool className="h-4 w-4 text-purple-500" />;
      case 'score_updated': return <Target className="h-4 w-4 text-blue-500" />;
      case 'policy_violation': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getEventDescription = (event: RunEvent) => {
    switch (event.type) {
      case 'run_started':
        return `Run started with contract ${run.contractName}`;
      case 'run_completed':
        return `Run completed with score ${(event.data.score * 100).toFixed(1)}%`;
      case 'run_failed':
        return `Run failed: ${event.data.error || 'Unknown error'}`;
      case 'run_paused':
        return 'Run paused by user';
      case 'run_resumed':
        return 'Run resumed';
      case 'run_killed':
        return 'Run killed by user';
      case 'iteration_started':
        return `Iteration ${event.data.number} started`;
      case 'iteration_completed':
        return `Iteration ${event.data.number} completed with score ${(event.data.score * 100).toFixed(1)}%`;
      case 'tool_call_started':
        return `Tool call: ${event.data.name}`;
      case 'tool_call_completed':
        return `Tool ${event.data.name} ${event.data.status === 'success' ? 'succeeded' : 'failed'}`;
      case 'score_updated':
        return `Score updated to ${(event.data.score * 100).toFixed(1)}%`;
      case 'checkpoint_created':
        return `Checkpoint created at iteration ${event.data.iteration}`;
      case 'policy_violation':
        return `Policy violation: ${event.data.rule}`;
      default:
        return event.type.replace(/_/g, ' ');
    }
  };

  // Show iterations as main timeline with events nested
  return (
    <div className="forge-card">
      <h3 className="font-semibold mb-4">Execution Timeline</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        {/* Iterations */}
        <div className="space-y-6">
          {iterations.length === 0 ? (
            <div className="pl-10 text-muted-foreground">
              No iterations yet
            </div>
          ) : (
            iterations.map((iteration, index) => (
              <div key={iteration.id} className="relative">
                {/* Iteration marker */}
                <div className="absolute left-0 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10">
                  <span className="text-xs font-bold">{iteration.number}</span>
                </div>

                {/* Iteration content */}
                <div className="pl-12">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Iteration {iteration.number}</span>
                      <span className={`forge-badge ${
                        iteration.status === 'completed' ? 'forge-badge-success' :
                        iteration.status === 'failed' ? 'forge-badge-error' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {iteration.status}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(iteration.startedAt)}
                    </span>
                  </div>

                  {/* Score breakdown */}
                  <div className="mb-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className={`font-semibold ${
                          iteration.score >= run.targetScore ? 'text-green-600' : ''
                        }`}>
                          {(iteration.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {iteration.tokensUsed.toLocaleString()} tokens
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {iteration.latencyMs}ms
                      </span>
                    </div>
                  </div>

                  {/* Validator scores */}
                  {iteration.scoreBreakdown.length > 0 && (
                    <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Validator Scores</p>
                      <div className="grid grid-cols-2 gap-2">
                        {iteration.scoreBreakdown.map((validator) => (
                          <div key={validator.validatorId} className="flex items-center justify-between text-sm">
                            <span>{validator.validatorId}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${validator.score * 100}%` }}
                                />
                              </div>
                              <span className="text-xs">
                                {(validator.score * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tool calls */}
                  {iteration.toolCalls.length > 0 && (
                    <div className="space-y-1">
                      {iteration.toolCalls.map((tool) => (
                        <div 
                          key={tool.id}
                          className={`flex items-center gap-2 text-sm p-2 rounded ${
                            tool.status === 'error' ? 'bg-red-50' : 'bg-muted/30'
                          }`}
                        >
                          <Tool className={`h-3 w-3 ${
                            tool.status === 'success' ? 'text-green-500' :
                            tool.status === 'error' ? 'text-red-500' :
                            'text-muted-foreground'
                          }`} />
                          <span className="font-mono text-xs">{tool.name}</span>
                          {tool.durationMs && (
                            <span className="text-xs text-muted-foreground">
                              {tool.durationMs}ms
                            </span>
                          )}
                          {!tool.policyAllowed && (
                            <span className="forge-badge forge-badge-warning text-xs">
                              Policy blocked
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Feedback */}
                  {iteration.feedback && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                      <p className="text-yellow-700">{iteration.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Run status marker */}
          {(run.status === 'completed' || run.status === 'failed' || run.status === 'killed') && (
            <div className="relative">
              <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                run.status === 'completed' ? 'bg-green-100' :
                run.status === 'failed' ? 'bg-red-100' :
                'bg-gray-100'
              }`}>
                {run.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : run.status === 'failed' ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <Square className="h-5 w-5 text-gray-600" />
                )}
              </div>
              <div className="pl-12">
                <span className="font-medium capitalize">{run.status}</span>
                {run.completedAt && (
                  <span className="text-sm text-muted-foreground ml-2">
                    at {formatTime(run.completedAt)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RunTimeline;
