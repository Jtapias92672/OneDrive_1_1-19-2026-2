/**
 * FORGE Platform UI - Operations Types
 * @epic 10f - Operations
 */

export type TimeGranularity = 'hour' | 'day' | 'week' | 'month';
export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

// Cost Tracking
export interface CostRecord {
  id: string;
  timestamp: string;
  
  // Context
  runId?: string;
  contractId?: string;
  userId?: string;
  teamId?: string;
  environment?: string;
  
  // Cost breakdown
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  
  // Model info
  model: string;
  provider: string;
}

export interface CostSummary {
  period: {
    start: string;
    end: string;
    granularity: TimeGranularity;
  };
  
  // Totals
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRuns: number;
  
  // Averages
  avgCostPerRun: number;
  avgTokensPerRun: number;
  
  // Trends
  costChange: number; // % vs previous period
  runChange: number;
  
  // Breakdown
  byModel: { model: string; cost: number; runs: number }[];
  byTeam: { teamId: string; teamName: string; cost: number; runs: number }[];
  byContract: { contractId: string; contractName: string; cost: number; runs: number }[];
  byEnvironment: { environment: string; cost: number; runs: number }[];
  
  // Time series
  timeSeries: {
    timestamp: string;
    cost: number;
    runs: number;
  }[];
}

export interface Budget {
  id: string;
  name: string;
  description?: string;
  
  // Scope
  scope: 'global' | 'team' | 'user' | 'contract';
  scopeId?: string;
  scopeName?: string;
  
  // Limits
  amount: number;
  period: 'daily' | 'weekly' | 'monthly';
  
  // Current usage
  currentSpend: number;
  percentUsed: number;
  
  // Alerts
  alertThresholds: number[]; // e.g., [50, 75, 90, 100]
  alertsTriggered: number[];
  
  // Actions
  hardLimit: boolean; // Block when exceeded
  
  // Status
  status: 'active' | 'paused' | 'exceeded';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Rate Limits & Quotas
export interface RateLimit {
  id: string;
  name: string;
  
  // Scope
  scope: 'global' | 'team' | 'user' | 'api_key';
  scopeId?: string;
  scopeName?: string;
  
  // Limits
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  tokensPerMinute?: number;
  tokensPerDay?: number;
  concurrentRuns?: number;
  
  // Current usage
  currentUsage: {
    requestsThisMinute: number;
    requestsThisHour: number;
    requestsThisDay: number;
    tokensThisMinute: number;
    tokensThisDay: number;
    activeRuns: number;
  };
  
  // Status
  isThrottled: boolean;
  throttledUntil?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface Quota {
  id: string;
  name: string;
  
  // Scope
  scope: 'global' | 'team' | 'user';
  scopeId?: string;
  scopeName?: string;
  
  // Quota type
  type: 'runs' | 'tokens' | 'cost' | 'storage';
  
  // Limits
  limit: number;
  period: 'daily' | 'weekly' | 'monthly' | 'unlimited';
  
  // Usage
  used: number;
  remaining: number;
  percentUsed: number;
  
  // Reset
  resetsAt?: string;
  
  // Actions
  hardLimit: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Health & Metrics
export interface ServiceHealth {
  id: string;
  name: string;
  description?: string;
  
  // Status
  status: HealthStatus;
  statusMessage?: string;
  
  // Latency
  latencyP50?: number;
  latencyP95?: number;
  latencyP99?: number;
  
  // Availability
  uptime24h: number; // percentage
  uptime7d: number;
  uptime30d: number;
  
  // Recent incidents
  lastIncident?: {
    id: string;
    title: string;
    severity: 'minor' | 'major' | 'critical';
    startedAt: string;
    resolvedAt?: string;
  };
  
  // Dependencies
  dependencies?: string[];
  
  // Last check
  lastCheckedAt: string;
}

export interface SystemMetrics {
  timestamp: string;
  
  // Runs
  activeRuns: number;
  queuedRuns: number;
  completedRunsToday: number;
  failedRunsToday: number;
  
  // Performance
  avgRunDuration: number;
  avgIterations: number;
  avgScore: number;
  
  // Throughput
  runsPerHour: number;
  tokensPerHour: number;
  
  // Resources
  cpuUsage?: number;
  memoryUsage?: number;
  queueDepth: number;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  
  // Severity
  severity: 'minor' | 'major' | 'critical';
  
  // Affected services
  affectedServices: string[];
  
  // Timeline
  startedAt: string;
  detectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  
  // Status
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  
  // Updates
  updates: {
    timestamp: string;
    message: string;
    status: Incident['status'];
  }[];
  
  // Impact
  impactedRuns?: number;
  impactedUsers?: number;
}

export interface Alert {
  id: string;
  type: 'budget' | 'rate_limit' | 'quota' | 'health' | 'error_rate';
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  // Content
  title: string;
  message: string;
  
  // Context
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  
  // Timing
  triggeredAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  
  // Status
  status: 'active' | 'acknowledged' | 'resolved';
}

// Filters
export interface CostFilters {
  dateFrom?: string;
  dateTo?: string;
  granularity?: TimeGranularity;
  teamId?: string;
  userId?: string;
  contractId?: string;
  environment?: string;
  model?: string;
}

export interface HealthFilters {
  status?: HealthStatus[];
  service?: string[];
}
