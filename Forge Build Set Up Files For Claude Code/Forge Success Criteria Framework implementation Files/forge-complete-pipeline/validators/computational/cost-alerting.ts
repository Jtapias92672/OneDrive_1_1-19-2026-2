/**
 * FORGE Cost Alerting System
 * 
 * @epic 14.1 - Computational Accuracy Layer
 * @task 3.3 - Cost Alerting
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Monitors Wolfram API usage and costs.
 *   Sends alerts via Slack, email, or webhooks when thresholds exceeded.
 *   Implements budget caps to prevent runaway costs.
 */

// ============================================
// TYPES
// ============================================

export type AlertLevel = 'info' | 'warning' | 'critical';
export type AlertChannel = 'slack' | 'email' | 'webhook' | 'console';

export interface CostAlertConfig {
  /** Daily budget limit in USD */
  dailyBudgetUsd: number;
  
  /** Monthly budget limit in USD */
  monthlyBudgetUsd: number;
  
  /** Cost per Wolfram query in USD */
  costPerQueryUsd: number;
  
  /** Alert thresholds as percentages */
  alertThresholds: {
    info: number;     // e.g., 50%
    warning: number;  // e.g., 75%
    critical: number; // e.g., 90%
  };
  
  /** Whether to block requests when budget exceeded */
  blockOnBudgetExceeded: boolean;
  
  /** Alert channels to use */
  channels: AlertChannel[];
  
  /** Slack webhook URL (if using Slack) */
  slackWebhookUrl?: string;
  
  /** Email configuration (if using email) */
  emailConfig?: {
    to: string[];
    from: string;
    smtpHost: string;
    smtpPort: number;
  };
  
  /** Generic webhook URL */
  webhookUrl?: string;
}

export interface CostAlert {
  id: string;
  level: AlertLevel;
  type: 'daily_threshold' | 'monthly_threshold' | 'rate_spike' | 'budget_exceeded';
  message: string;
  currentValue: number;
  threshold: number;
  budgetType: 'daily' | 'monthly';
  timestamp: string;
  acknowledged: boolean;
}

export interface BudgetStatus {
  daily: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
    alertLevel: AlertLevel | null;
  };
  monthly: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
    alertLevel: AlertLevel | null;
  };
  queryCount: {
    daily: number;
    monthly: number;
  };
  blocked: boolean;
  lastReset: {
    daily: string;
    monthly: string;
  };
}

// ============================================
// COST ALERTING IMPLEMENTATION
// ============================================

export class CostAlertManager {
  private config: CostAlertConfig;
  private dailyUsage: number = 0;
  private monthlyUsage: number = 0;
  private dailyQueries: number = 0;
  private monthlyQueries: number = 0;
  private lastDailyReset: Date = new Date();
  private lastMonthlyReset: Date = new Date();
  private alerts: CostAlert[] = [];
  private alertsSentToday: Set<string> = new Set(); // Prevent duplicate alerts

  constructor(config?: Partial<CostAlertConfig>) {
    this.config = {
      dailyBudgetUsd: 1.00,
      monthlyBudgetUsd: 20.00,
      costPerQueryUsd: 0.01,
      alertThresholds: {
        info: 50,
        warning: 75,
        critical: 90,
      },
      blockOnBudgetExceeded: true,
      channels: ['console'],
      ...config,
    };
    
    this.resetIfNeeded();
  }

  /**
   * Record a Wolfram API call
   */
  recordQuery(cost?: number): void {
    this.resetIfNeeded();
    
    const queryCost = cost ?? this.config.costPerQueryUsd;
    
    this.dailyUsage += queryCost;
    this.monthlyUsage += queryCost;
    this.dailyQueries++;
    this.monthlyQueries++;
    
    this.checkThresholds();
  }

  /**
   * Check if queries are allowed (budget not exceeded)
   */
  canQuery(): boolean {
    this.resetIfNeeded();
    
    if (!this.config.blockOnBudgetExceeded) {
      return true;
    }
    
    return this.dailyUsage < this.config.dailyBudgetUsd && 
           this.monthlyUsage < this.config.monthlyBudgetUsd;
  }

