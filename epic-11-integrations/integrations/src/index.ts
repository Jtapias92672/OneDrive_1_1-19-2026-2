/**
 * FORGE Integrations - Main Exports
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

// Common
export * from './common/types';
export * from './common/utils';

// GitHub
export { GitHubClient } from './github/client';
export { GitHubWebhookHandler, createGitHubWebhookMiddleware } from './github/webhooks';
export type * from './github/types';

// Jira
export { JiraClient } from './jira/client';

// Linear
export { LinearClient } from './linear/client';

// Slack
export { SlackClient } from './slack/client';

// Teams
export { TeamsClient } from './teams/client';

// Webhooks
export { WebhookService, createInboundWebhookMiddleware } from './webhooks/service';

// Re-export specific types for convenience
export type {
  IntegrationType,
  IntegrationConfig,
  IntegrationEvent,
  Notification,
  NotificationSeverity,
  NotificationChannel,
  NotificationTemplate,
  NotificationTrigger,
  WebhookConfig,
  WebhookDelivery,
  TicketConfig,
  TicketUpdate,
} from './common/types';
