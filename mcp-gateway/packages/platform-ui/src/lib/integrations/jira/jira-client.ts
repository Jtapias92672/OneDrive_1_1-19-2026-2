/**
 * Jira API Client
 * Epic 13: Jira Integration
 *
 * REST API v3 implementation using basic auth (email + API token).
 * Pattern: Matches MendixClient implementation exactly.
 */

import {
  JiraClientConfig,
  JiraIssue,
  JiraProject,
  JiraSearchResult,
  JiraSearchRequest,
  CreateIssueRequest,
  CreateIssueResponse,
  UpdateIssueRequest,
  JiraTransitionsResponse,
  JiraComment,
  JiraBoard,
  JiraSprint,
} from './jira-types';

// ============================================================================
// Interface Definition
// ============================================================================

export interface IJiraClient {
  // Issue Operations
  getIssue(issueKey: string, expand?: string[]): Promise<JiraIssue>;
  searchIssues(request: JiraSearchRequest): Promise<JiraSearchResult>;
  createIssue(request: CreateIssueRequest): Promise<CreateIssueResponse>;
  updateIssue(issueKey: string, request: UpdateIssueRequest): Promise<void>;
  deleteIssue(issueKey: string): Promise<void>;

  // Workflow Operations
  getTransitions(issueKey: string): Promise<JiraTransitionsResponse>;
  transitionIssue(
    issueKey: string,
    transitionId: string,
    fields?: Record<string, unknown>
  ): Promise<void>;

  // Comment Operations
  addComment(issueKey: string, body: string): Promise<JiraComment>;
  getComments(issueKey: string): Promise<JiraComment[]>;

  // Project Operations
  getProject(projectKey: string): Promise<JiraProject>;
  listProjects(): Promise<JiraProject[]>;

  // Sprint/Board Operations (Jira Software)
  getBoard(boardId: number): Promise<JiraBoard>;
  getBoardSprints(
    boardId: number,
    state?: 'active' | 'future' | 'closed'
  ): Promise<JiraSprint[]>;
  moveIssueToSprint(issueKey: string, sprintId: number): Promise<void>;

  // Configuration
  isConfigured(): boolean;
}

// ============================================================================
// Implementation
// ============================================================================

