/**
 * FORGE Platform UI - Work Items Page
 * @epic 10g - Work Intake
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  LayoutGrid, 
  List,
  Inbox,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { WorkTable } from '@/components/work/work-table';
import { WorkFiltersPanel } from '@/components/work/work-filters-panel';
import { WorkStats } from '@/components/work/work-stats';
import type { WorkItem, WorkFilters, WorkStats as WorkStatsType } from '@/lib/types/work';

// Sample data
const sampleWorkItems: WorkItem[] = [
  {
    id: 'WORK-001',
    title: 'Implement user authentication flow',
    description: 'Add OAuth2 login with Google and GitHub providers',
    status: 'running',
    priority: 'high',
    ticketSource: 'jira',
    ticketId: 'AUTH-123',
    ticketKey: 'AUTH-123',
    ticketUrl: 'https://company.atlassian.net/browse/AUTH-123',
    contractId: 'code-reviewer',
    contractName: 'Code Reviewer',
    contractVersion: '1.2.0',
    runCount: 2,
    activeRunId: 'run_abc123',
    lastRunStatus: 'running',
    assignee: 'usr_002',
    assigneeName: 'Bob Martinez',
    team: 'frontend',
    labels: ['auth', 'security', 'p1'],
    repo: 'acme/web-app',
    branch: 'feature/oauth-login',
    prNumber: 456,
    createdAt: '2025-01-19T10:00:00Z',
    updatedAt: '2025-01-19T15:30:00Z',
    startedAt: '2025-01-19T14:00:00Z',
    dueAt: '2025-01-20T18:00:00Z',
    createdBy: 'alice@forge.dev',
    environment: 'staging',
  },
  {
    id: 'WORK-002',
    title: 'Fix payment processing timeout',
    description: 'Investigate and fix timeout issues in payment gateway integration',
    status: 'completed',
    priority: 'critical',
    ticketSource: 'linear',
    ticketId: 'PAY-789',
    ticketKey: 'PAY-789',
    ticketUrl: 'https://linear.app/company/issue/PAY-789',
    contractId: 'api-validator',
    contractName: 'API Validator',
    contractVersion: '2.0.0',
    runCount: 3,
    lastRunId: 'run_def456',
    lastRunStatus: 'converged',
    lastRunScore: 0.95,
    assignee: 'usr_003',
    assigneeName: 'Charlie Kim',
    team: 'backend',
    labels: ['payments', 'bug', 'urgent'],
    repo: 'acme/payment-service',
    branch: 'fix/timeout-issue',
    commitSha: 'abc1234',
    createdAt: '2025-01-18T09:00:00Z',
    updatedAt: '2025-01-19T11:00:00Z',
    startedAt: '2025-01-18T10:00:00Z',
    completedAt: '2025-01-19T11:00:00Z',
    createdBy: 'charlie@forge.dev',
    environment: 'prod',
  },
  {
    id: 'WORK-003',
    title: 'Add unit tests for user service',
    description: 'Increase test coverage for user service to 80%',
    status: 'pending',
    priority: 'medium',
    ticketSource: 'github',
    ticketId: '234',
    ticketKey: '#234',
    ticketUrl: 'https://github.com/acme/user-service/issues/234',
    contractId: 'test-writer',
    contractName: 'Test Writer',
    contractVersion: '1.0.0',
    runCount: 0,
    assignee: 'usr_002',
    assigneeName: 'Bob Martinez',
    team: 'backend',
    labels: ['testing', 'tech-debt'],
    repo: 'acme/user-service',
    createdAt: '2025-01-19T08:00:00Z',
    updatedAt: '2025-01-19T08:00:00Z',
    createdBy: 'bob@forge.dev',
    environment: 'dev',
  },
  {
    id: 'WORK-004',
    title: 'Generate API documentation',
    description: 'Auto-generate OpenAPI docs for REST endpoints',
    status: 'failed',
    priority: 'low',
    ticketSource: 'manual',
    contractId: 'doc-generator',
    contractName: 'Doc Generator',
    contractVersion: '1.1.0',
    runCount: 2,
    lastRunId: 'run_ghi789',
    lastRunStatus: 'failed',
    lastRunScore: 0.42,
    team: 'platform',
    labels: ['docs', 'api'],
    repo: 'acme/api-gateway',
    createdAt: '2025-01-17T14:00:00Z',
    updatedAt: '2025-01-18T16:00:00Z',
    startedAt: '2025-01-18T15:00:00Z',
    createdBy: 'alice@forge.dev',
    environment: 'dev',
  },
  {
    id: 'WORK-005',
    title: 'Refactor database queries',
    description: 'Optimize slow queries in reporting module',
    status: 'draft',
    priority: 'medium',
    ticketSource: 'jira',
    ticketId: 'PERF-456',
    ticketKey: 'PERF-456',
    ticketUrl: 'https://company.atlassian.net/browse/PERF-456',
    runCount: 0,
    assignee: 'usr_003',
    assigneeName: 'Charlie Kim',
    team: 'backend',
    labels: ['performance', 'database'],
    repo: 'acme/reporting',
    createdAt: '2025-01-19T16:00:00Z',
    updatedAt: '2025-01-19T16:00:00Z',
    createdBy: 'charlie@forge.dev',
  },
];

const sampleStats: WorkStatsType = {
  total: 5,
  byStatus: {
    draft: 1,
    pending: 1,
    running: 1,
    completed: 1,
    failed: 1,
    cancelled: 0,
  },
  byPriority: {
    low: 1,
    medium: 2,
    high: 1,
    critical: 1,
  },
  avgCompletionTime: 25.5,
  avgRunsPerWork: 1.4,
  completedToday: 1,
  createdToday: 3,
};

export default function WorkPage() {
  const [workItems] = useState<WorkItem[]>(sampleWorkItems);
  const [stats] = useState<WorkStatsType>(sampleStats);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<WorkFilters>({});
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredItems = useMemo(() => {
    return workItems.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = 
          item.title.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query) ||
          item.ticketKey?.toLowerCase().includes(query) ||
          item.labels.some(l => l.toLowerCase().includes(query));
        if (!matches) return false;
      }
      if (filters.status?.length && !filters.status.includes(item.status)) return false;
      if (filters.priority?.length && !filters.priority.includes(item.priority)) return false;
      if (filters.ticketSource?.length && item.ticketSource && !filters.ticketSource.includes(item.ticketSource)) return false;
      if (filters.team && item.team !== filters.team) return false;
      return true;
    });
  }, [workItems, searchQuery, filters]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6 mt-14">
      <Breadcrumbs items={[{ label: 'Work' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Work Items</h1>
          <p className="text-muted-foreground">
            Manage work items and track AI-assisted tasks
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
          <Link
            href="/work/new"
            className="forge-button h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Work Item
          </Link>
        </div>
      </div>

      {/* Stats */}
      <WorkStats stats={stats} />

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search work items, tickets, labels..."
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
          {Object.values(filters).filter(Boolean).length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-xs">
              {Object.values(filters).filter(Boolean).length}
            </span>
          )}
        </button>

        <div className="flex items-center border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 ${viewMode === 'table' ? 'bg-muted' : 'hover:bg-muted'}`}
            title="Table view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`p-2 ${viewMode === 'board' ? 'bg-muted' : 'hover:bg-muted'}`}
            title="Board view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <WorkFiltersPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClear={() => setFilters({})}
        />
      )}

      {/* Work Items */}
      {viewMode === 'table' ? (
        <WorkTable items={filteredItems} />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {(['pending', 'running', 'completed', 'failed'] as const).map((status) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium capitalize">{status}</h3>
                <span className="text-sm text-muted-foreground">
                  {filteredItems.filter(i => i.status === status).length}
                </span>
              </div>
              <div className="space-y-2 min-h-[200px] p-2 bg-muted/30 rounded-lg">
                {filteredItems
                  .filter(i => i.status === status)
                  .map((item) => (
                    <Link
                      key={item.id}
                      href={`/work/${item.id}`}
                      className="block p-3 bg-white rounded-lg border hover:shadow-md transition-shadow"
                    >
                      <p className="font-medium text-sm line-clamp-2">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.id}</p>
                      {item.ticketKey && (
                        <span className="text-xs text-primary">{item.ticketKey}</span>
                      )}
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12 forge-card">
          <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No work items found</p>
          <Link href="/work/new" className="mt-4 text-primary hover:underline inline-block">
            Create your first work item
          </Link>
        </div>
      )}
    </div>
  );
}
