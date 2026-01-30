/**
 * FORGE Figma API Client
 *
 * @epic 05 - Figma Parser
 * @task 1.2 - API Client
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 *
 * @description
 *   REST API client for Figma with caching and rate limiting.
 *   Handles authentication, retries, and response parsing.
 */

import {
  FigmaFile,
  FigmaFileResponse,
  FigmaNodesResponse,
  FigmaImagesResponse,
  FigmaNode,
  ComponentMetadata,
} from '../types/figma-api.js';

// ============================================
// CONFIGURATION
// ============================================

export interface FigmaClientConfig {
  /** Figma Personal Access Token */
  accessToken: string;

  /** Base URL for Figma API (default: https://api.figma.com) */
  baseUrl?: string;

  /** Request timeout in ms (default: 30000) */
  timeout?: number;

  /** Max retries on failure (default: 3) */
  maxRetries?: number;

  /** Enable response caching (default: true) */
  enableCache?: boolean;

  /** Cache TTL in ms (default: 5 minutes) */
  cacheTtl?: number;

  /** Rate limit: requests per minute (default: 100) */
  rateLimit?: number;
}

const DEFAULT_CONFIG: Required<Omit<FigmaClientConfig, 'accessToken'>> = {
  baseUrl: 'https://api.figma.com',
  timeout: 30000,
  maxRetries: 3,
  enableCache: true,
  cacheTtl: 5 * 60 * 1000, // 5 minutes
  rateLimit: 100,
};

// ============================================
// CACHE IMPLEMENTATION
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private ttl: number;

  constructor(ttl: number) {
    this.ttl = ttl;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// ============================================
// RATE LIMITER
// ============================================

class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number = 60000; // 1 minute

  constructor(maxRequestsPerMinute: number) {
    this.maxRequests = maxRequestsPerMinute;
  }

  async acquire(): Promise<void> {
    const now = Date.now();

    // Remove requests outside the window
    this.requests = this.requests.filter(t => now - t < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      // Wait until oldest request expires
      const oldestRequest = this.requests[0] ?? now;
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // +100ms buffer
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.acquire();
    }

    this.requests.push(now);
  }
}

// ============================================
// ERROR TYPES
// ============================================

export class FigmaApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'FigmaApiError';
  }
}

export class FigmaRateLimitError extends FigmaApiError {
  constructor(retryAfter?: number) {
    super(`Rate limited by Figma API. Retry after ${retryAfter || 'unknown'} seconds`);
    this.name = 'FigmaRateLimitError';
  }
}

export class FigmaAuthError extends FigmaApiError {
  constructor() {
    super('Invalid Figma access token');
    this.name = 'FigmaAuthError';
  }
}

// ============================================
// FIGMA CLIENT
// ============================================

export class FigmaClient {
  private config: Required<FigmaClientConfig>;
  private cache: ResponseCache;
  private rateLimiter: RateLimiter;

  constructor(config: FigmaClientConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.cache = new ResponseCache(this.config.cacheTtl);
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
  }

  // ==========================================
  // CORE API METHODS
  // ==========================================

  /**
   * Get a Figma file
   */
  async getFile(fileKey: string, options?: {
    version?: string;
    ids?: string[];
    depth?: number;
    geometry?: 'paths' | 'bounds';
    pluginData?: string;
  }): Promise<FigmaFile> {
    const cacheKey = `file:${fileKey}:${JSON.stringify(options || {})}`;

    if (this.config.enableCache) {
      const cached = this.cache.get<FigmaFile>(cacheKey);
      if (cached) return cached;
    }

    const params = new URLSearchParams();
    if (options?.version) params.set('version', options.version);
    if (options?.ids) params.set('ids', options.ids.join(','));
    if (options?.depth) params.set('depth', options.depth.toString());
    if (options?.geometry) params.set('geometry', options.geometry);
    if (options?.pluginData) params.set('plugin_data', options.pluginData);

    const queryString = params.toString();
    const url = `/v1/files/${fileKey}${queryString ? `?${queryString}` : ''}`;

    const response = await this.request<FigmaFileResponse>(url);

    if (response.err) {
      throw new FigmaApiError(`Failed to get file: ${response.err}`);
    }

    const file: FigmaFile = {
      name: response.name || '',
      lastModified: response.lastModified || '',
      version: response.version || '',
      role: (response.role as FigmaFile['role']) || 'viewer',
      thumbnailUrl: response.thumbnailUrl,
      document: response.document!,
      components: response.components || {},
      componentSets: response.componentSets || {},
      styles: response.styles || {},
      schemaVersion: response.schemaVersion || 0,
    };

    if (this.config.enableCache) {
      this.cache.set(cacheKey, file);
    }

    return file;
  }

