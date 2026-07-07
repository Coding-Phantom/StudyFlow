import { useEffect, useState } from "react";
import type { EvaluateResult, AdaptationResult, Question, UserAnswer } from "../types";
import { api } from "../api/client";
import QuizQuestion from "./QuizQuestion";

interface Props {
  subject: string;
  topic: string;
  questions: Question[];
  answers: UserAnswer[];
  result: EvaluateResult;
  onReviewTopics?: (topics: string[]) => void;
}

export default function QuizResults({
  subject,
  topic,
  questions,
  answers,
  result,
  onReviewTopics,
}: Props) {
  const [adaptation, setAdaptation] = useState<AdaptationResult | null>(null);
  const [adaptLoading, setAdaptLoading] = useState(false);

  // Track question IDs that the user manually marked as correct
  const [overriddenCorrect, setOverriddenCorrect] = useState<Set<string>>(new Set());

  // Build a map of question_id -> user answer
  const answerMap = new Map(answers.map((a) => [a.question_id, a.user_answer]));

  // Normalize text for generous comparison (must match backend evaluation.py)
  const normalize = (text: string): string => {
    let t = text.trim().toLowerCase();
    for (const ch of ".,;:!?'\"-") t = t.replaceAll(ch, " ");
    t = t.replace(/\s+/g, " ").trim();
    for (const article of ["the ", "a ", "an "]) {
      if (t.startsWith(article)) t = t.slice(article.length);
    }
    return t.trim();
  };

  // Determine which questions were answered correctly (generous matching)
  const getIsCorrect = (q: Question): boolean => {
    // If user manually overrode, always count as correct
    if (overriddenCorrect.has(q.id)) return true;

    const userAns = normalize(answerMap.get(q.id) ?? "");
    const correctAns = normalize(q.correct_answer);

    // 1. Direct match
    if (userAns === correctAns) return true;

    // 2. One contains the other
    if (userAns.includes(correctAns) || correctAns.includes(userAns)) return true;

    // 3. For short answer: generous key word overlap (matches updated backend)
    if (q.type === "short_answer") {
      if (!userAns) return false;

      const caWords = new Set(correctAns.split(/\s+/));
      const uaWords = new Set(userAns.split(/\s+/));

      // All significant words from correct answer appear
      const significant = new Set([...caWords].filter((w) => w.length > 2));
      if (significant.size > 0 && [...significant].every((w) => uaWords.has(w))) return true;

      // At least 30% word overlap
      if (caWords.size > 0) {
        const intersection = new Set([...caWords].filter((w) => uaWords.has(w)));
        if (intersection.size >= caWords.size * 0.3) return true;
      }

      // At least one significant word matches and user answer is substantial
      if (userAns.length >= 3) {
        for (const w of caWords) {
          if (w.length > 2 && uaWords.has(w)) return true;
        }
      }

      // User's words mostly appear in correct answer
      if (uaWords.size >= 1) {
        const overlap = [...uaWords].filter((w) => caWords.has(w)).length;
        if (overlap >= uaWords.size * 0.5) return true;
      }
    }

    // 4. For multiple choice: compare by option index if correct_answer is a letter
    if (q.type === "multiple_choice" && q.options) {
      const letterMatch = correctAns.match(/^(?:option\s+)?([a-d])$/);
      const correctLetter = letterMatch ? letterMatch[1] : correctAns.length === 1 ? correctAns : null;

      if (correctLetter) {
        const idx = correctLetter.charCodeAt(0) - 97;
        if (idx >= 0 && idx < q.options.length) {
          return userAns === normalize(q.options[idx]);
        }
      }

      for (const opt of q.options) {
        const optLower = normalize(opt);
        if (optLower === correctAns && optLower === userAns) return true;
      }
    }

    return false;
  };

  // Compute adjusted score: backend score + number of manually overridden questions
  const adjustedScore = questions.filter((q) => getIsCorrect(q)).length;
  const scorePercent = questions.length > 0
    ? Math.round((adjustedScore / questions.length) * 100)
    : 0;

  const handleMarkCorrect = (questionId: string) => {
    setOverriddenCorrect((prev) => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });
  };

  // Load adaptation on mount
  useEffect(() => {
    const load = async () => {
      setAdaptLoading(true);
      try {
        const data = await api.adapt({
          subject,
          topic,
          score: result.score,
          weak_concepts: result.weak_concepts,
        });
        setAdaptation(data);
      } catch {
        // silently fail
      } finally {
        setAdaptLoading(false);
      }
    };
    load();
  }, [subject, topic, result]);

  const intensityColors: Record<string, string> = {
    light: "bg-green-100 text-green-700",
    normal: "bg-blue-100 text-blue-700",
    intense: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-8">
      {/* Score Card */}
      <div className="card p-8 text-center">
        <div className="relative inline-flex items-center justify-center">
          {/* Circular progress indicator */}
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - scorePercent / 100)}`}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold text-gray-900">{scorePercent}%</span>
            <span className="text-sm text-gray-500 font-medium">{adjustedScore}/{questions.length} correct</span>
          </div>
        </div>

        {result.weak_concepts.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
              Areas to improve
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {result.weak_concepts.map((concept, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-200/50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Disclaimer */}
      <div className="flex items-start gap-2.5 text-sm bg-amber-50/80 border border-amber-200/50 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-amber-800 leading-relaxed">
          <span className="font-semibold">AI can make mistakes.</span> If the grader marked a short answer as incorrect but you believe your answer demonstrates understanding, use the <span className="font-semibold">"Mark as Correct"</span> button below to override.
        </p>
      </div>

      {/* Per-Question Breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900">Question Breakdown</h3>
          {overriddenCorrect.size > 0 && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/50 px-2.5 py-0.5 rounded-full ml-auto">
              {overriddenCorrect.size} manually marked correct
            </span>
          )}
        </div>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const userAns = answerMap.get(q.id) ?? "";
            const isCorrect = getIsCorrect(q);
            return (
              <QuizQuestion
                key={q.id}
                question={q}
                index={i}
                value={userAns}
                onChange={() => {}}
                showResult
                correctAnswer={q.correct_answer}
                isCorrect={isCorrect}
                onMarkCorrect={overriddenCorrect.has(q.id) ? undefined : handleMarkCorrect}
              />
            );
          })}
        </div>
      </div>

      {/* Adaptation Recommendations */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900">Recommended Next Steps</h3>
        </div>

        {adaptLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Getting recommendations...
          </div>
        )}

        {adaptation && (
          <div className="space-y-5">
            {/* Intensity badge + Next focus */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Study intensity:</span>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    intensityColors[adaptation.suggested_intensity] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {adaptation.suggested_intensity}
                </span>
              </div>
            </div>

            {/* Next focus */}
            <div className="bg-indigo-50/60 rounded-xl p-4 border border-indigo-100/50">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Next Focus</p>
              <p className="text-sm font-bold text-indigo-900">{adaptation.next_focus}</p>
            </div>

            {/* Review topics */}
            {adaptation.review_topics.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Review These Topics</p>
                <div className="flex flex-wrap gap-2">
                  {adaptation.review_topics.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => onReviewTopics?.([t])}
                      className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all duration-200"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning */}
            <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Why?</p>
              <p className="text-sm text-gray-700 leading-relaxed">{adaptation.reasoning}</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              {onReviewTopics && adaptation.review_topics.length > 0 && (
                <button
                  onClick={() => onReviewTopics?.(adaptation.review_topics)}
                  className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all duration-200 shadow-md shadow-indigo-500/15"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Review Weak Topics
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 bg-white text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Take Another Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
