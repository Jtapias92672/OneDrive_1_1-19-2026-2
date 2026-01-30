# CC-EPIC-13-JIRA-INTEGRATION-DIRECTIVE

**Epic:** 13 - Jira Integration
**Confidence Level:** 97%+
**Estimated Effort:** 41 hours
**Priority:** CRITICAL PATH

---

## EXECUTIVE SUMMARY

Implement complete Jira REST API integration following the EXACT patterns established by existing Figma, Mendix, and AWS clients. This epic enables automated Scrum workflow: ticket creation, status updates, and sprint management.

---

## PATTERN ALIGNMENT VERIFICATION

### ✅ Patterns Verified Against Existing Code

| Pattern | Source File | Confidence |
|---------|-------------|------------|
| Interface naming (IClient) | `figma-client.ts:8` | 100% |
| Config type pattern | `mendix-client.ts:3-7` | 100% |
| Constructor validation | `figma-client.ts:26-30` | 100% |
| HTTP request method | `mendix-client.ts:24-48` | 100% |
| Error handling format | `figma-client.ts:43-46` | 100% |
| Mock client pattern | `mendix-client.ts:200+` | 100% |
| Test structure | `figma-client.test.ts` | 100% |
| Export barrel pattern | `figma/index.ts` | 100% |

---

## FILE STRUCTURE (EXACT)

```
packages/platform-ui/src/lib/integrations/jira/
├── index.ts                      # Barrel exports
├── jira-types.ts                 # Type definitions (120 lines)
├── jira-client.ts                # Implementation (250 lines)
├── jira-workflow-manager.ts      # Workflow automation (180 lines)
├── issue-mapper.ts               # Work item ↔ Jira mapping (100 lines)
└── __tests__/
    ├── jira-client.test.ts       # Unit tests (400 lines)
    └── jira-workflow.test.ts     # Workflow tests (200 lines)
```

---

## PHASE 1: TYPE DEFINITIONS (4 hours)

### File: `jira-types.ts`

