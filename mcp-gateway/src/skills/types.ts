/**
 * FORGE MCP Gateway - Skills Types
 *
 * Type definitions for ArcFoundry skill libraries integration.
 */

// ============================================
// SKILL ENUMS
// ============================================

export enum SkillCategory {
  AGENT = 'agent',
  ARCHITECTURE = 'architecture',
  COMPLIANCE = 'compliance',
  DATA = 'data',
  DEVELOPMENT = 'development',
  GOVERNANCE = 'governance',
  INFRASTRUCTURE = 'infrastructure',
  MEMORY = 'memory',
  UI = 'ui',
  VERIFICATION = 'verification',
}

export enum RiskLevel {
  L1_MINIMAL = 'L1_MINIMAL',
  L2_LOW = 'L2_LOW',
  L3_MEDIUM = 'L3_MEDIUM',
  L4_HIGH = 'L4_HIGH',
  L5_CRITICAL = 'L5_CRITICAL',
}

// ============================================
// SKILL INTERFACES
// ============================================

export interface SkillReference {
  filename: string;
  path: string;
  content: string;
  category: string;
  size: number;
  lastModified?: Date;
}

export interface SkillScript {
  name: string;
  path: string;
  description?: string;
  entryPoint?: string;
}

export interface SkillMetadata {
  version?: string;
  author?: string;
  license?: string;
  repository?: string;
  tags?: string[];
  dependencies?: string[];
}

export interface Skill {
  name: string;
  displayName: string;
  description: string;
  category: SkillCategory;
  references: SkillReference[];
  scripts: SkillScript[];
  metadata: SkillMetadata;
  riskLevel: RiskLevel;
  useCases: string[];
  relatedSkills: string[];
  loadedAt: Date;
}

export interface SkillSummary {
  name: string;
  displayName: string;
  description: string;
  category: SkillCategory;
  riskLevel: RiskLevel;
  referenceCount: number;
  scriptCount: number;
}

export interface SkillRecommendation {
  skill: SkillSummary;
  confidence: number;
  reason: string;
  relatedSkills: string[];
}

export interface SkillSearchOptions {
  category?: SkillCategory;
  riskLevel?: RiskLevel;
  query?: string;
  tags?: string[];
}

// ============================================
// SKILL REGISTRY CONFIG
// ============================================

export interface SkillConfig {
  name: string;
  displayName: string;
  description: string;
  category: SkillCategory;
  riskLevel: RiskLevel;
  useCases: string[];
  relatedSkills: string[];
  keywords: string[];
}

