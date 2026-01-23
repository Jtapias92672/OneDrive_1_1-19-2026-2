/**
 * MCP Security Gateway - Per-Tool Sanitization Policies
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.11 - Per-Tool Sanitization Policies
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Tool-specific sanitization rules and configurations.
 *   Allows fine-grained control over input validation per tool.
 */

import { InjectionType } from './patterns.js';

// ============================================
// TYPES
// ============================================

/**
 * Parameter sanitization configuration
 */
export interface ParameterPolicy {
  /** Sanitization context type */
  context: 'sql' | 'command' | 'prompt' | 'path' | 'html' | 'json' | 'text';

  /** Enable strict mode for this parameter */
  strict?: boolean;

  /** Allow list for this parameter */
  allowList?: string[];

  /** Block list for this parameter */
  blockList?: string[];

  /** Maximum length */
  maxLength?: number;

  /** Regex pattern the value must match */
  pattern?: RegExp;

  /** Required injection types to check */
  checkTypes?: InjectionType[];

  /** Skip sanitization for this parameter */
  skip?: boolean;
}

/**
 * Tool sanitization policy
 */
export interface ToolSanitizationPolicy {
  /** Tool name */
  toolName: string;

  /** Tool description for documentation */
  description?: string;

  /** Per-parameter policies */
  parameters: Record<string, ParameterPolicy>;

  /** Require human approval for this tool */
  requiresApproval?: boolean;

  /** Risk level of this tool */
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';

  /** Enable strict mode for all parameters */
  strictMode?: boolean;

  /** Global allow list for this tool */
  allowList?: string[];

  /** Global block list for this tool */
  blockList?: string[];

  /** Skip sanitization entirely for this tool */
  skipSanitization?: boolean;
}

/**
 * Policy evaluation result
 */
export interface PolicyEvaluationResult {
  /** Whether parameters pass policy */
  allowed: boolean;

  /** Violations found */
  violations: PolicyViolation[];

  /** Warnings (non-blocking) */
  warnings: string[];

  /** Effective policy used */
  policy: ToolSanitizationPolicy;
}

/**
 * Policy violation
 */
export interface PolicyViolation {
  /** Parameter that violated policy */
  parameter: string;

  /** Violation type */
  type: 'maxLength' | 'pattern' | 'blockList' | 'required' | 'type';

  /** Description of violation */
  description: string;

  /** Severity */
  severity: 'error' | 'warning';
}

// ============================================
// DEFAULT TOOL POLICIES
// ============================================

/**
 * Pre-configured tool policies
 */
