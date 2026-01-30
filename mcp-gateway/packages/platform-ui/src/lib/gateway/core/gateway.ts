/**
 * MCP Security Gateway - Main Gateway Class
 * 
 * @epic 2.5 - MCP Security Gateway
 * @task 2.1 - Gateway Implementation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Zero Trust MCP Gateway implementing the security architecture
 *   from FORGE-MCP-DEEP-DIVE-ANALYSIS.md
 * 
 *   Request Flow:
 *   1. Authentication (OAuth 2.1 + PKCE)
 *   2. Input Sanitization
 *   3. Tool Registry Lookup
 *   4. Tool Integrity Verification
 *   5. CARS Risk Assessment
 *   6. Human Approval Gate (if required)
 *   7. Privacy Tokenization
 *   8. Sandbox Execution
 *   9. Response Detokenization
 *   10. Audit Logging
 */

import {
  MCPGatewayConfig,
  MCPRequest,
  MCPResponse,
  MCPTool,
  MCPError,
  AuditEntry,
  AuditEventType,
  CARSAssessment,
  RiskLevel,
  ApprovalInfo,
  RequestContext,
  SandboxInfo,
} from './types';

import { SecurityLayer } from '../security/index';
import { ApprovalGate } from '../approval/index';
import { SandboxExecutor } from '../sandbox/index';
import { PrivacyTokenizer } from '../privacy/index';
import { AuditLogger, BehaviorMonitor } from '../monitoring/index';

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: MCPGatewayConfig = {
  name: 'forge-mcp-gateway',
  enabled: true,
  
  security: {
    oauth: {
      enabled: true,
      pkceRequired: true,
      scopes: ['mcp:read', 'mcp:write', 'mcp:admin'],
    },
    inputSanitization: {
      enabled: true,
      maxInputSize: 1024 * 1024, // 1MB
      allowedContentTypes: ['application/json'],
      blockPatterns: [
        '<script',
        'javascript:',
        'data:text/html',
        'eval(',
        'Function(',
      ],
    },
    toolIntegrity: {
      enabled: true,
      hashAlgorithm: 'sha256',
      requireSignature: false,
      trustedSigners: [],
    },
    supplyChain: {
      enabled: true,
      allowedRegistries: ['npm', 'local'],
      requireSBOM: false,
      vulnerabilityScan: true,
    },
  },
  
  approval: {
    enabled: true,
    defaultMode: 'risk-based',
    requireApproval: [],
    autoApprove: ['forge_list_contracts', 'forge_list_sessions', 'forge_get_metrics'],
    timeoutMs: 300000, // 5 minutes
    carsIntegration: {
      enabled: true,
      riskThreshold: 0.7,
    },
  },
  
  sandbox: {
    enabled: true,
    runtime: 'deno',
    limits: {
      maxCpuMs: 30000,
      maxMemoryMb: 512,
      maxDiskMb: 100,
      maxNetworkConnections: 10,
      executionTimeoutMs: 300000,
    },
    network: {
      allowEgress: true,
      allowedHosts: ['api.anthropic.com', 'api.openai.com'],
      blockedHosts: [],
    },
    filesystem: {
      readOnly: ['/mcp-servers', '/skills'],
      writable: ['/tmp', '/output'],
      blocked: ['/etc', '/root', '/home'],
    },
  },
  
  privacy: {
    enabled: true,
    patterns: [
      { name: 'email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', replacement: 'EMAIL_TOKEN_', sensitivity: 'medium' },
      { name: 'ssn', pattern: '\\d{3}-\\d{2}-\\d{4}', replacement: 'SSN_TOKEN_', sensitivity: 'critical' },
      { name: 'phone', pattern: '\\+?1?[-.]?\\(?\\d{3}\\)?[-.]?\\d{3}[-.]?\\d{4}', replacement: 'PHONE_TOKEN_', sensitivity: 'medium' },
      { name: 'credit_card', pattern: '\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}', replacement: 'CC_TOKEN_', sensitivity: 'critical' },
      { name: 'api_key', pattern: 'sk-[a-zA-Z0-9]{32,}', replacement: 'APIKEY_TOKEN_', sensitivity: 'critical' },
    ],
    tokenFormat: '{{TYPE}}_{{ID}}',
    tokenTtlMs: 3600000, // 1 hour
    alwaysTokenize: ['password', 'secret', 'apiKey', 'token'],
    neverTokenize: ['id', 'name', 'type'],
  },
  
  monitoring: {
    enabled: true,
    audit: {
      enabled: true,
      logLevel: 'info',
      includePayloads: false,
      retentionDays: 90,
    },
    anomalyDetection: {
      enabled: true,
      baseline: 100,
      alertThreshold: 3,
    },
    toolBehavior: {
      enabled: true,
      trackDescriptionChanges: true,
      alertOnChange: true,
    },
    metrics: {
      enabled: true,
      exportInterval: 60000,
    },
  },
  
  toolRegistry: {
    allowlistEnabled: true,
    allowedTools: [],
    blockedTools: [],
    discoveryMode: 'progressive',
    sources: [
      { name: 'local', type: 'local', location: '/mcp-servers', trusted: true },
    ],
  },
  
  rateLimiting: {
    enabled: true,
    requestsPerWindow: 100,
    windowMs: 60000,
    perToolLimits: {},
    perTenantLimits: {},
  },
  
  tenantIsolation: {
    enabled: true,
    mode: 'namespace',
    tenantIdHeader: 'X-Tenant-ID',
    crossTenantRules: [],
  },
};

