/**
 * FORGE Platform UI - Policies Page
 * @epic 10d - Governance Console
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, Plus, Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { PolicyTable } from '@/components/governance/policy-table';
import { KillSwitchPanel } from '@/components/governance/kill-switch-panel';
import type { Policy, GovernanceFilters, KillSwitch } from '@/lib/types/governance';

// Sample data
const samplePolicies: Policy[] = [
  {
    id: 'pol_standard',
    name: 'Standard Execution Policy',
    description: 'Default policy for development and staging environments',
    version: '2.1.0',
    status: 'active',
    scope: { environments: ['dev', 'staging'] },
    riskTier: 'medium',
    rules: [],
    requiresApproval: false,
    redactionRules: [],
    owner: 'platform-team@forge.dev',
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    activatedAt: '2025-01-15T10:00:00Z',
    changeLog: [],
  },
  {
    id: 'pol_strict',
    name: 'Production Strict Policy',
    description: 'High-security policy for production with mandatory approvals',
    version: '1.5.0',
    status: 'active',
    scope: { environments: ['prod'] },
    riskTier: 'critical',
    rules: [],
    requiresApproval: true,
    approvers: ['security-team@forge.dev', 'platform-lead@forge.dev'],
    minApprovers: 2,
    redactionRules: [],
    owner: 'security-team@forge.dev',
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2025-01-10T14:00:00Z',
    activatedAt: '2025-01-10T14:00:00Z',
    changeLog: [],
  },
  {
    id: 'pol_readonly',
    name: 'Read-Only Analysis Policy',
    description: 'Restricts all write operations for analysis-only runs',
    version: '1.0.0',
    status: 'active',
    scope: { environments: ['dev', 'staging', 'prod'], contracts: ['doc-summarizer'] },
    riskTier: 'low',
    rules: [],
    requiresApproval: false,
    redactionRules: [],
    owner: 'alice@forge.dev',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    activatedAt: '2025-01-05T00:00:00Z',
    changeLog: [],
  },
  {
    id: 'pol_draft',
    name: 'New Compliance Policy',
    description: 'Draft policy for SOC2 compliance requirements',
    version: '0.1.0',
    status: 'draft',
    scope: { environments: ['prod'] },
    riskTier: 'high',
    rules: [],
    requiresApproval: true,
    redactionRules: [],
    owner: 'compliance@forge.dev',
    createdAt: '2025-01-18T00:00:00Z',
    updatedAt: '2025-01-18T00:00:00Z',
    changeLog: [],
  },
];

const sampleKillSwitches: KillSwitch[] = [
  {
    id: 'ks_001',
    scope: 'global',
    active: false,
    reason: '',
    activatedBy: '',
    activatedAt: '',
    affectedRuns: 0,
    killedRuns: [],
  },
];

export default function PoliciesPage() {
  const [policies] = useState<Policy[]>(samplePolicies);
  const [killSwitches] = useState<KillSwitch[]>(sampleKillSwitches);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<GovernanceFilters>({});
  const [showKillSwitch, setShowKillSwitch] = useState(false);

  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = 
          policy.name.toLowerCase().includes(query) ||
          policy.description.toLowerCase().includes(query) ||
          policy.owner.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (filters.status?.length && !filters.status.includes(policy.status)) {
        return false;
      }
      if (filters.riskTier?.length && !filters.riskTier.includes(policy.riskTier)) {
        return false;
      }
      return true;
    });
  }, [policies, searchQuery, filters]);

  const stats = useMemo(() => ({
    active: policies.filter(p => p.status === 'active').length,
    draft: policies.filter(p => p.status === 'draft').length,
    critical: policies.filter(p => p.riskTier === 'critical').length,
    requireApproval: policies.filter(p => p.requiresApproval).length,
  }), [policies]);

  const globalKillSwitch = killSwitches.find(ks => ks.scope === 'global');

  return (
    <div className="space-y-6 mt-14">
      <Breadcrumbs items={[{ label: 'Governance' }, { label: 'Policies' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Policy Library</h1>
          <p className="text-muted-foreground">
            Manage execution policies, permissions, and risk controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKillSwitch(!showKillSwitch)}
            className={`forge-button h-9 px-3 ${
              globalKillSwitch?.active 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'hover:bg-muted'
            }`}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Kill Switch
          </button>
          <Link
            href="/governance/policies/new"
            className="forge-button h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Policy
          </Link>
        </div>
      </div>

      {/* Kill Switch Panel */}
      {showKillSwitch && (
        <KillSwitchPanel 
          killSwitches={killSwitches} 
          onClose={() => setShowKillSwitch(false)} 
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Drafts</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.draft}</p>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Critical Risk</p>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Require Approval</p>
          <p className="text-2xl font-bold">{stats.requireApproval}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search policies..."
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
              <label className="block text-sm font-medium mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {['draft', 'review', 'active', 'deprecated'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      const current = filters.status || [];
                      const updated = current.includes(status as any)
                        ? current.filter(s => s !== status)
                        : [...current, status as any];
                      setFilters({ ...filters, status: updated.length ? updated : undefined });
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md border ${
                      filters.status?.includes(status as any)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {status}
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

      {/* Policies Table */}
      <PolicyTable policies={filteredPolicies} />
    </div>
  );
}
