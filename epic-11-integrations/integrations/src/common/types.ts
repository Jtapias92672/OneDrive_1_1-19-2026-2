/**
 * FORGE Integrations - Common Types
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

import { z } from 'zod';

// ============================================================================
// Base Types
// ============================================================================

export type IntegrationType = 'github' | 'jira' | 'linear' | 'slack' | 'teams' | 'webhook';

export interface IntegrationConfig {
  id: string;
  type: IntegrationType;
  name: string;
  enabled: boolean;
  credentials: Record<string, string>;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationEvent {
  id: string;
  integrationId: string;
  type: string;
  direction: 'inbound' | 'outbound';
  payload: any;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  timestamp: string;
  duration?: number;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';
export type NotificationChannel = 'slack' | 'teams' | 'email' | 'webhook';

export interface Notification {
  id: string;
  channel: NotificationChannel;
  severity: NotificationSeverity;
  title: string;
  message: string;
  
  // Context
  runId?: string;
  contractId?: string;
  workId?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Timing
  createdAt: string;
  sentAt?: string;
  
  // Status
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: NotificationChannel;
  trigger: NotificationTrigger;
  template: {
    title: string;
    body: string;
    fields?: { name: string; value: string }[];
  };
  enabled: boolean;
}

export type NotificationTrigger = 
  | 'run.started'
  | 'run.completed'
  | 'run.failed'
  | 'run.converged'
  | 'approval.requested'
  | 'approval.approved'
  | 'approval.rejected'
  | 'budget.threshold'
  | 'quota.threshold'
  | 'health.degraded'
  | 'health.down';

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret?: string;
  
  // Events to send
  events: string[];
  
  // Retry config
  retryCount: number;
  retryDelay: number;
  
  // Status
  enabled: boolean;
  lastTriggered?: string;
  lastStatus?: 'success' | 'failed';
  
  // Headers
  headers?: Record<string, string>;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: any;
  
  // Request
  requestHeaders: Record<string, string>;
  requestBody: string;
  
  // Response
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  
  // Timing
  timestamp: string;
  duration?: number;
  
  // Status
  status: 'pending' | 'success' | 'failed';
  error?: string;
  retryCount: number;
}

// ============================================================================
// Ticket Types (Jira, Linear, GitHub)
// ============================================================================

export interface TicketConfig {
  projectKey: string;
  issueType?: string;
  statusMapping: Record<string, string>;
  priorityMapping: Record<string, string>;
  labelPrefix?: string;
  autoSync: boolean;
  syncComments: boolean;
}

export interface TicketUpdate {
  ticketId: string;
  source: 'github' | 'jira' | 'linear';
  action: 'create' | 'update' | 'comment' | 'transition';
  data: Record<string, any>;
}

export interface TicketComment {
  ticketId: string;
  body: string;
  author?: string;
  visibility?: 'internal' | 'external';
}

// ============================================================================
// Schemas
// ============================================================================

export const IntegrationConfigSchema = z.object({
  id: z.string(),
  type: z.enum(['github', 'jira', 'linear', 'slack', 'teams', 'webhook']),
  name: z.string(),
  enabled: z.boolean(),
  credentials: z.record(z.string()),
  settings: z.record(z.any()),
});

export const WebhookConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  secret: z.string().optional(),
  events: z.array(z.string()),
  retryCount: z.number().min(0).max(5).default(3),
  retryDelay: z.number().min(1000).default(5000),
  enabled: z.boolean().default(true),
  headers: z.record(z.string()).optional(),
});

export const NotificationSchema = z.object({
  channel: z.enum(['slack', 'teams', 'email', 'webhook']),
  severity: z.enum(['info', 'warning', 'error', 'success']),
  title: z.string(),
  message: z.string(),
  metadata: z.record(z.any()).optional(),
});
