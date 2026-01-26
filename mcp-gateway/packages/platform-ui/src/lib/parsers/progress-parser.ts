/**
 * FORGE Progress Parser
 *
 * Parses .forge/progress.md to extract epic progress information
 */

export interface EpicProgress {
  id: string;
  name: string;
  tasksComplete: number;
  tasksTotal: number;
  percentage: number;
  phase: string;
  status: 'complete' | 'in-progress' | 'needs-fixes' | 'not-started';
  confidence?: number;
}

export interface ProgressSummary {
  currentEpic: EpicProgress | null;
  epics: EpicProgress[];
  overallConfidence: number;
  lastUpdated: string;
  totalTasksComplete: number;
  totalTasksTotal: number;
}

/**
 * Parse a single epic section from progress.md
 */
function parseEpicSection(section: string): EpicProgress | null {
  // Match epic header: ### Epic XX: Name or ### RECOVERY-XX: Name
  const headerMatch = section.match(/^###\s+(Epic\s+[\d.]+|RECOVERY-\d+):\s*(.+)/m);
  if (!headerMatch) return null;

  const id = headerMatch[1].replace(/\s+/g, '-');
  const name = headerMatch[2].trim();

  // Count completed and total tasks
  const completedTasks = (section.match(/- \[x\]/gi) || []).length;
  const incompleteTasks = (section.match(/- \[ \]/g) || []).length;
  const totalTasks = completedTasks + incompleteTasks;

  // Extract status
  const statusMatch = section.match(/\*\*Status:\*\*\s*([^\n]+)/);
  let status: EpicProgress['status'] = 'not-started';
  if (statusMatch) {
    const statusText = statusMatch[1].toLowerCase();
    if (statusText.includes('complete') && !statusText.includes('issues')) {
      status = 'complete';
    } else if (statusText.includes('complete')) {
      status = totalTasks > 0 && completedTasks === totalTasks ? 'complete' : 'needs-fixes';
    } else if (statusText.includes('progress') || completedTasks > 0) {
      status = 'in-progress';
    }
  } else if (completedTasks > 0) {
    status = completedTasks === totalTasks ? 'complete' : 'in-progress';
  }

  // Extract confidence
  const confidenceMatch = section.match(/\*\*Confidence:\*\*\s*(\d+)/);
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : undefined;

  // Calculate percentage
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Extract phase (look for Phase X of Y pattern)
  const phaseMatch = section.match(/Phase\s+(\d+)\s+of\s+(\d+)/i);
  const phase = phaseMatch ? `Phase ${phaseMatch[1]} of ${phaseMatch[2]}` : '';

  return {
    id,
    name,
    tasksComplete: completedTasks,
    tasksTotal: totalTasks,
    percentage,
    phase,
    status,
    confidence,
  };
}

/**
 * Find the current/active epic (most recently worked on incomplete epic)
 */
function findCurrentEpic(epics: EpicProgress[]): EpicProgress | null {
  // Look for in-progress epics first
  const inProgress = epics.find(e => e.status === 'in-progress');
  if (inProgress) return inProgress;

  // Look for needs-fixes epics
  const needsFixes = epics.find(e => e.status === 'needs-fixes');
  if (needsFixes) return needsFixes;

  // Return the last complete epic if all are done
  const completeEpics = epics.filter(e => e.status === 'complete');
  if (completeEpics.length > 0) return completeEpics[completeEpics.length - 1];

  return epics[0] || null;
}

/**
 * Parse the full progress.md content
 */
export function parseProgressMd(content: string): ProgressSummary {
  const epics: EpicProgress[] = [];

  // Extract overall confidence from header
  const confidenceMatch = content.match(/\*\*Overall Confidence:\*\*\s*(\d+)/);
  const overallConfidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : 0;

  // Extract last updated
  const lastUpdatedMatch = content.match(/\*\*Last Updated:\*\*\s*([^\n]+)/);
  const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1].trim() : new Date().toISOString();

  // Split by ### headers and parse each section
  const sections = content.split(/(?=^###\s+)/m);

  for (const section of sections) {
    const epic = parseEpicSection(section);
    if (epic) {
      epics.push(epic);
    }
  }

  // Calculate totals
  const totalTasksComplete = epics.reduce((sum, e) => sum + e.tasksComplete, 0);
  const totalTasksTotal = epics.reduce((sum, e) => sum + e.tasksTotal, 0);

  // Find current epic
  const currentEpic = findCurrentEpic(epics);

  return {
    currentEpic,
    epics,
    overallConfidence,
    lastUpdated,
    totalTasksComplete,
    totalTasksTotal,
  };
}

/**
 * Get mock epic progress for demo mode
 */
export function getMockEpicProgress(demoMode: 'normal' | 'warning' | 'critical' = 'normal'): EpicProgress {
  return {
    id: 'Epic-10b',
    name: 'Platform UI Features',
    tasksComplete: demoMode === 'critical' ? 2 : demoMode === 'warning' ? 4 : 5,
    tasksTotal: 8,
    percentage: demoMode === 'critical' ? 25 : demoMode === 'warning' ? 50 : 62,
    phase: 'Phase 2 of 3',
    status: 'in-progress',
    confidence: demoMode === 'critical' ? 72 : demoMode === 'warning' ? 85 : 97,
  };
}
