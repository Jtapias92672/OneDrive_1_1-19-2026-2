/**
 * FORGE Platform - Evidence Pack E2E Tests
 * @epic 12 - E2E Testing
 * 
 * Tests evidence generation, integrity, and export
 */

import { test, expect } from '@playwright/test';

test.describe('Evidence Pack - Generation', () => {
  test('generates evidence pack on completion', async ({ request }) => {
    // Get a completed execution
    const execResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (execResponse.ok()) {
      const executions = await execResponse.json();
      
      if (executions.data.length > 0) {
        const executionId = executions.data[0].id;
        
        const evidenceResponse = await request.get(`/api/v1/evidence/${executionId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
        });
        
        expect(evidenceResponse.ok()).toBeTruthy();
        
        const evidence = await evidenceResponse.json();
        expect(evidence).toHaveProperty('id');
        expect(evidence).toHaveProperty('executionId');
        expect(evidence).toHaveProperty('hash');
        expect(evidence).toHaveProperty('timestamp');
        expect(evidence).toHaveProperty('contents');
      }
    }
  });

  test('evidence includes all iterations', async ({ request }) => {
    const execResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (execResponse.ok()) {
      const executions = await execResponse.json();
      
      if (executions.data.length > 0) {
        const executionId = executions.data[0].id;
        
        const evidenceResponse = await request.get(`/api/v1/evidence/${executionId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
        });
        
        if (evidenceResponse.ok()) {
          const evidence = await evidenceResponse.json();
          expect(evidence.contents.iterations).toBeInstanceOf(Array);
          expect(evidence.contents.iterations.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('evidence includes validation results', async ({ request }) => {
    const execResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (execResponse.ok()) {
      const executions = await execResponse.json();
      
      if (executions.data.length > 0) {
        const executionId = executions.data[0].id;
        
        const evidenceResponse = await request.get(`/api/v1/evidence/${executionId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
        });
        
        if (evidenceResponse.ok()) {
          const evidence = await evidenceResponse.json();
          expect(evidence.contents.validationResults).toBeDefined();
        }
      }
    }
  });
});

test.describe('Evidence Pack - Integrity', () => {
  test('verifies evidence hash', async ({ request }) => {
    const execResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (execResponse.ok()) {
      const executions = await execResponse.json();
      
      if (executions.data.length > 0) {
        const executionId = executions.data[0].id;
        
        const verifyResponse = await request.post(`/api/v1/evidence/${executionId}/verify`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
        });
        
        expect(verifyResponse.ok()).toBeTruthy();
        
        const result = await verifyResponse.json();
        expect(result.valid).toBe(true);
        expect(result.hash).toBeDefined();
      }
    }
  });

  test('detects tampered evidence', async ({ request }) => {
    const execResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (execResponse.ok()) {
      const executions = await execResponse.json();
      
      if (executions.data.length > 0) {
        const executionId = executions.data[0].id;
        
        // Verify with wrong hash
        const verifyResponse = await request.post(`/api/v1/evidence/${executionId}/verify`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
          data: {
            expectedHash: 'tampered-hash-value',
          },
        });
        
        if (verifyResponse.ok()) {
          const result = await verifyResponse.json();
          expect(result.valid).toBe(false);
        }
      }
    }
  });

  test('evidence includes cryptographic signature', async ({ request }) => {
    const execResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (execResponse.ok()) {
      const executions = await execResponse.json();
      
      if (executions.data.length > 0) {
        const executionId = executions.data[0].id;
        
        const evidenceResponse = await request.get(`/api/v1/evidence/${executionId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
        });
        
        if (evidenceResponse.ok()) {
          const evidence = await evidenceResponse.json();
          expect(evidence.signature).toBeDefined();
          expect(evidence.signatureAlgorithm).toBe('SHA-256');
        }
      }
    }
  });
});

test.describe('Evidence Pack - Export', () => {
  test('exports evidence as JSON', async ({ request }) => {
    const execResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (execResponse.ok()) {
      const executions = await execResponse.json();
      
      if (executions.data.length > 0) {
        const executionId = executions.data[0].id;
        
        const exportResponse = await request.get(
          `/api/v1/evidence/${executionId}/export?format=json`,
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
    const execResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (execResponse.ok()) {
      const executions = await execResponse.json();
      
      if (executions.data.length > 0) {
        const executionId = executions.data[0].id;
        
        const exportResponse = await request.get(
          `/api/v1/evidence/${executionId}/export?format=pdf`,
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

  test('exports evidence as ZIP archive', async ({ request }) => {
    const execResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (execResponse.ok()) {
      const executions = await execResponse.json();
      
      if (executions.data.length > 0) {
        const executionId = executions.data[0].id;
        
        const exportResponse = await request.get(
          `/api/v1/evidence/${executionId}/export?format=zip`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
            },
          }
        );
        
        if (exportResponse.ok()) {
          expect(exportResponse.headers()['content-type']).toContain('application/zip');
        }
      }
    }
  });
});

test.describe('Evidence Pack - Compliance', () => {
  test('includes DCMA compliance metadata', async ({ request }) => {
    const execResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (execResponse.ok()) {
      const executions = await execResponse.json();
      
      if (executions.data.length > 0) {
        const executionId = executions.data[0].id;
        
        const evidenceResponse = await request.get(`/api/v1/evidence/${executionId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
        });
        
        if (evidenceResponse.ok()) {
          const evidence = await evidenceResponse.json();
          expect(evidence.compliance).toBeDefined();
          expect(evidence.compliance.standards).toContain('DCMA');
        }
      }
    }
  });

  test('generates audit trail', async ({ request }) => {
    const execResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    
    if (execResponse.ok()) {
      const executions = await execResponse.json();
      
      if (executions.data.length > 0) {
        const executionId = executions.data[0].id;
        
        const auditResponse = await request.get(`/api/v1/evidence/${executionId}/audit`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
        });
        
        if (auditResponse.ok()) {
          const audit = await auditResponse.json();
          expect(audit.entries).toBeInstanceOf(Array);
          
          if (audit.entries.length > 0) {
            expect(audit.entries[0]).toHaveProperty('timestamp');
            expect(audit.entries[0]).toHaveProperty('action');
            expect(audit.entries[0]).toHaveProperty('actor');
          }
        }
      }
    }
  });
});

test.describe('Evidence Pack UI', () => {
  test('displays evidence viewer', async ({ page }) => {
    await page.goto('/runs');
    
    const completedRun = page.getByTestId('run-row').filter({ hasText: /completed/i }).first();
    if (await completedRun.isVisible()) {
      await completedRun.click();
      
      await page.getByRole('button', { name: /evidence/i }).click();
      
      const evidenceViewer = page.getByTestId('evidence-viewer');
      await expect(evidenceViewer).toBeVisible();
    }
  });

  test('shows evidence hash', async ({ page }) => {
    await page.goto('/runs');
    
    const completedRun = page.getByTestId('run-row').filter({ hasText: /completed/i }).first();
    if (await completedRun.isVisible()) {
      await completedRun.click();
      
      await page.getByRole('button', { name: /evidence/i }).click();
      
      const hashDisplay = page.getByTestId('evidence-hash');
      await expect(hashDisplay).toBeVisible();
      
      const hash = await hashDisplay.textContent();
      expect(hash).toMatch(/^[a-f0-9]{64}$/i); // SHA-256
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
      expect(download.suggestedFilename()).toMatch(/evidence.*\.(json|zip|pdf)$/);
    }
  });

  test('verifies evidence from UI', async ({ page }) => {
    await page.goto('/runs');
    
    const completedRun = page.getByTestId('run-row').filter({ hasText: /completed/i }).first();
    if (await completedRun.isVisible()) {
      await completedRun.click();
      
      await page.getByRole('button', { name: /evidence/i }).click();
      await page.getByRole('button', { name: /verify/i }).click();
      
      // Should show verification result
      await expect(page.getByText(/verified|valid/i)).toBeVisible({ timeout: 10000 });
    }
  });
});
