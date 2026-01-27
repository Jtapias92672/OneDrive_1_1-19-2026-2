/**
 * Claim Detector
 * Epic 14: Detects verifiable claims in content
 */

import { ClaimCategory, ClaimDetectionResult, DetectedClaim } from './types';
import { CLAIM_PATTERNS } from './claim-patterns';

let idCounter = 0;

function generateClaimId(): string {
  return `claim-${Date.now()}-${++idCounter}`;
}

export class ClaimDetector {
  private contextRadius = 50;

  /**
   * Detect claims in content
   */
  detect(content: string, contentId?: string): ClaimDetectionResult {
    const claims: DetectedClaim[] = [];
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;

    const categories: Record<ClaimCategory, number> = {
      mathematical: 0,
      scientific: 0,
      temporal: 0,
      quantitative: 0,
      technical: 0,
      factual: 0,
    };

    // Track matched positions to avoid duplicates
    const matchedPositions = new Set<string>();

    for (const [category, patterns] of Object.entries(CLAIM_PATTERNS)) {
      for (const patternDef of patterns) {
        // Create fresh regex instance for each pattern
        const regex = new RegExp(patternDef.pattern.source, patternDef.pattern.flags);
        let match: RegExpExecArray | null;

        while ((match = regex.exec(content)) !== null) {
          const posKey = `${match.index}-${match.index + match[0].length}`;

          // Skip if already matched at this position
          if (matchedPositions.has(posKey)) continue;

          // Skip if overlaps with existing claim
          const overlaps = claims.some(
            (c) =>
              (match!.index >= c.startIndex && match!.index < c.endIndex) ||
              (match!.index + match![0].length > c.startIndex &&
                match!.index + match![0].length <= c.endIndex)
          );

          if (overlaps) continue;

          matchedPositions.add(posKey);

          const claim: DetectedClaim = {
            id: generateClaimId(),
            text: match[0],
            category: category as ClaimCategory,
            context: this.extractContext(content, match.index, match[0].length),
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: patternDef.confidence,
            patterns: [patternDef.name],
          };

          claims.push(claim);
          categories[category as ClaimCategory]++;
        }
      }
    }

    // Sort claims by position
    claims.sort((a, b) => a.startIndex - b.startIndex);

    return {
      contentId: contentId || `content-${Date.now()}`,
      claims,
      claimDensity: wordCount > 0 ? (claims.length / wordCount) * 100 : 0,
      categories,
    };
  }

  /**
   * Extract surrounding context for a claim
   */
  private extractContext(content: string, start: number, length: number): string {
    const contextStart = Math.max(0, start - this.contextRadius);
    const contextEnd = Math.min(content.length, start + length + this.contextRadius);

    let context = content.slice(contextStart, contextEnd);

    // Add ellipsis if truncated
    if (contextStart > 0) {
      context = '...' + context;
    }
    if (contextEnd < content.length) {
      context = context + '...';
    }

    return context;
  }

  /**
   * Detect claims in a specific category only
   */
  detectByCategory(content: string, category: ClaimCategory, contentId?: string): ClaimDetectionResult {
    const fullResult = this.detect(content, contentId);

    const filteredClaims = fullResult.claims.filter((c) => c.category === category);

    const categories: Record<ClaimCategory, number> = {
      mathematical: 0,
      scientific: 0,
      temporal: 0,
      quantitative: 0,
      technical: 0,
      factual: 0,
    };

    categories[category] = filteredClaims.length;

    const words = content.split(/\s+/).filter((w) => w.length > 0);

    return {
      contentId: fullResult.contentId,
      claims: filteredClaims,
      claimDensity: words.length > 0 ? (filteredClaims.length / words.length) * 100 : 0,
      categories,
    };
  }

  /**
   * Get claim density level
   */
  getDensityLevel(density: number): 'low' | 'medium' | 'high' {
    if (density < 2) return 'low';
    if (density < 5) return 'medium';
    return 'high';
  }
}

// Singleton instance
export const claimDetector = new ClaimDetector();
