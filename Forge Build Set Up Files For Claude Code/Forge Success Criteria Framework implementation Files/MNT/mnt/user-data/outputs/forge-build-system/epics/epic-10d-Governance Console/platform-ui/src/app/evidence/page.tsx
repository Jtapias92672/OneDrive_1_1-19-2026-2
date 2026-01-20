/**
 * FORGE Platform UI - Evidence Library Page
 * @epic 10c - Evidence Plane
 */

'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Download, Shield, RefreshCw } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { EvidenceTable } from '@/components/evidence/evidence-table';
import { EvidenceFiltersPanel } from '@/components/evidence/evidence-filters-panel';
import type { EvidenceBundle, EvidenceFilters, EvidenceStatus } from '@/lib/types/evidence';

// Sample data
const sampleBundles: EvidenceBundle[] = [
  {
    id: 'evd_abc123',
    runId: 'run_abc123',
    workId: 'WORK-001',
    contractId: 'api-validator',
    contractName: 'API Response Validator',
    contractVersion: '1.0.0',
    owner: 'alice@forge.dev',
    repo: 'acme/api-service',
    environment: 'prod',
    policyProfile: 'standard',
    status: 'verified',
    contentHash: 'sha256:a1b2c3d4e5f6...',
    hashAlgorithm: 'sha256',
    signature: 'sig_xyz789...',
    signedBy: 'forge-signer-prod',
    signedAt: '2025-01-19T14:35:00Z',
    createdAt: '2025-01-19T14:30:00Z',
    completedAt: '2025-01-19T14:32:15Z',
    exportedAt: '2025-01-19T14:40:00Z',
    iterationCount: 3,
    toolCallCount: 8,
    validatorCount: 3,
    artifactCount: 2,
    redactionRules: ['pii', 'secrets'],
    redactedFields: 4,
    exportFormats: ['json', 'pdf'],
    exportSize: 245000,
  },
  {
    id: 'evd_def456',
    runId: 'run_def456',
    workId: 'WORK-002',
    contractId: 'code-review',
    contractName: 'Code Review Contract',
    contractVersion: '2.1.0',
    owner: 'bob@forge.dev',
    repo: 'acme/frontend',
    environment: 'staging',
    policyProfile: 'strict',
    status: 'complete',
    contentHash: 'sha256:f6e5d4c3b2a1...',
    hashAlgorithm: 'sha256',
    createdAt: '2025-01-19T14:45:00Z',
    iterationCount: 2,
    toolCallCount: 5,
    validatorCount: 3,
    artifactCount: 1,
    redactionRules: ['secrets'],
    redactedFields: 2,
    exportFormats: ['json'],
  },
  {
    id: 'evd_ghi789',
    runId: 'run_ghi789',
    contractId: 'doc-summarizer',
    contractName: 'Document Summarizer',
    contractVersion: '1.2.0',
    owner: 'charlie@forge.dev',
    environment: 'dev',
    policyProfile: 'standard',
    status: 'complete',
    contentHash: 'sha256:1a2b3c4d5e6f...',
    hashAlgorithm: 'sha256',
    createdAt: '2025-01-19T14:00:00Z',
    completedAt: '2025-01-19T14:08:45Z',
    iterationCount: 5,
    toolCallCount: 12,
    validatorCount: 2,
    artifactCount: 0,
    redactionRules: [],
    redactedFields: 0,
    exportFormats: ['json', 'pdf', 'zip'],
  },
];

export default function EvidencePage() {
  const [bundles] = useState<EvidenceBundle[]>(sampleBundles);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<EvidenceFilters>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredBundles = useMemo(() => {
    return bundles.filter((bundle) => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          bundle.id.toLowerCase().includes(query) ||
          bundle.runId.toLowerCase().includes(query) ||
          bundle.contractName.toLowerCase().includes(query) ||
          bundle.owner.toLowerCase().includes(query) ||
          bundle.workId?.toLowerCase().includes(query) ||
          bundle.repo?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status?.length && !filters.status.includes(bundle.status)) {
        return false;
      }

      // Environment filter
      if (filters.environment?.length && !filters.environment.includes(bundle.environment)) {
        return false;
      }

      return true;
    });
  }, [bundles, searchQuery, filters]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsRefreshing(false);
  };

  const handleBulkExport = () => {
    console.log('Bulk export', filteredBundles.map(b => b.id));
  };

  // Stats
  const stats = useMemo(() => {
    const verified = bundles.filter((b) => b.status === 'verified').length;
    const complete = bundles.filter((b) => b.status === 'complete').length;
    const exported = bundles.filter((b) => b.exportedAt).length;
    const totalArtifacts = bundles.reduce((sum, b) => sum + b.artifactCount, 0);
    return { verified, complete, exported, totalArtifacts };
  }, [bundles]);

  return (
    <div className="space-y-6 mt-14">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Evidence' }]} />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Evidence Library</h1>
          <p className="text-muted-foreground">
            Immutable receipts and audit artifacts for all executions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="forge-button h-9 px-3 hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={handleBulkExport}
            disabled={filteredBundles.length === 0}
            className="forge-button h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Selected
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="forge-card py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Verified</p>
              <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
            </div>
          </div>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Complete</p>
          <p className="text-2xl font-bold">{stats.complete}</p>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Exported</p>
          <p className="text-2xl font-bold">{stats.exported}</p>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Total Artifacts</p>
          <p className="text-2xl font-bold">{stats.totalArtifacts}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by ID, run, work item, contract..."
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
          {Object.keys(filters).length > 0 && (
            <span className="ml-2 forge-badge forge-badge-success">
              {Object.keys(filters).length}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <EvidenceFiltersPanel 
          filters={filters} 
          onChange={setFilters}
          onClear={() => setFilters({})}
        />
      )}

      {/* Evidence Table */}
      <EvidenceTable bundles={filteredBundles} />

      {/* Empty State */}
      {filteredBundles.length === 0 && (
        <div className="text-center py-12 forge-card">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No evidence bundles found</p>
          <button 
            onClick={() => { setSearchQuery(''); setFilters({}); }}
            className="mt-4 text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
