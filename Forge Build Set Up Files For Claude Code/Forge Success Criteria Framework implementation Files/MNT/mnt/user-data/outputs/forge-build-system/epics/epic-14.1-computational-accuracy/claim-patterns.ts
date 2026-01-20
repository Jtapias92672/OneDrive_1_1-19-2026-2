/**
 * FORGE Computational Claim Patterns
 * 
 * @epic 14.1 - Computational Accuracy Layer
 * @task 2.1 - Defense & EVM Claim Detector Patterns
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Comprehensive pattern library for detecting computational claims in
 *   AI agent outputs. Prioritized for defense contractor and EVM contexts.
 */

// ============================================
// TYPES
// ============================================

export type ClaimCategory = 
  | 'evm'           // Earned Value Management
  | 'defense'       // Defense contract specific
  | 'financial'     // General financial calculations
  | 'statistical'   // Statistics and averages
  | 'conversion'    // Unit conversions
  | 'date'          // Date calculations
  | 'generic';      // Basic arithmetic

export interface ExtractedClaim {
  /** Type of calculation */
  type: 'arithmetic' | 'compound_interest' | 'percentage' | 'ratio' | 'conversion';
  
  /** Mathematical expression to evaluate */
  expression: string;
  
  /** The result claimed in the text */
  claimedResult: number;
  
  /** Human-readable context */
  context: string;
  
  /** Formula reference (e.g., "CPI = EV / AC") */
  formula?: string;
  
  /** Additional parameters for complex calculations */
  params?: Record<string, number>;
}

export interface ClaimPattern {
  /** Unique identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Category for grouping */
  category: ClaimCategory;
  
  /** Regex pattern to match */
  pattern: RegExp;
  
  /** Function to extract claim details from match */
  extractor: (match: RegExpMatchArray, fullText: string) => ExtractedClaim | null;
  
  /** Higher priority = checked first (100 = highest) */
  priority: number;
  
