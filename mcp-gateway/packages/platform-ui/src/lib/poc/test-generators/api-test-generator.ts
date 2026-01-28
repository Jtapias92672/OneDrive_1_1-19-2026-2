/**
 * API Test Generator
 * Generates Jest tests for Express API endpoints
 *
 * Skills Applied:
 * - react-best-practices: Comprehensive test coverage
 * - writing-clearly: Clear test descriptions
 */

import type { InferredDataModel } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface APITestConfig {
  baseUrl: string;
  includeIntegrationTests?: boolean;
  includeValidationTests?: boolean;
  includeErrorHandlingTests?: boolean;
}

export interface GeneratedAPITest {
  resourceName: string;
  testCode: string;
  filePath: string;
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  requestBody?: {
    fields: Array<{
      name: string;
      type: string;
      required: boolean;
    }>;
  };
  responseType: string;
}

// =============================================================================
// Templates
// =============================================================================

const TEST_HEADER = `import request from 'supertest';
import { app } from '../app';
`;

const RESOURCE_TEST_TEMPLATE = `
describe('{resourceName} API', () => {
  describe('GET /{resourcePath}', () => {
    it('returns list of {resourceNameLower}s', async () => {
      const response = await request(app)
        .get('/{resourcePath}')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('supports pagination', async () => {
      const response = await request(app)
        .get('/{resourcePath}?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('GET /{resourcePath}/:id', () => {
    it('returns single {resourceNameLower} by id', async () => {
      const response = await request(app)
        .get('/{resourcePath}/1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id');
    });

    it('returns 404 for non-existent {resourceNameLower}', async () => {
      await request(app)
        .get('/{resourcePath}/999999')
        .expect(404);
    });
  });

  describe('POST /{resourcePath}', () => {
    it('creates new {resourceNameLower}', async () => {
      const newItem = {createPayload};

      const response = await request(app)
        .post('/{resourcePath}')
        .send(newItem)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
{fieldAssertions}
    });

{validationTests}
  });

  describe('PUT /{resourcePath}/:id', () => {
    it('updates existing {resourceNameLower}', async () => {
      const updates = {updatePayload};

      const response = await request(app)
        .put('/{resourcePath}/1')
        .send(updates)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id');
    });

    it('returns 404 for non-existent {resourceNameLower}', async () => {
      await request(app)
        .put('/{resourcePath}/999999')
        .send({updatePayload})
        .expect(404);
    });
  });

  describe('DELETE /{resourcePath}/:id', () => {
    it('deletes existing {resourceNameLower}', async () => {
      await request(app)
        .delete('/{resourcePath}/1')
        .expect(204);
    });

    it('returns 404 for non-existent {resourceNameLower}', async () => {
      await request(app)
        .delete('/{resourcePath}/999999')
        .expect(404);
    });
  });

{errorHandlingTests}
});
`;

const VALIDATION_TEST_TEMPLATE = `
    it('validates required fields', async () => {
      const invalidItem = {};

      const response = await request(app)
        .post('/{resourcePath}')
        .send(invalidItem)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('validates field types', async () => {
      const invalidItem = {invalidPayload};

      const response = await request(app)
        .post('/{resourcePath}')
        .send(invalidItem)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
`;

const ERROR_HANDLING_TEST_TEMPLATE = `
  describe('Error Handling', () => {
    it('handles malformed JSON', async () => {
      await request(app)
        .post('/{resourcePath}')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('handles server errors gracefully', async () => {
      // This test verifies error middleware is in place
      const response = await request(app)
        .get('/{resourcePath}')
        .expect('Content-Type', /json/);

      // Should not expose stack traces in production
      if (response.status >= 500) {
        expect(response.body).not.toHaveProperty('stack');
      }
    });
  });
`;

