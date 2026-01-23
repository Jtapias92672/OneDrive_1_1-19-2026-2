/**
 * FORGE Platform - Cryptographic Services
 *
 * @epic 3.6 - Security Controls
 * @description Key management, encryption, and signing services
 */

import * as crypto from 'crypto';
import { EncryptionKey, EncryptedData, SigningKey, Signature } from './types.js';

// ============================================
// CRYPTO SERVICE
// ============================================

export class CryptoService {
  private encryptionKeys: Map<string, EncryptionKeyInternal> = new Map();
  private signingKeys: Map<string, SigningKeyInternal> = new Map();
  private activeKeyIds: Map<string, string> = new Map(); // purpose -> keyId

  constructor() {
    this.initializeDefaultKeys();
  }

  // ==========================================
  // KEY MANAGEMENT
  // ==========================================

  /**
   * Generate a new encryption key
   */
  generateEncryptionKey(
    purpose: 'data' | 'session' | 'token' | 'secret',
    algorithm: 'AES-256-GCM' | 'AES-256-CBC' | 'ChaCha20-Poly1305' = 'AES-256-GCM'
  ): EncryptionKey {
    const keyId = `enc_${crypto.randomUUID()}`;
    const keyMaterial = crypto.randomBytes(32);
    const now = new Date();

    const key: EncryptionKeyInternal = {
      id: keyId,
      algorithm,
      purpose,
      version: 1,
      createdAt: now.toISOString(),
      status: 'active',
      material: keyMaterial,
    };

    this.encryptionKeys.set(keyId, key);

    // Set as active key for this purpose
    const previousKeyId = this.activeKeyIds.get(purpose);
    if (previousKeyId) {
      const previousKey = this.encryptionKeys.get(previousKeyId);
      if (previousKey) {
        previousKey.status = 'deprecated';
        previousKey.rotatedAt = now.toISOString();
      }
    }
    this.activeKeyIds.set(purpose, keyId);

    return this.toPublicKey(key);
  }

  /**
   * Get the active encryption key for a purpose
   */
  getActiveEncryptionKey(purpose: string): EncryptionKey | undefined {
    const keyId = this.activeKeyIds.get(purpose);
    if (!keyId) return undefined;

    const key = this.encryptionKeys.get(keyId);
    if (!key || key.status !== 'active') return undefined;

    return this.toPublicKey(key);
  }

  /**
   * Rotate an encryption key
   */
  rotateEncryptionKey(purpose: string): EncryptionKey {
    const currentKey = this.getActiveEncryptionKey(purpose);
    if (!currentKey) {
      throw new CryptoError('KEY_NOT_FOUND', `No active key found for purpose: ${purpose}`);
    }

    return this.generateEncryptionKey(
      currentKey.purpose,
      currentKey.algorithm
    );
  }

  /**
   * Generate a signing key pair
   */
  generateSigningKey(
    purpose: 'token' | 'audit' | 'code' | 'api',
    algorithm: 'Ed25519' | 'ECDSA-P256' | 'RSA-PSS' = 'Ed25519'
  ): SigningKey {
    const keyId = `sign_${crypto.randomUUID()}`;
    let keyPair: { publicKey: Buffer; privateKey: Buffer };

    switch (algorithm) {
      case 'Ed25519':
        const ed25519 = crypto.generateKeyPairSync('ed25519');
        keyPair = {
          publicKey: ed25519.publicKey.export({ type: 'spki', format: 'der' }) as Buffer,
          privateKey: ed25519.privateKey.export({ type: 'pkcs8', format: 'der' }) as Buffer,
        };
        break;
      case 'ECDSA-P256':
        const ecdsa = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
        keyPair = {
          publicKey: ecdsa.publicKey.export({ type: 'spki', format: 'der' }) as Buffer,
          privateKey: ecdsa.privateKey.export({ type: 'pkcs8', format: 'der' }) as Buffer,
        };
        break;
      case 'RSA-PSS':
        const rsa = crypto.generateKeyPairSync('rsa-pss', {
          modulusLength: 2048,
          hashAlgorithm: 'sha256',
        });
        keyPair = {
          publicKey: rsa.publicKey.export({ type: 'spki', format: 'der' }) as Buffer,
          privateKey: rsa.privateKey.export({ type: 'pkcs8', format: 'der' }) as Buffer,
        };
        break;
    }

    const now = new Date();

    const key: SigningKeyInternal = {
      id: keyId,
      algorithm,
      purpose,
      publicKey: keyPair.publicKey.toString('base64'),
      privateKey: keyPair.privateKey,
      createdAt: now.toISOString(),
      status: 'active',
    };

    this.signingKeys.set(keyId, key);
    this.activeKeyIds.set(`sign_${purpose}`, keyId);

    return {
      id: key.id,
      algorithm: key.algorithm,
      purpose: key.purpose,
      publicKey: key.publicKey,
      createdAt: key.createdAt,
      status: key.status,
    };
  }