  /** Description for documentation */
  description?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse a number string that may contain commas
 */
export function parseNumber(str: string): number {
  if (!str) return NaN;
  const cleaned = str.replace(/,/g, '').replace(/\s/g, '');
  const num = parseFloat(cleaned);
  return num;
}

/**
 * Format number for expression (remove commas)
 */
function formatForExpression(str: string): string {
  return str.replace(/,/g, '');
}

/**
 * Get surrounding context from text
 */
function getContext(text: string, matchIndex: number, matchLength: number, contextSize: number = 50): string {
  const start = Math.max(0, matchIndex - contextSize);
  const end = Math.min(text.length, matchIndex + matchLength + contextSize);
  return text.slice(start, end);
}

// ============================================
// EVM (EARNED VALUE MANAGEMENT) PATTERNS
// ============================================

const evmPatterns: ClaimPattern[] = [
  {
    id: 'evm-cpi-full',
    name: 'CPI Full Calculation',
    category: 'evm',
    description: 'Cost Performance Index with EV and AC values',
    pattern: /CPI\s*[=:]\s*(?:\$?([\d,]+(?:\.\d+)?)\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*)?([\d.]+)/gi,
    extractor: (match, fullText) => {
      const ev = match[1] ? parseNumber(match[1]) : null;
      const ac = match[2] ? parseNumber(match[2]) : null;
      const result = parseNumber(match[3]);
      
      if (ev !== null && ac !== null) {
        return {
          type: 'arithmetic',
          expression: `${ev} / ${ac}`,
          claimedResult: result,
          context: 'CPI (Cost Performance Index) calculation',
          formula: 'CPI = EV / AC'
        };
      }
      
      // Just the result stated, need to find EV/AC elsewhere
      return {
        type: 'ratio',
        expression: `CPI = ${result}`,
        claimedResult: result,
        context: 'CPI value stated',
        formula: 'CPI = EV / AC'
      };
    },
    priority: 100
  },
  
  {
    id: 'evm-cpi-inline',
    name: 'CPI Inline Calculation',
    category: 'evm',
    description: 'CPI calculated inline: EV / AC = result',
    pattern: /(?:EV\s*[\/÷]\s*AC|earned\s+value\s*[\/÷]\s*actual\s+cost)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*([\d.]+)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} / ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'CPI calculation (EV / AC)',
      formula: 'CPI = EV / AC'
    }),
    priority: 100
  },
  
  {
    id: 'evm-spi-full',
    name: 'SPI Full Calculation',
    category: 'evm',
    description: 'Schedule Performance Index with EV and PV values',
    pattern: /SPI\s*[=:]\s*(?:\$?([\d,]+(?:\.\d+)?)\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*)?([\d.]+)/gi,
    extractor: (match) => {
      const ev = match[1] ? parseNumber(match[1]) : null;
      const pv = match[2] ? parseNumber(match[2]) : null;
      const result = parseNumber(match[3]);
      
      if (ev !== null && pv !== null) {
        return {
          type: 'arithmetic',
          expression: `${ev} / ${pv}`,
          claimedResult: result,
          context: 'SPI (Schedule Performance Index) calculation',
          formula: 'SPI = EV / PV'
        };
      }
      
      return {
        type: 'ratio',
        expression: `SPI = ${result}`,
        claimedResult: result,
        context: 'SPI value stated',
        formula: 'SPI = EV / PV'
      };
    },
    priority: 100
  },
  
  {
    id: 'evm-spi-inline',
    name: 'SPI Inline Calculation',
    category: 'evm',
    description: 'SPI calculated inline: EV / PV = result',
    pattern: /(?:EV\s*[\/÷]\s*PV|earned\s+value\s*[\/÷]\s*planned\s+value)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*([\d.]+)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} / ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'SPI calculation (EV / PV)',
      formula: 'SPI = EV / PV'
    }),
    priority: 100
  },
  
  {
    id: 'evm-eac-cpi',
    name: 'EAC using CPI',
    category: 'evm',
    description: 'Estimate at Completion = BAC / CPI',
    pattern: /EAC\s*[=:]\s*(?:BAC\s*[\/÷]\s*CPI\s*[=:]\s*)?\$?([\d,]+(?:\.\d+)?)\s*[\/÷]\s*([\d.]+)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} / ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'EAC (Estimate at Completion) calculation',
      formula: 'EAC = BAC / CPI'
    }),
    priority: 100
  },
  
  {
    id: 'evm-eac-composite',
    name: 'EAC Composite Formula',
    category: 'evm',
    description: 'EAC = AC + (BAC - EV) / CPI',
    pattern: /EAC\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)\s*\+\s*\(\s*\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*\)\s*[\/÷]\s*([\d.]+)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => {
      const ac = parseNumber(match[1]);
      const bac = parseNumber(match[2]);
      const ev = parseNumber(match[3]);
      const cpi = parseNumber(match[4]);
      const result = parseNumber(match[5]);
      
      return {
        type: 'arithmetic',
        expression: `${ac} + (${bac} - ${ev}) / ${cpi}`,
        claimedResult: result,
        context: 'EAC composite formula calculation',
        formula: 'EAC = AC + (BAC - EV) / CPI',
        params: { ac, bac, ev, cpi }
      };
    },
    priority: 95
  },
  
  {
    id: 'evm-etc',
    name: 'ETC Calculation',
    category: 'evm',
    description: 'Estimate to Complete = EAC - AC',
    pattern: /ETC\s*[=:]\s*(?:EAC\s*[-−]\s*AC\s*[=:]\s*)?\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} - ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'ETC (Estimate to Complete) calculation',
      formula: 'ETC = EAC - AC'
    }),
    priority: 100
  },
  
  {
    id: 'evm-vac',
    name: 'VAC Calculation',
    category: 'evm',
    description: 'Variance at Completion = BAC - EAC',
    pattern: /VAC\s*[=:]\s*(?:BAC\s*[-−]\s*EAC\s*[=:]\s*)?\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*[-−]?\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} - ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'VAC (Variance at Completion) calculation',
      formula: 'VAC = BAC - EAC'
    }),
    priority: 100
  },
  
  {
    id: 'evm-cv',
    name: 'Cost Variance',
    category: 'evm',
    description: 'Cost Variance = EV - AC',
    pattern: /(?:CV|cost\s+variance)\s*[=:]\s*(?:EV\s*[-−]\s*AC\s*[=:]\s*)?\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*[-−]?\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} - ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'CV (Cost Variance) calculation',
      formula: 'CV = EV - AC'
    }),
    priority: 100
  },
  
  {
    id: 'evm-sv',
    name: 'Schedule Variance',
    category: 'evm',
    description: 'Schedule Variance = EV - PV',
    pattern: /(?:SV|schedule\s+variance)\s*[=:]\s*(?:EV\s*[-−]\s*PV\s*[=:]\s*)?\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*[-−]?\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} - ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'SV (Schedule Variance) calculation',
      formula: 'SV = EV - PV'
    }),
    priority: 100
  },
  
  {
    id: 'evm-tcpi-bac',
    name: 'TCPI to BAC',
    category: 'evm',
    description: 'To-Complete Performance Index (BAC) = (BAC - EV) / (BAC - AC)',
    pattern: /TCPI\s*(?:\(BAC\))?\s*[=:]\s*\(\s*\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*\)\s*[\/÷]\s*\(\s*\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*\)\s*[=:]\s*([\d.]+)/gi,
    extractor: (match) => {
      const bac1 = parseNumber(match[1]);
      const ev = parseNumber(match[2]);
      const bac2 = parseNumber(match[3]);
      const ac = parseNumber(match[4]);
      const result = parseNumber(match[5]);
      
      return {
        type: 'arithmetic',
        expression: `(${bac1} - ${ev}) / (${bac2} - ${ac})`,
        claimedResult: result,
        context: 'TCPI (To-Complete Performance Index) to BAC',
        formula: 'TCPI = (BAC - EV) / (BAC - AC)',
        params: { bac: bac1, ev, ac }
      };
    },
    priority: 95
  },
  
  {
    id: 'evm-tcpi-eac',
    name: 'TCPI to EAC',
    category: 'evm',
    description: 'To-Complete Performance Index (EAC) = (BAC - EV) / (EAC - AC)',
    pattern: /TCPI\s*\(EAC\)\s*[=:]\s*\(\s*\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*\)\s*[\/÷]\s*\(\s*\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*\)\s*[=:]\s*([\d.]+)/gi,
    extractor: (match) => {
      const bac = parseNumber(match[1]);
      const ev = parseNumber(match[2]);
      const eac = parseNumber(match[3]);
      const ac = parseNumber(match[4]);
      const result = parseNumber(match[5]);
      
      return {
        type: 'arithmetic',
        expression: `(${bac} - ${ev}) / (${eac} - ${ac})`,
        claimedResult: result,
        context: 'TCPI (To-Complete Performance Index) to EAC',
        formula: 'TCPI = (BAC - EV) / (EAC - AC)',
        params: { bac, ev, eac, ac }
      };
    },
    priority: 95
  },
  
  {
    id: 'evm-percent-complete',
    name: 'Percent Complete',
    category: 'evm',
    description: 'Percent Complete = EV / BAC × 100',
    pattern: /(?:percent|%)\s*complete\s*[=:]\s*(?:\$?([\d,]+(?:\.\d+)?)\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*[×x\*]?\s*100\s*[=:]\s*)?([\d.]+)\s*%?/gi,
    extractor: (match) => {
      const ev = match[1] ? parseNumber(match[1]) : null;
      const bac = match[2] ? parseNumber(match[2]) : null;
      const result = parseNumber(match[3]);
      
      if (ev !== null && bac !== null) {
        return {
          type: 'arithmetic',
          expression: `(${ev} / ${bac}) * 100`,
          claimedResult: result,
          context: 'Percent Complete calculation',
          formula: '% Complete = (EV / BAC) × 100'
        };
      }
      
      return {
        type: 'percentage',
        expression: `${result}%`,
        claimedResult: result,
        context: 'Percent Complete stated',
        formula: '% Complete = (EV / BAC) × 100'
      };
    },
    priority: 90
  }
];

