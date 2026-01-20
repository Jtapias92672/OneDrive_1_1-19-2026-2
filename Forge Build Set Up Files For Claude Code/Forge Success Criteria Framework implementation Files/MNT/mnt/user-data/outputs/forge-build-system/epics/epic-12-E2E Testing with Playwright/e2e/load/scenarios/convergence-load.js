/**
 * FORGE E2E Tests - Convergence Load Test
 * @epic 12 - E2E Testing
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    constant_rate: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1m',
      duration: '5m',
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
  },
};

const BASE_URL = __ENV.FORGE_API_URL || 'http://localhost:3100';

export default function() {
  const res = http.post(`${BASE_URL}/api/validate`, JSON.stringify({
    contractId: 'test-contract',
    output: { result: 'test output' },
  }), { headers: { 'Content-Type': 'application/json' } });

  check(res, {
    'validation returned': (r) => r.status === 200,
    'score present': (r) => JSON.parse(r.body).score !== undefined,
  });

  sleep(0.1);
}
