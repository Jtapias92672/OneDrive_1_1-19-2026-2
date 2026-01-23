/**
 * FORGE MCP Gateway - Skills Registry
 *
 * Central registry for managing skill libraries.
 */

import {
  Skill,
  SkillSummary,
  SkillReference,
  SkillRecommendation,
  SkillSearchOptions,
  SkillCategory,
  RiskLevel,
  SKILL_CONFIGS,
  SKILL_NAMES,
} from './types.js';
import { skillLoader } from './loader.js';
import { recordSkillLoaded, recordSkillReferenced, recordSkillRecommended } from './metrics.js';
import { SkillMatcher, buildRecommendations } from './matcher.js';

// ============================================
// SKILL REGISTRY CLASS
// ============================================

class SkillRegistryImpl {
  private skills: Map<string, Skill> = new Map();
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private matcher: SkillMatcher;

  constructor() {
    this.matcher = new SkillMatcher(SKILL_CONFIGS, this.skills);
  }

  /**
   * Initialize the registry by loading all skills
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    console.log('Initializing Skills Registry...');

    const loadedSkills = await skillLoader.loadAllSkills();

    for (const skill of loadedSkills) {
      this.skills.set(skill.name, skill);
      recordSkillLoaded(skill.name);
    }

    // Update matcher with loaded skills for reference content scanning
    this.matcher.updateLoadedSkills(this.skills);

    this.initialized = true;
    console.log(`Skills Registry initialized with ${this.skills.size} skills`);
  }

  /**
   * Load a skill by name
   */
  async loadSkill(name: string): Promise<Skill | null> {
    // Check if already loaded
    if (this.skills.has(name)) {
      return this.skills.get(name)!;
    }

    // Try to load
    const skill = await skillLoader.loadSkill(name);
    if (skill) {
      this.skills.set(name, skill);
      recordSkillLoaded(name);
    }

    return skill;
  }

  /**
   * Get a skill by name
   */
  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * Get skill references
   */
  async getSkillReferences(name: string): Promise<SkillReference[]> {
    const skill = await this.loadSkill(name);
    if (!skill) return [];

    // Record reference access
    for (const ref of skill.references) {
      recordSkillReferenced(name, ref.filename);
    }

    return skill.references;
  }

  /**
   * Get a specific reference from a skill
   */
  async getReference(skillName: string, filename: string): Promise<SkillReference | null> {
    const references = await this.getSkillReferences(skillName);
    const ref = references.find(r => r.filename === filename || r.path === filename);

    if (ref) {
      recordSkillReferenced(skillName, ref.filename);
    }

    return ref || null;
  }

  /**
   * List all available skills
   */
  listSkills(): SkillSummary[] {
    const summaries: SkillSummary[] = [];

    // Include loaded skills
    for (const skill of this.skills.values()) {
      summaries.push(this.toSummary(skill));
    }

    // Include configured but not loaded skills
    for (const name of SKILL_NAMES) {
      if (!this.skills.has(name)) {
        const config = SKILL_CONFIGS[name];
        if (config) {
          summaries.push({
            name: config.name,
            displayName: config.displayName,
            description: config.description,
            category: config.category,
            riskLevel: config.riskLevel,
            referenceCount: 0,
            scriptCount: 0,
          });
        }
      }
    }

    return summaries.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Search skills
   */
  searchSkills(options: SkillSearchOptions): SkillSummary[] {
    let skills = this.listSkills();

    if (options.category) {
      skills = skills.filter(s => s.category === options.category);
    }

    if (options.riskLevel) {
      skills = skills.filter(s => s.riskLevel === options.riskLevel);
    }

    if (options.query) {
      const query = options.query.toLowerCase();
      skills = skills.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.displayName.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }

    return skills;
  }

  /**
   * Get skill recommendation for a task using advanced semantic matching
   */
  getSkillForTask(taskDescription: string): SkillRecommendation[] {
    // Use the advanced matcher
    const matchResults = this.matcher.matchTask(taskDescription);

    // Build recommendations from match results
    const recommendations = buildRecommendations(
      matchResults,
      SKILL_CONFIGS,
      this.skills,
      5 // max results
    );

    // Record metrics for recommended skills
    for (const rec of recommendations) {
      recordSkillRecommended(rec.skill.name);
    }

    return recommendations;
  }

  /**
   * Get skills by category
   */
  getSkillsByCategory(category: SkillCategory): SkillSummary[] {
    return this.searchSkills({ category });
  }

  /**
   * Get skills by risk level
   */
  getSkillsByRiskLevel(riskLevel: RiskLevel): SkillSummary[] {
    return this.searchSkills({ riskLevel });
  }

  /**
   * Get related skills
   */
  getRelatedSkills(skillName: string): SkillSummary[] {
    const skill = this.skills.get(skillName);
    const config = SKILL_CONFIGS[skillName];

    const relatedNames = skill?.relatedSkills || config?.relatedSkills || [];
    return relatedNames
      .map(name => {
        const related = this.skills.get(name);
        if (related) return this.toSummary(related);
        const relatedConfig = SKILL_CONFIGS[name];
        if (relatedConfig) {
          return {
            name: relatedConfig.name,
            displayName: relatedConfig.displayName,
            description: relatedConfig.description,
            category: relatedConfig.category,
            riskLevel: relatedConfig.riskLevel,
            referenceCount: 0,
            scriptCount: 0,
          };
        }
        return null;
      })
      .filter((s): s is SkillSummary => s !== null);
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalSkills: number;
    loadedSkills: number;
    totalReferences: number;
    totalScripts: number;
    byCategory: Record<string, number>;
    byRiskLevel: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    const byRiskLevel: Record<string, number> = {};
    let totalReferences = 0;
    let totalScripts = 0;

    for (const skill of this.skills.values()) {
      byCategory[skill.category] = (byCategory[skill.category] || 0) + 1;
      byRiskLevel[skill.riskLevel] = (byRiskLevel[skill.riskLevel] || 0) + 1;
      totalReferences += skill.references.length;
      totalScripts += skill.scripts.length;
    }

    return {
      totalSkills: SKILL_NAMES.length,
      loadedSkills: this.skills.size,
      totalReferences,
      totalScripts,
      byCategory,
      byRiskLevel,
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private toSummary(skill: Skill): SkillSummary {
    return {
      name: skill.name,
      displayName: skill.displayName,
      description: skill.description,
      category: skill.category,
      riskLevel: skill.riskLevel,
      referenceCount: skill.references.length,
      scriptCount: skill.scripts.length,
    };
  }
}

// Singleton instance
export const SkillRegistry = new SkillRegistryImpl();
