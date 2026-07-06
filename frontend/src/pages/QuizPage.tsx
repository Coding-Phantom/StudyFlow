import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type {
  Plan,
  Question,
  UserAnswer,
  EvaluateResult,
} from "../types";
import QuizQuestion from "../components/QuizQuestion";
import QuizResults from "../components/QuizResults";

type Phase = "setup" | "taking" | "results";

export default function QuizPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTopic = searchParams.get("topic") ?? "";
  const preselectedSubtopic = searchParams.get("subtopic") ?? "";

  // Plan / curriculum for topic selection
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  // Setup state
  const [selectedTopic, setSelectedTopic] = useState(preselectedTopic);
  const [selectedSubtopic, setSelectedSubtopic] = useState(preselectedSubtopic);
  const [numQuestions, setNumQuestions] = useState(5);

  // Quiz state
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");

  // Evaluation state
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluateResult | null>(null);

  // Load latest plan for topic selection
  useEffect(() => {
    const load = async () => {
      try {
        const state = await api.getState();
        setPlan(state.latest_plan);
      } catch {
        // no plan yet
      } finally {
        setPlanLoading(false);
      }
    };
    load();
  }, []);

  // Build topic options from curriculum
  const topics =
    plan?.curriculum?.map((t) => ({
      title: t.title,
      subtopics: t.subtopics,
    })) ?? [];

  const currentTopic = topics.find((t) => t.title === selectedTopic);
  const subtopics = currentTopic?.subtopics ?? [];

  // Handle starting the quiz
  const handleStartQuiz = async () => {
    if (!selectedTopic || !plan) return;
    setQuizLoading(true);
    setQuizError("");
    try {
      const quiz = await api.getQuiz({
        subject: plan.subject,
        topic: selectedTopic,
        subtopic: selectedSubtopic || undefined,
        num_questions: numQuestions,
      });
      setQuestions(quiz.questions);
      setAnswers(new Map());
      setCurrentIndex(0);
      setPhase("taking");
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : "Failed to generate quiz");
    } finally {
      setQuizLoading(false);
    }
  };

  // Handle answering
  const handleAnswer = (value: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questions[currentIndex].id, value);
    setAnswers(newAnswers);
  };

  // Navigate questions
  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };
  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  // Submit quiz
  const handleSubmit = async () => {
    if (!plan) return;
    setEvaluating(true);
    try {
      const userAnswers: UserAnswer[] = questions.map((q) => ({
        question_id: q.id,
        user_answer: answers.get(q.id) ?? "",
      }));

      const evalResult = await api.evaluate({
        subject: plan.subject,
        topic: selectedTopic,
        questions,
        answers: userAnswers,
      });

      setResult(evalResult);
      setPhase("results");
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : "Failed to evaluate quiz");
    } finally {
      setEvaluating(false);
    }
  };

  // Check if all questions are answered
  const allAnswered = questions.every((q) => (answers.get(q.id) ?? "").trim() !== "");
  const currentAnswered = (answers.get(questions[currentIndex]?.id) ?? "").trim() !== "";

  // Handle review topics click from results
  const handleReviewTopics = (topics: string[]) => {
    if (topics.length > 0) {
      navigate(`/learn?focus=${encodeURIComponent(topics[0])}`);
    }
  };

  // No plan
  if (!planLoading && !plan) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-900">No Study Plan Yet</h1>
        <p className="text-gray-500 mt-2">Create a study plan before taking quizzes.</p>
        <a
          href="/plans"
          className="inline-block mt-4 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Create a Plan
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quiz</h1>
        <p className="text-gray-500 mt-1">
          {phase === "setup" && "Select a topic and generate a quiz."}
          {phase === "taking" && `Question ${currentIndex + 1} of ${questions.length}`}
          {phase === "results" && "Your results"}
        </p>
      </div>

      {/* PHASE: Setup */}
      {phase === "setup" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-lg mx-auto space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Configure Quiz</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setSelectedSubtopic("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select a topic...</option>
              {topics.map((t) => (
                <option key={t.title} value={t.title}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {subtopics.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtopic <span className="text-gray-400">(optional)</span>
              </label>
              <select
                value={selectedSubtopic}
                onChange={(e) => setSelectedSubtopic(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All subtopics</option>
                {subtopics.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Questions: {numQuestions}
            </label>
            <input
              type="range"
              min={3}
              max={10}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>3</span>
              <span>10</span>
            </div>
          </div>

          {quizError && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{quizError}</div>
          )}

          <button
            onClick={handleStartQuiz}
            disabled={!selectedTopic || quizLoading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {quizLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating quiz... (may take 30s)
              </span>
            ) : (
              "Start Quiz"
            )}
          </button>
        </div>
      )}

      {/* PHASE: Taking */}
      {phase === "taking" && questions.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Progress bar */}
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>

          {/* Question */}
          <QuizQuestion
            question={questions[currentIndex]}
            index={currentIndex}
            value={answers.get(questions[currentIndex].id) ?? ""}
            onChange={handleAnswer}
          />

          {/* Error display */}
          {quizError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {quizError}
              <button
                onClick={handleSubmit}
                className="ml-3 underline hover:no-underline text-sm"
              >
                Retry
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <span className="text-xs text-gray-400">
              {answers.size} of {questions.length} answered
            </span>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={goNext}
                disabled={!currentAnswered}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!allAnswered || evaluating}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {evaluating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Evaluating...
                  </span>
                ) : (
                  "Submit Quiz"
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* PHASE: Results */}
      {phase === "results" && (
        <>
          {quizError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {quizError}
            </div>
          )}
          {result ? (
            <QuizResults
              subject={plan!.subject}
              topic={selectedTopic}
              questions={questions}
              answers={questions.map((q) => ({
                question_id: q.id,
                user_answer: answers.get(q.id) ?? "",
              }))}
              result={result}
              onReviewTopics={handleReviewTopics}
            />
          ) : (
            <div className="text-center py-16 text-gray-500">
              <p>No results available.</p>
              <button
                onClick={() => setPhase("setup")}
                className="mt-2 text-indigo-600 underline hover:no-underline text-sm"
              >
                Start a new quiz
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
