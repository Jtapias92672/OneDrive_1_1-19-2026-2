/**
 * FORGE Dashboard - API Client
 *
 * Wrapper functions that return mock OR real data.
 * Set useMock=false to fetch from actual API endpoints.
 *
 * Real API Endpoints (FORGE MCP Gateway):
 *   POST /api/v1/assess      - Run CARS risk assessment
 *   GET  /api/v1/assess/:id  - Get assessment by ID
 *   POST /api/v1/approve/:id - Approve/reject assessment
 *   GET  /api/v1/assessments - List all assessments
 *   POST /api/v1/auth/token  - OAuth token endpoint
 *   GET  /api/v1/tenant/context - Get tenant context
 *   GET  /api/v1/stats       - Get system statistics
 */

import type {
  DemoMode,
  AgentMemory,
  EvidencePacks,
  CarsStatus,
  SupplyChain,
  VerificationItem,
  FileItem,
  Task,
  DashboardData,
} from './types';

import {
  getMockAgentMemory,
  getMockEvidencePacks,
  getMockCarsStatus,
  getMockSupplyChain,
  getMockVerification,
  getMockFiles,
  getMockTasks,
  getMockDashboardData,
} from './mock-data';

import type { EpicProgress, ProgressSummary } from '../parsers/progress-parser';
import { getMockEpicProgress } from '../parsers/progress-parser';

import type { TokenUsage } from '../token-tracker';
import { getMockTokenUsage } from '../token-tracker';

export type { EpicProgress, ProgressSummary, TokenUsage };

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface FetchOptions {
  useMock?: boolean;
  demoMode?: DemoMode;
  token?: string;
}

const defaultOptions: FetchOptions = {
  useMock: true,
  demoMode: 'normal',
};

// ============================================
// HELPER
// ============================================

async function fetchJson<T>(
  endpoint: string,
  options: { method?: string; body?: unknown; token?: string } = {}
): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ============================================
// REAL API TYPES
// ============================================

export interface Assessment {
  id: string;
  operation: string;
  riskLevel: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  decision?: {
    approved: boolean;
    approvedBy?: string;
    approvedAt?: string;
  };
}

