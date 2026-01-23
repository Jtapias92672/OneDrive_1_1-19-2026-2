/**
 * FORGE Platform - Security Headers
 *
 * @epic 3.6 - Security Controls
 * @description HTTP security headers and CORS configuration
 */

import { SecurityHeaders, CORSConfig } from './types.js';

// ============================================
// SECURITY HEADERS MANAGER
// ============================================

export class SecurityHeadersManager {
  private config: SecurityHeadersConfig;

  constructor(config: Partial<SecurityHeadersConfig> = {}) {
    this.config = {
      environment: config.environment ?? 'production',
      csp: config.csp ?? DEFAULT_CSP_CONFIG,
      cors: config.cors ?? DEFAULT_CORS_CONFIG,
      hsts: config.hsts ?? DEFAULT_HSTS_CONFIG,
      permissions: config.permissions ?? DEFAULT_PERMISSIONS,
    };
  }

  // ==========================================
  // SECURITY HEADERS
  // ==========================================

  /**
   * Get all security headers
   */
  getSecurityHeaders(): SecurityHeaders {
    return {
      'Content-Security-Policy': this.buildCSP(),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': this.config.csp.frameAncestors === "'none'" ? 'DENY' : 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': this.buildHSTS(),
      'Referrer-Policy': this.config.environment === 'production' ? 'strict-origin-when-cross-origin' : 'no-referrer-when-downgrade',
      'Permissions-Policy': this.buildPermissionsPolicy(),
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
    };
  }

  /**
   * Build Content-Security-Policy header
   */
  buildCSP(): string {
    const csp = this.config.csp;
    const directives: string[] = [];

    directives.push(`default-src ${csp.defaultSrc}`);
    directives.push(`script-src ${csp.scriptSrc}`);
    directives.push(`style-src ${csp.styleSrc}`);
    directives.push(`img-src ${csp.imgSrc}`);
    directives.push(`font-src ${csp.fontSrc}`);
    directives.push(`connect-src ${csp.connectSrc}`);
    directives.push(`frame-ancestors ${csp.frameAncestors}`);
    directives.push(`form-action ${csp.formAction}`);
    directives.push(`base-uri ${csp.baseUri}`);
    directives.push(`object-src ${csp.objectSrc}`);

    if (csp.reportUri) {
      directives.push(`report-uri ${csp.reportUri}`);
    }

    if (csp.upgradeInsecureRequests) {
      directives.push('upgrade-insecure-requests');
    }

    if (csp.blockAllMixedContent) {
      directives.push('block-all-mixed-content');
    }

    return directives.join('; ');
  }

  /**
   * Build Strict-Transport-Security header
   */
  buildHSTS(): string {
    const hsts = this.config.hsts;
    let value = `max-age=${hsts.maxAge}`;

    if (hsts.includeSubDomains) {
      value += '; includeSubDomains';
    }

    if (hsts.preload) {
      value += '; preload';
    }

    return value;
  }

  /**
   * Build Permissions-Policy header
   */
  buildPermissionsPolicy(): string {
    const permissions = this.config.permissions;
    const policies: string[] = [];

    for (const [feature, value] of Object.entries(permissions)) {
      policies.push(`${feature}=${value}`);
    }

    return policies.join(', ');
  }

  // ==========================================
  // CORS
  // ==========================================

