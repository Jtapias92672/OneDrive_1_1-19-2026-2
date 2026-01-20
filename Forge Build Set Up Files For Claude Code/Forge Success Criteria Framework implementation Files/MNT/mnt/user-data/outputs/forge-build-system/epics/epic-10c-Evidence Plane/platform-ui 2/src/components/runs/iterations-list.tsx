/**
 * FORGE Platform UI - Iterations List
 * @epic 10b - Execution Monitor
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Target, Clock, Zap, Tool } from 'lucide-react';
import type { Iteration } from '@/lib/types/runs';

interface IterationsListProps {
  iterations: Iteration[];
}

export function IterationsList({ iterations }: IterationsListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (iterations.length === 0) {
    return (
      <div className="forge-card text-center py-8">
        <p className="text-muted-foreground">No iterations yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {iterations.map((iteration) => {
        const isExpanded = expandedIds.has(iteration.id);
        
        return (
          <div key={iteration.id} className="forge-card p-0 overflow-hidden">
            {/* Header */}
            <button
              onClick={() => toggleExpand(iteration.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                
                <span className="font-medium">Iteration {iteration.number}</span>
                
                <span className={`forge-badge ${
                  iteration.status === 'completed' ? 'forge-badge-success' :
                  iteration.status === 'failed' ? 'forge-badge-error' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {iteration.status}
                </span>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {(iteration.score * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  {iteration.tokensUsed.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {iteration.latencyMs}ms
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Tool className="h-4 w-4" />
                  {iteration.toolCalls.length}
                </div>
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t p-4 bg-muted/20">
                {/* Score Breakdown */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2">Score Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {iteration.scoreBreakdown.map((validator) => (
                      <div 
                        key={validator.validatorId}
                        className="p-3 bg-background rounded-lg border"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{validator.validatorId}</span>
                          <span className="text-sm text-muted-foreground">
                            {(validator.weight * 100).toFixed(0)}% weight
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                validator.score >= 0.9 ? 'bg-green-500' :
                                validator.score >= 0.7 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${validator.score * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {(validator.score * 100).toFixed(1)}%
                          </span>
                        </div>
                        {validator.feedback && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {validator.feedback}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tool Calls */}
                {iteration.toolCalls.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">
                      Tool Calls ({iteration.toolCalls.length})
                    </h4>
                    <div className="space-y-2">
                      {iteration.toolCalls.map((tool) => (
                        <div 
                          key={tool.id}
                          className={`p-3 rounded-lg border ${
                            tool.status === 'error' ? 'bg-red-50 border-red-200' :
                            tool.status === 'success' ? 'bg-green-50 border-green-200' :
                            'bg-background'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{tool.name}</span>
                              <span className={`forge-badge ${
                                tool.status === 'success' ? 'forge-badge-success' :
                                tool.status === 'error' ? 'forge-badge-error' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {tool.status}
                              </span>
                              {!tool.policyAllowed && (
                                <span className="forge-badge forge-badge-warning">
                                  Blocked
                                </span>
                              )}
                            </div>
                            {tool.durationMs && (
                              <span className="text-xs text-muted-foreground">
                                {tool.durationMs}ms
                              </span>
                            )}
                          </div>
                          {tool.error && (
                            <p className="text-sm text-red-600 mt-2">{tool.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {iteration.feedback && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Feedback</h4>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">{iteration.feedback}</p>
                    </div>
                  </div>
                )}

                {/* Input/Output Toggle */}
                <div className="grid md:grid-cols-2 gap-4">
                  {iteration.input && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Input</h4>
                      <pre className="p-3 bg-muted rounded-lg text-xs overflow-auto max-h-40">
                        {JSON.stringify(iteration.input, null, 2)}
                      </pre>
                    </div>
                  )}
                  {iteration.output && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Output</h4>
                      <pre className="p-3 bg-muted rounded-lg text-xs overflow-auto max-h-40">
                        {JSON.stringify(iteration.output, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default IterationsList;
