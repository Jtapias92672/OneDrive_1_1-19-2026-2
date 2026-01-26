/**
 * FORGE Platform UI - Service Status Card
 * @epic 10f - Operations
 */

'use client';

import { CheckCircle, AlertTriangle, XCircle, Clock, ExternalLink } from 'lucide-react';
import type { ServiceHealth, HealthStatus } from '@/lib/types/ops';

interface ServiceStatusCardProps {
  service: ServiceHealth;
}

export function ServiceStatusCard({ service }: ServiceStatusCardProps) {
  const statusConfig: Record<HealthStatus, { icon: typeof CheckCircle; color: string; bgColor: string }> = {
    healthy: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    degraded: { icon: AlertTriangle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    down: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
    unknown: { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  };

  const config = statusConfig[service.status];
  const StatusIcon = config.icon;

  const formatLatency = (ms?: number) => {
    if (ms === undefined) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatUptime = (percent: number) => {
    return `${percent.toFixed(2)}%`;
  };

  return (
    <div className={`forge-card ${
      service.status === 'degraded' ? 'border-yellow-200' :
      service.status === 'down' ? 'border-red-200' : ''
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <StatusIcon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <h3 className="font-semibold">{service.name}</h3>
            <p className="text-sm text-muted-foreground">{service.description}</p>
          </div>
        </div>
      </div>

      {/* Status message */}
      {service.statusMessage && (
        <p className={`text-sm mb-3 ${
          service.status === 'degraded' ? 'text-yellow-700' :
          service.status === 'down' ? 'text-red-700' : 'text-muted-foreground'
        }`}>
          {service.statusMessage}
        </p>
      )}

      {/* Latency */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="p-2 bg-muted/50 rounded">
          <p className="text-xs text-muted-foreground">P50</p>
          <p className="font-medium">{formatLatency(service.latencyP50)}</p>
        </div>
        <div className="p-2 bg-muted/50 rounded">
          <p className="text-xs text-muted-foreground">P95</p>
          <p className="font-medium">{formatLatency(service.latencyP95)}</p>
        </div>
        <div className="p-2 bg-muted/50 rounded">
          <p className="text-xs text-muted-foreground">P99</p>
          <p className="font-medium">{formatLatency(service.latencyP99)}</p>
        </div>
      </div>

      {/* Uptime */}
      <div className="flex items-center justify-between text-sm pt-3 border-t">
        <span className="text-muted-foreground">Uptime</span>
        <div className="flex items-center gap-3">
          <span title="24 hours">{formatUptime(service.uptime24h)}</span>
          <span className="text-muted-foreground">|</span>
          <span title="7 days">{formatUptime(service.uptime7d)}</span>
          <span className="text-muted-foreground">|</span>
          <span title="30 days">{formatUptime(service.uptime30d)}</span>
        </div>
      </div>

      {/* Last incident */}
      {service.lastIncident && (
        <div className={`mt-3 pt-3 border-t text-sm ${
          service.lastIncident.severity === 'critical' ? 'text-red-700' :
          service.lastIncident.severity === 'major' ? 'text-orange-700' :
          'text-yellow-700'
        }`}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {service.lastIncident.title}
            </span>
            <button className="text-primary hover:underline flex items-center gap-1">
              View
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServiceStatusCard;
