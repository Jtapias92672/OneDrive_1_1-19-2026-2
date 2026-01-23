/**
 * MCP Security Gateway - PKCE Code Challenge Generator
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.1 - Implement PKCE Code Challenge Generator
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Implements PKCE (Proof Key for Code Exchange) per RFC 7636.
 *   Prevents authorization code interception attacks.
 */

import * as crypto from 'crypto';

// ============================================
// TYPES
// ============================================

/**
 * PKCE challenge data for OAuth 2.1 flows
 */
export interface PKCEChallenge {
  /** Random code verifier (43-128 characters, base64url) */
  codeVerifier: string;

  /** SHA-256 hash of verifier (base64url encoded) */
  codeChallenge: string;

  /** Challenge method (always S256 for security) */
  codeChallengeMethod: 'S256';
}

/**
 * PKCE generation options
 */
export interface PKCEOptions {
  /** Length of the code verifier in bytes (default: 32, produces 43 chars) */
  verifierLength?: number;
}

// ============================================
// CONSTANTS
// ============================================

/** Minimum verifier length per RFC 7636 (43 characters) */
const MIN_VERIFIER_LENGTH = 43;

/** Maximum verifier length per RFC 7636 (128 characters) */
const MAX_VERIFIER_LENGTH = 128;

/** Default verifier length in bytes (32 bytes = 43 chars base64url) */
const DEFAULT_VERIFIER_BYTES = 32;

/** State parameter length in bytes */
const STATE_LENGTH_BYTES = 16;

// ============================================
// PKCE FUNCTIONS
// ============================================

/**
 * Generate a cryptographically secure code verifier
 *
 * Per RFC 7636:
 * - MUST be 43-128 characters
 * - MUST use unreserved characters [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 * - base64url encoding meets these requirements
 *
 * @param options Generation options
 * @returns Random code verifier string (43-128 characters)
 */
export function generateCodeVerifier(options: PKCEOptions = {}): string {
  const bytes = options.verifierLength ?? DEFAULT_VERIFIER_BYTES;

  // Ensure minimum length
  if (bytes < 32) {
    throw new Error(
      `Verifier length must be at least 32 bytes (produces ${MIN_VERIFIER_LENGTH} chars)`
    );
  }

  // Ensure maximum length (96 bytes = 128 chars)
  if (bytes > 96) {
    throw new Error(
      `Verifier length must be at most 96 bytes (produces ${MAX_VERIFIER_LENGTH} chars)`
    );
  }

  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Generate SHA-256 code challenge from verifier
 *
 * Per RFC 7636 Section 4.2:
 * - code_challenge = BASE64URL(SHA256(code_verifier))
 *
 * @param verifier The code verifier string
 * @returns Base64url-encoded SHA-256 hash
 */
export function generateCodeChallenge(verifier: string): string {
  if (!verifier || verifier.length < MIN_VERIFIER_LENGTH) {
    throw new Error(
      `Code verifier must be at least ${MIN_VERIFIER_LENGTH} characters`
    );
  }

  if (verifier.length > MAX_VERIFIER_LENGTH) {
    throw new Error(
      `Code verifier must be at most ${MAX_VERIFIER_LENGTH} characters`
    );
  }

  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generate a cryptographically secure state parameter
 *
 * Used for CSRF protection in OAuth flows.
 *
 * @returns Random state string (22 characters base64url)
 */
export function generateState(): string {
  return crypto.randomBytes(STATE_LENGTH_BYTES).toString('base64url');
}

/**
 * Generate complete PKCE challenge data
 *
 * @param options Generation options
 * @returns Complete PKCE challenge with verifier and challenge
 */
export function generatePKCEChallenge(options: PKCEOptions = {}): PKCEChallenge {
  const codeVerifier = generateCodeVerifier(options);
  const codeChallenge = generateCodeChallenge(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

/**
 * Verify a code verifier against a challenge
 *
 * Used during token exchange to verify the client.
 *
 * @param verifier The code verifier from the client
 * @param challenge The original code challenge
 * @returns True if verification succeeds
 */
export function verifyCodeChallenge(
  verifier: string,
  challenge: string
): boolean {
  if (!verifier || !challenge) {
    return false;
  }

  try {
    const computed = generateCodeChallenge(verifier);
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(challenge)
    );
  } catch {
    return false;
  }
}

/**
 * Validate code verifier format
 *
 * Per RFC 7636, verifier must:
 * - Be 43-128 characters
 * - Contain only unreserved characters
 *
 * @param verifier The verifier to validate
 * @returns True if valid format
 */
export function isValidCodeVerifier(verifier: string): boolean {
  if (!verifier) return false;
  if (verifier.length < MIN_VERIFIER_LENGTH) return false;
  if (verifier.length > MAX_VERIFIER_LENGTH) return false;

  // Check for valid base64url characters only
  const validPattern = /^[A-Za-z0-9_-]+$/;
  return validPattern.test(verifier);
}

// ============================================
// RFC 7636 TEST VECTORS
// ============================================

/**
 * RFC 7636 Appendix B Test Vectors
 *
 * For unit testing PKCE implementation.
 */
export const RFC7636_TEST_VECTORS = {
  // From RFC 7636 Appendix B
  verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
  challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
};

// ============================================
// EXPORTS
// ============================================

export default {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  generatePKCEChallenge,
  verifyCodeChallenge,
  isValidCodeVerifier,
  RFC7636_TEST_VECTORS,
};
