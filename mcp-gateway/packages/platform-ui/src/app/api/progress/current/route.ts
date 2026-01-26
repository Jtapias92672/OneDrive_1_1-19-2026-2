/**
 * FORGE Progress API - Current Epic
 *
 * GET /api/progress/current - Returns current epic progress from .forge/progress.md
 */

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { parseProgressMd, getMockEpicProgress } from '@/lib/parsers/progress-parser';

// Check multiple locations for .forge/progress.md
const PROGRESS_PATHS = [
  process.env.FORGE_PROGRESS_PATH,
  join(process.cwd(), '.forge/progress.md'),
  join(process.cwd(), '../.forge/progress.md'),
  join(process.cwd(), '../../.forge/progress.md'),
  join(process.cwd(), '../../../.forge/progress.md'),
].filter(Boolean) as string[];

async function findProgressFile(): Promise<string | null> {
  for (const path of PROGRESS_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const useMock = searchParams.get('mock') === 'true';
  const demoMode = (searchParams.get('demoMode') as 'normal' | 'warning' | 'critical') || 'normal';

  if (useMock) {
    return NextResponse.json(getMockEpicProgress(demoMode));
  }

  try {
    const progressPath = await findProgressFile();

    if (!progressPath) {
      console.warn('progress.md not found in any location, using mock');
      return NextResponse.json({
        ...getMockEpicProgress(demoMode),
        _warning: 'progress.md not found, using mock data',
        _searchedPaths: PROGRESS_PATHS,
      });
    }

    const content = await readFile(progressPath, 'utf-8');
    const progress = parseProgressMd(content);

    return NextResponse.json({
      ...(progress.currentEpic || getMockEpicProgress(demoMode)),
      _source: progressPath,
      _epicsCount: progress.epics.length,
      _overallConfidence: progress.overallConfidence,
    });
  } catch (error) {
    console.error('Failed to read progress.md:', error);
    return NextResponse.json({
      ...getMockEpicProgress(demoMode),
      _error: String(error),
    });
  }
}