// ============================================
// DEFENSE CONTRACT PATTERNS
// ============================================

const defensePatterns: ClaimPattern[] = [
  {
    id: 'defense-award-fee',
    name: 'Award Fee Calculation',
    category: 'defense',
    description: 'Award fee earned from base pool and performance score',
    pattern: /award\s+fee\s*(?:earned)?\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)\s*[×x\*]\s*([\d.]+)\s*%?\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => {
      const pool = parseNumber(match[1]);
      const score = parseNumber(match[2]);
      const result = parseNumber(match[3]);
      
      // Score might be percentage (85) or decimal (0.85)
      const multiplier = score > 1 ? score / 100 : score;
      
      return {
        type: 'arithmetic',
        expression: `${pool} * ${multiplier}`,
        claimedResult: result,
        context: 'Award Fee calculation',
        formula: 'Award Fee = Pool × Performance Score',
        params: { pool, score: multiplier }
      };
    },
    priority: 90
  },
  
  {
    id: 'defense-award-fee-pool',
    name: 'Award Fee Pool Calculation',
    category: 'defense',
    description: 'Award fee pool as percentage of contract value',
    pattern: /(?:award\s+fee\s+pool|fee\s+pool)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)\s*[×x\*]\s*([\d.]+)\s*%\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} * ${parseNumber(match[2])} / 100`,
      claimedResult: parseNumber(match[3]),
      context: 'Award Fee Pool calculation',
      formula: 'Fee Pool = Contract Value × Fee %'
    }),
    priority: 90
  },
  
  {
    id: 'defense-cpif-share',
    name: 'CPIF Share Calculation',
    category: 'defense',
    description: 'Cost-Plus-Incentive-Fee share ratio calculation',
    pattern: /(?:government|contractor)\s+share\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)\s*[×x\*]\s*([\d.]+)\s*%?\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => {
      const variance = parseNumber(match[1]);
      const ratio = parseNumber(match[2]);
      const result = parseNumber(match[3]);
      
      const multiplier = ratio > 1 ? ratio / 100 : ratio;
      
      return {
        type: 'arithmetic',
        expression: `${variance} * ${multiplier}`,
        claimedResult: result,
        context: 'CPIF share ratio calculation',
        formula: 'Share = Variance × Share Ratio',
        params: { variance, ratio: multiplier }
      };
    },
    priority: 90
  },
  
  {
    id: 'defense-cpif-final-fee',
    name: 'CPIF Final Fee',
    category: 'defense',
    description: 'Final fee = Target Fee ± Contractor Share of Variance',
    pattern: /final\s+fee\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)\s*([+\-−])\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => {
      const targetFee = parseNumber(match[1]);
      const operator = match[2] === '+' ? '+' : '-';
      const adjustment = parseNumber(match[3]);
      const result = parseNumber(match[4]);
      
      return {
        type: 'arithmetic',
        expression: `${targetFee} ${operator} ${adjustment}`,
        claimedResult: result,
        context: 'CPIF Final Fee calculation',
        formula: 'Final Fee = Target Fee ± Adjustment'
      };
    },
    priority: 90
  },
  
  {
    id: 'defense-fte-hours',
    name: 'FTE to Hours Conversion',
    category: 'defense',
    description: 'FTE count × hours per FTE = total hours',
    pattern: /([\d,]+(?:\.\d+)?)\s*FTEs?\s*[×x\*]\s*([\d,]+)\s*(?:hours?(?:\/\s*(?:year|yr|month|mo|week|wk))?)\s*[=:]\s*([\d,]+(?:\.\d+)?)\s*(?:total\s+)?hours?/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} * ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'FTE to hours conversion',
      formula: 'Total Hours = FTE × Hours per FTE'
    }),
    priority: 85
  },
  
  {
    id: 'defense-labor-rate',
    name: 'Labor Cost Calculation',
    category: 'defense',
    description: 'Hours × rate = labor cost',
    pattern: /([\d,]+(?:\.\d+)?)\s*hours?\s*[×x\*@]\s*\$?([\d,]+(?:\.\d+)?)\s*(?:\/\s*(?:hour|hr))?\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} * ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'Labor cost calculation',
      formula: 'Labor Cost = Hours × Rate'
    }),
    priority: 85
  },
  
  {
    id: 'defense-wrap-rate',
    name: 'Wrap Rate Application',
    category: 'defense',
    description: 'Direct labor × wrap rate = fully burdened cost',
    pattern: /(?:direct\s+)?(?:labor|cost)\s*\$?([\d,]+(?:\.\d+)?)\s*[×x\*]\s*([\d.]+)\s*(?:wrap\s+rate)?\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} * ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'Wrap rate calculation',
      formula: 'Burdened Cost = Direct Cost × Wrap Rate'
    }),
    priority: 85
  },
  
  {
    id: 'defense-odc',
    name: 'ODC Calculation',
    category: 'defense',
    description: 'Other Direct Costs calculation',
    pattern: /ODC(?:s)?\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)\s*\+\s*\$?([\d,]+(?:\.\d+)?)\s*(?:\+\s*\$?([\d,]+(?:\.\d+)?))?\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => {
      const parts = [parseNumber(match[1]), parseNumber(match[2])];
      if (match[3]) parts.push(parseNumber(match[3]));
      const result = parseNumber(match[4] || match[3]);
      
      return {
        type: 'arithmetic',
        expression: parts.join(' + '),
        claimedResult: result,
        context: 'ODC (Other Direct Costs) calculation',
        formula: 'ODC = Sum of direct costs'
      };
    },
    priority: 80
  },
  
  {
    id: 'defense-g-and-a',
    name: 'G&A Rate Application',
    category: 'defense',
    description: 'G&A (General & Administrative) overhead calculation',
    pattern: /G&A\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)\s*[×x\*]\s*([\d.]+)\s*%?\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => {
      const base = parseNumber(match[1]);
      const rate = parseNumber(match[2]);
      const result = parseNumber(match[3]);
      
      const multiplier = rate > 1 ? rate / 100 : rate;
      
      return {
        type: 'arithmetic',
        expression: `${base} * ${multiplier}`,
        claimedResult: result,
        context: 'G&A overhead calculation',
        formula: 'G&A = Base × G&A Rate',
        params: { base, rate: multiplier }
      };
    },
    priority: 85
  }
];

// ============================================
// FINANCIAL PATTERNS
// ============================================

const financialPatterns: ClaimPattern[] = [
  {
    id: 'financial-compound-interest',
    name: 'Compound Interest',
    category: 'financial',
    description: 'Future value with compound interest',
    pattern: /\$?([\d,]+(?:\.\d+)?)\s*(?:at|@)\s*([\d.]+)\s*%?\s*(?:APR|APY|interest|rate)?\s*(?:for|over|after)\s*(\d+)\s*(years?|months?|quarters?)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => {
      const principal = parseNumber(match[1]);
      const rate = parseNumber(match[2]);
      const periods = parseInt(match[3]);
      const periodType = match[4].toLowerCase();
      const result = parseNumber(match[5]);
      
      // Normalize to annual rate
      const annualRate = rate > 1 ? rate / 100 : rate;
      let n: number;
      
      if (periodType.startsWith('month')) {
        n = periods / 12;
      } else if (periodType.startsWith('quarter')) {
        n = periods / 4;
      } else {
        n = periods;
      }
      
      return {
        type: 'compound_interest',
        expression: `${principal} * (1 + ${annualRate})^${n}`,
        claimedResult: result,
        context: 'Compound interest calculation',
        formula: 'FV = PV × (1 + r)^n',
        params: { principal, rate: annualRate, periods: n }
      };
    },
    priority: 85
  },
  
  {
    id: 'financial-simple-interest',
    name: 'Simple Interest',
    category: 'financial',
    description: 'Simple interest calculation',
    pattern: /simple\s+interest\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)\s*[×x\*]\s*([\d.]+)\s*%?\s*[×x\*]\s*([\d.]+)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => {
      const principal = parseNumber(match[1]);
      const rate = parseNumber(match[2]);
      const time = parseNumber(match[3]);
      const result = parseNumber(match[4]);
      
      const r = rate > 1 ? rate / 100 : rate;
      
      return {
        type: 'arithmetic',
        expression: `${principal} * ${r} * ${time}`,
        claimedResult: result,
        context: 'Simple interest calculation',
        formula: 'I = P × r × t',
        params: { principal, rate: r, time }
      };
    },
    priority: 85
  },
  
  {
    id: 'financial-percentage-of',
    name: 'Percentage Of',
    category: 'financial',
    description: 'X% of Y = Z',
    pattern: /([\d.]+)\s*%\s*(?:of)\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[2])} * ${parseNumber(match[1])} / 100`,
      claimedResult: parseNumber(match[3]),
      context: 'Percentage calculation',
      formula: 'Result = Value × Percentage / 100'
    }),
    priority: 75
  },
  
  {
    id: 'financial-profit-margin',
    name: 'Profit Margin',
    category: 'financial',
    description: 'Profit margin percentage calculation',
    pattern: /(?:profit\s+)?margin\s*[=:]\s*\(?\s*\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*\)?\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*(?:[×x\*]\s*100\s*)?[=:]\s*([\d.]+)\s*%?/gi,
    extractor: (match) => {
      const revenue = parseNumber(match[1]);
      const cost = parseNumber(match[2]);
      const base = parseNumber(match[3]);
      const result = parseNumber(match[4]);
      
      return {
        type: 'arithmetic',
        expression: `((${revenue} - ${cost}) / ${base}) * 100`,
        claimedResult: result,
        context: 'Profit margin calculation',
        formula: 'Margin = ((Revenue - Cost) / Base) × 100'
      };
    },
    priority: 80
  },
  
  {
    id: 'financial-roi',
    name: 'ROI Calculation',
    category: 'financial',
    description: 'Return on Investment percentage',
    pattern: /ROI\s*[=:]\s*\(?\s*\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*\)?\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*(?:[×x\*]\s*100\s*)?[=:]\s*([\d.]+)\s*%?/gi,
    extractor: (match) => {
      const finalValue = parseNumber(match[1]);
      const initialValue = parseNumber(match[2]);
      const investment = parseNumber(match[3]);
      const result = parseNumber(match[4]);
      
      return {
        type: 'arithmetic',
        expression: `((${finalValue} - ${initialValue}) / ${investment}) * 100`,
        claimedResult: result,
        context: 'ROI calculation',
        formula: 'ROI = ((Gain - Cost) / Cost) × 100'
      };
    },
    priority: 80
  },
  
  {
    id: 'financial-markup',
    name: 'Markup Calculation',
    category: 'financial',
    description: 'Price markup from cost',
    pattern: /markup\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)\s*[×x\*]\s*\(?\s*1\s*\+\s*([\d.]+)\s*%?\s*\)?\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => {
      const cost = parseNumber(match[1]);
      const markup = parseNumber(match[2]);
      const result = parseNumber(match[3]);
      
      const markupRate = markup > 1 ? markup / 100 : markup;
      
      return {
        type: 'arithmetic',
        expression: `${cost} * (1 + ${markupRate})`,
        claimedResult: result,
        context: 'Markup calculation',
        formula: 'Price = Cost × (1 + Markup Rate)'
      };
    },
    priority: 75
  },
  
  {
    id: 'financial-discount',
    name: 'Discount Calculation',
    category: 'financial',
    description: 'Price after discount',
    pattern: /\$?([\d,]+(?:\.\d+)?)\s*(?:with|less|minus)\s*([\d.]+)\s*%\s*(?:discount|off)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => {
      const original = parseNumber(match[1]);
      const discount = parseNumber(match[2]);
      const result = parseNumber(match[3]);
      
      return {
        type: 'arithmetic',
        expression: `${original} * (1 - ${discount} / 100)`,
        claimedResult: result,
        context: 'Discount calculation',
        formula: 'Final = Original × (1 - Discount%)'
      };
    },
    priority: 75
  }
];

