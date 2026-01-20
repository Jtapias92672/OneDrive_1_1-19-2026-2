/**
 * FORGE Template Registry
 * 
 * @epic 02 - Answer Contract
 * @task 4.1 - Template Registry
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Registry for managing Answer Contract templates.
 *   Supports built-in templates and custom template registration.
 */

import { AnswerContract, TemplateInfo } from '../schema/types';
import { parseYamlContract, substituteVariables } from '../parser/parser';

// ============================================
// BUILT-IN TEMPLATES (YAML STRINGS)
// ============================================

const CMMC_DASHBOARD_TEMPLATE = `
id: cmmc-dashboard-v1
version: "1.0.0"
name: CMMC Compliance Dashboard
description: Full-stack contract for generating a CMMC compliance tracking dashboard

output:
  type: object
  required:
    - domains
    - practices
    - assessmentStatus
    - complianceScore
  properties:
    domains:
      type: array
      minItems: 1
      items:
        type: object
        required: [id, name, level, practices]
        properties:
          id:
            type: string
            pattern: "^[A-Z]{2}$"
          name:
            type: string
          level:
            type: integer
            minimum: 1
            maximum: 5
          practices:
            type: array
            items:
              type: string
    practices:
      type: array
      items:
        type: object
        required: [id, description, status]
        properties:
          id:
            type: string
            pattern: "^[A-Z]{2}\\\\.L\\\\d-\\\\d{3}$"
          description:
            type: string
          status:
            type: string
            enum: [not_started, in_progress, implemented, assessed]
          evidence:
            type: array
            items:
              type: string
    assessmentStatus:
      type: object
      required: [lastAssessment, nextAssessment, overallStatus]
      properties:
        lastAssessment:
          type: string
          format: date
        nextAssessment:
          type: string
          format: date
        overallStatus:
          type: string
          enum: [not_started, in_progress, ready_for_assessment, certified]
    complianceScore:
      type: number
      minimum: 0
      maximum: 100

validators:
  - type: json_schema
    strict: true
  - type: computational
    categories: [statistical]
  - type: llm_judge
    criteria: "Is this CMMC compliance data complete, accurate, and professionally formatted?"

stoppingPolicy:
  maxIterations: 5
  minScore: 0.95
  targetPassRate: 1.0
  failFastOnCritical: true
  tokenBudget: 50000

convergence:
  strategy: prioritized
  feedbackFormat: structured
  includePreviousAttempts: true

frontend:
  framework: react
  styling: tailwind
  typescript: true
  components:
    - name: DomainCard
      type: molecule
      props:
        domain:
          type: object
      accessibility:
        ariaLabel: "CMMC Domain compliance status"
    - name: PracticeTable
      type: organism
      props:
        practices:
          type: array
    - name: ComplianceGauge
      type: atom
      props:
        score:
          type: number
  pages:
    - path: /dashboard
      name: Dashboard
      components: [ComplianceGauge, DomainCard, PracticeTable]
      auth: true
      roles: [admin, auditor, user]

backend:
  framework: express
  language: typescript
  database: postgresql
  endpoints:
    - path: /api/domains
      method: GET
      auth: true
      roles: [admin, auditor, user]
    - path: /api/domains/:id
      method: GET
      auth: true
      roles: [admin, auditor, user]
    - path: /api/practices
      method: GET
      auth: true
      roles: [admin, auditor, user]
    - path: /api/practices/:id
      method: PUT
      auth: true
      roles: [admin]
    - path: /api/assessment
      method: GET
      auth: true
      roles: [admin, auditor]
    - path: /api/assessment
      method: POST
      auth: true
      roles: [admin]
  dataModels:
    - name: Domain
      fields:
        - name: id
          type: uuid
          primaryKey: true
        - name: code
          type: string
          required: true
          unique: true
        - name: name
          type: string
          required: true
        - name: level
          type: number
          required: true
    - name: Practice
      fields:
        - name: id
          type: uuid
          primaryKey: true
        - name: practiceId
          type: string
          required: true
          unique: true
        - name: description
          type: text
          required: true
        - name: status
          type: string
          required: true
        - name: domainId
          type: uuid
          references: Domain.id
      relations:
        - name: domain
          type: many-to-one
          target: Domain
          foreignKey: domainId
    - name: Assessment
      fields:
        - name: id
          type: uuid
          primaryKey: true
        - name: assessmentDate
          type: date
          required: true
        - name: status
          type: string
          required: true
        - name: score
          type: number
  rbac:
    roles:
      - name: admin
        permissions: [read, write, delete, assess]
      - name: auditor
        permissions: [read, assess]
      - name: user
        permissions: [read]
    defaultRole: user

metadata:
  author: ArcFoundry
  tags: [cmmc, compliance, defense, dashboard]
`;