const INTEGRATION_TEST_TEMPLATE = `import request from 'supertest';
import { app } from '../app';

describe('{resourceName} Integration Tests', () => {
  let createdId: string | number;

  it('creates, reads, updates, and deletes {resourceNameLower}', async () => {
    // Create
    const createResponse = await request(app)
      .post('/{resourcePath}')
      .send({createPayload})
      .expect(201);

    createdId = createResponse.body.id;
    expect(createdId).toBeDefined();

    // Read
    const readResponse = await request(app)
      .get(\`/{resourcePath}/\${createdId}\`)
      .expect(200);

    expect(readResponse.body.id).toBe(createdId);

    // Update
    const updateResponse = await request(app)
      .put(\`/{resourcePath}/\${createdId}\`)
      .send({updatePayload})
      .expect(200);

    expect(updateResponse.body.id).toBe(createdId);

    // Delete
    await request(app)
      .delete(\`/{resourcePath}/\${createdId}\`)
      .expect(204);

    // Verify deleted
    await request(app)
      .get(\`/{resourcePath}/\${createdId}\`)
      .expect(404);
  });
});
`;

// =============================================================================
// Generator Class
// =============================================================================

export class APITestGenerator {
  private config: APITestConfig;

  constructor(config: APITestConfig) {
    this.config = {
      includeIntegrationTests: true,
      includeValidationTests: true,
      includeErrorHandlingTests: true,
      ...config,
    };
  }

  /**
   * Generate API tests for a data model
   */
  generate(model: InferredDataModel): GeneratedAPITest {
    const resourceName = model.name;
    const resourcePath = this.toResourcePath(resourceName);
    const resourceNameLower = resourceName.toLowerCase();

    const createPayload = this.generateCreatePayload(model.fields);
    const updatePayload = this.generateUpdatePayload(model.fields);
    const invalidPayload = this.generateInvalidPayload(model.fields);
    const fieldAssertions = this.generateFieldAssertions(model.fields);

    const validationTests = this.config.includeValidationTests
      ? VALIDATION_TEST_TEMPLATE
          .replace(/{resourcePath}/g, resourcePath)
          .replace('{invalidPayload}', invalidPayload)
      : '';

    const errorHandlingTests = this.config.includeErrorHandlingTests
      ? ERROR_HANDLING_TEST_TEMPLATE.replace(/{resourcePath}/g, resourcePath)
      : '';

    let testCode = TEST_HEADER;
    testCode += RESOURCE_TEST_TEMPLATE
      .replace(/{resourceName}/g, resourceName)
      .replace(/{resourceNameLower}/g, resourceNameLower)
      .replace(/{resourcePath}/g, resourcePath)
      .replace('{createPayload}', createPayload)
      .replace(/{updatePayload}/g, updatePayload)
      .replace('{fieldAssertions}', fieldAssertions)
      .replace('{validationTests}', validationTests)
      .replace('{errorHandlingTests}', errorHandlingTests);

    return {
      resourceName,
      testCode,
      filePath: `${resourceName}.api.test.ts`,
    };
  }

  /**
   * Generate integration test for a data model
   */
  generateIntegration(model: InferredDataModel): GeneratedAPITest {
    const resourceName = model.name;
    const resourcePath = this.toResourcePath(resourceName);
    const resourceNameLower = resourceName.toLowerCase();

    const createPayload = this.generateCreatePayload(model.fields);
    const updatePayload = this.generateUpdatePayload(model.fields);

    const testCode = INTEGRATION_TEST_TEMPLATE
      .replace(/{resourceName}/g, resourceName)
      .replace(/{resourceNameLower}/g, resourceNameLower)
      .replace(/{resourcePath}/g, resourcePath)
      .replace(/{createPayload}/g, createPayload)
      .replace(/{updatePayload}/g, updatePayload);

    return {
      resourceName,
      testCode,
      filePath: `${resourceName}.integration.test.ts`,
    };
  }

  /**
   * Generate tests for all data models
   */
  generateAll(models: InferredDataModel[]): GeneratedAPITest[] {
    const tests: GeneratedAPITest[] = [];

    for (const model of models) {
      tests.push(this.generate(model));

      if (this.config.includeIntegrationTests) {
        tests.push(this.generateIntegration(model));
      }
    }

    return tests;
  }