  // ==========================================
  // ENCRYPTION
  // ==========================================

  /**
   * Encrypt data with AES-256-GCM
   */
  encrypt(
    data: string | Buffer,
    purpose: 'data' | 'session' | 'token' | 'secret' = 'data'
  ): EncryptedData {
    const keyId = this.activeKeyIds.get(purpose);
    if (!keyId) {
      throw new CryptoError('KEY_NOT_FOUND', `No active key for purpose: ${purpose}`);
    }

    const key = this.encryptionKeys.get(keyId);
    if (!key) {
      throw new CryptoError('KEY_NOT_FOUND', `Key not found: ${keyId}`);
    }

    const plaintext = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    const iv = crypto.randomBytes(12);

    if (key.algorithm === 'AES-256-GCM') {
      const cipher = crypto.createCipheriv('aes-256-gcm', key.material, iv);
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      const tag = cipher.getAuthTag();

      return {
        ciphertext: ciphertext.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        keyId: key.id,
        keyVersion: key.version,
        algorithm: key.algorithm,
        encryptedAt: new Date().toISOString(),
      };
    }

    if (key.algorithm === 'AES-256-CBC') {
      const ivCbc = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key.material, ivCbc);
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

      return {
        ciphertext: ciphertext.toString('base64'),
        iv: ivCbc.toString('base64'),
        keyId: key.id,
        keyVersion: key.version,
        algorithm: key.algorithm,
        encryptedAt: new Date().toISOString(),
      };
    }

