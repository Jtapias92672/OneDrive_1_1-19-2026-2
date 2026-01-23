/**
 * FORGE C Session Manager
 * 
 * @epic 03 - FORGE C Core
 * @task 3.1 - Session Management
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Manages generation sessions - creation, tracking, persistence,
 *   and retrieval of session state.
 */

import {
  Session,
  SessionStatus,
  SessionStorageConfig,
  TokenUsage,
  SessionIteration,
  Message,
} from './types';

// ============================================
// SESSION MANAGER
// ============================================

export class SessionManager {
  private storage: SessionStorage;
  private config: SessionStorageConfig;

  constructor(config?: SessionStorageConfig) {
    this.config = config || { type: 'memory' };
    this.storage = this.createStorage(this.config);
  }

  private createStorage(config: SessionStorageConfig): SessionStorage {
    switch (config.type) {
      case 'memory':
        return new MemoryStorage();
      case 'file':
        return new FileStorage(config.filePath || './sessions');
      case 'redis':
        return new RedisStorage(config.connectionString || 'redis://localhost:6379');
      case 'database':
        return new DatabaseStorage(config.connectionString || '');
      default:
        return new MemoryStorage();
    }
  }

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  /**
   * Create a new session
   */
  async create(params: {
    contractId: string;
    input: unknown;
    provider: string;
    model: string;
    metadata?: Record<string, unknown>;
  }): Promise<Session> {
    const session: Session = {
      id: this.generateId(),
      contractId: params.contractId,
      status: 'created',
      input: params.input,
      iterations: [],
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provider: params.provider,
      model: params.model,
      tokenUsage: { input: 0, output: 0, total: 0 },
      cost: 0,
      metadata: params.metadata || {},
    };
    
    await this.storage.save(session);
    return session;
  }

  /**
   * Get a session by ID
   */
  async get(id: string): Promise<Session | null> {
    return this.storage.get(id);
  }

  /**
   * Update a session
   */
  async update(session: Session): Promise<void> {
    session.updatedAt = new Date().toISOString();
    await this.storage.save(session);
  }

  /**
   * Delete a session
   */
  async delete(id: string): Promise<void> {
    await this.storage.delete(id);
  }

  /**
   * List sessions with optional filtering
   */
  async list(options?: {
    status?: SessionStatus;
    contractId?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Session[]> {
    return this.storage.list(options);
  }

  // ==========================================
  // SESSION OPERATIONS
  // ==========================================

  /**
   * Add an iteration to a session
   */
  async addIteration(sessionId: string, iteration: SessionIteration): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    
    session.iterations.push(iteration);
    session.tokenUsage.input += iteration.tokensUsed * 0.3; // Estimate
    session.tokenUsage.output += iteration.tokensUsed * 0.7;
    session.tokenUsage.total += iteration.tokensUsed;
    
    await this.update(session);
  }

  /**
   * Add a message to session history
   */
  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    
    session.messages.push({
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    });
    
    await this.update(session);
  }

  /**
   * Update session status
   */
  async updateStatus(sessionId: string, status: SessionStatus): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    
    session.status = status;
    
    if (status === 'completed' || status === 'failed' || status === 'aborted') {
      session.completedAt = new Date().toISOString();
    }
    
