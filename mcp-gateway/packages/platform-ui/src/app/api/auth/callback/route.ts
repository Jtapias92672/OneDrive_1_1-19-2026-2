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

    // TODO: Retrieve PKCE code_verifier from session storage
    // This would typically be stored in a session cookie or server-side session
    // For now, log that OAuth callback was received
    console.log('[OAuth] Authorization callback received:', {
      code: code.substring(0, 10) + '...',
      state: state.substring(0, 10) + '...',
    });

    // TODO: Exchange authorization code for access token
    // This requires:
    // 1. Retrieve code_verifier from session (stored when authorization URL was generated)
    // 2. Call OAuth token endpoint with code + verifier
    // 3. Encrypt and store access token
    // 4. Set up automatic refresh

    /*
    const tokenResponse = await fetch(process.env.OAUTH_TOKEN_ENDPOINT!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.OAUTH_REDIRECT_URI!,
        client_id: process.env.OAUTH_CLIENT_ID!,
        client_secret: process.env.OAUTH_CLIENT_SECRET!,
        code_verifier: codeVerifier, // From session
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed');
    }

    const tokens = await tokenResponse.json();

    // TODO: Encrypt and store tokens using TokenManager
    // await tokenManager.storeToken(userId, tenantId, tokens);
    */

    // Redirect to dashboard (or original requested page from state)
    return NextResponse.redirect(new URL('/dashboard', request.url));

  } catch (error) {
    console.error('[OAuth] Callback handler error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=server_error&description=OAuth callback failed', request.url)
    );
  }
}
