import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Plan, DayPlan } from "../types";
import CalendarGrid from "../components/CalendarGrid";

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
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-900">No Study Plan Yet</h1>
        <p className="text-gray-500 mt-2">Create a plan to see your study calendar.</p>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Study Calendar</h1>
          <p className="text-gray-500 mt-1">{plan?.subject ?? "No plan"}</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading calendar...
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {!loading && (
        <div className="flex gap-6">
          {/* Calendar */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-lg font-semibold text-gray-900">
                {monthName} {year}
              </h2>

              <div className="flex gap-1">
                <button
                  onClick={goToday}
                  className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
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
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                Has tasks
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                All completed
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Partial completion
              </div>
            </div>
          </div>

          {/* Day details sidebar */}
          <div className="w-72 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            {selectedDay ? (
              <div>
                <h3 className="font-semibold text-gray-900">
                  {new Date(selectedDay.date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Day {selectedDay.day}</p>

                <div className="mt-4 space-y-2">
                  {selectedDay.tasks.map((task, i) => (
                    <div
                      key={i}
                      className={`text-sm px-3 py-2 rounded-lg border ${
                        task.completed
                          ? "border-green-200 bg-green-50 text-gray-500 line-through"
                          : "border-gray-200 text-gray-700"
                      }`}
                    >
                      <div className="font-medium">{task.topic}</div>
                      {task.subtopic && (
                        <div className="text-xs text-gray-400">{task.subtopic}</div>
                      )}
                    </div>
                  ))}
                  {selectedDay.tasks.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No tasks</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-gray-400">
                <p>Click a day</p>
                <p className="text-xs mt-1">to see its tasks</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