// ============================================
// STATISTICAL PATTERNS
// ============================================

const statisticalPatterns: ClaimPattern[] = [
  {
    id: 'statistical-average',
    name: 'Average/Mean',
    category: 'statistical',
    description: 'Average of a set of numbers',
    pattern: /(?:average|mean)\s*(?:of|:)?\s*[=:]?\s*\(?([\d,.\s+]+)\)?\s*[\/÷]\s*(\d+)\s*[=:]\s*([\d,]+(?:\.\d+)?)/gi,
    extractor: (match) => {
      const numbersStr = match[1];
      const divisor = parseInt(match[2]);
      const result = parseNumber(match[3]);
      
      // Parse the numbers
      const numbers = numbersStr
        .split(/[+,\s]+/)
        .map(n => parseNumber(n.trim()))
        .filter(n => !isNaN(n));
      
      if (numbers.length === 0) return null;
      
      const sum = numbers.reduce((a, b) => a + b, 0);
      
      return {
        type: 'arithmetic',
        expression: `(${numbers.join(' + ')}) / ${divisor}`,
        claimedResult: result,
        context: 'Average calculation',
        formula: 'Average = Sum / Count',
        params: { sum, count: divisor }
      };
    },
    priority: 65
  },
  
  {
    id: 'statistical-weighted-average',
    name: 'Weighted Average',
    category: 'statistical',
    description: 'Weighted average calculation',
    pattern: /weighted\s+average\s*[=:]\s*\(\s*([\d.]+)\s*[×x\*]\s*([\d.]+)\s*\+\s*([\d.]+)\s*[×x\*]\s*([\d.]+)\s*\)\s*[\/÷]\s*\(\s*([\d.]+)\s*\+\s*([\d.]+)\s*\)\s*[=:]\s*([\d.]+)/gi,
    extractor: (match) => {
      const v1 = parseNumber(match[1]);
      const w1 = parseNumber(match[2]);
      const v2 = parseNumber(match[3]);
      const w2 = parseNumber(match[4]);
      const totalW1 = parseNumber(match[5]);
      const totalW2 = parseNumber(match[6]);
      const result = parseNumber(match[7]);
      
      return {
        type: 'arithmetic',
        expression: `(${v1} * ${w1} + ${v2} * ${w2}) / (${totalW1} + ${totalW2})`,
        claimedResult: result,
        context: 'Weighted average calculation',
        formula: 'WA = Σ(value × weight) / Σ(weights)'
      };
    },
    priority: 70
  },
  
  {
    id: 'statistical-variance-pct',
    name: 'Variance Percentage',
    category: 'statistical',
    description: 'Variance as percentage',
    pattern: /variance\s*[=:]\s*\(?\s*\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*\)?\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*(?:[×x\*]\s*100\s*)?[=:]\s*([\d.]+)\s*%?/gi,
    extractor: (match) => {
      const actual = parseNumber(match[1]);
      const expected = parseNumber(match[2]);
      const base = parseNumber(match[3]);
      const result = parseNumber(match[4]);
      
      return {
        type: 'arithmetic',
        expression: `((${actual} - ${expected}) / ${base}) * 100`,
        claimedResult: result,
        context: 'Variance percentage calculation',
        formula: 'Variance % = ((Actual - Expected) / Base) × 100'
      };
    },
    priority: 70
  },
  
  {
    id: 'statistical-growth-rate',
    name: 'Growth Rate',
    category: 'statistical',
    description: 'Growth rate percentage calculation',
    pattern: /(?:growth|change)\s*(?:rate)?\s*[=:]\s*\(?\s*\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*\)?\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*(?:[×x\*]\s*100\s*)?[=:]\s*([\d.]+)\s*%?/gi,
    extractor: (match) => {
      const current = parseNumber(match[1]);
      const previous = parseNumber(match[2]);
      const base = parseNumber(match[3]);
      const result = parseNumber(match[4]);
      
      return {
        type: 'arithmetic',
        expression: `((${current} - ${previous}) / ${base}) * 100`,
        claimedResult: result,
        context: 'Growth rate calculation',
        formula: 'Growth % = ((New - Old) / Old) × 100'
      };
    },
    priority: 70
  },
  
  {
    id: 'statistical-ratio',
    name: 'Ratio Calculation',
    category: 'statistical',
    description: 'Simple ratio X:Y',
    pattern: /ratio\s*[=:]\s*([\d,]+(?:\.\d+)?)\s*[:\s\/÷]\s*([\d,]+(?:\.\d+)?)\s*[=:]\s*([\d.]+)/gi,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} / ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'Ratio calculation',
      formula: 'Ratio = A / B'
    }),
    priority: 60
  }
];

