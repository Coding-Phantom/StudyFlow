import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Plan, DayPlan } from "../types";
import CalendarGrid from "../components/CalendarGrid";
import AIDisclaimer from "../components/AIDisclaimer";

export default function CalendarPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);

  // Current month view
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const state = await api.getState();
        setPlan(state.latest_plan);
        // Auto-select today
        if (state.latest_plan?.schedule) {
          const todayStr = new Date().toISOString().split("T")[0];
          const today = state.latest_plan.schedule.find((d) => d.date === todayStr);
          if (today) setSelectedDay(today);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load plan");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDayClick = (dateStr: string) => {
    const day = plan?.schedule?.find((d) => d.date === dateStr) ?? null;
    setSelectedDay(day);
  };

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    const todayStr = today.toISOString().split("T")[0];
    const day = plan?.schedule?.find((d) => d.date === todayStr) ?? null;
    setSelectedDay(day);
  };

  const monthName = new Date(year, month).toLocaleString("en-US", { month: "long" });

  if (!loading && !plan) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/20">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">No Study Plan Yet</h1>
        <p className="text-gray-500 mt-2">Create a plan to see your study calendar.</p>
        <a
          href="/plans"
          className="inline-flex items-center gap-2 mt-6 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all duration-200 shadow-md shadow-indigo-500/15 hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5"
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Study Calendar</h1>
        <p className="text-gray-500 mt-1.5">{plan?.subject ?? "No plan"}</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading calendar...
        </div>
      )}

      {error && (
        <div className="card border-red-200/60 bg-red-50/60 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {!loading && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar */}
          <div className="flex-1 card p-5">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-lg font-bold text-gray-900">
                {monthName} {year}
              </h2>

              <div className="flex gap-1">
                <button
                  onClick={goToday}
                  className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all duration-200"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <CalendarGrid
              year={year}
              month={month}
              schedule={plan?.schedule ?? []}
              onDayClick={handleDayClick}
            />

            {/* Legend */}
            <div className="flex items-center gap-5 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 ring-1 ring-indigo-200" />
                Has tasks
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 ring-1 ring-green-200" />
                All completed
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-1 ring-amber-200" />
                Partial
              </div>
            </div>
          </div>

          {/* Day details sidebar */}
          <div className="w-full lg:w-80 card p-5 h-fit lg:sticky lg:top-24">
            {selectedDay ? (
              <div>
                <h3 className="font-bold text-gray-900">
                  {new Date(selectedDay.date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">Day {selectedDay.day}</p>

                <div className="mt-4 space-y-2">
                  {selectedDay.tasks.map((task, i) => (
                    <div
                      key={i}
                      className={`text-sm px-3.5 py-2.5 rounded-xl border transition-colors ${
                        task.completed
                          ? "border-green-200/70 bg-green-50/60 text-gray-500"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className={`font-medium ${task.completed ? "line-through" : ""}`}>{task.topic}</div>
                      {task.subtopic && (
                        <div className="text-xs text-gray-400 mt-0.5">{task.subtopic}</div>
                      )}
                    </div>
                  ))}
                  {selectedDay.tasks.length === 0 && (
                    <p className="text-sm text-gray-400 italic text-center py-4">No tasks scheduled</p>
                  )}
                </div>
                <div className="mt-4">
                  <AIDisclaimer compact />
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-400">Click a day</p>
                <p className="text-xs text-gray-400 mt-1">to see its tasks</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
