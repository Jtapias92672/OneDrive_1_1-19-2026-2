/**
 * Tests for VercelClient
 */

import {
  VercelClient,
  MockVercelClient,
  createVercelClient,
  type CreateDeploymentRequest,
  type VercelDeployment,
} from '../vercel-client';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('VercelClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('creates instance with token', () => {
      const client = new VercelClient({ token: 'test-token' });
      expect(client).toBeInstanceOf(VercelClient);
    });

    it('throws error without token', () => {
      expect(() => new VercelClient({ token: '' })).toThrow('Vercel API token is required');
    });

    it('accepts optional teamId', () => {
      const client = new VercelClient({ token: 'test-token', teamId: 'team_123' });
      expect(client).toBeInstanceOf(VercelClient);
    });

    it('accepts custom baseUrl', () => {
      const client = new VercelClient({
        token: 'test-token',
        baseUrl: 'https://custom-api.vercel.com',
      });
      expect(client).toBeInstanceOf(VercelClient);
    });
  });

  describe('createVercelClient', () => {
    it('creates client via factory', () => {
      const client = createVercelClient({ token: 'test-token' });
      expect(client).toBeInstanceOf(VercelClient);
    });
  });

  describe('createDeployment', () => {
    it('sends POST request to Vercel API', async () => {
      const mockResponse: VercelDeployment = {
        id: 'dpl_123',
        url: 'test-app.vercel.app',
        state: 'QUEUED',
        createdAt: Date.now(),
        name: 'test-app',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new VercelClient({ token: 'test-token' });
      const request: CreateDeploymentRequest = {
        name: 'test-app',
        files: [{ file: 'index.html', data: '<html></html>' }],
      };

      const result = await client.createDeployment(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vercel.com/v13/deployments',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result.id).toBe('dpl_123');
      expect(result.url).toBe('test-app.vercel.app');
    });

    it('includes teamId in query params when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'dpl_123',
          url: 'test-app.vercel.app',
          state: 'QUEUED',
          createdAt: Date.now(),
          name: 'test-app',
        }),
      });

      const client = new VercelClient({ token: 'test-token', teamId: 'team_abc' });
      await client.createDeployment({
        name: 'test-app',
        files: [],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vercel.com/v13/deployments?teamId=team_abc',
        expect.any(Object)
      );
    });

    it('encodes file content as base64', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'dpl_123',
          url: 'test-app.vercel.app',
          state: 'QUEUED',
          createdAt: Date.now(),
          name: 'test-app',
        }),
      });

      const client = new VercelClient({ token: 'test-token' });
      await client.createDeployment({
        name: 'test-app',
        files: [{ file: 'test.txt', data: 'Hello World' }],
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.files[0].encoding).toBe('base64');
      expect(callBody.files[0].data).toBe(Buffer.from('Hello World').toString('base64'));
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: { code: 'bad_request', message: 'Invalid input' } }),
      });

      const client = new VercelClient({ token: 'test-token' });

      await expect(
        client.createDeployment({ name: 'test', files: [] })
      ).rejects.toThrow('Vercel API error: 400 - Invalid input');
    });
  });

  describe('getDeployment', () => {
    it('fetches deployment by ID', async () => {
      const mockResponse: VercelDeployment = {
        id: 'dpl_456',
        url: 'my-app.vercel.app',
        state: 'READY',
        createdAt: Date.now(),
        name: 'my-app',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new VercelClient({ token: 'test-token' });
      const result = await client.getDeployment('dpl_456');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vercel.com/v13/deployments/dpl_456',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(result.id).toBe('dpl_456');
      expect(result.state).toBe('READY');
    });

    it('maps readyState to state field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'dpl_789',
          url: 'app.vercel.app',
          readyState: 'READY',
          createdAt: Date.now(),
          name: 'app',
        }),
      });

      const client = new VercelClient({ token: 'test-token' });
      const result = await client.getDeployment('dpl_789');

      expect(result.state).toBe('READY');
    });

    it('throws error when deployment not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: { message: 'Deployment not found' } }),
      });

      const client = new VercelClient({ token: 'test-token' });

      await expect(client.getDeployment('dpl_invalid')).rejects.toThrow(
        'Vercel API error: 404 - Deployment not found'
      );
    });
  });

  describe('waitForReady', () => {
    it('returns immediately when deployment is ready', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'dpl_ready',
          url: 'ready-app.vercel.app',
          state: 'READY',
          createdAt: Date.now(),
          name: 'ready-app',
        }),
      });

      const client = new VercelClient({ token: 'test-token' });
      const result = await client.waitForReady('dpl_ready');

      expect(result.state).toBe('READY');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('polls until deployment is ready', async () => {
      // First call: BUILDING
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'dpl_building',
          url: 'app.vercel.app',
          state: 'BUILDING',
          createdAt: Date.now(),
          name: 'app',
        }),
      });

      // Second call: READY
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'dpl_building',
          url: 'app.vercel.app',
          state: 'READY',
          createdAt: Date.now(),
          name: 'app',
        }),
      });

      const client = new VercelClient({ token: 'test-token' });
      const result = await client.waitForReady('dpl_building', { pollIntervalMs: 10 });

      expect(result.state).toBe('READY');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws error when deployment fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'dpl_error',
          url: 'error-app.vercel.app',
          state: 'ERROR',
          createdAt: Date.now(),
          name: 'error-app',
        }),
      });

      const client = new VercelClient({ token: 'test-token' });

      await expect(client.waitForReady('dpl_error')).rejects.toThrow(
        'Deployment failed: dpl_error'
      );
    });

    it('throws error when deployment is canceled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'dpl_canceled',
          url: 'canceled-app.vercel.app',
          state: 'CANCELED',
          createdAt: Date.now(),
          name: 'canceled-app',
        }),
      });

      const client = new VercelClient({ token: 'test-token' });

      await expect(client.waitForReady('dpl_canceled')).rejects.toThrow(
        'Deployment was canceled: dpl_canceled'
      );
    });

    it('throws timeout error when deployment takes too long', async () => {
      // Always return BUILDING
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'dpl_slow',
          url: 'slow-app.vercel.app',
          state: 'BUILDING',
          createdAt: Date.now(),
          name: 'slow-app',
        }),
      });

      const client = new VercelClient({ token: 'test-token' });

      await expect(
        client.waitForReady('dpl_slow', { timeoutMs: 50, pollIntervalMs: 10 })
      ).rejects.toThrow('Deployment timed out after 50ms: dpl_slow');
    });
  });

  describe('deleteDeployment', () => {
    it('sends DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const client = new VercelClient({ token: 'test-token' });
      await client.deleteDeployment('dpl_delete');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vercel.com/v13/deployments/dpl_delete',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: { message: 'Not authorized' } }),
      });

      const client = new VercelClient({ token: 'test-token' });

      await expect(client.deleteDeployment('dpl_protected')).rejects.toThrow(
        'Vercel API error: 403 - Not authorized'
      );
    });
  });

  describe('listDeployments', () => {
    it('fetches list of deployments', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deployments: [
            { id: 'dpl_1', url: 'app1.vercel.app', state: 'READY', createdAt: 1, name: 'app1' },
            { id: 'dpl_2', url: 'app2.vercel.app', state: 'BUILDING', createdAt: 2, name: 'app2' },
          ],
        }),
      });

      const client = new VercelClient({ token: 'test-token' });
      const result = await client.listDeployments();

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('dpl_1');
      expect(result[1].id).toBe('dpl_2');
    });

    it('accepts limit option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deployments: [] }),
      });

      const client = new VercelClient({ token: 'test-token' });
      await client.listDeployments({ limit: 5 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=5'),
        expect.any(Object)
      );
    });
  });
});

