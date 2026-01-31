/**
 * Mock OAuth Authorization Endpoint
 *
 * Simulates the authorization endpoint of an OAuth 2.1 provider.
 * Use for testing OAuth flows without external dependencies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMockOAuthServer } from '@/lib/gateway/oauth/mock-oauth-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    // Extract OAuth parameters
    const authRequest = {
      response_type: searchParams.get('response_type') || '',
      client_id: searchParams.get('client_id') || '',
      redirect_uri: searchParams.get('redirect_uri') || '',
      state: searchParams.get('state') || '',
      code_challenge: searchParams.get('code_challenge') || '',
      code_challenge_method: searchParams.get('code_challenge_method') || '',
      scope: searchParams.get('scope') || undefined,
    };

    // Get mock server instance
    const mockServer = getMockOAuthServer();

    // Generate authorization code and redirect
    const redirectUrl = mockServer.authorize(authRequest);

    // Simulate user approval by immediately redirecting with code
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authorization failed';

    // Return error to redirect_uri if available
    const redirectUri = searchParams.get('redirect_uri');
    const state = searchParams.get('state');

    if (redirectUri) {
      const errorUrl = new URL(redirectUri);
      errorUrl.searchParams.set('error', 'invalid_request');
      errorUrl.searchParams.set('error_description', errorMessage);
      if (state) {
        errorUrl.searchParams.set('state', state);
      }
      return NextResponse.redirect(errorUrl.toString());
    }

    return NextResponse.json(
      { error: 'invalid_request', error_description: errorMessage },
      { status: 400 }
    );
  }
}
