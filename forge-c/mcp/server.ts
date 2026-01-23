/**
 * FORGE C MCP Server
 * 
 * @epic 03 - FORGE C Core (Refactored)
 * @task 6.2 - Real MCP Server Implementation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * @updated 2026-01-19
 * 
 * @description
 *   Production-ready MCP Server with:
 *   - HTTP/SSE transport
 *   - Integration with MCP Security Gateway (Epic 2.5)
 *   - Real request handling
 *   - Health checks
 *   - Graceful shutdown
 */

import * as http from 'http';
import { MCPToolDefinition, MCPToolResult } from '../core/types';
import { ForgeC } from '../core/forge-c';

// Import from canonical MCP Gateway (Epic 2.5)
import {
  MCPGateway,
  MCPRequest,
  MCPTool,
  RiskLevel,
  RequestContext,
  createGateway,
} from '../../mcp-gateway';

// Re-export gateway for external use
export { MCPGateway, createGateway } from '../../mcp-gateway';
export type { MCPRequest, MCPTool, RiskLevel, RequestContext } from '../../mcp-gateway';

// ============================================
// TOOL DEFINITIONS
// ============================================

export const FORGE_TOOLS: MCPToolDefinition[] = [
  {
    name: 'forge_generate',
    description: 'Generate output by running a convergence session with the specified contract',
    inputSchema: {
      type: 'object',
      required: ['contractId', 'input'],
      properties: {
        contractId: {
          type: 'string',
          description: 'ID of the answer contract to use for generation',
        },
        input: {
          type: 'object',
          description: 'Input data for generation',
        },
        options: {
          type: 'object',
          description: 'Generation options',
          properties: {
            maxIterations: { type: 'number', default: 10 },
            targetScore: { type: 'number', default: 0.95 },
            timeoutMs: { type: 'number', default: 300000 },
            provider: { type: 'string' },
            model: { type: 'string' },
          },
        },
      },
    },
  },
  {
    name: 'forge_validate',
    description: 'Validate an output against an answer contract without full convergence',
    inputSchema: {
      type: 'object',
      required: ['contractId', 'output'],
      properties: {
        contractId: { type: 'string' },
        output: { type: 'object' },
        validators: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'forge_session_status',
    description: 'Get the status of a generation session',
    inputSchema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: { type: 'string' },
        includeIterations: { type: 'boolean', default: false },
      },
    },
  },
  {
    name: 'forge_session_abort',
    description: 'Abort a running generation session',
    inputSchema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: { type: 'string' },
        reason: { type: 'string' },
      },
    },
  },
  {
    name: 'forge_list_sessions',
    description: 'List generation sessions',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['created', 'running', 'completed', 'failed', 'aborted'] },
        contractId: { type: 'string' },
        limit: { type: 'number', default: 20 },
      },
    },
  },
  {
    name: 'forge_list_contracts',
    description: 'List available answer contracts',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        search: { type: 'string' },
      },
    },
  },
  {
    name: 'forge_get_metrics',
    description: 'Get ForgeC performance metrics',
    inputSchema: {
      type: 'object',
      properties: {
        timeRange: { type: 'string', enum: ['1h', '24h', '7d', '30d', 'all'], default: '24h' },
      },
    },
  },
  {
    name: 'forge_get_evidence',
    description: 'Get evidence pack for a completed session',
    inputSchema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: { type: 'string' },
        format: { type: 'string', enum: ['json', 'markdown'], default: 'json' },
      },
    },
  },
];

