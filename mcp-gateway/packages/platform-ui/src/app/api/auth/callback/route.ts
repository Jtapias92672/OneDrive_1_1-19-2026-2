/**
 * OAuth 2.1 + PKCE Callback Handler
 *
 * Phase 4 Implementation - MCP Gateway Security
 *
 * Handles OAuth authorization callback:
 * 1. Receives authorization code from OAuth provider
 * 2. Exchanges code + PKCE verifier for access token
 * 3. Stores encrypted token
 * 4. Redirects to original requested page
 */

import { NextRequest, NextResponse } from 'next/server';
import { OAuthClient } from '@/lib/gateway/oauth/oauth-client';
import { encryptToken, decryptToken } from '@/lib/gateway/oauth/token-encryption';

// Store tokens temporarily for demo (in production, use secure session storage like Redis)
const tokenStore = new Map<string, { accessToken: string; refreshToken?: string; expiresAt: number }>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract OAuth response parameters
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('[OAuth] Authorization error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/auth/error?error=${error}&description=${errorDescription || 'Unknown error'}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('[OAuth] Missing required parameters:', { code: !!code, state: !!state });
      return NextResponse.redirect(
        new URL('/auth/error?error=invalid_request&description=Missing authorization code or state', request.url)
      );
    }

    console.log('[OAuth] Authorization callback received:', {
      code: code.substring(0, 10) + '...',
      state: state.substring(0, 10) + '...',
    });

    // Initialize OAuth client with configured endpoints
    const oauthClient = new OAuthClient({
      clientId: process.env.OAUTH_CLIENT_ID || 'test-client',
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      authorizationEndpoint: process.env.OAUTH_AUTHORIZATION_ENDPOINT || 'http://localhost:3000/api/auth/mock/authorize',
      tokenEndpoint: process.env.OAUTH_TOKEN_ENDPOINT || 'http://localhost:3000/api/auth/mock/token',
      redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
    });

    // Retrieve authorization session by state
    const session = oauthClient.getSession(state);

    if (!session) {
      console.error('[OAuth] Invalid or expired state');
      return NextResponse.redirect(
        new URL('/auth/error?error=invalid_state&description=Authorization session expired', request.url)
      );
    }

    console.log('[OAuth] Session retrieved, exchanging code for tokens');

    // Exchange authorization code for tokens (includes PKCE verification)
    const tokens = await oauthClient.exchangeCodeForToken(code, session.codeVerifier);

    console.log('[OAuth] Token exchange successful:', {
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      has_refresh_token: !!tokens.refresh_token,
    });

    // Encrypt tokens before storage (AES-256-GCM)
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : undefined;

    console.log('[OAuth] Tokens encrypted with AES-256-GCM');

    // Calculate expiration timestamp
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    // Store encrypted tokens (in production, use secure session store)
    tokenStore.set(session.userId, {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
    });

    console.log('[OAuth] Encrypted tokens stored for user:', session.userId);

    // Clean up authorization session
    oauthClient.cleanupSession(state);

    // Redirect to dashboard with success indicator
    return NextResponse.redirect(new URL('/dashboard?oauth=success', request.url));

  } catch (error) {
    console.error('[OAuth] Callback handler error:', error);
    const errorMessage = error instanceof Error ? error.message : 'OAuth callback failed';
    return NextResponse.redirect(
      new URL(`/auth/error?error=server_error&description=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}

/**
 * POST /api/auth/callback
 *
 * Test endpoint to retrieve and decrypt stored tokens.
 * Used for testing token encryption/decryption.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || 'test-user';

    // Retrieve encrypted tokens
    const stored = tokenStore.get(userId);

    if (!stored) {
      return NextResponse.json(
        { success: false, error: 'No tokens found for user' },
        { status: 404 }
      );
    }

    // Check expiration
    if (Date.now() > stored.expiresAt) {
      tokenStore.delete(userId);
      return NextResponse.json(
        { success: false, error: 'Token expired' },
        { status: 401 }
      );
    }

    // Decrypt tokens to verify encryption works
    const decryptedAccessToken = decryptToken(stored.accessToken);
    const decryptedRefreshToken = stored.refreshToken
      ? decryptToken(stored.refreshToken)
      : undefined;

    return NextResponse.json({
      success: true,
      message: 'Token decryption successful',
      token_info: {
        access_token_prefix: decryptedAccessToken.substring(0, 10) + '...',
        refresh_token_prefix: decryptedRefreshToken?.substring(0, 10) + '...',
        expires_at: new Date(stored.expiresAt).toISOString(),
        encryption: {
          algorithm: 'AES-256-GCM',
          encrypted_length: stored.accessToken.length,
        },
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token retrieval failed';
    console.error('[OAuth] Token retrieval error:', errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
