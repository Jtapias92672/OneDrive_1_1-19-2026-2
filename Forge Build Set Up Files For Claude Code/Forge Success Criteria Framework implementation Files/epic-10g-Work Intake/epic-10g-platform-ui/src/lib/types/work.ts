/**
 * FORGE Platform UI - Work Intake Types
 * @epic 10g - Work Intake
 */

export type WorkStatus = 'draft' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type WorkPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketSource = 'jira' | 'linear' | 'github' | 'asana' | 'manual';

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  
  // Status
  status: WorkStatus;
  priority: WorkPriority;
  
  // Ticket linkage
  ticketSource?: TicketSource;
  ticketId?: string;
  ticketUrl?: string;
  ticketKey?: string; // e.g., "PROJ-123"
  
  // Contract binding
  contractId?: string;
  contractName?: string;
  contractVersion?: string;
  
  // Execution
  runCount: number;
  activeRunId?: string;
  lastRunId?: string;
  lastRunStatus?: 'running' | 'converged' | 'failed' | 'timeout';
  lastRunScore?: number;
  
  // Assignment
  assignee?: string;
  assigneeName?: string;
  team?: string;
  
  // Labels/Tags
  labels: string[];
  
  // Repository context
  repo?: string;
  branch?: string;
  prNumber?: number;
  commitSha?: string;
  
  // Input/Output
  input?: Record<string, any>;
  output?: Record<string, any>;
  
  // Timing
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  dueAt?: string;
  
  // Metadata
  createdBy: string;
  environment?: 'dev' | 'staging' | 'prod';
}

export interface WorkRun {
  id: string;
  workId: string;
  runId: string;
  
  // Status
  status: 'running' | 'converged' | 'failed' | 'timeout' | 'cancelled';
  score?: number;
  iterations: number;
  
  // Timing
  startedAt: string;
  completedAt?: string;
  duration?: number;
  
  // Cost
  cost?: number;
  tokens?: number;
}

export interface TicketSync {
  id: string;
  workId: string;
  source: TicketSource;
  ticketId: string;
  ticketKey: string;
  ticketUrl: string;
  
  // Sync status
  syncStatus: 'synced' | 'pending' | 'error';
  lastSyncAt?: string;
  syncError?: string;
  
  // Mapping
  statusMapping: {
    forgeStatus: WorkStatus;
    ticketStatus: string;
  }[];
  
  // Auto-sync settings
  autoSync: boolean;
  syncOnComplete: boolean;
  addComments: boolean;
}

export interface WorkTemplate {
  id: string;
  name: string;
  description: string;
  
  // Default values
  contractId?: string;
  contractName?: string;
  labels: string[];
  priority: WorkPriority;
  environment?: 'dev' | 'staging' | 'prod';
  
  // Input schema
  inputSchema?: {
    fields: {
      name: string;
      type: 'string' | 'number' | 'boolean' | 'json';
      required: boolean;
      default?: any;
      description?: string;
    }[];
  };
  
  // Ticket integration
  ticketSource?: TicketSource;
  ticketProject?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  usageCount: number;
}

export interface WorkQueue {
  id: string;
  name: string;
  description?: string;
  
  // Filter criteria
  filters: {
    status?: WorkStatus[];
    priority?: WorkPriority[];
    labels?: string[];
    team?: string;
    assignee?: string;
  };
  
  // Sort
  sortBy: 'created' | 'updated' | 'priority' | 'due';
  sortOrder: 'asc' | 'desc';
  
  // Stats
  itemCount: number;
  
  // Metadata
  createdBy: string;
  isDefault: boolean;
}

export interface WorkComment {
  id: string;
  workId: string;
  
  // Content
  content: string;
  
  // Author
  authorId: string;
  authorName: string;
  authorEmail: string;
  
  // Type
  type: 'comment' | 'status_change' | 'run_started' | 'run_completed' | 'ticket_sync';
  
  // Related
  runId?: string;
  previousStatus?: WorkStatus;
  newStatus?: WorkStatus;
  
  // Timing
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
}

export interface WorkFilters {
  status?: WorkStatus[];
  priority?: WorkPriority[];
  ticketSource?: TicketSource[];
  assignee?: string;
  team?: string;
  labels?: string[];
  contractId?: string;
  repo?: string;
  environment?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface WorkStats {
  total: number;
  byStatus: Record<WorkStatus, number>;
  byPriority: Record<WorkPriority, number>;
  avgCompletionTime?: number;
  avgRunsPerWork?: number;
  completedToday: number;
  createdToday: number;
}

// Ticket source configurations
export const TICKET_SOURCES: Record<TicketSource, { name: string; icon: string; color: string }> = {
  jira: { name: 'Jira', icon: '🎫', color: 'bg-blue-100 text-blue-700' },
  linear: { name: 'Linear', icon: '📋', color: 'bg-purple-100 text-purple-700' },
  github: { name: 'GitHub Issues', icon: '🐙', color: 'bg-gray-100 text-gray-700' },
  asana: { name: 'Asana', icon: '📝', color: 'bg-orange-100 text-orange-700' },
  manual: { name: 'Manual', icon: '✏️', color: 'bg-green-100 text-green-700' },
};
