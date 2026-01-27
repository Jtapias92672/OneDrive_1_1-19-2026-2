/**
 * Knowledge Base
 * Epic 14: Internal fact database for Tier 2 validation
 */

export interface KnowledgeFact {
  value: string;
  confidence: number;
  category?: string;
}

export class KnowledgeBase {
  private facts = new Map<string, KnowledgeFact>([
    // Technology releases
    ['react released', { value: '2013', confidence: 95, category: 'tech' }],
    ['react was released', { value: '2013', confidence: 95, category: 'tech' }],
    ['javascript created', { value: '1995', confidence: 95, category: 'tech' }],
    ['javascript was created', { value: '1995', confidence: 95, category: 'tech' }],
    ['python released', { value: '1991', confidence: 95, category: 'tech' }],
    ['python was released', { value: '1991', confidence: 95, category: 'tech' }],
    ['typescript released', { value: '2012', confidence: 95, category: 'tech' }],
    ['node.js released', { value: '2009', confidence: 95, category: 'tech' }],
    ['vue released', { value: '2014', confidence: 95, category: 'tech' }],
    ['angular released', { value: '2010', confidence: 95, category: 'tech' }],

    // Company founding dates
    ['google founded', { value: '1998', confidence: 95, category: 'company' }],
    ['apple founded', { value: '1976', confidence: 95, category: 'company' }],
    ['microsoft founded', { value: '1975', confidence: 95, category: 'company' }],
    ['amazon founded', { value: '1994', confidence: 95, category: 'company' }],
    ['facebook founded', { value: '2004', confidence: 95, category: 'company' }],
    ['meta founded', { value: '2004', confidence: 95, category: 'company' }],
    ['twitter founded', { value: '2006', confidence: 95, category: 'company' }],
    ['netflix founded', { value: '1997', confidence: 95, category: 'company' }],
    ['tesla founded', { value: '2003', confidence: 95, category: 'company' }],
    ['openai founded', { value: '2015', confidence: 95, category: 'company' }],

    // Historical facts
    ['world wide web invented', { value: '1989', confidence: 95, category: 'history' }],
    ['internet created', { value: '1969', confidence: 90, category: 'history' }],
    ['first computer', { value: '1945', confidence: 85, category: 'history' }],

    // Attribution facts
    ['javascript invented by', { value: 'Brendan Eich', confidence: 95, category: 'attribution' }],
    ['javascript created by', { value: 'Brendan Eich', confidence: 95, category: 'attribution' }],
    ['python created by', { value: 'Guido van Rossum', confidence: 95, category: 'attribution' }],
    ['linux created by', { value: 'Linus Torvalds', confidence: 95, category: 'attribution' }],
    ['react created by', { value: 'Jordan Walke', confidence: 90, category: 'attribution' }],
  ]);

  /**
   * Look up a fact in the knowledge base
   */
  async lookup(text: string): Promise<KnowledgeFact | null> {
    const lowerText = text.toLowerCase();

    for (const [key, fact] of Array.from(this.facts.entries())) {
      if (lowerText.includes(key)) {
        return fact;
      }
    }

    return null;
  }

  /**
   * Check if text contains a year that matches a known fact
   */
  async lookupWithYear(text: string): Promise<{ fact: KnowledgeFact; year: string } | null> {
    const lowerText = text.toLowerCase();
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);

    if (!yearMatch) return null;

    const year = yearMatch[0];

    for (const [key, fact] of Array.from(this.facts.entries())) {
      if (lowerText.includes(key) && fact.value === year) {
        return { fact, year };
      }
    }

    return null;
  }

  /**
   * Get fact count
   */
  getFactCount(): number {
    return this.facts.size;
  }
}

export const knowledgeBase = new KnowledgeBase();
