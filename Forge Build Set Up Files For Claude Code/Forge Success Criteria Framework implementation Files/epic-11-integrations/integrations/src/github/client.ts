/**
 * FORGE Integrations - GitHub Client
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

import { Octokit } from '@octokit/rest';
import type {
  GitHubConfig,
  GitHubPullRequest,
  GitHubCheckRun,
  GitHubStatus,
  GitHubComment,
  GitHubAnnotation,
  ForgeRunResult,
} from './types';
import { generateId, truncate } from '../common/utils';

export class GitHubClient {
  private octokit: Octokit;
  private config: GitHubConfig;
  
  constructor(config: GitHubConfig) {
    this.config = config;
    
    // Initialize Octokit with token or app auth
    this.octokit = new Octokit({
      auth: config.token,
    });
  }
  
  // ===========================================================================
  // Pull Requests
  // ===========================================================================
  
  /**
   * Get pull request details
   */
  async getPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<GitHubPullRequest> {
    const { data } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
    
    return data as GitHubPullRequest;
  }
  
  /**
   * List files changed in a pull request
   */
  async getPullRequestFiles(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<{ filename: string; status: string; additions: number; deletions: number }[]> {
    const { data } = await this.octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });
    
    return data.map(f => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
    }));
  }
  
  // ===========================================================================
  // Comments
  // ===========================================================================
  
  /**
   * Create a comment on a pull request
   */
  async createPRComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<number> {
    const { data } = await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
    
    return data.id;
  }
  
  /**
   * Update an existing comment
   */
  async updateComment(
    owner: string,
    repo: string,
    commentId: number,
    body: string
  ): Promise<void> {
    await this.octokit.issues.updateComment({
      owner,
      repo,
      comment_id: commentId,
      body,
    });
  }
  
  /**
   * Create a review comment on specific lines
   */
  async createReviewComment(
    owner: string,
    repo: string,
    prNumber: number,
    comment: GitHubComment
  ): Promise<number> {
    const { data } = await this.octokit.pulls.createReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      body: comment.body,
      commit_id: comment.commit_id!,
      path: comment.path!,
      line: comment.line,
      side: comment.side,
    });
    
    return data.id;
  }
  
  // ===========================================================================
  // Check Runs (GitHub Checks API)
  // ===========================================================================
  
  /**
   * Create a check run
   */
  async createCheckRun(
    owner: string,
    repo: string,
    checkRun: GitHubCheckRun
  ): Promise<number> {
    const { data } = await this.octokit.checks.create({
      owner,
      repo,
      name: checkRun.name,
      head_sha: checkRun.head_sha,
      status: checkRun.status,
      conclusion: checkRun.conclusion,
      started_at: checkRun.started_at,
      completed_at: checkRun.completed_at,
      output: checkRun.output,
      details_url: checkRun.details_url,
      external_id: checkRun.external_id,
    });
    
    return data.id;
  }
  
  /**
   * Update a check run
   */
  async updateCheckRun(
    owner: string,
    repo: string,
    checkRunId: number,
    updates: Partial<GitHubCheckRun>
  ): Promise<void> {
    await this.octokit.checks.update({
      owner,
      repo,
      check_run_id: checkRunId,
      ...updates,
    });
  }
  
  // ===========================================================================
  // Commit Status (Legacy Status API)
  // ===========================================================================
  
  /**
   * Create a commit status
   */
  async createCommitStatus(
    owner: string,
    repo: string,
    sha: string,
    status: GitHubStatus
  ): Promise<void> {
    await this.octokit.repos.createCommitStatus({
      owner,
      repo,
      sha,
      state: status.state,
      target_url: status.target_url,
      description: truncate(status.description || '', 140),
      context: status.context,
    });
  }
  
  // ===========================================================================
  // FORGE-Specific Methods
  // ===========================================================================
  
  /**
   * Post FORGE run result as a PR comment
   */
  async postRunResultComment(
    owner: string,
    repo: string,
    prNumber: number,
    result: ForgeRunResult,
    existingCommentId?: number
  ): Promise<number> {
    const body = this.formatRunResultComment(result);
    
    if (existingCommentId) {
      await this.updateComment(owner, repo, existingCommentId, body);
      return existingCommentId;
    }
    
    return this.createPRComment(owner, repo, prNumber, body);
  }
  
  /**
   * Create FORGE check run for a PR
   */
  async createForgeCheckRun(
    owner: string,
    repo: string,
    sha: string,
    runId: string
  ): Promise<number> {
    return this.createCheckRun(owner, repo, {
      name: 'FORGE Validation',
      head_sha: sha,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      external_id: runId,
      output: {
        title: 'FORGE Validation In Progress',
        summary: 'Running contract validation...',
      },
    });
  }
  
  /**
   * Complete FORGE check run with results
   */
  async completeForgeCheckRun(
    owner: string,
    repo: string,
    checkRunId: number,
    result: ForgeRunResult
  ): Promise<void> {
    const conclusion = result.status === 'converged' && result.score >= 0.9
      ? 'success'
      : result.status === 'converged' && result.score >= 0.7
        ? 'neutral'
        : 'failure';
    
    await this.updateCheckRun(owner, repo, checkRunId, {
      status: 'completed',
      conclusion,
      completed_at: new Date().toISOString(),
      output: {
        title: this.getCheckRunTitle(result),
        summary: this.getCheckRunSummary(result),
        text: result.details,
      },
    });
  }
  
  /**
   * Set FORGE commit status
   */
  async setForgeStatus(
    owner: string,
    repo: string,
    sha: string,
    result: ForgeRunResult,
    targetUrl?: string
  ): Promise<void> {
    const state = result.status === 'converged' && result.score >= 0.9
      ? 'success'
      : result.status === 'converged'
        ? 'pending'
        : 'failure';
    
    await this.createCommitStatus(owner, repo, sha, {
      state,
      target_url: targetUrl,
      description: `Score: ${(result.score * 100).toFixed(0)}% | ${result.iterations} iterations`,
      context: this.config.statusContext || 'forge/validation',
    });
  }
  
  // ===========================================================================
  // Formatting Helpers
  // ===========================================================================
  
  private formatRunResultComment(result: ForgeRunResult): string {
    const statusEmoji = result.status === 'converged' 
      ? result.score >= 0.9 ? '✅' : '⚠️'
      : '❌';
    
    const scoreBar = this.createScoreBar(result.score);
    
    let comment = `## ${statusEmoji} FORGE Validation Result

**Run ID:** \`${result.runId}\`
**Status:** ${result.status}
**Score:** ${(result.score * 100).toFixed(1)}%

${scoreBar}

### Summary
${result.summary}

| Metric | Value |
|--------|-------|
| Iterations | ${result.iterations} |
| Duration | ${this.formatDuration(result.duration)} |
`;

    if (result.details) {
      comment += `
### Details
<details>
<summary>Click to expand</summary>

${result.details}

</details>
`;
    }

    if (result.artifacts?.length) {
      comment += `
### Artifacts
${result.artifacts.map(a => `- [${a.name}](${a.url})`).join('\n')}
`;
    }

    comment += `
---
<sub>Generated by [FORGE](https://forge.dev) | ${new Date().toISOString()}</sub>
`;

    return comment;
  }
  
  private createScoreBar(score: number): string {
    const filled = Math.round(score * 20);
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `\`${bar}\` ${(score * 100).toFixed(0)}%`;
  }
  
  private getCheckRunTitle(result: ForgeRunResult): string {
    if (result.status === 'converged' && result.score >= 0.9) {
      return '✅ Validation Passed';
    } else if (result.status === 'converged') {
      return `⚠️ Validation Passed with Score ${(result.score * 100).toFixed(0)}%`;
    } else if (result.status === 'timeout') {
      return '⏱️ Validation Timed Out';
    } else {
      return '❌ Validation Failed';
    }
  }
  
  private getCheckRunSummary(result: ForgeRunResult): string {
    return `**Score:** ${(result.score * 100).toFixed(1)}%
**Iterations:** ${result.iterations}
**Duration:** ${this.formatDuration(result.duration)}

${result.summary}`;
  }
  
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
}

export default GitHubClient;
