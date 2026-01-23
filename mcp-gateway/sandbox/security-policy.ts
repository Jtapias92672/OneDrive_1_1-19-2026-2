/**
 * MCP Security Gateway - Sandbox Security Policy
 *
 * @epic 3.7 - Compliance & Validation
 * @task 3.7.13 - Sandbox Security Policy
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Advanced security policy engine for sandbox execution.
 *   Implements capability-based access control, syscall filtering,
 *   and comprehensive resource governance.
 *
 * @compliance
 *   - NIST SP 800-53: SC-39 Process Isolation
 *   - NIST SP 800-53: AC-4 Information Flow Enforcement
 *   - CIS Docker Benchmark: Container Runtime
 */

import * as crypto from 'crypto';

// ============================================
// TYPES
// ============================================

/**
 * Security policy for sandbox execution
 */
export interface SecurityPolicy {
  /** Policy ID */
  id: string;

  /** Policy name */
  name: string;

  /** Policy version */
  version: string;

  /** Description */
  description?: string;

  /** Policy mode */
  mode: 'enforce' | 'permissive' | 'audit';

  /** Capability grants */
  capabilities: CapabilityGrant[];

  /** Syscall filter */
  syscalls: SyscallFilter;

  /** Network policy */
  network: NetworkPolicy;

  /** Filesystem policy */
  filesystem: FilesystemPolicy;

  /** Resource limits */
  resources: ResourcePolicy;

  /** Environment policy */
  environment: EnvironmentPolicy;

  /** Inter-process communication policy */
  ipc: IPCPolicy;

  /** Audit requirements */
  audit: AuditPolicy;

  /** Created timestamp */
  createdAt: string;

  /** Updated timestamp */
  updatedAt: string;

  /** Policy hash for integrity */
  hash: string;
}

/**
 * Linux capabilities (subset relevant to sandbox)
 */
export type LinuxCapability =
  | 'CAP_NET_RAW'
  | 'CAP_NET_BIND_SERVICE'
  | 'CAP_SYS_ADMIN'
  | 'CAP_SYS_PTRACE'
  | 'CAP_SYS_CHROOT'
  | 'CAP_SETUID'
  | 'CAP_SETGID'
  | 'CAP_CHOWN'
  | 'CAP_DAC_OVERRIDE'
  | 'CAP_FOWNER'
  | 'CAP_KILL'
  | 'CAP_MKNOD';

/**
 * Custom MCP capabilities
 */
export type MCPCapability =
  | 'mcp:tool:read'
  | 'mcp:tool:write'
  | 'mcp:tool:execute'
  | 'mcp:network:http'
  | 'mcp:network:websocket'
  | 'mcp:fs:read'
  | 'mcp:fs:write'
  | 'mcp:fs:delete'
  | 'mcp:process:spawn'
  | 'mcp:env:read'
  | 'mcp:env:write'
  | 'mcp:crypto:sign'
  | 'mcp:crypto:encrypt';

/**
 * Capability grant
 */
export interface CapabilityGrant {
  /** Capability type */
  type: 'linux' | 'mcp';

  /** Capability name */
  capability: LinuxCapability | MCPCapability;

  /** Grant action */
  action: 'allow' | 'deny';

  /** Scope (tools, paths, etc.) */
  scope?: string[];

  /** Time-limited grant */
  expiresAt?: string;

  /** Conditional grant */
  condition?: {
    riskLevel?: ('MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
    tenantTier?: string[];
    timeWindow?: { start: string; end: string };
  };
}

/**
 * Syscall filter configuration
 */
export interface SyscallFilter {
  /** Default action for unlisted syscalls */
  defaultAction: 'allow' | 'deny' | 'log' | 'kill';

  /** Allowed syscalls */
  allowed: SyscallRule[];

  /** Denied syscalls */
  denied: SyscallRule[];

  /** Architecture filter */
  architectures: ('x86_64' | 'arm64' | 'wasm32')[];
}

/**
 * Syscall rule
 */
export interface SyscallRule {
  /** Syscall name or number */
  syscall: string;

