/**
 * FORGE Platform - Computational Claim Patterns
 * @epic 14.1 - Computational Accuracy Layer
 * 
 * 44 patterns for detecting computational claims across:
 * - EVM (Earned Value Management) - 9 patterns
 * - Defense Contractor - 6 patterns
 * - Financial - 4 patterns
 * - Statistical - 3 patterns
 * - Conversion - 2 patterns
 * - Generic Arithmetic - 5 patterns
 * - Advanced - 15 patterns
 */

// ============================================================================
// Types
// ============================================================================

export interface ClaimPattern {
  id: string;
  name: string;
  category: 'evm' | 'defense' | 'financial' | 'statistical' | 'conversion' | 'generic' | 'advanced';
  priority: number;  // 0-100, higher = more specific
  pattern: string;   // RegExp pattern string
  description: string;
  examples: string[];
  formula?: string;
  extract?: (match: RegExpExecArray) => { expression: string; expectedValue: number };
  validate?: (value: number, inputs: Record<string, number>) => boolean;
}

// ============================================================================
// EVM Patterns (Priority 90-100)
// ============================================================================

export const evmPatterns: ClaimPattern[] = [
  {
    id: 'evm-cpi',
    name: 'Cost Performance Index (CPI)',
    category: 'evm',
    priority: 100,
    pattern: String.raw`CPI\s*=\s*(?:EV\s*\/\s*AC\s*=\s*)?(\d[\d,]*(?:\.\d+)?)\s*\/\s*(\d[\d,]*(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)`,
    description: 'Cost Performance Index = Earned Value / Actual Cost',
    examples: [
      'CPI = EV / AC = 750000 / 680000 = 1.103',
      'CPI = 500000 / 450000 = 1.11',
    ],
    formula: 'EV / AC',
    extract: (match) => ({
      expression: `${match[1]} / ${match[2]}`,
      expectedValue: parseFloat(match[3]),
    }),
    validate: (value, inputs) => {
      const expected = inputs.EV / inputs.AC;
      return Math.abs(value - expected) < 0.01;
    },
  },
  {
    id: 'evm-spi',
    name: 'Schedule Performance Index (SPI)',
    category: 'evm',
    priority: 100,
    pattern: String.raw`SPI\s*=\s*(?:EV\s*\/\s*PV\s*=\s*)?(\d[\d,]*(?:\.\d+)?)\s*\/\s*(\d[\d,]*(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)`,
    description: 'Schedule Performance Index = Earned Value / Planned Value',
    examples: [
      'SPI = EV / PV = 750000 / 700000 = 1.071',
      'SPI = 450000 / 500000 = 0.90',
    ],
    formula: 'EV / PV',
    extract: (match) => ({
      expression: `${match[1]} / ${match[2]}`,
      expectedValue: parseFloat(match[3]),
    }),
  },
  {
    id: 'evm-eac',
    name: 'Estimate at Completion (EAC)',
    category: 'evm',
    priority: 95,
    pattern: String.raw`EAC\s*=\s*(?:BAC\s*\/\s*CPI\s*=\s*)?(\d[\d,]*(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)`,
    description: 'Estimate at Completion = Budget at Completion / CPI',
    examples: [
      'EAC = BAC / CPI = 1000000 / 1.103 = 906,618',
      'EAC = 500000 / 0.95 = 526,316',
    ],
    formula: 'BAC / CPI',
  },
  {
    id: 'evm-etc',
    name: 'Estimate to Complete (ETC)',
    category: 'evm',
    priority: 95,
    pattern: String.raw`ETC\s*=\s*(?:EAC\s*-\s*AC\s*=\s*)?\$?(\d[\d,]*(?:\.\d+)?)\s*-\s*\$?(\d[\d,]*(?:\.\d+)?)\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)`,
    description: 'Estimate to Complete = EAC - Actual Cost',
    examples: [
      'ETC = EAC - AC = 906618 - 680000 = 226,618',
    ],
    formula: 'EAC - AC',
  },
  {
    id: 'evm-vac',
    name: 'Variance at Completion (VAC)',
    category: 'evm',
    priority: 95,
    pattern: String.raw`VAC\s*=\s*(?:BAC\s*-\s*EAC\s*=\s*)?\$?(\d[\d,]*(?:\.\d+)?)\s*-\s*\$?(\d[\d,]*(?:\.\d+)?)\s*=\s*\$?(-?\d[\d,]*(?:\.\d+)?)`,
    description: 'Variance at Completion = BAC - EAC',
    examples: [
      'VAC = BAC - EAC = 1000000 - 906618 = 93,382',
    ],
    formula: 'BAC - EAC',
  },
  {
    id: 'evm-cv',
    name: 'Cost Variance (CV)',
    category: 'evm',
    priority: 90,
    pattern: String.raw`CV\s*=\s*(?:EV\s*-\s*AC\s*=\s*)?\$?(\d[\d,]*(?:\.\d+)?)\s*-\s*\$?(\d[\d,]*(?:\.\d+)?)\s*=\s*\$?(-?\d[\d,]*(?:\.\d+)?)`,
    description: 'Cost Variance = Earned Value - Actual Cost',
    examples: [
      'CV = EV - AC = 750000 - 680000 = 70,000',
    ],
    formula: 'EV - AC',
  },
  {
    id: 'evm-sv',
    name: 'Schedule Variance (SV)',
    category: 'evm',
    priority: 90,
    pattern: String.raw`SV\s*=\s*(?:EV\s*-\s*PV\s*=\s*)?\$?(\d[\d,]*(?:\.\d+)?)\s*-\s*\$?(\d[\d,]*(?:\.\d+)?)\s*=\s*\$?(-?\d[\d,]*(?:\.\d+)?)`,
    description: 'Schedule Variance = Earned Value - Planned Value',
    examples: [
      'SV = EV - PV = 750000 - 700000 = 50,000',
    ],
    formula: 'EV - PV',
  },
  {
    id: 'evm-tcpi',
    name: 'To Complete Performance Index (TCPI)',
    category: 'evm',
    priority: 90,
    pattern: String.raw`TCPI\s*=\s*(?:\(BAC\s*-\s*EV\)\s*\/\s*\(BAC\s*-\s*AC\)\s*=\s*)?(?:\()?\s*(\d[\d,]*(?:\.\d+)?)\s*-\s*(\d[\d,]*(?:\.\d+)?)\s*(?:\))?\s*\/\s*(?:\()?\s*(\d[\d,]*(?:\.\d+)?)\s*-\s*(\d[\d,]*(?:\.\d+)?)\s*(?:\))?\s*=\s*(\d+(?:\.\d+)?)`,
    description: 'TCPI = (BAC - EV) / (BAC - AC)',
    examples: [
      'TCPI = (BAC - EV) / (BAC - AC) = (1000000 - 750000) / (1000000 - 680000) = 0.78',
    ],
    formula: '(BAC - EV) / (BAC - AC)',
  },
  {
    id: 'evm-percent-complete',
    name: 'Percent Complete',
    category: 'evm',
    priority: 90,
    pattern: String.raw`(?:%\s*Complete|Percent\s+Complete|completion)\s*=\s*(?:EV\s*\/\s*BAC\s*[×x\*]\s*100\s*=\s*)?(?:(\d[\d,]*(?:\.\d+)?)\s*\/\s*(\d[\d,]*(?:\.\d+)?)\s*[×x\*]\s*100\s*=\s*)?(\d+(?:\.\d+)?)\s*%?`,
    description: 'Percent Complete = (EV / BAC) × 100',
    examples: [
      '% Complete = EV / BAC × 100 = 750000 / 1000000 × 100 = 75%',
      'Percent Complete = 75%',
    ],
    formula: '(EV / BAC) × 100',
  },
];

