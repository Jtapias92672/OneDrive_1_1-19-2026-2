/**
 * Figma API Client
 * Epic 11: External Integrations
 *
 * Interface for Figma REST API. Real implementation pending.
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
  }

  async getFile(fileKey: string, options?: GetFileOptions): Promise<FigmaFile> {
    // TODO: Implement real API call
    // GET /v1/files/:key
    throw new Error('Not implemented: Real Figma API integration pending');
  }

  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<FigmaFile> {
    // TODO: Implement real API call
    // GET /v1/files/:key/nodes?ids=:ids
    throw new Error('Not implemented: Real Figma API integration pending');
  }

  async getImages(fileKey: string, options: GetImageOptions): Promise<FigmaImageResponse> {
    // TODO: Implement real API call
    // GET /v1/images/:key
    throw new Error('Not implemented: Real Figma API integration pending');
  }

  async getTeamProjects(
    teamId: string
  ): Promise<{ projects: { id: string; name: string }[] }> {
    // TODO: Implement real API call
    // GET /v1/teams/:team_id/projects
    throw new Error('Not implemented: Real Figma API integration pending');
  }

  async getProjectFiles(
    projectId: string
  ): Promise<{ files: { key: string; name: string }[] }> {
    // TODO: Implement real API call
    // GET /v1/projects/:project_id/files
    throw new Error('Not implemented: Real Figma API integration pending');
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