const ECR_TEMPLATE = `
id: ecr-contract-v1
version: "1.0.0"
name: Engineering Change Request
description: Contract for generating compliant Engineering Change Request documents

output:
  type: object
  required:
    - ecrNumber
    - title
    - description
    - impactAnalysis
    - approvals
  properties:
    ecrNumber:
      type: string
      pattern: "^ECR-\\\\d{4}-\\\\d{3}$"
    title:
      type: string
      minLength: 10
      maxLength: 200
    description:
      type: object
      required: [problemStatement, proposedSolution, alternativesConsidered]
      properties:
        problemStatement:
          type: string
          minLength: 50
        proposedSolution:
          type: string
          minLength: 100
        alternativesConsidered:
          type: array
          minItems: 1
          items:
            type: object
            required: [alternative, reason]
            properties:
              alternative:
                type: string
              reason:
                type: string
    impactAnalysis:
      type: object
      required: [technical, schedule, cost, safety]
      properties:
        technical:
          type: array
          minItems: 1
          items:
            type: string
        schedule:
          type: string
          enum: [none, minor, moderate, major, critical]
        cost:
          type: number
          minimum: 0
        safety:
          type: boolean
    approvals:
      type: array
      minItems: 2
      items:
        type: object
        required: [role, name, status]
        properties:
          role:
            type: string
          name:
            type: string
          status:
            type: string
            enum: [pending, approved, rejected]
          date:
            type: string
            format: date
          comments:
            type: string

validators:
  - type: json_schema
    strict: true
  - type: regex
    field: ecrNumber
    pattern: "^ECR-\\\\d{4}-\\\\d{3}$"
    message: "ECR number must follow format ECR-YYYY-NNN"
  - type: computational
    categories: [financial]
  - type: llm_judge
    criteria: "Is this ECR complete, professionally written, and suitable for engineering review?"
    rubric:
      - Problem statement is clear and specific
      - Proposed solution addresses the problem
      - Alternatives were properly considered
      - Impact analysis is thorough
      - All required approvals are identified

stoppingPolicy:
  maxIterations: 5
  minScore: 0.9
  targetPassRate: 1.0
  failFastOnCritical: true
  tokenBudget: 30000

convergence:
  strategy: prioritized
  feedbackFormat: natural
  includePreviousAttempts: true

metadata:
  author: ArcFoundry
  tags: [ecr, engineering, change-management, defense]
`;

const CRUD_API_TEMPLATE = `
id: crud-api-v1
version: "1.0.0"
name: CRUD API Generator
description: Contract for generating standard CRUD REST APIs

output:
  type: object
  required:
    - endpoints
    - models
    - validation
  properties:
    endpoints:
      type: array
      minItems: 4
      items:
        type: object
        required: [method, path, handler]
        properties:
          method:
            type: string
            enum: [GET, POST, PUT, PATCH, DELETE]
          path:
            type: string
            pattern: "^/"
          handler:
            type: string
          auth:
            type: boolean
          validation:
            type: object
    models:
      type: array
      minItems: 1
      items:
        type: object
        required: [name, fields]
        properties:
          name:
            type: string
          fields:
            type: array
            items:
              type: object
              required: [name, type]
    validation:
      type: object
      required: [enabled]
      properties:
        enabled:
          type: boolean
        library:
          type: string
          enum: [zod, joi, yup]

validators:
  - type: json_schema
    strict: true
  - type: custom
    name: crud_completeness
    function: validateCrudCompleteness

stoppingPolicy:
  maxIterations: 3
  minScore: 0.95
  tokenBudget: 20000

convergence:
  strategy: greedy
  feedbackFormat: structured

backend:
  framework: express
  language: typescript
  database: postgresql

metadata:
  author: ArcFoundry
  tags: [crud, api, rest, backend]
`;

const ADMIN_DASHBOARD_TEMPLATE = `
id: admin-dashboard-v1
version: "1.0.0"
name: Admin Dashboard
description: Contract for generating administrative dashboard interfaces

output:
  type: object
  required:
    - users
    - metrics
    - actions
  properties:
    users:
      type: object
      required: [list, create, update, delete]
      properties:
        list:
          type: object
          required: [endpoint, columns]
        create:
          type: object
          required: [endpoint, fields]
        update:
          type: object
          required: [endpoint, fields]
        delete:
          type: object
          required: [endpoint, confirmation]
    metrics:
      type: array
      minItems: 3
      items:
        type: object
        required: [name, type, endpoint]
        properties:
          name:
            type: string
          type:
            type: string
            enum: [counter, gauge, chart, table]
          endpoint:
            type: string
    actions:
      type: array
      items:
        type: object
        required: [name, endpoint, method]
        properties:
          name:
            type: string
          endpoint:
            type: string
          method:
            type: string
            enum: [GET, POST, PUT, DELETE]
          confirmation:
            type: boolean

validators:
  - type: json_schema
    strict: true
  - type: llm_judge
    criteria: "Is this admin dashboard specification complete and user-friendly?"

stoppingPolicy:
  maxIterations: 4
  minScore: 0.9
  tokenBudget: 25000

frontend:
  framework: react
  styling: tailwind
  typescript: true

backend:
  framework: express
  language: typescript
  database: postgresql
  rbac:
    roles:
      - name: super_admin
        permissions: [all]
      - name: admin
        permissions: [read, write]
      - name: viewer
        permissions: [read]

metadata:
  author: ArcFoundry
  tags: [admin, dashboard, management, ui]
`;

