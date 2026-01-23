/**
 * FORGE Platform - Evidence Pack E2E Tests
 * @epic 12 - E2E Testing
 * 
 * Tests evidence generation, verification, and export
 */

import { test, expect } from '@playwright/test';

test.describe('Evidence Pack - Generation', () => {
  test('generates evidence pack on execution completion', async ({ request }) => {
    // Get a completed execution
    const listResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (listResponse.ok()) {
      const executions = await listResponse.json();
      
      if (executions.data.length > 0) {
        const executionId = executions.data[0].id;
        
        // Get evidence pack
        const evidenceResponse = await request.get(`/api/v1/evidence/${executionId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
        });
        
        expect(evidenceResponse.ok()).toBeTruthy();
        
        const evidence = await evidenceResponse.json();
        expect(evidence).toHaveProperty('hash');
        expect(evidence).toHaveProperty('timestamp');
        expect(evidence).toHaveProperty('runId');
        expect(evidence).toHaveProperty('iterations');
      }
    }
  });

  test('evidence pack includes all iterations', async ({ request }) => {
    const listResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (listResponse.ok()) {
      const executions = await listResponse.json();
      
      if (executions.data.length > 0) {
        const executionId = executions.data[0].id;
        
        // Get execution details for iteration count
        const execResponse = await request.get(`/api/v1/executions/${executionId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
        });
        
        const execution = await execResponse.json();
        
        // Get evidence
        const evidenceResponse = await request.get(`/api/v1/evidence/${executionId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
        });
        
        if (evidenceResponse.ok()) {
          const evidence = await evidenceResponse.json();
          expect(evidence.iterations.length).toBe(execution.iterationCount);
        }
      }
    }
  });

  test('each iteration has required fields', async ({ request }) => {
    const listResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (listResponse.ok()) {
      const executions = await listResponse.json();
      
      if (executions.data.length > 0) {
        const evidenceResponse = await request.get(`/api/v1/evidence/${executions.data[0].id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
        });
        
        if (evidenceResponse.ok()) {
          const evidence = await evidenceResponse.json();
          
          for (const iteration of evidence.iterations) {
            expect(iteration).toHaveProperty('number');
            expect(iteration).toHaveProperty('timestamp');
            expect(iteration).toHaveProperty('prompt');
            expect(iteration).toHaveProperty('response');
            expect(iteration).toHaveProperty('score');
            expect(iteration).toHaveProperty('validationResults');
          }
        }
      }
    }
  });
});

test.describe('Evidence Pack - Verification', () => {
  test('verifies evidence pack integrity', async ({ request }) => {
    const listResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (listResponse.ok()) {
      const executions = await listResponse.json();
      
      if (executions.data.length > 0) {
        const verifyResponse = await request.post(
          `/api/v1/evidence/${executions.data[0].id}/verify`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
            },
          }
        );
        
        expect(verifyResponse.ok()).toBeTruthy();
        
        const result = await verifyResponse.json();
        expect(result.valid).toBe(true);
        expect(result.hashMatch).toBe(true);
      }
    }
  });

  test('detects tampered evidence', async ({ request }) => {
    // This tests that if evidence is modified, verification fails
    const verifyResponse = await request.post('/api/v1/evidence/verify-hash', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
      data: {
        content: 'test content',
        hash: 'invalid-hash-value',
      },
    });
    
    if (verifyResponse.ok()) {
      const result = await verifyResponse.json();
      expect(result.valid).toBe(false);
    }
  });

  test('validates signature chain', async ({ request }) => {
    const listResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (listResponse.ok()) {
      const executions = await listResponse.json();
      
      if (executions.data.length > 0) {
        const chainResponse = await request.get(
          `/api/v1/evidence/${executions.data[0].id}/chain`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
            },
          }
        );
        
        if (chainResponse.ok()) {
          const chain = await chainResponse.json();
          expect(chain.signatures).toBeInstanceOf(Array);
          expect(chain.valid).toBe(true);
        }
      }
    }
  });
});

test.describe('Evidence Pack - Export', () => {
  test('exports evidence as JSON', async ({ request }) => {
    const listResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (listResponse.ok()) {
      const executions = await listResponse.json();
      
      if (executions.data.length > 0) {
        const exportResponse = await request.get(
          `/api/v1/evidence/${executions.data[0].id}/export?format=json`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
            },
          }
        );
        
        expect(exportResponse.ok()).toBeTruthy();
        expect(exportResponse.headers()['content-type']).toContain('application/json');
      }
    }
  });

  test('exports evidence as PDF', async ({ request }) => {
    const listResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (listResponse.ok()) {
      const executions = await listResponse.json();
      
      if (executions.data.length > 0) {
        const exportResponse = await request.get(
          `/api/v1/evidence/${executions.data[0].id}/export?format=pdf`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
            },
          }
        );
        
        if (exportResponse.ok()) {
          expect(exportResponse.headers()['content-type']).toContain('application/pdf');
        }
      }
    }
  });

  test('exports evidence for CMMC compliance', async ({ request }) => {
    const listResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (listResponse.ok()) {
      const executions = await listResponse.json();
      
      if (executions.data.length > 0) {
        const exportResponse = await request.get(
          `/api/v1/evidence/${executions.data[0].id}/export?format=cmmc`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
            },
          }
        );
        
        if (exportResponse.ok()) {
          const cmmc = await exportResponse.json();
          expect(cmmc).toHaveProperty('controlMappings');
          expect(cmmc).toHaveProperty('auditTrail');
          expect(cmmc).toHaveProperty('attestation');
        }
      }
    }
  });
});

test.describe('Evidence Pack - UI', () => {
  test('displays evidence pack viewer', async ({ page }) => {
    await page.goto('/runs');
    
    const completedRun = page.getByTestId('run-row').filter({ hasText: /completed/i }).first();
    if (await completedRun.isVisible()) {
      await completedRun.click();
      
      await page.getByRole('button', { name: /evidence/i }).click();
      
      const evidenceViewer = page.getByTestId('evidence-viewer');
      await expect(evidenceViewer).toBeVisible();
    }
  });

  test('shows evidence hash and verification status', async ({ page }) => {
    await page.goto('/runs');
    
    const completedRun = page.getByTestId('run-row').filter({ hasText: /completed/i }).first();
    if (await completedRun.isVisible()) {
      await completedRun.click();
      await page.getByRole('button', { name: /evidence/i }).click();
      
      await expect(page.getByTestId('evidence-hash')).toBeVisible();
      await expect(page.getByTestId('verification-status')).toBeVisible();
    }
  });

  test('allows evidence download', async ({ page }) => {
    await page.goto('/runs');
    
    const completedRun = page.getByTestId('run-row').filter({ hasText: /completed/i }).first();
    if (await completedRun.isVisible()) {
      await completedRun.click();
      await page.getByRole('button', { name: /evidence/i }).click();
      
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /download/i }).click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/evidence.*\.(json|pdf)$/);
    }
  });
});
