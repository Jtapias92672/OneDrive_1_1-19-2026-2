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

import { WolframConfig, loadWolframConfig } from '../../config/wolfram-config';

// ============================================
// TYPES
// ============================================

export interface WolframQueryResult {
  success: boolean;
  result: string;
  numericValue?: number;
  raw: string;
  cached: boolean;
  latencyMs: number;
  queryId: string;
}

export interface WolframError {
  code: 'TIMEOUT' | 'RATE_LIMIT' | 'INVALID_QUERY' | 'API_ERROR' | 'NETWORK_ERROR';
  message: string;
  retryable: boolean;
}

export interface UsageStats {
  queriesThisMonth: number;
  queriesThisDay: number;
  monthlyLimit: number;
  dailyBudgetCap: number;
  remainingMonthly: number;
  remainingDaily: number;
}

// ============================================
// CACHE (Simple in-memory for POC)
// ============================================

interface CacheEntry {
  result: WolframQueryResult;
  expiresAt: number;
}

const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3600 * 1000; // 1 hour

function getCacheKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getFromCache(query: string): WolframQueryResult | null {
  const key = getCacheKey(query);
  const entry = queryCache.get(key);
  
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    queryCache.delete(key);
    return null;
  }
  
  return { ...entry.result, cached: true };
}

function setInCache(query: string, result: WolframQueryResult): void {
  const key = getCacheKey(query);
  queryCache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ============================================
// USAGE TRACKING
// ============================================

let usageStats: UsageStats = {
  queriesThisMonth: 0,
  queriesThisDay: 0,
  monthlyLimit: 2000,
  dailyBudgetCap: 100,
  remainingMonthly: 2000,
  remainingDaily: 100,
};

let lastResetDay: string = '';
let lastResetMonth: string = '';

function checkAndResetCounters(): void {
  const now = new Date();
  const currentDay = now.toISOString().slice(0, 10);
  const currentMonth = now.toISOString().slice(0, 7);
  
  if (currentDay !== lastResetDay) {
    usageStats.queriesThisDay = 0;
    lastResetDay = currentDay;
  }
  
  if (currentMonth !== lastResetMonth) {
    usageStats.queriesThisMonth = 0;
    lastResetMonth = currentMonth;
  }
  
  usageStats.remainingMonthly = usageStats.monthlyLimit - usageStats.queriesThisMonth;
  usageStats.remainingDaily = usageStats.dailyBudgetCap - usageStats.queriesThisDay;
}

function incrementUsage(): void {
  usageStats.queriesThisMonth++;
  usageStats.queriesThisDay++;
  checkAndResetCounters();
}

// ============================================
// WOLFRAM CLIENT
// ============================================

export class WolframClient {
  private readonly config: WolframConfig;
  
  constructor(config?: Partial<WolframConfig>) {
    const envConfig = loadWolframConfig();
    this.config = { ...envConfig, ...config };
    
    usageStats.monthlyLimit = this.config.monthlyLimit;
    usageStats.dailyBudgetCap = this.config.dailyBudgetCap;
    checkAndResetCounters();
  }
  
  /**
   * Query Wolfram Alpha LLM API
   * Returns plain-text result optimized for programmatic use
   */
  async query(input: string): Promise<WolframQueryResult> {
    const startTime = Date.now();
    const queryId = `wq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    // Check cache first
    const cached = getFromCache(input);
    if (cached) {
      return { ...cached, queryId, latencyMs: Date.now() - startTime };
    }
    
    // Check rate limits
    checkAndResetCounters();
    if (usageStats.remainingMonthly <= 0) {
      throw this.createError('RATE_LIMIT', 'Monthly query limit exceeded (2,000/month)', false);
    }
    if (usageStats.remainingDaily <= 0) {
      throw this.createError('RATE_LIMIT', 'Daily budget cap exceeded', true);
    }
    
    // Build URL
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
        if (response.status === 403) {
          throw this.createError('RATE_LIMIT', 'API rate limit or invalid AppID', false);
        }
        throw this.createError('API_ERROR', `Wolfram API returned ${response.status}`, true);
      }
      
      const raw = await response.text();
      incrementUsage();
      
      // Parse result - LLM API returns plain text
      const numericValue = this.extractNumericValue(raw);
      
      const result: WolframQueryResult = {
        success: true,
        result: numericValue !== null ? numericValue.toString() : raw.trim(),
        numericValue: numericValue ?? undefined,
        raw,
        cached: false,
        latencyMs: Date.now() - startTime,
        queryId,
      };
      
      // Cache successful results
      setInCache(input, result);
      
      return result;
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createError('TIMEOUT', `Query timed out after ${this.config.timeoutMs}ms`, true);
      }
      if ((error as WolframError).code) {
        throw error; // Re-throw our errors
      }
      throw this.createError('NETWORK_ERROR', `Network error: ${(error as Error).message}`, true);
    }
  }
  
  /**
   * Compute and return numeric result
   * Convenience method for mathematical expressions
   */
  async compute(expression: string): Promise<number | null> {
    const result = await this.query(expression);
    return result.numericValue ?? null;
  }
  
  /**
   * Verify a computational claim
   * Returns true if Wolfram's result matches the stated result within tolerance
   */
  async verify(
    expression: string,
    statedResult: string | number,
    tolerancePercent: number = 0.01
  ): Promise<{ valid: boolean; computed: number | null; stated: number; difference?: number }> {
    const stated = typeof statedResult === 'string' 
      ? parseFloat(statedResult.replace(/[,$%]/g, '')) 
      : statedResult;
    
    const result = await this.query(expression);
    const computed = result.numericValue;
    
    if (computed === null || computed === undefined) {
      return { valid: false, computed: null, stated };
    }
    
    const difference = Math.abs(computed - stated);
    const percentDiff = stated !== 0 ? (difference / Math.abs(stated)) * 100 : difference;
    
    return {
      valid: percentDiff <= tolerancePercent,
      computed,
      stated,
      difference: percentDiff,
    };
  }
  
  /**
   * Get current usage statistics
   */
  getUsageStats(): UsageStats {
    checkAndResetCounters();
    return { ...usageStats };
  }
  
  /**
   * Check if we have budget remaining
   */
  hasBudget(): boolean {
    checkAndResetCounters();
    return usageStats.remainingMonthly > 0 && usageStats.remainingDaily > 0;
  }
  
  // ============================================
  // PRIVATE HELPERS
  // ============================================
  
  private extractNumericValue(text: string): number | null {
    // Clean common formatting
    const cleaned = text
      .replace(/,/g, '')           // Remove thousand separators
      .replace(/\$/g, '')          // Remove dollar signs
      .replace(/%/g, '')           // Remove percent signs
      .replace(/approximately/gi, '')
      .replace(/about/gi, '')
      .trim();
    
    // Look for numeric patterns
    const patterns = [
      /^-?[\d.]+(?:e[+-]?\d+)?$/i,  // Pure number (possibly scientific)
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
