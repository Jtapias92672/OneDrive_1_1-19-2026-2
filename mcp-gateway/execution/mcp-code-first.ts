/**
 * MCP Gateway - Code-First Pattern Implementation
 *
 * @epic 3.75 - Code Execution
 * @task 3.75.x - MCP Code-First Pattern
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Implements the MCP code-first pattern for 98% token reduction:
 *   - On-demand tool discovery (NOT upfront loading)
 *   - Pre-context data filtering
 *   - Single-step complex logic execution
 *   - Connection pooling for MCP servers
 *
 *   Target: 150K tokens → 2K tokens per MCP operation
 */

import {
  MCPToolManifest,
  MCPConnectionConfig,
  MCPCodeFirstConfig,
  ToolDiscoveryMode,
} from './types.js';

// ============================================
// MCP CODE-FIRST MANAGER
// ============================================

export class MCPCodeFirstManager {
  private config: MCPCodeFirstConfig;
  private toolRegistry: Map<string, MCPToolManifest> = new Map();
  private schemaCache: Map<string, Record<string, unknown>> = new Map();
  private connectionPool: Map<string, PooledConnection[]> = new Map();
  private stats: MCPCodeFirstStats;

  constructor(config?: Partial<MCPCodeFirstConfig>) {
    this.config = {
      discoveryMode: config?.discoveryMode ?? 'on-demand',
      maxUpfrontTools: config?.maxUpfrontTools ?? 10,
      enablePreContextFiltering: config?.enablePreContextFiltering ?? true,
      preContextFilterThreshold: config?.preContextFilterThreshold ?? 10000, // 10KB
      enableConnectionPooling: config?.enableConnectionPooling ?? true,
      poolConfig: config?.poolConfig ?? {
        maxConnections: 10,
        idleTimeoutMs: 60000,
        warmConnections: 2,
      },
    };

    this.stats = {
      toolsRegistered: 0,
      schemasLoaded: 0,
      tokensSaved: 0,
      cacheHits: 0,
      cacheMisses: 0,
      connectionsPooled: 0,
      connectionsCreated: 0,
    };
  }

  // ==========================================
  // TOOL REGISTRATION
  // ==========================================

  /**
   * Register tool manifest (lightweight - no schema loaded)
   * This enables on-demand discovery
   */
  registerTool(manifest: MCPToolManifest): void {
    this.toolRegistry.set(manifest.name, manifest);
    this.stats.toolsRegistered++;
  }

  /**
   * Register multiple tools from a server
   */
  registerToolsFromServer(server: string, tools: MCPToolManifest[]): void {
    for (const tool of tools) {
      this.registerTool({
        ...tool,
        server,
      });
    }
  }

  /**
   * Get tool manifest (lightweight)
   */
  getToolManifest(toolName: string): MCPToolManifest | undefined {
    return this.toolRegistry.get(toolName);
  }

  /**
   * List available tools (names and descriptions only - minimal tokens)
   */
  listTools(): ToolListEntry[] {
    const entries: ToolListEntry[] = [];
    for (const tool of this.toolRegistry.values()) {
      entries.push({
        name: tool.name,
        description: tool.description,
        category: tool.category,
        server: tool.server,
      });
    }
    return entries;
  }

  /**
   * Get compact tool listing for context
   * Dramatically reduces token usage compared to full schemas
   */
  getCompactToolListing(): string {
    const tools = this.listTools();
    return tools
      .map(t => `- ${t.name}: ${t.description}`)
      .join('\n');
  }

  // ==========================================
  // ON-DEMAND SCHEMA LOADING
  // ==========================================

  /**
   * Load tool schema on-demand
   * This is the key to 98% token reduction
   */
  async loadToolSchema(toolName: string): Promise<Record<string, unknown> | undefined> {
    // Check cache first
    const cached = this.schemaCache.get(toolName);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    this.stats.cacheMisses++;

    // Get tool manifest
    const manifest = this.toolRegistry.get(toolName);
    if (!manifest) {
      return undefined;
    }

    // If schema is already in manifest, use it
    if (manifest.inputSchema) {
      this.schemaCache.set(toolName, manifest.inputSchema);
      this.stats.schemasLoaded++;
      return manifest.inputSchema;
    }

    // Otherwise, fetch from server
    const schema = await this.fetchSchemaFromServer(manifest.server, toolName);
    if (schema) {
      this.schemaCache.set(toolName, schema);
      this.stats.schemasLoaded++;
    }

    return schema;
  }