    throw new CryptoError('UNSUPPORTED_ALGORITHM', `Algorithm not supported: ${key.algorithm}`);
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData: EncryptedData): Buffer {
    const key = this.encryptionKeys.get(encryptedData.keyId);
    if (!key) {
      throw new CryptoError('KEY_NOT_FOUND', `Key not found: ${encryptedData.keyId}`);
    }

    if (key.status === 'destroyed') {
      throw new CryptoError('KEY_DESTROYED', 'Cannot decrypt with destroyed key');
    }

    const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');

    if (encryptedData.algorithm === 'AES-256-GCM') {
      if (!encryptedData.tag) {
        throw new CryptoError('MISSING_TAG', 'Authentication tag required for GCM');
      }
      const tag = Buffer.from(encryptedData.tag, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key.material, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    }

    if (encryptedData.algorithm === 'AES-256-CBC') {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key.material, iv);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    }

    throw new CryptoError('UNSUPPORTED_ALGORITHM', `Algorithm not supported: ${encryptedData.algorithm}`);
  }

  /**
   * Decrypt to string
   */
  decryptToString(encryptedData: EncryptedData): string {
    return this.decrypt(encryptedData).toString('utf8');
  }

  // ==========================================
  // SIGNING
  // ==========================================

  /**
   * Sign data
   */
  sign(data: string | Buffer, purpose: 'token' | 'audit' | 'code' | 'api' = 'token'): Signature {
    const keyId = this.activeKeyIds.get(`sign_${purpose}`);
    if (!keyId) {
      throw new CryptoError('KEY_NOT_FOUND', `No active signing key for purpose: ${purpose}`);
    }

    const key = this.signingKeys.get(keyId);
    if (!key) {
      throw new CryptoError('KEY_NOT_FOUND', `Signing key not found: ${keyId}`);
    }

    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    let signature: Buffer;

    switch (key.algorithm) {
      case 'Ed25519': {
        const privateKey = crypto.createPrivateKey({
          key: key.privateKey,
          format: 'der',
          type: 'pkcs8',
        });
        signature = crypto.sign(null, dataBuffer, privateKey);
        break;
      }
      case 'ECDSA-P256': {
        const privateKey = crypto.createPrivateKey({
          key: key.privateKey,
          format: 'der',
          type: 'pkcs8',
        });
        signature = crypto.sign('sha256', dataBuffer, privateKey);
        break;
      }
      case 'RSA-PSS': {
        const privateKey = crypto.createPrivateKey({
          key: key.privateKey,
          format: 'der',
          type: 'pkcs8',
        });
        signature = crypto.sign('sha256', dataBuffer, {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        });
        break;
      }
      default:
        throw new CryptoError('UNSUPPORTED_ALGORITHM', `Algorithm not supported: ${key.algorithm}`);
    }

    return {
      value: signature.toString('base64'),
      keyId: key.id,
      algorithm: key.algorithm,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Verify a signature
   */
  verify(data: string | Buffer, signature: Signature): boolean {
    const key = this.signingKeys.get(signature.keyId);
    if (!key) {
      throw new CryptoError('KEY_NOT_FOUND', `Signing key not found: ${signature.keyId}`);
    }

    if (key.status === 'revoked') {
      throw new CryptoError('KEY_REVOKED', 'Cannot verify with revoked key');
    }

    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    const signatureBuffer = Buffer.from(signature.value, 'base64');

    const publicKey = crypto.createPublicKey({
      key: Buffer.from(key.publicKey, 'base64'),
      format: 'der',
      type: 'spki',
    });

    switch (key.algorithm) {
      case 'Ed25519':
        return crypto.verify(null, dataBuffer, publicKey, signatureBuffer);
      case 'ECDSA-P256':
        return crypto.verify('sha256', dataBuffer, publicKey, signatureBuffer);
      case 'RSA-PSS':
        return crypto.verify('sha256', dataBuffer, {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        }, signatureBuffer);
      default:
        throw new CryptoError('UNSUPPORTED_ALGORITHM', `Algorithm not supported: ${key.algorithm}`);
    }
  }

  // ==========================================
  // HASHING
  // ==========================================

  /**
   * Hash data with SHA-256
   */
  hash(data: string | Buffer, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256'): string {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    return crypto.createHash(algorithm).update(buffer).digest('hex');
  }

  /**
   * Hash with HMAC
   */
  hmac(data: string | Buffer, key: string | Buffer, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256'): string {
    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'utf8') : key;
    return crypto.createHmac(algorithm, keyBuffer).update(dataBuffer).digest('hex');
  }

  /**
   * Derive key using HKDF
   */
  deriveKey(
    secret: string | Buffer,
    salt: string | Buffer,
    info: string | Buffer,
    length: number = 32
  ): Buffer {
    const secretBuffer = typeof secret === 'string' ? Buffer.from(secret, 'utf8') : secret;
    const saltBuffer = typeof salt === 'string' ? Buffer.from(salt, 'utf8') : salt;
    const infoBuffer = typeof info === 'string' ? Buffer.from(info, 'utf8') : info;

    const derived = crypto.hkdfSync('sha256', secretBuffer, saltBuffer, infoBuffer, length);
    return Buffer.from(derived);
  }

  // ==========================================
  // RANDOM
  // ==========================================

  /**
   * Generate random bytes
   */
  randomBytes(length: number): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * Generate random string (base64url)
   */
  randomString(length: number): string {
    return crypto.randomBytes(length).toString('base64url').slice(0, length);
  }

  /**
   * Generate UUID
   */
  uuid(): string {
    return crypto.randomUUID();
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private toPublicKey(key: EncryptionKeyInternal): EncryptionKey {
    return {
      id: key.id,
      algorithm: key.algorithm,
      purpose: key.purpose,
      version: key.version,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      rotatedAt: key.rotatedAt,
      status: key.status,
    };
  }

  private initializeDefaultKeys(): void {
    // Generate default keys for each purpose
    this.generateEncryptionKey('data');
    this.generateEncryptionKey('session');
    this.generateEncryptionKey('token');
    this.generateEncryptionKey('secret');
    this.generateSigningKey('token');
    this.generateSigningKey('audit');
  }

  /**
   * Get all active keys (metadata only)
   */
  getActiveKeys(): { encryption: EncryptionKey[]; signing: SigningKey[] } {
    const encryption: EncryptionKey[] = [];
    const signing: SigningKey[] = [];

    for (const key of this.encryptionKeys.values()) {
      if (key.status === 'active') {
        encryption.push(this.toPublicKey(key));
      }
    }

    for (const key of this.signingKeys.values()) {
      if (key.status === 'active') {
        signing.push({
          id: key.id,
          algorithm: key.algorithm,
          purpose: key.purpose,
          publicKey: key.publicKey,
          createdAt: key.createdAt,
          status: key.status,
        });
      }
    }

    return { encryption, signing };
  }
}

// ============================================
// INTERNAL TYPES
// ============================================

interface EncryptionKeyInternal extends EncryptionKey {
  material: Buffer;
}

interface SigningKeyInternal extends SigningKey {
  privateKey: Buffer;
}

export class CryptoError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'CryptoError';
  }
}

// Export singleton
export const cryptoService = new CryptoService();
