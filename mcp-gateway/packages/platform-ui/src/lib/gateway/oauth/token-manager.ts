/**
 * MCP Security Gateway - Token Manager
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.3 - Token Manager with Refresh
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Manages OAuth tokens with automatic refresh before expiry.
 *   Implements secure token storage and rotation.
 */

import * as crypto from 'crypto';
import { OAuthClient, TokenResponse, OAuthTokenError } from './oauth-client';

// ============================================
// TYPES
// ============================================

/**
 * Token set for a user
 */
export interface TokenSet {
  /** Access token */
  accessToken: string;

  /** Refresh token (if available) */
  refreshToken?: string;

  /** Access token expiration timestamp (ms) */
  expiresAt: number;

  /** Granted scopes */
  scopes: string[];

  /** Token type (usually "Bearer") */
  tokenType: string;

  /** ID token for OpenID Connect */
  idToken?: string;

  /** When token was stored */
  storedAt: number;
}

/**
 * Encrypted token storage
 */
interface EncryptedTokenSet {
  /** Encrypted token data */
  encrypted: string;

  /** Initialization vector */
  iv: string;

  /** Auth tag */
  authTag: string;
}

/**
 * Token manager configuration
 */
export interface TokenManagerConfig {
  /** OAuth client for token operations */
  oauthClient: OAuthClient;

  /** Encryption key for token storage (32 bytes hex) */
  encryptionKey?: string;

  /** Refresh tokens this many ms before expiry (default: 5 min) */
  refreshBufferMs?: number;

  /** Enable automatic refresh (default: true) */
  autoRefresh?: boolean;

  /** Token refresh check interval (default: 60 sec) */
  refreshCheckIntervalMs?: number;
}

/**
 * Token refresh result
 */
export interface RefreshResult {
  success: boolean;
  tokenSet?: TokenSet;
  error?: string;
}

// ============================================
// CONSTANTS
// ============================================

/** Default refresh buffer (5 minutes before expiry) */
const DEFAULT_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/** Default refresh check interval (60 seconds) */
const DEFAULT_REFRESH_CHECK_INTERVAL_MS = 60 * 1000;

/** Encryption algorithm */
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// ============================================
// TOKEN MANAGER CLASS
// ============================================

/**
 * Token Manager with automatic refresh
 *
 * @example
 * ```typescript
 * const manager = new TokenManager({
 *   oauthClient: client,
 *   encryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
 * });
 *
 * // Store tokens after OAuth flow
 * await manager.storeTokens('user-123', tokenResponse);
 *
 * // Get valid token (auto-refreshes if needed)
 * const token = await manager.getValidToken('user-123');
 *
 * // Revoke on logout
 * await manager.revokeTokens('user-123');
 * ```
 */
export class TokenManager {
  private config: TokenManagerConfig;
  private tokens: Map<string, EncryptedTokenSet | TokenSet> = new Map();
  private encryptionKey: Buffer | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private refreshLocks: Set<string> = new Set();

