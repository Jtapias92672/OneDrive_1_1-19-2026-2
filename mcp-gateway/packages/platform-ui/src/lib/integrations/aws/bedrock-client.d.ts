/**
 * AWS Bedrock Client
 * Epic 11: External Integrations
 *
 * Real implementation using @aws-sdk/client-bedrock-runtime and @aws-sdk/client-bedrock
 */
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { BedrockClient as AWSBedrockClient } from '@aws-sdk/client-bedrock';
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
    invokeModelStream(request: InvokeModelRequest, onChunk: (chunk: StreamChunk) => void): Promise<InvokeModelResponse>;
    listModels(byProvider?: string): Promise<BedrockModel[]>;
    getModelInfo(modelId: string): Promise<BedrockModel | null>;
}
export declare class BedrockClient implements IBedrockClient {
    private config;
    private runtimeClient;
    private managementClient;
    constructor(config: BedrockConfig);
    /**
     * Invoke a foundation model synchronously
     */
    invokeModel(request: InvokeModelRequest): Promise<InvokeModelResponse>;
    /**
     * Invoke a foundation model with streaming response
     */
    invokeModelStream(request: InvokeModelRequest, onChunk: (chunk: StreamChunk) => void): Promise<InvokeModelResponse>;
    /**
     * List available foundation models
     */
    listModels(byProvider?: string): Promise<BedrockModel[]>;
    /**
     * Get information about a specific model
     */
    getModelInfo(modelId: string): Promise<BedrockModel | null>;
    /**
     * Check if client is configured
     */
    isConfigured(): boolean;
    /**
     * Get the underlying AWS SDK runtime client for advanced operations
     */
    getRuntimeClient(): BedrockRuntimeClient;
    /**
     * Get the underlying AWS SDK management client for advanced operations
     */
    getManagementClient(): AWSBedrockClient;
}
/**
 * Mock client for testing
 */
export declare class MockBedrockClient implements IBedrockClient {
    private mockModels;
    invokeModel(request: InvokeModelRequest): Promise<InvokeModelResponse>;
    invokeModelStream(request: InvokeModelRequest, onChunk: (chunk: StreamChunk) => void): Promise<InvokeModelResponse>;
    listModels(byProvider?: string): Promise<BedrockModel[]>;
    getModelInfo(modelId: string): Promise<BedrockModel | null>;
}
