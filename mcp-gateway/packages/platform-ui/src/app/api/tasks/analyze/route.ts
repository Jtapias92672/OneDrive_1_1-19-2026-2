import { NextRequest, NextResponse } from 'next/server';
import { mockAnalyzeTask } from '@/lib/persona/capability-mock-data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Task description is required' },
        { status: 400 }
      );
    }

    const result = mockAnalyzeTask(description);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'Failed to analyze task' },
      { status: 500 }
    );
  }
}
