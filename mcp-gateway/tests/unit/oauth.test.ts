/**
 * Unit Tests: OAuth 2.1 Module
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.1-3.6.4 - OAuth 2.1 with PKCE
 *
 * Tests PKCE, OAuth client, and token management per RFC 7636
 */

import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  verifyCodeChallenge,
  RFC7636_TEST_VECTORS,
  OAuthClient,
  TokenManager,
} from '../../oauth/index.js';

// ============================================
// PKCE TESTS (Task 3.6.1)
// ============================================

describe('PKCE Code Challenge', () => {
  describe('generateCodeVerifier', () => {
    it('should generate verifier with default length', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThan(40); // ~43 chars for 32 bytes
    });

    it('should generate unique verifiers', () => {
      const v1 = generateCodeVerifier();
      const v2 = generateCodeVerifier();
      expect(v1).not.toBe(v2);
    });

    it('should generate URL-safe base64', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should respect custom length', () => {
      const verifier = generateCodeVerifier({ verifierLength: 64 });
      expect(verifier.length).toBeGreaterThan(80); // ~85 chars for 64 bytes
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate challenge from verifier', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe('string');
    });

    it('should generate URL-safe base64', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should be deterministic for same verifier', () => {
      const verifier = generateCodeVerifier();
      const c1 = generateCodeChallenge(verifier);
      const c2 = generateCodeChallenge(verifier);
      expect(c1).toBe(c2);
    });

    it('should produce different challenges for different verifiers', () => {
      const v1 = generateCodeVerifier();
      const v2 = generateCodeVerifier();
      expect(generateCodeChallenge(v1)).not.toBe(generateCodeChallenge(v2));
    });
  });

  describe('generateState', () => {
    it('should generate state string', () => {
      const state = generateState();
      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(20);
    });

    it('should generate unique states', () => {
      const s1 = generateState();
      const s2 = generateState();
      expect(s1).not.toBe(s2);
    });
  });

  describe('verifyCodeChallenge', () => {
    it('should verify valid verifier-challenge pair', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      expect(verifyCodeChallenge(verifier, challenge)).toBe(true);
    });

    it('should reject invalid verifier', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      const wrongVerifier = generateCodeVerifier();
      expect(verifyCodeChallenge(wrongVerifier, challenge)).toBe(false);
    });

    it('should reject tampered challenge', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      const tamperedChallenge = challenge.slice(0, -3) + 'xxx';
      expect(verifyCodeChallenge(verifier, tamperedChallenge)).toBe(false);
    });
  });

  describe('RFC 7636 Test Vectors', () => {
    it('should have test vectors available', () => {
      expect(RFC7636_TEST_VECTORS).toBeDefined();
      expect(RFC7636_TEST_VECTORS.verifier).toBeDefined();
      expect(RFC7636_TEST_VECTORS.challenge).toBeDefined();
    });

    it('should match RFC 7636 appendix B example', () => {
      // RFC 7636 Appendix B test vector
      const challenge = generateCodeChallenge(RFC7636_TEST_VECTORS.verifier);
      expect(challenge).toBe(RFC7636_TEST_VECTORS.challenge);
    });
  });
});

// ============================================
// OAUTH CLIENT TESTS (Task 3.6.2)
// ============================================

describe('OAuthClient', () => {
  let client: OAuthClient;

  beforeEach(() => {
    client = new OAuthClient({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      authorizationEndpoint: 'https://auth.example.com/authorize',
      tokenEndpoint: 'https://auth.example.com/token',
      redirectUri: 'https://app.example.com/callback',
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL', async () => {
      const result = await client.getAuthorizationUrl('user-123');
      expect(result).toBeDefined();
      expect(result.url).toContain('https://auth.example.com/authorize');
      expect(result.codeVerifier).toBeDefined();
      expect(result.state).toBeDefined();
    });

    it('should include required OAuth parameters', async () => {
      const result = await client.getAuthorizationUrl('user-123');
      const url = new URL(result.url);

      expect(url.searchParams.get('client_id')).toBe('test-client-id');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/callback');
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('code_challenge')).toBeDefined();
      expect(url.searchParams.get('state')).toBeDefined();
    });

    it('should include scopes', async () => {
      const result = await client.getAuthorizationUrl('user-123', ['email', 'offline_access']);
      const url = new URL(result.url);

      const scope = url.searchParams.get('scope');
      expect(scope).toContain('email');
      expect(scope).toContain('offline_access');
    });

    it('should store session for later verification', async () => {
      const result = await client.getAuthorizationUrl('user-123');
      expect(result.state).toBeDefined();

      // Client should be able to verify this state later
      const session = client.getSession(result.state);
      expect(session).toBeDefined();
      expect(session?.userId).toBe('user-123');
      expect(session?.codeVerifier).toBe(result.codeVerifier);
    });
  });
});

// ============================================
// TOKEN MANAGER TESTS (Task 3.6.3)
// ============================================

describe('TokenManager', () => {
  let manager: TokenManager;
  let mockClient: OAuthClient;

  beforeEach(() => {
    mockClient = new OAuthClient({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      authorizationEndpoint: 'https://auth.example.com/authorize',
      tokenEndpoint: 'https://auth.example.com/token',
      redirectUri: 'https://app.example.com/callback',
    });

    manager = new TokenManager({
      oauthClient: mockClient,
      encryptionKey: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', // 64 hex chars = 32 bytes
      refreshBufferMs: 5 * 60 * 1000, // 5 minutes
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('storeTokens', () => {
    it('should store tokens for user', async () => {
      await manager.storeTokens('user-123', {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      const token = await manager.getValidToken('user-123');
      expect(token).toBe('test-access-token');
    });
  });

  describe('getValidToken', () => {
    it('should return valid token', async () => {
      await manager.storeTokens('user-123', {
        access_token: 'test-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      const token = await manager.getValidToken('user-123');
      expect(token).toBe('test-access-token');
    });

    it('should throw for unknown user', async () => {
      await expect(manager.getValidToken('unknown-user')).rejects.toThrow();
    });
  });

  describe('revokeTokens', () => {
    it('should remove stored tokens', async () => {
      await manager.storeTokens('user-123', {
        access_token: 'test-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      await manager.revokeTokens('user-123');

      await expect(manager.getValidToken('user-123')).rejects.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return token statistics', async () => {
      await manager.storeTokens('user-1', {
        access_token: 'token-1',
        expires_in: 3600,
        token_type: 'Bearer',
      });
      await manager.storeTokens('user-2', {
        access_token: 'token-2',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      const stats = manager.getStats();
      expect(stats.total).toBe(2);
      expect(stats.valid).toBe(2);
    });
  });
});