  /** Arguments filter (optional) */
  args?: {
    index: number;
    value: number | string;
    op: 'eq' | 'ne' | 'gt' | 'lt' | 'masked_eq';
  }[];

  /** Action for this syscall */
  action: 'allow' | 'deny' | 'log' | 'kill' | 'trap';

  /** Log when invoked */
  log?: boolean;
}

/**
 * Network policy
 */
export interface NetworkPolicy {
  /** Enable network access */
  enabled: boolean;

  /** Egress rules */
  egress: NetworkRule[];

  /** Ingress rules (if applicable) */
  ingress: NetworkRule[];

  /** DNS policy */
  dns: {
    enabled: boolean;
    servers?: string[];
    blocked?: string[];
  };

  /** Connection limits */
  limits: {
    maxConnections: number;
    maxBandwidthBytesPerSec: number;
    connectionTimeoutMs: number;
  };
}

/**
 * Network rule
 */
export interface NetworkRule {
  /** Rule ID */
  id: string;

  /** Action */
  action: 'allow' | 'deny' | 'log';

  /** Destination CIDR or hostname pattern */
  destination: string;

  /** Port range */
  ports?: { start: number; end: number };

  /** Protocol */
  protocol: 'tcp' | 'udp' | 'any';

  /** Priority (lower = higher priority) */
  priority: number;
}

/**
 * Filesystem policy
 */
export interface FilesystemPolicy {
  /** Enable filesystem access */
  enabled: boolean;

  /** Root filesystem mode */
  rootMode: 'readonly' | 'overlay' | 'none';

  /** Mount rules */
  mounts: MountRule[];

  /** Path ACLs */
  pathAcls: PathACL[];

  /** Quota limits */
  quota: {
    maxSizeBytes: number;
    maxInodes: number;
    maxFileSize: number;
  };

  /** Disallow execution from these paths */
  noExec: string[];
}

/**
 * Mount rule
 */
export interface MountRule {
  /** Source path (host) */
  source: string;

  /** Destination path (sandbox) */
  destination: string;

  /** Mount mode */
  mode: 'ro' | 'rw';

  /** Propagation */
  propagation?: 'private' | 'shared' | 'slave';
}

/**
 * Path access control list
 */
export interface PathACL {
  /** Path pattern (glob) */
  path: string;

  /** Allowed operations */
  operations: ('read' | 'write' | 'execute' | 'delete' | 'stat')[];

  /** Action */
  action: 'allow' | 'deny';

  /** Priority */
  priority: number;
}

/**
 * Resource limits policy
 */
export interface ResourcePolicy {
  /** CPU limits */
  cpu: {
    /** CPU shares (relative weight) */
    shares: number;
    /** CPU quota (microseconds per period) */
    quotaUs: number;
    /** CPU period (microseconds) */
    periodUs: number;
    /** Max execution time (ms) */
    maxExecutionMs: number;
  };

  /** Memory limits */
  memory: {
    /** Hard limit (bytes) */
    limitBytes: number;
    /** Soft limit (bytes) */
    reservationBytes: number;
    /** Swap limit (bytes, -1 for same as memory) */
    swapLimitBytes: number;
    /** OOM score adjustment */
    oomScoreAdj: number;
  };

  /** Process limits */
  pids: {
    /** Maximum processes */
    max: number;
  };

  /** I/O limits */
  io: {
    /** Weight (10-1000) */
    weight: number;
    /** Read BPS limit */
    readBps: number;
    /** Write BPS limit */
    writeBps: number;
    /** Read IOPS limit */
    readIops: number;
    /** Write IOPS limit */
    writeIops: number;
  };
}

/**
 * Environment variable policy
 */
export interface EnvironmentPolicy {
  /** Allowed environment variables (passthrough) */
  allowed: string[];

  /** Blocked environment variables */
  blocked: string[];

  /** Fixed environment variables */
  fixed: Record<string, string>;

  /** Clear all inherited environment */
  clearInherited: boolean;
}

/**
 * IPC policy
 */
export interface IPCPolicy {
  /** Enable IPC */
  enabled: boolean;

  /** Allowed IPC mechanisms */
  mechanisms: ('pipe' | 'socket' | 'shm' | 'mqueue' | 'signal')[];

