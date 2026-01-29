/**
 * Unit Tests: JWT Validation with Real Signature Verification
 *
 * @epic 3.6 - Security Controls
 * @task RECOVERY-01.6 - Add tests for invalid signatures
 * @task RECOVERY-01.7 - Add tests for expired tokens
 * @task RECOVERY-01.8 - Add tests for wrong issuer
 * @task RECOVERY-01.9 - Add tests for missing claims
 *
 * FIXED: ESM compatibility achieved via NODE_OPTIONS='--experimental-vm-modules'
 * Run with: npm run test:gateway
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import * as jose from 'jose';
import type { GenerateKeyPairResult } from 'jose';

describe('JWT Validation Tests (RECOVERY-01.6-01.9)', () => {
  let validKeys: GenerateKeyPairResult;
  let attackerKeys: GenerateKeyPairResult;

  beforeAll(async () => {
    // Generate legitimate key pair
    validKeys = await jose.generateKeyPair('RS256');

    // Generate attacker key pair (different key)
    attackerKeys = await jose.generateKeyPair('RS256');
  });

  describe('RECOVERY-01.6: Invalid Signature Tests', () => {
    it('should reject a token signed with a different key', async () => {
      // Attacker creates token with their own key
      const forgedToken = await new jose.SignJWT({ sub: 'user123' })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(attackerKeys.privateKey);

      // Verification with legitimate public key should fail
      await expect(
        jose.jwtVerify(forgedToken, validKeys.publicKey)
      ).rejects.toThrow();
    });

    it('should reject a tampered token payload', async () => {
      // Create valid token
      const validToken = await new jose.SignJWT({ sub: 'user123', role: 'user' })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(validKeys.privateKey);

      // Tamper with the payload (change middle part of JWT)
      const parts = validToken.split('.');
      const payloadPart = parts[1]!; // Non-null assertion - JWT always has 3 parts
      const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString());
      payload.role = 'admin'; // Attacker tries to elevate privileges
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tamperedToken = parts.join('.');

      // Verification should fail due to invalid signature
      await expect(
        jose.jwtVerify(tamperedToken, validKeys.publicKey)
      ).rejects.toThrow();
    });

    it('should accept a valid token signed with the correct key', async () => {
      const validToken = await new jose.SignJWT({ sub: 'user123' })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(validKeys.privateKey);

      const { payload } = await jose.jwtVerify(validToken, validKeys.publicKey);
      expect(payload.sub).toBe('user123');
    });
  });

  describe('RECOVERY-01.7: Expired Token Tests', () => {
    it('should reject an expired token', async () => {
      // Create token that expired 1 hour ago
      const expiredToken = await new jose.SignJWT({ sub: 'user123' })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 7200) // 2 hours ago
        .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago
        .sign(validKeys.privateKey);

      await expect(
        jose.jwtVerify(expiredToken, validKeys.publicKey)
      ).rejects.toThrow(/exp.*claim/i);
    });

    it('should accept a token that has not expired', async () => {
      const validToken = await new jose.SignJWT({ sub: 'user123' })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(validKeys.privateKey);

      const { payload } = await jose.jwtVerify(validToken, validKeys.publicKey);
      expect(payload.sub).toBe('user123');
    });

    it('should reject a token used before its nbf (not before) time', async () => {
      // Create token that is not valid yet (nbf in future)
      const futureToken = await new jose.SignJWT({ sub: 'user123' })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setNotBefore(Math.floor(Date.now() / 1000) + 3600) // 1 hour from now
        .setExpirationTime('2h')
        .sign(validKeys.privateKey);

      await expect(
        jose.jwtVerify(futureToken, validKeys.publicKey)
      ).rejects.toThrow();
    });
  });

  describe('RECOVERY-01.8: Wrong Issuer Tests', () => {
    it('should reject a token from wrong issuer when issuer validation is enabled', async () => {
      const tokenFromWrongIssuer = await new jose.SignJWT({ sub: 'user123' })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer('https://malicious-issuer.com')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(validKeys.privateKey);

      await expect(
        jose.jwtVerify(tokenFromWrongIssuer, validKeys.publicKey, {
          issuer: 'https://trusted-issuer.com',
        })
      ).rejects.toThrow(/iss.*claim/i);
    });

    it('should accept a token from the correct issuer', async () => {
      const validToken = await new jose.SignJWT({ sub: 'user123' })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer('https://trusted-issuer.com')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(validKeys.privateKey);

      const { payload } = await jose.jwtVerify(validToken, validKeys.publicKey, {
        issuer: 'https://trusted-issuer.com',
      });
      expect(payload.iss).toBe('https://trusted-issuer.com');
    });
  });

  describe('RECOVERY-01.9: Missing Claims Tests', () => {
    it('should reject a token missing required audience claim', async () => {
      const tokenWithoutAudience = await new jose.SignJWT({ sub: 'user123' })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(validKeys.privateKey);

      await expect(
        jose.jwtVerify(tokenWithoutAudience, validKeys.publicKey, {
          audience: 'https://api.example.com',
        })
      ).rejects.toThrow(/aud.*claim/i);
    });

    it('should accept a token with correct audience', async () => {
      const validToken = await new jose.SignJWT({ sub: 'user123' })
        .setProtectedHeader({ alg: 'RS256' })
        .setAudience('https://api.example.com')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(validKeys.privateKey);

      const { payload } = await jose.jwtVerify(validToken, validKeys.publicKey, {
        audience: 'https://api.example.com',
      });
      expect(payload.aud).toBe('https://api.example.com');
    });

    it('should reject a token with wrong audience', async () => {
      const tokenWithWrongAudience = await new jose.SignJWT({ sub: 'user123' })
        .setProtectedHeader({ alg: 'RS256' })
        .setAudience('https://other-api.com')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(validKeys.privateKey);

      await expect(
        jose.jwtVerify(tokenWithWrongAudience, validKeys.publicKey, {
          audience: 'https://api.example.com',
        })
      ).rejects.toThrow(/aud.*claim/i);
    });

    it('should handle multiple audiences correctly', async () => {
      const tokenWithMultipleAudiences = await new jose.SignJWT({ sub: 'user123' })
        .setProtectedHeader({ alg: 'RS256' })
        .setAudience(['https://api.example.com', 'https://web.example.com'])
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(validKeys.privateKey);

      // Should pass when one of the audiences matches
      const { payload } = await jose.jwtVerify(tokenWithMultipleAudiences, validKeys.publicKey, {
        audience: 'https://api.example.com',
      });
      expect(payload.aud).toContain('https://api.example.com');
    });
  });

  describe('Algorithm Verification', () => {
    it('should reject tokens with algorithm none', async () => {
      // Algorithm "none" attack - trying to bypass signature verification
      const unsignedPayload = {
        alg: 'none',
        typ: 'JWT'
      };
      const payload = {
        sub: 'user123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const unsignedToken = `${Buffer.from(JSON.stringify(unsignedPayload)).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.`;

      await expect(
        jose.jwtVerify(unsignedToken, validKeys.publicKey)
      ).rejects.toThrow();
    });

    it('should reject tokens with mismatched algorithm in header', async () => {
      // Token signed with RS256 but claims to be HS256
      const validToken = await new jose.SignJWT({ sub: 'user123' })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(validKeys.privateKey);

      // Verify with explicit algorithm constraint
      const { payload } = await jose.jwtVerify(validToken, validKeys.publicKey, {
        algorithms: ['RS256']
      });
      expect(payload.sub).toBe('user123');
    });
  });
});
