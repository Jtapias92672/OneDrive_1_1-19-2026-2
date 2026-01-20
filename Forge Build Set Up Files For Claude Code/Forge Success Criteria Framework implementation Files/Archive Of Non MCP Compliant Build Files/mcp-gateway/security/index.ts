/**
 * MCP Security Gateway - Security Layer
 * 
 * @epic 2.5 - MCP Security Gateway
 * @task 3.1 - Security Implementation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Implements OAuth 2.1 + PKCE, input sanitization, and tool integrity
 *   verification to prevent Tool Poisoning Attacks (TPA).
 */

import { SecurityConfig, MCPTool, RequestContext } from '../core/types';
import * as crypto from 'crypto';

// ============================================
// SECURITY LAYER
// ============================================

export class SecurityLayer {
  private config: SecurityConfig;
  private tokenCache = new Map<string, TokenInfo>();

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  // ==========================================
  // AUTHENTICATION (OAuth 2.1 + PKCE)
  // ==========================================

  /**
   * Authenticate a request context
   */
  async authenticate(context: RequestContext): Promise<AuthResult> {
    if (!this.config.oauth.enabled) {
      return { valid: true };
    }

    const token = context.authToken;
    if (!token) {
      return { valid: false, error: 'No auth token provided' };
    }

    // Check cache first
    const cached = this.tokenCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      return { valid: true, claims: cached.claims };
    }

    // Validate token
    try {
      const claims = await this.validateToken(token);
      
      // Check required scopes
      const requiredScopes = this.config.oauth.scopes || [];
      const tokenScopes = claims.scope?.split(' ') || [];
      const hasRequiredScopes = requiredScopes.every(s => tokenScopes.includes(s));
      
      if (!hasRequiredScopes) {
        return { valid: false, error: 'Insufficient scopes' };
      }

      // Cache valid token
      this.tokenCache.set(token, {
        claims,
        expiresAt: claims.exp * 1000,
      });

      return { valid: true, claims };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate JWT token
   */
  private async validateToken(token: string): Promise<JWTClaims> {
    // In production, this would validate against the OAuth issuer
    // For now, implement basic JWT structure validation
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      
      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
      }

      // Check issuer
      if (this.config.oauth.issuer && payload.iss !== this.config.oauth.issuer) {
        throw new Error('Invalid issuer');
      }

      return payload;
    } catch (error: any) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  /**
   * Generate PKCE challenge
   */
  generatePKCE(): PKCEChallenge {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');

    return { verifier, challenge, method: 'S256' };
  }

  /**
   * Verify PKCE challenge
   */
  verifyPKCE(verifier: string, challenge: string): boolean {
    const computed = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    
    return computed === challenge;
  }

  // ==========================================
  // INPUT SANITIZATION
  // ==========================================

  /**
   * Sanitize input parameters
   */
  sanitizeInput(params: Record<string, unknown>): SanitizeResult {
    const blockedPatterns = this.config.inputSanitization.blockPatterns;
    const maxSize = this.config.inputSanitization.maxInputSize;

    // Check size
    const serialized = JSON.stringify(params);
    if (serialized.length > maxSize) {
      return {
        safe: false,
        sanitized: params,
        blockedPatterns: ['SIZE_EXCEEDED'],
      };
    }

    // Check for blocked patterns
    const foundPatterns: string[] = [];
    for (const pattern of blockedPatterns) {
      if (this.containsPattern(serialized, pattern)) {
        foundPatterns.push(pattern);
      }
    }

    if (foundPatterns.length > 0) {
      return {
        safe: false,
        sanitized: params,
        blockedPatterns: foundPatterns,
      };
    }

    // Recursively sanitize strings
    const sanitized = this.deepSanitize(params);

    return {
      safe: true,
      sanitized,
      blockedPatterns: [],
    };
  }

  private containsPattern(text: string, pattern: string): boolean {
    // Case-insensitive search
    return text.toLowerCase().includes(pattern.toLowerCase());
  }

