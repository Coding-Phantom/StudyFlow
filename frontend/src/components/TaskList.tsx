import type { StudyTask } from "../types";
import AIDisclaimer from "./AIDisclaimer";

interface Props {
  tasks: StudyTask[];
  onComplete?: (taskId: number) => void;
  onGenerateNotes?: (task: StudyTask) => void;
  loadingTaskId?: number | null;
}

export default function TaskList({ tasks, onComplete, onGenerateNotes, loadingTaskId }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        <p>No tasks scheduled for today.</p>
        <p className="text-sm mt-1">Create a study plan or check back on a study day.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="pb-1">
        <AIDisclaimer compact />
      </div>
      {tasks.map((task, idx) => (
        <div
          key={task.id ?? idx}
          className={`card px-4 py-3.5 flex items-center gap-3 transition-all duration-200 ${
            task.completed ? "border-success/20 bg-success-muted/30" : ""
          }`}
        >
          {/* Checkbox */}
          <button
            onClick={() => task.id && onComplete?.(task.id)}
            disabled={!task.id}
            className={`shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
              task.completed
                ? "bg-success border-success text-deep-bg shadow-sm shadow-success/20"
                : "border-border hover:border-accent hover:shadow-sm"
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
            <p className={`text-sm font-medium ${task.completed ? "text-text-muted line-through" : "text-text-primary"}`}>
              {task.topic}
            </p>
            {task.subtopic && (
              <p className={`text-xs mt-0.5 ${task.completed ? "text-text-muted/60" : "text-text-secondary"}`}>
                {task.subtopic}
              </p>
            )}
          </div>

          {/* Generate Notes button */}
          {!task.completed && (
            <button
              onClick={() => onGenerateNotes?.(task)}
              disabled={loadingTaskId === task.id}
              className="shrink-0 text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg font-semibold hover:bg-accent/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-accent/20"
            >
              {loadingTaskId === task.id ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Notes
                </span>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