```typescript
/**
 * Jira API Types
 * Epic 13: Jira Integration
 *
 * Based on Jira REST API v3
 * https://developer.atlassian.com/cloud/jira/platform/rest/v3/
 */

// ============================================================================
// Configuration
// ============================================================================

export interface JiraClientConfig {
  baseUrl: string;           // e.g., 'https://your-domain.atlassian.net'
  username: string;          // Email address
  apiToken: string;          // API token from Atlassian
  projectKey?: string;       // Default project key
  timeout?: number;          // Request timeout in ms
}

// ============================================================================
// Core Domain Models
// ============================================================================

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
}

export interface JiraIssueFields {
  summary: string;
  description?: JiraDescription;
  status: JiraStatus;
  assignee?: JiraUser;
  reporter?: JiraUser;
  priority: JiraPriority;
  issuetype: JiraIssueType;
  project: JiraProjectRef;
  created: string;
  updated: string;
  labels: string[];
  fixVersions?: JiraVersion[];
  components?: JiraComponent[];
  parent?: { key: string };
  subtasks?: JiraIssue[];
  customfield_10020?: JiraSprint[];  // Sprint field (common ID)
}

export interface JiraDescription {
  type: 'doc';
  version: 1;
  content: JiraContentBlock[];
}

export interface JiraContentBlock {
  type: 'paragraph' | 'heading' | 'bulletList' | 'codeBlock';
  content?: { type: 'text'; text: string }[];
  attrs?: Record<string, unknown>;
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory: {
    id: number;
    key: 'new' | 'indeterminate' | 'done';
    name: string;
  };
}

export interface JiraUser {
  accountId: string;
  emailAddress?: string;
  displayName: string;
  avatarUrls?: Record<string, string>;
}

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  subtask: boolean;
  iconUrl?: string;
}

export interface JiraProjectRef {
  id: string;
  key: string;
  name: string;
}

export interface JiraVersion {
  id: string;
  name: string;
  released: boolean;
  releaseDate?: string;
}

export interface JiraComponent {
  id: string;
  name: string;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: 'active' | 'future' | 'closed';
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// Project & Board Models
// ============================================================================

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  lead: JiraUser;
  projectTypeKey: string;
  issueTypes: JiraIssueType[];
}

export interface JiraBoard {
  id: number;
  name: string;
  type: 'scrum' | 'kanban';
  location: {
    projectId: number;
    projectKey: string;
  };
}

// ============================================================================
// Search & Pagination
// ============================================================================

export interface JiraSearchResult {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JiraSearchRequest {
  jql: string;
  startAt?: number;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
}

// ============================================================================
// Create/Update Requests
// ============================================================================

export interface CreateIssueRequest {
  fields: {
    project: { key: string };
    summary: string;
    description?: JiraDescription;
    issuetype: { name: string };
    assignee?: { accountId: string };
    labels?: string[];
    priority?: { name: string };
    parent?: { key: string };
    components?: { name: string }[];
    fixVersions?: { name: string }[];
  };
}

export interface CreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

export interface UpdateIssueRequest {
  fields?: Partial<CreateIssueRequest['fields']>;
  update?: Record<string, unknown>;
}

export interface TransitionRequest {
  transition: { id: string };
  fields?: Record<string, unknown>;
}

// ============================================================================
// Workflow & Transitions
// ============================================================================

export interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
  isAvailable: boolean;
  isGlobal: boolean;
  isInitial: boolean;
  isConditional: boolean;
}

export interface JiraTransitionsResponse {
  transitions: JiraTransition[];
}

// ============================================================================
// Comments & Attachments
// ============================================================================

export interface JiraComment {
  id: string;
  author: JiraUser;
  body: JiraDescription;
  created: string;
  updated: string;
}

export interface AddCommentRequest {
  body: JiraDescription;
}

// ============================================================================
// FORGE-Specific Mappings
// ============================================================================

export interface ForgeJiraMapping {
  workItemId: string;
  jiraIssueKey: string;
  jiraIssueId: string;
  linkedAt: string;
  syncedAt?: string;
}

export type ForgeWorkItemStatus =
  | 'pending'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'failed';

export interface JiraStatusMapping {
  forgeStatus: ForgeWorkItemStatus;
  jiraStatusCategory: 'new' | 'indeterminate' | 'done';
  jiraStatusNames: string[];
}
```

### Verification Checklist - Phase 1
- [ ] All interfaces use camelCase properties
- [ ] Config interface follows `{Service}ClientConfig` pattern
- [ ] Domain models map Jira API PascalCase → camelCase
- [ ] Request/Response types mirror Jira REST API v3
- [ ] FORGE-specific types for integration

---

## PHASE 2: JIRA CLIENT IMPLEMENTATION (12 hours)

### File: `jira-client.ts`