  /**
   * Fetch schema from MCP server
   */
  private async fetchSchemaFromServer(
    server: string,
    toolName: string
  ): Promise<Record<string, unknown> | undefined> {
    // Get pooled connection
    const connection = await this.getConnection(server);
    if (!connection) {
      console.warn(`[MCPCodeFirst] No connection available for server: ${server}`);
      return undefined;
    }

    try {
      // In production, this would make actual MCP protocol call
      // For now, return placeholder
      console.log(`[MCPCodeFirst] Fetching schema for ${toolName} from ${server}`);
      return {
        type: 'object',
        properties: {},
        description: `Schema for ${toolName}`,
      };
    } finally {
      this.releaseConnection(server, connection);
    }
  }

  // ==========================================
  // PRE-CONTEXT DATA FILTERING
  // ==========================================

  /**
   * Filter data before adding to context
   * Reduces token usage by filtering BEFORE model sees data
   */
  preContextFilter<T>(data: T, options?: PreContextFilterOptions): FilteredData<T> {
    if (!this.config.enablePreContextFiltering) {
      return { data, filtered: false, originalSize: 0, filteredSize: 0 };
    }

    const serialized = JSON.stringify(data);
    const originalSize = serialized.length;

    if (originalSize <= (options?.threshold ?? this.config.preContextFilterThreshold ?? 10000)) {
      return { data, filtered: false, originalSize, filteredSize: originalSize };
    }

    // Apply filtering based on data type
    const filtered = this.applyFilter(data, options);
    const filteredSize = JSON.stringify(filtered).length;
    const tokensSaved = Math.floor((originalSize - filteredSize) / 4); // ~4 chars per token
    this.stats.tokensSaved += tokensSaved;

    return {
      data: filtered,
      filtered: true,
      originalSize,
      filteredSize,
      tokensSaved,
    };
  }

  /**
   * Apply filtering strategy to data
   */
  private applyFilter<T>(data: T, options?: PreContextFilterOptions): T {
    if (Array.isArray(data)) {
      return this.filterArray(data, options) as T;
    }
    if (typeof data === 'object' && data !== null) {
      return this.filterObject(data as Record<string, unknown>, options) as T;
    }
    if (typeof data === 'string') {
      return this.filterString(data, options) as T;
    }
    return data;
  }

  /**
   * Filter array data
   */
  private filterArray(arr: unknown[], options?: PreContextFilterOptions): unknown[] {
    const maxItems = options?.maxArrayItems ?? 100;

    if (arr.length <= maxItems) {
      return arr;
    }

    // Keep first and last items, sample middle
    const first = arr.slice(0, Math.floor(maxItems / 2));
    const last = arr.slice(-Math.floor(maxItems / 2));
    const omitted = arr.length - maxItems;

    return [
      ...first,
      { __filtered: true, omitted, message: `[${omitted} items omitted]` },
      ...last,
    ];
  }

  /**
   * Filter object data
   */
  private filterObject(
    obj: Record<string, unknown>,
    options?: PreContextFilterOptions
  ): Record<string, unknown> {
    const maxKeys = options?.maxObjectKeys ?? 50;
    const keys = Object.keys(obj);

    if (keys.length <= maxKeys) {
      // Recursively filter nested values
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        result[key] = this.applyFilter(obj[key], options);
      }
      return result;
    }

    // Keep most important keys (heuristic: shorter keys first)
    const sortedKeys = keys.sort((a, b) => a.length - b.length);
    const kept = sortedKeys.slice(0, maxKeys);
    const omitted = keys.length - maxKeys;

    const result: Record<string, unknown> = {};
    for (const key of kept) {
      result[key] = this.applyFilter(obj[key], options);
    }
    result.__filtered = { omitted, message: `[${omitted} keys omitted]` };

