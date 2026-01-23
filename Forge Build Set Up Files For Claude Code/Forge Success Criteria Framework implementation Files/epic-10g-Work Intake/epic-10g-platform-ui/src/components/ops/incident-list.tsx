/**
 * FORGE Platform UI - Incident List
 * @epic 10f - Operations
 */

'use client';

import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  AlertCircle, 
  XCircle,
  Clock,
  CheckCircle
} from 'lucide-react';
import type { Incident } from '@/lib/types/ops';

interface IncidentListProps {
  incidents: Incident[];
}

export function IncidentList({ incidents }: IncidentListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(incidents.filter(i => i.status !== 'resolved').map(i => i.id))
  );

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const severityConfig = {
    minor: { icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100', border: 'border-yellow-200' },
    major: { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-100', border: 'border-orange-200' },
    critical: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', border: 'border-red-200' },
  };

  const statusConfig = {
    investigating: { label: 'Investigating', color: 'bg-red-100 text-red-700' },
    identified: { label: 'Identified', color: 'bg-orange-100 text-orange-700' },
    monitoring: { label: 'Monitoring', color: 'bg-yellow-100 text-yellow-700' },
    resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (incidents.length === 0) {
    return (
      <div className="forge-card text-center py-8">
        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
        <p className="text-muted-foreground">No incidents to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {incidents.map((incident) => {
        const isExpanded = expandedIds.has(incident.id);
        const config = severityConfig[incident.severity];
        const SeverityIcon = config.icon;

        return (
          <div 
            key={incident.id}
            className={`forge-card p-0 overflow-hidden ${config.border}`}
          >
            {/* Header */}
            <div
              className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors ${
                incident.status !== 'resolved' ? config.bgColor + '/30' : ''
              }`}
              onClick={() => toggleExpand(incident.id)}
            >
              <button className="text-muted-foreground">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>

              <div className={`p-2 rounded-lg ${config.bgColor}`}>
                <SeverityIcon className={`h-5 w-5 ${config.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{incident.title}</span>
                  <span className={`forge-badge ${statusConfig[incident.status].color}`}>
                    {statusConfig[incident.status].label}
                  </span>
                  <span className={`forge-badge ${config.bgColor} ${config.color} capitalize`}>
                    {incident.severity}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Started {formatTime(incident.startedAt)}
                  {incident.resolvedAt && ` • Resolved ${formatTime(incident.resolvedAt)}`}
                </p>
              </div>

              {incident.impactedRuns !== undefined && (
                <div className="text-right">
                  <p className="text-sm font-medium">{incident.impactedRuns}</p>
                  <p className="text-xs text-muted-foreground">impacted runs</p>
                </div>
              )}
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t p-4 space-y-4">
                <p className="text-sm">{incident.description}</p>

                {/* Affected Services */}
                <div>
                  <p className="text-sm font-medium mb-2">Affected Services</p>
                  <div className="flex flex-wrap gap-2">
                    {incident.affectedServices.map((service) => (
                      <span key={service} className="forge-badge bg-muted">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <p className="text-sm font-medium mb-2">Timeline</p>
                  <div className="space-y-2">
                    {incident.updates.map((update, idx) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <div className="w-24 text-muted-foreground shrink-0">
                          {formatTime(update.timestamp)}
                        </div>
                        <div className="flex-1">
                          <span className={`forge-badge ${statusConfig[update.status].color} text-xs mr-2`}>
                            {statusConfig[update.status].label}
                          </span>
                          {update.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                {incident.resolvedAt && (
                  <div className="pt-3 border-t text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Total duration: {Math.round(
                      (new Date(incident.resolvedAt).getTime() - new Date(incident.startedAt).getTime()) / 60000
                    )} minutes
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default IncidentList;