    await this.update(session);
  }

  /**
   * Get session statistics
   */
  async getStats(): Promise<SessionStats> {
    const sessions = await this.list();
    
    const stats: SessionStats = {
      total: sessions.length,
      byStatus: {},
      totalTokens: 0,
      totalCost: 0,
      avgIterations: 0,
      avgDuration: 0,
    };
    
    let totalIterations = 0;
    let totalDuration = 0;
    let completedCount = 0;
    
    for (const session of sessions) {
      // Count by status
      stats.byStatus[session.status] = (stats.byStatus[session.status] || 0) + 1;
      
      // Sum tokens and cost
      stats.totalTokens += session.tokenUsage.total;
      stats.totalCost += session.cost;
      
      // Calculate averages for completed sessions
      if (session.completedAt) {
        totalIterations += session.iterations.length;
        const duration = new Date(session.completedAt).getTime() - new Date(session.createdAt).getTime();
        totalDuration += duration;
        completedCount++;
      }
    }
    
    if (completedCount > 0) {
      stats.avgIterations = totalIterations / completedCount;
      stats.avgDuration = totalDuration / completedCount;
    }
    
    return stats;
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  private generateId(): string {
    return `ses_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Clean up old sessions
   */
  async cleanup(maxAgeMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
    const sessions = await this.list();
    
    let deleted = 0;
    for (const session of sessions) {
      if (session.updatedAt < cutoff && 
          (session.status === 'completed' || session.status === 'failed' || session.status === 'aborted')) {
        await this.delete(session.id);
        deleted++;
      }
    }
    
    return deleted;
  }
}

// ============================================
// STORAGE INTERFACE
// ============================================

interface SessionStorage {
  save(session: Session): Promise<void>;
  get(id: string): Promise<Session | null>;
  delete(id: string): Promise<void>;
  list(options?: {
    status?: SessionStatus;
    contractId?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Session[]>;
}

// ============================================
// MEMORY STORAGE
// ============================================

class MemoryStorage implements SessionStorage {
  private sessions = new Map<string, Session>();

  async save(session: Session): Promise<void> {
    this.sessions.set(session.id, JSON.parse(JSON.stringify(session)));
  }

  async get(id: string): Promise<Session | null> {
    const session = this.sessions.get(id);
    return session ? JSON.parse(JSON.stringify(session)) : null;
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async list(options?: {
    status?: SessionStatus;
    contractId?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Session[]> {
    let sessions = Array.from(this.sessions.values());
    
    // Filter
    if (options?.status) {
      sessions = sessions.filter(s => s.status === options.status);
    }
    if (options?.contractId) {
      sessions = sessions.filter(s => s.contractId === options.contractId);
    }
    
    // Sort
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    sessions.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    
    // Paginate
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;
    sessions = sessions.slice(offset, offset + limit);
    
    return sessions.map(s => JSON.parse(JSON.stringify(s)));
  }
}

// ============================================
// FILE STORAGE (Stub)
// ============================================

class FileStorage implements SessionStorage {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async save(session: Session): Promise<void> {
    // Implementation would write to file system
    console.log(`[FileStorage] Would save session ${session.id} to ${this.basePath}`);
  }

  async get(id: string): Promise<Session | null> {
    // Implementation would read from file system
    console.log(`[FileStorage] Would get session ${id} from ${this.basePath}`);
    return null;
  }

  async delete(id: string): Promise<void> {
    console.log(`[FileStorage] Would delete session ${id} from ${this.basePath}`);
  }

  async list(): Promise<Session[]> {
    console.log(`[FileStorage] Would list sessions from ${this.basePath}`);
    return [];
  }
}

// ============================================
// REDIS STORAGE (Stub)
// ============================================

class RedisStorage implements SessionStorage {
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async save(session: Session): Promise<void> {
    console.log(`[RedisStorage] Would save session ${session.id}`);
  }

  async get(id: string): Promise<Session | null> {
    console.log(`[RedisStorage] Would get session ${id}`);
    return null;
  }

  async delete(id: string): Promise<void> {
    console.log(`[RedisStorage] Would delete session ${id}`);
  }

  async list(): Promise<Session[]> {
    console.log(`[RedisStorage] Would list sessions`);
    return [];
  }
}

// ============================================
// DATABASE STORAGE (Stub)
// ============================================

class DatabaseStorage implements SessionStorage {
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async save(session: Session): Promise<void> {
    console.log(`[DatabaseStorage] Would save session ${session.id}`);
  }

  async get(id: string): Promise<Session | null> {
    console.log(`[DatabaseStorage] Would get session ${id}`);
    return null;
  }

  async delete(id: string): Promise<void> {
    console.log(`[DatabaseStorage] Would delete session ${id}`);
  }

  async list(): Promise<Session[]> {
    console.log(`[DatabaseStorage] Would list sessions`);
    return [];
  }
}

// ============================================
// TYPES
// ============================================

export interface SessionStats {
  total: number;
  byStatus: Record<string, number>;
  totalTokens: number;
  totalCost: number;
  avgIterations: number;
  avgDuration: number;
}

// ============================================
// EXPORTS
// ============================================

export default SessionManager;
