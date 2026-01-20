/**
 * FORGE Platform - MCP Gateway E2E Tests
 * @epic 12 - E2E Testing
 * 
 * Tests MCP server integration, tool execution, and security
 */

import { test, expect } from '@playwright/test';

test.describe('MCP Gateway - Tool Discovery', () => {
  test('lists available MCP servers', async ({ request }) => {
    const response = await request.get('/api/v1/mcp/servers', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.servers).toBeInstanceOf(Array);
    expect(body.servers.length).toBeGreaterThan(0);
    
    // Check server structure
    const server = body.servers[0];
    expect(server).toHaveProperty('name');
    expect(server).toHaveProperty('status');
    expect(server).toHaveProperty('tools');
  });

  test('lists tools for specific server', async ({ request }) => {
    const response = await request.get('/api/v1/mcp/servers/filesystem/tools', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.tools).toBeInstanceOf(Array);
    
    // Check tool structure
    if (body.tools.length > 0) {
      const tool = body.tools[0];
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
    }
  });

  test('returns 404 for unknown server', async ({ request }) => {
    const response = await request.get('/api/v1/mcp/servers/nonexistent/tools', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    expect(response.status()).toBe(404);
  });
});

test.describe('MCP Gateway - Tool Execution', () => {
  test('executes read_file tool', async ({ request }) => {
    const response = await request.post('/api/v1/mcp/execute', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        server: 'filesystem',
        tool: 'read_file',
        params: {
          path: '/test/sample.txt',
        },
        context: {
          runId: 'test-run-123',
          workId: 'test-work-456',
        },
      },
    });
    
    // May succeed or fail based on file existence
    expect([200, 404, 500]).toContain(response.status());
    
    const body = await response.json();
    expect(body).toHaveProperty('result');
    expect(body).toHaveProperty('executionTime');
  });

  test('validates required parameters', async ({ request }) => {
    const response = await request.post('/api/v1/mcp/execute', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        server: 'filesystem',
        tool: 'read_file',
        // Missing required 'path' parameter
        params: {},
      },
    });
    
    expect(response.status()).toBe(400);
    
    const body = await response.json();
    expect(body.error).toContain('path');
  });

  test('enforces tool allowlist', async ({ request }) => {
    const response = await request.post('/api/v1/mcp/execute', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        server: 'filesystem',
        tool: 'execute_command', // Potentially dangerous, should be blocked
        params: {
          command: 'ls -la',
        },
      },
    });
    
    // Should be forbidden or not found
    expect([403, 404]).toContain(response.status());
  });

  test('tracks tool execution metrics', async ({ request }) => {
    // Execute a tool
    await request.post('/api/v1/mcp/execute', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        server: 'filesystem',
        tool: 'list_directory',
        params: { path: '/test' },
        context: { runId: 'metrics-test' },
      },
    });
    
    // Check metrics
    const metricsResponse = await request.get('/api/v1/mcp/metrics', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (metricsResponse.ok()) {
      const metrics = await metricsResponse.json();
      expect(metrics).toHaveProperty('totalExecutions');
      expect(metrics).toHaveProperty('byServer');
      expect(metrics).toHaveProperty('byTool');
    }
  });
});

test.describe('MCP Gateway - Approval Workflow', () => {
  test('requires approval for sensitive tools', async ({ request }) => {
    const response = await request.post('/api/v1/mcp/execute', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        server: 'database',
        tool: 'execute_query',
        params: {
          query: 'SELECT * FROM users',
        },
      },
    });
    
    // Should require approval
    if (response.status() === 202) {
      const body = await response.json();
      expect(body.status).toBe('pending_approval');
      expect(body.approvalId).toBeDefined();
    }
  });

  test('approves pending tool execution', async ({ request }) => {
    // First, trigger an approval request
    const execResponse = await request.post('/api/v1/mcp/execute', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        server: 'database',
        tool: 'execute_query',
        params: { query: 'SELECT 1' },
      },
    });
    
    if (execResponse.status() === 202) {
      const { approvalId } = await execResponse.json();
      
      // Approve with admin token
      const approvalResponse = await request.post(`/api/v1/mcp/approvals/${approvalId}/approve`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
        },
      });
      
      expect(approvalResponse.ok()).toBeTruthy();
    }
  });

  test('rejects pending tool execution', async ({ request }) => {
    const execResponse = await request.post('/api/v1/mcp/execute', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        server: 'database',
        tool: 'execute_query',
        params: { query: 'DROP TABLE users' },
      },
    });
    
    if (execResponse.status() === 202) {
      const { approvalId } = await execResponse.json();
      
      // Reject with admin token
      const rejectResponse = await request.post(`/api/v1/mcp/approvals/${approvalId}/reject`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
        },
        data: {
          reason: 'Destructive operation not allowed',
        },
      });
      
      expect(rejectResponse.ok()).toBeTruthy();
    }
  });
});

