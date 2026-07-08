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
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          Welcome to <span className="text-gradient">StudyFlow</span>
        </h1>
        <p className="text-gray-500 mt-4 max-w-lg mx-auto text-lg leading-relaxed">
          Your adaptive learning coach. Create a study plan, get AI-generated notes, test yourself with quizzes, and track your mastery.
        </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link
              to="/plan/new"
              className="inline-flex items-center gap-2 px-8 py-3 text-base font-semibold rounded-xl transition-all duration-200 shadow-md bg-gradient-to-r from-[#5eead4] to-[#c084fc] text-deep-bg hover:shadow-lg hover:shadow-[#5eead4]/[0.25]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Plan with AI Chat
            </Link>
            <Link
              to="/plans"
              className="btn-primary inline-flex text-base px-8 py-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Quick Form
            </Link>
          </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-xl mx-auto">
          {[
            { title: "Plan", desc: "Define subjects and deadlines", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", color: "text-indigo-600 bg-indigo-50" },
            { title: "Study", desc: "AI-powered notes and explanations", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", color: "text-purple-600 bg-purple-50" },
            { title: "Quiz", desc: "Test knowledge and adapt", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-amber-600 bg-amber-50" },
          ].map((item) => (
            <div key={item.title} className="card card-interactive p-5 text-left group">
              <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-3 transition-transform group-hover:scale-110`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
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
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Studying: <span className="text-gradient">{plan.subject}</span>
        </h1>
        <p className="text-gray-500 mt-1.5">
          {daysRemaining > 0 ? `${daysRemaining} days until deadline` : "Deadline passed"}
        </p>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today's Tasks</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {todayCompleted}<span className="text-gray-300 text-2xl font-normal">/{todayTasks.length}</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {todayTasks.length === 0
              ? "Nothing scheduled"
              : `${todayCompleted === todayTasks.length ? "All done!" : `${todayTasks.length - todayCompleted} remaining`}`}
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan Duration</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{plan.total_days} <span className="text-lg font-medium text-gray-500">days</span></p>
          <p className="text-sm text-gray-500 mt-1">
            {plan.daily_hours}h per day &middot; {plan.curriculum?.length ?? 0} topics
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mastery Score</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {mastery.length > 0
              ? `${Math.round(mastery.reduce((s, m) => s + m.score, 0) / mastery.length)}%`
              : "—"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {mastery.length} concepts tracked
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/learn"
          className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all duration-200 shadow-md shadow-indigo-500/15 hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          {todayTasks.length > 0 ? "Continue Studying" : "Go to Learn"}
        </Link>
        <Link
          to="/quiz"
          className="inline-flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Take a Quiz
        </Link>
        <Link
          to="/calendar"
          className="inline-flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          View Calendar
        </Link>
      </div>

      {/* Weak areas */}
      {weakAreas.length > 0 && (
        <div className="card border-amber-200/60 bg-amber-50/60 p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wider">
              Areas Needing Review
            </h2>
          </div>
          <div className="space-y-2">
            {weakAreas.map((m) => (
              <div key={m.concept} className="flex items-center justify-between bg-white/70 rounded-lg px-3.5 py-2.5 border border-amber-200/40">
                <span className="text-sm font-medium text-amber-800">{m.concept}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${m.score}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-amber-600 w-8 text-right">{Math.round(m.score)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming days (next 5 with tasks) */}
      {plan.schedule && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Upcoming Study Days</h2>
          <div className="space-y-1.5">
            {plan.schedule
              .filter((d) => d.date >= todayStr && d.tasks.length > 0)
              .slice(0, 5)
              .map((day) => {
                const date = new Date(day.date + "T00:00:00");
                const isToday = day.date === todayStr;
                return (
                  <div
                    key={day.date}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                      isToday
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isToday ? "bg-indigo-500" : "bg-gray-300"}`} />
                      <span className={`font-medium ${isToday ? "text-indigo-700" : "text-gray-700"}`}>
                        {isToday
                          ? "Today"
                          : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <span className={`text-xs font-medium ${isToday ? "text-indigo-600 bg-indigo-100" : "text-gray-400 bg-gray-100"} px-2.5 py-0.5 rounded-full`}>
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
