/**
 * POST /api/accuracy/validate
 * Validate claims in content with multi-tier validation
 * Epic 14: Computational Accuracy Layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { claimDetector, ClaimCategory } from '@/lib/accuracy/claims';
import {
  Tier1Validator,
  Tier2Validator,
  Tier3Validator,
  ValidationPipeline,
  ValidationStore,
  KnowledgeBase,
} from '@/lib/accuracy/validation';
import { WolframClient, WolframCache } from '@/lib/accuracy/wolfram';

// Initialize components
const tier1 = new Tier1Validator();
const knowledgeBase = new KnowledgeBase();
const wolframCache = new WolframCache();
const tier2 = new Tier2Validator(knowledgeBase, wolframCache);
const wolframClient = new WolframClient({}, wolframCache);
const tier3 = new Tier3Validator(wolframClient);
const store = new ValidationStore();
const pipeline = new ValidationPipeline(tier1, tier2, tier3, store);

interface ValidateRequest {
  content: string;
  contentId?: string;
  options?: {
    allowWolfram?: boolean;
    maxWolframCalls?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidateRequest = await request.json();

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (body.content.length > 100000) {
      return NextResponse.json({ error: 'Content exceeds maximum length' }, { status: 400 });
    }

    // Step 1: Detect claims
    const detection = claimDetector.detect(body.content, body.contentId);

    if (detection.claims.length === 0) {
      return NextResponse.json({
        contentId: detection.contentId,
        claims: [],
        confidence: {
          overallScore: 100,
          level: 'high',
          claimCount: 0,
          verifiedCount: 0,
          unverifiedCount: 0,
          failedCount: 0,
          categoryScores: {},
          factors: [],
        },
        totalCost: 0,
        validatedAt: new Date().toISOString(),
      });
    }

    // Step 2: Validate claims
    const validation = await pipeline.validate(detection.claims, {
      allowWolfram: body.options?.allowWolfram ?? true,
      maxWolframCalls: body.options?.maxWolframCalls ?? 10,
      cacheResults: true,
    });

    // Format response
    return NextResponse.json({
      contentId: validation.contentId,
      claims: validation.claims.map((c) => ({
        claimId: c.claimId,
        claim: {
          text: c.claim.text,
          category: c.claim.category,
          context: c.claim.context,
        },
        tier: c.tier,
        source: c.source,
        status: c.status,
        expectedValue: c.expectedValue,
        actualValue: c.actualValue,
        match: c.match,
        confidence: c.confidence,
        wolframUsed: c.wolframUsed,
      })),
      confidence: validation.confidence,
      totalCost: validation.totalCost,
      validatedAt: validation.validatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[Validation] Error:', error);
    return NextResponse.json({ error: 'Failed to validate content' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/accuracy/validate',
    method: 'POST',
    description: 'Validate claims in content using multi-tier validation',
    tiers: {
      1: 'Local/Static validation (arithmetic, constants)',
      2: 'Knowledge base + Wolfram cache',
      3: 'Wolfram Alpha API',
    },
    requestBody: {
      content: 'string (required)',
      contentId: 'string (optional)',
      options: {
        allowWolfram: 'boolean (default: true)',
        maxWolframCalls: 'number (default: 10)',
      },
    },
  });
}
