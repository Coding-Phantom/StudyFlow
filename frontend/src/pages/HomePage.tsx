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
      <div className="flex items-center justify-center py-20 text-text-muted">
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
      <div className="text-center py-20 animate-fade-in">
        {/* Hero section */}
        <div className="max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5eead4] to-[#c084fc] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#5eead4]/[0.15]">
            <svg className="w-8 h-8 text-deep-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">
            Welcome to <span className="text-gradient-aurora">StudyFlow</span>
          </h1>
          <p className="text-text-secondary mt-4 text-lg leading-relaxed">
            Your adaptive learning coach. Create a study plan, get AI-generated notes, test yourself with quizzes, and track your mastery — all in one place.
          </p>
          <Link
            to="/plans"
            className="btn-primary inline-flex mt-8 text-base px-8 py-3"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Plan
          </Link>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-2xl mx-auto">
          {[
            { title: "Plan", desc: "Define your subject, set a deadline, and let AI build a curriculum.", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
            { title: "Study", desc: "AI-powered notes with key concepts, terms, and common mistakes.", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
            { title: "Quiz", desc: "Test your knowledge and get adaptive recommendations.", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
          ].map((item) => (
            <div key={item.title} className="card card-interactive p-5 text-left group">
              <div className="w-10 h-10 rounded-xl bg-[#5eead4]/[0.1] border border-[#5eead4]/[0.15] flex items-center justify-center mb-3 transition-transform group-hover:scale-110 group-hover:bg-[#5eead4]/[0.15]">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary">{item.title}</h3>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">{item.desc}</p>
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
    <div className="space-y-8 animate-fade-in">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          Studying: <span className="text-gradient-aurora">{plan.subject}</span>
        </h1>
        <p className="text-text-secondary mt-1.5">
          {daysRemaining > 0 ? `${daysRemaining} days until deadline` : "Deadline passed"}
        </p>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[#5eead4]/[0.1] border border-[#5eead4]/[0.15] text-accent flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="stat-label">Today's Tasks</p>
          </div>
          <p className="stat-value text-text-primary">
            {todayCompleted}<span className="text-text-muted text-xl font-normal">/{todayTasks.length}</span>
          </p>
          <p className="text-sm text-text-secondary mt-1">
            {todayTasks.length === 0
              ? "Nothing scheduled"
              : `${todayCompleted === todayTasks.length ? "All done!" : `${todayTasks.length - todayCompleted} remaining`}`}
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[#c084fc]/[0.1] border border-[#c084fc]/[0.15] text-accent-secondary flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="stat-label">Plan Duration</p>
          </div>
          <p className="stat-value text-text-primary">{plan.total_days} <span className="text-base font-medium text-text-secondary">days</span></p>
          <p className="text-sm text-text-secondary mt-1">
            {plan.daily_hours}h per day &middot; {plan.curriculum?.length ?? 0} topics
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[#60a5fa]/[0.1] border border-[#60a5fa]/[0.15] text-info flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="stat-label">Mastery Score</p>
          </div>
          <p className="stat-value text-text-primary">
            {mastery.length > 0
              ? `${Math.round(mastery.reduce((s, m) => s + m.score, 0) / mastery.length)}%`
              : "—"}
          </p>
          <p className="text-sm text-text-secondary mt-1">
            {mastery.length} concepts tracked
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/learn"
          className="btn-primary"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          {todayTasks.length > 0 ? "Continue Studying" : "Go to Learn"}
        </Link>
        <Link
          to="/quiz"
          className="btn-secondary"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Take a Quiz
        </Link>
        <Link
          to="/calendar"
          className="btn-secondary"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          View Calendar
        </Link>
      </div>

      {/* Weak areas */}
      {weakAreas.length > 0 && (
        <div className="card p-5 border border-warning/20 bg-warning-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-sm font-bold text-warning uppercase tracking-wider">
              Areas Needing Review
            </h2>
          </div>
          <div className="space-y-2">
            {weakAreas.map((m) => (
              <div key={m.concept} className="flex items-center justify-between bg-deep-bg/40 rounded-lg px-3.5 py-2.5 border border-warning/15">
                <span className="text-sm font-medium text-text-primary">{m.concept}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-warning/20 rounded-full overflow-hidden">
                    <div className="h-full bg-warning rounded-full" style={{ width: `${m.score}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-warning w-8 text-right">{Math.round(m.score)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming days (next 5 with tasks) */}
      {plan.schedule && (
        <div className="card p-5">
          <h2 className="stat-label mb-4">Upcoming Study Days</h2>
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
                        ? "bg-[#5eead4]/[0.06] border border-[#5eead4]/[0.12] text-accent"
                        : "text-text-secondary hover:bg-surface-hover/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isToday ? "bg-accent" : "bg-text-muted/40"}`} />
                      <span className={`font-medium ${isToday ? "text-accent" : "text-text-primary"}`}>
                        {isToday
                          ? "Today"
                          : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <span className={`text-xs font-medium ${
                      isToday
                        ? "text-accent bg-accent/10 border border-accent/20"
                        : "text-text-muted bg-white/[0.04]"
                    } px-2.5 py-0.5 rounded-full`}>
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
