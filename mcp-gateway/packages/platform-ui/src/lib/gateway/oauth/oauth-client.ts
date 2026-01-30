/**
 * MCP Security Gateway - OAuth 2.1 Client
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.2 - OAuth Client Implementation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   OAuth 2.1 client implementation with mandatory PKCE support.
 *   Prevents Confused Deputy attacks per 2025 MCP security analysis.
 *
 *   OAuth 2.1 Requirements:
 *   - PKCE is REQUIRED (no implicit flow)
 *   - Refresh tokens are bound to client
 *   - Access tokens are short-lived
 */

import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from './pkce';

// ============================================
// TYPES
// ============================================

/**
 * OAuth 2.1 client configuration
 */
export interface OAuthClientConfig {
  /** OAuth client ID */
  clientId: string;

  /** OAuth client secret (for confidential clients) */
  clientSecret?: string;

  /** Authorization endpoint URL */
  authorizationEndpoint: string;

  /** Token endpoint URL */
  tokenEndpoint: string;

  /** Redirect URI after authorization */
  redirectUri: string;

  /** Token revocation endpoint */
  revocationEndpoint?: string;

  /** Userinfo endpoint */
  userinfoEndpoint?: string;

  /** Default scopes to request */
  defaultScopes?: string[];

  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Authorization URL response
 */
export interface AuthorizationUrlResult {
  /** Full authorization URL to redirect user to */
  url: string;

  /** Code verifier to store for token exchange */
  codeVerifier: string;

  /** State parameter for CSRF protection */
  state: string;
}

/**
 * Token response from OAuth server
 */
export interface TokenResponse {
  /** Access token */
  access_token: string;

  /** Token type (usually "Bearer") */
  token_type: string;

  /** Access token lifetime in seconds */
  expires_in: number;

  /** Refresh token (optional) */
  refresh_token?: string;

  /** Granted scopes */
  scope?: string;

  /** ID token for OpenID Connect */
  id_token?: string;
}

/**
 * OAuth error response
 */
export interface OAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
}

/**
 * Authorization session stored during OAuth flow
 */
export interface AuthorizationSession {
  /** User ID initiating the flow */
  userId: string;

  /** State parameter for CSRF */
  state: string;

  /** Code verifier for PKCE */
  codeVerifier: string;

  /** Session expiration timestamp */
  expiresAt: number;

  /** Requested scopes */
  scopes: string[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================
// OAUTH CLIENT CLASS
// ============================================

/**
 * OAuth 2.1 Client with mandatory PKCE
 *
 * @example
 * ```typescript
 * const client = new OAuthClient({
 *   clientId: 'my-app',
 *   authorizationEndpoint: 'https://auth.example.com/authorize',
 *   tokenEndpoint: 'https://auth.example.com/token',
 *   redirectUri: 'https://my-app.com/callback',
 * });
 *
 * // Start authorization flow
 * const { url, codeVerifier, state } = await client.getAuthorizationUrl(
 *   'user-123',
 *   ['read', 'write']
 * );
 *
 * // Store codeVerifier and state, redirect user to url
 *
 * // After callback, exchange code for tokens
 * const tokens = await client.exchangeCodeForToken(code, codeVerifier);
 * ```
 */
export class OAuthClient {
  private config: OAuthClientConfig;
  private sessions: Map<string, AuthorizationSession> = new Map();

  constructor(config: OAuthClientConfig) {
    this.config = {
      timeout: 30000,
      defaultScopes: [],
      ...config,
    };
  }

  // ==========================================
  // AUTHORIZATION
  // ==========================================

  /**
   * Build authorization URL with PKCE parameters
   *
   * OAuth 2.1 compliant:
   * - PKCE is required
   * - State parameter for CSRF protection
   * - No implicit flow (response_type always 'code')
   *
   * @param userId User initiating authorization
   * @param scopes Requested scopes
   * @param additionalParams Additional URL parameters
   * @returns Authorization URL and session data
   */
  async getAuthorizationUrl(
    userId: string,
    scopes?: string[],
    additionalParams?: Record<string, string>
  ): Promise<AuthorizationUrlResult> {
    // Generate PKCE challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Generate state for CSRF protection
    const state = generateState();

    // Build scopes
    const requestedScopes = scopes ?? this.config.defaultScopes ?? [];

    // Build authorization URL
    const url = new URL(this.config.authorizationEndpoint);
    url.searchParams.set('response_type', 'code'); // OAuth 2.1: always 'code'
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256'); // OAuth 2.1: always S256

    if (requestedScopes.length > 0) {
      url.searchParams.set('scope', requestedScopes.join(' '));
    }

    // Add any additional parameters
    if (additionalParams) {
      for (const [key, value] of Object.entries(additionalParams)) {
        url.searchParams.set(key, value);
      }
    }

    // Store session for callback validation
    const session: AuthorizationSession = {
      userId,
      state,
      codeVerifier,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minute expiry
      scopes: requestedScopes,
    };
    this.sessions.set(state, session);

    return {
      url: url.toString(),
      codeVerifier,
      state,
    };
  }

  /**
   * Get stored authorization session
   *
   * @param state State parameter from callback
   * @returns Session data or null if not found/expired
   */
  getSession(state: string): AuthorizationSession | null {
    const session = this.sessions.get(state);

    if (!session) {
      return null;
    }

    // Check expiration
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(state);
      return null;
    }

    return session;
  }

  /**
   * Clean up session after use
   *
   * @param state State parameter to clean up
   */
  cleanupSession(state: string): void {
    this.sessions.delete(state);
  }

  // ==========================================
  // TOKEN EXCHANGE
  // ==========================================

  /**
   * Exchange authorization code for tokens
   *
   * OAuth 2.1 compliant:
   * - PKCE verification via code_verifier
   * - Content-Type: application/x-www-form-urlencoded
   *
   * @param code Authorization code from callback
   * @param codeVerifier PKCE code verifier from session
   * @param redirectUri Redirect URI (must match authorization request)
   * @returns Token response
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    redirectUri?: string
  ): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri ?? this.config.redirectUri,
      client_id: this.config.clientId,
      code_verifier: codeVerifier, // PKCE verification
    });

    // Add client secret for confidential clients
    if (this.config.clientSecret) {
      body.set('client_secret', this.config.clientSecret);
    }

    const response = await this.makeTokenRequest(body);
    return response;
  }

  /**
   * Refresh an access token
   *
   * @param refreshToken The refresh token
   * @returns New token response
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
    });

    if (this.config.clientSecret) {
      body.set('client_secret', this.config.clientSecret);
    }

    const response = await this.makeTokenRequest(body);
    return response;
  }

  /**
   * Make token endpoint request
   */
  private async makeTokenRequest(body: URLSearchParams): Promise<TokenResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout ?? 30000
    );