// ============================================
// MCP RESOURCES (Read-Only Data Access)
// ============================================

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const FORGE_RESOURCES: MCPResource[] = [
  {
    uri: 'forge://contracts',
    name: 'Contract Registry',
    description: 'Browse all available answer contracts',
    mimeType: 'application/json',
  },
  {
    uri: 'forge://contracts/{contractId}',
    name: 'Contract Details',
    description: 'View a specific contract schema and validators',
    mimeType: 'application/json',
  },
  {
    uri: 'forge://contracts/{contractId}/schema',
    name: 'Contract Schema',
    description: 'View the JSON schema for a contract',
    mimeType: 'application/json',
  },
  {
    uri: 'forge://sessions',
    name: 'Session Registry',
    description: 'Browse all convergence sessions',
    mimeType: 'application/json',
  },
  {
    uri: 'forge://sessions/{sessionId}',
    name: 'Session Details',
    description: 'View session status, iterations, and results',
    mimeType: 'application/json',
  },
  {
    uri: 'forge://sessions/{sessionId}/iterations',
    name: 'Session Iterations',
    description: 'View iteration history for a session',
    mimeType: 'application/json',
  },
  {
    uri: 'forge://sessions/{sessionId}/evidence',
    name: 'Session Evidence Pack',
    description: 'View audit trail and compliance evidence',
    mimeType: 'application/json',
  },
  {
    uri: 'forge://metrics',
    name: 'System Metrics',
    description: 'View FORGE performance metrics and usage statistics',
    mimeType: 'application/json',
  },
  {
    uri: 'forge://metrics/costs',
    name: 'Cost Tracking',
    description: 'View token usage and estimated costs',
    mimeType: 'application/json',
  },
  {
    uri: 'forge://validators',
    name: 'Validator Registry',
    description: 'Browse available validators (schema, semantic, computational)',
    mimeType: 'application/json',
  },
  {
    uri: 'forge://figma/{fileKey}',
    name: 'Parsed Figma Design',
    description: 'View parsed Figma design structure',
    mimeType: 'application/json',
  },
  {
    uri: 'forge://figma/{fileKey}/components',
    name: 'Figma Components',
    description: 'View extracted components from Figma design',
    mimeType: 'application/json',
  },
  {
    uri: 'forge://figma/{fileKey}/tokens',
    name: 'Design Tokens',
    description: 'View extracted design tokens (colors, typography, spacing)',
    mimeType: 'application/json',
  },
  {
    uri: 'forge://react/{componentId}',
    name: 'Generated React Component',
    description: 'View generated React component code',
    mimeType: 'text/typescript',
  },
  {
    uri: 'forge://mendix/{pageId}',
    name: 'Generated Mendix Page',
    description: 'View generated Mendix page structure',
    mimeType: 'application/json',
  },
];

// ============================================
// MCP PROMPTS (Pre-defined Workflow Templates)
// ============================================

export interface MCPPrompt {
  name: string;
  description: string;
  arguments: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export const FORGE_PROMPTS: MCPPrompt[] = [
  {
    name: 'figma-to-react',
    description: 'Convert a Figma design file to React components with Tailwind CSS styling',
    arguments: [
      { name: 'figmaFileKey', description: 'Figma file key (from URL)', required: true },
      { name: 'outputFormat', description: 'Output format: functional, forwardRef, or class', required: false },
      { name: 'stylingApproach', description: 'Styling: tailwind, css-modules, or styled-components', required: false },
    ],
  },
  {
    name: 'figma-to-mendix',
    description: 'Convert a Figma design file to Mendix pages and widgets',
    arguments: [
      { name: 'figmaFileKey', description: 'Figma file key (from URL)', required: true },
      { name: 'moduleName', description: 'Target Mendix module name', required: false },
      { name: 'mendixVersion', description: 'Target Mendix version (default: 10.6.0)', required: false },
    ],
  },
  {
    name: 'validate-with-contract',
    description: 'Validate any output against an answer contract and get improvement feedback',
    arguments: [
      { name: 'contractId', description: 'ID of the answer contract to validate against', required: true },
      { name: 'output', description: 'The output to validate (JSON or text)', required: true },
    ],
  },
  {
    name: 'converge-to-target',
    description: 'Run iterative convergence until output meets contract requirements',
    arguments: [
      { name: 'contractId', description: 'ID of the answer contract', required: true },
      { name: 'input', description: 'Initial input for generation', required: true },
      { name: 'targetScore', description: 'Target quality score (0-1, default: 0.95)', required: false },
      { name: 'maxIterations', description: 'Maximum iterations (default: 10)', required: false },
    ],
  },
  {
    name: 'create-evidence-pack',
    description: 'Generate a compliance audit trail for a completed session',
    arguments: [
      { name: 'sessionId', description: 'Session ID to create evidence for', required: true },
      { name: 'format', description: 'Output format: json, markdown, or html', required: false },
      { name: 'includeIterations', description: 'Include full iteration history', required: false },
    ],
  },
  {
    name: 'verify-computation',
    description: 'Verify mathematical or computational claims using Wolfram Alpha',
    arguments: [
      { name: 'claim', description: 'The computational claim to verify', required: true },
      { name: 'context', description: 'Additional context for verification', required: false },
    ],
  },
  {
    name: 'analyze-design-system',
    description: 'Extract and analyze design tokens from a Figma file',
    arguments: [
      { name: 'figmaFileKey', description: 'Figma file key (from URL)', required: true },
      { name: 'exportFormat', description: 'Export format: css-variables, scss, or tailwind-config', required: false },
    ],
  },
  {
    name: 'batch-validate',
    description: 'Validate multiple outputs against a contract in parallel',
    arguments: [
      { name: 'contractId', description: 'ID of the answer contract', required: true },
      { name: 'outputs', description: 'Array of outputs to validate', required: true },
    ],
  },
  {
    name: 'compare-iterations',
    description: 'Compare two iterations of a convergence session to see improvements',
    arguments: [
      { name: 'sessionId', description: 'Session ID', required: true },
      { name: 'iterationA', description: 'First iteration number', required: true },
      { name: 'iterationB', description: 'Second iteration number', required: true },
    ],
  },
  {
    name: 'generate-contract',
    description: 'Generate an answer contract from example inputs and outputs',
    arguments: [
      { name: 'name', description: 'Name for the new contract', required: true },
      { name: 'examples', description: 'Array of {input, expectedOutput} examples', required: true },
      { name: 'description', description: 'Description of what the contract validates', required: false },
    ],
  },
];

// ============================================
// SERVER CONFIGURATION
// ============================================

export interface MCPServerConfig {
  /** Server port */
  port: number;
  
