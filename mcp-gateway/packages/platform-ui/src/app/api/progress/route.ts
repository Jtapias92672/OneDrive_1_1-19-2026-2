/**
 * FORGE Progress API Route
 *
 * GET /api/progress - Returns parsed progress.md data
 */

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parseProgressMd, getMockEpicProgress } from '@/lib/parsers/progress-parser';

// Path to .forge/progress.md relative to project root
const PROGRESS_FILE_PATH = process.env.FORGE_PROGRESS_PATH || join(process.cwd(), '../../.forge/progress.md');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const useMock = searchParams.get('mock') === 'true';

  if (useMock) {
    const demoMode = (searchParams.get('demoMode') as 'normal' | 'warning' | 'critical') || 'normal';
    return NextResponse.json({
      currentEpic: getMockEpicProgress(demoMode),
      epics: [getMockEpicProgress(demoMode)],
      overallConfidence: demoMode === 'critical' ? 72 : demoMode === 'warning' ? 85 : 97,
      lastUpdated: new Date().toISOString(),
      totalTasksComplete: 5,
      totalTasksTotal: 8,
    });
  }

  try {
    const content = await readFile(PROGRESS_FILE_PATH, 'utf-8');
    const progress = parseProgressMd(content);
    return NextResponse.json(progress);
  } catch (error) {
    console.error('Failed to read progress.md:', error);

    // Fallback to mock data if file not found
    return NextResponse.json({
      currentEpic: getMockEpicProgress('normal'),
      epics: [getMockEpicProgress('normal')],
      overallConfidence: 97,
      lastUpdated: new Date().toISOString(),
      totalTasksComplete: 5,
      totalTasksTotal: 8,
      _error: 'progress.md not found, using mock data',
    });
  }
}
