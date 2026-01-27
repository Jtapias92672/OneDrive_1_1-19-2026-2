/**
 * Frontier Service
 * Epic 14: Manage AI capability boundaries by task type
 */

import {
  TaskType,
  FrontierZone,
  FrontierOutcome,
  FrontierStats,
  ZoneStatus,
} from './types';

const DEFAULT_ZONES: Map<TaskType, FrontierZone> = new Map([
  [
    'code-generation',
    {
      taskType: 'code-generation',
      successRate: 85,
      totalAttempts: 1000,
      successfulAttempts: 850,
      averageConfidence: 82,
      lastUpdated: new Date(),
      status: 'green',
      recommendedWorkflow: 'supervised',
      riskFactors: ['complexity', 'edge-cases'],
    },
  ],
  [
    'code-review',
    {
      taskType: 'code-review',
      successRate: 90,
      totalAttempts: 500,
      successfulAttempts: 450,
      averageConfidence: 88,
      lastUpdated: new Date(),
      status: 'green',
      recommendedWorkflow: 'autonomous',
      riskFactors: ['context-depth'],
    },
  ],
  [
    'bug-fix',
    {
      taskType: 'bug-fix',
      successRate: 75,
      totalAttempts: 800,
      successfulAttempts: 600,
      averageConfidence: 72,
      lastUpdated: new Date(),
      status: 'yellow',
      recommendedWorkflow: 'supervised',
      riskFactors: ['root-cause', 'side-effects'],
    },
  ],
  [
    'refactoring',
    {
      taskType: 'refactoring',
      successRate: 80,
      totalAttempts: 400,
      successfulAttempts: 320,
      averageConfidence: 78,
      lastUpdated: new Date(),
      status: 'green',
      recommendedWorkflow: 'supervised',
      riskFactors: ['breaking-changes'],
    },
  ],
  [
    'documentation',
    {
      taskType: 'documentation',
      successRate: 92,
      totalAttempts: 600,
      successfulAttempts: 552,
      averageConfidence: 90,
      lastUpdated: new Date(),
      status: 'green',
      recommendedWorkflow: 'autonomous',
      riskFactors: ['accuracy'],
    },
  ],
  [
    'testing',
    {
      taskType: 'testing',
      successRate: 82,
      totalAttempts: 700,
      successfulAttempts: 574,
      averageConfidence: 80,
      lastUpdated: new Date(),
      status: 'green',
      recommendedWorkflow: 'supervised',
      riskFactors: ['coverage', 'edge-cases'],
    },
  ],
  [
    'architecture',
    {
      taskType: 'architecture',
      successRate: 60,
      totalAttempts: 200,
      successfulAttempts: 120,
      averageConfidence: 55,
      lastUpdated: new Date(),
      status: 'yellow',
      recommendedWorkflow: 'human-required',
      riskFactors: ['complexity', 'long-term-impact', 'context'],
    },
  ],
  [
    'data-analysis',
    {
      taskType: 'data-analysis',
      successRate: 78,
      totalAttempts: 300,
      successfulAttempts: 234,
      averageConfidence: 75,
      lastUpdated: new Date(),
      status: 'yellow',
      recommendedWorkflow: 'supervised',
      riskFactors: ['data-quality', 'interpretation'],
    },
  ],
  [
    'ui-design',
    {
      taskType: 'ui-design',
      successRate: 70,
      totalAttempts: 400,
      successfulAttempts: 280,
      averageConfidence: 68,
      lastUpdated: new Date(),
      status: 'yellow',
      recommendedWorkflow: 'supervised',
      riskFactors: ['aesthetics', 'ux', 'accessibility'],
    },
  ],
  [
    'api-design',
    {
      taskType: 'api-design',
      successRate: 85,
      totalAttempts: 350,
      successfulAttempts: 298,
      averageConfidence: 82,
      lastUpdated: new Date(),
      status: 'green',
      recommendedWorkflow: 'supervised',
      riskFactors: ['consistency', 'versioning'],
    },
  ],
  [
    'security-review',
    {
      taskType: 'security-review',
      successRate: 65,
      totalAttempts: 250,
      successfulAttempts: 163,
      averageConfidence: 60,
      lastUpdated: new Date(),
      status: 'red',
      recommendedWorkflow: 'human-required',
      riskFactors: ['false-negatives', 'novel-attacks', 'context'],
    },
  ],
  [
    'performance-optimization',
    {
      taskType: 'performance-optimization',
      successRate: 72,
      totalAttempts: 300,
      successfulAttempts: 216,
      averageConfidence: 70,
      lastUpdated: new Date(),
      status: 'yellow',
      recommendedWorkflow: 'supervised',
      riskFactors: ['measurement', 'trade-offs', 'environment'],
    },
  ],
]);

