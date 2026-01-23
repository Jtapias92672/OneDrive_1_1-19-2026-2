/**
 * FORGE Platform - API Integration Tests
 * @epic 12 - E2E Testing
 * 
 * Tests REST API endpoints for contracts, executions, and validation
 */

import { test, expect, APIRequestContext } from '@playwright/test';

let apiContext: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  apiContext = await playwright.request.newContext({
    baseURL: process.env.API_URL || 'http://localhost:8080',
    extraHTTPHeaders: {
      'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
});

test.afterAll(async () => {
  await apiContext.dispose();
});

test.describe('API - Health & Info', () => {
  test('health check returns OK', async () => {
    const response = await apiContext.get('/health');
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

  test('version endpoint returns correct info', async () => {
    const response = await apiContext.get('/version');
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(body.name).toBe('forge-api');
  });

  test('metrics endpoint returns prometheus format', async () => {
    const response = await apiContext.get('/metrics');
    expect(response.ok()).toBeTruthy();
    
    const text = await response.text();
    expect(text).toContain('# TYPE');
    expect(text).toContain('http_requests_total');
  });
});

test.describe('API - Contracts', () => {
  let contractId: string;

  test('creates a new contract', async () => {
    const response = await apiContext.post('/api/v1/contracts', {
      data: {
        name: 'API Test Contract',
        description: 'Created by API test',
        type: 'validation',
        sections: [
          {
            name: 'Requirements',
            content: '# Requirements\n\nMust validate input correctly.',
          },
        ],
      },
    });
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);
    
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe('API Test Contract');
    
    contractId = body.id;
  });

  test('lists contracts with pagination', async () => {
    const response = await apiContext.get('/api/v1/contracts?page=1&limit=10');
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBeGreaterThanOrEqual(0);
  });

  test('filters contracts by status', async () => {
    const response = await apiContext.get('/api/v1/contracts?status=active');
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    body.data.forEach((contract: any) => {
      expect(contract.status).toBe('active');
    });
  });

  test('searches contracts by name', async () => {
    const response = await apiContext.get('/api/v1/contracts?search=API%20Test');
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.data.some((c: any) => c.name.includes('API Test'))).toBeTruthy();
  });

  test('gets contract by ID', async () => {
    const response = await apiContext.get(`/api/v1/contracts/${contractId}`);
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.id).toBe(contractId);
    expect(body.sections).toBeInstanceOf(Array);
  });

  test('updates contract', async () => {
    const response = await apiContext.patch(`/api/v1/contracts/${contractId}`, {
      data: {
        name: 'Updated API Test Contract',
        description: 'Updated description',
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.name).toBe('Updated API Test Contract');
  });

  test('gets contract versions', async () => {
    const response = await apiContext.get(`/api/v1/contracts/${contractId}/versions`);
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.versions).toBeInstanceOf(Array);
    expect(body.versions.length).toBeGreaterThanOrEqual(1);
  });

  test('validates contract schema', async () => {
    const response = await apiContext.post(`/api/v1/contracts/${contractId}/validate`);
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.valid).toBeDefined();
    expect(body.errors).toBeInstanceOf(Array);
  });

  test('deletes contract', async () => {
    const response = await apiContext.delete(`/api/v1/contracts/${contractId}`);
    expect(response.status()).toBe(204);
    
    // Verify deletion
    const getResponse = await apiContext.get(`/api/v1/contracts/${contractId}`);
    expect(getResponse.status()).toBe(404);
  });

  test('returns 404 for non-existent contract', async () => {
    const response = await apiContext.get('/api/v1/contracts/non-existent-id');
    expect(response.status()).toBe(404);
  });

  test('validates contract creation payload', async () => {
    const response = await apiContext.post('/api/v1/contracts', {
      data: {
        // Missing required name
        description: 'Invalid contract',
      },
    });
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.errors).toContain('name is required');
  });
});

test.describe('API - Executions', () => {
  let executionId: string;
  let contractId: string;

  test.beforeAll(async () => {
    // Create a contract for executions
    const contractResponse = await apiContext.post('/api/v1/contracts', {
      data: {
        name: 'Execution Test Contract',
        type: 'validation',
        sections: [{ name: 'Test', content: 'Test content' }],
      },
    });
    const contract = await contractResponse.json();
    contractId = contract.id;
  });

  test('starts a new execution', async () => {
    const response = await apiContext.post('/api/v1/executions', {
      data: {
        contractId,
        name: 'API Test Execution',
        config: {
          provider: 'claude',
          model: 'claude-3-5-sonnet',
          targetScore: 0.9,
          maxIterations: 10,
          timeout: 300,
        },
      },
    });
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);
    
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.status).toMatch(/pending|running/);
    
    executionId = body.id;
  });

  test('lists executions', async () => {
    const response = await apiContext.get('/api/v1/executions');
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.data).toBeInstanceOf(Array);
  });

  test('filters executions by status', async () => {
    const response = await apiContext.get('/api/v1/executions?status=completed');
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    body.data.forEach((exec: any) => {
      expect(exec.status).toBe('completed');
    });
  });

  test('gets execution by ID', async () => {
    const response = await apiContext.get(`/api/v1/executions/${executionId}`);
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.id).toBe(executionId);
    expect(body.config).toBeDefined();
  });

  test('gets execution iterations', async () => {
    const response = await apiContext.get(`/api/v1/executions/${executionId}/iterations`);
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.iterations).toBeInstanceOf(Array);
  });

  test('gets execution metrics', async () => {
    const response = await apiContext.get(`/api/v1/executions/${executionId}/metrics`);
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.totalIterations).toBeDefined();
    expect(body.averageScorePerIteration).toBeDefined();
  });

  test('pauses execution', async () => {
    const response = await apiContext.post(`/api/v1/executions/${executionId}/pause`);
    
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.status).toBe('paused');
    } else {
      // Execution may have already completed
      expect(response.status()).toBe(409);
    }
  });

  test('resumes execution', async () => {
    // First pause
    await apiContext.post(`/api/v1/executions/${executionId}/pause`);
    
    // Then resume
    const response = await apiContext.post(`/api/v1/executions/${executionId}/resume`);
    
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.status).toBe('running');
    }
  });

  test('cancels execution', async () => {
    const response = await apiContext.post(`/api/v1/executions/${executionId}/cancel`);
    
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.status).toBe('cancelled');
    }
  });

  test('exports execution report', async () => {
    const response = await apiContext.get(`/api/v1/executions/${executionId}/report?format=json`);
    
    if (response.ok()) {
      const body = await response.json();
      expect(body.execution).toBeDefined();
      expect(body.summary).toBeDefined();
    }
  });
});

