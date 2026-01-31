/**
 * Mock OAuth 2.1 Server for Testing
 *
 * Simulates a complete OAuth 2.1 provider with PKCE support.
 * Use this for testing OAuth flows without external dependencies.
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.2 - OAuth Testing Infrastructure
 */

import { createHash } from 'crypto';

// ============================================
// TYPES
// ============================================

interface MockAuthorizationRequest {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  state: string;
  code_challenge: string;
  code_challenge_method: string;
  scope?: string;
}

interface MockTokenRequest {
  grant_type: string;
  code?: string;
  refresh_token?: string;
  redirect_uri?: string;
  client_id: string;
  client_secret?: string;
  code_verifier?: string;
}

interface StoredAuthorizationCode {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  expiresAt: number;
  used: boolean;
}

interface StoredToken {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  scope: string;
  expiresAt: number;
}

// ============================================
// MOCK OAUTH SERVER
// ============================================

/**
 * In-memory mock OAuth 2.1 server
 *
 * Implements:
 * - Authorization endpoint with PKCE
 * - Token endpoint (authorization_code and refresh_token grants)
 * - Token revocation
 * - PKCE verification (S256 only)
 *
 * @example
 * ```typescript
 * const server = new MockOAuthServer();
 *
 * // Start authorization
 * const authUrl = server.authorize({
 *   response_type: 'code',
 *   client_id: 'test-client',
 *   redirect_uri: 'http://localhost:3000/callback',
 *   state: 'random-state',
 *   code_challenge: 'challenge',
 *   code_challenge_method: 'S256',
 * });
 *
 * // Extract code from redirect
 * const code = new URL(authUrl).searchParams.get('code');
 *
 * // Exchange for token
 * const tokens = await server.token({
 *   grant_type: 'authorization_code',
 *   code: code!,
 *   client_id: 'test-client',
 *   code_verifier: 'verifier',
 * });
 * ```
 */
export class MockOAuthServer {
  private codes = new Map<string, StoredAuthorizationCode>();
  private tokens = new Map<string, StoredToken>();
  private revokedTokens = new Set<string>();

  // Configuration
  private accessTokenLifetime = 3600; // 1 hour
  private refreshTokenLifetime = 86400 * 30; // 30 days
  private codeLifetime = 600; // 10 minutes

  /**
   * Handle authorization request
   *
   * OAuth 2.1 validations:
   * - response_type must be 'code'
   * - PKCE is required (code_challenge + code_challenge_method)
   * - code_challenge_method must be 'S256'
   *
   * @returns Redirect URI with authorization code
   */
  authorize(request: MockAuthorizationRequest): string {
    // Validate OAuth 2.1 requirements
    if (request.response_type !== 'code') {
      throw new Error('Invalid response_type. OAuth 2.1 requires "code".');
    }

    if (!request.code_challenge || !request.code_challenge_method) {
      throw new Error('PKCE is required in OAuth 2.1');
    }

    if (request.code_challenge_method !== 'S256') {
      throw new Error('code_challenge_method must be S256');
    }

    if (!request.client_id) {
      throw new Error('client_id is required');
    }

    if (!request.redirect_uri) {
      throw new Error('redirect_uri is required');
    }

    if (!request.state) {
      throw new Error('state is required for CSRF protection');
    }

    // Generate authorization code
    const code = this.generateCode();

    // Store authorization code with PKCE challenge
    this.codes.set(code, {
      code,
      clientId: request.client_id,
      redirectUri: request.redirect_uri,
      codeChallenge: request.code_challenge,
      codeChallengeMethod: request.code_challenge_method,
      scope: request.scope || '',
      expiresAt: Date.now() + this.codeLifetime * 1000,
      used: false,
    });

    // Build redirect URL with code and state
    const redirectUrl = new URL(request.redirect_uri);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', request.state);

    return redirectUrl.toString();
  }