  constructor(config: TokenManagerConfig) {
    this.config = {
      refreshBufferMs: DEFAULT_REFRESH_BUFFER_MS,
      autoRefresh: true,
      refreshCheckIntervalMs: DEFAULT_REFRESH_CHECK_INTERVAL_MS,
      ...config,
    };

    // Set up encryption if key provided
    if (config.encryptionKey) {
      this.encryptionKey = Buffer.from(config.encryptionKey, 'hex');
      if (this.encryptionKey.length !== 32) {
        throw new Error('Encryption key must be 32 bytes (64 hex characters)');
      }
    }

    // Start auto-refresh if enabled
    if (this.config.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  // ==========================================
  // TOKEN STORAGE
  // ==========================================

  /**
   * Store tokens for a user
   *
   * @param userId User identifier
   * @param response Token response from OAuth
   */
  async storeTokens(userId: string, response: TokenResponse): Promise<void> {
    const tokenSet: TokenSet = {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: Date.now() + response.expires_in * 1000,
      scopes: response.scope?.split(' ') ?? [],
      tokenType: response.token_type,
      idToken: response.id_token,
      storedAt: Date.now(),
    };

    // Encrypt if encryption is enabled
    if (this.encryptionKey) {
      const encrypted = this.encryptTokenSet(tokenSet);
      this.tokens.set(userId, encrypted);
    } else {
      this.tokens.set(userId, tokenSet);
    }
  }

  /**
   * Get token set for a user
   *
   * @param userId User identifier
   * @returns Token set or null if not found
   */
  getTokenSet(userId: string): TokenSet | null {
    const stored = this.tokens.get(userId);
    if (!stored) return null;

    // Decrypt if encrypted
    if (this.encryptionKey && this.isEncrypted(stored)) {
      try {
        return this.decryptTokenSet(stored as EncryptedTokenSet);
      } catch {
        // Decryption failed, remove corrupted token
        this.tokens.delete(userId);
        return null;
      }
    }

    return stored as TokenSet;
  }

  /**
   * Check if token storage contains a user
   */
  hasToken(userId: string): boolean {
    return this.tokens.has(userId);
  }

  /**
   * Delete tokens for a user
   */
  deleteTokens(userId: string): boolean {
    return this.tokens.delete(userId);
  }

  // ==========================================
  // TOKEN RETRIEVAL
  // ==========================================

  /**
   * Get a valid access token for a user
   *
   * Automatically refreshes if:
   * - Token is within refresh buffer of expiry
   * - Token is already expired
   *
   * @param userId User identifier
   * @returns Valid access token
   * @throws Error if no token or refresh fails
   */
  async getValidToken(userId: string): Promise<string> {
    const tokenSet = this.getTokenSet(userId);

    if (!tokenSet) {
      throw new TokenNotFoundError(`No token found for user ${userId}`);
    }

    const refreshBuffer = this.config.refreshBufferMs ?? DEFAULT_REFRESH_BUFFER_MS;
    const shouldRefresh = Date.now() + refreshBuffer > tokenSet.expiresAt;

    if (shouldRefresh) {
      if (!tokenSet.refreshToken) {
        throw new TokenExpiredError('Token expired and no refresh token available');
      }

      const result = await this.refreshToken(userId);
      if (!result.success) {
        throw new TokenRefreshError(result.error ?? 'Token refresh failed');
      }

      return result.tokenSet!.accessToken;
    }

    return tokenSet.accessToken;
  }

  /**
   * Check if a user's token is valid (not expired)
   */
  isTokenValid(userId: string): boolean {
    const tokenSet = this.getTokenSet(userId);
    if (!tokenSet) return false;

    return Date.now() < tokenSet.expiresAt;
  }

  /**
   * Check if a user's token needs refresh
   */
  needsRefresh(userId: string): boolean {
    const tokenSet = this.getTokenSet(userId);
    if (!tokenSet) return false;

    const refreshBuffer = this.config.refreshBufferMs ?? DEFAULT_REFRESH_BUFFER_MS;
    return Date.now() + refreshBuffer > tokenSet.expiresAt;
  }

  // ==========================================
  // TOKEN REFRESH
  // ==========================================

  /**
   * Refresh a user's token
   *
   * @param userId User identifier
   * @returns Refresh result
   */
  async refreshToken(userId: string): Promise<RefreshResult> {
    // Prevent concurrent refresh for same user
    if (this.refreshLocks.has(userId)) {
      // Wait for ongoing refresh
      await new Promise(resolve => setTimeout(resolve, 100));
      const tokenSet = this.getTokenSet(userId);
      return tokenSet
        ? { success: true, tokenSet }
        : { success: false, error: 'Concurrent refresh failed' };
    }

    this.refreshLocks.add(userId);

    try {
      const tokenSet = this.getTokenSet(userId);

      if (!tokenSet) {
        return { success: false, error: 'No token found' };
      }

      if (!tokenSet.refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }

      // Call OAuth client to refresh
      const response = await this.config.oauthClient.refreshToken(
        tokenSet.refreshToken
      );

      // Store new tokens
      await this.storeTokens(userId, response);

      const newTokenSet = this.getTokenSet(userId);
      return { success: true, tokenSet: newTokenSet ?? undefined };
    } catch (error) {
      const message =
        error instanceof OAuthTokenError
          ? error.message
          : (error as Error).message;

      return { success: false, error: message };
    } finally {
      this.refreshLocks.delete(userId);
    }
  }

  // ==========================================
  // TOKEN REVOCATION
  // ==========================================

  /**
   * Revoke all tokens for a user
   *
   * @param userId User identifier
   */
  async revokeTokens(userId: string): Promise<void> {
    const tokenSet = this.getTokenSet(userId);

    if (tokenSet) {
      // Revoke refresh token first (more important)
      if (tokenSet.refreshToken) {
        try {
          await this.config.oauthClient.revokeToken(
            tokenSet.refreshToken,
            'refresh_token'
          );
        } catch {
          // Continue even if revocation fails
        }
      }

      // Revoke access token
      try {
        await this.config.oauthClient.revokeToken(
          tokenSet.accessToken,
          'access_token'
        );
      } catch {
        // Continue even if revocation fails
      }
    }

    // Always delete local tokens
    this.deleteTokens(userId);
  }

  // ==========================================
  // AUTO-REFRESH
  // ==========================================

  /**
   * Start automatic token refresh background task
   */
  startAutoRefresh(): void {
    if (this.refreshInterval) return;

    const interval =
      this.config.refreshCheckIntervalMs ?? DEFAULT_REFRESH_CHECK_INTERVAL_MS;

    this.refreshInterval = setInterval(async () => {
      await this.checkAndRefreshTokens();
    }, interval);
  }

  /**
   * Stop automatic token refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Check all tokens and refresh if needed
   */
  private async checkAndRefreshTokens(): Promise<void> {
    for (const userId of this.tokens.keys()) {
      if (this.needsRefresh(userId)) {
        const tokenSet = this.getTokenSet(userId);
        if (tokenSet?.refreshToken) {
          await this.refreshToken(userId);
        }
      }
    }
  }

  // ==========================================
  // ENCRYPTION
  // ==========================================

  private encryptTokenSet(tokenSet: TokenSet): EncryptedTokenSet {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM,
      this.encryptionKey,
      iv
    );

    const data = JSON.stringify(tokenSet);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  private decryptTokenSet(encrypted: EncryptedTokenSet): TokenSet {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.authTag, 'hex');

    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      this.encryptionKey,
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  private isEncrypted(stored: EncryptedTokenSet | TokenSet): boolean {
    return 'encrypted' in stored && 'iv' in stored && 'authTag' in stored;
  }

  // ==========================================
  // CLEANUP
  // ==========================================

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens(): number {
    let cleaned = 0;

    for (const [userId] of this.tokens) {
      const tokenSet = this.getTokenSet(userId);
      if (!tokenSet) continue;

      // Remove if expired and no refresh token
      if (Date.now() > tokenSet.expiresAt && !tokenSet.refreshToken) {
        this.tokens.delete(userId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get statistics about stored tokens
   */
  getStats(): TokenManagerStats {
    let total = 0;
    let valid = 0;
    let expired = 0;
    let needsRefresh = 0;

    for (const userId of this.tokens.keys()) {
      total++;
      if (this.isTokenValid(userId)) {
        valid++;
      } else {
        expired++;
      }
      if (this.needsRefresh(userId)) {
        needsRefresh++;
      }
    }

    return { total, valid, expired, needsRefresh };
  }

  /**
   * Dispose of the token manager
   */
  dispose(): void {
    this.stopAutoRefresh();
    this.tokens.clear();
    this.refreshLocks.clear();
  }
}

// ============================================
// TYPES
// ============================================

export interface TokenManagerStats {
  total: number;
  valid: number;
  expired: number;
  needsRefresh: number;
}

// ============================================
// ERRORS
// ============================================

export class TokenNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenNotFoundError';
  }
}

export class TokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class TokenRefreshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenRefreshError';
  }
}

// ============================================
// EXPORTS
// ============================================

export default TokenManager;
