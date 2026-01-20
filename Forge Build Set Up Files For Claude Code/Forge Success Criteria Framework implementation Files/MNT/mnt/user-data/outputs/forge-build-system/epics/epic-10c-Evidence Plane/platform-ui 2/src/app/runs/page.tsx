/**
 * FORGE Platform UI - Runs History Page
 * @epic 10b - Execution Monitor
 */

'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, RefreshCw, Download } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { RunsTable } from '@/components/runs/runs-table';
import { RunFiltersPanel } from '@/components/runs/run-filters-panel';
import type { Run, RunFilters, RunStatus } from '@/lib/types/runs';

// Sample data - in production this comes from API
const sampleRuns: Run[] = [
  {
    id: 'run_abc123',
    workId: 'WORK-001',
    contractId: 'api-validator',
    contractName: 'API Response Validator',
    contractVersion: '1.0.0',
    status: 'completed',
    owner: 'alice@forge.dev',
    repo: 'acme/api-service',
    environment: 'prod',
    policyProfile: 'standard',
    currentIteration: 3,
    maxIterations: 5,
    currentScore: 0.985,
    targetScore: 0.95,
    tokensUsed: 12450,
    estimatedCost: 0.42,
    startedAt: '2025-01-19T14:30:00Z',
    updatedAt: '2025-01-19T14:32:15Z',
    completedAt: '2025-01-19T14:32:15Z',
    duration: 135000,
    outcome: 'success',
    confidence: 0.95,
  },
  {
    id: 'run_def456',
    workId: 'WORK-002',
    contractId: 'code-review',
    contractName: 'Code Review Contract',
    contractVersion: '2.1.0',
    status: 'running',
    owner: 'bob@forge.dev',
    repo: 'acme/frontend',
    environment: 'staging',
    policyProfile: 'strict',
    currentIteration: 2,
    maxIterations: 5,
    currentScore: 0.78,
    targetScore: 0.90,
    tokensUsed: 8200,
    estimatedCost: 0.28,
    startedAt: '2025-01-19T14:45:00Z',
    updatedAt: '2025-01-19T14:46:30Z',
  },
  {
    id: 'run_ghi789',
    contractId: 'doc-summarizer',
    contractName: 'Document Summarizer',
    contractVersion: '1.2.0',
    status: 'failed',
    owner: 'charlie@forge.dev',
    environment: 'dev',
    policyProfile: 'standard',
    currentIteration: 5,
    maxIterations: 5,
    currentScore: 0.72,
    targetScore: 0.92,
    tokensUsed: 24100,
    estimatedCost: 0.81,
    startedAt: '2025-01-19T14:00:00Z',
    updatedAt: '2025-01-19T14:08:45Z',
    completedAt: '2025-01-19T14:08:45Z',
    duration: 525000,
    outcome: 'failure',
    errorMessage: 'Failed to reach target score after max iterations',
    errorType: 'test_failure',
  },
  {
    id: 'run_jkl012',
    workId: 'WORK-003',
    contractId: 'email-generator',
    contractName: 'Email Template Generator',
    contractVersion: '1.0.0',
    status: 'paused',
    owner: 'alice@forge.dev',
    repo: 'acme/marketing',
    environment: 'prod',
    policyProfile: 'standard',
    currentIteration: 1,
    maxIterations: 5,
    currentScore: 0.65,
    targetScore: 0.95,
    tokensUsed: 3400,
    estimatedCost: 0.12,
    startedAt: '2025-01-19T14:50:00Z',
    updatedAt: '2025-01-19T14:51:00Z',
  },
];

export default function RunsPage() {
  const [runs] = useState<Run[]>(sampleRuns);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<RunFilters>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          run.id.toLowerCase().includes(query) ||
          run.contractName.toLowerCase().includes(query) ||
          run.owner.toLowerCase().includes(query) ||
          run.workId?.toLowerCase().includes(query) ||
          run.repo?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status?.length && !filters.status.includes(run.status)) {
        return false;
      }

      // Environment filter
      if (filters.environment?.length && !filters.environment.includes(run.environment)) {
        return false;
      }

      // Cost filter
      if (filters.costMin !== undefined && run.estimatedCost < filters.costMin) {
        return false;
      }
      if (filters.costMax !== undefined && run.estimatedCost > filters.costMax) {
        return false;
      }

      return true;
    });
  }, [runs, searchQuery, filters]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise((r) => setTimeout(r, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    const data = JSON.stringify(filteredRuns, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forge-runs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const stats = useMemo(() => {
    const running = runs.filter((r) => r.status === 'running').length;
    const completed = runs.filter((r) => r.status === 'completed').length;
    const failed = runs.filter((r) => r.status === 'failed').length;
    const totalCost = runs.reduce((sum, r) => sum + r.estimatedCost, 0);
    return { running, completed, failed, totalCost };
  }, [runs]);

  return (
    <div className="space-y-6 mt-14">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Runs' }]} />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Run History</h1>
          <p className="text-muted-foreground">
            Monitor and manage contract executions
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
            onClick={handleExport}
            className="forge-button h-9 px-3 hover:bg-muted"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Running</p>
          <p className="text-2xl font-bold text-blue-600">{stats.running}</p>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Failed</p>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </div>
        <div className="forge-card py-4">
          <p className="text-sm text-muted-foreground">Total Cost (24h)</p>
          <p className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by ID, contract, owner, work item..."
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
        <RunFiltersPanel 
          filters={filters} 
          onChange={setFilters}
          onClear={() => setFilters({})}
        />
      )}

      {/* Runs Table */}
      <RunsTable runs={filteredRuns} />

      {/* Empty State */}
      {filteredRuns.length === 0 && (
        <div className="text-center py-12 forge-card">
          <p className="text-muted-foreground">No runs found matching your criteria</p>
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