  /** Namespace isolation */
  namespace: 'private' | 'host' | 'container';
}

/**
 * Audit policy
 */
export interface AuditPolicy {
  /** Enable audit logging */
  enabled: boolean;

  /** Events to audit */
  events: AuditEvent[];

  /** Minimum severity to log */
  minSeverity: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

  /** Include syscall arguments in logs */
  includeSyscallArgs: boolean;

  /** Include environment in logs */
  includeEnvironment: boolean;
}

/**
 * Audit event type
 */
export type AuditEvent =
  | 'policy_violation'
  | 'capability_use'
  | 'syscall_blocked'
  | 'network_connection'
  | 'file_access'
  | 'resource_limit'
  | 'process_spawn'
  | 'policy_change';

/**
 * Policy violation event
 */
export interface PolicyViolation {
  /** Violation ID */
  id: string;

  /** Timestamp */
  timestamp: string;

  /** Policy ID */
  policyId: string;

  /** Violation type */
  type: AuditEvent;

  /** Severity */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Description */
  description: string;

  /** Details */
  details: Record<string, unknown>;

  /** Action taken */
  action: 'blocked' | 'allowed' | 'logged' | 'killed';

  /** Process info */
  process?: {
    pid: number;
    name: string;
    user: string;
  };
}

/**
 * Policy evaluation result
 */
export interface PolicyEvaluation {
  /** Whether operation is allowed */
  allowed: boolean;

  /** Matching rules */
  matchedRules: string[];

  /** Violations */
  violations: PolicyViolation[];

  /** Evaluation time (ms) */
  evaluationTimeMs: number;