// ============================================================================
// Defense Contractor Patterns (Priority 80-90)
// ============================================================================

export const defensePatterns: ClaimPattern[] = [
  {
    id: 'defense-award-fee',
    name: 'Award Fee Calculation',
    category: 'defense',
    priority: 90,
    pattern: String.raw`Award\s+Fee\s*=\s*(\d+(?:\.\d+)?)\s*%?\s*[×x\*]\s*\$?(\d[\d,]*(?:\.\d+)?)\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)`,
    description: 'Award Fee = Performance Score × Maximum Fee',
    examples: [
      'Award Fee = 85% × $500,000 = $425,000',
    ],
    formula: 'Performance% × MaxFee',
  },
  {
    id: 'defense-cpif-share',
    name: 'CPIF Share Ratio',
    category: 'defense',
    priority: 85,
    pattern: String.raw`(?:Government|Contractor)\s+share\s*=\s*(\d+(?:\.\d+)?)\s*%?\s*[×x\*]\s*\$?(\d[\d,]*(?:\.\d+)?)\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)`,
    description: 'Share = Share Ratio × (Target Cost - Actual Cost)',
    examples: [
      'Government share = 60% × $100,000 = $60,000',
    ],
    formula: 'ShareRatio × CostVariance',
  },
  {
    id: 'defense-fte-hours',
    name: 'FTE Hours Calculation',
    category: 'defense',
    priority: 85,
    pattern: String.raw`FTE\s*(?:hours?)?\s*=\s*(\d+(?:\.\d+)?)\s*[×x\*]\s*(\d+)\s*(?:hours?\/year)?\s*=\s*(\d[\d,]*(?:\.\d+)?)\s*(?:hours?)?`,
    description: 'FTE Hours = FTE Count × Hours per Year (typically 2080)',
    examples: [
      'FTE hours = 5 × 2080 = 10,400 hours',
      'FTE = 2.5 × 2080 = 5,200',
    ],
    formula: 'FTE × 2080',
  },
  {
    id: 'defense-labor-cost',
    name: 'Burdened Labor Cost',
    category: 'defense',
    priority: 85,
    pattern: String.raw`(?:Labor|Burdened)\s+(?:cost|rate)\s*=\s*\$?(\d+(?:\.\d+)?)\s*(?:\/hr)?\s*[×x\*]\s*(\d+(?:\.\d+)?)\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)`,
    description: 'Burdened Labor = Base Rate × Burden Rate',
    examples: [
      'Labor cost = $125/hr × 1.45 = $181.25',
      'Burdened rate = $100 × 1.52 = $152',
    ],
    formula: 'BaseRate × BurdenRate',
  },
  {
    id: 'defense-ga-rate',
    name: 'G&A Rate Application',
    category: 'defense',
    priority: 80,
    pattern: String.raw`G&A\s*=\s*(\d+(?:\.\d+)?)\s*%?\s*[×x\*]\s*\$?(\d[\d,]*(?:\.\d+)?)\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)`,
    description: 'G&A = G&A Rate × Cost Base',
    examples: [
      'G&A = 12.5% × $1,000,000 = $125,000',
    ],
    formula: 'G&A_Rate × CostBase',
  },
  {
    id: 'defense-odc-markup',
    name: 'ODC Markup',
    category: 'defense',
    priority: 80,
    pattern: String.raw`ODC\s*(?:markup)?\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)\s*[×x\*]\s*(\d+(?:\.\d+)?)\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)`,
    description: 'ODC with Markup = Base ODC × Markup Factor',
    examples: [
      'ODC = $50,000 × 1.08 = $54,000',
    ],
    formula: 'BaseODC × MarkupFactor',
  },
];

