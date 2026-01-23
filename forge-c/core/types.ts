/**
 * FORGE C Core Types
 * 
 * @epic 03 - FORGE C Core
 * @task 1.1 - Type Definitions
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Core types for the FORGE C orchestrator - the central
 *   coordination engine for LLM generation and validation.
 */

// ============================================
// CONFIGURATION
// ============================================

export interface ForgeCConfig {
  /** LLM provider configurations */
  providers: ProviderConfig[];
  
  /** Default provider name */
  defaultProvider?: string;
  
  /** Default model */
  defaultModel?: string;
  
  /** Plugin configurations */
  plugins?: PluginConfig[];
  
  /** Session storage configuration */
  sessionStorage?: SessionStorageConfig;
  
  /** Logging configuration */
  logging?: LoggingConfig;
  
  /** Default convergence settings */
  convergence?: ConvergenceSettings;
  
  /** Budget limits */
  budget?: BudgetConfig;
}

export interface ProviderConfig {
  /** Provider name (anthropic, openai, bedrock) */
  name: string;
  
  /** API key (or use env var) */
  apiKey?: string;
  
  /** Environment variable for API key */
  apiKeyEnv?: string;
  
  /** Base URL override */
  baseUrl?: string;
  
  /** Default model for this provider */
  defaultModel?: string;
  
  /** Provider-specific options */
  options?: Record<string, unknown>;
}

export interface PluginConfig {
  /** Plugin name */
  name: string;
  
  /** Is plugin enabled */
  enabled?: boolean;
  
  /** Plugin-specific options */
  options?: Record<string, unknown>;
}

export interface SessionStorageConfig {
  /** Storage type */
  type: 'memory' | 'file' | 'redis' | 'database';
  
  /** Connection string (for redis/database) */
  connectionString?: string;
  
  /** File path (for file storage) */
  filePath?: string;
  
  /** Session TTL in ms */
  ttlMs?: number;
}

export interface LoggingConfig {
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  
  /** Pretty print */
  pretty?: boolean;
  
  /** Include timestamps */
  timestamps?: boolean;
  
  /** Output destination */
  destination?: 'console' | 'file' | 'both';
  
  /** Log file path */
  filePath?: string;
}

export interface ConvergenceSettings {
  /** Maximum iterations */
  maxIterations?: number;
  
  /** Target score */
  targetScore?: number;
  
  /** Timeout in ms */
  timeoutMs?: number;
  
  /** Strategy */
  strategy?: string;
}

export interface BudgetConfig {
  /** Max API calls per session */
  maxApiCallsPerSession?: number;
  
  /** Max tokens per session */
  maxTokensPerSession?: number;
  
  /** Max cost per session (USD) */
  maxCostPerSession?: number;
  
  /** Max concurrent sessions */
  maxConcurrentSessions?: number;
}

// ============================================
// SESSION
// ============================================

export type SessionStatus =
  | 'created'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'aborted';

export interface Session {
  /** Unique session ID */
  id: string;
  
  /** Contract ID being executed */
  contractId: string;
  
  /** Current status */
  status: SessionStatus;
  
  /** Input data */
  input: unknown;
  
  /** Current output */
  output?: unknown;
  
  /** Iteration history */
  iterations: SessionIteration[];
  
  /** Messages history */
  messages: Message[];
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Last update timestamp */
  updatedAt: string;
  
  /** Completion timestamp */
  completedAt?: string;
  
  /** Provider used */
  provider: string;
  
  /** Model used */
  model: string;
  
  /** Token usage */
  tokenUsage: TokenUsage;
  
  /** Cost incurred */
  cost: number;
  
  /** Error if failed */
  error?: SessionError;
  
  /** Session metadata */
  metadata: Record<string, unknown>;
}

export interface SessionIteration {
  /** Iteration number */
  number: number;
  
  /** LLM response */
  response?: string;
  
  /** Parsed output */
  output?: unknown;
  
  /** Validation results */
  validations?: ValidationSummary[];
  
  /** Score */
  score: number;
  
  /** Feedback generated */
  feedback?: string;
  
  /** Timestamp */
  timestamp: string;
  
  /** Duration in ms */
  durationMs: number;
  
  /** Tokens used */
  tokensUsed: number;
}

export interface ValidationSummary {
  validatorId: string;
  validatorType: string;
  passed: boolean;
  score: number;
  errorCount: number;
}

export interface TokenUsage {
  /** Input tokens */
  input: number;
  
  /** Output tokens */
  output: number;
  
  /** Total tokens */
  total: number;
}

export interface SessionError {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
}

// ============================================
// MESSAGES
// ============================================

export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// PROVIDER TYPES
// ============================================

export interface CompletionRequest {
  /** Model to use */
  model: string;
  
  /** Messages */
  messages: Message[];
  