export const SKILL_CONFIGS: Record<string, SkillConfig> = {
  'agent-patterns-library': {
    name: 'agent-patterns-library',
    displayName: 'Agent Patterns Library',
    description: 'Agent orchestration, context chaining, multi-agent coordination patterns',
    category: SkillCategory.AGENT,
    riskLevel: RiskLevel.L2_LOW,
    useCases: [
      'multi-agent orchestration',
      'context chaining',
      'agent coordination',
      'workflow automation',
      'task delegation',
    ],
    relatedSkills: ['memory-architecture-library', 'infrastructure-library'],
    keywords: ['agent', 'orchestration', 'coordination', 'multi-agent', 'workflow'],
  },
  'arcfoundry-skill-library': {
    name: 'arcfoundry-skill-library',
    displayName: 'ArcFoundry Skill Library',
    description: 'Three Truths, CARS framework, architecture hub, drift tracking',
    category: SkillCategory.ARCHITECTURE,
    riskLevel: RiskLevel.L1_MINIMAL,
    useCases: [
      'architecture validation',
      'CARS risk assessment',
      'drift detection',
      'truth maintenance',
      'system design',
    ],
    relatedSkills: ['verification-quality-library', 'compliance-security-library'],
    keywords: ['architecture', 'CARS', 'drift', 'three truths', 'validation'],
  },
  'compliance-security-library': {
    name: 'compliance-security-library',
    displayName: 'Compliance & Security Library',
    description: 'Audit prompts, AI attribution, DCMA/DFARS/SOC2/CMMC compliance',
    category: SkillCategory.COMPLIANCE,
    riskLevel: RiskLevel.L1_MINIMAL,
    useCases: [
      'compliance auditing',
      'security assessment',
      'AI attribution tracking',
      'regulatory compliance',
      'audit trail generation',
      'DCMA compliance audit',
      'DFARS compliance audit',
      'SOC2 compliance audit',
      'CMMC compliance audit',
    ],
    relatedSkills: ['verification-quality-library', 'genbi-governance-library'],
    keywords: ['compliance', 'security', 'audit', 'DCMA', 'DFARS', 'SOC2', 'CMMC', 'attribution', 'regulatory', 'defense contract', 'federal'],
  },
  'data-analytics-library': {
    name: 'data-analytics-library',
    displayName: 'Data Analytics Library',
    description: 'Data lake governance, connector factory, analytics orchestration',
    category: SkillCategory.DATA,
    riskLevel: RiskLevel.L3_MEDIUM,
    useCases: [
      'data lake design',
      'analytics pipeline',
      'connector development',
      'data governance',
      'ETL orchestration',
    ],
    relatedSkills: ['infrastructure-library', 'genbi-governance-library'],
    keywords: ['data', 'analytics', 'lake', 'connector', 'ETL', 'pipeline'],
  },
  'development-practices-library': {
    name: 'development-practices-library',
    displayName: 'Development Practices Library',
    description: 'ARCH.md standard, coding patterns, AI tool usage best practices',
    category: SkillCategory.DEVELOPMENT,
    riskLevel: RiskLevel.L2_LOW,
    useCases: [
      'code generation',
      'architecture documentation',
      'coding standards',
      'AI-assisted development',
      'best practices',
    ],
    relatedSkills: ['arcfoundry-skill-library', 'verification-quality-library'],
    keywords: ['development', 'coding', 'ARCH.md', 'patterns', 'standards', 'AI tools'],
  },
  'genbi-governance-library': {
    name: 'genbi-governance-library',
    displayName: 'GenBI Governance Library',
    description: 'Trust tiers (Crawl/Walk/Run), asset certification, evidence binding',
    category: SkillCategory.GOVERNANCE,
    riskLevel: RiskLevel.L2_LOW,
    useCases: [
      'trust tier management',
      'asset certification',
      'evidence binding',
      'governance workflows',
      'maturity assessment',
    ],
    relatedSkills: ['compliance-security-library', 'verification-quality-library'],
    keywords: ['governance', 'trust', 'certification', 'evidence', 'GenBI', 'crawl walk run'],
  },
  'infrastructure-library': {
    name: 'infrastructure-library',
    displayName: 'Infrastructure Library',
    description: 'Mendix SDK, MCP server, long-running agent harness',
    category: SkillCategory.INFRASTRUCTURE,
    riskLevel: RiskLevel.L3_MEDIUM,
    useCases: [
      'Mendix integration',
      'MCP server setup',
      'agent harness deployment',
      'infrastructure automation',
      'platform engineering',
      'MCP server deployment',
      'long-running agent harness',
      'SDK integration',
    ],
    relatedSkills: ['agent-patterns-library', 'data-analytics-library'],
    keywords: ['infrastructure', 'Mendix', 'MCP', 'harness', 'deployment', 'platform', 'MCP server', 'long-running agent', 'SDK integration', 'Mendix SDK'],
  },
  'memory-architecture-library': {
    name: 'memory-architecture-library',
    displayName: 'Memory Architecture Library',
    description: '4-layer memory (A/B/C/D), context compaction, active retrieval',
    category: SkillCategory.MEMORY,
    riskLevel: RiskLevel.L2_LOW,
    useCases: [
      'context management',
      'memory optimization',
      'retrieval augmentation',
      'knowledge persistence',
      'context compaction',
      'context memory management',
      'session persistence',
      '4-layer memory',
    ],
    relatedSkills: ['agent-patterns-library', 'ui-governance-library'],
    keywords: ['memory', 'context', 'retrieval', 'ABCD', 'compaction', 'RAG', 'context memory', 'context management', '4-layer', 'A/B/C/D', 'session', 'persistence'],
  },
  'ui-governance-library': {
    name: 'ui-governance-library',
    displayName: 'UI Governance Library',
    description: 'Component-level access control, AI consumer interfaces',
    category: SkillCategory.UI,
    riskLevel: RiskLevel.L2_LOW,
    useCases: [
      'UI access control',
      'component governance',
      'AI interface design',
      'consumer experience',
      'permission management',
    ],
    relatedSkills: ['genbi-governance-library', 'memory-architecture-library'],
    keywords: ['UI', 'governance', 'access control', 'components', 'interface', 'permissions'],
  },
  'verification-quality-library': {
    name: 'verification-quality-library',
    displayName: 'Verification & Quality Library',
    description: 'Expected output protocol, human review gates, slop tests',
    category: SkillCategory.VERIFICATION,
    riskLevel: RiskLevel.L1_MINIMAL,
    useCases: [
      'output verification',
      'quality assurance',
      'human review workflows',
      'slop detection',
      'expected output testing',
    ],
    relatedSkills: ['compliance-security-library', 'arcfoundry-skill-library'],
    keywords: ['verification', 'quality', 'review', 'testing', 'slop', 'expected output'],
  },
};

export const SKILL_NAMES = Object.keys(SKILL_CONFIGS);
