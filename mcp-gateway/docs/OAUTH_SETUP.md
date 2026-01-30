# OAuth 2.1 + PKCE Setup Guide

**Phase 4 Implementation** - MCP Gateway Security

## Overview

The MCP Gateway uses OAuth 2.1 with mandatory PKCE (Proof Key for Code Exchange) for secure authentication. This replaces direct token authentication with encrypted OAuth flows.

## Current State

- ✅ OAuth infrastructure fully implemented (`/oauth/oauth-client.ts`, `/oauth/token-manager.ts`)
- ✅ Token encryption with AES-256-GCM
- ✅ Automatic token refresh (5 min before expiry)
- ✅ Gateway integration enabled
- ⚠️ **Placeholder credentials** - requires OAuth provider configuration

## Supported OAuth Providers

| Provider | Authorization Endpoint | Token Endpoint |
|----------|------------------------|----------------|
| **Okta** | `https://{domain}/oauth2/default/v1/authorize` | `https://{domain}/oauth2/default/v1/token` |
| **Auth0** | `https://{domain}.auth0.com/authorize` | `https://{domain}.auth0.com/oauth/token` |
| **AWS Cognito** | `https://{domain}.auth.{region}.amazoncognito.com/oauth2/authorize` | `https://{domain}.auth.{region}.amazoncognito.com/oauth2/token` |
| **Azure AD** | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` |

## Production Setup

### Step 1: Register OAuth Application

Register your application with your chosen OAuth provider and obtain:
- Client ID
- Client Secret (for confidential clients)
- Redirect URI: `https://your-domain.com/api/auth/callback`

### Step 2: Configure Environment Variables

Update `/packages/platform-ui/.env.local` with actual values:

```bash
# OAuth Provider Configuration
OAUTH_ENABLED=true
OAUTH_ISSUER=https://your-oauth-provider.com
OAUTH_CLIENT_ID=your-actual-client-id
OAUTH_CLIENT_SECRET=your-actual-client-secret
OAUTH_AUTHORIZATION_ENDPOINT=https://your-oauth-provider.com/authorize
OAUTH_TOKEN_ENDPOINT=https://your-oauth-provider.com/token
OAUTH_REDIRECT_URI=https://your-domain.com/api/auth/callback
OAUTH_SCOPES=openid,profile,email,figma.read

# Generate encryption key
OAUTH_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### Step 3: Configure OAuth Scopes

Required scopes for FORGE:
- `openid` - OpenID Connect authentication
- `profile` - User profile information
- `email` - User email address
- `figma.read` - Figma API read access (provider-specific)

### Step 4: Verify Token Encryption

Tokens are encrypted at rest using AES-256-GCM:
- Encryption key: 32-byte hex string (from `OAUTH_ENCRYPTION_KEY`)
- Stored encrypted in memory or cache
- Automatically refreshed 5 minutes before expiry

### Step 5: Test OAuth Flow

1. **Start development server**:
   ```bash
   cd packages/platform-ui
   npm run dev
   ```

2. **Trigger OAuth flow**:
   - Access protected endpoint: `http://localhost:3000/api/poc/run`
   - Should redirect to OAuth provider login
   - After authentication, redirects back with authorization code
   - Gateway exchanges code for token using PKCE

3. **Verify token storage**:
   - Check gateway logs for OAuth token acquisition
   - Verify token is encrypted (no plaintext in logs)
   - Confirm automatic refresh schedule

## Development Mode (Placeholder Credentials)

For development without a real OAuth provider:

1. **Use mock OAuth** (recommended for testing):
   ```bash
   OAUTH_ENABLED=false  # Disable OAuth, use direct token
   ```

2. **Test with placeholder values** (current state):
   - OAuth enabled but will fail on actual API calls
   - Use for testing gateway OAuth integration logic
   - Not suitable for end-to-end testing

## Security Features

### PKCE Flow (RFC 7636)

1. Generate code verifier (random string)
2. Create code challenge (SHA-256 hash of verifier)
3. Request authorization with challenge
4. Exchange authorization code + verifier for token
5. **Prevents**: Authorization code interception attacks

### Token Encryption

- **Algorithm**: AES-256-GCM
- **Key**: 256-bit from `OAUTH_ENCRYPTION_KEY`
- **Storage**: Encrypted tokens only (never plaintext)
- **Rotation**: Automatic refresh before expiry

### Token Refresh

- **Buffer**: 5 minutes before token expiry
- **Automatic**: Background refresh process
- **Failover**: Falls back to re-authentication if refresh fails

## Verification Checklist

Phase 4 capabilities to verify:

- [ ] OAuth flow: Authorization code + PKCE challenge
- [ ] Token encrypted at rest (AES-256-GCM)
- [ ] Token refresh 5 min before expiry
- [ ] No plaintext tokens in logs or memory
- [ ] Gateway routes requests with OAuth token
- [ ] Automatic token rotation works

## Troubleshooting

### "OAuth provider not reachable"

**Cause**: Placeholder OAuth endpoints in `.env.local`

**Solution**: Replace with actual OAuth provider URLs

### "Token encryption failed"

**Cause**: Invalid `OAUTH_ENCRYPTION_KEY` (not 64 hex chars)

**Solution**: Generate new key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### "PKCE challenge failed"

**Cause**: OAuth provider doesn't support PKCE

**Solution**: Use OAuth 2.1 compliant provider (all major providers support PKCE)

## Next Steps

After OAuth Phase 4 complete:
- **Phase 5**: Enable Approval Gates (Risk-Based) - CARS integration
- **Phase 6**: Enable Sandbox (Production Only) - Deno isolation

## References

- OAuth 2.1 Spec: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-11
- PKCE Spec (RFC 7636): https://datatracker.ietf.org/doc/html/rfc7636
- Token Manager: `/oauth/token-manager.ts`
- OAuth Client: `/oauth/oauth-client.ts`
- Gateway Config: `/core/types.ts` (SecurityConfig.oauth)