  /**
   * Handle token request
   *
   * Supports:
   * - authorization_code grant with PKCE verification
   * - refresh_token grant
   *
   * @returns Token response
   */
  async token(request: MockTokenRequest): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
  }> {
    if (request.grant_type === 'authorization_code') {
      return this.handleAuthorizationCodeGrant(request);
    } else if (request.grant_type === 'refresh_token') {
      return this.handleRefreshTokenGrant(request);
    } else {
      throw new Error(`Unsupported grant_type: ${request.grant_type}`);
    }
  }

  /**
   * Handle authorization_code grant
   */
  private handleAuthorizationCodeGrant(request: MockTokenRequest): {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
  } {
    if (!request.code) {
      throw new Error('code is required for authorization_code grant');
    }

    if (!request.code_verifier) {
      throw new Error('code_verifier is required for PKCE verification');
    }

    // Look up authorization code
    const storedCode = this.codes.get(request.code);

    if (!storedCode) {
      throw new Error('Invalid authorization code');
    }

    if (storedCode.used) {
      // Code reuse detected - revoke all tokens for this client
      this.revokeAllTokensForClient(storedCode.clientId);
      throw new Error('Authorization code already used');
    }

    if (Date.now() > storedCode.expiresAt) {
      this.codes.delete(request.code);
      throw new Error('Authorization code expired');
    }

    if (storedCode.clientId !== request.client_id) {
      throw new Error('client_id mismatch');
    }

    // Verify PKCE challenge
    const computedChallenge = this.computeChallenge(request.code_verifier);
    if (computedChallenge !== storedCode.codeChallenge) {
      throw new Error('PKCE verification failed');
    }

    // Mark code as used
    storedCode.used = true;

    // Generate tokens
    const accessToken = this.generateToken('access');
    const refreshToken = this.generateToken('refresh');

    // Store tokens
    this.tokens.set(accessToken, {
      accessToken,
      refreshToken,
      clientId: request.client_id,
      scope: storedCode.scope,
      expiresAt: Date.now() + this.accessTokenLifetime * 1000,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.accessTokenLifetime,
      refresh_token: refreshToken,
      scope: storedCode.scope,
    };
  }

  /**
   * Handle refresh_token grant
   */
  private handleRefreshTokenGrant(request: MockTokenRequest): {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
  } {
    if (!request.refresh_token) {
      throw new Error('refresh_token is required');
    }

    // Find token by refresh token
    const storedToken = Array.from(this.tokens.values()).find(
      (t) => t.refreshToken === request.refresh_token
    );

    if (!storedToken) {
      throw new Error('Invalid refresh token');
    }

    if (this.revokedTokens.has(storedToken.refreshToken)) {
      throw new Error('Refresh token has been revoked');
    }

    if (storedToken.clientId !== request.client_id) {
      throw new Error('client_id mismatch');
    }

    // Generate new access token (keep same refresh token)
    const newAccessToken = this.generateToken('access');

    // Remove old access token
    this.tokens.delete(storedToken.accessToken);

    // Store new access token
    this.tokens.set(newAccessToken, {
      ...storedToken,
      accessToken: newAccessToken,
      expiresAt: Date.now() + this.accessTokenLifetime * 1000,
    });

    return {
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: this.accessTokenLifetime,
      scope: storedToken.scope,
    };
  }

  /**
   * Revoke a token
   */
  revoke(token: string): void {
    // Find and revoke access token
    const storedToken = this.tokens.get(token);

    if (storedToken) {
      this.tokens.delete(token);
      this.revokedTokens.add(storedToken.refreshToken);
      return;
    }

    // Find and revoke by refresh token
    const tokenByRefresh = Array.from(this.tokens.values()).find(
      (t) => t.refreshToken === token
    );

    if (tokenByRefresh) {
      this.tokens.delete(tokenByRefresh.accessToken);
      this.revokedTokens.add(token);
    }

    // Per RFC 7009: succeed even if token is invalid
  }

  /**
   * Validate an access token
   *
   * @returns Token info or null if invalid
   */
  validateToken(accessToken: string): { clientId: string; scope: string } | null {
    const storedToken = this.tokens.get(accessToken);

    if (!storedToken) {
      return null;
    }

    if (Date.now() > storedToken.expiresAt) {
      this.tokens.delete(accessToken);
      return null;
    }

    if (this.revokedTokens.has(storedToken.refreshToken)) {
      this.tokens.delete(accessToken);
      return null;
    }

    return {
      clientId: storedToken.clientId,
      scope: storedToken.scope,
    };
  }

  /**
   * Introspect a token (for testing)
   */
  introspect(token: string): StoredToken | null {
    return this.tokens.get(token) || null;
  }

  /**
   * Clear all stored data (for testing)
   */
  reset(): void {
    this.codes.clear();
    this.tokens.clear();
    this.revokedTokens.clear();
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private generateCode(): string {
    return `code_${Math.random().toString(36).substring(2, 15)}${Math.random()
      .toString(36)
      .substring(2, 15)}`;
  }

  private generateToken(type: 'access' | 'refresh'): string {
    return `${type}_${Math.random().toString(36).substring(2, 15)}${Math.random()
      .toString(36)
      .substring(2, 15)}`;
  }

  private computeChallenge(verifier: string): string {
    // S256: BASE64URL(SHA256(code_verifier))
    const hash = createHash('sha256').update(verifier).digest();
    return hash.toString('base64url');
  }

  private revokeAllTokensForClient(clientId: string): void {
    // Revoke all tokens for a client (security measure for code reuse)
    for (const [accessToken, storedToken] of this.tokens.entries()) {
      if (storedToken.clientId === clientId) {
        this.tokens.delete(accessToken);
        this.revokedTokens.add(storedToken.refreshToken);
      }
    }
  }
}

// ============================================
// SINGLETON INSTANCE FOR TESTING
// ============================================

let mockServerInstance: MockOAuthServer | null = null;

/**
 * Get singleton mock OAuth server instance
 */
export function getMockOAuthServer(): MockOAuthServer {
  if (!mockServerInstance) {
    mockServerInstance = new MockOAuthServer();
  }
  return mockServerInstance;
}

/**
 * Reset mock OAuth server (for tests)
 */
export function resetMockOAuthServer(): void {
  if (mockServerInstance) {
    mockServerInstance.reset();
  }
}