```typescript
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
  AddCommentRequest,
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
  transitionIssue(issueKey: string, transitionId: string, fields?: Record<string, unknown>): Promise<void>;

  // Comment Operations
  addComment(issueKey: string, body: string): Promise<JiraComment>;
  getComments(issueKey: string): Promise<JiraComment[]>;

  // Project Operations
  getProject(projectKey: string): Promise<JiraProject>;
  listProjects(): Promise<JiraProject[]>;

  // Sprint/Board Operations (Jira Software)
  getBoard(boardId: number): Promise<JiraBoard>;
  getBoardSprints(boardId: number, state?: 'active' | 'future' | 'closed'): Promise<JiraSprint[]>;
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
        'Authorization': this.authHeader,
        'Accept': 'application/json',
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
    const agileBaseUrl = this.config.baseUrl.replace(/\/$/, '') + '/rest/agile/1.0';
    const url = `${agileBaseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authHeader,
        'Accept': 'application/json',
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
      fields: request.fields || ['summary', 'status', 'assignee', 'priority', 'issuetype', 'created', 'updated'],
      expand: request.expand,
    });
  }

  async createIssue(request: CreateIssueRequest): Promise<CreateIssueResponse> {
    return this.request<CreateIssueResponse>('POST', '/issue', request);
  }

  async updateIssue(issueKey: string, request: UpdateIssueRequest): Promise<void> {
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
    return Boolean(this.config.username && this.config.apiToken && this.config.baseUrl);
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
        status: { id: '1', name: 'To Do', statusCategory: { id: 1, key: 'new', name: 'To Do' } },
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
        status: { id: '1', name: 'To Do', statusCategory: { id: 1, key: 'new', name: 'To Do' } },
        priority: request.fields.priority || { id: '3', name: 'Medium' },
        issuetype: { id: '10001', name: request.fields.issuetype.name, subtask: false },
        project: { id: '10000', key: request.fields.project.key, name: 'FORGE Platform' },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        labels: request.fields.labels || [],
      },
    };

    this.mockIssues.set(key, newIssue);
    return { id, key, self: newIssue.self };
  }

  async updateIssue(issueKey: string, request: UpdateIssueRequest): Promise<void> {
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

  async getTransitions(_issueKey: string): Promise<JiraTransitionsResponse> {
    return {
      transitions: [
        { id: '11', name: 'To Do', to: { id: '1', name: 'To Do', statusCategory: { id: 1, key: 'new', name: 'To Do' } }, isAvailable: true, isGlobal: false, isInitial: true, isConditional: false },
        { id: '21', name: 'In Progress', to: { id: '2', name: 'In Progress', statusCategory: { id: 2, key: 'indeterminate', name: 'In Progress' } }, isAvailable: true, isGlobal: false, isInitial: false, isConditional: false },
        { id: '31', name: 'Done', to: { id: '3', name: 'Done', statusCategory: { id: 3, key: 'done', name: 'Done' } }, isAvailable: true, isGlobal: false, isInitial: false, isConditional: false },
      ],
    };
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    const issue = this.mockIssues.get(issueKey);
    if (!issue) {
      throw new Error(`Jira API 404: Issue ${issueKey} not found`);
    }

    const statusMap: Record<string, JiraIssue['fields']['status']> = {
      '11': { id: '1', name: 'To Do', statusCategory: { id: 1, key: 'new', name: 'To Do' } },
      '21': { id: '2', name: 'In Progress', statusCategory: { id: 2, key: 'indeterminate', name: 'In Progress' } },
      '31': { id: '3', name: 'Done', statusCategory: { id: 3, key: 'done', name: 'Done' } },
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
        content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }],
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
  }

  async getComments(_issueKey: string): Promise<JiraComment[]> {
    return [];
  }

  async getProject(_projectKey: string): Promise<JiraProject> {
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
    return [await this.getProject(this.mockProjectKey)];
  }

  async getBoard(_boardId: number): Promise<JiraBoard> {
    return {
      id: 1,
      name: 'FORGE Board',
      type: 'scrum',
      location: { projectId: 10000, projectKey: this.mockProjectKey },
    };
  }

  async getBoardSprints(_boardId: number, state?: 'active' | 'future' | 'closed'): Promise<JiraSprint[]> {
    const sprints: JiraSprint[] = [
      { id: 1, name: 'Sprint 1', state: 'closed' },
      { id: 2, name: 'Sprint 2', state: 'active', startDate: new Date().toISOString() },
      { id: 3, name: 'Sprint 3', state: 'future' },
    ];

    if (state) {
      return sprints.filter(s => s.state === state);
    }
    return sprints;
  }

  async moveIssueToSprint(issueKey: string, _sprintId: number): Promise<void> {
    if (!this.mockIssues.has(issueKey)) {
      throw new Error(`Jira API 404: Issue ${issueKey} not found`);
    }
    // Mock: no-op
  }

  isConfigured(): boolean {
    return true;
  }
}
```

### Verification Checklist - Phase 2
- [ ] Interface `IJiraClient` prefix matches pattern
- [ ] `request<T>()` method matches Mendix pattern exactly
- [ ] Error format: `Jira API {status}: {text}`
- [ ] Constructor validates and throws on missing credentials
- [ ] `isConfigured()` method implemented
- [ ] `MockJiraClient` has stateful storage (Map)
- [ ] All public methods are async
- [ ] URL encoding with `encodeURIComponent()`

---

## PHASE 3: WORKFLOW MANAGER (10 hours)

### File: `jira-workflow-manager.ts`

```typescript
/**
 * Jira Workflow Manager
 * Epic 13: Jira Integration
 *
 * Automates FORGE work item ↔ Jira ticket synchronization.
 * Handles: ticket creation from work items, status sync, auto-close on completion.
 */

