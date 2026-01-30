/**
 * Wolfram Query Formatter
 * Epic 14: Format queries by claim type for optimal results
 */
export class QueryFormatter {
    /**
     * Format a claim for Wolfram Alpha query
     */
    formatQuery(claim) {
        switch (claim.category) {
            case 'mathematical':
                return this.formatMathematical(claim);
            case 'scientific':
                return this.formatScientific(claim);
            case 'temporal':
                return this.formatTemporal(claim);
            case 'quantitative':
                return this.formatQuantitative(claim);
            case 'technical':
                return this.formatTechnical(claim);
            case 'factual':
                return this.formatFactual(claim);
            default:
                return { query: claim.text, type: 'lookup' };
        }
    }
    formatMathematical(claim) {
        const text = claim.text;
        // Arithmetic equations
        if (/\d+\s*[\+\-\*\/x×÷]\s*\d+/.test(text)) {
            // Extract the equation part for computation
            const match = text.match(/(\d+)\s*([\+\-\*\/x×÷])\s*(\d+)/);
            if (match) {
                const op = match[2].replace('x', '*').replace('×', '*').replace('÷', '/');
                return {
                    query: `${match[1]} ${op} ${match[3]}`,
                    type: 'computation',
                };
            }
        }
        // Square roots
        if (text.includes('√')) {
            const match = text.match(/√(\d+)/);
            if (match) {
                return {
                    query: `sqrt(${match[1]})`,
                    type: 'computation',
                };
            }
        }
        // Percentages - calculate base if context suggests
        if (/%/.test(text)) {
            return {
                query: text,
                type: 'computation',
            };
        }
        // Logarithms and trig
        if (/log|sin|cos|tan/i.test(text)) {
            return {
                query: text,
                type: 'computation',
            };
        }
        return { query: `calculate ${text}`, type: 'computation' };
    }
    formatScientific(claim) {
        const text = claim.text.toLowerCase();
        // Speed of light
        if (text.includes('speed of light') || /c\s*=/.test(text)) {
            return { query: 'speed of light in m/s', type: 'lookup' };
        }
        // Gravitational constant
        if (text.includes('gravitational constant') || /g\s*=/.test(text)) {
            return { query: 'gravitational constant value', type: 'lookup' };
        }
        // Avogadro's number
        if (text.includes('avogadro') || text.includes('6.022')) {
            return { query: "Avogadro's number", type: 'lookup' };
        }
        // Planck's constant
        if (text.includes('planck')) {
            return { query: "Planck's constant", type: 'lookup' };
        }
        // Temperature conversions
        if (/\d+\s*°?[CF]/.test(claim.text)) {
            const match = claim.text.match(/(-?\d+)\s*°?([CF])/);
            if (match) {
                const temp = match[1];
                const unit = match[2].toUpperCase();
                const targetUnit = unit === 'C' ? 'F' : 'C';
                return {
                    query: `convert ${temp} ${unit} to ${targetUnit}`,
                    type: 'conversion',
                };
            }
        }
        // Physics units
        if (/joules?|watts?|newtons?|pascals?|hertz|volts?/i.test(text)) {
            return { query: `what is ${claim.text}`, type: 'lookup' };
        }
        return { query: `what is ${claim.text}`, type: 'lookup' };
    }
    formatTemporal(claim) {
        const text = claim.text.toLowerCase();
        // Released/founded in year
        if (/released|founded|created|invented|launched|published/i.test(text)) {
            return { query: text, type: 'factual' };
        }
        // Date calculations
        if (/\d{4}/.test(claim.text)) {
            return { query: claim.text, type: 'lookup' };
        }
        return { query: `when ${claim.text}`, type: 'lookup' };
    }
    formatQuantitative(claim) {
        const text = claim.text;
        // Data size conversions
        if (/\d+\.?\d*\s*(KB|MB|GB|TB|PB)/i.test(text)) {
            return { query: `convert ${text}`, type: 'conversion' };
        }
        // Money
        if (/\$\d+/.test(text)) {
            return { query: text, type: 'lookup' };
        }
        return { query: text, type: 'lookup' };
    }
    formatTechnical(claim) {
        const text = claim.text;
        // Big-O notation - can't really validate computationally
        if (/O\s*\(/.test(text)) {
            return { query: `complexity ${text}`, type: 'lookup' };
        }
        // Version numbers - look up release info
        if (/v?\d+\.\d+/.test(text)) {
            return { query: `${text} release`, type: 'lookup' };
        }
        return { query: text, type: 'lookup' };
    }
    formatFactual(claim) {
        const text = claim.text;
        // Created by / founded by
        if (/created|founded|invented|developed/i.test(text)) {
            return { query: text, type: 'factual' };
        }
        // Capital / president / CEO
        if (/capital|president|CEO|founder/i.test(text)) {
            return { query: text, type: 'factual' };
        }
        return { query: text, type: 'factual' };
    }
}
export const queryFormatter = new QueryFormatter();
