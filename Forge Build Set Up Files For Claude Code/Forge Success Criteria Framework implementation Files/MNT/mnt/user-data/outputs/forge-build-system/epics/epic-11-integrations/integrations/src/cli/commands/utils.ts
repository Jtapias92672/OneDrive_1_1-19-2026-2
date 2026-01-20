/**
 * FORGE CLI - Utilities
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

import { cosmiconfig } from 'cosmiconfig';
import axios, { AxiosInstance } from 'axios';
import path from 'path';
import os from 'os';

export const CONFIG_PATH = path.join(os.homedir(), '.forge', 'config.json');

export interface ForgeConfig {
  apiUrl: string;
  apiKey: string;
  defaultEnvironment?: string;
  notifications?: boolean;
}

/**
 * Load FORGE configuration
 */
export async function loadConfig(): Promise<ForgeConfig> {
  // Try multiple sources: env vars, config file, project config
  const explorer = cosmiconfig('forge');
  
  // Check environment variables first
  if (process.env.FORGE_API_KEY && process.env.FORGE_API_URL) {
    return {
      apiUrl: process.env.FORGE_API_URL,
      apiKey: process.env.FORGE_API_KEY,
      defaultEnvironment: process.env.FORGE_ENVIRONMENT || 'dev',
    };
  }
  
  // Try to find config file
  try {
    const result = await explorer.search();
    if (result?.config) {
      return result.config as ForgeConfig;
    }
  } catch {
    // Continue to check default path
  }
  
  // Try default config path
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    throw new Error(
      'No FORGE configuration found.\n' +
      'Run `forge config init` or set FORGE_API_KEY and FORGE_API_URL environment variables.'
    );
  }
}

/**
 * Save FORGE configuration
 */
export async function saveConfig(config: ForgeConfig): Promise<void> {
  const fs = await import('fs/promises');
  
  // Ensure directory exists
  const dir = path.dirname(CONFIG_PATH);
  await fs.mkdir(dir, { recursive: true });
  
  // Write config
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Create API client from config
 */
export function getApiClient(config: ForgeConfig): ForgeApiClient {
  return new ForgeApiClient(config.apiUrl, config.apiKey);
}

/**
 * FORGE API Client for CLI
 */
export class ForgeApiClient {
  private client: AxiosInstance;
  
  constructor(baseUrl: string, apiKey: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'FORGE-CLI/1.0',
      },
      timeout: 30000,
    });
  }
  
  // Runs
  async startRun(options: {
    contractId: string;
    environment: string;
    input?: Record<string, any>;
    config?: {
      maxIterations?: number;
      targetScore?: number;
      timeoutMs?: number;
    };
  }): Promise<any> {
    const response = await this.client.post('/v1/runs', options);
    return response.data;
  }
  
  async getRun(runId: string): Promise<any> {
    const response = await this.client.get(`/v1/runs/${runId}`);
    return response.data;
  }
  
  async listRuns(options: {
    limit?: number;
    status?: string;
    contractId?: string;
  }): Promise<any[]> {
    const response = await this.client.get('/v1/runs', { params: options });
    return response.data.runs || response.data;
  }
  
  async cancelRun(runId: string): Promise<void> {
    await this.client.post(`/v1/runs/${runId}/cancel`);
  }
  
  async waitForRun(
    runId: string,
    options?: {
      pollInterval?: number;
      onProgress?: (event: { iteration: number; score: number }) => void;
    }
  ): Promise<any> {
    const interval = options?.pollInterval || 2000;
    
    while (true) {
      const run = await this.getRun(runId);
      
      if (run.status !== 'running' && run.status !== 'pending') {
        return run;
      }
      
      if (options?.onProgress && run.iterations !== undefined) {
        options.onProgress({
          iteration: run.iterations,
          score: run.score || 0,
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  // Contracts
  async listContracts(options?: { status?: string }): Promise<any[]> {
    const response = await this.client.get('/v1/contracts', { params: options });
    return response.data.contracts || response.data;
  }
  
  async getContract(id: string): Promise<any> {
    const response = await this.client.get(`/v1/contracts/${id}`);
    return response.data;
  }
  
  async createContract(options: {
    name: string;
    spec: any;
    activate?: boolean;
  }): Promise<any> {
    const response = await this.client.post('/v1/contracts', options);
    return response.data;
  }
  
  async validateContract(spec: any): Promise<{ valid: boolean; errors?: any[] }> {
    const response = await this.client.post('/v1/contracts/validate', { spec });
    return response.data;
  }
  
  async activateContract(id: string): Promise<void> {
    await this.client.post(`/v1/contracts/${id}/activate`);
  }
  
  async deactivateContract(id: string): Promise<void> {
    await this.client.post(`/v1/contracts/${id}/deactivate`);
  }
  
  // System
  async getSystemStatus(): Promise<any> {
    const response = await this.client.get('/v1/status');
    return response.data;
  }
}
