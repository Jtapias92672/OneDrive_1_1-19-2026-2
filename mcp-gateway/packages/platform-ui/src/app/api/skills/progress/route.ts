// GET /api/skills/progress - Skill progress
import { NextResponse } from 'next/server';
import { mockSkillProgress } from '@/lib/persona/mock-data';

export async function GET() {
  // In production, fetch based on userId
  return NextResponse.json(mockSkillProgress);
}
