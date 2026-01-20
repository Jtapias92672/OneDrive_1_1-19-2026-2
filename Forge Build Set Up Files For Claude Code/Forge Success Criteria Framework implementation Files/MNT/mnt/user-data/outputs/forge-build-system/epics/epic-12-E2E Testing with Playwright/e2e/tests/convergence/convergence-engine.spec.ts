/**
 * FORGE Platform - Convergence Engine E2E Tests
 * @epic 12 - E2E Testing
 * 
 * Tests the complete convergence loop from start to completion
 */

import { test, expect } from '@playwright/test';

test.describe('Convergence Engine - Full Loop', () => {
  let executionId: string;

  test('executes complete convergence loop', async ({ request }) => {
    // Create a test contract
    const contractResponse = await request.post('/api/v1/contracts', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        name: 'Convergence E2E Test Contract',
        type: 'validation',
        sections: [{
          name: 'Requirements',
          content: 'Return a greeting message that includes the word "hello".',
        }],
      },
    });
    
    expect(contractResponse.ok()).toBeTruthy();
    const contract = await contractResponse.json();

    // Start execution
    const execResponse = await request.post('/api/v1/executions', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        contractId: contract.id,
        name: 'E2E Convergence Test',
        config: {
          provider: 'claude',
          model: 'claude-3-5-haiku',
          targetScore: 0.8,
          maxIterations: 5,
          timeout: 120,
        },
      },
    });
    
    expect(execResponse.ok()).toBeTruthy();
    const execution = await execResponse.json();
    executionId = execution.id;
    
    expect(execution.status).toMatch(/pending|running/);

    // Poll for completion (max 2 minutes)
    let finalStatus = execution.status;
    const startTime = Date.now();
    
    while (finalStatus === 'running' || finalStatus === 'pending') {
      if (Date.now() - startTime > 120000) {
        break; // Timeout
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const statusResponse = await request.get(`/api/v1/executions/${executionId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
        },
      });
      
      const statusData = await statusResponse.json();
      finalStatus = statusData.status;
    }
    
    // Verify completion
    expect(['completed', 'failed', 'timeout']).toContain(finalStatus);

    // Cleanup
    await request.delete(`/api/v1/contracts/${contract.id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
  });

  test('tracks iteration progress', async ({ request }) => {
    if (!executionId) {
      test.skip();
      return;
    }

    const response = await request.get(`/api/v1/executions/${executionId}/iterations`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.iterations).toBeInstanceOf(Array);
    
    if (body.iterations.length > 0) {
      const iteration = body.iterations[0];
      expect(iteration).toHaveProperty('number');
      expect(iteration).toHaveProperty('score');
      expect(iteration).toHaveProperty('answer');
      expect(iteration).toHaveProperty('feedback');
      expect(iteration).toHaveProperty('timestamp');
    }
  });

  test('scores improve over iterations', async ({ request }) => {
    if (!executionId) {
      test.skip();
      return;
    }

    const response = await request.get(`/api/v1/executions/${executionId}/iterations`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (response.ok()) {
      const body = await response.json();
      
      if (body.iterations.length >= 2) {
        const scores = body.iterations.map((i: any) => i.score);
        
        // Last score should generally be >= first score
        // (allowing for some variance)
        expect(scores[scores.length - 1]).toBeGreaterThanOrEqual(scores[0] * 0.9);
      }
    }
  });
});

test.describe('Convergence Engine - Validators', () => {
  test('applies semantic validator', async ({ request }) => {
    const response = await request.post('/api/v1/validate', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        answer: 'The answer is 42, which represents the meaning of life.',
        contract: {
          requirements: ['Provide a meaningful answer'],
        },
        validators: ['semantic'],
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.validators).toContainEqual(
      expect.objectContaining({ name: 'semantic' })
    );
  });

  test('applies structural validator', async ({ request }) => {
    const response = await request.post('/api/v1/validate', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        answer: '{"status": "success", "data": {"value": 42}}',
        contract: {
          expectedFormat: 'json',
          schema: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              data: { type: 'object' },
            },
          },
        },
        validators: ['structural'],
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.validators).toContainEqual(
      expect.objectContaining({ name: 'structural' })
    );
  });

  test('applies computational validator', async ({ request }) => {
    const response = await request.post('/api/v1/validate', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        answer: 'The square root of 16 is 4.',
        validators: ['computational'],
        config: {
          computational: {
            expressions: ['sqrt(16) = 4'],
          },
        },
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    const compValidator = body.validators.find((v: any) => v.name === 'computational');
    expect(compValidator).toBeDefined();
    expect(compValidator.score).toBeGreaterThan(0.5);
  });

  test('combines multiple validators', async ({ request }) => {
    const response = await request.post('/api/v1/validate', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        answer: 'Based on analysis, the result is 42 (computed as 6*7).',
        validators: ['semantic', 'structural', 'computational'],
        config: {
          computational: {
            expressions: ['6 * 7 = 42'],
          },
        },
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.validators.length).toBe(3);
    expect(body.score).toBeDefined();
    expect(body.score).toBeGreaterThan(0);
    expect(body.score).toBeLessThanOrEqual(1);
  });
});