export const TOOL_POLICIES: Record<string, ToolSanitizationPolicy> = {
  // ==========================================
  // DATABASE TOOLS
  // ==========================================

  'database_query': {
    toolName: 'database_query',
    description: 'Execute database queries',
    riskLevel: 'high',
    requiresApproval: true,
    strictMode: true,
    parameters: {
      query: {
        context: 'sql',
        strict: true,
        maxLength: 10000,
        checkTypes: ['sql'],
      },
      table: {
        context: 'sql',
        strict: true,
        allowList: ['users', 'products', 'orders', 'sessions', 'logs'],
        pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      },
      database: {
        context: 'text',
        pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
        maxLength: 64,
      },
    },
  },

  'database_insert': {
    toolName: 'database_insert',
    description: 'Insert data into database',
    riskLevel: 'high',
    requiresApproval: true,
    parameters: {
      table: {
        context: 'sql',
        strict: true,
        pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      },
      data: {
        context: 'json',
        strict: true,
        checkTypes: ['sql'],
      },
    },
  },

  // ==========================================
  // SHELL TOOLS
  // ==========================================

  'shell_exec': {
    toolName: 'shell_exec',
    description: 'Execute shell commands',
    riskLevel: 'critical',
    requiresApproval: true,
    strictMode: true,
    parameters: {
      command: {
        context: 'command',
        strict: true,
        checkTypes: ['command'],
        blockList: ['rm -rf', 'dd if=', 'mkfs', 'chmod 777', '> /dev/'],
      },
      args: {
        context: 'command',
        strict: true,
        checkTypes: ['command'],
      },
      cwd: {
        context: 'path',
        strict: true,
        checkTypes: ['path_traversal'],
        pattern: /^[a-zA-Z0-9_\-./]+$/,
      },
    },
  },

  // ==========================================
  // FILE TOOLS
  // ==========================================

  'filesystem_read': {
    toolName: 'filesystem_read',
    description: 'Read file contents',
    riskLevel: 'medium',
    parameters: {
      path: {
        context: 'path',
        strict: true,
        checkTypes: ['path_traversal'],
        blockList: ['/etc/passwd', '/etc/shadow', '.ssh/', '.env'],
      },
    },
  },

  'filesystem_write': {
    toolName: 'filesystem_write',
    description: 'Write file contents',
    riskLevel: 'high',
    requiresApproval: true,
    parameters: {
      path: {
        context: 'path',
        strict: true,
        checkTypes: ['path_traversal'],
        blockList: ['/etc/', '/var/', '/usr/', '/root/', '/bin/', '/sbin/'],
      },
      content: {
        context: 'text',
        maxLength: 10_000_000, // 10MB
      },
    },
  },

  'filesystem_delete': {
    toolName: 'filesystem_delete',
    description: 'Delete files or directories',
    riskLevel: 'critical',
    requiresApproval: true,
    strictMode: true,
    parameters: {
      path: {
        context: 'path',
        strict: true,
        checkTypes: ['path_traversal'],
        blockList: ['/', '/home', '/etc', '/var', '/usr'],
        pattern: /^[a-zA-Z0-9_\-./]+$/,
      },
    },
  },

  // ==========================================
  // LLM TOOLS
  // ==========================================

  'llm_invoke': {
    toolName: 'llm_invoke',
    description: 'Invoke LLM with prompt',
    riskLevel: 'medium',
    parameters: {
      prompt: {
        context: 'prompt',
        strict: true,
        checkTypes: ['prompt'],
        maxLength: 100000,
      },
      systemPrompt: {
        context: 'prompt',
        strict: true,
        checkTypes: ['prompt'],
      },
    },
  },

  'llm_complete': {
    toolName: 'llm_complete',
    description: 'LLM text completion',
    riskLevel: 'medium',
    parameters: {
      text: {
        context: 'prompt',
        checkTypes: ['prompt'],
      },
    },
  },

  // ==========================================
  // NETWORK TOOLS
  // ==========================================

  'http_request': {
    toolName: 'http_request',
    description: 'Make HTTP request',
    riskLevel: 'medium',
    parameters: {
      url: {
        context: 'text',
        pattern: /^https?:\/\//,
        blockList: ['localhost', '127.0.0.1', '0.0.0.0', '169.254.', '10.', '192.168.'],
      },
      body: {
        context: 'json',
        checkTypes: ['xss'],
      },
      headers: {
        context: 'json',
        checkTypes: ['command'], // Header injection
      },
    },
  },

  // ==========================================
  // FORGE TOOLS
  // ==========================================

  'forge_converge': {
    toolName: 'forge_converge',
    description: 'Run FORGE convergence session',
    riskLevel: 'medium',
    parameters: {
      input: {
        context: 'json',
      },
      config: {
        context: 'json',
      },
    },
  },

  'forge_generate': {
    toolName: 'forge_generate',
    description: 'Generate code with FORGE',
    riskLevel: 'medium',
    parameters: {
      spec: {
        context: 'json',
        checkTypes: ['prompt'],
      },
      template: {
        context: 'text',
        checkTypes: ['prompt', 'xss'],
      },
    },
  },
};

// ============================================
// POLICY ENGINE
// ============================================

/**
 * Policy Engine
 *
 * Evaluates tool parameters against defined policies.
 */
export class PolicyEngine {
  private policies: Map<string, ToolSanitizationPolicy> = new Map();
  private defaultPolicy: ToolSanitizationPolicy;

  constructor() {
    // Load default policies
    for (const [name, policy] of Object.entries(TOOL_POLICIES)) {
      this.policies.set(name, policy);
    }

    // Default policy for unknown tools
    this.defaultPolicy = {
      toolName: '_default',
      description: 'Default policy for unknown tools',
      riskLevel: 'high',
      strictMode: true,
      parameters: {},
    };
  }

