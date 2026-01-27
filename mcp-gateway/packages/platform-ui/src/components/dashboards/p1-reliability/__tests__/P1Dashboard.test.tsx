import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { P1Dashboard } from '../P1Dashboard';
import { ReliabilityScoreBanner } from '../ReliabilityScoreBanner';
import { TemplateGrid } from '../TemplateGrid';
import { RecentProjects } from '../RecentProjects';
import { SkillProgress } from '../SkillProgress';
import { HelpWidget } from '../HelpWidget';
import {
  mockReliabilityMetrics,
  mockTemplates,
  mockProjects,
  mockSkillProgress,
} from '@/lib/persona/mock-data';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('P1Dashboard', () => {
  const defaultProps = {
    userName: 'Test User',
    metrics: mockReliabilityMetrics,
    templates: mockTemplates,
    projects: mockProjects,
    skillProgress: mockSkillProgress,
  };

  it('renders welcome message with user name', () => {
    render(<P1Dashboard {...defaultProps} />);
    expect(screen.getByText('Welcome back, Test User')).toBeInTheDocument();
  });

  it('renders reliability summary subtitle', () => {
    render(<P1Dashboard {...defaultProps} />);
    expect(screen.getByText("Here's your reliability summary")).toBeInTheDocument();
  });

  it('renders dashboard type indicator', () => {
    render(<P1Dashboard {...defaultProps} />);
    expect(screen.getByText('Dashboard: Reliability')).toBeInTheDocument();
  });

  it('renders change dashboard button', () => {
    render(<P1Dashboard {...defaultProps} />);
    expect(screen.getByText('[Change]')).toBeInTheDocument();
  });

  it('calls onChangeDashboard when change button clicked', () => {
    const onChangeDashboard = jest.fn();
    render(<P1Dashboard {...defaultProps} onChangeDashboard={onChangeDashboard} />);
    fireEvent.click(screen.getByText('[Change]'));
    expect(onChangeDashboard).toHaveBeenCalledTimes(1);
  });

  it('renders all five dashboard widgets', () => {
    render(<P1Dashboard {...defaultProps} />);
    // Check for widget headers/content
    expect(screen.getByText('Start with Templates')).toBeInTheDocument();
    expect(screen.getByText('Recent Projects')).toBeInTheDocument();
    expect(screen.getByText('Your Skill Progress')).toBeInTheDocument();
    expect(screen.getByText('Need Help?')).toBeInTheDocument();
  });

  it('uses default userName when not provided', () => {
    const propsWithoutUserName = { ...defaultProps };
    delete (propsWithoutUserName as Partial<typeof defaultProps>).userName;
    render(<P1Dashboard {...(propsWithoutUserName as typeof defaultProps)} />);
    expect(screen.getByText('Welcome back, User')).toBeInTheDocument();
  });
});

describe('ReliabilityScoreBanner', () => {
  it('renders success rate metric', () => {
    render(<ReliabilityScoreBanner metrics={mockReliabilityMetrics} />);
    expect(screen.getByText(`${mockReliabilityMetrics.successRate}%`)).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
  });

  it('renders tasks this week metric', () => {
    render(<ReliabilityScoreBanner metrics={mockReliabilityMetrics} />);
    expect(screen.getByText(`${mockReliabilityMetrics.tasksThisWeek}`)).toBeInTheDocument();
    expect(screen.getByText('Tasks This Week')).toBeInTheDocument();
  });

  it('renders average iterations metric', () => {
    render(<ReliabilityScoreBanner metrics={mockReliabilityMetrics} />);
    expect(screen.getByText(`${mockReliabilityMetrics.avgIterations}`)).toBeInTheDocument();
    expect(screen.getByText('Avg Iterations')).toBeInTheDocument();
  });

  it('renders templates used metric', () => {
    render(<ReliabilityScoreBanner metrics={mockReliabilityMetrics} />);
    expect(screen.getByText(`${mockReliabilityMetrics.templatesUsed}`)).toBeInTheDocument();
    expect(screen.getByText('Templates Used')).toBeInTheDocument();
  });
});