  /**
   * Get current budget status
   */
  getBudgetStatus(): BudgetStatus {
    this.resetIfNeeded();
    
    const dailyPercent = (this.dailyUsage / this.config.dailyBudgetUsd) * 100;
    const monthlyPercent = (this.monthlyUsage / this.config.monthlyBudgetUsd) * 100;
    
    return {
      daily: {
        used: this.dailyUsage,
        limit: this.config.dailyBudgetUsd,
        remaining: Math.max(0, this.config.dailyBudgetUsd - this.dailyUsage),
        percentUsed: dailyPercent,
        alertLevel: this.getAlertLevel(dailyPercent),
      },
      monthly: {
        used: this.monthlyUsage,
        limit: this.config.monthlyBudgetUsd,
        remaining: Math.max(0, this.config.monthlyBudgetUsd - this.monthlyUsage),
        percentUsed: monthlyPercent,
        alertLevel: this.getAlertLevel(monthlyPercent),
      },
      queryCount: {
        daily: this.dailyQueries,
        monthly: this.monthlyQueries,
      },
      blocked: !this.canQuery(),
      lastReset: {
        daily: this.lastDailyReset.toISOString(),
        monthly: this.lastMonthlyReset.toISOString(),
      },
    };
  }

  /**
   * Get all alerts
   */
  getAlerts(unacknowledgedOnly: boolean = false): CostAlert[] {
    if (unacknowledgedOnly) {
      return this.alerts.filter(a => !a.acknowledged);
    }
    return [...this.alerts];
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    this.alertsSentToday.clear();
  }

  /**
   * Manually set usage (for initialization from persistent storage)
   */
  setUsage(dailyUsage: number, monthlyUsage: number, dailyQueries: number, monthlyQueries: number): void {
    this.dailyUsage = dailyUsage;
    this.monthlyUsage = monthlyUsage;
    this.dailyQueries = dailyQueries;
    this.monthlyQueries = monthlyQueries;
    this.checkThresholds();
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private resetIfNeeded(): void {
    const now = new Date();
    
    // Reset daily counters
    if (now.toDateString() !== this.lastDailyReset.toDateString()) {
      this.dailyUsage = 0;
      this.dailyQueries = 0;
      this.lastDailyReset = now;
      this.alertsSentToday.clear();
    }
    
    // Reset monthly counters
    if (now.getMonth() !== this.lastMonthlyReset.getMonth() || 
        now.getFullYear() !== this.lastMonthlyReset.getFullYear()) {
      this.monthlyUsage = 0;
      this.monthlyQueries = 0;
      this.lastMonthlyReset = now;
    }
  }

  private checkThresholds(): void {
    const dailyPercent = (this.dailyUsage / this.config.dailyBudgetUsd) * 100;
    const monthlyPercent = (this.monthlyUsage / this.config.monthlyBudgetUsd) * 100;
    
    // Check daily thresholds
    this.checkAndAlert('daily', dailyPercent, this.dailyUsage);
    
    // Check monthly thresholds
    this.checkAndAlert('monthly', monthlyPercent, this.monthlyUsage);
    
    // Check for budget exceeded
    if (dailyPercent >= 100) {
      this.createAlert('critical', 'budget_exceeded', 'daily', dailyPercent, 100,
        `Daily budget EXCEEDED: $${this.dailyUsage.toFixed(4)} / $${this.config.dailyBudgetUsd.toFixed(2)}`);
    }
    
    if (monthlyPercent >= 100) {
      this.createAlert('critical', 'budget_exceeded', 'monthly', monthlyPercent, 100,
        `Monthly budget EXCEEDED: $${this.monthlyUsage.toFixed(4)} / $${this.config.monthlyBudgetUsd.toFixed(2)}`);
    }
  }

  private checkAndAlert(
    budgetType: 'daily' | 'monthly',
    percentUsed: number,
    currentValue: number
  ): void {
    const thresholds = this.config.alertThresholds;
    
    // Check each threshold level
    for (const [level, threshold] of Object.entries(thresholds) as Array<[AlertLevel, number]>) {
      if (percentUsed >= threshold) {
        const alertKey = `${budgetType}_${level}`;
        
        // Only send each alert type once per day
        if (!this.alertsSentToday.has(alertKey)) {
          const budgetLimit = budgetType === 'daily' 
            ? this.config.dailyBudgetUsd 
            : this.config.monthlyBudgetUsd;
          
          this.createAlert(
            level,
            `${budgetType}_threshold`,
            budgetType,
            percentUsed,
            threshold,
            `${budgetType.charAt(0).toUpperCase() + budgetType.slice(1)} budget ${level.toUpperCase()}: ` +
            `${percentUsed.toFixed(1)}% used ($${currentValue.toFixed(4)} / $${budgetLimit.toFixed(2)})`
          );
          
          this.alertsSentToday.add(alertKey);
        }
      }
    }
  }

  private createAlert(
    level: AlertLevel,
    type: CostAlert['type'],
    budgetType: 'daily' | 'monthly',
    currentValue: number,
    threshold: number,
    message: string
  ): void {
    const alert: CostAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level,
      type,
      message,
      currentValue,
      threshold,
      budgetType,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    // Send to configured channels
    this.sendAlert(alert);
  }

  private async sendAlert(alert: CostAlert): Promise<void> {
    for (const channel of this.config.channels) {
      try {
        switch (channel) {
          case 'console':
            this.sendConsoleAlert(alert);
            break;
          case 'slack':
            await this.sendSlackAlert(alert);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert);
            break;
          case 'email':
            await this.sendEmailAlert(alert);
            break;
        }
      } catch (error) {
        console.error(`[CostAlert] Failed to send alert via ${channel}:`, error);
      }
    }
  }

