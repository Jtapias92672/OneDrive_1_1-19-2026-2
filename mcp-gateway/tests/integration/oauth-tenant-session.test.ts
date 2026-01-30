/**
 * Integration Tests: OAuth → Tenant → Session Chain
 *
 * @epic 3.6 - Security Controls
 * @integration Multi-module workflow testing
 *
 * Tests the complete flow from OAuth authentication through tenant isolation to session management.
 */

// ============================================
// MOCK IMPLEMENTATIONS FOR INTEGRATION TESTING
// ============================================

/**
 * OAuth Token Claims
 */
interface OAuthClaims {
  sub: string;
  email: string;
  tenant_id: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

/**
 * Mock OAuth Token Manager
 */
class MockOAuthTokenManager {
  private tokens: Map<string, TokenData> = new Map();
  private refreshTokens: Map<string, string> = new Map();

  async createToken(claims: Partial<OAuthClaims>): Promise<TokenResult> {
    const now = Math.floor(Date.now() / 1000);
    const fullClaims: OAuthClaims = {
      sub: claims.sub || `user-${Date.now()}`,
      email: claims.email || 'user@example.com',
      tenant_id: claims.tenant_id || 'default-tenant',
      roles: claims.roles || ['user'],
      permissions: claims.permissions || ['read'],
      iat: now,
      exp: now + 3600, // 1 hour
      iss: 'forge-auth',
      aud: 'forge-api',
    };

    const accessToken = `access-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const refreshToken = `refresh-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    this.tokens.set(accessToken, {
      claims: fullClaims,
      createdAt: new Date(),
      expiresAt: new Date(fullClaims.exp * 1000),
    });

    this.refreshTokens.set(refreshToken, accessToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      tokenType: 'Bearer',
      claims: fullClaims,
    };
  }

  async validateToken(accessToken: string): Promise<TokenValidation> {
    const tokenData = this.tokens.get(accessToken);

    if (!tokenData) {
      return { valid: false, reason: 'Token not found' };
    }

    if (tokenData.expiresAt < new Date()) {
      return { valid: false, reason: 'Token expired' };
    }

    return { valid: true, claims: tokenData.claims };
  }

  async revokeToken(accessToken: string): Promise<void> {
    this.tokens.delete(accessToken);

    // Also revoke associated refresh token
    for (const [refresh, access] of this.refreshTokens.entries()) {
      if (access === accessToken) {
        this.refreshTokens.delete(refresh);
        break;
      }
    }
  }

  getTokenCount(): number {
    return this.tokens.size;
  }
}

interface TokenData {
  claims: OAuthClaims;
  createdAt: Date;
  expiresAt: Date;
}

interface TokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  claims: OAuthClaims;
}

interface TokenValidation {
  valid: boolean;
  reason?: string;
  claims?: OAuthClaims;
}

/**
 * Mock Tenant Context Manager
 */
class MockTenantContextManager {
  private tenantMappings: Map<string, TenantInfo> = new Map();
  private userTenantAccess: Map<string, Set<string>> = new Map();

  registerTenant(tenantId: string, info: Partial<TenantInfo>): void {
    this.tenantMappings.set(tenantId, {
      tenantId,
      name: info.name || tenantId,
      tier: info.tier || 'standard',
      limits: info.limits || { maxSessions: 100, maxRequestsPerMinute: 1000 },
      createdAt: new Date(),
    });
  }

  extractTenantFromClaims(claims: OAuthClaims): TenantContext {
    const tenantId = claims.tenant_id;
    const tenantInfo = this.tenantMappings.get(tenantId);

    // Register user access to this tenant
    if (!this.userTenantAccess.has(claims.sub)) {
      this.userTenantAccess.set(claims.sub, new Set());
    }
    this.userTenantAccess.get(claims.sub)!.add(tenantId);

    return {
      tenantId,
      tenantInfo: tenantInfo || {
        tenantId,
        name: tenantId,
        tier: 'standard',
        limits: { maxSessions: 100, maxRequestsPerMinute: 1000 },
        createdAt: new Date(),
      },
      userId: claims.sub,
      roles: claims.roles,
      permissions: claims.permissions,
      extractedAt: new Date(),
    };
  }

