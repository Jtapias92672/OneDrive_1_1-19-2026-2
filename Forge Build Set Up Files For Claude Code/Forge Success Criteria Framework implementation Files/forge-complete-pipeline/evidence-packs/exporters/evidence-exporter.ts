/**
 * FORGE Evidence Packs - Evidence Exporter
 * 
 * @epic 08 - Evidence Packs
 * @task 3.1 - Export Functionality
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Exports evidence packs in various formats (JSON, Markdown, HTML, PDF).
 *   Supports templates, redaction, and compression.
 */

import {
  EvidencePack,
  ExportOptions,
  ExportFormat,
  ExportSection,
  DEFAULT_EXPORT_OPTIONS,
} from '../core/types';

// ============================================
// EVIDENCE EXPORTER
// ============================================

export class EvidenceExporter {
  private options: ExportOptions;

  constructor(options: Partial<ExportOptions> = {}) {
    this.options = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  }

  // ==========================================
  // MAIN EXPORT METHOD
  // ==========================================

  /**
   * Export evidence pack in configured format
   */
  export(pack: EvidencePack): string {
    switch (this.options.format) {
      case 'json':
        return this.toJSON(pack);
      case 'markdown':
        return this.toMarkdown(pack);
      case 'html':
        return this.toHTML(pack);
      case 'xml':
        return this.toXML(pack);
      case 'csv':
        return this.toCSV(pack);
      default:
        return this.toJSON(pack);
    }
  }

  // ==========================================
  // JSON EXPORT
  // ==========================================

  /**
   * Export as JSON
   */
  toJSON(pack: EvidencePack): string {
    const filtered = this.filterSections(pack);
    return JSON.stringify(filtered, null, 2);
  }

  // ==========================================
  // MARKDOWN EXPORT
  // ==========================================