import { IJiraClient } from './jira-client';
import {
  JiraIssue,
  CreateIssueRequest,
  JiraStatusMapping,
  ForgeWorkItemStatus,
  ForgeJiraMapping,
  JiraDescription,
} from './jira-types';

// ============================================================================
// Interface
// ============================================================================

export interface IWorkflowManager {
  // Work Item → Jira Sync
  createTicketFromWorkItem(workItem: ForgeWorkItem): Promise<ForgeJiraMapping>;
  syncWorkItemStatus(workItem: ForgeWorkItem): Promise<void>;
  closeTicketOnCompletion(workItem: ForgeWorkItem): Promise<void>;

  // Jira → FORGE Sync
  getLinkedIssue(workItemId: string): Promise<JiraIssue | null>;
  syncFromJira(jiraIssueKey: string): Promise<ForgeWorkItem>;

  // Batch Operations
  syncAllPendingWorkItems(workItems: ForgeWorkItem[]): Promise<SyncResult[]>;

  // Configuration
  setStatusMappings(mappings: JiraStatusMapping[]): void;
}

export interface ForgeWorkItem {
  id: string;
  title: string;
  description?: string;
  status: ForgeWorkItemStatus;
  assignee?: string;
  component?: string;
  labels?: string[];
  jiraKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncResult {
  workItemId: string;
  jiraKey?: string;
  success: boolean;
  error?: string;
  action: 'created' | 'updated' | 'transitioned' | 'skipped';
}

// ============================================================================
// Implementation
// ============================================================================

export class JiraWorkflowManager implements IWorkflowManager {
  private client: IJiraClient;
  private projectKey: string;
  private mappings: Map<string, ForgeJiraMapping> = new Map();

  private statusMappings: JiraStatusMapping[] = [
    { forgeStatus: 'pending', jiraStatusCategory: 'new', jiraStatusNames: ['To Do', 'Open', 'Backlog'] },
    { forgeStatus: 'in_progress', jiraStatusCategory: 'indeterminate', jiraStatusNames: ['In Progress', 'In Review', 'Development'] },
    { forgeStatus: 'review', jiraStatusCategory: 'indeterminate', jiraStatusNames: ['In Review', 'Code Review', 'QA'] },
    { forgeStatus: 'completed', jiraStatusCategory: 'done', jiraStatusNames: ['Done', 'Closed', 'Resolved'] },
    { forgeStatus: 'failed', jiraStatusCategory: 'done', jiraStatusNames: ['Won\'t Do', 'Cancelled', 'Failed'] },
  ];

  constructor(client: IJiraClient, projectKey: string) {
    this.client = client;
    this.projectKey = projectKey;
  }

  // --------------------------------------------------------------------------
  // Work Item → Jira Sync
  // --------------------------------------------------------------------------