export class JiraClient implements IJiraClient {
  private config: JiraClientConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: JiraClientConfig) {
    this.config = config;

    // Normalize base URL (remove trailing slash, ensure /rest/api/3)
    const cleanBaseUrl = config.baseUrl.replace(/\/$/, '');
    this.baseUrl = cleanBaseUrl.includes('/rest/api/3')
      ? cleanBaseUrl
      : `${cleanBaseUrl}/rest/api/3`;

    // Validate required credentials
    if (!config.username || !config.apiToken) {
      throw new Error('Jira username and apiToken required');
    }

    // Basic auth: base64(email:apiToken)
    const credentials = `${config.username}:${config.apiToken}`;
    this.authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  // --------------------------------------------------------------------------
  // Private HTTP Methods (matches Mendix pattern)
  // --------------------------------------------------------------------------

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API ${response.status}: ${errorText}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return {} as T;
  }

  private async agileRequest<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    // Jira Software (Agile) uses different base path
    const agileBaseUrl =
      this.config.baseUrl.replace(/\/$/, '') + '/rest/agile/1.0';
    const url = `${agileBaseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira Agile API ${response.status}: ${errorText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return {} as T;
  }

  // --------------------------------------------------------------------------
  // Issue Operations
  // --------------------------------------------------------------------------

  async getIssue(issueKey: string, expand?: string[]): Promise<JiraIssue> {
    const params = expand ? `?expand=${expand.join(',')}` : '';
    return this.request<JiraIssue>(
      'GET',
      `/issue/${encodeURIComponent(issueKey)}${params}`
    );
  }

  async searchIssues(request: JiraSearchRequest): Promise<JiraSearchResult> {
    return this.request<JiraSearchResult>('POST', '/search', {
      jql: request.jql,
      startAt: request.startAt || 0,
      maxResults: request.maxResults || 50,
      fields: request.fields || [
        'summary',
        'status',
        'assignee',
        'priority',
        'issuetype',
        'created',
        'updated',
      ],
      expand: request.expand,
    });
  }

  async createIssue(request: CreateIssueRequest): Promise<CreateIssueResponse> {
    return this.request<CreateIssueResponse>('POST', '/issue', request);
  }

  async updateIssue(
    issueKey: string,
    request: UpdateIssueRequest
  ): Promise<void> {
    await this.request<void>(
      'PUT',
      `/issue/${encodeURIComponent(issueKey)}`,
      request
    );
  }

  async deleteIssue(issueKey: string): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/issue/${encodeURIComponent(issueKey)}`
    );
  }

  // --------------------------------------------------------------------------
  // Workflow Operations
  // --------------------------------------------------------------------------

  async getTransitions(issueKey: string): Promise<JiraTransitionsResponse> {
    return this.request<JiraTransitionsResponse>(
      'GET',
      `/issue/${encodeURIComponent(issueKey)}/transitions`
    );
  }

  async transitionIssue(
    issueKey: string,
    transitionId: string,
    fields?: Record<string, unknown>
  ): Promise<void> {
    await this.request<void>(
      'POST',
      `/issue/${encodeURIComponent(issueKey)}/transitions`,
      {
        transition: { id: transitionId },
        ...(fields ? { fields } : {}),
      }
    );
  }

  // --------------------------------------------------------------------------
  // Comment Operations
  // --------------------------------------------------------------------------

  async addComment(issueKey: string, body: string): Promise<JiraComment> {
    return this.request<JiraComment>(
      'POST',
      `/issue/${encodeURIComponent(issueKey)}/comment`,
      {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: body }],
            },
          ],
        },
      }
    );
  }

  async getComments(issueKey: string): Promise<JiraComment[]> {
    const response = await this.request<{ comments: JiraComment[] }>(
      'GET',
      `/issue/${encodeURIComponent(issueKey)}/comment`
    );
    return response.comments || [];
  }

  // --------------------------------------------------------------------------
  // Project Operations
  // --------------------------------------------------------------------------

  async getProject(projectKey: string): Promise<JiraProject> {
    return this.request<JiraProject>(
      'GET',
      `/project/${encodeURIComponent(projectKey)}`
    );
  }

  async listProjects(): Promise<JiraProject[]> {
    const response = await this.request<{ values: JiraProject[] }>(
      'GET',
      '/project/search'
    );
    return response.values || [];
  }

  // --------------------------------------------------------------------------
  // Sprint/Board Operations (Jira Software - Agile API)
  // --------------------------------------------------------------------------

  async getBoard(boardId: number): Promise<JiraBoard> {
    return this.agileRequest<JiraBoard>('GET', `/board/${boardId}`);
  }

  async getBoardSprints(
    boardId: number,
    state?: 'active' | 'future' | 'closed'
  ): Promise<JiraSprint[]> {
    const params = state ? `?state=${state}` : '';
    const response = await this.agileRequest<{ values: JiraSprint[] }>(
      'GET',
      `/board/${boardId}/sprint${params}`
    );
    return response.values || [];
  }

  async moveIssueToSprint(issueKey: string, sprintId: number): Promise<void> {
    await this.agileRequest<void>('POST', `/sprint/${sprintId}/issue`, {
      issues: [issueKey],
    });
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  isConfigured(): boolean {
    return Boolean(
      this.config.username && this.config.apiToken && this.config.baseUrl
    );
  }
}

// ============================================================================
// Mock Client for Testing
// ============================================================================

export class MockJiraClient implements IJiraClient {
  private mockIssues: Map<string, JiraIssue> = new Map();
  private issueCounter = 1;
  private mockProjectKey = 'FORGE';