// ============================================
// CONVERSION PATTERNS
// ============================================

const conversionPatterns: ClaimPattern[] = [
  {
    id: 'conversion-miles-km',
    name: 'Miles to Kilometers',
    category: 'conversion',
    description: 'Miles to kilometers conversion',
    pattern: /([\d,]+(?:\.\d+)?)\s*miles?\s*[=:]\s*([\d,]+(?:\.\d+)?)\s*(?:km|kilometers?)/gi,
    extractor: (match) => ({
      type: 'conversion',
      expression: `${parseNumber(match[1])} * 1.60934`,
      claimedResult: parseNumber(match[2]),
      context: 'Miles to kilometers conversion',
      formula: 'km = miles × 1.60934'
    }),
    priority: 50
  },
  
  {
    id: 'conversion-km-miles',
    name: 'Kilometers to Miles',
    category: 'conversion',
    description: 'Kilometers to miles conversion',
    pattern: /([\d,]+(?:\.\d+)?)\s*(?:km|kilometers?)\s*[=:]\s*([\d,]+(?:\.\d+)?)\s*miles?/gi,
    extractor: (match) => ({
      type: 'conversion',
      expression: `${parseNumber(match[1])} / 1.60934`,
      claimedResult: parseNumber(match[2]),
      context: 'Kilometers to miles conversion',
      formula: 'miles = km / 1.60934'
    }),
    priority: 50
  },
  
  {
    id: 'conversion-feet-meters',
    name: 'Feet to Meters',
    category: 'conversion',
    description: 'Feet to meters conversion',
    pattern: /([\d,]+(?:\.\d+)?)\s*(?:feet|ft)\s*[=:]\s*([\d,]+(?:\.\d+)?)\s*(?:meters?|m)/gi,
    extractor: (match) => ({
      type: 'conversion',
      expression: `${parseNumber(match[1])} * 0.3048`,
      claimedResult: parseNumber(match[2]),
      context: 'Feet to meters conversion',
      formula: 'm = ft × 0.3048'
    }),
    priority: 50
  },
  
  {
    id: 'conversion-lbs-kg',
    name: 'Pounds to Kilograms',
    category: 'conversion',
    description: 'Pounds to kilograms conversion',
    pattern: /([\d,]+(?:\.\d+)?)\s*(?:pounds?|lbs?)\s*[=:]\s*([\d,]+(?:\.\d+)?)\s*(?:kg|kilograms?)/gi,
    extractor: (match) => ({
      type: 'conversion',
      expression: `${parseNumber(match[1])} * 0.453592`,
      claimedResult: parseNumber(match[2]),
      context: 'Pounds to kilograms conversion',
      formula: 'kg = lbs × 0.453592'
    }),
    priority: 50
  },
  
  {
    id: 'conversion-celsius-fahrenheit',
    name: 'Celsius to Fahrenheit',
    category: 'conversion',
    description: 'Temperature conversion C to F',
    pattern: /([\d,]+(?:\.\d+)?)\s*°?\s*[Cc](?:elsius)?\s*[=:]\s*([\d,]+(?:\.\d+)?)\s*°?\s*[Ff](?:ahrenheit)?/gi,
    extractor: (match) => ({
      type: 'conversion',
      expression: `${parseNumber(match[1])} * 9/5 + 32`,
      claimedResult: parseNumber(match[2]),
      context: 'Celsius to Fahrenheit conversion',
      formula: 'F = C × 9/5 + 32'
    }),
    priority: 50
  }
];

