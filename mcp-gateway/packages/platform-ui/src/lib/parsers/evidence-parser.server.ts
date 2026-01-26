/**
 * FORGE Evidence Pack Parser - Server-side Operations
 *
 * File system operations for reading evidence packs
 * Only import this in API routes (server-side)
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { EvidencePack, EvidencePacksSummary } from './evidence-parser';
import { getMockEvidencePacksSummary } from './evidence-parser';

// Search paths for evidence packs
const EVIDENCE_PATHS = [
  process.env.FORGE_EVIDENCE_PATH,
  '.forge/evidence-packs',
  '../.forge/evidence-packs',
  '../../.forge/evidence-packs',
  'evidence-packs',
].filter(Boolean) as string[];

/**
 * Find the evidence packs directory
 */
export async function findEvidenceDir(basePath: string): Promise<string | null> {
  for (const relPath of EVIDENCE_PATHS) {
    const fullPath = join(basePath, relPath);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

/**
 * Format file size to human readable
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  return `${diffDays} days ago`;
}

/**
 * Parse a single evidence pack file/directory
 */
async function parsePackFile(filePath: string, fileName: string): Promise<EvidencePack | null> {
  try {
    const stats = await stat(filePath);
    const isDir = stats.isDirectory();

    // Try to read metadata if it's a directory
    let task = 'Unknown task';
    let signed = false;
    let hash: string | undefined;

    if (isDir) {
      const metadataPath = join(filePath, 'metadata.json');
      if (existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
          task = metadata.task || metadata.description || task;
          signed = metadata.signed === true || existsSync(join(filePath, 'signature.sig'));
          hash = metadata.hash;
        } catch {
          // Metadata parsing failed, use defaults
        }
      }
    } else if (fileName.endsWith('.json')) {
      try {
        const content = JSON.parse(await readFile(filePath, 'utf-8'));
        task = content.task || content.description || task;
        signed = content.signed === true;
        hash = content.hash;
      } catch {
        // JSON parsing failed, use defaults
      }
    }

    // Extract ID from filename (e.g., EP-10b-007.json -> EP-10b-007)
    const id = fileName.replace(/\.(json|zip|tar\.gz)$/, '');

    return {
      id,
      task,
      timestamp: formatRelativeTime(stats.mtime),
      size: formatSize(stats.size),
      signed,
      hash,
    };
  } catch {
    return null;
  }
}

/**
 * Parse all evidence packs from a directory
 */
export async function parseEvidencePacks(dir: string): Promise<EvidencePack[]> {
  try {
    const entries = await readdir(dir);
    const packs: EvidencePack[] = [];

    for (const entry of entries) {
      // Skip hidden files and non-pack files
      if (entry.startsWith('.') || entry === 'README.md') continue;

      const fullPath = join(dir, entry);
      const pack = await parsePackFile(fullPath, entry);
      if (pack) {
        packs.push(pack);
      }
    }

    // Sort by ID descending (newest first)
    return packs.sort((a, b) => b.id.localeCompare(a.id));
  } catch {
    return [];
  }
}

/**
 * Get evidence packs summary from filesystem
 */
export async function getEvidencePacksSummary(basePath: string): Promise<EvidencePacksSummary> {
  const evidenceDir = await findEvidenceDir(basePath);

  if (!evidenceDir) {
    return getMockEvidencePacksSummary('normal');
  }

  const packs = await parseEvidencePacks(evidenceDir);

  // Calculate summary
  const sessionPacks = packs.filter(p => {
    // Assume packs from last 24h are session packs
    return p.timestamp.includes('min') || p.timestamp.includes('hr');
  }).length;

  const allSigned = packs.length > 0 && packs.every(p => p.signed);

  return {
    sessionPacks,
    epicTotal: packs.length,
    lastGenerated: packs[0]?.timestamp || 'N/A',
    cmmcReady: allSigned,
    dfarsCompliant: allSigned,
    recentPacks: packs.slice(0, 5),
  };
}