// ============================================================================
// Financial Patterns (Priority 75-85)
// ============================================================================

export const financialPatterns: ClaimPattern[] = [
  {
    id: 'financial-compound-interest',
    name: 'Compound Interest',
    category: 'financial',
    priority: 85,
    pattern: String.raw`\$?(\d[\d,]*(?:\.\d+)?)\s*(?:at|@)\s*(\d+(?:\.\d+)?)\s*%\s*(?:APR|interest)?\s*(?:for|over)\s*(\d+)\s*years?\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)`,
    description: 'Future Value = Principal × (1 + rate)^years',
    examples: [
      '$125,000 at 7.5% APR for 5 years = $179,584.54',
      '$100,000 @ 5% interest for 10 years = $162,889.46',
    ],
    formula: 'P × (1 + r)^n',
  },
  {
    id: 'financial-roi',
    name: 'Return on Investment',
    category: 'financial',
    priority: 80,
    pattern: String.raw`ROI\s*=\s*(?:\(?\s*\$?(\d[\d,]*(?:\.\d+)?)\s*-\s*\$?(\d[\d,]*(?:\.\d+)?)\s*\)?\s*\/\s*\$?(\d[\d,]*(?:\.\d+)?)\s*[×x\*]?\s*100?\s*=\s*)?(\d+(?:\.\d+)?)\s*%?`,
    description: 'ROI = (Gain - Cost) / Cost × 100',
    examples: [
      'ROI = (150000 - 100000) / 100000 × 100 = 50%',
      'ROI = 25%',
    ],
    formula: '(Gain - Cost) / Cost × 100',
  },
  {
    id: 'financial-profit-margin',
    name: 'Profit Margin',
    category: 'financial',
    priority: 80,
    pattern: String.raw`(?:Profit\s+)?[Mm]argin\s*=\s*(?:\$?(\d[\d,]*(?:\.\d+)?)\s*\/\s*\$?(\d[\d,]*(?:\.\d+)?)\s*[×x\*]?\s*100?\s*=\s*)?(\d+(?:\.\d+)?)\s*%?`,
    description: 'Profit Margin = Profit / Revenue × 100',
    examples: [
      'Margin = 25000 / 100000 × 100 = 25%',
      'Profit Margin = 15%',
    ],
    formula: 'Profit / Revenue × 100',
  },
  {
    id: 'financial-discount',
    name: 'Discount Calculation',
    category: 'financial',
    priority: 75,
    pattern: String.raw`\$?(\d[\d,]*(?:\.\d+)?)\s*(?:at|with)\s*(\d+(?:\.\d+)?)\s*%\s*(?:off|discount)\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)`,
    description: 'Discounted Price = Original × (1 - discount%)',
    examples: [
      '$100 at 20% off = $80',
      '$500 with 15% discount = $425',
    ],
    formula: 'Price × (1 - discount)',
  },
];

