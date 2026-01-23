/**
 * FORGE Platform UI - System Health Page
 * @epic 10f - Operations
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Zap,
  Server,
  RefreshCw
} from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ServiceStatusCard } from '@/components/ops/service-status-card';
import { MetricsPanel } from '@/components/ops/metrics-panel';
import { IncidentList } from '@/components/ops/incident-list';
import type { ServiceHealth, SystemMetrics, Incident, HealthStatus } from '@/lib/types/ops';

// Sample data
const sampleServices: ServiceHealth[] = [
  {
    id: 'svc_api',
    name: 'FORGE API',
    description: 'Core API gateway',
    status: 'healthy',
    latencyP50: 45,
    latencyP95: 120,
    latencyP99: 250,
    uptime24h: 100,
    uptime7d: 99.98,
    uptime30d: 99.95,
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'svc_convergence',
    name: 'Convergence Engine',
    description: 'AI execution engine',
    status: 'healthy',
    latencyP50: 2500,
    latencyP95: 8000,
    latencyP99: 15000,
    uptime24h: 100,
    uptime7d: 99.95,
    uptime30d: 99.90,
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'svc_mcp',
    name: 'MCP Gateway',
    description: 'Tool execution gateway',
    status: 'healthy',
    latencyP50: 150,
    latencyP95: 450,
    latencyP99: 800,
    uptime24h: 100,
    uptime7d: 99.99,
    uptime30d: 99.97,
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'svc_evidence',
    name: 'Evidence Service',
    description: 'Audit trail and storage',
    status: 'degraded',
    statusMessage: 'Elevated latency due to high write volume',
    latencyP50: 200,
    latencyP95: 800,
    latencyP99: 2000,
    uptime24h: 99.5,
    uptime7d: 99.80,
    uptime30d: 99.85,
    lastIncident: {
      id: 'inc_001',
      title: 'Elevated write latency',
      severity: 'minor',
      startedAt: '2025-01-19T14:00:00Z',
    },
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'svc_governance',
    name: 'Governance Service',
    description: 'Policy enforcement',
    status: 'healthy',
    latencyP50: 25,
    latencyP95: 80,
    latencyP99: 150,
    uptime24h: 100,
    uptime7d: 100,
    uptime30d: 99.99,
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'svc_auth',
    name: 'Auth Service',
    description: 'Authentication & authorization',
    status: 'healthy',
    latencyP50: 35,
    latencyP95: 100,
    latencyP99: 200,
    uptime24h: 100,
    uptime7d: 100,
    uptime30d: 99.99,
    lastCheckedAt: new Date().toISOString(),
  },
];

const sampleMetrics: SystemMetrics = {
  timestamp: new Date().toISOString(),
  activeRuns: 23,
  queuedRuns: 5,
  completedRunsToday: 342,
  failedRunsToday: 12,
  avgRunDuration: 45.2,
  avgIterations: 3.8,
  avgScore: 0.92,
  runsPerHour: 45,
  tokensPerHour: 2_500_000,
  cpuUsage: 42,
  memoryUsage: 68,
  queueDepth: 5,
};

const sampleIncidents: Incident[] = [
  {
    id: 'inc_001',
    title: 'Elevated write latency in Evidence Service',
    description: 'Evidence writes are taking longer than expected due to high volume',
    severity: 'minor',
    affectedServices: ['svc_evidence'],
    startedAt: '2025-01-19T14:00:00Z',
    detectedAt: '2025-01-19T14:05:00Z',
    acknowledgedAt: '2025-01-19T14:10:00Z',
    status: 'monitoring',
    updates: [
      { timestamp: '2025-01-19T14:05:00Z', message: 'Elevated latency detected', status: 'investigating' },
      { timestamp: '2025-01-19T14:10:00Z', message: 'Identified high write volume as cause', status: 'identified' },
      { timestamp: '2025-01-19T14:30:00Z', message: 'Scaling write workers, monitoring', status: 'monitoring' },
    ],
    impactedRuns: 15,
  },
];

export default function HealthPage() {
  const [services] = useState<ServiceHealth[]>(sampleServices);
  const [metrics, setMetrics] = useState<SystemMetrics>(sampleMetrics);
  const [incidents] = useState<Incident[]>(sampleIncidents);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  // Auto-refresh metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        timestamp: new Date().toISOString(),
        activeRuns: prev.activeRuns + Math.floor(Math.random() * 3) - 1,
        queuedRuns: Math.max(0, prev.queuedRuns + Math.floor(Math.random() * 3) - 1),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const overallStatus = services.some(s => s.status === 'down') 
    ? 'down' 
    : services.some(s => s.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  const statusConfig: Record<HealthStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
    healthy: { icon: CheckCircle, color: 'text-green-600', label: 'All Systems Operational' },
    degraded: { icon: AlertTriangle, color: 'text-yellow-600', label: 'Partial System Degradation' },
    down: { icon: XCircle, color: 'text-red-600', label: 'System Outage' },
    unknown: { icon: Clock, color: 'text-gray-600', label: 'Status Unknown' },
  };

  const StatusIcon = statusConfig[overallStatus].icon;

  return (
    <div className="space-y-6 mt-14">
      <Breadcrumbs items={[{ label: 'Operations' }, { label: 'System Health' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-muted-foreground">
            Monitor service status, metrics, and incidents
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="forge-button h-9 px-3 hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className={`forge-card py-6 ${
        overallStatus === 'healthy' ? 'bg-green-50 border-green-200' :
        overallStatus === 'degraded' ? 'bg-yellow-50 border-yellow-200' :
        'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center justify-center gap-3">
          <StatusIcon className={`h-8 w-8 ${statusConfig[overallStatus].color}`} />
          <span className={`text-xl font-semibold ${statusConfig[overallStatus].color}`}>
            {statusConfig[overallStatus].label}
          </span>
        </div>
        {incidents.filter(i => i.status !== 'resolved').length > 0 && (
          <p className="text-center mt-2 text-sm text-muted-foreground">
            {incidents.filter(i => i.status !== 'resolved').length} active incident(s)
          </p>
        )}
      </div>

      {/* Metrics Summary */}
      <MetricsPanel metrics={metrics} />

      {/* Active Incidents */}
      {incidents.filter(i => i.status !== 'resolved').length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Active Incidents
          </h2>
          <IncidentList incidents={incidents.filter(i => i.status !== 'resolved')} />
        </div>
      )}

      {/* Services */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Server className="h-5 w-5" />
          Services
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceStatusCard key={service.id} service={service} />
          ))}
        </div>
      </div>

      {/* Recent Incidents */}
      {incidents.filter(i => i.status === 'resolved').length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Resolved Incidents</h2>
          <IncidentList incidents={incidents.filter(i => i.status === 'resolved')} />
        </div>
      )}
    </div>
  );
}
