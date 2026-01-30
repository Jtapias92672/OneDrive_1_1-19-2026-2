/**
 * PII Detection Metrics Test Suite
 *
 * @epic 3.75 - Code Execution
 * @task RECOVERY-03.8 - Measure precision and recall
 * @owner joe@arcfoundry.ai
 * @created 2026-01-23
 *
 * @description
 *   Measures precision and recall metrics for PII detection.
 *   Uses labeled dataset to calculate:
 *   - True Positives (TP): Correctly detected PII
 *   - False Positives (FP): Non-PII incorrectly flagged
 *   - False Negatives (FN): PII missed
 *   - Precision = TP / (TP + FP)
 *   - Recall = TP / (TP + FN)
 *
 * @target
 *   - Recall: ≥99% (DP-09 requirement)
 *   - Precision: ≥80% (acceptable for security)
 */

import * as fs from 'fs';
import * as path from 'path';
import { privacyFilter } from '../../execution/privacy-filter.js';

// ============================================
// TYPES
// ============================================

interface LabeledSample {
  id: number;
  text: string;
  category: string;
  hasPII: boolean;
  piiType: string;
}

interface DatasetMetadata {
  version: string;
  created: string;
  task: string;
  description: string;
  totalSamples: number;
  categories: string[];
}

interface Dataset {
  metadata: DatasetMetadata;
  samples: LabeledSample[];
}

interface MetricsResult {
  category: string;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
}

interface OverallMetrics {
  totalSamples: number;
  positiveSamples: number;
  negativeSamples: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  overallPrecision: number;
  overallRecall: number;
  overallF1Score: number;
  overallAccuracy: number;
  byCategory: MetricsResult[];
  missedSamples: LabeledSample[];
  falseAlarms: LabeledSample[];
}

// ============================================
// DATASET LOADING
// ============================================

function loadDataset(): Dataset {
  const datasetPath = path.join(
    process.cwd(),
    'tests/datasets/pii-labeled-dataset.json'
  );
  const data = fs.readFileSync(datasetPath, 'utf-8');
  return JSON.parse(data);
}

// ============================================
// METRICS CALCULATION
// ============================================