  /**
   * Get specific nodes from a file
   */
  async getFileNodes(fileKey: string, nodeIds: string[], options?: {
    version?: string;
    depth?: number;
    geometry?: 'paths' | 'bounds';
    pluginData?: string;
  }): Promise<Map<string, FigmaNode>> {
    const cacheKey = `nodes:${fileKey}:${nodeIds.join(',')}:${JSON.stringify(options || {})}`;

    if (this.config.enableCache) {
      const cached = this.cache.get<Map<string, FigmaNode>>(cacheKey);
      if (cached) return cached;
    }

    const params = new URLSearchParams();
    params.set('ids', nodeIds.join(','));
    if (options?.version) params.set('version', options.version);
    if (options?.depth) params.set('depth', options.depth.toString());
    if (options?.geometry) params.set('geometry', options.geometry);
    if (options?.pluginData) params.set('plugin_data', options.pluginData);

    const url = `/v1/files/${fileKey}/nodes?${params.toString()}`;
    const response = await this.request<FigmaNodesResponse>(url);

    if (response.err) {
      throw new FigmaApiError(`Failed to get nodes: ${response.err}`);
    }

    const nodes = new Map<string, FigmaNode>();
    for (const [id, data] of Object.entries(response.nodes)) {
      if (data?.document) {
        nodes.set(id, data.document);
      }
    }

    if (this.config.enableCache) {
      this.cache.set(cacheKey, nodes);
    }

    return nodes;
  }

  /**
   * Get images for nodes
   */
  async getImages(fileKey: string, nodeIds: string[], options?: {
    scale?: number;
    format?: 'jpg' | 'png' | 'svg' | 'pdf';
    svgIncludeId?: boolean;
    svgSimplifyStroke?: boolean;
    useAbsoluteBounds?: boolean;
    version?: string;
  }): Promise<Map<string, string>> {
    const params = new URLSearchParams();
    params.set('ids', nodeIds.join(','));
    if (options?.scale) params.set('scale', options.scale.toString());
    if (options?.format) params.set('format', options.format);
    if (options?.svgIncludeId) params.set('svg_include_id', 'true');
    if (options?.svgSimplifyStroke) params.set('svg_simplify_stroke', 'true');
    if (options?.useAbsoluteBounds) params.set('use_absolute_bounds', 'true');
    if (options?.version) params.set('version', options.version);

    const url = `/v1/images/${fileKey}?${params.toString()}`;
    const response = await this.request<FigmaImagesResponse>(url);

    if (response.err) {
      throw new FigmaApiError(`Failed to get images: ${response.err}`);
    }

    const images = new Map<string, string>();
    for (const [id, imageUrl] of Object.entries(response.images)) {
      if (imageUrl) {
        images.set(id, imageUrl);
      }
    }

    return images;
  }

  /**
   * Get image fills (for images used as fills)
   */
  async getImageFills(fileKey: string): Promise<Map<string, string>> {
    const url = `/v1/files/${fileKey}/images`;
    const response = await this.request<FigmaImagesResponse>(url);

    if (response.err) {
      throw new FigmaApiError(`Failed to get image fills: ${response.err}`);
    }

    const images = new Map<string, string>();
    for (const [ref, imageUrl] of Object.entries(response.images || {})) {
      if (imageUrl) {
        images.set(ref, imageUrl);
      }
    }

    return images;
  }

  /**
   * Get file components
   */
  async getComponents(fileKey: string): Promise<Map<string, ComponentMetadata>> {
    const file = await this.getFile(fileKey);
    return new Map(Object.entries(file.components));
  }

  // ==========================================
  // HTTP REQUEST HANDLING
  // ==========================================

  private async request<T>(endpoint: string, options?: {
    method?: string;
    body?: unknown;
  }): Promise<T> {
    await this.rateLimiter.acquire();

    const url = `${this.config.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method: options?.method || 'GET',
          headers: {
            'X-Figma-Token': this.config.accessToken,
            'Content-Type': 'application/json',
          },
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle errors
        if (response.status === 401) {
          throw new FigmaAuthError();
        }

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
          throw new FigmaRateLimitError(retryAfter);
        }

        if (!response.ok) {
          const errorBody = await response.text();
          throw new FigmaApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorBody
          );
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry auth errors
        if (error instanceof FigmaAuthError) {
          throw error;
        }

        // Rate limit - wait and retry
        if (error instanceof FigmaRateLimitError) {
          await new Promise(resolve => setTimeout(resolve, 60000));
          continue;
        }

        // Abort errors (timeout)
        if (lastError.name === 'AbortError') {
          lastError = new FigmaApiError(`Request timeout after ${this.config.timeout}ms`);
        }

        // Retry on transient errors
        if (attempt < this.config.maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
      }
    }

    throw lastError || new FigmaApiError('Unknown error');
  }

  // ==========================================
  // CACHE MANAGEMENT
  // ==========================================

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

// ============================================
// FACTORY
// ============================================

let defaultClient: FigmaClient | null = null;

export function createFigmaClient(config: FigmaClientConfig): FigmaClient {
  return new FigmaClient(config);
}

export function getDefaultClient(): FigmaClient {
  if (!defaultClient) {
    const token = process.env['FIGMA_ACCESS_TOKEN'];
    if (!token) {
      throw new Error('FIGMA_ACCESS_TOKEN environment variable not set');
    }
    defaultClient = new FigmaClient({ accessToken: token });
  }
  return defaultClient;
}

export function setDefaultClient(client: FigmaClient): void {
  defaultClient = client;
}

export default FigmaClient;
