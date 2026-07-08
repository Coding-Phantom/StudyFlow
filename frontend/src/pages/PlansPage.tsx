import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Plan, PlanSummary } from "../types";
import PlanForm from "../components/PlanForm";
import PlanCard from "../components/PlanCard";

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const [plansData, stateData] = await Promise.all([
        api.getPlans(),
        api.getState(),
      ]);
      setPlans(plansData);
      setActivePlanId(stateData.active_plan_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handlePlanCreated = (plan: Plan) => {
    setActivePlanId(plan.plan_id);
    setPlans((prev) => [
      {
        id: plan.plan_id,
        subject: plan.subject,
        deadline: plan.deadline,
        daily_hours: plan.daily_hours,
        total_days: plan.total_days,
        start_date: plan.start_date,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const handleActivate = (planId: number) => {
    setActivePlanId(planId);
  };

  const handleDelete = (planId: number) => {
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    if (activePlanId === planId) {
      setActivePlanId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Study Plans</h1>
        <p className="text-gray-500 mt-1.5">Create a new plan or view your existing ones.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <PlanForm onPlanCreated={handlePlanCreated} />
        </div>
        <div className="hidden sm:flex w-px h-48 bg-border self-center" />
        <div className="shrink-0 text-center">
          <p className="text-sm text-text-secondary mb-3 font-medium">or</p>
          <a
            href="/plan/new"
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl transition-all duration-200 shadow-md bg-gradient-to-r from-[#5eead4] to-[#c084fc] text-deep-bg hover:shadow-lg hover:shadow-[#5eead4]/[0.25]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Plan with AI Chat
          </a>
          <p className="text-xs text-text-muted mt-2">
            Describe your goals in a conversation
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Your Plans</h2>

        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading plans...
          </div>
        )}

        {error && (
          <div className="card border-red-200/60 bg-red-50/60 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button onClick={fetchPlans} className="ml-auto text-sm font-semibold underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && plans.length === 0 && (
          <div className="card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No plans yet.</p>
            <p className="text-sm text-gray-400 mt-1">Create one above to get started!</p>
          </div>
        )}

        {!loading && plans.length > 0 && (
          <div className="space-y-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isActive={plan.id === activePlanId}
                onActivate={handleActivate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