  /**
   * Export as Markdown
   */
  toMarkdown(pack: EvidencePack): string {
    const lines: string[] = [];

    // Title
    lines.push(`# Evidence Pack: ${pack.id}`);
    lines.push('');
    lines.push(`**Generated:** ${pack.metadata.generatedAt}`);
    lines.push(`**Version:** ${pack.version}`);
    lines.push(`**Environment:** ${pack.metadata.environment}`);
    lines.push('');

    // Table of Contents
    lines.push('## Table of Contents');
    lines.push('');
    if (this.shouldInclude('session')) lines.push('- [Session Information](#session-information)');
    if (this.shouldInclude('contract')) lines.push('- [Contract Details](#contract-details)');
    if (this.shouldInclude('validations')) lines.push('- [Validation Results](#validation-results)');
    if (this.shouldInclude('iterations')) lines.push('- [Iteration History](#iteration-history)');
    if (this.shouldInclude('output')) lines.push('- [Output Summary](#output-summary)');
    if (this.shouldInclude('compliance')) lines.push('- [Compliance Status](#compliance-status)');
    if (this.shouldInclude('audit')) lines.push('- [Audit Trail](#audit-trail)');
    lines.push('');

    // Session Information
    if (this.shouldInclude('session')) {
      lines.push('## Session Information');
      lines.push('');
      lines.push(`| Property | Value |`);
      lines.push(`|----------|-------|`);
      lines.push(`| Session ID | \`${pack.session.sessionId}\` |`);
      lines.push(`| Status | ${this.statusBadge(pack.session.status)} |`);
      lines.push(`| Start Time | ${pack.session.startTime} |`);
      lines.push(`| End Time | ${pack.session.endTime} |`);
      lines.push(`| Duration | ${pack.session.durationMs}ms |`);
      lines.push(`| Strategy | ${pack.session.config.strategyName} |`);
      lines.push(`| Target Score | ${pack.session.config.targetScore} |`);
      lines.push('');
      lines.push('### Resource Usage');
      lines.push('');
      lines.push(`- **Total Tokens:** ${pack.session.resources.totalTokens.toLocaleString()}`);
      lines.push(`- **API Calls:** ${pack.session.resources.apiCalls}`);
      lines.push(`- **Estimated Cost:** $${pack.session.resources.estimatedCostUsd.toFixed(4)}`);
      lines.push('');
    }

    // Contract Details
    if (this.shouldInclude('contract')) {
      lines.push('## Contract Details');
      lines.push('');
      lines.push(`| Property | Value |`);
      lines.push(`|----------|-------|`);
      lines.push(`| Contract ID | \`${pack.contract.contractId}\` |`);
      lines.push(`| Name | ${pack.contract.contractName} |`);
      lines.push(`| Version | ${pack.contract.contractVersion} |`);
      lines.push(`| Hash | \`${pack.contract.contractHash.slice(0, 16)}...\` |`);
      lines.push('');
      lines.push('### Validation Rules');
      lines.push('');
      lines.push(`| Rule | Type | Required | Weight |`);
      lines.push(`|------|------|----------|--------|`);
      for (const rule of pack.contract.validationRules) {
        lines.push(`| ${rule.name} | ${rule.type} | ${rule.required ? '✓' : '✗'} | ${rule.weight} |`);
      }
      lines.push('');
    }

    // Validation Results
    if (this.shouldInclude('validations')) {
      lines.push('## Validation Results');
      lines.push('');
      for (const validation of pack.validations) {
        const resultEmoji = this.resultEmoji(validation.result);
        lines.push(`### ${resultEmoji} ${validation.validatorName}`);
        lines.push('');
        lines.push(`- **Type:** ${validation.validatorType}`);
        lines.push(`- **Score:** ${(validation.score * 100).toFixed(1)}%`);
        lines.push(`- **Result:** ${validation.result.toUpperCase()}`);
        lines.push(`- **Timestamp:** ${validation.timestamp}`);
        lines.push('');
        if (validation.findings.length > 0) {
          lines.push('#### Findings');
          lines.push('');
          for (const finding of validation.findings) {
            lines.push(`- **[${finding.severity.toUpperCase()}]** ${finding.message}`);
            if (finding.suggestion) {
              lines.push(`  - *Suggestion:* ${finding.suggestion}`);
            }
          }
          lines.push('');
        }
      }
    }

    // Iteration History
    if (this.shouldInclude('iterations')) {
      lines.push('## Iteration History');
      lines.push('');
      lines.push(`| # | Score | Delta | Tokens | Duration | Converged |`);
      lines.push(`|---|-------|-------|--------|----------|-----------|`);
      for (const iter of pack.iterations) {
        const delta = iter.scoreDelta >= 0 ? `+${iter.scoreDelta.toFixed(3)}` : iter.scoreDelta.toFixed(3);
        lines.push(`| ${iter.iteration} | ${iter.score.toFixed(3)} | ${delta} | ${iter.tokensUsed} | ${iter.durationMs}ms | ${iter.converged ? '✓' : '✗'} |`);
      }
      lines.push('');
    }

    // Output Summary
    if (this.shouldInclude('output')) {
      lines.push('## Output Summary');
      lines.push('');
      lines.push(`| Property | Value |`);
      lines.push(`|----------|-------|`);
      lines.push(`| Type | ${pack.output.type} |`);
      lines.push(`| Size | ${this.formatBytes(pack.output.size)} |`);
      lines.push(`| Final Score | ${(pack.output.finalScore * 100).toFixed(1)}% |`);
      lines.push(`| Converged | ${pack.output.converged ? '✓ Yes' : '✗ No'} |`);
      lines.push('');
      lines.push('### Quality Metrics');
      lines.push('');
      lines.push(`| Metric | Score |`);
      lines.push(`|--------|-------|`);
      lines.push(`| Completeness | ${(pack.output.metrics.completeness * 100).toFixed(1)}% |`);
      lines.push(`| Correctness | ${(pack.output.metrics.correctness * 100).toFixed(1)}% |`);
      lines.push(`| Consistency | ${(pack.output.metrics.consistency * 100).toFixed(1)}% |`);
      lines.push(`| Compliance | ${(pack.output.metrics.compliance * 100).toFixed(1)}% |`);
      lines.push(`| **Overall** | **${(pack.output.metrics.overall * 100).toFixed(1)}%** |`);
      lines.push('');
    }

    // Compliance Status
    if (this.shouldInclude('compliance')) {
      lines.push('## Compliance Status');
      lines.push('');
      lines.push(`**Overall Status:** ${this.complianceBadge(pack.compliance.status)}`);
      lines.push('');
      if (pack.compliance.frameworks.length > 0) {
        lines.push('### Frameworks');
        lines.push('');
        for (const framework of pack.compliance.frameworks) {
          lines.push(`#### ${framework.name} (v${framework.version})`);
          lines.push('');
          lines.push(`- **Controls Checked:** ${framework.controlsChecked}`);
          lines.push(`- **Controls Passed:** ${framework.controlsPassed}`);
          lines.push(`- **Compliance:** ${framework.compliancePercent.toFixed(1)}%`);
          lines.push('');
        }
      }
    }

    // Audit Trail
    if (this.shouldInclude('audit')) {
      lines.push('## Audit Trail');
      lines.push('');
      lines.push('```');
      for (const entry of pack.auditTrail.slice(-20)) {
        lines.push(`[${entry.timestamp}] ${entry.eventType}: ${entry.action}`);
      }
      if (pack.auditTrail.length > 20) {
        lines.push(`... and ${pack.auditTrail.length - 20} more entries`);
      }
      lines.push('```');
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push(`*Generated by FORGE Evidence Packs v${pack.version}*`);

    return lines.join('\n');
  }

  // ==========================================
  // HTML EXPORT
  // ==========================================

  /**
   * Export as HTML
   */
  toHTML(pack: EvidencePack): string {
    const markdown = this.toMarkdown(pack);
    
    // Simple markdown to HTML conversion
    const html = this.markdownToHTML(markdown);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Evidence Pack: ${pack.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 2rem; }
    h1 { color: #1a202c; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    h2 { color: #2d3748; margin-top: 2rem; }
    h3 { color: #4a5568; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #e2e8f0; padding: 0.5rem 1rem; text-align: left; }
    th { background: #f7fafc; }
    code { background: #f7fafc; padding: 0.125rem 0.25rem; border-radius: 0.25rem; }
    pre { background: #1a202c; color: #e2e8f0; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.875rem; }
    .badge-success { background: #c6f6d5; color: #22543d; }
    .badge-warning { background: #fefcbf; color: #744210; }
    .badge-error { background: #fed7d7; color: #742a2a; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
  }

  private markdownToHTML(markdown: string): string {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Code blocks
    html = html.replace(/```([^`]+)```/g, '<pre>$1</pre>');

    // Tables (simplified)
    html = html.replace(/\|(.+)\|/g, (match, content) => {
      const cells = content.split('|').map((c: string) => c.trim());
      if (cells.every((c: string) => c.match(/^-+$/))) {
        return ''; // Skip separator row
      }
      const tag = match.includes('Property') || match.includes('Rule') ? 'th' : 'td';
      return `<tr>${cells.map((c: string) => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
    });

    // Wrap tables
    html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>');

    // Lists
    html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Paragraphs
    html = html.replace(/^([^<\n].+)$/gm, '<p>$1</p>');

    // Line breaks
    html = html.replace(/\n\n/g, '\n');

    return html;
  }

  // ==========================================
  // XML EXPORT
  // ==========================================

  /**
   * Export as XML
   */
  toXML(pack: EvidencePack): string {
    const filtered = this.filterSections(pack);
    return this.objectToXML(filtered, 'EvidencePack');
  }

  private objectToXML(obj: any, rootName: string): string {
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
    lines.push(`<${rootName}>`);
    lines.push(this.valueToXML(obj, 1));
    lines.push(`</${rootName}>`);
    return lines.join('\n');
  }

  private valueToXML(value: any, indent: number): string {
    const spaces = '  '.repeat(indent);

    if (value === null || value === undefined) {
      return '';
    }

    if (Array.isArray(value)) {
      return value.map((item, i) => {
        return `${spaces}<item index="${i}">\n${this.valueToXML(item, indent + 1)}\n${spaces}</item>`;
      }).join('\n');
    }

    if (typeof value === 'object') {
      return Object.entries(value).map(([key, val]) => {
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
        if (typeof val === 'object' && val !== null) {
          return `${spaces}<${safeKey}>\n${this.valueToXML(val, indent + 1)}\n${spaces}</${safeKey}>`;
        }
        return `${spaces}<${safeKey}>${this.escapeXML(String(val))}</${safeKey}>`;
      }).join('\n');
    }

    return this.escapeXML(String(value));
  }

  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ==========================================
  // CSV EXPORT
  // ==========================================

  /**
   * Export as CSV (flattened validation results)
   */
  toCSV(pack: EvidencePack): string {
    const lines: string[] = [];

    // Header
    lines.push('Validator,Type,Result,Score,Finding Count,Timestamp');

    // Data rows
    for (const validation of pack.validations) {
      lines.push([
        this.escapeCSV(validation.validatorName),
        validation.validatorType,
        validation.result,
        validation.score.toFixed(4),
        validation.findings.length.toString(),
        validation.timestamp,
      ].join(','));
    }

    return lines.join('\n');
  }

  private escapeCSV(str: string): string {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  private shouldInclude(section: ExportSection): boolean {
    return this.options.sections.includes(section);
  }

  private filterSections(pack: EvidencePack): Partial<EvidencePack> {
    const result: Partial<EvidencePack> = {
      id: pack.id,
      version: pack.version,
    };

    if (this.shouldInclude('metadata')) result.metadata = pack.metadata;
    if (this.shouldInclude('session')) result.session = pack.session;
    if (this.shouldInclude('contract')) result.contract = pack.contract;
    if (this.shouldInclude('validations')) result.validations = pack.validations;
    if (this.shouldInclude('iterations')) result.iterations = pack.iterations;
    if (this.shouldInclude('output')) result.output = pack.output;
    if (this.shouldInclude('compliance')) result.compliance = pack.compliance;
    if (this.shouldInclude('audit')) result.auditTrail = pack.auditTrail;
    if (this.shouldInclude('signature') && pack.signature) result.signature = pack.signature;

    return result;
  }

  private statusBadge(status: string): string {
    const badges: Record<string, string> = {
      completed: '✅ Completed',
      converged: '✅ Converged',
      timeout: '⚠️ Timeout',
      'max-iterations': '⚠️ Max Iterations',
      failed: '❌ Failed',
      aborted: '⛔ Aborted',
    };
    return badges[status] || status;
  }

  private resultEmoji(result: string): string {
    const emojis: Record<string, string> = {
      pass: '✅',
      fail: '❌',
      warning: '⚠️',
      skip: '⏭️',
      error: '💥',
    };
    return emojis[result] || '❓';
  }

  private complianceBadge(status: string): string {
    const badges: Record<string, string> = {
      compliant: '✅ Compliant',
      'non-compliant': '❌ Non-Compliant',
      partial: '⚠️ Partial',
      'not-assessed': '❓ Not Assessed',
    };
    return badges[status] || status;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  // ==========================================
  // CONFIGURATION
  // ==========================================

  setOptions(options: Partial<ExportOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getOptions(): ExportOptions {
    return { ...this.options };
  }
}

// ============================================
// EXPORTS
// ============================================

export default EvidenceExporter;
