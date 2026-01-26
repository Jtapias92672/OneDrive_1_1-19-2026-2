/**
 * FORGE Platform UI - Work Item Detail Page
 * @epic 10g - Work Intake
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Play, 
  ExternalLink, 
  GitBranch, 
  GitPullRequest,
  Clock,
  User,
  Tag,
  MessageSquare,
  History,
  Settings,
  MoreVertical
} from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { WorkStatusBadge } from '@/components/work/work-status-badge';
import { WorkRunHistory } from '@/components/work/work-run-history';
import { WorkComments } from '@/components/work/work-comments';
import type { WorkItem, WorkRun, WorkComment, TICKET_SOURCES } from '@/lib/types/work';

type DetailTab = 'overview' | 'runs' | 'comments' | 'settings';

const sampleWorkItem: WorkItem = {
  id: 'WORK-001',
  title: 'Implement user authentication flow',
  description: 'Add OAuth2 login with Google and GitHub providers. This includes:\n- Setting up OAuth2 credentials\n- Implementing login/logout flows\n- Adding session management\n- Updating user model with provider info',
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
  input: {
    files: ['src/auth/*', 'src/api/login.ts'],
    requirements: 'Implement OAuth2 with Google and GitHub',
  },
  createdAt: '2025-01-19T10:00:00Z',
  updatedAt: '2025-01-19T15:30:00Z',
  startedAt: '2025-01-19T14:00:00Z',
  dueAt: '2025-01-20T18:00:00Z',
  createdBy: 'alice@forge.dev',
  environment: 'staging',
};

const sampleRuns: WorkRun[] = [
  {
    id: 'wr_001',
    workId: 'WORK-001',
    runId: 'run_abc123',
    status: 'running',
    iterations: 3,
    startedAt: '2025-01-19T15:00:00Z',
    tokens: 45000,
  },
  {
    id: 'wr_002',
    workId: 'WORK-001',
    runId: 'run_xyz789',
    status: 'failed',
    score: 0.65,
    iterations: 5,
    startedAt: '2025-01-19T14:00:00Z',
    completedAt: '2025-01-19T14:45:00Z',
    duration: 2700,
    cost: 0.45,
    tokens: 38000,
  },
];

const sampleComments: WorkComment[] = [
  {
    id: 'cmt_001',
    workId: 'WORK-001',
    content: 'Starting work on this. Will focus on Google OAuth first.',
    authorId: 'usr_002',
    authorName: 'Bob Martinez',
    authorEmail: 'bob@forge.dev',
    type: 'comment',
    createdAt: '2025-01-19T10:30:00Z',
  },
  {
    id: 'cmt_002',
    workId: 'WORK-001',
    content: '',
    authorId: 'system',
    authorName: 'System',
    authorEmail: 'system@forge.dev',
    type: 'status_change',
    previousStatus: 'pending',
    newStatus: 'running',
    createdAt: '2025-01-19T14:00:00Z',
  },
  {
    id: 'cmt_003',
    workId: 'WORK-001',
    content: '',
    authorId: 'system',
    authorName: 'System',
    authorEmail: 'system@forge.dev',
    type: 'run_started',
    runId: 'run_abc123',
    createdAt: '2025-01-19T15:00:00Z',
  },
];

const ticketSources = {
  jira: { name: 'Jira', color: 'bg-blue-100 text-blue-700' },
  linear: { name: 'Linear', color: 'bg-purple-100 text-purple-700' },
  github: { name: 'GitHub', color: 'bg-gray-100 text-gray-700' },
  asana: { name: 'Asana', color: 'bg-orange-100 text-orange-700' },
  manual: { name: 'Manual', color: 'bg-green-100 text-green-700' },
};

export default function WorkDetailPage() {
  const params = useParams();
  const workId = params.id as string;
  
  const [workItem] = useState<WorkItem>(sampleWorkItem);
  const [runs] = useState<WorkRun[]>(sampleRuns);
  const [comments] = useState<WorkComment[]>(sampleComments);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [isStartingRun, setIsStartingRun] = useState(false);

  const handleStartRun = async () => {
    setIsStartingRun(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsStartingRun(false);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'runs' as const, label: `Runs (${runs.length})` },
    { id: 'comments' as const, label: `Activity (${comments.length})` },
    { id: 'settings' as const, label: 'Settings' },
  ];

  return (
    <div className="space-y-6 mt-14">
      <Breadcrumbs 
        items={[
          { label: 'Work', href: '/work' },
          { label: workItem.id },
        ]} 
      />

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/work" className="forge-button h-9 w-9 hover:bg-muted mt-1">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{workItem.title}</h1>
            <WorkStatusBadge status={workItem.status} />
            <span className={`forge-badge ${priorityColors[workItem.priority]}`}>
              {workItem.priority}
            </span>
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>{workItem.id}</span>
            {workItem.ticketSource && workItem.ticketKey && (
              <a 
                href={workItem.ticketUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <span className={`forge-badge ${ticketSources[workItem.ticketSource].color} text-xs`}>
                  {ticketSources[workItem.ticketSource].name}
                </span>
                {workItem.ticketKey}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <span>Created {formatDate(workItem.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {workItem.status !== 'running' && workItem.status !== 'completed' && (
            <button
              onClick={handleStartRun}
              disabled={isStartingRun}
              className="forge-button h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Play className="h-4 w-4 mr-2" />
              {isStartingRun ? 'Starting...' : 'Start Run'}
            </button>
          )}
          <button className="forge-button h-9 w-9 hover:bg-muted">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="border-b">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div className="forge-card">
                <h3 className="font-semibold mb-3">Description</h3>
                <p className="text-sm whitespace-pre-wrap">{workItem.description}</p>
              </div>

              {/* Contract */}
              {workItem.contractId && (
                <div className="forge-card">
                  <h3 className="font-semibold mb-3">Contract</h3>
                  <Link 
                    href={`/contracts/${workItem.contractId}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{workItem.contractName}</p>
                      <p className="text-sm text-muted-foreground">v{workItem.contractVersion}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </div>
              )}

              {/* Input */}
              {workItem.input && (
                <div className="forge-card">
                  <h3 className="font-semibold mb-3">Input</h3>
                  <pre className="text-sm bg-muted p-3 rounded-lg overflow-auto max-h-48">
                    {JSON.stringify(workItem.input, null, 2)}
                  </pre>
                </div>
              )}

              {/* Output */}
              {workItem.output && (
                <div className="forge-card">
                  <h3 className="font-semibold mb-3">Output</h3>
                  <pre className="text-sm bg-muted p-3 rounded-lg overflow-auto max-h-48">
                    {JSON.stringify(workItem.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'runs' && (
            <WorkRunHistory runs={runs} />
          )}

          {activeTab === 'comments' && (
            <WorkComments comments={comments} workId={workItem.id} />
          )}

          {activeTab === 'settings' && (
            <div className="forge-card">
              <h3 className="font-semibold mb-4">Work Item Settings</h3>
              <p className="text-muted-foreground">Settings and configuration options...</p>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4">
          {/* Quick Info */}
          <div className="forge-card">
            <h3 className="font-semibold mb-4">Details</h3>
            <div className="space-y-4">
              {/* Assignee */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Assignee</p>
                {workItem.assigneeName ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {workItem.assigneeName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-sm">{workItem.assigneeName}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </div>

              {/* Team */}
              {workItem.team && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Team</p>
                  <span className="text-sm capitalize">{workItem.team}</span>
                </div>
              )}

              {/* Due Date */}
              {workItem.dueAt && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Due Date</p>
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {formatDate(workItem.dueAt)}
                  </div>
                </div>
              )}

              {/* Environment */}
              {workItem.environment && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Environment</p>
                  <span className="forge-badge bg-muted capitalize">{workItem.environment}</span>
                </div>
              )}

              {/* Labels */}
              {workItem.labels.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Labels</p>
                  <div className="flex flex-wrap gap-1">
                    {workItem.labels.map((label) => (
                      <span key={label} className="forge-badge bg-muted text-xs">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Repository */}
          {workItem.repo && (
            <div className="forge-card">
              <h3 className="font-semibold mb-4">Repository</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  <span>{workItem.repo}</span>
                </div>
                {workItem.branch && (
                  <div className="flex items-center gap-2 text-sm">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{workItem.branch}</code>
                  </div>
                )}
                {workItem.prNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                    <a href="#" className="text-primary hover:underline">
                      PR #{workItem.prNumber}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Run Stats */}
          <div className="forge-card">
            <h3 className="font-semibold mb-4">Run Statistics</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{workItem.runCount}</p>
                <p className="text-xs text-muted-foreground">Total Runs</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {workItem.lastRunScore ? `${(workItem.lastRunScore * 100).toFixed(0)}%` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">Last Score</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
