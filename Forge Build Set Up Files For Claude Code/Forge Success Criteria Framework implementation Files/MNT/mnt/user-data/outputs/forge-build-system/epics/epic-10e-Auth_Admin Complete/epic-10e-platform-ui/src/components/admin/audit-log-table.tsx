/**
 * FORGE Platform UI - Audit Log Table
 * @epic 10e - Auth + Admin
 */

'use client';

import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  User, 
  Globe, 
  Monitor,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import type { AuditLog } from '@/lib/types/auth';

interface AuditLogTableProps {
  logs: AuditLog[];
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const riskBadge = (level?: 'low' | 'medium' | 'high') => {
    if (!level) return null;
    const config = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700',
    };
    return <span className={`forge-badge ${config[level]}`}>{level}</span>;
  };

  const formatAction = (action: string) => {
    return action
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' → ');
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const getActionIcon = (action: string) => {
    if (action.includes('login') || action.includes('logout')) return '🔐';
    if (action.includes('created') || action.includes('invited')) return '➕';
    if (action.includes('updated')) return '✏️';
    if (action.includes('deleted') || action.includes('suspended')) return '🗑️';
    if (action.includes('approved')) return '✅';
    if (action.includes('rejected')) return '❌';
    if (action.includes('activated')) return '⚡';
    if (action.includes('executed')) return '▶️';
    return '📋';
  };

  if (logs.length === 0) {
    return (
      <div className="forge-card text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No audit logs found</p>
      </div>
    );
  }

  return (
    <div className="forge-card p-0 overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 text-sm">
          <tr>
            <th className="w-8 p-4"></th>
            <th className="text-left p-4 font-medium">Timestamp</th>
            <th className="text-left p-4 font-medium">User</th>
            <th className="text-left p-4 font-medium">Action</th>
            <th className="text-left p-4 font-medium">Resource</th>
            <th className="text-left p-4 font-medium">Risk</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {logs.map((log) => {
            const isExpanded = expandedIds.has(log.id);
            return (
              <>
                <tr 
                  key={log.id}
                  className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                    log.riskLevel === 'high' ? 'bg-red-50/50' : ''
                  }`}
                  onClick={() => toggleExpand(log.id)}
                >
                  <td className="p-4">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </td>
                  <td className="p-4 text-sm font-mono">
                    {formatTime(log.timestamp)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {log.userName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{log.userName}</p>
                        <p className="text-xs text-muted-foreground">{log.userEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span>{getActionIcon(log.action)}</span>
                      <span className="text-sm">{formatAction(log.action)}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      <span className="capitalize">{log.resource}</span>
                      {log.resourceId && (
                        <span className="text-muted-foreground ml-1">
                          ({log.resourceId})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">{riskBadge(log.riskLevel)}</td>
                </tr>
                {isExpanded && (
                  <tr key={`${log.id}-details`} className="bg-muted/20">
                    <td colSpan={6} className="p-4">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Context */}
                        <div className="p-3 bg-white rounded-lg border">
                          <p className="text-xs text-muted-foreground mb-2">Context</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <span>{log.ipAddress}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Monitor className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <span className="text-xs break-all">{log.userAgent}</span>
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        {log.details && (
                          <div className="p-3 bg-white rounded-lg border">
                            <p className="text-xs text-muted-foreground mb-2">Details</p>
                            <pre className="text-xs font-mono overflow-auto max-h-32">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Changes */}
                        {log.changes && log.changes.length > 0 && (
                          <div className="p-3 bg-white rounded-lg border">
                            <p className="text-xs text-muted-foreground mb-2">Changes</p>
                            <div className="space-y-2">
                              {log.changes.map((change, idx) => (
                                <div key={idx} className="text-sm">
                                  <span className="font-medium">{change.field}:</span>
                                  <div className="flex items-center gap-2 text-xs mt-1">
                                    <code className="px-1 py-0.5 bg-red-100 rounded">
                                      {JSON.stringify(change.oldValue)}
                                    </code>
                                    <ArrowRight className="h-3 w-3" />
                                    <code className="px-1 py-0.5 bg-green-100 rounded">
                                      {JSON.stringify(change.newValue)}
                                    </code>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default AuditLogTable;
