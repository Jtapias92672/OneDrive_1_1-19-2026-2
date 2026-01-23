/**
 * FORGE MCP Gateway - Development Server
 *
 * HTTP server with full API routes, metrics, and monitoring.
 */

import * as http from 'http';
import { MCPGateway } from './core/gateway.js';
import type { MCPGatewayConfig } from './core/types.js';
import {
  getMetrics,
  getContentType,
  httpRequestsTotal,
  httpRequestDuration,
  recordHttpRequest,
} from './metrics/index.js';
import { handleApiRequest } from './api/routes.js';

const PORT = process.env.PORT || 3000;

// Initialize gateway with proper config matching types
const config: MCPGatewayConfig = {
  name: 'forge-gateway-dev',
  enabled: true,
  security: {
    oauth: {
      enabled: false,
      issuer: '',
      scopes: [],
      pkceRequired: true,
    },
    inputSanitization: {
      enabled: true,
      maxInputSize: 1024 * 1024,
      allowedContentTypes: ['application/json'],
      blockPatterns: [],
    },
    toolIntegrity: {
      enabled: true,
      hashAlgorithm: 'sha256',
      requireSignature: false,
      trustedSigners: [],
    },
    supplyChain: {
      enabled: false,
      allowedRegistries: [],
      requireSBOM: false,
      vulnerabilityScan: false,
    },
  },
  approval: {
    enabled: true,
    defaultMode: 'risk-based',
    requireApproval: ['execute_shell', 'delete_database', 'admin_action'],
    autoApprove: ['read_file', 'list_files', 'search'],
    timeoutMs: 300000,
    carsIntegration: {
      enabled: true,
      riskThreshold: 0.7,
    },
  },
  sandbox: {
    enabled: false,
    runtime: 'none',
    limits: {
      maxCpuMs: 5000,
      maxMemoryMb: 128,
      maxDiskMb: 100,
      maxNetworkConnections: 0,
      executionTimeoutMs: 30000,
    },
    network: {
      allowEgress: false,
      allowedHosts: [],
      blockedHosts: [],
    },
    filesystem: {
      readOnly: ['/'],
      writable: ['/tmp'],
      blocked: ['/etc', '/var'],
    },
  },
  privacy: {
    enabled: true,
    patterns: [],
    tokenFormat: 'PII_{type}_{hash}',
    tokenTtlMs: 3600000,
    alwaysTokenize: ['ssn', 'credit_card'],
    neverTokenize: ['id', 'name'],
  },
  monitoring: {
    enabled: true,
    audit: {
      enabled: true,
      logLevel: 'info',
      retentionDays: 90,
      includePayloads: false,
    },
    anomalyDetection: {
      enabled: true,
      baseline: 100,
      alertThreshold: 3,
    },
    toolBehavior: {
      enabled: true,
      trackDescriptionChanges: true,
      alertOnChange: true,
    },
    metrics: {
      enabled: true,
      exportInterval: 60,
    },
  },
  toolRegistry: {
    allowlistEnabled: false,
    allowedTools: [],
    blockedTools: [],
    discoveryMode: 'dynamic',
    sources: [],
  },
  rateLimiting: {
    enabled: true,
    requestsPerWindow: 100,
    windowMs: 60000,
    perToolLimits: {},
    perTenantLimits: {},
  },
  tenantIsolation: {
    enabled: true,
    mode: 'namespace',
    tenantIdHeader: 'X-Tenant-ID',
    crossTenantRules: [],
  },
};

const gateway = new MCPGateway(config);

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const startTime = Date.now();
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const method = req.method || 'GET';

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID, X-User-ID');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // Prometheus metrics endpoint
    if (url.pathname === '/metrics') {
      const metrics = await getMetrics();
      res.writeHead(200, { 'Content-Type': getContentType() });
      res.end(metrics);
      recordHttpRequest(method, '/metrics', 200, Date.now() - startTime);
      return;
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        components: {
          gateway: 'operational',
          security: 'operational',
          cars: 'operational',
          monitoring: 'operational',
        },
      }));
      recordHttpRequest(method, '/health', 200, Date.now() - startTime);
      return;
    }

    // Status endpoint
    if (url.pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      }));
      recordHttpRequest(method, '/status', 200, Date.now() - startTime);
      return;
    }

    // Config endpoint (non-sensitive)
    if (url.pathname === '/config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: config.name,
        enabled: config.enabled,
        security: {
          oauth: { enabled: config.security.oauth.enabled },
          inputSanitization: { enabled: config.security.inputSanitization.enabled },
          toolIntegrity: { enabled: config.security.toolIntegrity.enabled },
        },
        sandbox: { enabled: config.sandbox.enabled, runtime: config.sandbox.runtime },
        monitoring: { enabled: config.monitoring.enabled },
        approval: { enabled: config.approval.enabled, defaultMode: config.approval.defaultMode },
      }));
      recordHttpRequest(method, '/config', 200, Date.now() - startTime);
      return;
    }

    // API routes
    if (url.pathname.startsWith('/api/')) {
      const handled = await handleApiRequest(req, res, url.pathname);
      if (handled) {
        recordHttpRequest(method, url.pathname, res.statusCode || 200, Date.now() - startTime);
        return;
      }
    }

    // Default response - API info
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'FORGE MCP Gateway',
      version: '0.1.0',
      endpoints: {
        system: ['/health', '/status', '/config', '/metrics'],
        api: [
          'POST /api/v1/assess - Run CARS risk assessment',
          'GET /api/v1/assess/:id - Get assessment by ID',
          'POST /api/v1/approve/:id - Approve/reject assessment',
          'GET /api/v1/assessments - List all assessments',
          'POST /api/v1/auth/token - OAuth token endpoint',
          'GET /api/v1/tenant/context - Get tenant context',
          'GET /api/v1/stats - Get system statistics',
        ],
      },
    }));
    recordHttpRequest(method, '/', 200, Date.now() - startTime);
  } catch (error) {
    console.error('Request error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
    recordHttpRequest(method, url.pathname, 500, Date.now() - startTime);
  }
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    FORGE MCP Gateway                          ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:    Running                                           ║
║  Port:      ${String(PORT).padEnd(45)}║
║  Health:    http://localhost:${PORT}/health                     ║
║  Metrics:   http://localhost:${PORT}/metrics                    ║
║  API Docs:  http://localhost:${PORT}/                           ║
╠═══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║  - POST /api/v1/assess      CARS risk assessment              ║
║  - GET  /api/v1/assess/:id  Get assessment result             ║
║  - POST /api/v1/approve/:id Approve/reject operation          ║
║  - POST /api/v1/auth/token  OAuth token endpoint              ║
║  - GET  /api/v1/tenant/context  Tenant information            ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
