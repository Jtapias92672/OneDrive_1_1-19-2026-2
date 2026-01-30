/**
 * FORGE Figma Client - Functional Verification Tests
 *
 * @epic 05 - Figma Parser
 * @purpose Verify figma-client.ts behaves correctly for real Figma API scenarios
 * @philosophy Coverage is a guidepost showing WHERE we've verified, not a target
 *
 * Each test documents WHAT it proves about the code's actual behavior.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Import the module to test
import {
  FigmaClient,
  FigmaApiError,
  FigmaAuthError,
  FigmaRateLimitError,
  createFigmaClient,
  getDefaultClient,
  setDefaultClient,
  type FigmaClientConfig,
} from '../../src/figma-parser/client/figma-client.js';

// ============================================
// MOCK SETUP
// ============================================

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Helper to create mock Response
function createMockResponse(body: unknown, options: { status?: number; headers?: Record<string, string> } = {}): Response {
  const { status = 200, headers = {} } = options;
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers(headers),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

// Valid Figma file response
const MOCK_FILE_RESPONSE = {
  name: 'Test Design',
  lastModified: '2026-01-25T10:00:00Z',
  version: '123456',
  role: 'viewer',
  thumbnailUrl: 'https://example.com/thumb.png',
  document: {
    id: '0:0',
    name: 'Document',
    type: 'DOCUMENT',
    children: [],
  },
  components: {
    'comp-1': { key: 'abc', name: 'Button', description: 'A button' },
  },
  componentSets: {},
  styles: {},
  schemaVersion: 0,
};

// ============================================
// 1. ERROR CLASSES - Verify correct error types
// ============================================

describe('Error Classes', () => {
  /**
   * Test verifies: FigmaApiError construction
   * → Error has correct name, message, statusCode, and response
   */
  it('FigmaApiError captures status code and response body', () => {
    const error = new FigmaApiError('Something went wrong', 500, { detail: 'Server error' });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('FigmaApiError');
    expect(error.message).toBe('Something went wrong');
    expect(error.statusCode).toBe(500);
    expect(error.response).toEqual({ detail: 'Server error' });
  });

  /**
   * Test verifies: FigmaAuthError is a specialized FigmaApiError
   * → 401 errors get proper error type for handling
   */
  it('FigmaAuthError indicates invalid token', () => {
    const error = new FigmaAuthError();

    expect(error).toBeInstanceOf(FigmaApiError);
    expect(error.name).toBe('FigmaAuthError');
    expect(error.message).toBe('Invalid Figma access token');
  });

  /**
   * Test verifies: FigmaRateLimitError captures retry-after
   * → 429 errors can tell caller when to retry
   */
  it('FigmaRateLimitError captures retry-after duration', () => {
    const error = new FigmaRateLimitError(30);

    expect(error).toBeInstanceOf(FigmaApiError);
    expect(error.name).toBe('FigmaRateLimitError');
    expect(error.message).toContain('30');
  });

  /**
   * Test verifies: FigmaRateLimitError handles missing retry-after
   * → Graceful handling when Figma doesn't provide duration
   */
  it('FigmaRateLimitError handles missing retry-after', () => {
    const error = new FigmaRateLimitError();

    expect(error.message).toContain('unknown');
  });
});

// ============================================
// 2. RESPONSE CACHE - Verify caching behavior
// ============================================

