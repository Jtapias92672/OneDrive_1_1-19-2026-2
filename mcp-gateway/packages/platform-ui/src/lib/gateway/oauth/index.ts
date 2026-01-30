/**
 * MCP Security Gateway - OAuth Module
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.4 - Gateway OAuth Integration
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   OAuth 2.1 with PKCE module exports.
 *   Provides complete OAuth flow for MCP tool authorization.
 */

// ============================================
// PKCE
// ============================================

export {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  generatePKCEChallenge,
  verifyCodeChallenge,
  isValidCodeVerifier,
  RFC7636_TEST_VECTORS,
  type PKCEChallenge,
  type PKCEOptions,
} from './pkce';

// ============================================
// OAUTH CLIENT
// ============================================

export {
  OAuthClient,
  OAuthTokenError,
  type OAuthClientConfig,
  type AuthorizationUrlResult,
  type TokenResponse,
  type OAuthError,
  type AuthorizationSession,
} from './oauth-client';

// ============================================
// TOKEN MANAGER
// ============================================

export {
  TokenManager,
  TokenNotFoundError,
  TokenExpiredError,
  TokenRefreshError,
  type TokenSet,
  type TokenManagerConfig,
  type TokenManagerStats,
  type RefreshResult,
} from './token-manager';

// ============================================
// SCOPES
// ============================================

export {
  ScopeManager,
  STANDARD_SCOPES,
  type ScopeDefinition,
  type ScopeRequest,
  type ScopeValidationResult,
} from './scopes';

// ============================================
// DEFAULT EXPORT
// ============================================

export { OAuthClient as default } from './oauth-client';
