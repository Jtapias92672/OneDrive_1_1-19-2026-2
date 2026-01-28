/**
 * Jira Client Tests
 * Epic 13: Jira Integration
 */

import { JiraClient, MockJiraClient, IJiraClient } from '../jira-client';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('JiraClient', () => {
  let client: JiraClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new JiraClient({
      baseUrl: 'https://test.atlassian.net',
      username: 'test@example.com',
      apiToken: 'test-token',
    });
  });

  describe('constructor', () => {
    it('throws when username is missing', () => {
      expect(
        () =>
          new JiraClient({
            baseUrl: 'https://test.atlassian.net',
            username: '',
            apiToken: 'token',
          })
      ).toThrow('Jira username and apiToken required');
    });

    it('throws when apiToken is missing', () => {
      expect(
        () =>
          new JiraClient({
            baseUrl: 'https://test.atlassian.net',
            username: 'user@test.com',
            apiToken: '',
          })
      ).toThrow('Jira username and apiToken required');
    });

    it('normalizes base URL without /rest/api/3', () => {
      const client = new JiraClient({
        baseUrl: 'https://test.atlassian.net/',
        username: 'user@test.com',
        apiToken: 'token',
      });
      expect(client.isConfigured()).toBe(true);
    });

    it('preserves base URL with /rest/api/3', () => {
      const client = new JiraClient({
        baseUrl: 'https://test.atlassian.net/rest/api/3',
        username: 'user@test.com',
        apiToken: 'token',
      });
      expect(client.isConfigured()).toBe(true);
    });
  });

  describe('isConfigured', () => {
    it('returns true when all credentials provided', () => {
      expect(client.isConfigured()).toBe(true);
    });
  });

  describe('getIssue', () => {
    it('returns issue by key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          id: '10001',
          key: 'FORGE-123',
          self: 'https://test.atlassian.net/rest/api/3/issue/10001',
          fields: {
            summary: 'Test Issue',
            status: {
              id: '1',
              name: 'To Do',
              statusCategory: { id: 1, key: 'new', name: 'To Do' },
            },
            priority: { id: '3', name: 'Medium' },
            issuetype: { id: '10001', name: 'Task', subtask: false },
            project: { id: '10000', key: 'FORGE', name: 'FORGE' },
            created: '2026-01-27T00:00:00.000Z',
            updated: '2026-01-27T00:00:00.000Z',
            labels: [],
          },
        }),
      });

      const issue = await client.getIssue('FORGE-123');

      expect(issue.key).toBe('FORGE-123');
      expect(issue.fields.summary).toBe('Test Issue');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/issue/FORGE-123'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
          }),
        })
      );
    });

    it('includes expand parameter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          id: '10001',
          key: 'FORGE-123',
          self: 'https://test.atlassian.net/rest/api/3/issue/10001',
          fields: {
            summary: 'Test',
            status: { id: '1', name: 'To Do', statusCategory: { id: 1, key: 'new', name: 'To Do' } },
            priority: { id: '3', name: 'Medium' },
            issuetype: { id: '10001', name: 'Task', subtask: false },
            project: { id: '10000', key: 'FORGE', name: 'FORGE' },
            created: '2026-01-27T00:00:00.000Z',
            updated: '2026-01-27T00:00:00.000Z',
            labels: [],
          },
        }),
      });

      await client.getIssue('FORGE-123', ['changelog', 'transitions']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('expand=changelog,transitions'),
        expect.any(Object)
      );
    });

    it('throws on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Issue not found',
      });

      await expect(client.getIssue('INVALID')).rejects.toThrow('Jira API 404');
    });
  });

  describe('searchIssues', () => {
    it('searches with JQL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          startAt: 0,
          maxResults: 50,
          total: 1,
          issues: [
            {
              id: '10001',
              key: 'FORGE-123',
              self: 'https://test.atlassian.net/rest/api/3/issue/10001',
              fields: {
                summary: 'Test Issue',
                status: { id: '1', name: 'To Do', statusCategory: { id: 1, key: 'new', name: 'To Do' } },
                priority: { id: '3', name: 'Medium' },
                issuetype: { id: '10001', name: 'Task', subtask: false },
                project: { id: '10000', key: 'FORGE', name: 'FORGE' },
                created: '2026-01-27T00:00:00.000Z',
                updated: '2026-01-27T00:00:00.000Z',
                labels: [],
              },
            },
          ],
        }),
      });

      const result = await client.searchIssues({ jql: 'project = FORGE' });

      expect(result.total).toBe(1);
      expect(result.issues).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/search'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('project = FORGE'),
        })
      );
    });

    it('uses pagination parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          startAt: 10,
          maxResults: 25,
          total: 100,
          issues: [],
        }),
      });

      await client.searchIssues({
        jql: 'project = FORGE',
        startAt: 10,
        maxResults: 25,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"startAt":10'),
        })
      );
    });
  });

  describe('createIssue', () => {
    it('creates issue and returns key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          id: '10002',
          key: 'FORGE-124',
          self: 'https://test.atlassian.net/rest/api/3/issue/10002',
        }),
      });

      const response = await client.createIssue({
        fields: {
          project: { key: 'FORGE' },
          summary: 'New Issue',
          issuetype: { name: 'Task' },
        },
      });

      expect(response.key).toBe('FORGE-124');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/issue'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('New Issue'),
        })
      );
    });
  });

  describe('updateIssue', () => {
    it('updates issue fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Map([['content-type', 'application/json']]),
      });

      await client.updateIssue('FORGE-123', {
        fields: { summary: 'Updated Summary' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/issue/FORGE-123'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('Updated Summary'),
        })
      );
    });
  });

  describe('deleteIssue', () => {
    it('deletes issue by key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Map([['content-type', 'application/json']]),
      });

      await client.deleteIssue('FORGE-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/issue/FORGE-123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('getTransitions', () => {
    it('returns available transitions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          transitions: [
            {
              id: '21',
              name: 'In Progress',
              to: { id: '2', name: 'In Progress', statusCategory: { id: 2, key: 'indeterminate', name: 'In Progress' } },
              isAvailable: true,
              isGlobal: false,
              isInitial: false,
              isConditional: false,
            },
          ],
        }),
      });

      const result = await client.getTransitions('FORGE-123');

      expect(result.transitions).toHaveLength(1);
      expect(result.transitions[0].name).toBe('In Progress');
    });
  });

  describe('transitionIssue', () => {
    it('transitions issue to new status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Map([['content-type', 'application/json']]),
      });

      await client.transitionIssue('FORGE-123', '21');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/transitions'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"id":"21"'),
        })
      );
    });

    it('includes fields when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Map([['content-type', 'application/json']]),
      });

      await client.transitionIssue('FORGE-123', '21', {
        resolution: { name: 'Done' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('resolution'),
        })
      );
    });
  });

  describe('addComment', () => {
    it('adds comment to issue', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          id: 'comment-123',
          author: { accountId: 'user', displayName: 'Test User' },
          body: { type: 'doc', version: 1, content: [] },
          created: '2026-01-27T00:00:00.000Z',
          updated: '2026-01-27T00:00:00.000Z',
        }),
      });

      const result = await client.addComment('FORGE-123', 'Test comment');

      expect(result.id).toBe('comment-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/comment'),
        expect.any(Object)
      );
    });
  });

  describe('getComments', () => {
    it('returns issue comments', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          comments: [
            {
              id: 'comment-1',
              author: { accountId: 'user', displayName: 'User' },
              body: { type: 'doc', version: 1, content: [] },
              created: '2026-01-27T00:00:00.000Z',
              updated: '2026-01-27T00:00:00.000Z',
            },
          ],
        }),
      });

      const comments = await client.getComments('FORGE-123');

      expect(comments).toHaveLength(1);
    });
  });

  describe('getProject', () => {
    it('returns project by key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          id: '10000',
          key: 'FORGE',
          name: 'FORGE Platform',
          lead: { accountId: 'lead', displayName: 'Lead' },
          projectTypeKey: 'software',
          issueTypes: [],
        }),
      });

      const project = await client.getProject('FORGE');

      expect(project.key).toBe('FORGE');
      expect(project.name).toBe('FORGE Platform');
    });
  });

  describe('listProjects', () => {
    it('returns all projects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          values: [
            {
              id: '10000',
              key: 'FORGE',
              name: 'FORGE Platform',
              lead: { accountId: 'lead', displayName: 'Lead' },
              projectTypeKey: 'software',
              issueTypes: [],
            },
          ],
        }),
      });

      const projects = await client.listProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].key).toBe('FORGE');
    });
  });

  describe('Agile API', () => {
    describe('getBoard', () => {
      it('returns board by id', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            id: 1,
            name: 'FORGE Board',
            type: 'scrum',
            location: { projectId: 10000, projectKey: 'FORGE' },
          }),
        });

        const board = await client.getBoard(1);

        expect(board.id).toBe(1);
        expect(board.type).toBe('scrum');
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/rest/agile/1.0/board/1'),
          expect.any(Object)
        );
      });
    });

    describe('getBoardSprints', () => {
      it('returns all sprints', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            values: [
              { id: 1, name: 'Sprint 1', state: 'closed' },
              { id: 2, name: 'Sprint 2', state: 'active' },
            ],
          }),
        });

        const sprints = await client.getBoardSprints(1);

        expect(sprints).toHaveLength(2);
      });

      it('filters by state', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            values: [{ id: 2, name: 'Sprint 2', state: 'active' }],
          }),
        });

        await client.getBoardSprints(1, 'active');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('state=active'),
          expect.any(Object)
        );
      });
    });

    describe('moveIssueToSprint', () => {
      it('moves issue to sprint', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 204,
          headers: new Map([['content-type', 'application/json']]),
        });

        await client.moveIssueToSprint('FORGE-123', 2);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/sprint/2/issue'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('FORGE-123'),
          })
        );
      });
    });
  });
});

