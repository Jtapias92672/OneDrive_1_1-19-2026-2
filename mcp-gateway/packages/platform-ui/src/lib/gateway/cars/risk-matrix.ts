/**
 * MCP Security Gateway - CARS Risk Matrix
 *
 * @epic 3.5 - Gateway Foundation
 * @task 3.5.2.1 - Define CARS risk levels and matrix
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Tool risk matrix for the CARS framework.
 *   Maps tool names to their inherent risk levels.
 *   Unknown tools default to CRITICAL for safety.
 */

import { CARSRiskLevel } from './risk-levels';

// ============================================
// TOOL RISK MATRIX
// ============================================

/**
 * Risk levels for known tools
 *
 * Categories:
 * - MINIMAL: Read-only metadata, no side effects
 * - LOW: Read-only data access
 * - MEDIUM: Limited writes, reversible
 * - HIGH: Significant side effects
 * - CRITICAL: System-level, irreversible
 */
export const TOOL_RISK_MATRIX: Record<string, CARSRiskLevel> = {
  // ==========================================
  // FILESYSTEM OPERATIONS
  // ==========================================

  /** List directory contents - read-only */
  'filesystem_list': CARSRiskLevel.LOW,

  /** Read file contents - read-only */
  'filesystem_read': CARSRiskLevel.LOW,

  /** Get file metadata - read-only */
  'filesystem_stat': CARSRiskLevel.MINIMAL,

  /** Write to file - significant impact */
  'filesystem_write': CARSRiskLevel.HIGH,

  /** Delete file - critical, irreversible */
  'filesystem_delete': CARSRiskLevel.CRITICAL,

  /** Create directory - medium impact */
  'filesystem_mkdir': CARSRiskLevel.MEDIUM,

  /** Move/rename file - high impact */
  'filesystem_move': CARSRiskLevel.HIGH,

  // ==========================================
  // FORGE OPERATIONS
  // ==========================================

  /** Run convergence session */
  'forge_converge': CARSRiskLevel.MEDIUM,

  /** Generate code */
  'forge_generate': CARSRiskLevel.MEDIUM,

  /** Validate against contract - read-only */
  'forge_validate': CARSRiskLevel.LOW,

  /** Get session metrics - read-only */
  'forge_get_metrics': CARSRiskLevel.MINIMAL,

  /** Parse Figma design - read-only */
  'forge_parse_figma': CARSRiskLevel.LOW,

  /** Generate React components */
  'forge_generate_react': CARSRiskLevel.MEDIUM,

  /** Generate Mendix pages */
  'forge_generate_mendix': CARSRiskLevel.MEDIUM,

  /** Create evidence pack - write operation */
  'forge_create_evidence': CARSRiskLevel.MEDIUM,

  // ==========================================
  // ANSWER CONTRACT OPERATIONS
  // ==========================================

  /** Validate answer contract - read-only */
  'answer_contract_validate': CARSRiskLevel.LOW,

  /** Create answer contract */
  'answer_contract_create': CARSRiskLevel.MEDIUM,

  /** Get contract schema - read-only */
  'answer_contract_schema': CARSRiskLevel.MINIMAL,

  // ==========================================
  // EVIDENCE PACK OPERATIONS
  // ==========================================

  /** Create evidence pack */
  'evidence_pack_create': CARSRiskLevel.MEDIUM,

  /** Query evidence - read-only */
  'evidence_pack_query': CARSRiskLevel.LOW,

  /** Export evidence */
  'evidence_pack_export': CARSRiskLevel.MEDIUM,

  // ==========================================
  // EXTERNAL INTEGRATIONS
  // ==========================================

  /** Create Jira epic */
  'jira_create_epic': CARSRiskLevel.MEDIUM,

  /** Update Jira issue */
  'jira_update_issue': CARSRiskLevel.MEDIUM,

  /** Query Jira - read-only */
  'jira_query': CARSRiskLevel.LOW,

  /** GitHub push - critical */
  'github_push': CARSRiskLevel.CRITICAL,

  /** GitHub commit - high */
  'github_commit': CARSRiskLevel.HIGH,

  /** GitHub create PR */
  'github_create_pr': CARSRiskLevel.HIGH,

  /** GitHub read - read-only */
  'github_read': CARSRiskLevel.LOW,

  /** Post Slack message */
  'slack_post_message': CARSRiskLevel.LOW,

  /** Send email */
  'email_send': CARSRiskLevel.MEDIUM,

  // ==========================================
  // DATABASE OPERATIONS
  // ==========================================

  /** Database query - read-only */
  'database_query': CARSRiskLevel.LOW,

  /** Database insert */
  'database_insert': CARSRiskLevel.MEDIUM,

  /** Database update */
  'database_update': CARSRiskLevel.HIGH,

  /** Database delete */
  'database_delete': CARSRiskLevel.CRITICAL,

  /** Database schema change */
  'database_migrate': CARSRiskLevel.CRITICAL,

  // ==========================================
  // NETWORK OPERATIONS
  // ==========================================

  /** HTTP GET request */
  'http_get': CARSRiskLevel.LOW,

  /** HTTP POST request */
  'http_post': CARSRiskLevel.MEDIUM,

  /** HTTP PUT request */
  'http_put': CARSRiskLevel.MEDIUM,

  /** HTTP DELETE request */
  'http_delete': CARSRiskLevel.HIGH,

  // ==========================================
  // SYSTEM OPERATIONS
  // ==========================================

  /** Execute shell command */
  'shell_execute': CARSRiskLevel.CRITICAL,

  /** Read environment variable */
  'env_read': CARSRiskLevel.MEDIUM,

  /** Set environment variable */
  'env_set': CARSRiskLevel.HIGH,

  /** Read secret */
  'secrets_read': CARSRiskLevel.HIGH,

  /** Write secret */
  'secrets_write': CARSRiskLevel.CRITICAL,

  // ==========================================
  // LLM OPERATIONS
  // ==========================================

  /** Invoke LLM */
  'llm_invoke': CARSRiskLevel.MEDIUM,

  /** LLM completion */
  'llm_complete': CARSRiskLevel.MEDIUM,

  /** LLM embedding - read-only */
  'llm_embed': CARSRiskLevel.LOW,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get risk level for a tool
 * Unknown tools default to CRITICAL for safety
 */
export function getToolRisk(toolName: string): CARSRiskLevel {
  return TOOL_RISK_MATRIX[toolName] ?? CARSRiskLevel.CRITICAL;
}

/**
 * Check if a tool is known in the matrix
 */
export function isKnownTool(toolName: string): boolean {
  return toolName in TOOL_RISK_MATRIX;
}

/**
 * Get all tools at a specific risk level
 */
export function getToolsAtRiskLevel(level: CARSRiskLevel): string[] {
  return Object.entries(TOOL_RISK_MATRIX)
    .filter(([_, riskLevel]) => riskLevel === level)
    .map(([toolName, _]) => toolName);
}

/**
 * Get all tools at or above a risk level
 */
export function getToolsAtOrAboveRiskLevel(level: CARSRiskLevel): string[] {
  return Object.entries(TOOL_RISK_MATRIX)
    .filter(([_, riskLevel]) => riskLevel >= level)
    .map(([toolName, _]) => toolName);
}

/**
 * Register a new tool in the risk matrix
 * Returns true if added, false if already exists
 */
export function registerToolRisk(
  toolName: string,
  riskLevel: CARSRiskLevel
): boolean {
  if (toolName in TOOL_RISK_MATRIX) {
    return false;
  }
  TOOL_RISK_MATRIX[toolName] = riskLevel;
  return true;
}

/**
 * Update risk level for an existing tool
 * Returns true if updated, false if tool doesn't exist
 */
export function updateToolRisk(
  toolName: string,
  riskLevel: CARSRiskLevel
): boolean {
  if (!(toolName in TOOL_RISK_MATRIX)) {
    return false;
  }
  TOOL_RISK_MATRIX[toolName] = riskLevel;
  return true;
}

/**
 * Get risk matrix statistics
 */
export function getRiskMatrixStats(): Record<CARSRiskLevel, number> {
  const stats: Record<CARSRiskLevel, number> = {
    [CARSRiskLevel.MINIMAL]: 0,
    [CARSRiskLevel.LOW]: 0,
    [CARSRiskLevel.MEDIUM]: 0,
    [CARSRiskLevel.HIGH]: 0,
    [CARSRiskLevel.CRITICAL]: 0,
  };

  for (const level of Object.values(TOOL_RISK_MATRIX)) {
    stats[level]++;
  }

  return stats;
}

// ============================================
// EXPORTS
// ============================================

export default TOOL_RISK_MATRIX;