  validateTenantAccess(userId: string, tenantId: string): boolean {
    const userTenants = this.userTenantAccess.get(userId);
    return userTenants?.has(tenantId) || false;
  }

  cleanupUserAccess(userId: string): void {
    this.userTenantAccess.delete(userId);
  }

  getUserTenants(userId: string): string[] {
    const tenants = this.userTenantAccess.get(userId);
    return tenants ? Array.from(tenants) : [];
  }
}

interface TenantInfo {
  tenantId: string;
  name: string;
  tier: 'free' | 'standard' | 'enterprise';
  limits: {
    maxSessions: number;
    maxRequestsPerMinute: number;
  };
  createdAt: Date;
}

interface TenantContext {
  tenantId: string;
  tenantInfo: TenantInfo;
  userId: string;
  roles: string[];
  permissions: string[];
  extractedAt: Date;
}

/**
 * Mock Session Manager
 */
class MockSessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();
  private tenantSessions: Map<string, Set<string>> = new Map();

  async createSession(tenantContext: TenantContext, accessToken: string): Promise<SessionData> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const session: SessionData = {
      sessionId,
      userId: tenantContext.userId,
      tenantId: tenantContext.tenantId,
      accessToken,
      roles: tenantContext.roles,
      permissions: tenantContext.permissions,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
      metadata: {},
    };

    this.sessions.set(sessionId, session);

    // Track user sessions
    if (!this.userSessions.has(tenantContext.userId)) {
      this.userSessions.set(tenantContext.userId, new Set());
    }
    this.userSessions.get(tenantContext.userId)!.add(sessionId);

    // Track tenant sessions
    if (!this.tenantSessions.has(tenantContext.tenantId)) {
      this.tenantSessions.set(tenantContext.tenantId, new Set());
    }
    this.tenantSessions.get(tenantContext.tenantId)!.add(sessionId);

    return session;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    return this.sessions.get(sessionId) || null;
  }

  async validateSession(sessionId: string): Promise<SessionValidation> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    if (session.expiresAt < new Date()) {
      return { valid: false, reason: 'Session expired' };
    }

    // Update last activity
    session.lastActivityAt = new Date();

    return { valid: true, session };
  }

  async invalidateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Remove from user sessions
      this.userSessions.get(session.userId)?.delete(sessionId);

      // Remove from tenant sessions
      this.tenantSessions.get(session.tenantId)?.delete(sessionId);

      // Delete session
      this.sessions.delete(sessionId);
    }
  }

  async invalidateUserSessions(userId: string): Promise<number> {
    const userSessionIds = this.userSessions.get(userId);
    if (!userSessionIds) return 0;

    const count = userSessionIds.size;
    for (const sessionId of userSessionIds) {
      await this.invalidateSession(sessionId);
    }

    return count;
  }

  async invalidateTenantSessions(tenantId: string): Promise<number> {
    const tenantSessionIds = this.tenantSessions.get(tenantId);
    if (!tenantSessionIds) return 0;

    const count = tenantSessionIds.size;
    for (const sessionId of tenantSessionIds) {
      await this.invalidateSession(sessionId);
    }

    return count;
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  getUserSessionCount(userId: string): number {
    return this.userSessions.get(userId)?.size || 0;
  }

  getTenantSessionCount(tenantId: string): number {
    return this.tenantSessions.get(tenantId)?.size || 0;
  }
}

interface SessionData {
  sessionId: string;
  userId: string;
  tenantId: string;
  accessToken: string;
  roles: string[];
  permissions: string[];
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  metadata: Record<string, unknown>;
}

interface SessionValidation {
  valid: boolean;
  reason?: string;
  session?: SessionData;
}

/**
 * Integrated OAuth-Tenant-Session Pipeline
 */
class OAuthTenantSessionPipeline {
  constructor(
    private tokenManager: MockOAuthTokenManager,
    private tenantManager: MockTenantContextManager,
    private sessionManager: MockSessionManager
  ) {}

  async authenticateAndCreateSession(claims: Partial<OAuthClaims>): Promise<AuthResult> {
    // Step 1: Create OAuth token
    const tokenResult = await this.tokenManager.createToken(claims);

    // Step 2: Extract tenant context from claims
    const tenantContext = this.tenantManager.extractTenantFromClaims(tokenResult.claims);

    // Step 3: Create session with tenant isolation
    const session = await this.sessionManager.createSession(tenantContext, tokenResult.accessToken);

    return {
      success: true,
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      session,
      tenantContext,
    };
  }

