/**
 * FORGE MCP Gateway - API Routes
 *
 * REST API endpoints for CARS assessment, security, and tenant operations.
 */

import * as http from 'http';
import * as crypto from 'crypto';
import {
  httpRequestsTotal,
  carsAssessmentsTotal,
  carsAssessmentDuration,
  carsPendingApprovals,
  securityAlertsTotal,
  activeSessions,
  authAttemptsTotal,
  tenantRequestsTotal,
  recordCarsAssessment,
  recordSecurityAlert,
} from '../metrics/index.js';
import {
  AgentRegistry,
  AgentStatus,
  AgentType,
  TaskStatus,
  recordAgentCreated,
  recordAgentStarted,
  recordAgentCompleted,
  recordTaskStarted,
  recordTaskCompleted,
  recordAgentTask,
  getAgentMetricsSummary,
  type AgentListOptions,
  type RegisterAgentRequest,
  type UpdateAgentRequest,
} from '../src/agents/index.js';
import {
  SkillRegistry,
  SkillCategory,
  recordSkillRecommended,
} from '../src/skills/index.js';

// ============================================
// TYPES
// ============================================

interface AssessmentRequest {
  tool: string;
  params: Record<string, unknown>;
  userId?: string;
  tenantId?: string;
}

interface Assessment {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  riskLevel: 'L1_MINIMAL' | 'L2_LOW' | 'L3_MEDIUM' | 'L4_HIGH' | 'L5_CRITICAL';
  riskScore: number;
  action: 'PROCEED' | 'NOTIFY' | 'REQUIRE_APPROVAL' | 'BLOCK';
  factors: string[];
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvedBy?: string;
  approvedAt?: string;
}

interface TokenRequest {
  grant_type: string;
  client_id?: string;
  client_secret?: string;
  code?: string;
  refresh_token?: string;
}

// ============================================
// DASHBOARD TYPES
// ============================================

interface DashboardMessage {
  id: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'pending' | 'failed';
}

interface UploadedFile {
  id: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

// ============================================
// IN-MEMORY STORES
// ============================================

const assessments = new Map<string, Assessment>();
const sessions = new Map<string, { userId: string; tenantId: string; createdAt: string }>();
const messages = new Map<string, DashboardMessage>();
const uploads = new Map<string, UploadedFile>();

// Initialize some test sessions
sessions.set('session-1', { userId: 'user-1', tenantId: 'tenant-abc', createdAt: new Date().toISOString() });
sessions.set('session-2', { userId: 'user-2', tenantId: 'tenant-xyz', createdAt: new Date().toISOString() });
activeSessions.set(sessions.size);

// ============================================
// RISK ASSESSMENT LOGIC
// ============================================

const TOOL_RISK_LEVELS: Record<string, { level: Assessment['riskLevel']; score: number }> = {
  // L1 - Minimal risk (read-only, no side effects)
  'read_file': { level: 'L1_MINIMAL', score: 0.1 },
  'list_files': { level: 'L1_MINIMAL', score: 0.1 },
  'search': { level: 'L1_MINIMAL', score: 0.1 },
  'get_info': { level: 'L1_MINIMAL', score: 0.1 },

  // L2 - Low risk (limited writes, reversible)
  'write_file': { level: 'L2_LOW', score: 0.3 },
  'create_file': { level: 'L2_LOW', score: 0.3 },
  'update_record': { level: 'L2_LOW', score: 0.3 },

  // L3 - Medium risk (significant changes, needs review)
  'delete_file': { level: 'L3_MEDIUM', score: 0.5 },
  'modify_config': { level: 'L3_MEDIUM', score: 0.5 },
  'send_email': { level: 'L3_MEDIUM', score: 0.5 },
  'execute_code': { level: 'L3_MEDIUM', score: 0.6 },

  // L4 - High risk (system access, external effects)
  'execute_shell': { level: 'L4_HIGH', score: 0.8 },
  'database_query': { level: 'L4_HIGH', score: 0.7 },
  'api_call': { level: 'L4_HIGH', score: 0.7 },
  'deploy': { level: 'L4_HIGH', score: 0.9 },

  // L5 - Critical (admin, destructive)
  'admin_action': { level: 'L5_CRITICAL', score: 1.0 },
  'delete_database': { level: 'L5_CRITICAL', score: 1.0 },
  'system_shutdown': { level: 'L5_CRITICAL', score: 1.0 },
};

function assessRisk(tool: string, params: Record<string, unknown>): Omit<Assessment, 'id' | 'createdAt' | 'status'> {
  const toolRisk = TOOL_RISK_LEVELS[tool] || { level: 'L3_MEDIUM' as const, score: 0.5 };
  const factors: string[] = [];
  let riskScore = toolRisk.score;

  // Check for dangerous patterns in params
  const paramsStr = JSON.stringify(params).toLowerCase();

  if (paramsStr.includes('rm -rf') || paramsStr.includes('delete')) {
    factors.push('Destructive operation detected');
    riskScore = Math.min(1.0, riskScore + 0.3);
  }

  if (paramsStr.includes('/etc/') || paramsStr.includes('/var/')) {
    factors.push('System path access');
    riskScore = Math.min(1.0, riskScore + 0.2);
  }

  if (paramsStr.includes('password') || paramsStr.includes('secret') || paramsStr.includes('token')) {
    factors.push('Sensitive data in parameters');
    riskScore = Math.min(1.0, riskScore + 0.2);
  }

  // Determine action based on risk level
  let action: Assessment['action'];
  let level = toolRisk.level;

  // Upgrade level if risk score increased
  if (riskScore >= 0.9) {
    level = 'L5_CRITICAL';
    action = 'BLOCK';
    factors.push('Risk score exceeds critical threshold');
  } else if (riskScore >= 0.7) {
    level = 'L4_HIGH';
    action = 'REQUIRE_APPROVAL';
  } else if (riskScore >= 0.5) {
    level = 'L3_MEDIUM';
    action = 'REQUIRE_APPROVAL';
  } else if (riskScore >= 0.3) {
    level = 'L2_LOW';
    action = 'NOTIFY';
  } else {
    level = 'L1_MINIMAL';
    action = 'PROCEED';
  }

  factors.push(`Tool base risk: ${toolRisk.level}`);
  factors.push(`Final risk score: ${riskScore.toFixed(2)}`);

  return {
    tool,
    params,
    riskLevel: level,
    riskScore,
    action,
    factors,
  };
}

// ============================================
// REQUEST HELPERS
// ============================================

async function parseJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

function getPathParam(pathname: string, pattern: string): string | null {
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');

  if (patternParts.length !== pathParts.length) return null;

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i]?.startsWith(':')) {
      return pathParts[i] || null;
    }
    if (patternParts[i] !== pathParts[i]) return null;
  }
  return null;
}