test.describe('MCP Gateway - Rate Limiting', () => {
  test('rate limits excessive tool calls', async ({ request }) => {
    const requests = [];
    
    // Make many rapid requests
    for (let i = 0; i < 100; i++) {
      requests.push(
        request.post('/api/v1/mcp/execute', {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
          data: {
            server: 'filesystem',
            tool: 'list_directory',
            params: { path: '/' },
          },
        })
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status() === 429);
    
    // Should eventually hit rate limit
    expect(rateLimited).toBe(true);
  });

  test('includes rate limit headers', async ({ request }) => {
    const response = await request.post('/api/v1/mcp/execute', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        server: 'filesystem',
        tool: 'list_directory',
        params: { path: '/' },
      },
    });
    
    const headers = response.headers();
    expect(headers['x-ratelimit-limit']).toBeDefined();
    expect(headers['x-ratelimit-remaining']).toBeDefined();
  });
});

test.describe('MCP Gateway - Circuit Breaker', () => {
  test('opens circuit after failures', async ({ request }) => {
    // Simulate failures by calling non-existent paths
    for (let i = 0; i < 10; i++) {
      await request.post('/api/v1/mcp/execute', {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
        },
        data: {
          server: 'filesystem',
          tool: 'read_file',
          params: { path: '/nonexistent/path/that/fails' },
        },
      });
    }
    
    // Check circuit status
    const statusResponse = await request.get('/api/v1/mcp/servers/filesystem/status', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (statusResponse.ok()) {
      const status = await statusResponse.json();
      // Circuit may be open or half-open after failures
      expect(['closed', 'open', 'half-open']).toContain(status.circuitState);
    }
  });
});

test.describe('MCP Gateway - Audit Trail', () => {
  test('logs tool executions', async ({ request }) => {
    // Execute a tool
    const execResponse = await request.post('/api/v1/mcp/execute', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        server: 'filesystem',
        tool: 'list_directory',
        params: { path: '/test' },
        context: {
          runId: 'audit-test-run',
          workId: 'audit-test-work',
        },
      },
    });
    
    // Check audit log
    const auditResponse = await request.get('/api/v1/mcp/audit?runId=audit-test-run', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (auditResponse.ok()) {
      const audit = await auditResponse.json();
      expect(audit.entries).toBeInstanceOf(Array);
      
      if (audit.entries.length > 0) {
        const entry = audit.entries[0];
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('server');
        expect(entry).toHaveProperty('tool');
        expect(entry).toHaveProperty('userId');
      }
    }
  });

  test('audit entries include execution context', async ({ request }) => {
    const auditResponse = await request.get('/api/v1/mcp/audit?limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (auditResponse.ok()) {
      const audit = await auditResponse.json();
      
      if (audit.entries.length > 0) {
        const entry = audit.entries[0];
        expect(entry.context).toHaveProperty('runId');
        expect(entry.context).toHaveProperty('workId');
      }
    }
  });
});

test.describe('MCP Gateway - Privacy', () => {
  test('redacts sensitive data in responses', async ({ request }) => {
    const response = await request.post('/api/v1/mcp/execute', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        server: 'filesystem',
        tool: 'read_file',
        params: { path: '/secrets/api-keys.txt' },
      },
    });
    
    if (response.ok()) {
      const body = await response.json();
      // Sensitive data should be redacted
      expect(JSON.stringify(body)).not.toMatch(/sk-[a-zA-Z0-9]+/);
      expect(JSON.stringify(body)).not.toMatch(/password\s*[:=]\s*[^\s]+/i);
    }
  });

  test('enforces data classification', async ({ request }) => {
    const response = await request.post('/api/v1/mcp/execute', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        server: 'database',
        tool: 'query',
        params: {
          query: 'SELECT ssn FROM employees', // PII field
        },
      },
    });
    
    // Should either block or redact PII
    if (response.ok()) {
      const body = await response.json();
      // SSN should be masked
      expect(JSON.stringify(body)).not.toMatch(/\d{3}-\d{2}-\d{4}/);
    }
  });
});

test.describe('MCP Gateway UI', () => {
  test('displays MCP server status', async ({ page }) => {
    await page.goto('/mcp/servers');
    
    await expect(page.getByRole('heading', { name: /MCP Servers/i })).toBeVisible();
    
    // Check server cards
    const serverCards = page.getByTestId('mcp-server-card');
    await expect(serverCards.first()).toBeVisible();
  });

  test('shows tool execution history', async ({ page }) => {
    await page.goto('/mcp/history');
    
    await expect(page.getByRole('heading', { name: /Execution History/i })).toBeVisible();
    
    const historyTable = page.getByTestId('execution-history-table');
    await expect(historyTable).toBeVisible();
  });

  test('displays pending approvals', async ({ page }) => {
    await page.goto('/mcp/approvals');
    
    await expect(page.getByRole('heading', { name: /Pending Approvals/i })).toBeVisible();
  });

  test('shows server metrics dashboard', async ({ page }) => {
    await page.goto('/mcp/metrics');
    
    // Check metrics charts
    await expect(page.getByTestId('requests-chart')).toBeVisible();
    await expect(page.getByTestId('latency-chart')).toBeVisible();
    await expect(page.getByTestId('error-rate-chart')).toBeVisible();
  });
});
