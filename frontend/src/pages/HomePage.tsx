import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Plan, MasteryScore } from "../types";

export default function HomePage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [mastery, setMastery] = useState<MasteryScore[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      try {
        const state = await api.getState();
        setPlan(state.latest_plan);
        setMastery(state.mastery_scores);
      } catch {
        // no plan yet — that's fine
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading...
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to StudyFlow</h1>
        <p className="text-gray-500 mt-3 max-w-md mx-auto">
          Your adaptive learning coach. Create a study plan, get AI-generated notes, test yourself with quizzes, and track your mastery.
        </p>
        <Link
          to="/plans"
          className="inline-block mt-6 bg-indigo-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Create Your First Plan
        </Link>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { title: "Plan", desc: "Define subjects and deadlines" },
            { title: "Study", desc: "AI-powered notes and explanations" },
            { title: "Quiz", desc: "Test knowledge and adapt" },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-xl border border-gray-200 p-4 text-left">
              <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate today's tasks
  const todayStr = new Date().toISOString().split("T")[0];
  const todayPlan = plan.schedule?.find((d) => d.date === todayStr);
  const todayTasks = todayPlan?.tasks ?? [];
  const todayCompleted = todayTasks.filter((t) => t.completed).length;
  const daysRemaining = Math.ceil(
    (new Date(plan.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Top mastery and weak areas
  const sortedMastery = [...mastery].sort((a, b) => a.score - b.score);
  const weakAreas = sortedMastery
    .filter((m) => m.subject === plan.subject && m.score < 60)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Studying: {plan.subject}
        </h1>
        <p className="text-gray-500 mt-1">
          {daysRemaining > 0 ? `${daysRemaining} days until deadline` : "Deadline passed"}
        </p>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Today's Tasks</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {todayCompleted}/{todayTasks.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {todayTasks.length === 0
              ? "Nothing scheduled"
              : `${todayCompleted === todayTasks.length ? "All done!" : `${todayTasks.length - todayCompleted} remaining`}`}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Plan Duration</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{plan.total_days} days</p>
          <p className="text-xs text-gray-500 mt-1">
            {plan.daily_hours}h per day &middot; {plan.curriculum?.length ?? 0} topics
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Mastery Score</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {mastery.length > 0
              ? `${Math.round(mastery.reduce((s, m) => s + m.score, 0) / mastery.length)}%`
              : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {mastery.length} concepts tracked
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/learn"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          {todayTasks.length > 0 ? "Continue Studying" : "Go to Learn"}
        </Link>
        <Link
          to="/quiz"
          className="bg-white text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Take a Quiz
        </Link>
        <Link
          to="/calendar"
          className="bg-white text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          View Calendar
        </Link>
      </div>

      {/* Weak areas */}
      {weakAreas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wider">
            Areas Needing Review
          </h2>
          <div className="mt-2 space-y-1">
            {weakAreas.map((m) => (
              <div key={m.concept} className="flex items-center justify-between text-sm">
                <span className="text-amber-700">{m.concept}</span>
                <span className="text-amber-600 font-medium">{Math.round(m.score)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming days (next 5 with tasks) */}
      {plan.schedule && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Upcoming Study Days</h2>
          <div className="space-y-2">
            {plan.schedule
              .filter((d) => d.date >= todayStr && d.tasks.length > 0)
              .slice(0, 5)
              .map((day) => {
                const date = new Date(day.date + "T00:00:00");
                const isToday = day.date === todayStr;
                return (
                  <div
                    key={day.date}
                    className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${
                      isToday ? "bg-indigo-50 text-indigo-700" : "text-gray-600"
                    }`}
                  >
                    <span className="font-medium">
                      {isToday
                        ? "Today"
                        : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span>
                      {day.tasks.length} task{day.tasks.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
