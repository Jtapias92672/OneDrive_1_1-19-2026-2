/**
 * Mendix SDK Client
 * Epic 11: External Integrations
 *
 * REST API implementation for Mendix Platform operations.
 * Uses Mendix Platform API: https://docs.mendix.com/apidocs-mxsdk/mxsdk/
 */

import {
  MendixProject,
  MendixModule,
  MendixPage,
  MendixClientConfig,
  MPKExportOptions,
  MPKExportResult,
} from './mendix-types';

export interface MendixBranch {
  name: string;
  displayName: string;
  latestRevision: number;
  isMainLine: boolean;
  createdDate: string;
}

export interface MendixDeployment {
  id: string;
  status: 'queued' | 'building' | 'deploying' | 'running' | 'stopped' | 'failed';
  environment: string;
  url?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface IMendixClient {
  // App operations
  getApp(appId: string): Promise<MendixProject>;
  getAppByName(name: string): Promise<MendixProject | null>;

  // Branch operations
  listBranches(appId: string): Promise<MendixBranch[]>;
  createBranch(appId: string, branchName: string, fromRevision?: number): Promise<MendixBranch>;
  deleteBranch(appId: string, branchName: string): Promise<void>;

  // Change operations
  getModules(appId: string, branchName?: string): Promise<MendixModule[]>;
  getPage(appId: string, pageId: string, branchName?: string): Promise<MendixPage>;
  createPage(appId: string, moduleId: string, pageName: string, branchName?: string): Promise<MendixPage>;
  commitChanges(appId: string, message: string, branchName?: string): Promise<{ revision: number }>;

  // Build & Deploy operations
  createMPK(appId: string, options: MPKExportOptions): Promise<MPKExportResult>;
  deployApp(appId: string, environment: string, packageId?: string): Promise<MendixDeployment>;
  getDeploymentStatus(appId: string, deploymentId: string): Promise<MendixDeployment>;
}

export class MendixClient implements IMendixClient {
  private config: MendixClientConfig;
  private baseUrl: string;

  constructor(config: MendixClientConfig) {
    this.config = config;
    this.baseUrl = config.teamServerUrl || 'https://deploy.mendix.com/api/1';
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Mendix-Username': this.config.username,
        'Mendix-ApiKey': this.config.apiKey,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mendix API ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return {} as T;
  }

  /**
   * Get app/project details by ID
   */
  async getApp(appId: string): Promise<MendixProject> {
    const response = await this.request<{
      AppId: string;
      Name: string;
      Description: string;
      TeamServerId: string;
    }>('GET', `/apps/${appId}`);

    return {
      id: response.AppId,
      name: response.Name,
      description: response.Description || '',
      teamServerId: response.TeamServerId,
      branchLine: 'main',
      revision: 0,
    };
  }

  /**
   * Find app by name
   */
  async getAppByName(name: string): Promise<MendixProject | null> {
    const response = await this.request<Array<{ AppId: string; Name: string }>>('GET', '/apps');
    const app = response.find((a) => a.Name === name);
    if (!app) return null;
    return this.getApp(app.AppId);
  }

  /**
   * List all branches for an app
   */
  async listBranches(appId: string): Promise<MendixBranch[]> {
    const response = await this.request<
      Array<{
        Name: string;
        DisplayName: string;
        LatestRevisionNumber: number;
        IsMainLine: boolean;
        CreatedDate: string;
      }>
    >('GET', `/apps/${appId}/branches`);

    return response.map((b) => ({
      name: b.Name,
      displayName: b.DisplayName,
      latestRevision: b.LatestRevisionNumber,
      isMainLine: b.IsMainLine,
      createdDate: b.CreatedDate,
    }));
  }

  /**
   * Create a new branch from main or specific revision
   */
  async createBranch(
    appId: string,
    branchName: string,
    fromRevision?: number
  ): Promise<MendixBranch> {
    const response = await this.request<{
      Name: string;
      DisplayName: string;
      LatestRevisionNumber: number;
      IsMainLine: boolean;
      CreatedDate: string;
    }>('POST', `/apps/${appId}/branches`, {
      Name: branchName,
      ...(fromRevision !== undefined ? { FromRevision: fromRevision } : {}),
    });

    return {
      name: response.Name,
      displayName: response.DisplayName,
      latestRevision: response.LatestRevisionNumber,
      isMainLine: response.IsMainLine,
      createdDate: response.CreatedDate,
    };
  }

