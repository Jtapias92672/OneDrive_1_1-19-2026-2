/**
 * FORGE C LLM Providers
 * 
 * @epic 03 - FORGE C Core
 * @task 4.1 - Provider System
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   LLM provider abstraction layer supporting multiple backends:
 *   Anthropic (Claude), OpenAI, AWS Bedrock, etc.
 */

import {
  ProviderConfig,
  CompletionRequest,
  CompletionResponse,
  TokenUsage,
  Message,
} from '../core/types';

// ============================================
// PROVIDER INTERFACE
// ============================================

export interface LLMProvider {
  /** Provider name */
  readonly name: string;
  
  /** Available models */
  readonly models: string[];
  
  /** Default model */
  readonly defaultModel: string;
  
  /** Run completion */
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  
  /** Estimate token count */
  estimateTokens(text: string): number;
  
  /** Check if model is supported */
  supportsModel(model: string): boolean;
  
  /** Get model info */
  getModelInfo(model: string): ModelInfo | null;
}

export interface ModelInfo {
  name: string;
  maxTokens: number;
  contextWindow: number;
  inputCostPer1K: number;
  outputCostPer1K: number;
  capabilities: string[];
}

// ============================================
// BASE PROVIDER
// ============================================

export abstract class BaseProvider implements LLMProvider {
  abstract readonly name: string;
  abstract readonly models: string[];
  abstract readonly defaultModel: string;
  protected config: ProviderConfig;
  protected apiKey: string;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.apiKey = this.resolveApiKey(config);
  }

  protected resolveApiKey(config: ProviderConfig): string {
    if (config.apiKey) {
      return config.apiKey;
    }
    
    if (config.apiKeyEnv) {
      const key = process.env[config.apiKeyEnv];
      if (!key) {
        throw new Error(`Environment variable ${config.apiKeyEnv} not set`);
      }
      return key;
    }
    
    throw new Error(`No API key provided for provider ${config.name}`);
  }

  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;

  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  supportsModel(model: string): boolean {
    return this.models.includes(model);
  }

  abstract getModelInfo(model: string): ModelInfo | null;
}

// ============================================
// ANTHROPIC PROVIDER
// ============================================

export class AnthropicProvider extends BaseProvider {
  readonly name = 'anthropic';
  readonly defaultModel = 'claude-sonnet-4-20250514';
  readonly models = [
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307',
  ];

  private baseUrl: string;

  constructor(config: ProviderConfig) {
    // Default to ANTHROPIC_API_KEY env var
    const fullConfig = {
      ...config,
      apiKeyEnv: config.apiKeyEnv || 'ANTHROPIC_API_KEY',
    };
    super(fullConfig);
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = request.model || this.defaultModel;
    
    // Build messages for Anthropic format
    const messages = this.formatMessages(request.messages);
    
    const body: any = {
      model,
      max_tokens: request.maxTokens || 4096,
      messages,
    };
    
    // Add system prompt
    if (request.system) {
      body.system = request.system;
    }
    
    // Add optional parameters
    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }
    if (request.topP !== undefined) {
      body.top_p = request.topP;
    }
    if (request.stopSequences) {
      body.stop_sequences = request.stopSequences;
    }
    
    // Add tools if provided
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Anthropic API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      
      // Extract content
      let content = '';
      const toolCalls: any[] = [];
      
