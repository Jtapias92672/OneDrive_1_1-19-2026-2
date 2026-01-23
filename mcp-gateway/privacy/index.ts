/**
 * MCP Security Gateway - Privacy Tokenizer
 * 
 * @epic 2.5 - MCP Security Gateway
 * @task 6.1 - Privacy Implementation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   PII detection and tokenization layer.
 *   Ensures sensitive data never reaches the LLM context.
 *   Supports reversible tokenization for response processing.
 */

import { PrivacyConfig, PIIPattern } from '../core/types.js';
import * as crypto from 'crypto';

// ============================================
// PRIVACY TOKENIZER
// ============================================

export class PrivacyTokenizer {
  private config: PrivacyConfig;
  private tokenMap = new Map<string, TokenEntry>();
  private patterns: CompiledPattern[];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: PrivacyConfig) {
    this.config = config;
    this.patterns = this.compilePatterns(config.patterns);
    this.startCleanup();
  }

  private compilePatterns(patterns: PIIPattern[]): CompiledPattern[] {
    return patterns.map(p => ({
      ...p,
      regex: new RegExp(p.pattern, 'gi'),
    }));
  }

  private startCleanup(): void {
    // Cleanup expired tokens every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60000);
  }

  // ==========================================
  // TOKENIZATION
  // ==========================================

  /**
   * Tokenize sensitive data in input
   */
  tokenize(data: unknown): TokenizeResult {
    if (!this.config.enabled) {
      return {
        data,
        tokenized: false,
        fieldsTokenized: [],
        piiDetected: [],
      };
    }

    const fieldsTokenized: string[] = [];
    const piiDetected: string[] = [];

    const tokenized = this.deepTokenize(data, '', fieldsTokenized, piiDetected);

    return {
      data: tokenized,
      tokenized: fieldsTokenized.length > 0,
      fieldsTokenized,
      piiDetected: [...new Set(piiDetected)],
    };
  }

  private deepTokenize(
    obj: unknown,
    path: string,
    fieldsTokenized: string[],
    piiDetected: string[]
  ): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.tokenizeString(obj, path, fieldsTokenized, piiDetected);
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) => 
        this.deepTokenize(item, `${path}[${index}]`, fieldsTokenized, piiDetected)
      );
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;
        
        // Check if field should never be tokenized
        if (this.config.neverTokenize.includes(key)) {
          result[key] = value;
          continue;
        }
        
        // Check if field should always be tokenized
        if (this.config.alwaysTokenize.includes(key)) {
          if (typeof value === 'string') {
            result[key] = this.createToken(value, 'FIELD', fieldPath, fieldsTokenized, piiDetected);
          } else {
            result[key] = this.deepTokenize(value, fieldPath, fieldsTokenized, piiDetected);
          }
          continue;
        }
        
        result[key] = this.deepTokenize(value, fieldPath, fieldsTokenized, piiDetected);
      }
      
      return result;
    }

    return obj;
  }

  private tokenizeString(
    str: string,
    path: string,
    fieldsTokenized: string[],
    piiDetected: string[]
  ): string {
    let result = str;

    for (const pattern of this.patterns) {
      const matches = str.match(pattern.regex);
      
      if (matches) {
        piiDetected.push(pattern.name);
        
        for (const match of matches) {
          const token = this.createToken(match, pattern.name.toUpperCase(), path, fieldsTokenized, piiDetected);
          result = result.replace(match, token);
        }
      }
    }

    return result;
  }

  private createToken(
    value: string,
    type: string,
    path: string,
    fieldsTokenized: string[],
    _piiDetected: string[]
  ): string {
    // Generate unique token ID
    const tokenId = crypto.randomBytes(8).toString('hex');
    
    // Create token string
    const token = this.config.tokenFormat
      .replace('{{TYPE}}', type)
      .replace('{{ID}}', tokenId);
    
    // Store mapping
    this.tokenMap.set(token, {
      originalValue: value,
      type,
      path,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.tokenTtlMs,
    });
    
    if (path && !fieldsTokenized.includes(path)) {
      fieldsTokenized.push(path);
    }
    
    return token;
  }

  // ==========================================
  // DETOKENIZATION
  // ==========================================

  /**
   * Detokenize data by reversing token mappings
   */
  detokenize(data: unknown): unknown {
    if (!this.config.enabled) {
      return data;
    }

    return this.deepDetokenize(data);
  }

  private deepDetokenize(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.detokenizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepDetokenize(item));
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.deepDetokenize(value);
      }
      return result;
    }

    return obj;
  }

  private detokenizeString(str: string): string {
    let result = str;

    for (const [token, entry] of this.tokenMap.entries()) {
      if (result.includes(token)) {
        result = result.replace(new RegExp(this.escapeRegex(token), 'g'), entry.originalValue);
      }
    }

    return result;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ==========================================
  // PII DETECTION (without tokenization)
  // ==========================================

  /**
   * Detect PII without tokenizing
   */
  detectPII(data: unknown): PIIDetectionResult {
    const detected: PIIDetection[] = [];
    this.deepDetect(data, '', detected);

    return {
      hasPII: detected.length > 0,
      detections: detected,
      summary: this.summarizeDetections(detected),
    };
  }

  private deepDetect(obj: unknown, path: string, detected: PIIDetection[]): void {
    if (obj === null || obj === undefined) {
      return;
    }

    if (typeof obj === 'string') {
      for (const pattern of this.patterns) {
        const matches = obj.match(pattern.regex);
        if (matches) {
          for (const match of matches) {
            detected.push({
              type: pattern.name,
              path,
              sensitivity: pattern.sensitivity,
              value: this.maskValue(match),
            });
          }
        }
      }
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.deepDetect(item, `${path}[${index}]`, detected);
      });
      return;
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;
        
        // Check if field name suggests sensitive data
        if (this.config.alwaysTokenize.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
          if (typeof value === 'string' && value.length > 0) {
            detected.push({
              type: 'field_name',
              path: fieldPath,
              sensitivity: 'high',
              value: this.maskValue(value),
            });
          }
        }
        
        this.deepDetect(value, fieldPath, detected);
      }
    }
  }

  private maskValue(value: string): string {
    if (value.length <= 4) {
      return '****';
    }
    const visible = Math.min(4, Math.floor(value.length * 0.2));
    return value.slice(0, visible) + '*'.repeat(value.length - visible * 2) + value.slice(-visible);
  }

  private summarizeDetections(detections: PIIDetection[]): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const detection of detections) {
      summary[detection.type] = (summary[detection.type] || 0) + 1;
    }
    return summary;
  }

  // ==========================================
  // TOKEN MANAGEMENT
  // ==========================================

  /**
   * Lookup a token's original value
   */
  lookupToken(token: string): string | null {
    const entry = this.tokenMap.get(token);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.tokenMap.delete(token);
      return null;
    }
    return entry.originalValue;
  }

  /**
   * Check if a token exists
   */
  hasToken(token: string): boolean {
    return this.tokenMap.has(token);
  }

  /**
   * Invalidate a specific token
   */
  invalidateToken(token: string): void {
    this.tokenMap.delete(token);
  }

  /**
   * Clear all tokens
   */
  clearAllTokens(): void {
    this.tokenMap.clear();
  }

  /**
   * Cleanup expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, entry] of this.tokenMap.entries()) {
      if (entry.expiresAt < now) {
        this.tokenMap.delete(token);
      }
    }
  }

  /**
   * Get token statistics
   */
  getStats(): TokenStats {
    let activeCount = 0;
    let expiredCount = 0;
    const byType: Record<string, number> = {};
    const now = Date.now();

    for (const [_, entry] of this.tokenMap.entries()) {
      if (entry.expiresAt >= now) {
        activeCount++;
        byType[entry.type] = (byType[entry.type] || 0) + 1;
      } else {
        expiredCount++;
      }
    }

    return {
      activeCount,
      expiredCount,
      totalCount: this.tokenMap.size,
      byType,
    };
  }

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.tokenMap.clear();
  }
}

// ============================================
// TYPES
// ============================================

export interface TokenizeResult {
  data: unknown;
  tokenized: boolean;
  fieldsTokenized: string[];
  piiDetected: string[];
}

export interface TokenEntry {
  originalValue: string;
  type: string;
  path: string;
  createdAt: number;
  expiresAt: number;
}

export interface CompiledPattern extends PIIPattern {
  regex: RegExp;
}

export interface PIIDetectionResult {
  hasPII: boolean;
  detections: PIIDetection[];
  summary: Record<string, number>;
}

export interface PIIDetection {
  type: string;
  path: string;
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  value: string; // Masked value
}

export interface TokenStats {
  activeCount: number;
  expiredCount: number;
  totalCount: number;
  byType: Record<string, number>;
}

// ============================================
// EXPORTS
// ============================================

export default PrivacyTokenizer;
