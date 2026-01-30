import { describe, it, expect } from '@jest/globals';
import * as jose from 'jose';

describe('jose library capability', () => {
  it('should import and generate key pairs', async () => {
    const { publicKey, privateKey } = await jose.generateKeyPair('RS256');
    expect(publicKey).toBeDefined();
    expect(privateKey).toBeDefined();
  });

  it('should sign and verify JWTs', async () => {
    const { publicKey, privateKey } = await jose.generateKeyPair('RS256');
    
    const jwt = await new jose.SignJWT({ sub: 'user123' })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
    
    const { payload } = await jose.jwtVerify(jwt, publicKey);
    expect(payload.sub).toBe('user123');
  });
});