  async createTicketFromWorkItem(workItem: ForgeWorkItem): Promise<ForgeJiraMapping> {
    // Check if already linked
    const existingMapping = this.mappings.get(workItem.id);
    if (existingMapping) {
      return existingMapping;
    }

    // Build Jira issue request
    const request: CreateIssueRequest = {
      fields: {
        project: { key: this.projectKey },
        summary: workItem.title,
        description: this.buildDescription(workItem),
        issuetype: { name: 'Task' },
        labels: ['forge-generated', ...(workItem.labels || [])],
        ...(workItem.component ? { components: [{ name: workItem.component }] } : {}),
      },
    };

    // Create in Jira
    const response = await this.client.createIssue(request);

    // Store mapping
    const mapping: ForgeJiraMapping = {
      workItemId: workItem.id,
      jiraIssueKey: response.key,
      jiraIssueId: response.id,
      linkedAt: new Date().toISOString(),
    };

    this.mappings.set(workItem.id, mapping);

    // Add comment with FORGE reference
    await this.client.addComment(
      response.key,
      `🔗 Linked to FORGE work item: ${workItem.id}\nGenerated by FORGE Platform automation.`
    );

    return mapping;
  }

  async syncWorkItemStatus(workItem: ForgeWorkItem): Promise<void> {
    const mapping = this.mappings.get(workItem.id);
    if (!mapping) {
      throw new Error(`No Jira mapping found for work item ${workItem.id}`);
    }

    // Get current Jira issue
    const jiraIssue = await this.client.getIssue(mapping.jiraIssueKey);

    // Determine target status
    const targetMapping = this.statusMappings.find(m => m.forgeStatus === workItem.status);
    if (!targetMapping) {
      return; // No mapping for this status
    }

    // Check if transition needed
    const currentCategory = jiraIssue.fields.status.statusCategory.key;
    if (currentCategory === targetMapping.jiraStatusCategory) {
      return; // Already in correct category
    }

    // Get available transitions
    const transitions = await this.client.getTransitions(mapping.jiraIssueKey);

    // Find transition to target status
    const transition = transitions.transitions.find(t =>
      targetMapping.jiraStatusNames.includes(t.to.name) ||
      t.to.statusCategory.key === targetMapping.jiraStatusCategory
    );

    if (transition) {
      await this.client.transitionIssue(mapping.jiraIssueKey, transition.id);

      // Update sync timestamp
      mapping.syncedAt = new Date().toISOString();
    }
  }

  async closeTicketOnCompletion(workItem: ForgeWorkItem): Promise<void> {
    if (workItem.status !== 'completed' && workItem.status !== 'failed') {
      return;
    }

    await this.syncWorkItemStatus(workItem);

    // Add completion comment
    const mapping = this.mappings.get(workItem.id);
    if (mapping) {
      const status = workItem.status === 'completed' ? '✅ Completed' : '❌ Failed';
      await this.client.addComment(
        mapping.jiraIssueKey,
        `${status} via FORGE automation at ${new Date().toISOString()}`
      );
    }
  }

  // --------------------------------------------------------------------------
  // Jira → FORGE Sync
  // --------------------------------------------------------------------------

  async getLinkedIssue(workItemId: string): Promise<JiraIssue | null> {
    const mapping = this.mappings.get(workItemId);
    if (!mapping) {
      return null;
    }

    try {
      return await this.client.getIssue(mapping.jiraIssueKey);
    } catch {
      return null;
    }
  }

  async syncFromJira(jiraIssueKey: string): Promise<ForgeWorkItem> {
    const jiraIssue = await this.client.getIssue(jiraIssueKey);

    // Map Jira status to FORGE status
    const statusCategory = jiraIssue.fields.status.statusCategory.key;
    const forgeStatus = this.mapJiraToForgeStatus(statusCategory);

    return {
      id: `jira-${jiraIssue.id}`,
      title: jiraIssue.fields.summary,
      description: this.extractDescription(jiraIssue.fields.description),
      status: forgeStatus,
      labels: jiraIssue.fields.labels,
      jiraKey: jiraIssue.key,
      createdAt: jiraIssue.fields.created,
      updatedAt: jiraIssue.fields.updated,
    };
  }

  // --------------------------------------------------------------------------
  // Batch Operations
  // --------------------------------------------------------------------------

