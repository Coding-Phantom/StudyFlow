export interface Topic {
  title: string;
  subtopics: string[];
}

export interface StudyTask {
  id?: number;
  topic: string;
  subtopic: string | null;
  completed: number;
}

export interface DayPlan {
  day: number;
  date: string;
  tasks: StudyTask[];
}

export interface Plan {
  plan_id: number;
  subject: string;
  deadline: string;
  daily_hours: number;
  total_days: number;
  start_date: string;
  created_at?: string;
  curriculum?: Topic[];
  schedule?: DayPlan[];
}

export interface PlanSummary {
  id: number;
  subject: string;
  deadline: string;
  daily_hours: number;
  total_days: number;
  start_date: string;
  created_at: string;
}

export interface StudyNotes {
  topic: string;
  summary: string;
  key_concepts: string[];
  important_terms: string[];
  common_mistakes: string[];
  recommended_practice: string[];
  estimated_study_time: number;
}

export interface Question {
  id: string;
  type: "multiple_choice" | "short_answer" | "conceptual";
  prompt: string;
  options: string[] | null;
  correct_answer: string;
  topic: string;
  subtopic: string | null;
}

export interface Quiz {
  topic: string;
  subtopic: string | null;
  questions: Question[];
}

export interface UserAnswer {
  question_id: string;
  user_answer: string;
}

export interface EvaluateResult {
  attempt_id: number;
  score: number;
  feedback: string;
  weak_concepts: string[];
}

export interface AdaptationResult {
  review_topics: string[];
  next_focus: string;
  suggested_intensity: "light" | "normal" | "intense";
  reasoning: string;
}

export interface MasteryScore {
  subject: string;
  concept: string;
  score: number;
  updated_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PlannerChatResponse {
  reply: string;
  plan_ready: boolean;
  plan_data: {
    subject: string;
    deadline: string;
    daily_hours: number;
    curriculum: Topic[];
  } | null;
}

export interface CreatePlanFromChat {
  subject: string;
  deadline: string;
  daily_hours: number;
  curriculum: Topic[];
}

export interface AppState {
  latest_plan: Plan | null;
  active_plan_id: number | null;
  mastery_scores: MasteryScore[];
}
