/**
 * Mock OAuth Token Endpoint
 *
 * Simulates the token endpoint of an OAuth 2.1 provider.
 * Handles authorization_code and refresh_token grants.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMockOAuthServer } from '@/lib/gateway/oauth/mock-oauth-server';

export async function POST(request: NextRequest) {
  try {
    // Parse form-encoded body (OAuth 2.1 requires application/x-www-form-urlencoded)
    const body = await request.text();
    const params = new URLSearchParams(body);

    const tokenRequest = {
      grant_type: params.get('grant_type') || '',
      code: params.get('code') || undefined,
      refresh_token: params.get('refresh_token') || undefined,
      redirect_uri: params.get('redirect_uri') || undefined,
      client_id: params.get('client_id') || '',
      client_secret: params.get('client_secret') || undefined,
      code_verifier: params.get('code_verifier') || undefined,
    };

    // Get mock server instance
    const mockServer = getMockOAuthServer();

    // Exchange code for tokens
    const tokenResponse = await mockServer.token(tokenRequest);

    return NextResponse.json(tokenResponse, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token request failed';

    // Determine error code
    let errorCode = 'invalid_request';
    if (errorMessage.includes('expired')) {
      errorCode = 'invalid_grant';
    } else if (errorMessage.includes('PKCE')) {
      errorCode = 'invalid_grant';
    } else if (errorMessage.includes('already used')) {
      errorCode = 'invalid_grant';
    }

    return NextResponse.json(
      {
        error: errorCode,
        error_description: errorMessage,
      },
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
        },
      }
    );
  }
}