// ============================================================================
// Statistical Patterns (Priority 60-70)
// ============================================================================

export const statisticalPatterns: ClaimPattern[] = [
  {
    id: 'statistical-average',
    name: 'Average / Mean',
    category: 'statistical',
    priority: 70,
    pattern: String.raw`(?:average|mean|avg)\s*=\s*\(?\s*([\d\s,+]+)\s*\)?\s*\/\s*(\d+)\s*=\s*(\d+(?:\.\d+)?)`,
    description: 'Average = Sum of values / Count',
    examples: [
      'average = (10 + 20 + 30) / 3 = 20',
      'mean = (85 + 90 + 95 + 80) / 4 = 87.5',
    ],
    formula: 'Σvalues / n',
  },
  {
    id: 'statistical-weighted-average',
    name: 'Weighted Average',
    category: 'statistical',
    priority: 70,
    pattern: String.raw`weighted\s+average\s*=\s*(?:\(.*?\))?\s*=\s*(\d+(?:\.\d+)?)`,
    description: 'Weighted Average = Σ(value × weight) / Σweight',
    examples: [
      'weighted average = (80 × 0.3 + 90 × 0.7) = 87',
    ],
    formula: 'Σ(value × weight) / Σweight',
  },
  {
    id: 'statistical-growth-rate',
    name: 'Growth Rate',
    category: 'statistical',
    priority: 65,
    pattern: String.raw`[Gg]rowth\s+rate\s*=\s*(?:\(?\s*(\d[\d,]*(?:\.\d+)?)\s*-\s*(\d[\d,]*(?:\.\d+)?)\s*\)?\s*\/\s*(\d[\d,]*(?:\.\d+)?)\s*[×x\*]?\s*100?\s*=\s*)?(\d+(?:\.\d+)?)\s*%?`,
    description: 'Growth Rate = (New - Old) / Old × 100',
    examples: [
      'Growth rate = (120 - 100) / 100 × 100 = 20%',
    ],
    formula: '(New - Old) / Old × 100',
  },
];

