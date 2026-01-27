/**
 * Wolfram Alpha Types
 * Epic 14: Computational Accuracy Layer
 */

export interface WolframConfig {
  appId: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  requestsPerMinute: number;
  requestsPerMonth: number;
}

export interface WolframPod {
  title: string;
  scanner: string;
  id: string;
  position: number;
  error: boolean;
  numsubpods: number;
  subpods: WolframSubpod[];
}

export interface WolframSubpod {
  title: string;
  plaintext?: string;
  img?: {
    src: string;
    alt: string;
    title: string;
  };
}

export interface WolframResult {
  success: boolean;
  query: string;
  result?: string;
  pods?: WolframPod[];
  error?: string;
  cached: boolean;
  cost: number;
  responseTime?: number;
}

export interface WolframQueryOptions {
  format?: 'plaintext' | 'image' | 'both';
  units?: 'metric' | 'imperial';
  timeout?: number;
}

export interface RateLimiterConfig {
  requestsPerMinute: number;
  requestsPerMonth: number;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
