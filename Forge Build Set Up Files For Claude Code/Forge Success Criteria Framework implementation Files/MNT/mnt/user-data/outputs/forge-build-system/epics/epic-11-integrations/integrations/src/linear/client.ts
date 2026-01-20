/**
 * FORGE Integrations - Linear Client
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

import axios, { AxiosInstance } from 'axios';
import { retryWithBackoff } from '../common/utils';

export interface LinearConfig {
  apiKey: string;
  teamId?: string;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state: { id: string; name: string; type: string };
  priority: number; // 0-4 (none, urgent, high, normal, low)
  assignee?: { id: string; name: string; email: string };
  labels: { id: string; name: string; color: string }[];
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinearWorkflowState {
  id: string;
  name: string;
  type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
  position: number;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface CreateIssueOptions {
  teamId: string;
  title: string;
  description?: string;
  priority?: number;
  stateId?: string;
  assigneeId?: string;
  labelIds?: string[];
}

export class LinearClient {
  private client: AxiosInstance;
  private config: LinearConfig;
  
  constructor(config: LinearConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: 'https://api.linear.app',
      headers: {
        'Authorization': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }
  
  /**
   * Execute GraphQL query
   */
  private async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await retryWithBackoff(() =>
      this.client.post('/graphql', { query, variables })
    );
    
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    
    return response.data.data;
  }
  
  // ===========================================================================
  // Issues
  // ===========================================================================
  
  /**
   * Get issue by ID or identifier
   */
  async getIssue(idOrIdentifier: string): Promise<LinearIssue> {
    const data = await this.query<{ issue: LinearIssue }>(`
      query GetIssue($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          description
          url
          createdAt
          updatedAt
          priority
          state { id name type }
          assignee { id name email }
          labels { nodes { id name color } }
        }
      }
    `, { id: idOrIdentifier });
    
    return {
      ...data.issue,
      labels: (data.issue as any).labels?.nodes || [],
    };
  }
  
  /**
   * Create a new issue
   */
  async createIssue(options: CreateIssueOptions): Promise<LinearIssue> {
    const data = await this.query<{ issueCreate: { issue: LinearIssue } }>(`
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            url
            createdAt
            updatedAt
            priority
            state { id name type }
            assignee { id name email }
            labels { nodes { id name color } }
          }
        }
      }
    `, {
      input: {
        teamId: options.teamId,
        title: options.title,
        description: options.description,
        priority: options.priority,
        stateId: options.stateId,
        assigneeId: options.assigneeId,
        labelIds: options.labelIds,
      },
    });
    
    return {
      ...data.issueCreate.issue,
      labels: (data.issueCreate.issue as any).labels?.nodes || [],
    };
  }
  
  /**
   * Update an issue
   */
  async updateIssue(
    issueId: string,
    updates: Partial<CreateIssueOptions>
  ): Promise<LinearIssue> {
    const data = await this.query<{ issueUpdate: { issue: LinearIssue } }>(`
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            url
            createdAt
            updatedAt
            priority
            state { id name type }
          }
        }
      }
    `, {
      id: issueId,
      input: {
        title: updates.title,
        description: updates.description,
        priority: updates.priority,
        stateId: updates.stateId,
        assigneeId: updates.assigneeId,
      },
    });
    
    return data.issueUpdate.issue;
  }
  
  /**
   * Search issues
   */
  async searchIssues(
    filter: { teamId?: string; query?: string; stateType?: string },
    options: { first?: number } = {}
  ): Promise<LinearIssue[]> {
    const data = await this.query<{ issues: { nodes: LinearIssue[] } }>(`
      query SearchIssues($filter: IssueFilter, $first: Int) {
        issues(filter: $filter, first: $first) {
          nodes {
            id
            identifier
            title
            description
            url
            createdAt
            updatedAt
            priority
            state { id name type }
            assignee { id name email }
          }
        }
      }
    `, {
      filter: {
        team: filter.teamId ? { id: { eq: filter.teamId } } : undefined,
        state: filter.stateType ? { type: { eq: filter.stateType } } : undefined,
      },
      first: options.first || 50,
    });
    
    return data.issues.nodes;
  }
  
  // ===========================================================================
  // Comments
  // ===========================================================================
  
  /**
   * Add comment to an issue
   */
  async addComment(issueId: string, body: string): Promise<string> {
    const data = await this.query<{ commentCreate: { comment: { id: string } } }>(`
      mutation CreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment { id }
        }
      }
    `, {
      input: {
        issueId,
        body,
      },
    });
    
    return data.commentCreate.comment.id;
  }
  
  // ===========================================================================
  // Workflow States
  // ===========================================================================
  
  /**
   * Get workflow states for a team
   */
  async getWorkflowStates(teamId: string): Promise<LinearWorkflowState[]> {
    const data = await this.query<{ team: { states: { nodes: LinearWorkflowState[] } } }>(`
      query GetStates($teamId: String!) {
        team(id: $teamId) {
          states {
            nodes { id name type position }
          }
        }
      }
    `, { teamId });
    
    return data.team.states.nodes;
  }
  
  /**
   * Transition issue to a state
   */
  async transitionIssue(issueId: string, stateId: string): Promise<void> {
    await this.updateIssue(issueId, { stateId });
  }
  
  /**
   * Transition issue by state name
   */
  async transitionToState(
    issueId: string,
    teamId: string,
    stateName: string
  ): Promise<boolean> {
    const states = await this.getWorkflowStates(teamId);
    const state = states.find(s => s.name.toLowerCase() === stateName.toLowerCase());
    
    if (!state) return false;
    
    await this.transitionIssue(issueId, state.id);
    return true;
  }
  
  // ===========================================================================
  // Teams
  // ===========================================================================
  
  /**
   * Get all teams
   */
  async getTeams(): Promise<LinearTeam[]> {
    const data = await this.query<{ teams: { nodes: LinearTeam[] } }>(`
      query GetTeams {
        teams {
          nodes { id name key }
        }
      }
    `);
    
    return data.teams.nodes;
  }
  
  // ===========================================================================
  // FORGE-Specific Methods
  // ===========================================================================
  
  /**
   * Create FORGE work item issue
   */
  async createForgeWorkItem(options: {
    teamId: string;
    title: string;
    description: string;
    contractId?: string;
    runId?: string;
    priority?: 0 | 1 | 2 | 3 | 4; // none, urgent, high, normal, low
  }): Promise<LinearIssue> {
    let description = options.description;
    
    if (options.contractId || options.runId) {
      description += '\n\n---\n**FORGE Metadata**';
      if (options.contractId) description += `\n- Contract: ${options.contractId}`;
      if (options.runId) description += `\n- Run ID: ${options.runId}`;
    }
    
    return this.createIssue({
      teamId: options.teamId,
      title: options.title,
      description,
      priority: options.priority ?? 3, // default to normal
    });
  }
  
  /**
   * Add FORGE run result comment
   */
  async addForgeRunComment(
    issueId: string,
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
    
    const body = `${statusIcon} **FORGE Validation Result**

**Run ID:** \`${result.runId}\`
**Status:** ${result.status}
**Score:** ${(result.score * 100).toFixed(1)}%
**Iterations:** ${result.iterations}
**Duration:** ${this.formatDuration(result.duration)}

${result.summary}`;

    return this.addComment(issueId, body);
  }
  
  /**
   * Sync FORGE status to Linear
   */
  async syncForgeStatus(
    issueId: string,
    teamId: string,
    forgeStatus: 'pending' | 'running' | 'completed' | 'failed',
    statusMapping: Record<string, string>
  ): Promise<boolean> {
    const linearState = statusMapping[forgeStatus];
    if (!linearState) return false;
    
    return this.transitionToState(issueId, teamId, linearState);
  }
  
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
}

export default LinearClient;