  /** Policy version used */
  policyVersion: string;
}

// ============================================
// DEFAULT POLICIES
// ============================================

/**
 * Minimal sandbox policy (most restrictive)
 */
export const MINIMAL_POLICY: Omit<SecurityPolicy, 'id' | 'hash' | 'createdAt' | 'updatedAt'> = {
  name: 'Minimal Sandbox',
  version: '1.0.0',
  description: 'Most restrictive policy for untrusted tools',
  mode: 'enforce',
  capabilities: [
    { type: 'linux', capability: 'CAP_SYS_ADMIN', action: 'deny' },
    { type: 'linux', capability: 'CAP_SYS_PTRACE', action: 'deny' },
    { type: 'linux', capability: 'CAP_NET_RAW', action: 'deny' },
    { type: 'mcp', capability: 'mcp:tool:read', action: 'allow' },
    { type: 'mcp', capability: 'mcp:tool:execute', action: 'allow' },
  ],
  syscalls: {
    defaultAction: 'deny',
    architectures: ['x86_64', 'arm64'],
    allowed: [
      { syscall: 'read', action: 'allow' },
      { syscall: 'write', action: 'allow', args: [{ index: 0, value: 1, op: 'eq' }] }, // stdout only
      { syscall: 'write', action: 'allow', args: [{ index: 0, value: 2, op: 'eq' }] }, // stderr only
      { syscall: 'mmap', action: 'allow' },
      { syscall: 'mprotect', action: 'allow' },
      { syscall: 'munmap', action: 'allow' },
      { syscall: 'brk', action: 'allow' },
      { syscall: 'exit_group', action: 'allow' },
      { syscall: 'clock_gettime', action: 'allow' },
      { syscall: 'getrandom', action: 'allow' },
    ],
    denied: [
      { syscall: 'execve', action: 'kill', log: true },
      { syscall: 'fork', action: 'deny', log: true },
      { syscall: 'clone', action: 'deny', log: true },
      { syscall: 'ptrace', action: 'kill', log: true },
      { syscall: 'mount', action: 'kill', log: true },
      { syscall: 'umount', action: 'kill', log: true },
    ],
  },
  network: {
    enabled: false,
    egress: [],
    ingress: [],
    dns: { enabled: false },
    limits: {
      maxConnections: 0,
      maxBandwidthBytesPerSec: 0,
      connectionTimeoutMs: 0,
    },
  },
  filesystem: {
    enabled: false,
    rootMode: 'none',
    mounts: [],
    pathAcls: [],
    quota: {
      maxSizeBytes: 0,
      maxInodes: 0,
      maxFileSize: 0,
    },
    noExec: ['/'],
  },
  resources: {
    cpu: {
      shares: 256,
      quotaUs: 50000,
      periodUs: 100000,
      maxExecutionMs: 5000,
    },
    memory: {
      limitBytes: 64 * 1024 * 1024, // 64MB
      reservationBytes: 32 * 1024 * 1024,
      swapLimitBytes: 0,
      oomScoreAdj: 500,
    },
    pids: { max: 1 },
    io: {
      weight: 100,
      readBps: 1024 * 1024,
      writeBps: 0,
      readIops: 100,
      writeIops: 0,
    },
  },
  environment: {
    allowed: [],
    blocked: ['*'],
    fixed: {
      PATH: '/usr/bin',
      HOME: '/sandbox',
      LANG: 'en_US.UTF-8',
    },
    clearInherited: true,
  },
  ipc: {
    enabled: false,
    mechanisms: [],
    namespace: 'private',
  },
  audit: {
    enabled: true,
    events: ['policy_violation', 'syscall_blocked', 'resource_limit'],
    minSeverity: 'WARN',
    includeSyscallArgs: true,
    includeEnvironment: false,
  },
};

/**
 * Standard sandbox policy (balanced)
 */
export const STANDARD_POLICY: Omit<SecurityPolicy, 'id' | 'hash' | 'createdAt' | 'updatedAt'> = {
  name: 'Standard Sandbox',
  version: '1.0.0',
  description: 'Balanced policy for most tools',
  mode: 'enforce',
  capabilities: [
    { type: 'linux', capability: 'CAP_SYS_ADMIN', action: 'deny' },
    { type: 'linux', capability: 'CAP_SYS_PTRACE', action: 'deny' },
    { type: 'linux', capability: 'CAP_NET_BIND_SERVICE', action: 'allow' },
    { type: 'mcp', capability: 'mcp:tool:read', action: 'allow' },
    { type: 'mcp', capability: 'mcp:tool:write', action: 'allow' },
    { type: 'mcp', capability: 'mcp:tool:execute', action: 'allow' },
    { type: 'mcp', capability: 'mcp:network:http', action: 'allow' },
    { type: 'mcp', capability: 'mcp:fs:read', action: 'allow' },
  ],
  syscalls: {
    defaultAction: 'allow',
    architectures: ['x86_64', 'arm64'],
    allowed: [],
    denied: [
      { syscall: 'ptrace', action: 'deny', log: true },
      { syscall: 'mount', action: 'deny', log: true },
      { syscall: 'umount', action: 'deny', log: true },
      { syscall: 'kexec_load', action: 'kill', log: true },
      { syscall: 'init_module', action: 'kill', log: true },
      { syscall: 'delete_module', action: 'kill', log: true },
    ],
  },
  network: {
    enabled: true,
    egress: [
      { id: 'https', action: 'allow', destination: '*', ports: { start: 443, end: 443 }, protocol: 'tcp', priority: 1 },
      { id: 'http', action: 'allow', destination: '*', ports: { start: 80, end: 80 }, protocol: 'tcp', priority: 2 },
      { id: 'deny-all', action: 'deny', destination: '*', protocol: 'any', priority: 100 },
    ],
    ingress: [],
    dns: {
      enabled: true,
      servers: ['8.8.8.8', '8.8.4.4'],
    },
    limits: {
      maxConnections: 10,
      maxBandwidthBytesPerSec: 10 * 1024 * 1024, // 10MB/s
      connectionTimeoutMs: 30000,
    },
  },
  filesystem: {
    enabled: true,
    rootMode: 'readonly',
    mounts: [
      { source: '/tmp/sandbox', destination: '/tmp', mode: 'rw' },
    ],
    pathAcls: [
      { path: '/tmp/**', operations: ['read', 'write', 'delete'], action: 'allow', priority: 1 },
      { path: '/etc/passwd', operations: ['read'], action: 'allow', priority: 2 },
      { path: '/etc/shadow', operations: ['read', 'write'], action: 'deny', priority: 1 },
      { path: '/**', operations: ['read'], action: 'allow', priority: 100 },
    ],
    quota: {
      maxSizeBytes: 1024 * 1024 * 1024, // 1GB
      maxInodes: 10000,
      maxFileSize: 100 * 1024 * 1024, // 100MB
    },
    noExec: ['/tmp', '/var/tmp'],
  },
  resources: {
    cpu: {
      shares: 1024,
      quotaUs: 100000,
      periodUs: 100000,
      maxExecutionMs: 60000,
    },
    memory: {
      limitBytes: 512 * 1024 * 1024, // 512MB
      reservationBytes: 256 * 1024 * 1024,
      swapLimitBytes: -1,
      oomScoreAdj: 300,
    },
    pids: { max: 100 },
    io: {
      weight: 500,
      readBps: 100 * 1024 * 1024,
      writeBps: 50 * 1024 * 1024,
      readIops: 1000,
      writeIops: 500,
    },
  },
  environment: {
    allowed: ['PATH', 'HOME', 'USER', 'LANG', 'TZ'],
    blocked: ['AWS_*', 'GITHUB_*', 'SECRET_*', 'API_KEY*'],
    fixed: {
      SANDBOX: 'true',
    },
    clearInherited: false,
  },
  ipc: {
    enabled: true,
    mechanisms: ['pipe', 'socket'],
    namespace: 'private',
  },
  audit: {
    enabled: true,
    events: ['policy_violation', 'capability_use', 'network_connection', 'file_access'],
    minSeverity: 'INFO',
    includeSyscallArgs: false,
    includeEnvironment: false,
  },
};

// ============================================
// SECURITY POLICY ENGINE
// ============================================

/**
 * Security Policy Engine
 *
 * Evaluates and enforces security policies for sandbox execution.
 */
export class SecurityPolicyEngine {
  private policies: Map<string, SecurityPolicy> = new Map();
  private defaultPolicyId: string | null = null;
  private violations: PolicyViolation[] = [];
  private onViolation?: (violation: PolicyViolation) => void;