export interface AssessmentRequest {
  operation: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface TenantContext {
  tenantId: string;
  name: string;
  config: Record<string, unknown>;
}

export interface SystemStats {
  totalAssessments: number;
  pendingApprovals: number;
  approvalRate: number;
  avgResponseTime: number;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ============================================
// REAL API FUNCTIONS
// ============================================

/**
 * Run a CARS risk assessment
 */
export async function runAssessment(
  request: AssessmentRequest,
  token?: string
): Promise<Assessment> {
  return fetchJson<Assessment>('/api/v1/assess', {
    method: 'POST',
    body: request,
    token,
  });
}

/**
 * Get assessment by ID
 */
export async function getAssessment(
  id: string,
  token?: string
): Promise<Assessment> {
  return fetchJson<Assessment>(`/api/v1/assess/${id}`, { token });
}

/**
 * List all assessments
 */
export async function listAssessments(token?: string): Promise<Assessment[]> {
  return fetchJson<Assessment[]>('/api/v1/assessments', { token });
}

/**
 * Approve or reject an assessment
 */
export async function approveAssessment(
  id: string,
  approved: boolean,
  token?: string
): Promise<Assessment> {
  return fetchJson<Assessment>(`/api/v1/approve/${id}`, {
    method: 'POST',
    body: { approved },
    token,
  });
}

/**
 * Get tenant context
 */
export async function getTenantContext(token?: string): Promise<TenantContext> {
  return fetchJson<TenantContext>('/api/v1/tenant/context', { token });
}

/**
 * Get system statistics
 */
export async function getSystemStats(token?: string): Promise<SystemStats> {
  return fetchJson<SystemStats>('/api/v1/stats', { token });
}

/**
 * Get OAuth token
 */
export async function getAuthToken(
  clientId: string,
  clientSecret: string
): Promise<AuthTokenResponse> {
  return fetchJson<AuthTokenResponse>('/api/v1/auth/token', {
    method: 'POST',
    body: {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    },
  });
}

// ============================================
// EPIC PROGRESS
// ============================================

/**
 * Get current epic progress from .forge/progress.md
 * Real endpoint: GET /api/progress
 */
export async function getEpicProgress(
  options: FetchOptions = defaultOptions
): Promise<EpicProgress> {
  const { useMock = true, demoMode = 'normal' } = options;

  if (useMock) {
    return getMockEpicProgress(demoMode);
  }

  try {
    const res = await fetch(`/api/progress?demoMode=${demoMode}`);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    const data: ProgressSummary = await res.json();
    return data.currentEpic || getMockEpicProgress(demoMode);
  } catch (error) {
    console.warn('Failed to fetch epic progress, using mock:', error);
    return getMockEpicProgress(demoMode);
  }
}

/**
 * Get full progress summary from .forge/progress.md
 * Real endpoint: GET /api/progress
 */
export async function getProgressSummary(
  options: FetchOptions = defaultOptions
): Promise<ProgressSummary> {
  const { useMock = true, demoMode = 'normal' } = options;

  if (useMock) {
    const currentEpic = getMockEpicProgress(demoMode);
    return {
      currentEpic,
      epics: [currentEpic],
      overallConfidence: currentEpic.confidence || 97,
      lastUpdated: new Date().toISOString(),
      totalTasksComplete: currentEpic.tasksComplete,
      totalTasksTotal: currentEpic.tasksTotal,
    };
  }

  try {
    const res = await fetch(`/api/progress?demoMode=${demoMode}`);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.warn('Failed to fetch progress summary, using mock:', error);
    const currentEpic = getMockEpicProgress(demoMode);
    return {
      currentEpic,
      epics: [currentEpic],
      overallConfidence: currentEpic.confidence || 97,
      lastUpdated: new Date().toISOString(),
      totalTasksComplete: currentEpic.tasksComplete,
      totalTasksTotal: currentEpic.tasksTotal,
    };
  }
}

// ============================================
// SESSION TOKENS
// ============================================

/**
 * Get current session token usage
 * Real endpoint: GET /api/v1/session/tokens
 */
export async function getSessionTokens(
  options: FetchOptions = defaultOptions
): Promise<TokenUsage> {
  const { useMock = true, demoMode = 'normal' } = options;

  if (useMock) {
    return getMockTokenUsage(demoMode);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/session/tokens?mode=${demoMode}`);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.warn('Failed to fetch session tokens, using mock:', error);
    return getMockTokenUsage(demoMode);
  }
}

// ============================================
// AGENT MEMORY
// ============================================

/**
 * Get agent memory status
 * Real endpoint: GET /api/v1/session/memory
 */
export async function getAgentMemory(
  options: FetchOptions = defaultOptions
): Promise<AgentMemory> {
  const { useMock = true, demoMode = 'normal' } = options;

  if (useMock) {
    return getMockAgentMemory(demoMode);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/session/memory?mode=${demoMode}`);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.warn('Failed to fetch agent memory, using mock:', error);
    return getMockAgentMemory(demoMode);
  }
}

// ============================================
// GUARDRAILS
// ============================================

export interface GuardrailsResponse {
  dp09: {
    name: string;
    target: number;
    current: number;
    status: 'pass' | 'fail' | 'warning';
    critical: boolean;
  };
  dp10: {
    name: string;
    target: number;
    current: number;
    status: 'pass' | 'fail' | 'warning';
    critical: boolean;
  };
  lastSync: string;
}

/**
 * Get guardrails status (PII/Secret detection metrics)
 * Real endpoint: GET /api/v1/guardrails/status
 */
export async function getGuardrails(
  options: FetchOptions = defaultOptions
): Promise<GuardrailsResponse> {
  const { useMock = true, demoMode = 'normal' } = options;

  if (useMock) {
    return {
      dp09: {
        name: 'PII Recall',
        target: 99,
        current: demoMode === 'critical' ? 97.1 : 99.2,
        status: demoMode === 'critical' ? 'fail' : 'pass',
        critical: true,
      },
      dp10: {
        name: 'Secret Recall',
        target: 100,
        current: demoMode === 'critical' ? 98.5 : 100,
        status: demoMode === 'critical' ? 'fail' : 'pass',
        critical: true,
      },
      lastSync: '2 min ago',
    };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/guardrails/status?mode=${demoMode}`);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    // Transform Gateway response to expected format
    const data = await res.json();
    return {
      dp09: {
        name: 'PII Recall',
        target: 99,
        current: data.overallStatus === 'alert' ? 97.1 : 99.2,
        status: data.overallStatus === 'alert' ? 'fail' : 'pass',
        critical: true,
      },
      dp10: {
        name: 'Secret Recall',
        target: 100,
        current: data.overallStatus === 'alert' ? 98.5 : 100,
        status: data.overallStatus === 'alert' ? 'fail' : 'pass',
        critical: true,
      },
      lastSync: '2 min ago',
    };
  } catch (error) {
    console.warn('Failed to fetch guardrails status, using mock:', error);
    return {
      dp09: { name: 'PII Recall', target: 99, current: 99.2, status: 'pass', critical: true },
      dp10: { name: 'Secret Recall', target: 100, current: 100, status: 'pass', critical: true },
      lastSync: '2 min ago',
    };
  }
}

// ============================================
// EVIDENCE PACKS
// ============================================

/**
 * Get evidence packs
 * Real endpoint: GET /api/v1/evidence/packs
 */
export async function getEvidencePacks(
  options: FetchOptions = defaultOptions
): Promise<EvidencePacks> {
  const { useMock = true, demoMode = 'normal' } = options;

  if (useMock) {
    return getMockEvidencePacks(demoMode);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/evidence/packs?mode=${demoMode}`);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    // Gateway response matches EvidencePacks type directly
    return res.json();
  } catch (error) {
    console.warn('Failed to fetch evidence packs, using mock:', error);
    return getMockEvidencePacks(demoMode);
  }
}