describe('ResponseCache (via FigmaClient)', () => {
  let client: FigmaClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new FigmaClient({
      accessToken: 'test-token',
      enableCache: true,
      cacheTtl: 5000, // 5 second TTL for testing
    });
  });

  /**
   * Test verifies: Cache returns data on second request
   * → Reduces API calls, improves performance
   */
  it('caches file responses and returns cached data on subsequent calls', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(MOCK_FILE_RESPONSE));

    // First call - hits API
    const result1 = await client.getFile('test-file-key');
    expect(result1.name).toBe('Test Design');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call - should use cache
    const result2 = await client.getFile('test-file-key');
    expect(result2.name).toBe('Test Design');
    expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1, no new request
  });

  /**
   * Test verifies: Different options create different cache keys
   * → Options like version, depth are not incorrectly cached together
   */
  it('uses different cache keys for different request options', async () => {
    mockFetch.mockResolvedValue(createMockResponse(MOCK_FILE_RESPONSE));

    await client.getFile('test-file-key', { version: '1' });
    await client.getFile('test-file-key', { version: '2' });

    expect(mockFetch).toHaveBeenCalledTimes(2); // Different versions = different requests
  });

  /**
   * Test verifies: clearCache removes all cached data
   * → Fresh data can be fetched after cache clear
   */
  it('clearCache forces fresh API call', async () => {
    mockFetch.mockResolvedValue(createMockResponse(MOCK_FILE_RESPONSE));

    await client.getFile('test-file-key');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    client.clearCache();
    expect(client.getCacheSize()).toBe(0);

    await client.getFile('test-file-key');
    expect(mockFetch).toHaveBeenCalledTimes(2); // New request after clear
  });

  /**
   * Test verifies: Cache can be disabled
   * → Every call hits API when caching is off
   */
  it('respects enableCache=false configuration', async () => {
    const noCacheClient = new FigmaClient({
      accessToken: 'test-token',
      enableCache: false,
    });

    mockFetch.mockResolvedValue(createMockResponse(MOCK_FILE_RESPONSE));

    await noCacheClient.getFile('test-file-key');
    await noCacheClient.getFile('test-file-key');

    expect(mockFetch).toHaveBeenCalledTimes(2); // Both calls hit API
  });
});

// ============================================
// 3. API METHODS - Verify correct Figma API calls
// ============================================

describe('FigmaClient API Methods', () => {
  let client: FigmaClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new FigmaClient({
      accessToken: 'test-token',
      enableCache: false, // Disable cache for clearer testing
      maxRetries: 0, // No retries for testing
    });
  });

  describe('getFile', () => {
    /**
     * Test verifies: getFile calls correct endpoint with auth header
     * → Figma API is called correctly with token
     */
    it('calls /v1/files/{fileKey} with authentication', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(MOCK_FILE_RESPONSE));

      await client.getFile('abc123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/files/abc123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Figma-Token': 'test-token',
          }),
        })
      );
    });

    /**
     * Test verifies: getFile constructs query params correctly
     * → Options are properly encoded in URL
     */
    it('passes query parameters for version, ids, depth, geometry', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(MOCK_FILE_RESPONSE));

      await client.getFile('abc123', {
        version: 'v1',
        ids: ['node1', 'node2'],
        depth: 2,
        geometry: 'paths',
      });

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('version=v1');
      expect(calledUrl).toContain('ids=node1%2Cnode2');
      expect(calledUrl).toContain('depth=2');
      expect(calledUrl).toContain('geometry=paths');
    });

    /**
     * Test verifies: getFile returns properly structured FigmaFile
     * → Response is transformed into expected format
     */
    it('returns structured FigmaFile from API response', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(MOCK_FILE_RESPONSE));

      const file = await client.getFile('abc123');

      expect(file.name).toBe('Test Design');
      expect(file.lastModified).toBe('2026-01-25T10:00:00Z');
      expect(file.version).toBe('123456');
      expect(file.document).toBeDefined();
      expect(file.components).toHaveProperty('comp-1');
    });

    /**
     * Test verifies: getFile throws on API error response
     * → Error responses are not silently swallowed
     */
    it('throws FigmaApiError when API returns error', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ err: 'File not found' }));

      await expect(client.getFile('invalid-key')).rejects.toThrow(FigmaApiError);
    });
  });

  describe('getFileNodes', () => {
    const MOCK_NODES_RESPONSE = {
      nodes: {
        'node-1': { document: { id: 'node-1', name: 'Frame', type: 'FRAME' } },
        'node-2': { document: { id: 'node-2', name: 'Text', type: 'TEXT' } },
      },
    };

    /**
     * Test verifies: getFileNodes fetches specific nodes
     * → Can retrieve subset of nodes without full file
     */
    it('fetches specific nodes by ID', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(MOCK_NODES_RESPONSE));

      const nodes = await client.getFileNodes('abc123', ['node-1', 'node-2']);

      expect(nodes.size).toBe(2);
      expect(nodes.get('node-1')?.name).toBe('Frame');
      expect(nodes.get('node-2')?.name).toBe('Text');
    });

    /**
     * Test verifies: getFileNodes handles null nodes gracefully
     * → Partial response doesn't crash
     */
    it('skips nodes with null document', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        nodes: {
          'node-1': { document: { id: 'node-1', name: 'Valid', type: 'FRAME' } },
          'node-2': { document: null },
          'node-3': null,
        },
      }));

      const nodes = await client.getFileNodes('abc123', ['node-1', 'node-2', 'node-3']);

      expect(nodes.size).toBe(1);
      expect(nodes.has('node-1')).toBe(true);
    });
  });

  describe('getImages', () => {
    const MOCK_IMAGES_RESPONSE = {
      images: {
        'node-1': 'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/abc.png',
        'node-2': 'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/def.png',
      },
    };

    /**
     * Test verifies: getImages returns image URLs for nodes
     * → Can export nodes as rendered images
     */
    it('returns image URLs for requested nodes', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(MOCK_IMAGES_RESPONSE));

      const images = await client.getImages('abc123', ['node-1', 'node-2']);

      expect(images.size).toBe(2);
      expect(images.get('node-1')).toContain('s3.us-west-2.amazonaws.com');
    });

    /**
     * Test verifies: getImages passes format options
     * → Can request SVG, PNG, JPG exports
     */
    it('passes format and scale options', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(MOCK_IMAGES_RESPONSE));

      await client.getImages('abc123', ['node-1'], {
        format: 'svg',
        scale: 2,
        svgIncludeId: true,
      });

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('format=svg');
      expect(calledUrl).toContain('scale=2');
      expect(calledUrl).toContain('svg_include_id=true');
    });
  });

  describe('getImageFills', () => {
    /**
     * Test verifies: getImageFills retrieves fill image URLs
     * → Can get URLs for images used as fills in design
     */
    it('returns image fill URLs', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        images: {
          'image-ref-1': 'https://s3.amazonaws.com/fill1.png',
          'image-ref-2': 'https://s3.amazonaws.com/fill2.png',
        },
      }));

      const fills = await client.getImageFills('abc123');

      expect(fills.size).toBe(2);
      expect(fills.get('image-ref-1')).toContain('fill1.png');
    });
  });

  describe('getComponents', () => {
    /**
     * Test verifies: getComponents extracts component metadata
     * → Component library can be enumerated
     */
    it('returns component metadata from file', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(MOCK_FILE_RESPONSE));

      const components = await client.getComponents('abc123');

      expect(components.size).toBe(1);
      expect(components.get('comp-1')?.name).toBe('Button');
    });
  });
});