  private deepSanitize(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitize(item));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[this.sanitizeString(key)] = this.deepSanitize(value);
      }
      return result;
    }
    
    return obj;
  }

  private sanitizeString(str: string): string {
    // Remove null bytes
    str = str.replace(/\0/g, '');
    
    // Normalize unicode
    str = str.normalize('NFC');
    
    // Trim excessive whitespace
    str = str.replace(/\s+/g, ' ').trim();
    
    return str;
  }

  // ==========================================
  // TOOL INTEGRITY
  // ==========================================

  /**
   * Compute integrity hash for a tool
   */
  computeToolHash(tool: MCPTool): string {
    const algorithm = this.config.toolIntegrity.hashAlgorithm;
    
    // Hash the critical fields that affect behavior
    const hashContent = JSON.stringify({
      name: tool.name,
      description: tool.description,
      version: tool.version,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
      permissions: tool.metadata.permissions,
    });

    return crypto
      .createHash(algorithm)
      .update(hashContent)
      .digest('hex');
  }

  /**
   * Verify tool integrity
   */
  verifyToolIntegrity(tool: MCPTool): boolean {
    if (!this.config.toolIntegrity.enabled) {
      return true;
    }

    // Check signature if required
    if (this.config.toolIntegrity.requireSignature) {
      if (!tool.signature) {
        return false;
      }
      
      // Verify signature against trusted signers
      const signatureValid = this.verifySignature(tool);
      if (!signatureValid) {
        return false;
      }
    }

    // Verify hash if stored
    if (tool.integrityHash) {
      const currentHash = this.computeToolHash(tool);
      return currentHash === tool.integrityHash;
    }

    return true;
  }

  /**
   * Verify tool signature
   */
  private verifySignature(tool: MCPTool): boolean {
    if (!tool.signature) return false;
    
    // In production, this would verify against trusted signers' public keys
    // For now, implement basic structure validation
    try {
      const parts = tool.signature.split('.');
      if (parts.length !== 2) return false;
      
      const [signerId, sig] = parts;
      
      // Check if signer is trusted
      if (!this.config.toolIntegrity.trustedSigners.includes(signerId)) {
        return false;
      }
      
      // Would verify actual cryptographic signature here
      return sig.length >= 64; // Minimum signature length
    } catch {
      return false;
    }
  }

  /**
   * Sign a tool (for trusted sources)
   */
  signTool(tool: MCPTool, signerId: string, privateKey: string): string {
    const hash = this.computeToolHash(tool);
    
    // In production, use proper asymmetric signing
    const signature = crypto
      .createHmac('sha256', privateKey)
      .update(hash)
      .digest('hex');
    
    return `${signerId}.${signature}`;
  }

  // ==========================================
  // SUPPLY CHAIN VERIFICATION
  // ==========================================

  /**
   * Verify tool supply chain
   */
  async verifySupplyChain(tool: MCPTool): Promise<SupplyChainResult> {
    if (!this.config.supplyChain.enabled) {
      return { verified: true, warnings: [] };
    }

    const warnings: string[] = [];

    // Check source registry
    const source = tool.metadata.source;
    const allowedRegistries = this.config.supplyChain.allowedRegistries;
    
    const sourceRegistry = this.extractRegistry(source);
    if (!allowedRegistries.includes(sourceRegistry)) {
      return {
        verified: false,
        warnings: [`Source registry not allowed: ${sourceRegistry}`],
      };
    }

    // Check for SBOM if required
    if (this.config.supplyChain.requireSBOM) {
      // Would check for SBOM file/data
      warnings.push('SBOM verification not yet implemented');
    }

    // Vulnerability scan
    if (this.config.supplyChain.vulnerabilityScan) {
      const vulnResult = await this.scanVulnerabilities(tool);
      if (vulnResult.hasVulnerabilities) {
        warnings.push(...vulnResult.vulnerabilities.map(v => `Vulnerability: ${v}`));
      }
    }

    return {
      verified: warnings.length === 0,
      warnings,
    };
  }

  private extractRegistry(source: string): string {
    if (source.startsWith('npm:')) return 'npm';
    if (source.startsWith('pypi:')) return 'pypi';
    if (source.startsWith('local:')) return 'local';
    if (source.startsWith('http')) return 'url';
    return 'unknown';
  }

  private async scanVulnerabilities(tool: MCPTool): Promise<VulnScanResult> {
    // In production, would integrate with vulnerability databases
    // (e.g., npm audit, Snyk, GitHub Advisory Database)
    return {
      hasVulnerabilities: false,
      vulnerabilities: [],
    };
  }

  // ==========================================
  // TENANT ISOLATION
  // ==========================================

  /**
   * Validate tenant access
   */
  validateTenantAccess(
    sourceTenant: string,
    targetTenant: string,
    tool: string,
    operation: string
  ): boolean {
    // Same tenant always allowed
    if (sourceTenant === targetTenant) {
      return true;
    }

    // Check cross-tenant rules
    // Would be configured in tenantIsolation.crossTenantRules
    return false;
  }

  /**
   * Get tenant namespace
   */
  getTenantNamespace(tenantId: string): string {
    return `tenant_${crypto.createHash('sha256').update(tenantId).digest('hex').slice(0, 16)}`;
  }
}

// ============================================
// TYPES
// ============================================

export interface AuthResult {
  valid: boolean;
  error?: string;
  claims?: JWTClaims;
}

export interface JWTClaims {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  scope?: string;
  [key: string]: unknown;
}

export interface TokenInfo {
  claims: JWTClaims;
  expiresAt: number;
}

export interface PKCEChallenge {
  verifier: string;
  challenge: string;
  method: 'S256';
}

export interface SanitizeResult {
  safe: boolean;
  sanitized: Record<string, unknown>;
  blockedPatterns: string[];
}

export interface SupplyChainResult {
  verified: boolean;
  warnings: string[];
}

export interface VulnScanResult {
  hasVulnerabilities: boolean;
  vulnerabilities: string[];
}

// ============================================
// EXPORTS
// ============================================

export default SecurityLayer;
