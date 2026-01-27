/**
 * AWS S3 Client
 * Epic 11: External Integrations
 *
 * Interface for Amazon S3. Real implementation pending.
 */

export interface S3Config {
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
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
  putObject(request: PutObjectRequest): Promise<{ etag: string }>;
  getObject(key: string): Promise<GetObjectResponse>;
  deleteObject(key: string): Promise<void>;
  listObjects(request?: ListObjectsRequest): Promise<ListObjectsResponse>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

export class S3Client implements IS3Client {
  private config: S3Config;

  constructor(config: S3Config) {
    this.config = config;
  }

  async putObject(request: PutObjectRequest): Promise<{ etag: string }> {
    // TODO: Implement real AWS SDK call
    // Requires @aws-sdk/client-s3
    throw new Error('Not implemented: Real AWS S3 integration pending');
  }

  async getObject(key: string): Promise<GetObjectResponse> {
    // TODO: Implement real AWS SDK call
    throw new Error('Not implemented: Real AWS S3 integration pending');
  }

  async deleteObject(key: string): Promise<void> {
    // TODO: Implement real AWS SDK call
    throw new Error('Not implemented: Real AWS S3 integration pending');
  }

  async listObjects(request?: ListObjectsRequest): Promise<ListObjectsResponse> {
    // TODO: Implement real AWS SDK call
    throw new Error('Not implemented: Real AWS S3 integration pending');
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    // TODO: Implement real AWS SDK call
    // Requires @aws-sdk/s3-request-presigner
    throw new Error('Not implemented: Real AWS S3 integration pending');
  }

  /**
   * Check if client is configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.region && this.config.bucket);
  }
}

/**
 * Mock client for testing
 */
export class MockS3Client implements IS3Client {
  private storage: Map<string, { body: Buffer; contentType: string }> = new Map();

  async putObject(request: PutObjectRequest): Promise<{ etag: string }> {
    const body = typeof request.body === 'string' ? Buffer.from(request.body) : request.body;
    this.storage.set(request.key, {
      body,
      contentType: request.contentType || 'application/octet-stream',
    });
    return { etag: `"mock-etag-${Date.now()}"` };
  }

  async getObject(key: string): Promise<GetObjectResponse> {
    const obj = this.storage.get(key);
    if (!obj) {
      throw new Error(`Object not found: ${key}`);
    }
    return {
      body: obj.body,
      contentType: obj.contentType,
      contentLength: obj.body.length,
      metadata: {},
    };
  }

  async deleteObject(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async listObjects(request?: ListObjectsRequest): Promise<ListObjectsResponse> {
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

  async getSignedUrl(key: string): Promise<string> {
    return `https://mock-bucket.s3.amazonaws.com/${key}?signature=mock`;
  }
}