      for (const block of data.content) {
        if (block.type === 'text') {
          content += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input,
          });
        }
      }

      return {
        content,
        stopReason: this.mapStopReason(data.stop_reason),
        usage: {
          input: data.usage.input_tokens,
          output: data.usage.output_tokens,
          total: data.usage.input_tokens + data.usage.output_tokens,
        },
        model: data.model,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        id: data.id,
      };
    } catch (error: any) {
      throw new Error(`Anthropic completion failed: ${error.message}`);
    }
  }

  private formatMessages(messages: Message[]): any[] {
    return messages
      .filter(m => m.role !== 'system') // System is handled separately
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));
  }

  private mapStopReason(reason: string): CompletionResponse['stopReason'] {
    switch (reason) {
      case 'end_turn':
        return 'end_turn';
      case 'max_tokens':
        return 'max_tokens';
      case 'stop_sequence':
        return 'stop_sequence';
      case 'tool_use':
        return 'tool_use';
      default:
        return 'end_turn';
    }
  }

  getModelInfo(model: string): ModelInfo | null {
    const modelInfoMap: Record<string, ModelInfo> = {
      'claude-sonnet-4-20250514': {
        name: 'Claude Sonnet 4',
        maxTokens: 8192,
        contextWindow: 200000,
        inputCostPer1K: 0.003,
        outputCostPer1K: 0.015,
        capabilities: ['code', 'analysis', 'creative', 'tools'],
      },
      'claude-3-5-sonnet-20241022': {
        name: 'Claude 3.5 Sonnet',
        maxTokens: 8192,
        contextWindow: 200000,
        inputCostPer1K: 0.003,
        outputCostPer1K: 0.015,
        capabilities: ['code', 'analysis', 'creative', 'tools'],
      },
      'claude-3-opus-20240229': {
        name: 'Claude 3 Opus',
        maxTokens: 4096,
        contextWindow: 200000,
        inputCostPer1K: 0.015,
        outputCostPer1K: 0.075,
        capabilities: ['code', 'analysis', 'creative', 'tools', 'complex-reasoning'],
      },
      'claude-3-haiku-20240307': {
        name: 'Claude 3 Haiku',
        maxTokens: 4096,
        contextWindow: 200000,
        inputCostPer1K: 0.00025,
        outputCostPer1K: 0.00125,
        capabilities: ['code', 'analysis', 'fast'],
      },
    };
    
    return modelInfoMap[model] || null;
  }
}

// ============================================
// OPENAI PROVIDER
// ============================================

export class OpenAIProvider extends BaseProvider {
  readonly name = 'openai';
  readonly defaultModel = 'gpt-4o';
  readonly models = [
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
  ];

  private baseUrl: string;

  constructor(config: ProviderConfig) {
    const fullConfig = {
      ...config,
      apiKeyEnv: config.apiKeyEnv || 'OPENAI_API_KEY',
    };
    super(fullConfig);
    this.baseUrl = config.baseUrl || 'https://api.openai.com';
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = request.model || this.defaultModel;
    
    const messages = this.formatMessages(request.messages, request.system);
    
    const body: any = {
      model,
      messages,
      max_tokens: request.maxTokens || 4096,
    };
    
    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }
    if (request.topP !== undefined) {
      body.top_p = request.topP;
    }
    if (request.stopSequences) {
      body.stop = request.stopSequences;
    }
    if (request.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }
    
