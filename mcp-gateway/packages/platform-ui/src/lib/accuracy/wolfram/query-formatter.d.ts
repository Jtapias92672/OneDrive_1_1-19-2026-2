/**
 * Wolfram Query Formatter
 * Epic 14: Format queries by claim type for optimal results
 */
import { DetectedClaim } from '../claims/types';
export interface FormattedQuery {
    query: string;
    type: 'computation' | 'lookup' | 'conversion' | 'factual';
}
export declare class QueryFormatter {
    /**
     * Format a claim for Wolfram Alpha query
     */
    formatQuery(claim: DetectedClaim): FormattedQuery;
    private formatMathematical;
    private formatScientific;
    private formatTemporal;
    private formatQuantitative;
    private formatTechnical;
    private formatFactual;
}
export declare const queryFormatter: QueryFormatter;