// ============================================
// MCP GATEWAY CLASS
// ============================================

export class MCPGateway {
  private config: MCPGatewayConfig;
  private securityLayer: SecurityLayer;
  private approvalGate: ApprovalGate;
  private sandbox: SandboxExecutor;
  private privacyTokenizer: PrivacyTokenizer;
  private auditLogger: AuditLogger;
  private behaviorMonitor: BehaviorMonitor;
  private toolRegistry = new Map<string, MCPTool>();
  private toolHandlers = new Map<string, ToolHandler>();
  private rateLimitBuckets = new Map<string, RateLimitBucket>();

  constructor(config?: Partial<MCPGatewayConfig>) {
    this.config = this.mergeConfig(config);
    
    // Initialize security components
    this.securityLayer = new SecurityLayer(this.config.security);
    this.approvalGate = new ApprovalGate(this.config.approval);
    this.sandbox = new SandboxExecutor(this.config.sandbox);
    this.privacyTokenizer = new PrivacyTokenizer(this.config.privacy);
    this.auditLogger = new AuditLogger(this.config.monitoring.audit);
    this.behaviorMonitor = new BehaviorMonitor(this.config.monitoring.toolBehavior);
    
    this.log('info', 'MCPGateway initialized', {
      securityEnabled: this.config.security.oauth.enabled,
      approvalEnabled: this.config.approval.enabled,
      sandboxEnabled: this.config.sandbox.enabled,
      privacyEnabled: this.config.privacy.enabled,
    });
  }

  private mergeConfig(config?: Partial<MCPGatewayConfig>): MCPGatewayConfig {
    if (!config) return DEFAULT_CONFIG;

    // Deep merge security config to preserve nested properties
    const security = {
      oauth: { ...DEFAULT_CONFIG.security.oauth, ...config.security?.oauth },
      inputSanitization: { ...DEFAULT_CONFIG.security.inputSanitization, ...config.security?.inputSanitization },
      toolIntegrity: { ...DEFAULT_CONFIG.security.toolIntegrity, ...config.security?.toolIntegrity },
      supplyChain: { ...DEFAULT_CONFIG.security.supplyChain, ...config.security?.supplyChain },
    };

    return {
      ...DEFAULT_CONFIG,
      ...config,
      security,
      approval: { ...DEFAULT_CONFIG.approval, ...config.approval },
      sandbox: { ...DEFAULT_CONFIG.sandbox, ...config.sandbox },
      privacy: { ...DEFAULT_CONFIG.privacy, ...config.privacy },
      monitoring: { ...DEFAULT_CONFIG.monitoring, ...config.monitoring },
      toolRegistry: { ...DEFAULT_CONFIG.toolRegistry, ...config.toolRegistry },
      rateLimiting: { ...DEFAULT_CONFIG.rateLimiting, ...config.rateLimiting },
      tenantIsolation: { ...DEFAULT_CONFIG.tenantIsolation, ...config.tenantIsolation },
    };
  }

