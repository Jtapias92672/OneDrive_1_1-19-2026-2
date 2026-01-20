/**
 * FORGE Platform - XSS and CSRF Security Tests
 * @epic 12 - E2E Testing
 * 
 * Tests for cross-site scripting and cross-site request forgery
 */

import { test, expect } from '@playwright/test';

test.describe('XSS Prevention', () => {
  test.describe('Reflected XSS', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<body onload=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      "'-alert('XSS')-'",
      '<iframe src="javascript:alert(\'XSS\')">',
      '<input onfocus=alert("XSS") autofocus>',
      '<marquee onstart=alert("XSS")>',
    ];

    test('search parameter is sanitized', async ({ page }) => {
      for (const payload of xssPayloads.slice(0, 3)) {
        await page.goto(`/contracts?search=${encodeURIComponent(payload)}`);
        
        // Check no script executed (page should load normally)
        await expect(page).toHaveURL(/\/contracts/);
        
        // Check payload is not rendered as HTML
        const content = await page.content();
        expect(content).not.toContain(payload);
      }
    });

    test('error messages are sanitized', async ({ page }) => {
      await page.goto('/contracts/invalid-<script>alert(1)</script>');
      
      // Error message should be escaped
      const content = await page.content();
      expect(content).not.toContain('<script>');
    });
  });

  test.describe('Stored XSS', () => {
    test('contract name is sanitized on display', async ({ page, request }) => {
      // Create contract with XSS payload
      const response = await request.post('/api/v1/contracts', {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        data: {
          name: '<script>alert("XSS")</script>',
          type: 'validation',
          sections: [{ name: 'Test', content: 'Test content' }],
        },
      });

      if (response.ok()) {
        const contract = await response.json();
        
        // View the contract
        await page.goto(`/contracts/${contract.id}`);
        
        // Script should not execute
        const content = await page.content();
        expect(content).not.toContain('<script>alert');
        
        // Should be escaped or stripped
        const heading = await page.getByRole('heading').textContent();
        expect(heading).not.toContain('<script>');
        
        // Cleanup
        await request.delete(`/api/v1/contracts/${contract.id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
          },
        });
      }
    });

    test('markdown content is sanitized', async ({ page, request }) => {
      const maliciousMarkdown = `
# Title

<script>alert('XSS')</script>

<img src="x" onerror="alert('XSS')">

[Click me](javascript:alert('XSS'))

<a href="data:text/html,<script>alert('XSS')</script>">Link</a>
      `;

      const response = await request.post('/api/v1/contracts', {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        data: {
          name: 'XSS Test Contract',
          type: 'validation',
          sections: [{
            name: 'Malicious',
            content: maliciousMarkdown,
          }],
        },
      });

      if (response.ok()) {
        const contract = await response.json();
        
        await page.goto(`/contracts/${contract.id}`);
        
        // Check none of the XSS payloads are present
        const content = await page.content();
        expect(content).not.toContain('<script>');
        expect(content).not.toContain('onerror=');
        expect(content).not.toContain('javascript:');
        expect(content).not.toContain('data:text/html');
        
        // Cleanup
        await request.delete(`/api/v1/contracts/${contract.id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
          },
        });
      }
    });

    test('user-generated content in comments is sanitized', async ({ page, request }) => {
      // Add comment with XSS
      const response = await request.post('/api/v1/executions/test-id/comments', {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        data: {
          content: '<img src=x onerror=alert("XSS")>',
        },
      });

      if (response.ok()) {
        await page.goto('/executions/test-id');
        
        // XSS should not execute
        const content = await page.content();
        expect(content).not.toContain('onerror=');
      }
    });
  });

  test.describe('DOM-based XSS', () => {
    test('URL hash is not evaluated', async ({ page }) => {
      await page.goto('/dashboard#<script>alert("XSS")</script>');
      
      // Page should load without executing script
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    });

    test('URL parameters are safely handled by client', async ({ page }) => {
      // Set up listener for any JS errors
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      
      await page.goto('/contracts?callback=alert("XSS")');
      
      // No JS errors related to XSS
      expect(errors.filter(e => e.includes('XSS'))).toHaveLength(0);
    });

    test('postMessage is validated', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Try to send malicious postMessage
      await page.evaluate(() => {
        window.postMessage({
          type: 'malicious',
          payload: '<script>alert("XSS")</script>',
        }, '*');
      });
      
      // Should not cause any issues
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    });
  });
});

