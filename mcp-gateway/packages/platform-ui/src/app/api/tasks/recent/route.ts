import { NextResponse } from 'next/server';
import { mockRecentTasks } from '@/lib/persona/capability-mock-data';

export async function GET() {
  return NextResponse.json(mockRecentTasks);
}
