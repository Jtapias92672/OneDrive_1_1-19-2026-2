/**
 * Token Encryption Utilities
 *
 * AES-256-GCM encryption for OAuth tokens.
 * Uses authenticated encryption to prevent tampering.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Get encryption key from environment (32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || '00000000000000000000000000000000000000000000000000000000000000000';

/**
 * Convert hex key to Buffer
 */
function getKeyBuffer(): Buffer {
  if (ENCRYPTION_KEY.length !== 64) {
    throw new Error('OAUTH_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return Buffer.from(ENCRYPTION_KEY, 'hex');
}

/**
 * Encrypt a token using AES-256-GCM
 *
 * Format: iv:authTag:ciphertext (base64url encoded)
 *
 * @param token Token to encrypt
 * @returns Encrypted token string
 */
export function encryptToken(token: string): string {
  const key = getKeyBuffer();

  // Generate random IV (12 bytes for GCM)
  const iv = randomBytes(12);

  // Create cipher
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  // Encrypt
  let encrypted = cipher.update(token, 'utf8', 'base64url');
  encrypted += cipher.final('base64url');

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:ciphertext
  return `${iv.toString('base64url')}:${authTag.toString('base64url')}:${encrypted}`;
}

/**
 * Decrypt a token encrypted with encryptToken()
 *
 * @param encrypted Encrypted token string
 * @returns Decrypted token
 */
export function decryptToken(encrypted: string): string {
  const key = getKeyBuffer();

  // Parse format: iv:authTag:ciphertext
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const iv = Buffer.from(parts[0], 'base64url');
  const authTag = Buffer.from(parts[1], 'base64url');
  const ciphertext = parts[2];

  // Create decipher
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt
  let decrypted = decipher.update(ciphertext, 'base64url', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a new encryption key (for setup)
 *
 * @returns 64-character hex string (32 bytes)
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}
