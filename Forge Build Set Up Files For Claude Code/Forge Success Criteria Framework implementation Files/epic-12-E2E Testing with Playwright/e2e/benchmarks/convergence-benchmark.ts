/**
 * FORGE E2E Tests - Convergence Benchmark
 * @epic 12 - E2E Testing
 */

interface BenchmarkResult {
  name: string;
  iterations: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  throughput: number;
}

export async function runConvergenceBenchmark(iterations = 100): Promise<BenchmarkResult> {
  const apiUrl = process.env.FORGE_API_URL || 'http://localhost:3100';
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    await fetch(`${apiUrl}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId: 'benchmark-contract', output: { result: `test-${i}` } }),
    });

    durations.push(performance.now() - start);
  }

  durations.sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);

  return {
    name: 'Convergence Validation',
    iterations,
    avgDurationMs: sum / iterations,
    minDurationMs: durations[0],
    maxDurationMs: durations[durations.length - 1],
    p50Ms: durations[Math.floor(iterations * 0.5)],
    p95Ms: durations[Math.floor(iterations * 0.95)],
    p99Ms: durations[Math.floor(iterations * 0.99)],
    throughput: iterations / (sum / 1000),
  };
}

export async function runFullBenchmarkSuite(): Promise<BenchmarkResult[]> {
  console.log('Running FORGE Benchmark Suite...\n');
  
  const results: BenchmarkResult[] = [];
  
  console.log('1. Convergence Validation Benchmark');
  results.push(await runConvergenceBenchmark(100));
  
  console.log('\nBenchmark Complete!\n');
  console.table(results);
  
  return results;
}
