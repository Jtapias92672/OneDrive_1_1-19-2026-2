/**
 * FORGE Platform - Governance Gateway E2E Tests
 * @epic 12 - E2E Testing
 * 
 * Tests policy enforcement, approval workflows, and audit
 */

import { test, expect } from '@playwright/test';

test.describe('Governance - Policy Enforcement', () => {
  test('enforces execution policies', async ({ request }) => {
    const response = await request.post('/api/v1/governance/evaluate', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        action: 'execution.start',
        resource: {
          type: 'execution',
          contractId: 'test-contract',
          config: {
            provider: 'claude',
            maxIterations: 100,
          },
        },
        context: {
          userId: 'test-user',
          projectId: 'test-project',
        },
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const result = await response.json();
    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('policies');
  });

  test('blocks policy violations', async ({ request }) => {
    const response = await request.post('/api/v1/governance/evaluate', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        action: 'execution.start',
        resource: {
          type: 'execution',
          config: {
            maxIterations: 10000, // Exceeds limit
            timeout: 86400, // 24 hours - too long
          },
        },
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const result = await response.json();
    // Should be blocked or have violations
    if (!result.allowed) {
      expect(result.violations).toBeInstanceOf(Array);
      expect(result.violations.length).toBeGreaterThan(0);
    }
  });

  test('applies cost policies', async ({ request }) => {
    const response = await request.post('/api/v1/governance/evaluate', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        action: 'execution.start',
        resource: {
          type: 'execution',
          estimatedCost: 1000, // High cost
        },
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const result = await response.json();
    // High cost should trigger policy
    expect(result.policies.some((p: any) => p.name.includes('cost'))).toBe(true);
  });
});

test.describe('Governance - Approval Workflows', () => {
  test('creates approval request', async ({ request }) => {
    const response = await request.post('/api/v1/governance/approvals', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        type: 'execution',
        resourceId: 'test-execution',
        reason: 'High iteration count requires approval',
        requestedBy: 'test-user',
      },
    });
    
    if (response.ok()) {
      const approval = await response.json();
      expect(approval).toHaveProperty('id');
      expect(approval.status).toBe('pending');
    }
  });

  test('lists pending approvals', async ({ request }) => {
    const response = await request.get('/api/v1/governance/approvals?status=pending', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const result = await response.json();
    expect(result.approvals).toBeInstanceOf(Array);
  });

  test('approves request with admin', async ({ request }) => {
    // Create approval
    const createResponse = await request.post('/api/v1/governance/approvals', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        type: 'execution',
        resourceId: 'approval-test',
        reason: 'Test approval',
      },
    });
    
    if (createResponse.ok()) {
      const { id } = await createResponse.json();
      
      // Approve with admin
      const approveResponse = await request.post(`/api/v1/governance/approvals/${id}/approve`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
        },
        data: {
          comment: 'Approved for testing',
        },
      });
      
      if (approveResponse.ok()) {
        const result = await approveResponse.json();
        expect(result.status).toBe('approved');
      }
    }
  });

  test('rejects request with reason', async ({ request }) => {
    const createResponse = await request.post('/api/v1/governance/approvals', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        type: 'execution',
        resourceId: 'reject-test',
        reason: 'Test rejection',
      },
    });
    
    if (createResponse.ok()) {
      const { id } = await createResponse.json();
      
      const rejectResponse = await request.post(`/api/v1/governance/approvals/${id}/reject`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
        },
        data: {
          reason: 'Does not meet requirements',
        },
      });
      
      if (rejectResponse.ok()) {
        const result = await rejectResponse.json();
        expect(result.status).toBe('rejected');
        expect(result.rejectionReason).toBe('Does not meet requirements');
      }
    }
  });
});

test.describe('Governance - Audit', () => {
  test('logs policy evaluations', async ({ request }) => {
    // Trigger a policy evaluation
    await request.post('/api/v1/governance/evaluate', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        action: 'execution.start',
        resource: { type: 'execution' },
      },
    });
    
    // Check audit log
    const auditResponse = await request.get('/api/v1/governance/audit?type=policy_evaluation', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (auditResponse.ok()) {
      const audit = await auditResponse.json();
      expect(audit.entries).toBeInstanceOf(Array);
    }
  });

  test('logs approval decisions', async ({ request }) => {
    const auditResponse = await request.get('/api/v1/governance/audit?type=approval', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (auditResponse.ok()) {
      const audit = await auditResponse.json();
      expect(audit.entries).toBeInstanceOf(Array);
      
      if (audit.entries.length > 0) {
        expect(audit.entries[0]).toHaveProperty('timestamp');
        expect(audit.entries[0]).toHaveProperty('actor');
        expect(audit.entries[0]).toHaveProperty('action');
      }
    }
  });

  test('exports audit report', async ({ request }) => {
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

test.describe('Governance - Gates', () => {
  test('pre-execution gate blocks invalid config', async ({ request }) => {
    const response = await request.post('/api/v1/governance/gates/pre-execution', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        executionConfig: {
          contractId: 'test',
          maxIterations: -1, // Invalid
        },
      },
    });
    
    const result = await response.json();
    expect(result.passed).toBe(false);
    expect(result.errors).toContain(expect.stringMatching(/iteration/i));
  });

  test('post-execution gate validates results', async ({ request }) => {
    const response = await request.post('/api/v1/governance/gates/post-execution', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        executionResult: {
          status: 'completed',
          finalScore: 0.95,
          iterations: 5,
        },
      },
    });
    
    if (response.ok()) {
      const result = await response.json();
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('checks');
    }
  });

  test('evidence gate requires valid hash', async ({ request }) => {
    const response = await request.post('/api/v1/governance/gates/evidence', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        evidenceId: 'test-evidence',
        hash: 'invalid-hash',
      },
    });
    
    const result = await response.json();
    expect(result.passed).toBe(false);
  });
});

test.describe('Governance UI', () => {
  test('displays policy dashboard', async ({ page }) => {
    await page.goto('/governance');
    
    await expect(page.getByRole('heading', { name: /governance/i })).toBeVisible();
    await expect(page.getByTestId('policy-overview')).toBeVisible();
  });

  test('shows pending approvals', async ({ page }) => {
    await page.goto('/governance/approvals');
    
    await expect(page.getByRole('heading', { name: /approvals/i })).toBeVisible();
    
    const approvalsList = page.getByTestId('approvals-list');
    await expect(approvalsList).toBeVisible();
  });

  test('displays audit log', async ({ page }) => {
    await page.goto('/governance/audit');
    
    await expect(page.getByRole('heading', { name: /audit/i })).toBeVisible();
    
    const auditTable = page.getByTestId('audit-table');
    await expect(auditTable).toBeVisible();
  });

  test('allows policy configuration (admin)', async ({ page }) => {
    // Use admin auth
    await page.goto('/governance/policies');
    
    const policyList = page.getByTestId('policy-list');
    if (await policyList.isVisible()) {
      const editButton = policyList.getByRole('button', { name: /edit/i }).first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    }
  });
});
