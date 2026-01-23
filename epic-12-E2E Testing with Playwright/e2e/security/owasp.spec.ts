/**
 * FORGE Platform - OWASP Security Tests
 * @epic 12 - E2E Testing
 * 
 * Tests for OWASP Top 10 vulnerabilities
 */

import { test, expect } from '@playwright/test';

test.describe('OWASP A01 - Broken Access Control', () => {
  test('prevents vertical privilege escalation', async ({ request }) => {
    // Regular user should not access admin endpoints
    const response = await request.get('/api/v1/admin/users', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
      },
    });
    
    expect(response.status()).toBe(403);
  });

  test('prevents horizontal privilege escalation', async ({ request }) => {
    // User A should not access User B's resources
    const response = await request.get('/api/v1/users/other-user-id/contracts', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
      },
    });
    
    expect(response.status()).toBeOneOf([403, 404]);
  });

  test('enforces resource ownership', async ({ request }) => {
    // Try to modify another user's contract
    const response = await request.patch('/api/v1/contracts/other-users-contract', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
      },
      data: {
        name: 'Hijacked Contract',
      },
    });
    
    expect(response.status()).toBeOneOf([403, 404]);
  });

  test('prevents IDOR attacks', async ({ request }) => {
    // Sequential ID guessing
    const ids = ['1', '2', '100', '9999'];
    
    for (const id of ids) {
      const response = await request.get(`/api/v1/contracts/${id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        },
      });
      
      // Should not expose unauthorized resources
      if (response.status() === 200) {
        const body = await response.json();
        expect(body.ownerId).toBe(process.env.TEST_USER_ID);
      }
    }
  });
});

test.describe('OWASP A02 - Cryptographic Failures', () => {
  test('enforces HTTPS', async ({ request }) => {
    // HTTP should redirect to HTTPS in production
    if (process.env.TEST_ENV === 'production') {
      const response = await request.get('http://api.forge.dev/health');
      expect(response.url()).toMatch(/^https:/);
    }
  });

  test('uses secure cookies', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@forge.dev');
    await page.getByLabel(/password/i).fill('TestPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session'));
    
    if (sessionCookie) {
      expect(sessionCookie.secure).toBe(true);
      expect(sessionCookie.httpOnly).toBe(true);
      expect(sessionCookie.sameSite).toBe('Strict');
    }
  });

  test('does not expose sensitive data in responses', async ({ request }) => {
    const response = await request.get('/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
      },
    });
    
    const body = await response.json();
    
    // Should not contain password or sensitive tokens
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('apiKey');
    expect(JSON.stringify(body)).not.toMatch(/secret|private_key/i);
  });
});

test.describe('OWASP A03 - Injection', () => {
  test('prevents SQL injection in search', async ({ request }) => {
    const payloads = [
      "'; DROP TABLE contracts; --",
      "1' OR '1'='1",
      "1; SELECT * FROM users",
      "UNION SELECT * FROM users--",
    ];
    
    for (const payload of payloads) {
      const response = await request.get(`/api/v1/contracts?search=${encodeURIComponent(payload)}`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        },
      });
      
      // Should not cause server error
      expect(response.status()).not.toBe(500);
      
      // Response should be normal (empty or filtered)
      if (response.ok()) {
        const body = await response.json();
        expect(body.data).toBeInstanceOf(Array);
      }
    }
  });

  test('prevents NoSQL injection', async ({ request }) => {
    const payloads = [
      '{"$gt": ""}',
      '{"$ne": null}',
      '{"$where": "this.password.length > 0"}',
    ];
    
    for (const payload of payloads) {
      const response = await request.get(`/api/v1/contracts?filter=${encodeURIComponent(payload)}`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        },
      });
      
      expect(response.status()).not.toBe(500);
    }
  });

  test('prevents command injection', async ({ request }) => {
    const payloads = [
      '; ls -la',
      '| cat /etc/passwd',
      '`whoami`',
      '$(cat /etc/passwd)',
    ];
    
    for (const payload of payloads) {
      const response = await request.post('/api/v1/contracts', {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        },
        data: {
          name: payload,
          type: 'validation',
        },
      });
      
      expect(response.status()).not.toBe(500);
    }
  });

  test('prevents LDAP injection', async ({ request }) => {
    const payloads = [
      '*)(uid=*',
      'admin)(&)',
      '*)((|userPassword=*)',
    ];
    
    for (const payload of payloads) {
      const response = await request.get(`/api/v1/users?username=${encodeURIComponent(payload)}`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
        },
      });
      
      expect(response.status()).not.toBe(500);
    }
  });
});

test.describe('OWASP A04 - Insecure Design', () => {
  test('rate limits login attempts', async ({ request }) => {
    const attempts = [];
    
    for (let i = 0; i < 20; i++) {
      attempts.push(
        request.post('/api/auth/login', {
          data: {
            email: 'test@forge.dev',
            password: 'wrongpassword',
          },
        })
      );
    }
    
    const responses = await Promise.all(attempts);
    const rateLimited = responses.some(r => r.status() === 429);
    
    // Should eventually rate limit
    expect(rateLimited).toBe(true);
  });

  test('validates file upload types', async ({ request }) => {
    // Try to upload executable
    const response = await request.post('/api/v1/contracts/import', {
      multipart: {
        file: {
          name: 'malicious.exe',
          mimeType: 'application/x-msdownload',
          buffer: Buffer.from('MZ...fake exe content'),
        },
      },
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
      },
    });
    
    expect(response.status()).toBe(400);
  });

  test('limits request body size', async ({ request }) => {
    // Create a very large payload
    const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
    
    const response = await request.post('/api/v1/contracts', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
      },
      data: {
        name: 'Large Contract',
        content: largeContent,
      },
    });
    
    expect(response.status()).toBeOneOf([400, 413]);
  });
});

test.describe('OWASP A05 - Security Misconfiguration', () => {
  test('does not expose stack traces', async ({ request }) => {
    const response = await request.get('/api/v1/contracts/invalid-id-format!!!', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
      },
    });
    
    const body = await response.text();
    
    // Should not contain stack trace
    expect(body).not.toContain('at ');
    expect(body).not.toContain('.ts:');
    expect(body).not.toContain('.js:');
    expect(body).not.toContain('node_modules');
  });

  test('has security headers', async ({ request }) => {
    const response = await request.get('/api/v1/health');
    const headers = response.headers();
    
    // Check security headers
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
    expect(headers['x-xss-protection']).toBeDefined();
    expect(headers['strict-transport-security']).toBeDefined();
    expect(headers['content-security-policy']).toBeDefined();
  });

  test('does not expose server information', async ({ request }) => {
    const response = await request.get('/api/v1/health');
    const headers = response.headers();
    
    // Should not expose server version
    expect(headers['server']).not.toMatch(/nginx\/\d|Apache\/\d|Express/);
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('disables directory listing', async ({ request }) => {
    const response = await request.get('/static/');
    
    const body = await response.text();
    expect(body).not.toContain('Index of');
    expect(body).not.toContain('Directory listing');
  });
});

test.describe('OWASP A06 - Vulnerable Components', () => {
  test('API returns current version', async ({ request }) => {
    const response = await request.get('/api/v1/version');
    
    if (response.ok()) {
      const body = await response.json();
      expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
    }
  });
});

test.describe('OWASP A07 - Authentication Failures', () => {
  test('requires strong password', async ({ request }) => {
    const weakPasswords = [
      '123456',
      'password',
      'qwerty',
      'abc123',
    ];
    
    for (const password of weakPasswords) {
      const response = await request.post('/api/auth/register', {
        data: {
          email: `test_${Date.now()}@forge.dev`,
          password,
        },
      });
      
      expect(response.status()).toBe(400);
    }
  });

  test('invalidates session on logout', async ({ request }) => {
    // Login to get token
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'test@forge.dev',
        password: process.env.TEST_USER_PASSWORD,
      },
    });
    
    const { token } = await loginResponse.json();
    
    // Logout
    await request.post('/api/auth/logout', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    // Try to use invalidated token
    const response = await request.get('/api/v1/contracts', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    expect(response.status()).toBe(401);
  });

  test('tokens expire', async ({ request }) => {
    // Use an expired token (if available from env)
    const expiredToken = process.env.TEST_EXPIRED_TOKEN;
    
    if (expiredToken) {
      const response = await request.get('/api/v1/contracts', {
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });
      
      expect(response.status()).toBe(401);
    }
  });
});

test.describe('OWASP A08 - Software and Data Integrity', () => {
  test('validates JWT signature', async ({ request }) => {
    // Tampered JWT
    const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.TAMPERED';
    
    const response = await request.get('/api/v1/contracts', {
      headers: {
        'Authorization': `Bearer ${tamperedToken}`,
      },
    });
    
    expect(response.status()).toBe(401);
  });

  test('validates evidence pack integrity', async ({ request }) => {
    // Get an evidence pack
    const execResponse = await request.get('/api/v1/executions?status=completed&limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
      },
    });
    
    if (execResponse.ok()) {
      const executions = await execResponse.json();
      if (executions.data.length > 0) {
        const evidenceResponse = await request.get(
          `/api/v1/evidence/${executions.data[0].id}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
            },
          }
        );
        
        if (evidenceResponse.ok()) {
          const evidence = await evidenceResponse.json();
          expect(evidence.hash).toBeDefined();
          expect(evidence.signature).toBeDefined();
        }
      }
    }
  });
});