describe('TemplateGrid', () => {
  it('renders section header', () => {
    render(<TemplateGrid templates={mockTemplates} />);
    expect(screen.getByText('Start with Templates')).toBeInTheDocument();
  });

  it('renders social proof message', () => {
    render(<TemplateGrid templates={mockTemplates} />);
    expect(screen.getByText('98% success rate')).toBeInTheDocument();
  });

  it('renders up to 4 templates', () => {
    render(<TemplateGrid templates={mockTemplates} />);
    // Should show first 4 templates
    const templateNames = mockTemplates.slice(0, 4).map(t => t.name);
    templateNames.forEach(name => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('renders browse all templates button', () => {
    render(<TemplateGrid templates={mockTemplates} />);
    expect(screen.getByText('Browse All Templates')).toBeInTheDocument();
  });

  it('calls onSelectTemplate when template clicked', () => {
    const onSelectTemplate = jest.fn();
    render(<TemplateGrid templates={mockTemplates} onSelectTemplate={onSelectTemplate} />);
    fireEvent.click(screen.getByText(mockTemplates[0].name));
    expect(onSelectTemplate).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it('displays template success rate', () => {
    render(<TemplateGrid templates={mockTemplates} />);
    expect(screen.getByText(`${mockTemplates[0].successRate}% success`)).toBeInTheDocument();
  });
});

describe('RecentProjects', () => {
  it('renders section header', () => {
    render(<RecentProjects projects={mockProjects} />);
    expect(screen.getByText('Recent Projects')).toBeInTheDocument();
  });

  it('renders project names', () => {
    render(<RecentProjects projects={mockProjects} />);
    mockProjects.forEach(project => {
      expect(screen.getByText(project.name)).toBeInTheDocument();
    });
  });

  it('renders view all projects button', () => {
    render(<RecentProjects projects={mockProjects} />);
    expect(screen.getByText('View All Projects →')).toBeInTheDocument();
  });

  it('calls onViewProject when project clicked', () => {
    const onViewProject = jest.fn();
    render(<RecentProjects projects={mockProjects} onViewProject={onViewProject} />);
    fireEvent.click(screen.getByText(mockProjects[0].name));
    expect(onViewProject).toHaveBeenCalledWith(mockProjects[0]);
  });

  it('calls onViewAll when view all clicked', () => {
    const onViewAll = jest.fn();
    render(<RecentProjects projects={mockProjects} onViewAll={onViewAll} />);
    fireEvent.click(screen.getByText('View All Projects →'));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('displays success rate for completed projects', () => {
    render(<RecentProjects projects={mockProjects} />);
    const completedProjects = mockProjects.filter(p => p.status === 'completed');
    // Multiple completed projects may have the same success rate, use getAllByText
    const successRateTexts = screen.getAllByText(/% success/);
    expect(successRateTexts.length).toBeGreaterThanOrEqual(completedProjects.length);
  });

  it('displays in progress status for active projects', () => {
    render(<RecentProjects projects={mockProjects} />);
    const inProgressProject = mockProjects.find(p => p.status === 'in_progress');
    if (inProgressProject) {
      expect(screen.getAllByText('In progress').length).toBeGreaterThan(0);
    }
  });
});

describe('SkillProgress', () => {
  it('renders section header', () => {
    render(<SkillProgress progress={mockSkillProgress} />);
    expect(screen.getByText('Your Skill Progress')).toBeInTheDocument();
  });

  it('renders current track name', () => {
    render(<SkillProgress progress={mockSkillProgress} />);
    expect(screen.getByText(`${mockSkillProgress.currentTrack.name} Track`)).toBeInTheDocument();
  });

  it('renders progress percentage', () => {
    render(<SkillProgress progress={mockSkillProgress} />);
    expect(screen.getByText(`${mockSkillProgress.currentTrack.progress}%`)).toBeInTheDocument();
  });

  it('renders next module when available', () => {
    render(<SkillProgress progress={mockSkillProgress} />);
    if (mockSkillProgress.currentTrack.nextModule) {
      expect(screen.getByText(mockSkillProgress.currentTrack.nextModule.name)).toBeInTheDocument();
    }
  });

  it('renders continue learning button', () => {
    render(<SkillProgress progress={mockSkillProgress} />);
    expect(screen.getByText('Continue Learning →')).toBeInTheDocument();
  });

  it('calls onContinue when button clicked', () => {
    const onContinue = jest.fn();
    render(<SkillProgress progress={mockSkillProgress} onContinue={onContinue} />);
    fireEvent.click(screen.getByText('Continue Learning →'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

describe('HelpWidget', () => {
  it('renders section header', () => {
    render(<HelpWidget />);
    expect(screen.getByText('Need Help?')).toBeInTheDocument();
  });

  it('renders chat with support option', () => {
    render(<HelpWidget />);
    expect(screen.getByText('Chat with Support')).toBeInTheDocument();
  });

  it('renders documentation option', () => {
    render(<HelpWidget />);
    expect(screen.getByText('View Documentation')).toBeInTheDocument();
  });

  it('renders tutorials option', () => {
    render(<HelpWidget />);
    expect(screen.getByText('Watch Tutorial Videos')).toBeInTheDocument();
  });

  it('renders response time indicator', () => {
    render(<HelpWidget />);
    expect(screen.getByText(/Response time:/)).toBeInTheDocument();
  });

  it('calls onChat when chat clicked', () => {
    const onChat = jest.fn();
    render(<HelpWidget onChat={onChat} />);
    fireEvent.click(screen.getByText('Chat with Support'));
    expect(onChat).toHaveBeenCalledTimes(1);
  });

  it('calls onDocs when docs clicked', () => {
    const onDocs = jest.fn();
    render(<HelpWidget onDocs={onDocs} />);
    fireEvent.click(screen.getByText('View Documentation'));
    expect(onDocs).toHaveBeenCalledTimes(1);
  });

  it('calls onTutorials when tutorials clicked', () => {
    const onTutorials = jest.fn();
    render(<HelpWidget onTutorials={onTutorials} />);
    fireEvent.click(screen.getByText('Watch Tutorial Videos'));
    expect(onTutorials).toHaveBeenCalledTimes(1);
  });
});