    // Add tools if provided
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      }));
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      const choice = data.choices[0];
      
      // Extract tool calls
      const toolCalls = choice.message.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments),
      }));

      return {
        content: choice.message.content || '',
        stopReason: this.mapStopReason(choice.finish_reason),
        usage: {
          input: data.usage.prompt_tokens,
          output: data.usage.completion_tokens,
          total: data.usage.total_tokens,
        },
        model: data.model,
        toolCalls,
        id: data.id,
      };
    } catch (error: any) {
      throw new Error(`OpenAI completion failed: ${error.message}`);
    }
  }

  private formatMessages(messages: Message[], system?: string): any[] {
    const result: any[] = [];
    
    // Add system message first
    if (system) {
      result.push({ role: 'system', content: system });
    }
    
    // Add conversation messages
    for (const msg of messages) {
      result.push({
        role: msg.role,
        content: msg.content,
      });
    }
    
    return result;
  }

  private mapStopReason(reason: string): CompletionResponse['stopReason'] {
    switch (reason) {
      case 'stop':
        return 'end_turn';
      case 'length':
        return 'max_tokens';
      case 'tool_calls':
        return 'tool_use';
      default:
        return 'end_turn';
    }
  }

  getModelInfo(model: string): ModelInfo | null {
    const modelInfoMap: Record<string, ModelInfo> = {
      'gpt-4o': {
        name: 'GPT-4o',
        maxTokens: 4096,
        contextWindow: 128000,
        inputCostPer1K: 0.005,
        outputCostPer1K: 0.015,
        capabilities: ['code', 'analysis', 'creative', 'tools', 'vision'],
      },
      'gpt-4-turbo': {
        name: 'GPT-4 Turbo',
        maxTokens: 4096,
        contextWindow: 128000,
        inputCostPer1K: 0.01,
        outputCostPer1K: 0.03,
        capabilities: ['code', 'analysis', 'creative', 'tools', 'vision'],
      },
      'gpt-3.5-turbo': {
        name: 'GPT-3.5 Turbo',
        maxTokens: 4096,
        contextWindow: 16385,
        inputCostPer1K: 0.0005,
        outputCostPer1K: 0.0015,
        capabilities: ['code', 'analysis', 'fast'],
      },
    };
    
    return modelInfoMap[model] || null;
  }
}

// ============================================
// BEDROCK PROVIDER (Stub)
// ============================================

export class BedrockProvider extends BaseProvider {
  readonly name = 'bedrock';
  readonly defaultModel = 'anthropic.claude-3-sonnet-20240229-v1:0';
  readonly models = [
    'anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-haiku-20240307-v1:0',
    'amazon.titan-text-express-v1',
  ];

  constructor(config: ProviderConfig) {
    const fullConfig = {
      ...config,
      apiKeyEnv: config.apiKeyEnv || 'AWS_ACCESS_KEY_ID',
    };
    super(fullConfig);
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Bedrock implementation would use AWS SDK
    throw new Error('Bedrock provider not yet implemented. Use Anthropic or OpenAI.');
  }

  getModelInfo(model: string): ModelInfo | null {
    return null;
  }
}

// ============================================
// MOCK PROVIDER (for testing)
// ============================================

export class MockProvider extends BaseProvider {
  readonly name = 'mock';
  readonly defaultModel = 'mock-model';
  readonly models = ['mock-model'];
  
  private mockResponses: string[] = [];
  private responseIndex = 0;

  constructor(config?: ProviderConfig) {
    super(config || { name: 'mock', apiKey: 'mock-key' });
  }

  setMockResponses(responses: string[]): void {
    this.mockResponses = responses;
    this.responseIndex = 0;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const content = this.mockResponses[this.responseIndex] || 'Mock response';
    this.responseIndex = (this.responseIndex + 1) % Math.max(1, this.mockResponses.length);
    
    const inputTokens = this.estimateTokens(request.messages.map(m => m.content).join(' '));
    const outputTokens = this.estimateTokens(content);
    
    return {
      content,
      stopReason: 'end_turn',
      usage: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      model: 'mock-model',
      id: `mock_${Date.now()}`,
    };
  }

  getModelInfo(model: string): ModelInfo | null {
    return {
      name: 'Mock Model',
      maxTokens: 4096,
      contextWindow: 100000,
      inputCostPer1K: 0,
      outputCostPer1K: 0,
      capabilities: ['mock'],
    };
  }
}

// ============================================
// PROVIDER FACTORY
// ============================================

export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.name.toLowerCase()) {
    case 'anthropic':
    case 'claude':
      return new AnthropicProvider(config);
    
    case 'openai':
    case 'gpt':
      return new OpenAIProvider(config);
    
    case 'bedrock':
    case 'aws':
      return new BedrockProvider(config);
    
    case 'mock':
    case 'test':
      return new MockProvider(config);
    
    default:
      throw new Error(`Unknown provider: ${config.name}`);
  }
}

// ============================================
// EXPORTS
// ============================================

export default createProvider;
