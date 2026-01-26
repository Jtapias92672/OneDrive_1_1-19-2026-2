/**
 * MCP Gateway - Code Execution Module
 *
 * @epic 3.75 - Code Execution
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Secure code execution infrastructure including:
 *   - VM/Deno sandbox execution
 *   - Virtual filesystem isolation
 *   - Privacy filtering (PII/secrets)
 *   - Execution audit logging
 *   - CARS risk assessment integration
 *   - MCP code-first pattern (98% token reduction)
 *
 *   Aligned with Success Criteria:
 *   - 05_CONVERGENCE_ENGINE (budget enforcement, timeout)
 *   - 06_EVIDENCE_PACK (audit logging schema)
 *   - 09_DATA_PROTECTION (PII/secret patterns, classification)
 *   - 12_HUMAN_REVIEW (approval gates for high-risk)
 */

// ============================================
// TYPES
// ============================================

export * from './types.js';

// ============================================
// SANDBOX IMPLEMENTATIONS
// ============================================

export { VMSandbox, createVMSandbox } from './vm-sandbox.js';

// ============================================
// VIRTUAL FILESYSTEM
// ============================================

export {
  VirtualFileSystem,
  VirtualFSError,
  type VirtualFSOptions,
  type VirtualFSUsage,
} from './virtual-fs.js';

// ============================================
// PRIVACY FILTER
// ============================================

export {
  PrivacyFilter,
  privacyFilter,
  PII_PATTERNS,
  SECRET_PATTERNS,
} from './privacy-filter.js';

// ============================================
// AUDIT LOGGER
// ============================================

export {
  ExecutionAuditLogger,
  executionAuditLogger,
  type AuditLoggerOptions,
  type ExecutionAuditSummary,
  type AuditLoggerStats,
} from './audit-logger.js';

// ============================================
// MCP CODE-FIRST PATTERN
// ============================================

export {
  MCPCodeFirstManager,
  mcpCodeFirstManager,
  type ToolListEntry,
  type PreContextFilterOptions,
  type FilteredData,
  type SingleStepResult,
  type PooledConnection,
  type MCPCodeFirstStats,
  type TokenSavingsInput,
  type TokenSavingsResult,
} from './mcp-code-first.js';

// ============================================
// SAFE EXECUTION (CARS INTEGRATION)
// ============================================

export {
  safeExecute,
  CodeRiskAssessor,
  ApprovalManager,
  riskAssessor,
  approvalManager,
  RISK_PATTERNS,
} from './safe-execute.js';

// ============================================
// CONVENIENCE TYPES
// ============================================

import { VMSandbox } from './vm-sandbox.js';
import { VirtualFileSystem } from './virtual-fs.js';
import { PrivacyFilter } from './privacy-filter.js';
import { ExecutionAuditLogger } from './audit-logger.js';
import { MCPCodeFirstManager } from './mcp-code-first.js';
import { CodeRiskAssessor, ApprovalManager } from './safe-execute.js';

/**
 * Unified execution system configuration
 */
export interface ExecutionSystemConfig {
  /** Sandbox timeout in ms */
  sandboxTimeout?: number;

  /** Maximum memory for sandbox in MB */
  sandboxMaxMemory?: number;

  /** Virtual filesystem options */
  virtualFS?: {
    maxFiles?: number;
    maxFileSize?: number;
    maxTotalSize?: number;
  };

  /** Privacy filter options */
  privacyFilter?: {
    additionalRules?: Array<{
      pattern: RegExp;
      replacement: string;
      category: string;
      type: 'pii' | 'secret';
    }>;
  };

  /** Audit logger options */
  auditLogger?: {
    maxEvents?: number;
    sanitizeOutput?: boolean;
  };

  /** MCP code-first options */
  codeFirst?: {
    discoveryMode?: 'upfront' | 'on-demand';
    enablePreContextFiltering?: boolean;
    enableConnectionPooling?: boolean;
  };

  /** CARS integration options */
  cars?: {
    approvalThreshold?: number;
    blockThreshold?: number;
    approvalTimeoutMs?: number;
  };
}

/**
 * Unified execution system
 */
export class ExecutionSystem {
  public readonly sandbox: VMSandbox;
  public readonly virtualFS: VirtualFileSystem;
  public readonly privacyFilter: PrivacyFilter;
  public readonly auditLogger: ExecutionAuditLogger;
  public readonly codeFirst: MCPCodeFirstManager;
  public readonly riskAssessor: CodeRiskAssessor;
  public readonly approvalManager: ApprovalManager;

  constructor(config: ExecutionSystemConfig = {}) {
    this.sandbox = new VMSandbox();
    this.virtualFS = new VirtualFileSystem(config.virtualFS);
    this.privacyFilter = new PrivacyFilter(config.privacyFilter?.additionalRules);
    this.auditLogger = new ExecutionAuditLogger(config.auditLogger);
    this.codeFirst = new MCPCodeFirstManager(config.codeFirst);
    this.riskAssessor = new CodeRiskAssessor(config.cars);
    this.approvalManager = new ApprovalManager(config.cars);
  }

  /**
   * Safely execute code through the full pipeline
   */
  async execute(
    code: string,
    sessionId: string,
    options?: import('./types.js').ExecutionOptions
  ): Promise<import('./types.js').SafeExecutionResult> {
    const { safeExecute } = await import('./safe-execute.js');
    return safeExecute(code, sessionId, options);
  }

  /**
   * Get system statistics
   */
  getStats(): ExecutionSystemStats {
    return {
      audit: this.auditLogger.getStats(),
      codeFirst: this.codeFirst.getStats(),
      virtualFS: this.virtualFS.getUsage(),
      privacyFilter: this.privacyFilter.getRuleStats(),
    };
  }

  /**
   * Clear all caches and logs
   */
  clear(): void {
    this.auditLogger.clear();
    this.codeFirst.clearSchemaCache();
    this.virtualFS.clear();
  }

  /**
   * Shutdown system
   */
  async shutdown(): Promise<void> {
    await this.sandbox.dispose();
    await this.codeFirst.closeAllConnections();
  }
}

export interface ExecutionSystemStats {
  audit: import('./audit-logger.js').AuditLoggerStats;
  codeFirst: import('./mcp-code-first.js').MCPCodeFirstStats;
  virtualFS: import('./virtual-fs.js').VirtualFSUsage;
  privacyFilter: { pii: number; secret: number; total: number };
}

// ============================================
// DEFAULT EXPORT
// ============================================

export { ExecutionSystem as default };
