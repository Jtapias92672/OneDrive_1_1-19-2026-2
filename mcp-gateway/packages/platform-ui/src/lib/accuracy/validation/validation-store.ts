/**
 * Validation Store
 * Epic 14: In-memory storage for validation results
 */

import { ValidationResult, ContentValidation, ContentConfidence } from './types';

export class ValidationStore {
  private results: Map<string, ValidationResult> = new Map();
  private contentValidations: Map<string, ContentValidation> = new Map();

  /**
   * Save a validation result
   */
  async save(result: ValidationResult): Promise<void> {
    this.results.set(result.claimId, result);
  }

  /**
   * Get a validation result by claim ID
   */
  async get(claimId: string): Promise<ValidationResult | null> {
    return this.results.get(claimId) || null;
  }

  /**
   * Save content validation (all claims for a piece of content)
   */
  async saveContentValidation(validation: ContentValidation): Promise<void> {
    this.contentValidations.set(validation.contentId, validation);

    // Also save individual results
    for (const result of validation.claims) {
      await this.save(result);
    }
  }

  /**
   * Get content validation by content ID
   */
  async getContentValidation(contentId: string): Promise<ContentValidation | null> {
    return this.contentValidations.get(contentId) || null;
  }

  /**
   * Get confidence for content
   */
  async getConfidence(contentId: string): Promise<ContentConfidence | null> {
    const validation = await this.getContentValidation(contentId);
    return validation?.confidence || null;
  }

  /**
   * Get all validations
   */
  async getAll(): Promise<ValidationResult[]> {
    return Array.from(this.results.values());
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalResults: number;
    totalValidations: number;
    verifiedCount: number;
    failedCount: number;
  } {
    const results = Array.from(this.results.values());
    return {
      totalResults: results.length,
      totalValidations: this.contentValidations.size,
      verifiedCount: results.filter((r) => r.status === 'verified').length,
      failedCount: results.filter((r) => r.status === 'failed').length,
    };
  }

  /**
   * Clear all stored data
   */
  reset(): void {
    this.results.clear();
    this.contentValidations.clear();
  }
}

export const validationStore = new ValidationStore();
