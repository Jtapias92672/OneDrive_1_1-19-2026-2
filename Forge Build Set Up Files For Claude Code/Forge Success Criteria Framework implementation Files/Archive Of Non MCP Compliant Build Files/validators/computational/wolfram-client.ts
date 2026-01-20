/**
 * FORGE Wolfram Alpha LLM API Client
 * 
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * @description Server-side client for Wolfram Alpha LLM API
 *              Used for computational verification in FORGE validation pipeline
 * 
 * @api-details
 *   Name: Forge
 *   App ID: 2K3K8Q5XGA
 *   Type: LLM API
 *   Free Tier: 2,000 queries/month
 */

import { WolframConfig, loadWolframConfig, DEFAULT_CONFIG } from '../../config/wolfram-config';

// ============================================
// TYPES
// ============================================

export interface WolframQueryResult {
  success: boolean;
  result: string;
  numericValue: number | null;
  queryId: string;
  latencyMs: number;
  cached: boolean;
  rawResponse?: string;
}

export interface WolframError {
  code: 'TIMEOUT' | 'RATE_LIMIT' | 'INVALID_QUERY' | 'API_ERROR' | 'BUDGET_EXCEEDED';
  message: string;
  retryable: boolean;
}

export interface UsageStats {
  dailyQueries: number;
  monthlyQueries: number;
  dailyLimit: number;
  monthlyLimit: number;
  lastReset: Date;
}

// ============================================
// WOLFRAM CLIENT
// ============================================

export class WolframClient {
  private config: WolframConfig;
  private cache: Map<string, { result: WolframQueryResult; expiry: number }>;
  private dailyCount: number;
  private monthlyCount: number;
  private lastDailyReset: Date;
  private lastMonthlyReset: Date;

  constructor(config?: Partial<WolframConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.dailyCount = 0;
    this.monthlyCount = 0;
    this.lastDailyReset = new Date();
    this.lastMonthlyReset = new Date();
  }

  /**
   * Query Wolfram Alpha LLM API
   */
  async query(input: string): Promise<WolframQueryResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(input);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return { ...cached.result, cached: true, latencyMs: Date.now() - startTime };
    }

    // Check budget
    this.resetCountersIfNeeded();
    if (!this.hasBudget()) {
      throw this.createError('BUDGET_EXCEEDED', 'Daily or monthly budget exceeded', false);
    }

    // Make API call
    const url = new URL(this.config.baseUrl);
    url.searchParams.set('appid', this.config.appId);
    url.searchParams.set('input', input);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw this.createError('RATE_LIMIT', 'Rate limit exceeded', true);
        }
        throw this.createError('API_ERROR', `HTTP ${response.status}: ${response.statusText}`, true);
      }

      const rawResponse = await response.text();
      const numericValue = this.extractNumericValue(rawResponse);

      // Increment counters
      this.dailyCount++;
      this.monthlyCount++;

      const result: WolframQueryResult = {
        success: true,
        result: rawResponse,
        numericValue,
        queryId: `wa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        latencyMs: Date.now() - startTime,
        cached: false,
        rawResponse,
      };

      // Cache the result
      this.cache.set(cacheKey, {
        result,
        expiry: Date.now() + 3600000, // 1 hour cache
      });

      return result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw this.createError('TIMEOUT', `Request timed out after ${this.config.timeoutMs}ms`, true);
      }
      if (error.code) {
        throw error; // Already a WolframError
      }
      throw this.createError('API_ERROR', error.message, true);
    }
  }

  /**
   * Check if we have budget remaining
   */
  hasBudget(): boolean {
    this.resetCountersIfNeeded();
    return this.dailyCount < this.config.dailyBudgetCap && 
           this.monthlyCount < this.config.monthlyLimit;
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): UsageStats {
    this.resetCountersIfNeeded();
    return {
      dailyQueries: this.dailyCount,
      monthlyQueries: this.monthlyCount,
      dailyLimit: this.config.dailyBudgetCap,
      monthlyLimit: this.config.monthlyLimit,
      lastReset: this.lastDailyReset,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private getCacheKey(input: string): string {
    return `wolfram:${input.toLowerCase().trim()}`;
  }

  private resetCountersIfNeeded(): void {
    const now = new Date();
    
    // Reset daily counter
    if (now.toDateString() !== this.lastDailyReset.toDateString()) {
      this.dailyCount = 0;
      this.lastDailyReset = now;
    }
    
    // Reset monthly counter
    if (now.getMonth() !== this.lastMonthlyReset.getMonth() || 
        now.getFullYear() !== this.lastMonthlyReset.getFullYear()) {
      this.monthlyCount = 0;
      this.lastMonthlyReset = now;
    }
  }

  private extractNumericValue(response: string): number | null {
    // Clean the response
    const cleaned = response.replace(/,/g, '').replace(/[$%]/g, '').trim();
    
    // Try to extract a number
    const patterns = [
      /=\s*(-?[\d.]+(?:e[+-]?\d+)?)/i,  // After equals sign
      /result[:\s]+(-?[\d.]+(?:e[+-]?\d+)?)/i,  // After "result"
      /≈\s*(-?[\d.]+(?:e[+-]?\d+)?)/i,  // After approximately equals
      /^(-?[\d.]+(?:e[+-]?\d+)?)$/i,  // Pure number (possibly scientific)
      /(-?[\d.]+(?:e[+-]?\d+)?)/i,   // First number in text
    ];
    
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const num = parseFloat(match[1] || match[0]);
        if (!isNaN(num)) return num;
      }
    }
    
    return null;
  }
  
  private createError(code: WolframError['code'], message: string, retryable: boolean): WolframError {
    return { code, message, retryable };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let defaultClient: WolframClient | null = null;

export function getWolframClient(): WolframClient {
  if (!defaultClient) {
    defaultClient = new WolframClient();
  }
  return defaultClient;
}

// ============================================
// EXPORTS
// ============================================

export default WolframClient;
