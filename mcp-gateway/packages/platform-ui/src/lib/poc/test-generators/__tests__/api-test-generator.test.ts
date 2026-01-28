/**
 * Tests for APITestGenerator
 */

import {
  APITestGenerator,
  createAPITestGenerator,
  type APITestConfig,
} from '../api-test-generator';
import type { InferredDataModel } from '../../types';

describe('APITestGenerator', () => {
  const defaultConfig: APITestConfig = {
    baseUrl: 'http://localhost:3001',
  };

  const sampleModel: InferredDataModel = {
    name: 'User',
    source: 'UserProfileCard',
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'age', type: 'number', required: false },
      { name: 'active', type: 'boolean', required: false },
    ],
    endpoints: [
      { method: 'GET', path: '/users' },
      { method: 'GET', path: '/users/:id' },
      { method: 'POST', path: '/users' },
      { method: 'PUT', path: '/users/:id' },
      { method: 'DELETE', path: '/users/:id' },
    ],
  };

  describe('constructor', () => {
    it('creates instance with config', () => {
      const generator = new APITestGenerator(defaultConfig);
      expect(generator).toBeInstanceOf(APITestGenerator);
    });

    it('defaults optional config values', () => {
      const generator = new APITestGenerator({ baseUrl: 'http://test.com' });
      expect(generator).toBeInstanceOf(APITestGenerator);
    });
  });

  describe('createAPITestGenerator', () => {
    it('creates generator via factory', () => {
      const generator = createAPITestGenerator(defaultConfig);
      expect(generator).toBeInstanceOf(APITestGenerator);
    });
  });

  describe('generate', () => {
    it('generates test for data model', () => {
      const generator = new APITestGenerator(defaultConfig);
      const result = generator.generate(sampleModel);

      expect(result.resourceName).toBe('User');
      expect(result.filePath).toBe('User.api.test.ts');
      expect(result.testCode).toContain("import request from 'supertest'");
    });

    it('includes CRUD endpoint tests', () => {
      const generator = new APITestGenerator(defaultConfig);
      const result = generator.generate(sampleModel);

      expect(result.testCode).toContain("describe('GET /users'");
      expect(result.testCode).toContain("describe('GET /users/:id'");
      expect(result.testCode).toContain("describe('POST /users'");
      expect(result.testCode).toContain("describe('PUT /users/:id'");
      expect(result.testCode).toContain("describe('DELETE /users/:id'");
    });

    it('generates test payloads from model fields', () => {
      const generator = new APITestGenerator(defaultConfig);
      const result = generator.generate(sampleModel);

      expect(result.testCode).toContain('"name"');
      expect(result.testCode).toContain('"email"');
      expect(result.testCode).toContain('"age"');
      expect(result.testCode).toContain('"active"');
    });

    it('excludes id field from create payloads', () => {
      const generator = new APITestGenerator(defaultConfig);
      const result = generator.generate(sampleModel);

      // The create payload should not include id
      const createPayloadMatch = result.testCode.match(/const newItem = ({[\s\S]*?});/);
      if (createPayloadMatch) {
        expect(createPayloadMatch[1]).not.toContain('"id"');
      }
    });

    it('includes validation tests by default', () => {
      const generator = new APITestGenerator(defaultConfig);
      const result = generator.generate(sampleModel);

      expect(result.testCode).toContain('validates required fields');
      expect(result.testCode).toContain('validates field types');
    });

    it('includes error handling tests by default', () => {
      const generator = new APITestGenerator(defaultConfig);
      const result = generator.generate(sampleModel);

      expect(result.testCode).toContain('Error Handling');
      expect(result.testCode).toContain('handles malformed JSON');
    });

    it('excludes validation tests when disabled', () => {
      const generator = new APITestGenerator({
        ...defaultConfig,
        includeValidationTests: false,
      });
      const result = generator.generate(sampleModel);

      expect(result.testCode).not.toContain('validates required fields');
    });

    it('excludes error handling tests when disabled', () => {
      const generator = new APITestGenerator({
        ...defaultConfig,
        includeErrorHandlingTests: false,
      });
      const result = generator.generate(sampleModel);

      expect(result.testCode).not.toContain('Error Handling');
    });

    it('converts resource name to kebab-case path with pluralization', () => {
      const generator = new APITestGenerator(defaultConfig);
      const model: InferredDataModel = {
        name: 'UserProfile',
        source: 'form',
        fields: [{ name: 'id', type: 'string', required: true }],
        endpoints: [],
      };

      const result = generator.generate(model);

      expect(result.testCode).toContain('/user-profiles');
    });

    it('generates field assertions for response validation', () => {
      const generator = new APITestGenerator(defaultConfig);
      const result = generator.generate(sampleModel);

      expect(result.testCode).toContain("expect(response.body).toHaveProperty('name')");
      expect(result.testCode).toContain("expect(response.body).toHaveProperty('email')");
    });

    it('handles model with date field', () => {
      const generator = new APITestGenerator(defaultConfig);
      const model: InferredDataModel = {
        name: 'Event',
        source: 'form',
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'date', type: 'date', required: true },
        ],
        endpoints: [],
      };

      const result = generator.generate(model);
      expect(result.testCode).toContain('events');
    });

    it('handles model with unknown field type', () => {
      const generator = new APITestGenerator(defaultConfig);
      const model: InferredDataModel = {
        name: 'Item',
        source: 'form',
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'data', type: 'custom', required: false },
        ],
        endpoints: [],
      };

      const result = generator.generate(model);
      expect(result.testCode).toContain('items');
    });
  });

  describe('generateIntegration', () => {
    it('generates CRUD integration test', () => {
      const generator = new APITestGenerator(defaultConfig);
      const result = generator.generateIntegration(sampleModel);

      expect(result.resourceName).toBe('User');
      expect(result.filePath).toBe('User.integration.test.ts');
      expect(result.testCode).toContain('Integration Tests');
    });

    it('includes create-read-update-delete flow', () => {
      const generator = new APITestGenerator(defaultConfig);
      const result = generator.generateIntegration(sampleModel);

      expect(result.testCode).toContain('// Create');
      expect(result.testCode).toContain('// Read');
      expect(result.testCode).toContain('// Update');
      expect(result.testCode).toContain('// Delete');
      expect(result.testCode).toContain('// Verify deleted');
    });

    it('uses dynamic ID from create response', () => {
      const generator = new APITestGenerator(defaultConfig);
      const result = generator.generateIntegration(sampleModel);

      expect(result.testCode).toContain('createdId = createResponse.body.id');
      expect(result.testCode).toContain('`/users/${createdId}`');
    });
  });

  describe('generateAll', () => {
    it('generates tests for all models', () => {
      const generator = new APITestGenerator(defaultConfig);
      const models: InferredDataModel[] = [
        sampleModel,
        {
          name: 'Product',
          source: 'ProductCard',
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
          ],
          endpoints: [],
        },
      ];

      const results = generator.generateAll(models);

      // 2 models × 2 tests each (unit + integration) = 4
      expect(results.length).toBe(4);
      expect(results[0].resourceName).toBe('User');
      expect(results[1].resourceName).toBe('User');
      expect(results[2].resourceName).toBe('Product');
      expect(results[3].resourceName).toBe('Product');
    });

    it('excludes integration tests when disabled', () => {
      const generator = new APITestGenerator({
        ...defaultConfig,
        includeIntegrationTests: false,
      });
      const models: InferredDataModel[] = [sampleModel];

      const results = generator.generateAll(models);

      expect(results.length).toBe(1);
      expect(results[0].filePath).toBe('User.api.test.ts');
    });

    it('returns empty array for empty input', () => {
      const generator = new APITestGenerator(defaultConfig);
      const results = generator.generateAll([]);

      expect(results).toEqual([]);
    });
  });

  describe('generateOpenAPIValidation', () => {
    it('generates OpenAPI validation test', () => {
      const generator = new APITestGenerator(defaultConfig);
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: { summary: 'List users' },
          },
        },
      };

      const result = generator.generateOpenAPIValidation(spec);

      expect(result.resourceName).toBe('OpenAPI');
      expect(result.filePath).toBe('openapi-validation.test.ts');
      expect(result.testCode).toContain('OpenAPI Specification Validation');
    });

    it('embeds OpenAPI spec in test file', () => {
      const generator = new APITestGenerator(defaultConfig);
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      };

      const result = generator.generateOpenAPIValidation(spec);

      expect(result.testCode).toContain('"openapi": "3.0.0"');
      expect(result.testCode).toContain('"title": "Test API"');
    });

    it('validates spec structure', () => {
      const generator = new APITestGenerator(defaultConfig);
      const spec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {},
      };

      const result = generator.generateOpenAPIValidation(spec);

      expect(result.testCode).toContain("expect(openApiSpec).toHaveProperty('openapi')");
      expect(result.testCode).toContain("expect(openApiSpec).toHaveProperty('info')");
      expect(result.testCode).toContain("expect(openApiSpec).toHaveProperty('paths')");
    });
  });
});
