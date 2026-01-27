/**
 * Mendix Client Tests
 * Epic 11: External Integrations
 */

import { MendixClient, MockMendixClient, IMendixClient } from '../mendix-client';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('MendixClient', () => {
  let client: MendixClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new MendixClient({
      username: 'test-user',
      apiKey: 'test-api-key',
    });
  });

  describe('isConfigured', () => {
    it('returns true when username and apiKey are set', () => {
      expect(client.isConfigured()).toBe(true);
    });

    it('returns false when username is empty', () => {
      const emptyClient = new MendixClient({ username: '', apiKey: 'key' });
      expect(emptyClient.isConfigured()).toBe(false);
    });

    it('returns false when apiKey is empty', () => {
      const emptyClient = new MendixClient({ username: 'user', apiKey: '' });
      expect(emptyClient.isConfigured()).toBe(false);
    });
  });

  describe('getApp', () => {
    it('returns app details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          AppId: 'app-123',
          Name: 'Test App',
          Description: 'Test description',
          TeamServerId: 'server-1',
        }),
      });

      const app = await client.getApp('app-123');

      expect(app.id).toBe('app-123');
      expect(app.name).toBe('Test App');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/apps/app-123'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Mendix-Username': 'test-user',
            'Mendix-ApiKey': 'test-api-key',
          }),
        })
      );
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'App not found',
      });

      await expect(client.getApp('nonexistent')).rejects.toThrow('Mendix API 404');
    });
  });

  describe('listBranches', () => {
    it('returns branches for an app', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [
          {
            Name: 'main',
            DisplayName: 'Main line',
            LatestRevisionNumber: 10,
            IsMainLine: true,
            CreatedDate: '2024-01-01T00:00:00Z',
          },
          {
            Name: 'feature/test',
            DisplayName: 'Feature Test',
            LatestRevisionNumber: 5,
            IsMainLine: false,
            CreatedDate: '2024-01-15T00:00:00Z',
          },
        ],
      });

      const branches = await client.listBranches('app-123');

      expect(branches).toHaveLength(2);
      expect(branches[0].name).toBe('main');
      expect(branches[0].isMainLine).toBe(true);
      expect(branches[1].name).toBe('feature/test');
    });
  });

  describe('createBranch', () => {
    it('creates a new branch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          Name: 'feature/new',
          DisplayName: 'Feature New',
          LatestRevisionNumber: 10,
          IsMainLine: false,
          CreatedDate: '2024-01-20T00:00:00Z',
        }),
      });

      const branch = await client.createBranch('app-123', 'feature/new');

      expect(branch.name).toBe('feature/new');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/branches'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ Name: 'feature/new' }),
        })
      );
    });

    it('creates branch from specific revision', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          Name: 'hotfix/v1',
          DisplayName: 'Hotfix V1',
          LatestRevisionNumber: 5,
          IsMainLine: false,
          CreatedDate: '2024-01-20T00:00:00Z',
        }),
      });

      await client.createBranch('app-123', 'hotfix/v1', 5);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ Name: 'hotfix/v1', FromRevision: 5 }),
        })
      );
    });
  });

  describe('commitChanges', () => {
    it('commits changes and returns new revision', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ Revision: 11 }),
      });

      const result = await client.commitChanges('app-123', 'Add new page');

      expect(result.revision).toBe(11);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/commit'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ Message: 'Add new page' }),
        })
      );
    });
  });

  describe('createMPK', () => {
    it('creates MPK package', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          PackageId: 'pkg-123',
          FilePath: '/packages/app.mpk',
          FileSize: 1024000,
          Revision: 10,
        }),
      });

      const result = await client.createMPK('app-123', {
        outputPath: '/output/app.mpk',
        includeDeploymentPackage: true,
      });

      expect(result.success).toBe(true);
      expect(result.fileSize).toBe(1024000);
      expect(result.revision).toBe(10);
    });
  });

  describe('deployApp', () => {
    it('deploys app to environment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          JobId: 'deploy-123',
          Status: 'queued',
          Environment: 'acceptance',
        }),
      });

      const deployment = await client.deployApp('app-123', 'acceptance');

      expect(deployment.id).toBe('deploy-123');
      expect(deployment.status).toBe('queued');
      expect(deployment.environment).toBe('acceptance');
    });
  });

  describe('getDeploymentStatus', () => {
    it('returns deployment status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          JobId: 'deploy-123',
          Status: 'running',
          Environment: 'acceptance',
          Url: 'https://app.mendixcloud.com',
          StartedAt: '2024-01-20T10:00:00Z',
        }),
      });

      const status = await client.getDeploymentStatus('app-123', 'deploy-123');

      expect(status.status).toBe('running');
      expect(status.url).toBe('https://app.mendixcloud.com');
    });
  });
});

