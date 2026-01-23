/**
 * FORGE Integrations - Webhook Service
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

import axios, { AxiosInstance } from 'axios';
import { 
  generateId, 
  createHmacSignature, 
  verifyHmacSignature, 
  retryWithBackoff,
  TypedEventEmitter 
} from '../common/utils';
import type { 
  WebhookConfig, 
  WebhookDelivery,
  IntegrationEvent 
} from '../common/types';

export interface WebhookEvents {
  'delivery.success': WebhookDelivery;
  'delivery.failed': WebhookDelivery;
  'webhook.created': WebhookConfig;
  'webhook.updated': WebhookConfig;
  'webhook.deleted': { id: string };
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export class WebhookService extends TypedEventEmitter<WebhookEvents> {
  private webhooks = new Map<string, WebhookConfig>();
  private deliveryHistory = new Map<string, WebhookDelivery[]>();
  private client: AxiosInstance;
  
  constructor() {
    super();
    this.client = axios.create({
      timeout: 30000,
      validateStatus: () => true, // Don't throw on non-2xx
    });
  }
  
  // ===========================================================================
  // Webhook Management
  // ===========================================================================
  
  /**
   * Register a new webhook
   */
  registerWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>): WebhookConfig {
    const webhook: WebhookConfig = {
      ...config,
      id: generateId('wh'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.webhooks.set(webhook.id, webhook);
    this.deliveryHistory.set(webhook.id, []);
    this.emit('webhook.created', webhook);
    
    return webhook;
  }
  
  /**
   * Update webhook configuration
   */
  updateWebhook(id: string, updates: Partial<WebhookConfig>): WebhookConfig | null {
    const webhook = this.webhooks.get(id);
    if (!webhook) return null;
    
    const updated = {
      ...webhook,
      ...updates,
      id, // Can't change ID
      updatedAt: new Date().toISOString(),
    };
    
    this.webhooks.set(id, updated);
    this.emit('webhook.updated', updated);
    
    return updated;
  }
  
  /**
   * Delete a webhook
   */
  deleteWebhook(id: string): boolean {
    const deleted = this.webhooks.delete(id);
    if (deleted) {
      this.deliveryHistory.delete(id);
      this.emit('webhook.deleted', { id });
    }
    return deleted;
  }
  
  /**
   * Get webhook by ID
   */
  getWebhook(id: string): WebhookConfig | undefined {
    return this.webhooks.get(id);
  }
  
  /**
   * List all webhooks
   */
  listWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }
  
  /**
   * Get webhooks subscribed to an event
   */
  getWebhooksForEvent(event: string): WebhookConfig[] {
    return this.listWebhooks().filter(
      w => w.enabled && (w.events.includes(event) || w.events.includes('*'))
    );
  }
  
  // ===========================================================================
  // Webhook Delivery
  // ===========================================================================
  
  /**
   * Trigger webhooks for an event
   */
  async triggerEvent(
    event: string,
    data: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<WebhookDelivery[]> {
    const webhooks = this.getWebhooksForEvent(event);
    
    const deliveries = await Promise.all(
      webhooks.map(webhook => this.deliver(webhook, { event, data, metadata }))
    );
    
    return deliveries;
  }
  
  /**
   * Deliver payload to a specific webhook
   */
  async deliver(
    webhook: WebhookConfig,
    payload: { event: string; data: Record<string, any>; metadata?: Record<string, any> }
  ): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: generateId('del'),
      webhookId: webhook.id,
      event: payload.event,
      payload: payload.data,
      requestHeaders: {},
      requestBody: '',
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };
    
    const webhookPayload: WebhookPayload = {
      event: payload.event,
      timestamp: delivery.timestamp,
      data: payload.data,
      metadata: payload.metadata,
    };
    
    const body = JSON.stringify(webhookPayload);
    delivery.requestBody = body;
    
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'FORGE-Webhook/1.0',
      'X-FORGE-Event': payload.event,
      'X-FORGE-Delivery': delivery.id,
      ...webhook.headers,
    };
    
    // Add signature if secret is configured
    if (webhook.secret) {
      const signature = createHmacSignature(body, webhook.secret, 'sha256');
      headers['X-FORGE-Signature'] = `sha256=${signature}`;
    }
    
    delivery.requestHeaders = headers;
    
    // Attempt delivery with retries
    try {
      await retryWithBackoff(
        async () => {
          const startTime = Date.now();
          
          const response = await this.client.post(webhook.url, body, { headers });
          
          delivery.duration = Date.now() - startTime;
          delivery.responseStatus = response.status;
          delivery.responseHeaders = response.headers as Record<string, string>;
          delivery.responseBody = typeof response.data === 'string' 
            ? response.data 
            : JSON.stringify(response.data);
          
          if (response.status >= 200 && response.status < 300) {
            delivery.status = 'success';
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        },
        {
          maxRetries: webhook.retryCount,
          baseDelay: webhook.retryDelay,
          onRetry: (error, attempt) => {
            delivery.retryCount = attempt;
          },
        }
      );
    } catch (error) {
      delivery.status = 'failed';
      delivery.error = (error as Error).message;
    }
    
    // Store delivery
    const history = this.deliveryHistory.get(webhook.id) || [];
    history.unshift(delivery);
    if (history.length > 100) history.pop(); // Keep last 100
    this.deliveryHistory.set(webhook.id, history);
    
    // Update webhook status
    this.updateWebhook(webhook.id, {
      lastTriggered: delivery.timestamp,
      lastStatus: delivery.status === 'success' ? 'success' : 'failed',
    });
    
    // Emit events
    if (delivery.status === 'success') {
      this.emit('delivery.success', delivery);
    } else {
      this.emit('delivery.failed', delivery);
    }
    
    return delivery;
  }
  
  /**
   * Retry a failed delivery
   */
  async retryDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
    // Find the delivery
    for (const [webhookId, deliveries] of this.deliveryHistory) {
      const delivery = deliveries.find(d => d.id === deliveryId);
      if (delivery) {
        const webhook = this.webhooks.get(webhookId);
        if (!webhook) return null;
        
        return this.deliver(webhook, {
          event: delivery.event,
          data: delivery.payload,
        });
      }
    }
    
    return null;
  }
  
  // ===========================================================================
  // Delivery History
  // ===========================================================================
  
  /**
   * Get delivery history for a webhook
   */
  getDeliveryHistory(
    webhookId: string,
    options: { limit?: number; status?: 'success' | 'failed' } = {}
  ): WebhookDelivery[] {
    let history = this.deliveryHistory.get(webhookId) || [];
    
    if (options.status) {
      history = history.filter(d => d.status === options.status);
    }
    
    if (options.limit) {
      history = history.slice(0, options.limit);
    }
    
    return history;
  }
  
  /**
   * Get a specific delivery
   */
  getDelivery(deliveryId: string): WebhookDelivery | undefined {
    for (const deliveries of this.deliveryHistory.values()) {
      const delivery = deliveries.find(d => d.id === deliveryId);
      if (delivery) return delivery;
    }
    return undefined;
  }
  
  // ===========================================================================
  // Inbound Webhook Verification
  // ===========================================================================
  
  /**
   * Verify inbound webhook signature
   */
  verifyInboundSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    // Support both "sha256=..." and plain signature formats
    const [algo, hash] = signature.includes('=') 
      ? signature.split('=')
      : ['sha256', signature];
    
    if (algo !== 'sha256' && algo !== 'sha1') return false;
    
    return verifyHmacSignature(payload, hash, secret, algo as 'sha256' | 'sha1');
  }
}

/**
 * Express middleware for inbound webhooks
 */
export function createInboundWebhookMiddleware(
  secret: string,
  handler: (event: string, payload: any) => Promise<void>
) {
  return async (req: any, res: any) => {
    const signature = req.headers['x-forge-signature'] || 
                     req.headers['x-webhook-signature'];
    
    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }
    
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    
    const service = new WebhookService();
    if (!service.verifyInboundSignature(payload, signature, secret)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      await handler(data.event, data.data);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook handler error:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  };
}

export default WebhookService;
