/**
 * FORGE Integrations - Jira Client
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

import axios, { AxiosInstance } from 'axios';
import { truncate, retryWithBackoff } from '../common/utils';

export interface JiraConfig {
  baseUrl: string; // e.g., https://company.atlassian.net
  email: string;
  apiToken: string;
  projectKey?: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: { name: string; id: string };
    priority?: { name: string; id: string };
    assignee?: { displayName: string; emailAddress: string };
    reporter?: { displayName: string; emailAddress: string };
    labels?: string[];
    created: string;
    updated: string;
    customfield_forge_run_id?: string;
  };
}

export interface JiraTransition {
  id: string;
  name: string;
  to: { name: string; id: string };
}

export interface JiraComment {
  id?: string;
  body: string | JiraDocumentFormat;
  visibility?: {
    type: 'group' | 'role';
    value: string;
  };
}

export interface JiraDocumentFormat {
  type: 'doc';
  version: 1;
  content: any[];
}

export interface CreateIssueOptions {
  projectKey: string;
  issueType: string;
  summary: string;
  description?: string;
  priority?: string;
  labels?: string[];
  assignee?: string;
  customFields?: Record<string, any>;
}

export class JiraClient {
  private client: AxiosInstance;
  private config: JiraConfig;
  
  constructor(config: JiraConfig) {
    this.config = config;
    
    // Create axios instance with basic auth
    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    
    this.client = axios.create({
      baseURL: `${config.baseUrl}/rest/api/3`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }
  
  // ===========================================================================
  // Issues
  // ===========================================================================
  
  /**
   * Get issue by key
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    const response = await retryWithBackoff(() => 
      this.client.get(`/issue/${issueKey}`)
    );
    return response.data;
  }
  
  /**
   * Create a new issue
   */
  async createIssue(options: CreateIssueOptions): Promise<JiraIssue> {
    const payload = {
      fields: {
        project: { key: options.projectKey },
        issuetype: { name: options.issueType },
        summary: options.summary,
        description: options.description ? this.toDocumentFormat(options.description) : undefined,
        priority: options.priority ? { name: options.priority } : undefined,
        labels: options.labels,
        assignee: options.assignee ? { accountId: options.assignee } : undefined,
        ...options.customFields,
      },
    };
    
    const response = await retryWithBackoff(() =>
      this.client.post('/issue', payload)
    );
    
    return this.getIssue(response.data.key);
  }
  
  /**
   * Update issue fields
   */
  async updateIssue(
    issueKey: string,
    fields: Partial<CreateIssueOptions>
  ): Promise<void> {
    const payload: any = { fields: {} };
    
    if (fields.summary) payload.fields.summary = fields.summary;
    if (fields.description) payload.fields.description = this.toDocumentFormat(fields.description);
    if (fields.priority) payload.fields.priority = { name: fields.priority };
    if (fields.labels) payload.fields.labels = fields.labels;
    if (fields.customFields) Object.assign(payload.fields, fields.customFields);
    
    await retryWithBackoff(() =>
      this.client.put(`/issue/${issueKey}`, payload)
    );
  }
  
  /**
   * Search issues with JQL
   */
  async searchIssues(
    jql: string,
    options: { maxResults?: number; startAt?: number; fields?: string[] } = {}
  ): Promise<{ issues: JiraIssue[]; total: number }> {
    const response = await retryWithBackoff(() =>
      this.client.post('/search', {
        jql,
        maxResults: options.maxResults || 50,
        startAt: options.startAt || 0,
        fields: options.fields || ['summary', 'status', 'priority', 'assignee', 'labels'],
      })
    );
    
    return {
      issues: response.data.issues,
      total: response.data.total,
    };
  }
  
  // ===========================================================================
  // Transitions
  // ===========================================================================
  
  /**
   * Get available transitions for an issue
   */
  async getTransitions(issueKey: string): Promise<JiraTransition[]> {
    const response = await retryWithBackoff(() =>
      this.client.get(`/issue/${issueKey}/transitions`)
    );
    return response.data.transitions;
  }
  
  /**
   * Transition an issue to a new status
   */
  async transitionIssue(
    issueKey: string,
    transitionId: string,
    comment?: string
  ): Promise<void> {
    const payload: any = {
      transition: { id: transitionId },
    };
    
    if (comment) {
      payload.update = {
        comment: [{ add: { body: this.toDocumentFormat(comment) } }],
      };
    }
    
    await retryWithBackoff(() =>
      this.client.post(`/issue/${issueKey}/transitions`, payload)
    );
  }
  
  /**
   * Transition issue by status name
   */
  async transitionToStatus(
    issueKey: string,
    statusName: string,
    comment?: string
  ): Promise<boolean> {
    const transitions = await this.getTransitions(issueKey);
    const transition = transitions.find(
      t => t.to.name.toLowerCase() === statusName.toLowerCase() ||
           t.name.toLowerCase() === statusName.toLowerCase()
    );
    
    if (!transition) return false;
    
    await this.transitionIssue(issueKey, transition.id, comment);
    return true;
  }
  
  // ===========================================================================
  // Comments
  // ===========================================================================
  
  /**
   * Add comment to an issue
   */
  async addComment(issueKey: string, comment: JiraComment): Promise<string> {
    const payload = {
      body: typeof comment.body === 'string' 
        ? this.toDocumentFormat(comment.body)
        : comment.body,
      visibility: comment.visibility,
    };
    
    const response = await retryWithBackoff(() =>
      this.client.post(`/issue/${issueKey}/comment`, payload)
    );
    
    return response.data.id;
  }
  
  // ===========================================================================
  // FORGE-Specific Methods
  // ===========================================================================
  
  /**
   * Create FORGE work item issue
   */
  async createForgeWorkItem(options: {
    projectKey: string;
    summary: string;
    description: string;
    contractId?: string;
    runId?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  }): Promise<JiraIssue> {
    const labels = ['forge'];
    if (options.contractId) labels.push(`contract:${options.contractId}`);
    
    return this.createIssue({
      projectKey: options.projectKey,
      issueType: 'Task',
      summary: options.summary,
      description: options.description,
      priority: options.priority,
      labels,
      customFields: {
        customfield_forge_run_id: options.runId,
      },
    });
  }
  
  /**
   * Add FORGE run result comment
   */
  async addForgeRunComment(
    issueKey: string,
    result: {
      runId: string;
      status: string;
      score: number;
      iterations: number;
      duration: number;
      summary: string;
    }
  ): Promise<string> {
    const statusIcon = result.status === 'converged' 
      ? result.score >= 0.9 ? '✅' : '⚠️'
      : '❌';
    
    const body = `${statusIcon} *FORGE Validation Result*

*Run ID:* ${result.runId}
*Status:* ${result.status}
*Score:* ${(result.score * 100).toFixed(1)}%
*Iterations:* ${result.iterations}
*Duration:* ${this.formatDuration(result.duration)}

${result.summary}`;

    return this.addComment(issueKey, { body });
  }
  
  /**
   * Sync FORGE status to Jira
   */
  async syncForgeStatus(
    issueKey: string,
    forgeStatus: 'pending' | 'running' | 'completed' | 'failed',
    statusMapping: Record<string, string>
  ): Promise<boolean> {
    const jiraStatus = statusMapping[forgeStatus];
    if (!jiraStatus) return false;
    
    return this.transitionToStatus(issueKey, jiraStatus);
  }
  
  // ===========================================================================
  // Helpers
  // ===========================================================================
  
  /**
   * Convert plain text to Jira Document Format (ADF)
   */
  private toDocumentFormat(text: string): JiraDocumentFormat {
    const paragraphs = text.split('\n\n').map(para => ({
      type: 'paragraph',
      content: para.split('\n').flatMap((line, i, arr) => {
        const content: any[] = [{ type: 'text', text: line }];
        if (i < arr.length - 1) content.push({ type: 'hardBreak' });
        return content;
      }),
    }));
    
    return {
      type: 'doc',
      version: 1,
      content: paragraphs,
    };
  }
  
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
}

export default JiraClient;