// ============================================
// ROUTE HANDLERS
// ============================================

// POST /api/v1/assess - Create new risk assessment
async function handleAssess(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const startTime = Date.now();

  try {
    const body = await parseJsonBody(req) as AssessmentRequest;

    if (!body.tool) {
      sendJson(res, 400, { error: 'Missing required field: tool' });
      return;
    }

    const assessment = assessRisk(body.tool, body.params || {});
    const id = crypto.randomUUID();

    const fullAssessment: Assessment = {
      id,
      ...assessment,
      createdAt: new Date().toISOString(),
      status: assessment.action === 'REQUIRE_APPROVAL' ? 'pending' : 'completed',
    };

    assessments.set(id, fullAssessment);

    if (fullAssessment.status === 'pending') {
      carsPendingApprovals.inc();
    }

    // Record metrics
    const duration = Date.now() - startTime;
    recordCarsAssessment(
      fullAssessment.riskLevel,
      fullAssessment.action,
      fullAssessment.tool,
      duration
    );

    // Record security alert for high/critical
    if (fullAssessment.riskLevel === 'L4_HIGH' || fullAssessment.riskLevel === 'L5_CRITICAL') {
      recordSecurityAlert('CARS_HIGH_RISK', fullAssessment.riskLevel === 'L5_CRITICAL' ? 'CRITICAL' : 'HIGH');
    }

    // Track tenant requests if provided
    if (body.tenantId) {
      tenantRequestsTotal.inc({ tenant_id: body.tenantId });
    }

    sendJson(res, 201, fullAssessment);
  } catch (error) {
    sendJson(res, 400, { error: (error as Error).message });
  }
}

// GET /api/v1/assess/:id - Get assessment by ID
function handleGetAssessment(req: http.IncomingMessage, res: http.ServerResponse, id: string): void {
  const assessment = assessments.get(id);

  if (!assessment) {
    sendJson(res, 404, { error: 'Assessment not found' });
    return;
  }

  sendJson(res, 200, assessment);
}

// POST /api/v1/approve/:id - Approve pending assessment
async function handleApprove(req: http.IncomingMessage, res: http.ServerResponse, id: string): Promise<void> {
  const assessment = assessments.get(id);

  if (!assessment) {
    sendJson(res, 404, { error: 'Assessment not found' });
    return;
  }

  if (assessment.status !== 'pending') {
    sendJson(res, 400, { error: `Assessment is not pending (status: ${assessment.status})` });
    return;
  }

  try {
    const body = await parseJsonBody(req) as { approvedBy?: string; approve?: boolean };

    if (body.approve === false) {
      assessment.status = 'rejected';
      carsPendingApprovals.dec();
      recordSecurityAlert('APPROVAL_REJECTED', 'MEDIUM');
      sendJson(res, 200, { ...assessment, message: 'Assessment rejected' });
      return;
    }

    assessment.status = 'approved';
    assessment.approvedBy = body.approvedBy || 'system';
    assessment.approvedAt = new Date().toISOString();
    carsPendingApprovals.dec();

    sendJson(res, 200, { ...assessment, message: 'Assessment approved' });
  } catch (error) {
    sendJson(res, 400, { error: (error as Error).message });
  }
}

// POST /api/v1/auth/token - OAuth token endpoint
async function handleToken(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const body = await parseJsonBody(req) as TokenRequest;

    if (!body.grant_type) {
      authAttemptsTotal.inc({ result: 'failure', method: 'unknown' });
      sendJson(res, 400, { error: 'invalid_request', error_description: 'Missing grant_type' });
      return;
    }

    // Simulate token generation
    if (body.grant_type === 'client_credentials') {
      if (!body.client_id || !body.client_secret) {
        authAttemptsTotal.inc({ result: 'failure', method: 'client_credentials' });
        sendJson(res, 401, { error: 'invalid_client', error_description: 'Missing credentials' });
        return;
      }

      // Generate mock token
      const accessToken = crypto.randomBytes(32).toString('hex');
      const sessionId = crypto.randomUUID();

      sessions.set(sessionId, {
        userId: body.client_id,
        tenantId: `tenant-${body.client_id}`,
        createdAt: new Date().toISOString(),
      });
      activeSessions.set(sessions.size);
      authAttemptsTotal.inc({ result: 'success', method: 'client_credentials' });

      sendJson(res, 200, {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        session_id: sessionId,
      });
      return;
    }

    if (body.grant_type === 'refresh_token') {
      if (!body.refresh_token) {
        authAttemptsTotal.inc({ result: 'failure', method: 'refresh_token' });
        sendJson(res, 400, { error: 'invalid_request', error_description: 'Missing refresh_token' });
        return;
      }

      const accessToken = crypto.randomBytes(32).toString('hex');
      authAttemptsTotal.inc({ result: 'success', method: 'refresh_token' });

      sendJson(res, 200, {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
      });
      return;
    }

    authAttemptsTotal.inc({ result: 'failure', method: body.grant_type });
    sendJson(res, 400, { error: 'unsupported_grant_type' });
  } catch (error) {
    authAttemptsTotal.inc({ result: 'failure', method: 'unknown' });
    sendJson(res, 400, { error: (error as Error).message });
  }
}

