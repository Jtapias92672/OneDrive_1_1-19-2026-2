/**
 * AWS Clients Tests
 * Epic 11: External Integrations
 */

import { BedrockClient, MockBedrockClient, IBedrockClient } from '../bedrock-client';
import { S3Client, MockS3Client, IS3Client } from '../s3-client';

describe('BedrockClient', () => {
  let client: BedrockClient;

  beforeEach(() => {
    client = new BedrockClient({ region: 'us-east-1' });
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

  describe('API methods throw not implemented', () => {
    it('invokeModel throws', async () => {
      await expect(
        client.invokeModel({ modelId: 'test', body: '{}' })
      ).rejects.toThrow('Not implemented');
    });

    it('listFoundationModels throws', async () => {
      await expect(client.listFoundationModels()).rejects.toThrow('Not implemented');
    });

    it('getModelInfo throws', async () => {
      await expect(client.getModelInfo('model-id')).rejects.toThrow('Not implemented');
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

  it('listFoundationModels returns mock models', async () => {
    const models = await client.listFoundationModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].providerName).toBe('Anthropic');
  });

  it('getModelInfo returns model or null', async () => {
    const model = await client.getModelInfo('anthropic.claude-3-sonnet-20240229-v1:0');
    expect(model).not.toBeNull();
    expect(model!.modelName).toContain('Claude');
  });
});

describe('S3Client', () => {
  let client: S3Client;

  beforeEach(() => {
    client = new S3Client({ region: 'us-east-1', bucket: 'test-bucket' });
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

  describe('API methods throw not implemented', () => {
    it('putObject throws', async () => {
      await expect(
        client.putObject({ key: 'test', body: 'content' })
      ).rejects.toThrow('Not implemented');
    });

    it('getObject throws', async () => {
      await expect(client.getObject('test')).rejects.toThrow('Not implemented');
    });

    it('deleteObject throws', async () => {
      await expect(client.deleteObject('test')).rejects.toThrow('Not implemented');
    });

    it('listObjects throws', async () => {
      await expect(client.listObjects()).rejects.toThrow('Not implemented');
    });

    it('getSignedUrl throws', async () => {
      await expect(client.getSignedUrl('test')).rejects.toThrow('Not implemented');
    });
  });
});

describe('MockS3Client', () => {
  let client: IS3Client;

  beforeEach(() => {
    client = new MockS3Client();
  });

  it('putObject stores object and returns etag', async () => {
    const result = await client.putObject({
      key: 'test/file.txt',
      body: 'Hello, world!',
    });
    expect(result.etag).toBeDefined();
  });

  it('getObject retrieves stored object', async () => {
    await client.putObject({
      key: 'test/file.txt',
      body: 'Hello, world!',
      contentType: 'text/plain',
    });

    const result = await client.getObject('test/file.txt');
    expect(result.body.toString()).toBe('Hello, world!');
    expect(result.contentType).toBe('text/plain');
  });

  it('getObject throws for missing object', async () => {
    await expect(client.getObject('nonexistent')).rejects.toThrow('not found');
  });

  it('deleteObject removes object', async () => {
    await client.putObject({ key: 'test/file.txt', body: 'content' });
    await client.deleteObject('test/file.txt');
    await expect(client.getObject('test/file.txt')).rejects.toThrow('not found');
  });

  it('listObjects returns matching objects', async () => {
    await client.putObject({ key: 'a/file1.txt', body: '1' });
    await client.putObject({ key: 'a/file2.txt', body: '2' });
    await client.putObject({ key: 'b/file3.txt', body: '3' });

    const result = await client.listObjects({ prefix: 'a/' });
    expect(result.objects.length).toBe(2);
  });

  it('getSignedUrl returns mock URL', async () => {
    const url = await client.getSignedUrl('test/file.txt');
    expect(url).toContain('test/file.txt');
    expect(url).toContain('signature');
  });
});
