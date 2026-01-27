// GET /api/projects - Project list
import { NextRequest, NextResponse } from 'next/server';
import { mockProjects } from '@/lib/persona/mock-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '5', 10);
  const status = searchParams.get('status');

  let projects = mockProjects;

  if (status) {
    projects = projects.filter((p) => p.status === status);
  }

  return NextResponse.json(projects.slice(0, limit));
}
