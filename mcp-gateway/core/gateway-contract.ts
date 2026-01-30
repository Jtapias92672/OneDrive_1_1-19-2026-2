/**
 * Gateway Contract Types - Runtime validation with Zod
 *
 * SKILL: Contract Validation
 * Prevents "tests pass but feature broken" scenarios by validating
 * orchestrator/gateway contract at runtime. Catches mismatches before production.
 *
 * Used by:
 * - Orchestrator: Validates requests before sending to gateway
 * - Gateway: Validates responses before returning to orchestrator
 * - Tests: Validates both sides match expectations
 */

import { z } from 'zod';

/**
 * MCPRequest Schema
 *
 * Contract between orchestrator and gateway for tool execution requests.
 */
export const MCPRequestSchema = z.object({
  tool: z.string().min(1, 'Tool name cannot be empty'),
  params: z.record(z.any()),
  context: z.object({
    tenantId: z.string().min(1, 'Tenant ID required for isolation'),
    userId: z.string().min(1, 'User ID required for audit trail'),
  }),
});

/**
 * MCPResponse Schema
 *
 * Contract for gateway responses back to orchestrator.
 */
export const MCPResponseSchema = z.object({
  output: z.any(), // Tool-specific output (e.g., FigmaFile)
  metadata: z.object({
    duration: z.number().nonnegative('Duration must be non-negative'),
    toolId: z.string().min(1, 'Tool ID required for logging'),
  }),
});

/**
 * TypeScript types inferred from Zod schemas
 *
 * These types match the runtime validation, ensuring type safety
 * at both compile-time and runtime.
 */
export type MCPRequest = z.infer<typeof MCPRequestSchema>;
export type MCPResponse = z.infer<typeof MCPResponseSchema>;

/**
 * Validation helper functions
 */

export function validateMCPRequest(data: unknown): MCPRequest {
  return MCPRequestSchema.parse(data);
}

export function validateMCPResponse(data: unknown): MCPResponse {
  return MCPResponseSchema.parse(data);
}

/**
 * Safe validation (returns success/error instead of throwing)
 */

export function safeParseMCPRequest(data: unknown) {
  return MCPRequestSchema.safeParse(data);
}

export function safeParseMCPResponse(data: unknown) {
  return MCPResponseSchema.safeParse(data);
}
