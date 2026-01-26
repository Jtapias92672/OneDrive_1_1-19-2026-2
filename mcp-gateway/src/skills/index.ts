/**
 * FORGE MCP Gateway - Skills Module
 *
 * ArcFoundry skill libraries integration.
 */

// Types
export {
  SkillCategory,
  RiskLevel,
  type Skill,
  type SkillSummary,
  type SkillReference,
  type SkillScript,
  type SkillMetadata,
  type SkillRecommendation,
  type SkillSearchOptions,
  SKILL_CONFIGS,
  SKILL_NAMES,
} from './types.js';

// Registry
export { SkillRegistry } from './registry.js';

// Loader
export { skillLoader, SkillLoader } from './loader.js';

// Matcher
export {
  SkillMatcher,
  buildRecommendations,
  getSkillMatcher,
  SCORING_WEIGHTS,
  SYNONYMS,
  CATEGORY_KEYWORDS,
  type MatchResult,
  type MatchReason,
  type MatchType,
  type ScoreBreakdown,
} from './matcher.js';

// Metrics
export {
  skillsLoadedTotal,
  skillsReferencedTotal,
  skillsRecommendedTotal,
  skillsActiveGauge,
  skillReferencesGauge,
  recordSkillLoaded,
  recordSkillReferenced,
  recordSkillRecommended,
  updateSkillReferencesGauge,
} from './metrics.js';
