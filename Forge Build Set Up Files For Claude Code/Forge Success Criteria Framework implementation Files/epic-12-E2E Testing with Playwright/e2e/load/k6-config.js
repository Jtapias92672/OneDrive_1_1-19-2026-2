/**
 * FORGE E2E Tests - k6 Load Test Configuration
 * @epic 12 - E2E Testing
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const executionDuration = new Trend('execution_duration');

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up
    { duration: '3m', target: 10 },   // Steady state
    { duration: '1m', target: 50 },   // Spike
    { duration: '2m', target: 50 },   // Hold spike
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    errors: ['rate<0.1'],                // Error rate under 10%
  },
};

const BASE_URL = __ENV.FORGE_API_URL || 'http://localhost:3100';

export function setup() {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email: 'admin@test.com', password: 'admin123' }), { headers: { 'Content-Type': 'application/json' } });
  return { token: JSON.parse(loginRes.body).token };
}

export default function(data) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` };

  // Create contract
  const contract = http.post(`${BASE_URL}/api/contracts`, JSON.stringify({ name: `Load Test ${Date.now()}`, yaml: 'name: test\nversion: 1.0.0' }), { headers });
  check(contract, { 'contract created': (r) => r.status === 201 });
  errorRate.add(contract.status !== 201);

  if (contract.status === 201) {
    const contractId = JSON.parse(contract.body).id;

    // Start execution
    const startTime = Date.now();
    const execution = http.post(`${BASE_URL}/api/executions`, JSON.stringify({ contractId, input: {} }), { headers });
    check(execution, { 'execution started': (r) => r.status === 201 });
    
    if (execution.status === 201) {
      const execId = JSON.parse(execution.body).id;
      
      // Poll for completion
      let status = 'pending';
      while (status === 'pending' || status === 'running') {
        sleep(1);
        const statusRes = http.get(`${BASE_URL}/api/executions/${execId}`, { headers });
        if (statusRes.status === 200) {
          status = JSON.parse(statusRes.body).status;
        }
        if (Date.now() - startTime > 60000) break;
      }
      
      executionDuration.add(Date.now() - startTime);
    }
  }

  sleep(1);
}
