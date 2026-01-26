/**
 * Progress Parser Tests
 */

import { parseProgressMd, getMockEpicProgress } from '../lib/parsers/progress-parser';

describe('Progress Parser', () => {
  describe('parseProgressMd', () => {
    it('should parse basic progress markdown', () => {
      const content = `
# FORGE Build Progress

**Overall Confidence:** 97%
**Last Updated:** 2026-01-24T00:00:00Z

### Epic 05: Figma Parser
**Status:** ✅ Complete
**Confidence:** 97%

- [x] Task 1
- [x] Task 2
- [x] Task 3
`;

      const result = parseProgressMd(content);
      expect(result.overallConfidence).toBe(97);
      expect(result.epics.length).toBe(1);
      expect(result.epics[0].id).toBe('Epic-05');
      expect(result.epics[0].name).toBe('Figma Parser');
      expect(result.epics[0].tasksComplete).toBe(3);
      expect(result.epics[0].tasksTotal).toBe(3);
      expect(result.epics[0].status).toBe('complete');
    });

    it('should parse in-progress epics', () => {
      const content = `
### Epic 06: Prompt Optimization
**Status:** In Progress
**Confidence:** 85%

- [x] Task 1
- [x] Task 2
- [ ] Task 3
- [ ] Task 4
`;

      const result = parseProgressMd(content);
      expect(result.epics[0].status).toBe('in-progress');
      expect(result.epics[0].tasksComplete).toBe(2);
      expect(result.epics[0].tasksTotal).toBe(4);
      expect(result.epics[0].percentage).toBe(50);
    });

    it('should parse RECOVERY tasks', () => {
      const content = `
### RECOVERY-01: JWT Signature Verification
**Status:** ✅ Complete

- [x] Task RECOVERY-01.1
- [x] Task RECOVERY-01.2
`;

      const result = parseProgressMd(content);
      expect(result.epics[0].id).toBe('RECOVERY-01');
      expect(result.epics[0].name).toBe('JWT Signature Verification');
      expect(result.epics[0].status).toBe('complete');
    });

    it('should extract phase information', () => {
      const content = `
### Epic 10: Platform UI
**Status:** In Progress
Phase 2 of 3

- [x] Task 1
- [ ] Task 2
`;

      const result = parseProgressMd(content);
      expect(result.epics[0].phase).toBe('Phase 2 of 3');
    });

    it('should find current epic correctly', () => {
      const content = `
### Epic 01: Foundation
**Status:** ✅ Complete
- [x] All done

### Epic 02: Core Features
**Status:** In Progress
- [x] Started
- [ ] More work

### Epic 03: Advanced
**Status:** Not started
`;

      const result = parseProgressMd(content);
      expect(result.currentEpic?.id).toBe('Epic-02');
      expect(result.currentEpic?.status).toBe('in-progress');
    });

    it('should calculate totals correctly', () => {
      const content = `
### Epic 01: First
- [x] Task 1
- [x] Task 2

### Epic 02: Second
- [x] Task 1
- [ ] Task 2
- [ ] Task 3
`;

      const result = parseProgressMd(content);
      expect(result.totalTasksComplete).toBe(3);
      expect(result.totalTasksTotal).toBe(5);
    });

    it('should handle empty content', () => {
      const result = parseProgressMd('');
      expect(result.epics).toEqual([]);
      expect(result.overallConfidence).toBe(0);
      expect(result.currentEpic).toBeNull();
    });

    it('should handle content with no tasks', () => {
      const content = `
### Epic 01: Empty
**Status:** Not started
`;

      const result = parseProgressMd(content);
      expect(result.epics[0].tasksComplete).toBe(0);
      expect(result.epics[0].tasksTotal).toBe(0);
      expect(result.epics[0].percentage).toBe(0);
    });
  });

  describe('getMockEpicProgress', () => {
    it('should return normal progress by default', () => {
      const result = getMockEpicProgress();
      expect(result.id).toBe('Epic-10b');
      expect(result.percentage).toBe(62);
      expect(result.confidence).toBe(97);
    });

    it('should return warning state for warning mode', () => {
      const result = getMockEpicProgress('warning');
      expect(result.percentage).toBe(50);
      expect(result.confidence).toBe(85);
    });

    it('should return critical state for critical mode', () => {
      const result = getMockEpicProgress('critical');
      expect(result.percentage).toBe(25);
      expect(result.confidence).toBe(72);
    });

    it('should always return in-progress status', () => {
      expect(getMockEpicProgress('normal').status).toBe('in-progress');
      expect(getMockEpicProgress('warning').status).toBe('in-progress');
      expect(getMockEpicProgress('critical').status).toBe('in-progress');
    });
  });
});
