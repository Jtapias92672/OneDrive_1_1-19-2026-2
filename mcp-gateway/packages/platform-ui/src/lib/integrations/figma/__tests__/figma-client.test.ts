/**
 * Figma Client Tests
 * Epic 11: External Integrations
 */

import { FigmaClient, MockFigmaClient, IFigmaClient } from '../figma-client';

describe('FigmaClient', () => {
  let client: FigmaClient;

  beforeEach(() => {
    client = new FigmaClient({ accessToken: 'test-token' });
  });

  describe('isConfigured', () => {
    it('returns true when token is set', () => {
      expect(client.isConfigured()).toBe(true);
    });

    it('returns false when token is empty', () => {
      const emptyClient = new FigmaClient({ accessToken: '' });
      expect(emptyClient.isConfigured()).toBe(false);
    });
  });

  describe('API methods throw not implemented', () => {
    it('getFile throws', async () => {
      await expect(client.getFile('file-key')).rejects.toThrow('Not implemented');
    });

    it('getFileNodes throws', async () => {
      await expect(client.getFileNodes('file-key', ['1:2'])).rejects.toThrow(
        'Not implemented'
      );
    });

    it('getImages throws', async () => {
      await expect(client.getImages('file-key', { ids: ['1:2'] })).rejects.toThrow(
        'Not implemented'
      );
    });

    it('getTeamProjects throws', async () => {
      await expect(client.getTeamProjects('team-id')).rejects.toThrow('Not implemented');
    });

    it('getProjectFiles throws', async () => {
      await expect(client.getProjectFiles('project-id')).rejects.toThrow(
        'Not implemented'
      );
    });
  });
});

describe('MockFigmaClient', () => {
  let client: IFigmaClient;

  beforeEach(() => {
    client = new MockFigmaClient();
  });

  it('getFile returns mock data', async () => {
    const file = await client.getFile('file-key');
    expect(file.name).toBe('Mock File');
    expect(file.document.type).toBe('DOCUMENT');
  });

  it('getFileNodes returns mock data', async () => {
    const file = await client.getFileNodes('file-key', ['1:2']);
    expect(file).toBeDefined();
  });

  it('getImages returns empty images', async () => {
    const result = await client.getImages('file-key', { ids: ['1:2'] });
    expect(result.images).toEqual({});
  });

  it('getTeamProjects returns empty array', async () => {
    const result = await client.getTeamProjects('team-id');
    expect(result.projects).toEqual([]);
  });

  it('getProjectFiles returns empty array', async () => {
    const result = await client.getProjectFiles('project-id');
    expect(result.files).toEqual([]);
  });
});