  // ==========================================
  // TOOL REGISTRATION
  // ==========================================

  /**
   * Register a tool with the gateway
   */
  registerTool(tool: MCPTool, handler: ToolHandler): void {
    // Verify tool integrity
    if (this.config.security.toolIntegrity.enabled) {
      const integrityValid = this.securityLayer.verifyToolIntegrity(tool);
      if (!integrityValid) {
        throw new Error(`Tool integrity verification failed: ${tool.name}`);
      }
    }
    
    // Check allowlist
    if (this.config.toolRegistry.allowlistEnabled) {
      if (this.config.toolRegistry.blockedTools.includes(tool.name)) {
        throw new Error(`Tool is blocked: ${tool.name}`);
      }
    }
    
    // Compute and store integrity hash
    tool.integrityHash = this.securityLayer.computeToolHash(tool);
    
    this.toolRegistry.set(tool.name, tool);
    this.toolHandlers.set(tool.name, handler);
    
    // Monitor for behavior changes
    this.behaviorMonitor.registerTool(tool);
    
    this.auditLog('tool:registered', tool.name, 'system', {
      version: tool.version,
      riskLevel: tool.metadata.riskLevel,
      permissions: tool.metadata.permissions,
    });
    
    this.log('info', `Tool registered: ${tool.name}`, {
      version: tool.version,
      riskLevel: tool.metadata.riskLevel,
    });
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): void {
    this.toolRegistry.delete(name);
    this.toolHandlers.delete(name);
    this.behaviorMonitor.unregisterTool(name);
    
    this.auditLog('tool:removed', name, 'system', {});
  }

  /**
   * Get registered tools
   */
  getTools(): MCPTool[] {
    return Array.from(this.toolRegistry.values());
  }

  // ==========================================
  // REQUEST PROCESSING (ZERO TRUST FLOW)
  // ==========================================