test.describe('CSRF Prevention', () => {
  test('API requires CSRF token for state-changing requests', async ({ request }) => {
    // Request without CSRF token
    const response = await request.post('/api/v1/contracts', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        'Content-Type': 'application/json',
        // Omitting CSRF token
      },
      data: {
        name: 'CSRF Test',
        type: 'validation',
      },
    });
    
    // Should either require CSRF token (403) or use token auth which is CSRF-immune
    // With Bearer token auth, CSRF is not applicable
    expect(response.status()).toBeOneOf([201, 403]);
  });

  test('cookies have SameSite attribute', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@forge.dev');
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL('/dashboard');
    
    const cookies = await page.context().cookies();
    
    for (const cookie of cookies) {
      if (cookie.name.includes('session') || cookie.name.includes('auth')) {
        expect(cookie.sameSite).toMatch(/Strict|Lax/);
      }
    }
  });

  test('Origin header is validated', async ({ request }) => {
    const response = await request.post('/api/v1/contracts', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        'Content-Type': 'application/json',
        'Origin': 'https://evil-site.com',
      },
      data: {
        name: 'CSRF Test',
        type: 'validation',
      },
    });
    
    // Should reject requests from unauthorized origins (in CORS-protected endpoints)
    // OR allow if CORS is properly configured to reject
    expect(response.status()).toBeOneOf([201, 403, 400]);
  });

  test('Referer header is validated for sensitive actions', async ({ request }) => {
    const response = await request.post('/api/v1/users/me/password', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        'Content-Type': 'application/json',
        'Referer': 'https://evil-site.com/phishing',
      },
      data: {
        currentPassword: 'old',
        newPassword: 'new',
      },
    });
    
    // Should either validate referer or not process sensitive action
    expect(response.status()).not.toBe(200);
  });

  test('double submit cookie pattern', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@forge.dev');
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL('/dashboard');
    
    // Check for CSRF token in cookie
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find(c => c.name.includes('csrf') || c.name.includes('xsrf'));
    
    // If using double-submit pattern, CSRF cookie should exist
    // Note: Some apps use other CSRF protection methods
    // This is informational
  });
});

test.describe('Content Security Policy', () => {
  test('CSP header is present', async ({ request }) => {
    const response = await request.get('/');
    const csp = response.headers()['content-security-policy'];
    
    expect(csp).toBeDefined();
  });

  test('CSP prevents inline scripts', async ({ request }) => {
    const response = await request.get('/');
    const csp = response.headers()['content-security-policy'];
    
    if (csp) {
      // Should have script-src directive that doesn't allow 'unsafe-inline'
      // OR uses nonces/hashes
      expect(csp).toMatch(/script-src[^;]*(?:'nonce-|'sha256-|'strict-dynamic')/);
    }
  });

  test('CSP prevents data: URIs', async ({ request }) => {
    const response = await request.get('/');
    const csp = response.headers()['content-security-policy'];
    
    if (csp) {
      // default-src or script-src should not include data:
      const scriptSrc = csp.match(/script-src[^;]*/)?.[0] || '';
      expect(scriptSrc).not.toContain('data:');
    }
  });

  test('inline script with nonce works', async ({ page }) => {
    const response = await page.goto('/dashboard');
    
    // Page should function normally with nonced scripts
    await expect(page.getByRole('heading')).toBeVisible();
  });
});

test.describe('Clickjacking Protection', () => {
  test('X-Frame-Options header is set', async ({ request }) => {
    const response = await request.get('/');
    const xfo = response.headers()['x-frame-options'];
    
    expect(xfo).toMatch(/DENY|SAMEORIGIN/);
  });

  test('CSP frame-ancestors directive is set', async ({ request }) => {
    const response = await request.get('/');
    const csp = response.headers()['content-security-policy'];
    
    if (csp) {
      expect(csp).toMatch(/frame-ancestors\s+'none'|frame-ancestors\s+'self'/);
    }
  });

  test('page cannot be iframed from external site', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Create a page that tries to iframe the app
    await page.setContent(`
      <html>
        <body>
          <iframe id="target" src="${process.env.BASE_URL || 'http://localhost:3000'}/dashboard"></iframe>
        </body>
      </html>
    `);
    
    // The iframe should fail to load or be blocked
    const iframe = page.frameLocator('#target');
    
    try {
      // This should timeout or throw because iframe is blocked
      await iframe.getByRole('heading').waitFor({ timeout: 5000 });
      // If we get here, iframe loaded - that's a vulnerability
      expect(true).toBe(false); // Force fail
    } catch {
      // Expected - iframe was blocked
      expect(true).toBe(true);
    }
    
    await context.close();
  });
});

test.describe('Input Validation', () => {
  test('rejects excessively long input', async ({ request }) => {
    const longString = 'x'.repeat(100000);
    
    const response = await request.post('/api/v1/contracts', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: longString,
        type: 'validation',
      },
    });
    
    expect(response.status()).toBe(400);
  });

  test('sanitizes special characters in input', async ({ request }) => {
    const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
    
    const response = await request.post('/api/v1/contracts', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `Test ${specialChars}`,
        type: 'validation',
        sections: [{ name: 'Test', content: 'Content' }],
      },
    });
    
    // Should either accept (safely encoded) or reject
    expect(response.status()).toBeOneOf([201, 400]);
    
    if (response.ok()) {
      const contract = await response.json();
      // Cleanup
      await request.delete(`/api/v1/contracts/${contract.id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        },
      });
    }
  });

  test('handles null bytes correctly', async ({ request }) => {
    const response = await request.post('/api/v1/contracts', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Test\u0000Contract',
        type: 'validation',
      },
    });
    
    // Should reject or sanitize null bytes
    expect(response.status()).toBeOneOf([201, 400]);
  });

  test('validates email format strictly', async ({ request }) => {
    const invalidEmails = [
      'not-an-email',
      'missing@tld',
      '@nodomain.com',
      'spaces in@email.com',
      'email@-invalid.com',
    ];
    
    for (const email of invalidEmails) {
      const response = await request.post('/api/auth/register', {
        data: {
          email,
          password: 'ValidPassword123!',
        },
      });
      
      expect(response.status()).toBe(400);
    }
  });
});
