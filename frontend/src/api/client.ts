import type {
  Plan,
  PlanSummary,
  StudyNotes,
  Quiz,
  Question,
  UserAnswer,
  EvaluateResult,
  AdaptationResult,
  AppState,
} from "../types";

const BASE = "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  // State
  getState: () => request<AppState>("/state"),

  // Plans
  getPlans: () => request<PlanSummary[]>("/plans"),
  getPlan: (id: number) => request<Plan>(`/plans/${id}`),
  createPlan: (data: {
    subject: string;
    deadline: string;
    daily_hours: number;
  }) =>
    request<Plan>("/plan", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  activatePlan: (id: number) =>
    request<{ status: string; active_plan_id: number }>(`/plans/${id}/activate`, {
      method: "POST",
    }),
  deletePlan: (id: number) =>
    request<{ status: string; deleted_plan_id: number }>(`/plans/${id}`, {
      method: "DELETE",
    }),

  // Tasks
  completeTask: (taskId: number) =>
    request<{ status: string; task_id: number }>(`/tasks/${taskId}/complete`, {
      method: "PATCH",
    }),

  // Notes
  getNotes: (data: { subject: string; topic: string; subtopic?: string }) =>
    request<StudyNotes>("/notes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Explain
  explain: (data: {
    subject: string;
    topic: string;
    subtopic?: string;
    question: string;
  }) => request<{ explanation: string }>("/explain", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  // Quiz
  getQuiz: (data: {
    subject: string;
    topic: string;
    subtopic?: string;
    notes_content?: string;
    num_questions: number;
  }) =>
    request<Quiz>("/quiz", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Evaluate
  evaluate: (data: {
    subject: string;
    topic: string;
    questions: Question[];
    answers: UserAnswer[];
  }) =>
    request<EvaluateResult>("/evaluate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Adapt
  adapt: (data: {
    subject: string;
    topic: string;
    score: number;
    weak_concepts: string[];
  }) =>
    request<AdaptationResult>("/adapt", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