// GET /api/v1/tenant/context - Get tenant context
function handleTenantContext(req: http.IncomingMessage, res: http.ServerResponse): void {
  // Extract tenant from header or use default
  const tenantId = req.headers['x-tenant-id'] as string || 'default-tenant';
  const userId = req.headers['x-user-id'] as string || 'anonymous';

  tenantRequestsTotal.inc({ tenant_id: tenantId });

  sendJson(res, 200, {
    tenantId,
    userId,
    dataIsolationBoundary: 'tenant',
    allowedTools: ['read_file', 'write_file', 'search', 'execute_code'],
    quotas: {
      requestsPerMinute: 100,
      maxConcurrent: 10,
    },
    metadata: {
      tier: 'standard',
      region: 'us-west-2',
    },
  });
}

// GET /api/v1/assessments - List all assessments
function handleListAssessments(req: http.IncomingMessage, res: http.ServerResponse): void {
  const list = Array.from(assessments.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100);

  sendJson(res, 200, {
    total: assessments.size,
    items: list,
  });
}

// GET /api/v1/stats - Get system stats
function handleStats(req: http.IncomingMessage, res: http.ServerResponse): void {
  const assessmentsList = Array.from(assessments.values());
  const byLevel = {
    L1_MINIMAL: 0,
    L2_LOW: 0,
    L3_MEDIUM: 0,
    L4_HIGH: 0,
    L5_CRITICAL: 0,
  };

  assessmentsList.forEach(a => {
    byLevel[a.riskLevel]++;
  });

  sendJson(res, 200, {
    assessments: {
      total: assessments.size,
      pending: assessmentsList.filter(a => a.status === 'pending').length,
      approved: assessmentsList.filter(a => a.status === 'approved').length,
      rejected: assessmentsList.filter(a => a.status === 'rejected').length,
      byLevel,
    },
    sessions: {
      active: sessions.size,
    },
    uptime: process.uptime(),
  });
}

// ============================================
// AGENT HANDLERS
// ============================================

// Helper to parse query params
function parseQueryParams(url: string): URLSearchParams {
  const queryIndex = url.indexOf('?');
  return new URLSearchParams(queryIndex >= 0 ? url.slice(queryIndex + 1) : '');
}

// GET /api/v1/agents - List all agents with pagination
function handleListAgents(req: http.IncomingMessage, res: http.ServerResponse): void {
  const query = parseQueryParams(req.url || '');

  const options: AgentListOptions = {
    page: parseInt(query.get('page') || '1', 10),
    limit: Math.min(parseInt(query.get('limit') || '20', 10), 100),
    type: query.get('type') as AgentType || undefined,
    status: query.get('status') as AgentStatus || undefined,
    sortBy: (query.get('sortBy') as AgentListOptions['sortBy']) || 'createdAt',
    sortOrder: (query.get('sortOrder') as 'asc' | 'desc') || 'desc',
  };

  const result = AgentRegistry.listAgents(options);
  const summary = getAgentMetricsSummary();

  sendJson(res, 200, {
    ...result,
    summary: {
      totalCreated: summary.totalCreated,
      active: summary.activeCount,
      running: summary.runningCount,
      completed: summary.completedCount,
      failed: summary.failedCount,
    },
  });
}

// GET /api/v1/agents/active - List running agents
function handleListActiveAgents(req: http.IncomingMessage, res: http.ServerResponse): void {
  const agents = AgentRegistry.getActiveAgents();

  sendJson(res, 200, {
    count: agents.length,
    agents: agents.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      status: a.status,
      taskCount: a.taskCount,
      completedTasks: a.completedTasks,
      failedTasks: a.failedTasks,
      currentTask: a.currentTask ? {
        id: a.currentTask.id,
        type: a.currentTask.type,
        status: a.currentTask.status,
        startedAt: a.currentTask.startedAt,
      } : null,
      createdAt: a.createdAt,
      startedAt: a.startedAt,
      lastActiveAt: a.lastActiveAt,
    })),
  });
}

// GET /api/v1/agents/stats - Get aggregate statistics
function handleAgentStats(req: http.IncomingMessage, res: http.ServerResponse): void {
  const stats = AgentRegistry.getAgentStats();
  sendJson(res, 200, stats);
}

// GET /api/v1/agents/:id - Get agent details
function handleGetAgent(req: http.IncomingMessage, res: http.ServerResponse, id: string): void {
  const agent = AgentRegistry.getAgent(id);

  if (!agent) {
    sendJson(res, 404, { error: 'Agent not found' });
    return;
  }

  const tasks = AgentRegistry.getAgentTasks(id);

  sendJson(res, 200, {
    ...agent,
    tasks: tasks.map(t => ({
      id: t.id,
      type: t.type,
      status: t.status,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      error: t.error,
    })),
  });
}