describe('MockMendixClient', () => {
  let client: IMendixClient;

  beforeEach(() => {
    client = new MockMendixClient();
  });

  describe('getApp', () => {
    it('returns mock app', async () => {
      const app = await client.getApp('mock-app-1');
      expect(app.name).toBe('Mock Project');
    });

    it('throws for unknown app', async () => {
      await expect(client.getApp('nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('getAppByName', () => {
    it('finds app by name', async () => {
      const app = await client.getAppByName('Mock Project');
      expect(app).not.toBeNull();
      expect(app!.id).toBe('mock-app-1');
    });

    it('returns null for unknown name', async () => {
      const app = await client.getAppByName('Unknown');
      expect(app).toBeNull();
    });
  });

  describe('listBranches', () => {
    it('returns mock branches', async () => {
      const branches = await client.listBranches('mock-app-1');
      expect(branches.length).toBeGreaterThan(0);
      expect(branches[0].isMainLine).toBe(true);
    });
  });

  describe('createBranch', () => {
    it('creates new branch', async () => {
      const branch = await client.createBranch('mock-app-1', 'feature/test');
      expect(branch.name).toBe('feature/test');
      expect(branch.isMainLine).toBe(false);
    });
  });

  describe('deleteBranch', () => {
    it('removes branch', async () => {
      await client.createBranch('mock-app-1', 'temp-branch');
      await client.deleteBranch('mock-app-1', 'temp-branch');
      const branches = await client.listBranches('mock-app-1');
      expect(branches.find((b) => b.name === 'temp-branch')).toBeUndefined();
    });
  });

  describe('getModules', () => {
    it('returns mock modules', async () => {
      const modules = await client.getModules('mock-app-1');
      expect(modules.length).toBeGreaterThan(0);
      expect(modules[0].name).toBe('MockModule');
    });
  });

  describe('createPage', () => {
    it('creates new page', async () => {
      const page = await client.createPage('mock-app-1', 'module-1', 'NewPage');
      expect(page.name).toBe('NewPage');
      expect(page.id).toBeDefined();
    });
  });

  describe('commitChanges', () => {
    it('increments revision', async () => {
      const result1 = await client.commitChanges('mock-app-1', 'First commit');
      const result2 = await client.commitChanges('mock-app-1', 'Second commit');
      expect(result2.revision).toBe(result1.revision + 1);
    });
  });

  describe('createMPK', () => {
    it('returns successful result', async () => {
      const result = await client.createMPK('mock-app-1', { outputPath: '/out.mpk' });
      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/out.mpk');
    });
  });

  describe('deployApp', () => {
    it('returns deployment info', async () => {
      const deployment = await client.deployApp('mock-app-1', 'acceptance');
      expect(deployment.status).toBe('queued');
      expect(deployment.environment).toBe('acceptance');
    });
  });

  describe('getDeploymentStatus', () => {
    it('returns running status', async () => {
      const status = await client.getDeploymentStatus('mock-app-1', 'deploy-123');
      expect(status.status).toBe('running');
      expect(status.url).toBeDefined();
    });
  });
});