  constructor(config?: {
    defaultPolicy?: 'minimal' | 'standard';
    onViolation?: (violation: PolicyViolation) => void;
  }) {
    this.onViolation = config?.onViolation;

    // Register default policies
    const minimalPolicy = this.createPolicy(MINIMAL_POLICY);
    const standardPolicy = this.createPolicy(STANDARD_POLICY);

    this.policies.set(minimalPolicy.id, minimalPolicy);
    this.policies.set(standardPolicy.id, standardPolicy);

    // Set default
    this.defaultPolicyId = config?.defaultPolicy === 'minimal'
      ? minimalPolicy.id
      : standardPolicy.id;
  }

  /**
   * Create a new policy
   */
  createPolicy(
    config: Omit<SecurityPolicy, 'id' | 'hash' | 'createdAt' | 'updatedAt'>
  ): SecurityPolicy {
    const now = new Date().toISOString();
    const id = this.generatePolicyId();

    const policy: SecurityPolicy = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now,
      hash: '', // Will be computed
    };

    // Compute policy hash
    policy.hash = this.computePolicyHash(policy);

    return policy;
  }

  /**
   * Register a policy
   */
  registerPolicy(policy: SecurityPolicy): void {
    // Verify policy integrity
    const expectedHash = this.computePolicyHash(policy);
    if (policy.hash !== expectedHash) {
      throw new Error('Policy integrity check failed');
    }

    this.policies.set(policy.id, policy);
  }

  /**
   * Get policy by ID
   */
  getPolicy(id: string): SecurityPolicy | undefined {
    return this.policies.get(id);
  }

  /**
   * Get default policy
   */
  getDefaultPolicy(): SecurityPolicy | undefined {
    return this.defaultPolicyId ? this.policies.get(this.defaultPolicyId) : undefined;
  }

  /**
   * Set default policy
   */
  setDefaultPolicy(id: string): void {
    if (!this.policies.has(id)) {
      throw new Error(`Policy ${id} not found`);
    }
    this.defaultPolicyId = id;
  }

