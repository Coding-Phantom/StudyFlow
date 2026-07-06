import { useState } from "react";
import type { PlanSummary, Plan } from "../types";
import { api } from "../api/client";

interface Props {
  plan: PlanSummary;
  onSelect?: (plan: Plan) => void;
}

export default function PlanCard({ plan, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [fullPlan, setFullPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!fullPlan) {
      setLoading(true);
      try {
        const data = await api.getPlan(plan.id);
        setFullPlan(data);
        onSelect?.(data);
      } catch {
        // silently fail — show basic info
      } finally {
        setLoading(false);
      }
    }
  };

  const end = new Date(plan.deadline);
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
      >
        <div>
          <h3 className="font-semibold text-gray-900">{plan.subject}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {plan.total_days} days &middot; {plan.daily_hours}h/day &middot;{" "}
            {daysLeft > 0 ? `${daysLeft} days left` : "Deadline passed"}
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100 pt-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading curriculum...
            </div>
          ) : fullPlan?.curriculum ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Curriculum</p>
              {fullPlan.curriculum.map((topic, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium text-gray-800">{topic.title}</span>
                  {topic.subtopics.length > 0 && (
                    <span className="text-gray-500">
                      {" — "}
                      {topic.subtopics.join(", ")}
                    </span>
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <a
                  href="/learn"
                  className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md font-medium hover:bg-indigo-100 transition-colors"
                >
                  Study Now
                </a>
                <a
                  href="/calendar"
                  className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-md font-medium hover:bg-gray-100 transition-colors"
                >
                  View Calendar
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Could not load curriculum.</p>
          )}
        </div>
      )}
    </div>
  );
}
