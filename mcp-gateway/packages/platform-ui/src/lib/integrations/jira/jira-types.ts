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
  baseUrl: string; // e.g., 'https://your-domain.atlassian.net'
  username: string; // Email address
  apiToken: string; // API token from Atlassian
  projectKey?: string; // Default project key
  timeout?: number; // Request timeout in ms
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
  customfield_10020?: JiraSprint[]; // Sprint field (common ID)
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