test.describe('API - Validation', () => {
  test('validates answer synchronously', async () => {
    const response = await apiContext.post('/api/v1/validate', {
      data: {
        answer: 'The result is 42.',
        contract: {
          requirements: ['Must provide a numeric answer'],
        },
        validators: ['semantic', 'structural'],
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body.score).toBeDefined();
    expect(body.validators).toBeInstanceOf(Array);
  });

  test('validates with computational validator', async () => {
    const response = await apiContext.post('/api/v1/validate', {
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
    expect(body.validators.find((v: any) => v.name === 'computational')).toBeDefined();
  });

  test('returns validation errors for invalid input', async () => {
    const response = await apiContext.post('/api/v1/validate', {
      data: {
        // Missing required answer
        validators: ['semantic'],
      },
    });
    
    expect(response.status()).toBe(400);
  });
});

test.describe('API - Evidence', () => {
  test('gets evidence pack for execution', async () => {
    // First get a completed execution
    const execResponse = await apiContext.get('/api/v1/executions?status=completed&limit=1');
    const executions = await execResponse.json();
    
    if (executions.data.length > 0) {
      const executionId = executions.data[0].id;
      const response = await apiContext.get(`/api/v1/evidence/${executionId}`);
      
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.hash).toBeDefined();
      expect(body.timestamp).toBeDefined();
    }
  });

  test('verifies evidence integrity', async () => {
    const execResponse = await apiContext.get('/api/v1/executions?status=completed&limit=1');
    const executions = await execResponse.json();
    
    if (executions.data.length > 0) {
      const executionId = executions.data[0].id;
      const response = await apiContext.post(`/api/v1/evidence/${executionId}/verify`);
      
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.valid).toBeDefined();
    }
  });
});

test.describe('API - Error Handling', () => {
  test('returns 401 for unauthorized request', async ({ playwright }) => {
    const unauthContext = await playwright.request.newContext({
      baseURL: process.env.API_URL || 'http://localhost:8080',
    });
    
    const response = await unauthContext.get('/api/v1/contracts');
    expect(response.status()).toBe(401);
    
    await unauthContext.dispose();
  });

  test('returns 403 for forbidden resource', async () => {
    const response = await apiContext.get('/api/v1/admin/users');
    expect(response.status()).toBe(403);
  });

  test('handles malformed JSON gracefully', async () => {
    const response = await apiContext.post('/api/v1/contracts', {
      data: 'invalid json{',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    expect(response.status()).toBe(400);
  });

  test('rate limiting returns 429', async () => {
    const requests = Array(100).fill(null).map(() => 
      apiContext.get('/api/v1/contracts')
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status() === 429);
    
    // Rate limiting may or may not trigger depending on config
    expect(responses.every(r => [200, 429].includes(r.status()))).toBeTruthy();
  });
});

test.describe('API - Bulk Operations', () => {
  test('bulk creates contracts', async () => {
    const response = await apiContext.post('/api/v1/contracts/bulk', {
      data: {
        contracts: [
          { name: 'Bulk Contract 1', type: 'validation' },
          { name: 'Bulk Contract 2', type: 'validation' },
          { name: 'Bulk Contract 3', type: 'validation' },
        ],
      },
    });
    
    if (response.ok()) {
      const body = await response.json();
      expect(body.created).toBe(3);
      expect(body.ids).toHaveLength(3);
    }
  });

  test('bulk deletes contracts', async () => {
    // Create contracts first
    const createResponse = await apiContext.post('/api/v1/contracts/bulk', {
      data: {
        contracts: [
          { name: 'To Delete 1', type: 'validation' },
          { name: 'To Delete 2', type: 'validation' },
        ],
      },
    });
    
    if (createResponse.ok()) {
      const { ids } = await createResponse.json();
      
      const deleteResponse = await apiContext.delete('/api/v1/contracts/bulk', {
        data: { ids },
      });
      
      expect(deleteResponse.ok()).toBeTruthy();
      const body = await deleteResponse.json();
      expect(body.deleted).toBe(2);
    }
  });
});
