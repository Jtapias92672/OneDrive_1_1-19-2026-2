/**
 * Unit Tests: Output Sanitization
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.12 - Output Sanitization
 *
 * Tests OutputSanitizer for removing sensitive data from tool outputs.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  OutputSanitizer,
  getDefaultOutputSanitizer,
  sanitizeOutput,
  containsSensitiveData,
  OutputSanitizationOptions,
  RedactionPattern,
} from '../../sanitization/output.js';

describe('Output Sanitization (sanitization/output.ts)', () => {
  let sanitizer: OutputSanitizer;

  beforeEach(() => {
    sanitizer = new OutputSanitizer();
  });

  describe('Constructor', () => {
    it('should create with default options', () => {
      const s = new OutputSanitizer();
      const result = s.sanitize({ test: 'data' });
      expect(result.output).toBeDefined();
    });

    it('should create with custom options', () => {
      const s = new OutputSanitizer({
        removePII: false,
        removeSecrets: false,
      });
      const result = s.sanitize({ email: 'test@example.com' });
      // With PII removal disabled, email should still be there
      expect((result.output as Record<string, string>).email).toBe('test@example.com');
    });
  });

  describe('PII Redaction', () => {
    it('should redact email addresses', () => {
      const result = sanitizer.sanitize({
        message: 'Contact john.doe@example.com for details',
      });

      const output = result.output as Record<string, string>;
      expect(output.message).toContain('[EMAIL_REDACTED]');
      expect(output.message).not.toContain('john.doe@example.com');
    });

    it('should redact phone numbers', () => {
      const result = sanitizer.sanitize({
        phone: 'Call me at 555-123-4567',
      });

      const output = result.output as Record<string, string>;
      expect(output.phone).toContain('[PHONE_REDACTED]');
    });

    it('should redact phone numbers with country code', () => {
      const result = sanitizer.sanitize({
        phone: '+1-555-123-4567',
      });

      const output = result.output as Record<string, string>;
      expect(output.phone).toContain('[PHONE_REDACTED]');
    });

    it('should redact SSN', () => {
      const result = sanitizer.sanitize({
        data: 'SSN is 123-45-6789',
      });

      const output = result.output as Record<string, string>;
      expect(output.data).toContain('[SSN_REDACTED]');
    });

    it('should redact SSN without dashes', () => {
      const result = sanitizer.sanitize({
        data: 'SSN is 123456789',
      });

      const output = result.output as Record<string, string>;
      expect(output.data).toContain('[SSN_REDACTED]');
    });

    it('should redact credit card numbers', () => {
      const result = sanitizer.sanitize({
        payment: 'Card: 4111-1111-1111-1111',
      });

      const output = result.output as Record<string, string>;
      expect(output.payment).toContain('[CARD_REDACTED]');
    });

    it('should redact IP addresses', () => {
      const result = sanitizer.sanitize({
        log: 'Connection from 192.168.1.100',
      });

      const output = result.output as Record<string, string>;
      expect(output.log).toContain('[IP_REDACTED]');
    });

    it('should handle multiple PII in same string', () => {
      const result = sanitizer.sanitize({
        data: 'Email: test@test.com, Phone: 555-123-4567, IP: 10.0.0.1',
      });

      const output = result.output as Record<string, string>;
      expect(output.data).toContain('[EMAIL_REDACTED]');
      expect(output.data).toContain('[PHONE_REDACTED]');
      expect(output.data).toContain('[IP_REDACTED]');
    });
  });

  describe('Secret Redaction', () => {
    it('should redact API keys', () => {
      const result = sanitizer.sanitize({
        config: 'api_key: "sk_live_abcdefghijklmnopqrst"',
      });

      const output = result.output as Record<string, string>;
      expect(output.config).toContain('[API_KEY_REDACTED]');
    });

    it('should redact Bearer tokens', () => {
      const result = sanitizer.sanitize({
        header: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
      });

      const output = result.output as Record<string, string>;
      expect(output.header).toContain('[TOKEN_REDACTED]');
    });

    it('should redact AWS access keys', () => {
      const result = sanitizer.sanitize({
        key: 'AKIAIOSFODNN7EXAMPLE',
      });

      const output = result.output as Record<string, string>;
      expect(output.key).toContain('[AWS_KEY_REDACTED]');
    });

    it('should redact AWS secret keys', () => {
      const result = sanitizer.sanitize({
        config: 'aws_secret: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"',
      });

      const output = result.output as Record<string, string>;
      expect(output.config).toContain('[AWS_SECRET_REDACTED]');
    });

    it('should redact passwords', () => {
      const result = sanitizer.sanitize({
        login: 'password: "mysecretpassword123"',
      });

      const output = result.output as Record<string, string>;
      expect(output.login).toContain('[PASSWORD_REDACTED]');
    });

    it('should redact private keys', () => {
      const result = sanitizer.sanitize({
        key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...\n-----END PRIVATE KEY-----',
      });

      const output = result.output as Record<string, string>;
      expect(output.key).toContain('[PRIVATE_KEY_REDACTED]');
    });

    it('should redact RSA private keys', () => {
      const result = sanitizer.sanitize({
        key: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCA...\n-----END RSA PRIVATE KEY-----',
      });

      const output = result.output as Record<string, string>;
      expect(output.key).toContain('[PRIVATE_KEY_REDACTED]');
    });

    it('should redact connection strings', () => {
      const result = sanitizer.sanitize({
        db: 'mongodb://user:pass@localhost:27017/mydb',
      });

      const output = result.output as Record<string, string>;
      expect(output.db).toContain('[CONNECTION_STRING_REDACTED]');
    });

    it('should redact PostgreSQL connection strings', () => {
      const result = sanitizer.sanitize({
        db: 'postgres://user:pass@localhost:5432/mydb',
      });

      const output = result.output as Record<string, string>;
      expect(output.db).toContain('[CONNECTION_STRING_REDACTED]');
    });

    it('should redact Redis connection strings', () => {
      const result = sanitizer.sanitize({
        cache: 'redis://user:pass@localhost:6379',
      });

      const output = result.output as Record<string, string>;
      expect(output.cache).toContain('[CONNECTION_STRING_REDACTED]');
    });
  });

  describe('Path Redaction', () => {
    it('should redact home directory paths', () => {
      const result = sanitizer.sanitize({
        path: '/home/username/documents/file.txt',
      });

      const output = result.output as Record<string, string>;
      expect(output.path).toContain('[HOME_REDACTED]');
    });

    it('should redact macOS user paths', () => {
      const result = sanitizer.sanitize({
        path: '/Users/johndoe/Desktop/secret.txt',
      });

      const output = result.output as Record<string, string>;
      expect(output.path).toContain('[HOME_REDACTED]');
    });

    it('should redact sensitive /etc paths', () => {
      const result = sanitizer.sanitize({
        file: '/etc/passwd',
      });

      const output = result.output as Record<string, string>;
      expect(output.file).toContain('[SENSITIVE_REDACTED]');
    });

    it('should redact /etc/shadow', () => {
      const result = sanitizer.sanitize({
        file: '/etc/shadow',
      });

      const output = result.output as Record<string, string>;
      expect(output.file).toContain('[SENSITIVE_REDACTED]');
    });

    it('should redact Windows user paths', () => {
      const result = sanitizer.sanitize({
        path: 'C:\\Users\\johndoe\\Documents\\file.txt',
      });

      const output = result.output as Record<string, string>;
      expect(output.path).toContain('[REDACTED]');
    });
  });

  describe('Stack Trace Redaction', () => {
    it('should redact Node.js stack traces when enabled', () => {
      const s = new OutputSanitizer({ removeStackTraces: true });
      const result = s.sanitize({
        error: 'Error: Something failed\n    at Function.fn (/app/src/file.ts:42:15)',
      });

      const output = result.output as Record<string, string>;
      expect(output.error).toContain('[STACK_REDACTED]');
    });

    it('should redact Python stack traces when enabled', () => {
      const s = new OutputSanitizer({ removeStackTraces: true });
      const result = s.sanitize({
        error: 'Traceback (most recent call last):\n  File "/app/script.py", line 42',
      });

      const output = result.output as Record<string, string>;
      expect(output.error).toContain('[STACK_REDACTED]');
    });

    it('should not redact stack traces by default', () => {
      const result = sanitizer.sanitize({
        error: 'at Function.fn (/app/src/file.ts:42:15)',
      });

      const output = result.output as Record<string, string>;
      expect(output.error).toContain('Function.fn');
    });
  });

  describe('Sensitive Field Redaction', () => {
    it('should redact password fields', () => {
      const result = sanitizer.sanitize({
        password: 'supersecret123',
      });

      const output = result.output as Record<string, string>;
      expect(output.password).toBe('[REDACTED]');
    });

    it('should redact token fields', () => {
      const result = sanitizer.sanitize({
        token: 'abc123xyz',
      });

      const output = result.output as Record<string, string>;
      expect(output.token).toBe('[REDACTED]');
    });

    it('should redact apiKey fields', () => {
      const result = sanitizer.sanitize({
        apiKey: 'key-12345',
      });

      const output = result.output as Record<string, string>;
      expect(output.apiKey).toBe('[REDACTED]');
    });

    it('should redact api_key fields', () => {
      const result = sanitizer.sanitize({
        api_key: 'key-12345',
      });

      const output = result.output as Record<string, string>;
      expect(output.api_key).toBe('[REDACTED]');
    });

    it('should redact authorization fields', () => {
      const result = sanitizer.sanitize({
        authorization: 'Bearer token123',
      });

      const output = result.output as Record<string, string>;
      expect(output.authorization).toBe('[REDACTED]');
    });

    it('should redact credentials fields', () => {
      const result = sanitizer.sanitize({
        credentials: { user: 'admin', pass: 'secret' },
      });

      const output = result.output as Record<string, string>;
      expect(output.credentials).toBe('[REDACTED]');
    });

    it('should redact privateKey fields', () => {
      const result = sanitizer.sanitize({
        privateKey: '-----BEGIN KEY-----\n...\n-----END KEY-----',
      });

      const output = result.output as Record<string, string>;
      expect(output.privateKey).toBe('[REDACTED]');
    });

    it('should redact accessToken fields', () => {
      const result = sanitizer.sanitize({
        accessToken: 'access-123',
      });

      const output = result.output as Record<string, string>;
      expect(output.accessToken).toBe('[REDACTED]');
    });

    it('should redact refreshToken fields', () => {
      const result = sanitizer.sanitize({
        refreshToken: 'refresh-456',
      });

      const output = result.output as Record<string, string>;
      expect(output.refreshToken).toBe('[REDACTED]');
    });

    it('should redact sessionId fields', () => {
      const result = sanitizer.sanitize({
        sessionId: 'sess-789',
      });

      const output = result.output as Record<string, string>;
      expect(output.sessionId).toBe('[REDACTED]');
    });

    it('should redact cookie fields', () => {
      const result = sanitizer.sanitize({
        cookie: 'session=abc123; auth=xyz789',
      });

      const output = result.output as Record<string, string>;
      expect(output.cookie).toBe('[REDACTED]');
    });

    it('should redact ssn fields', () => {
      const result = sanitizer.sanitize({
        ssn: '123-45-6789',
      });

      const output = result.output as Record<string, string>;
      expect(output.ssn).toBe('[REDACTED]');
    });

    it('should redact creditCard fields', () => {
      const result = sanitizer.sanitize({
        creditCard: '4111111111111111',
      });

      const output = result.output as Record<string, string>;
      expect(output.creditCard).toBe('[REDACTED]');
    });
  });

  describe('Recursive Sanitization', () => {
    it('should sanitize nested objects', () => {
      const result = sanitizer.sanitize({
        user: {
          name: 'John',
          email: 'john@example.com',
        },
      });

      const output = result.output as Record<string, Record<string, string>>;
      expect(output.user!.email).toContain('[EMAIL_REDACTED]');
    });

    it('should sanitize arrays', () => {
      const result = sanitizer.sanitize({
        emails: ['user1@example.com', 'user2@example.com'],
      });

      const output = result.output as Record<string, string[]>;
      expect(output.emails![0]).toContain('[EMAIL_REDACTED]');
      expect(output.emails![1]).toContain('[EMAIL_REDACTED]');
    });

    it('should sanitize deeply nested structures', () => {
      const result = sanitizer.sanitize({
        level1: {
          level2: {
            level3: {
              config: 'api_key: "secret123abcdefghijklmnop"',
            },
          },
        },
      });

      const output = result.output as Record<string, Record<string, Record<string, Record<string, string>>>>;
      expect(output.level1!.level2!.level3!.config).toContain('[API_KEY_REDACTED]');
    });

    it('should handle null values', () => {
      const result = sanitizer.sanitize({
        data: null,
      });

      const output = result.output as Record<string, null>;
      expect(output.data).toBeNull();
    });

    it('should handle undefined values', () => {
      const result = sanitizer.sanitize({
        data: undefined,
      });

      const output = result.output as Record<string, undefined>;
      expect(output.data).toBeUndefined();
    });

    it('should handle numbers and booleans', () => {
      const result = sanitizer.sanitize({
        count: 42,
        active: true,
      });

      const output = result.output as Record<string, number | boolean>;
      expect(output.count).toBe(42);
      expect(output.active).toBe(true);
    });
  });

  describe('String Truncation', () => {
    it('should truncate long strings', () => {
      const longString = 'a'.repeat(200000);
      const result = sanitizer.sanitize({ data: longString });

      const output = result.output as Record<string, string>;
      expect(output.data!.length).toBeLessThan(200000);
      expect(output.data).toContain('[TRUNCATED]');
    });

    it('should not truncate strings under limit', () => {
      const shortString = 'a'.repeat(1000);
      const result = sanitizer.sanitize({ data: shortString });

      const output = result.output as Record<string, string>;
      expect(output.data).not.toContain('[TRUNCATED]');
    });

    it('should respect custom maxStringLength', () => {
      const s = new OutputSanitizer({ maxStringLength: 100 });
      const result = s.sanitize({ data: 'a'.repeat(200) });

      const output = result.output as Record<string, string>;
      expect(output.data!.length).toBeLessThan(200);
      expect(output.data).toContain('[TRUNCATED]');
    });

    it('should disable truncation when option is false', () => {
      const s = new OutputSanitizer({ truncateLongStrings: false });
      const longString = 'a'.repeat(200000);
      const result = s.sanitize({ data: longString });

      const output = result.output as Record<string, string>;
      expect(output.data!.length).toBe(200000);
    });
  });

  describe('Output Size Limits', () => {
    it('should truncate output exceeding max size', () => {
      const largeData: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`key${i}`] = 'x'.repeat(10000);
      }

      const s = new OutputSanitizer({ maxOutputSize: 1000 });
      const result = s.sanitize(largeData);

      expect(result.truncated).toBe(true);
      expect(result.finalSize).toBeLessThanOrEqual(1000);
    });

    it('should not truncate output under max size', () => {
      const result = sanitizer.sanitize({ small: 'data' });
      expect(result.truncated).toBe(false);
    });
  });

  describe('Result Structure', () => {
    it('should return complete result structure', () => {
      const result = sanitizer.sanitize({ email: 'test@example.com' });

      expect(result.output).toBeDefined();
      expect(result.modified).toBeDefined();
      expect(result.redactions).toBeDefined();
      expect(result.truncated).toBeDefined();
      expect(result.originalSize).toBeDefined();
      expect(result.finalSize).toBeDefined();
    });

    it('should track redactions made', () => {
      const result = sanitizer.sanitize({
        email: 'test@example.com',
        password: 'secret123',
      });

      expect(result.redactions.length).toBeGreaterThan(0);
      expect(result.redactions.some((r) => r.type === 'email')).toBe(true);
      expect(result.redactions.some((r) => r.type === 'sensitive_field')).toBe(true);
    });

    it('should set modified to true when redactions made', () => {
      const result = sanitizer.sanitize({ email: 'test@example.com' });
      expect(result.modified).toBe(true);
    });

    it('should set modified to false when no redactions', () => {
      const result = sanitizer.sanitize({ name: 'John', age: 30 });
      expect(result.modified).toBe(false);
    });

    it('should include masked preview in redactions', () => {
      const result = sanitizer.sanitize({ email: 'verylongemail@example.com' });

      const emailRedaction = result.redactions.find((r) => r.type === 'email');
      expect(emailRedaction).toBeDefined();
      expect(emailRedaction!.originalPreview).toContain('***');
    });
  });

  describe('updateOptions', () => {
    it('should update sanitizer options', () => {
      sanitizer.updateOptions({ removePII: false });

      const result = sanitizer.sanitize({ email: 'test@example.com' });
      const output = result.output as Record<string, string>;
      expect(output.email).toBe('test@example.com');
    });

    it('should merge with existing options', () => {
      sanitizer.updateOptions({ removePII: false });
      sanitizer.updateOptions({ removeSecrets: false });

      // Both should be disabled now
      const result = sanitizer.sanitize({
        email: 'test@example.com',
        key: 'AKIAIOSFODNN7EXAMPLE',
      });

      const output = result.output as Record<string, string>;
      expect(output.email).toBe('test@example.com');
      expect(output.key).toBe('AKIAIOSFODNN7EXAMPLE');
    });
  });

  describe('addPattern', () => {
    it('should add custom redaction pattern', () => {
      const customPattern: RedactionPattern = {
        name: 'custom_id',
        pattern: /CUSTOM-[A-Z0-9]{8}/g,
        replacement: '[CUSTOM_ID_REDACTED]',
      };

      sanitizer.addPattern(customPattern);

      const result = sanitizer.sanitize({ id: 'CUSTOM-ABC12345' });
      const output = result.output as Record<string, string>;
      expect(output.id).toBe('[CUSTOM_ID_REDACTED]');
    });
  });

  describe('addRedactField', () => {
    it('should add field to always redact', () => {
      sanitizer.addRedactField('customSecret');

      const result = sanitizer.sanitize({ customSecret: 'my-value' });
      const output = result.output as Record<string, string>;
      expect(output.customSecret).toBe('[REDACTED]');
    });
  });

  describe('Convenience Functions', () => {
    describe('getDefaultOutputSanitizer', () => {
      it('should return a singleton sanitizer', () => {
        const s1 = getDefaultOutputSanitizer();
        const s2 = getDefaultOutputSanitizer();
        expect(s1).toBe(s2);
      });
    });

    describe('sanitizeOutput', () => {
      it('should sanitize output with default options', () => {
        const result = sanitizeOutput({ email: 'test@example.com' });
        const output = result.output as Record<string, string>;
        expect(output.email).toContain('[EMAIL_REDACTED]');
      });
    });

    describe('containsSensitiveData', () => {
      it('should return true for sensitive data', () => {
        expect(containsSensitiveData({ email: 'test@example.com' })).toBe(true);
      });

      it('should return false for clean data', () => {
        expect(containsSensitiveData({ name: 'John', age: 30 })).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty object', () => {
      const result = sanitizer.sanitize({});
      expect(result.output).toEqual({});
      expect(result.modified).toBe(false);
    });

    it('should handle empty string', () => {
      const result = sanitizer.sanitize({ data: '' });
      const output = result.output as Record<string, string>;
      expect(output.data).toBe('');
    });

    it('should handle primitive values directly', () => {
      const result = sanitizer.sanitize('test@example.com' as unknown);
      expect(result.output).toContain('[EMAIL_REDACTED]');
    });

    it('should handle array at root level', () => {
      const result = sanitizer.sanitize(['test@example.com', 'other@example.com']);
      const output = result.output as string[];
      expect(output[0]).toContain('[EMAIL_REDACTED]');
    });

    it('should handle mixed array', () => {
      const result = sanitizer.sanitize([
        'test@example.com',
        123,
        { password: 'secret' },
      ]);

      const output = result.output as unknown[];
      expect(output[0]).toContain('[EMAIL_REDACTED]');
      expect(output[1]).toBe(123);
      expect((output[2] as Record<string, string>).password).toBe('[REDACTED]');
    });

    it('should reset regex lastIndex between matches', () => {
      // This tests that global regex patterns are properly reset
      const result = sanitizer.sanitize({
        data1: 'test1@example.com',
        data2: 'test2@example.com',
      });

      const output = result.output as Record<string, string>;
      expect(output.data1).toContain('[EMAIL_REDACTED]');
      expect(output.data2).toContain('[EMAIL_REDACTED]');
    });
  });
});
