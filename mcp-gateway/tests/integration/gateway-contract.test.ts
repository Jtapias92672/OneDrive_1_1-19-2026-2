/**
 * Gateway Contract Validation Tests
 *
 * SKILL: Contract Validation
 * Prevents "tests pass but feature broken" scenarios by validating
 * the orchestrator/gateway contract at runtime. Ensures gateway output
 * matches orchestrator expectations.
 *
 * These tests validate:
 * 1. Request shape matches MCPRequestSchema
 * 2. Response shape matches MCPResponseSchema
 * 3. Orchestrator can consume gateway responses
 * 4. Invalid requests are rejected with clear error messages
 */

import {
  MCPRequestSchema,
  MCPResponseSchema,
  validateMCPRequest,
  validateMCPResponse,
  safeParseMCPRequest,
  safeParseMCPResponse,
  type MCPRequest,
  type MCPResponse,
} from '../../core/gateway-contract';

describe('Gateway Contract Validation', () => {
  describe('MCPRequestSchema', () => {
    it('validates valid request with all required fields', () => {
      const validRequest = {
        tool: 'figma_getFile',
        params: { fileKey: 'test-key' },
        context: {
          tenantId: 'default',
          userId: 'user-1',
        },
      };

      const result = validateMCPRequest(validRequest);

      expect(result).toEqual(validRequest);
      expect(result.tool).toBe('figma_getFile');
      expect(result.context.tenantId).toBe('default');
      expect(result.context.userId).toBe('user-1');
    });

    it('rejects request with empty tool name', () => {
      const invalidRequest = {
        tool: '',
        params: { fileKey: 'test' },
        context: { tenantId: 'default', userId: 'user-1' },
      };

      expect(() => validateMCPRequest(invalidRequest)).toThrow('Tool name cannot be empty');
    });

    it('rejects request with missing tenant ID', () => {
      const invalidRequest = {
        tool: 'figma_getFile',
        params: { fileKey: 'test' },
        context: { tenantId: '', userId: 'user-1' },
      };

      expect(() => validateMCPRequest(invalidRequest)).toThrow('Tenant ID required for isolation');
    });

    it('rejects request with missing user ID', () => {
      const invalidRequest = {
        tool: 'figma_getFile',
        params: { fileKey: 'test' },
        context: { tenantId: 'default', userId: '' },
      };

      expect(() => validateMCPRequest(invalidRequest)).toThrow('User ID required for audit trail');
    });

    it('rejects request with missing context', () => {
      const invalidRequest = {
        tool: 'figma_getFile',
        params: { fileKey: 'test' },
        // Missing context
      };

      expect(() => validateMCPRequest(invalidRequest)).toThrow();
    });

    it('allows arbitrary params (tool-specific)', () => {
      const validRequest = {
        tool: 'figma_getFileNodes',
        params: {
          fileKey: 'test',
          ids: ['node1', 'node2'],
          depth: 2,
        },
        context: { tenantId: 'default', userId: 'user-1' },
      };

      const result = validateMCPRequest(validRequest);

      expect(result.params.fileKey).toBe('test');
      expect(result.params.ids).toEqual(['node1', 'node2']);
      expect(result.params.depth).toBe(2);
    });
  });

  describe('MCPResponseSchema', () => {
    it('validates valid response with all required fields', () => {
      const validResponse = {
        output: { name: 'Test File', lastModified: '2024-01-01' },
        metadata: {
          duration: 150,
          toolId: 'figma_getFile',
        },
      };

      const result = validateMCPResponse(validResponse);

      expect(result).toEqual(validResponse);
      expect(result.metadata.duration).toBe(150);
      expect(result.metadata.toolId).toBe('figma_getFile');
    });

    it('rejects response with negative duration', () => {
      const invalidResponse = {
        output: { data: 'test' },
        metadata: {
          duration: -10,
          toolId: 'figma_getFile',
        },
      };

      expect(() => validateMCPResponse(invalidResponse)).toThrow('Duration must be non-negative');
    });

    it('rejects response with empty tool ID', () => {
      const invalidResponse = {
        output: { data: 'test' },
        metadata: {
          duration: 100,
          toolId: '',
        },
      };

      expect(() => validateMCPResponse(invalidResponse)).toThrow('Tool ID required for logging');
    });

    it('rejects response with missing metadata', () => {
      const invalidResponse = {
        output: { data: 'test' },
        // Missing metadata
      };

      expect(() => validateMCPResponse(invalidResponse)).toThrow();
    });

    it('allows arbitrary output structure (tool-specific)', () => {
      const validResponse = {
        output: {
          name: 'Test File',
          document: { id: 'doc-1', type: 'CANVAS' },
          components: [{ id: 'comp-1', name: 'Button' }],
        },
        metadata: {
          duration: 200,
          toolId: 'figma_getFile',
        },
      };

      const result = validateMCPResponse(validResponse);

      expect(result.output.name).toBe('Test File');
      expect(result.output.document.type).toBe('CANVAS');
      expect(result.output.components).toHaveLength(1);
    });
  });

  describe('Safe Parsing (Non-Throwing)', () => {
    it('returns success for valid MCPRequest', () => {
      const validRequest = {
        tool: 'figma_getFile',
        params: { fileKey: 'test' },
        context: { tenantId: 'default', userId: 'user-1' },
      };

      const result = safeParseMCPRequest(validRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tool).toBe('figma_getFile');
      }
    });

    it('returns error for invalid MCPRequest', () => {
      const invalidRequest = {
        tool: '',
        params: { fileKey: 'test' },
        context: { tenantId: 'default', userId: 'user-1' },
      };

      const result = safeParseMCPRequest(invalidRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Tool name cannot be empty');
      }
    });

    it('returns success for valid MCPResponse', () => {
      const validResponse = {
        output: { data: 'test' },
        metadata: { duration: 100, toolId: 'figma_getFile' },
      };

      const result = safeParseMCPResponse(validResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.duration).toBe(100);
      }
    });

    it('returns error for invalid MCPResponse', () => {
      const invalidResponse = {
        output: { data: 'test' },
        metadata: { duration: -10, toolId: 'figma_getFile' },
      };

      const result = safeParseMCPResponse(invalidResponse);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Duration must be non-negative');
      }
    });
  });

  describe('Orchestrator/Gateway Contract Integration', () => {
    it('orchestrator request format matches gateway expectations', () => {
      // Orchestrator creates request in this format
      const orchestratorRequest: MCPRequest = {
        tool: 'figma_getFile',
        params: { fileKey: 'abc123' },
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
        },
      };

      // Gateway validates and accepts this format
      expect(() => validateMCPRequest(orchestratorRequest)).not.toThrow();

      // Verify fields are accessible as expected
      expect(orchestratorRequest.tool).toBe('figma_getFile');
      expect(orchestratorRequest.params.fileKey).toBe('abc123');
      expect(orchestratorRequest.context.tenantId).toBe('tenant-1');
    });

    it('gateway response format matches orchestrator expectations', () => {
      // Gateway returns response in this format
      const gatewayResponse: MCPResponse = {
        output: {
          name: 'Design System',
          lastModified: '2024-01-30T10:00:00Z',
          document: { id: 'doc-1', type: 'CANVAS' },
        },
        metadata: {
          duration: 250,
          toolId: 'figma_getFile',
        },
      };

      // Orchestrator validates and consumes this format
      expect(() => validateMCPResponse(gatewayResponse)).not.toThrow();

      // Verify orchestrator can access FigmaFile properties
      const figmaFile = gatewayResponse.output;
      expect(figmaFile).toHaveProperty('name');
      expect(figmaFile).toHaveProperty('lastModified');
      expect(figmaFile).toHaveProperty('document');
    });

    it('detects contract mismatch: wrong field names', () => {
      // Gateway returns wrong field names (camelCase vs snake_case)
      const mismatchedResponse = {
        output: { data: 'test' },
        meta_data: {
          // Wrong: should be 'metadata'
          duration: 100,
          tool_id: 'figma_getFile', // Wrong: should be 'toolId'
        },
      };

      // Contract validation catches this mismatch
      expect(() => validateMCPResponse(mismatchedResponse)).toThrow();
    });

    it('detects contract mismatch: missing required fields', () => {
      // Gateway returns incomplete response
      const incompleteResponse = {
        output: { data: 'test' },
        // Missing metadata entirely
      };

      // Contract validation catches this
      expect(() => validateMCPResponse(incompleteResponse)).toThrow();
    });
  });

  describe('Type Safety', () => {
    it('inferred TypeScript types match Zod schemas', () => {
      const request: MCPRequest = {
        tool: 'figma_getFile',
        params: { fileKey: 'test' },
        context: { tenantId: 'default', userId: 'user-1' },
      };

      const response: MCPResponse = {
        output: { data: 'test' },
        metadata: { duration: 100, toolId: 'figma_getFile' },
      };

      // TypeScript compilation verifies structure at compile-time
      expect(request.tool).toBeDefined();
      expect(response.metadata.duration).toBeDefined();

      // Zod validates at runtime
      expect(() => validateMCPRequest(request)).not.toThrow();
      expect(() => validateMCPResponse(response)).not.toThrow();
    });
  });
});