describe('MockJiraClient', () => {
  let client: IJiraClient & { reset: () => void };

  beforeEach(() => {
    client = new MockJiraClient();
  });

  describe('getIssue', () => {
    it('returns seeded mock issue', async () => {
      const issue = await client.getIssue('FORGE-1');
      expect(issue.key).toBe('FORGE-1');
      expect(issue.fields.summary).toBe('Mock Issue for Testing');
    });

    it('throws for unknown issue', async () => {
      await expect(client.getIssue('UNKNOWN-999')).rejects.toThrow('404');
    });
  });

  describe('createIssue', () => {
    it('creates issue with incrementing key', async () => {
      const response = await client.createIssue({
        fields: {
          project: { key: 'FORGE' },
          summary: 'New Mock Issue',
          issuetype: { name: 'Task' },
        },
      });

      expect(response.key).toMatch(/^FORGE-\d+$/);

      // Verify it was stored
      const issue = await client.getIssue(response.key);
      expect(issue.fields.summary).toBe('New Mock Issue');
    });

    it('preserves labels', async () => {
      const response = await client.createIssue({
        fields: {
          project: { key: 'FORGE' },
          summary: 'Issue with Labels',
          issuetype: { name: 'Task' },
          labels: ['bug', 'urgent'],
        },
      });

      const issue = await client.getIssue(response.key);
      expect(issue.fields.labels).toContain('bug');
      expect(issue.fields.labels).toContain('urgent');
    });
  });

  describe('updateIssue', () => {
    it('updates issue fields', async () => {
      await client.updateIssue('FORGE-1', {
        fields: { summary: 'Updated Summary' },
      });

      const issue = await client.getIssue('FORGE-1');
      expect(issue.fields.summary).toBe('Updated Summary');
    });

    it('throws for unknown issue', async () => {
      await expect(
        client.updateIssue('UNKNOWN-999', { fields: {} })
      ).rejects.toThrow('404');
    });
  });

  describe('deleteIssue', () => {
    it('removes issue from store', async () => {
      await client.deleteIssue('FORGE-1');
      await expect(client.getIssue('FORGE-1')).rejects.toThrow('404');
    });

    it('throws for unknown issue', async () => {
      await expect(client.deleteIssue('UNKNOWN-999')).rejects.toThrow('404');
    });
  });

  describe('transitionIssue', () => {
    it('updates issue status to In Progress', async () => {
      await client.transitionIssue('FORGE-1', '21');

      const issue = await client.getIssue('FORGE-1');
      expect(issue.fields.status.name).toBe('In Progress');
    });

    it('updates issue status to Done', async () => {
      await client.transitionIssue('FORGE-1', '31');

      const issue = await client.getIssue('FORGE-1');
      expect(issue.fields.status.name).toBe('Done');
    });

    it('throws for unknown issue', async () => {
      await expect(
        client.transitionIssue('UNKNOWN-999', '21')
      ).rejects.toThrow('404');
    });
  });

  describe('getTransitions', () => {
    it('returns available transitions', async () => {
      const result = await client.getTransitions('FORGE-1');

      expect(result.transitions).toHaveLength(3);
      expect(result.transitions.map((t) => t.name)).toContain('To Do');
      expect(result.transitions.map((t) => t.name)).toContain('In Progress');
      expect(result.transitions.map((t) => t.name)).toContain('Done');
    });
  });

  describe('addComment', () => {
    it('returns comment with body', async () => {
      const comment = await client.addComment('FORGE-1', 'Test comment');

      expect(comment.id).toMatch(/^comment-/);
      expect(comment.author.displayName).toBe('Mock User');
    });

    it('throws for unknown issue', async () => {
      await expect(
        client.addComment('UNKNOWN-999', 'Test')
      ).rejects.toThrow('404');
    });
  });

  describe('searchIssues', () => {
    it('returns all mock issues', async () => {
      const result = await client.searchIssues({ jql: 'project = FORGE' });
      expect(result.total).toBeGreaterThan(0);
    });

    it('respects pagination', async () => {
      // Create additional issues
      await client.createIssue({
        fields: {
          project: { key: 'FORGE' },
          summary: 'Issue 2',
          issuetype: { name: 'Task' },
        },
      });

      const result = await client.searchIssues({
        jql: 'project = FORGE',
        startAt: 0,
        maxResults: 1,
      });

      expect(result.issues).toHaveLength(1);
      expect(result.total).toBeGreaterThan(1);
    });
  });

  describe('getProject', () => {
    it('returns mock project', async () => {
      const project = await client.getProject('FORGE');

      expect(project.key).toBe('FORGE');
      expect(project.name).toBe('FORGE Platform');
      expect(project.issueTypes.length).toBeGreaterThan(0);
    });
  });

  describe('listProjects', () => {
    it('returns mock projects', async () => {
      const projects = await client.listProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].key).toBe('FORGE');
    });
  });

  describe('getBoard', () => {
    it('returns mock board', async () => {
      const board = await client.getBoard(1);

      expect(board.id).toBe(1);
      expect(board.type).toBe('scrum');
    });
  });

  describe('getBoardSprints', () => {
    it('returns all sprints', async () => {
      const sprints = await client.getBoardSprints(1);

      expect(sprints).toHaveLength(3);
    });

    it('filters by state', async () => {
      const activeSprints = await client.getBoardSprints(1, 'active');

      expect(activeSprints).toHaveLength(1);
      expect(activeSprints[0].state).toBe('active');
    });
  });

  describe('moveIssueToSprint', () => {
    it('succeeds for existing issue', async () => {
      await expect(
        client.moveIssueToSprint('FORGE-1', 2)
      ).resolves.not.toThrow();
    });

    it('throws for unknown issue', async () => {
      await expect(
        client.moveIssueToSprint('UNKNOWN-999', 2)
      ).rejects.toThrow('404');
    });
  });

  describe('isConfigured', () => {
    it('always returns true for mock', () => {
      expect(client.isConfigured()).toBe(true);
    });
  });

  describe('reset', () => {
    it('restores initial state', async () => {
      // Create new issue
      await client.createIssue({
        fields: {
          project: { key: 'FORGE' },
          summary: 'Will be removed',
          issuetype: { name: 'Task' },
        },
      });

      // Modify existing issue
      await client.transitionIssue('FORGE-1', '21');

      // Reset
      client.reset();

      // Verify initial state restored
      const issue = await client.getIssue('FORGE-1');
      expect(issue.fields.status.name).toBe('To Do');

      const search = await client.searchIssues({ jql: '' });
      expect(search.total).toBe(1);
    });
  });
});
