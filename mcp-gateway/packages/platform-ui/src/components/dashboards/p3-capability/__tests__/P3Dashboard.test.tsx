import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { P3Dashboard } from '../P3Dashboard';
import { FrontierMap } from '../FrontierMap';
import { TaskComplexityAnalyzer } from '../TaskComplexityAnalyzer';
import { AccuracyChart } from '../AccuracyChart';
import { RecentTasksWithConfidence } from '../RecentTasksWithConfidence';
import { ExperimentalFeatures } from '../ExperimentalFeatures';
import {
  mockFrontierMap,
  mockCalibrationHistory,
  mockRecentTasks,
  mockExperimentalFeatures,
  mockAnalyzeTask,
} from '@/lib/persona/capability-mock-data';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('P3Dashboard', () => {
  const defaultProps = {
    userName: 'Test User',
    frontierMap: mockFrontierMap,
    calibration: mockCalibrationHistory,
    recentTasks: mockRecentTasks,
    experimentalFeatures: mockExperimentalFeatures,
  };

  it('renders welcome message with user name', () => {
    render(<P3Dashboard {...defaultProps} />);
    expect(screen.getByText('Welcome back, Test User')).toBeInTheDocument();
  });

  it('renders calibration status', () => {
    render(<P3Dashboard {...defaultProps} />);
    expect(screen.getByText(/Your calibration:/)).toBeInTheDocument();
    expect(screen.getByText(/Expert/)).toBeInTheDocument();
  });

  it('renders dashboard type indicator', () => {
    render(<P3Dashboard {...defaultProps} />);
    expect(screen.getByText('Dashboard: Capability')).toBeInTheDocument();
  });

  it('renders change dashboard button', () => {
    render(<P3Dashboard {...defaultProps} />);
    expect(screen.getByText('[Change]')).toBeInTheDocument();
  });

  it('calls onChangeDashboard when change button clicked', () => {
    const onChangeDashboard = jest.fn();
    render(<P3Dashboard {...defaultProps} onChangeDashboard={onChangeDashboard} />);
    fireEvent.click(screen.getByText('[Change]'));
    expect(onChangeDashboard).toHaveBeenCalledTimes(1);
  });

  it('renders all five dashboard widgets', () => {
    render(<P3Dashboard {...defaultProps} />);
    expect(screen.getByText(/Frontier Map/)).toBeInTheDocument();
    expect(screen.getByText('Task Complexity Analyzer')).toBeInTheDocument();
    expect(screen.getByText('Your Accuracy Over Time')).toBeInTheDocument();
    expect(screen.getByText('Recent Tasks')).toBeInTheDocument();
    expect(screen.getByText('Experimental Features')).toBeInTheDocument();
  });
});

describe('FrontierMap', () => {
  it('renders section header', () => {
    render(<FrontierMap data={mockFrontierMap} />);
    expect(screen.getByText(/Frontier Map/)).toBeInTheDocument();
  });

  it('renders all three zones', () => {
    render(<FrontierMap data={mockFrontierMap} />);
    expect(screen.getByText('AI-Alone Zone')).toBeInTheDocument();
    expect(screen.getByText('Hybrid Zone')).toBeInTheDocument();
    expect(screen.getByText('Human-Alone Zone')).toBeInTheDocument();
  });

  it('renders reliability ranges', () => {
    render(<FrontierMap data={mockFrontierMap} />);
    expect(screen.getByText('95%+')).toBeInTheDocument();
    expect(screen.getByText('70-95%')).toBeInTheDocument();
    expect(screen.getByText('<70%')).toBeInTheDocument();
  });

  it('renders zone examples', () => {
    render(<FrontierMap data={mockFrontierMap} />);
    expect(screen.getByText('CRUD UI')).toBeInTheDocument();
    expect(screen.getByText('Complex Logic')).toBeInTheDocument();
    expect(screen.getByText('Novel Algorithms')).toBeInTheDocument();
  });

  it('renders expand map button', () => {
    render(<FrontierMap data={mockFrontierMap} />);
    expect(screen.getByText('Expand Map')).toBeInTheDocument();
  });

  it('renders calibration quiz button', () => {
    render(<FrontierMap data={mockFrontierMap} />);
    expect(screen.getByText('Take Calibration Quiz')).toBeInTheDocument();
  });

  it('calls onExpandMap when expand clicked', () => {
    const onExpandMap = jest.fn();
    render(<FrontierMap data={mockFrontierMap} onExpandMap={onExpandMap} />);
    fireEvent.click(screen.getByText('Expand Map'));
    expect(onExpandMap).toHaveBeenCalledTimes(1);
  });

  it('calls onTakeQuiz when quiz clicked', () => {
    const onTakeQuiz = jest.fn();
    render(<FrontierMap data={mockFrontierMap} onTakeQuiz={onTakeQuiz} />);
    fireEvent.click(screen.getByText('Take Calibration Quiz'));
    expect(onTakeQuiz).toHaveBeenCalledTimes(1);
  });
});