  private sendConsoleAlert(alert: CostAlert): void {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨',
    };
    
    console.log(`${emoji[alert.level]} [FORGE Cost Alert] ${alert.message}`);
  }

  private async sendSlackAlert(alert: CostAlert): Promise<void> {
    if (!this.config.slackWebhookUrl) {
      console.warn('[CostAlert] Slack webhook URL not configured');
      return;
    }
    
    const color = {
      info: '#36a64f',
      warning: '#ffcc00',
      critical: '#ff0000',
    };
    
    const payload = {
      attachments: [{
        color: color[alert.level],
        title: `FORGE Cost Alert: ${alert.level.toUpperCase()}`,
        text: alert.message,
        fields: [
          { title: 'Type', value: alert.type, short: true },
          { title: 'Budget', value: alert.budgetType, short: true },
          { title: 'Current', value: `${alert.currentValue.toFixed(1)}%`, short: true },
          { title: 'Threshold', value: `${alert.threshold}%`, short: true },
        ],
        footer: 'FORGE Computational Accuracy Layer',
        ts: Math.floor(Date.now() / 1000),
      }],
    };
    
    await fetch(this.config.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  private async sendWebhookAlert(alert: CostAlert): Promise<void> {
    if (!this.config.webhookUrl) {
      console.warn('[CostAlert] Webhook URL not configured');
      return;
    }
    
    await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });
  }

  private async sendEmailAlert(alert: CostAlert): Promise<void> {
    if (!this.config.emailConfig) {
      console.warn('[CostAlert] Email config not configured');
      return;
    }
    
    // In production, use nodemailer or similar
    console.log(`[CostAlert] Would send email to ${this.config.emailConfig.to.join(', ')}: ${alert.message}`);
  }

  private getAlertLevel(percentUsed: number): AlertLevel | null {
    const thresholds = this.config.alertThresholds;
    
    if (percentUsed >= thresholds.critical) return 'critical';
    if (percentUsed >= thresholds.warning) return 'warning';
    if (percentUsed >= thresholds.info) return 'info';
    return null;
  }
}

// ============================================
// SINGLETON
// ============================================

let defaultManager: CostAlertManager | null = null;

export function getCostAlertManager(): CostAlertManager {
  if (!defaultManager) {
    defaultManager = new CostAlertManager();
  }
  return defaultManager;
}

// ============================================
// EXPORTS
// ============================================

export default CostAlertManager;
