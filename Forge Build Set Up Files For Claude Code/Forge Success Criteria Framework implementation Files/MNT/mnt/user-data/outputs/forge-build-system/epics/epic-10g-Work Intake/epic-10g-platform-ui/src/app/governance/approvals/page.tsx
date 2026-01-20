/**
 * FORGE Platform UI - Approvals Page
 * @epic 10d - Governance Console
 */

'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ApprovalQueue } from '@/components/governance/approval-queue';
import type { ApprovalRequest, ApprovalFilters } from '@/lib/types/governance';

// Sample data
const sampleApprovals: ApprovalRequest[] = [
  {
    id: 'apr_001',
    type: 'run',
    status: 'pending',
    requestedBy: 'alice@forge.dev',
    requestedAt: '2025-01-19T14:00:00Z',
    runId: 'run_xyz123',
    riskTier: 'high',
    riskFactors: ['Production environment', 'Cost exceeds $10', 'External API access'],
    requiredApprovers: ['security-team@forge.dev', 'platform-lead@forge.dev'],
    minApprovals: 2,
    approvals: [
      {
        id: 'apv_001',
        requestId: 'apr_001',
        approver: 'security-team@forge.dev',
        decision: 'approved',
        comment: 'Looks good, verified the scope',
        decidedAt: '2025-01-19T14:15:00Z',
      },
    ],
    expiresAt: '2025-01-19T20:00:00Z',
    title: 'Production API Integration Run',
    description: 'Automated API integration for payment processing module',
  },
  {
    id: 'apr_002',
    type: 'policy_change',
    status: 'pending',
    requestedBy: 'bob@forge.dev',
    requestedAt: '2025-01-19T13:30:00Z',
    policyId: 'pol_strict',
    riskTier: 'critical',
    riskFactors: ['Affects production policy', 'Reduces security controls'],
    requiredApprovers: ['security-team@forge.dev', 'cto@forge.dev'],
    minApprovals: 2,
    approvals: [],
    expiresAt: '2025-01-20T13:30:00Z',
    title: 'Update Production Strict Policy',
    description: 'Add exception for new monitoring tool',
    diff: { field: 'rules', added: 1, removed: 0 },
  },
  {
    id: 'apr_003',
    type: 'exception',
    status: 'approved',
    requestedBy: 'charlie@forge.dev',
    requestedAt: '2025-01-19T10:00:00Z',
    policyId: 'pol_standard',
    riskTier: 'medium',
    riskFactors: ['Temporary exception', 'Limited scope'],
    requiredApprovers: ['platform-team@forge.dev'],
    minApprovals: 1,
    approvals: [
      {
        id: 'apv_002',
        requestId: 'apr_003',
        approver: 'platform-team@forge.dev',
        decision: 'approved',
        comment: 'Approved for 24 hours',
        decidedAt: '2025-01-19T10:30:00Z',
      },
    ],
    expiresAt: '2025-01-20T10:00:00Z',
    resolvedAt: '2025-01-19T10:30:00Z',
    title: 'Shell Access Exception',
    description: 'Need shell access for database migration script',
  },
  {
    id: 'apr_004',
    type: 'run',
    status: 'rejected',
    requestedBy: 'dave@forge.dev',
    requestedAt: '2025-01-18T16:00:00Z',
    runId: 'run_abc456',
    riskTier: 'critical',
    riskFactors: ['Production environment', 'Unrestricted network access', 'No test coverage'],
    requiredApprovers: ['security-team@forge.dev'],
    minApprovals: 1,
    approvals: [
      {
        id: 'apv_003',
        requestId: 'apr_004',
        approver: 'security-team@forge.dev',
        decision: 'rejected',
        comment: 'Missing test coverage, please add tests first',
        decidedAt: '2025-01-18T16:30:00Z',
      },
    ],
    expiresAt: '2025-01-18T22:00:00Z',
    resolvedAt: '2025-01-18T16:30:00Z',
    title: 'Direct Production Deployment',
    description: 'Deploy new feature directly to production',
  },
];

export default function ApprovalsPage() {
  const [approvals] = useState<ApprovalRequest[]>(sampleApprovals);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ApprovalFilters>({});
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved' | 'all'>('pending');

  const filteredApprovals = useMemo(() => {
    return approvals.filter((approval) => {
      // Tab filter
      if (activeTab === 'pending' && approval.status !== 'pending') return false;
      if (activeTab === 'resolved' && approval.status === 'pending') return false;

      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = 
          approval.title.toLowerCase().includes(query) ||
          approval.description.toLowerCase().includes(query) ||
          approval.requestedBy.toLowerCase().includes(query);
        if (!matches) return false;
      }

      // Filters
      if (filters.status?.length && !filters.status.includes(approval.status)) return false;
      if (filters.type?.length && !filters.type.includes(approval.type)) return false;
      if (filters.riskTier?.length && !filters.riskTier.includes(approval.riskTier)) return false;

      return true;
    });
  }, [approvals, searchQuery, filters, activeTab]);

  const stats = useMemo(() => ({
    pending: approvals.filter(a => a.status === 'pending').length,
    approved: approvals.filter(a => a.status === 'approved').length,
    rejected: approvals.filter(a => a.status === 'rejected').length,
    expiringSoon: approvals.filter(a => {
      if (a.status !== 'pending') return false;
      const expiresIn = new Date(a.expiresAt).getTime() - Date.now();
      return expiresIn < 2 * 60 * 60 * 1000; // 2 hours
    }).length,
  }), [approvals]);

  return (
    <div className="space-y-6 mt-14">
      <Breadcrumbs items={[{ label: 'Governance' }, { label: 'Approvals' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approval Queue</h1>
          <p className="text-muted-foreground">
            Review and approve pending requests
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
              <p className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b pb-4">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'pending' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-muted'
          }`}
        >
          Pending ({stats.pending})
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'resolved' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-muted'
          }`}
        >
          Resolved
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'all' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-muted'
          }`}
        >
          All
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search approvals..."
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
              <label className="block text-sm font-medium mb-2">Type</label>
              <div className="flex flex-wrap gap-2">
                {['run', 'policy_change', 'exception', 'deployment'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      const current = filters.type || [];
                      const updated = current.includes(type as any)
                        ? current.filter(t => t !== type)
                        : [...current, type as any];
                      setFilters({ ...filters, type: updated.length ? updated : undefined });
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md border ${
                      filters.type?.includes(type as any)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Risk Tier</label>
              <div className="flex flex-wrap gap-2">
                {['low', 'medium', 'high', 'critical'].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => {
                      const current = filters.riskTier || [];
                      const updated = current.includes(tier as any)
                        ? current.filter(t => t !== tier)
                        : [...current, tier as any];
                      setFilters({ ...filters, riskTier: updated.length ? updated : undefined });
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md border ${
                      filters.riskTier?.includes(tier as any)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Queue */}
      <ApprovalQueue approvals={filteredApprovals} />

      {/* Empty State */}
      {filteredApprovals.length === 0 && (
        <div className="text-center py-12 forge-card">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <p className="text-muted-foreground">
            {activeTab === 'pending' 
              ? 'No pending approvals' 
              : 'No approvals match your filters'}
          </p>
        </div>
      )}
    </div>
  );
}
