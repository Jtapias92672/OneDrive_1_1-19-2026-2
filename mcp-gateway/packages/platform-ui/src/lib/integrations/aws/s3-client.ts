/**
 * AWS S3 Client
 * Epic 11: External Integrations
 *
 * Real implementation using @aws-sdk/client-s3
 */

import {
  S3Client as AWSS3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3Config {
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
}

export interface S3ObjectMetadata {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType: string;
  metadata: Record<string, string>;
}

export interface PutObjectRequest {
  key: string;
  body: Buffer | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface GetObjectResponse {
  body: Buffer;
  contentType: string;
  contentLength: number;
  metadata: Record<string, string>;
}

export interface ListObjectsRequest {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface ListObjectsResponse {
  objects: S3Object[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

export interface IS3Client {
  uploadFile(request: PutObjectRequest): Promise<{ etag: string }>;
  downloadFile(key: string): Promise<GetObjectResponse>;
  deleteFile(key: string): Promise<void>;
  listFiles(request?: ListObjectsRequest): Promise<ListObjectsResponse>;
  getFileMetadata(key: string): Promise<S3ObjectMetadata>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

export class S3Client implements IS3Client {
  private config: S3Config;
  private client: AWSS3Client;

  constructor(config: S3Config) {
    this.config = config;
    this.client = new AWSS3Client({
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
    });
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(request: PutObjectRequest): Promise<{ etag: string }> {
    const body = typeof request.body === 'string' ? Buffer.from(request.body) : request.body;

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: request.key,
      Body: body,
      ContentType: request.contentType || 'application/octet-stream',
      Metadata: request.metadata,
    });

    const response = await this.client.send(command);
    return { etag: response.ETag || '' };
  }

  /**
   * Download a file from S3
   */
  async downloadFile(key: string): Promise<GetObjectResponse> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    return {
      body,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || body.length,
      metadata: response.Metadata || {},
    };
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * List files in S3 with optional prefix
   */
  async listFiles(request?: ListObjectsRequest): Promise<ListObjectsResponse> {
    const command = new ListObjectsV2Command({
      Bucket: this.config.bucket,
      Prefix: request?.prefix,
      MaxKeys: request?.maxKeys,
      ContinuationToken: request?.continuationToken,
    });

    const response = await this.client.send(command);

    const objects: S3Object[] = (response.Contents || []).map((item) => ({
      key: item.Key || '',
      size: item.Size || 0,
      lastModified: item.LastModified || new Date(),
      etag: item.ETag || '',
    }));

    return {
      objects,
      isTruncated: response.IsTruncated || false,
      nextContinuationToken: response.NextContinuationToken,
    };
  }

  /**
   * Get file metadata without downloading the content
   */
  async getFileMetadata(key: string): Promise<S3ObjectMetadata> {
    const command = new HeadObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    return {
      key,
      size: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      etag: response.ETag || '',
      contentType: response.ContentType || 'application/octet-stream',
      metadata: response.Metadata || {},
    };
  }

  /**
   * Generate a pre-signed URL for temporary access
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    return awsGetSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Check if client is configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.region && this.config.bucket);
  }

  /**
   * Get the underlying AWS SDK client for advanced operations
   */
  getAwsClient(): AWSS3Client {
    return this.client;
  }
}

/**
 * Mock client for testing (in-memory implementation)
 */
export class MockS3Client implements IS3Client {
  private storage: Map<string, { body: Buffer; contentType: string; metadata: Record<string, string> }> =
    new Map();

  async uploadFile(request: PutObjectRequest): Promise<{ etag: string }> {
    const body = typeof request.body === 'string' ? Buffer.from(request.body) : request.body;
    this.storage.set(request.key, {
      body,
      contentType: request.contentType || 'application/octet-stream',
      metadata: request.metadata || {},
    });
    return { etag: `"mock-etag-${Date.now()}"` };
  }

  async downloadFile(key: string): Promise<GetObjectResponse> {
    const obj = this.storage.get(key);
    if (!obj) {
      throw new Error(`Object not found: ${key}`);
    }
    return {
      body: obj.body,
      contentType: obj.contentType,
      contentLength: obj.body.length,
      metadata: obj.metadata,
    };
  }

  async deleteFile(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async listFiles(request?: ListObjectsRequest): Promise<ListObjectsResponse> {
    const prefix = request?.prefix || '';
    const objects: S3Object[] = [];

    for (const [key, value] of Array.from(this.storage.entries())) {
      if (key.startsWith(prefix)) {
        objects.push({
          key,
          size: value.body.length,
          lastModified: new Date(),
          etag: '"mock-etag"',
        });
      }
    }

    return {
      objects,
      isTruncated: false,
    };
  }

  async getFileMetadata(key: string): Promise<S3ObjectMetadata> {
    const obj = this.storage.get(key);
    if (!obj) {
      throw new Error(`Object not found: ${key}`);
    }
    return {
      key,
      size: obj.body.length,
      lastModified: new Date(),
      etag: '"mock-etag"',
      contentType: obj.contentType,
      metadata: obj.metadata,
    };
  }

  async getSignedUrl(key: string): Promise<string> {
    return `https://mock-bucket.s3.amazonaws.com/${key}?signature=mock`;
  }
}