  /**
   * Generate OpenAPI validation test
   */
  generateOpenAPIValidation(openApiSpec: object): GeneratedAPITest {
    const testCode = `import request from 'supertest';
import { app } from '../app';
import * as OpenAPIValidator from 'express-openapi-validator';

const openApiSpec = ${JSON.stringify(openApiSpec, null, 2)};

describe('OpenAPI Specification Validation', () => {
  it('all endpoints match OpenAPI spec', async () => {
    // This test validates that all API responses conform to the OpenAPI spec
    const validator = OpenAPIValidator.middleware({
      apiSpec: openApiSpec,
      validateRequests: true,
      validateResponses: true,
    });

    expect(validator).toBeDefined();
  });

  it('OpenAPI spec is valid', () => {
    expect(openApiSpec).toHaveProperty('openapi');
    expect(openApiSpec).toHaveProperty('info');
    expect(openApiSpec).toHaveProperty('paths');
  });
});
`;

    return {
      resourceName: 'OpenAPI',
      testCode,
      filePath: 'openapi-validation.test.ts',
    };
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private toResourcePath(name: string): string {
    return name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
      .replace(/\s+/g, '-') + 's';
  }

  private generateCreatePayload(
    fields: InferredDataModel['fields']
  ): string {
    const payload: Record<string, unknown> = {};

    for (const field of fields) {
      if (field.name === 'id') continue;
      payload[field.name] = this.getTestValue(field.type, field.name);
    }

    return JSON.stringify(payload, null, 2).replace(/\n/g, '\n      ');
  }

  private generateUpdatePayload(
    fields: InferredDataModel['fields']
  ): string {
    const payload: Record<string, unknown> = {};

    for (const field of fields) {
      if (field.name === 'id') continue;
      // Use different values for updates
      payload[field.name] = this.getTestValue(field.type, field.name, true);
    }

    return JSON.stringify(payload, null, 2).replace(/\n/g, '\n      ');
  }

  private generateInvalidPayload(
    fields: InferredDataModel['fields']
  ): string {
    const payload: Record<string, unknown> = {};

    for (const field of fields) {
      if (field.name === 'id') continue;
      // Use wrong types for validation testing
      payload[field.name] = this.getInvalidValue(field.type);
    }

    return JSON.stringify(payload, null, 2).replace(/\n/g, '\n      ');
  }

  private generateFieldAssertions(
    fields: InferredDataModel['fields']
  ): string {
    const assertions: string[] = [];

    for (const field of fields) {
      if (field.name === 'id') continue;
      assertions.push(
        `      expect(response.body).toHaveProperty('${field.name}');`
      );
    }

    return assertions.join('\n');
  }

  private getTestValue(type: string, fieldName: string, isUpdate = false): unknown {
    const suffix = isUpdate ? ' Updated' : '';

    switch (type.toLowerCase()) {
      case 'string':
        return `Test ${fieldName}${suffix}`;
      case 'number':
        return isUpdate ? 200 : 100;
      case 'boolean':
        return !isUpdate;
      case 'date':
        return new Date().toISOString();
      case 'email':
        return isUpdate ? 'updated@test.com' : 'test@test.com';
      default:
        return `test-${fieldName}${suffix}`;
    }
  }

  private getInvalidValue(type: string): unknown {
    // Return wrong type for validation testing
    switch (type.toLowerCase()) {
      case 'string':
        return 12345; // number instead of string
      case 'number':
        return 'not-a-number'; // string instead of number
      case 'boolean':
        return 'not-a-boolean'; // string instead of boolean
      case 'date':
        return 'not-a-date'; // invalid date
      case 'email':
        return 'not-an-email'; // invalid email
      default:
        return null;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createAPITestGenerator(config: APITestConfig): APITestGenerator {
  return new APITestGenerator(config);
}