// ============================================================================
// Conversion Patterns (Priority 50)
// ============================================================================

export const conversionPatterns: ClaimPattern[] = [
  {
    id: 'conversion-miles-km',
    name: 'Miles to Kilometers',
    category: 'conversion',
    priority: 50,
    pattern: String.raw`(\d+(?:\.\d+)?)\s*(?:miles?|mi)\s*=\s*(\d+(?:\.\d+)?)\s*(?:kilometers?|km)`,
    description: 'Convert miles to kilometers (× 1.60934)',
    examples: [
      '100 miles = 160.934 km',
      '62.137 mi = 100 kilometers',
    ],
    formula: 'miles × 1.60934',
  },
  {
    id: 'conversion-celsius-fahrenheit',
    name: 'Celsius to Fahrenheit',
    category: 'conversion',
    priority: 50,
    pattern: String.raw`(-?\d+(?:\.\d+)?)\s*°?[Cc]\s*=\s*(-?\d+(?:\.\d+)?)\s*°?[Ff]`,
    description: 'Convert Celsius to Fahrenheit: F = C × 9/5 + 32',
    examples: [
      '100°C = 212°F',
      '0 C = 32 F',
    ],
    formula: 'C × 9/5 + 32',
  },
];

// ============================================================================
// Generic Arithmetic Patterns (Priority 10-20)
// ============================================================================

export const genericPatterns: ClaimPattern[] = [
  {
    id: 'generic-addition',
    name: 'Addition',
    category: 'generic',
    priority: 20,
    pattern: String.raw`(\d[\d,]*(?:\.\d+)?)\s*\+\s*(\d[\d,]*(?:\.\d+)?)\s*=\s*(\d[\d,]*(?:\.\d+)?)`,
    description: 'Basic addition: A + B = C',
    examples: [
      '100 + 50 = 150',
      '1,000 + 500 = 1,500',
    ],
    formula: 'A + B',
  },
  {
    id: 'generic-subtraction',
    name: 'Subtraction',
    category: 'generic',
    priority: 20,
    pattern: String.raw`(\d[\d,]*(?:\.\d+)?)\s*-\s*(\d[\d,]*(?:\.\d+)?)\s*=\s*(-?\d[\d,]*(?:\.\d+)?)`,
    description: 'Basic subtraction: A - B = C',
    examples: [
      '100 - 30 = 70',
      '1,000 - 1,500 = -500',
    ],
    formula: 'A - B',
  },
  {
    id: 'generic-multiplication',
    name: 'Multiplication',
    category: 'generic',
    priority: 15,
    pattern: String.raw`(\d[\d,]*(?:\.\d+)?)\s*[×x\*]\s*(\d[\d,]*(?:\.\d+)?)\s*=\s*(\d[\d,]*(?:\.\d+)?)`,
    description: 'Basic multiplication: A × B = C',
    examples: [
      '25 × 4 = 100',
      '12.5 * 8 = 100',
    ],
    formula: 'A × B',
  },
  {
    id: 'generic-division',
    name: 'Division',
    category: 'generic',
    priority: 15,
    pattern: String.raw`(\d[\d,]*(?:\.\d+)?)\s*[÷/]\s*(\d[\d,]*(?:\.\d+)?)\s*=\s*(\d[\d,]*(?:\.\d+)?)`,
    description: 'Basic division: A ÷ B = C',
    examples: [
      '100 / 4 = 25',
      '150 ÷ 6 = 25',
    ],
    formula: 'A / B',
  },
  {
    id: 'generic-percentage',
    name: 'Percentage Calculation',
    category: 'generic',
    priority: 10,
    pattern: String.raw`(\d+(?:\.\d+)?)\s*%\s*(?:of)?\s*\$?(\d[\d,]*(?:\.\d+)?)\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)`,
    description: 'Percentage: X% of Y = Z',
    examples: [
      '10% of 500 = 50',
      '25% of $1,000 = $250',
    ],
    formula: '(X/100) × Y',
  },
];

