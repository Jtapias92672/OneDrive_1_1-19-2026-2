/**
 * FORGE Evidence Packs Package
 * 
 * @epic 08 - Evidence Packs
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Comprehensive audit trail and compliance documentation for FORGE sessions.
 *   Collects evidence from convergence sessions, exports in multiple formats.
 */

// ============================================
// CORE EXPORTS
// ============================================

export {
  EvidencePack,
  PackMetadata,
  SessionEvidence,
  SessionStatus,
  ResourceUsage,
  ContractEvidence,
  ValidationRuleSummary,
  ValidationEvidence,
  ValidatorType,
  ValidationResult,
  ValidationFinding,
  FindingSeverity,
  EvidenceArtifact,
  ArtifactType,
  IterationEvidence,
  FeedbackSummary,
  OutputEvidence,
  QualityMetrics,
  ComplianceEvidence,
  ComplianceFramework,
  ControlResult,
  ComplianceStatus,
  Attestation,
  ComplianceException,
  AuditEntry,
  AuditEventType,
  DigitalSignature,
  ExportOptions,
  ExportFormat,
  ExportSection,
  CollectorOptions,
  DEFAULT_COLLECTOR_OPTIONS,
  DEFAULT_EXPORT_OPTIONS,
} from './core/types';

// ============================================
// COLLECTOR EXPORTS
// ============================================

export { EvidenceCollector } from './collectors/evidence-collector';
export { default as EvidenceCollectorClass } from './collectors/evidence-collector';

// ============================================
// EXPORTER EXPORTS
// ============================================

export { EvidenceExporter } from './exporters/evidence-exporter';
export { default as EvidenceExporterClass } from './exporters/evidence-exporter';

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

import { EvidenceCollector } from './collectors/evidence-collector';
import { EvidenceExporter } from './exporters/evidence-exporter';
import { EvidencePack, ExportOptions, CollectorOptions } from './core/types';

let defaultCollector: EvidenceCollector | null = null;
let defaultExporter: EvidenceExporter | null = null;

/**
 * Create a new evidence collector
 */
export function createCollector(options?: Partial<CollectorOptions>): EvidenceCollector {
  return new EvidenceCollector(options);
}

/**
 * Get or create the default collector
 */
export function getDefaultCollector(): EvidenceCollector {
  if (!defaultCollector) {
    defaultCollector = new EvidenceCollector();
  }
  return defaultCollector;
}

/**
 * Create a new evidence exporter
 */
export function createExporter(options?: Partial<ExportOptions>): EvidenceExporter {
  return new EvidenceExporter(options);
}

/**
 * Get or create the default exporter
 */
export function getDefaultExporter(): EvidenceExporter {
  if (!defaultExporter) {
    defaultExporter = new EvidenceExporter();
  }
  return defaultExporter;
}

/**
 * Quick export of an evidence pack
 */
export function exportPack(pack: EvidencePack, options?: Partial<ExportOptions>): string {
  const exporter = options ? createExporter(options) : getDefaultExporter();
  return exporter.export(pack);
}

/**
 * Export pack as JSON
 */
export function toJSON(pack: EvidencePack): string {
  return getDefaultExporter().toJSON(pack);
}

/**
 * Export pack as Markdown
 */
export function toMarkdown(pack: EvidencePack): string {
  return getDefaultExporter().toMarkdown(pack);
}

/**
 * Export pack as HTML
 */
export function toHTML(pack: EvidencePack): string {
  return getDefaultExporter().toHTML(pack);
}

// ============================================
// PRESET CONFIGURATIONS
// ============================================

/**
 * Verbose collection preset
 */
export const VERBOSE_COLLECTOR: Partial<CollectorOptions> = {
  verbose: true,
  collectIterations: true,
  collectArtifacts: true,
};

/**
 * Minimal collection preset
 */
export const MINIMAL_COLLECTOR: Partial<CollectorOptions> = {
  verbose: false,
  collectIterations: false,
  collectArtifacts: false,
};

/**
 * Full export preset
 */
export const FULL_EXPORT: Partial<ExportOptions> = {
  format: 'markdown',
  sections: ['metadata', 'session', 'contract', 'validations', 'iterations', 'output', 'compliance', 'audit'],
  includeArtifacts: true,
  redactSensitive: false,
};

/**
 * Summary export preset
 */
export const SUMMARY_EXPORT: Partial<ExportOptions> = {
  format: 'markdown',
  sections: ['metadata', 'session', 'output', 'compliance'],
  includeArtifacts: false,
  redactSensitive: true,
};

/**
 * Compliance export preset
 */
export const COMPLIANCE_EXPORT: Partial<ExportOptions> = {
  format: 'markdown',
  sections: ['metadata', 'contract', 'validations', 'compliance', 'audit'],
  includeArtifacts: true,
  redactSensitive: true,
};

// ============================================
// DEFAULT EXPORT
// ============================================

export default EvidenceCollector;