// ============================================
// TEMPLATE REGISTRY
// ============================================

export class TemplateRegistry {
  private templates = new Map<string, AnswerContract>();
  private templateInfo = new Map<string, TemplateInfo>();

  constructor() {
    this.loadBuiltInTemplates();
  }

  /**
   * Load all built-in templates
   */
  private loadBuiltInTemplates(): void {
    const builtIns = [
      { yaml: CMMC_DASHBOARD_TEMPLATE, category: 'defense' },
      { yaml: ECR_TEMPLATE, category: 'defense' },
      { yaml: CRUD_API_TEMPLATE, category: 'development' },
      { yaml: ADMIN_DASHBOARD_TEMPLATE, category: 'development' },
    ];
    
    for (const { yaml, category } of builtIns) {
      const result = parseYamlContract(yaml);
      if (result.success && result.contract) {
        this.registerInternal(result.contract, category);
      } else {
        console.warn(`[TemplateRegistry] Failed to load built-in template:`, result.errors);
      }
    }
  }

  /**
   * Internal registration
   */
  private registerInternal(contract: AnswerContract, category: string): void {
    this.templates.set(contract.id, contract);
    this.templateInfo.set(contract.id, {
      id: contract.id,
      name: contract.name,
      description: contract.description,
      category,
      tags: contract.metadata?.tags || [],
      variables: contract.variables ? Object.keys(contract.variables) : [],
    });
  }

  /**
   * Register a custom template
   */
  register(contract: AnswerContract, category: string = 'custom'): void {
    this.registerInternal(contract, category);
  }

  /**
   * Register from YAML string
   */
  registerYaml(yamlString: string, category: string = 'custom'): boolean {
    const result = parseYamlContract(yamlString);
    if (result.success && result.contract) {
      this.registerInternal(result.contract, category);
      return true;
    }
    return false;
  }

  /**
   * Get a template by ID
   */
  get(id: string): AnswerContract | undefined {
    return this.templates.get(id);
  }

  /**
   * Get a template with variables substituted
   */
  getWithVariables(id: string, variables: Record<string, unknown>): AnswerContract | undefined {
    const template = this.templates.get(id);
    if (!template) return undefined;
    
    return substituteVariables(template, variables);
  }

  /**
   * Get a copy of a template (safe to modify)
   */
  getCopy(id: string): AnswerContract | undefined {
    const template = this.templates.get(id);
    if (!template) return undefined;
    
    return JSON.parse(JSON.stringify(template));
  }

  /**
   * Check if template exists
   */
  has(id: string): boolean {
    return this.templates.has(id);
  }

  /**
   * Get template info
   */
  getInfo(id: string): TemplateInfo | undefined {
    return this.templateInfo.get(id);
  }

  /**
   * List all template IDs
   */
  list(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * List all templates with info
   */
  listTemplates(): TemplateInfo[] {
    return Array.from(this.templateInfo.values());
  }

  /**
   * List templates by category
   */
  listByCategory(category: string): TemplateInfo[] {
    return this.listTemplates().filter(t => t.category === category);
  }

  /**
   * List templates by tag
   */
  listByTag(tag: string): TemplateInfo[] {
    return this.listTemplates().filter(t => t.tags.includes(tag));
  }

  /**
   * Search templates
   */
  search(query: string): TemplateInfo[] {
    const lowerQuery = query.toLowerCase();
    return this.listTemplates().filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description?.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const info of this.templateInfo.values()) {
      categories.add(info.category);
    }
    return Array.from(categories);
  }

  /**
   * Get all tags
   */
  getTags(): string[] {
    const tags = new Set<string>();
    for (const info of this.templateInfo.values()) {
      for (const tag of info.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags);
  }

  /**
   * Remove a template
   */
  remove(id: string): boolean {
    const existed = this.templates.has(id);
    this.templates.delete(id);
    this.templateInfo.delete(id);
    return existed;
  }

  /**
   * Clear all templates
   */
  clear(): void {
    this.templates.clear();
    this.templateInfo.clear();
  }

  /**
   * Reload built-in templates
   */
  reloadBuiltIns(): void {
    this.loadBuiltInTemplates();
  }
}

// ============================================
// SINGLETON
// ============================================

let defaultRegistry: TemplateRegistry | null = null;

export function getTemplateRegistry(): TemplateRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new TemplateRegistry();
  }
  return defaultRegistry;
}

// ============================================
// EXPORTS
// ============================================

export default TemplateRegistry;
