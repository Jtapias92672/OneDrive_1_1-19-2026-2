/**
 * Figma API Client
 * Epic 11: External Integrations
 *
 * Real implementation of Figma REST API client.
 */

import {
  FigmaFile,
  FigmaClientConfig,
  GetFileOptions,
  GetImageOptions,
  FigmaImageResponse,
} from './figma-types';

export interface IFigmaClient {
  getFile(fileKey: string, options?: GetFileOptions): Promise<FigmaFile>;
  getFileNodes(fileKey: string, nodeIds: string[]): Promise<FigmaFile>;
  getImages(fileKey: string, options: GetImageOptions): Promise<FigmaImageResponse>;
  getTeamProjects(teamId: string): Promise<{ projects: { id: string; name: string }[] }>;
  getProjectFiles(projectId: string): Promise<{ files: { key: string; name: string }[] }>;
}

export class FigmaClient implements IFigmaClient {
  private config: FigmaClientConfig;
  private baseUrl: string;

  constructor(config: FigmaClientConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.figma.com/v1';

    if (!config.accessToken) {
      throw new Error('Figma access token required');
    }
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-Figma-Token': this.config.accessToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Figma API ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  async getFile(fileKey: string, options?: GetFileOptions): Promise<FigmaFile> {
    const params: Record<string, string> = {};
    if (options?.version) params.version = options.version;
    if (options?.depth) params.depth = options.depth.toString();
    if (options?.geometry) params.geometry = options.geometry;

    return this.request<FigmaFile>(`/files/${fileKey}`, params);
  }

  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<FigmaFile> {
    return this.request<FigmaFile>(`/files/${fileKey}/nodes`, {
      ids: nodeIds.join(','),
    });
  }

  async getImages(fileKey: string, options: GetImageOptions): Promise<FigmaImageResponse> {
    const params: Record<string, string> = {
      ids: options.ids.join(','),
    };
    if (options.format) params.format = options.format;
    if (options.scale) params.scale = options.scale.toString();

    return this.request<FigmaImageResponse>(`/images/${fileKey}`, params);
  }

  async getTeamProjects(
    teamId: string
  ): Promise<{ projects: { id: string; name: string }[] }> {
    return this.request(`/teams/${teamId}/projects`);
  }

  async getProjectFiles(
    projectId: string
  ): Promise<{ files: { key: string; name: string }[] }> {
    return this.request(`/projects/${projectId}/files`);
  }

  /**
   * Check if client is configured with valid credentials
   */
  isConfigured(): boolean {
    return Boolean(this.config.accessToken);
  }
}

/**
 * Mock client for testing
 */
export class MockFigmaClient implements IFigmaClient {
  async getFile(): Promise<FigmaFile> {
    return {
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [],
      },
      components: {},
      schemaVersion: 0,
      styles: {},
      name: 'Mock File',
      lastModified: new Date().toISOString(),
      thumbnailUrl: '',
      version: '1',
    };
  }

  async getFileNodes(): Promise<FigmaFile> {
    return this.getFile();
  }

  async getImages(): Promise<FigmaImageResponse> {
    return { images: {} };
  }

  async getTeamProjects(): Promise<{ projects: { id: string; name: string }[] }> {
    return { projects: [] };
  }

  async getProjectFiles(): Promise<{ files: { key: string; name: string }[] }> {
    return { files: [] };
  }
}
