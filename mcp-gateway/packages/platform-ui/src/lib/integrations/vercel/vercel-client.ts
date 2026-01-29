/**
 * Vercel API Client
 * Handles deployment to Vercel for frontend preview
 */

// =============================================================================
// Types
// =============================================================================

export interface VercelClientConfig {
  token: string;
  teamId?: string;
  baseUrl?: string;
}

export interface DeploymentFile {
  file: string; // File path (e.g., "src/App.tsx")
  data: string; // File content
}

export interface CreateDeploymentRequest {
  name: string;
  files: DeploymentFile[];
  projectSettings?: {
    framework?: 'nextjs' | 'vite' | 'create-react-app' | 'static';
    buildCommand?: string;
    outputDirectory?: string;
    installCommand?: string;
  };
  target?: 'production' | 'preview';
}

export interface VercelDeployment {
  id: string;
  url: string;
  state: VercelDeploymentState;
  createdAt: number;
  readyState?: string;
  name: string;
  meta?: Record<string, string>;
}

export type VercelDeploymentState =
  | 'QUEUED'
  | 'BUILDING'
  | 'READY'
  | 'ERROR'
  | 'CANCELED';

export interface VercelError {
  code: string;
  message: string;
}

// =============================================================================
// Client Implementation
// =============================================================================

export class VercelClient {
  private token: string;
  private teamId?: string;
  private baseUrl: string;

  constructor(config: VercelClientConfig) {
    if (!config.token) {
      throw new Error('Vercel API token is required');
    }
    this.token = config.token;
    this.teamId = config.teamId;
    this.baseUrl = config.baseUrl || 'https://api.vercel.com';
  }

  /**
   * Create a new deployment
   */
  async createDeployment(request: CreateDeploymentRequest): Promise<VercelDeployment> {
    const teamQuery = this.teamId ? `?teamId=${this.teamId}` : '';
    const url = `${this.baseUrl}/v13/deployments${teamQuery}`;

    const body = {
      name: request.name,
      files: request.files.map((f) => ({
        file: f.file,
        data: Buffer.from(f.data).toString('base64'),
        encoding: 'base64',
      })),
      projectSettings: request.projectSettings,
      target: request.target || 'preview',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = errorData as { error?: VercelError };
      throw new Error(
        `Vercel API error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    const data = (await response.json()) as VercelDeployment;
    return {
      id: data.id,
      url: data.url,
      state: data.state || 'QUEUED',
      createdAt: data.createdAt,
      name: data.name,
      meta: data.meta,
    };
  }

  /**
   * Get deployment status
   */
  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    const teamQuery = this.teamId ? `?teamId=${this.teamId}` : '';
    const url = `${this.baseUrl}/v13/deployments/${deploymentId}${teamQuery}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = errorData as { error?: VercelError };
      throw new Error(
        `Vercel API error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    const data = (await response.json()) as VercelDeployment;
    return {
      id: data.id,
      url: data.url,
      state: data.readyState as VercelDeploymentState || data.state,
      createdAt: data.createdAt,
      name: data.name,
      meta: data.meta,
    };
  }

  /**
   * Wait for deployment to be ready
   */
  async waitForReady(
    deploymentId: string,
    options?: {
      timeoutMs?: number;
      pollIntervalMs?: number;
    }
  ): Promise<VercelDeployment> {
    const timeoutMs = options?.timeoutMs ?? 120000; // 2 minutes default
    const pollIntervalMs = options?.pollIntervalMs ?? 3000; // 3 seconds default
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const deployment = await this.getDeployment(deploymentId);

      if (deployment.state === 'READY') {
        return deployment;
      }

      if (deployment.state === 'ERROR') {
        throw new Error(`Deployment failed: ${deploymentId}`);
      }

      if (deployment.state === 'CANCELED') {
        throw new Error(`Deployment was canceled: ${deploymentId}`);
      }

      // Wait before polling again
      await this.sleep(pollIntervalMs);
    }

    throw new Error(`Deployment timed out after ${timeoutMs}ms: ${deploymentId}`);
  }

  /**
   * Delete a deployment
   */
  async deleteDeployment(deploymentId: string): Promise<void> {
    const teamQuery = this.teamId ? `?teamId=${this.teamId}` : '';
    const url = `${this.baseUrl}/v13/deployments/${deploymentId}${teamQuery}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({}));
      const error = errorData as { error?: VercelError };
      throw new Error(
        `Vercel API error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }
  }

  /**
   * List recent deployments
   */
  async listDeployments(options?: {
    limit?: number;
    projectId?: string;
  }): Promise<VercelDeployment[]> {
    const params = new URLSearchParams();
    if (this.teamId) params.set('teamId', this.teamId);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.projectId) params.set('projectId', options.projectId);

    const queryString = params.toString();
    const url = `${this.baseUrl}/v6/deployments${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = errorData as { error?: VercelError };
      throw new Error(
        `Vercel API error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    const data = (await response.json()) as { deployments: VercelDeployment[] };
    return data.deployments.map((d) => ({
      id: d.id,
      url: d.url,
      state: d.state,
      createdAt: d.createdAt,
      name: d.name,
      meta: d.meta,
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// Mock Client (for testing)
// =============================================================================

export class MockVercelClient extends VercelClient {
  private mockDeployments: Map<string, VercelDeployment> = new Map();
  private deploymentCounter = 0;

  constructor() {
    super({ token: 'mock-token' });
  }

  async createDeployment(request: CreateDeploymentRequest): Promise<VercelDeployment> {
    this.deploymentCounter++;
    const id = `dpl_mock_${this.deploymentCounter}`;
    const deployment: VercelDeployment = {
      id,
      url: `${request.name}-mock.vercel.app`,
      state: 'BUILDING',
      createdAt: Date.now(),
      name: request.name,
    };
    this.mockDeployments.set(id, deployment);
    return deployment;
  }

  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    const deployment = this.mockDeployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }
    // Simulate build completion
    if (deployment.state === 'BUILDING') {
      deployment.state = 'READY';
    }
    return deployment;
  }

  async waitForReady(deploymentId: string): Promise<VercelDeployment> {
    const deployment = await this.getDeployment(deploymentId);
    deployment.state = 'READY';
    return deployment;
  }

  async deleteDeployment(deploymentId: string): Promise<void> {
    this.mockDeployments.delete(deploymentId);
  }

  async listDeployments(): Promise<VercelDeployment[]> {
    return Array.from(this.mockDeployments.values());
  }

  // Test helpers
  setDeploymentState(deploymentId: string, state: VercelDeploymentState): void {
    const deployment = this.mockDeployments.get(deploymentId);
    if (deployment) {
      deployment.state = state;
    }
  }

  reset(): void {
    this.mockDeployments.clear();
    this.deploymentCounter = 0;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createVercelClient(config: VercelClientConfig): VercelClient {
  return new VercelClient(config);
}
