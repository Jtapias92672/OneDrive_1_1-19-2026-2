/**
 * FORGE Integrations - Slack Client
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

import { WebClient, ChatPostMessageResponse } from '@slack/web-api';
import type { NotificationSeverity } from '../common/types';

export interface SlackConfig {
  token: string; // Bot token (xoxb-...)
  signingSecret?: string;
  defaultChannel?: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  thread_ts?: string;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
}

export interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: any[];
  accessory?: any;
  block_id?: string;
  fields?: { type: string; text: string }[];
}

export interface SlackAttachment {
  color?: string;
  fallback?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: { title: string; value: string; short?: boolean }[];
  footer?: string;
  footer_icon?: string;
  ts?: number;
}

export interface ForgeRunNotification {
  runId: string;
  contractId: string;
  contractName: string;
  status: 'started' | 'converged' | 'failed' | 'timeout';
  score?: number;
  iterations?: number;
  duration?: number;
  summary?: string;
  detailsUrl?: string;
  triggeredBy?: string;
}

export class SlackClient {
  private client: WebClient;
  private config: SlackConfig;
  
  constructor(config: SlackConfig) {
    this.config = config;
    this.client = new WebClient(config.token);
  }
  
  // ===========================================================================
  // Core Messaging
  // ===========================================================================
  
  /**
   * Send a message to a channel
   */
  async sendMessage(message: SlackMessage): Promise<string | undefined> {
    const response = await this.client.chat.postMessage({
      channel: message.channel,
      text: message.text,
      blocks: message.blocks,
      attachments: message.attachments,
      thread_ts: message.thread_ts,
      unfurl_links: message.unfurl_links ?? false,
      unfurl_media: message.unfurl_media ?? false,
    });
    
    return response.ts;
  }
  
  /**
   * Update an existing message
   */
  async updateMessage(
    channel: string,
    ts: string,
    message: Partial<SlackMessage>
  ): Promise<void> {
    await this.client.chat.update({
      channel,
      ts,
      text: message.text || '',
      blocks: message.blocks,
      attachments: message.attachments,
    });
  }
  
  /**
   * Reply to a message in a thread
   */
  async replyInThread(
    channel: string,
    threadTs: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<string | undefined> {
    const response = await this.client.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text,
      blocks,
    });
    
    return response.ts;
  }
  
  /**
   * Send a DM to a user
   */
  async sendDM(userId: string, text: string, blocks?: SlackBlock[]): Promise<string | undefined> {
    // Open a conversation with the user
    const conversation = await this.client.conversations.open({ users: userId });
    if (!conversation.channel?.id) throw new Error('Failed to open DM');
    
    return this.sendMessage({
      channel: conversation.channel.id,
      text,
      blocks,
    });
  }
  
  // ===========================================================================
  // FORGE Notifications
  // ===========================================================================
  
  /**
   * Send FORGE run notification
   */
  async sendRunNotification(
    channel: string,
    notification: ForgeRunNotification
  ): Promise<string | undefined> {
    const blocks = this.buildRunNotificationBlocks(notification);
    const color = this.getStatusColor(notification.status, notification.score);
    
    return this.sendMessage({
      channel,
      text: this.getRunNotificationText(notification),
      blocks,
      attachments: [{
        color,
        fallback: this.getRunNotificationText(notification),
      }],
    });
  }
  
  /**
   * Send approval request notification
   */
  async sendApprovalRequest(
    channel: string,
    request: {
      id: string;
      title: string;
      description: string;
      requestedBy: string;
      riskTier: string;
      detailsUrl: string;
    }
  ): Promise<string | undefined> {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🔔 Approval Required', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${request.title}*\n${request.description}`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Requested By:*\n${request.requestedBy}` },
          { type: 'mrkdwn', text: `*Risk Tier:*\n${request.riskTier}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Approve', emoji: true },
            style: 'primary',
            action_id: `approve_${request.id}`,
            value: request.id,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '❌ Reject', emoji: true },
            style: 'danger',
            action_id: `reject_${request.id}`,
            value: request.id,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Details', emoji: true },
            url: request.detailsUrl,
            action_id: 'view_details',
          },
        ],
      },
    ];
    
    return this.sendMessage({
      channel,
      text: `🔔 Approval Required: ${request.title}`,
      blocks,
    });
  }
  
  /**
   * Send alert notification
   */
  async sendAlert(
    channel: string,
    alert: {
      severity: NotificationSeverity;
      title: string;
      message: string;
      detailsUrl?: string;
    }
  ): Promise<string | undefined> {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨',
      success: '✅',
    }[alert.severity];
    
    const color = {
      info: '#3498db',
      warning: '#f39c12',
      error: '#e74c3c',
      success: '#2ecc71',
    }[alert.severity];
    
    const blocks: SlackBlock[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${alert.title}*\n${alert.message}`,
        },
      },
    ];
    
    if (alert.detailsUrl) {
      blocks.push({
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: 'View Details' },
          url: alert.detailsUrl,
          action_id: 'view_alert',
        }],
      });
    }
    
    return this.sendMessage({
      channel,
      text: `${emoji} ${alert.title}`,
      blocks,
      attachments: [{ color }],
    });
  }
  
  // ===========================================================================
  // Block Builders
  // ===========================================================================
  
  private buildRunNotificationBlocks(notification: ForgeRunNotification): SlackBlock[] {
    const emoji = this.getStatusEmoji(notification.status, notification.score);
    const statusText = this.getStatusText(notification.status, notification.score);
    
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} FORGE Run ${statusText}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Contract:* ${notification.contractName}\n*Run ID:* \`${notification.runId}\``,
        },
      },
    ];
    
    // Add metrics if available
    if (notification.status !== 'started') {
      const fields: { type: string; text: string }[] = [];
      
      if (notification.score !== undefined) {
        fields.push({
          type: 'mrkdwn',
          text: `*Score:*\n${(notification.score * 100).toFixed(1)}%`,
        });
      }
      
      if (notification.iterations !== undefined) {
        fields.push({
          type: 'mrkdwn',
          text: `*Iterations:*\n${notification.iterations}`,
        });
      }
      
      if (notification.duration !== undefined) {
        fields.push({
          type: 'mrkdwn',
          text: `*Duration:*\n${this.formatDuration(notification.duration)}`,
        });
      }
      
      if (fields.length > 0) {
        blocks.push({ type: 'section', fields });
      }
    }
    
    // Add summary if available
    if (notification.summary) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: notification.summary },
      });
    }
    
    // Add action buttons
    const actions: any[] = [];
    
    if (notification.detailsUrl) {
      actions.push({
        type: 'button',
        text: { type: 'plain_text', text: 'View Details' },
        url: notification.detailsUrl,
        action_id: 'view_run',
      });
    }
    
    if (actions.length > 0) {
      blocks.push({ type: 'actions', elements: actions });
    }
    
    // Add context
    const contextElements: any[] = [];
    
    if (notification.triggeredBy) {
      contextElements.push({
        type: 'mrkdwn',
        text: `Triggered by ${notification.triggeredBy}`,
      });
    }
    
    contextElements.push({
      type: 'mrkdwn',
      text: `<!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>`,
    });
    
    blocks.push({ type: 'context', elements: contextElements });
    
    return blocks;
  }
  
  private getStatusEmoji(status: string, score?: number): string {
    if (status === 'started') return '🚀';
    if (status === 'converged') return score && score >= 0.9 ? '✅' : '⚠️';
    if (status === 'failed') return '❌';
    if (status === 'timeout') return '⏱️';
    return '❓';
  }
  
  private getStatusText(status: string, score?: number): string {
    if (status === 'started') return 'Started';
    if (status === 'converged') return score && score >= 0.9 ? 'Passed' : 'Completed with Warnings';
    if (status === 'failed') return 'Failed';
    if (status === 'timeout') return 'Timed Out';
    return 'Unknown';
  }
  
  private getStatusColor(status: string, score?: number): string {
    if (status === 'started') return '#3498db';
    if (status === 'converged') return score && score >= 0.9 ? '#2ecc71' : '#f39c12';
    if (status === 'failed') return '#e74c3c';
    if (status === 'timeout') return '#f39c12';
    return '#95a5a6';
  }
  
  private getRunNotificationText(notification: ForgeRunNotification): string {
    const emoji = this.getStatusEmoji(notification.status, notification.score);
    const statusText = this.getStatusText(notification.status, notification.score);
    return `${emoji} FORGE Run ${statusText}: ${notification.contractName} (${notification.runId})`;
  }
  
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
}

export default SlackClient;