    try {
      const response = await fetch(this.config.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const error = data as OAuthError;
        throw new OAuthTokenError(
          error.error_description ?? error.error ?? 'Token request failed',
          error.error,
          response.status
        );
      }

      return data as TokenResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof OAuthTokenError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new OAuthTokenError('Token request timed out', 'timeout', 408);
      }

      throw new OAuthTokenError(
        `Token request failed: ${(error as Error).message}`,
        'network_error',
        0
      );
    }
  }

  // ==========================================
  // TOKEN REVOCATION
  // ==========================================

  /**
   * Revoke a token
   *
   * @param token Token to revoke (access or refresh)
   * @param tokenTypeHint Type of token ('access_token' or 'refresh_token')
   */
  async revokeToken(
    token: string,
    tokenTypeHint?: 'access_token' | 'refresh_token'
  ): Promise<void> {
    if (!this.config.revocationEndpoint) {
      throw new Error('Revocation endpoint not configured');
    }

    const body = new URLSearchParams({
      token,
      client_id: this.config.clientId,
    });

    if (tokenTypeHint) {
      body.set('token_type_hint', tokenTypeHint);
    }

    if (this.config.clientSecret) {
      body.set('client_secret', this.config.clientSecret);
    }

    const response = await fetch(this.config.revocationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    // Revocation should succeed even if token is invalid (per RFC 7009)
    if (!response.ok && response.status !== 200) {
      const error = await response.json().catch(() => ({}));
      throw new OAuthTokenError(
        (error as OAuthError).error_description ?? 'Revocation failed',
        (error as OAuthError).error ?? 'revocation_error',
        response.status
      );
    }
  }

  // ==========================================
  // USERINFO
  // ==========================================

  /**
   * Get user info from OpenID Connect userinfo endpoint
   *
   * @param accessToken Valid access token
   * @returns User info claims
   */
  async getUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    if (!this.config.userinfoEndpoint) {
      throw new Error('Userinfo endpoint not configured');
    }

    const response = await fetch(this.config.userinfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new OAuthTokenError(
        'Failed to fetch user info',
        'userinfo_error',
        response.status
      );
    }

    return await response.json() as Record<string, unknown>;
  }
}

// ============================================
// ERRORS
// ============================================

/**
 * OAuth token error
 */
export class OAuthTokenError extends Error {
  readonly errorCode: string;
  readonly statusCode: number;

  constructor(message: string, errorCode: string, statusCode: number) {
    super(message);
    this.name = 'OAuthTokenError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}

// ============================================
// EXPORTS
// ============================================

export default OAuthClient;