// ============================================
// 4. HTTP ERROR HANDLING - Verify error scenarios
// ============================================

describe('HTTP Error Handling', () => {
  let client: FigmaClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new FigmaClient({
      accessToken: 'test-token',
      enableCache: false,
      maxRetries: 0, // No retries for cleaner error testing
      timeout: 1000,
    });
  });

  /**
   * Test verifies: 401 response throws FigmaAuthError
   * → Invalid tokens are properly identified
   */
  it('throws FigmaAuthError on 401 response', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({}, { status: 401 }));

    await expect(client.getFile('abc123')).rejects.toThrow(FigmaAuthError);
  });

  /**
   * Test verifies: 429 response creates FigmaRateLimitError with correct details
   * → Rate limits are properly identified with retry-after header
   *
   * Note: Testing the error construction directly since the client retries
   * on 429 responses, which would make end-to-end testing slow.
   */
  it('throws FigmaRateLimitError on 429 response', async () => {
    // Verify FigmaRateLimitError is constructed correctly from 429 response
    // by testing the error class behavior directly (already tested above)
    // and verifying the client recognizes 429 status codes
    mockFetch.mockResolvedValueOnce(createMockResponse({}, {
      status: 429,
      headers: { 'retry-after': '30' },
    }));

    // Use a client with maxRetries=0 and fake the setTimeout
    // to avoid waiting for the actual retry delay
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = ((fn: () => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as unknown as typeof setTimeout;

    const noRetryClient = createFigmaClient({
      accessToken: 'test-token',
      maxRetries: 0,
    });

    try {
      await expect(noRetryClient.getFile('abc123')).rejects.toThrow(FigmaRateLimitError);
    } finally {
      global.setTimeout = originalSetTimeout;
    }
  });

  /**
   * Test verifies: 500 response throws FigmaApiError with details
   * → Server errors include status code and body
   */
  it('throws FigmaApiError on 500 response with details', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(
      { error: 'Internal server error' },
      { status: 500 }
    ));

    expect.assertions(2);
    try {
      await client.getFile('abc123');
    } catch (error) {
      expect(error).toBeInstanceOf(FigmaApiError);
      expect((error as FigmaApiError).statusCode).toBe(500);
    }
  });

  /**
   * Test verifies: 404 response throws FigmaApiError
   * → Missing files are reported as errors
   */
  it('throws FigmaApiError on 404 response', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(
      { status: 404, err: 'Not found' },
      { status: 404 }
    ));

    await expect(client.getFile('nonexistent')).rejects.toThrow(FigmaApiError);
  });
});

