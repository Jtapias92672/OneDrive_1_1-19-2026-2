/**
 * AWS Bedrock Client
 * Epic 11: External Integrations
 *
 * Real implementation using @aws-sdk/client-bedrock-runtime and @aws-sdk/client-bedrock
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { BedrockClient as AWSBedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';

export interface BedrockConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

export interface InvokeModelRequest {
  modelId: string;
  body: string;
  contentType?: string;
  accept?: string;
}

export interface InvokeModelResponse {
  body: string;
  contentType: string;
  inputTokenCount?: number;
  outputTokenCount?: number;
}

export interface StreamChunk {
  chunk: string;
  inputTokenCount?: number;
  outputTokenCount?: number;
}

export interface BedrockModel {
  modelId: string;
  modelName: string;
  providerName: string;
  inputModalities: string[];
  outputModalities: string[];
  inferenceTypesSupported?: string[];
  customizationsSupported?: string[];
}

export interface IBedrockClient {
  invokeModel(request: InvokeModelRequest): Promise<InvokeModelResponse>;
  invokeModelStream(
    request: InvokeModelRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<InvokeModelResponse>;
  listModels(byProvider?: string): Promise<BedrockModel[]>;
  getModelInfo(modelId: string): Promise<BedrockModel | null>;
}

export class BedrockClient implements IBedrockClient {
  private config: BedrockConfig;
  private runtimeClient: BedrockRuntimeClient;
  private managementClient: AWSBedrockClient;

  constructor(config: BedrockConfig) {
    this.config = config;

    const clientConfig = {
      region: config.region,
      ...(config.accessKeyId && config.secretAccessKey
        ? {
            credentials: {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            },
          }
        : {}),
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    };

    this.runtimeClient = new BedrockRuntimeClient(clientConfig);
    this.managementClient = new AWSBedrockClient(clientConfig);
  }

  /**
   * Invoke a foundation model synchronously
   */
  async invokeModel(request: InvokeModelRequest): Promise<InvokeModelResponse> {
    const command = new InvokeModelCommand({
      modelId: request.modelId,
      body: Buffer.from(request.body),
      contentType: request.contentType || 'application/json',
      accept: request.accept || 'application/json',
    });

    const response = await this.runtimeClient.send(command);

    // Convert response body to string
    const bodyString = Buffer.isBuffer(response.body)
      ? response.body.toString('utf-8')
      : Buffer.from(response.body as Uint8Array).toString('utf-8');

    return {
      body: bodyString,
      contentType: response.contentType || 'application/json',
      // Token counts may be in the response body depending on model
    };
  }

  /**
   * Invoke a foundation model with streaming response
   */
  async invokeModelStream(
    request: InvokeModelRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<InvokeModelResponse> {
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: request.modelId,
      body: Buffer.from(request.body),
      contentType: request.contentType || 'application/json',
      accept: request.accept || 'application/json',
    });

    const response = await this.runtimeClient.send(command);

    const chunks: string[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    if (response.body) {
      for await (const event of response.body) {
        if (event.chunk?.bytes) {
          const chunkText = Buffer.from(event.chunk.bytes).toString('utf-8');
          chunks.push(chunkText);

          // Parse chunk for token counts if available
          try {
            const parsed = JSON.parse(chunkText);
            if (parsed.amazon?.inputTokenCount) {
              totalInputTokens = parsed.amazon.inputTokenCount;
            }
            if (parsed.amazon?.outputTokenCount) {
              totalOutputTokens = parsed.amazon.outputTokenCount;
            }
          } catch {
            // Not JSON or doesn't have token info
          }

          onChunk({
            chunk: chunkText,
            inputTokenCount: totalInputTokens,
            outputTokenCount: totalOutputTokens,
          });
        }
      }
    }

    return {
      body: chunks.join(''),
      contentType: response.contentType || 'application/json',
      inputTokenCount: totalInputTokens,
      outputTokenCount: totalOutputTokens,
    };
  }

  /**
   * List available foundation models
   */
  async listModels(byProvider?: string): Promise<BedrockModel[]> {
    const command = new ListFoundationModelsCommand({
      ...(byProvider ? { byProvider } : {}),
    });

    const response = await this.managementClient.send(command);

    return (response.modelSummaries || []).map((model) => ({
      modelId: model.modelId || '',
      modelName: model.modelName || '',
      providerName: model.providerName || '',
      inputModalities: model.inputModalities || [],
      outputModalities: model.outputModalities || [],
      inferenceTypesSupported: model.inferenceTypesSupported,
      customizationsSupported: model.customizationsSupported,
    }));
  }

  /**
   * Get information about a specific model
   */
  async getModelInfo(modelId: string): Promise<BedrockModel | null> {
    const models = await this.listModels();
    return models.find((m) => m.modelId === modelId) || null;
  }

  /**
   * Check if client is configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.region);
  }

  /**
   * Get the underlying AWS SDK runtime client for advanced operations
   */
  getRuntimeClient(): BedrockRuntimeClient {
    return this.runtimeClient;
  }

  /**
   * Get the underlying AWS SDK management client for advanced operations
   */
  getManagementClient(): AWSBedrockClient {
    return this.managementClient;
  }
}

