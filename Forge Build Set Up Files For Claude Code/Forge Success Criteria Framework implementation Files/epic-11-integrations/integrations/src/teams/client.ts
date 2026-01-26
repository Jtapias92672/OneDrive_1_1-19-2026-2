/**
 * FORGE Integrations - Microsoft Teams Client
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

import axios, { AxiosInstance } from 'axios';
import { retryWithBackoff } from '../common/utils';
import type { NotificationSeverity } from '../common/types';

export interface TeamsConfig {
  webhookUrl: string; // Incoming webhook URL
}

export interface TeamsAdaptiveCard {
  type: 'AdaptiveCard';
  $schema: string;
  version: string;
  body: AdaptiveCardElement[];
  actions?: AdaptiveCardAction[];
  msteams?: {
    width: 'Full';
  };
}

export type AdaptiveCardElement = 
  | TextBlock 
  | ColumnSet 
  | FactSet 
  | Container
  | Image
  | ActionSet;

export interface TextBlock {
  type: 'TextBlock';
  text: string;
  size?: 'Small' | 'Default' | 'Medium' | 'Large' | 'ExtraLarge';
  weight?: 'Lighter' | 'Default' | 'Bolder';
  color?: 'Default' | 'Dark' | 'Light' | 'Accent' | 'Good' | 'Warning' | 'Attention';
  wrap?: boolean;
  spacing?: 'None' | 'Small' | 'Default' | 'Medium' | 'Large' | 'ExtraLarge';
}

export interface ColumnSet {
  type: 'ColumnSet';
  columns: Column[];
}

export interface Column {
  type: 'Column';
  width: 'auto' | 'stretch' | number;
  items: AdaptiveCardElement[];
}

export interface FactSet {
  type: 'FactSet';
  facts: { title: string; value: string }[];
}

export interface Container {
  type: 'Container';
  items: AdaptiveCardElement[];
  style?: 'default' | 'emphasis' | 'good' | 'attention' | 'warning' | 'accent';
  bleed?: boolean;
}

export interface Image {
  type: 'Image';
  url: string;
  size?: 'Auto' | 'Stretch' | 'Small' | 'Medium' | 'Large';
  altText?: string;
}

export interface ActionSet {
  type: 'ActionSet';
  actions: AdaptiveCardAction[];
}

export type AdaptiveCardAction = 
  | { type: 'Action.OpenUrl'; title: string; url: string }
  | { type: 'Action.Submit'; title: string; data: any };

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

export class TeamsClient {
  private config: TeamsConfig;
  private client: AxiosInstance;
  
  constructor(config: TeamsConfig) {
    this.config = config;
    this.client = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  // ===========================================================================
  // Core Messaging
  // ===========================================================================
  
  /**
   * Send an Adaptive Card message
   */
  async sendCard(card: TeamsAdaptiveCard): Promise<void> {
    const payload = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: card,
      }],
    };
    
    await retryWithBackoff(() =>
      this.client.post(this.config.webhookUrl, payload)
    );
  }
  
  /**
   * Send a simple text message
   */
  async sendMessage(text: string): Promise<void> {
    await retryWithBackoff(() =>
      this.client.post(this.config.webhookUrl, { text })
    );
  }
  
  // ===========================================================================
  // FORGE Notifications
  // ===========================================================================
  
  /**
   * Send FORGE run notification
   */
  async sendRunNotification(notification: ForgeRunNotification): Promise<void> {
    const card = this.buildRunNotificationCard(notification);
    await this.sendCard(card);
  }
  
  /**
   * Send approval request notification
   */
  async sendApprovalRequest(request: {
    id: string;
    title: string;
    description: string;
    requestedBy: string;
    riskTier: string;
    detailsUrl: string;
  }): Promise<void> {
    const riskColor = {
      low: 'Good',
      medium: 'Warning',
      high: 'Attention',
      critical: 'Attention',
    }[request.riskTier.toLowerCase()] || 'Default';
    
    const card: TeamsAdaptiveCard = {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      msteams: { width: 'Full' },
      body: [
        {
          type: 'TextBlock',
          text: '🔔 Approval Required',
          size: 'Large',
          weight: 'Bolder',
        },
        {
          type: 'TextBlock',
          text: request.title,
          size: 'Medium',
          weight: 'Bolder',
          wrap: true,
        },
        {
          type: 'TextBlock',
          text: request.description,
          wrap: true,
          spacing: 'Small',
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Requested By', value: request.requestedBy },
            { title: 'Risk Tier', value: request.riskTier },
          ],
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'Review in FORGE',
          url: request.detailsUrl,
        },
      ],
    };
    
    await this.sendCard(card);
  }
  
  /**
   * Send alert notification
   */
  async sendAlert(alert: {
    severity: NotificationSeverity;
    title: string;
    message: string;
    detailsUrl?: string;
  }): Promise<void> {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨',
      success: '✅',
    }[alert.severity];
    
    const color = {
      info: 'Accent',
      warning: 'Warning',
      error: 'Attention',
      success: 'Good',
    }[alert.severity] as 'Default' | 'Accent' | 'Good' | 'Warning' | 'Attention';
    
    const card: TeamsAdaptiveCard = {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      msteams: { width: 'Full' },
      body: [
        {
          type: 'Container',
          style: color.toLowerCase() as any,
          items: [
            {
              type: 'TextBlock',
              text: `${emoji} ${alert.title}`,
              size: 'Medium',
              weight: 'Bolder',
              color,
            },
            {
              type: 'TextBlock',
              text: alert.message,
              wrap: true,
            },
          ],
        },
      ],
      actions: alert.detailsUrl ? [{
        type: 'Action.OpenUrl',
        title: 'View Details',
        url: alert.detailsUrl,
      }] : undefined,
    };
    
    await this.sendCard(card);
  }
  
  // ===========================================================================
  // Card Builders
  // ===========================================================================
  
  private buildRunNotificationCard(notification: ForgeRunNotification): TeamsAdaptiveCard {
    const emoji = this.getStatusEmoji(notification.status, notification.score);
    const statusText = this.getStatusText(notification.status, notification.score);
    const statusColor = this.getStatusColor(notification.status, notification.score);
    
    const body: AdaptiveCardElement[] = [
      {
        type: 'TextBlock',
        text: `${emoji} FORGE Run ${statusText}`,
        size: 'Large',
        weight: 'Bolder',
        color: statusColor,
      },
      {
        type: 'FactSet',
        facts: [
          { title: 'Contract', value: notification.contractName },
          { title: 'Run ID', value: notification.runId },
        ],
      },
    ];
    
    // Add metrics if available
    if (notification.status !== 'started') {
      const facts: { title: string; value: string }[] = [];
      
      if (notification.score !== undefined) {
        facts.push({ title: 'Score', value: `${(notification.score * 100).toFixed(1)}%` });
      }
      
      if (notification.iterations !== undefined) {
        facts.push({ title: 'Iterations', value: String(notification.iterations) });
      }
      
      if (notification.duration !== undefined) {
        facts.push({ title: 'Duration', value: this.formatDuration(notification.duration) });
      }
      
      if (facts.length > 0) {
        body.push({ type: 'FactSet', facts });
      }
    }
    
    // Add summary if available
    if (notification.summary) {
      body.push({
        type: 'TextBlock',
        text: notification.summary,
        wrap: true,
        spacing: 'Medium',
      });
    }
    
    // Build actions
    const actions: AdaptiveCardAction[] = [];
    
    if (notification.detailsUrl) {
      actions.push({
        type: 'Action.OpenUrl',
        title: 'View Details',
        url: notification.detailsUrl,
      });
    }
    
    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      msteams: { width: 'Full' },
      body,
      actions: actions.length > 0 ? actions : undefined,
    };
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
  
  private getStatusColor(status: string, score?: number): 'Default' | 'Good' | 'Warning' | 'Attention' | 'Accent' {
    if (status === 'started') return 'Accent';
    if (status === 'converged') return score && score >= 0.9 ? 'Good' : 'Warning';
    if (status === 'failed') return 'Attention';
    if (status === 'timeout') return 'Warning';
    return 'Default';
  }
  
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
}

export default TeamsClient;