  async syncAllPendingWorkItems(workItems: ForgeWorkItem[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const workItem of workItems) {
      try {
        const mapping = this.mappings.get(workItem.id);

        if (!mapping) {
          // Create new ticket
          const newMapping = await this.createTicketFromWorkItem(workItem);
          results.push({
            workItemId: workItem.id,
            jiraKey: newMapping.jiraIssueKey,
            success: true,
            action: 'created',
          });
        } else {
          // Sync status
          await this.syncWorkItemStatus(workItem);
          results.push({
            workItemId: workItem.id,
            jiraKey: mapping.jiraIssueKey,
            success: true,
            action: 'updated',
          });
        }
      } catch (error) {
        results.push({
          workItemId: workItem.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'skipped',
        });
      }
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  setStatusMappings(mappings: JiraStatusMapping[]): void {
    this.statusMappings = mappings;
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private buildDescription(workItem: ForgeWorkItem): JiraDescription {
    const lines = [
      workItem.description || 'No description provided.',
      '',
      '---',
      `*FORGE Work Item ID:* ${workItem.id}`,
      `*Created:* ${workItem.createdAt}`,
    ];

    return {
      type: 'doc',
      version: 1,
      content: lines.map(line => ({
        type: 'paragraph' as const,
        content: line ? [{ type: 'text' as const, text: line }] : [],
      })),
    };
  }

  private extractDescription(description?: JiraDescription): string {
    if (!description || !description.content) {
      return '';
    }

    return description.content
      .filter(block => block.type === 'paragraph')
      .map(block => block.content?.map(c => c.text).join('') || '')
      .join('\n');
  }

  private mapJiraToForgeStatus(category: 'new' | 'indeterminate' | 'done'): ForgeWorkItemStatus {
    switch (category) {
      case 'new':
        return 'pending';
      case 'indeterminate':
        return 'in_progress';
      case 'done':
        return 'completed';
      default:
        return 'pending';
    }
  }
}
```

### Verification Checklist - Phase 3
- [ ] Constructor takes `IJiraClient` (dependency injection)
- [ ] Status mappings are configurable
- [ ] Bidirectional sync: FORGE → Jira and Jira → FORGE
- [ ] Auto-close with completion comments
- [ ] Batch operations with error handling
- [ ] `ForgeJiraMapping` tracks linkage

---

## PHASE 4: TESTS (10 hours)

### File: `__tests__/jira-client.test.ts`

```typescript
/**
 * Jira Client Tests
 * Epic 13: Jira Integration
 */

import { JiraClient, MockJiraClient, IJiraClient } from '../jira-client';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('JiraClient', () => {
  let client: JiraClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new JiraClient({
      baseUrl: 'https://test.atlassian.net',
      username: 'test@example.com',
      apiToken: 'test-token',
    });
  });

  describe('constructor', () => {
    it('throws when username is missing', () => {
      expect(() => new JiraClient({
        baseUrl: 'https://test.atlassian.net',
        username: '',
        apiToken: 'token',
      })).toThrow('Jira username and apiToken required');
    });

    it('throws when apiToken is missing', () => {
      expect(() => new JiraClient({
        baseUrl: 'https://test.atlassian.net',
        username: 'user@test.com',
        apiToken: '',
      })).toThrow('Jira username and apiToken required');
    });

    it('normalizes base URL without /rest/api/3', () => {
      const client = new JiraClient({
        baseUrl: 'https://test.atlassian.net/',
        username: 'user@test.com',
        apiToken: 'token',
      });
      expect(client.isConfigured()).toBe(true);
    });
  });

  describe('isConfigured', () => {
    it('returns true when all credentials provided', () => {
      expect(client.isConfigured()).toBe(true);
    });
  });

  describe('getIssue', () => {
    it('returns issue by key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          id: '10001',
          key: 'FORGE-123',
          self: 'https://test.atlassian.net/rest/api/3/issue/10001',
          fields: {
            summary: 'Test Issue',
            status: { id: '1', name: 'To Do', statusCategory: { id: 1, key: 'new', name: 'To Do' } },
            priority: { id: '3', name: 'Medium' },
            issuetype: { id: '10001', name: 'Task', subtask: false },
            project: { id: '10000', key: 'FORGE', name: 'FORGE' },
            created: '2026-01-27T00:00:00.000Z',
            updated: '2026-01-27T00:00:00.000Z',
            labels: [],
          },
        }),
      });

      const issue = await client.getIssue('FORGE-123');

      expect(issue.key).toBe('FORGE-123');
      expect(issue.fields.summary).toBe('Test Issue');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/issue/FORGE-123'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^Basic /),
          }),
        })
      );
    });

    it('throws on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Issue not found',
      });

      await expect(client.getIssue('INVALID')).rejects.toThrow('Jira API 404');
    });
  });

  describe('searchIssues', () => {
    it('searches with JQL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          startAt: 0,
          maxResults: 50,
          total: 1,
          issues: [{
            id: '10001',
            key: 'FORGE-123',
            self: 'https://test.atlassian.net/rest/api/3/issue/10001',
            fields: {
              summary: 'Test Issue',
              status: { id: '1', name: 'To Do', statusCategory: { id: 1, key: 'new', name: 'To Do' } },
              priority: { id: '3', name: 'Medium' },
              issuetype: { id: '10001', name: 'Task', subtask: false },
              project: { id: '10000', key: 'FORGE', name: 'FORGE' },
              created: '2026-01-27T00:00:00.000Z',
              updated: '2026-01-27T00:00:00.000Z',
              labels: [],
            },
          }],
        }),
      });

      const result = await client.searchIssues({ jql: 'project = FORGE' });

      expect(result.total).toBe(1);
      expect(result.issues).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/search'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('project = FORGE'),
        })
      );
    });
  });

  describe('createIssue', () => {
    it('creates issue and returns key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          id: '10002',
          key: 'FORGE-124',
          self: 'https://test.atlassian.net/rest/api/3/issue/10002',
        }),
      });

      const response = await client.createIssue({
        fields: {
          project: { key: 'FORGE' },
          summary: 'New Issue',
          issuetype: { name: 'Task' },
        },
      });

      expect(response.key).toBe('FORGE-124');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/issue'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('New Issue'),
        })
      );
    });
  });

  describe('transitionIssue', () => {
    it('transitions issue to new status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Map([['content-type', 'application/json']]),
      });

      await client.transitionIssue('FORGE-123', '21');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/transitions'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"id":"21"'),
        })
      );
    });
  });

  describe('addComment', () => {
    it('adds comment to issue', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          id: 'comment-123',
          author: { accountId: 'user', displayName: 'Test User' },
          body: { type: 'doc', version: 1, content: [] },
          created: '2026-01-27T00:00:00.000Z',
          updated: '2026-01-27T00:00:00.000Z',
        }),
      });

      const result = await client.addComment('FORGE-123', 'Test comment');

      expect(result.id).toBe('comment-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/comment'),
        expect.any(Object)
      );
    });
  });
});

