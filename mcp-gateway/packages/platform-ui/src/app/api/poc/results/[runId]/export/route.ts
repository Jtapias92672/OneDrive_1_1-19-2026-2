/**
 * FORGE POC Export API
 *
 * GET /api/poc/results/[runId]/export - Download run results as ZIP
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Readable } from 'stream';

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { runId } = await params;

  const outputDir = './generated';
  const runDir = path.join(outputDir, runId);

  try {
    // Verify directory exists
    await fs.access(runDir);

    // Create archive
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Collect chunks
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    // Add the entire run directory
    archive.directory(runDir, runId);
    await archive.finalize();

    // Wait for archive to finish
    await new Promise<void>((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="forge-poc-${runId}.zip"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json(
        { error: 'Run not found', runId },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to export', details: String(error) },
      { status: 500 }
    );
  }
}