describe('TaskComplexityAnalyzer', () => {
  it('renders section header', () => {
    render(<TaskComplexityAnalyzer />);
    expect(screen.getByText('Task Complexity Analyzer')).toBeInTheDocument();
  });

  it('renders textarea for task description', () => {
    render(<TaskComplexityAnalyzer />);
    expect(screen.getByPlaceholderText(/Describe the task/)).toBeInTheDocument();
  });

  it('renders analyze button', () => {
    render(<TaskComplexityAnalyzer />);
    expect(screen.getByText('Analyze Complexity')).toBeInTheDocument();
  });

  it('analyze button is disabled when textarea is empty', () => {
    render(<TaskComplexityAnalyzer />);
    const button = screen.getByText('Analyze Complexity');
    expect(button).toBeDisabled();
  });

  it('analyze button is enabled when textarea has content', () => {
    render(<TaskComplexityAnalyzer />);
    const textarea = screen.getByPlaceholderText(/Describe the task/);
    fireEvent.change(textarea, { target: { value: 'Create a simple form' } });
    const button = screen.getByText('Analyze Complexity');
    expect(button).not.toBeDisabled();
  });

  it('calls onAnalyze when button clicked', async () => {
    const onAnalyze = jest.fn().mockResolvedValue(mockAnalyzeTask('simple form'));
    render(<TaskComplexityAnalyzer onAnalyze={onAnalyze} />);

    const textarea = screen.getByPlaceholderText(/Describe the task/);
    fireEvent.change(textarea, { target: { value: 'Create a simple form' } });

    const button = screen.getByText('Analyze Complexity');
    fireEvent.click(button);

    await waitFor(() => {
      expect(onAnalyze).toHaveBeenCalledWith('Create a simple form');
    });
  });

  it('shows result after analysis', async () => {
    const result = mockAnalyzeTask('simple form');
    const onAnalyze = jest.fn().mockResolvedValue(result);
    render(<TaskComplexityAnalyzer onAnalyze={onAnalyze} />);

    const textarea = screen.getByPlaceholderText(/Describe the task/);
    fireEvent.change(textarea, { target: { value: 'simple form' } });

    const button = screen.getByText('Analyze Complexity');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/\/5/)).toBeInTheDocument();
      expect(screen.getByText(/Recommended Workflow:/)).toBeInTheDocument();
    });
  });
});

