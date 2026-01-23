/**
 * MCP Security Gateway - Deno Runtime Bindings
 * 
 * @epic 2.5 - MCP Security Gateway
 * @task 5.2 - Deno Runtime Implementation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Real Deno subprocess execution for isolated tool running.
 *   Uses Deno's permission system for fine-grained security control.
 * 
 * @requirements
 *   - Deno v1.37+ installed and in PATH
 *   - Temporary directory access for script files
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

// ============================================
// TYPES
// ============================================

export interface DenoPermissions {
  /** Network access: false = none, true = all, string[] = specific hosts */
  net: boolean | string[];
  
  /** Read access: false = none, true = all, string[] = specific paths */
  read: boolean | string[];
  
  /** Write access: false = none, true = all, string[] = specific paths */
  write: boolean | string[];
  
  /** Environment variable access */
  env: boolean | string[];
  
  /** Subprocess spawning */
  run: boolean | string[];
  
  /** FFI (Foreign Function Interface) */
  ffi: boolean | string[];
  
  /** High resolution time */
  hrtime: boolean;
}

export interface DenoExecutionConfig {
  /** Deno executable path (default: 'deno') */
  denoPath: string;
  
  /** Temporary directory for scripts */
  tempDir: string;
  
  /** Memory limit in MB */
  maxMemoryMb: number;
  
  /** Execution timeout in ms */
  timeoutMs: number;
  
  /** Enable unstable APIs */
  unstable: boolean;
  
  /** V8 flags */
  v8Flags: string[];
  
  /** Additional environment variables */
  env: Record<string, string>;
}

export interface DenoExecutionRequest {
  /** Tool name */
  tool: string;
  
  /** Execution ID */
  executionId: string;
  
  /** Parameters to pass to tool */
  params: Record<string, unknown>;
  
  /** Execution context */
  context: {
    tenantId: string;
    userId?: string;
    sessionId?: string;
  };
  
  /** The actual handler code (serialized) */
  handlerCode: string;
  
  /** Permissions */
  permissions: DenoPermissions;
}

export interface DenoExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  executionTimeMs: number;
  resourceUsage: {
    cpuMs: number;
    memoryMb: number;
  };
  timedOut: boolean;
  killed: boolean;
}

// ============================================
// DENO RUNTIME
// ============================================

export class DenoRuntime {
  private config: DenoExecutionConfig;
  private activeProcesses = new Map<string, child_process.ChildProcess>();
  private available: boolean | null = null;

  constructor(config?: Partial<DenoExecutionConfig>) {
    this.config = {
      denoPath: config?.denoPath || 'deno',
      tempDir: config?.tempDir || os.tmpdir(),
      maxMemoryMb: config?.maxMemoryMb || 512,
      timeoutMs: config?.timeoutMs || 300000,
      unstable: config?.unstable || false,
      v8Flags: config?.v8Flags || [],
      env: config?.env || {},
    };
  }

  // ==========================================
  // AVAILABILITY CHECK
  // ==========================================

  /**
   * Check if Deno is available on the system
   */
  async isAvailable(): Promise<boolean> {
    if (this.available !== null) return this.available;

    try {
      const result = await this.runCommand([this.config.denoPath, '--version'], 5000);
      this.available = result.exitCode === 0 && result.stdout.includes('deno');
      return this.available;
    } catch {
      this.available = false;
      return false;
    }
  }

  /**
   * Get Deno version info
   */
  async getVersion(): Promise<string | null> {
    if (!await this.isAvailable()) return null;

    const result = await this.runCommand([this.config.denoPath, '--version'], 5000);
    return result.stdout.trim();
  }

  // ==========================================
  // EXECUTION
  // ==========================================

  /**
   * Execute a tool in Deno sandbox
   */
  async execute(request: DenoExecutionRequest): Promise<DenoExecutionResult> {
    const startTime = Date.now();

    // Check Deno availability
    if (!await this.isAvailable()) {
      return {
        success: false,
        error: 'Deno runtime not available. Install Deno: https://deno.land/manual/getting_started/installation',
        stdout: '',
        stderr: '',
        exitCode: null,
        signal: null,
        executionTimeMs: Date.now() - startTime,
        resourceUsage: { cpuMs: 0, memoryMb: 0 },
        timedOut: false,
        killed: false,
      };
    }

    // Create temporary script file
    const scriptPath = await this.createScriptFile(request);

    try {
      // Build Deno command
      const args = this.buildDenoArgs(request.permissions, scriptPath);

      // Execute
      const result = await this.executeScript(
        request.executionId,
        args,
        this.config.timeoutMs
      );

      // Parse result
      return this.parseResult(result, startTime);

    } finally {
      // Cleanup
      await this.cleanupScriptFile(scriptPath);
    }
  }

  /**
   * Abort an active execution
   */
  abort(executionId: string): boolean {
    const process = this.activeProcesses.get(executionId);
    if (process) {
      process.kill('SIGTERM');
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      }, 5000);
      
