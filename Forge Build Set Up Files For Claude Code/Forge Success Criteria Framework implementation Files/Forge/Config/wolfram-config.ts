/**
 * FORGE Wolfram Alpha Configuration
 * 
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * @api LLM API (optimized for AI integration)
 */

export interface WolframConfig {
  appId: string;
  apiType: 'LLM_API' | 'FULL_RESULTS' | 'SHORT_ANSWERS';
  baseUrl: string;
  timeoutMs: number;
  monthlyLimit: number;
  dailyBudgetCap: number;
}

export interface ForgeValidationConfig {
  mode: 'always' | 'conditional' | 'manual';
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
}

/**
 * Load configuration from environment
 */
export function loadWolframConfig(): WolframConfig {
  const appId = process.env.WOLFRAM_APP_ID;
  
  if (!appId) {
    throw new Error('WOLFRAM_APP_ID environment variable is required');
  }
  
  return {
    appId,
    apiType: (process.env.WOLFRAM_API_TYPE as WolframConfig['apiType']) || 'LLM_API',
    baseUrl: process.env.WOLFRAM_BASE_URL || 'https://www.wolframalpha.com/api/v1/llm-api',
    timeoutMs: parseInt(process.env.WOLFRAM_TIMEOUT_MS || '5000', 10),
    monthlyLimit: parseInt(process.env.WOLFRAM_MONTHLY_LIMIT || '2000', 10),
    dailyBudgetCap: parseInt(process.env.WOLFRAM_DAILY_BUDGET_CAP || '100', 10),
  };
}

export function loadForgeValidationConfig(): ForgeValidationConfig {
  return {
    mode: (process.env.FORGE_VALIDATION_MODE as ForgeValidationConfig['mode']) || 'conditional',
    cacheEnabled: process.env.FORGE_CACHE_ENABLED === 'true',
    cacheTtlSeconds: parseInt(process.env.FORGE_CACHE_TTL_SECONDS || '3600', 10),
  };
}

/**
 * Default configuration for development/testing
 * Production should always use environment variables
 */
export const DEFAULT_CONFIG: WolframConfig = {
  appId: '2K3K8Q5XGA', // FORGE Production AppID
  apiType: 'LLM_API',
  baseUrl: 'https://www.wolframalpha.com/api/v1/llm-api',
  timeoutMs: 5000,
  monthlyLimit: 2000,
  dailyBudgetCap: 100,
};
