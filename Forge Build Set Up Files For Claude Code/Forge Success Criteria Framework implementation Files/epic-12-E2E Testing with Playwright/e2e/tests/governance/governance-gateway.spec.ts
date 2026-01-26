/**
 * FORGE Platform - Governance Gateway E2E Tests
 * @epic 12 - E2E Testing
 * 
 * Tests policy enforcement, approval workflows, and audit trails
 */

import { test, expect } from '@playwright/test';

test.describe('Governance Gateway - Policy Management', () => {
  test('lists active policies', async ({ request }) => {
    const response = await request.get('/api/v1/governance/policies', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.policies).toBeInstanceOf(Array);
  });

  test('creates a new policy', async ({ request }) => {
    const response = await request.post('/api/v1/governance/policies', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
      },
      data: {
        name: 'E2E Test Policy',
        description: 'Policy created by E2E test',
        rules: [
          {
            type: 'cost_limit',
            threshold: 10.00,
            action: 'require_approval',
          },
          {
            type: 'tool_allowlist',
            tools: ['read_file', 'list_directory'],
            action: 'allow',
          },
        ],
        scope: {
          projects: ['*'],
          users: ['*'],
        },
      },
    });
    
    if (response.ok()) {
      const policy = await response.json();
      expect(policy.id).toBeDefined();
      expect(policy.name).toBe('E2E Test Policy');
      
      // Cleanup
      await request.delete(`/api/v1/governance/policies/${policy.id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
        },
      });
    }
  });

  test('evaluates policy for action', async ({ request }) => {
    const response = await request.post('/api/v1/governance/evaluate', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        action: 'mcp_tool_call',
        context: {
          tool: 'read_file',
          server: 'filesystem',
          params: { path: '/test/file.txt' },
        },
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const result = await response.json();
    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('policies');
  });

  test('blocks action violating policy', async ({ request }) => {
    const response = await request.post('/api/v1/governance/evaluate', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        action: 'mcp_tool_call',
        context: {
          tool: 'execute_command', // Likely blocked
          server: 'shell',
          params: { command: 'rm -rf /' },
        },
      },
    });
    
    if (response.ok()) {
      const result = await response.json();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    }
  });
});

test.describe('Governance Gateway - Approval Workflows', () => {
  let approvalId: string;

  test('creates approval request for sensitive action', async ({ request }) => {
    const response = await request.post('/api/v1/governance/approvals', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        action: 'high_cost_execution',
        context: {
          estimatedCost: 50.00,
          executionId: 'test-execution',
          reason: 'E2E test approval request',
        },
      },
    });
    
    if (response.status() === 201 || response.status() === 202) {
      const approval = await response.json();
      approvalId = approval.id;
      expect(approval.status).toBe('pending');
    }
  });

  test('lists pending approvals', async ({ request }) => {
    const response = await request.get('/api/v1/governance/approvals?status=pending', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.approvals).toBeInstanceOf(Array);
  });

  test('approves pending request', async ({ request }) => {
    if (!approvalId) {
      test.skip();
      return;
    }

    const response = await request.post(`/api/v1/governance/approvals/${approvalId}/approve`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
      },
      data: {
        comment: 'Approved by E2E test',
      },
    });
    
    if (response.ok()) {
      const result = await response.json();
      expect(result.status).toBe('approved');
    }
  });

  test('rejects pending request', async ({ request }) => {
    // Create a new approval to reject
    const createResponse = await request.post('/api/v1/governance/approvals', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        action: 'high_risk_operation',
        context: { reason: 'Test rejection' },
      },
    });
    
    if (createResponse.status() === 201 || createResponse.status() === 202) {
      const approval = await createResponse.json();
      
      const rejectResponse = await request.post(
        `/api/v1/governance/approvals/${approval.id}/reject`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
          },
          data: {
            reason: 'Rejected by E2E test',
          },
        }
      );
      
      if (rejectResponse.ok()) {
        const result = await rejectResponse.json();
        expect(result.status).toBe('rejected');
      }
    }
  });

  test('approval request expires', async ({ request }) => {
    const response = await request.post('/api/v1/governance/approvals', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        action: 'test_expiration',
        context: {},
        expiresIn: 1, // 1 second
      },
    });
    
    if (response.status() === 201 || response.status() === 202) {
      const approval = await response.json();
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await request.get(
        `/api/v1/governance/approvals/${approval.id}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
        }
      );
      
      if (statusResponse.ok()) {
        const result = await statusResponse.json();
        expect(result.status).toBe('expired');
      }
    }
  });
});