/**
 * Mock client for testing
 */
export class MockBedrockClient implements IBedrockClient {
  private mockModels: BedrockModel[] = [
    {
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      modelName: 'Claude 3 Sonnet',
      providerName: 'Anthropic',
      inputModalities: ['TEXT'],
      outputModalities: ['TEXT'],
      inferenceTypesSupported: ['ON_DEMAND'],
    },
    {
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      modelName: 'Claude 3 Haiku',
      providerName: 'Anthropic',
      inputModalities: ['TEXT'],
      outputModalities: ['TEXT'],
      inferenceTypesSupported: ['ON_DEMAND'],
    },
    {
      modelId: 'amazon.titan-text-express-v1',
      modelName: 'Titan Text Express',
      providerName: 'Amazon',
      inputModalities: ['TEXT'],
      outputModalities: ['TEXT'],
      inferenceTypesSupported: ['ON_DEMAND'],
    },
  ];

  async invokeModel(request: InvokeModelRequest): Promise<InvokeModelResponse> {
    // Parse input to generate contextual mock response
    let inputText = '';
    try {
      const parsed = JSON.parse(request.body);
      inputText = parsed.prompt || parsed.messages?.[0]?.content || '';
    } catch {
      inputText = request.body;
    }

    const mockResponse = {
      completion: `Mock response to: "${inputText.substring(0, 50)}..."`,
      stop_reason: 'end_turn',
    };

    return {
      body: JSON.stringify(mockResponse),
      contentType: 'application/json',
      inputTokenCount: Math.ceil(inputText.length / 4),
      outputTokenCount: Math.ceil(JSON.stringify(mockResponse).length / 4),
    };
  }

  async invokeModelStream(
    request: InvokeModelRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<InvokeModelResponse> {
    // Simulate streaming by sending chunks
    const chunks = ['Mock ', 'streaming ', 'response ', 'complete.'];

    let totalOutput = '';
    for (const chunk of chunks) {
      totalOutput += chunk;
      onChunk({
        chunk: JSON.stringify({ completion: chunk }),
        outputTokenCount: Math.ceil(totalOutput.length / 4),
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return {
      body: JSON.stringify({ completion: totalOutput }),
      contentType: 'application/json',
      inputTokenCount: 10,
      outputTokenCount: Math.ceil(totalOutput.length / 4),
    };
  }

  async listModels(byProvider?: string): Promise<BedrockModel[]> {
    if (byProvider) {
      return this.mockModels.filter(
        (m) => m.providerName.toLowerCase() === byProvider.toLowerCase()
      );
    }
    return this.mockModels;
  }

  async getModelInfo(modelId: string): Promise<BedrockModel | null> {
    return this.mockModels.find((m) => m.modelId === modelId) || null;
  }
}
