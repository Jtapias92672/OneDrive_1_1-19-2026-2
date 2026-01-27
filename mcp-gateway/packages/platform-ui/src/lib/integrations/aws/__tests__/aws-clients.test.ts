/**
 * AWS Clients Tests
 * Epic 11: External Integrations
 *
 * Tests using Jest mocks for AWS SDK calls
 */

import { S3Client, MockS3Client, IS3Client } from '../s3-client';
import { BedrockClient, MockBedrockClient, IBedrockClient } from '../bedrock-client';

// Mock the AWS SDK modules
jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'PutObject' })),
    GetObjectCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'GetObject' })),
    DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'DeleteObject' })),
    ListObjectsV2Command: jest.fn().mockImplementation((input) => ({ input, _type: 'ListObjects' })),
    HeadObjectCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'HeadObject' })),
    __mockSend: mockSend,
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com/test'),
}));

jest.mock('@aws-sdk/client-bedrock-runtime', () => {
  const mockSend = jest.fn();
  return {
    BedrockRuntimeClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    InvokeModelCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'InvokeModel' })),
    InvokeModelWithResponseStreamCommand: jest.fn().mockImplementation((input) => ({
      input,
      _type: 'InvokeModelStream',
    })),
    __mockSend: mockSend,
  };
});

jest.mock('@aws-sdk/client-bedrock', () => {
  const mockSend = jest.fn();
  return {
    BedrockClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    ListFoundationModelsCommand: jest.fn().mockImplementation((input) => ({
      input,
      _type: 'ListModels',
    })),
    __mockSend: mockSend,
  };
});

// Get mock references
const s3Module = require('@aws-sdk/client-s3');
const bedrockRuntimeModule = require('@aws-sdk/client-bedrock-runtime');
const bedrockModule = require('@aws-sdk/client-bedrock');

describe('S3Client', () => {
  let client: S3Client;
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new S3Client({ region: 'us-east-1', bucket: 'test-bucket' });
    // Get the mock send function from the instantiated client
    mockSend = (client as unknown as { client: { send: jest.Mock } }).getAwsClient().send;
  });

  describe('isConfigured', () => {
    it('returns true when region and bucket are set', () => {
      expect(client.isConfigured()).toBe(true);
    });

    it('returns false when region is empty', () => {
      const emptyClient = new S3Client({ region: '', bucket: 'test' });
      expect(emptyClient.isConfigured()).toBe(false);
    });

    it('returns false when bucket is empty', () => {
      const emptyClient = new S3Client({ region: 'us-east-1', bucket: '' });
      expect(emptyClient.isConfigured()).toBe(false);
    });
  });

  describe('uploadFile', () => {
    it('uploads file and returns etag', async () => {
      mockSend.mockResolvedValueOnce({ ETag: '"abc123"' });

      const result = await client.uploadFile({
        key: 'test/file.txt',
        body: 'Hello, world!',
        contentType: 'text/plain',
      });

      expect(result.etag).toBe('"abc123"');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('downloadFile', () => {
    it('downloads file and returns content', async () => {
      // Create async iterable for body
      const mockBody = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from('Hello, world!');
        },
      };

      mockSend.mockResolvedValueOnce({
        Body: mockBody,
        ContentType: 'text/plain',
        ContentLength: 13,
        Metadata: { custom: 'value' },
      });

      const result = await client.downloadFile('test/file.txt');

      expect(result.body.toString()).toBe('Hello, world!');
      expect(result.contentType).toBe('text/plain');
      expect(result.metadata).toEqual({ custom: 'value' });
    });
  });

  describe('deleteFile', () => {
    it('deletes file successfully', async () => {
      mockSend.mockResolvedValueOnce({});

      await client.deleteFile('test/file.txt');

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('listFiles', () => {
    it('lists files with prefix', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: 'test/file1.txt', Size: 100, LastModified: new Date(), ETag: '"etag1"' },
          { Key: 'test/file2.txt', Size: 200, LastModified: new Date(), ETag: '"etag2"' },
        ],
        IsTruncated: false,
      });

      const result = await client.listFiles({ prefix: 'test/' });

      expect(result.objects).toHaveLength(2);
      expect(result.objects[0].key).toBe('test/file1.txt');
      expect(result.isTruncated).toBe(false);
    });

    it('handles pagination', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: 'file1.txt', Size: 100, LastModified: new Date(), ETag: '"e"' }],
        IsTruncated: true,
        NextContinuationToken: 'token123',
      });

      const result = await client.listFiles({ maxKeys: 1 });

      expect(result.isTruncated).toBe(true);
      expect(result.nextContinuationToken).toBe('token123');
    });
  });

  describe('getFileMetadata', () => {
    it('returns file metadata without content', async () => {
      mockSend.mockResolvedValueOnce({
        ContentLength: 1024,
        LastModified: new Date('2024-01-01'),
        ETag: '"abc123"',
        ContentType: 'application/json',
        Metadata: { version: '1' },
      });

      const result = await client.getFileMetadata('test/file.json');

      expect(result.key).toBe('test/file.json');
      expect(result.size).toBe(1024);
      expect(result.contentType).toBe('application/json');
      expect(result.metadata).toEqual({ version: '1' });
    });
  });

  describe('getSignedUrl', () => {
    it('returns presigned URL', async () => {
      const url = await client.getSignedUrl('test/file.txt');

      expect(url).toBe('https://signed-url.example.com/test');
    });
  });
});