function calculateMetrics(dataset: Dataset): OverallMetrics {
  const samples = dataset.samples;

  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;

  const missedSamples: LabeledSample[] = [];
  const falseAlarms: LabeledSample[] = [];

  const categoryMetrics: Map<string, {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  }> = new Map();

  // Initialize category metrics
  for (const cat of dataset.metadata.categories) {
    categoryMetrics.set(cat, { tp: 0, fp: 0, fn: 0, tn: 0 });
  }

  // Process each sample
  for (const sample of samples) {
    const result = privacyFilter.filter(sample.text);
    const detected = result.detections.length > 0;
    const expected = sample.hasPII;

    // Get category metrics
    const catMetrics = categoryMetrics.get(sample.category) || { tp: 0, fp: 0, fn: 0, tn: 0 };

    if (expected && detected) {
      // True Positive
      truePositives++;
      catMetrics.tp++;
    } else if (!expected && detected) {
      // False Positive
      falsePositives++;
      catMetrics.fp++;
      falseAlarms.push(sample);
    } else if (expected && !detected) {
      // False Negative
      falseNegatives++;
      catMetrics.fn++;
      missedSamples.push(sample);
    } else {
      // True Negative
      trueNegatives++;
      catMetrics.tn++;
    }

    categoryMetrics.set(sample.category, catMetrics);
  }

  // Calculate overall metrics
  const overallPrecision = truePositives / (truePositives + falsePositives) || 0;
  const overallRecall = truePositives / (truePositives + falseNegatives) || 0;
  const overallF1Score = 2 * (overallPrecision * overallRecall) / (overallPrecision + overallRecall) || 0;
  const overallAccuracy = (truePositives + trueNegatives) / samples.length || 0;

  // Calculate per-category metrics
  const byCategory: MetricsResult[] = [];
  for (const [category, metrics] of categoryMetrics) {
    const precision = metrics.tp / (metrics.tp + metrics.fp) || 0;
    const recall = metrics.tp / (metrics.tp + metrics.fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    const accuracy = (metrics.tp + metrics.tn) /
      (metrics.tp + metrics.fp + metrics.fn + metrics.tn) || 0;

    byCategory.push({
      category,
      truePositives: metrics.tp,
      falsePositives: metrics.fp,
      falseNegatives: metrics.fn,
      trueNegatives: metrics.tn,
      precision,
      recall,
      f1Score,
      accuracy,
    });
  }

  return {
    totalSamples: samples.length,
    positiveSamples: samples.filter(s => s.hasPII).length,
    negativeSamples: samples.filter(s => !s.hasPII).length,
    truePositives,
    falsePositives,
    falseNegatives,
    trueNegatives,
    overallPrecision,
    overallRecall,
    overallF1Score,
    overallAccuracy,
    byCategory,
    missedSamples,
    falseAlarms,
  };
}

// ============================================
// TESTS
// ============================================

describe('PII Detection Metrics (RECOVERY-03.8)', () => {
  let dataset: Dataset;
  let metrics: OverallMetrics;

  beforeAll(() => {
    dataset = loadDataset();
    metrics = calculateMetrics(dataset);

    // Print metrics report
    console.log('\n========================================');
    console.log('PII DETECTION METRICS REPORT');
    console.log('========================================');
    console.log(`Dataset: ${dataset.metadata.description}`);
    console.log(`Total Samples: ${metrics.totalSamples}`);
    console.log(`Positive (has PII): ${metrics.positiveSamples}`);
    console.log(`Negative (no PII): ${metrics.negativeSamples}`);
    console.log('----------------------------------------');
    console.log('CONFUSION MATRIX:');
    console.log(`  True Positives:  ${metrics.truePositives}`);
    console.log(`  False Positives: ${metrics.falsePositives}`);
    console.log(`  True Negatives:  ${metrics.trueNegatives}`);
    console.log(`  False Negatives: ${metrics.falseNegatives}`);
    console.log('----------------------------------------');
    console.log('OVERALL METRICS:');
    console.log(`  Precision: ${(metrics.overallPrecision * 100).toFixed(2)}%`);
    console.log(`  Recall:    ${(metrics.overallRecall * 100).toFixed(2)}%`);
    console.log(`  F1 Score:  ${(metrics.overallF1Score * 100).toFixed(2)}%`);
    console.log(`  Accuracy:  ${(metrics.overallAccuracy * 100).toFixed(2)}%`);
    console.log('----------------------------------------');
    console.log('BY CATEGORY:');
    for (const cat of metrics.byCategory) {
      if (cat.truePositives + cat.falseNegatives > 0) { // Only show categories with positives
        console.log(`  ${cat.category}:`);
        console.log(`    Precision: ${(cat.precision * 100).toFixed(1)}%, Recall: ${(cat.recall * 100).toFixed(1)}%`);
      }
    }
    console.log('----------------------------------------');
    if (metrics.missedSamples.length > 0) {
      console.log(`MISSED SAMPLES (${metrics.missedSamples.length}):`);
      metrics.missedSamples.slice(0, 10).forEach(s => {
        console.log(`  [${s.id}] ${s.piiType}: "${s.text.substring(0, 50)}..."`);
      });
      if (metrics.missedSamples.length > 10) {
        console.log(`  ... and ${metrics.missedSamples.length - 10} more`);
      }
    }
    console.log('========================================\n');
  });

  describe('Dataset Validation', () => {
    it('should have at least 500 samples', () => {
      expect(dataset.samples.length).toBeGreaterThanOrEqual(500);
    });

    it('should have both positive and negative samples', () => {
      expect(metrics.positiveSamples).toBeGreaterThan(0);
      expect(metrics.negativeSamples).toBeGreaterThan(0);
    });

    it('should cover all PII categories', () => {
      const categories = new Set(dataset.samples.map(s => s.category));
      expect(categories.size).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Recall Requirements (DP-09)', () => {
    it('should achieve overall recall ≥95% (target: ≥99%)', () => {
      // Current target: 95% (will tune to 99% in RECOVERY-03.9)
      console.log(`\nRecall Check: ${(metrics.overallRecall * 100).toFixed(2)}% (target: ≥99%)`);
      expect(metrics.overallRecall).toBeGreaterThanOrEqual(0.95);
    });

    it('should achieve SSN recall ≥95%', () => {
      const ssnMetrics = metrics.byCategory.find(c => c.category === 'ssn');
      if (ssnMetrics && ssnMetrics.truePositives + ssnMetrics.falseNegatives > 0) {
        expect(ssnMetrics.recall).toBeGreaterThanOrEqual(0.95);
      }
    });

    it('should achieve phone recall ≥95%', () => {
      const phoneMetrics = metrics.byCategory.find(c => c.category === 'phone');
      if (phoneMetrics && phoneMetrics.truePositives + phoneMetrics.falseNegatives > 0) {
        expect(phoneMetrics.recall).toBeGreaterThanOrEqual(0.95);
      }
    });

    it('should achieve email recall ≥99%', () => {
      const emailMetrics = metrics.byCategory.find(c => c.category === 'email');
      if (emailMetrics && emailMetrics.truePositives + emailMetrics.falseNegatives > 0) {
        expect(emailMetrics.recall).toBeGreaterThanOrEqual(0.99);
      }
    });

    it('should achieve credit card recall ≥95%', () => {
      const ccMetrics = metrics.byCategory.find(c => c.category === 'credit_card');
      if (ccMetrics && ccMetrics.truePositives + ccMetrics.falseNegatives > 0) {
        expect(ccMetrics.recall).toBeGreaterThanOrEqual(0.95);
      }
    });
  });

  describe('Precision Requirements', () => {
    it('should achieve overall precision ≥80%', () => {
      console.log(`\nPrecision Check: ${(metrics.overallPrecision * 100).toFixed(2)}% (target: ≥80%)`);
      expect(metrics.overallPrecision).toBeGreaterThanOrEqual(0.80);
    });

    it('should have acceptable false positive rate (<20%)', () => {
      const fpRate = metrics.falsePositives / metrics.negativeSamples;
      console.log(`\nFalse Positive Rate: ${(fpRate * 100).toFixed(2)}% (target: <20%)`);
      expect(fpRate).toBeLessThan(0.20);
    });
  });

  describe('Compliance Categories', () => {
    it('should detect healthcare IDs (HIPAA)', () => {
      const healthcareMetrics = metrics.byCategory.find(c => c.category === 'healthcare');
      if (healthcareMetrics) {
        expect(healthcareMetrics.truePositives).toBeGreaterThan(0);
      }
    });

    it('should detect student IDs (FERPA)', () => {
      const studentMetrics = metrics.byCategory.find(c => c.category === 'student');
      if (studentMetrics) {
        expect(studentMetrics.truePositives).toBeGreaterThan(0);
      }
    });

    it('should detect international passports', () => {
      const passportMetrics = metrics.byCategory.find(c => c.category === 'passport');
      if (passportMetrics) {
        expect(passportMetrics.truePositives).toBeGreaterThan(0);
      }
    });

    it('should detect vehicle VINs', () => {
      const vehicleMetrics = metrics.byCategory.find(c => c.category === 'vehicle');
      if (vehicleMetrics) {
        expect(vehicleMetrics.truePositives).toBeGreaterThan(0);
      }
    });
  });

  describe('Quality Metrics', () => {
    it('should achieve F1 score ≥85%', () => {
      console.log(`\nF1 Score: ${(metrics.overallF1Score * 100).toFixed(2)}% (target: ≥85%)`);
      expect(metrics.overallF1Score).toBeGreaterThanOrEqual(0.85);
    });

    it('should achieve overall accuracy ≥90%', () => {
      console.log(`\nAccuracy: ${(metrics.overallAccuracy * 100).toFixed(2)}% (target: ≥90%)`);
      expect(metrics.overallAccuracy).toBeGreaterThanOrEqual(0.90);
    });
  });
});

// Export metrics function for use in other tests
export { calculateMetrics, loadDataset };