  async validateRequest(accessToken: string, sessionId: string): Promise<RequestValidation> {
    // Validate token
    const tokenValidation = await this.tokenManager.validateToken(accessToken);
    if (!tokenValidation.valid) {
      return { valid: false, reason: `Token invalid: ${tokenValidation.reason}` };
    }

    // Validate session
    const sessionValidation = await this.sessionManager.validateSession(sessionId);
    if (!sessionValidation.valid) {
      return { valid: false, reason: `Session invalid: ${sessionValidation.reason}` };
    }

    // Verify session belongs to token's user
    if (sessionValidation.session!.userId !== tokenValidation.claims!.sub) {
      return { valid: false, reason: 'Session user mismatch' };
    }

    // Verify tenant isolation
    if (sessionValidation.session!.tenantId !== tokenValidation.claims!.tenant_id) {
      return { valid: false, reason: 'Tenant mismatch' };
    }

    return {
      valid: true,
      claims: tokenValidation.claims,
      session: sessionValidation.session,
    };
  }

  async logout(accessToken: string, sessionId: string): Promise<LogoutResult> {
    const session = await this.sessionManager.getSession(sessionId);
    const userId = session?.userId;
    const tenantId = session?.tenantId;

    // Invalidate session
    await this.sessionManager.invalidateSession(sessionId);

    // Revoke token
    await this.tokenManager.revokeToken(accessToken);

    // Cleanup tenant access if no more sessions
    if (userId && this.sessionManager.getUserSessionCount(userId) === 0) {
      this.tenantManager.cleanupUserAccess(userId);
    }

    return {
      success: true,
      sessionInvalidated: true,
      tokenRevoked: true,
      tenantCleanedUp: userId ? this.tenantManager.getUserTenants(userId).length === 0 : false,
      userId,
      tenantId,
    };
  }
}

interface AuthResult {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  session: SessionData;
  tenantContext: TenantContext;
}

interface RequestValidation {
  valid: boolean;
  reason?: string;
  claims?: OAuthClaims;
  session?: SessionData;
}

interface LogoutResult {
  success: boolean;
  sessionInvalidated: boolean;
  tokenRevoked: boolean;
  tenantCleanedUp: boolean;
  userId?: string;
  tenantId?: string;
}

// ============================================
// INTEGRATION TESTS
// ============================================

