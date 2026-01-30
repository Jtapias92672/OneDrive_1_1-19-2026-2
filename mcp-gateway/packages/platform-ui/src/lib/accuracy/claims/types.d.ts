/**
 * Claim Detection Types
 * Epic 14: Computational Accuracy Layer
 */
export type ClaimCategory = 'mathematical' | 'scientific' | 'temporal' | 'quantitative' | 'technical' | 'factual';
export interface DetectedClaim {
    id: string;
    text: string;
    category: ClaimCategory;
    context: string;
    startIndex: number;
    endIndex: number;
    confidence: number;
    patterns: string[];
}
export interface ClaimDetectionResult {
    contentId: string;
    claims: DetectedClaim[];
    claimDensity: number;
    categories: Record<ClaimCategory, number>;
}
export interface ClaimPattern {
    name: string;
    pattern: RegExp;
    category: ClaimCategory;
    confidence: number;
}