describe('AccuracyChart', () => {
  it('renders section header', () => {
    render(<AccuracyChart history={mockCalibrationHistory} />);
    expect(screen.getByText('Your Accuracy Over Time')).toBeInTheDocument();
  });

  it('renders current accuracy', () => {
    render(<AccuracyChart history={mockCalibrationHistory} />);
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('renders trend indicator', () => {
    render(<AccuracyChart history={mockCalibrationHistory} />);
    expect(screen.getByText(/\+4%/)).toBeInTheDocument();
  });

  it('renders calibration level', () => {
    render(<AccuracyChart history={mockCalibrationHistory} />);
    expect(screen.getByText('expert')).toBeInTheDocument();
  });

  it('renders encouraging message', () => {
    render(<AccuracyChart history={mockCalibrationHistory} />);
    expect(screen.getByText(/Excellent/)).toBeInTheDocument();
  });

  it('renders SVG chart', () => {
    render(<AccuracyChart history={mockCalibrationHistory} />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

describe('RecentTasksWithConfidence', () => {
  it('renders section header', () => {
    render(<RecentTasksWithConfidence tasks={mockRecentTasks} />);
    expect(screen.getByText('Recent Tasks')).toBeInTheDocument();
  });

  it('renders task names', () => {
    render(<RecentTasksWithConfidence tasks={mockRecentTasks} />);
    expect(screen.getByText('Complex Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Simple Form')).toBeInTheDocument();
  });

  it('renders confidence scores', () => {
    render(<RecentTasksWithConfidence tasks={mockRecentTasks} />);
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('renders outcome indicators', () => {
    render(<RecentTasksWithConfidence tasks={mockRecentTasks} />);
    // Check for outcome icons
    const correctIcons = screen.getAllByText('✓');
    expect(correctIcons.length).toBeGreaterThan(0);
  });

  it('renders workflow type icons', () => {
    render(<RecentTasksWithConfidence tasks={mockRecentTasks} />);
    expect(screen.getAllByText('●').length).toBeGreaterThan(0); // AI-Alone
    expect(screen.getAllByText('◐').length).toBeGreaterThan(0); // Hybrid
  });

  it('renders view all link', () => {
    render(<RecentTasksWithConfidence tasks={mockRecentTasks} />);
    expect(screen.getByText('View All Tasks →')).toBeInTheDocument();
  });

  it('calls onViewTask when task clicked', () => {
    const onViewTask = jest.fn();
    render(<RecentTasksWithConfidence tasks={mockRecentTasks} onViewTask={onViewTask} />);
    fireEvent.click(screen.getByText('Complex Dashboard'));
    expect(onViewTask).toHaveBeenCalledWith(mockRecentTasks[0]);
  });
});

describe('ExperimentalFeatures', () => {
  it('renders section header', () => {
    render(<ExperimentalFeatures features={mockExperimentalFeatures} />);
    expect(screen.getByText('Experimental Features')).toBeInTheDocument();
  });

  it('renders feature names', () => {
    render(<ExperimentalFeatures features={mockExperimentalFeatures} />);
    expect(screen.getByText('Multi-file Generation')).toBeInTheDocument();
    expect(screen.getByText('Voice-to-Code')).toBeInTheDocument();
  });

  it('renders stage badges', () => {
    render(<ExperimentalFeatures features={mockExperimentalFeatures} />);
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0);
    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
  });

  it('renders experiment icons', () => {
    render(<ExperimentalFeatures features={mockExperimentalFeatures} />);
    const icons = screen.getAllByText('🧪');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('renders view all link', () => {
    render(<ExperimentalFeatures features={mockExperimentalFeatures} />);
    expect(screen.getByText('View All Experiments →')).toBeInTheDocument();
  });

  it('calls onTryFeature when feature clicked', () => {
    const onTryFeature = jest.fn();
    render(<ExperimentalFeatures features={mockExperimentalFeatures} onTryFeature={onTryFeature} />);
    fireEvent.click(screen.getByText('Multi-file Generation'));
    expect(onTryFeature).toHaveBeenCalledWith(mockExperimentalFeatures[0]);
  });

  it('does not call onTryFeature for coming-soon features', () => {
    const onTryFeature = jest.fn();
    render(<ExperimentalFeatures features={mockExperimentalFeatures} onTryFeature={onTryFeature} />);
    fireEvent.click(screen.getByText('Design System Import'));
    expect(onTryFeature).not.toHaveBeenCalled();
  });
});