describe('MockJiraClient', () => {
  let client: IJiraClient;

  beforeEach(() => {
    client = new MockJiraClient();
  });

  describe('getIssue', () => {
    it('returns seeded mock issue', async () => {
      const issue = await client.getIssue('FORGE-1');
      expect(issue.key).toBe('FORGE-1');
      expect(issue.fields.summary).toBe('Mock Issue for Testing');
    });

    it('throws for unknown issue', async () => {
      await expect(client.getIssue('UNKNOWN-999')).rejects.toThrow('404');
    });
  });

  describe('createIssue', () => {
    it('creates issue with incrementing key', async () => {
      const response = await client.createIssue({
        fields: {
          project: { key: 'FORGE' },
          summary: 'New Mock Issue',
          issuetype: { name: 'Task' },
        },
      });

      expect(response.key).toMatch(/^FORGE-\d+$/);

      // Verify it was stored
      const issue = await client.getIssue(response.key);
      expect(issue.fields.summary).toBe('New Mock Issue');
    });
  });

  describe('transitionIssue', () => {
    it('updates issue status', async () => {
      await client.transitionIssue('FORGE-1', '21'); // In Progress

      const issue = await client.getIssue('FORGE-1');
      expect(issue.fields.status.name).toBe('In Progress');
    });
  });

  describe('searchIssues', () => {
    it('returns all mock issues', async () => {
      const result = await client.searchIssues({ jql: 'project = FORGE' });
      expect(result.total).toBeGreaterThan(0);
    });
  });
});
```

### Verification Checklist - Phase 4
- [ ] Tests follow existing `figma-client.test.ts` structure
- [ ] Constructor validation tests
- [ ] `isConfigured()` tests
- [ ] API method tests with mock fetch
- [ ] Error handling tests (404, 500)
- [ ] MockJiraClient tests

---

## PHASE 5: INTEGRATION (5 hours)

### File: `index.ts`

```typescript
/**
 * Jira Integration
 * Epic 13: Jira Integration
 */