  /**
   * Evaluate capability request
   */
  evaluateCapability(
    policyId: string,
    capability: LinuxCapability | MCPCapability,
    context?: { riskLevel?: string; tenantTier?: string }
  ): PolicyEvaluation {
    const start = Date.now();
    const policy = this.policies.get(policyId);

    if (!policy) {
      return {
        allowed: false,
        matchedRules: [],
        violations: [{
          id: this.generateViolationId(),
          timestamp: new Date().toISOString(),
          policyId,
          type: 'capability_use',
          severity: 'HIGH',
          description: `Policy ${policyId} not found`,
          details: { capability },
          action: 'blocked',
        }],
        evaluationTimeMs: Date.now() - start,
        policyVersion: 'unknown',
      };
    }

    const matchedRules: string[] = [];
    let allowed = false;

    for (const grant of policy.capabilities) {
      const capMatch = grant.capability === capability;
      if (!capMatch) continue;

      // Check conditions
      if (grant.condition) {
        if (grant.condition.riskLevel && context?.riskLevel) {
          if (!grant.condition.riskLevel.includes(context.riskLevel as any)) {
            continue;
          }
        }
        if (grant.condition.tenantTier && context?.tenantTier) {
          if (!grant.condition.tenantTier.includes(context.tenantTier)) {
            continue;
          }
        }
      }

      matchedRules.push(`${grant.type}:${grant.capability}:${grant.action}`);
      allowed = grant.action === 'allow';

      // First match wins
      break;
    }

    const violations: PolicyViolation[] = [];
    if (!allowed && policy.mode === 'enforce') {
      const violation: PolicyViolation = {
        id: this.generateViolationId(),
        timestamp: new Date().toISOString(),
        policyId,
        type: 'capability_use',
        severity: 'MEDIUM',
        description: `Capability ${capability} denied by policy`,
        details: { capability, context },
        action: 'blocked',
      };
      violations.push(violation);
      this.recordViolation(violation);
    }

    return {
      allowed: policy.mode === 'permissive' || allowed,
      matchedRules,
      violations,
      evaluationTimeMs: Date.now() - start,
      policyVersion: policy.version,
    };
  }

  /**
   * Evaluate network request
   */
  evaluateNetwork(
    policyId: string,
    destination: string,
    port: number,
    protocol: 'tcp' | 'udp'
  ): PolicyEvaluation {
    const start = Date.now();
    const policy = this.policies.get(policyId);

    if (!policy) {
      return {
        allowed: false,
        matchedRules: [],
        violations: [],
        evaluationTimeMs: Date.now() - start,
        policyVersion: 'unknown',
      };
    }

    if (!policy.network.enabled) {
      const violation: PolicyViolation = {
        id: this.generateViolationId(),
        timestamp: new Date().toISOString(),
        policyId,
        type: 'network_connection',
        severity: 'MEDIUM',
        description: 'Network access disabled by policy',
        details: { destination, port, protocol },
        action: 'blocked',
      };
      this.recordViolation(violation);

      return {
        allowed: false,
        matchedRules: ['network.enabled=false'],
        violations: [violation],
        evaluationTimeMs: Date.now() - start,
        policyVersion: policy.version,
      };
    }

    // Sort rules by priority
    const rules = [...policy.network.egress].sort((a, b) => a.priority - b.priority);
    const matchedRules: string[] = [];
    let allowed = false;

    for (const rule of rules) {
      // Check destination
      const destMatch = rule.destination === '*' ||
        destination.includes(rule.destination) ||
        this.matchGlob(destination, rule.destination);

      // Check port
      const portMatch = !rule.ports ||
        (port >= rule.ports.start && port <= rule.ports.end);

      // Check protocol
      const protoMatch = rule.protocol === 'any' || rule.protocol === protocol;

      if (destMatch && portMatch && protoMatch) {
        matchedRules.push(rule.id);
        allowed = rule.action === 'allow';
        break;
      }
    }

    const violations: PolicyViolation[] = [];
    if (!allowed && policy.mode === 'enforce') {
      const violation: PolicyViolation = {
        id: this.generateViolationId(),
        timestamp: new Date().toISOString(),
        policyId,
        type: 'network_connection',
        severity: 'MEDIUM',
        description: `Network connection to ${destination}:${port} denied`,
        details: { destination, port, protocol },
        action: 'blocked',
      };
      violations.push(violation);
      this.recordViolation(violation);
    }

    return {
      allowed: policy.mode === 'permissive' || allowed,
      matchedRules,
      violations,
      evaluationTimeMs: Date.now() - start,
      policyVersion: policy.version,
    };
  }