describe('MockS3Client', () => {
  let client: IS3Client;

  beforeEach(() => {
    client = new MockS3Client();
  });

  it('uploadFile stores object and returns etag', async () => {
    const result = await client.uploadFile({
      key: 'test/file.txt',
      body: 'Hello, world!',
    });
    expect(result.etag).toBeDefined();
  });

  it('downloadFile retrieves stored object', async () => {
    await client.uploadFile({
      key: 'test/file.txt',
      body: 'Hello, world!',
      contentType: 'text/plain',
    });

    const result = await client.downloadFile('test/file.txt');
    expect(result.body.toString()).toBe('Hello, world!');
    expect(result.contentType).toBe('text/plain');
  });

  it('downloadFile throws for missing object', async () => {
    await expect(client.downloadFile('nonexistent')).rejects.toThrow('not found');
  });

  it('deleteFile removes object', async () => {
    await client.uploadFile({ key: 'test/file.txt', body: 'content' });
    await client.deleteFile('test/file.txt');
    await expect(client.downloadFile('test/file.txt')).rejects.toThrow('not found');
  });

  it('listFiles returns matching objects', async () => {
    await client.uploadFile({ key: 'a/file1.txt', body: '1' });
    await client.uploadFile({ key: 'a/file2.txt', body: '2' });
    await client.uploadFile({ key: 'b/file3.txt', body: '3' });

    const result = await client.listFiles({ prefix: 'a/' });
    expect(result.objects.length).toBe(2);
  });

  it('getFileMetadata returns metadata', async () => {
    await client.uploadFile({
      key: 'test/file.txt',
      body: 'content',
      contentType: 'text/plain',
      metadata: { custom: 'value' },
    });

    const result = await client.getFileMetadata('test/file.txt');
    expect(result.contentType).toBe('text/plain');
    expect(result.metadata).toEqual({ custom: 'value' });
  });

  it('getSignedUrl returns mock URL', async () => {
    const url = await client.getSignedUrl('test/file.txt');
    expect(url).toContain('test/file.txt');
    expect(url).toContain('signature');
  });
});

describe('BedrockClient', () => {
  let client: BedrockClient;
  let runtimeMockSend: jest.Mock;
  let managementMockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new BedrockClient({ region: 'us-east-1' });
    runtimeMockSend = client.getRuntimeClient().send as jest.Mock;
    managementMockSend = client.getManagementClient().send as jest.Mock;
  });

  describe('isConfigured', () => {
    it('returns true when region is set', () => {
      expect(client.isConfigured()).toBe(true);
    });

    it('returns false when region is empty', () => {
      const emptyClient = new BedrockClient({ region: '' });
      expect(emptyClient.isConfigured()).toBe(false);
    });
  });

  describe('invokeModel', () => {
    it('invokes model and returns response', async () => {
      const mockResponse = { completion: 'Test response' };
      runtimeMockSend.mockResolvedValueOnce({
        body: Buffer.from(JSON.stringify(mockResponse)),
        contentType: 'application/json',
      });

      const result = await client.invokeModel({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        body: JSON.stringify({ prompt: 'Hello' }),
      });

      expect(JSON.parse(result.body)).toEqual(mockResponse);
      expect(result.contentType).toBe('application/json');
    });
  });

  describe('listModels', () => {
    it('lists available foundation models', async () => {
      managementMockSend.mockResolvedValueOnce({
        modelSummaries: [
          {
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            modelName: 'Claude 3 Sonnet',
            providerName: 'Anthropic',
            inputModalities: ['TEXT'],
            outputModalities: ['TEXT'],
          },
          {
            modelId: 'amazon.titan-text-express-v1',
            modelName: 'Titan Text Express',
            providerName: 'Amazon',
            inputModalities: ['TEXT'],
            outputModalities: ['TEXT'],
          },
        ],
      });

      const models = await client.listModels();

      expect(models).toHaveLength(2);
      expect(models[0].providerName).toBe('Anthropic');
      expect(models[1].providerName).toBe('Amazon');
    });
  });

  describe('getModelInfo', () => {
    it('returns model info when found', async () => {
      managementMockSend.mockResolvedValueOnce({
        modelSummaries: [
          {
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            modelName: 'Claude 3 Sonnet',
            providerName: 'Anthropic',
            inputModalities: ['TEXT'],
            outputModalities: ['TEXT'],
          },
        ],
      });

      const model = await client.getModelInfo('anthropic.claude-3-sonnet-20240229-v1:0');

      expect(model).not.toBeNull();
      expect(model!.modelName).toBe('Claude 3 Sonnet');
    });

    it('returns null when model not found', async () => {
      managementMockSend.mockResolvedValueOnce({
        modelSummaries: [],
      });

      const model = await client.getModelInfo('nonexistent-model');

      expect(model).toBeNull();
    });
  });
});

describe('MockBedrockClient', () => {
  let client: IBedrockClient;

  beforeEach(() => {
    client = new MockBedrockClient();
  });

  it('invokeModel returns mock response', async () => {
    const response = await client.invokeModel({
      modelId: 'test',
      body: '{"prompt": "test"}',
    });
    expect(response.body).toContain('Mock response');
    expect(response.inputTokenCount).toBeDefined();
  });

  it('listModels returns mock models', async () => {
    const models = await client.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].providerName).toBe('Anthropic');
  });

  it('listModels filters by provider', async () => {
    const models = await client.listModels('Amazon');
    expect(models.every((m) => m.providerName === 'Amazon')).toBe(true);
  });

  it('getModelInfo returns model or null', async () => {
    const model = await client.getModelInfo('anthropic.claude-3-sonnet-20240229-v1:0');
    expect(model).not.toBeNull();
    expect(model!.modelName).toContain('Claude');
  });

  it('invokeModelStream calls onChunk', async () => {
    const chunks: string[] = [];
    await client.invokeModelStream({ modelId: 'test', body: '{}' }, (chunk) =>
      chunks.push(chunk.chunk)
    );
    expect(chunks.length).toBeGreaterThan(0);
  });
});
