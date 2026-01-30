/**
 * Wolfram Alpha Client
 * Epic 14: Computational Accuracy Layer
 */
import { RateLimiter } from './rate-limiter.js';
import { WolframCache } from './wolfram-cache.js';
import { QueryFormatter } from './query-formatter.js';
const DEFAULT_CONFIG = {
    appId: process.env.WOLFRAM_APP_ID || '',
    baseUrl: 'https://api.wolframalpha.com/v1/llm-api',
    timeout: 30000,
    maxRetries: 3,
    requestsPerMinute: 20,
    requestsPerMonth: 2000,
};
export class WolframClient {
    config;
    rateLimiter;
    cache;
    queryFormatter;
    enabled;
    constructor(config, cache) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.cache = cache || new WolframCache();
        this.rateLimiter = new RateLimiter({
            requestsPerMinute: this.config.requestsPerMinute,
            requestsPerMonth: this.config.requestsPerMonth,
        });
        this.queryFormatter = new QueryFormatter();
        this.enabled = !!this.config.appId;
    }
    /**
     * Check if client is configured
     */
    isEnabled() {
        return this.enabled;
    }
    /**
     * Query Wolfram Alpha with a raw string
     */
    async query(input, options) {
        const startTime = Date.now();
        // Check cache first
        const cached = await this.cache.get(input);
        if (cached) {
            return {
                ...cached,
                cached: true,
                cost: 0,
                responseTime: Date.now() - startTime,
            };
        }
        // If not enabled, return mock/error
        if (!this.enabled) {
            const mockResult = this.getMockResult(input);
            // Cache successful mock results
            if (mockResult.success) {
                await this.cache.set(input, mockResult);
            }
            return mockResult;
        }
        // Rate limit check
        try {
            await this.rateLimiter.acquire();
        }
        catch {
            return {
                success: false,
                query: input,
                error: 'Rate limit exceeded',
                cached: false,
                cost: 0,
                responseTime: Date.now() - startTime,
            };
        }
        // Make API call with retries
        let lastError = null;
        for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
            try {
                const result = await this.makeRequest(input, options);
                result.responseTime = Date.now() - startTime;
                // Cache successful results
                if (result.success) {
                    await this.cache.set(input, result);
                }
                return result;
            }
            catch (error) {
                lastError = error;
                // Wait before retry
                if (attempt < this.config.maxRetries - 1) {
                    await this.sleep(1000 * (attempt + 1));
                }
            }
        }
        return {
            success: false,
            query: input,
            error: lastError?.message || 'Unknown error',
            cached: false,
            cost: 0,
            responseTime: Date.now() - startTime,
        };
    }
    /**
     * Query Wolfram Alpha for a detected claim
     */
    async validateClaim(claim) {
        const formatted = this.queryFormatter.formatQuery(claim);
        return this.query(formatted.query);
    }
    /**
     * Make HTTP request to Wolfram Alpha
     */
    async makeRequest(input, options) {
        const url = new URL(this.config.baseUrl);
        url.searchParams.set('appid', this.config.appId);
        url.searchParams.set('input', input);
        if (options?.units) {
            url.searchParams.set('units', options.units);
        }
        const timeout = options?.timeout || this.config.timeout;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    Accept: 'text/plain',
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`Wolfram API error: ${response.status}`);
            }
            const text = await response.text();
            return this.parseTextResponse(text, input);
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    /**
     * Parse Wolfram LLM API text response
     */
    parseTextResponse(text, query) {
        // LLM API returns plain text
        if (!text || text.includes('No results')) {
            return {
                success: false,
                query,
                error: 'No results found',
                cached: false,
                cost: 0.001,
            };
        }
        return {
            success: true,
            query,
            result: text.trim(),
            cached: false,
            cost: 0.001,
        };
    }
    /**
     * Get mock result when API is not configured
     */
    getMockResult(input) {
        // Provide basic mock responses for common queries
        const mockResponses = {
            'speed of light in m/s': '299792458 m/s (meters per second)',
            "avogadro's number": '6.02214076 × 10^23 mol^(-1)',
            '2 + 2': '4',
            '10 * 5': '50',
            'sqrt(16)': '4',
            'sqrt(144)': '12',
        };
        const normalizedInput = input.toLowerCase().trim();
        const mockResult = mockResponses[normalizedInput];
        if (mockResult) {
            return {
                success: true,
                query: input,
                result: mockResult,
                cached: false,
                cost: 0,
            };
        }
        // For arithmetic, try to compute locally
        const arithmeticMatch = input.match(/^(\d+)\s*([\+\-\*\/])\s*(\d+)$/);
        if (arithmeticMatch) {
            const [, a, op, b] = arithmeticMatch;
            let result;
            switch (op) {
                case '+':
                    result = Number(a) + Number(b);
                    break;
                case '-':
                    result = Number(a) - Number(b);
                    break;
                case '*':
                    result = Number(a) * Number(b);
                    break;
                case '/':
                    result = Number(a) / Number(b);
                    break;
                default:
                    result = NaN;
            }
            if (!isNaN(result)) {
                return {
                    success: true,
                    query: input,
                    result: String(result),
                    cached: false,
                    cost: 0,
                };
            }
        }
        return {
            success: false,
            query: input,
            error: 'Wolfram API not configured (no APP_ID)',
            cached: false,
            cost: 0,
        };
    }
    /**
     * Get rate limiter status
     */
    getRateLimitStatus() {
        return this.rateLimiter.getStatus();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.cache.getStats();
    }
    /**
     * Reset for testing
     */
    reset() {
        this.rateLimiter.reset();
        this.cache.reset();
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
// Singleton instance
export const wolframClient = new WolframClient();
