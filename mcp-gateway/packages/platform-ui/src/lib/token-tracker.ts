/**
 * FORGE Token Tracker
 *
 * Tracks token usage across the current session
 * Thresholds based on Claude context window management
 */

export interface TokenUsage {
  current: number;
  optimal: number;
  warning: number;
  danger: number;
  status: 'optimal' | 'warning' | 'danger';
  breakdown: TokenBreakdown;
  lastUpdated: string;
}

export interface TokenBreakdown {
  systemPrompt: number;
  conversation: number;
  tools: number;
  context: number;
}

// Default thresholds (in tokens)
const THRESHOLDS = {
  optimal: 15000,
  warning: 30000,
  danger: 40000,
};

// In-memory token tracking (would be replaced with persistent storage in production)
let sessionTokens: TokenBreakdown = {
  systemPrompt: 2500,
  conversation: 0,
  tools: 0,
  context: 0,
};

let lastUpdated = new Date().toISOString();

/**
 * Calculate total tokens from breakdown
 */
function calculateTotal(breakdown: TokenBreakdown): number {
  return breakdown.systemPrompt + breakdown.conversation + breakdown.tools + breakdown.context;
}

/**
 * Determine status based on current token count
 */
function getStatus(current: number): TokenUsage['status'] {
  if (current <= THRESHOLDS.optimal) return 'optimal';
  if (current <= THRESHOLDS.warning) return 'warning';
  return 'danger';
}

/**
 * Get current token usage
 */
export function getCurrentTokenUsage(): TokenUsage {
  const current = calculateTotal(sessionTokens);
  return {
    current,
    optimal: THRESHOLDS.optimal,
    warning: THRESHOLDS.warning,
    danger: THRESHOLDS.danger,
    status: getStatus(current),
    breakdown: { ...sessionTokens },
    lastUpdated,
  };
}

/**
 * Add tokens to a specific category
 */
export function addTokens(category: keyof TokenBreakdown, count: number): void {
  sessionTokens[category] += count;
  lastUpdated = new Date().toISOString();
}

/**
 * Set tokens for a specific category
 */
export function setTokens(category: keyof TokenBreakdown, count: number): void {
  sessionTokens[category] = count;
  lastUpdated = new Date().toISOString();
}

/**
 * Reset session tokens
 */
export function resetSession(): void {
  sessionTokens = {
    systemPrompt: 2500,
    conversation: 0,
    tools: 0,
    context: 0,
  };
  lastUpdated = new Date().toISOString();
}

/**
 * Simulate token growth (for demo purposes)
 */
export function simulateTokenGrowth(demoMode: 'normal' | 'warning' | 'critical'): TokenUsage {
  const baseTokens: Record<string, TokenBreakdown> = {
    normal: {
      systemPrompt: 2500,
      conversation: 3200,
      tools: 1500,
      context: 1000,
    },
    warning: {
      systemPrompt: 2500,
      conversation: 12000,
      tools: 4500,
      context: 3000,
    },
    critical: {
      systemPrompt: 2500,
      conversation: 22000,
      tools: 6500,
      context: 4000,
    },
  };

  const breakdown = baseTokens[demoMode] || baseTokens.normal;
  const current = calculateTotal(breakdown);

  return {
    current,
    optimal: THRESHOLDS.optimal,
    warning: THRESHOLDS.warning,
    danger: THRESHOLDS.danger,
    status: getStatus(current),
    breakdown,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get mock token usage for demo mode
 */
export function getMockTokenUsage(demoMode: 'normal' | 'warning' | 'critical' = 'normal'): TokenUsage {
  return simulateTokenGrowth(demoMode);
}