  /**
   * Evaluate filesystem access
   */
  evaluateFilesystem(
    policyId: string,
    path: string,
    operation: 'read' | 'write' | 'execute' | 'delete' | 'stat'
  ): PolicyEvaluation {
    const start = Date.now();
    const policy = this.policies.get(policyId);

    if (!policy) {
      return {
        allowed: false,
        matchedRules: [],
        violations: [],
        evaluationTimeMs: Date.now() - start,
        policyVersion: 'unknown',
      };
    }

    if (!policy.filesystem.enabled) {
      return {
        allowed: false,
        matchedRules: ['filesystem.enabled=false'],
        violations: [],
        evaluationTimeMs: Date.now() - start,
        policyVersion: policy.version,
      };
    }

    // Check noExec paths for execute operations
    if (operation === 'execute') {
      for (const noExecPath of policy.filesystem.noExec) {
        if (path.startsWith(noExecPath)) {
          const violation: PolicyViolation = {
            id: this.generateViolationId(),
            timestamp: new Date().toISOString(),
            policyId,
            type: 'file_access',
            severity: 'HIGH',
            description: `Execution denied in noexec path: ${path}`,
            details: { path, operation },
            action: 'blocked',
          };
          this.recordViolation(violation);

          return {
            allowed: false,
            matchedRules: [`noexec:${noExecPath}`],
            violations: [violation],
            evaluationTimeMs: Date.now() - start,
            policyVersion: policy.version,
          };
        }
      }
    }

    // Sort ACLs by priority
    const acls = [...policy.filesystem.pathAcls].sort((a, b) => a.priority - b.priority);
    const matchedRules: string[] = [];
    let allowed = false;

    for (const acl of acls) {
      const pathMatch = this.matchGlob(path, acl.path);
      const opMatch = acl.operations.includes(operation);

      if (pathMatch && opMatch) {
        matchedRules.push(`acl:${acl.path}:${acl.action}`);
        allowed = acl.action === 'allow';
        break;
      }
    }

    const violations: PolicyViolation[] = [];
    if (!allowed && policy.mode === 'enforce') {
      const violation: PolicyViolation = {
        id: this.generateViolationId(),
        timestamp: new Date().toISOString(),
        policyId,
        type: 'file_access',
        severity: 'MEDIUM',
        description: `File ${operation} denied for: ${path}`,
        details: { path, operation },
        action: 'blocked',
      };
      violations.push(violation);
      this.recordViolation(violation);
    }

    return {
      allowed: policy.mode === 'permissive' || allowed,
      matchedRules,
      violations,
      evaluationTimeMs: Date.now() - start,
      policyVersion: policy.version,
    };
  }

