import { useState } from "react";
import type { PlanSummary, Plan } from "../types";
import { api } from "../api/client";
import AIDisclaimer from "./AIDisclaimer";

interface Props {
  plan: PlanSummary;
  isActive?: boolean;
  onActivate?: (planId: number) => void;
  onDelete?: (planId: number) => void;
}

export default function PlanCard({ plan, isActive, onActivate, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [fullPlan, setFullPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activating, setActivating] = useState(false);

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
      } catch {
        // silently fail — show basic info
      } finally {
        setLoading(false);
      }
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      await api.activatePlan(plan.id);
      onActivate?.(plan.id);
    } catch {
      // silently fail
    } finally {
      setActivating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deletePlan(plan.id);
      onDelete?.(plan.id);
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  };

  const end = new Date(plan.deadline);
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className={`card overflow-hidden ${
      isActive ? "border-indigo-400/70 ring-1 ring-indigo-400/30" : ""
    }`}>
      <button
        onClick={handleToggle}
        className="w-full text-left px-5 py-4 hover:bg-gray-50/50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {isActive && (
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Active
            </span>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{plan.subject}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {plan.total_days} days &middot; {plan.daily_hours}h/day &middot;{" "}
              {daysLeft > 0 ? `${daysLeft} days left` : "Deadline passed"}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100/80 pt-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading curriculum...
            </div>
          ) : fullPlan?.curriculum ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Curriculum</p>
              <div className="space-y-1.5">
                {fullPlan.curriculum.map((topic, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm bg-gray-50/50 rounded-lg px-3 py-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <span className="font-medium text-gray-800">{topic.title}</span>
                      {topic.subtopics.length > 0 && (
                        <span className="text-gray-500">
                          {" — "}
                          {topic.subtopics.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <AIDisclaimer compact />
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-3">
                <a
                  href="/learn"
                  className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-100 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Study Now
                </a>
                <a
                  href="/calendar"
                  className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  View Calendar
                </a>

                <div className="flex-1" />

                {!isActive && (
                  <button
                    onClick={handleActivate}
                    disabled={activating}
                    className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-100 disabled:opacity-50 transition-colors"
                  >
                    {activating ? "Activating..." : "Set as Active"}
                  </button>
                )}

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-red-600">Are you sure?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {deleting ? "Deleting..." : "Yes, Delete"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
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