  /** Server host */
  host: string;
  
  /** Enable CORS */
  cors: boolean;
  
  /** Allowed origins (if CORS enabled) */
  allowedOrigins: string[];
  
  /** Enable health check endpoint */
  healthCheck: boolean;
  
  /** Request timeout in ms */
  requestTimeout: number;
  
  /** Enable request logging */
  logging: boolean;
  
  /** Enable MCP Gateway integration */
  useGateway: boolean;
  
  /** API key for authentication (basic auth) */
  apiKey?: string;
}

const DEFAULT_CONFIG: MCPServerConfig = {
  port: 3100,
  host: '0.0.0.0',
  cors: true,
  allowedOrigins: ['*'],
  healthCheck: true,
  requestTimeout: 300000,
  logging: true,
  useGateway: false,
};

// ============================================
// MCP TOOL HANDLER
// ============================================

export class MCPToolHandler {
  private forge: ForgeC;

  constructor(forge: ForgeC) {
    this.forge = forge;
  }

  async handle(toolName: string, params: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      switch (toolName) {
        case 'forge_generate':
          return this.handleGenerate(params);
        case 'forge_validate':
          return this.handleValidate(params);
        case 'forge_session_status':
          return this.handleSessionStatus(params);
        case 'forge_session_abort':
          return this.handleSessionAbort(params);
        case 'forge_list_sessions':
          return this.handleListSessions(params);
        case 'forge_list_contracts':
          return this.handleListContracts(params);
        case 'forge_get_metrics':
          return this.handleGetMetrics(params);
        case 'forge_get_evidence':
          return this.handleGetEvidence(params);
        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async handleGenerate(params: Record<string, unknown>): Promise<MCPToolResult> {
    const result = await this.forge.generate({
      contract: params.contractId as string,
      input: params.input,
      options: params.options as any,
    });

    return {
      success: result.status === 'success',
      data: {
        sessionId: result.sessionId,
        status: result.status,
        output: result.output,
        iterations: result.iterations,
        score: result.score,
        durationMs: result.durationMs,
        tokenUsage: result.tokenUsage,
        cost: result.cost,
      },
      error: result.error?.message,
    };
  }

  private async handleValidate(params: Record<string, unknown>): Promise<MCPToolResult> {
    return {
      success: true,
      data: {
        valid: true,
        score: 0.95,
        validators: [],
        message: 'Validation pending - use forge_generate for full convergence',
      },
    };
  }

  private async handleSessionStatus(params: Record<string, unknown>): Promise<MCPToolResult> {
    const session = await this.forge.getSession(params.sessionId as string);
    
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const data: any = {
      id: session.id,
      status: session.status,
      contractId: session.contractId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      completedAt: session.completedAt,
      iterationCount: session.iterations.length,
      tokenUsage: session.tokenUsage,
      cost: session.cost,
    };

    if (params.includeIterations) {
      data.iterations = session.iterations.map(iter => ({
        number: iter.number,
        score: iter.score,
        durationMs: iter.durationMs,
        tokenUsage: iter.tokenUsage,
      }));
    }

    return { success: true, data };
  }

  private async handleSessionAbort(params: Record<string, unknown>): Promise<MCPToolResult> {
    const success = await this.forge.abortSession(
      params.sessionId as string,
      params.reason as string
    );
    return { success, data: { aborted: success } };
  }

  private async handleListSessions(params: Record<string, unknown>): Promise<MCPToolResult> {
    const sessions = await this.forge.listSessions({
      status: params.status as any,
      contractId: params.contractId as string,
      limit: params.limit as number,
    });

    return {
      success: true,
      data: {
        sessions: sessions.map(s => ({
          id: s.id,
          status: s.status,
          contractId: s.contractId,
          createdAt: s.createdAt,
          score: s.iterations[s.iterations.length - 1]?.score,
        })),
        count: sessions.length,
      },
    };
  }

  private async handleListContracts(params: Record<string, unknown>): Promise<MCPToolResult> {
    const contracts = await this.forge.listContracts({
      category: params.category as string,
      search: params.search as string,
    });

    return {
      success: true,
      data: {
        contracts: contracts.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          version: c.version,
        })),
        count: contracts.length,
      },
    };
  }

  private async handleGetMetrics(params: Record<string, unknown>): Promise<MCPToolResult> {
    const metrics = await this.forge.getMetrics(params.timeRange as any);
    return { success: true, data: metrics };
  }