      return true;
    }
    return false;
  }

  // ==========================================
  // SCRIPT GENERATION
  // ==========================================

  /**
   * Create a temporary script file for execution
   */
  private async createScriptFile(request: DenoExecutionRequest): Promise<string> {
    const scriptId = crypto.randomBytes(8).toString('hex');
    const scriptPath = path.join(
      this.config.tempDir,
      `forge_sandbox_${request.executionId}_${scriptId}.ts`
    );

    const scriptContent = this.generateScript(request);
    await fs.promises.writeFile(scriptPath, scriptContent, 'utf-8');

    return scriptPath;
  }

  /**
   * Generate the Deno script content
   */
  private generateScript(request: DenoExecutionRequest): string {
    return `
// ============================================
// FORGE MCP Sandbox Script
// Generated: ${new Date().toISOString()}
// Tool: ${request.tool}
// Execution ID: ${request.executionId}
// ============================================

// Execution context
const __FORGE_PARAMS__ = ${JSON.stringify(request.params)};
const __FORGE_CONTEXT__ = ${JSON.stringify(request.context)};

// Result container
interface ForgeResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

async function __forge_main__(): Promise<void> {
  const result: ForgeResult = { success: false };
  
  try {
    // Tool handler code (injected)
    ${request.handlerCode}
    
    // Execute the handler
    // The handler should be defined as: async function handler(params, context)
    if (typeof handler === 'function') {
      const data = await handler(__FORGE_PARAMS__, __FORGE_CONTEXT__);
      result.success = true;
      result.data = data;
    } else {
      result.error = 'No handler function defined';
    }
    
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
  }
  
  // Output result as JSON to stdout
  console.log('__FORGE_RESULT_START__');
  console.log(JSON.stringify(result));
  console.log('__FORGE_RESULT_END__');
}

// Run
__forge_main__().catch((error) => {
  console.error('Fatal error:', error);
  Deno.exit(1);
});
`;
  }

  /**
   * Cleanup temporary script file
   */
  private async cleanupScriptFile(scriptPath: string): Promise<void> {
    try {
      await fs.promises.unlink(scriptPath);
    } catch {
      // Ignore cleanup errors
    }
  }

  // ==========================================
  // COMMAND BUILDING
  // ==========================================

  /**
   * Build Deno CLI arguments
   */
  private buildDenoArgs(permissions: DenoPermissions, scriptPath: string): string[] {
    const args: string[] = ['run'];

    // Memory limit via V8 flags
    if (this.config.maxMemoryMb > 0) {
      args.push(`--v8-flags=--max-old-space-size=${this.config.maxMemoryMb}`);
    }

    // Additional V8 flags
    for (const flag of this.config.v8Flags) {
      args.push(`--v8-flags=${flag}`);
    }

    // Unstable APIs
    if (this.config.unstable) {
      args.push('--unstable');
    }

    // Permission flags
    args.push(...this.buildPermissionFlags(permissions));

    // Script path
    args.push(scriptPath);

    return args;
  }

  /**
   * Build permission flags for Deno
   */
  private buildPermissionFlags(permissions: DenoPermissions): string[] {
    const flags: string[] = [];

    // Network
    if (permissions.net === true) {
      flags.push('--allow-net');
    } else if (Array.isArray(permissions.net) && permissions.net.length > 0) {
      flags.push(`--allow-net=${permissions.net.join(',')}`);
    }
    // If false, no flag = denied by default

    // Read
    if (permissions.read === true) {
      flags.push('--allow-read');
    } else if (Array.isArray(permissions.read) && permissions.read.length > 0) {
      flags.push(`--allow-read=${permissions.read.join(',')}`);
    }

    // Write
    if (permissions.write === true) {
      flags.push('--allow-write');
    } else if (Array.isArray(permissions.write) && permissions.write.length > 0) {
      flags.push(`--allow-write=${permissions.write.join(',')}`);
    }

    // Environment
    if (permissions.env === true) {
      flags.push('--allow-env');
    } else if (Array.isArray(permissions.env) && permissions.env.length > 0) {
      flags.push(`--allow-env=${permissions.env.join(',')}`);
    }

    // Run (subprocess)
    if (permissions.run === true) {
      flags.push('--allow-run');
    } else if (Array.isArray(permissions.run) && permissions.run.length > 0) {
      flags.push(`--allow-run=${permissions.run.join(',')}`);
    }

    // FFI
    if (permissions.ffi === true) {
      flags.push('--allow-ffi');
    } else if (Array.isArray(permissions.ffi) && permissions.ffi.length > 0) {
      flags.push(`--allow-ffi=${permissions.ffi.join(',')}`);
    }

    // High resolution time
    if (permissions.hrtime) {
      flags.push('--allow-hrtime');
    }

    return flags;
  }

  // ==========================================
  // PROCESS EXECUTION
  // ==========================================

  /**
   * Execute the Deno script
   */
  private async executeScript(
    executionId: string,
    args: string[],
    timeoutMs: number
  ): Promise<ProcessResult> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let killed = false;

      const proc = child_process.spawn(this.config.denoPath, args, {
        env: { ...process.env, ...this.config.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.activeProcesses.set(executionId, proc);

      // Timeout handler
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        killed = true;
        proc.kill('SIGTERM');
        
        // Force kill after grace period
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 5000);
      }, timeoutMs);

      // Capture stdout
      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // Capture stderr
      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle completion
      proc.on('close', (exitCode, signal) => {
        clearTimeout(timeoutHandle);
        this.activeProcesses.delete(executionId);

        resolve({
          stdout,
          stderr,
          exitCode,
          signal: signal as string | null,
          timedOut,
          killed,
        });
      });

      // Handle error
      proc.on('error', (error) => {
        clearTimeout(timeoutHandle);
        this.activeProcesses.delete(executionId);

        resolve({
          stdout,
          stderr: stderr + '\n' + error.message,
          exitCode: null,
          signal: null,
          timedOut,
          killed,
        });
      });
    });
  }

  /**
   * Simple command runner for version check
   */
  private runCommand(args: string[], timeoutMs: number): Promise<ProcessResult> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const command = args[0];
      if (!command) {
        resolve({ stdout: '', stderr: 'No command provided', exitCode: 1, signal: null, timedOut: false, killed: false });
        return;
      }

      const proc = child_process.spawn(command, args.slice(1));

      const timeout = setTimeout(() => {
        proc.kill();
      }, timeoutMs);

      proc.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });

      proc.on('close', (exitCode: number | null) => {
        clearTimeout(timeout);
        resolve({ stdout, stderr, exitCode, signal: null, timedOut: false, killed: false });
      });

      proc.on('error', () => {
        clearTimeout(timeout);
        resolve({ stdout, stderr, exitCode: null, signal: null, timedOut: false, killed: false });
      });
    });
  }

  // ==========================================
  // RESULT PARSING
  // ==========================================

  /**
   * Parse execution result
   */
  private parseResult(processResult: ProcessResult, startTime: number): DenoExecutionResult {
    const executionTimeMs = Date.now() - startTime;

    // Extract result from stdout markers
    const result = this.extractResult(processResult.stdout);

    // Calculate approximate resource usage
    const resourceUsage = {
      cpuMs: executionTimeMs, // Approximation
      memoryMb: 0, // Would need to parse from Deno metrics
    };

    if (result) {
      return {
        success: result.success,
        result: result.data,
        error: result.error,
        stdout: this.cleanStdout(processResult.stdout),
        stderr: processResult.stderr,
        exitCode: processResult.exitCode,
        signal: processResult.signal,
        executionTimeMs,
        resourceUsage,
        timedOut: processResult.timedOut,
        killed: processResult.killed,
      };
    }

    // No structured result found - execution error
    return {
      success: false,
      error: processResult.stderr || 'Execution failed without result',
      stdout: processResult.stdout,
      stderr: processResult.stderr,
      exitCode: processResult.exitCode,
      signal: processResult.signal,
      executionTimeMs,
      resourceUsage,
      timedOut: processResult.timedOut,
      killed: processResult.killed,
    };
  }

  /**
   * Extract structured result from stdout
   */
  private extractResult(stdout: string): { success: boolean; data?: unknown; error?: string } | null {
    const startMarker = '__FORGE_RESULT_START__';
    const endMarker = '__FORGE_RESULT_END__';

    const startIdx = stdout.indexOf(startMarker);
    const endIdx = stdout.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      return null;
    }

    const jsonStr = stdout.slice(startIdx + startMarker.length, endIdx).trim();

    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  /**
   * Clean stdout by removing result markers
   */
  private cleanStdout(stdout: string): string {
    return stdout
      .replace(/__FORGE_RESULT_START__[\s\S]*?__FORGE_RESULT_END__/g, '')
      .trim();
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  /**
   * Get active execution count
   */
  getActiveCount(): number {
    return this.activeProcesses.size;
  }

  /**
   * Get active execution IDs
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeProcesses.keys());
  }
}

// ============================================
// INTERNAL TYPES
// ============================================

interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  killed: boolean;
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

let defaultRuntime: DenoRuntime | null = null;

/**
 * Get or create the default Deno runtime
 */
export function getDenoRuntime(config?: Partial<DenoExecutionConfig>): DenoRuntime {
  if (!defaultRuntime) {
    defaultRuntime = new DenoRuntime(config);
  }
  return defaultRuntime;
}

/**
 * Check if Deno is available
 */
export async function isDenoAvailable(): Promise<boolean> {
  return getDenoRuntime().isAvailable();
}

// ============================================
// EXPORTS
// ============================================

export default DenoRuntime;