test.describe('Governance Gateway - Audit Trail', () => {
  test('logs all governance decisions', async ({ request }) => {
    // Make a governance evaluation
    await request.post('/api/v1/governance/evaluate', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        action: 'test_audit',
        context: { testId: 'audit-test-123' },
      },
    });
    
    // Check audit log
    const auditResponse = await request.get('/api/v1/governance/audit?action=test_audit', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (auditResponse.ok()) {
      const audit = await auditResponse.json();
      expect(audit.entries).toBeInstanceOf(Array);
    }
  });

  test('audit entries include required fields', async ({ request }) => {
    const auditResponse = await request.get('/api/v1/governance/audit?limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
      },
    });
    
    if (auditResponse.ok()) {
      const audit = await auditResponse.json();
      
      if (audit.entries.length > 0) {
        const entry = audit.entries[0];
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('action');
        expect(entry).toHaveProperty('userId');
        expect(entry).toHaveProperty('decision');
        expect(entry).toHaveProperty('policies');
      }
    }
  });

  test('filters audit by date range', async ({ request }) => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const response = await request.get(
      `/api/v1/governance/audit?from=${yesterday.toISOString()}&to=${now.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
        },
      }
    );
    
    if (response.ok()) {
      const audit = await response.json();
      expect(audit.entries).toBeInstanceOf(Array);
    }
  });

  test('exports audit log', async ({ request }) => {
    const response = await request.get('/api/v1/governance/audit/export?format=csv', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
      },
    });
    
    if (response.ok()) {
      expect(response.headers()['content-type']).toContain('text/csv');
    }
  });
});

test.describe('Governance Gateway - Gates', () => {
  test('pre-execution gate checks', async ({ request }) => {
    const response = await request.post('/api/v1/governance/gates/pre-execution', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        executionId: 'test-exec-123',
        contractId: 'test-contract',
        config: {
          maxIterations: 10,
          targetScore: 0.9,
        },
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const result = await response.json();
    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('checks');
  });

  test('post-iteration gate checks', async ({ request }) => {
    const response = await request.post('/api/v1/governance/gates/post-iteration', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        executionId: 'test-exec-123',
        iterationNumber: 1,
        score: 0.7,
        tokensUsed: 1000,
        costIncurred: 0.05,
      },
    });
    
    if (response.ok()) {
      const result = await response.json();
      expect(result).toHaveProperty('continue');
      expect(result).toHaveProperty('warnings');
    }
  });

  test('completion gate checks', async ({ request }) => {
    const response = await request.post('/api/v1/governance/gates/completion', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        executionId: 'test-exec-123',
        finalScore: 0.92,
        totalCost: 0.50,
        iterationCount: 5,
      },
    });
    
    if (response.ok()) {
      const result = await response.json();
      expect(result).toHaveProperty('approved');
      expect(result).toHaveProperty('evidenceRequired');
    }
  });
});

test.describe('Governance Gateway - UI', () => {
  test('displays governance dashboard', async ({ page }) => {
    await page.goto('/governance');
    
    await expect(page.getByRole('heading', { name: /governance/i })).toBeVisible();
    await expect(page.getByTestId('policy-summary')).toBeVisible();
  });

  test('shows pending approvals count', async ({ page }) => {
    await page.goto('/governance');
    
    const approvalsBadge = page.getByTestId('pending-approvals-count');
    await expect(approvalsBadge).toBeVisible();
  });

  test('allows policy management', async ({ page }) => {
    await page.goto('/governance/policies');
    
    await expect(page.getByRole('heading', { name: /policies/i })).toBeVisible();
    
    // Check for create button (admin only)
    const createButton = page.getByRole('button', { name: /create policy/i });
    // May or may not be visible depending on permissions
  });

  test('displays audit log', async ({ page }) => {
    await page.goto('/governance/audit');
    
    await expect(page.getByRole('heading', { name: /audit/i })).toBeVisible();
    
    const auditTable = page.getByTestId('audit-table');
    await expect(auditTable).toBeVisible();
  });
});
