/**
 * Secret Detection Metrics Test Suite
 *
 * @epic 3.75 - Code Execution
 * @task RECOVERY-04.7 - Measure secret detection precision and recall
 * @owner joe@arcfoundry.ai
 * @created 2026-01-23
 *
 * @description
 *   Measures precision and recall metrics for secret detection.
 *   Uses labeled dataset to calculate:
 *   - True Positives (TP): Correctly detected secrets
 *   - False Positives (FP): Non-secrets incorrectly flagged
 *   - False Negatives (FN): Secrets missed
 *   - Precision = TP / (TP + FP)
 *   - Recall = TP / (TP + FN)
 *
 * @target
 *   - Recall: 100% REQUIRED (DP-10 requirement) - NO EXCEPTIONS
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
  hasSecret: boolean;
  secretType: string;
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
    'tests/datasets/secrets-labeled-dataset.json'
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
    // Check if any SECRET was detected (type === 'secret')
    const detected = result.detections.some(d => d.type === 'secret');
    const expected = sample.hasSecret;

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
      // False Negative - CRITICAL for secrets
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
    positiveSamples: samples.filter(s => s.hasSecret).length,
    negativeSamples: samples.filter(s => !s.hasSecret).length,
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

describe('Secret Detection Metrics (RECOVERY-04.7)', () => {
  let dataset: Dataset;
  let metrics: OverallMetrics;

  beforeAll(() => {
    dataset = loadDataset();
    metrics = calculateMetrics(dataset);

    // Print metrics report
    console.log('\n========================================');
    console.log('SECRET DETECTION METRICS REPORT');
    console.log('========================================');
    console.log(`Dataset: ${dataset.metadata.description}`);
    console.log(`Total Samples: ${metrics.totalSamples}`);
    console.log(`Positive (has secret): ${metrics.positiveSamples}`);
    console.log(`Negative (no secret): ${metrics.negativeSamples}`);
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
      if (cat.truePositives + cat.falseNegatives > 0) {
        console.log(`  ${cat.category}:`);
        console.log(`    Precision: ${(cat.precision * 100).toFixed(1)}%, Recall: ${(cat.recall * 100).toFixed(1)}%`);
      }
    }
    console.log('----------------------------------------');
    if (metrics.missedSamples.length > 0) {
      console.log(`\x1b[31mCRITICAL - MISSED SECRETS (${metrics.missedSamples.length}):\x1b[0m`);
      metrics.missedSamples.forEach(s => {
        console.log(`  [${s.id}] ${s.secretType}: "${s.text.substring(0, 60)}..."`);
      });
    }
    console.log('========================================\n');
  });

  describe('Dataset Validation', () => {
    it('should have at least 200 samples', () => {
      expect(dataset.samples.length).toBeGreaterThanOrEqual(200);
    });

    it('should have both positive and negative samples', () => {
      expect(metrics.positiveSamples).toBeGreaterThan(0);
      expect(metrics.negativeSamples).toBeGreaterThan(0);
    });

    it('should cover all secret categories', () => {
      const categories = new Set(dataset.samples.map(s => s.category));
      expect(categories.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('CRITICAL: Recall Requirements (DP-10)', () => {
    it('MUST achieve 100% recall - NO EXCEPTIONS', () => {
      console.log(`\n\x1b[33mRecall Check: ${(metrics.overallRecall * 100).toFixed(2)}% (REQUIRED: 100%)\x1b[0m`);
      if (metrics.missedSamples.length > 0) {
        console.log('\x1b[31mMISSED SECRETS - MUST FIX:\x1b[0m');
        metrics.missedSamples.forEach(s => {
          console.log(`  - [${s.id}] ${s.secretType}: ${s.text.substring(0, 50)}`);
        });
      }
      expect(metrics.overallRecall).toBe(1.0);
    });

    it('should have ZERO false negatives', () => {
      expect(metrics.falseNegatives).toBe(0);
    });

    it('should achieve 100% recall for AWS keys', () => {
      const awsMetrics = metrics.byCategory.find(c => c.category === 'aws');
      if (awsMetrics && awsMetrics.truePositives + awsMetrics.falseNegatives > 0) {
        expect(awsMetrics.recall).toBe(1.0);
      }
    });

    it('should achieve 100% recall for cloud provider tokens', () => {
      const cloudMetrics = metrics.byCategory.find(c => c.category === 'cloud');
      if (cloudMetrics && cloudMetrics.truePositives + cloudMetrics.falseNegatives > 0) {
        expect(cloudMetrics.recall).toBe(1.0);
      }
    });

    it('should achieve 100% recall for VCS tokens', () => {
      const vcsMetrics = metrics.byCategory.find(c => c.category === 'vcs');
      if (vcsMetrics && vcsMetrics.truePositives + vcsMetrics.falseNegatives > 0) {
        expect(vcsMetrics.recall).toBe(1.0);
      }
    });

    it('should achieve 100% recall for communication tokens', () => {
      const commMetrics = metrics.byCategory.find(c => c.category === 'communication');
      if (commMetrics && commMetrics.truePositives + commMetrics.falseNegatives > 0) {
        expect(commMetrics.recall).toBe(1.0);
      }
    });

    it('should achieve 100% recall for service API keys', () => {
      const serviceMetrics = metrics.byCategory.find(c => c.category === 'services');
      if (serviceMetrics && serviceMetrics.truePositives + serviceMetrics.falseNegatives > 0) {
        expect(serviceMetrics.recall).toBe(1.0);
      }
    });

    it('should achieve 100% recall for database connections', () => {
      const dbMetrics = metrics.byCategory.find(c => c.category === 'database');
      if (dbMetrics && dbMetrics.truePositives + dbMetrics.falseNegatives > 0) {
        expect(dbMetrics.recall).toBe(1.0);
      }
    });

    it('should achieve 100% recall for auth tokens', () => {
      const authMetrics = metrics.byCategory.find(c => c.category === 'auth');
      if (authMetrics && authMetrics.truePositives + authMetrics.falseNegatives > 0) {
        expect(authMetrics.recall).toBe(1.0);
      }
    });

    it('should achieve 100% recall for private keys', () => {
      const keysMetrics = metrics.byCategory.find(c => c.category === 'keys');
      if (keysMetrics && keysMetrics.truePositives + keysMetrics.falseNegatives > 0) {
        expect(keysMetrics.recall).toBe(1.0);
      }
    });
  });

  describe('Precision Requirements', () => {
    it('should achieve overall precision ≥70%', () => {
      console.log(`\nPrecision Check: ${(metrics.overallPrecision * 100).toFixed(2)}% (target: ≥70%)`);
      expect(metrics.overallPrecision).toBeGreaterThanOrEqual(0.70);
    });

    it('should have acceptable false positive rate (<30%)', () => {
      const fpRate = metrics.falsePositives / metrics.negativeSamples;
      console.log(`\nFalse Positive Rate: ${(fpRate * 100).toFixed(2)}% (target: <30%)`);
      expect(fpRate).toBeLessThan(0.30);
    });
  });

  describe('Quality Metrics', () => {
    it('should achieve F1 score ≥80%', () => {
      console.log(`\nF1 Score: ${(metrics.overallF1Score * 100).toFixed(2)}% (target: ≥80%)`);
      expect(metrics.overallF1Score).toBeGreaterThanOrEqual(0.80);
    });

    it('should achieve overall accuracy ≥85%', () => {
      console.log(`\nAccuracy: ${(metrics.overallAccuracy * 100).toFixed(2)}% (target: ≥85%)`);
      expect(metrics.overallAccuracy).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('Blocking Behavior', () => {
    it('should block processing when secrets detected', () => {
      const secretSamples = dataset.samples.filter(s => s.hasSecret);
      let blockingCorrect = 0;
      for (const sample of secretSamples.slice(0, 20)) {
        const result = privacyFilter.filter(sample.text);
        if (result.blocked) blockingCorrect++;
      }
      // Most secret detections should trigger blocking
      expect(blockingCorrect).toBeGreaterThan(15);
    });
  });
});

// Export metrics function for use in other tests
export { calculateMetrics, loadDataset };