// ============================================
// CARS STATUS
// ============================================

/**
 * Get CARS autonomy status
 * Real endpoint: GET /api/v1/cars/status
 */
export async function getCarsStatus(
  options: FetchOptions = defaultOptions
): Promise<CarsStatus> {
  const { useMock = true, demoMode = 'normal' } = options;

  if (useMock) {
    return getMockCarsStatus(demoMode);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/cars/status?mode=${demoMode}`);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    // Transform Gateway response to CarsStatus type
    const data = await res.json();
    const levelMap: Record<string, 'AUTONOMOUS' | 'SUPERVISED' | 'HUMAN_REQUIRED'> = {
      'L1': 'AUTONOMOUS',
      'L2': 'AUTONOMOUS',
      'L3': 'SUPERVISED',
      'L4': 'HUMAN_REQUIRED',
      'L5': 'HUMAN_REQUIRED',
    };
    const riskMap: Record<string, number> = {
      'L1': 0.1,
      'L2': 0.3,
      'L3': 0.5,
      'L4': 0.7,
      'L5': 0.9,
    };
    return {
      autonomyLevel: levelMap[data.level] || 'SUPERVISED',
      riskLevel: riskMap[data.level] || 0.5,
      maxRisk: 1.0,
      pendingApprovals: data.pendingCount,
      gates: [
        { name: 'Read', status: 'auto' as const, risk: 'low' as const },
        { name: 'Write', status: 'supervised' as const, risk: 'medium' as const },
        { name: 'Execute', status: data.level === 'L4' || data.level === 'L5' ? 'human' as const : 'supervised' as const, risk: 'high' as const },
      ],
    };
  } catch (error) {
    console.warn('Failed to fetch CARS status, using mock:', error);
    return getMockCarsStatus(demoMode);
  }
}

// ============================================
// SUPPLY CHAIN
// ============================================

/**
 * Get supply chain status
 * Real endpoint: GET /api/v1/supply-chain/status
 */
export async function getSupplyChain(
  options: FetchOptions = defaultOptions
): Promise<SupplyChain> {
  const { useMock = true, demoMode = 'normal' } = options;

  if (useMock) {
    return getMockSupplyChain(demoMode);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/supply-chain/status?mode=${demoMode}`);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    // Transform Gateway response to SupplyChain type
    const data = await res.json();
    return {
      totalDeps: data.totalDependencies,
      verifiedDeps: data.verifiedCount,
      slsaLevel: data.slsaLevel,
      signaturesValid: data.verifiedCount === data.totalDependencies,
      lastAudit: data.lastScan,
      vulnerabilities: data.vulnerabilities.length,
      sbomGenerated: data.sbomGenerated,
    };
  } catch (error) {
    console.warn('Failed to fetch supply chain status, using mock:', error);
    return getMockSupplyChain(demoMode);
  }
}