// ============================================
// GENERIC ARITHMETIC PATTERNS (FALLBACK)
// ============================================

const genericPatterns: ClaimPattern[] = [
  {
    id: 'generic-parenthetical-division',
    name: 'Parenthetical Division',
    category: 'generic',
    description: '(A - B) / C = result',
    pattern: /\(\s*\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*\)\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*([\d,]+(?:\.\d+)?)/g,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `(${parseNumber(match[1])} - ${parseNumber(match[2])}) / ${parseNumber(match[3])}`,
      claimedResult: parseNumber(match[4]),
      context: 'Parenthetical division'
    }),
    priority: 20
  },
  
  {
    id: 'generic-division',
    name: 'Simple Division',
    category: 'generic',
    description: 'A / B = result',
    pattern: /\$?([\d,]+(?:\.\d+)?)\s*[\/÷]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*([\d.]+)/g,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} / ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'Division calculation'
    }),
    priority: 10
  },
  
  {
    id: 'generic-multiplication',
    name: 'Simple Multiplication',
    category: 'generic',
    description: 'A × B = result',
    pattern: /\$?([\d,]+(?:\.\d+)?)\s*[×x\*]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/g,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} * ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'Multiplication calculation'
    }),
    priority: 10
  },
  
  {
    id: 'generic-addition',
    name: 'Simple Addition',
    category: 'generic',
    description: 'A + B = result',
    pattern: /\$?([\d,]+(?:\.\d+)?)\s*\+\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*\$?([\d,]+(?:\.\d+)?)/g,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} + ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'Addition calculation'
    }),
    priority: 10
  },
  
  {
    id: 'generic-subtraction',
    name: 'Simple Subtraction',
    category: 'generic',
    description: 'A - B = result',
    pattern: /\$?([\d,]+(?:\.\d+)?)\s*[-−]\s*\$?([\d,]+(?:\.\d+)?)\s*[=:]\s*[-−]?\$?([\d,]+(?:\.\d+)?)/g,
    extractor: (match) => ({
      type: 'arithmetic',
      expression: `${parseNumber(match[1])} - ${parseNumber(match[2])}`,
      claimedResult: parseNumber(match[3]),
      context: 'Subtraction calculation'
    }),
    priority: 10
  }
];

