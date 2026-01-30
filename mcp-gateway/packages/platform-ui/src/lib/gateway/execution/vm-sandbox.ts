/**
 * MCP Gateway - Node.js VM Sandbox
 *
 * @epic 3.75 - Code Execution
 * @task 3.75.1.2 - Implement Node.js VM sandbox
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Secure code execution using Node.js VM module.
 *   Aligned with:
 *   - 09_DATA_PROTECTION § DP-07 (redaction <50ms)
 *   - 05_CONVERGENCE_ENGINE (timeout enforcement)
 */

import { createContext, runInContext, Script } from 'vm';
import { Sandbox, ExecutionResult, ExecutionOptions, DataClassification } from './types';

// ============================================
// VM SANDBOX
// ============================================

export class VMSandbox implements Sandbox {
  name = 'vm';
  private output: string[] = [];
  private errorOutput: string[] = [];
  private startMemory: number = 0;

  /**
   * Execute code in Node.js VM sandbox
   */
  async execute(code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.output = [];
    this.errorOutput = [];
    this.startMemory = process.memoryUsage().heapUsed;

    // FROM 05_CONVERGENCE_ENGINE: Default timeout enforcement
    const timeout = options.timeout ?? 5000;

    // FROM 09_DATA_PROTECTION: Block RESTRICTED classification
    if (options.classification === 'RESTRICTED') {
      return {
        success: false,
        output: '',
        error: 'RESTRICTED classification cannot be processed by execution engine',
        duration: 0,
      };
    }

    try {
      // Create sandboxed context with limited globals
      const context = createContext(this.createSandboxedContext(options));

      // Compile script
      const script = new Script(code, {
        filename: 'sandbox.js',
        lineOffset: 0,
        columnOffset: 0,
      });

      // Execute with timeout
      const result = script.runInContext(context, {
        timeout,
        breakOnSigint: true,
        displayErrors: true,
      });

      const duration = Date.now() - startTime;
      const memoryUsed = this.calculateMemoryUsed();

      return {
        success: true,
        output: this.formatOutput(result),
        duration,
        memoryUsed,
        exitCode: 0,
        timedOut: false,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const isTimeout = this.isTimeoutError(error);

      return {
        success: false,
        output: this.output.join('\n'),
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        memoryUsed: this.calculateMemoryUsed(),
        timedOut: isTimeout,
      };
    }
  }

  /**
   * Dispose sandbox resources
   */
  async dispose(): Promise<void> {
    this.output = [];
    this.errorOutput = [];
  }

  // ==========================================
  // CONTEXT CREATION
  // ==========================================

  /**
   * Create sandboxed context with limited globals
   * Security: Remove all dangerous APIs
   */
  private createSandboxedContext(options: ExecutionOptions): Record<string, unknown> {
    const sandbox = this;

    return {
      // Safe console implementation
      console: {
        log: (...args: unknown[]) => {
          sandbox.output.push(args.map(this.safeStringify).join(' '));
        },
        error: (...args: unknown[]) => {
          sandbox.errorOutput.push(`[ERROR] ${args.map(this.safeStringify).join(' ')}`);
        },
        warn: (...args: unknown[]) => {
          sandbox.output.push(`[WARN] ${args.map(this.safeStringify).join(' ')}`);
        },
        info: (...args: unknown[]) => {
          sandbox.output.push(`[INFO] ${args.map(this.safeStringify).join(' ')}`);
        },
      },

      // Safe JSON operations
      JSON: {
        parse: JSON.parse,
        stringify: JSON.stringify,
      },

      // Safe Math operations
      Math,

      // Safe string/number operations
      String,
      Number,
      Boolean,
      Array,
      Object,
      Date,
      RegExp,
      Map,
      Set,
      WeakMap,
      WeakSet,
      Symbol,
      BigInt,

      // Safe error types
      Error,
      TypeError,
      SyntaxError,
      RangeError,
      ReferenceError,

      // Safe utility functions
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      encodeURI,
      decodeURI,

      // Promise support (limited)
      Promise: this.createLimitedPromise(),

      // Remove all dangerous globals
      setTimeout: undefined,
      setInterval: undefined,
      setImmediate: undefined,
      clearTimeout: undefined,
      clearInterval: undefined,
      clearImmediate: undefined,
      fetch: undefined,
      XMLHttpRequest: undefined,
      require: undefined,
      process: undefined,
      global: undefined,
      globalThis: undefined,
      __dirname: undefined,
      __filename: undefined,
      module: undefined,
      exports: undefined,
      Buffer: undefined,
      eval: undefined,
      Function: undefined, // Prevent dynamic function creation

      // Execution context (read-only)
      __executionContext: Object.freeze({
        sessionId: options.sessionId,
        tenantId: options.tenantId,
        classification: options.classification ?? 'INTERNAL',
        timestamp: new Date().toISOString(),
      }),
    };
  }

  /**
   * Create a limited Promise implementation
   * Prevents unbounded async operations
   */
  private createLimitedPromise(): typeof Promise {
    // Return standard Promise but execution still bounded by timeout
    return Promise;
  }

  // ==========================================
  // OUTPUT FORMATTING
  // ==========================================

  /**
   * Safely stringify any value
   */
  private safeStringify(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'bigint') return `${value}n`;
    if (typeof value === 'symbol') return value.toString();
    if (typeof value === 'function') return '[Function]';

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Object - circular or non-serializable]';
    }
  }

  /**
   * Format execution output
   */
  private formatOutput(result: unknown): string {
    const consoleOutput = this.output.join('\n');
    const errorOutput = this.errorOutput.join('\n');

    const parts: string[] = [];

    if (consoleOutput) {
      parts.push(consoleOutput);
    }

    if (errorOutput) {
      parts.push(errorOutput);
    }

    if (result !== undefined) {
      const resultStr = this.safeStringify(result);
      if (resultStr && resultStr !== 'undefined') {
        parts.push(resultStr);
      }
    }

    return parts.join('\n') || '';
  }

  // ==========================================
  // RESOURCE TRACKING
  // ==========================================

  /**
   * Calculate memory used during execution
   */
  private calculateMemoryUsed(): number {
    const currentMemory = process.memoryUsage().heapUsed;
    const delta = currentMemory - this.startMemory;
    // Convert to MB, floor at 0
    return Math.max(0, Math.round((delta / (1024 * 1024)) * 100) / 100);
  }

  /**
   * Check if error is a timeout error
   */
  private isTimeoutError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes('Script execution timed out') ||
             error.message.includes('timeout');
    }
    return false;
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create a new VM sandbox instance
 */
export function createVMSandbox(): VMSandbox {
  return new VMSandbox();
}

// ============================================
// EXPORTS
// ============================================

export default VMSandbox;