// ============================================
// 5. RETRY BEHAVIOR - Verify retry logic
// ============================================

describe('Retry Behavior', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Test verifies: Transient errors trigger retry with backoff
   * → Temporary failures don't immediately fail
   */
  it('retries on transient errors with exponential backoff', async () => {
    const client = new FigmaClient({
      accessToken: 'test-token',
      enableCache: false,
      maxRetries: 2,
    });

    mockFetch
      .mockResolvedValueOnce(createMockResponse({}, { status: 503 }))
      .mockResolvedValueOnce(createMockResponse({}, { status: 503 }))
      .mockResolvedValueOnce(createMockResponse(MOCK_FILE_RESPONSE));

    const promise = client.getFile('abc123');

    // Advance through retries
    await jest.advanceTimersByTimeAsync(1000); // First backoff
    await jest.advanceTimersByTimeAsync(2000); // Second backoff

    const result = await promise;
    expect(result.name).toBe('Test Design');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  /**
   * Test verifies: Auth errors are NOT retried
   * → 401 fails immediately, no wasted retries
   */
  it('does not retry on auth errors', async () => {
    const client = new FigmaClient({
      accessToken: 'bad-token',
      enableCache: false,
      maxRetries: 3,
    });

    mockFetch.mockResolvedValue(createMockResponse({}, { status: 401 }));

    await expect(client.getFile('abc123')).rejects.toThrow(FigmaAuthError);
    expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
  });
});

// ============================================
// 6. FACTORY FUNCTIONS - Verify client creation
// ============================================

describe('Factory Functions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockFetch.mockReset();
    process.env = { ...originalEnv };
    setDefaultClient(null as any); // Reset default client
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /**
   * Test verifies: createFigmaClient creates working client
   * → Factory function produces usable client
   */
  it('createFigmaClient creates configured client', async () => {
    const client = createFigmaClient({
      accessToken: 'my-token',
      baseUrl: 'https://custom.api.com',
    });

    mockFetch.mockResolvedValueOnce(createMockResponse(MOCK_FILE_RESPONSE));

    await client.getFile('test');

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('custom.api.com');
  });

  /**
   * Test verifies: getDefaultClient uses FIGMA_ACCESS_TOKEN env var
   * → Can get client without explicit configuration
   */
  it('getDefaultClient creates client from environment variable', () => {
    process.env['FIGMA_ACCESS_TOKEN'] = 'env-token';

    const client = getDefaultClient();

    expect(client).toBeInstanceOf(FigmaClient);
  });

  /**
   * Test verifies: getDefaultClient throws without env var
   * → Missing configuration is reported, not silently broken
   */
  it('getDefaultClient throws when FIGMA_ACCESS_TOKEN not set', () => {
    delete process.env['FIGMA_ACCESS_TOKEN'];

    expect(() => getDefaultClient()).toThrow('FIGMA_ACCESS_TOKEN');
  });

  /**
   * Test verifies: setDefaultClient allows custom default
   * → Can override default client for testing or custom config
   */
  it('setDefaultClient overrides default client', () => {
    const customClient = createFigmaClient({ accessToken: 'custom' });
    setDefaultClient(customClient);

    process.env['FIGMA_ACCESS_TOKEN'] = 'env-token';
    const retrieved = getDefaultClient();

    expect(retrieved).toBe(customClient);
  });
});

// ============================================
// 7. CONFIGURATION - Verify config handling
// ============================================

describe('Configuration', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  /**
   * Test verifies: Default config values are applied
   * → Client works with minimal config
   */
  it('applies default configuration values', async () => {
    const client = new FigmaClient({ accessToken: 'token' });

    mockFetch.mockResolvedValueOnce(createMockResponse(MOCK_FILE_RESPONSE));
    await client.getFile('test');

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('api.figma.com'); // Default base URL
  });

  /**
   * Test verifies: Custom base URL is used
   * → Can point to mock server or proxy
   */
  it('uses custom baseUrl when configured', async () => {
    const client = new FigmaClient({
      accessToken: 'token',
      baseUrl: 'https://figma-proxy.example.com',
    });

    mockFetch.mockResolvedValueOnce(createMockResponse(MOCK_FILE_RESPONSE));
    await client.getFile('test');

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('figma-proxy.example.com');
  });
});