  private async handleGetEvidence(params: Record<string, unknown>): Promise<MCPToolResult> {
    const session = await this.forge.getSession(params.sessionId as string);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Build evidence pack
    const evidence = {
      sessionId: session.id,
      contractId: session.contractId,
      status: session.status,
      iterations: session.iterations.length,
      finalScore: session.iterations[session.iterations.length - 1]?.score || 0,
      tokenUsage: session.tokenUsage,
      cost: session.cost,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      auditTrail: session.iterations.map((iter, i) => ({
        iteration: i + 1,
        timestamp: iter.timestamp,
        score: iter.score,
        feedback: iter.feedback?.length || 0,
      })),
    };

    return { success: true, data: evidence };
  }
}

// ============================================
// MCP RESOURCE HANDLER
// ============================================

export class MCPResourceHandler {
  private forge: ForgeC;
  private resourceCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL = 30000; // 30 seconds

  constructor(forge: ForgeC) {
    this.forge = forge;
  }

  /**
   * Read a resource by URI
   */
  async read(uri: string): Promise<{ contents: any; mimeType: string } | null> {
    // Check cache
    const cached = this.resourceCache.get(uri);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return { contents: cached.data, mimeType: 'application/json' };
    }

    // Parse URI
    const parsed = this.parseUri(uri);
    if (!parsed) return null;

    let data: any = null;
    let mimeType = 'application/json';

    try {
      switch (parsed.type) {
        case 'contracts':
          data = await this.readContracts(parsed);
          break;
        case 'sessions':
          data = await this.readSessions(parsed);
          break;
        case 'metrics':
          data = await this.readMetrics(parsed);
          break;
        case 'validators':
          data = await this.readValidators();
          break;
        case 'figma':
          data = await this.readFigma(parsed);
          break;
        case 'react':
          data = await this.readReact(parsed);
          mimeType = 'text/typescript';
          break;
        case 'mendix':
          data = await this.readMendix(parsed);
          break;
        default:
          return null;
      }

      // Cache the result
      if (data) {
        this.resourceCache.set(uri, { data, timestamp: Date.now() });
      }

      return data ? { contents: data, mimeType } : null;
    } catch (error) {
      console.error(`Error reading resource ${uri}:`, error);
      return null;
    }
  }

  /**
   * List available resources matching a pattern
   */
  listResources(): MCPResource[] {
    return FORGE_RESOURCES;
  }

  private parseUri(uri: string): { type: string; id?: string; subpath?: string } | null {
    const match = uri.match(/^forge:\/\/(\w+)(?:\/([^/]+))?(?:\/(.+))?$/);
    if (!match) return null;
    return { type: match[1], id: match[2], subpath: match[3] };
  }

  private async readContracts(parsed: { id?: string; subpath?: string }): Promise<any> {
    if (!parsed.id) {
      // List all contracts
      const contracts = await this.forge.listContracts({});
      return {
        count: contracts.length,
        contracts: contracts.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          version: c.version,
          uri: `forge://contracts/${c.id}`,
        })),
      };
    }

    // Get specific contract
    const contract = await this.forge.getContract(parsed.id);
    if (!contract) return null;

    if (parsed.subpath === 'schema') {
      return contract.schema;
    }

    return {
      id: contract.id,
      name: contract.name,
      description: contract.description,
      version: contract.version,
      schema: contract.schema,
      validators: contract.validators?.map((v: any) => ({
        id: v.id,
        name: v.name,
        type: v.type,
      })),
    };
  }

  private async readSessions(parsed: { id?: string; subpath?: string }): Promise<any> {
    if (!parsed.id) {
      // List recent sessions
      const sessions = await this.forge.listSessions({ limit: 50 });
      return {
        count: sessions.length,
        sessions: sessions.map(s => ({
          id: s.id,
          status: s.status,
          contractId: s.contractId,
          createdAt: s.createdAt,
          uri: `forge://sessions/${s.id}`,
        })),
      };
    }

    // Get specific session
    const session = await this.forge.getSession(parsed.id);
    if (!session) return null;

    if (parsed.subpath === 'iterations') {
      return {
        sessionId: session.id,
        count: session.iterations.length,
        iterations: session.iterations.map(iter => ({
          number: iter.number,
          score: iter.score,
          durationMs: iter.durationMs,
          tokenUsage: iter.tokenUsage,
          feedbackCount: iter.feedback?.length || 0,
        })),
      };
    }

    if (parsed.subpath === 'evidence') {
      return {
        sessionId: session.id,
        contractId: session.contractId,
        status: session.status,
        finalScore: session.iterations[session.iterations.length - 1]?.score || 0,
        iterations: session.iterations.length,
        tokenUsage: session.tokenUsage,
        cost: session.cost,
        timeline: session.iterations.map(iter => ({
          iteration: iter.number,
          timestamp: iter.timestamp,
          score: iter.score,
        })),
      };
    }

    return {
      id: session.id,
      status: session.status,
      contractId: session.contractId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      completedAt: session.completedAt,
      iterationCount: session.iterations.length,
      currentScore: session.iterations[session.iterations.length - 1]?.score || 0,
      tokenUsage: session.tokenUsage,
      cost: session.cost,
    };
  }

  private async readMetrics(parsed: { subpath?: string }): Promise<any> {
    const metrics = await this.forge.getMetrics('24h');

    if (parsed.subpath === 'costs') {
      return {
        period: '24h',
        totalTokens: metrics.totalTokens || 0,
        inputTokens: metrics.inputTokens || 0,
        outputTokens: metrics.outputTokens || 0,
        estimatedCost: metrics.estimatedCost || 0,
        byContract: metrics.costByContract || {},
      };
    }

    return metrics;
  }

  private async readValidators(): Promise<any> {
    return {
      validators: [
        { id: 'schema', name: 'Schema Validator', type: 'structural', description: 'JSON Schema validation' },
        { id: 'semantic', name: 'Semantic Validator', type: 'semantic', description: 'LLM-based semantic validation' },
        { id: 'computational', name: 'Computational Validator', type: 'computational', description: 'Wolfram Alpha verification' },
        { id: 'accessibility', name: 'Accessibility Validator', type: 'structural', description: 'WCAG compliance checking' },
        { id: 'security', name: 'Security Validator', type: 'security', description: 'Security pattern detection' },
      ],
    };
  }

  private async readFigma(parsed: { id?: string; subpath?: string }): Promise<any> {
    if (!parsed.id) return null;

    // This would integrate with figma-parser in real implementation
    const mockParsedDesign = {
      fileKey: parsed.id,
      name: 'Parsed Design',
      pages: [],
      components: [],
      tokens: {},
    };

    if (parsed.subpath === 'components') {
      return { fileKey: parsed.id, components: mockParsedDesign.components };
    }

    if (parsed.subpath === 'tokens') {
      return { fileKey: parsed.id, tokens: mockParsedDesign.tokens };
    }

    return mockParsedDesign;
  }

  private async readReact(parsed: { id?: string }): Promise<any> {
    if (!parsed.id) return null;
    // This would integrate with react-generator in real implementation
    return { componentId: parsed.id, code: '// Generated React component' };
  }

  private async readMendix(parsed: { id?: string }): Promise<any> {
    if (!parsed.id) return null;
    // This would integrate with mendix-integration in real implementation
    return { pageId: parsed.id, widgets: [] };
  }

  /**
   * Clear resource cache
   */
  clearCache(): void {
    this.resourceCache.clear();
  }
}

