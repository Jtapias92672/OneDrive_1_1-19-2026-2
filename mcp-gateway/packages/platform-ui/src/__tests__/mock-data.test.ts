/**
 * Mock Data Tests
 */

import {
  getMockAgentMemory,
  getMockEvidencePacks,
  getMockCarsStatus,
  getMockSupplyChain,
  getMockVerification,
  getMockFiles,
  getMockTasks,
  getMockDashboardData,
} from '../lib/dashboard/mock-data';

describe('Mock Data Generators', () => {
  describe('getMockAgentMemory', () => {
    it('should return normal state for default mode', () => {
      const result = getMockAgentMemory();
      expect(result).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.session.current).toBeLessThan(result.session.optimal);
      expect(result.guardrails).toBeDefined();
      expect(result.guardrails.dp09).toBeDefined();
      expect(result.guardrails.dp10).toBeDefined();
    });

    it('should return warning state for warning mode', () => {
      const result = getMockAgentMemory('warning');
      expect(result.session.current).toBeGreaterThan(result.session.optimal);
      expect(result.session.current).toBeLessThan(result.session.danger);
    });

    it('should return critical state for critical mode', () => {
      const result = getMockAgentMemory('critical');
      expect(result.session.current).toBeGreaterThan(result.session.warning);
    });

    it('should have guardrails with required properties', () => {
      const result = getMockAgentMemory();
      const dp09 = result.guardrails.dp09;
      expect(dp09).toHaveProperty('name');
      expect(dp09).toHaveProperty('current');
      expect(dp09).toHaveProperty('target');
      expect(dp09).toHaveProperty('status');
      expect(dp09).toHaveProperty('critical');
    });

    it('should show failed guardrails in critical mode', () => {
      const result = getMockAgentMemory('critical');
      expect(result.guardrails.dp09.status).toBe('fail');
      expect(result.guardrails.dp10.status).toBe('fail');
    });
  });

  describe('getMockEvidencePacks', () => {
    it('should return evidence packs with session data', () => {
      const result = getMockEvidencePacks();
      expect(result).toBeDefined();
      expect(result.sessionPacks).toBeGreaterThanOrEqual(0);
      expect(result.epicTotal).toBeDefined();
      expect(result.cmmcReady).toBeDefined();
      expect(result.dfarsCompliant).toBeDefined();
    });

    it('should increase pack count for warning mode', () => {
      const normal = getMockEvidencePacks('normal');
      const warning = getMockEvidencePacks('warning');
      expect(warning.sessionPacks).toBeGreaterThan(normal.sessionPacks);
    });

    it('should show non-compliant for critical mode', () => {
      const result = getMockEvidencePacks('critical');
      expect(result.cmmcReady).toBe(false);
      expect(result.dfarsCompliant).toBe(false);
    });

    it('should have recent packs array', () => {
      const result = getMockEvidencePacks();
      expect(result.recentPacks).toBeInstanceOf(Array);
      expect(result.recentPacks.length).toBeGreaterThan(0);
      const pack = result.recentPacks[0];
      expect(pack).toHaveProperty('id');
      expect(pack).toHaveProperty('task');
      expect(pack).toHaveProperty('timestamp');
      expect(pack).toHaveProperty('size');
      expect(pack).toHaveProperty('signed');
    });
  });

  describe('getMockCarsStatus', () => {
    it('should return CARS status with autonomy level', () => {
      const result = getMockCarsStatus();
      expect(result).toBeDefined();
      expect(result.autonomyLevel).toBeDefined();
      expect(['AUTONOMOUS', 'SUPERVISED', 'HUMAN_REQUIRED']).toContain(result.autonomyLevel);
    });

    it('should return AUTONOMOUS for normal mode', () => {
      const result = getMockCarsStatus('normal');
      expect(result.autonomyLevel).toBe('AUTONOMOUS');
      expect(result.riskLevel).toBe(1);
    });

    it('should have gates array', () => {
      const result = getMockCarsStatus();
      expect(result.gates).toBeInstanceOf(Array);
      expect(result.gates.length).toBeGreaterThan(0);
      const gate = result.gates[0];
      expect(gate).toHaveProperty('name');
      expect(gate).toHaveProperty('status');
      expect(gate).toHaveProperty('risk');
    });

    it('should return SUPERVISED mode for warning', () => {
      const result = getMockCarsStatus('warning');
      expect(result.autonomyLevel).toBe('SUPERVISED');
      expect(result.pendingApprovals).toBe(1);
    });

    it('should return HUMAN_REQUIRED for critical', () => {
      const result = getMockCarsStatus('critical');
      expect(result.autonomyLevel).toBe('HUMAN_REQUIRED');
      expect(result.riskLevel).toBe(4);
      expect(result.pendingApprovals).toBe(3);
    });

    it('should block file write gate in critical mode', () => {
      const result = getMockCarsStatus('critical');
      const fileWriteGate = result.gates.find(g => g.name === 'File Write');
      expect(fileWriteGate?.status).toBe('blocked');
    });
  });

  describe('getMockSupplyChain', () => {
    it('should return supply chain metrics', () => {
      const result = getMockSupplyChain();
      expect(result).toBeDefined();
      expect(result.totalDeps).toBeDefined();
      expect(result.verifiedDeps).toBeLessThanOrEqual(result.totalDeps);
      expect(result.slsaLevel).toBeDefined();
    });

    it('should have signature status', () => {
      const result = getMockSupplyChain();
      expect(result.signaturesValid).toBeDefined();
    });

    it('should show all deps verified in normal mode', () => {
      const result = getMockSupplyChain('normal');
      expect(result.verifiedDeps).toBe(result.totalDeps);
      expect(result.signaturesValid).toBe(true);
      expect(result.vulnerabilities).toBe(0);
    });

    it('should show vulnerabilities for critical mode', () => {
      const result = getMockSupplyChain('critical');
      expect(result.vulnerabilities).toBeGreaterThan(0);
      expect(result.signaturesValid).toBe(false);
      expect(result.verifiedDeps).toBeLessThan(result.totalDeps);
      expect(result.slsaLevel).toBe(2);
    });

    it('should have SBOM generated', () => {
      const result = getMockSupplyChain();
      expect(result.sbomGenerated).toBe(true);
    });
  });

  describe('getMockVerification', () => {
    it('should return verification items', () => {
      const result = getMockVerification();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(4);
    });

    it('should have items with required properties', () => {
      const result = getMockVerification();
      const item = result[0];
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('status');
      expect(['pass', 'fail', 'running']).toContain(item.status);
    });

    it('should include specific test types', () => {
      const result = getMockVerification();
      const names = result.map(r => r.name);
      expect(names).toContain('Slop Tests');
      expect(names).toContain('TypeScript');
      expect(names).toContain('Unit Tests');
      expect(names).toContain('Integration');
    });

    it('should show Unit Tests as failed with count', () => {
      const result = getMockVerification();
      const unitTests = result.find(r => r.name === 'Unit Tests');
      expect(unitTests?.status).toBe('fail');
      expect(unitTests?.count).toBe(2);
    });
  });

  describe('getMockFiles', () => {
    it('should return files array', () => {
      const result = getMockFiles();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(4);
    });

    it('should have file items with progress', () => {
      const result = getMockFiles();
      const file = result[0];
      expect(file).toHaveProperty('name');
      expect(file).toHaveProperty('progress');
      expect(file).toHaveProperty('active');
      expect(file.progress).toBeGreaterThanOrEqual(0);
      expect(file.progress).toBeLessThanOrEqual(100);
    });

    it('should have first file as active', () => {
      const result = getMockFiles();
      expect(result[0].active).toBe(true);
      expect(result[1].active).toBe(false);
    });
  });

  describe('getMockTasks', () => {
    it('should return tasks array', () => {
      const result = getMockTasks();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(4);
    });

    it('should have task items with status', () => {
      const result = getMockTasks();
      const task = result[0];
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('text');
      expect(task).toHaveProperty('done');
    });

    it('should have mix of done and not done tasks', () => {
      const result = getMockTasks();
      const doneTasks = result.filter(t => t.done);
      const notDoneTasks = result.filter(t => !t.done);
      expect(doneTasks.length).toBeGreaterThan(0);
      expect(notDoneTasks.length).toBeGreaterThan(0);
    });
  });

  describe('getMockDashboardData', () => {
    it('should return complete dashboard data', () => {
      const result = getMockDashboardData();
      expect(result).toBeDefined();
      expect(result.agentMemory).toBeDefined();
      expect(result.evidencePacks).toBeDefined();
      expect(result.carsStatus).toBeDefined();
      expect(result.supplyChain).toBeDefined();
      expect(result.verification).toBeDefined();
      expect(result.files).toBeDefined();
      expect(result.tasks).toBeDefined();
    });

    it('should propagate demo mode to all sections', () => {
      const result = getMockDashboardData('critical');
      expect(result.carsStatus.autonomyLevel).toBe('HUMAN_REQUIRED');
      expect(result.supplyChain.vulnerabilities).toBeGreaterThan(0);
      expect(result.agentMemory.guardrails.dp09.status).toBe('fail');
      expect(result.evidencePacks.cmmcReady).toBe(false);
    });

    it('should be consistent across all modes', () => {
      const modes = ['normal', 'warning', 'critical'] as const;
      modes.forEach(mode => {
        const result = getMockDashboardData(mode);
        expect(result.agentMemory).toBeDefined();
        expect(result.carsStatus).toBeDefined();
        expect(result.supplyChain).toBeDefined();
      });
    });
  });
});