// ============================================
// COMBINED PATTERN REGISTRY
// ============================================

/**
 * All claim patterns combined and sorted by priority
 */
export const CLAIM_PATTERNS: ClaimPattern[] = [
  ...evmPatterns,
  ...defensePatterns,
  ...financialPatterns,
  ...statisticalPatterns,
  ...conversionPatterns,
  ...genericPatterns
].sort((a, b) => b.priority - a.priority);

/**
 * Pattern categories for filtering
 */
export const PATTERN_CATEGORIES: ClaimCategory[] = [
  'evm',
  'defense',
  'financial',
  'statistical',
  'conversion',
  'date',
  'generic'
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get patterns by category
 */
export function getPatternsByCategory(category: ClaimCategory): ClaimPattern[] {
  return CLAIM_PATTERNS
    .filter(p => p.category === category)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get all patterns sorted by priority (highest first)
 */
export function getAllPatternsSorted(): ClaimPattern[] {
  return [...CLAIM_PATTERNS];
}

/**
 * Get patterns above a certain priority threshold
 */
export function getPatternsAbovePriority(minPriority: number): ClaimPattern[] {
  return CLAIM_PATTERNS.filter(p => p.priority >= minPriority);
}

/**
 * Get pattern by ID
 */
export function getPatternById(id: string): ClaimPattern | undefined {
  return CLAIM_PATTERNS.find(p => p.id === id);
}

/**
 * Get pattern statistics
 */
export function getPatternStats(): {
  total: number;
  byCategory: Record<ClaimCategory, number>;
  byPriority: { high: number; medium: number; low: number };
} {
  const byCategory = {} as Record<ClaimCategory, number>;
  let high = 0, medium = 0, low = 0;
  
  for (const pattern of CLAIM_PATTERNS) {
    byCategory[pattern.category] = (byCategory[pattern.category] || 0) + 1;
    
    if (pattern.priority >= 80) high++;
    else if (pattern.priority >= 50) medium++;
    else low++;
  }
  
  return {
    total: CLAIM_PATTERNS.length,
    byCategory,
    byPriority: { high, medium, low }
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  evmPatterns,
  defensePatterns,
  financialPatterns,
  statisticalPatterns,
  conversionPatterns,
  genericPatterns
};

export default CLAIM_PATTERNS;