// ============================================================================
// Advanced Patterns (Priority 60-85)
// ============================================================================

export const advancedPatterns: ClaimPattern[] = [
  {
    id: 'advanced-ratio',
    name: 'Ratio Calculation',
    category: 'advanced',
    priority: 70,
    pattern: String.raw`ratio\s*(?:of)?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:to|:)\s*(\d[\d,]*(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)\s*(?:to|:)\s*1`,
    description: 'Ratio simplification: A:B = X:1',
    examples: [
      'ratio of 100 to 25 = 4:1',
      'ratio 75:25 = 3 to 1',
    ],
    formula: 'A / B',
  },
  {
    id: 'advanced-proportion',
    name: 'Proportion',
    category: 'advanced',
    priority: 65,
    pattern: String.raw`(\d[\d,]*(?:\.\d+)?)\s*\/\s*(\d[\d,]*(?:\.\d+)?)\s*=\s*(\d[\d,]*(?:\.\d+)?)\s*\/\s*(\d[\d,]*(?:\.\d+)?)`,
    description: 'Cross multiplication: A/B = C/D',
    examples: [
      '2/3 = 6/9',
      '100/25 = 400/100',
    ],
    formula: 'A × D = B × C',
  },
  {
    id: 'advanced-square-root',
    name: 'Square Root',
    category: 'advanced',
    priority: 60,
    pattern: String.raw`(?:sqrt|√|square\s+root\s+of)\s*\(?\s*(\d[\d,]*(?:\.\d+)?)\s*\)?\s*=\s*(\d+(?:\.\d+)?)`,
    description: 'Square root calculation',
    examples: [
      'sqrt(16) = 4',
      '√144 = 12',
    ],
    formula: '√x',
  },
  {
    id: 'advanced-power',
    name: 'Exponentiation',
    category: 'advanced',
    priority: 60,
    pattern: String.raw`(\d+(?:\.\d+)?)\s*(?:\^|\*\*|raised\s+to\s+(?:the\s+)?(?:power\s+of\s+)?)\s*(\d+)\s*=\s*(\d[\d,]*(?:\.\d+)?)`,
    description: 'Power calculation: x^n',
    examples: [
      '2^10 = 1024',
      '5 raised to the power of 3 = 125',
    ],
    formula: 'x^n',
  },
  {
    id: 'advanced-parenthetical',
    name: 'Parenthetical Expression',
    category: 'advanced',
    priority: 55,
    pattern: String.raw`\(\s*(\d[\d,]*(?:\.\d+)?)\s*([+\-*/×÷])\s*(\d[\d,]*(?:\.\d+)?)\s*\)\s*([+\-*/×÷])\s*(\d[\d,]*(?:\.\d+)?)\s*=\s*(\d[\d,]*(?:\.\d+)?)`,
    description: 'Expression with parentheses: (A op B) op C',
    examples: [
      '(100 + 50) × 2 = 300',
      '(200 - 50) / 3 = 50',
    ],
    formula: '(A op B) op C',
  },
  // Additional advanced patterns for EVM edge cases
  {
    id: 'advanced-evm-cumulative',
    name: 'Cumulative EVM Values',
    category: 'advanced',
    priority: 85,
    pattern: String.raw`[Cc]umulative\s+(?:EV|AC|PV)\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)\s*(?:\+\s*\$?(\d[\d,]*(?:\.\d+)?)\s*)*=\s*\$?(\d[\d,]*(?:\.\d+)?)`,
    description: 'Cumulative EVM value calculation',
    examples: [
      'Cumulative EV = $100,000 + $150,000 + $200,000 = $450,000',
    ],
    formula: 'Σ periodic values',
  },
  {
    id: 'advanced-variance-percent',
    name: 'Variance Percentage',
    category: 'advanced',
    priority: 80,
    pattern: String.raw`[Vv]ariance\s*%?\s*=\s*(?:\(?\s*(\d[\d,]*(?:\.\d+)?)\s*-\s*(\d[\d,]*(?:\.\d+)?)\s*\)?\s*\/\s*(\d[\d,]*(?:\.\d+)?)\s*[×x\*]\s*100\s*=\s*)?(-?\d+(?:\.\d+)?)\s*%`,
    description: 'Variance as percentage: (Actual - Planned) / Planned × 100',
    examples: [
      'Variance = (105000 - 100000) / 100000 × 100 = 5%',
    ],
    formula: '(Actual - Planned) / Planned × 100',
  },
  {
    id: 'advanced-bcwp',
    name: 'BCWP (Budgeted Cost of Work Performed)',
    category: 'advanced',
    priority: 85,
    pattern: String.raw`BCWP\s*(?:=\s*EV)?\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)`,
    description: 'BCWP is equivalent to Earned Value (EV)',
    examples: [
      'BCWP = EV = $750,000',
      'BCWP = $500,000',
    ],
    formula: 'BCWP = EV',
  },
  {
    id: 'advanced-bcws',
    name: 'BCWS (Budgeted Cost of Work Scheduled)',
    category: 'advanced',
    priority: 85,
    pattern: String.raw`BCWS\s*(?:=\s*PV)?\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)`,
    description: 'BCWS is equivalent to Planned Value (PV)',
    examples: [
      'BCWS = PV = $700,000',
      'BCWS = $600,000',
    ],
    formula: 'BCWS = PV',
  },
  {
    id: 'advanced-acwp',
    name: 'ACWP (Actual Cost of Work Performed)',
    category: 'advanced',
    priority: 85,
    pattern: String.raw`ACWP\s*(?:=\s*AC)?\s*=\s*\$?(\d[\d,]*(?:\.\d+)?)`,
    description: 'ACWP is equivalent to Actual Cost (AC)',
    examples: [
      'ACWP = AC = $680,000',
      'ACWP = $550,000',
    ],
    formula: 'ACWP = AC',
  },
];