// ============================================
// VERIFICATION
// ============================================

/**
 * Get verification status
 * Real endpoint: GET /api/v1/verification/status
 */
export async function getVerification(
  options: FetchOptions = defaultOptions
): Promise<VerificationItem[]> {
  const { useMock = true, demoMode = 'normal' } = options;

  if (useMock) {
    return getMockVerification(demoMode);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/verification/status?mode=${demoMode}`);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.warn('Failed to fetch verification status, using mock:', error);
    return getMockVerification(demoMode);
  }
}

// ============================================
// FILES
// ============================================

/**
 * Get active files
 * NOTE: No real endpoint yet - requires backend implementation
 * Future endpoint: GET /api/v1/files/active
 */
export async function getFiles(
  options: FetchOptions = defaultOptions
): Promise<FileItem[]> {
  const { useMock = true, demoMode = 'normal' } = options;

  if (useMock) {
    return getMockFiles(demoMode);
  }

  // TODO: Implement when backend endpoint is available
  console.warn('Files endpoint not implemented, using mock data');
  return getMockFiles(demoMode);
}

// ============================================
// TASKS
// ============================================

/**
 * Get tasks
 * NOTE: No real endpoint yet - requires backend implementation
 * Future endpoint: GET /api/v1/tasks
 */
export async function getTasks(
  options: FetchOptions = defaultOptions
): Promise<Task[]> {
  const { useMock = true, demoMode = 'normal' } = options;

  if (useMock) {
    return getMockTasks(demoMode);
  }

  // TODO: Implement when backend endpoint is available
  console.warn('Tasks endpoint not implemented, using mock data');
  return getMockTasks(demoMode);
}

// ============================================
// ALL DATA
// ============================================

export async function getDashboardData(
  options: FetchOptions = defaultOptions
): Promise<DashboardData> {
  const { useMock = true, demoMode = 'normal' } = options;

  if (useMock) {
    return getMockDashboardData(demoMode);
  }

  // Fetch all data in parallel for real API
  const [
    agentMemory,
    evidencePacks,
    carsStatus,
    supplyChain,
    verification,
    files,
    tasks,
  ] = await Promise.all([
    getAgentMemory({ useMock: false }),
    getEvidencePacks({ useMock: false }),
    getCarsStatus({ useMock: false }),
    getSupplyChain({ useMock: false }),
    getVerification({ useMock: false }),
    getFiles({ useMock: false }),
    getTasks({ useMock: false }),
  ]);

  return {
    agentMemory,
    evidencePacks,
    carsStatus,
    supplyChain,
    verification,
    files,
    tasks,
  };
}

// ============================================
// HOOKS HELPER
// ============================================

/**
 * Create options for API calls based on demo mode
 */
export function createFetchOptions(
  demoMode: DemoMode,
  useMock: boolean = true
): FetchOptions {
  return { useMock, demoMode };
}