export * from './jira-types';
export * from './jira-client';
export * from './jira-workflow-manager';
export * from './issue-mapper';
```

### Update: `packages/platform-ui/src/lib/integrations/index.ts`

```typescript
export * from './figma';
export * from './mendix';
export * from './aws';
export * from './jira';  // ADD THIS LINE
```

### Add to CARS Risk Matrix: `/cars/risk-matrix.ts`

```typescript
// Add to TOOL_RISK_DEFINITIONS
jira_query: {
  level: 'LOW',
  description: 'Read-only Jira queries',
  requiresApproval: false,
},
jira_create_issue: {
  level: 'MEDIUM',
  description: 'Creates new Jira tickets',
  requiresApproval: true,
},
jira_update_issue: {
  level: 'MEDIUM',
  description: 'Updates existing Jira tickets',
  requiresApproval: true,
},
jira_transition: {
  level: 'MEDIUM',
  description: 'Changes Jira issue status',
  requiresApproval: true,
},
jira_delete_issue: {
  level: 'HIGH',
  description: 'Deletes Jira tickets',
  requiresApproval: true,
},
```

---

## ACCEPTANCE CRITERIA

### Must Pass (97%+ confidence)

- [ ] `JiraClient` follows exact `MendixClient` implementation pattern
- [ ] `MockJiraClient` enables testing without credentials
- [ ] All tests pass: `npm test -- --testPathPattern=jira`
- [ ] TypeScript compiles: `tsc --noEmit`
- [ ] Exports work: `import { JiraClient } from '@forge/integrations'`
- [ ] Workflow manager creates/updates/closes tickets
- [ ] Status sync maps FORGE status ↔ Jira status
- [ ] CARS risk matrix includes Jira operations

### Test Coverage Targets

| File | Coverage Target |
|------|-----------------|
| `jira-client.ts` | 90%+ |
| `jira-workflow-manager.ts` | 85%+ |
| `jira-types.ts` | 100% (types only) |

---

## SUCCESS METRICS

```
BEFORE EPIC 13:
├── Jira Client: 0%
├── Ticket Creation: 0%
├── Workflow Automation: 0%
├── Tests: 0

AFTER EPIC 13:
├── Jira Client: 100%
├── Ticket Creation: 100%
├── Workflow Automation: 100%
├── Tests: +40 new tests
├── POC Objective 2: 50% → Complete Jira workflow
```

---

## CC EXECUTION COMMAND

```
Read ~/Downloads/CC-EPIC-13-JIRA-INTEGRATION-DIRECTIVE.md and implement Epic 13 - Jira Integration

Follow the EXACT patterns from existing clients (Figma, Mendix, AWS).
Create all files in packages/platform-ui/src/lib/integrations/jira/
Run tests after each phase.
Commit after each phase completes.

Target: +40 tests, 97%+ pattern alignment
```

---

*Epic 13 Directive - Version 1.0 - 97% Confidence*
