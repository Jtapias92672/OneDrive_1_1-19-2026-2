/**
 * Mendix Client Tests
 * Epic 11: External Integrations
 */

import { MendixClient, MockMendixClient, IMendixClient } from '../mendix-client';

describe('MendixClient', () => {
  let client: MendixClient;

  beforeEach(() => {
    client = new MendixClient({ username: 'test', apiKey: 'test-key' });
  });

  describe('isConfigured', () => {
    it('returns true when credentials are set', () => {
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

  describe('API methods throw not implemented', () => {
    it('openProject throws', async () => {
      await expect(client.openProject('project-id')).rejects.toThrow('Not implemented');
    });

    it('getModules throws', async () => {
      await expect(client.getModules('project-id')).rejects.toThrow('Not implemented');
    });

    it('getPage throws', async () => {
      await expect(client.getPage('project-id', 'page-id')).rejects.toThrow(
        'Not implemented'
      );
    });

    it('exportMPK throws', async () => {
      await expect(
        client.exportMPK('project-id', { outputPath: '/tmp' })
      ).rejects.toThrow('Not implemented');
    });

    it('createPage throws', async () => {
      await expect(client.createPage('project-id', 'module-id', 'PageName')).rejects.toThrow(
        'Not implemented'
      );
    });

    it('commitChanges throws', async () => {
      await expect(client.commitChanges('project-id', 'message')).rejects.toThrow(
        'Not implemented'
      );
    });
  });
});

describe('MockMendixClient', () => {
  let client: IMendixClient;

  beforeEach(() => {
    client = new MockMendixClient();
  });

  it('openProject returns mock project', async () => {
    const project = await client.openProject('project-1');
    expect(project.id).toBe('project-1');
    expect(project.name).toBe('Mock Project');
  });

  it('getModules returns mock modules', async () => {
    const modules = await client.getModules('project-1');
    expect(modules.length).toBe(1);
    expect(modules[0].name).toBe('MockModule');
  });

  it('getPage returns mock page', async () => {
    const page = await client.getPage('project-1', 'page-1');
    expect(page.name).toBe('MockPage');
  });

  it('exportMPK returns success', async () => {
    const result = await client.exportMPK('project-1', { outputPath: '/tmp' });
    expect(result.success).toBe(true);
    expect(result.filePath).toContain('.mpk');
  });

  it('createPage returns new page', async () => {
    const page = await client.createPage('project-1', 'module-1', 'NewPage');
    expect(page.name).toBe('NewPage');
  });

  it('commitChanges returns incremented revision', async () => {
    const result = await client.commitChanges('project-1', 'test commit');
    expect(result.revision).toBe(2);
  });
});
