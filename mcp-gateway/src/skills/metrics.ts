/**
 * FORGE MCP Gateway - Skills Metrics
 *
 * Prometheus metrics for skill usage tracking.
 */

import * as client from 'prom-client';

// ============================================
// SKILLS METRICS
// ============================================

export const skillsLoadedTotal = new client.Counter({
  name: 'forge_skills_loaded_total',
  help: 'Total number of skills loaded',
  labelNames: ['skill_name'],
});

export const skillsReferencedTotal = new client.Counter({
  name: 'forge_skills_referenced_total',
  help: 'Total number of skill reference accesses',
  labelNames: ['skill_name', 'reference'],
});

export const skillsRecommendedTotal = new client.Counter({
  name: 'forge_skills_recommended_total',
  help: 'Total number of skill recommendations made',
  labelNames: ['skill_name'],
});

export const skillsActiveGauge = new client.Gauge({
  name: 'forge_skills_active',
  help: 'Number of currently loaded skills',
});

export const skillReferencesGauge = new client.Gauge({
  name: 'forge_skill_references',
  help: 'Number of references per skill',
  labelNames: ['skill_name'],
});

// ============================================
// METRIC RECORDING HELPERS
// ============================================

/**
 * Record skill loaded
 */
export function recordSkillLoaded(skillName: string): void {
  skillsLoadedTotal.inc({ skill_name: skillName });
  skillsActiveGauge.inc();
}

/**
 * Record skill reference accessed
 */
export function recordSkillReferenced(skillName: string, reference: string): void {
  skillsReferencedTotal.inc({ skill_name: skillName, reference });
}

/**
 * Record skill recommended
 */
export function recordSkillRecommended(skillName: string): void {
  skillsRecommendedTotal.inc({ skill_name: skillName });
}

/**
 * Update skill references gauge
 */
export function updateSkillReferencesGauge(skillName: string, count: number): void {
  skillReferencesGauge.set({ skill_name: skillName }, count);
}
