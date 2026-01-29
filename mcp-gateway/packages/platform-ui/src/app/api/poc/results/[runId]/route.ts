/**
 * FORGE POC Results API
 *
 * GET /api/poc/results/[runId] - Get results for a specific POC run
 *
 * Returns the full POCRunResult including:
 * - Frontend components
 * - Backend files
 * - Inferred models
 * - Test results
 * - Output path (where files were written)
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { POCManifest, POCRunResult } from '@/lib/poc/types';

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { runId } = await params;

  // Try to find the manifest in the generated directory
  const outputDir = './generated';
  const runDir = path.join(outputDir, runId);
  const manifestPath = path.join(runDir, 'manifest.json');

  try {
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest: POCManifest = JSON.parse(manifestContent);

    // Also load inferred models if available
    let inferredModels = [];
    try {
      const modelsContent = await fs.readFile(path.join(runDir, 'inferred-models.json'), 'utf-8');
      inferredModels = JSON.parse(modelsContent);
    } catch {
      // Models file may not exist
    }

    // Build response with file listings
    const frontendFiles = await listDirectoryFiles(path.join(runDir, 'frontend'));
    const backendFiles = await listDirectoryFiles(path.join(runDir, 'backend'));

    return NextResponse.json({
      runId,
      manifest,
      inferredModels,
      files: {
        frontend: frontendFiles,
        backend: backendFiles,
      },
      outputPath: runDir,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json(
        { error: 'Run not found', runId },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to load results', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * List all files in a directory recursively
 */
async function listDirectoryFiles(dir: string): Promise<Array<{ name: string; path: string; size: number }>> {
  const files: Array<{ name: string; path: string; size: number }> = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await listDirectoryFiles(fullPath);
        files.push(...subFiles);
      } else {
        const stats = await fs.stat(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          size: stats.size,
        });
      }
    }
  } catch {
    // Directory may not exist
  }

  return files;
}

/**
 * GET file content
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { runId } = await params;
  const body = await request.json();
  const { filePath } = body as { filePath: string };

  // Security check: ensure the file is within the run directory
  const outputDir = './generated';
  const runDir = path.join(outputDir, runId);
  const resolvedPath = path.resolve(filePath);
  const resolvedRunDir = path.resolve(runDir);

  if (!resolvedPath.startsWith(resolvedRunDir)) {
    return NextResponse.json(
      { error: 'Access denied: file is outside run directory' },
      { status: 403 }
    );
  }

  try {
    const content = await fs.readFile(resolvedPath, 'utf-8');
    return NextResponse.json({ content, path: filePath });
  } catch (error) {
    return NextResponse.json(
      { error: 'File not found', path: filePath },
      { status: 404 }
    );
  }
}