test.describe('OWASP A09 - Security Logging and Monitoring', () => {
  test('logs authentication failures', async ({ request }) => {
    // Multiple failed logins
    for (let i = 0; i < 5; i++) {
      await request.post('/api/auth/login', {
        data: {
          email: 'test@forge.dev',
          password: 'wrongpassword',
        },
      });
    }
    
    // Check audit log (admin only)
    if (process.env.TEST_ADMIN_TOKEN) {
      const auditResponse = await request.get('/api/v1/admin/audit?type=auth_failure', {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
        },
      });
      
      if (auditResponse.ok()) {
        const audit = await auditResponse.json();
        expect(audit.entries.length).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('OWASP A10 - Server-Side Request Forgery', () => {
  test('prevents SSRF in URL inputs', async ({ request }) => {
    const maliciousUrls = [
      'http://localhost:22',
      'http://127.0.0.1:6379',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]/',
      'file:///etc/passwd',
    ];
    
    for (const url of maliciousUrls) {
      const response = await request.post('/api/v1/import/url', {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        },
        data: {
          url,
        },
      });
      
      expect(response.status()).toBe(400);
    }
  });

  test('validates webhook URLs', async ({ request }) => {
    const response = await request.post('/api/v1/webhooks', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
      },
      data: {
        url: 'http://internal-service.local/callback',
        events: ['execution.completed'],
      },
    });
    
    expect(response.status()).toBe(400);
  });
});
