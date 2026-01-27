import { renderHook, waitFor, act } from '@testing-library/react';
import { useP1Dashboard } from '../useP1Dashboard';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockMetrics = {
  successRate: 94,
  tasksThisWeek: 12,
  avgIterations: 1.3,
  templatesUsed: 8,
};

const mockTemplates = [
  { id: 'tmpl-1', name: 'Landing Page', successRate: 98 },
];

const mockProjects = [
  { id: 'proj-1', name: 'Project 1', status: 'completed', successRate: 95, iterationCount: 1 },
];

const mockSkillProgress = {
  currentTrack: {
    id: 'trust-building',
    name: 'Trust Building',
    progress: 75,
    nextModule: { id: 'mod-1', name: 'Module 1', timeEstimateMinutes: 15 },
  },
  completedTracks: [],
  availableTracks: [],
};

describe('useP1Dashboard', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('starts with loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useP1Dashboard());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.metrics).toBeNull();
    expect(result.current.templates).toEqual([]);
    expect(result.current.projects).toEqual([]);
    expect(result.current.skillProgress).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetches all data on mount', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMetrics) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockTemplates) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProjects) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSkillProgress) });

    const { result } = renderHook(() => useP1Dashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(mockFetch).toHaveBeenCalledWith('/api/metrics/reliability');
    expect(mockFetch).toHaveBeenCalledWith('/api/templates');
    expect(mockFetch).toHaveBeenCalledWith('/api/projects');
    expect(mockFetch).toHaveBeenCalledWith('/api/skills/progress');
  });

  it('sets data correctly after successful fetch', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMetrics) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockTemplates) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProjects) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSkillProgress) });

    const { result } = renderHook(() => useP1Dashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metrics).toEqual(mockMetrics);
    expect(result.current.templates).toEqual(mockTemplates);
    expect(result.current.projects).toEqual(mockProjects);
    expect(result.current.skillProgress).toEqual(mockSkillProgress);
    expect(result.current.error).toBeNull();
  });

  it('sets error when fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false });

    const { result } = renderHook(() => useP1Dashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch dashboard data');
  });

  it('sets error when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useP1Dashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('provides refresh function', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMetrics) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockTemplates) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProjects) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSkillProgress) });

    const { result } = renderHook(() => useP1Dashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refresh).toBe('function');

    // Setup mocks for refresh call
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ...mockMetrics, successRate: 96 }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockTemplates) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProjects) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSkillProgress) });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.metrics?.successRate).toBe(96);
  });

  it('does not auto-refresh by default', async () => {
    jest.useFakeTimers();

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMetrics) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockTemplates) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProjects) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSkillProgress) });

    renderHook(() => useP1Dashboard());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    // Advance time and verify no additional calls
    jest.advanceTimersByTime(120000);

    expect(mockFetch).toHaveBeenCalledTimes(4);

    jest.useRealTimers();
  });

  it('auto-refreshes when enabled', async () => {
    jest.useFakeTimers();

    mockFetch
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(mockMetrics) });

    renderHook(() => useP1Dashboard({ autoRefresh: true, refreshInterval: 60000 }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    // Advance time to trigger refresh
    jest.advanceTimersByTime(60000);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(8); // 4 initial + 4 refresh
    });

    jest.useRealTimers();
  });
});
