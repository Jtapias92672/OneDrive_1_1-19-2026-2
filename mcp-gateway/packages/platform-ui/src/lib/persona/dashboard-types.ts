// Dashboard Types - Epic 15
// Shared types for dashboard data fetching

export interface ReliabilityMetrics {
  successRate: number;       // 0-100
  tasksThisWeek: number;
  avgIterations: number;     // decimal
  templatesUsed: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  successRate: number;       // 0-100
  usageCount: number;
}

export interface Project {
  id: string;
  name: string;
  status: 'completed' | 'in_progress' | 'failed';
  successRate: number;       // 0-100 or null if in progress
  iterationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillModule {
  id: string;
  name: string;
  completed: boolean;
  timeEstimateMinutes: number;
}

export interface SkillTrack {
  id: string;
  name: string;
  progress: number;          // 0-100
  modules: SkillModule[];
  currentModule?: SkillModule;
  nextModule?: SkillModule;
}

export interface SkillProgress {
  currentTrack: SkillTrack;
  totalModulesCompleted: number;
  totalTimeSpentMinutes: number;
}
