/**
 * FORGE Integrations - GitHub Webhook Handler
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

import { createHmacSignature, verifyHmacSignature, TypedEventEmitter } from '../common/utils';
import type {
  GitHubWebhookEvent,
  GitHubPullRequestEvent,
  GitHubPushEvent,
  GitHubCheckRunEvent,
  GitHubIssueCommentEvent,
} from './types';

export interface GitHubWebhookEvents {
  'pull_request.opened': GitHubPullRequestEvent;
  'pull_request.synchronize': GitHubPullRequestEvent;
  'pull_request.closed': GitHubPullRequestEvent;
  'pull_request.reopened': GitHubPullRequestEvent;
  'push': GitHubPushEvent;
  'check_run.rerequested': GitHubCheckRunEvent;
  'check_run.requested_action': GitHubCheckRunEvent;
  'issue_comment.created': GitHubIssueCommentEvent;
  'error': { error: Error; event: string; payload: any };
}

export interface WebhookHandlerOptions {
  secret?: string;
  onUnhandledEvent?: (event: string, payload: any) => void;
}

export class GitHubWebhookHandler extends TypedEventEmitter<GitHubWebhookEvents> {
  private secret?: string;
  private onUnhandledEvent?: (event: string, payload: any) => void;
  
  constructor(options: WebhookHandlerOptions = {}) {
    super();
    this.secret = options.secret;
    this.onUnhandledEvent = options.onUnhandledEvent;
  }
  
  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.secret) return true;
    
    // GitHub sends signature as "sha256=..."
    const [algorithm, hash] = signature.split('=');
    if (algorithm !== 'sha256') return false;
    
    return verifyHmacSignature(payload, hash, this.secret, 'sha256');
  }
  
  /**
   * Handle incoming webhook request
   */
  async handleWebhook(
    headers: Record<string, string>,
    body: string | object
  ): Promise<{ handled: boolean; event?: string; action?: string }> {
    const event = headers['x-github-event'] || headers['X-GitHub-Event'];
    const signature = headers['x-hub-signature-256'] || headers['X-Hub-Signature-256'];
    const deliveryId = headers['x-github-delivery'] || headers['X-GitHub-Delivery'];
    
    if (!event) {
      throw new Error('Missing X-GitHub-Event header');
    }
    
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const data = typeof body === 'string' ? JSON.parse(body) : body;
    
    // Verify signature if secret is configured
    if (this.secret && signature) {
      if (!this.verifySignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }
    }
    
    const action = (data as any).action;
    const eventKey = action ? `${event}.${action}` : event;
    
    try {
      return await this.processEvent(eventKey, data);
    } catch (error) {
      this.emit('error', { error: error as Error, event: eventKey, payload: data });
      throw error;
    }
  }
  
  /**
   * Process specific event type
   */
  private async processEvent(
    eventKey: string,
    payload: any
  ): Promise<{ handled: boolean; event: string; action?: string }> {
    switch (eventKey) {
      case 'pull_request.opened':
      case 'pull_request.synchronize':
      case 'pull_request.closed':
      case 'pull_request.reopened':
        this.emit(eventKey as any, payload as GitHubPullRequestEvent);
        return { handled: true, event: 'pull_request', action: payload.action };
      
      case 'push':
        this.emit('push', payload as GitHubPushEvent);
        return { handled: true, event: 'push' };
      
      case 'check_run.rerequested':
      case 'check_run.requested_action':
        this.emit(eventKey as any, payload as GitHubCheckRunEvent);
        return { handled: true, event: 'check_run', action: payload.action };
      
      case 'issue_comment.created':
        // Check if comment is on a PR and mentions FORGE
        if (this.isForgeCommand(payload)) {
          this.emit('issue_comment.created', payload as GitHubIssueCommentEvent);
          return { handled: true, event: 'issue_comment', action: 'created' };
        }
        break;
    }
    
    // Unhandled event
    this.onUnhandledEvent?.(eventKey, payload);
    return { handled: false, event: eventKey.split('.')[0], action: payload.action };
  }
  
  /**
   * Check if comment contains a FORGE command
   */
  private isForgeCommand(payload: GitHubIssueCommentEvent): boolean {
    const body = payload.comment?.body?.toLowerCase() || '';
    return (
      payload.issue?.pull_request !== undefined &&
      (body.includes('/forge') || body.includes('@forge'))
    );
  }
  
  /**
   * Parse FORGE command from comment
   */
  static parseForgeCommand(body: string): { command: string; args: string[] } | null {
    const match = body.match(/\/forge\s+(\w+)(?:\s+(.*))?/i);
    if (!match) return null;
    
    return {
      command: match[1].toLowerCase(),
      args: match[2]?.split(/\s+/).filter(Boolean) || [],
    };
  }
}

/**
 * Express middleware for GitHub webhooks
 */
export function createGitHubWebhookMiddleware(handler: GitHubWebhookHandler) {
  return async (req: any, res: any, next: any) => {
    try {
      const result = await handler.handleWebhook(req.headers, req.body);
      res.status(200).json({ 
        success: true, 
        handled: result.handled,
        event: result.event,
        action: result.action,
      });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(error instanceof Error && error.message.includes('signature') ? 401 : 500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  };
}

export default GitHubWebhookHandler;