  /**
   * Get CORS headers for a request
   */
  getCORSHeaders(origin?: string): Record<string, string> {
    const cors = this.config.cors;
    const headers: Record<string, string> = {};

    // Check if origin is allowed
    const allowedOrigin = this.getAllowedOrigin(origin);
    if (allowedOrigin) {
      headers['Access-Control-Allow-Origin'] = allowedOrigin;
    }

    if (cors.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    if (cors.exposedHeaders.length > 0) {
      headers['Access-Control-Expose-Headers'] = cors.exposedHeaders.join(', ');
    }

    return headers;
  }

  /**
   * Get CORS preflight headers
   */
  getPreflightHeaders(origin?: string, requestMethod?: string, requestHeaders?: string): Record<string, string> {
    const cors = this.config.cors;
    const headers: Record<string, string> = {};

    // Check if origin is allowed
    const allowedOrigin = this.getAllowedOrigin(origin);
    if (!allowedOrigin) {
      return headers;
    }

    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Access-Control-Allow-Methods'] = cors.allowedMethods.join(', ');
    headers['Access-Control-Allow-Headers'] = cors.allowedHeaders.join(', ');
    headers['Access-Control-Max-Age'] = cors.maxAge.toString();

    if (cors.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    return headers;
  }

  /**
   * Check if origin is allowed
   */
  private getAllowedOrigin(origin?: string): string | null {
    if (!origin) return null;

    const cors = this.config.cors;

    // Wildcard
    if (cors.allowedOrigins.includes('*')) {
      return cors.credentials ? origin : '*';
    }

    // Exact match
    if (cors.allowedOrigins.includes(origin)) {
      return origin;
    }

    // Pattern match
    for (const allowed of cors.allowedOrigins) {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        if (new RegExp(`^${pattern}$`).test(origin)) {
          return origin;
        }
      }
    }

    return null;
  }

  /**
   * Validate CORS request
   */
  validateCORSRequest(origin?: string, method?: string): CORSValidation {
    const cors = this.config.cors;

    if (!origin) {
      return { valid: true, reason: 'No origin header (same-origin request)' };
    }

    const allowedOrigin = this.getAllowedOrigin(origin);
    if (!allowedOrigin) {
      return { valid: false, reason: `Origin not allowed: ${origin}` };
    }

    if (method && !cors.allowedMethods.includes(method.toUpperCase())) {
      return { valid: false, reason: `Method not allowed: ${method}` };
    }

    return { valid: true, origin: allowedOrigin };
  }

  // ==========================================
  // CONFIGURATION
  // ==========================================

  /**
   * Update CSP configuration
   */
  updateCSP(updates: Partial<CSPConfig>): void {
    this.config.csp = { ...this.config.csp, ...updates };
  }

  /**
   * Update CORS configuration
   */
  updateCORS(updates: Partial<CORSConfig>): void {
    this.config.cors = { ...this.config.cors, ...updates };
  }

  /**
   * Add allowed CORS origin
   */
  addAllowedOrigin(origin: string): void {
    if (!this.config.cors.allowedOrigins.includes(origin)) {
      this.config.cors.allowedOrigins.push(origin);
    }
  }

  /**
   * Remove allowed CORS origin
   */
  removeAllowedOrigin(origin: string): void {
    this.config.cors.allowedOrigins = this.config.cors.allowedOrigins.filter(o => o !== origin);
  }

  /**
   * Get current configuration
   */
  getConfig(): SecurityHeadersConfig {
    return { ...this.config };
  }
}

// ============================================
// DEFAULT CONFIGURATIONS
// ============================================

const DEFAULT_CSP_CONFIG: CSPConfig = {
  defaultSrc: "'self'",
  scriptSrc: "'self'",
  styleSrc: "'self' 'unsafe-inline'",
  imgSrc: "'self' data: https:",
  fontSrc: "'self'",
  connectSrc: "'self'",
  frameAncestors: "'none'",
  formAction: "'self'",
  baseUri: "'self'",
  objectSrc: "'none'",
  upgradeInsecureRequests: true,
  blockAllMixedContent: true,
};

const DEFAULT_CORS_CONFIG: CORSConfig = {
  allowedOrigins: [],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400,
  credentials: false,
};

const DEFAULT_HSTS_CONFIG: HSTSConfig = {
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true,
};

const DEFAULT_PERMISSIONS: Record<string, string> = {
  accelerometer: '()',
  camera: '()',
  geolocation: '()',
  gyroscope: '()',
  magnetometer: '()',
  microphone: '()',
  payment: '()',
  usb: '()',
  'interest-cohort': '()',
};

// ============================================
// TYPES
// ============================================

export interface SecurityHeadersConfig {
  environment: 'development' | 'staging' | 'production';
  csp: CSPConfig;
  cors: CORSConfig;
  hsts: HSTSConfig;
  permissions: Record<string, string>;
}

export interface CSPConfig {
  defaultSrc: string;
  scriptSrc: string;
  styleSrc: string;
  imgSrc: string;
  fontSrc: string;
  connectSrc: string;
  frameAncestors: string;
  formAction: string;
  baseUri: string;
  objectSrc: string;
  reportUri?: string;
  upgradeInsecureRequests: boolean;
  blockAllMixedContent: boolean;
}

export interface HSTSConfig {
  maxAge: number;
  includeSubDomains: boolean;
  preload: boolean;
}

export interface CORSValidation {
  valid: boolean;
  reason?: string;
  origin?: string;
}

// ============================================
// MIDDLEWARE HELPERS
// ============================================

/**
 * Create security headers middleware
 */
export function createSecurityHeadersMiddleware(config?: Partial<SecurityHeadersConfig>) {
  const manager = new SecurityHeadersManager(config);
  const headers = manager.getSecurityHeaders();

  return (req: { headers: Record<string, string>; method: string }, res: { setHeader: (name: string, value: string) => void }) => {
    // Set security headers
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, value);
    }

    // Handle CORS
    const origin = req.headers['origin'];
    const corsHeaders = manager.getCORSHeaders(origin);
    for (const [name, value] of Object.entries(corsHeaders)) {
      res.setHeader(name, value);
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      const preflightHeaders = manager.getPreflightHeaders(
        origin,
        req.headers['access-control-request-method'],
        req.headers['access-control-request-headers']
      );
      for (const [name, value] of Object.entries(preflightHeaders)) {
        res.setHeader(name, value);
      }
    }
  };
}

// Export singleton
export const securityHeaders = new SecurityHeadersManager();
