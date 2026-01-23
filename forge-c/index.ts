/**
 * FORGE C Core
 * 
 * @epic 03 - FORGE C Core
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   FORGE C (Convergent) - The central orchestration engine that coordinates
 *   LLM generation, validation, and iterative refinement until outputs
 *   satisfy their Answer Contracts.
 * 
 *   Key Components:
 *   - ForgeC: Main orchestrator class
 *   - Session Manager: Track generation sessions
 *   - Providers: Multi-LLM support (Anthropic, OpenAI, Bedrock)
 *   - Plugins: Extensible hooks (Logging, Metrics, Evidence)
 *   - MCP Tools: Agent integration surface
 */

// ============================================
// CORE
// ============================================

export {
  ForgeC,
  createForgeC,
  getDefaultForgeC,
  setDefaultForgeC,
} from './core/forge-c';

export { SessionManager, SessionStats } from './core/session';

// ============================================
// TYPES
// ============================================

export type {
  ForgeCConfig,
  ProviderConfig,
  PluginConfig,
  SessionStorageConfig,
  LoggingConfig,
  ConvergenceSettings,
  BudgetConfig,
  Session,
  SessionStatus,
  SessionIteration,
  Message,
  MessageRole,
  TokenUsage,
  SessionError,
  ValidationSummary,
  CompletionRequest,
  CompletionResponse,
  Tool,
  ToolCall,
  PluginHook,
  PluginContext,
  PluginHookHandler,
  MCPToolDefinition,
  MCPToolResult,
  ForgeEvent,
  ForgeEventType,
  ForgeEventHandler,
  GenerationRequest,
  GenerationOptions,
  GenerationResult,
  ModelPricing,
} from './core/types';

export { DEFAULT_MODEL_PRICING } from './core/types';

// ============================================
// PROVIDERS
// ============================================

export {
  LLMProvider,
  BaseProvider,
  AnthropicProvider,
  OpenAIProvider,
  BedrockProvider,
  MockProvider,
  createProvider,
  ModelInfo,
} from './providers';

// ============================================
// PLUGINS
// ============================================

export {
  Plugin,
  PluginManager,
  LoggingPlugin,
  MetricsPlugin,
  EvidencePlugin,
} from './plugins';

// ============================================
// MCP
// ============================================

export {
  MCPServer,
  MCPToolHandler,
  FORGE_TOOLS,
} from './mcp';

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

import { ForgeC, createForgeC } from './core/forge-c';
import { ForgeCConfig, GenerationRequest, GenerationResult, CompletionRequest, CompletionResponse } from './core/types';

/**
 * Quick generation with default configuration
 */
export async function generate(
  contractId: string,
  input: unknown,
  config?: Partial<ForgeCConfig>
): Promise<GenerationResult> {
  const forge = createForgeC({
    providers: [{ name: 'anthropic', apiKeyEnv: 'ANTHROPIC_API_KEY' }],
    ...config,
  });
  
  return forge.generate({
    contract: contractId,
    input,
  });
}

/**
 * Quick completion without convergence
 */
export async function complete(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    provider?: string;
  }
): Promise<string> {
  const forge = createForgeC({
    providers: [{ name: 'anthropic', apiKeyEnv: 'ANTHROPIC_API_KEY' }],
  });
  
  const response = await forge.complete({
    model: options?.model || 'claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: options?.maxTokens || 4096,
    temperature: options?.temperature,
  });
  
  return response.content;
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default ForgeC;
