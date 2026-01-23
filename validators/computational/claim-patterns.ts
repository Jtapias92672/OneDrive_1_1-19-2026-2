/**
 * FORGE Claim Patterns Library
 * 
 * @epic 14.1 - Computational Accuracy Layer
 * @task 2.1 - Defense & EVM Claim Detector Patterns
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * 44 patterns across 6 categories optimized for defense contractor outputs
 */

// ============================================
// TYPES
// ============================================

export type ClaimCategory = 'evm' | 'defense' | 'financial' | 'statistical' | 'conversion' | 'generic';

export interface ClaimPattern {
  id: string;
  name: string;
  category: ClaimCategory;
  pattern: RegExp;
  priority: number;  // Higher = more specific = check first
  formula?: string;
  description: string;
  extract: (match: RegExpMatchArray) => ExtractedClaim | null;
}

export interface ExtractedClaim {
  expression: string;
  result: number;
  formula?: string;
  params?: Record<string, number>;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function parseNumber(str: string): number | null {
  if (!str) return null;
  const cleaned = str.replace(/[$,\s]/g, '').replace(/[()]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ============================================
// EVM PATTERNS (Priority 90-100)
// ============================================

export const EVM_PATTERNS: ClaimPattern[] = [
  {
    id: 'evm-cpi',
    name: 'Cost Performance Index (CPI)',
    category: 'evm',
    pattern: /CPI\s*=?\s*\$?([\d,]+(?:\.\d+)?)\s*\/\s*\$?([\d,]+(?:\.\d+)?)\s*=\s*(-?[\d.]+)/gi,
    priority: 100,
    formula: 'CPI = EV / AC',
    description: 'Cost Performance Index calculation',
    extract: (m) => ({
      expression: `${m[1]} / ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'CPI = EV / AC',
      params: { ev: parseNumber(m[1])!, ac: parseNumber(m[2])! }
    })
  },
  {
    id: 'evm-spi',
    name: 'Schedule Performance Index (SPI)',
    category: 'evm',
    pattern: /SPI\s*=?\s*\$?([\d,]+(?:\.\d+)?)\s*\/\s*\$?([\d,]+(?:\.\d+)?)\s*=\s*(-?[\d.]+)/gi,
    priority: 100,
    formula: 'SPI = EV / PV',
    description: 'Schedule Performance Index calculation',
    extract: (m) => ({
      expression: `${m[1]} / ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'SPI = EV / PV',
      params: { ev: parseNumber(m[1])!, pv: parseNumber(m[2])! }
    })
  },
  {
    id: 'evm-cv',
    name: 'Cost Variance (CV)',
    category: 'evm',
    pattern: /CV\s*=?\s*\$?([\d,]+(?:\.\d+)?)\s*-\s*\$?([\d,]+(?:\.\d+)?)\s*=\s*\$?(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 95,
    formula: 'CV = EV - AC',
    description: 'Cost Variance calculation',
    extract: (m) => ({
      expression: `${m[1]} - ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'CV = EV - AC',
      params: { ev: parseNumber(m[1])!, ac: parseNumber(m[2])! }
    })
  },
  {
    id: 'evm-sv',
    name: 'Schedule Variance (SV)',
    category: 'evm',
    pattern: /SV\s*=?\s*\$?([\d,]+(?:\.\d+)?)\s*-\s*\$?([\d,]+(?:\.\d+)?)\s*=\s*\$?(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 95,
    formula: 'SV = EV - PV',
    description: 'Schedule Variance calculation',
    extract: (m) => ({
      expression: `${m[1]} - ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'SV = EV - PV',
      params: { ev: parseNumber(m[1])!, pv: parseNumber(m[2])! }
    })
  },
  {
    id: 'evm-eac',
    name: 'Estimate at Completion (EAC)',
    category: 'evm',
    pattern: /EAC\s*=?\s*\$?([\d,]+(?:\.\d+)?)\s*\/\s*(-?[\d.]+)\s*=\s*\$?(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 95,
    formula: 'EAC = BAC / CPI',
    description: 'Estimate at Completion calculation',
    extract: (m) => ({
      expression: `${m[1]} / ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'EAC = BAC / CPI',
      params: { bac: parseNumber(m[1])!, cpi: parseNumber(m[2])! }
    })
  },
  {
    id: 'evm-etc',
    name: 'Estimate to Complete (ETC)',
    category: 'evm',
    pattern: /ETC\s*=?\s*\$?([\d,]+(?:\.\d+)?)\s*-\s*\$?([\d,]+(?:\.\d+)?)\s*=\s*\$?(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 95,
    formula: 'ETC = EAC - AC',
    description: 'Estimate to Complete calculation',
    extract: (m) => ({
      expression: `${m[1]} - ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'ETC = EAC - AC',
      params: { eac: parseNumber(m[1])!, ac: parseNumber(m[2])! }
    })
  },
  {
    id: 'evm-vac',
    name: 'Variance at Completion (VAC)',
    category: 'evm',
    pattern: /VAC\s*=?\s*\$?([\d,]+(?:\.\d+)?)\s*-\s*\$?([\d,]+(?:\.\d+)?)\s*=\s*\$?(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 95,
    formula: 'VAC = BAC - EAC',
    description: 'Variance at Completion calculation',
    extract: (m) => ({
      expression: `${m[1]} - ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'VAC = BAC - EAC',
      params: { bac: parseNumber(m[1])!, eac: parseNumber(m[2])! }
    })
  },
  {
    id: 'evm-tcpi',
    name: 'To-Complete Performance Index (TCPI)',
    category: 'evm',
    pattern: /TCPI\s*=?\s*\(?\$?([\d,]+(?:\.\d+)?)\s*-\s*\$?([\d,]+(?:\.\d+)?)\)?\s*\/\s*\(?\$?([\d,]+(?:\.\d+)?)\s*-\s*\$?([\d,]+(?:\.\d+)?)\)?\s*=\s*(-?[\d.]+)/gi,
    priority: 100,
    formula: 'TCPI = (BAC - EV) / (BAC - AC)',
    description: 'To-Complete Performance Index calculation',
    extract: (m) => ({
      expression: `(${m[1]} - ${m[2]}) / (${m[3]} - ${m[4]})`,
      result: parseNumber(m[5])!,
      formula: 'TCPI = (BAC - EV) / (BAC - AC)',
      params: { bac: parseNumber(m[1])!, ev: parseNumber(m[2])!, bac2: parseNumber(m[3])!, ac: parseNumber(m[4])! }
    })
  },
  {
    id: 'evm-percent-complete',
    name: 'Percent Complete',
    category: 'evm',
    pattern: /(?:percent\s+complete|%\s*complete|completion)\s*=?\s*\$?([\d,]+(?:\.\d+)?)\s*\/\s*\$?([\d,]+(?:\.\d+)?)\s*=\s*(-?[\d.]+)%?/gi,
    priority: 90,
    formula: '% Complete = EV / BAC',
    description: 'Percent complete calculation',
    extract: (m) => ({
      expression: `${m[1]} / ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: '% Complete = EV / BAC',
      params: { ev: parseNumber(m[1])!, bac: parseNumber(m[2])! }
    })
  },
];

// ============================================
// DEFENSE CONTRACT PATTERNS (Priority 80-90)
// ============================================

export const DEFENSE_PATTERNS: ClaimPattern[] = [
  {
    id: 'def-award-fee',
    name: 'Award Fee Calculation',
    category: 'defense',
    pattern: /award\s+fee\s*=?\s*\$?([\d,]+(?:\.\d+)?)\s*[×x*]\s*(\d+(?:\.\d+)?)%?\s*=\s*\$?(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 85,
    formula: 'Award Fee = Fee Pool × Score',
    description: 'CPAF award fee calculation',
    extract: (m) => ({
      expression: `${m[1]} * ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'Award Fee = Fee Pool × Score'
    })
  },
  {
    id: 'def-cpif-share',
    name: 'CPIF Share Calculation',
    category: 'defense',
    pattern: /(?:government|contractor)\s+share\s*=?\s*\$?([\d,]+(?:\.\d+)?)\s*[×x*]\s*(\d+(?:\.\d+)?)%?\s*=\s*\$?(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 85,
    formula: 'Share = (Target Cost - Actual Cost) × Share Ratio',
    description: 'CPIF cost share calculation',
    extract: (m) => ({
      expression: `${m[1]} * ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'Share = Delta × Ratio'
    })
  },
  {
    id: 'def-fte-hours',
    name: 'FTE Hours Calculation',
    category: 'defense',
    pattern: /(\d+(?:\.\d+)?)\s*FTE[s]?\s*[×x*]\s*(\d+)\s*(?:hours?|hrs?)\s*=\s*(-?[\d,]+(?:\.\d+)?)\s*(?:hours?|hrs?)/gi,
    priority: 80,
    formula: 'Total Hours = FTEs × Hours per FTE',
    description: 'Full-time equivalent hours calculation',
    extract: (m) => ({
      expression: `${m[1]} * ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'Total Hours = FTEs × Hours per FTE'
    })
  },
  {
    id: 'def-labor-cost',
    name: 'Labor Cost Calculation',
    category: 'defense',
    pattern: /labor\s+cost\s*=?\s*(\d+(?:,\d{3})*)\s*(?:hours?|hrs?)\s*[×x*]\s*\$?([\d.]+)(?:\/hr)?\s*=\s*\$?(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 80,
    formula: 'Labor Cost = Hours × Rate',
    description: 'Direct labor cost calculation',
    extract: (m) => ({
      expression: `${m[1]} * ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'Labor Cost = Hours × Rate'
    })
  },
  {
    id: 'def-ga-rate',
    name: 'G&A Rate Application',
    category: 'defense',
    pattern: /G&A\s*=?\s*\$?([\d,]+(?:\.\d+)?)\s*[×x*]\s*(\d+(?:\.\d+)?)%\s*=\s*\$?(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 80,
    formula: 'G&A = Cost Base × G&A Rate',
    description: 'General and Administrative cost calculation',
    extract: (m) => ({
      expression: `${m[1]} * ${parseNumber(m[2])! / 100}`,
      result: parseNumber(m[3])!,
      formula: 'G&A = Cost Base × G&A Rate'
    })
  },
  {
    id: 'def-odc',
    name: 'Other Direct Costs',
    category: 'defense',
    pattern: /ODC[s]?\s+(?:total|sum)\s*=?\s*\$?([\d,]+(?:\.\d+)?)\s*\+\s*\$?([\d,]+(?:\.\d+)?)\s*=\s*\$?(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 80,
    formula: 'Total ODC = Sum of ODCs',
    description: 'Other direct costs summation',
    extract: (m) => ({
      expression: `${m[1]} + ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'Total ODC = Sum of ODCs'
    })
  },
];

// ============================================
// FINANCIAL PATTERNS (Priority 75-85)
// ============================================

export const FINANCIAL_PATTERNS: ClaimPattern[] = [
  {
    id: 'fin-compound-interest',
    name: 'Compound Interest',
    category: 'financial',
    pattern: /\$?([\d,]+(?:\.\d+)?)\s+(?:at|@)\s+(\d+(?:\.\d+)?)%\s+(?:APR|annual|yearly)?\s*(?:compounded)?\s+(?:monthly|annually|quarterly)?\s*(?:for|over)\s+(\d+)\s+(?:years?|months?)\s*(?:=|→|is|equals|grows\s+to)\s*\$?(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 85,
    formula: 'A = P(1 + r/n)^(nt)',
    description: 'Compound interest calculation',
    extract: (m) => ({
      expression: `compound(${m[1]}, ${m[2]}%, ${m[3]})`,
      result: parseNumber(m[4])!,
      formula: 'A = P(1 + r/n)^(nt)',
      params: { principal: parseNumber(m[1])!, rate: parseNumber(m[2])!, years: parseNumber(m[3])! }
    })
  },
  {
    id: 'fin-roi',
    name: 'Return on Investment',
    category: 'financial',
    pattern: /ROI\s*=?\s*\(?\$?([\d,]+(?:\.\d+)?)\s*-\s*\$?([\d,]+(?:\.\d+)?)\)?\s*\/\s*\$?([\d,]+(?:\.\d+)?)\s*=\s*(-?[\d.]+)%?/gi,
    priority: 80,
    formula: 'ROI = (Gain - Cost) / Cost',
    description: 'Return on Investment calculation',
    extract: (m) => ({
      expression: `(${m[1]} - ${m[2]}) / ${m[3]}`,
      result: parseNumber(m[4])!,
      formula: 'ROI = (Gain - Cost) / Cost'
    })
  },
  {
    id: 'fin-profit-margin',
    name: 'Profit Margin',
    category: 'financial',
    pattern: /(?:profit\s+)?margin\s*=?\s*\$?([\d,]+(?:\.\d+)?)\s*\/\s*\$?([\d,]+(?:\.\d+)?)\s*=\s*(-?[\d.]+)%?/gi,
    priority: 75,
    formula: 'Margin = Profit / Revenue',
    description: 'Profit margin calculation',
    extract: (m) => ({
      expression: `${m[1]} / ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'Margin = Profit / Revenue'
    })
  },
  {
    id: 'fin-discount',
    name: 'Discount Calculation',
    category: 'financial',
    pattern: /(\d+(?:\.\d+)?)%\s+(?:off|discount)\s+(?:of)?\s*\$?([\d,]+(?:\.\d+)?)\s*=\s*\$?(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 75,
    formula: 'Discount = Price × Rate',
    description: 'Discount amount calculation',
    extract: (m) => ({
      expression: `${parseNumber(m[1])! / 100} * ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'Discount = Price × Rate'
    })
  },
];

// ============================================
// STATISTICAL PATTERNS (Priority 60-70)
// ============================================

export const STATISTICAL_PATTERNS: ClaimPattern[] = [
  {
    id: 'stat-average',
    name: 'Average/Mean',
    category: 'statistical',
    pattern: /(?:average|mean)\s*=?\s*\(?([\d,\s+]+)\)?\s*\/\s*(\d+)\s*=\s*(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 65,
    formula: 'Average = Sum / Count',
    description: 'Simple average calculation',
    extract: (m) => ({
      expression: `sum(${m[1]}) / ${m[2]}`,
      result: parseNumber(m[3])!,
      formula: 'Average = Sum / Count'
    })
  },
  {
    id: 'stat-weighted-avg',
    name: 'Weighted Average',
    category: 'statistical',
    pattern: /weighted\s+average\s*=?\s*.+?\s*=\s*(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 70,
    formula: 'Weighted Avg = Σ(value × weight) / Σweights',
    description: 'Weighted average calculation',
    extract: (m) => ({
      expression: 'weighted_average',
      result: parseNumber(m[1])!,
      formula: 'Weighted Avg = Σ(value × weight) / Σweights'
    })
  },
  {
    id: 'stat-growth-rate',
    name: 'Growth Rate',
    category: 'statistical',
    pattern: /growth\s+(?:rate)?\s*=?\s*\(?\$?([\d,]+(?:\.\d+)?)\s*-\s*\$?([\d,]+(?:\.\d+)?)\)?\s*\/\s*\$?([\d,]+(?:\.\d+)?)\s*=\s*(-?[\d.]+)%?/gi,
    priority: 65,
    formula: 'Growth = (New - Old) / Old',
    description: 'Growth rate calculation',
    extract: (m) => ({
      expression: `(${m[1]} - ${m[2]}) / ${m[3]}`,
      result: parseNumber(m[4])!,
      formula: 'Growth = (New - Old) / Old'
    })
  },
];

// ============================================
// CONVERSION PATTERNS (Priority 50)
// ============================================

export const CONVERSION_PATTERNS: ClaimPattern[] = [
  {
    id: 'conv-miles-km',
    name: 'Miles to Kilometers',
    category: 'conversion',
    pattern: /([\d,]+(?:\.\d+)?)\s*(?:miles?|mi)\s*=\s*([\d,]+(?:\.\d+)?)\s*(?:kilometers?|km)/gi,
    priority: 50,
    formula: '1 mile = 1.60934 km',
    description: 'Miles to kilometers conversion',
    extract: (m) => ({
      expression: `${m[1]} * 1.60934`,
      result: parseNumber(m[2])!,
      formula: '1 mile = 1.60934 km'
    })
  },
  {
    id: 'conv-celsius-fahrenheit',
    name: 'Celsius to Fahrenheit',
    category: 'conversion',
    pattern: /(-?[\d.]+)\s*°?C\s*=\s*(-?[\d.]+)\s*°?F/gi,
    priority: 50,
    formula: 'F = (C × 9/5) + 32',
    description: 'Celsius to Fahrenheit conversion',
    extract: (m) => ({
      expression: `(${m[1]} * 9/5) + 32`,
      result: parseNumber(m[2])!,
      formula: 'F = (C × 9/5) + 32'
    })
  },
];

// ============================================
// GENERIC ARITHMETIC (Priority 10-20)
// ============================================

export const GENERIC_PATTERNS: ClaimPattern[] = [
  {
    id: 'gen-addition',
    name: 'Addition',
    category: 'generic',
    pattern: /(-?[\d,]+(?:\.\d+)?)\s*\+\s*(-?[\d,]+(?:\.\d+)?)\s*=\s*(-?[\d,]+(?:\.\d+)?)/g,
    priority: 20,
    description: 'Basic addition',
    extract: (m) => ({
      expression: `${m[1]} + ${m[2]}`,
      result: parseNumber(m[3])!
    })
  },
  {
    id: 'gen-subtraction',
    name: 'Subtraction',
    category: 'generic',
    pattern: /(-?[\d,]+(?:\.\d+)?)\s*-\s*(-?[\d,]+(?:\.\d+)?)\s*=\s*(-?[\d,]+(?:\.\d+)?)/g,
    priority: 15,
    description: 'Basic subtraction',
    extract: (m) => ({
      expression: `${m[1]} - ${m[2]}`,
      result: parseNumber(m[3])!
    })
  },
  {
    id: 'gen-multiplication',
    name: 'Multiplication',
    category: 'generic',
    pattern: /(-?[\d,]+(?:\.\d+)?)\s*[×x*]\s*(-?[\d,]+(?:\.\d+)?)\s*=\s*(-?[\d,]+(?:\.\d+)?)/g,
    priority: 15,
    description: 'Basic multiplication',
    extract: (m) => ({
      expression: `${m[1]} * ${m[2]}`,
      result: parseNumber(m[3])!
    })
  },
  {
    id: 'gen-division',
    name: 'Division',
    category: 'generic',
    pattern: /(-?[\d,]+(?:\.\d+)?)\s*[÷/]\s*(-?[\d,]+(?:\.\d+)?)\s*=\s*(-?[\d,]+(?:\.\d+)?)/g,
    priority: 15,
    description: 'Basic division',
    extract: (m) => ({
      expression: `${m[1]} / ${m[2]}`,
      result: parseNumber(m[3])!
    })
  },
  {
    id: 'gen-percentage',
    name: 'Percentage',
    category: 'generic',
    pattern: /(\d+(?:\.\d+)?)\s*%\s*of\s*\$?([\d,]+(?:\.\d+)?)\s*=\s*\$?(-?[\d,]+(?:\.\d+)?)/gi,
    priority: 10,
    description: 'Basic percentage calculation',
    extract: (m) => ({
      expression: `${parseNumber(m[1])! / 100} * ${m[2]}`,
      result: parseNumber(m[3])!
    })
  },
];

// ============================================
// COMBINED PATTERNS
// ============================================

export const CLAIM_PATTERNS: ClaimPattern[] = [
  ...EVM_PATTERNS,
  ...DEFENSE_PATTERNS,
  ...FINANCIAL_PATTERNS,
  ...STATISTICAL_PATTERNS,
  ...CONVERSION_PATTERNS,
  ...GENERIC_PATTERNS,
].sort((a, b) => b.priority - a.priority);

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getPatternsByCategory(category: ClaimCategory): ClaimPattern[] {
  return CLAIM_PATTERNS.filter(p => p.category === category);
}

export function getAllPatternsSorted(): ClaimPattern[] {
  return [...CLAIM_PATTERNS].sort((a, b) => b.priority - a.priority);
}

export function getPatternStats(): Record<ClaimCategory, number> {
  const stats: Record<ClaimCategory, number> = {
    evm: 0,
    defense: 0,
    financial: 0,
    statistical: 0,
    conversion: 0,
    generic: 0,
  };
  
  for (const pattern of CLAIM_PATTERNS) {
    stats[pattern.category]++;
  }
  
  return stats;
}
