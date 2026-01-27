/**
 * POST /api/accuracy/frontier/outcome
 * Record task outcome to update frontier zone
 * Epic 14: Computational Accuracy Layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { frontierService, TaskType, FrontierOutcome } from '@/lib/accuracy/frontier';

const VALID_TASK_TYPES: TaskType[] = [
  'code-generation',
  'code-review',
  'bug-fix',
  'refactoring',
  'documentation',
  'testing',
  'architecture',
  'data-analysis',
  'ui-design',
  'api-design',
  'security-review',
  'performance-optimization',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { taskType, success, confidence, duration, factors } = body;

    if (!taskType || !VALID_TASK_TYPES.includes(taskType)) {
      return NextResponse.json(
        { error: 'Invalid task type', validTypes: VALID_TASK_TYPES },
        { status: 400 }
      );
    }

    if (typeof success !== 'boolean') {
      return NextResponse.json({ error: 'success must be a boolean' }, { status: 400 });
    }

    if (typeof confidence !== 'number' || confidence < 0 || confidence > 100) {
      return NextResponse.json(
        { error: 'confidence must be a number between 0 and 100' },
        { status: 400 }
      );
    }

    const outcome: FrontierOutcome = {
      taskType,
      success,
      confidence,
      duration: duration || 0,
      factors: factors || [],
      timestamp: new Date(),
    };

    const updatedZone = frontierService.recordOutcome(outcome);

    return NextResponse.json({
      outcome,
      updatedZone,
    });
  } catch (error) {
    console.error('[RecordOutcome] Error:', error);
    return NextResponse.json({ error: 'Failed to record outcome' }, { status: 500 });
  }
}
