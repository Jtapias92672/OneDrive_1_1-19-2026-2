/**
 * FORGE Integrations - GitHub Types
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

export interface GitHubConfig {
  // Authentication
  appId?: number;
  privateKey?: string;
  installationId?: number;
  token?: string; // Personal access token or OAuth token
  
  // Defaults
  owner?: string;
  repo?: string;
  
  // Webhook
  webhookSecret?: string;
  
  // Settings
  autoComment: boolean;
  autoStatus: boolean;
  statusContext: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  user: {
    login: string;
  };
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubCheckRun {
  name: string;
  head_sha: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  started_at?: string;
  completed_at?: string;
  output?: {
    title: string;
    summary: string;
    text?: string;
    annotations?: GitHubAnnotation[];
  };
  details_url?: string;
  external_id?: string;
}

export interface GitHubAnnotation {
  path: string;
  start_line: number;
  end_line: number;
  start_column?: number;
  end_column?: number;
  annotation_level: 'notice' | 'warning' | 'failure';
  message: string;
  title?: string;
  raw_details?: string;
}

export interface GitHubStatus {
  state: 'error' | 'failure' | 'pending' | 'success';
  target_url?: string;
  description?: string;
  context: string;
}

export interface GitHubComment {
  id?: number;
  body: string;
  path?: string;
  position?: number;
  line?: number;
  side?: 'LEFT' | 'RIGHT';
  commit_id?: string;
}

export interface GitHubWebhookEvent {
  action: string;
  sender: {
    login: string;
  };
  repository: {
    full_name: string;
    owner: { login: string };
    name: string;
  };
  installation?: {
    id: number;
  };
}

export interface GitHubPullRequestEvent extends GitHubWebhookEvent {
  action: 'opened' | 'closed' | 'reopened' | 'synchronize' | 'edited' | 'ready_for_review';
  number: number;
  pull_request: GitHubPullRequest;
}

export interface GitHubPushEvent extends GitHubWebhookEvent {
  ref: string;
  before: string;
  after: string;
  commits: {
    id: string;
    message: string;
    author: { name: string; email: string };
    added: string[];
    removed: string[];
    modified: string[];
  }[];
}

export interface GitHubCheckRunEvent extends GitHubWebhookEvent {
  action: 'created' | 'completed' | 'rerequested' | 'requested_action';
  check_run: GitHubCheckRun & { id: number };
}

export interface GitHubIssueCommentEvent extends GitHubWebhookEvent {
  action: 'created' | 'edited' | 'deleted';
  issue: {
    number: number;
    title: string;
    state: 'open' | 'closed';
    pull_request?: { url: string };
  };
  comment: {
    id: number;
    body: string;
    user: { login: string };
  };
}

export type ForgeRunResult = {
  runId: string;
  status: 'converged' | 'failed' | 'timeout';
  score: number;
  iterations: number;
  duration: number;
  summary: string;
  details?: string;
  artifacts?: { name: string; url: string }[];
};