// POST /api/v1/agents - Register new agent
async function handleRegisterAgent(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const body = await parseJsonBody(req) as RegisterAgentRequest;

    if (!body.name) {
      sendJson(res, 400, { error: 'Missing required field: name' });
      return;
    }

    const id = crypto.randomUUID();
    const agentType = body.type || AgentType.GENERIC;

    const agent = AgentRegistry.registerAgent(id, body.name, agentType, body.metadata);
    AgentRegistry.startAgent(id);

    recordAgentCreated(agent.type);
    recordAgentStarted(agent.type);

    sendJson(res, 201, {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status,
      createdAt: agent.createdAt,
      startedAt: agent.startedAt,
      message: 'Agent registered and started',
    });
  } catch (error) {
    sendJson(res, 400, { error: (error as Error).message });
  }
}

// PATCH /api/v1/agents/:id - Update agent (assign task, change status)
async function handleUpdateAgent(req: http.IncomingMessage, res: http.ServerResponse, id: string): Promise<void> {
  const agent = AgentRegistry.getAgent(id);

  if (!agent) {
    sendJson(res, 404, { error: 'Agent not found' });
    return;
  }

  try {
    const body = await parseJsonBody(req) as UpdateAgentRequest;

    // Handle task assignment
    if (body.currentTask) {
      const task = AgentRegistry.startTask(
        id,
        body.currentTask.type,
        body.currentTask.id,
        body.currentTask.metadata
      );

      if (task) {
        recordTaskStarted(agent.type, task.type);
      }
    }

    // Handle status change
    if (body.status === AgentStatus.COMPLETED || body.status === AgentStatus.ERROR) {
      const startTime = agent.startedAt || agent.createdAt;
      const duration = Date.now() - startTime.getTime();

      AgentRegistry.unregisterAgent(id, body.status === AgentStatus.ERROR ? 'error' : 'completed');
      recordAgentCompleted(agent.type, body.status === AgentStatus.ERROR ? 'error' : 'completed', duration);
    }

    const updatedAgent = AgentRegistry.getAgent(id);
    sendJson(res, 200, {
      ...updatedAgent,
      message: 'Agent updated',
    });
  } catch (error) {
    sendJson(res, 400, { error: (error as Error).message });
  }
}

// DELETE /api/v1/agents/:id - Unregister agent
function handleUnregisterAgent(req: http.IncomingMessage, res: http.ServerResponse, id: string): void {
  const agent = AgentRegistry.getAgent(id);

  if (!agent) {
    sendJson(res, 404, { error: 'Agent not found' });
    return;
  }

  if (agent.status === AgentStatus.COMPLETED || agent.status === AgentStatus.ERROR) {
    sendJson(res, 400, { error: `Agent already ${agent.status}` });
    return;
  }

  const startTime = agent.startedAt || agent.createdAt;
  const duration = Date.now() - startTime.getTime();

  AgentRegistry.unregisterAgent(id, 'completed');
  recordAgentCompleted(agent.type, 'completed', duration);

  sendJson(res, 200, {
    id: agent.id,
    name: agent.name,
    status: AgentStatus.COMPLETED,
    duration: duration,
    taskCount: agent.taskCount,
    completedTasks: agent.completedTasks,
    failedTasks: agent.failedTasks,
    message: 'Agent unregistered',
  });
}

// POST /api/v1/agents/:id/task - Start a new task
async function handleStartTask(req: http.IncomingMessage, res: http.ServerResponse, id: string): Promise<void> {
  const agent = AgentRegistry.getAgent(id);

  if (!agent) {
    sendJson(res, 404, { error: 'Agent not found' });
    return;
  }

  try {
    const body = await parseJsonBody(req) as { type: string; id?: string; metadata?: Record<string, unknown> };

    if (!body.type) {
      sendJson(res, 400, { error: 'Missing required field: type' });
      return;
    }

    const task = AgentRegistry.startTask(id, body.type, body.id, body.metadata);

    if (!task) {
      sendJson(res, 400, { error: 'Failed to start task' });
      return;
    }

    recordTaskStarted(agent.type, task.type);

    sendJson(res, 201, {
      id: task.id,
      agentId: task.agentId,
      type: task.type,
      status: task.status,
      startedAt: task.startedAt,
    });
  } catch (error) {
    sendJson(res, 400, { error: (error as Error).message });
  }
}

// PATCH /api/v1/agents/:id/task/:taskId - Update task status
async function handleUpdateTask(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  agentId: string,
  taskId: string
): Promise<void> {
  const agent = AgentRegistry.getAgent(agentId);

  if (!agent) {
    sendJson(res, 404, { error: 'Agent not found' });
    return;
  }

  try {
    const body = await parseJsonBody(req) as { status: TaskStatus; result?: unknown; error?: string };

    if (!body.status) {
      sendJson(res, 400, { error: 'Missing required field: status' });
      return;
    }

    const task = AgentRegistry.updateAgentTask(agentId, taskId, body.status, body.result, body.error);

    if (!task) {
      sendJson(res, 404, { error: 'Task not found' });
      return;
    }

    // Record metrics if task completed
    if (body.status === TaskStatus.COMPLETED || body.status === TaskStatus.FAILED) {
      const duration = task.completedAt && task.startedAt
        ? task.completedAt.getTime() - task.startedAt.getTime()
        : undefined;
      recordTaskCompleted(agent.type, task.type, body.status, duration);
    }

    sendJson(res, 200, {
      id: task.id,
      agentId: task.agentId,
      type: task.type,
      status: task.status,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      error: task.error,
    });
  } catch (error) {
    sendJson(res, 400, { error: (error as Error).message });
  }
}

