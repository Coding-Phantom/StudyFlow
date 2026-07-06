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

  // Build a map of question_id -> user answer
  const answerMap = new Map(answers.map((a) => [a.question_id, a.user_answer]));

  // Determine which questions were answered correctly
  const getIsCorrect = (q: Question): boolean => {
    const userAns = (answerMap.get(q.id) ?? "").trim().toLowerCase();
    const correctAns = q.correct_answer.trim().toLowerCase();

    // 1. Direct match
    if (userAns === correctAns) return true;

    // 2. If one contains the other
    if (userAns.includes(correctAns) || correctAns.includes(userAns)) return true;

    // 3. For multiple choice: compare by option index if correct_answer is a letter
    if (q.type === "multiple_choice" && q.options) {
      // Check if correct_answer is a letter like "A", "B", "C", "D" or "Option A", etc.
      const letterMatch = correctAns.match(/^option?\s*([a-d])$/i);
      const correctLetter = letterMatch ? letterMatch[1] : correctAns.length === 1 ? correctAns : null;

      if (correctLetter) {
        const idx = correctLetter.charCodeAt(0) - 97; // "a" -> 0, "b" -> 1, etc.
        if (idx >= 0 && idx < q.options.length) {
          return userAns === q.options[idx].trim().toLowerCase();
        }
      }

      // Also try: check if user's answer text matches correct_answer by scanning options
      for (const opt of q.options) {
        const optLower = opt.trim().toLowerCase();
        if (optLower === correctAns && optLower === userAns) return true;
        if (optLower.includes(correctAns) && optLower === userAns) return true;
      }
    }

    return false;
  };

  const scorePercent = questions.length > 0
    ? Math.round((result.score / questions.length) * 100)
    : 0;

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
    <div className="space-y-6">
      {/* Score Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
        <div className="text-5xl font-bold text-indigo-600">
          {result.score}/{questions.length}
        </div>
        <div className="text-lg text-gray-500 mt-1">{scorePercent}%</div>

        {result.weak_concepts.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Areas to improve
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {result.weak_concepts.map((concept, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full"
                >
                  <span>&#9888;</span>
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Per-Question Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Question Breakdown</h3>
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
              />
            );
          })}
        </div>
      </div>

      {/* Adaptation Recommendations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Next Steps</h3>

        {adaptLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Getting recommendations...
          </div>
        )}

        {adaptation && (
          <div className="space-y-4">
            {/* Intensity badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Intensity:</span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  intensityColors[adaptation.suggested_intensity] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {adaptation.suggested_intensity}
              </span>
            </div>

            {/* Next focus */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Next Focus</p>
              <p className="text-sm font-medium text-gray-900">{adaptation.next_focus}</p>
            </div>

            {/* Review topics */}
            {adaptation.review_topics.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Review These Topics</p>
                <div className="flex flex-wrap gap-2">
                  {adaptation.review_topics.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => onReviewTopics?.([t])}
                      className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md hover:bg-indigo-100 transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Why?</p>
              <p className="text-sm text-gray-700 leading-relaxed">{adaptation.reasoning}</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              {onReviewTopics && adaptation.review_topics.length > 0 && (
                <button
                  onClick={() => onReviewTopics?.(adaptation.review_topics)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Review Weak Topics
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Take Another Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
