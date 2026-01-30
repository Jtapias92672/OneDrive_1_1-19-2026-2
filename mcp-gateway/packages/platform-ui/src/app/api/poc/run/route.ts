/**
 * FORGE POC Run API
 *
 * POST /api/poc/run - Run POC Orchestrator with Server-Sent Events for real-time progress
 *
 * Request body:
 * - figmaUrl?: string - Figma URL to parse
 * - htmlContent?: string - HTML content to parse
 * - options?: POCRunOptions
 *
 * Returns: Server-Sent Events stream with progress updates
 */

import { NextRequest } from 'next/server';
import { createPOCOrchestrator } from '@/lib/poc';
import type { POCRunInput, POCProgressEvent, POCRunResult } from '@/lib/poc/types';

// Store for completed runs (in production, use Redis or DB)
const runResults = new Map<string, POCRunResult>();

export async function POST(request: NextRequest) {
  console.log('=== POC RUN API CALLED ===');
  try {
    const body = await request.json();
    console.log('[API] Request body:', { figmaUrl: body.figmaUrl?.substring(0, 50), hasHtml: !!body.htmlContent, hasPath: !!body.htmlPath });
    const { figmaUrl, htmlContent, htmlPath, options } = body as POCRunInput & { figmaToken?: string };

    // Get Figma token from request or environment
    const figmaToken = body.figmaToken || process.env.FIGMA_TOKEN || '';

    if (!figmaUrl && !htmlContent && !htmlPath) {
      return new Response(
        JSON.stringify({ error: 'Either figmaUrl, htmlContent, or htmlPath is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Helper to send SSE events
        const sendEvent = (event: POCProgressEvent | { type: 'result'; data: POCRunResult }) => {
          const eventType = 'type' in event && event.type === 'result' ? 'result' : 'progress';
          const data = eventType === 'result' ? (event as { data: POCRunResult }).data : event;
          controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // ✅ SKILL: Bundle Optimization - Lazy load gateway only when enabled
          const setupGateway = async () => {
            if (process.env.MCP_GATEWAY_ENABLED !== 'true') return null;

            // Dynamic import reduces cold start when gateway disabled
            const { setupMCPGateway } = await import('@/lib/gateway/core/setup-mcp-gateway');

            return setupMCPGateway({
              mcpMode: 'hybrid',
              autoDiscoverTools: true,
              gatewayConfig: {
                security: {
                  oauth: {
                    enabled: process.env.OAUTH_ENABLED === 'true',  // ✅ PHASE 4: Enable OAuth 2.1 + PKCE
                    issuer: process.env.OAUTH_ISSUER,
                    clientId: process.env.OAUTH_CLIENT_ID,
                    scopes: process.env.OAUTH_SCOPES?.split(',') || ['openid', 'profile'],
                    pkceRequired: process.env.OAUTH_PKCE_REQUIRED !== 'false', // Default true
                  },
                  inputSanitization: {
                    enabled: true,  // ✅ PHASE 3: Enable input sanitization
                    maxInputSize: 1024 * 1024, // 1MB
                    allowedContentTypes: ['application/json'],
                    blockPatterns: [
                      '<script',        // XSS: Script tags
                      'javascript:',    // XSS: JavaScript protocol
                      'data:text/html', // XSS: Data URI HTML
                      'onerror=',       // XSS: Event handlers
                      'onload=',        // XSS: Event handlers
                      'eval(',          // Code injection
                      'Function(',      // Code injection
                      'DROP TABLE',     // SQL injection (case-sensitive check)
                      'DELETE FROM',    // SQL injection
                      '; --',           // SQL injection comment
                      'UNION SELECT',   // SQL injection
                    ],
                  },
                  toolIntegrity: {
                    enabled: false,  // Future: Tool signature verification
                    hashAlgorithm: 'sha256' as const,
                    requireSignature: false,
                    trustedSigners: [],
                  },
                  supplyChain: {
                    enabled: false,  // Future: SBOM and vulnerability scanning
                    allowedRegistries: [],
                    requireSBOM: false,
                    vulnerabilityScan: false,
                  },
                },
                monitoring: {
                  enabled: true,  // ✅ PHASE 2: Enable monitoring
                  audit: {
                    enabled: true,  // ✅ PHASE 2: Enable audit logging
                    logLevel: 'info' as const,
                    includePayloads: true,  // Log tool inputs
                    retentionDays: 90,  // 90-day retention
                  },
                  anomalyDetection: {
                    enabled: false,  // Future: Anomaly detection
                    baseline: 0,
                    alertThreshold: 0,
                  },
                  toolBehavior: {
                    enabled: false,  // Future: Tool behavior monitoring
                    trackDescriptionChanges: false,
                    alertOnChange: false,
                  },
                  metrics: {
                    enabled: false,  // Future: Metrics collection
                    exportInterval: 60000,
                  },
                },
                approval: {
                  enabled: false,  // Phase 5: Human approval gates
                  defaultMode: 'never' as const,
                  requireApproval: [],
                  autoApprove: ['*'],  // Auto-approve all tools for now
                  timeoutMs: 60000,  // 60 second timeout
                  carsIntegration: {
                    enabled: false,  // Phase 5: CARS risk-based approval
                    riskThreshold: 0.5,
                  },
                },
                sandbox: {
                  enabled: false,  // Phase 6: Sandbox execution
                  runtime: 'none' as const,
                  limits: {
                    maxCpuMs: 5000,
                    maxMemoryMb: 512,
                    maxDiskMb: 100,
                    maxNetworkConnections: 10,
                    executionTimeoutMs: 30000,
                  },
                  network: {
                    allowEgress: false,
                    allowedHosts: [],
                    blockedHosts: [],
                  },
                  filesystem: {
                    readOnly: [],
                    writable: [],
                    blocked: [],
                  },
                },
              },
            });
          };

          // Initialize gateway (Phases 1-3: routing, audit, sanitization)
          const gatewaySetup = await setupGateway();

          // Create orchestrator with gateway routing
          const orchestrator = createPOCOrchestrator({
            figmaToken,
            gateway: gatewaySetup?.gateway,
            tenantId: gatewaySetup ? 'default' : undefined,
            userId: gatewaySetup ? 'poc-user' : undefined,
          });

          // Set up progress callback
          orchestrator.onProgress((event: POCProgressEvent) => {
            sendEvent(event);
          });

          // Run the orchestrator
          const result = await orchestrator.run({
            figmaUrl,
            htmlContent,
            htmlPath,
            options: {
              generateTests: options?.generateTests ?? true,
              generateStories: options?.generateStories ?? true,
              generateHtml: options?.generateHtml ?? true,  // CHANGED: Enable HTML generation by default
              skipJira: options?.skipJira ?? true,
              deployFrontend: options?.deployFrontend ?? false,
              deployBackend: options?.deployBackend ?? false,
              outputDir: options?.outputDir ?? './generated',
              // Enable new generators (all tested with 80%+ coverage)
              useNewReactGenerator: options?.useNewReactGenerator ?? true,
              useNewTestGenerator: options?.useNewTestGenerator ?? true,
              useNewStorybookGenerator: options?.useNewStorybookGenerator ?? true,
            },
          });

          // Store result for later retrieval
          runResults.set(result.runId, result);

          // Debug logging
          console.log('[API] Sending final result:', {
            runId: result.runId,
            status: result.status,
            frontendComponents: result.frontendComponents?.length,
            htmlFiles: result.htmlFiles?.length,
            backendFiles: Object.keys(result.backendFiles || {}),
          });

          // Strip file contents from SSE stream to reduce message size
          // FileViewer will fetch full content from /api/poc/results endpoint
          const streamResult = {
            ...result,
            frontendComponents: result.frontendComponents.map(c => ({
              name: c.name,
              filePath: c.filePath,
            })),
            htmlFiles: result.htmlFiles?.map(f => ({
              name: f.name,
              path: f.path,
            })),
            backendFiles: {
              controllers: result.backendFiles.controllers.map((f: any) => ({ name: f.name })),
              services: result.backendFiles.services.map((f: any) => ({ name: f.name })),
              models: result.backendFiles.models.map((f: any) => ({ name: f.name })),
              routes: result.backendFiles.routes.map((f: any) => ({ name: f.name })),
              tests: result.backendFiles.tests.map((f: any) => ({ name: f.name })),
            },
          };

          // Send final result (without file contents)
          sendEvent({ type: 'result', data: streamResult });

          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * GET /api/poc/run - Get stored run results
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get('runId');

  if (runId) {
    const result = runResults.get(runId);
    if (result) {
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Run not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Return list of all runs
  const runs = Array.from(runResults.entries()).map(([id, result]) => ({
    runId: id,
    status: result.status,
    sourceName: result.figmaMetadata.fileName,
    startedAt: result.timestamps.started,
    completedAt: result.timestamps.completed,
  }));

  return new Response(JSON.stringify({ runs }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
