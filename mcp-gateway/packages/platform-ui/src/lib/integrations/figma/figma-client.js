/**
 * Figma API Client
 * Epic 11: External Integrations
 *
 * Real implementation of Figma REST API client.
 */
export class FigmaClient {
    config;
    baseUrl;
    constructor(config) {
        this.config = config;
        this.baseUrl = config.baseUrl || 'https://api.figma.com/v1';
        if (!config.accessToken) {
            throw new Error('Figma access token required');
        }
    }
    async request(endpoint, params) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined)
                    url.searchParams.set(key, value);
            });
        }
        console.log(`[FigmaClient] Fetching: ${url.toString()}`);
        const fetchStart = Date.now();
        // Add timeout protection (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.error('[FigmaClient] Request timeout after 30 seconds');
            controller.abort();
        }, 30000);
        try {
            const response = await fetch(url.toString(), {
                headers: {
                    'X-Figma-Token': this.config.accessToken,
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const fetchElapsed = Date.now() - fetchStart;
            console.log(`[FigmaClient] Fetch completed in ${fetchElapsed}ms, status: ${response.status}`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[FigmaClient] Error response: ${errorText}`);
                throw new Error(`Figma API ${response.status}: ${errorText}`);
            }
            console.log('[FigmaClient] Parsing JSON response...');
            const jsonStart = Date.now();
            const json = await response.json();
            const jsonElapsed = Date.now() - jsonStart;
            console.log(`[FigmaClient] JSON parsed in ${jsonElapsed}ms`);
            return json;
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Figma API request timed out after 30 seconds');
            }
            throw error;
        }
    }
    async getFile(fileKey, options) {
        console.log('[FigmaClient.getFile] Called with fileKey:', fileKey);
        console.log('[FigmaClient.getFile] Options:', options);
        const params = {};
        if (options?.version)
            params.version = options.version;
        if (options?.depth)
            params.depth = options.depth.toString();
        if (options?.geometry)
            params.geometry = options.geometry;
        const result = await this.request(`/files/${fileKey}`, params);
        console.log('[FigmaClient.getFile] Response received, processing...');
        return result;
    }
    async getFileNodes(fileKey, nodeIds) {
        return this.request(`/files/${fileKey}/nodes`, {
            ids: nodeIds.join(','),
        });
    }
    async getImages(fileKey, options) {
        const params = {
            ids: options.ids.join(','),
        };
        if (options.format)
            params.format = options.format;
        if (options.scale)
            params.scale = options.scale.toString();
        return this.request(`/images/${fileKey}`, params);
    }
    async getTeamProjects(teamId) {
        return this.request(`/teams/${teamId}/projects`);
    }
    async getProjectFiles(projectId) {
        return this.request(`/projects/${projectId}/files`);
    }
    /**
     * Check if client is configured with valid credentials
     */
    isConfigured() {
        return Boolean(this.config.accessToken);
    }
}
/**
 * Mock client for testing
 */
export class MockFigmaClient {
    async getFile() {
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
    async getFileNodes() {
        return this.getFile();
    }
    async getImages() {
        return { images: {} };
    }
    async getTeamProjects() {
        return { projects: [] };
    }
    async getProjectFiles() {
        return { files: [] };
    }
}
//# sourceMappingURL=figma-client.js.map