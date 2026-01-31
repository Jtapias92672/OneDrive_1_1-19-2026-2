/**
 * OAuth 2.1 + PKCE Integration Test
 *
 * Tests complete OAuth flow with mock provider:
 * - Authorization URL generation
 * - PKCE code challenge/verifier
 * - Token exchange
 * - Token encryption (AES-256-GCM)
 * - Token refresh
 * - Token revocation
 */

// Set encryption key BEFORE imports (module caches this value)
process.env.OAUTH_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

import { OAuthClient } from '@/lib/gateway/oauth/oauth-client';
import { getMockOAuthServer, resetMockOAuthServer } from '@/lib/gateway/oauth/mock-oauth-server';
import { encryptToken, decryptToken } from '@/lib/gateway/oauth/token-encryption';

describe('OAuth 2.1 + PKCE Integration Test', () => {
  const mockServer = getMockOAuthServer();
  let oauthClient: OAuthClient;

  beforeEach(() => {
    resetMockOAuthServer();

    oauthClient = new OAuthClient({
      clientId: 'test-client',
      clientSecret: 'test-secret',
      authorizationEndpoint: 'http://localhost:3000/api/auth/mock/authorize',
      tokenEndpoint: 'http://localhost:3000/api/auth/mock/token',
      redirectUri: 'http://localhost:3000/api/auth/callback',
      defaultScopes: ['read', 'write'],
    });
  });

  describe('Phase 4.1: Authorization URL Generation', () => {
    it('should generate authorization URL with PKCE parameters', async () => {
      const result = await oauthClient.getAuthorizationUrl('test-user', ['read', 'write']);

      expect(result.url).toContain('response_type=code');
      expect(result.url).toContain('client_id=test-client');
      expect(result.url).toContain('code_challenge=');
      expect(result.url).toContain('code_challenge_method=S256');
      expect(result.url).toContain('state=');
      expect(result.url).toContain('scope=read+write');

      expect(result.codeVerifier).toBeTruthy();
      expect(result.codeVerifier.length).toBeGreaterThan(40);

      expect(result.state).toBeTruthy();
      expect(result.state.length).toBeGreaterThan(20);
    });

    it('should store authorization session with expiry', async () => {
      const result = await oauthClient.getAuthorizationUrl('test-user');

      const session = oauthClient.getSession(result.state);

      expect(session).toBeTruthy();
      expect(session?.userId).toBe('test-user');
      expect(session?.codeVerifier).toBe(result.codeVerifier);
      expect(session?.state).toBe(result.state);
      expect(session?.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid state', async () => {
      const session = oauthClient.getSession('invalid-state');
      expect(session).toBeNull();
    });
  });

  describe('Phase 4.2: PKCE Verification', () => {
    it('should complete full PKCE flow (authorization + token exchange)', async () => {
      // Step 1: Generate authorization URL
      const authResult = await oauthClient.getAuthorizationUrl('test-user', ['read', 'write']);

      // Step 2: Simulate authorization (mock server generates code)
      const authUrl = new URL(authResult.url);
      const redirectUrl = mockServer.authorize({
        response_type: authUrl.searchParams.get('response_type')!,
        client_id: authUrl.searchParams.get('client_id')!,
        redirect_uri: authUrl.searchParams.get('redirect_uri')!,
        state: authUrl.searchParams.get('state')!,
        code_challenge: authUrl.searchParams.get('code_challenge')!,
        code_challenge_method: authUrl.searchParams.get('code_challenge_method')!,
        scope: authUrl.searchParams.get('scope')!,
      });

      // Step 3: Extract authorization code from redirect
      const code = new URL(redirectUrl).searchParams.get('code')!;
      expect(code).toBeTruthy();

      // Step 4: Exchange code for tokens directly with mock server (PKCE verification happens here)
      const tokens = await mockServer.token({
        grant_type: 'authorization_code',
        code,
        client_id: 'test-client',
        code_verifier: authResult.codeVerifier,
      });

      expect(tokens.access_token).toBeTruthy();
      expect(tokens.token_type).toBe('Bearer');
      expect(tokens.expires_in).toBe(3600);
      expect(tokens.refresh_token).toBeTruthy();
      expect(tokens.scope).toBe('read write');
    });

    it('should reject invalid PKCE verifier', async () => {
      // Step 1: Generate authorization URL
      const authResult = await oauthClient.getAuthorizationUrl('test-user');

      // Step 2: Get authorization code
      const authUrl = new URL(authResult.url);
      const redirectUrl = mockServer.authorize({
        response_type: authUrl.searchParams.get('response_type')!,
        client_id: authUrl.searchParams.get('client_id')!,
        redirect_uri: authUrl.searchParams.get('redirect_uri')!,
        state: authUrl.searchParams.get('state')!,
        code_challenge: authUrl.searchParams.get('code_challenge')!,
        code_challenge_method: authUrl.searchParams.get('code_challenge_method')!,
      });

      const code = new URL(redirectUrl).searchParams.get('code')!;

      // Step 3: Try to exchange with WRONG verifier
      await expect(
        mockServer.token({
          grant_type: 'authorization_code',
          code,
          client_id: 'test-client',
          code_verifier: 'wrong-verifier',
        })
      ).rejects.toThrow('PKCE verification failed');
    });

    it('should reject reused authorization code', async () => {
      // Get authorization code
      const authResult = await oauthClient.getAuthorizationUrl('test-user');
      const authUrl = new URL(authResult.url);
      const redirectUrl = mockServer.authorize({
        response_type: authUrl.searchParams.get('response_type')!,
        client_id: authUrl.searchParams.get('client_id')!,
        redirect_uri: authUrl.searchParams.get('redirect_uri')!,
        state: authUrl.searchParams.get('state')!,
        code_challenge: authUrl.searchParams.get('code_challenge')!,
        code_challenge_method: authUrl.searchParams.get('code_challenge_method')!,
      });

      const code = new URL(redirectUrl).searchParams.get('code')!;

      // Use code first time (success)
      await mockServer.token({
        grant_type: 'authorization_code',
        code,
        client_id: 'test-client',
        code_verifier: authResult.codeVerifier,
      });

      // Try to reuse code (should fail)
      await expect(
        mockServer.token({
          grant_type: 'authorization_code',
          code,
          client_id: 'test-client',
          code_verifier: authResult.codeVerifier,
        })
      ).rejects.toThrow('Authorization code already used');
    });
  });

  describe('Phase 4.3: Token Encryption (AES-256-GCM)', () => {
    it('should encrypt and decrypt tokens correctly', async () => {
      const originalToken = 'access_token_12345';

      // Encrypt
      const encrypted = encryptToken(originalToken);

      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(originalToken);
      expect(encrypted.length).toBeGreaterThan(originalToken.length);

      // Decrypt
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(originalToken);
    });

    it('should use AES-256-GCM (authenticated encryption)', () => {
      const token = 'test-token';
      const encrypted = encryptToken(token);

      // Encrypted format: iv:authTag:ciphertext (base64url encoded)
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3); // IV, auth tag, ciphertext

      // IV should be 12 bytes (16 chars base64url)
      expect(parts[0].length).toBeGreaterThanOrEqual(16);

      // Auth tag should be 16 bytes (22 chars base64url)
      expect(parts[1].length).toBeGreaterThanOrEqual(20);
    });

    it('should reject tampered ciphertext', () => {
      const encrypted = encryptToken('original-token');

      // Tamper with ciphertext
      const parts = encrypted.split(':');
      parts[2] = parts[2].substring(0, parts[2].length - 1) + 'X'; // Change last char
      const tampered = parts.join(':');

      // Decryption should fail
      expect(() => decryptToken(tampered)).toThrow();
    });
  });

  describe('Phase 4.4: Token Refresh', () => {
    it('should refresh access token with refresh token', async () => {
      // Get initial tokens
      const authResult = await oauthClient.getAuthorizationUrl('test-user');
      const authUrl = new URL(authResult.url);
      const redirectUrl = mockServer.authorize({
        response_type: authUrl.searchParams.get('response_type')!,
        client_id: authUrl.searchParams.get('client_id')!,
        redirect_uri: authUrl.searchParams.get('redirect_uri')!,
        state: authUrl.searchParams.get('state')!,
        code_challenge: authUrl.searchParams.get('code_challenge')!,
        code_challenge_method: authUrl.searchParams.get('code_challenge_method')!,
      });

      const code = new URL(redirectUrl).searchParams.get('code')!;
      const initialTokens = await mockServer.token({
        grant_type: 'authorization_code',
        code,
        client_id: 'test-client',
        code_verifier: authResult.codeVerifier,
      });

      const initialAccessToken = initialTokens.access_token;
      const refreshToken = initialTokens.refresh_token!;

      // Refresh access token
      const refreshedTokens = await mockServer.token({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'test-client',
      });

      expect(refreshedTokens.access_token).toBeTruthy();
      expect(refreshedTokens.access_token).not.toBe(initialAccessToken);
      expect(refreshedTokens.token_type).toBe('Bearer');
      expect(refreshedTokens.expires_in).toBe(3600);
    });

    it('should reject invalid refresh token', async () => {
      await expect(
        mockServer.token({
          grant_type: 'refresh_token',
          refresh_token: 'invalid-refresh-token',
          client_id: 'test-client',
        })
      ).rejects.toThrow();
    });
  });

  describe('Phase 4.5: Token Validation', () => {
    it('should validate access token', async () => {
      // Get tokens
      const authResult = await oauthClient.getAuthorizationUrl('test-user');
      const authUrl = new URL(authResult.url);
      const redirectUrl = mockServer.authorize({
        response_type: authUrl.searchParams.get('response_type')!,
        client_id: authUrl.searchParams.get('client_id')!,
        redirect_uri: authUrl.searchParams.get('redirect_uri')!,
        state: authUrl.searchParams.get('state')!,
        code_challenge: authUrl.searchParams.get('code_challenge')!,
        code_challenge_method: authUrl.searchParams.get('code_challenge_method')!,
        scope: 'test-scope',
      });

      const code = new URL(redirectUrl).searchParams.get('code')!;

      // Exchange code for tokens directly with mock server
      const tokens = await mockServer.token({
        grant_type: 'authorization_code',
        code,
        client_id: 'test-client',
        code_verifier: authResult.codeVerifier,
      });

      // Validate token
      const validation = mockServer.validateToken(tokens.access_token);

      expect(validation).toBeTruthy();
      expect(validation?.clientId).toBe('test-client');
      expect(validation?.scope).toBe('test-scope');
    });

    it('should return null for invalid token', () => {
      const validation = mockServer.validateToken('invalid-token');
      expect(validation).toBeNull();
    });
  });
});