// ============================================
// SKILLS HANDLERS
// ============================================

// Initialize skills registry on first request
let skillsInitialized = false;
async function ensureSkillsInitialized(): Promise<void> {
  if (!skillsInitialized) {
    await SkillRegistry.initialize();
    skillsInitialized = true;
  }
}

// GET /api/v1/skills - List all skills
async function handleListSkills(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  await ensureSkillsInitialized();

  const query = parseQueryParams(req.url || '');
  const category = query.get('category') as SkillCategory | null;

  let skills = SkillRegistry.listSkills();

  if (category) {
    skills = skills.filter(s => s.category === category);
  }

  const stats = SkillRegistry.getStats();

  sendJson(res, 200, {
    total: skills.length,
    skills,
    stats,
  });
}

// GET /api/v1/skills/:name - Get skill details
async function handleGetSkill(req: http.IncomingMessage, res: http.ServerResponse, name: string): Promise<void> {
  await ensureSkillsInitialized();

  const skill = await SkillRegistry.loadSkill(name);

  if (!skill) {
    sendJson(res, 404, { error: 'Skill not found' });
    return;
  }

  const relatedSkills = SkillRegistry.getRelatedSkills(name);

  sendJson(res, 200, {
    ...skill,
    relatedSkills,
  });
}

// GET /api/v1/skills/:name/references - Get skill references
async function handleGetSkillReferences(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  name: string
): Promise<void> {
  await ensureSkillsInitialized();

  const references = await SkillRegistry.getSkillReferences(name);

  if (references.length === 0) {
    const skill = SkillRegistry.getSkill(name);
    if (!skill) {
      sendJson(res, 404, { error: 'Skill not found' });
      return;
    }
  }

  // Return references without full content by default
  const query = parseQueryParams(req.url || '');
  const includeContent = query.get('includeContent') === 'true';

  const result = references.map(r => ({
    filename: r.filename,
    path: r.path,
    category: r.category,
    size: r.size,
    lastModified: r.lastModified,
    ...(includeContent ? { content: r.content } : {}),
  }));

  sendJson(res, 200, {
    skill: name,
    total: references.length,
    references: result,
  });
}

// GET /api/v1/skills/:name/references/:filename - Get specific reference
async function handleGetSkillReference(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  skillName: string,
  filename: string
): Promise<void> {
  await ensureSkillsInitialized();

  const reference = await SkillRegistry.getReference(skillName, filename);

  if (!reference) {
    sendJson(res, 404, { error: 'Reference not found' });
    return;
  }

  sendJson(res, 200, reference);
}

// POST /api/v1/skills/recommend - Recommend skill for task
async function handleRecommendSkill(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  await ensureSkillsInitialized();

  try {
    const body = await parseJsonBody(req) as { task: string };

    if (!body.task) {
      sendJson(res, 400, { error: 'Missing required field: task' });
      return;
    }

    const recommendations = SkillRegistry.getSkillForTask(body.task);

    // Record metrics
    for (const rec of recommendations) {
      recordSkillRecommended(rec.skill.name);
    }

    sendJson(res, 200, {
      task: body.task,
      recommendations,
    });
  } catch (error) {
    sendJson(res, 400, { error: (error as Error).message });
  }
}

// GET /api/v1/skills/stats - Get skills statistics
async function handleSkillsStats(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  await ensureSkillsInitialized();
  const stats = SkillRegistry.getStats();
  sendJson(res, 200, stats);
}

// ============================================
// DASHBOARD HANDLERS
// ============================================

// GET /api/v1/evidence/packs - Get evidence pack data for dashboard
function handleGetEvidencePacks(req: http.IncomingMessage, res: http.ServerResponse): void {
  const query = parseQueryParams(req.url || '');
  const mode = query.get('mode') || 'normal';

  // Generate mock evidence packs based on mode
  const sessionPacks = mode === 'critical' ? 8 : mode === 'warning' ? 5 : 3;
  const epicTotal = 12;
  const cmmcReady = mode !== 'critical';
  const dfarsCompliant = mode !== 'critical';
  const lastGenerated = mode === 'critical' ? '15 min ago' : '2 min ago';

  const recentPacks = [
    { id: 'EP-001', task: 'API Gateway Security Review', timestamp: '2 min ago', size: '45 KB', signed: true },
    { id: 'EP-002', task: 'Supply Chain Verification', timestamp: '8 min ago', size: '32 KB', signed: true },
    { id: 'EP-003', task: 'Compliance Check Results', timestamp: '15 min ago', size: '28 KB', signed: mode !== 'critical' },
  ];

  sendJson(res, 200, {
    sessionPacks,
    epicTotal,
    cmmcReady,
    dfarsCompliant,
    lastGenerated,
    recentPacks,
  });
}