export class FrontierService {
  private zones: Map<TaskType, FrontierZone>;
  private outcomes: FrontierOutcome[] = [];

  constructor() {
    this.zones = new Map(DEFAULT_ZONES);
  }

  /**
   * Get all frontier zones
   */
  getAllZones(): FrontierZone[] {
    return Array.from(this.zones.values());
  }

  /**
   * Get zone by task type
   */
  getZone(taskType: TaskType): FrontierZone | null {
    return this.zones.get(taskType) || null;
  }

  /**
   * Record an outcome and update the zone
   */
  recordOutcome(outcome: FrontierOutcome): FrontierZone {
    this.outcomes.push(outcome);

    const zone = this.zones.get(outcome.taskType);
    if (!zone) {
      throw new Error(`Unknown task type: ${outcome.taskType}`);
    }

    // Update zone statistics
    const updatedZone: FrontierZone = {
      ...zone,
      totalAttempts: zone.totalAttempts + 1,
      successfulAttempts: zone.successfulAttempts + (outcome.success ? 1 : 0),
      successRate: 0,
      averageConfidence: 0,
      lastUpdated: new Date(),
      status: 'green',
      recommendedWorkflow: 'autonomous',
    };

    updatedZone.successRate = Math.round(
      (updatedZone.successfulAttempts / updatedZone.totalAttempts) * 100
    );

    // Recalculate average confidence
    const recentOutcomes = this.outcomes
      .filter((o) => o.taskType === outcome.taskType)
      .slice(-100);
    updatedZone.averageConfidence = Math.round(
      recentOutcomes.reduce((sum, o) => sum + o.confidence, 0) / recentOutcomes.length
    );

    // Update status based on success rate
    updatedZone.status = this.calculateStatus(updatedZone.successRate);
    updatedZone.recommendedWorkflow = this.calculateWorkflow(updatedZone.status);

    this.zones.set(outcome.taskType, updatedZone);
    return updatedZone;
  }

  /**
   * Get frontier statistics
   */
  getStats(): FrontierStats {
    const zones = this.getAllZones();
    const greenZones = zones.filter((z) => z.status === 'green');
    const yellowZones = zones.filter((z) => z.status === 'yellow');
    const redZones = zones.filter((z) => z.status === 'red');

    const totalSuccess = zones.reduce((sum, z) => sum + z.successfulAttempts, 0);
    const totalAttempts = zones.reduce((sum, z) => sum + z.totalAttempts, 0);

    const sortedBySuccess = [...zones].sort((a, b) => b.successRate - a.successRate);

    return {
      totalZones: zones.length,
      greenZones: greenZones.length,
      yellowZones: yellowZones.length,
      redZones: redZones.length,
      overallSuccessRate: totalAttempts > 0 ? Math.round((totalSuccess / totalAttempts) * 100) : 0,
      mostReliable: sortedBySuccess.slice(0, 3).map((z) => z.taskType),
      leastReliable: sortedBySuccess.slice(-3).map((z) => z.taskType),
    };
  }

  /**
   * Get recommended workflow for a task type
   */
  getRecommendation(taskType: TaskType): {
    workflow: 'autonomous' | 'supervised' | 'human-required';
    confidence: number;
    reasons: string[];
  } {
    const zone = this.zones.get(taskType);
    if (!zone) {
      return {
        workflow: 'human-required',
        confidence: 0,
        reasons: ['Unknown task type'],
      };
    }

    return {
      workflow: zone.recommendedWorkflow,
      confidence: zone.averageConfidence,
      reasons: zone.riskFactors.map((f) => `Risk factor: ${f}`),
    };
  }

  /**
   * Reset to default zones
   */
  reset(): void {
    this.zones = new Map(DEFAULT_ZONES);
    this.outcomes = [];
  }

  private calculateStatus(successRate: number): ZoneStatus {
    if (successRate >= 80) return 'green';
    if (successRate >= 65) return 'yellow';
    return 'red';
  }

  private calculateWorkflow(
    status: ZoneStatus
  ): 'autonomous' | 'supervised' | 'human-required' {
    switch (status) {
      case 'green':
        return 'autonomous';
      case 'yellow':
        return 'supervised';
      case 'red':
        return 'human-required';
    }
  }
}

export const frontierService = new FrontierService();