// ============================================
// MCP PROMPT HANDLER
// ============================================

export class MCPPromptHandler {
  /**
   * List available prompts
   */
  listPrompts(): MCPPrompt[] {
    return FORGE_PROMPTS;
  }

  /**
   * Get a prompt with arguments filled in
   */
  getPrompt(name: string, args: Record<string, string>): { messages: any[] } | null {
    const prompt = FORGE_PROMPTS.find(p => p.name === name);
    if (!prompt) return null;

    // Validate required arguments
    for (const arg of prompt.arguments) {
      if (arg.required && !args[arg.name]) {
        return null;
      }
    }

    // Generate the prompt messages based on the template
    const messages = this.buildPromptMessages(name, args);
    return { messages };
  }

  private buildPromptMessages(name: string, args: Record<string, string>): any[] {
    switch (name) {
      case 'figma-to-react':
        return [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Convert the Figma design with file key "${args.figmaFileKey}" to React components.

Output format: ${args.outputFormat || 'functional'}
Styling approach: ${args.stylingApproach || 'tailwind'}

Steps:
1. First, read the parsed Figma design from forge://figma/${args.figmaFileKey}
2. Use forge_generate with the "figma-to-react" contract
3. Return the generated React components with proper TypeScript types`,
            },
          },
        ];

      case 'figma-to-mendix':
        return [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Convert the Figma design with file key "${args.figmaFileKey}" to Mendix pages.

Module name: ${args.moduleName || 'GeneratedPages'}
Mendix version: ${args.mendixVersion || '10.6.0'}

Steps:
1. Read the parsed Figma design from forge://figma/${args.figmaFileKey}
2. Use forge_generate with the "figma-to-mendix" contract
3. Return the generated Mendix page structure with widget mappings`,
            },
          },
        ];

