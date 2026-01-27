// GET /api/templates - Template list
import { NextRequest, NextResponse } from 'next/server';
import { mockTemplates } from '@/lib/persona/mock-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '6', 10);
  const category = searchParams.get('category');

  let templates = mockTemplates;

  if (category) {
    templates = templates.filter((t) => t.category === category);
  }

  return NextResponse.json(templates.slice(0, limit));
}
