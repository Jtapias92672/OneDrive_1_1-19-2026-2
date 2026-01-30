/**
 * Figma API Client
 * Epic 11: External Integrations
 *
 * Real implementation of Figma REST API client.
 */
import { FigmaFile, FigmaClientConfig, GetFileOptions, GetImageOptions, FigmaImageResponse } from './figma-types';
export interface IFigmaClient {
    getFile(fileKey: string, options?: GetFileOptions): Promise<FigmaFile>;
    getFileNodes(fileKey: string, nodeIds: string[]): Promise<FigmaFile>;
    getImages(fileKey: string, options: GetImageOptions): Promise<FigmaImageResponse>;
    getTeamProjects(teamId: string): Promise<{
        projects: {
            id: string;
            name: string;
        }[];
    }>;
    getProjectFiles(projectId: string): Promise<{
        files: {
            key: string;
            name: string;
        }[];
    }>;
}
export declare class FigmaClient implements IFigmaClient {
    private config;
    private baseUrl;
    constructor(config: FigmaClientConfig);
    private request;
    getFile(fileKey: string, options?: GetFileOptions): Promise<FigmaFile>;
    getFileNodes(fileKey: string, nodeIds: string[]): Promise<FigmaFile>;
    getImages(fileKey: string, options: GetImageOptions): Promise<FigmaImageResponse>;
    getTeamProjects(teamId: string): Promise<{
        projects: {
            id: string;
            name: string;
        }[];
    }>;
    getProjectFiles(projectId: string): Promise<{
        files: {
            key: string;
            name: string;
        }[];
    }>;
    /**
     * Check if client is configured with valid credentials
     */
    isConfigured(): boolean;
}
/**
 * Mock client for testing
 */
export declare class MockFigmaClient implements IFigmaClient {
    getFile(): Promise<FigmaFile>;
    getFileNodes(): Promise<FigmaFile>;
    getImages(): Promise<FigmaImageResponse>;
    getTeamProjects(): Promise<{
        projects: {
            id: string;
            name: string;
        }[];
    }>;
    getProjectFiles(): Promise<{
        files: {
            key: string;
            name: string;
        }[];
    }>;
}
//# sourceMappingURL=figma-client.d.ts.map