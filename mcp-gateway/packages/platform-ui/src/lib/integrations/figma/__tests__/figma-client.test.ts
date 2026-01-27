/**
 * Figma Client Tests
 * Epic 11: External Integrations
 */

import { FigmaClient, MockFigmaClient, IFigmaClient } from '../figma-client';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('FigmaClient', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('constructor', () => {
    it('throws when no token provided', () => {
      expect(() => new FigmaClient({ accessToken: '' })).toThrow(
        'Figma access token required'
      );
    });

    it('accepts valid token', () => {
      const client = new FigmaClient({ accessToken: 'test-token' });
      expect(client.isConfigured()).toBe(true);
    });
  });

  describe('isConfigured', () => {
    it('returns true when token is set', () => {
      const client = new FigmaClient({ accessToken: 'test-token' });
      expect(client.isConfigured()).toBe(true);
    });
  });

  describe('API methods', () => {
    let client: FigmaClient;

    beforeEach(() => {
      client = new FigmaClient({ accessToken: 'test-token' });
    });

    it('getFile calls API with correct URL and headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: 'Test File', document: {} }),
      });

      await client.getFile('file-key');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/files/file-key',
        expect.objectContaining({
          headers: { 'X-Figma-Token': 'test-token' },
        })
      );
    });

    it('getFile throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      });

      await expect(client.getFile('invalid-key')).rejects.toThrow('Figma API 404');
    });

    it('getFileNodes calls API with node IDs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ nodes: {} }),
      });

      await client.getFileNodes('file-key', ['1:2', '3:4']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('nodes?ids=1%3A2%2C3%3A4'),
        expect.any(Object)
      );
    });

    it('getImages calls API with correct params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ images: {} }),
      });

      await client.getImages('file-key', { ids: ['1:2'], format: 'png', scale: 2 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('images/file-key'),
        expect.any(Object)
      );
    });

    it('getTeamProjects calls API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ projects: [] }),
      });

      await client.getTeamProjects('team-id');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/teams/team-id/projects',
        expect.any(Object)
      );
    });

    it('getProjectFiles calls API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });

      await client.getProjectFiles('project-id');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/projects/project-id/files',
        expect.any(Object)
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
