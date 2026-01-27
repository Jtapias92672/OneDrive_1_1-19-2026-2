'use client';

import { RecentTask, WorkflowType, TaskOutcome } from '@/lib/persona/capability-types';

interface RecentTasksWithConfidenceProps {
  tasks: RecentTask[];
  onViewTask?: (task: RecentTask) => void;
  onViewAll?: () => void;
}

const workflowIcons: Record<WorkflowType, { icon: string; label: string }> = {
  'AI-Alone': { icon: '●', label: 'AI-Alone' },
  Hybrid: { icon: '◐', label: 'Hybrid' },
  'Human Review': { icon: '◑', label: 'Human Review' },
};

const outcomeIcons: Record<TaskOutcome, { icon: string; color: string }> = {
  correct: { icon: '✓', color: 'text-green-600' },
  wrong: { icon: '✗', color: 'text-red-600' },
  partial: { icon: '~', color: 'text-amber-600' },
};

export function RecentTasksWithConfidence({
  tasks,
  onViewTask,
  onViewAll,
}: RecentTasksWithConfidenceProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Recent Tasks</h3>
      </div>

      <div className="p-4">
        <ul className="space-y-3">
          {tasks.slice(0, 5).map((task) => (
            <TaskItem key={task.id} task={task} onClick={() => onViewTask?.(task)} />
          ))}
        </ul>

        <button
          onClick={onViewAll}
          className="w-full mt-4 text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          View All Tasks →
        </button>
      </div>
    </div>
  );
}

interface TaskItemProps {
  task: RecentTask;
  onClick?: () => void;
}

function TaskItem({ task, onClick }: TaskItemProps) {
  const workflow = workflowIcons[task.workflowType];
  const outcome = outcomeIcons[task.actualOutcome];

  return (
    <button
      onClick={onClick}
      className="w-full p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-purple-600 text-lg">{workflow.icon}</span>
          <span className="font-medium text-gray-900 text-sm">{task.name}</span>
        </div>
        <span className="text-xs text-gray-400">{workflow.label}</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-gray-500">
          Confidence: <span className="font-semibold">{task.confidenceScore}%</span>
        </span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-1">
          <span className="text-gray-500">Actual:</span>
          <span className={`font-semibold ${outcome.color}`}>{outcome.icon}</span>
        </span>
      </div>
    </button>
  );
}
