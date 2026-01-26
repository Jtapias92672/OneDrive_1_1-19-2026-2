/**
 * MCP Gateway - Virtual Filesystem
 *
 * @epic 3.75 - Code Execution
 * @task 3.75.2.1 - Implement virtual filesystem
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Sandboxed filesystem that prevents access to host system.
 *   Aligned with:
 *   - 09_DATA_PROTECTION § DP-04 (tokenization round-trip)
 *   - 09_DATA_PROTECTION (classification tracking)
 */

import { VirtualFile, VirtualFSStats, DataClassification } from './types.js';

// ============================================
// VIRTUAL FILESYSTEM
// ============================================

export class VirtualFileSystem {
  private files = new Map<string, VirtualFile>();
  private directories = new Set<string>();
  private maxFiles: number;
  private maxFileSize: number;
  private maxTotalSize: number;
  private totalSize: number = 0;

  constructor(options: VirtualFSOptions = {}) {
    this.maxFiles = options.maxFiles ?? 1000;
    this.maxFileSize = options.maxFileSize ?? 10 * 1024 * 1024; // 10MB
    this.maxTotalSize = options.maxTotalSize ?? 100 * 1024 * 1024; // 100MB

    // Initialize root directory
    this.directories.add('/');
  }

  // ==========================================
  // FILE OPERATIONS
  // ==========================================

  /**
   * Write file to virtual filesystem
   */
  writeFile(
    path: string,
    content: string,
    classification?: DataClassification
  ): void {
    const normalizedPath = this.normalizePath(path);

    // Validate path
    if (!this.isValidPath(normalizedPath)) {
      throw new VirtualFSError('Invalid path', 'INVALID_PATH');
    }

    // Check file limit
    if (!this.files.has(normalizedPath) && this.files.size >= this.maxFiles) {
      throw new VirtualFSError('Maximum file limit reached', 'MAX_FILES');
    }

    // Check file size
    const size = Buffer.byteLength(content, 'utf-8');
    if (size > this.maxFileSize) {
      throw new VirtualFSError(
        `File size ${size} exceeds maximum ${this.maxFileSize}`,
        'FILE_TOO_LARGE'
      );
    }

    // Check total size
    const existing = this.files.get(normalizedPath);
    const newTotalSize = this.totalSize - (existing?.size ?? 0) + size;
    if (newTotalSize > this.maxTotalSize) {
      throw new VirtualFSError(
        `Total size would exceed maximum ${this.maxTotalSize}`,
        'QUOTA_EXCEEDED'
      );
    }

    // Ensure parent directory exists
    const parentDir = this.getParentDirectory(normalizedPath);
    if (parentDir && !this.directories.has(parentDir)) {
      this.mkdir(parentDir, true);
    }

    const now = new Date();
    this.files.set(normalizedPath, {
      content,
      createdAt: existing?.createdAt ?? now,
      modifiedAt: now,
      classification: classification ?? existing?.classification ?? 'INTERNAL',
      size,
    });

    this.totalSize = newTotalSize;
  }

  /**
   * Read file from virtual filesystem
   */
  readFile(path: string): string | undefined {
    const normalizedPath = this.normalizePath(path);
    return this.files.get(normalizedPath)?.content;
  }

  /**
   * Check if file exists
   */
  exists(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    return this.files.has(normalizedPath) || this.directories.has(normalizedPath);
  }

  /**
   * Check if path is a file
   */
  isFile(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    return this.files.has(normalizedPath);
  }

  /**
   * Check if path is a directory
   */
  isDirectory(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    return this.directories.has(normalizedPath);
  }

  /**
   * Delete file
   */
  delete(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    const file = this.files.get(normalizedPath);
    if (file) {
      this.totalSize -= file.size;
      return this.files.delete(normalizedPath);
    }
    return false;
  }

  /**
   * Rename/move file
   */
  rename(oldPath: string, newPath: string): boolean {
    const normalizedOld = this.normalizePath(oldPath);
    const normalizedNew = this.normalizePath(newPath);

    const file = this.files.get(normalizedOld);
    if (!file) return false;

    // Ensure new parent directory exists
    const parentDir = this.getParentDirectory(normalizedNew);
    if (parentDir && !this.directories.has(parentDir)) {
      this.mkdir(parentDir, true);
    }

    this.files.set(normalizedNew, {
      ...file,
      modifiedAt: new Date(),
    });
    this.files.delete(normalizedOld);
    return true;
  }

  // ==========================================
  // DIRECTORY OPERATIONS
  // ==========================================

  /**
   * Create directory
   */
  mkdir(path: string, recursive = false): void {
    const normalizedPath = this.normalizePath(path);

    if (recursive) {
      const parts = normalizedPath.split('/').filter(Boolean);
      let currentPath = '';
      for (const part of parts) {
        currentPath += '/' + part;
        this.directories.add(currentPath);
      }
    } else {
      const parentDir = this.getParentDirectory(normalizedPath);
      if (parentDir && !this.directories.has(parentDir)) {
        throw new VirtualFSError('Parent directory does not exist', 'NO_PARENT');
      }
      this.directories.add(normalizedPath);
    }
  }

