/**
 * Index Export Tests
 *
 * Verifies that all modules are properly exported from index files
 */

import * as dashboardExports from '../lib/dashboard';
import * as parserExports from '../lib/parsers/progress-parser';
import * as tokenExports from '../lib/token-tracker';

describe('Index Exports', () => {
  describe('lib/dashboard/index.ts', () => {
    it('should export mock data functions', () => {
      expect(dashboardExports.getMockAgentMemory).toBeDefined();
      expect(dashboardExports.getMockEvidencePacks).toBeDefined();
      expect(dashboardExports.getMockCarsStatus).toBeDefined();
      expect(dashboardExports.getMockSupplyChain).toBeDefined();
      expect(dashboardExports.getMockVerification).toBeDefined();
      expect(dashboardExports.getMockFiles).toBeDefined();
      expect(dashboardExports.getMockTasks).toBeDefined();
      expect(dashboardExports.getMockDashboardData).toBeDefined();
    });
  });

  describe('lib/parsers/progress-parser.ts', () => {
    it('should export parser functions', () => {
      expect(parserExports.parseProgressMd).toBeDefined();
      expect(parserExports.getMockEpicProgress).toBeDefined();
    });
  });

  describe('lib/token-tracker.ts', () => {
    it('should export token tracker functions', () => {
      expect(tokenExports.getCurrentTokenUsage).toBeDefined();
      expect(tokenExports.addTokens).toBeDefined();
      expect(tokenExports.setTokens).toBeDefined();
      expect(tokenExports.resetSession).toBeDefined();
      expect(tokenExports.simulateTokenGrowth).toBeDefined();
      expect(tokenExports.getMockTokenUsage).toBeDefined();
    });
  });
});