// GET /api/v1/cars/status - Get CARS risk assessment status
function handleGetCarsStatus(req: http.IncomingMessage, res: http.ServerResponse): void {
  const query = parseQueryParams(req.url || '');
  const mode = query.get('mode') || 'normal';

  // Get pending assessments
  const pendingList = Array.from(assessments.values())
    .filter(a => a.status === 'pending')
    .slice(0, 5)
    .map(a => ({
      id: a.id,
      tool: a.tool,
      riskLevel: a.riskLevel,
      action: a.action,
      createdAt: a.createdAt,
    }));

  // Calculate stats
  const assessmentList = Array.from(assessments.values());
  const byLevel = {
    L1: assessmentList.filter(a => a.riskLevel === 'L1_MINIMAL').length,
    L2: assessmentList.filter(a => a.riskLevel === 'L2_LOW').length,
    L3: assessmentList.filter(a => a.riskLevel === 'L3_MEDIUM').length,
    L4: assessmentList.filter(a => a.riskLevel === 'L4_HIGH').length,
    L5: assessmentList.filter(a => a.riskLevel === 'L5_CRITICAL').length,
  };

  // Determine current level based on mode
  const level = mode === 'critical' ? 'L4' : mode === 'warning' ? 'L3' : 'L2';
  const agentAutonomy = mode === 'critical' ? 65 : mode === 'warning' ? 78 : 85;
  const humanOversight = 100 - agentAutonomy;

  sendJson(res, 200, {
    level,
    pendingApprovals: pendingList,
    pendingCount: pendingList.length,
    stats: {
      total: assessmentList.length,
      byLevel,
      approved: assessmentList.filter(a => a.status === 'approved').length,
      rejected: assessmentList.filter(a => a.status === 'rejected').length,
    },
    agentAutonomy,
    humanOversight,
  });
}

// GET /api/v1/supply-chain/status - Get supply chain verification status
function handleGetSupplyChainStatus(req: http.IncomingMessage, res: http.ServerResponse): void {
  const query = parseQueryParams(req.url || '');
  const mode = query.get('mode') || 'normal';

  const slsaLevel = mode === 'critical' ? 2 : 3;
  const sbomGenerated = mode !== 'critical';
  const lastScan = mode === 'critical' ? '2 hours ago' : '5 min ago';

  const dependencies = [
    { name: '@anthropic/mcp-sdk', version: '1.2.0', verified: true, license: 'MIT' },
    { name: 'typescript', version: '5.3.0', verified: true, license: 'Apache-2.0' },
    { name: 'zod', version: '3.22.0', verified: true, license: 'MIT' },
  ];

  const vulnerabilities = mode === 'critical' ? [
    { id: 'CVE-2024-0001', severity: 'HIGH', package: 'lodash', fixAvailable: true },
    { id: 'CVE-2024-0002', severity: 'MEDIUM', package: 'axios', fixAvailable: true },
  ] : mode === 'warning' ? [
    { id: 'CVE-2024-0003', severity: 'LOW', package: 'minimist', fixAvailable: true },
  ] : [];

  sendJson(res, 200, {
    slsaLevel,
    sbomGenerated,
    lastScan,
    dependencies,
    vulnerabilities,
    totalDependencies: 47,
    verifiedCount: mode === 'critical' ? 42 : 47,
  });
}

// GET /api/v1/session/tokens - Get token usage for session
function handleGetSessionTokens(req: http.IncomingMessage, res: http.ServerResponse): void {
  const query = parseQueryParams(req.url || '');
  const mode = query.get('mode') || 'normal';

  const optimal = 15000;
  const warning = 30000;
  const danger = 40000;

  let current: number;
  let status: 'optimal' | 'warning' | 'danger';

  if (mode === 'critical') {
    current = 35000;
    status = 'danger';
  } else if (mode === 'warning') {
    current = 22000;
    status = 'warning';
  } else {
    current = 8500;
    status = 'optimal';
  }

  const breakdown = {
    systemPrompt: 2500,
    conversation: current - 2500 - 1500 - 500,
    tools: 1500,
    context: 500,
  };

  sendJson(res, 200, {
    current,
    optimal,
    warning,
    danger,
    status,
    breakdown,
    lastUpdated: new Date().toISOString(),
  });
}

// GET /api/v1/guardrails/status - Get guardrail status (DP-09, DP-10)
function handleGetGuardrailsStatus(req: http.IncomingMessage, res: http.ServerResponse): void {
  const query = parseQueryParams(req.url || '');
  const mode = query.get('mode') || 'normal';

  const guardrails = [
    {
      id: 'DP-09',
      name: 'CARS Risk Assessment',
      status: 'active',
      lastTriggered: mode === 'critical' ? '1 min ago' : '30 min ago',
      triggerCount: mode === 'critical' ? 12 : mode === 'warning' ? 5 : 2,
    },
    {
      id: 'DP-10',
      name: 'Human Oversight Protocol',
      status: 'active',
      lastTriggered: mode === 'critical' ? '5 min ago' : '1 hour ago',
      triggerCount: mode === 'critical' ? 8 : mode === 'warning' ? 3 : 1,
    },
  ];

  const alerts = mode === 'critical' ? [
    { id: 'alert-1', guardrail: 'DP-09', severity: 'HIGH', message: 'Multiple L4 risk operations detected', timestamp: new Date().toISOString() },
    { id: 'alert-2', guardrail: 'DP-10', severity: 'MEDIUM', message: 'Human approval pending for 3 operations', timestamp: new Date().toISOString() },
  ] : mode === 'warning' ? [
    { id: 'alert-3', guardrail: 'DP-09', severity: 'LOW', message: 'Elevated risk level detected', timestamp: new Date().toISOString() },
  ] : [];

  sendJson(res, 200, {
    guardrails,
    alerts,
    overallStatus: mode === 'critical' ? 'alert' : mode === 'warning' ? 'warning' : 'healthy',
  });
}

