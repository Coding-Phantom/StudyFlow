import type { StudyTask } from "../types";

interface Props {
  tasks: StudyTask[];
  onComplete?: (taskId: number) => void;
  onGenerateNotes?: (task: StudyTask) => void;
  loadingTaskId?: number | null;
}

export default function TaskList({ tasks, onComplete, onGenerateNotes, loadingTaskId }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No tasks scheduled for today.</p>
        <p className="text-sm mt-1">Create a study plan or check back on a study day.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task, idx) => (
        <div
          key={task.id ?? idx}
          className={`bg-white rounded-lg border px-4 py-3 flex items-center gap-3 transition-colors ${
            task.completed ? "border-green-200 bg-green-50" : "border-gray-200"
          }`}
        >
          {/* Checkbox */}
          <button
            onClick={() => task.id && onComplete?.(task.id)}
            disabled={!task.id || task.completed === 1}
            className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              task.completed
                ? "bg-green-500 border-green-500 text-white"
                : "border-gray-300 hover:border-indigo-400"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {task.completed === 1 && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* Task info */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${task.completed ? "text-gray-400 line-through" : "text-gray-900"}`}>
              {task.topic}
            </p>
            {task.subtopic && (
              <p className={`text-xs ${task.completed ? "text-gray-300" : "text-gray-500"}`}>
                {task.subtopic}
              </p>
            )}
          </div>

          {/* Generate Notes button */}
          {!task.completed && (
            <button
              onClick={() => onGenerateNotes?.(task)}
              disabled={loadingTaskId === task.id}
              className="shrink-0 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md font-medium hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingTaskId === task.id ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading
                </span>
              ) : (
                "Generate Notes"
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
