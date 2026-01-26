/**
 * FORGE Platform UI - Admin Audit Log Page
 * @epic 10e - Auth + Admin
 */

'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Download, AlertTriangle, Clock, User, Activity } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { AuditLogTable } from '@/components/admin/audit-log-table';
import type { AuditLog, AuditFilters } from '@/lib/types/auth';

// Sample data
const sampleLogs: AuditLog[] = [
  {
    id: 'log_001',
    userId: 'usr_001',
    userName: 'Alice Chen',
    userEmail: 'alice@forge.dev',
    action: 'policy.activated',
    resource: 'policies',
    resourceId: 'pol_strict',
    details: { policyName: 'Production Strict Policy', version: '1.5.0' },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    timestamp: '2025-01-19T15:30:00Z',
    riskLevel: 'high',
  },
  {
    id: 'log_002',
    userId: 'usr_002',
    userName: 'Bob Martinez',
    userEmail: 'bob@forge.dev',
    action: 'run.executed',
    resource: 'runs',
    resourceId: 'run_abc123',
    details: { contractId: 'api-validator', environment: 'staging' },
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    timestamp: '2025-01-19T15:25:00Z',
    riskLevel: 'low',
  },
  {
    id: 'log_003',
    userId: 'usr_001',
    userName: 'Alice Chen',
    userEmail: 'alice@forge.dev',
    action: 'user.invited',
    resource: 'users',
    resourceId: 'usr_004',
    details: { invitedEmail: 'dana@forge.dev', roles: ['viewer'] },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    timestamp: '2025-01-19T15:00:00Z',
    riskLevel: 'medium',
  },
  {
    id: 'log_004',
    userId: 'usr_003',
    userName: 'Charlie Kim',
    userEmail: 'charlie@forge.dev',
    action: 'approval.approved',
    resource: 'approvals',
    resourceId: 'apr_001',
    details: { approvalType: 'run', runId: 'run_xyz123' },
    ipAddress: '10.0.0.50',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    timestamp: '2025-01-19T14:45:00Z',
    riskLevel: 'medium',
  },
  {
    id: 'log_005',
    userId: 'usr_001',
    userName: 'Alice Chen',
    userEmail: 'alice@forge.dev',
    action: 'user.suspended',
    resource: 'users',
    resourceId: 'usr_005',
    details: { reason: 'Security violation', previousStatus: 'active' },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    timestamp: '2025-01-19T14:30:00Z',
    riskLevel: 'high',
  },
  {
    id: 'log_006',
    userId: 'usr_002',
    userName: 'Bob Martinez',
    userEmail: 'bob@forge.dev',
    action: 'contract.updated',
    resource: 'contracts',
    resourceId: 'api-validator',
    changes: [
      { field: 'target_score', oldValue: 0.85, newValue: 0.9 },
      { field: 'max_iterations', oldValue: 5, newValue: 10 },
    ],
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    timestamp: '2025-01-19T14:00:00Z',
    riskLevel: 'low',
  },
  {
    id: 'log_007',
    userId: 'usr_001',
    userName: 'Alice Chen',
    userEmail: 'alice@forge.dev',
    action: 'killswitch.activated',
    resource: 'admin',
    details: { scope: 'environment', scopeValue: 'prod', reason: 'Security incident' },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    timestamp: '2025-01-19T13:00:00Z',
    riskLevel: 'high',
  },
  {
    id: 'log_008',
    userId: 'usr_003',
    userName: 'Charlie Kim',
    userEmail: 'charlie@forge.dev',
    action: 'auth.login',
    resource: 'auth',
    details: { provider: 'saml', mfaUsed: true },
    ipAddress: '10.0.0.50',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    timestamp: '2025-01-19T12:00:00Z',
    riskLevel: 'low',
  },
];

export default function AdminAuditPage() {
  const [logs] = useState<AuditLog[]>(sampleLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AuditFilters>({});

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = 
          log.userName.toLowerCase().includes(query) ||
          log.userEmail.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query) ||
          log.resourceId?.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (filters.riskLevel?.length && !filters.riskLevel.includes(log.riskLevel!)) {
        return false;
      }
      if (filters.resource?.length && !filters.resource.includes(log.resource)) {
        return false;
      }
      return true;
    });
  }, [logs, searchQuery, filters]);

  const stats = useMemo(() => ({
    total: logs.length,
    high: logs.filter(l => l.riskLevel === 'high').length,
    medium: logs.filter(l => l.riskLevel === 'medium').length,
    today: logs.filter(l => {
      const logDate = new Date(l.timestamp).toDateString();
      return logDate === new Date().toDateString();
    }).length,
  }), [logs]);

  const handleExport = () => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 mt-14">
      <Breadcrumbs items={[{ label: 'Admin' }, { label: 'Audit Log' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">
            Track all system activities and user actions
          </p>
        </div>

        <button
          onClick={handleExport}
          className="forge-button h-9 px-4 hover:bg-muted"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Events</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">High Risk</p>
              <p className="text-2xl font-bold text-red-600">{stats.high}</p>
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Medium Risk</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.medium}</p>
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="text-2xl font-bold">{stats.today}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by user, action, resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="forge-input pl-10"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`forge-button h-10 px-3 ${showFilters ? 'bg-muted' : 'hover:bg-muted'}`}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="forge-card">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-2">Risk Level</label>
              <div className="flex flex-wrap gap-2">
                {['low', 'medium', 'high'].map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      const current = filters.riskLevel || [];
                      const updated = current.includes(level as any)
                        ? current.filter(l => l !== level)
                        : [...current, level as any];
                      setFilters({ ...filters, riskLevel: updated.length ? updated : undefined });
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md border capitalize ${
                      filters.riskLevel?.includes(level as any)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Resource</label>
              <div className="flex flex-wrap gap-2">
                {['users', 'policies', 'runs', 'contracts', 'approvals', 'auth'].map((resource) => (
                  <button
                    key={resource}
                    onClick={() => {
                      const current = filters.resource || [];
                      const updated = current.includes(resource)
                        ? current.filter(r => r !== resource)
                        : [...current, resource];
                      setFilters({ ...filters, resource: updated.length ? updated : undefined });
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md border capitalize ${
                      filters.resource?.includes(resource)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {resource}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Date Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                  className="forge-input"
                />
                <span className="text-muted-foreground">to</span>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                  className="forge-input"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <AuditLogTable logs={filteredLogs} />
    </div>
  );
}