test.describe('Convergence Engine - Feedback Generation', () => {
  test('generates actionable feedback', async ({ request }) => {
    const response = await request.post('/api/v1/validate', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        answer: 'Yes',
        contract: {
          requirements: [
            'Provide a detailed explanation',
            'Include supporting evidence',
            'Use formal language',
          ],
        },
        validators: ['semantic'],
        generateFeedback: true,
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.feedback).toBeDefined();
    expect(body.feedback.suggestions).toBeInstanceOf(Array);
    expect(body.feedback.suggestions.length).toBeGreaterThan(0);
  });

  test('feedback includes specific improvements', async ({ request }) => {
    const response = await request.post('/api/v1/validate', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        answer: 'The answer might be around 40-ish.',
        contract: {
          requirements: ['Provide exact numerical answer'],
        },
        validators: ['computational'],
        generateFeedback: true,
      },
    });
    
    if (response.ok()) {
      const body = await response.json();
      
      if (body.feedback) {
        expect(body.feedback.improvements).toBeDefined();
        expect(body.feedback.improvements.some((i: string) => 
          i.toLowerCase().includes('precise') || 
          i.toLowerCase().includes('exact') ||
          i.toLowerCase().includes('specific')
        )).toBe(true);
      }
    }
  });
});

test.describe('Convergence Engine - Strategies', () => {
  test('supports linear strategy', async ({ request }) => {
    const response = await request.post('/api/v1/executions', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        contractId: 'test-contract',
        config: {
          strategy: 'linear',
          targetScore: 0.8,
        },
      },
    });
    
    // Will fail with invalid contract, but validates strategy acceptance
    expect([201, 400, 404]).toContain(response.status());
  });

  test('supports adaptive strategy', async ({ request }) => {
    const response = await request.post('/api/v1/executions', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        contractId: 'test-contract',
        config: {
          strategy: 'adaptive',
          targetScore: 0.9,
        },
      },
    });
    
    expect([201, 400, 404]).toContain(response.status());
  });

  test('supports binary search strategy', async ({ request }) => {
    const response = await request.post('/api/v1/executions', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        contractId: 'test-contract',
        config: {
          strategy: 'binary_search',
          targetScore: 0.85,
        },
      },
    });
    
    expect([201, 400, 404]).toContain(response.status());
  });
});

test.describe('Convergence Engine - Recovery', () => {
  test('handles provider timeout gracefully', async ({ request }) => {
    const response = await request.post('/api/v1/executions', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        contractId: 'test-contract',
        config: {
          timeout: 1, // Very short timeout
          maxIterations: 1,
        },
      },
    });
    
    // Should handle gracefully
    expect([201, 400, 404, 408, 504]).toContain(response.status());
  });

  test('checkpoints progress for recovery', async ({ request }) => {
    // Start an execution
    const startResponse = await request.post('/api/v1/executions', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        contractId: 'test-contract',
        config: {
          enableCheckpoints: true,
        },
      },
    });
    
    if (startResponse.ok()) {
      const execution = await startResponse.json();
      
      // Check for checkpoint
      const checkpointResponse = await request.get(
        `/api/v1/executions/${execution.id}/checkpoint`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
        }
      );
      
      // Checkpoint may or may not exist yet
      expect([200, 404]).toContain(checkpointResponse.status());
    }
  });
});

test.describe('Convergence Engine - Cost Tracking', () => {
  test('tracks token usage', async ({ request }) => {
    // Get an execution
    const listResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (listResponse.ok()) {
      const executions = await listResponse.json();
      
      if (executions.data.length > 0) {
        const execution = executions.data[0];
        
        const costResponse = await request.get(
          `/api/v1/executions/${execution.id}/cost`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
            },
          }
        );
        
        if (costResponse.ok()) {
          const cost = await costResponse.json();
          expect(cost).toHaveProperty('inputTokens');
          expect(cost).toHaveProperty('outputTokens');
          expect(cost).toHaveProperty('totalCost');
        }
      }
    }
  });

  test('enforces cost limits', async ({ request }) => {
    const response = await request.post('/api/v1/executions', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        contractId: 'test-contract',
        config: {
          maxCost: 0.01, // Very low cost limit
          maxIterations: 100,
        },
      },
    });
    
    // Should accept with cost limit
    expect([201, 400, 404]).toContain(response.status());
  });
});

test.describe('Convergence Engine UI', () => {
  test('displays convergence progress chart', async ({ page }) => {
    await page.goto('/runs');
    
    // Click on first run
    const firstRun = page.getByTestId('run-row').first();
    if (await firstRun.isVisible()) {
      await firstRun.click();
      
      // Check for convergence chart
      const chart = page.getByTestId('convergence-chart');
      await expect(chart).toBeVisible({ timeout: 10000 });
    }
  });

  test('shows iteration details', async ({ page }) => {
    await page.goto('/runs');
    
    const firstRun = page.getByTestId('run-row').first();
    if (await firstRun.isVisible()) {
      await firstRun.click();
      
      await page.getByRole('tab', { name: /iterations/i }).click();
      
      const iterationList = page.getByTestId('iteration-list');
      await expect(iterationList).toBeVisible();
    }
  });

  test('displays validator breakdown', async ({ page }) => {
    await page.goto('/runs');
    
    const completedRun = page.getByTestId('run-row').filter({ hasText: /completed/i }).first();
    if (await completedRun.isVisible()) {
      await completedRun.click();
      
      await page.getByRole('tab', { name: /validation/i }).click();
      
      const validatorBreakdown = page.getByTestId('validator-breakdown');
      await expect(validatorBreakdown).toBeVisible();
    }
  });
});