  /**
   * Remove directory
   */
  rmdir(path: string, recursive = false): boolean {
    const normalizedPath = this.normalizePath(path);

    if (!this.directories.has(normalizedPath)) {
      return false;
    }

    // Check if directory is empty
    const contents = this.list(normalizedPath);
    if (contents.length > 0) {
      if (!recursive) {
        throw new VirtualFSError('Directory not empty', 'NOT_EMPTY');
      }
      // Recursively delete contents
      for (const item of contents) {
        const itemPath = `${normalizedPath}/${item}`;
        if (this.isDirectory(itemPath)) {
          this.rmdir(itemPath, true);
        } else {
          this.delete(itemPath);
        }
      }
    }

    return this.directories.delete(normalizedPath);
  }

  /**
   * List directory contents
   */
  list(prefix?: string): string[] {
    const normalizedPrefix = prefix ? this.normalizePath(prefix) : '/';
    const results: string[] = [];
    const seen = new Set<string>();

    // List files
    for (const path of this.files.keys()) {
      if (this.isDirectChild(normalizedPrefix, path)) {
        const name = this.getBasename(path);
        if (!seen.has(name)) {
          results.push(name);
          seen.add(name);
        }
      }
    }

    // List directories
    for (const path of this.directories) {
      if (path !== normalizedPrefix && this.isDirectChild(normalizedPrefix, path)) {
        const name = this.getBasename(path);
        if (!seen.has(name)) {
          results.push(name + '/');
          seen.add(name);
        }
      }
    }

    return results.sort();
  }

  // ==========================================
  // FILE STATS
  // ==========================================

  /**
   * Get file/directory stats
   */
  getStats(path: string): VirtualFSStats | undefined {
    const normalizedPath = this.normalizePath(path);
    const file = this.files.get(normalizedPath);

    if (file) {
      return {
        size: file.size,
        createdAt: file.createdAt,
        modifiedAt: file.modifiedAt,
        classification: file.classification,
        isDirectory: false,
      };
    }

    if (this.directories.has(normalizedPath)) {
      return {
        size: 0,
        createdAt: new Date(),
        modifiedAt: new Date(),
        isDirectory: true,
      };
    }

    return undefined;
  }

  /**
   * Get file classification
   */
  getClassification(path: string): DataClassification | undefined {
    const normalizedPath = this.normalizePath(path);
    return this.files.get(normalizedPath)?.classification;
  }

  /**
   * Set file classification
   */
  setClassification(path: string, classification: DataClassification): boolean {
    const normalizedPath = this.normalizePath(path);
    const file = this.files.get(normalizedPath);
    if (file) {
      file.classification = classification;
      return true;
    }
    return false;
  }

  // ==========================================
  // FILESYSTEM STATS
  // ==========================================

  /**
   * Get total size used
   */
  getTotalSize(): number {
    return this.totalSize;
  }

  /**
   * Get file count
   */
  getFileCount(): number {
    return this.files.size;
  }

  /**
   * Get directory count
   */
  getDirectoryCount(): number {
    return this.directories.size;
  }

  /**
   * Get usage statistics
   */
  getUsage(): VirtualFSUsage {
    return {
      totalSize: this.totalSize,
      maxTotalSize: this.maxTotalSize,
      usagePercent: (this.totalSize / this.maxTotalSize) * 100,
      fileCount: this.files.size,
      maxFiles: this.maxFiles,
      directoryCount: this.directories.size,
    };
  }

  /**
   * Clear all files and directories
   */
  clear(): void {
    this.files.clear();
    this.directories.clear();
    this.directories.add('/');
    this.totalSize = 0;
  }

  // ==========================================
  // PATH UTILITIES
  // ==========================================

  /**
   * Normalize path to consistent format
   */
  private normalizePath(path: string): string {
    // Remove trailing slashes, ensure leading slash
    let normalized = path.replace(/\/+$/, '');
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    // Remove duplicate slashes
    normalized = normalized.replace(/\/+/g, '/');
    // Resolve . and ..
    const parts = normalized.split('/').filter(Boolean);
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === '..') {
        resolved.pop();
      } else if (part !== '.') {
        resolved.push(part);
      }
    }
    return '/' + resolved.join('/');
  }

  /**
   * Validate path
   */
  private isValidPath(path: string): boolean {
    // Reject paths with null bytes or invalid characters
    if (path.includes('\0')) return false;
    // Reject paths that try to escape
    if (path.includes('..')) return false;
    return true;
  }

  /**
   * Get parent directory
   */
  private getParentDirectory(path: string): string | null {
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash <= 0) return '/';
    return path.slice(0, lastSlash);
  }

  /**
   * Get basename
   */
  private getBasename(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return path.slice(lastSlash + 1);
  }

  /**
   * Check if path is direct child of prefix
   */
  private isDirectChild(prefix: string, path: string): boolean {
    if (prefix === '/') {
      const remaining = path.slice(1);
      return remaining.length > 0 && !remaining.includes('/');
    }
    if (!path.startsWith(prefix + '/')) return false;
    const remaining = path.slice(prefix.length + 1);
    return remaining.length > 0 && !remaining.includes('/');
  }
}

// ============================================
// TYPES
// ============================================

export interface VirtualFSOptions {
  /** Maximum number of files */
  maxFiles?: number;

  /** Maximum file size in bytes */
  maxFileSize?: number;

  /** Maximum total size in bytes */
  maxTotalSize?: number;
}

export interface VirtualFSUsage {
  totalSize: number;
  maxTotalSize: number;
  usagePercent: number;
  fileCount: number;
  maxFiles: number;
  directoryCount: number;
}

// ============================================
// ERROR CLASS
// ============================================

export class VirtualFSError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'VirtualFSError';
    this.code = code;
  }
}

// ============================================
// EXPORTS
// ============================================

export default VirtualFileSystem;
