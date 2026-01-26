/**
 * FORGE Platform - k6 Load Test Configuration
 * @epic 12 - E2E Testing
 * 
 * Load testing scenarios for API and convergence engine
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const contractCreationTime = new Trend('contract_creation_time');
const executionStartTime = new Trend('execution_start_time');
const validationTime = new Trend('validation_time');
const apiRequests = new Counter('api_requests');

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Test scenarios
export const options = {
  scenarios: {
    // Smoke test - quick sanity check
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest',
    },
    
    // Load test - normal traffic
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up
        { duration: '5m', target: 50 },   // Stay at 50
        { duration: '2m', target: 100 },  // Ramp to 100
        { duration: '5m', target: 100 },  // Stay at 100
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'load' },
      exec: 'loadTest',
      startTime: '2m', // Start after smoke
    },
    
    // Stress test - find breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 400 },
        { duration: '5m', target: 400 },
        { duration: '5m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      exec: 'stressTest',
      startTime: '18m',
    },
    
    // Spike test - sudden traffic surge
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '30s', target: 500 }, // Spike!
        { duration: '1m', target: 500 },
        { duration: '30s', target: 10 },
        { duration: '2m', target: 10 },
      ],
      tags: { test_type: 'spike' },
      exec: 'spikeTest',
      startTime: '50m',
    },
    
    // Soak test - extended duration
    soak: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2h',
      tags: { test_type: 'soak' },
      exec: 'soakTest',
      startTime: '55m',
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
    contract_creation_time: ['p(95)<2000'],
    execution_start_time: ['p(95)<3000'],
    validation_time: ['p(95)<1000'],
  },
};

// Helper functions
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
}

function handleResponse(response, name) {
  apiRequests.add(1);
  const success = check(response, {
    [`${name} status is 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${name} response time < 500ms`]: (r) => r.timings.duration < 500,
  });
  errorRate.add(!success);
  return success;
}

// Smoke test scenario
export function smokeTest() {
  group('Health Check', () => {
    const response = http.get(`${BASE_URL}/health`);
    handleResponse(response, 'health');
  });
  
  group('List Contracts', () => {
    const response = http.get(`${BASE_URL}/api/v1/contracts?limit=10`, {
      headers: getHeaders(),
    });
    handleResponse(response, 'list_contracts');
  });
  
  sleep(1);
}

// Load test scenario
export function loadTest() {
  const userId = `user_${__VU}_${__ITER}`;
  
  group('Browse Contracts', () => {
    // List contracts
    const listResponse = http.get(`${BASE_URL}/api/v1/contracts?limit=20`, {
      headers: getHeaders(),
    });
    handleResponse(listResponse, 'list_contracts');
    
    if (listResponse.status === 200) {
      const contracts = JSON.parse(listResponse.body).data;
      if (contracts.length > 0) {
        // Get single contract
        const contractId = contracts[0].id;
        const getResponse = http.get(`${BASE_URL}/api/v1/contracts/${contractId}`, {
          headers: getHeaders(),
        });
        handleResponse(getResponse, 'get_contract');
      }
    }
  });
  
  group('Create and Validate', () => {
    // Create contract
    const contractPayload = JSON.stringify({
      name: `Load Test Contract ${userId}`,
      type: 'validation',
      sections: [{
        name: 'Test',
        content: `Test content for ${userId}`,
      }],
    });
    
    const startCreate = Date.now();
    const createResponse = http.post(
      `${BASE_URL}/api/v1/contracts`,
      contractPayload,
      { headers: getHeaders() }
    );
    contractCreationTime.add(Date.now() - startCreate);
    handleResponse(createResponse, 'create_contract');
    
    if (createResponse.status === 201) {
      const contract = JSON.parse(createResponse.body);
      
      // Validate
      const validatePayload = JSON.stringify({
        answer: 'Test validation answer',
        validators: ['semantic', 'structural'],
      });
      
      const startValidate = Date.now();
      const validateResponse = http.post(
        `${BASE_URL}/api/v1/validate`,
        validatePayload,
        { headers: getHeaders() }
      );
      validationTime.add(Date.now() - startValidate);
      handleResponse(validateResponse, 'validate');
      
      // Cleanup
      http.del(`${BASE_URL}/api/v1/contracts/${contract.id}`, null, {
        headers: getHeaders(),
      });
    }
  });
  
  sleep(Math.random() * 3 + 1); // 1-4 second think time
}

// Stress test scenario
export function stressTest() {
  group('High Volume Operations', () => {
    // Rapid contract creation
    const contractPayload = JSON.stringify({
      name: `Stress Test ${randomString(8)}`,
      type: 'validation',
      sections: [{ name: 'Test', content: 'Stress test content' }],
    });
    
    const createResponse = http.post(
      `${BASE_URL}/api/v1/contracts`,
      contractPayload,
      { headers: getHeaders() }
    );
    handleResponse(createResponse, 'stress_create');
    
    // Concurrent reads
    const batch = [];
    for (let i = 0; i < 5; i++) {
      batch.push(['GET', `${BASE_URL}/api/v1/contracts?page=${i + 1}`, null, {
        headers: getHeaders(),
      }]);
    }
    
    const responses = http.batch(batch);
    responses.forEach((r, i) => handleResponse(r, `stress_batch_${i}`));
    
    // Cleanup if created
    if (createResponse.status === 201) {
      const contract = JSON.parse(createResponse.body);
      http.del(`${BASE_URL}/api/v1/contracts/${contract.id}`, null, {
        headers: getHeaders(),
      });
    }
  });
  
  sleep(0.5);
}

// Spike test scenario
export function spikeTest() {
  group('Spike Traffic', () => {
    // Quick health checks
    const healthResponse = http.get(`${BASE_URL}/health`);
    handleResponse(healthResponse, 'spike_health');
    
    // API call
    const response = http.get(`${BASE_URL}/api/v1/contracts?limit=5`, {
      headers: getHeaders(),
    });
    handleResponse(response, 'spike_list');
  });
  
  sleep(0.1); // Minimal think time during spike
}

// Soak test scenario
export function soakTest() {
  group('Extended Operations', () => {
    // Mix of operations
    const operations = [
      () => http.get(`${BASE_URL}/api/v1/contracts?limit=10`, { headers: getHeaders() }),
      () => http.get(`${BASE_URL}/api/v1/executions?limit=10`, { headers: getHeaders() }),
      () => http.get(`${BASE_URL}/health`),
    ];
    
    const op = operations[Math.floor(Math.random() * operations.length)];
    const response = op();
    handleResponse(response, 'soak_operation');
  });
  
  sleep(2);
}

// Default function (runs if no scenario specified)
export default function() {
  loadTest();
}

// Setup function
export function setup() {
  // Verify API is accessible
  const response = http.get(`${BASE_URL}/health`);
  if (response.status !== 200) {
    throw new Error(`API not healthy: ${response.status}`);
  }
  
  console.log(`Load test starting against ${BASE_URL}`);
  
  return { startTime: Date.now() };
}

// Teardown function
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration} seconds`);
}

// Summary handler
export function handleSummary(data) {
  return {
    'reports/load-test-summary.json': JSON.stringify(data, null, 2),
    'reports/load-test-summary.html': generateHtmlReport(data),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}

function generateHtmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>FORGE Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <h1>FORGE Load Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  
  <h2>Summary</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Total Requests</td><td>${data.metrics.http_reqs?.values?.count || 0}</td></tr>
    <tr><td>Request Rate</td><td>${(data.metrics.http_reqs?.values?.rate || 0).toFixed(2)}/s</td></tr>
    <tr><td>Avg Duration</td><td>${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms</td></tr>
    <tr><td>p95 Duration</td><td>${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms</td></tr>
    <tr><td>Error Rate</td><td>${((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%</td></tr>
  </table>
  
  <h2>Thresholds</h2>
  <table>
    <tr><th>Threshold</th><th>Result</th></tr>
    ${Object.entries(data.thresholds || {}).map(([name, passed]) => 
      `<tr><td>${name}</td><td class="${passed ? 'pass' : 'fail'}">${passed ? 'PASS' : 'FAIL'}</td></tr>`
    ).join('')}
  </table>
</body>
</html>
  `;
}

function textSummary(data, options) {
  // Simple text summary
  return `
=== FORGE Load Test Summary ===
Total Requests: ${data.metrics.http_reqs?.values?.count || 0}
Request Rate: ${(data.metrics.http_reqs?.values?.rate || 0).toFixed(2)}/s
Avg Duration: ${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms
p95 Duration: ${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms
Error Rate: ${((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%
`;
}
