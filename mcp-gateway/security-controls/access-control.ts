/**
 * FORGE Platform - Access Control (RBAC/ABAC)
 *
 * @epic 3.6 - Security Controls
 * @description Role-Based and Attribute-Based Access Control implementation
 */

import {
  Role,
  Subject,
  Resource,
  AccessRequest,
  AccessDecision,
  SecurityPolicy,
  PolicyCondition,
  Obligation,
  Permission,
  ResourceType,
  TimeConstraint,
} from './types.js';

// ============================================
// ACCESS CONTROL ENGINE
// ============================================

export class AccessControlEngine {
  private roles: Map<string, Role> = new Map();
  private policies: Map<string, SecurityPolicy> = new Map();
  private roleHierarchy: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeBuiltInRoles();
  }

  // ==========================================
  // ROLE MANAGEMENT
  // ==========================================

  /**
   * Register a role
   */
  registerRole(role: Role): void {
    this.roles.set(role.id, role);
    this.updateRoleHierarchy(role);
  }

  /**
   * Get a role by ID
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Get all permissions for a role (including inherited)
   */
  getRolePermissions(roleId: string): Map<ResourceType, Set<Permission>> {
    const permissions = new Map<ResourceType, Set<Permission>>();
    const visitedRoles = new Set<string>();

    this.collectRolePermissions(roleId, permissions, visitedRoles);

    return permissions;
  }

  private collectRolePermissions(
    roleId: string,
    permissions: Map<ResourceType, Set<Permission>>,
    visited: Set<string>
  ): void {
    if (visited.has(roleId)) return;
    visited.add(roleId);

    const role = this.roles.get(roleId);
    if (!role) return;

    // Add this role's permissions
    for (const perm of role.permissions) {
      if (!permissions.has(perm.resource)) {
        permissions.set(perm.resource, new Set());
      }
      for (const action of perm.actions) {
        permissions.get(perm.resource)!.add(action);
      }
    }

    // Collect inherited permissions
    if (role.inherits) {
      for (const parentRole of role.inherits) {
        this.collectRolePermissions(parentRole, permissions, visited);
      }
    }
  }

  private updateRoleHierarchy(role: Role): void {
    if (!role.inherits) return;

    if (!this.roleHierarchy.has(role.id)) {
      this.roleHierarchy.set(role.id, new Set());
    }

    for (const parent of role.inherits) {
      this.roleHierarchy.get(role.id)!.add(parent);

      // Also add transitive parents
      const parentSet = this.roleHierarchy.get(parent);
      if (parentSet) {
        for (const grandparent of parentSet) {
          this.roleHierarchy.get(role.id)!.add(grandparent);
        }
      }
    }
  }

  // ==========================================
  // POLICY MANAGEMENT
  // ==========================================

  /**
   * Register a security policy
   */
  registerPolicy(policy: SecurityPolicy): void {
    this.policies.set(policy.id, policy);
  }

  /**
   * Remove a policy
   */
  removePolicy(policyId: string): boolean {
    return this.policies.delete(policyId);
  }

  /**
   * Get policies sorted by priority
   */
  private getSortedPolicies(): SecurityPolicy[] {
    return Array.from(this.policies.values())
      .filter(p => p.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  // ==========================================
  // ACCESS DECISION
  // ==========================================

  /**
   * Evaluate access request
   */
  evaluate(request: AccessRequest): AccessDecision {
    // First, check RBAC permissions
    const rbacDecision = this.evaluateRBAC(request);

    // Then, check ABAC policies
    const abacDecision = this.evaluateABAC(request);

    // Combine decisions (deny takes precedence)
    if (!rbacDecision.allowed) {
      return {
        ...rbacDecision,
        auditRequired: true,
      };
    }

    if (!abacDecision.allowed) {
      return {
        ...abacDecision,
        auditRequired: true,
      };
    }

    // Merge obligations
    const obligations = [
      ...(rbacDecision.obligations || []),
      ...(abacDecision.obligations || []),
    ];

    return {
      allowed: true,
      reason: 'Access granted by RBAC and ABAC policies',
      matchedPolicy: abacDecision.matchedPolicy,
      obligations: obligations.length > 0 ? obligations : undefined,
      auditRequired: this.shouldAudit(request),
    };
  }

  /**
   * Evaluate RBAC permissions
   */
  private evaluateRBAC(request: AccessRequest): AccessDecision {
    const { subject, resource, action } = request;

    // Check each role
    for (const roleId of subject.roles) {
      const role = this.roles.get(roleId);
      if (!role) continue;

      // Check role constraints
      if (!this.checkRoleConstraints(role, request)) {
        continue;
      }

      const permissions = this.getRolePermissions(roleId);
      const resourcePermissions = permissions.get(resource.type);

      if (resourcePermissions && resourcePermissions.has(action)) {
        return {
          allowed: true,
          reason: `Permission granted by role: ${role.name}`,
          auditRequired: false,
        };
      }
    }

    return {
      allowed: false,
      reason: 'No role grants the required permission',
      auditRequired: true,
    };
  }

  /**
   * Evaluate ABAC policies
   */
  private evaluateABAC(request: AccessRequest): AccessDecision {
    const policies = this.getSortedPolicies();
    const obligations: Obligation[] = [];

    for (const policy of policies) {
      // Check if policy applies to this request
      if (!this.policyMatches(policy, request)) {
        continue;
      }

      // Check conditions
      if (!this.checkConditions(policy.conditions || [], request)) {
        continue;
      }

      // Policy matches - apply effect
      if (policy.effect === 'deny') {
        return {
          allowed: false,
          reason: `Denied by policy: ${policy.name}`,
          matchedPolicy: policy.id,
          auditRequired: true,
        };
      }

      // Collect obligations
      if (policy.obligations) {
        obligations.push(...policy.obligations);
      }

      // Allow with obligations
      return {
        allowed: true,
        reason: `Allowed by policy: ${policy.name}`,
        matchedPolicy: policy.id,
        obligations: obligations.length > 0 ? obligations : undefined,
        auditRequired: false,
      };
    }

    // No matching policy - default allow (RBAC already passed)
    return {
      allowed: true,
      reason: 'No restricting policy found',
      obligations: obligations.length > 0 ? obligations : undefined,
      auditRequired: false,
    };
  }

  /**
   * Check if policy matches request
   */
  private policyMatches(policy: SecurityPolicy, request: AccessRequest): boolean {
    // Check action
    if (!policy.actions.includes(request.action)) {
      return false;
    }

    // Check subject matchers
    const subjectMatches = policy.subjects.some(matcher =>
      this.matchSubject(matcher, request.subject)
    );
    if (!subjectMatches) return false;

    // Check resource matchers
    const resourceMatches = policy.resources.some(matcher =>
      this.matchResource(matcher, request.resource)
    );
    if (!resourceMatches) return false;

    return true;
  }

  private matchSubject(
    matcher: { type?: string; roles?: string[]; attributes?: Record<string, unknown> },
    subject: Subject
  ): boolean {
    if (matcher.type && matcher.type !== '*' && matcher.type !== subject.type) {
      return false;
    }

    if (matcher.roles && matcher.roles.length > 0) {
      const hasRole = matcher.roles.some(r => subject.roles.includes(r));
      if (!hasRole) return false;
    }

    if (matcher.attributes) {
      for (const [key, value] of Object.entries(matcher.attributes)) {
        if (subject.attributes[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private matchResource(
    matcher: { type?: ResourceType | '*'; id?: string; tenantId?: string; sensitivity?: string[] },
    resource: Resource
  ): boolean {
    if (matcher.type && matcher.type !== '*' && matcher.type !== resource.type) {
      return false;
    }

    if (matcher.id && matcher.id !== resource.id) {
      return false;
    }

    if (matcher.tenantId && matcher.tenantId !== resource.tenantId) {
      return false;
    }

    if (matcher.sensitivity && resource.sensitivity) {
      if (!matcher.sensitivity.includes(resource.sensitivity)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check policy conditions
   */
  private checkConditions(conditions: PolicyCondition[], request: AccessRequest): boolean {
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, request)) {
        return false;
      }
    }
    return true;
  }

  private evaluateCondition(condition: PolicyCondition, request: AccessRequest): boolean {
    const { type, operator, field, value } = condition;

    let fieldValue: unknown;

    switch (type) {
      case 'time':
        fieldValue = this.getTimeValue(field, request);
        break;
      case 'ip':
        fieldValue = request.context.ipAddress;
        break;
      case 'attribute':
        fieldValue = this.getAttributeValue(field, request);
        break;
      case 'risk':
        fieldValue = request.context.additionalContext?.riskScore;
        break;
      default:
        return true;
    }

    return this.compareValues(operator, fieldValue, value);
  }

  private getTimeValue(field: string, request: AccessRequest): unknown {
    const now = new Date(request.context.timestamp);
    switch (field) {
      case 'hour':
        return now.getHours();
      case 'dayOfWeek':
        return now.getDay();
      case 'timestamp':
        return now.getTime();
      default:
        return null;
    }
  }

  private getAttributeValue(field: string, request: AccessRequest): unknown {
    const parts = field.split('.');
    let current: Record<string, unknown> = request as unknown as Record<string, unknown>;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part] as Record<string, unknown>;
      } else {
        return undefined;
      }
    }

    return current;
  }

  private compareValues(operator: string, actual: unknown, expected: unknown): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'notEquals':
        return actual !== expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'greaterThan':
        return Number(actual) > Number(expected);
      case 'lessThan':
        return Number(actual) < Number(expected);
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'notIn':
        return Array.isArray(expected) && !expected.includes(actual);
      case 'matches':
        return new RegExp(String(expected)).test(String(actual));
      default:
        return false;
    }
  }

  /**
   * Check role constraints
   */
  private checkRoleConstraints(role: Role, request: AccessRequest): boolean {
    if (!role.constraints) return true;

    for (const constraint of role.constraints) {
      switch (constraint.type) {
        case 'time':
          if (!this.checkTimeConstraint(constraint.value as TimeConstraint, request)) {
            return false;
          }
          break;
        case 'ip':
          if (!this.checkIpConstraint(constraint.value as string[], request)) {
            return false;
          }
          break;
        case 'mfa':
          if (constraint.value === 'required' && !request.subject.mfaVerified) {
            return false;
          }
          break;
        case 'tenant':
          const allowedTenants = Array.isArray(constraint.value) ? constraint.value : [constraint.value];
          if (!allowedTenants.includes(request.subject.tenantId)) {
            return false;
          }
          break;
        case 'environment':
          const allowedEnvs = Array.isArray(constraint.value) ? constraint.value : [constraint.value];
          if (!allowedEnvs.includes(request.context.environment)) {
            return false;
          }
          break;
      }
    }

    return true;
  }

  private checkTimeConstraint(constraint: TimeConstraint, request: AccessRequest): boolean {
    const now = new Date(request.context.timestamp);
    const hour = now.getHours();
    const day = now.getDay();

    if (hour < constraint.startHour || hour >= constraint.endHour) {
      return false;
    }

    if (!constraint.daysOfWeek.includes(day)) {
      return false;
    }

    return true;
  }

  private checkIpConstraint(allowedIps: string[], request: AccessRequest): boolean {
    const ip = request.context.ipAddress;
    if (!ip) return false;

    return allowedIps.some(allowed => {
      if (allowed.includes('/')) {
        return this.ipInCidr(ip, allowed);
      }
      return ip === allowed;
    });
  }

  private ipInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    if (!range || !bits) return false;

    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(range);
    const mask = ~((1 << (32 - parseInt(bits))) - 1);

    return (ipNum & mask) === (rangeNum & mask);
  }

  private ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  private shouldAudit(request: AccessRequest): boolean {
    // Always audit sensitive resources
    if (request.resource.sensitivity === 'restricted' ||
        request.resource.sensitivity === 'confidential') {
      return true;
    }

    // Audit admin and delete actions
    if (request.action === 'admin' || request.action === 'delete') {
      return true;
    }

    // Audit production environment
    if (request.context.environment === 'production') {
      return true;
    }

    return false;
  }

  // ==========================================
  // BUILT-IN ROLES
  // ==========================================

  private initializeBuiltInRoles(): void {
    const now = new Date().toISOString();

    // Admin role
    this.registerRole({
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access',
      permissions: [
        { resource: 'tool', actions: ['read', 'write', 'execute', 'delete', 'admin'] },
        { resource: 'server', actions: ['read', 'write', 'execute', 'delete', 'admin'] },
        { resource: 'tenant', actions: ['read', 'write', 'delete', 'admin'] },
        { resource: 'session', actions: ['read', 'write', 'delete', 'admin'] },
        { resource: 'secret', actions: ['read', 'write', 'delete', 'admin'] },
        { resource: 'config', actions: ['read', 'write', 'admin'] },
        { resource: 'audit', actions: ['read', 'admin'] },
        { resource: 'policy', actions: ['read', 'write', 'delete', 'admin'] },
      ],
      constraints: [
        { type: 'mfa', value: 'required' },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // Operator role
    this.registerRole({
      id: 'operator',
      name: 'Operator',
      description: 'Operational access',
      permissions: [
        { resource: 'tool', actions: ['read', 'execute'] },
        { resource: 'server', actions: ['read', 'execute'] },
        { resource: 'session', actions: ['read'] },
        { resource: 'audit', actions: ['read'] },
      ],
      inherits: ['viewer'],
      createdAt: now,
      updatedAt: now,
    });

    // Viewer role
    this.registerRole({
      id: 'viewer',
      name: 'Viewer',
      description: 'Read-only access',
      permissions: [
        { resource: 'tool', actions: ['read'] },
        { resource: 'server', actions: ['read'] },
        { resource: 'config', actions: ['read'] },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // Service role
    this.registerRole({
      id: 'service',
      name: 'Service Account',
      description: 'Automated service access',
      permissions: [
        { resource: 'tool', actions: ['read', 'execute'] },
        { resource: 'server', actions: ['read', 'execute'] },
        { resource: 'secret', actions: ['read'] },
      ],
      createdAt: now,
      updatedAt: now,
    });
  }
}

// Export singleton for convenience
export const accessControl = new AccessControlEngine();