  /**
   * Delete a branch
   */
  async deleteBranch(appId: string, branchName: string): Promise<void> {
    await this.request('DELETE', `/apps/${appId}/branches/${encodeURIComponent(branchName)}`);
  }

  /**
   * Get modules in an app
   */
  async getModules(appId: string, branchName = 'main'): Promise<MendixModule[]> {
    const response = await this.request<
      Array<{
        Id: string;
        Name: string;
        Documentation: string;
      }>
    >('GET', `/apps/${appId}/branches/${encodeURIComponent(branchName)}/modules`);

    return response.map((m) => ({
      id: m.Id,
      name: m.Name,
      documentation: m.Documentation || '',
      pages: [],
      entities: [],
      microflows: [],
    }));
  }

  /**
   * Get a specific page
   */
  async getPage(appId: string, pageId: string, branchName = 'main'): Promise<MendixPage> {
    const response = await this.request<{
      Id: string;
      Name: string;
      Widgets: Array<{ Id: string; Type: string; Name: string }>;
    }>('GET', `/apps/${appId}/branches/${encodeURIComponent(branchName)}/pages/${pageId}`);

    return {
      id: response.Id,
      name: response.Name,
      widgets: (response.Widgets || []).map((w) => ({
        id: w.Id,
        type: w.Type as MendixPage['widgets'][0]['type'],
        name: w.Name,
        properties: {},
      })),
    };
  }

  /**
   * Create a new page in a module
   */
  async createPage(
    appId: string,
    moduleId: string,
    pageName: string,
    branchName = 'main'
  ): Promise<MendixPage> {
    const response = await this.request<{
      Id: string;
      Name: string;
    }>(
      'POST',
      `/apps/${appId}/branches/${encodeURIComponent(branchName)}/modules/${moduleId}/pages`,
      { Name: pageName }
    );

    return {
      id: response.Id,
      name: response.Name,
      widgets: [],
    };
  }

  /**
   * Commit changes to a branch
   */
  async commitChanges(
    appId: string,
    message: string,
    branchName = 'main'
  ): Promise<{ revision: number }> {
    const response = await this.request<{ Revision: number }>(
      'POST',
      `/apps/${appId}/branches/${encodeURIComponent(branchName)}/commit`,
      { Message: message }
    );

    return { revision: response.Revision };
  }

  /**
   * Create an MPK deployment package
   */
  async createMPK(appId: string, options: MPKExportOptions): Promise<MPKExportResult> {
    const response = await this.request<{
      PackageId: string;
      FilePath: string;
      FileSize: number;
      Revision: number;
    }>('POST', `/apps/${appId}/packages`, {
      Revision: options.revision,
      IncludeDeploymentPackage: options.includeDeploymentPackage ?? true,
    });

    return {
      success: true,
      filePath: response.FilePath || options.outputPath,
      fileSize: response.FileSize,
      exportedAt: new Date(),
      revision: response.Revision,
    };
  }

  /**
   * Deploy app to an environment
   */
  async deployApp(
    appId: string,
    environment: string,
    packageId?: string
  ): Promise<MendixDeployment> {
    const response = await this.request<{
      JobId: string;
      Status: string;
      Environment: string;
      Url?: string;
    }>('POST', `/apps/${appId}/environments/${environment}/deploy`, {
      ...(packageId ? { PackageId: packageId } : {}),
    });

    return {
      id: response.JobId,
      status: response.Status.toLowerCase() as MendixDeployment['status'],
      environment: response.Environment,
      url: response.Url,
    };
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(appId: string, deploymentId: string): Promise<MendixDeployment> {
    const response = await this.request<{
      JobId: string;
      Status: string;
      Environment: string;
      Url?: string;
      StartedAt?: string;
      CompletedAt?: string;
    }>('GET', `/apps/${appId}/deployments/${deploymentId}`);

    return {
      id: response.JobId,
      status: response.Status.toLowerCase() as MendixDeployment['status'],
      environment: response.Environment,
      url: response.Url,
      startedAt: response.StartedAt,
      completedAt: response.CompletedAt,
    };
  }

  /**
   * Check if client is configured with valid credentials
   */
  isConfigured(): boolean {
    return Boolean(this.config.username && this.config.apiKey);
  }
}

/**
 * Mock client for testing
 */
export class MockMendixClient implements IMendixClient {
  private mockProjects: Map<string, MendixProject> = new Map([
    [
      'mock-app-1',
      {
        id: 'mock-app-1',
        name: 'Mock Project',
        description: 'Mock Mendix project for testing',
        teamServerId: 'mock-server',
        branchLine: 'main',
        revision: 1,
      },
    ],
  ]);