  /**
   * Process an MCP request through the Zero Trust pipeline
   */
  async processRequest(request: MCPRequest): Promise<MCPResponse> {
    const startTime = Date.now();
    
    try {
      // ========================================
      // STEP 1: Authentication
      // ========================================
      if (this.config.security.oauth.enabled) {
        const authResult = await this.securityLayer.authenticate(request.context);
        if (!authResult.valid) {
          return this.errorResponse(request.id, 'AUTH_FAILED', authResult.error || 'Authentication failed', false);
        }
      }

      // ========================================
      // STEPS 2-4: PARALLEL EXECUTION ✅ PHASE 2 OPTIMIZATION
      // Eliminating Waterfalls skill: Independent operations run in parallel
      // ========================================

      // Execute rate limit check, input sanitization, and tool lookup in parallel
      const [rateLimitResult, sanitizeResult, tool] = await Promise.all([
        // STEP 2: Rate Limiting
        this.config.rateLimiting.enabled
          ? Promise.resolve(this.checkRateLimit(request))
          : Promise.resolve({ allowed: true, limit: 0, current: 0 }),

        // STEP 3: Input Sanitization
        this.config.security.inputSanitization.enabled
          ? Promise.resolve(this.securityLayer.sanitizeInput(request.params))
          : Promise.resolve({ safe: true, sanitized: request.params, blockedPatterns: [] }),

        // STEP 4: Tool Lookup (integrity check done after)
        Promise.resolve(this.toolRegistry.get(request.tool)),
      ]);

      // Check rate limit result
      if (this.config.rateLimiting.enabled && !rateLimitResult.allowed) {
        this.auditLog('rate:limited', request.tool, request.context.tenantId, {
          limit: rateLimitResult.limit,
          current: rateLimitResult.current,
        });
        return this.errorResponse(request.id, 'RATE_LIMITED', 'Rate limit exceeded', true);
      }

      // Check sanitization result
      if (this.config.security.inputSanitization.enabled && !sanitizeResult.safe) {
        this.auditLog('security:violation', request.tool, request.context.tenantId, {
          violation: 'input_sanitization',
          patterns: sanitizeResult.blockedPatterns,
        });
        return this.errorResponse(request.id, 'INPUT_BLOCKED', 'Input contains blocked content', false);
      }

      // Apply sanitized params
      if (this.config.security.inputSanitization.enabled) {
        request.params = sanitizeResult.sanitized;
      }

      // Check tool exists
      if (!tool) {
        this.auditLog('tool:failed', request.tool, request.context.tenantId, {
          requestId: request.id,
          timestamp: request.timestamp,
          reason: 'tool_not_found',
        });
        return this.errorResponse(request.id, 'TOOL_NOT_FOUND', `Unknown tool: ${request.tool}`, false);
      }

      // Verify tool integrity (sequential - needs tool object)
      if (this.config.security.toolIntegrity.enabled) {
        const currentHash = this.securityLayer.computeToolHash(tool);
        if (currentHash !== tool.integrityHash) {
          this.auditLog('tool:description_changed', tool.name, request.context.tenantId, {
            originalHash: tool.integrityHash,
            currentHash,
          });

          if (this.config.monitoring.toolBehavior.alertOnChange) {
            return this.errorResponse(request.id, 'TOOL_MODIFIED', 'Tool has been modified since registration', false);
          }
        }
      }

      // ========================================
      // STEP 5: CARS Risk Assessment
      // ========================================
      let carsAssessment: CARSAssessment | null = null;
      if (this.config.approval.carsIntegration.enabled) {
        carsAssessment = this.assessRisk(tool, request);
        
        if (carsAssessment.recommendation === 'block') {
          this.auditLog('security:violation', tool.name, request.context.tenantId, {
            violation: 'cars_blocked',
            riskLevel: carsAssessment.riskLevel,
            score: carsAssessment.score,
          });
          return this.errorResponse(request.id, 'RISK_BLOCKED', 'Request blocked due to risk assessment', false);
        }
      }

      // ========================================
      // STEP 6: Human Approval Gate
      // ========================================
      let approvalInfo: ApprovalInfo = { required: false, status: 'approved' };
      
      if (this.config.approval.enabled) {
        const requiresApproval = this.requiresApproval(tool, carsAssessment);
        
        if (requiresApproval) {
          this.auditLog('approval:requested', tool.name, request.context.tenantId, {
            riskLevel: carsAssessment?.riskLevel,
          });
          
          approvalInfo = await this.approvalGate.requestApproval({
            requestId: request.id,
            tool: tool.name,
            params: request.params,
            context: request.context,
            riskAssessment: carsAssessment ?? undefined,
          });
          
          if (approvalInfo.status === 'denied') {
            this.auditLog('approval:denied', tool.name, request.context.tenantId, {
              reason: approvalInfo.reason,
            });
            return this.errorResponse(request.id, 'APPROVAL_DENIED', approvalInfo.reason || 'Request denied', false);
          }
          
          if (approvalInfo.status === 'timeout') {
            this.auditLog('approval:timeout', tool.name, request.context.tenantId, {});
            return this.errorResponse(request.id, 'APPROVAL_TIMEOUT', 'Approval request timed out', true);
          }
          
          this.auditLog('approval:granted', tool.name, request.context.tenantId, {
            approvedBy: approvalInfo.approvedBy,
          });
        }
      }

      // ========================================
      // STEP 7: Privacy Tokenization
      // ========================================
      let privacyInfo = { tokenized: false, fieldsTokenized: [] as string[], piiDetected: [] as string[] };
      
      if (this.config.privacy.enabled) {
        const tokenizeResult = this.privacyTokenizer.tokenize(request.params);
        request.params = tokenizeResult.data as Record<string, unknown>;
        privacyInfo = {
          tokenized: tokenizeResult.tokenized,
          fieldsTokenized: tokenizeResult.fieldsTokenized,
          piiDetected: tokenizeResult.piiDetected,
        };
        
        if (tokenizeResult.tokenized) {
          this.auditLog('privacy:tokenized', tool.name, request.context.tenantId, {
            fieldsTokenized: tokenizeResult.fieldsTokenized,
          });
        }
      }

      // ========================================
      // STEP 8: Sandbox Execution
      // ========================================
      this.auditLog('tool:invoked', tool.name, request.context.tenantId, {
        params: this.config.monitoring.audit.includePayloads ? request.params : '[redacted]',
      });

      let result: unknown;
      let sandboxInfo: SandboxInfo = { used: false };
      
      if (this.config.sandbox.enabled && tool.metadata.riskLevel !== 'minimal') {
        const sandboxResult = await this.sandbox.execute({
          tool: tool.name,
          handler: this.toolHandlers.get(tool.name)!,
          params: request.params,
          context: request.context,
          limits: this.config.sandbox.limits,
        });
        
        result = sandboxResult.result;
        sandboxInfo = {
          used: true,
          runtime: this.config.sandbox.runtime,
          resourceUsage: sandboxResult.resourceUsage,
        };
        
        if (sandboxResult.timedOut) {
          this.auditLog('sandbox:timeout', tool.name, request.context.tenantId, {
            executionTimeMs: sandboxResult.executionTimeMs,
          });
          return this.errorResponse(request.id, 'SANDBOX_TIMEOUT', 'Execution timed out', true);
        }
        
        this.auditLog('sandbox:executed', tool.name, request.context.tenantId, {
          executionTimeMs: sandboxResult.executionTimeMs,
          resourceUsage: sandboxResult.resourceUsage,
        });
      } else {
        // Direct execution (minimal risk tools only)
        const handler = this.toolHandlers.get(tool.name);
        if (!handler) {
          return this.errorResponse(request.id, 'HANDLER_NOT_FOUND', 'Tool handler not found', false);
        }
        result = await handler(request.params, request.context);
      }

      // ========================================
      // STEPS 9-10: PARALLEL EXECUTION ✅ PHASE 2 OPTIMIZATION
      // Eliminating Waterfalls skill: Detokenize and audit in parallel
      // ========================================
      const durationMs = Date.now() - startTime;

      // Execute detokenization and audit logging in parallel (fire-and-forget)
      const [detokenizedResult] = await Promise.all([
        // STEP 9: Response Detokenization
        this.config.privacy.enabled && privacyInfo.tokenized
          ? Promise.resolve(this.privacyTokenizer.detokenize(result)).then((res) => {
              this.auditLog('privacy:detokenized', tool.name, request.context.tenantId, {});
              return res;
            })
          : Promise.resolve(result),

        // STEP 10: Audit Logging (fire-and-forget, runs in parallel)
        Promise.resolve(
          this.auditLog('tool:completed', tool.name, request.context.tenantId, {
            durationMs,
            success: true,
          })
        ),
      ]);

      return {
        requestId: request.id,
        success: true,
        data: detokenizedResult,
        metadata: {
          durationMs,
          approval: approvalInfo,
          sandbox: sandboxInfo,
          privacy: privacyInfo,
        },
      };

    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      
      this.auditLog('tool:failed', request.tool, request.context.tenantId, {
        error: error.message,
        durationMs,
      });

      return this.errorResponse(
        request.id,
        'EXECUTION_ERROR',
        error.message,
        false,
        durationMs
      );
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private requiresApproval(tool: MCPTool, carsAssessment: CARSAssessment | null): boolean {
    // Auto-approve list
    if (this.config.approval.autoApprove.includes(tool.name)) {
      return false;
    }
    
    // Explicit require list
    if (this.config.approval.requireApproval.includes(tool.name)) {
      return true;
    }
    
    // Risk-based approval
    if (this.config.approval.defaultMode === 'risk-based' && carsAssessment) {
      return carsAssessment.recommendation === 'approve' || 
             carsAssessment.recommendation === 'escalate';
    }
    
    // Default modes
    switch (this.config.approval.defaultMode) {
      case 'always':
        return true;
      case 'never':
        return false;
      case 'first-use':
        // Would check approval history
        return !this.approvalGate.hasBeenApproved(tool.name);
      default:
        return false;
    }
  }

  private assessRisk(tool: MCPTool, request: MCPRequest): CARSAssessment {
    const riskLevel = tool.metadata.riskLevel;
    const permissions = tool.metadata.permissions;
    
    // Calculate risk score
    let score = 0;
    
    // Base risk from tool level
    const riskScores: Record<RiskLevel, number> = {
      minimal: 0.1,
      low: 0.3,
      medium: 0.5,
      high: 0.7,
      critical: 0.9,
    };
    score = riskScores[riskLevel] || 0.5;
    
    // Adjust for permissions
    const highRiskPermissions = ['filesystem:write', 'database:write', 'secrets:read', 'external:api'];
    const permissionRisk = permissions.filter((p: string) => highRiskPermissions.includes(p)).length * 0.1;
    score = Math.min(1, score + permissionRisk);
    
    // Determine recommendation
    let recommendation: CARSAssessment['recommendation'];
    const threshold = this.config.approval.carsIntegration.riskThreshold;
    
    if (score >= 0.9) {
      recommendation = 'block';
    } else if (score >= threshold) {
      recommendation = 'escalate';
    } else if (score >= 0.5) {
      recommendation = 'approve';
    } else {
      recommendation = 'proceed';
    }
    
    return {
      tool: tool.name,
      riskLevel,
      autonomyLevel: score >= 0.7 ? 'assisted' : score >= 0.5 ? 'supervised' : 'full',
      safeguards: this.determineSafeguards(tool, score),
      score,
      recommendation,
    };
  }

  private determineSafeguards(tool: MCPTool, riskScore: number): CARSAssessment['safeguards'] {
    const safeguards = [];
    
    if (riskScore >= 0.3) {
      safeguards.push({
        type: 'audit_logging',
        description: 'Full audit trail of tool invocations',
        required: true,
        implemented: this.config.monitoring.audit.enabled,
      });
    }
    
    if (riskScore >= 0.5) {
      safeguards.push({
        type: 'sandbox_execution',
        description: 'Isolated execution environment',
        required: true,
        implemented: this.config.sandbox.enabled,
      });
    }
    
    if (riskScore >= 0.7) {
      safeguards.push({
        type: 'human_approval',
        description: 'Human-in-the-loop approval required',
        required: true,
        implemented: this.config.approval.enabled,
      });
    }
    
    if (tool.metadata.permissions.includes('secrets:read')) {
      safeguards.push({
        type: 'privacy_tokenization',
        description: 'PII and secrets tokenization',
        required: true,
        implemented: this.config.privacy.enabled,
      });
    }
    
    return safeguards;
  }

  private checkRateLimit(request: MCPRequest): { allowed: boolean; limit: number; current: number } {
    const key = `${request.context.tenantId}:${request.tool}`;
    const now = Date.now();
    
    let bucket = this.rateLimitBuckets.get(key);
    if (!bucket || now - bucket.windowStart > this.config.rateLimiting.windowMs) {
      bucket = { windowStart: now, count: 0 };
      this.rateLimitBuckets.set(key, bucket);
    }
    
    const limit = this.config.rateLimiting.perToolLimits[request.tool] ||
                  this.config.rateLimiting.perTenantLimits[request.context.tenantId] ||
                  this.config.rateLimiting.requestsPerWindow;
    
    bucket.count++;
    
    return {
      allowed: bucket.count <= limit,
      limit,
      current: bucket.count,
    };
  }

  private errorResponse(
    requestId: string,
    code: string,
    message: string,
    retryable: boolean,
    durationMs?: number
  ): MCPResponse {
    return {
      requestId,
      success: false,
      error: { code, message, retryable },
      metadata: {
        durationMs: durationMs || 0,
      },
    };
  }

  private auditLog(
    eventType: AuditEventType,
    tool: string,
    tenantId: string,
    details: Record<string, unknown>
  ): void {
    if (!this.config.monitoring.audit.enabled) return;
    
    this.auditLogger.log({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      eventType,
      tool,
      tenantId,
      requestId: details.requestId as string || '',
      details,
      riskLevel: 'medium', // Would be determined by context
      outcome: this.eventTypeToOutcome(eventType),
    });
  }

  private eventTypeToOutcome(eventType: AuditEventType): AuditEntry['outcome'] {
    if (eventType.includes('completed')) return 'success';
    if (eventType.includes('failed') || eventType.includes('denied') || eventType.includes('blocked')) return 'failure';
    if (eventType.includes('timeout') || eventType.includes('limited') || eventType.includes('violation')) return 'blocked';
    return 'pending';
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    const logFn = console[level] || console.log;
    logFn(`[MCPGateway] ${message}`, data ? JSON.stringify(data) : '');
  }
}

// ============================================
// TYPES
// ============================================

export type ToolHandler = (
  params: Record<string, unknown>,
  context: RequestContext
) => Promise<unknown>;

interface RateLimitBucket {
  windowStart: number;
  count: number;
}

// ============================================
// EXPORTS
// ============================================

export default MCPGateway;
