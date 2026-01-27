// Mock Data for P1 Dashboard - Epic 15
// Demonstrates "reliability" message with high success rates

import {
  ReliabilityMetrics,
  Template,
  Project,
  SkillProgress,
} from './dashboard-types';

export const mockReliabilityMetrics: ReliabilityMetrics = {
  successRate: 94,
  tasksThisWeek: 12,
  avgIterations: 1.3,
  templatesUsed: 8,
};

export const mockTemplates: Template[] = [
  {
    id: 'tpl-1',
    name: 'Dashboard UI',
    description: 'Modern dashboard with charts and metrics',
    thumbnail: '/templates/dashboard.svg',
    category: 'admin',
    successRate: 98,
    usageCount: 1250,
  },
  {
    id: 'tpl-2',
    name: 'Landing Page',
    description: 'Conversion-optimized landing page',
    thumbnail: '/templates/landing.svg',
    category: 'marketing',
    successRate: 97,
    usageCount: 2100,
  },
  {
    id: 'tpl-3',
    name: 'Form Builder',
    description: 'Multi-step form with validation',
    thumbnail: '/templates/form.svg',
    category: 'forms',
    successRate: 99,
    usageCount: 890,
  },
  {
    id: 'tpl-4',
    name: 'Admin Panel',
    description: 'Full-featured admin interface',
    thumbnail: '/templates/admin.svg',
    category: 'admin',
    successRate: 96,
    usageCount: 750,
  },
  {
    id: 'tpl-5',
    name: 'E-commerce Cart',
    description: 'Shopping cart with checkout flow',
    thumbnail: '/templates/cart.svg',
    category: 'ecommerce',
    successRate: 95,
    usageCount: 620,
  },
  {
    id: 'tpl-6',
    name: 'Blog Layout',
    description: 'Clean blog with article pages',
    thumbnail: '/templates/blog.svg',
    category: 'content',
    successRate: 98,
    usageCount: 1800,
  },
];

export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Marketing Dashboard',
    status: 'completed',
    successRate: 100,
    iterationCount: 1,
    createdAt: '2026-01-25T10:00:00Z',
    updatedAt: '2026-01-25T10:30:00Z',
  },
  {
    id: 'proj-2',
    name: 'Customer Portal',
    status: 'completed',
    successRate: 100,
    iterationCount: 2,
    createdAt: '2026-01-24T14:00:00Z',
    updatedAt: '2026-01-24T15:00:00Z',
  },
  {
    id: 'proj-3',
    name: 'Analytics Page',
    status: 'in_progress',
    successRate: 0,
    iterationCount: 1,
    createdAt: '2026-01-26T09:00:00Z',
    updatedAt: '2026-01-26T09:30:00Z',
  },
  {
    id: 'proj-4',
    name: 'Settings Panel',
    status: 'completed',
    successRate: 100,
    iterationCount: 1,
    createdAt: '2026-01-23T16:00:00Z',
    updatedAt: '2026-01-23T16:20:00Z',
  },
  {
    id: 'proj-5',
    name: 'User Onboarding',
    status: 'completed',
    successRate: 100,
    iterationCount: 1,
    createdAt: '2026-01-22T11:00:00Z',
    updatedAt: '2026-01-22T11:45:00Z',
  },
];

export const mockSkillProgress: SkillProgress = {
  currentTrack: {
    id: 'track-trust',
    name: 'Trust Building',
    progress: 75,
    modules: [
      { id: 'mod-1', name: 'Understanding AI Outputs', completed: true, timeEstimateMinutes: 5 },
      { id: 'mod-2', name: 'Template Selection', completed: true, timeEstimateMinutes: 8 },
      { id: 'mod-3', name: 'Evaluating Output Quality', completed: false, timeEstimateMinutes: 5 },
      { id: 'mod-4', name: 'Iterating Effectively', completed: false, timeEstimateMinutes: 10 },
    ],
    currentModule: { id: 'mod-3', name: 'Evaluating Output Quality', completed: false, timeEstimateMinutes: 5 },
    nextModule: { id: 'mod-4', name: 'Iterating Effectively', completed: false, timeEstimateMinutes: 10 },
  },
  totalModulesCompleted: 2,
  totalTimeSpentMinutes: 13,
};
