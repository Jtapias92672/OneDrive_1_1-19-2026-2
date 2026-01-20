/**
 * FORGE Platform UI - Tool Invocations List
 * @epic 10c - Evidence Plane
 */

'use client';

import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Hash, 
  Clock, 
  Shield,
  ShieldAlert,
  EyeOff,
  Copy,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { ToolInvocation } from '@/lib/types/evidence';

interface ToolInvocationsListProps {
  invocations: ToolInvocation[];
}

export function ToolInvocationsList({ invocations }: ToolInvocationsListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

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

  const copyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  if (invocations.length === 0) {
    return (
      <div className="forge-card text-center py-8">
        <p className="text-muted-foreground">No tool invocations recorded</p>
      </div>
    );
  }

  return (
    <div className="forge-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Tool Invocations</h3>
        <span className="text-sm text-muted-foreground">
          {invocations.length} invocation{invocations.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {invocations.map((invocation) => {
          const isExpanded = expandedIds.has(invocation.id);
          const hasError = !!invocation.error;
          
          return (
            <div 
              key={invocation.id} 
              className={`border rounded-lg overflow-hidden ${
                hasError ? 'border-red-200' : ''
              }`}
            >
              {/* Header */}
              <button
                onClick={() => toggleExpand(invocation.id)}
                className={`w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left ${
                  hasError ? 'bg-red-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  
                  {hasError ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{invocation.toolName}</span>
                      {invocation.toolVersion && (
                        <span className="text-xs text-muted-foreground">
                          v{invocation.toolVersion}
                        </span>
                      )}
                      {!invocation.policyAllowed && (
                        <span className="forge-badge forge-badge-error flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          Blocked
                        </span>
                      )}
                      {(invocation.inputRedacted || invocation.outputRedacted) && (
                        <span className="forge-badge forge-badge-warning flex items-center gap-1">
                          <EyeOff className="h-3 w-3" />
                          Redacted
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Iteration {invocation.iterationNumber} • Sequence {invocation.sequence}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {invocation.durationMs && (
                    <span>{invocation.durationMs}ms</span>
                  )}
                  <span className="font-mono text-xs">
                    {formatTime(invocation.startedAt)}
                  </span>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t p-4 bg-muted/20 space-y-4">
                  {/* Input/Output */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Input */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Input</span>
                        {invocation.inputRedacted && (
                          <span className="forge-badge forge-badge-warning text-xs">
                            Redacted
                          </span>
                        )}
                      </div>
                      <pre className="p-3 bg-background rounded-lg border text-xs overflow-auto max-h-40 font-mono">
                        {JSON.stringify(invocation.input, null, 2)}
                      </pre>
                      <div className="flex items-center gap-2 mt-2">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        <code className="text-xs text-muted-foreground font-mono">
                          {invocation.inputHash.slice(0, 20)}...
                        </code>
                        <button 
                          onClick={() => copyHash(invocation.inputHash)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copiedHash === invocation.inputHash ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Output */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {invocation.error ? 'Error' : 'Output'}
                        </span>
                        {invocation.outputRedacted && (
                          <span className="forge-badge forge-badge-warning text-xs">
                            Redacted
                          </span>
                        )}
                      </div>
                      <pre className={`p-3 rounded-lg border text-xs overflow-auto max-h-40 font-mono ${
                        invocation.error 
                          ? 'bg-red-50 border-red-200 text-red-700' 
                          : 'bg-background'
                      }`}>
                        {invocation.error || JSON.stringify(invocation.output, null, 2)}
                      </pre>
                      {invocation.outputHash && (
                        <div className="flex items-center gap-2 mt-2">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          <code className="text-xs text-muted-foreground font-mono">
                            {invocation.outputHash.slice(0, 20)}...
                          </code>
                          <button 
                            onClick={() => copyHash(invocation.outputHash!)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {copiedHash === invocation.outputHash ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Policy Info */}
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      {invocation.policyAllowed ? (
                        <Shield className="h-4 w-4 text-green-500" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        Policy: {invocation.policyAllowed ? 'Allowed' : 'Blocked'}
                      </span>
                    </div>
                    {invocation.policyRule && (
                      <p className="text-sm text-muted-foreground">
                        Rule: {invocation.policyRule}
                      </p>
                    )}
                  </div>

                  {/* Redaction Reason */}
                  {invocation.redactionReason && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2">
                        <EyeOff className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-700">
                          {invocation.redactionReason}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Timing */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Started: {formatTime(invocation.startedAt)}</span>
                    </div>
                    {invocation.completedAt && (
                      <span>Completed: {formatTime(invocation.completedAt)}</span>
                    )}
                    {invocation.durationMs && (
                      <span>Duration: {invocation.durationMs}ms</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ToolInvocationsList;