describe('OAuth → Tenant → Session Integration', () => {
  let tokenManager: MockOAuthTokenManager;
  let tenantManager: MockTenantContextManager;
  let sessionManager: MockSessionManager;
  let pipeline: OAuthTenantSessionPipeline;

  beforeEach(() => {
    tokenManager = new MockOAuthTokenManager();
    tenantManager = new MockTenantContextManager();
    sessionManager = new MockSessionManager();
    pipeline = new OAuthTenantSessionPipeline(tokenManager, tenantManager, sessionManager);

    // Register some tenants
    tenantManager.registerTenant('tenant-a', { name: 'Tenant A', tier: 'enterprise' });
    tenantManager.registerTenant('tenant-b', { name: 'Tenant B', tier: 'standard' });
  });

  // ==========================================
  // TOKEN → SESSION CREATION
  // ==========================================

  describe('OAuth token creates valid session with tenant isolation', () => {
    it('should create session with correct tenant context from OAuth claims', async () => {
      const authResult = await pipeline.authenticateAndCreateSession({
        sub: 'user-123',
        email: 'user@example.com',
        tenant_id: 'tenant-a',
        roles: ['admin'],
        permissions: ['read', 'write', 'delete'],
      });

      // Verify auth succeeded
      expect(authResult.success).toBe(true);
      expect(authResult.accessToken).toBeDefined();
      expect(authResult.refreshToken).toBeDefined();

      // Verify session has correct tenant
      expect(authResult.session.tenantId).toBe('tenant-a');
      expect(authResult.session.userId).toBe('user-123');

      // Verify tenant context extracted correctly
      expect(authResult.tenantContext.tenantId).toBe('tenant-a');
      expect(authResult.tenantContext.userId).toBe('user-123');
      expect(authResult.tenantContext.roles).toContain('admin');
      expect(authResult.tenantContext.permissions).toContain('write');
    });

    it('should isolate sessions between different tenants', async () => {
      // Create session for tenant A
      const authA = await pipeline.authenticateAndCreateSession({
        sub: 'user-a',
        tenant_id: 'tenant-a',
      });

      // Create session for tenant B
      const authB = await pipeline.authenticateAndCreateSession({
        sub: 'user-b',
        tenant_id: 'tenant-b',
      });

      // Verify sessions are isolated
      expect(authA.session.tenantId).toBe('tenant-a');
      expect(authB.session.tenantId).toBe('tenant-b');
      expect(authA.session.sessionId).not.toBe(authB.session.sessionId);

      // Verify tenant session counts
      expect(sessionManager.getTenantSessionCount('tenant-a')).toBe(1);
      expect(sessionManager.getTenantSessionCount('tenant-b')).toBe(1);
    });

    it('should allow multiple sessions for same user', async () => {
      // Create first session
      const auth1 = await pipeline.authenticateAndCreateSession({
        sub: 'user-multi',
        tenant_id: 'tenant-a',
      });

      // Create second session (e.g., different device)
      const auth2 = await pipeline.authenticateAndCreateSession({
        sub: 'user-multi',
        tenant_id: 'tenant-a',
      });

      expect(auth1.session.sessionId).not.toBe(auth2.session.sessionId);
      expect(sessionManager.getUserSessionCount('user-multi')).toBe(2);
    });
  });

  // ==========================================
  // TENANT CONTEXT EXTRACTION
  // ==========================================

  describe('Tenant context extraction from OAuth claims', () => {
    it('should extract tenant_id from claims correctly', async () => {
      const authResult = await pipeline.authenticateAndCreateSession({
        sub: 'user-test',
        tenant_id: 'custom-tenant',
        roles: ['viewer'],
      });

      expect(authResult.tenantContext.tenantId).toBe('custom-tenant');
    });

    it('should extract roles and permissions from claims', async () => {
      const authResult = await pipeline.authenticateAndCreateSession({
        sub: 'admin-user',
        tenant_id: 'tenant-a',
        roles: ['admin', 'superuser'],
        permissions: ['read', 'write', 'delete', 'admin'],
      });

      expect(authResult.tenantContext.roles).toEqual(['admin', 'superuser']);
      expect(authResult.tenantContext.permissions).toEqual(['read', 'write', 'delete', 'admin']);
      expect(authResult.session.roles).toEqual(['admin', 'superuser']);
    });

    it('should register user access to tenant on extraction', async () => {
      await pipeline.authenticateAndCreateSession({
        sub: 'new-user',
        tenant_id: 'tenant-a',
      });

      expect(tenantManager.validateTenantAccess('new-user', 'tenant-a')).toBe(true);
      expect(tenantManager.validateTenantAccess('new-user', 'tenant-b')).toBe(false);
    });

    it('should allow user access to multiple tenants', async () => {
      // User accesses tenant A
      await pipeline.authenticateAndCreateSession({
        sub: 'multi-tenant-user',
        tenant_id: 'tenant-a',
      });

      // Same user accesses tenant B
      await pipeline.authenticateAndCreateSession({
        sub: 'multi-tenant-user',
        tenant_id: 'tenant-b',
      });

      expect(tenantManager.validateTenantAccess('multi-tenant-user', 'tenant-a')).toBe(true);
      expect(tenantManager.validateTenantAccess('multi-tenant-user', 'tenant-b')).toBe(true);
      expect(tenantManager.getUserTenants('multi-tenant-user')).toHaveLength(2);
    });
  });

  // ==========================================
  // SESSION INVALIDATION CASCADE
  // ==========================================

  describe('Session invalidation cascades to tenant cleanup', () => {
    it('should invalidate session and revoke token on logout', async () => {
      const authResult = await pipeline.authenticateAndCreateSession({
        sub: 'logout-user',
        tenant_id: 'tenant-a',
      });

      const logoutResult = await pipeline.logout(authResult.accessToken, authResult.session.sessionId);

      expect(logoutResult.success).toBe(true);
      expect(logoutResult.sessionInvalidated).toBe(true);
      expect(logoutResult.tokenRevoked).toBe(true);

      // Verify session is gone
      const session = await sessionManager.getSession(authResult.session.sessionId);
      expect(session).toBeNull();

      // Verify token is revoked
      const tokenValidation = await tokenManager.validateToken(authResult.accessToken);
      expect(tokenValidation.valid).toBe(false);
    });

    it('should cleanup tenant access when last session is invalidated', async () => {
      const authResult = await pipeline.authenticateAndCreateSession({
        sub: 'cleanup-user',
        tenant_id: 'tenant-a',
      });

      // Verify user has tenant access
      expect(tenantManager.validateTenantAccess('cleanup-user', 'tenant-a')).toBe(true);

      // Logout
      const logoutResult = await pipeline.logout(authResult.accessToken, authResult.session.sessionId);

      expect(logoutResult.tenantCleanedUp).toBe(true);
      expect(tenantManager.getUserTenants('cleanup-user')).toHaveLength(0);
    });

    it('should not cleanup tenant access if other sessions remain', async () => {
      // Create two sessions
      const auth1 = await pipeline.authenticateAndCreateSession({
        sub: 'multi-session-user',
        tenant_id: 'tenant-a',
      });

      const auth2 = await pipeline.authenticateAndCreateSession({
        sub: 'multi-session-user',
        tenant_id: 'tenant-a',
      });

      // Logout first session
      await pipeline.logout(auth1.accessToken, auth1.session.sessionId);

      // Verify second session still valid
      const sessionValidation = await sessionManager.validateSession(auth2.session.sessionId);
      expect(sessionValidation.valid).toBe(true);

      // Verify user still has session count
      expect(sessionManager.getUserSessionCount('multi-session-user')).toBe(1);
    });

    it('should invalidate all user sessions on full logout', async () => {
      // Create multiple sessions
      await pipeline.authenticateAndCreateSession({
        sub: 'full-logout-user',
        tenant_id: 'tenant-a',
      });

      await pipeline.authenticateAndCreateSession({
        sub: 'full-logout-user',
        tenant_id: 'tenant-a',
      });

      expect(sessionManager.getUserSessionCount('full-logout-user')).toBe(2);

      // Invalidate all user sessions
      const invalidatedCount = await sessionManager.invalidateUserSessions('full-logout-user');

      expect(invalidatedCount).toBe(2);
      expect(sessionManager.getUserSessionCount('full-logout-user')).toBe(0);
    });
  });

  // ==========================================
  // REQUEST VALIDATION
  // ==========================================

  describe('Request validation with token and session', () => {
    it('should validate request with matching token and session', async () => {
      const authResult = await pipeline.authenticateAndCreateSession({
        sub: 'valid-user',
        tenant_id: 'tenant-a',
      });

      const validation = await pipeline.validateRequest(
        authResult.accessToken,
        authResult.session.sessionId
      );

      expect(validation.valid).toBe(true);
      expect(validation.claims).toBeDefined();
      expect(validation.session).toBeDefined();
    });

    it('should reject request with invalid token', async () => {
      const authResult = await pipeline.authenticateAndCreateSession({
        sub: 'test-user',
        tenant_id: 'tenant-a',
      });

      const validation = await pipeline.validateRequest(
        'invalid-token',
        authResult.session.sessionId
      );

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('Token invalid');
    });

    it('should reject request with invalid session', async () => {
      const authResult = await pipeline.authenticateAndCreateSession({
        sub: 'test-user',
        tenant_id: 'tenant-a',
      });

      const validation = await pipeline.validateRequest(
        authResult.accessToken,
        'invalid-session'
      );

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('Session invalid');
    });

    it('should reject request after session invalidation', async () => {
      const authResult = await pipeline.authenticateAndCreateSession({
        sub: 'test-user',
        tenant_id: 'tenant-a',
      });

      // Invalidate session
      await sessionManager.invalidateSession(authResult.session.sessionId);

      const validation = await pipeline.validateRequest(
        authResult.accessToken,
        authResult.session.sessionId
      );

      expect(validation.valid).toBe(false);
    });
  });
});
