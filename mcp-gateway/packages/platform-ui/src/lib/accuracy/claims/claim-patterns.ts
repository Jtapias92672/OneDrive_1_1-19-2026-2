/**
 * Claim Detection Patterns
 * Epic 14: 44+ patterns across 6 categories
 */

import { ClaimCategory } from './types';

export interface PatternDefinition {
  name: string;
  pattern: RegExp;
  confidence: number;
}

export const CLAIM_PATTERNS: Record<ClaimCategory, PatternDefinition[]> = {
  mathematical: [
    // Basic arithmetic (10 patterns)
    { name: 'arithmetic-equation', pattern: /(\d+)\s*[\+]\s*(\d+)\s*=\s*(\d+)/g, confidence: 0.95 },
    { name: 'subtraction-equation', pattern: /(\d+)\s*[\-]\s*(\d+)\s*=\s*(\d+)/g, confidence: 0.95 },
    { name: 'multiplication-equation', pattern: /(\d+)\s*[\*x×]\s*(\d+)\s*=\s*(\d+)/g, confidence: 0.95 },
    { name: 'division-equation', pattern: /(\d+)\s*[\/÷]\s*(\d+)\s*=\s*(\d+)/g, confidence: 0.95 },
    { name: 'percentage', pattern: /(\d+\.?\d*)\s*%/g, confidence: 0.85 },
    { name: 'square-root', pattern: /√(\d+)/g, confidence: 0.9 },
    { name: 'exponent', pattern: /(\d+)\s*\^\s*(\d+)/g, confidence: 0.9 },
    { name: 'logarithm', pattern: /log\s*\(\s*[\d.]+\s*\)/gi, confidence: 0.9 },
    { name: 'trig-function', pattern: /(sin|cos|tan)\s*\(\s*[\d.]+\s*\)/gi, confidence: 0.9 },
    { name: 'average-mean', pattern: /(average|mean)\s+(?:of\s+)?[\d.,\s]+/gi, confidence: 0.85 },
    { name: 'median-mode', pattern: /(median|mode)\s+(?:is\s+)?[\d.,]+/gi, confidence: 0.85 },
    { name: 'standard-deviation', pattern: /standard deviation\s+(?:of\s+)?[\d.,]+/gi, confidence: 0.85 },
  ],

  scientific: [
    // Physical constants and units (10 patterns)
    { name: 'speed-of-light', pattern: /speed of light[\s\w]*[\d,]+\s*m\/s/gi, confidence: 0.95 },
    { name: 'speed-of-light-c', pattern: /c\s*=\s*[\d,]+\s*m\/s/g, confidence: 0.95 },
    { name: 'gravitational-constant', pattern: /gravitational constant|G\s*=\s*[\d.e\-\+]+/gi, confidence: 0.9 },
    { name: 'avogadro-number', pattern: /Avogadro['']?s?\s*(number|constant)?[\s\w]*6\.022/gi, confidence: 0.95 },
    { name: 'planck-constant', pattern: /planck['']?s?\s*constant[\s\w]*[\d.]+\s*[×x]\s*10/gi, confidence: 0.9 },
    { name: 'chemical-formula', pattern: /\b(H2O|CO2|NaCl|O2|N2|CH4|H2SO4|HCl|NaOH)\b/g, confidence: 0.85 },
    { name: 'molar-mass', pattern: /\d+\s*(mol|moles?|grams?\/mol)/gi, confidence: 0.85 },
    { name: 'physics-units', pattern: /\d+\s*(joules?|watts?|newtons?|pascals?|hertz|volts?|amperes?|ohms?)/gi, confidence: 0.9 },
    { name: 'temperature-cf', pattern: /\-?\d+\s*°?[CF]\b/g, confidence: 0.85 },
    { name: 'temperature-kelvin', pattern: /\d+\s*K\b/g, confidence: 0.8 },
  ],

  temporal: [
    // Dates and durations (8 patterns)
    { name: 'year-modern', pattern: /\b(19|20)\d{2}\b/g, confidence: 0.7 },
    { name: 'date-slash', pattern: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, confidence: 0.85 },
    { name: 'date-full', pattern: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}/gi, confidence: 0.9 },
    { name: 'duration', pattern: /\b\d+\s*(seconds?|minutes?|hours?|days?|weeks?|months?|years?)\s*(ago|later|old)?/gi, confidence: 0.8 },
    { name: 'released-in', pattern: /(released|founded|created|invented|discovered|launched|published)\s+in\s+\d{4}/gi, confidence: 0.9 },
    { name: 'since-until', pattern: /(since|from|until|before|after)\s+\d{4}/gi, confidence: 0.85 },
    { name: 'era-century', pattern: /\b(\d{1,2})(st|nd|rd|th)\s+century\b/gi, confidence: 0.85 },
    { name: 'decade', pattern: /\b(19|20)\d{2}s\b/g, confidence: 0.8 },
  ],

  quantitative: [
    // Data sizes and counts (10 patterns)
    { name: 'data-size', pattern: /\b\d+\.?\d*\s*(bytes?|KB|MB|GB|TB|PB)\b/gi, confidence: 0.9 },
    { name: 'time-duration', pattern: /\b\d+\.?\d*\s*(ms|milliseconds?)\b/gi, confidence: 0.9 },
    { name: 'frequency', pattern: /\b\d+\.?\d*\s*(fps|FPS|Hz|GHz|MHz|Mbps|Gbps)\b/gi, confidence: 0.9 },
    { name: 'large-numbers', pattern: /\b\d+\.?\d*\s*(million|billion|trillion|thousand)\b/gi, confidence: 0.85 },
    { name: 'user-counts', pattern: /\b\d+\s*(users?|customers?|employees?|downloads?|installs?)\b/gi, confidence: 0.8 },
    { name: 'approximately', pattern: /(approximately|about|around|roughly|nearly)\s+\d+/gi, confidence: 0.75 },
    { name: 'more-less-than', pattern: /(more|less|fewer|greater|over|under)\s+than\s+\d+/gi, confidence: 0.8 },
    { name: 'money-amount', pattern: /\$\d+(?:,\d{3})*(?:\.\d{2})?/g, confidence: 0.85 },
    { name: 'ratio', pattern: /\b\d+:\d+\b/g, confidence: 0.85 },
    { name: 'fraction', pattern: /\b\d+\/\d+\b/g, confidence: 0.8 },
  ],

  technical: [
    // Performance and code metrics (8 patterns)
    { name: 'big-o-notation', pattern: /O\s*\(\s*[n1\d\^log\s\*]+\s*\)/g, confidence: 0.95 },
    { name: 'latency', pattern: /latency\s*(of|is|:)?\s*\d+\s*ms/gi, confidence: 0.9 },
    { name: 'throughput', pattern: /throughput\s*(of|is|:)?\s*\d+/gi, confidence: 0.85 },
    { name: 'response-time', pattern: /response time\s*(of|is|:)?\s*\d+/gi, confidence: 0.85 },
    { name: 'lines-of-code', pattern: /\d+\s*(lines?\s*of\s*code|LOC)\b/gi, confidence: 0.85 },
    { name: 'code-coverage', pattern: /\d+\s*%\s*(code\s*)?coverage/gi, confidence: 0.9 },
    { name: 'version-number', pattern: /v?\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?/g, confidence: 0.75 },
    { name: 'memory-usage', pattern: /\d+\s*(MB|GB)\s*(of\s*)?(memory|RAM)/gi, confidence: 0.85 },
  ],

  factual: [
    // Attribution and definitions (6 patterns)
    { name: 'invented-by', pattern: /(invented|created|founded|developed|designed)\s+by\s+[\w\s]+/gi, confidence: 0.85 },
    { name: 'known-as', pattern: /(is|was)\s+(known as|called|named)\s+/gi, confidence: 0.8 },
    { name: 'title-position', pattern: /the\s+(capital|president|CEO|founder|creator|author)\s+of\s+/gi, confidence: 0.85 },
    { name: 'definition', pattern: /(is defined as|means|refers to)\s+/gi, confidence: 0.75 },
    { name: 'superlative', pattern: /(is|are)\s+(the\s+)?(largest|smallest|fastest|slowest|oldest|newest|first|last|biggest|tallest)/gi, confidence: 0.85 },
    { name: 'located-in', pattern: /(located|based|headquartered)\s+(in|at)\s+[\w\s,]+/gi, confidence: 0.8 },
  ],
};

// Total patterns: 12 + 10 + 8 + 10 + 8 + 6 = 54 patterns

/**
 * Get all patterns as a flat array
 */
export function getAllPatterns(): Array<PatternDefinition & { category: ClaimCategory }> {
  const patterns: Array<PatternDefinition & { category: ClaimCategory }> = [];

  for (const [category, categoryPatterns] of Object.entries(CLAIM_PATTERNS)) {
    for (const pattern of categoryPatterns) {
      patterns.push({
        ...pattern,
        category: category as ClaimCategory,
      });
    }
  }

  return patterns;
}

/**
 * Get pattern count by category
 */
export function getPatternCounts(): Record<ClaimCategory, number> {
  const counts: Record<ClaimCategory, number> = {
    mathematical: 0,
    scientific: 0,
    temporal: 0,
    quantitative: 0,
    technical: 0,
    factual: 0,
  };

  for (const [category, patterns] of Object.entries(CLAIM_PATTERNS)) {
    counts[category as ClaimCategory] = patterns.length;
  }

  return counts;
}

/**
 * Get total pattern count
 */
export function getTotalPatternCount(): number {
  return Object.values(CLAIM_PATTERNS).reduce((sum, patterns) => sum + patterns.length, 0);
}