// POST /api/v1/messages - Send message from dashboard
async function handlePostMessage(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const body = await parseJsonBody(req) as { content?: string; timestamp?: string };

    if (!body.content || body.content.trim() === '') {
      sendJson(res, 400, { error: 'Missing required field: content' });
      return;
    }

    const id = crypto.randomUUID();
    const message: DashboardMessage = {
      id,
      content: body.content.trim(),
      timestamp: body.timestamp || new Date().toISOString(),
      status: 'sent',
    };

    messages.set(id, message);

    sendJson(res, 201, {
      id: message.id,
      status: message.status,
      timestamp: message.timestamp,
    });
  } catch (error) {
    sendJson(res, 400, { error: (error as Error).message });
  }
}

// POST /api/v1/upload - Upload file from dashboard
async function handleUpload(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const body = await parseJsonBody(req) as { filename?: string; size?: number; content?: string };

    if (!body.filename) {
      sendJson(res, 400, { error: 'Missing required field: filename' });
      return;
    }

    const id = crypto.randomUUID();
    const file: UploadedFile = {
      id,
      filename: body.filename,
      size: body.size || (body.content ? body.content.length : 0),
      uploadedAt: new Date().toISOString(),
    };

    uploads.set(id, file);

    sendJson(res, 201, {
      id: file.id,
      filename: file.filename,
      size: file.size,
      uploadedAt: file.uploadedAt,
    });
  } catch (error) {
    sendJson(res, 400, { error: (error as Error).message });
  }
}

// GET /api/v1/session/memory - Get agent memory status
function handleGetAgentMemory(req: http.IncomingMessage, res: http.ServerResponse): void {
  const query = parseQueryParams(req.url || '');
  const mode = query.get('mode') || 'normal';

  // Session memory thresholds
  const optimal = 15000;
  const warning = 30000;
  const danger = 40000;

  let current: number;
  if (mode === 'critical') {
    current = 35000;
  } else if (mode === 'warning') {
    current = 22000;
  } else {
    current = 8500;
  }

  // Guardrails status
  const guardrails = {
    dp09: {
      name: 'PII Recall',
      target: 99,
      current: mode === 'critical' ? 97.1 : 99.2,
      status: mode === 'critical' ? 'fail' : 'pass',
      critical: true,
    },
    dp10: {
      name: 'Secret Recall',
      target: 100,
      current: mode === 'critical' ? 98.5 : 100,
      status: mode === 'critical' ? 'fail' : 'pass',
      critical: true,
    },
  };

  sendJson(res, 200, {
    session: {
      current,
      optimal,
      warning,
      danger,
    },
    guardrails,
    lastSync: mode === 'critical' ? '15 min ago' : '2 min ago',
  });
}

// GET /api/v1/verification/status - Get verification status
function handleGetVerificationStatus(req: http.IncomingMessage, res: http.ServerResponse): void {
  const query = parseQueryParams(req.url || '');
  const mode = query.get('mode') || 'normal';

  const verificationItems = [
    {
      name: 'Unit Tests',
      status: mode === 'critical' ? 'fail' : 'pass',
      count: mode === 'critical' ? 142 : 156,
    },
    {
      name: 'Integration Tests',
      status: mode === 'critical' ? 'running' : 'pass',
      count: mode === 'critical' ? 18 : 24,
    },
    {
      name: 'Type Check',
      status: 'pass',
      count: 0,
    },
    {
      name: 'Lint',
      status: mode === 'warning' || mode === 'critical' ? 'fail' : 'pass',
      count: mode === 'warning' ? 3 : mode === 'critical' ? 12 : 0,
    },
    {
      name: 'Security Scan',
      status: mode === 'critical' ? 'fail' : 'pass',
      count: mode === 'critical' ? 2 : 0,
    },
  ];

  sendJson(res, 200, verificationItems);
}

// ============================================
// ROUTER
// ============================================