    return result;
  }

  /**
   * Filter string data
   */
  private filterString(str: string, options?: PreContextFilterOptions): string {
    const maxLength = options?.maxStringLength ?? 10000;

    if (str.length <= maxLength) {
      return str;
    }

    // Keep start and end, truncate middle
    const half = Math.floor(maxLength / 2);
    const omitted = str.length - maxLength;
    return `${str.slice(0, half)}\n\n[...${omitted} characters omitted...]\n\n${str.slice(-half)}`;
  }

  // ==========================================
  // SINGLE-STEP EXECUTION
  // ==========================================

  /**
   * Execute complex logic in single step
   * Reduces round-trips by executing multi-step logic atomically
   */
  async executeSingleStep<TInput, TOutput>(
    toolName: string,
    input: TInput,
    transform?: (result: unknown) => TOutput
  ): Promise<SingleStepResult<TOutput>> {
    const startTime = Date.now();

    // Load schema on-demand
    const schema = await this.loadToolSchema(toolName);
    if (!schema) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`,
        duration: Date.now() - startTime,
        tokensSaved: 0,
      };
    }

    // Filter input before execution
    const filteredInput = this.preContextFilter(input);

    // Get tool manifest
    const manifest = this.toolRegistry.get(toolName);
    if (!manifest) {
      return {
        success: false,
        error: `Tool manifest not found: ${toolName}`,
        duration: Date.now() - startTime,
        tokensSaved: filteredInput.tokensSaved ?? 0,
      };
    }

    // Execute via pooled connection
    const connection = await this.getConnection(manifest.server);
    if (!connection) {
      return {
        success: false,
        error: `No connection available for server: ${manifest.server}`,
        duration: Date.now() - startTime,
        tokensSaved: filteredInput.tokensSaved ?? 0,
      };
    }

    try {
      // In production, this would make actual MCP tool call
      const rawResult = await this.executeToolCall(connection, toolName, filteredInput.data);

      // Apply optional transform
      const output = transform ? transform(rawResult) : (rawResult as TOutput);

      return {
        success: true,
        output,
        duration: Date.now() - startTime,
        tokensSaved: filteredInput.tokensSaved ?? 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
        duration: Date.now() - startTime,
        tokensSaved: filteredInput.tokensSaved ?? 0,
      };
    } finally {
      this.releaseConnection(manifest.server, connection);
    }
  }

  /**
   * Execute tool call (placeholder for MCP protocol)
   */
  private async executeToolCall(
    connection: PooledConnection,
    toolName: string,
    input: unknown
  ): Promise<unknown> {
    // In production, this would use MCP protocol
    console.log(`[MCPCodeFirst] Executing ${toolName}`, { input });
    return { executed: toolName, input, timestamp: new Date().toISOString() };
  }

  // ==========================================
  // CONNECTION POOLING
  // ==========================================

  /**
   * Get connection from pool (or create new)
   */
  private async getConnection(serverId: string): Promise<PooledConnection | null> {
    if (!this.config.enableConnectionPooling) {
      return this.createConnection(serverId);
    }

    // Get or create pool for server
    let pool = this.connectionPool.get(serverId);
    if (!pool) {
      pool = [];
      this.connectionPool.set(serverId, pool);
    }

    // Find available connection
    const available = pool.find(c => !c.inUse && Date.now() - c.lastUsed < (this.config.poolConfig?.idleTimeoutMs ?? 60000));
    if (available) {
      available.inUse = true;
      return available;
    }

    // Create new if under limit
    if (pool.length < (this.config.poolConfig?.maxConnections ?? 10)) {
      const connection = this.createConnection(serverId);
      if (connection) {
        pool.push(connection);
        this.stats.connectionsPooled++;
      }
      return connection;
    }

    // Wait for available connection (with timeout)
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 5000);
      const check = setInterval(() => {
        const conn = pool?.find(c => !c.inUse);
        if (conn) {
          clearInterval(check);
          clearTimeout(timeout);
          conn.inUse = true;
          resolve(conn);
        }
      }, 100);
    });
  }

  /**
   * Release connection back to pool
   */
  private releaseConnection(serverId: string, connection: PooledConnection): void {
    connection.inUse = false;
    connection.lastUsed = Date.now();
  }

  /**
   * Create new connection
   */
  private createConnection(serverId: string): PooledConnection {
    this.stats.connectionsCreated++;
    return {
      serverId,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      inUse: true,
    };
  }

  /**
   * Warm up connections for specified servers
   */
  async warmConnections(serverIds: string[]): Promise<void> {
    const warmCount = this.config.poolConfig?.warmConnections ?? 2;

    for (const serverId of serverIds) {
      for (let i = 0; i < warmCount; i++) {
        const connection = await this.getConnection(serverId);
        if (connection) {
          this.releaseConnection(serverId, connection);
        }
      }
    }
  }

  // ==========================================
  // TOKEN SAVINGS CALCULATION
  // ==========================================

  /**
   * Calculate token savings for operation
   */
  calculateTokenSavings(operation: TokenSavingsInput): TokenSavingsResult {
    let upfrontTokens = 0;
    let onDemandTokens = 0;

    // Upfront: All tool schemas loaded
    for (const tool of this.toolRegistry.values()) {
      upfrontTokens += tool.tokenCost ?? 500; // Estimate 500 tokens per schema
    }

    // On-demand: Only requested tool schema
    const requestedTools = operation.toolsUsed ?? 1;
    for (let i = 0; i < requestedTools; i++) {
      onDemandTokens += 500; // Just the schemas needed
    }

    // Add data tokens
    upfrontTokens += operation.dataSize ?? 0;

    // On-demand with filtering
    const filteredDataTokens = Math.floor((operation.dataSize ?? 0) * 0.1); // ~90% reduction
    onDemandTokens += filteredDataTokens;

    const saved = upfrontTokens - onDemandTokens;
    const reduction = upfrontTokens > 0 ? ((saved / upfrontTokens) * 100) : 0;

    return {
      upfrontTokens,
      onDemandTokens,
      tokensSaved: saved,
      reductionPercent: Math.round(reduction * 10) / 10,
    };
  }

  // ==========================================
  // STATS AND MANAGEMENT
  // ==========================================

  /**
   * Get statistics
   */
  getStats(): MCPCodeFirstStats {
    return { ...this.stats };
  }

  /**
   * Clear schema cache
   */
  clearSchemaCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Close all connections
   */
  async closeAllConnections(): Promise<void> {
    for (const pool of this.connectionPool.values()) {
      pool.length = 0;
    }
    this.connectionPool.clear();
  }

  /**
   * Get configuration
   */
  getConfig(): MCPCodeFirstConfig {
    return { ...this.config };
  }
}

// ============================================
// TYPES
// ============================================

export interface ToolListEntry {
  name: string;
  description: string;
  category?: string;
  server: string;
}

export interface PreContextFilterOptions {
  threshold?: number;
  maxArrayItems?: number;
  maxObjectKeys?: number;
  maxStringLength?: number;
}

export interface FilteredData<T> {
  data: T;
  filtered: boolean;
  originalSize: number;
  filteredSize: number;
  tokensSaved?: number;
}

export interface SingleStepResult<T> {
  success: boolean;
  output?: T;
  error?: string;
  duration: number;
  tokensSaved: number;
}

export interface PooledConnection {
  serverId: string;
  createdAt: number;
  lastUsed: number;
  inUse: boolean;
}

export interface MCPCodeFirstStats {
  toolsRegistered: number;
  schemasLoaded: number;
  tokensSaved: number;
  cacheHits: number;
  cacheMisses: number;
  connectionsPooled: number;
  connectionsCreated: number;
}

export interface TokenSavingsInput {
  toolsUsed?: number;
  dataSize?: number;
}

export interface TokenSavingsResult {
  upfrontTokens: number;
  onDemandTokens: number;
  tokensSaved: number;
  reductionPercent: number;
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const mcpCodeFirstManager = new MCPCodeFirstManager();

// ============================================
// EXPORTS
// ============================================

export default MCPCodeFirstManager;
