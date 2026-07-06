import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Plan, PlanSummary } from "../types";
import PlanForm from "../components/PlanForm";
import PlanCard from "../components/PlanCard";

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await api.getPlans();
      setPlans(data);
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
    // Prepend the new plan to the list
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Study Plans</h1>
        <p className="text-gray-500 mt-1">Create a new plan or view your existing ones.</p>
      </div>

      <PlanForm onPlanCreated={handlePlanCreated} />

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Plans</h2>

        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading plans...
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
            <button onClick={fetchPlans} className="ml-2 underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && plans.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">No plans yet. Create one above!</p>
          </div>
        )}

        {!loading && plans.length > 0 && (
          <div className="space-y-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
