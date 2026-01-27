/**
 * GET /api/accuracy/frontier/:taskType
 * Get frontier zone for specific task type
 * Epic 14: Computational Accuracy Layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { frontierService, TaskType } from '@/lib/accuracy/frontier';

interface RouteParams {
  params: Promise<{ taskType: string }>;
}

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

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskType } = await params;

    if (!taskType || !VALID_TASK_TYPES.includes(taskType as TaskType)) {
      return NextResponse.json(
        {
          error: 'Invalid task type',
          validTypes: VALID_TASK_TYPES,
        },
        { status: 400 }
      );
    }

    const zone = frontierService.getZone(taskType as TaskType);

    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    const recommendation = frontierService.getRecommendation(taskType as TaskType);

    return NextResponse.json({
      zone,
      recommendation,
    });
  } catch (error) {
    console.error('[GetFrontierByType] Error:', error);
    return NextResponse.json({ error: 'Failed to get frontier zone' }, { status: 500 });
  }
}