  /**
   * Get policy for a tool
   */
  getPolicy(toolName: string): ToolSanitizationPolicy {
    return this.policies.get(toolName) ?? this.defaultPolicy;
  }

  /**
   * Register a new policy
   */
  registerPolicy(policy: ToolSanitizationPolicy): void {
    this.policies.set(policy.toolName, policy);
  }

  /**
   * Update an existing policy
   */
  updatePolicy(
    toolName: string,
    updates: Partial<ToolSanitizationPolicy>
  ): boolean {
    const existing = this.policies.get(toolName);
    if (!existing) return false;

    this.policies.set(toolName, { ...existing, ...updates });
    return true;
  }

  /**
   * Evaluate parameters against policy
   */
  evaluatePolicy(
    toolName: string,
    params: Record<string, unknown>
  ): PolicyEvaluationResult {
    const policy = this.getPolicy(toolName);
    const violations: PolicyViolation[] = [];
    const warnings: string[] = [];

    // Check if tool should be skipped
    if (policy.skipSanitization) {
      return { allowed: true, violations: [], warnings: [], policy };
    }

    // Evaluate each parameter
    for (const [paramName, value] of Object.entries(params)) {
      const paramPolicy = policy.parameters[paramName];

      if (!paramPolicy) {
        // Unknown parameter - warn but allow in non-strict mode
        if (policy.strictMode) {
          violations.push({
            parameter: paramName,
            type: 'required',
            description: `Unknown parameter '${paramName}' in strict mode`,
            severity: 'error',
          });
        } else {
          warnings.push(`Unknown parameter: ${paramName}`);
        }
        continue;
      }

      // Check if parameter should be skipped
      if (paramPolicy.skip) continue;

      // Validate parameter
      const paramViolations = this.validateParameter(
        paramName,
        value,
        paramPolicy,
        policy
      );
      violations.push(...paramViolations);
    }

    return {
      allowed: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      warnings,
      policy,
    };
  }

  /**
   * Validate a single parameter
   */
  private validateParameter(
    paramName: string,
    value: unknown,
    paramPolicy: ParameterPolicy,
    toolPolicy: ToolSanitizationPolicy
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Check max length
    if (paramPolicy.maxLength && stringValue.length > paramPolicy.maxLength) {
      violations.push({
        parameter: paramName,
        type: 'maxLength',
        description: `Value exceeds max length of ${paramPolicy.maxLength}`,
        severity: 'error',
      });
    }

    // Check pattern
    if (paramPolicy.pattern && typeof value === 'string') {
      if (!paramPolicy.pattern.test(value)) {
        violations.push({
          parameter: paramName,
          type: 'pattern',
          description: `Value does not match required pattern`,
          severity: 'error',
        });
      }
    }

    // Check block list
    const blockList = [
      ...(paramPolicy.blockList ?? []),
      ...(toolPolicy.blockList ?? []),
    ];

    for (const blocked of blockList) {
      if (stringValue.toLowerCase().includes(blocked.toLowerCase())) {
        violations.push({
          parameter: paramName,
          type: 'blockList',
          description: `Value contains blocked pattern: ${blocked}`,
          severity: 'error',
        });
      }
    }

    return violations;
  }

  /**
   * Get parameter policy
   */
  getParameterPolicy(
    toolName: string,
    paramName: string
  ): ParameterPolicy | undefined {
    const policy = this.getPolicy(toolName);
    return policy.parameters[paramName];
  }

  /**
   * Check if tool requires approval
   */
  requiresApproval(toolName: string): boolean {
    const policy = this.getPolicy(toolName);
    return policy.requiresApproval ?? false;
  }

  /**
   * Get tool risk level
   */
  getRiskLevel(toolName: string): 'low' | 'medium' | 'high' | 'critical' {
    const policy = this.getPolicy(toolName);
    return policy.riskLevel ?? 'high';
  }

  /**
   * List all registered policies
   */
  listPolicies(): string[] {
    return Array.from(this.policies.keys());
  }
}

// ============================================
// EXPORTS
// ============================================

export default PolicyEngine;