  constructor() {
    // Seed with initial mock issue
    this.mockIssues.set('FORGE-1', {
      id: '10000',
      key: 'FORGE-1',
      self: 'https://mock.atlassian.net/rest/api/3/issue/10000',
      fields: {
        summary: 'Mock Issue for Testing',
        status: {
          id: '1',
          name: 'To Do',
          statusCategory: { id: 1, key: 'new', name: 'To Do' },
        },
        priority: { id: '3', name: 'Medium' },
        issuetype: { id: '10001', name: 'Task', subtask: false },
        project: { id: '10000', key: 'FORGE', name: 'FORGE Platform' },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        labels: [],
      },
    });
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    const issue = this.mockIssues.get(issueKey);
    if (!issue) {
      throw new Error(`Jira API 404: Issue ${issueKey} not found`);
    }
    return issue;
  }

  async searchIssues(request: JiraSearchRequest): Promise<JiraSearchResult> {
    const issues = Array.from(this.mockIssues.values());
    const startAt = request.startAt || 0;
    const maxResults = request.maxResults || 50;

    return {
      startAt,
      maxResults,
      total: issues.length,
      issues: issues.slice(startAt, startAt + maxResults),
    };
  }

  async createIssue(request: CreateIssueRequest): Promise<CreateIssueResponse> {
    this.issueCounter++;
    const key = `${request.fields.project.key}-${this.issueCounter}`;
    const id = `${10000 + this.issueCounter}`;

    const newIssue: JiraIssue = {
      id,
      key,
      self: `https://mock.atlassian.net/rest/api/3/issue/${id}`,
      fields: {
        summary: request.fields.summary,
        description: request.fields.description,
        status: {
          id: '1',
          name: 'To Do',
          statusCategory: { id: 1, key: 'new', name: 'To Do' },
        },
        priority: request.fields.priority
          ? { id: '3', name: request.fields.priority.name }
          : { id: '3', name: 'Medium' },
        issuetype: {
          id: '10001',
          name: request.fields.issuetype.name,
          subtask: false,
        },
        project: {
          id: '10000',
          key: request.fields.project.key,
          name: 'FORGE Platform',
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        labels: request.fields.labels || [],
      },
    };

    this.mockIssues.set(key, newIssue);
    return { id, key, self: newIssue.self };
  }

  async updateIssue(
    issueKey: string,
    request: UpdateIssueRequest
  ): Promise<void> {
    const issue = this.mockIssues.get(issueKey);
    if (!issue) {
      throw new Error(`Jira API 404: Issue ${issueKey} not found`);
    }

    if (request.fields) {
      Object.assign(issue.fields, request.fields);
      issue.fields.updated = new Date().toISOString();
    }
  }

  async deleteIssue(issueKey: string): Promise<void> {
    if (!this.mockIssues.has(issueKey)) {
      throw new Error(`Jira API 404: Issue ${issueKey} not found`);
    }
    this.mockIssues.delete(issueKey);
  }

  async getTransitions(): Promise<JiraTransitionsResponse> {
    return {
      transitions: [
        {
          id: '11',
          name: 'To Do',
          to: {
            id: '1',
            name: 'To Do',
            statusCategory: { id: 1, key: 'new', name: 'To Do' },
          },
          isAvailable: true,
          isGlobal: false,
          isInitial: true,
          isConditional: false,
        },
        {
          id: '21',
          name: 'In Progress',
          to: {
            id: '2',
            name: 'In Progress',
            statusCategory: {
              id: 2,
              key: 'indeterminate',
              name: 'In Progress',
            },
          },
          isAvailable: true,
          isGlobal: false,
          isInitial: false,
          isConditional: false,
        },
        {
          id: '31',
          name: 'Done',
          to: {
            id: '3',
            name: 'Done',
            statusCategory: { id: 3, key: 'done', name: 'Done' },
          },
          isAvailable: true,
          isGlobal: false,
          isInitial: false,
          isConditional: false,
        },
      ],
    };
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    const issue = this.mockIssues.get(issueKey);
    if (!issue) {
      throw new Error(`Jira API 404: Issue ${issueKey} not found`);
    }

    const statusMap: Record<string, JiraIssue['fields']['status']> = {
      '11': {
        id: '1',
        name: 'To Do',
        statusCategory: { id: 1, key: 'new', name: 'To Do' },
      },
      '21': {
        id: '2',
        name: 'In Progress',
        statusCategory: { id: 2, key: 'indeterminate', name: 'In Progress' },
      },
      '31': {
        id: '3',
        name: 'Done',
        statusCategory: { id: 3, key: 'done', name: 'Done' },
      },
    };

    if (statusMap[transitionId]) {
      issue.fields.status = statusMap[transitionId];
      issue.fields.updated = new Date().toISOString();
    }
  }

  async addComment(issueKey: string, body: string): Promise<JiraComment> {
    if (!this.mockIssues.has(issueKey)) {
      throw new Error(`Jira API 404: Issue ${issueKey} not found`);
    }

    return {
      id: `comment-${Date.now()}`,
      author: { accountId: 'mock-user', displayName: 'Mock User' },
      body: {
        type: 'doc',
        version: 1,
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: body }] },
        ],
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
  }

  async getComments(): Promise<JiraComment[]> {
    return [];
  }

  async getProject(): Promise<JiraProject> {
    return {
      id: '10000',
      key: this.mockProjectKey,
      name: 'FORGE Platform',
      description: 'Mock project for testing',
      lead: { accountId: 'mock-lead', displayName: 'Mock Lead' },
      projectTypeKey: 'software',
      issueTypes: [
        { id: '10001', name: 'Task', subtask: false },
        { id: '10002', name: 'Bug', subtask: false },
        { id: '10003', name: 'Story', subtask: false },
        { id: '10000', name: 'Epic', subtask: false },
      ],
    };
  }

  async listProjects(): Promise<JiraProject[]> {
    return [await this.getProject()];
  }

  async getBoard(): Promise<JiraBoard> {
    return {
      id: 1,
      name: 'FORGE Board',
      type: 'scrum',
      location: { projectId: 10000, projectKey: this.mockProjectKey },
    };
  }

  async getBoardSprints(
    _boardId: number,
    state?: 'active' | 'future' | 'closed'
  ): Promise<JiraSprint[]> {
    const sprints: JiraSprint[] = [
      { id: 1, name: 'Sprint 1', state: 'closed' },
      {
        id: 2,
        name: 'Sprint 2',
        state: 'active',
        startDate: new Date().toISOString(),
      },
      { id: 3, name: 'Sprint 3', state: 'future' },
    ];

    if (state) {
      return sprints.filter((s) => s.state === state);
    }
    return sprints;
  }

  async moveIssueToSprint(issueKey: string): Promise<void> {
    if (!this.mockIssues.has(issueKey)) {
      throw new Error(`Jira API 404: Issue ${issueKey} not found`);
    }
    // Mock: no-op
  }

  isConfigured(): boolean {
    return true;
  }

  // Test helper: reset state
  reset(): void {
    this.mockIssues.clear();
    this.issueCounter = 1;
    this.mockIssues.set('FORGE-1', {
      id: '10000',
      key: 'FORGE-1',
      self: 'https://mock.atlassian.net/rest/api/3/issue/10000',
      fields: {
        summary: 'Mock Issue for Testing',
        status: {
          id: '1',
          name: 'To Do',
          statusCategory: { id: 1, key: 'new', name: 'To Do' },
        },
        priority: { id: '3', name: 'Medium' },
        issuetype: { id: '10001', name: 'Task', subtask: false },
        project: { id: '10000', key: 'FORGE', name: 'FORGE Platform' },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        labels: [],
      },
    });
  }
}