// ============================================================================
// Combined Patterns Array
// ============================================================================

export const claimPatterns: ClaimPattern[] = [
  ...evmPatterns,
  ...defensePatterns,
  ...financialPatterns,
  ...statisticalPatterns,
  ...conversionPatterns,
  ...genericPatterns,
  ...advancedPatterns,
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get patterns filtered by category
 */
export function getPatternsByCategory(category: ClaimPattern['category']): ClaimPattern[] {
  return claimPatterns.filter(p => p.category === category);
}

/**
 * Get patterns above a priority threshold
 */
export function getPatternsByPriority(minPriority: number): ClaimPattern[] {
  return claimPatterns.filter(p => p.priority >= minPriority);
}

/**
 * Get a pattern by its ID
 */
export function getPatternById(id: string): ClaimPattern | undefined {
  return claimPatterns.find(p => p.id === id);
}

/**
 * Get all EVM-related patterns (including advanced EVM)
 */
export function getEVMPatterns(): ClaimPattern[] {
  return claimPatterns.filter(p => 
    p.category === 'evm' || 
    p.id.startsWith('advanced-evm') ||
    p.id.startsWith('advanced-bcw') ||
    p.id.startsWith('advanced-acwp')
  );
}

/**
 * Get pattern statistics
 */
export function getPatternStats(): {
  total: number;
  byCategory: Record<string, number>;
  avgPriority: number;
} {
  const byCategory: Record<string, number> = {};
  let totalPriority = 0;
  
  for (const pattern of claimPatterns) {
    byCategory[pattern.category] = (byCategory[pattern.category] || 0) + 1;
    totalPriority += pattern.priority;
  }
  
  return {
    total: claimPatterns.length,
    byCategory,
    avgPriority: totalPriority / claimPatterns.length,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default claimPatterns;