  /**
   * Evaluate resource usage
   */
  evaluateResources(
    policyId: string,
    usage: {
      cpuMs?: number;
      memoryBytes?: number;
      pids?: number;
      ioBps?: number;
    }
  ): PolicyEvaluation {
    const start = Date.now();
    const policy = this.policies.get(policyId);

    if (!policy) {
      return {
        allowed: false,
        matchedRules: [],
        violations: [],
        evaluationTimeMs: Date.now() - start,
        policyVersion: 'unknown',
      };
    }

    const violations: PolicyViolation[] = [];
    const matchedRules: string[] = [];

    // Check CPU
    if (usage.cpuMs !== undefined && usage.cpuMs > policy.resources.cpu.maxExecutionMs) {
      const violation: PolicyViolation = {
        id: this.generateViolationId(),
        timestamp: new Date().toISOString(),
        policyId,
        type: 'resource_limit',
        severity: 'HIGH',
        description: `CPU limit exceeded: ${usage.cpuMs}ms > ${policy.resources.cpu.maxExecutionMs}ms`,
        details: { resource: 'cpu', usage: usage.cpuMs, limit: policy.resources.cpu.maxExecutionMs },
        action: policy.mode === 'enforce' ? 'killed' : 'logged',
      };
      violations.push(violation);
      matchedRules.push('cpu.maxExecutionMs');
      this.recordViolation(violation);
    }

    // Check memory
    if (usage.memoryBytes !== undefined && usage.memoryBytes > policy.resources.memory.limitBytes) {
      const violation: PolicyViolation = {
        id: this.generateViolationId(),
        timestamp: new Date().toISOString(),
        policyId,
        type: 'resource_limit',
        severity: 'HIGH',
        description: `Memory limit exceeded: ${usage.memoryBytes} > ${policy.resources.memory.limitBytes}`,
        details: { resource: 'memory', usage: usage.memoryBytes, limit: policy.resources.memory.limitBytes },
        action: policy.mode === 'enforce' ? 'killed' : 'logged',
      };
      violations.push(violation);
      matchedRules.push('memory.limitBytes');
      this.recordViolation(violation);
    }

    // Check PIDs
    if (usage.pids !== undefined && usage.pids > policy.resources.pids.max) {
      const violation: PolicyViolation = {
        id: this.generateViolationId(),
        timestamp: new Date().toISOString(),
        policyId,
        type: 'resource_limit',
        severity: 'MEDIUM',
        description: `PID limit exceeded: ${usage.pids} > ${policy.resources.pids.max}`,
        details: { resource: 'pids', usage: usage.pids, limit: policy.resources.pids.max },
        action: policy.mode === 'enforce' ? 'blocked' : 'logged',
      };
      violations.push(violation);
      matchedRules.push('pids.max');
      this.recordViolation(violation);
    }

    return {
      allowed: violations.length === 0 || policy.mode === 'permissive',
      matchedRules,
      violations,
      evaluationTimeMs: Date.now() - start,
      policyVersion: policy.version,
    };
  }

  /**
   * Get recent violations
   */
  getViolations(limit: number = 100): PolicyViolation[] {
    return this.violations.slice(-limit);
  }

  /**
   * Clear violations
   */
  clearViolations(): void {
    this.violations = [];
  }

  /**
   * Export policy as JSON
   */
  exportPolicy(policyId: string): string | null {
    const policy = this.policies.get(policyId);
    return policy ? JSON.stringify(policy, null, 2) : null;
  }

  /**
   * Import policy from JSON
   */
  importPolicy(json: string): SecurityPolicy | null {
    try {
      const policy = JSON.parse(json) as SecurityPolicy;

      // Verify integrity
      const expectedHash = this.computePolicyHash(policy);
      if (policy.hash !== expectedHash) {
        console.error('Policy integrity check failed');
        return null;
      }

      this.policies.set(policy.id, policy);
      return policy;
    } catch {
      return null;
    }
  }

  /**
   * Record a violation
   */
  private recordViolation(violation: PolicyViolation): void {
    this.violations.push(violation);

    // Keep only last 1000 violations
    if (this.violations.length > 1000) {
      this.violations = this.violations.slice(-1000);
    }

    // Notify callback
    if (this.onViolation) {
      this.onViolation(violation);
    }
  }

  /**
   * Simple glob matching
   */
  private matchGlob(str: string, pattern: string): boolean {
    const regex = pattern
      .replace(/\*\*/g, '<<<GLOBSTAR>>>')
      .replace(/\*/g, '[^/]*')
      .replace(/<<<GLOBSTAR>>>/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regex}$`).test(str);
  }

  /**
   * Generate policy ID
   */
  private generatePolicyId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `policy_${timestamp}_${random}`;
  }

  /**
   * Generate violation ID
   */
  private generateViolationId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `violation_${timestamp}_${random}`;
  }

  /**
   * Compute policy hash
   */
  private computePolicyHash(policy: SecurityPolicy): string {
    const { hash, ...rest } = policy;
    return crypto.createHash('sha256').update(JSON.stringify(rest)).digest('hex');
  }
}

// ============================================
// EXPORTS
// ============================================

export default SecurityPolicyEngine;
