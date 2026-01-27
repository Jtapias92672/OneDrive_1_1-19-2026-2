/**
 * Hash Chain Implementation
 * Provides tamper-evident logging using cryptographic hash chain
 */

import { AuditEvent, HashChainVerification } from './types';

// SHA-256 implementation that works in both Node.js and browser
async function sha256(message: string): Promise<string> {
  // Node.js environment
  if (typeof globalThis.crypto?.subtle === 'undefined') {
    // Use Node.js crypto module
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(message).digest('hex');
  }

  // Browser environment - use Web Crypto API
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class HashChain {
  static readonly GENESIS_HASH = '0'.repeat(64);

  /**
   * Compute hash for an event
   */
  async computeHash(
    event: Omit<AuditEvent, 'eventHash'>,
    previousHash: string
  ): Promise<string> {
    const payload = JSON.stringify({
      id: event.id,
      eventType: event.eventType,
      actor: event.actor,
      action: event.action,
      resource: event.resource,
      details: event.details,
      riskLevel: event.riskLevel,
      workflowId: event.workflowId,
      createdAt: event.createdAt.toISOString(),
      previousHash,
    });
    return sha256(payload);
  }

  /**
   * Verify the integrity of an event chain
   */
  async verify(events: AuditEvent[]): Promise<HashChainVerification> {
    if (events.length === 0) {
      return { valid: true, message: 'Empty chain is valid' };
    }

    let previousHash = HashChain.GENESIS_HASH;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // Check previous hash link
      if (event.previousHash !== previousHash) {
        return {
          valid: false,
          brokenAt: i,
          message: `Previous hash mismatch at event ${event.id} (index ${i})`,
        };
      }

      // Verify event hash
      const expectedHash = await this.computeHash(event, previousHash);
      if (event.eventHash !== expectedHash) {
        return {
          valid: false,
          brokenAt: i,
          message: `Hash mismatch at event ${event.id} (index ${i})`,
        };
      }

      previousHash = event.eventHash;
    }

    return { valid: true, message: 'Chain integrity verified' };
  }
}

export const hashChain = new HashChain();