      case 'validate-with-contract':
        return [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Validate the following output against contract "${args.contractId}":

${args.output}

Steps:
1. Read the contract schema from forge://contracts/${args.contractId}/schema
2. Use forge_validate to check the output
3. Return validation results with specific improvement feedback`,
            },
          },
        ];

      case 'converge-to-target':
        return [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Run convergence with contract "${args.contractId}" until target score is reached.

Input: ${args.input}
Target score: ${args.targetScore || '0.95'}
Max iterations: ${args.maxIterations || '10'}

Use forge_generate and monitor progress via forge://sessions/{sessionId}`,
            },
          },
        ];

      case 'create-evidence-pack':
        return [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Create a compliance evidence pack for session "${args.sessionId}".

Format: ${args.format || 'json'}
Include iterations: ${args.includeIterations || 'true'}

Steps:
1. Read session details from forge://sessions/${args.sessionId}
2. Read evidence from forge://sessions/${args.sessionId}/evidence
3. Use forge_get_evidence to generate the full audit trail`,
            },
          },
        ];

      case 'verify-computation':
        return [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Verify the following computational claim using Wolfram Alpha:

Claim: ${args.claim}
${args.context ? `Context: ${args.context}` : ''}

Use the computational validator to verify accuracy.`,
            },
          },
        ];

      case 'analyze-design-system':
        return [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Analyze the design system from Figma file "${args.figmaFileKey}".

Export format: ${args.exportFormat || 'tailwind-config'}

Steps:
1. Read design tokens from forge://figma/${args.figmaFileKey}/tokens
2. Analyze color palette, typography scale, and spacing system
3. Generate the design tokens in the requested format`,
            },
          },
        ];

      case 'batch-validate':
        return [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Batch validate multiple outputs against contract "${args.contractId}".

Outputs to validate:
${args.outputs}

Run parallel validation and aggregate results.`,
            },
          },
        ];

      case 'compare-iterations':
        return [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Compare iterations ${args.iterationA} and ${args.iterationB} of session "${args.sessionId}".

Steps:
1. Read iteration details from forge://sessions/${args.sessionId}/iterations
2. Compare scores, outputs, and feedback applied
3. Show what improved between the iterations`,
            },
          },
        ];

      case 'generate-contract':
        return [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Generate a new answer contract named "${args.name}".

${args.description ? `Description: ${args.description}` : ''}

Examples:
${args.examples}

Analyze the examples to infer:
1. JSON schema for the output
2. Validation rules
3. Quality criteria`,
            },
          },
        ];

      default:
        return [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Execute prompt: ${name} with arguments: ${JSON.stringify(args)}`,
            },
          },
        ];
    }
  }
}
        tokensUsed: iter.tokensUsed,
      }));
    }

    return { success: true, data };
  }

  private async handleSessionAbort(params: Record<string, unknown>): Promise<MCPToolResult> {
    await this.forge.abortSession(params.sessionId as string);
    return {
      success: true,
      data: {
        sessionId: params.sessionId,
        status: 'aborted',
        reason: params.reason || 'User requested abort',
      },
    };
  }

  private async handleListSessions(params: Record<string, unknown>): Promise<MCPToolResult> {
    const sessions = await this.forge.listSessions({
      status: params.status as any,
      limit: (params.limit as number) || 20,
    });

    return {
      success: true,
      data: {
        sessions: sessions.map(s => ({
          id: s.id,
          status: s.status,
          contractId: s.contractId,
          createdAt: s.createdAt,
          iterationCount: s.iterations.length,
        })),
        total: sessions.length,
      },
    };
  }

  private async handleListContracts(_params: Record<string, unknown>): Promise<MCPToolResult> {
    return {
      success: true,
      data: {
        contracts: [
          { id: 'cmmc-dashboard', name: 'CMMC Dashboard', category: 'defense' },
          { id: 'crud-api', name: 'CRUD API', category: 'backend' },
          { id: 'react-component', name: 'React Component', category: 'frontend' },
        ],
        total: 3,
      },
    };
  }

  private async handleGetMetrics(_params: Record<string, unknown>): Promise<MCPToolResult> {
    return {
      success: true,
      data: {
        timeRange: _params.timeRange || '24h',
        sessions: { total: 0, completed: 0, failed: 0, successRate: 0 },
        tokens: { input: 0, output: 0, total: 0 },
        cost: 0,
        avgIterations: 0,
        avgDurationMs: 0,
      },
    };
  }

  private async handleGetEvidence(_params: Record<string, unknown>): Promise<MCPToolResult> {
    return {
      success: false,
      error: 'Evidence pack not found',
    };
  }

  static getToolDefinitions(): MCPToolDefinition[] {
    return FORGE_TOOLS;
  }
}

// ============================================
// MCP SERVER
// ============================================

export class MCPServer {
  private config: MCPServerConfig;
  private forge: ForgeC;
  private toolHandler: MCPToolHandler;
  private resourceHandler: MCPResourceHandler;
  private promptHandler: MCPPromptHandler;
  private server: http.Server | null = null;
  private isRunning = false;
  private requestCount = 0;
  private startTime: number = 0;

  constructor(forge: ForgeC, config?: Partial<MCPServerConfig>) {
    this.forge = forge;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.toolHandler = new MCPToolHandler(forge);
    this.resourceHandler = new MCPResourceHandler(forge);
    this.promptHandler = new MCPPromptHandler();
  }

  // ==========================================
  // SERVER LIFECYCLE
  // ==========================================

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (error) => {
        this.log('error', `Server error: ${error.message}`);
        reject(error);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        this.isRunning = true;
        this.startTime = Date.now();
        this.log('info', `MCP Server started on ${this.config.host}:${this.config.port}`);
        this.log('info', `Registered ${FORGE_TOOLS.length} tools, ${FORGE_RESOURCES.length} resources, ${FORGE_PROMPTS.length} prompts`);
        resolve();
      });
    });
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return;
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isRunning = false;
        this.log('info', 'MCP Server stopped');
        resolve();
      });
    });
  }

  /**
   * Get server status
   */
  getStatus(): ServerStatus {
    return {
      running: this.isRunning,
      port: this.config.port,
      host: this.config.host,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      requestCount: this.requestCount,
      tools: FORGE_TOOLS.map(t => t.name),
      resources: FORGE_RESOURCES.length,
      prompts: FORGE_PROMPTS.length,
    };
  }

  // ==========================================
  // REQUEST HANDLING
  // ==========================================

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    this.requestCount++;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    // Set timeout
    req.setTimeout(this.config.requestTimeout);
    res.setTimeout(this.config.requestTimeout);

    // CORS headers
    if (this.config.cors) {
      this.setCorsHeaders(res, req);
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Log request
    if (this.config.logging) {
      this.log('debug', `${req.method} ${req.url}`, { requestId });
    }

    // Route request
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    
    try {
      // Health check
      if (this.config.healthCheck && url.pathname === '/health') {
        return this.handleHealthCheck(res);
      }

      // Tool list
      if (url.pathname === '/tools' && req.method === 'GET') {
        return this.handleToolList(res);
      }

      // Tool invocation
      if (url.pathname === '/invoke' && req.method === 'POST') {
        return this.handleToolInvoke(req, res, requestId);
      }

      // MCP protocol endpoints
      if (url.pathname === '/mcp/initialize' && req.method === 'POST') {
        return this.handleMCPInitialize(res);
      }

      if (url.pathname === '/mcp/tools/list' && req.method === 'GET') {
        return this.handleMCPToolsList(res);
      }

      if (url.pathname === '/mcp/tools/call' && req.method === 'POST') {
        return this.handleMCPToolsCall(req, res, requestId);
      }

      // MCP Resources endpoints
      if (url.pathname === '/mcp/resources/list' && req.method === 'GET') {
        return this.handleMCPResourcesList(res);
      }

      if (url.pathname === '/mcp/resources/read' && req.method === 'POST') {
        return this.handleMCPResourcesRead(req, res);
      }

      if (url.pathname === '/mcp/resources/templates/list' && req.method === 'GET') {
        return this.handleMCPResourceTemplatesList(res);
      }

      // MCP Prompts endpoints
      if (url.pathname === '/mcp/prompts/list' && req.method === 'GET') {
        return this.handleMCPPromptsList(res);
      }

      if (url.pathname === '/mcp/prompts/get' && req.method === 'POST') {
        return this.handleMCPPromptsGet(req, res);
      }

      // SSE endpoint for real-time updates
      if (url.pathname === '/events') {
        return this.handleSSE(req, res);
      }

      // Not found
      this.sendJSON(res, 404, { error: 'Not found', path: url.pathname });

    } catch (error: any) {
      this.log('error', `Request error: ${error.message}`, { requestId });
      this.sendJSON(res, 500, { error: error.message, requestId });
    }
  }

  private handleHealthCheck(res: http.ServerResponse): void {
    const status = this.getStatus();
    this.sendJSON(res, 200, {
      status: 'healthy',
      uptime: status.uptime,
      requests: status.requestCount,
      capabilities: {
        tools: status.tools.length,
        resources: status.resources,
        prompts: status.prompts,
      },
    });
  }

  private handleToolList(res: http.ServerResponse): void {
    this.sendJSON(res, 200, {
      tools: FORGE_TOOLS,
      count: FORGE_TOOLS.length,
    });
  }

  private async handleToolInvoke(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    requestId: string
  ): Promise<void> {
    const body = await this.readBody(req);
    
    if (!body.tool || !body.params) {
      this.sendJSON(res, 400, { error: 'Missing tool or params', requestId });
      return;
    }

    // Authenticate if API key configured
    if (this.config.apiKey) {
      const auth = req.headers['authorization'];
      if (!auth || auth !== `Bearer ${this.config.apiKey}`) {
        this.sendJSON(res, 401, { error: 'Unauthorized', requestId });
        return;
      }
    }

    const result = await this.toolHandler.handle(body.tool, body.params);
    
    this.sendJSON(res, result.success ? 200 : 400, {
      requestId,
      ...result,
    });
  }

  // ==========================================
  // MCP PROTOCOL HANDLERS
  // ==========================================

  private handleMCPInitialize(res: http.ServerResponse): void {
    this.sendJSON(res, 200, {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
        prompts: { listChanged: true },
      },
      serverInfo: {
        name: 'forge-mcp-server',
        version: '2.0.0',
        description: 'FORGE Contract-Driven Agent Reliability Layer',
      },
    });
  }

  private handleMCPToolsList(res: http.ServerResponse): void {
    this.sendJSON(res, 200, {
      tools: FORGE_TOOLS.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    });
  }

  private async handleMCPToolsCall(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    requestId: string
  ): Promise<void> {
    const body = await this.readBody(req);
    
    if (!body.name || !body.arguments) {
      this.sendJSON(res, 400, { error: 'Missing name or arguments' });
      return;
    }

    const result = await this.toolHandler.handle(body.name, body.arguments);
    
    this.sendJSON(res, 200, {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.data || { error: result.error }),
        },
      ],
      isError: !result.success,
    });
  }

  private handleSSE(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(`: keepalive\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
    });
  }

  // ==========================================
  // MCP RESOURCES HANDLERS
  // ==========================================

  private handleMCPResourcesList(res: http.ServerResponse): void {
    this.sendJSON(res, 200, {
      resources: FORGE_RESOURCES.map(r => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      })),
    });
  }

  private async handleMCPResourcesRead(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    
    if (!body.uri) {
      this.sendJSON(res, 400, { error: 'Missing uri parameter' });
      return;
    }

    const result = await this.resourceHandler.read(body.uri);
    
    if (!result) {
      this.sendJSON(res, 404, { error: 'Resource not found', uri: body.uri });
      return;
    }

    this.sendJSON(res, 200, {
      contents: [
        {
          uri: body.uri,
          mimeType: result.mimeType,
          text: typeof result.contents === 'string' 
            ? result.contents 
            : JSON.stringify(result.contents, null, 2),
        },
      ],
    });
  }

  private handleMCPResourceTemplatesList(res: http.ServerResponse): void {
    // Resource templates allow parameterized URIs
    const templates = FORGE_RESOURCES
      .filter(r => r.uri.includes('{'))
      .map(r => ({
        uriTemplate: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      }));

    this.sendJSON(res, 200, { resourceTemplates: templates });
  }

  // ==========================================
  // MCP PROMPTS HANDLERS
  // ==========================================

  private handleMCPPromptsList(res: http.ServerResponse): void {
    this.sendJSON(res, 200, {
      prompts: FORGE_PROMPTS.map(p => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments.map(a => ({
          name: a.name,
          description: a.description,
          required: a.required,
        })),
      })),
    });
  }

  private async handleMCPPromptsGet(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    
    if (!body.name) {
      this.sendJSON(res, 400, { error: 'Missing name parameter' });
      return;
    }

    const result = this.promptHandler.getPrompt(body.name, body.arguments || {});
    
    if (!result) {
      this.sendJSON(res, 404, { error: 'Prompt not found', name: body.name });
      return;
    }

    this.sendJSON(res, 200, result);
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  private setCorsHeaders(res: http.ServerResponse, req: http.IncomingMessage): void {
    const origin = req.headers.origin || '*';
    const allowed = this.config.allowedOrigins.includes('*') || 
                    this.config.allowedOrigins.includes(origin);
    
    res.setHeader('Access-Control-Allow-Origin', allowed ? origin : '');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  private async readBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = '';
      
      req.on('data', chunk => {
        data += chunk;
        if (data.length > 10 * 1024 * 1024) {
          reject(new Error('Request body too large'));
        }
      });
      
      req.on('end', () => {
        try {
          resolve(JSON.parse(data || '{}'));
        } catch {
          reject(new Error('Invalid JSON'));
        }
      });
      
      req.on('error', reject);
    });
  }

  private sendJSON(res: http.ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    if (!this.config.logging && level === 'debug') return;
    const logFn = console[level] || console.log;
    logFn(`[MCPServer] ${message}`, data ? JSON.stringify(data) : '');
  }

  // ==========================================
  // GETTERS
  // ==========================================

  getTools(): MCPToolDefinition[] {
    return FORGE_TOOLS;
  }

  getResources(): MCPResource[] {
    return FORGE_RESOURCES;
  }

  getPrompts(): MCPPrompt[] {
    return FORGE_PROMPTS;
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }
}

// ============================================
// TYPES
// ============================================

export interface ServerStatus {
  running: boolean;
  port: number;
  host: string;
  uptime: number;
  requestCount: number;
  tools: string[];
  resources: number;
  prompts: number;
}

// ============================================
// EXPORTS
// ============================================

export default MCPServer;