  /** System prompt */
  system?: string;
  
  /** Max tokens to generate */
  maxTokens?: number;
  
  /** Temperature (0-1) */
  temperature?: number;
  
  /** Top P sampling */
  topP?: number;
  
  /** Stop sequences */
  stopSequences?: string[];
  
  /** Response format */
  responseFormat?: 'text' | 'json';
  
  /** Tools available */
  tools?: Tool[];
}

export interface CompletionResponse {
  /** Generated content */
  content: string;
  
  /** Stop reason */
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  
  /** Token usage */
  usage: TokenUsage;
  
  /** Model used */
  model: string;
  
  /** Tool calls (if any) */
  toolCalls?: ToolCall[];
  
  /** Response ID */
  id?: string;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// ============================================
// PLUGIN TYPES
// ============================================

export type PluginHook =
  | 'session:created'
  | 'session:started'
  | 'session:completed'
  | 'session:failed'
  | 'iteration:start'
  | 'iteration:complete'
  | 'llm:request'
  | 'llm:response'
  | 'validation:start'
  | 'validation:complete'
  | 'error';

export interface PluginContext {
  sessionId?: string;
  iteration?: number;
  timestamp: string;
  data: unknown;
}

export interface PluginHookHandler {
  (context: PluginContext): void | Promise<void>;
}

// ============================================
// MCP TYPES
// ============================================

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================
// EVENTS
// ============================================

export type ForgeEventType =
  | 'session:created'
  | 'session:started'
  | 'session:completed'
  | 'session:failed'
  | 'session:paused'
  | 'session:resumed'
  | 'iteration:start'
  | 'iteration:complete'
  | 'llm:request'
  | 'llm:response'
  | 'validation:start'
  | 'validation:complete'
  | 'plugin:registered'
  | 'plugin:error'
  | 'budget:warning'
  | 'budget:exceeded'
  | 'error';

export interface ForgeEvent {
  type: ForgeEventType;
  sessionId?: string;
  timestamp: string;
  data: unknown;
}

export type ForgeEventHandler = (event: ForgeEvent) => void | Promise<void>;

// ============================================
// REQUEST/RESPONSE
// ============================================

export interface GenerationRequest {
  /** Contract ID or contract object */
  contract: string | object;
  
  /** Input data */
  input: unknown;
  
  /** Provider override */
  provider?: string;
  
  /** Model override */
  model?: string;
  
  /** Generation options */
  options?: GenerationOptions;
  
  /** Session metadata */
  metadata?: Record<string, unknown>;
}

export interface GenerationOptions {
  /** Max iterations */
  maxIterations?: number;
  
  /** Target score */
  targetScore?: number;
  
  /** Timeout in ms */
  timeoutMs?: number;
  
  /** Strategy */
  strategy?: string;
  
  /** Skip validation */
  skipValidation?: boolean;
  
  /** Dry run (don't call LLM) */
  dryRun?: boolean;
}

export interface GenerationResult {
  /** Session ID */
  sessionId: string;
  
  /** Final status */
  status: 'success' | 'failed' | 'timeout' | 'aborted';
  
  /** Final output */
  output?: unknown;
  
  /** Number of iterations */
  iterations: number;
  
  /** Final score */
  score: number;
  
  /** Total duration in ms */
  durationMs: number;
  
  /** Token usage */
  tokenUsage: TokenUsage;
  
  /** Cost incurred */
  cost: number;
  
  /** Error if failed */
  error?: SessionError;
  
  /** Evidence pack ID */
  evidencePackId?: string;
}

// ============================================
// COST CALCULATION
// ============================================

export interface ModelPricing {
  /** Model name */
  model: string;
  
  /** Cost per 1K input tokens */
  inputCostPer1K: number;
  
  /** Cost per 1K output tokens */
  outputCostPer1K: number;
}

export const DEFAULT_MODEL_PRICING: ModelPricing[] = [
  { model: 'claude-sonnet-4-20250514', inputCostPer1K: 0.003, outputCostPer1K: 0.015 },
  { model: 'claude-3-5-sonnet-20241022', inputCostPer1K: 0.003, outputCostPer1K: 0.015 },
  { model: 'claude-3-opus-20240229', inputCostPer1K: 0.015, outputCostPer1K: 0.075 },
  { model: 'claude-3-haiku-20240307', inputCostPer1K: 0.00025, outputCostPer1K: 0.00125 },
  { model: 'gpt-4-turbo', inputCostPer1K: 0.01, outputCostPer1K: 0.03 },
  { model: 'gpt-4o', inputCostPer1K: 0.005, outputCostPer1K: 0.015 },
  { model: 'gpt-3.5-turbo', inputCostPer1K: 0.0005, outputCostPer1K: 0.0015 },
];

// ============================================
// EXPORTS
// ============================================

export default ForgeCConfig;
