import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Plan, StudyTask, StudyNotes } from "../types";
import TaskList from "../components/TaskList";
import NotesDisplay from "../components/NotesDisplay";

export default function LearnPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [todayTasks, setTodayTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Notes state
  const [notes, setNotes] = useState<StudyNotes | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesTask, setNotesTask] = useState<StudyTask | null>(null);
  const [notesError, setNotesError] = useState("");

  // Refresh counter to refetch after marking complete
  const [refreshKey, setRefreshKey] = useState(0);

  // Load the latest plan and compute today's tasks
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const state = await api.getState();
        if (!state.latest_plan) {
          setPlan(null);
          setTodayTasks([]);
          return;
        }
        setPlan(state.latest_plan);

        // Compute today's date in the plan's timezone
        const todayStr = new Date().toISOString().split("T")[0];
        const todayPlan = state.latest_plan.schedule?.find((d) => d.date === todayStr);
        setTodayTasks(todayPlan?.tasks ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load plan");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshKey]);

  const handleComplete = async (taskId: number) => {
    try {
      await api.completeTask(taskId);
      // Refetch to update state
      setRefreshKey((k) => k + 1);
    } catch {
      // silently fail
    }
  };

  const handleGenerateNotes = async (task: StudyTask) => {
    setNotes(null);
    setNotesError("");
    setNotesTask(task);
    setNotesLoading(true);
    try {
      const result = await api.getNotes({
        subject: plan!.subject,
        topic: task.topic,
        subtopic: task.subtopic ?? undefined,
      });
      setNotes(result);
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : "Failed to generate notes");
    } finally {
      setNotesLoading(false);
    }
  };

  const handleStartQuiz = (topic: string, subtopic?: string) => {
    navigate("/quiz", {
      state: {
        subject: plan?.subject ?? "",
        topic,
        subtopic: subtopic ?? "",
        notesContent: notes?.summary ?? "",
      },
    });
  };

  // No plan exists
  if (!loading && !plan) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-900">No Study Plan Yet</h1>
        <p className="text-gray-500 mt-2">Create a study plan first, then come here to start learning.</p>
        <a
          href="/plans"
          className="inline-block mt-4 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Create a Plan
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {plan ? `Studying: ${plan.subject}` : "Learn"}
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading today's plan...
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setRefreshKey((k) => k + 1)} className="ml-2 underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Today's Agenda */}
      {!loading && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Today's Agenda</h2>
          <TaskList
            tasks={todayTasks}
            onComplete={handleComplete}
            onGenerateNotes={handleGenerateNotes}
            loadingTaskId={notesLoading ? notesTask?.id ?? null : null}
          />
        </section>
      )}

      {/* Study Notes */}
      {(notesLoading || notes || notesError) && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Study Notes
            {notesTask && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                — {notesTask.topic}{notesTask.subtopic ? `: ${notesTask.subtopic}` : ""}
              </span>
            )}
          </h2>

          {notesLoading && (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating notes... (may take 30s)
            </div>
          )}

          {notesError && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{notesError}</div>
          )}

          {notes && <NotesDisplay notes={notes} subject={plan!.subject} onStartQuiz={handleStartQuiz} />}
        </section>
      )}

      {/* No tasks today */}
      {!loading && !error && todayTasks.length === 0 && !notesLoading && (
        <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-200">
          <p className="text-lg">Nothing scheduled for today.</p>
          <p className="text-sm mt-1">Take a quiz or review past material.</p>
        </div>
      )}
    </div>
  );
}