  private mockBranches: Map<string, MendixBranch[]> = new Map([
    [
      'mock-app-1',
      [
        {
          name: 'main',
          displayName: 'Main line',
          latestRevision: 10,
          isMainLine: true,
          createdDate: '2024-01-01T00:00:00Z',
        },
      ],
    ],
  ]);

  private currentRevision = 10;

  async getApp(appId: string): Promise<MendixProject> {
    const project = this.mockProjects.get(appId);
    if (!project) {
      throw new Error(`App not found: ${appId}`);
    }
    return project;
  }

  async getAppByName(name: string): Promise<MendixProject | null> {
    const projects = Array.from(this.mockProjects.values());
    for (const project of projects) {
      if (project.name === name) return project;
    }
    return null;
  }

  async listBranches(appId: string): Promise<MendixBranch[]> {
    return this.mockBranches.get(appId) || [];
  }

  async createBranch(
    appId: string,
    branchName: string,
    fromRevision?: number
  ): Promise<MendixBranch> {
    const branch: MendixBranch = {
      name: branchName,
      displayName: branchName,
      latestRevision: fromRevision || this.currentRevision,
      isMainLine: false,
      createdDate: new Date().toISOString(),
    };

    const branches = this.mockBranches.get(appId) || [];
    branches.push(branch);
    this.mockBranches.set(appId, branches);

    return branch;
  }

  async deleteBranch(appId: string, branchName: string): Promise<void> {
    const branches = this.mockBranches.get(appId) || [];
    this.mockBranches.set(
      appId,
      branches.filter((b) => b.name !== branchName)
    );
  }

  async getModules(): Promise<MendixModule[]> {
    return [
      {
        id: 'module-1',
        name: 'MockModule',
        documentation: 'Mock module for testing',
        pages: [],
        entities: [],
        microflows: [],
      },
    ];
  }

  async getPage(): Promise<MendixPage> {
    return {
      id: 'page-1',
      name: 'MockPage',
      widgets: [],
    };
  }

  async createPage(
    _appId: string,
    _moduleId: string,
    pageName: string
  ): Promise<MendixPage> {
    return {
      id: `page-${Date.now()}`,
      name: pageName,
      widgets: [],
    };
  }

  async commitChanges(): Promise<{ revision: number }> {
    this.currentRevision++;
    return { revision: this.currentRevision };
  }

  async createMPK(_appId: string, options: MPKExportOptions): Promise<MPKExportResult> {
    return {
      success: true,
      filePath: options.outputPath || '/mock/export.mpk',
      fileSize: 1024 * 1024, // 1MB mock
      exportedAt: new Date(),
      revision: this.currentRevision,
    };
  }

  async deployApp(
    _appId: string,
    environment: string
  ): Promise<MendixDeployment> {
    return {
      id: `deploy-${Date.now()}`,
      status: 'queued',
      environment,
      startedAt: new Date().toISOString(),
    };
  }

  async getDeploymentStatus(
    _appId: string,
    deploymentId: string
  ): Promise<MendixDeployment> {
    return {
      id: deploymentId,
      status: 'running',
      environment: 'acceptance',
      url: 'https://mock-app.mendixcloud.com',
      startedAt: new Date(Date.now() - 60000).toISOString(),
      completedAt: new Date().toISOString(),
    };
  }
}
