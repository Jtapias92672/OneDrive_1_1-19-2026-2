/**
 * FORGE Platform UI - Work Table
 * @epic 10g - Work Intake
 */

'use client';

import Link from 'next/link';
import { 
  ExternalLink, 
  Play, 
  MoreVertical,
  Clock,
  User,
  GitBranch
} from 'lucide-react';
import { WorkStatusBadge } from './work-status-badge';
import type { WorkItem, WorkPriority, TicketSource } from '@/lib/types/work';

interface WorkTableProps {
  items: WorkItem[];
}

const ticketSources: Record<TicketSource, { name: string; color: string }> = {
  jira: { name: 'Jira', color: 'bg-blue-100 text-blue-700' },
  linear: { name: 'Linear', color: 'bg-purple-100 text-purple-700' },
  github: { name: 'GitHub', color: 'bg-gray-100 text-gray-700' },
  asana: { name: 'Asana', color: 'bg-orange-100 text-orange-700' },
  manual: { name: 'Manual', color: 'bg-green-100 text-green-700' },
};

const priorityColors: Record<WorkPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export function WorkTable({ items }: WorkTableProps) {
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="forge-card p-0 overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 text-sm">
          <tr>
            <th className="text-left p-4 font-medium">Work Item</th>
            <th className="text-left p-4 font-medium">Status</th>
            <th className="text-left p-4 font-medium">Priority</th>
            <th className="text-left p-4 font-medium">Ticket</th>
            <th className="text-left p-4 font-medium">Assignee</th>
            <th className="text-left p-4 font-medium">Runs</th>
            <th className="text-left p-4 font-medium">Updated</th>
            <th className="text-right p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
              {/* Work Item */}
              <td className="p-4">
                <Link href={`/work/${item.id}`} className="block">
                  <p className="font-medium hover:underline line-clamp-1">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{item.id}</span>
                    {item.repo && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {item.repo}
                      </span>
                    )}
                  </div>
                  {item.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.labels.slice(0, 3).map((label) => (
                        <span key={label} className="forge-badge bg-muted text-xs">
                          {label}
                        </span>
                      ))}
                      {item.labels.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{item.labels.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </td>

              {/* Status */}
              <td className="p-4">
                <WorkStatusBadge status={item.status} size="sm" />
              </td>

              {/* Priority */}
              <td className="p-4">
                <span className={`forge-badge ${priorityColors[item.priority]} capitalize`}>
                  {item.priority}
                </span>
              </td>

              {/* Ticket */}
              <td className="p-4">
                {item.ticketSource && item.ticketKey ? (
                  <a
                    href={item.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className={`forge-badge ${ticketSources[item.ticketSource].color} text-xs`}>
                      {ticketSources[item.ticketSource].name}
                    </span>
                    <span className="text-primary">{item.ticketKey}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </td>

              {/* Assignee */}
              <td className="p-4">
                {item.assigneeName ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {item.assigneeName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-sm">{item.assigneeName}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </td>

              {/* Runs */}
              <td className="p-4">
                <div className="text-sm">
                  <span className="font-medium">{item.runCount}</span>
                  {item.lastRunScore !== undefined && (
                    <span className="text-muted-foreground ml-2">
                      ({(item.lastRunScore * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>
              </td>

              {/* Updated */}
              <td className="p-4 text-sm text-muted-foreground">
                {formatDate(item.updatedAt)}
              </td>

              {/* Actions */}
              <td className="p-4">
                <div className="flex items-center justify-end gap-1">
                  {item.status !== 'running' && item.status !== 'completed' && (
                    <button 
                      className="forge-button h-8 w-8 hover:bg-muted"
                      title="Start Run"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  <button className="forge-button h-8 w-8 hover:bg-muted" title="More">
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

export default WorkTable;