export async function handleApiRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string
): Promise<boolean> {
  const method = req.method || 'GET';

  // POST /api/v1/assess
  if (method === 'POST' && pathname === '/api/v1/assess') {
    await handleAssess(req, res);
    return true;
  }

  // GET /api/v1/assess/:id
  if (method === 'GET' && pathname.startsWith('/api/v1/assess/')) {
    const id = pathname.split('/')[4];
    if (id) {
      handleGetAssessment(req, res, id);
      return true;
    }
  }

  // POST /api/v1/approve/:id
  if (method === 'POST' && pathname.startsWith('/api/v1/approve/')) {
    const id = pathname.split('/')[4];
    if (id) {
      await handleApprove(req, res, id);
      return true;
    }
  }

  // GET /api/v1/assessments
  if (method === 'GET' && pathname === '/api/v1/assessments') {
    handleListAssessments(req, res);
    return true;
  }

  // POST /api/v1/auth/token
  if (method === 'POST' && pathname === '/api/v1/auth/token') {
    await handleToken(req, res);
    return true;
  }

  // GET /api/v1/tenant/context
  if (method === 'GET' && pathname === '/api/v1/tenant/context') {
    handleTenantContext(req, res);
    return true;
  }

  // GET /api/v1/stats
  if (method === 'GET' && pathname === '/api/v1/stats') {
    handleStats(req, res);
    return true;
  }

  // ============================================
  // DASHBOARD ROUTES
  // ============================================

  // GET /api/v1/evidence/packs - Get evidence pack data
  if (method === 'GET' && pathname === '/api/v1/evidence/packs') {
    handleGetEvidencePacks(req, res);
    return true;
  }

  // GET /api/v1/cars/status - Get CARS risk assessment status
  if (method === 'GET' && pathname === '/api/v1/cars/status') {
    handleGetCarsStatus(req, res);
    return true;
  }

  // GET /api/v1/supply-chain/status - Get supply chain status
  if (method === 'GET' && pathname === '/api/v1/supply-chain/status') {
    handleGetSupplyChainStatus(req, res);
    return true;
  }

  // GET /api/v1/session/tokens - Get token usage
  if (method === 'GET' && pathname === '/api/v1/session/tokens') {
    handleGetSessionTokens(req, res);
    return true;
  }

  // GET /api/v1/guardrails/status - Get guardrail status
  if (method === 'GET' && pathname === '/api/v1/guardrails/status') {
    handleGetGuardrailsStatus(req, res);
    return true;
  }

  // POST /api/v1/messages - Send message
  if (method === 'POST' && pathname === '/api/v1/messages') {
    await handlePostMessage(req, res);
    return true;
  }

  // POST /api/v1/upload - Upload file
  if (method === 'POST' && pathname === '/api/v1/upload') {
    await handleUpload(req, res);
    return true;
  }

  // GET /api/v1/session/memory - Get agent memory status
  if (method === 'GET' && pathname === '/api/v1/session/memory') {
    handleGetAgentMemory(req, res);
    return true;
  }

  // GET /api/v1/verification/status - Get verification status
  if (method === 'GET' && pathname === '/api/v1/verification/status') {
    handleGetVerificationStatus(req, res);
    return true;
  }

  // ============================================
  // SKILLS ROUTES
  // ============================================

  // GET /api/v1/skills/stats - Get skills statistics (before /:name)
  if (method === 'GET' && pathname === '/api/v1/skills/stats') {
    await handleSkillsStats(req, res);
    return true;
  }

  // POST /api/v1/skills/recommend - Recommend skill for task
  if (method === 'POST' && pathname === '/api/v1/skills/recommend') {
    await handleRecommendSkill(req, res);
    return true;
  }

  // GET /api/v1/skills - List all skills
  if (method === 'GET' && pathname === '/api/v1/skills') {
    await handleListSkills(req, res);
    return true;
  }

  // GET /api/v1/skills/:name/references/:filename - Get specific reference
  if (method === 'GET' && pathname.match(/^\/api\/v1\/skills\/[^/]+\/references\/[^/]+$/)) {
    const parts = pathname.split('/');
    const skillName = parts[4];
    const filename = parts[6];
    if (skillName && filename) {
      await handleGetSkillReference(req, res, skillName, decodeURIComponent(filename));
      return true;
    }
  }

  // GET /api/v1/skills/:name/references - Get skill references
  if (method === 'GET' && pathname.match(/^\/api\/v1\/skills\/[^/]+\/references$/)) {
    const skillName = pathname.split('/')[4];
    if (skillName) {
      await handleGetSkillReferences(req, res, skillName);
      return true;
    }
  }

  // GET /api/v1/skills/:name - Get skill details
  if (method === 'GET' && pathname.match(/^\/api\/v1\/skills\/[^/]+$/) && !pathname.includes('/references')) {
    const skillName = pathname.split('/')[4];
    if (skillName && skillName !== 'stats' && skillName !== 'recommend') {
      await handleGetSkill(req, res, skillName);
      return true;
    }
  }

  // ============================================
  // AGENT ROUTES
  // ============================================

  // GET /api/v1/agents/active - List active agents (must be before /api/v1/agents/:id)
  if (method === 'GET' && pathname === '/api/v1/agents/active') {
    handleListActiveAgents(req, res);
    return true;
  }

  // GET /api/v1/agents/stats - Get aggregate statistics
  if (method === 'GET' && pathname === '/api/v1/agents/stats') {
    handleAgentStats(req, res);
    return true;
  }

  // GET /api/v1/agents - List all agents
  if (method === 'GET' && pathname === '/api/v1/agents') {
    handleListAgents(req, res);
    return true;
  }

  // POST /api/v1/agents - Register new agent
  if (method === 'POST' && pathname === '/api/v1/agents') {
    await handleRegisterAgent(req, res);
    return true;
  }

  // GET /api/v1/agents/:id - Get agent details
  if (method === 'GET' && pathname.match(/^\/api\/v1\/agents\/[^/]+$/) && !pathname.includes('/task')) {
    const id = pathname.split('/')[4];
    if (id && id !== 'active' && id !== 'stats') {
      handleGetAgent(req, res, id);
      return true;
    }
  }

  // PATCH /api/v1/agents/:id - Update agent
  if (method === 'PATCH' && pathname.match(/^\/api\/v1\/agents\/[^/]+$/) && !pathname.includes('/task')) {
    const id = pathname.split('/')[4];
    if (id) {
      await handleUpdateAgent(req, res, id);
      return true;
    }
  }

  // DELETE /api/v1/agents/:id - Unregister agent
  if (method === 'DELETE' && pathname.match(/^\/api\/v1\/agents\/[^/]+$/)) {
    const id = pathname.split('/')[4];
    if (id) {
      handleUnregisterAgent(req, res, id);
      return true;
    }
  }

  // POST /api/v1/agents/:id/task - Start new task
  if (method === 'POST' && pathname.match(/^\/api\/v1\/agents\/[^/]+\/task$/)) {
    const id = pathname.split('/')[4];
    if (id) {
      await handleStartTask(req, res, id);
      return true;
    }
  }

  // PATCH /api/v1/agents/:id/task/:taskId - Update task status
  if (method === 'PATCH' && pathname.match(/^\/api\/v1\/agents\/[^/]+\/task\/[^/]+$/)) {
    const parts = pathname.split('/');
    const agentId = parts[4];
    const taskId = parts[6];
    if (agentId && taskId) {
      await handleUpdateTask(req, res, agentId, taskId);
      return true;
    }
  }

  return false;
}
