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
      <div className="text-center py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5eead4] to-[#c084fc] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#5eead4]/[0.15]">
          <svg className="w-8 h-8 text-deep-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">No Study Plan Yet</h1>
        <p className="text-text-secondary mt-2 max-w-sm mx-auto">Create a study plan first, then come here to start learning.</p>
        <a
          href="/plans"
          className="btn-primary mt-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create a Plan
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            {plan ? <><span className="text-gradient-aurora">{plan.subject}</span></> : "Learn"}
          </h1>
          <p className="text-text-secondary mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {plan && (
          <a href="/quiz" className="btn-secondary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Quick Quiz
          </a>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading today's plan...
        </div>
      )}

      {error && (
        <div className="card px-4 py-3 text-sm text-danger flex items-center gap-2 border-danger/20 bg-danger-muted/30">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setRefreshKey((k) => k + 1)} className="ml-auto text-sm font-semibold underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Today's Agenda */}
      {!loading && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-lg font-bold text-text-primary">Today's Agenda</h2>
          </div>
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
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 className="text-lg font-bold text-text-primary">
              Study Notes
              {notesTask && (
                <span className="text-sm font-normal text-text-secondary ml-2">
                  — {notesTask.topic}{notesTask.subtopic ? `: ${notesTask.subtopic}` : ""}
                </span>
              )}
            </h2>
          </div>

          {notesLoading && (
            <div className="flex items-center justify-center py-12 text-text-muted">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating notes... (may take 30s)
            </div>
          )}

          {notesError && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger-muted/30 rounded-lg px-3.5 py-2.5 border border-danger/20">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {notesError}
            </div>
          )}

          {notes && <NotesDisplay notes={notes} subject={plan!.subject} onStartQuiz={handleStartQuiz} />}
        </section>
      )}

      {/* No tasks today */}
      {!loading && !error && todayTasks.length === 0 && !notesLoading && (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center justify-center mx-auto mb-4 border border-border">
            <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-text-secondary font-medium">Nothing scheduled for today.</p>
          <p className="text-sm text-text-muted mt-1">Take a quiz or review past material.</p>
        </div>
      )}
    </div>
  );
}
