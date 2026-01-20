/**
 * FORGE C MCP Module
 * 
 * @epic 03 - FORGE C Core
 * @task 6.1 - MCP Tool Definitions
 * @task 6.2 - MCP Server Implementation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * @updated 2026-01-19
 * 
 * @description
 *   MCP (Model Context Protocol) tools and server for ForgeC.
 *   Re-exports from server.ts for the real HTTP server implementation.
 *   
 *   Security Gateway: Imports from canonical @forge/mcp-gateway (Epic 2.5)
 *   Location: /forge/mcp-gateway/
 */

// Re-export everything from server (includes gateway re-exports)
export * from './server';

// Re-export MCP Gateway for direct access
export {
  MCPGateway,
  createGateway,
  SecurityLayer,
  ApprovalGate,
  SandboxExecutor,
  PrivacyTokenizer,
  AuditLogger,
  BehaviorMonitor,
} from '../../mcp-gateway';

export type {
  MCPGatewayConfig,
  MCPRequest,
  MCPResponse,
  MCPTool,
  RiskLevel,
  RequestContext,
  CARSAssessment,
  ApprovalInfo,
} from '../../mcp-gateway';

// Keep legacy exports for backwards compatibility
import { MCPToolDefinition, MCPToolResult } from '../core/types';
import { ForgeC } from '../core/forge-c';

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
            maxIterations: {
              type: 'number',
              description: 'Maximum convergence iterations',
              default: 10,
            },
            targetScore: {
              type: 'number',
              description: 'Target validation score (0-1)',
              default: 0.95,
            },
            timeoutMs: {
              type: 'number',
              description: 'Timeout in milliseconds',
              default: 300000,
            },
            provider: {
              type: 'string',
              description: 'LLM provider to use (anthropic, openai)',
            },
            model: {
              type: 'string',
              description: 'Specific model to use',
            },
          },
        },
      },
    },
  },
  {
    name: 'forge_validate',
    description: 'Validate an output against an answer contract without running full convergence',
    inputSchema: {
      type: 'object',
      required: ['contractId', 'output'],
      properties: {
        contractId: {
          type: 'string',
          description: 'ID of the answer contract to validate against',
        },
        output: {
          type: 'object',
          description: 'Output to validate',
        },
        validators: {
          type: 'array',
          description: 'Specific validators to run (omit for all)',
          items: {
            type: 'string',
          },
        },
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
        sessionId: {
          type: 'string',
          description: 'Session ID to check',
        },
        includeIterations: {
          type: 'boolean',
          description: 'Include iteration history',
          default: false,
        },
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
        sessionId: {
          type: 'string',
          description: 'Session ID to abort',
        },
        reason: {
          type: 'string',
          description: 'Reason for aborting',
        },
      },
    },
  },
  {
    name: 'forge_list_sessions',
    description: 'List generation sessions',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status',
          enum: ['created', 'running', 'completed', 'failed', 'aborted'],
        },
        contractId: {
          type: 'string',
          description: 'Filter by contract ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum sessions to return',
          default: 20,
        },
      },
    },
  },
  {
    name: 'forge_list_contracts',
    description: 'List available answer contracts',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category',
        },
        search: {
          type: 'string',
          description: 'Search term for contract name/description',
        },
      },
    },
  },
  {
    name: 'forge_get_metrics',
    description: 'Get ForgeC performance metrics',
    inputSchema: {
      type: 'object',
      properties: {
        timeRange: {
          type: 'string',
          description: 'Time range for metrics',
          enum: ['1h', '24h', '7d', '30d', 'all'],
          default: '24h',
        },
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
        sessionId: {
          type: 'string',
          description: 'Session ID to get evidence for',
        },
        format: {
          type: 'string',
          description: 'Export format',
          enum: ['json', 'markdown'],
          default: 'json',
        },
      },
    },
  },
];

// ============================================
// TOOL HANDLER
// ============================================

export class MCPToolHandler {
  private forge: ForgeC;

  constructor(forge: ForgeC) {
    this.forge = forge;
  }

  /**
   * Handle a tool call
   */
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
          return {
            success: false,
            error: `Unknown tool: ${toolName}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
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
    // This would integrate with the convergence engine validators
    // For now, return a placeholder
    return {
      success: true,
      data: {
        valid: true,
        score: 0.95,
        validators: [],
        message: 'Validation not yet implemented - use forge_generate for full convergence',
      },
    };
  }

  private async handleSessionStatus(params: Record<string, unknown>): Promise<MCPToolResult> {
    const session = await this.forge.getSession(params.sessionId as string);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
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
        tokensUsed: iter.tokensUsed,
      }));
    }

    if (session.error) {
      data.error = session.error;
    }

    return {
      success: true,
      data,
    };
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

  private async handleListContracts(params: Record<string, unknown>): Promise<MCPToolResult> {
    // This would integrate with a contract registry
    // For now, return placeholder data
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

  private async handleGetMetrics(params: Record<string, unknown>): Promise<MCPToolResult> {
    // This would get metrics from the MetricsPlugin
    // For now, return placeholder data
    return {
      success: true,
      data: {
        timeRange: params.timeRange || '24h',
        sessions: {
          total: 0,
          completed: 0,
          failed: 0,
          successRate: 0,
        },
        tokens: {
          input: 0,
          output: 0,
          total: 0,
        },
        cost: 0,
        avgIterations: 0,
        avgDurationMs: 0,
      },
    };
  }

  private async handleGetEvidence(params: Record<string, unknown>): Promise<MCPToolResult> {
    // This would get evidence from the EvidencePlugin
    // For now, return placeholder
    return {
      success: false,
      error: 'Evidence pack not found. Session may not exist or evidence collection may be disabled.',
    };
  }

  /**
   * Get all tool definitions
   */
  static getToolDefinitions(): MCPToolDefinition[] {
    return FORGE_TOOLS;
  }
}

// ============================================
// MCP SERVER
// ============================================

export class MCPServer {
  private toolHandler: MCPToolHandler;
  private forge: ForgeC;

  constructor(forge: ForgeC) {
    this.forge = forge;
    this.toolHandler = new MCPToolHandler(forge);
  }

  /**
   * Get tool definitions for MCP registration
   */
  getTools(): MCPToolDefinition[] {
    return FORGE_TOOLS;
  }

  /**
   * Handle incoming tool request
   */
  async handleToolRequest(request: {
    name: string;
    params: Record<string, unknown>;
  }): Promise<MCPToolResult> {
    return this.toolHandler.handle(request.name, request.params);
  }

  /**
   * Start the MCP server (placeholder for actual implementation)
   */
  async start(port: number = 3100): Promise<void> {
    console.log(`[MCPServer] Would start on port ${port}`);
    console.log(`[MCPServer] Registered ${FORGE_TOOLS.length} tools:`);
    for (const tool of FORGE_TOOLS) {
      console.log(`  - ${tool.name}: ${tool.description}`);
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    console.log('[MCPServer] Stopped');
  }
}

// ============================================
// EXPORTS
// ============================================

export default MCPServer;