describe('MockVercelClient', () => {
  it('creates mock deployments', async () => {
    const client = new MockVercelClient();
    const deployment = await client.createDeployment({
      name: 'mock-app',
      files: [],
    });

    expect(deployment.id).toMatch(/^dpl_mock_/);
    expect(deployment.url).toContain('mock-app');
    expect(deployment.state).toBe('BUILDING');
  });

  it('simulates deployment completion on getDeployment', async () => {
    const client = new MockVercelClient();
    const deployment = await client.createDeployment({
      name: 'mock-app',
      files: [],
    });

    expect(deployment.state).toBe('BUILDING');

    const updated = await client.getDeployment(deployment.id);
    expect(updated.state).toBe('READY');
  });

  it('allows setting deployment state for testing', async () => {
    const client = new MockVercelClient();
    const deployment = await client.createDeployment({
      name: 'test-app',
      files: [],
    });

    client.setDeploymentState(deployment.id, 'ERROR');
    const updated = await client.getDeployment(deployment.id);
    expect(updated.state).toBe('ERROR');
  });

  it('can be reset for fresh tests', async () => {
    const client = new MockVercelClient();
    await client.createDeployment({ name: 'app1', files: [] });
    await client.createDeployment({ name: 'app2', files: [] });

    let deployments = await client.listDeployments();
    expect(deployments.length).toBe(2);

    client.reset();

    deployments = await client.listDeployments();
    expect(deployments.length).toBe(0);
  });

  it('throws error for non-existent deployment', async () => {
    const client = new MockVercelClient();

    await expect(client.getDeployment('dpl_nonexistent')).rejects.toThrow(
      'Deployment not found: dpl_nonexistent'
    );
  });
});
