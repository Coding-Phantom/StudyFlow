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
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Study Plans</h1>
        <p className="text-text-secondary mt-1.5">Create a new plan or view your existing ones.</p>
      </div>

      <PlanForm onPlanCreated={handlePlanCreated} />

      <div>
        <h2 className="text-lg font-bold text-text-primary mb-4">Your Plans</h2>

        {loading && (
          <div className="flex items-center justify-center py-16 text-text-muted">
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading plans...
          </div>
        )}

        {error && (
          <div className="card px-4 py-3 text-sm text-danger flex items-center gap-2 border-danger/20 bg-danger-muted/30">
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
            <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center justify-center mx-auto mb-4 border border-border">
              <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-text-secondary font-medium">No plans yet.</p>
            <p className="text-sm text-text-muted mt-1">Create one above to get started!</p>
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
